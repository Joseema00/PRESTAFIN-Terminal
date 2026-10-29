import { covMatrix, statsFor, RISK_FREE } from "./portfolio";
import type { Asset, AssetClass } from "./assets";

/* ---------- Contribución al riesgo (MCTR / CTR) ---------- */

export type RiskContribution = {
  asset: Asset;
  weight: number;
  mctr: number;
  ctr: number;
  share: number;
};

export function riskContributions(assets: Asset[], weights: number[], cov?: number[][]): RiskContribution[] {
  const S = cov ?? covMatrix(assets);
  const port = Math.sqrt(
    Math.max(
      1e-12,
      weights.reduce(
        (acc, wi, i) => acc + weights.reduce((a2, wj, j) => a2 + wi * wj * (S[i]?.[j] ?? 0), 0),
        0,
      ),
    ),
  );
  const out = assets.map((asset, i) => {
    const cov = weights.reduce((a, wj, j) => a + wj * (S[i]?.[j] ?? 0), 0);
    const mctr = (cov / port) * 100;
    const w = weights[i] ?? 0;
    return { asset, weight: w, mctr, ctr: w * mctr, share: 0 };
  });
  const total = out.reduce((s, r) => s + r.ctr, 0) || 1;
  return out.map((r) => ({ ...r, share: r.ctr / total })).sort((a, b) => b.ctr - a.ctr);
}

/* ---------- Métricas de riesgo agregadas ---------- */

export type RiskMetrics = {
  vol: number;
  er: number;
  sharpe: number;
  var95: number;
  cvar95: number;
  maxDrawdown: number;
  diversificationRatio: number;
  effectiveAssets: number;
  concentration: number;
  worstYear: number;
  bestYear: number;
  sortino: number;
  recoveryYears: number;
};

export function riskMetrics(assets: Asset[], weights: number[], cov?: number[][]): RiskMetrics {
  const s = statsFor(assets, weights, cov);
  const weightedVol = assets.reduce((acc, a, i) => acc + (weights[i] ?? 0) * a.vol, 0);
  const hhi = weights.reduce((acc, w) => acc + w * w, 0) || 1;
  const downside = s.vol * 0.72;
  const maxDrawdown = Math.min(92, s.vol * 2.4 + 4);
  return {
    vol: s.vol,
    er: s.er,
    sharpe: s.sharpe,
    var95: s.er - 1.645 * s.vol,
    cvar95: s.er - 2.063 * s.vol,
    maxDrawdown,
    diversificationRatio: s.vol > 0 ? weightedVol / s.vol : 1,
    effectiveAssets: 1 / hhi,
    concentration: hhi,
    worstYear: s.er - 1.96 * s.vol,
    bestYear: s.er + 1.96 * s.vol,
    sortino: downside > 0 ? (s.er - RISK_FREE) / downside : 0,
    recoveryYears: s.er > 0 ? Math.log(1 / (1 - maxDrawdown / 100)) / Math.log(1 + s.er / 100) : 0,
  };
}

/* ---------- Escenarios de estrés históricos ---------- */

