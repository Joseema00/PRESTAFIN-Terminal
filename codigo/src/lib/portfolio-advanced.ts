/**
 * Analítica avanzada de cartera: paridad de riesgo, comparación contra índice
 * de referencia, drawdowns, años naturales, exposición por divisa y costes.
 * Todo se calcula sobre las series históricas reales cuando están disponibles.
 */
import type { Asset } from "./assets";
import type { PortfolioHistory } from "./market/backtest";
import { RISK_FREE } from "./portfolio";

/* ---------------- Paridad de riesgo (Risk Parity) ---------------- */

/**
 * Pesos que igualan la contribución al riesgo de cada activo.
 * Algoritmo iterativo multiplicativo sobre la matriz de covarianzas real.
 */
export function riskParityWeights(cov: number[][], maxWeight = 1): number[] {
  const n = cov.length;
  if (n === 0) return [];
  if (n === 1) return [1];
  let w = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 500; iter++) {
    const mrc = w.map((_, i) => w.reduce((s, wj, j) => s + wj * (cov[i]?.[j] ?? 0), 0));
    const port = Math.max(1e-12, w.reduce((s, wi, i) => s + wi * (mrc[i] ?? 0), 0));
    const target = port / n;
    const next = w.map((wi, i) => {
      const ctr = Math.max(1e-12, wi * (mrc[i] ?? 0));
      return Math.max(1e-8, wi * (target / ctr) ** 0.5);
    });
    const sum = next.reduce((a, b) => a + b, 0) || 1;
    w = next.map((v) => v / sum);
  }
  if (maxWeight < 1) {
    for (let k = 0; k < 60; k++) {
      w = w.map((v) => Math.min(maxWeight, v));
      const s = w.reduce((a, b) => a + b, 0) || 1;
      if (Math.abs(s - 1) < 1e-6) break;
      w = w.map((v) => v / s);
    }
  }
  return w;
}

/* ---------------- Comparación contra índice de referencia ---------------- */

export type BenchmarkPoint = { d: string; cartera: number; indice: number };

export type BenchmarkAnalysis = {
  months: number;
  from: string;
  to: string;
  series: BenchmarkPoint[];
  portfolioCagr: number;
  benchmarkCagr: number;
  beta: number;
  /** Alfa de Jensen anualizada, %. */
  alpha: number;
  trackingError: number;
  informationRatio: number;
  correlation: number;
  r2: number;
  upCapture: number;
  downCapture: number;
  battingAverage: number;
  benchmarkVol: number;
  benchmarkMaxDrawdown: number;
};

type MonthMap = Map<string, number>;

function toMonthMap(points: { d: string; a: number }[]): MonthMap {
  const m: MonthMap = new Map();
  for (const p of points) m.set(p.d.slice(0, 7), p.a);
  return m;
}

