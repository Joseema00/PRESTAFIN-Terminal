import { EXTENDED_ASSETS } from "./assets-extended";

export type AssetClass =
  | "equity_us"
  | "equity_dev"
  | "equity_em"
  | "equity_small"
  | "sector"
  | "bond_gov"
  | "bond_corp"
  | "bond_infl"
  | "reit"
  | "gold"
  | "commodity"
  | "crypto"
  | "cash";

export type AssetKind = "ETF" | "Fondo indexado" | "Fondo" | "Acción" | "REIT" | "Materia prima" | "Cripto" | "Liquidez";

export type Asset = {
  id: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  cls: AssetClass;
  /** rentabilidad nominal anual esperada, % */
  er: number;
  /** volatilidad anual, % */
  vol: number;
  /** dividendo/cupón anual estimado, % */
  yield: number;
  ter?: number;
  currency: string;
  /** Símbolo del proveedor de datos, si el activo se añadió por búsqueda. */
  symbol?: string | null;
  /** true cuando procede de la búsqueda de mercado y no del catálogo. */
  custom?: boolean;
};

export const CLASS_LABEL: Record<AssetClass, string> = {
  equity_us: "Renta variable EE. UU.",
  equity_dev: "Renta variable global",
  equity_em: "Mercados emergentes",
  equity_small: "Small caps / Value",
  sector: "Sectorial y temático",
  bond_gov: "Deuda pública",
  bond_corp: "Deuda corporativa",
  bond_infl: "Bonos ligados a inflación",
  reit: "Inmobiliario cotizado",
  gold: "Oro",
  commodity: "Materias primas",
  crypto: "Criptomonedas",
  cash: "Liquidez",
};

/** Correlaciones históricas aproximadas entre clases de activo (educativas). */
const C: Partial<Record<string, number>> = {};
const set = (a: AssetClass, b: AssetClass, v: number) => {
  C[`${a}|${b}`] = v;
  C[`${b}|${a}`] = v;
};

const EQUITIES: AssetClass[] = ["equity_us", "equity_dev", "equity_em", "equity_small", "sector"];
EQUITIES.forEach((a) => EQUITIES.forEach((b) => a !== b && set(a, b, 0.85)));
set("equity_em", "equity_us", 0.72);
set("equity_em", "equity_dev", 0.78);
set("sector", "equity_em", 0.68);

EQUITIES.forEach((e) => {
  set(e, "bond_gov", -0.05);
  set(e, "bond_corp", 0.35);
  set(e, "bond_infl", 0.1);
  set(e, "reit", 0.7);
  set(e, "gold", 0.05);
  set(e, "commodity", 0.3);
  set(e, "crypto", 0.4);
  set(e, "cash", 0);
});
set("bond_gov", "bond_corp", 0.6);
set("bond_gov", "bond_infl", 0.7);
set("bond_corp", "bond_infl", 0.5);
set("bond_gov", "reit", 0.2);
set("bond_corp", "reit", 0.4);
set("bond_gov", "gold", 0.25);
set("bond_corp", "gold", 0.1);
set("bond_infl", "gold", 0.35);
set("bond_gov", "commodity", -0.1);
set("bond_corp", "commodity", 0.15);
set("bond_infl", "commodity", 0.45);
set("bond_gov", "crypto", 0.05);
set("bond_corp", "crypto", 0.2);
set("bond_infl", "crypto", 0.1);
set("reit", "gold", 0.15);
set("reit", "commodity", 0.3);
set("reit", "crypto", 0.3);
set("gold", "commodity", 0.4);
set("gold", "crypto", 0.15);
set("commodity", "crypto", 0.25);
(["bond_gov", "bond_corp", "bond_infl", "reit", "gold", "commodity", "crypto"] as AssetClass[]).forEach(
  (a) => set(a, "cash", 0),
);
set("cash", "cash", 1);

