import type { PortfolioTracking } from './portfolio-monitor';
import type { AllocationAudit } from './allocation-engine';
import type { PortfolioProposal } from './portfolio-proposal';
import { assetById, correlation, type Asset, type AssetClass } from "./assets";

export type HoldingMeta = {
  /** Símbolo real en el proveedor de datos (Yahoo Finance). */
  symbol: string;
  name: string;
  kind: string;
  currency: string;
  isin?: string | null;
  cls?: AssetClass;
};

export type Holding = { assetId: string; amount: number; meta?: HoldingMeta };

/** Traduce el tipo del proveedor a la clase de activo interna. */
export function classForKind(kind: string): AssetClass {
  const k = kind.toLowerCase();
  if (k.includes("cripto") || k.includes("crypto")) return "crypto";
  if (k.includes("bono") || k.includes("bond")) return "bond_gov";
  if (k.includes("reit") || k.includes("property")) return "reit";
  if (k.includes("materia") || k.includes("commodity") || k.includes("future")) return "commodity";
  if (k.includes("divisa") || k.includes("currency") || k.includes("liquidez")) return "cash";
  return "equity_dev";
}

/** Activo sintético para instrumentos añadidos desde la búsqueda de mercado. */
export function assetFromHolding(h: Holding): Asset | null {
  if (!h.meta) return null;
  return {
    id: h.assetId,
    ticker: h.meta.symbol,
    name: h.meta.name,
    kind: "ETF",
    cls: h.meta.cls ?? classForKind(h.meta.kind),
    er: 0,
    vol: 0,
    yield: 0,
    currency: h.meta.currency || "EUR",
    symbol: h.meta.symbol,
    custom: true,
  };
}

export type Portfolio = {
  id: string;
  name: string;
  holdings: Holding[];
  createdAt: number;
  origin?: string;
  proposal?: PortfolioProposal;
  mode?: 'draft';
  tracking?: PortfolioTracking;
  mandate?: AllocationAudit;
};

export type PortfolioStats = {
  er: number;
  vol: number;
  sharpe: number;
  yield: number;
  ter: number;
  total: number;
  weights: number[];
  assets: Asset[];
};

export const RISK_FREE = 2.2;

export function resolve(p: Portfolio): { assets: Asset[]; amounts: number[] } {
  const assets: Asset[] = [];
  const amounts: number[] = [];
  for (const h of p.holdings) {
    const a = assetById(h.assetId) ?? assetFromHolding(h);
    if (a && h.amount > 0) {
      assets.push(a);
      amounts.push(h.amount);
    }
  }
  return { assets, amounts };
}

export function covMatrix(assets: Asset[]): number[][] {
  return assets.map((a, i) =>
    assets.map((b, j) => (a.vol / 100) * (b.vol / 100) * (i === j ? 1 : correlation(a, b))),
  );
}

export function corrMatrix(assets: Asset[]): number[][] {
  return assets.map((a, i) => assets.map((b, j) => (i === j ? 1 : correlation(a, b))));
}

export function statsFor(assets: Asset[], weights: number[], cov?: number[][]) {
  const S = cov ?? covMatrix(assets);
  let er = 0;
  let y = 0;
  let ter = 0;
  let variance = 0;
  for (let i = 0; i < assets.length; i++) {
    const wi = weights[i] ?? 0;
    er += wi * (assets[i]?.er ?? 0);
    y += wi * (assets[i]?.yield ?? 0);
    ter += wi * (assets[i]?.ter ?? 0);
    for (let j = 0; j < assets.length; j++) {
      variance += wi * (weights[j] ?? 0) * (S[i]?.[j] ?? 0);
    }
  }
  const vol = Math.sqrt(Math.max(0, variance)) * 100;
  return { er, vol, yield: y, ter, sharpe: vol > 0 ? (er - RISK_FREE) / vol : 0 };
}

