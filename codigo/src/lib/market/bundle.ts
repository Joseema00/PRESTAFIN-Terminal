/** Tipos del paquete de datos de mercado devuelto al cliente. */
import type { AssetMetrics } from "./metrics";
import type { Instrument, SeriePoint, SeriesMeta } from "./types";
import type { Lookback, Provenance } from "./provider-types";

export type MarketSearchResult = { results: Instrument[]; error: string | null };

export type AssetBundle = {
  symbol: string;
  ok: boolean;
  error?: string;
  instrument?: Instrument;
  meta?: SeriesMeta;
  metrics?: AssetMetrics;
  /** Serie mensual (última observación de cada mes) para gráficos y backtesting. */
  monthly?: SeriePoint[];
  /** Último precio real y variación diaria, cuando hay serie. */
  latest?: { price: number; date: string; changePct: number | null; currency: string };
};

/** Trazabilidad exigible: quién dio el dato, cuándo y con qué calidad. */
export type SourceInfo = {
  symbol: string;
  provider: string;
  providerLabel: string;
  lastDate: string | null;
  fetchedAt: string;
  quality: SeriesMeta["quality"];
  provenance: Provenance;
};

export type MarketBundle = {
  assets: AssetBundle[];
  /** Análisis multiactivo sobre la ventana histórica común real. */
  matrix: {
    symbols: string[];
    annualizedReturns: number[];
    annualizedVols: number[];
    covariance: number[][];
    correlation: number[][];
    commonStart: string | null;
    months: number;
    limitedBy: string[];
    dropped: string[];
    /** Retornos mensuales reales alineados, para bootstrap y Monte Carlo correlacionado. */
    monthlyReturns?: number[][];
  } | null;
  /** Ventana histórica efectivamente utilizada. */
  lookback: Lookback;
  sources: SourceInfo[];
  generatedAt: string;
};