/** Compara el backtest real de la cartera con la serie mensual del índice. */
export function benchmarkAnalysis(
  history: PortfolioHistory,
  benchmarkMonthly: { d: string; a: number }[],
): BenchmarkAnalysis | null {
  const bench = toMonthMap(benchmarkMonthly);
  const keys = history.months.map((m) => m.d).filter((k) => bench.has(k));
  if (keys.length < 13) return null;

  const pMap = new Map(history.months.map((m) => [m.d, m.value] as const));
  const series: BenchmarkPoint[] = [];
  const pr: number[] = [];
  const br: number[] = [];
  let pIdx = 100;
  let bIdx = 100;
  series.push({ d: keys[0]!, cartera: 100, indice: 100 });
  for (let i = 1; i < keys.length; i++) {
    const p0 = pMap.get(keys[i - 1]!)!;
    const p1 = pMap.get(keys[i]!)!;
    const b0 = bench.get(keys[i - 1]!)!;
    const b1 = bench.get(keys[i]!)!;
    if (!(p0 > 0) || !(b0 > 0)) continue;
    const rp = p1 / p0 - 1;
    const rb = b1 / b0 - 1;
    pr.push(rp);
    br.push(rb);
    pIdx *= 1 + rp;
    bIdx *= 1 + rb;
    series.push({ d: keys[i]!, cartera: pIdx, indice: bIdx });
  }
  if (pr.length < 12) return null;

  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const mp = mean(pr);
  const mb = mean(br);
  let covPB = 0;
  let varB = 0;
  let varP = 0;
  for (let i = 0; i < pr.length; i++) {
    covPB += (pr[i]! - mp) * (br[i]! - mb);
    varB += (br[i]! - mb) ** 2;
    varP += (pr[i]! - mp) ** 2;
  }
  covPB /= pr.length - 1;
  varB /= pr.length - 1;
  varP /= pr.length - 1;
  const beta = varB > 0 ? covPB / varB : 0;
  const corr = varB > 0 && varP > 0 ? covPB / Math.sqrt(varB * varP) : 0;

  const years = pr.length / 12;
  const pCagr = ((pIdx / 100) ** (1 / years) - 1) * 100;
  const bCagr = ((bIdx / 100) ** (1 / years) - 1) * 100;
  const alpha = pCagr - (RISK_FREE + beta * (bCagr - RISK_FREE));

  const diff = pr.map((v, i) => v - (br[i] ?? 0));
  const md = mean(diff);
  const te = Math.sqrt(diff.reduce((s, x) => s + (x - md) ** 2, 0) / Math.max(1, diff.length - 1)) * Math.sqrt(12) * 100;

  const up = br.map((v, i) => (v > 0 ? { p: pr[i]!, b: v } : null)).filter(Boolean) as { p: number; b: number }[];
  const down = br.map((v, i) => (v < 0 ? { p: pr[i]!, b: v } : null)).filter(Boolean) as { p: number; b: number }[];
  const capture = (rows: { p: number; b: number }[]) => {
    if (!rows.length) return 0;
    const gp = rows.reduce((s, r) => s * (1 + r.p), 1);
    const gb = rows.reduce((s, r) => s * (1 + r.b), 1);
    return gb === 1 ? 0 : ((gp - 1) / (gb - 1)) * 100;
  };

  let peak = -Infinity;
  let bmdd = 0;
  let cur = 100;
  for (const r of br) {
    cur *= 1 + r;
    peak = Math.max(peak, cur);
    bmdd = Math.min(bmdd, cur / peak - 1);
  }
  const bVol = Math.sqrt(varB) * Math.sqrt(12) * 100;

  return {
    months: pr.length,
    from: keys[0]!,
    to: keys[keys.length - 1]!,
    series,
    portfolioCagr: pCagr,
    benchmarkCagr: bCagr,
    beta,
    alpha,
    trackingError: te,
    informationRatio: te > 0 ? ((pCagr - bCagr) / te) : 0,
    correlation: corr,
    r2: corr * corr,
    upCapture: capture(up),
    downCapture: capture(down),
    battingAverage: (diff.filter((d) => d > 0).length / diff.length) * 100,
    benchmarkVol: bVol,
    benchmarkMaxDrawdown: bmdd * 100,
  };
}

/* ---------------- Drawdowns y años naturales ---------------- */

export function drawdownSeries(path: { d: string; value: number }[]) {
  let peak = -Infinity;
  return path.map((p) => {
    peak = Math.max(peak, p.value);
    return { d: p.d, dd: (p.value / peak - 1) * 100 };
  });
}

export type DrawdownEpisode = { from: string; trough: string; to: string | null; depth: number; months: number };

/** Las peores caídas encadenadas (pico → valle → recuperación). */
export function worstDrawdowns(path: { d: string; value: number }[], top = 5): DrawdownEpisode[] {
  const eps: DrawdownEpisode[] = [];
  let peak = path[0]?.value ?? 0;
  let peakAt = path[0]?.d ?? "";
  let trough = peak;
  let troughAt = peakAt;
  let open = false;
  for (const p of path) {
    if (p.value >= peak) {
      if (open) {
        eps.push({ from: peakAt, trough: troughAt, to: p.d, depth: (trough / peak - 1) * 100, months: monthsBetween(peakAt, p.d) });
        open = false;
      }
      peak = p.value;
      peakAt = p.d;
      trough = p.value;
      troughAt = p.d;
    } else {
      open = true;
      if (p.value < trough) {
        trough = p.value;
        troughAt = p.d;
      }
    }
  }
  if (open) {
    eps.push({ from: peakAt, trough: troughAt, to: null, depth: (trough / peak - 1) * 100, months: monthsBetween(peakAt, path[path.length - 1]?.d ?? peakAt) });
  }
  return eps.sort((a, b) => a.depth - b.depth).slice(0, top);
}

function monthsBetween(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by! - ay!) * 12 + (bm! - am!);
}

export type YearRow = { year: string; portfolio: number; benchmark: number | null };

/** Rentabilidad por año natural de la cartera (y del índice si se aporta). */
export function calendarYears(
  path: { d: string; value: number }[],
  benchSeries?: BenchmarkPoint[] | null,
): YearRow[] {
  const byYear = new Map<string, { first: number; last: number }>();
  const bench = new Map<string, { first: number; last: number }>();
  for (const p of path) {
    const y = p.d.slice(0, 4);
    const cur = byYear.get(y);
    if (!cur) byYear.set(y, { first: p.value, last: p.value });
    else cur.last = p.value;
  }
  for (const p of benchSeries ?? []) {
    const y = p.d.slice(0, 4);
    const cur = bench.get(y);
    if (!cur) bench.set(y, { first: p.indice, last: p.indice });
    else cur.last = p.indice;
  }
  return [...byYear.entries()].map(([year, v]) => {
    const b = bench.get(year);
    return {
      year,
      portfolio: v.first > 0 ? (v.last / v.first - 1) * 100 : 0,
      benchmark: b && b.first > 0 ? (b.last / b.first - 1) * 100 : null,
    };
  });
}

