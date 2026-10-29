/**
 * Motor Monte Carlo con tres métodos. Los dos primeros usan EXCLUSIVAMENTE
 * retornos históricos reales de los activos seleccionados; el paramétrico se
 * marca siempre como supuesto de modelo.
 *
 *  1. bootstrap  — remuestreo por bloques de los retornos mensuales reales.
 *  2. correlated — normales multivariantes con la covarianza real (Cholesky).
 *  3. parametric — log-normal con media/volatilidad indicadas.
 */
import type { Provenance } from "@/lib/market/provider-types";

export type MonteCarloMethod = "bootstrap" | "correlated" | "parametric";

export const MC_METHODS: { id: MonteCarloMethod; label: string; help: string; provenance: Provenance }[] = [
  {
    id: "bootstrap",
    label: "Bootstrap histórico",
    help: "Remuestrea bloques de rentabilidades mensuales reales de la cartera.",
    provenance: "REAL",
  },
  {
    id: "correlated",
    label: "Monte Carlo correlacionado",
    help: "Simula cada activo con la matriz de covarianzas real y los pesos de la cartera.",
    provenance: "REAL",
  },
  {
    id: "parametric",
    label: "Paramétrico",
    help: "Modelo log-normal con la rentabilidad y volatilidad indicadas.",
    provenance: "MODEL_ASSUMPTION",
  },
];

export type MonteCarloInput = {
  method: MonteCarloMethod;
  initial: number;
  monthly: number;
  /** crecimiento anual de la aportación, en % */
  contributionGrowth?: number;
  years: number;
  sims: number;
  seed?: number;
  goal?: number;
  /** inflación anual en %: si se indica, el resultado va en euros de hoy */
  inflation?: number;
  /** comisiones anuales en % (TER + custodia) descontadas de la rentabilidad */
  fees?: number;
  /** paramétrico: rentabilidad y volatilidad anuales en % */
  er?: number;
  vol?: number;
  /** bootstrap: retornos LOG mensuales reales de la cartera */
  portfolioMonthlyReturns?: number[];
  /** correlacionado: retornos LOG mensuales reales por activo + pesos (0-1) */
  assetMonthlyReturns?: number[][];
  weights?: number[];
};

export type MonteCarloOutcome = {
  method: MonteCarloMethod;
  years: number[];
  bands: Record<"p5" | "p10" | "p25" | "p50" | "p75" | "p90" | "p95", number[]>;
  finals: Record<"p5" | "p10" | "p25" | "p50" | "p75" | "p90" | "p95" | "best" | "worst" | "mean", number>;
  /** Muestra de trayectorias para dibujar. */
  samplePaths: number[][];
  contributed: number;
  probLoss: number;
  probGoal: number;
  sims: number;
  /** Meses reales usados como base histórica (0 en el paramétrico). */
  historyMonths: number;
  provenance: Provenance;
};

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussFrom(rnd: () => number) {
  return () => {
    const u = Math.max(1e-9, rnd());
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/** Descomposición de Cholesky con regularización mínima si no es definida positiva. */
export function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i]![j]!;
      for (let k = 0; k < j; k++) sum -= L[i]![k]! * L[j]![k]!;
      if (i === j) L[i]![j] = Math.sqrt(Math.max(1e-12, sum));
      else L[i]![j] = sum / (L[j]![j] || 1e-9);
    }
  }
  return L;
}

function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[idx] ?? 0;
}

