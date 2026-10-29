import type { Plan } from "@/lib/plans";
import type { ReportSectionKey } from "./sections";

export type Kpi = { label: string; value: string; hint?: string };

export type MortgageBlock = {
  available: boolean;
  principal: number;
  rate: number;
  years: number;
  payment: number;
  extraMonthly: number;
  totalInterest: number;
  payoffLabel: string;
  crossoverLabel: string;
  amortization: { year: number; interest: number; principal: number; balance: number }[];
  debtCurve: { year: number; debt: number }[];
};

export type PortfolioBlock = {
  available: boolean;
  name: string;
  total: number;
  assetCount: number;
  realDataCount: number;
  missing: { ticker: string; reason: string }[];
  historyLabel: string | null;
  positions: { ticker: string; name: string; cls: string; amount: number; weight: number; real: boolean }[];
  allocation: { label: string; value: number }[];
  currencies: { label: string; value: number }[];
  er: number | null;
  vol: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null;
  var95: number | null;
  cvar95: number | null;
  diversificationRatio: number | null;
  effectiveAssets: number | null;
  concentration: number | null;
  topCorrelations: { a: string; b: string; value: number }[];
  benchmark: { label: string; er: number; vol: number } | null;
};

export type OptimizationBlock = {
  available: boolean;
  reason?: string;
  current: { er: number; vol: number; sharpe: number };
  maxSharpe: { er: number; vol: number; sharpe: number };
  minVol: { er: number; vol: number; sharpe: number };
  weights: { ticker: string; current: number; target: number; delta: number }[];
  frontier: { vol: number; er: number }[];
};

export type ScenarioRow = {
  id: string;
  name: string;
  netWorth: number;
  netAfterTax: number;
  portfolio: number;
  interest: number;
  payoffLabel: string;
  crossoverLabel: string;
};

export type MonteCarloBlock = {
  available: boolean;
  paths: number;
  horizonYears: number;
  initialCapital: number;
  monthly: number;
  er: number;
  vol: number;
  p10: number;
  p50: number;
  p90: number;
  successRate: number;
  data: { year: number; p10: number; p50: number; p90: number; debt: number }[];
};

export type ActionItem = { horizon: string; items: string[] };

export type AdvancedBlock = {
  history: {
    from: string;
    to: string;
    months: number;
    cagr: number;
    vol: number;
    maxDrawdown: number;
    worst12m: number;
    best12m: number;
    var95: number;
    cvar95: number;
    positiveMonths: number;
    coverage: number;
    curve: { x: number; y: number }[];
  } | null;
  drawdowns: { from: string; trough: string; to: string | null; depth: number; months: number }[];
  calendar: { year: string; portfolio: number; benchmark: number | null }[];
  rolling3y: { min: number; avg: number; max: number; count: number } | null;
  benchmark: {
    label: string;
    symbol: string;
    months: number;
    from: string;
    to: string;
    portfolioCagr: number;
    benchmarkCagr: number;
    beta: number;
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
    series: { x: number; cartera: number; indice: number }[];
  } | null;
  currencies: { label: string; weight: number; value: number }[];
  costs: {
    terPct: number;
    annualCost: number;
    totalCost: number;
    finalGap: number;
    rows: { year: number; sinCostes: number; conCostes: number; coste: number }[];
  } | null;
  riskParity: { ticker: string; current: number; target: number; delta: number }[];
  score: { total: number; grade: string; items: { label: string; score: number; max: number; detail: string }[] } | null;
};


export type ReportData = {
  generatedAt: number;
  plan: Plan;
  planName: string;
  sections: ReportSectionKey[];
  userName: string | null;
  userEmail: string | null;
  kpis: Kpi[];
  diagnosis: string[];
  strengths: string[];
  improvements: string[];
  warnings: string[];
  situation: {
    assets: { label: string; value: number }[];
    liabilities: { label: string; value: number }[];
    netWorth: number;
    totalAssets: number;
    liquidityMonths: number;
    debtRatio: number | null;
    monthlyContribution: number;
    monthlyExpenses: number;
    healthScore: number;
    healthParts: { label: string; score: number; max: number; detail: string }[];
  };
  mortgage: MortgageBlock;
  portfolio: PortfolioBlock;
  optimization: OptimizationBlock;
  scenarios: ScenarioRow[];
  currentStrategyId: string;
  monteCarlo: MonteCarloBlock;
  advanced: AdvancedBlock;
  projection: { year: number; debt: number; portfolio: number; net: number }[];
  actionPlan: ActionItem[];
  monitor: string[];
  conclusion: string[];
  assumptions: { label: string; value: string }[];
};
