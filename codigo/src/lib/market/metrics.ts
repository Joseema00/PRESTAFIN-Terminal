/**
 * Métricas calculadas SIEMPRE a partir de la serie histórica real de cada
 * instrumento. Nunca se usan rentabilidades genéricas por categoría: si no hay
 * datos suficientes, se devuelve `null` y la interfaz lo muestra como
 * "Datos insuficientes".
 */
import type { AssetSeries, Frequency, SeriePoint } from "./types";

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  daily: 252,
  weekly: 52,
  monthly: 12,
};

export type ReturnBasis = "total" | "price";

/** Serie de valor usada para métricas: total return (ajustado) o precio. */
export function valueSeries(s: AssetSeries, basis: ReturnBasis = "total"): SeriePoint[] {
  if (basis === "price") return s.points.map((p) => ({ ...p, a: p.c }));
  return s.points;
}

export function logReturns(points: SeriePoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]?.a ?? 0;
    const cur = points[i]?.a ?? 0;
    if (prev > 0 && cur > 0) out.push(Math.log(cur / prev));
  }
  return out;
}

export function simpleReturns(points: SeriePoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]?.a ?? 0;
    const cur = points[i]?.a ?? 0;
    if (prev > 0) out.push(cur / prev - 1);
  }
  return out;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Resamplea a última observación de cada mes (YYYY-MM). */
export function toMonthly(points: SeriePoint[]): SeriePoint[] {
  const byMonth = new Map<string, SeriePoint>();
  for (const p of points) byMonth.set(p.d.slice(0, 7), p);
  return [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, p]) => p);
}

function pointOnOrBefore(points: SeriePoint[], iso: string): SeriePoint | null {
  let found: SeriePoint | null = null;
  for (const p of points) {
    if (p.d <= iso) found = p;
    else break;
  }
  return found;
}

function yearsAgo(iso: string, n: number) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

export type PeriodReturn = {
  /** Rentabilidad acumulada del periodo, %. `null` = sin histórico suficiente. */
  total: number | null;
  /** Anualizada (CAGR), %. */
  annualized: number | null;
  from?: string;
};

export type AssetMetrics = {
  /** Rentabilidad anualizada de toda la serie disponible (CAGR), %. */
  cagr: number | null;
  /** Volatilidad anualizada, %. */
  vol: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null;
  /** Rendimiento medio anualizado geométrico usado en optimización, %. */
  expectedReturn: number | null;
  lastPrice: number | null;
  lastDate: string | null;
  firstDate: string | null;
  years: number;
  observations: number;
  frequency: Frequency;
  periods: {
    ytd: PeriodReturn;
    y1: PeriodReturn;
    y3: PeriodReturn;
    y5: PeriodReturn;
    y10: PeriodReturn;
    inception: PeriodReturn;
  };
  /** Rentabilidad por dividendo de los últimos 12 meses, % (real, no estimada). */
  dividendYield: number | null;
  basis: ReturnBasis;
};

const MIN_OBS = 24; // mínimo razonable para estadística (p. ej. 24 meses)

function periodReturn(points: SeriePoint[], from: string): PeriodReturn {
  const start = pointOnOrBefore(points, from);
  const end = points[points.length - 1];
  if (!start || !end || start.d === end.d || start.a <= 0) return { total: null, annualized: null };
  const total = (end.a / start.a - 1) * 100;
  const years = (new Date(end.d).getTime() - new Date(start.d).getTime()) / (365.25 * 864e5);
  const annualized = years >= 1 ? ((end.a / start.a) ** (1 / years) - 1) * 100 : null;
  return { total, annualized, from: start.d };
}

export function computeMetrics(
  s: AssetSeries,
  opts: { riskFree?: number; basis?: ReturnBasis } = {},
): AssetMetrics {
  const basis = opts.basis ?? "total";
  const rf = opts.riskFree ?? 0;
  const raw = valueSeries(s, basis);
  const freq: Frequency = s.meta.frequency;
  const pts = freq === "daily" ? raw : raw;
  const rets = logReturns(pts);
  const ppy = PERIODS_PER_YEAR[freq];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const years =
    first && last ? (new Date(last.d).getTime() - new Date(first.d).getTime()) / (365.25 * 864e5) : 0;

  const enough = rets.length >= Math.min(MIN_OBS, ppy) && years >= 0.75;
  const vol = enough ? stdev(rets) * Math.sqrt(ppy) * 100 : null;
  const cagr =
    first && last && first.a > 0 && years >= 0.75 ? ((last.a / first.a) ** (1 / years) - 1) * 100 : null;
  const downside = rets.filter((r) => r < 0);
  const dstd = downside.length > 1 ? stdev(downside) * Math.sqrt(ppy) * 100 : null;

  let peak = -Infinity;
  let mdd = 0;
  for (const p of pts) {
    peak = Math.max(peak, p.a);
    if (peak > 0) mdd = Math.min(mdd, p.a / peak - 1);
  }

  const lastIso = last?.d ?? new Date().toISOString().slice(0, 10);
  const ytdFrom = `${lastIso.slice(0, 4)}-01-01`;

  // Dividendos reales de los últimos 12 meses (no estimados)
  const oneYearAgo = yearsAgo(lastIso, 1);
  const div12 = s.dividends.filter((d) => d.d > oneYearAgo).reduce((a, d) => a + d.amount, 0);
  const dividendYield = last && last.c > 0 && s.dividends.length > 0 ? (div12 / last.c) * 100 : null;

  return {
    cagr,
    vol,
    sharpe: cagr !== null && vol ? (cagr - rf) / vol : null,
    sortino: cagr !== null && dstd ? (cagr - rf) / dstd : null,
    maxDrawdown: pts.length > 2 ? mdd * 100 : null,
    expectedReturn: cagr,
    lastPrice: last?.c ?? null,
    lastDate: last?.d ?? null,
    firstDate: first?.d ?? null,
    years,
    observations: pts.length,
    frequency: freq,
    periods: {
      ytd: periodReturn(pts, ytdFrom),
      y1: periodReturn(pts, yearsAgo(lastIso, 1)),
      y3: periodReturn(pts, yearsAgo(lastIso, 3)),
      y5: periodReturn(pts, yearsAgo(lastIso, 5)),
      y10: periodReturn(pts, yearsAgo(lastIso, 10)),
      inception: first ? periodReturn(pts, first.d) : { total: null, annualized: null },
    },
    dividendYield,
    basis,
  };
}

