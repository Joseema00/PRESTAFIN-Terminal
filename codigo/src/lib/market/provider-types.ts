/**
 * Tipos compartidos de la Market Data Layer (seguros para el cliente).
 * Toda la aplicación habla con esta abstracción, nunca con un proveedor concreto.
 */
import type { DividendPoint, Frequency, Instrument, InstrumentKind, SeriePoint, SplitPoint } from "./types";

/** Origen de un dato mostrado al usuario. Nunca se mezclan. */
export type Provenance = "REAL" | "USER_ASSUMPTION" | "MODEL_ASSUMPTION" | "SIMULATION";

/** Ventana histórica solicitada para los cálculos. */
export type Lookback = "1y" | "3y" | "5y" | "10y" | "max";

export const LOOKBACKS: { id: Lookback; label: string; years: number | null }[] = [
  { id: "1y", label: "1 año", years: 1 },
  { id: "3y", label: "3 años", years: 3 },
  { id: "5y", label: "5 años", years: 5 },
  { id: "10y", label: "10 años", years: 10 },
  { id: "max", label: "Máximo disponible", years: null },
];

export function lookbackYears(l: Lookback | undefined): number | null {
  return LOOKBACKS.find((x) => x.id === (l ?? "max"))?.years ?? null;
}

export type Quote = {
  symbol: string;
  price: number;
  currency: string;
  /** Variación diaria en % respecto al cierre anterior, si el proveedor la da. */
  changePct: number | null;
  date: string;
  provider: string;
  providerLabel: string;
};

export type Fundamentals = {
  symbol: string;
  marketCap?: number | null;
  ter?: number | null;
  sector?: string | null;
  country?: string | null;
  manager?: string | null;
  benchmark?: string | null;
  isin?: string | null;
  provider: string;
};

export type ProviderInfo = {
  id: string;
  label: string;
  priority: number;
  enabled: boolean;
  /** Motivo por el que un proveedor está desactivado (falta de variable de entorno, etc.). */
  reason?: string;
  capabilities: string[];
};

export type ProviderSeries = {
  instrument: Instrument;
  points: SeriePoint[];
  dividends: DividendPoint[];
  splits: SplitPoint[];
  frequency: Frequency;
  currency: string;
  adjusted: boolean;
};

export type { Frequency, Instrument, InstrumentKind, SeriePoint, DividendPoint, SplitPoint };

/** Etiqueta legible del origen del dato para la interfaz. */
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  REAL: "Dato real",
  USER_ASSUMPTION: "Supuesto del usuario",
  MODEL_ASSUMPTION: "Supuesto del modelo",
  SIMULATION: "Simulación",
};
