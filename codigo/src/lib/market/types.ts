/** Tipos compartidos del Financial Data Engine (seguros para el cliente). */

export type Frequency = "daily" | "weekly" | "monthly";

/** Punto de la serie histórica. `c` = cierre, `a` = cierre ajustado. */
export type SeriePoint = {
  d: string; // YYYY-MM-DD
  o?: number;
  h?: number;
  l?: number;
  c: number;
  a: number;
  v?: number;
};

export type DividendPoint = { d: string; amount: number };
export type SplitPoint = { d: string; ratio: string };

export type InstrumentKind =
  | "ETF"
  | "Fondo"
  | "Acción"
  | "Índice"
  | "REIT"
  | "Materia prima"
  | "Cripto"
  | "Bono"
  | "Divisa"
  | "Liquidez"
  | "Otro";

export type Instrument = {
  symbol: string;
  name: string;
  shortName?: string | null;
  kind: InstrumentKind;
  isin?: string | null;
  exchange?: string | null;
  currency: string;
  country?: string | null;
  sector?: string | null;
  manager?: string | null;
  provider: string;
  providerId?: string | null;
};

export type DataQuality = "real" | "partial" | "unavailable";

export type SeriesMeta = {
  provider: string;
  providerLabel: string;
  currency: string;
  frequency: Frequency;
  firstDate: string | null;
  lastDate: string | null;
  pointCount: number;
  fetchedAt: string;
  adjusted: boolean;
  quality: DataQuality;
  /** Motivo cuando la calidad no es "real". */
  note?: string;
};

export type AssetSeries = {
  instrument: Instrument;
  points: SeriePoint[];
  dividends: DividendPoint[];
  splits: SplitPoint[];
  meta: SeriesMeta;
};

/** Respuesta del motor: o hay datos reales, o se dice explícitamente que no los hay. */
export type SeriesResult =
  | { ok: true; series: AssetSeries }
  | { ok: false; symbol: string; error: string; lastKnown?: SeriesMeta | null };

export const PROVIDER_LABEL: Record<string, string> = {
  yahoo: "Yahoo Finance",
  frankfurter: "Frankfurter (BCE)",
  cache: "Caché Prestafin",
};

export function providerLabel(p: string) {
  return PROVIDER_LABEL[p] ?? p;
}
