/** Motor de proyección patrimonial: prestamo, cartera, liquidez y objetivos. */

export type WealthInputs = {
  principal: number;
  rate: number;
  years: number;
  cash: number;
  otherAssets: number;
  portfolio: number;
  monthly: number;
  contribGrowth: number;
  extraPayment: number;
  er: number;
  vol: number;
  inflation: number;
  taxRate: number;
  monthlyExpenses: number;
  cashRate: number;
};

export type WealthPoint = {
  month: number;
  debt: number;
  portfolio: number;
  cash: number;
  net: number;
};

export type WealthRun = {
  series: WealthPoint[];
  payment: number;
  interest: number;
  payoffMonth: number;
  crossoverMonth: number | null;
  finalPortfolio: number;
  finalNet: number;
  finalNetReal: number;
  netAfterTax: number;
  invested: number;
};

export const monthlyPaymentOf = (principal: number, annualRate: number, years: number) => {
  const i = annualRate / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
};

const m2 = (annual: number) => Math.pow(1 + annual / 100, 1 / 12) - 1;

/** share = porción del ahorro mensual destinada a amortizar (0..1). */
export function runWealth(inp: WealthInputs, share: number): WealthRun {
  const i = inp.rate / 100 / 12;
  const r = m2(inp.er);
  const c = m2(inp.cashRate);
  const payment = monthlyPaymentOf(inp.principal, inp.rate, inp.years);
  const horizon = Math.max(12, Math.round(inp.years * 12));

  let debt = inp.principal;
  let portfolio = inp.portfolio;
  let cash = inp.cash;
  let invested = inp.portfolio;
  let interest = 0;
  let payoffMonth = 0;
  let crossoverMonth: number | null = null;

  const series: WealthPoint[] = [
    { month: 0, debt, portfolio, cash, net: portfolio + cash + inp.otherAssets - debt },
  ];

  for (let m = 1; m <= horizon; m++) {
    portfolio *= 1 + r;
    cash *= 1 + c;

    const growth = Math.pow(1 + inp.contribGrowth / 100, Math.floor((m - 1) / 12));
    const available = inp.monthly * growth;

    if (debt > 0) {
      const int = debt * i;
      interest += int;
      debt = Math.max(0, debt - Math.max(0, payment - int));
      const extra = Math.min(debt, inp.extraPayment + available * share);
      debt -= extra;
      const toMarket = inp.extraPayment + available - extra;
      portfolio += Math.max(0, toMarket);
      invested += Math.max(0, toMarket);
      if (debt <= 0.5) {
        debt = 0;
        payoffMonth = payoffMonth || m;
      }
    } else {
      const flow = payment + available + inp.extraPayment;
      portfolio += flow;
      invested += flow;
    }

    if (crossoverMonth === null && debt > 0 && portfolio + cash >= debt) crossoverMonth = m;
    series.push({ month: m, debt, portfolio, cash, net: portfolio + cash + inp.otherAssets - debt });
  }

  if (!payoffMonth) payoffMonth = horizon;
  const finalPortfolio = portfolio + cash;
  const gains = Math.max(0, portfolio - invested);
  const finalNet = finalPortfolio + inp.otherAssets - debt;
  const realFactor = Math.pow(1 + inp.inflation / 100, horizon / 12);
  return {
    series,
    payment,
    interest,
    payoffMonth,
    crossoverMonth,
    finalPortfolio,
    finalNet,
    finalNetReal: finalNet / realFactor,
    netAfterTax: finalNet - gains * (inp.taxRate / 100),
    invested,
  };
}

export type StrategyRow = {
  id: string;
  name: string;
  share: number;
  run: WealthRun;
};

export const SHARE_STRATEGIES: { id: string; name: string; share: number }[] = [
  { id: "invest", name: "Invertir el 100% del ahorro", share: 0 },
  { id: "mix25", name: "75% invertir / 25% amortizar", share: 0.25 },
  { id: "mix50", name: "50% / 50%", share: 0.5 },
  { id: "mix75", name: "25% invertir / 75% amortizar", share: 0.75 },
  { id: "amortize", name: "Amortizar el 100% del ahorro", share: 1 },
];

export function compareStrategies(inp: WealthInputs): StrategyRow[] {
  return SHARE_STRATEGIES.map((s) => ({ ...s, run: runWealth(inp, s.share) }));
}

