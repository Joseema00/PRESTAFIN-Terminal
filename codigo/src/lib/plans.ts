/**
 * Central plan / capability / limit definitions.
 * Single source of truth: never hardcode plan checks anywhere else.
 */
export type Plan = "free" | "premium" | "pro";

export type Capability =
  | "canCreatePortfolio"
  | "canUseMarkowitz"
  | "canRunMonteCarlo"
  | "canUseAdvancedRisk"
  | "canUseStressTesting"
  | "canUseRebalancing"
  | "canUseBacktesting"
  | "canUseAI"
  | "canUseUnlimitedAI"
  | "canExportPDF"
  | "canExportData"
  | "canUseAlerts"
  | "canUseWealthScore"
  | "canUseCustomScenarios"
  | "canUseBenchmarks"
  | "canUseAcademy"
  | "canUseCoupleMode"
  | "canUseOpenBanking"
  | "canUseBrokerSync"
  | "canImportPortfolios"
  | "canUseQuantLab"
  | "canUseApi";

export type LimitKey =
  | "portfolios"
  | "assetsPerPortfolio"
  | "mortgages"
  | "goals"
  | "savedSimulations"
  | "advancedRunsPerMonth";

export const UNLIMITED = Number.POSITIVE_INFINITY;

const PREMIUM_CAPS: Capability[] = [
  "canCreatePortfolio",
  "canUseMarkowitz",
  "canRunMonteCarlo",
  "canUseAdvancedRisk",
  "canUseStressTesting",
  "canUseRebalancing",
  "canUseBacktesting",
  "canUseAI",
  "canExportPDF",
  "canExportData",
  "canUseAlerts",
  "canUseWealthScore",
  "canUseCustomScenarios",
  "canUseBenchmarks",
  "canUseAcademy",
];

const PRO_ONLY_CAPS: Capability[] = [
  "canUseUnlimitedAI",
  "canUseCoupleMode",
  "canUseOpenBanking",
  "canUseBrokerSync",
  "canImportPortfolios",
  "canUseQuantLab",
  "canUseApi",
];