export function portfolioStats(p: Portfolio): PortfolioStats {
  const { assets, amounts } = resolve(p);
  const total = amounts.reduce((s, v) => s + v, 0);
  const weights = total > 0 ? amounts.map((a) => a / total) : assets.map(() => 0);
  const s = statsFor(assets, weights);
  return { ...s, total, weights, assets };
}

/* ---------------- Optimización Markowitz ---------------- */

export type FrontierPoint = { vol: number; er: number; sharpe: number; weights: number[] };

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(w: number[]) {
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((v) => v / s);
}

/** Proyecta pesos respetando límites mínimo/máximo por activo. */
export function clampWeights(w: number[], min: number, max: number) {
  let out = normalize(w.map((v) => Math.max(0, v)));
  for (let k = 0; k < 60; k++) {
    out = out.map((v) => Math.min(max, Math.max(min, v)));
    const s = out.reduce((a, b) => a + b, 0) || 1;
    if (Math.abs(s - 1) < 1e-6) break;
    out = out.map((v) => v / s);
  }
  return normalize(out);
}

function randomWeights(n: number, rnd: () => number, min = 0, max = 1) {
  const w = Array.from({ length: n }, () => -Math.log(1 - rnd() * 0.999999));
  return clampWeights(w, min, max);
}

export type Optimization = {
  cloud: FrontierPoint[];
  frontier: FrontierPoint[];
  maxSharpe: FrontierPoint;
  minVol: FrontierPoint;
  current: FrontierPoint;
};

export type OptimizeOptions = {
  samples?: number;
  /** peso máximo por activo, 0-1 */
  maxWeight?: number;
  /** peso mínimo por activo, 0-1 */
  minWeight?: number;
  /** matriz de covarianzas real (series históricas). Si falta, se estima por clase. */
  cov?: number[][];
};

export function optimize(
  assets: Asset[],
  currentWeights: number[],
  options: OptimizeOptions | number = {},
): Optimization | null {
  if (assets.length === 0) return null;
  const opts: OptimizeOptions = typeof options === "number" ? { samples: options } : options;
  const samples = opts.samples ?? 4000;
  const maxW = Math.max(1 / assets.length, Math.min(1, opts.maxWeight ?? 1));
  const minW = Math.max(0, Math.min(opts.minWeight ?? 0, 1 / assets.length));
  const cov = opts.cov ?? covMatrix(assets);
  const point = (w: number[]): FrontierPoint => {
    const s = statsFor(assets, w, cov);
    return { vol: s.vol, er: s.er, sharpe: s.sharpe, weights: w };
  };
  const current = point(currentWeights);
  if (assets.length === 1) {
    return { cloud: [current], frontier: [current], maxSharpe: current, minVol: current, current };
  }

  const rnd = mulberry(20260805);
  const cloud: FrontierPoint[] = [];
  for (let k = 0; k < samples; k++) cloud.push(point(randomWeights(assets.length, rnd, minW, maxW)));

  // refinamiento local sobre los mejores candidatos
  const refine = (start: FrontierPoint, score: (p: FrontierPoint) => number) => {
    let best = start;
    let step = 0.25;
    for (let iter = 0; iter < 400; iter++) {
      const w = best.weights.slice();
      const i = Math.floor(rnd() * w.length);
      const j = Math.floor(rnd() * w.length);
      if (i === j) continue;
      const move = Math.min(w[i] ?? 0, step * rnd());
      w[i] = (w[i] ?? 0) - move;
      w[j] = (w[j] ?? 0) + move;
      const cand = point(clampWeights(w, minW, maxW));
      if (score(cand) > score(best)) best = cand;
      if (iter % 100 === 99) step *= 0.5;
    }
    return best;
  };

  const maxSharpe = refine(
    cloud.reduce((a, b) => (b.sharpe > a.sharpe ? b : a)),
    (p) => p.sharpe,
  );
  const minVol = refine(
    cloud.reduce((a, b) => (b.vol < a.vol ? b : a)),
    (p) => -p.vol,
  );

  // frontera eficiente: máximo retorno por bucket de volatilidad
  const all = [...cloud, maxSharpe, minVol];
  const lo = Math.min(...all.map((p) => p.vol));
  const hi = Math.max(...all.map((p) => p.vol));
  const buckets = new Map<number, FrontierPoint>();
  const N = 40;
  for (const p of all) {
    const b = hi === lo ? 0 : Math.round(((p.vol - lo) / (hi - lo)) * N);
    const prev = buckets.get(b);
    if (!prev || p.er > prev.er) buckets.set(b, p);
  }
  const frontier = [...buckets.values()]
    .sort((a, b) => a.vol - b.vol)
    .filter((p, i, arr) => i === 0 || p.er >= (arr[i - 1]?.er ?? 0));

  return { cloud, frontier, maxSharpe, minVol, current };
}