/* --------- Bandas probabilísticas (Monte Carlo ligero) --------- */

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function projectionBands(inp: WealthInputs, share: number, paths = 400) {
  const rand = rng(20260809);
  const months = Math.max(12, Math.round(inp.years * 12));
  const mu = Math.log(1 + inp.er / 100) / 12;
  const sigma = inp.vol / 100 / Math.sqrt(12);
  const results: number[][] = [];

  for (let p = 0; p < paths; p++) {
    let value = inp.portfolio;
    const path: number[] = [value];
    for (let m = 1; m <= months; m++) {
      const u1 = Math.max(1e-9, rand());
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const growth = Math.pow(1 + inp.contribGrowth / 100, Math.floor((m - 1) / 12));
      value = value * Math.exp(mu - (sigma * sigma) / 2 + sigma * z) + inp.monthly * growth * (1 - share);
      path.push(Math.max(0, value));
    }
    results.push(path);
  }

  const q = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
  };

  const base = runWealth(inp, share).series;
  const out: { year: number; p10: number; p50: number; p90: number; debt: number }[] = [];
  for (let m = 0; m <= months; m += 3) {
    const slice = results.map((p) => p[m] ?? 0);
    out.push({
      year: +(m / 12).toFixed(2),
      p10: Math.round(q(slice, 0.1)),
      p50: Math.round(q(slice, 0.5)),
      p90: Math.round(q(slice, 0.9)),
      debt: Math.round(base[m]?.debt ?? 0),
    });
  }
  const finals = results.map((p) => p[months] ?? 0);
  return {
    data: out,
    p10: q(finals, 0.1),
    p50: q(finals, 0.5),
    p90: q(finals, 0.9),
    successRate: finals.filter((v) => v >= inp.principal).length / finals.length,
  };
}

/* --------- Cuadro de amortización anual --------- */

export function amortizationByYear(inp: WealthInputs, share: number) {
  const run = runWealth(inp, share);
  const i = inp.rate / 100 / 12;
  const rows: { year: number; interest: number; principal: number; balance: number }[] = [];
  let interest = 0;
  let paid = 0;
  for (let m = 1; m < run.series.length; m++) {
    const prev = run.series[m - 1]!.debt;
    const now = run.series[m]!.debt;
    interest += prev * i;
    paid += Math.max(0, prev - now);
    if (m % 12 === 0 || m === run.series.length - 1) {
      rows.push({ year: Math.ceil(m / 12), interest, principal: paid, balance: now });
      interest = 0;
      paid = 0;
    }
  }
  return rows;
}

/* --------- Health Score --------- */

export type HealthPart = { label: string; score: number; max: number; detail: string };

export function healthScore(inp: WealthInputs, run: WealthRun, assetCount: number) {
  const monthlyDebtCost = run.payment;
  const emergencyMonths = inp.monthlyExpenses > 0 ? inp.cash / inp.monthlyExpenses : 0;
  const assets = inp.cash + inp.portfolio + inp.otherAssets;
  const ltv = assets > 0 ? inp.principal / assets : 2;
  const savingsRate =
    inp.monthlyExpenses + inp.monthly > 0 ? inp.monthly / (inp.monthlyExpenses + inp.monthly) : 0;
  const coverage = inp.principal > 0 ? (inp.portfolio + inp.cash) / inp.principal : 1;
  const dti = inp.monthlyExpenses > 0 ? monthlyDebtCost / (inp.monthlyExpenses + inp.monthly) : 0;

  const parts: HealthPart[] = [
    {
      label: "Colchón de emergencia",
      score: Math.min(25, (emergencyMonths / 6) * 25),
      max: 25,
      detail: `${emergencyMonths.toFixed(1)} meses de gastos cubiertos`,
    },
    {
      label: "Cobertura de la deuda",
      score: Math.min(25, coverage * 25),
      max: 25,
      detail: `${(coverage * 100).toFixed(0)}% del prestamo cubierto por activos líquidos`,
    },
    {
      label: "Tasa de ahorro",
      score: Math.min(20, (savingsRate / 0.3) * 20),
      max: 20,
      detail: `${(savingsRate * 100).toFixed(0)}% de tu flujo mensual se ahorra`,
    },
    {
      label: "Apalancamiento",
      score: Math.max(0, Math.min(15, (1 - Math.min(1, ltv)) * 15)),
      max: 15,
      detail: `Deuda / activos = ${(ltv * 100).toFixed(0)}%`,
    },
    {
      label: "Diversificación",
      score: Math.min(15, (assetCount / 8) * 15),
      max: 15,
      detail: `${assetCount} activos en la cartera activa`,
    },
  ];
  const total = parts.reduce((s, p) => s + p.score, 0);
  return { total: Math.round(total), parts, dti, emergencyMonths, coverage };
}

/* --------- Independencia financiera (regla del 4%) --------- */

export function freedomPoint(run: WealthRun, monthlyExpenses: number, swr = 4) {
  const target = (monthlyExpenses * 12 * 100) / swr;
  const hit = run.series.find((p) => p.portfolio + p.cash >= target && p.debt === 0);
  return { target, month: hit ? hit.month : null };
}