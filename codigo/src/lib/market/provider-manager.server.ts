/**
 * ProviderManager: registro único de proveedores de datos de mercado.
 *
 * Ningún componente ni función de negocio conoce el proveedor concreto; todos
 * piden los datos aquí. Cambiar o añadir proveedores no obliga a tocar
 * Portfolio Lab ni el Net Worth Engine.
 *
 * Regla de oro: si ningún proveedor devuelve datos reales, se propaga el error.
 * Nunca se rellena con estimaciones.
 */
import type { DividendPoint, Frequency, Instrument, InstrumentKind } from "./types";
import { providerLabel } from "./types";
import type { Fundamentals, ProviderInfo, ProviderSeries, Quote } from "./provider-types";
import { dedupe, yahooProvider, yahooMirrorProvider } from "./providers.server";
import { openbbProvider, yfinanceProvider } from "./remote-provider.server";

export interface MarketDataProvider {
  id: string;
  label: string;
  /** Menor número = se intenta antes. */
  priority: number;
  capabilities: string[];
  supports: (kind?: InstrumentKind) => boolean;
  status(): { enabled: boolean; reason?: string };
  search(query: string, limit: number): Promise<Instrument[]>;
  history(symbol: string, opts: { frequency: Frequency }): Promise<ProviderSeries>;
  latest?(symbol: string): Promise<Quote>;
  dividends?(symbol: string): Promise<DividendPoint[]>;
  fundamentals?(symbol: string): Promise<Fundamentals>;
}

/** Adapta los proveedores Yahoo existentes a la interfaz del manager. */
function fromLegacy(
  p: typeof yahooProvider,
  priority: number,
): MarketDataProvider {
  return {
    id: p.id,
    label: p.label,
    priority,
    capabilities: ["search", "history", "latest"],
    supports: p.supports,
    status: () => ({ enabled: true }),
    search: (q, l) => p.search(q, l),
    history: (s, o) => p.history(s, o),
    async latest(symbol) {
      const series = await p.history(symbol, { frequency: "daily" });
      const pts = series.points;
      const last = pts[pts.length - 1]!;
      const prev = pts[pts.length - 2];
      return {
        symbol,
        price: last.c,
        currency: series.currency,
        changePct: prev ? ((last.c - prev.c) / prev.c) * 100 : null,
        date: last.d,
        provider: p.id,
        providerLabel: providerLabel(p.id),
      };
    },
  };
}

let registry: MarketDataProvider[] | null = null;

function providers(): MarketDataProvider[] {
  if (registry) return registry;
  // Las variables de entorno se leen en cada petición dentro de cada proveedor.
  registry = [
    fromLegacy(yahooProvider, 1),
    fromLegacy(yahooMirrorProvider, 2),
    yfinanceProvider,
    openbbProvider,
  ].sort((a, b) => a.priority - b.priority);
  return registry;
}

/** Proveedores activos, en orden de prioridad. */
function active(kind?: InstrumentKind) {
  return providers().filter((p) => p.status().enabled && p.supports(kind));
}

export type ChainError = { provider: string; error: string };

export type ChainOutcome<T> =
  | { ok: true; value: T; provider: string; attempts: string[]; errors: ChainError[] }
  | { ok: false; error: string; attempts: string[]; errors: ChainError[] };

async function chain<T>(
  kind: InstrumentKind | undefined,
  can: (p: MarketDataProvider) => boolean,
  run: (p: MarketDataProvider) => Promise<T>,
  valid: (v: T) => boolean = () => true,
): Promise<ChainOutcome<T>> {
  const attempts: string[] = [];
  const errors: ChainError[] = [];
  let lastError = "No hay proveedores de datos disponibles";
  for (const p of active(kind)) {
    if (!can(p)) continue;
    attempts.push(p.id);
    try {
      const value = await run(p);
      if (valid(value)) return { ok: true, value, provider: p.id, attempts, errors };
      lastError = "El proveedor no devolvió datos";
      errors.push({ provider: p.id, error: lastError });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      errors.push({ provider: p.id, error: lastError });
    }
  }
  return { ok: false, error: lastError, attempts, errors };
}

/* ------------------------------ API pública ------------------------------- */

export const providerManager = {
  /** Inventario de proveedores y su estado de configuración. */
  list(): ProviderInfo[] {
    return providers().map((p) => {
      const s = p.status();
      return {
        id: p.id,
        label: p.label,
        priority: p.priority,
        enabled: s.enabled,
        ...(s.reason ? { reason: s.reason } : {}),
        capabilities: p.capabilities,
      };
    });
  },

  getAssetSearch(query: string, limit = 12) {
    return chain<Instrument[]>(
      undefined,
      (p) => p.capabilities.includes("search"),
      (p) => dedupe(`search:${p.id}:${query}:${limit}`, () => p.search(query, limit)),
      (v) => v.length > 0,
    );
  },

  getHistoricalPrices(symbol: string, frequency: Frequency = "daily", kind?: InstrumentKind) {
    return chain<ProviderSeries>(
      kind,
      (p) => p.capabilities.includes("history"),
      (p) => dedupe(`history:${p.id}:${symbol}:${frequency}`, () => p.history(symbol, { frequency })),
      (v) => v.points.length > 1,
    );
  },

  getLatestPrice(symbol: string, kind?: InstrumentKind) {
    return chain<Quote>(
      kind,
      (p) => Boolean(p.latest),
      (p) => dedupe(`latest:${p.id}:${symbol}`, () => p.latest!(symbol)),
      (v) => Number.isFinite(v.price),
    );
  },

  getDividends(symbol: string) {
    return chain<DividendPoint[]>(
      undefined,
      (p) => Boolean(p.dividends),
      (p) => p.dividends!(symbol),
    );
  },

  getFundamentalData(symbol: string) {
    return chain<Fundamentals>(
      undefined,
      (p) => Boolean(p.fundamentals),
      (p) => p.fundamentals!(symbol),
    );
  },
};
