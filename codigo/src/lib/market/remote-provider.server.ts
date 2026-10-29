/**
 * Proveedores remotos por REST (OpenBB y servicio Python con yfinance).
 * Se activan SOLO si existen sus variables de entorno; sin ellas, el resto de
 * la aplicación funciona exactamente igual con Yahoo Finance.
 *
 * Variables:
 *   OPENBB_API_URL / OPENBB_API_KEY
 *   PY_FINANCE_API_URL / PY_FINANCE_API_KEY
 *
 * Contrato esperado del servicio (ver services/py-finance):
 *   GET /search?query=&limit=      -> { results: Instrument[] }
 *   GET /history?symbol=&interval= -> { instrument, points, dividends, splits, currency, adjusted, frequency }
 *   GET /quote?symbol=             -> { price, currency, change_pct, date }
 *   GET /dividends?symbol=         -> { dividends: [{ d, amount }] }
 *   GET /info?symbol=              -> { isin, sector, country, market_cap, ter, manager, benchmark }
 */
import type { MarketDataProvider } from "./provider-manager.server";
import type { DividendPoint, Frequency, Instrument, SeriePoint, SplitPoint } from "./types";
import type { Fundamentals, ProviderSeries, Quote } from "./provider-types";

const INTERVAL: Record<Frequency, string> = { daily: "1d", weekly: "1wk", monthly: "1mo" };

type RemoteConfig = { id: string; label: string; priority: number; urlVar: string; keyVar: string };

function config(cfg: RemoteConfig) {
  const base = (process.env[cfg.urlVar] ?? "").trim().replace(/\/$/, "");
  const key = (process.env[cfg.keyVar] ?? "").trim();
  return { base, key };
}

async function getJson(url: string, key: string, timeoutMs = 20000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (key) headers["authorization"] = `Bearer ${key}`;
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function toInstrument(raw: Record<string, unknown>, provider: string): Instrument {
  return {
    symbol: String(raw["symbol"] ?? ""),
    name: String(raw["name"] ?? raw["symbol"] ?? ""),
    shortName: (raw["short_name"] as string) ?? null,
    kind: (raw["kind"] as Instrument["kind"]) ?? "Otro",
    isin: (raw["isin"] as string) ?? null,
    exchange: (raw["exchange"] as string) ?? null,
    currency: String(raw["currency"] ?? "USD"),
    country: (raw["country"] as string) ?? null,
    sector: (raw["sector"] as string) ?? null,
    provider,
    providerId: (raw["provider_id"] as string) ?? String(raw["symbol"] ?? ""),
  };
}

/** Crea un proveedor REST genérico. OpenBB y el servicio yfinance comparten contrato. */
export function createRemoteProvider(cfg: RemoteConfig): MarketDataProvider {
  return {
    id: cfg.id,
    label: cfg.label,
    priority: cfg.priority,
    capabilities: ["search", "history", "latest", "dividends", "fundamentals"],
    supports: () => true,
    status() {
      const { base } = config(cfg);
      return base
        ? { enabled: true }
        : { enabled: false, reason: `Configura ${cfg.urlVar} (y opcionalmente ${cfg.keyVar}) para activarlo` };
    },
    async search(query, limit) {
      const { base, key } = config(cfg);
      if (!base) throw new Error(`${cfg.label} no configurado`);
      const data = (await getJson(`${base}/search?query=${encodeURIComponent(query)}&limit=${limit}`, key)) as {
        results?: Record<string, unknown>[];
      };
      return (data.results ?? []).map((r) => toInstrument(r, cfg.id));
    },
    async history(symbol, { frequency }): Promise<ProviderSeries> {
      const { base, key } = config(cfg);
      if (!base) throw new Error(`${cfg.label} no configurado`);
      const data = (await getJson(
        `${base}/history?symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL[frequency]}`,
        key,
      )) as {
        instrument?: Record<string, unknown>;
        points?: SeriePoint[];
        dividends?: DividendPoint[];
        splits?: SplitPoint[];
        currency?: string;
        adjusted?: boolean;
        frequency?: Frequency;
      };
      const points = (data.points ?? []).filter((p) => Number.isFinite(p.c));
      if (points.length < 2) throw new Error("Histórico insuficiente en el proveedor");
      const instrument = toInstrument(data.instrument ?? { symbol }, cfg.id);
      const currency = data.currency ?? instrument.currency;
      instrument.currency = currency;
      return {
        instrument,
        points,
        dividends: data.dividends ?? [],
        splits: data.splits ?? [],
        frequency: data.frequency ?? frequency,
        currency,
        adjusted: data.adjusted ?? true,
      };
    },
    async latest(symbol): Promise<Quote> {
      const { base, key } = config(cfg);
      if (!base) throw new Error(`${cfg.label} no configurado`);
      const data = (await getJson(`${base}/quote?symbol=${encodeURIComponent(symbol)}`, key)) as {
        price?: number;
        currency?: string;
        change_pct?: number | null;
        date?: string;
      };
      if (typeof data.price !== "number") throw new Error("El proveedor no devolvió precio");
      return {
        symbol,
        price: data.price,
        currency: data.currency ?? "USD",
        changePct: data.change_pct ?? null,
        date: data.date ?? new Date().toISOString().slice(0, 10),
        provider: cfg.id,
        providerLabel: cfg.label,
      };
    },
    async dividends(symbol): Promise<DividendPoint[]> {
      const { base, key } = config(cfg);
      if (!base) throw new Error(`${cfg.label} no configurado`);
      const data = (await getJson(`${base}/dividends?symbol=${encodeURIComponent(symbol)}`, key)) as {
        dividends?: DividendPoint[];
      };
      return data.dividends ?? [];
    },
    async fundamentals(symbol): Promise<Fundamentals> {
      const { base, key } = config(cfg);
      if (!base) throw new Error(`${cfg.label} no configurado`);
      const data = (await getJson(`${base}/info?symbol=${encodeURIComponent(symbol)}`, key)) as Record<
        string,
        unknown
      >;
      return {
        symbol,
        marketCap: (data["market_cap"] as number) ?? null,
        ter: (data["ter"] as number) ?? null,
        sector: (data["sector"] as string) ?? null,
        country: (data["country"] as string) ?? null,
        manager: (data["manager"] as string) ?? null,
        benchmark: (data["benchmark"] as string) ?? null,
        isin: (data["isin"] as string) ?? null,
        provider: cfg.id,
      };
    },
  };
}

export const openbbProvider = createRemoteProvider({
  id: "openbb",
  label: "OpenBB",
  priority: 5,
  urlVar: "OPENBB_API_URL",
  keyVar: "OPENBB_API_KEY",
});

export const yfinanceProvider = createRemoteProvider({
  id: "yfinance",
  label: "yfinance (servicio Python)",
  priority: 10,
  urlVar: "PY_FINANCE_API_URL",
  keyVar: "PY_FINANCE_API_KEY",
});
