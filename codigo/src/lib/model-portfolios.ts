import type { Holding } from "./portfolio";

export type ModelPortfolio = {
  id: string;
  name: string;
  author: string;
  tag: string;
  description: string;
  allocation: { assetId: string; pct: number }[];
};

export const MODEL_PORTFOLIOS: ModelPortfolio[] = [
  {
    id: "bogleheads",
    name: "Bogleheads 3 fondos",
    author: "John C. Bogle",
    tag: "Clásica",
    description: "Renta variable global + emergentes + bonos. Simplicidad, bajo coste y disciplina.",
    allocation: [
      { assetId: "iwda", pct: 60 },
      { assetId: "emim", pct: 15 },
      { assetId: "agh", pct: 25 },
    ],
  },
  {
    id: "sixty-forty",
    name: "60 / 40",
    author: "Estándar institucional",
    tag: "Equilibrada",
    description: "La referencia histórica: 60% acciones globales, 40% renta fija agregada.",
    allocation: [
      { assetId: "vwce", pct: 60 },
      { assetId: "agh", pct: 40 },
    ],
  },
  {
    id: "all-weather",
    name: "All Weather",
    author: "Ray Dalio",
    tag: "Todo clima",
    description: "Paridad de riesgo: funciona en crecimiento, recesión, inflación y deflación.",
    allocation: [
      { assetId: "vwce", pct: 30 },
      { assetId: "ibgl", pct: 40 },
      { assetId: "ibgs", pct: 15 },
      { assetId: "sgln", pct: 7.5 },
      { assetId: "cmod", pct: 7.5 },
    ],
  },
  {
    id: "golden-butterfly",
    name: "Golden Butterfly",
    author: "Portfolio Charts",
    tag: "Antifrágil",
    description: "Cinco bloques iguales: crecimiento, valor, bonos largos, bonos cortos y oro.",
    allocation: [
      { assetId: "cspx", pct: 20 },
      { assetId: "iusn", pct: 20 },
      { assetId: "ibgl", pct: 20 },
      { assetId: "ibgs", pct: 20 },
      { assetId: "sgln", pct: 20 },
    ],
  },
  {
    id: "permanent",
    name: "Cartera Permanente",
    author: "Harry Browne",
    tag: "Defensiva",
    description: "25% en acciones, bonos largos, oro y liquidez. Rebalanceo anual.",
    allocation: [
      { assetId: "vwce", pct: 25 },
      { assetId: "ibgl", pct: 25 },
      { assetId: "sgln", pct: 25 },
      { assetId: "csh2", pct: 25 },
    ],
  },
  {
    id: "dividend-growth",
    name: "Dividend Growth",
    author: "Rentas crecientes",
    tag: "Rentas",
    description: "Empresas con dividendo creciente y REITs para generar flujo de caja periódico.",
    allocation: [
      { assetId: "vhyl", pct: 35 },
      { assetId: "wqdv", pct: 25 },
      { assetId: "o", pct: 15 },
      { assetId: "iwda-reit", pct: 10 },
      { assetId: "ieac", pct: 15 },
    ],
  },
  {
    id: "fire",
    name: "FIRE agresiva",
    author: "Comunidad FIRE",
    tag: "Acumulación",
    description: "Máxima exposición a renta variable global para maximizar el capital a largo plazo.",
    allocation: [
      { assetId: "vwce", pct: 70 },
      { assetId: "iusn", pct: 15 },
      { assetId: "emim", pct: 15 },
    ],
  },
  {
    id: "tech-barbell",
    name: "Barbell tecnológico",
    author: "Estrategia satélite",
    tag: "Núcleo + satélite",
    description: "Núcleo indexado global con satélites de innovación y cripto, colchón en monetario.",
    allocation: [
      { assetId: "iwda", pct: 55 },
      { assetId: "eqqq", pct: 15 },
      { assetId: "wtai", pct: 10 },
      { assetId: "btc", pct: 5 },
      { assetId: "csh2", pct: 15 },
    ],
  },
  {
    id: "inflation-hedge",
    name: "Cobertura de inflación",
    author: "Real assets",
    tag: "Activos reales",
    description: "Activos reales y bonos ligados a inflación para proteger el poder adquisitivo.",
    allocation: [
      { assetId: "vwce", pct: 35 },
      { assetId: "itps", pct: 25 },
      { assetId: "sgln", pct: 15 },
      { assetId: "cmod", pct: 10 },
      { assetId: "iwda-reit", pct: 15 },
    ],
  },
  {
    id: "conservative",
    name: "Conservadora 30/70",
    author: "Preservación",
    tag: "Baja volatilidad",
    description: "Prioriza estabilidad: mayoría en renta fija de calidad y liquidez remunerada.",
    allocation: [
      { assetId: "vwce", pct: 25 },
      { assetId: "agh", pct: 35 },
      { assetId: "ieac", pct: 20 },
      { assetId: "csh2", pct: 20 },
    ],
  },
];

export function modelToHoldings(model: ModelPortfolio, capital: number): Holding[] {
  return model.allocation.map((a) => ({ assetId: a.assetId, amount: (capital * a.pct) / 100 }));
}