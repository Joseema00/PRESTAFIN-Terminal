export type Inputs = {
  principal: number;
  annualRate: number;
  years: number;
  monthlySavings: number;
  currentSavings: number;
  expectedReturn: number;
  inflation: number;
  taxRate: number;
};

export type Point = {
  month: number;
  debt: number;
  portfolio: number;
  netWorth: number;
};

export type ScenarioResult = {
  id: string;
  name: string;
  description: string;
  series: Point[];
  totalInterest: number;
  payoffMonth: number;
  finalPortfolio: number;
  finalNetWorth: number;
  netWorthAfterTax: number;
  invested: number;
  crossoverMonth: number | null;
  freedomMonth: number | null;
};

export const monthlyPayment = (principal: number, annualRate: number, years: number) => {
  const i = annualRate / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
};

type Strategy = {
  id: string;
  name: string;
  description: string;
  amortizeShare: (m: number) => number;
  lumpAmortizeShare: number;
  annualLump?: boolean;
  cashOnly?: boolean;
};

const CASH_RATE = 1.5;

export const STRATEGIES: Strategy[] = [
  {
    id: "all-amortize",
    name: "Todo a amortizar",
    description:
      "Ahorro inicial y mensual íntegros a reducir deuda. Al cancelar, todo el flujo se invierte.",
    lumpAmortizeShare: 1,
    amortizeShare: () => 1,
  },
  {
    id: "all-invest",
    name: "Todo a invertir",
    description: "Solo se paga la cuota. El resto va a cartera diversificada.",
    lumpAmortizeShare: 0,
    amortizeShare: () => 0,
  },
  {
    id: "fifty",
    name: "50% / 50%",
    description: "Equilibrio entre reducir deuda y construir patrimonio.",
    lumpAmortizeShare: 0.5,
    amortizeShare: () => 0.5,
  },
  {
    id: "invest-then-amortize",
    name: "Invertir 5 años y luego amortizar",
    description: "Aprovecha el interés compuesto temprano y después ataca la deuda.",
    lumpAmortizeShare: 0,
    amortizeShare: (m) => (m <= 60 ? 0 : 1),
  },
  {
    id: "never",
    name: "Sin estrategia (efectivo)",
    description: "El ahorro se queda parado en la cuenta. El coste de oportunidad real.",
    lumpAmortizeShare: 0,
    cashOnly: true,
    amortizeShare: () => 0,
  },
  {
    id: "annual",
    name: "Amortización anual",
    description: "Se acumula parte del ahorro y se amortiza una vez al año, invirtiendo el resto.",
    lumpAmortizeShare: 1,
    annualLump: true,
    amortizeShare: () => 0.6,
  },
  {
    id: "dynamic",
    name: "Rebalanceo dinámico",
    description:
      "Invierte mientras la rentabilidad esperada supere al tipo de tu prestamo y cambia a amortizar cuando deja de compensar o cuando la cartera ya cubre la deuda.",
    lumpAmortizeShare: 0,
    amortizeShare: () => 0,
  },
];

export function simulate(inputs: Inputs, strategy: Strategy): ScenarioResult {
  const i = inputs.annualRate / 100 / 12;
  const r = Math.pow(1 + inputs.expectedReturn / 100, 1 / 12) - 1;
  const c = Math.pow(1 + CASH_RATE / 100, 1 / 12) - 1;
  const payment = monthlyPayment(inputs.principal, inputs.annualRate, inputs.years);
  const horizon = Math.max(12, Math.round(inputs.years * 12));

  let debt = inputs.principal;
  let portfolio = 0;
  let cash = 0;
  let invested = 0;
  let totalInterest = 0;
  let payoffMonth = 0;
  let pending = 0;

  const dynamicPrefersInvest = inputs.expectedReturn > inputs.annualRate + 0.5;

  const lumpToDebt = Math.min(debt, inputs.currentSavings * strategy.lumpAmortizeShare);
  debt -= lumpToDebt;
  const lumpRest = inputs.currentSavings - lumpToDebt;
  if (strategy.cashOnly) {
    cash += lumpRest;
  } else {
    portfolio += lumpRest;
    invested += lumpRest;
  }

  const series: Point[] = [
    { month: 0, debt, portfolio: portfolio + cash, netWorth: portfolio + cash - debt },
  ];
  let crossoverMonth: number | null = null;
  let freedomMonth: number | null = null;

  for (let m = 1; m <= horizon; m++) {
    portfolio *= 1 + r;
    cash *= 1 + c;

    const available = inputs.monthlySavings;

    if (debt > 0) {
      const interest = debt * i;
      totalInterest += interest;
      const principalPart = Math.min(debt, Math.max(0, payment - interest));
      debt -= principalPart;

      const share =
        strategy.id === "dynamic"
          ? dynamicPrefersInvest && portfolio < debt
            ? 0
            : 1
          : strategy.amortizeShare(m);

      let toDebt = available * share;
      const toMarket = available - toDebt;

      if (strategy.annualLump) {
        pending += toDebt;
        toDebt = 0;
        if (m % 12 === 0) {
          toDebt = pending;
          pending = 0;
        }
      }

      const applied = Math.min(debt, toDebt);
      debt -= applied;
      const leftover = toDebt - applied;

      if (strategy.cashOnly) {
        cash += toMarket + leftover;
      } else {
        portfolio += toMarket + leftover;
        invested += toMarket + leftover;
      }

      if (debt <= 0.5) {
        debt = 0;
        payoffMonth = payoffMonth || m;
      }
    } else {
      const flow = payment + available;
      if (strategy.cashOnly) {
        cash += flow;
      } else {
        portfolio += flow;
        invested += flow;
      }
    }

    const liquid = portfolio + cash;
    if (crossoverMonth === null && debt > 0 && liquid >= debt) crossoverMonth = m;
    if (freedomMonth === null && debt === 0) freedomMonth = m;

    series.push({ month: m, debt, portfolio: liquid, netWorth: liquid - debt });
  }

  if (!payoffMonth) payoffMonth = horizon;
  if (crossoverMonth === null && (series[series.length - 1]?.netWorth ?? 0) > 0) {
    crossoverMonth = payoffMonth;
  }

  const finalPortfolio = portfolio + cash;
  const gains = Math.max(0, finalPortfolio - invested);
  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description,
    series,
    totalInterest,
    payoffMonth,
    finalPortfolio,
    invested,
    finalNetWorth: finalPortfolio - debt,
    netWorthAfterTax: finalPortfolio - gains * (inputs.taxRate / 100) - debt,
    crossoverMonth,
    freedomMonth,
  };
}

export function runAll(inputs: Inputs): ScenarioResult[] {
  return STRATEGIES.map((s) => simulate(inputs, s));
}

export const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const monthsLabel = (m: number | null) => {
  if (m === null) return "—";
  const y = Math.floor(m / 12);
  const rest = m % 12;
  if (y === 0) return `${rest} meses`;
  if (rest === 0) return `${y} años`;
  return `${y} años y ${rest} meses`;
};

export const dateFromMonth = (m: number | null) => {
  if (m === null) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
};