/** Correlación entre dos activos: por clase, con extra si comparten clase. */
export function correlation(a: Asset, b: Asset): number {
  if (a.id === b.id) return 1;
  if (a.cls === b.cls) return a.cls === "crypto" ? 0.82 : a.cls === "sector" ? 0.75 : 0.92;
  return C[`${a.cls}|${b.cls}`] ?? 0.3;
}

const CORE_ASSETS: Asset[] = [
  // --- ETFs globales ---
  { id: "vwce", ticker: "VWCE", name: "Vanguard FTSE All-World UCITS ETF", kind: "ETF", cls: "equity_dev", er: 7.4, vol: 15.5, yield: 1.8, ter: 0.14, currency: "EUR" },
  { id: "iwda", ticker: "IWDA", name: "iShares Core MSCI World UCITS ETF", kind: "ETF", cls: "equity_dev", er: 7.3, vol: 15.0, yield: 1.7, ter: 0.2, currency: "EUR" },
  { id: "spyi", ticker: "SPYI", name: "SPDR MSCI ACWI IMI UCITS ETF", kind: "ETF", cls: "equity_dev", er: 7.3, vol: 15.4, yield: 1.8, ter: 0.17, currency: "EUR" },
  { id: "cspx", ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF", kind: "ETF", cls: "equity_us", er: 7.8, vol: 16.5, yield: 1.3, ter: 0.07, currency: "USD" },
  { id: "vusa", ticker: "VUSA", name: "Vanguard S&P 500 UCITS ETF", kind: "ETF", cls: "equity_us", er: 7.8, vol: 16.4, yield: 1.4, ter: 0.07, currency: "EUR" },
  { id: "eqqq", ticker: "EQQQ", name: "Invesco Nasdaq-100 UCITS ETF", kind: "ETF", cls: "equity_us", er: 9.0, vol: 22.0, yield: 0.5, ter: 0.3, currency: "USD" },
  { id: "meud", ticker: "MEUD", name: "Amundi Stoxx Europe 600 UCITS ETF", kind: "ETF", cls: "equity_dev", er: 6.6, vol: 15.8, yield: 3.0, ter: 0.07, currency: "EUR" },
  { id: "emim", ticker: "EMIM", name: "iShares Core MSCI EM IMI UCITS ETF", kind: "ETF", cls: "equity_em", er: 7.6, vol: 19.5, yield: 2.4, ter: 0.18, currency: "USD" },
  { id: "iusn", ticker: "IUSN", name: "iShares MSCI World Small Cap UCITS ETF", kind: "ETF", cls: "equity_small", er: 7.9, vol: 19.0, yield: 1.7, ter: 0.35, currency: "USD" },
  { id: "iwvl", ticker: "IWVL", name: "iShares Edge MSCI World Value Factor", kind: "ETF", cls: "equity_small", er: 7.5, vol: 16.8, yield: 3.1, ter: 0.3, currency: "USD" },
  { id: "iwqu", ticker: "IWQU", name: "iShares Edge MSCI World Quality Factor", kind: "ETF", cls: "equity_dev", er: 7.6, vol: 15.6, yield: 1.5, ter: 0.3, currency: "USD" },
  { id: "vhyl", ticker: "VHYL", name: "Vanguard FTSE All-World High Div Yield", kind: "ETF", cls: "equity_dev", er: 6.8, vol: 14.2, yield: 3.6, ter: 0.29, currency: "USD" },
  { id: "wqdv", ticker: "WQDS", name: "SPDR S&P Global Dividend Aristocrats", kind: "ETF", cls: "equity_dev", er: 6.5, vol: 14.0, yield: 4.0, ter: 0.45, currency: "USD" },

  // --- Sectorial / temático ---
  { id: "wtai", ticker: "WTAI", name: "WisdomTree AI & Innovation UCITS ETF", kind: "ETF", cls: "sector", er: 9.5, vol: 26.0, yield: 0.2, ter: 0.4, currency: "USD" },
  { id: "inrg", ticker: "INRG", name: "iShares Global Clean Energy UCITS ETF", kind: "ETF", cls: "sector", er: 8.0, vol: 28.0, yield: 1.0, ter: 0.65, currency: "USD" },
  { id: "hlth", ticker: "IUHC", name: "iShares S&P 500 Health Care Sector", kind: "ETF", cls: "sector", er: 7.2, vol: 16.0, yield: 1.4, ter: 0.15, currency: "USD" },
  { id: "sxlf", ticker: "SXLF", name: "SPDR S&P U.S. Financials Select Sector", kind: "ETF", cls: "sector", er: 7.4, vol: 19.0, yield: 2.0, ter: 0.15, currency: "USD" },

  // --- Fondos indexados (traspasables ES) ---
  { id: "vanguard-global", ticker: "IE00B03HCZ61", name: "Vanguard Global Stock Index Fund", kind: "Fondo indexado", cls: "equity_dev", er: 7.3, vol: 15.2, yield: 0, ter: 0.18, currency: "EUR" },
  { id: "vanguard-sp500", ticker: "IE0032620787", name: "Vanguard U.S. 500 Stock Index Fund", kind: "Fondo indexado", cls: "equity_us", er: 7.8, vol: 16.4, yield: 0, ter: 0.1, currency: "EUR" },
  { id: "vanguard-em", ticker: "IE0031786142", name: "Vanguard Emerging Markets Stock Index", kind: "Fondo indexado", cls: "equity_em", er: 7.6, vol: 19.4, yield: 0, ter: 0.23, currency: "EUR" },
  { id: "vanguard-glb-bond", ticker: "IE00B18GC888", name: "Vanguard Global Bond Index Fund (EUR H)", kind: "Fondo indexado", cls: "bond_gov", er: 3.0, vol: 5.0, yield: 0, ter: 0.15, currency: "EUR" },
  { id: "ishares-euro-gov", ticker: "IE00B14X4Q57", name: "iShares Euro Govt Bond 1-3yr UCITS ETF", kind: "ETF", cls: "bond_gov", er: 2.4, vol: 1.6, yield: 2.6, ter: 0.10, currency: "EUR" },
  { id: "fidelity-world", ticker: "IE00BYX5NX33", name: "Fidelity MSCI World Index Fund", kind: "Fondo indexado", cls: "equity_dev", er: 7.3, vol: 15.1, yield: 0, ter: 0.12, currency: "EUR" },

  // --- Fondos de gestión activa ---
  { id: "cobas-int", ticker: "COBASINT", name: "Cobas Internacional FI", kind: "Fondo", cls: "equity_small", er: 7.5, vol: 20.0, yield: 0, ter: 1.75, currency: "EUR" },
  { id: "az-int", ticker: "AZVALORINT", name: "azValor Internacional FI", kind: "Fondo", cls: "equity_small", er: 7.6, vol: 20.5, yield: 0, ter: 1.8, currency: "EUR" },
  { id: "fundsmith", ticker: "FUNDSMITH", name: "Fundsmith Equity Fund", kind: "Fondo", cls: "equity_dev", er: 8.0, vol: 15.5, yield: 0, ter: 1.05, currency: "EUR" },
  { id: "seilern", ticker: "SEILERN", name: "Seilern World Growth", kind: "Fondo", cls: "equity_dev", er: 7.9, vol: 16.2, yield: 0, ter: 1.1, currency: "EUR" },

  // --- Renta fija ---
  { id: "agh", ticker: "AGGH", name: "iShares Core Global Aggregate Bond (EUR H)", kind: "ETF", cls: "bond_gov", er: 3.1, vol: 5.2, yield: 3.0, ter: 0.1, currency: "EUR" },
  { id: "ibgl", ticker: "IBGL", name: "iShares Euro Gov Bond 15-30yr UCITS ETF", kind: "ETF", cls: "bond_gov", er: 3.4, vol: 12.5, yield: 3.2, ter: 0.15, currency: "EUR" },
  { id: "ibgs", ticker: "IBGS", name: "iShares Euro Gov Bond 1-3yr UCITS ETF", kind: "ETF", cls: "bond_gov", er: 2.4, vol: 1.6, yield: 2.6, ter: 0.10, currency: "EUR" },
  { id: "ieac", ticker: "IEAC", name: "iShares Core Euro Corporate Bond UCITS ETF", kind: "ETF", cls: "bond_corp", er: 3.5, vol: 5.8, yield: 3.4, ter: 0.2, currency: "EUR" },
  { id: "ihyg", ticker: "IHYG", name: "iShares Euro High Yield Corp Bond", kind: "ETF", cls: "bond_corp", er: 5.0, vol: 9.5, yield: 5.5, ter: 0.5, currency: "EUR" },
  { id: "itps", ticker: "ITPS", name: "iShares $ TIPS UCITS ETF", kind: "ETF", cls: "bond_infl", er: 3.0, vol: 6.5, yield: 2.2, ter: 0.1, currency: "USD" },
  { id: "iblc", ticker: "EMBE", name: "iShares J.P. Morgan EM Bond (EUR H)", kind: "ETF", cls: "bond_corp", er: 4.6, vol: 9.0, yield: 5.0, ter: 0.5, currency: "EUR" },

  // --- Inmobiliario ---
  { id: "iwda-reit", ticker: "IWDP", name: "iShares Developed Markets Property Yield", kind: "REIT", cls: "reit", er: 6.4, vol: 17.5, yield: 3.6, ter: 0.59, currency: "USD" },
  { id: "eprа", ticker: "IPRP", name: "iShares European Property Yield UCITS ETF", kind: "REIT", cls: "reit", er: 6.0, vol: 18.5, yield: 3.9, ter: 0.4, currency: "EUR" },
  { id: "merlin", ticker: "MRL", name: "Merlin Properties SOCIMI", kind: "REIT", cls: "reit", er: 6.2, vol: 22.0, yield: 4.5, currency: "EUR" },
  { id: "colonial", ticker: "COL", name: "Inmobiliaria Colonial SOCIMI", kind: "REIT", cls: "reit", er: 5.8, vol: 23.0, yield: 3.8, currency: "EUR" },
  { id: "o", ticker: "O", name: "Realty Income Corp", kind: "REIT", cls: "reit", er: 6.5, vol: 19.0, yield: 5.4, currency: "USD" },

  // --- Oro y materias primas ---
  { id: "sgln", ticker: "SGLN", name: "iShares Physical Gold ETC", kind: "Materia prima", cls: "gold", er: 4.5, vol: 15.0, yield: 0, ter: 0.12, currency: "USD" },
  { id: "phag", ticker: "PHAG", name: "WisdomTree Physical Silver", kind: "Materia prima", cls: "commodity", er: 4.0, vol: 26.0, yield: 0, ter: 0.49, currency: "USD" },
  { id: "cmod", ticker: "CMOD", name: "Invesco Bloomberg Commodity UCITS ETF", kind: "Materia prima", cls: "commodity", er: 4.2, vol: 16.0, yield: 0, ter: 0.19, currency: "USD" },
  { id: "wtio", ticker: "CRUD", name: "WisdomTree Brent Crude Oil ETC", kind: "Materia prima", cls: "commodity", er: 3.5, vol: 32.0, yield: 0, ter: 0.49, currency: "USD" },

  // --- Acciones ---
  { id: "aapl", ticker: "AAPL", name: "Apple Inc.", kind: "Acción", cls: "equity_us", er: 8.5, vol: 26.0, yield: 0.5, currency: "USD" },
  { id: "msft", ticker: "MSFT", name: "Microsoft Corp.", kind: "Acción", cls: "equity_us", er: 8.8, vol: 25.0, yield: 0.7, currency: "USD" },
  { id: "nvda", ticker: "NVDA", name: "NVIDIA Corp.", kind: "Acción", cls: "equity_us", er: 11.0, vol: 45.0, yield: 0.1, currency: "USD" },
  { id: "brk", ticker: "BRK.B", name: "Berkshire Hathaway", kind: "Acción", cls: "equity_us", er: 8.0, vol: 19.0, yield: 0, currency: "USD" },
  { id: "jnj", ticker: "JNJ", name: "Johnson & Johnson", kind: "Acción", cls: "equity_us", er: 6.5, vol: 17.0, yield: 3.0, currency: "USD" },
  { id: "itx", ticker: "ITX", name: "Industria de Diseño Textil (Inditex)", kind: "Acción", cls: "equity_dev", er: 7.5, vol: 24.0, yield: 3.5, currency: "EUR" },
  { id: "san", ticker: "SAN", name: "Banco Santander", kind: "Acción", cls: "equity_dev", er: 7.0, vol: 28.0, yield: 4.5, currency: "EUR" },
  { id: "ibe", ticker: "IBE", name: "Iberdrola", kind: "Acción", cls: "equity_dev", er: 6.5, vol: 20.0, yield: 4.2, currency: "EUR" },
  { id: "asml", ticker: "ASML", name: "ASML Holding", kind: "Acción", cls: "equity_dev", er: 9.5, vol: 33.0, yield: 1.0, currency: "EUR" },
  { id: "lvmh", ticker: "MC", name: "LVMH", kind: "Acción", cls: "equity_dev", er: 8.0, vol: 26.0, yield: 2.0, currency: "EUR" },

  // --- Cripto ---
  { id: "btc", ticker: "BTC", name: "Bitcoin", kind: "Cripto", cls: "crypto", er: 15.0, vol: 60.0, yield: 0, currency: "USD" },
  { id: "eth", ticker: "ETH", name: "Ethereum", kind: "Cripto", cls: "crypto", er: 14.0, vol: 72.0, yield: 0, currency: "USD" },
  { id: "sol", ticker: "SOL", name: "Solana", kind: "Cripto", cls: "crypto", er: 14.0, vol: 90.0, yield: 0, currency: "USD" },
  { id: "ibit", ticker: "BTCE", name: "ETC Group Physical Bitcoin", kind: "Cripto", cls: "crypto", er: 14.5, vol: 60.0, yield: 0, ter: 2.0, currency: "EUR" },

  // --- Liquidez ---
  { id: "interview-cash-pending", ticker: "PENDIENTE", name: "Liquidez pendiente de asignar (sin producto)", kind: "Liquidez", cls: "cash", er: 0, vol: 0, yield: 0, currency: "EUR", symbol: null },
  { id: "csh2", ticker: "CSH2", name: "Amundi Smart Overnight Return (monetario)", kind: "Liquidez", cls: "cash", er: 2.2, vol: 0.4, yield: 2.2, ter: 0.1, currency: "EUR" },
  { id: "cash", ticker: "CASH", name: "Cuenta remunerada / depósito", kind: "Liquidez", cls: "cash", er: 1.8, vol: 0.2, yield: 1.8, currency: "EUR" },
];

export const ASSETS: Asset[] = [...CORE_ASSETS, ...EXTENDED_ASSETS];

export const assetById = (id: string) => ASSETS.find((a) => a.id === id);

export function searchAssets(query: string, cls?: AssetClass | "all"): Asset[] {
  const q = query.trim().toLowerCase();
  return ASSETS.filter((a) => {
    if (cls && cls !== "all" && a.cls !== cls) return false;
    if (!q) return true;
    return (
      a.ticker.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.kind.toLowerCase().includes(q) ||
      CLASS_LABEL[a.cls].toLowerCase().includes(q)
    );
  });
}