/**
 * Construye el contenido del informe ejecutivo a partir de los datos REALES del
 * usuario autenticado y de los motores de cálculo de Prestafin.
 * Regla: si un dato no se ha calculado, se marca como no disponible. Nunca se inventa.
 */
import { CLASS_LABEL } from "@/lib/assets";
import { dateFromMonth, eur, monthsLabel } from "@/lib/finance";
import { PLANS, type Plan } from "@/lib/plans";
import { optimize, statsFor } from "@/lib/portfolio";
import { riskMetrics } from "@/lib/portfolio-analytics";
import { backtestPortfolio } from "@/lib/market/backtest";
import type { MarketBundle } from "@/lib/market/bundle";
import {
  averageCorrelation,
  benchmarkAnalysis,
  calendarYears,
  costAnalysis,
  currencyExposure,
  portfolioScore,
  riskParityWeights,
  rollingReturns,
  worstDrawdowns,
} from "@/lib/portfolio-advanced";
import type { HydratedUniverse } from "@/lib/market/hydrate";
import type { MortgageProfile, WealthProfile, WealthSettings } from "@/hooks/use-portfolios";
import {
  amortizationByYear,
  compareStrategies,
  healthScore,
  projectionBands,
  runWealth,
  type WealthInputs,
} from "@/lib/wealth";
import { reportSectionsFor } from "./sections";
import type { ReportData } from "./types";

export type ReportBuildInput = {
  plan: Plan;
  userName: string | null;
  userEmail: string | null;
  mortgage: MortgageProfile;
  profile: WealthProfile;
  settings: WealthSettings;
  portfolioName: string | null;
  universe: HydratedUniverse;
  amounts: number[];
  montecarloPaths?: number;
  bundle?: MarketBundle | null;
  benchmarkLabel?: string;
  benchmarkSymbol?: string;
  benchmarkMonthly?: { d: string; a: number }[];
};

const pct = (n: number) => `${n.toFixed(1)}%`;