/** Rentabilidades mensuales reales de la cartera a partir de las de cada activo. */
export function portfolioMonthlyReturns(assetReturns: number[][], weights: number[]): number[] {
  if (!assetReturns.length) return [];
  const T = Math.min(...assetReturns.map((r) => r.length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const w = weights.map((x) => x / total);
  const out: number[] = [];
  for (let t = 0; t < T; t++) {
    let simple = 0;
    for (let i = 0; i < assetReturns.length; i++) simple += (w[i] ?? 0) * (Math.exp(assetReturns[i]![t]!) - 1);
    out.push(Math.log(1 + Math.max(-0.95, simple)));
  }
  return out;
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloOutcome {
  const months = Math.max(1, Math.round(input.years * 12));
  const sims = Math.max(100, Math.round(input.sims));
  const rnd = mulberry(input.seed ?? 20260827);
  const gauss = gaussFrom(rnd);

  const monthlyDrag =
    Math.log(1 + (input.fees ?? 0) / 100) / 12 + Math.log(1 + (input.inflation ?? 0) / 100) / 12;

  const hist = input.portfolioMonthlyReturns ?? [];
  const assetR = input.assetMonthlyReturns ?? [];
  let method = input.method;
  if (method === "bootstrap" && hist.length < 24) method = "parametric";
  if (method === "correlated" && (!assetR.length || (assetR[0]?.length ?? 0) < 24)) method = "parametric";

  // Preparación por método
  let L: number[][] = [];
  let means: number[] = [];
  let w: number[] = [];
  if (method === "correlated") {
    const n = assetR.length;
    const T = Math.min(...assetR.map((r) => r.length));
    means = assetR.map((r) => r.slice(0, T).reduce((a, b) => a + b, 0) / T);
    const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let s = 0;
        for (let t = 0; t < T; t++) s += (assetR[i]![t]! - means[i]!) * (assetR[j]![t]! - means[j]!);
        const v = s / Math.max(1, T - 1);
        cov[i]![j] = v;
        cov[j]![i] = v;
      }
    }
    L = cholesky(cov);
    const tot = (input.weights ?? []).reduce((a, b) => a + b, 0) || 1;
    w = (input.weights ?? new Array(n).fill(1 / n)).map((x) => x / tot);
  }

  const mu = Math.log(1 + (input.er ?? 0) / 100) / 12;
  const sigma = (input.vol ?? 0) / 100 / Math.sqrt(12);
  const blockLen = 12;

  const step = Math.max(1, Math.round(months / 60));
  const checkpoints: number[] = [];
  for (let m = 0; m <= months; m += step) checkpoints.push(m);
  if (checkpoints[checkpoints.length - 1] !== months) checkpoints.push(months);

  const buckets: number[][] = checkpoints.map(() => []);
  const samplePaths: number[][] = [];
  const growth = Math.log(1 + (input.contributionGrowth ?? 0) / 100) / 12;
  let contributed = input.initial;
  for (let m = 1; m <= months; m++) contributed += input.monthly * Math.exp(growth * m);

  const z: number[] = [];
  for (let s = 0; s < sims; s++) {
    let value = input.initial;
    let ci = 0;
    const path: number[] = [];
    let blockPos = 0;
    let blockStart = 0;
    if (checkpoints[0] === 0) {
      buckets[0]!.push(value);
      path.push(value);
      ci = 1;
    }
    for (let m = 1; m <= months; m++) {
      let r: number;
      if (method === "bootstrap") {
        if (blockPos === 0) blockStart = Math.floor(rnd() * hist.length);
        r = hist[(blockStart + blockPos) % hist.length]!;
        blockPos = (blockPos + 1) % blockLen;
      } else if (method === "correlated") {
        const n = L.length;
        for (let i = 0; i < n; i++) z[i] = gauss();
        let simple = 0;
        for (let i = 0; i < n; i++) {
          let x = means[i]!;
          for (let k = 0; k <= i; k++) x += L[i]![k]! * (z[k] ?? 0);
          simple += (w[i] ?? 0) * (Math.exp(x) - 1);
        }
        r = Math.log(1 + Math.max(-0.95, simple));
      } else {
        r = mu - (sigma * sigma) / 2 + sigma * gauss();
      }
      value = value * Math.exp(r - monthlyDrag) + input.monthly * Math.exp(growth * m);
      if (checkpoints[ci] === m) {
        buckets[ci]!.push(value);
        path.push(value);
        ci++;
      }
    }
    if (samplePaths.length < 40) samplePaths.push(path);
  }

  const sorted = buckets.map((b) => [...b].sort((a, c) => a - c));
  const band = (p: number) => sorted.map((b) => quantile(b, p));
  const last = sorted[sorted.length - 1] ?? [];
  const mean = last.reduce((a, b) => a + b, 0) / Math.max(1, last.length);

  return {
    method,
    years: checkpoints.map((m) => +(m / 12).toFixed(2)),
    bands: {
      p5: band(0.05),
      p10: band(0.1),
      p25: band(0.25),
      p50: band(0.5),
      p75: band(0.75),
      p90: band(0.9),
      p95: band(0.95),
    },
    finals: {
      p5: quantile(last, 0.05),
      p10: quantile(last, 0.1),
      p25: quantile(last, 0.25),
      p50: quantile(last, 0.5),
      p75: quantile(last, 0.75),
      p90: quantile(last, 0.9),
      p95: quantile(last, 0.95),
      best: last[last.length - 1] ?? 0,
      worst: last[0] ?? 0,
      mean,
    },
    samplePaths,
    contributed,
    probLoss: last.filter((v) => v < contributed).length / Math.max(1, last.length),
    probGoal: input.goal && input.goal > 0 ? last.filter((v) => v >= input.goal!).length / Math.max(1, last.length) : 0,
    sims,
    historyMonths: method === "bootstrap" ? hist.length : method === "correlated" ? (assetR[0]?.length ?? 0) : 0,
    provenance: method === "parametric" ? "MODEL_ASSUMPTION" : "SIMULATION",
  };
}