/* ---------------- Monte Carlo ---------------- */

export type MonteCarloResult = {
  years: number[];
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  finals: { p5: number; p25: number; p50: number; p75: number; p95: number };
  probLoss: number;
  contributed: number;
  probGoal: number;
};

export function monteCarlo(opts: {
  initial: number;
  monthly: number;
  years: number;
  er: number;
  vol: number;
  sims?: number;
  seed?: number;
  /** objetivo de capital final para calcular probabilidad de alcanzarlo */
  goal?: number;
  /** inflación anual: si se indica, los resultados son en euros de hoy */
  inflation?: number;
}): MonteCarloResult {
  const sims = opts.sims ?? 1200;
  const months = Math.max(1, Math.round(opts.years * 12));
  const realEr = opts.inflation ? ((1 + opts.er / 100) / (1 + opts.inflation / 100) - 1) * 100 : opts.er;
  const mu = Math.log(1 + realEr / 100) / 12;
  const sigma = opts.vol / 100 / Math.sqrt(12);
  const rnd = mulberry(opts.seed ?? 987654321);
  const gauss = () => {
    const u = Math.max(1e-9, rnd());
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const step = Math.max(1, Math.round(months / 60));
  const checkpoints: number[] = [];
  for (let m = 0; m <= months; m += step) checkpoints.push(m);
  if (checkpoints[checkpoints.length - 1] !== months) checkpoints.push(months);

  const paths: number[][] = Array.from({ length: checkpoints.length }, () => []);

  for (let s = 0; s < sims; s++) {
    let value = opts.initial;
    let ci = 0;
    if (checkpoints[0] === 0) {
      paths[0]?.push(value);
      ci = 1;
    }
    for (let m = 1; m <= months; m++) {
      value = value * Math.exp(mu - (sigma * sigma) / 2 + sigma * gauss()) + opts.monthly;
      if (checkpoints[ci] === m) {
        paths[ci]?.push(value);
        ci++;
      }
    }
  }

  const q = (arr: number[], p: number) => {
    const a = [...arr].sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * p)));
    return a[idx] ?? 0;
  };

  const contributed = opts.initial + opts.monthly * months;
  const last = paths[paths.length - 1] ?? [];
  return {
    years: checkpoints.map((m) => +(m / 12).toFixed(2)),
    p5: paths.map((v) => q(v, 0.05)),
    p25: paths.map((v) => q(v, 0.25)),
    p50: paths.map((v) => q(v, 0.5)),
    p75: paths.map((v) => q(v, 0.75)),
    p95: paths.map((v) => q(v, 0.95)),
    finals: {
      p5: q(last, 0.05),
      p25: q(last, 0.25),
      p50: q(last, 0.5),
      p75: q(last, 0.75),
      p95: q(last, 0.95),
    },
    probLoss: last.filter((v) => v < contributed).length / Math.max(1, last.length),
    probGoal: opts.goal && opts.goal > 0 ? last.filter((v) => v >= opts.goal!).length / Math.max(1, last.length) : 0,
    contributed,
  };
}