/**
 * Identificación única de cada activo del catálogo con su símbolo real en el
 * proveedor de datos (Yahoo Finance). Sin símbolo no hay datos históricos y el
 * activo se marca explícitamente como "sin datos".
 */
import { EXTENDED_ASSET_SYMBOLS } from "@/lib/assets-extended";

export const ASSET_SYMBOLS: Record<string, string> = {
  ...EXTENDED_ASSET_SYMBOLS,
  // ETFs globales
  vwce: "VWCE.DE",
  iwda: "IWDA.AS",
  spyi: "SPYI.DE",
  cspx: "CSPX.L",
  vusa: "VUSA.AS",
  eqqq: "EQQQ.DE",
  meud: "MEUD.PA",
  emim: "EMIM.AS",
  iusn: "IUSN.DE",
  iwvl: "IWVL.L",
  iwqu: "IWQU.L",
  vhyl: "VHYL.AS",
  wqdv: "GLDV.L",
  // Sectorial
  wtai: "WTAI.MI",
  inrg: "INRG.L",
  hlth: "IUHC.L",
  sxlf: "SXLF.MI",
  // Fondos indexados
  "vanguard-global": "0P00000RQC.F",
  "vanguard-sp500": "0P00000G12.F",
  "vanguard-em": "0P000060MS.F",
  "vanguard-glb-bond": "0P00012I69.F",
  "ishares-euro-gov": "IBGS.AS",
  "fidelity-world": "0P0001CLDK.F",
  // Gestión activa
  "cobas-int": "0P0001LFVN.F",
  "az-int": "0P00016YQ5.F",
  fundsmith: "0P0000RU81.L",
  seilern: "0P0001OCUI.F",
  // Renta fija
  agh: "AGGH.MI",
  ibgl: "IBGL.AS",
  ibgs: "IBGS.AS",
  ieac: "IEAC.L",
  ihyg: "IHYG.L",
  itps: "ITPS.L",
  iblc: "EMBE.MI",
  // Inmobiliario
  "iwda-reit": "IWDP.L",
  "eprа": "IPRP.L",
  merlin: "MRL.MC",
  colonial: "COL.MC",
  o: "O",
  // Oro y materias primas
  sgln: "SGLN.L",
  phag: "PHAG.L",
  cmod: "CMOD.MI",
  wtio: "CRUD.L",
  // Acciones
  aapl: "AAPL",
  msft: "MSFT",
  nvda: "NVDA",
  brk: "BRK-B",
  jnj: "JNJ",
  itx: "ITX.MC",
  san: "SAN.MC",
  ibe: "IBE.MC",
  asml: "ASML.AS",
  lvmh: "MC.PA",
  // Cripto
  btc: "BTC-EUR",
  eth: "ETH-EUR",
  sol: "SOL-EUR",
  ibit: "BTCE.DE",
  // Liquidez
  csh2: "CSH2.PA",
};

/** Activos sin cotización: se tratan como liquidez, nunca con rentabilidad inventada. */
export const CASH_ASSET_IDS = new Set(["cash"]);

export function symbolForAsset(id: string): string | null {
  if (CASH_ASSET_IDS.has(id)) return null;
  return ASSET_SYMBOLS[id] ?? null;
}