/* ------------------------------------------------------------------ */
/* Alineación de series para análisis multiactivo                      */
/* ------------------------------------------------------------------ */

export type AlignedMatrix = {
  dates: string[];
  /** Rendimientos mensuales por activo, alineados por fecha. */
  returns: number[][];
  symbols: string[];
  /** Periodos por año de la rejilla común (mensual). */
  ppy: number;
  /** Fecha de inicio común, limitada por el activo con menos histórico. */
  commonStart: string | null;
  /** Activos que limitan la ventana común. */
  limitedBy: string[];
  /** Activos descartados por no tener datos suficientes. */
  dropped: string[];
  months: number;
};

/**
 * Alinea varias series en una rejilla mensual común (última observación del
 * mes). No se rellenan huecos con valores inventados: los meses que falten en
 * algún activo se excluyen del cálculo.
 */
export function alignSeries(series: AssetSeries[]): AlignedMatrix {
  const monthly = series.map((s) => ({ symbol: s.instrument.symbol, pts: toMonthly(s.points) }));
  const usable = monthly.filter((m) => m.pts.length >= 13);
  const dropped = monthly.filter((m) => m.pts.length < 13).map((m) => m.symbol);
  if (!usable.length) {
    return { dates: [], returns: [], symbols: [], ppy: 12, commonStart: null, limitedBy: [], dropped, months: 0 };
  }

  const maps = usable.map((m) => {
    const map = new Map<string, number>();
    for (const p of m.pts) map.set(p.d.slice(0, 7), p.a);
    return map;
  });

  const starts = usable.map((m) => m.pts[0]!.d.slice(0, 7));
  const commonStart = starts.reduce((a, b) => (a > b ? a : b));
  const limitedBy = usable.filter((m, i) => starts[i] === commonStart).map((m) => m.symbol);

  const allMonths = [...new Set(maps.flatMap((m) => [...m.keys()]))].sort();
  const months = allMonths.filter((mo) => mo >= commonStart && maps.every((m) => m.has(mo)));

  const returns: number[][] = maps.map((m) => {
    const out: number[] = [];
    for (let i = 1; i < months.length; i++) {
      const prev = m.get(months[i - 1]!)!;
      const cur = m.get(months[i]!)!;
      out.push(prev > 0 ? Math.log(cur / prev) : 0);
    }
    return out;
  });

  return {
    dates: months,
    returns,
    symbols: usable.map((m) => m.symbol),
    ppy: 12,
    commonStart: months[0] ?? null,
    limitedBy,
    dropped,
    months: Math.max(0, months.length - 1),
  };
}

/** Matriz de covarianzas anualizada a partir de rendimientos reales. */
export function covarianceMatrix(m: AlignedMatrix): number[][] {
  const n = m.returns.length;
  const means = m.returns.map(mean);
  const T = m.returns[0]?.length ?? 0;
  const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  if (T < 2) return cov;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) {
        s += (m.returns[i]![t]! - means[i]!) * (m.returns[j]![t]! - means[j]!);
      }
      const v = (s / (T - 1)) * m.ppy;
      cov[i]![j] = v;
      cov[j]![i] = v;
    }
  }
  return cov;
}

export function correlationMatrix(cov: number[][]): number[][] {
  const n = cov.length;
  return cov.map((row, i) =>
    row.map((v, j) => {
      const d = Math.sqrt((cov[i]![i] ?? 0) * (cov[j]![j] ?? 0));
      return d > 0 ? v / d : i === j ? 1 : 0;
    }),
  );
}

/** Rendimiento anualizado geométrico por activo sobre la ventana común. */
export function annualizedReturns(m: AlignedMatrix): number[] {
  return m.returns.map((r) => (Math.exp(mean(r) * m.ppy) - 1) * 100);
}

export function annualizedVols(cov: number[][]): number[] {
  return cov.map((row, i) => Math.sqrt(Math.max(0, row[i] ?? 0)) * 100);
}