export function buildReportData(input: ReportBuildInput): ReportData {
  const { plan, mortgage, profile, settings, universe, amounts } = input;
  const sections = reportSectionsFor(plan);

  const total = amounts.reduce((s, v) => s + v, 0);
  const weights = total > 0 ? amounts.map((a) => a / total) : universe.assets.map(() => 0);
  const hasPortfolio = total > 0 && universe.assets.length > 0;
  const hasRealData = universe.realCount > 0 && hasPortfolio;
  const base = hasPortfolio ? statsFor(universe.assets, weights, universe.cov) : null;
  const er = hasRealData ? base!.er : 0;
  const vol = hasRealData ? base!.vol : 0;

  const inputs: WealthInputs = {
    principal: mortgage.principal,
    rate: mortgage.rate,
    years: mortgage.years,
    cash: profile.cash,
    otherAssets: profile.otherAssets,
    portfolio: total,
    monthly: profile.monthlyContribution,
    contribGrowth: settings.contribGrowth,
    extraPayment: mortgage.extraMonthly,
    er,
    vol,
    inflation: settings.inflation,
    taxRate: settings.taxRate,
    monthlyExpenses: settings.expenses,
    cashRate: 1.5,
  };

  const run = runWealth(inputs, settings.share);
  const strategies = compareStrategies(inputs);
  const health = healthScore(inputs, run, universe.assets.length);
  const amortization = amortizationByYear(inputs, settings.share);

  const totalAssets = profile.cash + total + profile.otherAssets;
  const netWorth = totalAssets - mortgage.principal;
  const debtRatio = totalAssets > 0 ? mortgage.principal / totalAssets : null;
  const hasMortgage = mortgage.principal > 0;

  /* ---------------- Cartera ---------------- */
  const positions = universe.assets.map((a, i) => ({
    ticker: a.ticker,
    name: a.name,
    cls: CLASS_LABEL[a.cls],
    amount: amounts[i] ?? 0,
    weight: weights[i] ?? 0,
    real: a.real,
  }));

  const groupBy = (key: (i: number) => string) => {
    const map = new Map<string, number>();
    universe.assets.forEach((_, i) => {
      const k = key(i);
      map.set(k, (map.get(k) ?? 0) + (amounts[i] ?? 0));
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  const metrics = hasRealData ? riskMetrics(universe.assets, weights, universe.cov) : null;
  const realDrawdowns = universe.assets
    .map((a, i) => ({ dd: a.data?.metrics?.maxDrawdown ?? null, w: weights[i] ?? 0 }))
    .filter((d) => d.dd !== null);
  const weightedDrawdown =
    realDrawdowns.length === universe.assets.length && realDrawdowns.length > 0
      ? realDrawdowns.reduce((s, d) => s + d.w * (d.dd as number), 0)
      : null;

  const corrPairs: { a: string; b: string; value: number }[] = [];
  for (let i = 0; i < universe.assets.length; i++) {
    for (let j = i + 1; j < universe.assets.length; j++) {
      corrPairs.push({
        a: universe.assets[i]!.ticker,
        b: universe.assets[j]!.ticker,
        value: universe.corr[i]?.[j] ?? 0,
      });
    }
  }
  corrPairs.sort((x, y) => y.value - x.value);

  const portfolio: ReportData["portfolio"] = {
    available: hasPortfolio,
    name: input.portfolioName ?? "Cartera",
    total,
    assetCount: universe.assets.length,
    realDataCount: universe.realCount,
    missing: universe.missing.map((m) => ({ ticker: m.ticker, reason: m.reason })),
    historyLabel: universe.commonStart
      ? `${universe.months} meses de histórico común desde ${universe.commonStart}`
      : null,
    positions: positions.sort((a, b) => b.amount - a.amount),
    allocation: groupBy((i) => CLASS_LABEL[universe.assets[i]!.cls]),
    currencies: groupBy((i) => universe.assets[i]!.currency || "EUR"),
    er: hasRealData ? er : null,
    vol: hasRealData ? vol : null,
    sharpe: hasRealData ? base!.sharpe : null,
    sortino: metrics ? metrics.sortino : null,
    maxDrawdown: weightedDrawdown,
    var95: metrics ? metrics.var95 : null,
    cvar95: metrics ? metrics.cvar95 : null,
    diversificationRatio: metrics ? metrics.diversificationRatio : null,
    effectiveAssets: metrics ? metrics.effectiveAssets : null,
    concentration: metrics ? metrics.concentration : null,
    topCorrelations: corrPairs.slice(0, 5),
    benchmark: null,
  };

  /* ---------------- Optimización (Markowitz) ---------------- */
  let optimization: ReportData["optimization"] = {
    available: false,
    reason: "Añade al menos dos activos con histórico real para optimizar la cartera.",
    current: { er: 0, vol: 0, sharpe: 0 },
    maxSharpe: { er: 0, vol: 0, sharpe: 0 },
    minVol: { er: 0, vol: 0, sharpe: 0 },
    weights: [],
    frontier: [],
  };
  if (sections.includes("portfolio_optimization") && hasRealData && universe.assets.length >= 2) {
    const opt = optimize(universe.assets, weights, { samples: 3000, cov: universe.cov });
    if (opt) {
      optimization = {
        available: true,
        current: { er: opt.current.er, vol: opt.current.vol, sharpe: opt.current.sharpe },
        maxSharpe: { er: opt.maxSharpe.er, vol: opt.maxSharpe.vol, sharpe: opt.maxSharpe.sharpe },
        minVol: { er: opt.minVol.er, vol: opt.minVol.vol, sharpe: opt.minVol.sharpe },
        weights: universe.assets.map((a, i) => ({
          ticker: a.ticker,
          current: weights[i] ?? 0,
          target: opt.maxSharpe.weights[i] ?? 0,
          delta: (opt.maxSharpe.weights[i] ?? 0) - (weights[i] ?? 0),
        })),
        frontier: opt.frontier.map((p) => ({ vol: p.vol, er: p.er })),
      };
    }
  }

  /* ---------------- Escenarios ---------------- */
  const scenarioMeta: Record<string, string> = {
    invest: "Escenario C — Invertir el ahorro disponible",
    mix25: "Escenario D — Combinada 75/25",
    mix50: "Escenario D — Combinada 50/50",
    mix75: "Escenario D — Combinada 25/75",
    amortize: "Escenario B — Amortizar el ahorro disponible",
  };
  const scenarios = strategies.map((s) => ({
    id: s.id,
    name: scenarioMeta[s.id] ?? s.name,
    netWorth: s.run.finalNet,
    netAfterTax: s.run.netAfterTax,
    portfolio: s.run.finalPortfolio,
    interest: s.run.interest,
    payoffLabel: dateFromMonth(s.run.payoffMonth),
    crossoverLabel: dateFromMonth(s.run.crossoverMonth),
  }));
  const bestScenario = scenarios.reduce((a, b) => (b.netAfterTax > a.netAfterTax ? b : a));
  const currentStrategyId =
    settings.share >= 0.9 ? "amortize" : settings.share <= 0.1 ? "invest" : settings.share >= 0.6 ? "mix75" : settings.share >= 0.4 ? "mix50" : "mix25";

  /* ---------------- Monte Carlo ---------------- */
  const paths = Math.min(20000, Math.max(200, input.montecarloPaths ?? 2000));
  const mcAvailable = sections.includes("monte_carlo") && hasRealData;
  const bands = mcAvailable ? projectionBands(inputs, settings.share, paths) : null;
  const monteCarlo: ReportData["monteCarlo"] = {
    available: !!bands,
    paths,
    horizonYears: mortgage.years,
    initialCapital: total,
    monthly: profile.monthlyContribution,
    er,
    vol,
    p10: bands?.p10 ?? 0,
    p50: bands?.p50 ?? 0,
    p90: bands?.p90 ?? 0,
    successRate: bands?.successRate ?? 0,
    data: bands?.data ?? [],
  };

  /* ---------------- Analítica avanzada de cartera ---------------- */
  const backtest = hasRealData
    ? backtestPortfolio(universe.assets, weights, input.bundle ?? null)
    : null;

  const benchAnalysis =
    backtest && sections.includes("portfolio_benchmark") && (input.benchmarkMonthly?.length ?? 0) > 12
      ? benchmarkAnalysis(backtest, input.benchmarkMonthly!)
      : null;

  const rolling = backtest ? rollingReturns(backtest.months, 36) : [];
  const monthIndex = (d: string) => {
    const [y, m] = d.split("-").map(Number);
    return (y ?? 0) * 12 + (m ?? 0);
  };
  const baseMonth = backtest ? monthIndex(backtest.months[0]!.d) : 0;
  const asYears = (d: string) => +((monthIndex(d) - baseMonth) / 12).toFixed(2);

  const terPct = hasPortfolio && base ? base.ter : 0;
  const costs =
    hasPortfolio && sections.includes("portfolio_costs")
      ? costAnalysis(total, terPct, hasRealData ? er : 0, profile.monthlyContribution, 30)
      : null;

  const effective = metrics ? metrics.effectiveAssets : 1 / (weights.reduce((s, w) => s + w * w, 0) || 1);
  const score =
    hasPortfolio && sections.includes("portfolio_quality")
      ? portfolioScore({
          assets: universe.assets,
          weights,
          sharpe: hasRealData ? base!.sharpe : 0,
          vol,
          ter: terPct,
          effectiveAssets: effective,
          avgCorrelation: averageCorrelation(universe.corr),
          realCoverage: universe.assets.length ? universe.realCount / universe.assets.length : 0,
        })
      : null;

  let riskParity: ReportData["advanced"]["riskParity"] = [];
  if (sections.includes("risk_parity") && hasRealData && universe.assets.length >= 2) {
    const rp = riskParityWeights(universe.cov);
    riskParity = universe.assets.map((a, i) => ({
      ticker: a.ticker,
      current: weights[i] ?? 0,
      target: rp[i] ?? 0,
      delta: (rp[i] ?? 0) - (weights[i] ?? 0),
    }));
  }

  const advBlock: ReportData["advanced"] = {
    history:
      backtest && sections.includes("portfolio_history")
        ? {
            from: backtest.from,
            to: backtest.to,
            months: backtest.returns.length,
            cagr: backtest.cagr,
            vol: backtest.vol,
            maxDrawdown: backtest.maxDrawdown,
            worst12m: backtest.worst12m,
            best12m: backtest.best12m,
            var95: backtest.var95,
            cvar95: backtest.cvar95,
            positiveMonths: backtest.positiveMonths * 100,
            coverage: backtest.coverage * 100,
            curve: backtest.months.map((p) => ({ x: asYears(p.d), y: p.value })),
          }
        : null,
    drawdowns: backtest && sections.includes("portfolio_history") ? worstDrawdowns(backtest.months, 5) : [],
    calendar:
      backtest && sections.includes("portfolio_history")
        ? calendarYears(backtest.months, benchAnalysis?.series ?? null)
        : [],
    rolling3y:
      rolling.length && sections.includes("portfolio_history")
        ? {
            min: Math.min(...rolling.map((r) => r.value)),
            avg: rolling.reduce((s, r) => s + r.value, 0) / rolling.length,
            max: Math.max(...rolling.map((r) => r.value)),
            count: rolling.length,
          }
        : null,
    benchmark: benchAnalysis
      ? {
          label: input.benchmarkLabel ?? "Índice de referencia",
          symbol: input.benchmarkSymbol ?? "",
          months: benchAnalysis.months,
          from: benchAnalysis.from,
          to: benchAnalysis.to,
          portfolioCagr: benchAnalysis.portfolioCagr,
          benchmarkCagr: benchAnalysis.benchmarkCagr,
          beta: benchAnalysis.beta,
          alpha: benchAnalysis.alpha,
          trackingError: benchAnalysis.trackingError,
          informationRatio: benchAnalysis.informationRatio,
          correlation: benchAnalysis.correlation,
          r2: benchAnalysis.r2,
          upCapture: benchAnalysis.upCapture,
          downCapture: benchAnalysis.downCapture,
          battingAverage: benchAnalysis.battingAverage,
          benchmarkVol: benchAnalysis.benchmarkVol,
          benchmarkMaxDrawdown: benchAnalysis.benchmarkMaxDrawdown,
          series: benchAnalysis.series.map((p) => ({ x: asYears(p.d), cartera: p.cartera, indice: p.indice })),
        }
      : null,
    currencies:
      hasPortfolio && sections.includes("portfolio_costs")
        ? currencyExposure(universe.assets, weights, total).map((c) => ({
            label: c.label,
            weight: c.weight,
            value: c.value,
          }))
        : [],
    costs: costs
      ? {
          terPct: costs.terPct,
          annualCost: costs.annualCost,
          totalCost: costs.totalCost,
          finalGap: costs.finalGap,
          rows: costs.years.filter((r) => [5, 10, 20, 30].includes(r.year)),
        }
      : null,
    riskParity,
    score: score ? { total: score.total, grade: score.grade, items: score.items } : null,
  };

  /* ---------------- Diagnóstico personalizado ---------------- */
  const diagnosis: string[] = [];
  if (hasMortgage) {
    diagnosis.push(
      `Mantienes una deuda pendiente de ${eur(mortgage.principal)} al ${pct(mortgage.rate)} con una cuota estimada de ${eur(run.payment)} al mes. Según el modelo de Prestafin, el coste financiero total restante asciende a ${eur(run.interest)} en intereses y el préstamo quedaría cancelado en ${dateFromMonth(run.payoffMonth)}.`,
    );
  } else {
    diagnosis.push("No has registrado deuda hipotecaria pendiente, por lo que el análisis se centra en la construcción de patrimonio y en la eficiencia de tu cartera.");
  }
  diagnosis.push(
    `Tu patrimonio neto actual es de ${eur(netWorth)}: ${eur(totalAssets)} en activos (${eur(profile.cash)} de liquidez, ${eur(total)} invertidos y ${eur(profile.otherAssets)} en otros activos) frente a ${eur(mortgage.principal)} de deuda.` +
      (debtRatio !== null ? ` El ratio de endeudamiento sobre activos es del ${pct(debtRatio * 100)}.` : ""),
  );
  if (hasRealData) {
    diagnosis.push(
      `La cartera "${portfolio.name}" acumula ${eur(total)} en ${universe.assets.length} activos, con una rentabilidad histórica anualizada del ${pct(er)} y una volatilidad del ${pct(vol)} calculadas sobre series reales.`,
    );
  } else if (hasPortfolio) {
    diagnosis.push("Tu cartera todavía no dispone de histórico real suficiente para calcular rentabilidad y riesgo; el análisis cuantitativo queda pendiente hasta que los datos de mercado estén disponibles.");
  } else {
    diagnosis.push("Todavía no has añadido una cartera de inversión. Añádela en Portfolio Lab para desbloquear el análisis de rentabilidad, riesgo y escenarios de inversión.");
  }
  if (hasMortgage && hasRealData) {
    diagnosis.push(
      `Según los escenarios analizados por Prestafin, la estrategia con mayor patrimonio neto después de impuestos es "${bestScenario.name}", con ${eur(bestScenario.netAfterTax)} al final del horizonte frente a ${eur(scenarios.find((s) => s.id === currentStrategyId)?.netAfterTax ?? 0)} de tu estrategia actual.`,
    );
  }

  /* ---------------- Fortalezas, mejoras y avisos ---------------- */
  const strengths: string[] = [];
  const improvements: string[] = [];
  const warnings: string[] = [];

  if (health.emergencyMonths >= 6) strengths.push(`Colchón de emergencia sólido: ${health.emergencyMonths.toFixed(1)} meses de gastos cubiertos.`);
  else improvements.push(`Colchón de emergencia por debajo de 6 meses (${health.emergencyMonths.toFixed(1)} meses). Considera reforzar la liquidez antes de aumentar el riesgo.`);

  if (profile.monthlyContribution > 0) strengths.push(`Aportas ${eur(profile.monthlyContribution)} al mes de forma sistemática, con una subida anual prevista del ${pct(settings.contribGrowth)}.`);
  else improvements.push("No hay aportación mensual registrada: la capitalización periódica es el mayor motor del patrimonio a largo plazo.");

  if (hasRealData && universe.assets.length >= 5) strengths.push(`Cartera diversificada en ${universe.assets.length} posiciones y ${portfolio.allocation.length} clases de activo.`);
  else if (hasPortfolio) improvements.push("La cartera está concentrada en pocas posiciones; ampliar clases de activo reduce el riesgo específico.");

  if (debtRatio !== null && debtRatio > 0.6) improvements.push(`Endeudamiento elevado (${pct(debtRatio * 100)} de tus activos). Reducir deuda mejora tu margen de maniobra.`);
  if (hasRealData && mortgage.rate > er) warnings.push(`El tipo de tu préstamo (${pct(mortgage.rate)}) supera la rentabilidad histórica de tu cartera (${pct(er)}): amortizar ofrece un retorno seguro superior al esperado por la inversión.`);
  if (hasRealData && vol > 20) warnings.push(`La volatilidad de la cartera es alta (${pct(vol)}). Revisa si encaja con tu horizonte y tolerancia al riesgo.`);
  if (!hasMortgage) warnings.push("No has introducido datos de préstamo: introduce capital pendiente, tipo y plazo para completar el análisis hipotecario.");
  if (universe.missing.length) warnings.push(`${universe.missing.length} activo(s) sin histórico disponible; sus métricas no se han incluido en el cálculo.`);

  /* ---------------- Plan de acción ---------------- */
  const advanced = sections.includes("advanced_action_plan");
  const now: string[] = [];
  if (health.emergencyMonths < 6) now.push(`Elevar la liquidez hasta cubrir 6 meses de gastos (${eur(settings.expenses * 6)}).`);
  if (hasMortgage) now.push(`Revisar las condiciones del préstamo: tipo ${pct(mortgage.rate)} y cuota ${eur(run.payment)}.`);
  if (!hasPortfolio) now.push("Registrar tu cartera de inversión en Portfolio Lab para activar el análisis cuantitativo.");
  if (profile.monthlyContribution > 0) now.push(`Automatizar la aportación mensual de ${eur(profile.monthlyContribution)}.`);
  if (advanced && hasMortgage && hasRealData) now.push(`Contrastar tu reparto actual (${pct(settings.share * 100)} a amortizar) con el escenario mejor valorado por el modelo: ${bestScenario.name}.`);

  const soon: string[] = [];
  if (hasMortgage) soon.push("Comprobar la evolución del tipo de interés y valorar una amortización parcial si el diferencial frente a la cartera se amplía.");
  if (hasRealData) soon.push("Revisar desviaciones de la cartera frente a tu asignación objetivo y rebalancear si superan las bandas habituales.");
  soon.push("Actualizar en Prestafin liquidez, gastos y aportación para mantener el modelo alineado con tu realidad.");

  const year: string[] = [];
  if (advanced) year.push("Reevaluar el escenario elegido con los datos reales del año y recalcular la comparativa amortizar vs invertir.");
  year.push("Revisar la fiscalidad de las plusvalías y el impacto sobre el patrimonio después de impuestos.");
  if (hasMortgage) year.push(`Verificar el avance del calendario: cancelación estimada en ${dateFromMonth(run.payoffMonth)}.`);

  const longTerm: string[] = [];
  longTerm.push(
    hasMortgage
      ? `Mantener la estrategia hasta el punto de cruce estimado (${dateFromMonth(run.crossoverMonth)}), momento en el que la cartera igualaría la deuda pendiente.`
      : "Sostener el plan de aportaciones y revisar la asignación de activos cada 12-18 meses.",
  );
  if (advanced) longTerm.push("Reevaluar la estrategia ante cambios relevantes de tipos, ingresos, fiscalidad u objetivos vitales.");

  const actionPlan = [
    { horizon: "Ahora", items: now },
    { horizon: "Próximos 3-6 meses", items: soon },
    { horizon: "A 12 meses", items: year },
    { horizon: "Largo plazo", items: longTerm },
  ].filter((b) => b.items.length > 0);

  const monitor = [
    hasMortgage ? `Tipo de interés del préstamo (actual ${pct(mortgage.rate)})` : "Nuevas deudas o financiación",
    hasRealData ? `Rentabilidad y volatilidad de la cartera (${pct(er)} / ${pct(vol)})` : "Alta de la cartera de inversión",
    `Nivel de liquidez (${health.emergencyMonths.toFixed(1)} meses de gastos)`,
    `Aportación mensual (${eur(profile.monthlyContribution)})`,
    `Patrimonio neto (${eur(netWorth)})`,
    debtRatio !== null ? `Ratio de endeudamiento (${pct(debtRatio * 100)})` : "Ratio de endeudamiento",
  ];

  /* ---------------- Conclusión ---------------- */
  const conclusion: string[] = [];
  conclusion.push(
    `Tu situación actual se resume en un patrimonio neto de ${eur(netWorth)} con ${eur(mortgage.principal)} de deuda pendiente y ${eur(total + profile.cash)} entre cartera y liquidez.`,
  );
  conclusion.push(
    hasRealData && hasMortgage
      ? `La principal decisión sigue siendo el reparto entre amortizar e invertir: el modelo estima que "${bestScenario.name}" maximiza el patrimonio después de impuestos (${eur(bestScenario.netAfterTax)}), mientras que amortizar reduce el coste financiero total.`
      : "La prioridad inmediata es completar tus datos en Prestafin para que el modelo pueda comparar escenarios con información real.",
  );
  if (monteCarlo.available)
    conclusion.push(
      `La simulación Monte Carlo (${monteCarlo.paths.toLocaleString("es-ES")} rutas) sitúa el patrimonio invertido entre ${eur(monteCarlo.p10)} (P10) y ${eur(monteCarlo.p90)} (P90), con un escenario central de ${eur(monteCarlo.p50)}.`,
    );
  conclusion.push(
    `El siguiente paso recomendado es ${now[0] ? now[0].charAt(0).toLowerCase() + now[0].slice(1) : "mantener el plan de aportaciones y revisar los supuestos"}, monitorizando de forma periódica tipo de interés, liquidez y rentabilidad de la cartera.`,
  );
  conclusion.push(`Tu Health Score financiero según Prestafin es de ${health.total}/100.`);

  /* ---------------- KPIs ---------------- */
  const kpis = [
    { label: "Patrimonio neto", value: eur(netWorth), hint: "Activos menos deuda" },
    { label: "Activos totales", value: eur(totalAssets) },
    { label: "Deuda pendiente", value: hasMortgage ? eur(mortgage.principal) : "No disponible" },
    { label: "Cuota mensual", value: hasMortgage ? eur(run.payment) : "No disponible" },
    { label: "Capital invertido", value: hasPortfolio ? eur(total) : "No disponible" },
    { label: "Rentabilidad cartera", value: hasRealData ? pct(er) : "No disponible", hint: hasRealData ? "Histórica anualizada" : "Sin histórico" },
    { label: "Liquidez", value: eur(profile.cash), hint: `${health.emergencyMonths.toFixed(1)} meses de gastos` },
    { label: "Ratio endeudamiento", value: debtRatio !== null ? pct(debtRatio * 100) : "No disponible" },
  ];

  return {
    generatedAt: Date.now(),
    plan,
    planName: PLANS[plan].name,
    sections,
    userName: input.userName,
    userEmail: input.userEmail,
    kpis,
    diagnosis,
    strengths,
    improvements,
    warnings,
    situation: {
      assets: [
        { label: "Liquidez", value: profile.cash },
        { label: "Cartera de inversión", value: total },
        { label: "Otros activos", value: profile.otherAssets },
      ].filter((a) => a.value > 0),
      liabilities: hasMortgage ? [{ label: "Préstamo hipotecario", value: mortgage.principal }] : [],
      netWorth,
      totalAssets,
      liquidityMonths: health.emergencyMonths,
      debtRatio,
      monthlyContribution: profile.monthlyContribution,
      monthlyExpenses: settings.expenses,
      healthScore: health.total,
      healthParts: health.parts,
    },
    mortgage: {
      available: hasMortgage,
      principal: mortgage.principal,
      rate: mortgage.rate,
      years: mortgage.years,
      payment: run.payment,
      extraMonthly: mortgage.extraMonthly,
      totalInterest: run.interest,
      payoffLabel: `${dateFromMonth(run.payoffMonth)} (${monthsLabel(run.payoffMonth)})`,
      crossoverLabel: dateFromMonth(run.crossoverMonth),
      amortization,
      debtCurve: run.series
        .filter((p) => p.month % 6 === 0)
        .map((p) => ({ year: +(p.month / 12).toFixed(2), debt: p.debt })),
    },
    portfolio,
    optimization,
    scenarios,
    currentStrategyId,
    monteCarlo,
    advanced: advBlock,
    projection: run.series
      .filter((p) => p.month % 6 === 0)
      .map((p) => ({
        year: +(p.month / 12).toFixed(2),
        debt: p.debt,
        portfolio: p.portfolio + p.cash,
        net: p.net,
      })),
    actionPlan,
    monitor,
    conclusion,
    assumptions: [
      { label: "Horizonte de análisis", value: `${mortgage.years} años` },
      { label: "Inflación anual", value: pct(settings.inflation) },
      { label: "Impuesto sobre plusvalías", value: pct(settings.taxRate) },
      { label: "Ahorro destinado a amortizar", value: pct(settings.share * 100) },
      { label: "Crecimiento anual de aportaciones", value: pct(settings.contribGrowth) },
      { label: "Rentabilidad de cartera usada", value: hasRealData ? `${pct(er)} (histórica real)` : "No disponible" },
      { label: "Volatilidad usada", value: hasRealData ? `${pct(vol)} (histórica real)` : "No disponible" },
    ],
  };
}