/** Rentabilidades móviles de N meses, anualizadas. */
export function rollingReturns(path: { d: string; value: number }[], window: number) {
  const out: { d: string; value: number }[] = [];
  for (let i = window; i < path.length; i++) {
    const g = path[i]!.value / path[i - window]!.value;
    out.push({ d: path[i]!.d, value: (g ** (12 / window) - 1) * 100 });
  }
  return out;
}

/* ---------------- Exposición por divisa y geografía ---------------- */

export type Exposure = { key: string; label: string; weight: number; value: number };

export function currencyExposure(assets: Asset[], weights: number[], total: number): Exposure[] {
  const map = new Map<string, number>();
  assets.forEach((a, i) => {
    const cur = (a.currency || "EUR").toUpperCase();
    map.set(cur, (map.get(cur) ?? 0) + (weights[i] ?? 0));
  });
  return [...map.entries()]
    .map(([key, weight]) => ({ key, label: key, weight, value: weight * total }))
    .sort((a, b) => b.weight - a.weight);
}

/* ---------------- Costes ---------------- */

export type CostAnalysis = {
  terPct: number;
  annualCost: number;
  years: { year: number; sinCostes: number; conCostes: number; coste: number }[];
  totalCost: number;
  finalGap: number;
};

export function costAnalysis(total: number, terPct: number, erPct: number, monthly: number, years: number): CostAnalysis {
  const rows: CostAnalysis["years"] = [];
  let gross = total;
  let net = total;
  const g = erPct / 100;
  const n = Math.max(0, erPct / 100 - terPct / 100);
  let totalCost = 0;
  for (let y = 0; y <= years; y++) {
    if (y > 0) {
      gross = gross * (1 + g) + monthly * 12;
      net = net * (1 + n) + monthly * 12;
      
    }
    rows.push({ year: y, sinCostes: gross, conCostes: net, coste: gross - net });
  }
  totalCost = rows[rows.length - 1]?.coste ?? 0;
  return {
    terPct,
    annualCost: (total * terPct) / 100,
    years: rows,
    totalCost,
    finalGap: rows.length ? (rows[rows.length - 1]!.coste / Math.max(1, rows[rows.length - 1]!.sinCostes)) * 100 : 0,
  };
}

/* ---------------- Health score de la cartera ---------------- */

export type PortfolioScore = {
  total: number;
  grade: string;
  items: { label: string; score: number; max: number; detail: string }[];
};

export function portfolioScore(input: {
  assets: Asset[];
  weights: number[];
  sharpe: number;
  vol: number;
  ter: number;
  effectiveAssets: number;
  avgCorrelation: number;
  realCoverage: number;
}): PortfolioScore {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  const topWeight = Math.max(0, ...input.weights) * 100;
  const classes = new Set(input.assets.map((a) => a.cls)).size;

  const items = [
    {
      label: "Diversificación efectiva",
      score: clamp((input.effectiveAssets / 8) * 20, 20),
      max: 20,
      detail: `${input.effectiveAssets.toFixed(1)} activos equivalentes`,
    },
    {
      label: "Clases de activo",
      score: clamp((classes / 5) * 15, 15),
      max: 15,
      detail: `${classes} clases distintas`,
    },
    {
      label: "Concentración máxima",
      score: clamp(20 - Math.max(0, topWeight - 25) * 0.5, 20),
      max: 20,
      detail: `Mayor posición ${topWeight.toFixed(1)}%`,
    },
    {
      label: "Eficiencia (Sharpe)",
      score: clamp(input.sharpe * 20, 20),
      max: 20,
      detail: `Sharpe ${input.sharpe.toFixed(2)}`,
    },
    {
      label: "Correlación media",
      score: clamp((1 - Math.max(0, input.avgCorrelation)) * 15, 15),
      max: 15,
      detail: `Correlación media ${input.avgCorrelation.toFixed(2)}`,
    },
    {
      label: "Coste total",
      score: clamp(10 - input.ter * 10, 10),
      max: 10,
      detail: `TER medio ${input.ter.toFixed(2)}%`,
    },
  ];
  const total = Math.round(items.reduce((s, i) => s + i.score, 0));
  const grade = total >= 85 ? "A" : total >= 70 ? "B" : total >= 55 ? "C" : total >= 40 ? "D" : "E";
  return { total, grade, items };
}

export function averageCorrelation(corr: number[][]): number {
  let s = 0;
  let n = 0;
  for (let i = 0; i < corr.length; i++) {
    for (let j = i + 1; j < corr.length; j++) {
      s += corr[i]?.[j] ?? 0;
      n++;
    }
  }
  return n ? s / n : 0;
}