export type PlanDefinition = {
  id: Plan;
  name: string;
  priceLabel: string;
  amount: number;
  priceId: string | null;
  tagline: string;
  capabilities: Capability[];
  limits: Record<LimitKey, number>;
  highlights: string[];
};

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "0 €",
    amount: 0,
    priceId: null,
    tagline: "Lo esencial para empezar a ordenar tu dinero.",
    capabilities: ["canCreatePortfolio"],
    limits: {
      portfolios: 1,
      assetsPerPortfolio: 5,
      mortgages: 1,
      goals: 3,
      savedSimulations: 1,
      advancedRunsPerMonth: 10,
    },
    highlights: [
      "1 prestamo y 1 cartera",
      "Hasta 5 activos",
      "Panel patrimonial básico",
      "Comparativa amortizar vs invertir",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceLabel: "12,99 €",
    amount: 12.99,
    priceId: "premium_monthly",
    tagline: "El 80% de la plataforma: optimización, riesgo, IA e informes.",
    capabilities: PREMIUM_CAPS,
    limits: {
      portfolios: UNLIMITED,
      assetsPerPortfolio: UNLIMITED,
      mortgages: UNLIMITED,
      goals: UNLIMITED,
      savedSimulations: 50,
      advancedRunsPerMonth: UNLIMITED,
    },
    highlights: [
      "Carteras, prestamos y activos ilimitados",
      "Portfolio Lab con optimización Markowitz",
      "Monte Carlo, Wealth Score y alertas",
      "Informes, exportaciones y academia",
    ],
  },
  pro: {
    id: "pro",
    name: "Premium Pro",
    priceLabel: "24,99 €",
    amount: 24.99,
    priceId: "pro_monthly",
    tagline: "Toda la plataforma, sin límites, con herramientas cuantitativas.",
    capabilities: [...PREMIUM_CAPS, ...PRO_ONLY_CAPS],
    limits: {
      portfolios: UNLIMITED,
      assetsPerPortfolio: UNLIMITED,
      mortgages: UNLIMITED,
      goals: UNLIMITED,
      savedSimulations: UNLIMITED,
      advancedRunsPerMonth: UNLIMITED,
    },
    highlights: [
      "Todo Premium sin límites",
      "Quant Lab: VaR, CVaR y stress testing avanzado",
      "Importación de carteras y sincronización",
      "IA ilimitada, modo pareja y API",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["free", "premium", "pro"];

/** Statuses that keep paid access. */

export const ENTITLED_STATUSES = ["active", "trialing", "past_due"];

export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (priceId === PLANS.premium.priceId) return "premium";
  if (priceId === PLANS.pro.priceId) return "pro";
  return "free";
}

export function can(plan: Plan, capability: Capability): boolean {
  return PLANS[plan].capabilities.includes(capability);
}

export function limitOf(plan: Plan, key: LimitKey): number {
  return PLANS[plan].limits[key];
}

/** Cheapest plan that unlocks a capability. */
export function requiredPlan(capability: Capability): Plan {
  return PLAN_ORDER.find((p) => can(p, capability)) ?? "pro";
}

export const CAPABILITY_COPY: Record<Capability, { title: string; description: string }> = {
  canCreatePortfolio: { title: "Carteras adicionales", description: "Crea y compara tantas carteras como necesites." },
  canUseMarkowitz: { title: "Optimización de Markowitz", description: "Frontera eficiente, máxima ratio de Sharpe y mínima volatilidad para tu cartera." },
  canRunMonteCarlo: { title: "Simulación Monte Carlo", description: "Proyecciones probabilísticas P10/P50/P90 de tu patrimonio." },
  canUseAdvancedRisk: { title: "Análisis de riesgo avanzado", description: "VaR, CVaR, contribución al riesgo y diversificación." },
  canUseStressTesting: { title: "Escenarios de estrés", description: "Mide el impacto de crisis históricas sobre tu cartera." },
  canUseRebalancing: { title: "Plan de rebalanceo", description: "Órdenes concretas para volver a tu asignación objetivo." },
  canUseBacktesting: { title: "Backtesting", description: "Comprueba cómo se habría comportado tu estrategia." },
  canUseAI: { title: "Asistente con IA", description: "Respuestas basadas en tus datos reales de patrimonio y prestamo." },
  canUseUnlimitedAI: { title: "IA ilimitada", description: "Sin límite de consultas ni de profundidad de análisis." },
  canExportPDF: { title: "Informes PDF", description: "Descarga informes con tu patrimonio, cartera y proyecciones." },
  canExportData: { title: "Exportaciones", description: "Exporta tus carteras y análisis en CSV y JSON." },
  canUseAlerts: { title: "Alertas", description: "Avisos cuando cambian tus métricas clave." },
  canUseWealthScore: { title: "Wealth Score", description: "Puntuación de salud financiera con desglose y recomendaciones." },
  canUseCustomScenarios: { title: "Escenarios personalizados", description: "Ajusta inflación, impuestos, aportaciones y amortizaciones." },
  canUseBenchmarks: { title: "Comparación con benchmarks", description: "Mide tu cartera contra los índices de referencia." },
  canUseAcademy: { title: "Academia", description: "Contenido formativo sobre prestamo, inversión y fiscalidad." },
  canUseCoupleMode: { title: "Modo pareja", description: "Planifica el patrimonio conjunto con reparto de aportaciones." },
  canUseOpenBanking: { title: "Open Banking", description: "Conecta tus cuentas para actualizar saldos automáticamente." },
  canUseBrokerSync: { title: "Sincronización con brokers", description: "Importa posiciones y seguimiento automático." },
  canImportPortfolios: { title: "Importación de carteras", description: "Sube tus posiciones desde archivo o broker." },
  canUseQuantLab: { title: "Quant Lab", description: "Herramientas cuantitativas completas de análisis y optimización." },
  canUseApi: { title: "Acceso API", description: "Integra Prestafin con tus propias herramientas." },
};