export type StressScenario = {
  id: string;
  name: string;
  period: string;
  description: string;
  shocks: Partial<Record<AssetClass, number>>;
};

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "gfc",
    name: "Crisis financiera global",
    period: "2008",
    description: "Colapso crediticio: caída generalizada de bolsa e inmobiliario, refugio en deuda pública.",
    shocks: { equity_us: -37, equity_dev: -41, equity_em: -53, equity_small: -45, sector: -40, reit: -48, bond_gov: 8, bond_corp: -6, bond_infl: -2, gold: 5, commodity: -35, crypto: -60, cash: 2 },
  },
  {
    id: "dotcom",
    name: "Burbuja puntocom",
    period: "2000-2002",
    description: "Corrección severa de tecnología y crecimiento; valor y bonos aguantan.",
    shocks: { equity_us: -38, equity_dev: -35, equity_em: -30, equity_small: -18, sector: -55, reit: 12, bond_gov: 20, bond_corp: 12, bond_infl: 15, gold: 12, commodity: -8, crypto: -70, cash: 4 },
  },
  {
    id: "covid",
    name: "Shock COVID-19",
    period: "Feb-Mar 2020",
    description: "Caída vertical en semanas con recuperación rápida posterior.",
    shocks: { equity_us: -34, equity_dev: -33, equity_em: -31, equity_small: -40, sector: -32, reit: -42, bond_gov: 5, bond_corp: -8, bond_infl: -3, gold: -3, commodity: -30, crypto: -50, cash: 0 },
  },
  {
    id: "inflation22",
    name: "Inflación y subida de tipos",
    period: "2022",
    description: "El peor año conjunto de bolsa y bonos en décadas; materias primas al alza.",
    shocks: { equity_us: -19, equity_dev: -18, equity_em: -20, equity_small: -22, sector: -30, bond_gov: -17, bond_corp: -14, bond_infl: -12, reit: -25, gold: 0, commodity: 16, crypto: -64, cash: 1 },
  },
  {
    id: "stagflation",
    name: "Estanflación",
    period: "1973-1974",
    description: "Crecimiento nulo con inflación alta: activos reales protegen mejor.",
    shocks: { equity_us: -42, equity_dev: -40, equity_em: -38, equity_small: -45, sector: -44, bond_gov: -12, bond_corp: -15, bond_infl: 4, reit: -35, gold: 65, commodity: 40, crypto: -55, cash: -8 },
  },
  {
    id: "ratespike",
    name: "Repunte brusco de tipos",
    period: "Escenario hipotético",
    description: "+200 pb en la curva: castiga duración larga e inmobiliario.",
    shocks: { equity_us: -12, equity_dev: -11, equity_em: -14, equity_small: -15, sector: -16, bond_gov: -11, bond_corp: -9, bond_infl: -5, reit: -20, gold: -6, commodity: 2, crypto: -30, cash: 2 },
  },
  {
    id: "crypto_winter",
    name: "Invierno cripto",
    period: "2018 / 2022",
    description: "Desplome de activos digitales con bolsa lateral.",
    shocks: { equity_us: -4, equity_dev: -4, equity_em: -6, equity_small: -6, sector: -8, bond_gov: 2, bond_corp: 1, bond_infl: 1, reit: -3, gold: 3, commodity: 0, crypto: -75, cash: 1 },
  },
  {
    id: "melt_up",
    name: "Rally alcista",
    period: "Escenario alcista",
    description: "Expansión de múltiplos con tipos a la baja.",
    shocks: { equity_us: 28, equity_dev: 25, equity_em: 30, equity_small: 32, sector: 38, bond_gov: 6, bond_corp: 8, bond_infl: 5, reit: 22, gold: 8, commodity: 10, crypto: 90, cash: 2 },
  },
];

export function stressTest(assets: Asset[], weights: number[], total: number) {
  return STRESS_SCENARIOS.map((sc) => {
    const impactPct = assets.reduce(
      (acc, a, i) => acc + (weights[i] ?? 0) * (sc.shocks[a.cls] ?? 0),
      0,
    );
    return { scenario: sc, impactPct, impactEur: (impactPct / 100) * total, after: total * (1 + impactPct / 100) };
  }).sort((a, b) => a.impactPct - b.impactPct);
}

/* ---------- Rebalanceo ---------- */

export type RebalanceOrder = {
  asset: Asset;
  current: number;
  currentWeight: number;
  targetWeight: number;
  drift: number;
  delta: number;
  action: "Comprar" | "Vender" | "Mantener";
};

export function rebalancePlan(
  assets: Asset[],
  amounts: number[],
  targetWeights: number[],
  total: number,
  band: number,
): RebalanceOrder[] {
  return assets.map((asset, i) => {
    const current = amounts[i] ?? 0;
    const currentWeight = total > 0 ? current / total : 0;
    const targetWeight = targetWeights[i] ?? 0;
    const drift = (currentWeight - targetWeight) * 100;
    const target = targetWeight * total;
    const delta = target - current;
    const action = Math.abs(drift) < band ? "Mantener" : delta > 0 ? "Comprar" : "Vender";
    return { asset, current, currentWeight, targetWeight, drift, delta, action };
  });
}

/* ---------- Rentas y objetivos ---------- */

export function incomeProjection(total: number, yieldPct: number, growth: number, years: number) {
  return Array.from({ length: years + 1 }, (_, y) => {
    const capital = total * Math.pow(1 + growth / 100, y);
    return { year: y, income: (capital * yieldPct) / 100, capital };
  });
}
