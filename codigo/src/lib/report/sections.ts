/**
 * Única fuente de verdad de qué secciones incluye el informe ejecutivo
 * en función del plan contratado por el usuario autenticado.
 *
 * Jerarquía de Prestafin: free < premium < pro (Premium Pro).
 */
import type { Plan } from "@/lib/plans";

export type ReportSectionKey =
  | "basic_summary"
  | "situation"
  | "mortgage_basic"
  | "mortgage_analysis"
  | "portfolio_basic"
  | "portfolio_analysis"
  | "portfolio_history"
  | "portfolio_benchmark"
  | "portfolio_costs"
  | "portfolio_quality"
  | "risk_parity"
  | "advanced_metrics"
  | "portfolio_optimization"
  | "scenario_analysis"
  | "monte_carlo"
  | "advanced_projections"
  | "basic_action_plan"
  | "advanced_action_plan"
  | "conclusion"
  | "upgrade_note";

const FREE: ReportSectionKey[] = [
  "basic_summary",
  "situation",
  "mortgage_basic",
  "portfolio_basic",
  "portfolio_costs",
  "portfolio_quality",
  "basic_action_plan",
  "conclusion",
  "upgrade_note",
];

const PREMIUM: ReportSectionKey[] = [
  "basic_summary",
  "situation",
  "mortgage_basic",
  "mortgage_analysis",
  "portfolio_basic",
  "portfolio_analysis",
  "advanced_metrics",
  "portfolio_history",
  "portfolio_benchmark",
  "portfolio_costs",
  "portfolio_quality",
  "scenario_analysis",
  "monte_carlo",
  "advanced_action_plan",
  "conclusion",
  "upgrade_note",
];

const PRO: ReportSectionKey[] = [
  "basic_summary",
  "situation",
  "mortgage_basic",
  "mortgage_analysis",
  "portfolio_basic",
  "portfolio_analysis",
  "advanced_metrics",
  "portfolio_history",
  "portfolio_benchmark",
  "portfolio_costs",
  "portfolio_quality",
  "portfolio_optimization",
  "risk_parity",
  "scenario_analysis",
  "monte_carlo",
  "advanced_projections",
  "advanced_action_plan",
  "conclusion",
];

export const REPORT_SECTIONS: Record<Plan, ReportSectionKey[]> = {
  free: FREE,
  premium: PREMIUM,
  pro: PRO,
};

export function reportSectionsFor(plan: Plan): ReportSectionKey[] {
  return REPORT_SECTIONS[plan];
}

export function hasReportSection(plan: Plan, key: ReportSectionKey): boolean {
  return REPORT_SECTIONS[plan].includes(key);
}

/** Qué gana el usuario si sube de plan (para la nota discreta del informe). */
export const UPGRADE_HINTS: Record<Exclude<Plan, "pro">, string[]> = {
  free: [
    "Análisis completo de amortizar vs invertir con comparativa de escenarios",
    "Métricas avanzadas de cartera: Sharpe, Sortino, VaR y drawdown",
    "Simulación Monte Carlo con percentiles y probabilidad de objetivos",
    "Backtest histórico real con drawdowns, años naturales y rentabilidades móviles",
    "Comparación contra índices de referencia: alfa, beta, tracking error y capturas",
  ],
  premium: [
    "Optimización de cartera (Markowitz) con pesos actuales vs recomendados",
    "Proyección patrimonial avanzada con intervalos de incertidumbre",
    "Cartera de paridad de riesgo (Risk Parity) frente a tu asignación actual",
  ],
};
