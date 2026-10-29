/**
 * Persistencia y caché del Financial Data Engine.
 * Se guarda la serie real descargada del proveedor; la caché sólo evita
 * repetir descargas, nunca sustituye datos reales por estimaciones.
 */
import type { AssetSeries, DataQuality, Frequency, Instrument, SeriePoint } from "./types";
import { providerLabel } from "./types";
import { fetchFxRate } from "./providers.server";
import { providerManager } from "./provider-manager.server";

const TTL_MINUTES: Record<string, number> = {
  Cripto: 60,
  Acción: 12 * 60,
  ETF: 12 * 60,
  Índice: 12 * 60,
  Fondo: 24 * 60,
  Divisa: 12 * 60,
  default: 18 * 60,
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function ttlFor(kind: string) {
  return TTL_MINUTES[kind] ?? TTL_MINUTES["default"]!;
}

async function logQuality(symbol: string, level: string, message: string, provider?: string) {
  try {
    const db = await admin();
    await db.from("data_quality_log").insert({ symbol, level, message, provider: provider ?? null });
  } catch {
    /* el log de calidad nunca debe romper la petición */
  }
}

/** Lee la serie cacheada si sigue fresca. */
async function readCache(symbol: string, frequency: Frequency) {
  const db = await admin();
  const { data } = await db
    .from("market_series")
    .select("*")
    .eq("symbol", symbol)
    .eq("frequency", frequency)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

async function readAsset(symbol: string) {
  const db = await admin();
  const { data } = await db.from("market_assets").select("*").eq("symbol", symbol).maybeSingle();
  return data as Record<string, unknown> | null;
}

function toSeries(
  instrument: Instrument,
  row: Record<string, unknown>,
  quality: DataQuality,
  note?: string,
): AssetSeries {
  const points = (row["points"] as SeriePoint[]) ?? [];
  const provider = (row["provider"] as string) ?? "yahoo";
  return {
    instrument,
    points,
    dividends: (row["dividends"] as AssetSeries["dividends"]) ?? [],
    splits: (row["splits"] as AssetSeries["splits"]) ?? [],
    meta: {
      provider,
      providerLabel: providerLabel(provider),
      currency: (row["currency"] as string) ?? instrument.currency,
      frequency: intervalToFrequency(row["interval"] as string | null, row["frequency"] as Frequency | null),
      firstDate: (row["first_date"] as string) ?? null,
      lastDate: (row["last_date"] as string) ?? null,
      pointCount: (row["point_count"] as number) ?? points.length,
      fetchedAt: (row["fetched_at"] as string) ?? new Date().toISOString(),
      adjusted: (row["adjusted"] as boolean) ?? true,
      quality,
      ...(note ? { note } : {}),
    },
  };
}

/** La granularidad efectiva puede diferir de la solicitada al proveedor. */
function intervalToFrequency(interval: string | null, fallback: Frequency | null): Frequency {
  if (interval === "1week") return "weekly";
  if (interval === "1month") return "monthly";
  if (interval === "1day") return "daily";
  return fallback ?? "daily";
}

function instrumentFromRow(row: Record<string, unknown>): Instrument {
  return {
    symbol: row["symbol"] as string,
    name: row["name"] as string,
    shortName: (row["short_name"] as string) ?? null,
    kind: (row["kind"] as Instrument["kind"]) ?? "Otro",
    isin: (row["isin"] as string) ?? null,
    exchange: (row["exchange"] as string) ?? null,
    currency: (row["currency"] as string) ?? "USD",
    country: (row["country"] as string) ?? null,
    sector: (row["sector"] as string) ?? null,
    manager: (row["manager"] as string) ?? null,
    provider: (row["provider"] as string) ?? "yahoo",
    providerId: (row["provider_id"] as string) ?? null,
  };
}

/**
 * Obtiene la serie real de un símbolo: caché fresca → proveedor → caché
 * caducada (marcada como parcial). Si nada funciona devuelve el error.
 */
export async function getSeries(
  symbol: string,
  frequency: Frequency = "daily",
  opts: { force?: boolean } = {},
): Promise<{ ok: true; series: AssetSeries } | { ok: false; symbol: string; error: string }> {
  const sym = symbol.trim().toUpperCase();
  const [assetRow, cached] = await Promise.all([readAsset(sym), readCache(sym, frequency)]);

  if (!opts.force && cached) {
    const age = (Date.now() - new Date(cached["fetched_at"] as string).getTime()) / 60000;
    const kind = (assetRow?.["kind"] as string) ?? "default";
    if (age < ttlFor(kind) && ((cached["point_count"] as number) ?? 0) > 1) {
      const inst = assetRow ? instrumentFromRow(assetRow) : fallbackInstrument(sym, cached);
      return { ok: true, series: toSeries(inst, cached, "real") };
    }
  }

  const db = await admin();
  const started = new Date().toISOString();
  const chain = await providerManager.getHistoricalPrices(sym, frequency, assetRow?.["kind"] as Instrument["kind"]);

  if (!chain.ok) {
    await db.from("data_sync_jobs").insert({
      symbol: sym,
      provider: chain.attempts.join(",") || "none",
      status: "error",
      rows_written: 0,
      error: chain.error,
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    await logQuality(sym, "error", `Descarga fallida: ${chain.error}`);
    if (cached && ((cached["point_count"] as number) ?? 0) > 1) {
      const inst = assetRow ? instrumentFromRow(assetRow) : fallbackInstrument(sym, cached);
      return {
        ok: true,
        series: toSeries(inst, cached, "partial", `Proveedor no disponible (${chain.error}); se muestra la última descarga guardada.`),
      };
    }
    await db
      .from("market_assets")
      .update({ data_status: "error", last_updated_at: new Date().toISOString() })
      .eq("symbol", sym);
    return { ok: false, symbol: sym, error: chain.error };
  }

  const s = chain.value;
  const first = s.points[0]!.d;
  const last = s.points[s.points.length - 1]!.d;

  await db.from("market_assets").upsert(
    {
      symbol: sym,
      name: s.instrument.name,
      short_name: s.instrument.shortName ?? null,
      kind: s.instrument.kind,
      exchange: s.instrument.exchange ?? null,
      currency: s.currency,
      isin: (assetRow?.["isin"] as string) ?? s.instrument.isin ?? null,
      provider: chain.provider,
      provider_id: s.instrument.providerId ?? sym,
      data_status: "ok",
      last_updated_at: new Date().toISOString(),
      next_update_at: new Date(Date.now() + ttlFor(s.instrument.kind) * 60000).toISOString(),
      last_price: s.points[s.points.length - 1]!.c,
      last_price_date: last,
      inception_date: first,
    },
    { onConflict: "symbol" },
  );

  await db.from("market_series").upsert(
    {
      symbol: sym,
      interval: s.frequency === "daily" ? "1day" : s.frequency === "weekly" ? "1week" : "1month",
      frequency,
      provider: chain.provider,
      currency: s.currency,
      points: s.points,
      dividends: s.dividends,
      splits: s.splits,
      point_count: s.points.length,
      adjusted: s.adjusted,
      first_date: first,
      last_date: last,
      status: "ok",
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "symbol,frequency" },
  );

  await db.from("data_sync_jobs").insert({
    symbol: sym,
    provider: chain.provider,
    status: "ok",
    rows_written: s.points.length,
    started_at: started,
    finished_at: new Date().toISOString(),
  });

  const staleDays = (Date.now() - new Date(last).getTime()) / 864e5;
  const quality: DataQuality = staleDays > 10 ? "partial" : "real";
  const note = quality === "partial" ? `Último dato del proveedor: ${last}.` : undefined;
  if (quality === "partial") await logQuality(sym, "warn", `Serie desactualizada (${last})`, chain.provider);

  return {
    ok: true,
    series: {
      instrument: { ...s.instrument, provider: chain.provider },
      points: s.points,
      dividends: s.dividends,
      splits: s.splits,
      meta: {
        provider: chain.provider,
        providerLabel: providerLabel(chain.provider),
        currency: s.currency,
        frequency: s.frequency,
        firstDate: first,
        lastDate: last,
        pointCount: s.points.length,
        fetchedAt: new Date().toISOString(),
        adjusted: s.adjusted,
        quality,
        ...(note ? { note } : {}),
      },
    },
  };
}

function fallbackInstrument(symbol: string, row: Record<string, unknown>): Instrument {
  return {
    symbol,
    name: symbol,
    kind: "Otro",
    currency: (row["currency"] as string) ?? "USD",
    provider: (row["provider"] as string) ?? "yahoo",
  };
}

/** Búsqueda por ticker, ISIN o nombre; guarda los resultados en el catálogo. */
export async function searchInstruments(query: string, limit = 12): Promise<Instrument[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const db = await admin();

  const { data: local } = await db
    .from("market_assets")
    .select("*")
    .or(`symbol.ilike.%${q}%,name.ilike.%${q}%,isin.ilike.%${q}%`)
    .limit(limit);
  const localRows = (local ?? []) as Record<string, unknown>[];

  const chain = await providerManager.getAssetSearch(q, limit);
  const remote = chain.ok ? chain.value : [];
  if (remote.length) {
    await db.from("market_assets").upsert(
      remote.map((r) => ({
        symbol: r.symbol,
        name: r.name,
        short_name: r.shortName ?? null,
        kind: r.kind,
        exchange: r.exchange ?? null,
        currency: r.currency || "USD",
        isin: r.isin ?? null,
        provider: r.provider,
        provider_id: r.providerId ?? r.symbol,
        data_status: "pending",
      })),
      { onConflict: "symbol", ignoreDuplicates: false },
    );
  }

  const merged = new Map<string, Instrument>();
  for (const r of localRows) merged.set(r["symbol"] as string, instrumentFromRow(r));
  for (const r of remote) if (!merged.has(r.symbol)) merged.set(r.symbol, r);
  return [...merged.values()].slice(0, limit);
}

/** Tipo de cambio real con caché diaria en BD. */
export async function getFx(base: string, quote: string): Promise<{ rate: number; date: string; provider: string } | null> {
  if (base === quote) return { rate: 1, date: new Date().toISOString().slice(0, 10), provider: "identity" };
  const db = await admin();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("fx_rates")
    .select("*")
    .eq("base", base)
    .eq("quote", quote)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as Record<string, unknown> | null;
  if (row && row["rate_date"] === today) {
    return { rate: Number(row["rate"]), date: today, provider: row["provider"] as string };
  }
  const fresh = await fetchFxRate(base, quote);
  if (!fresh) {
    return row ? { rate: Number(row["rate"]), date: row["rate_date"] as string, provider: row["provider"] as string } : null;
  }
  await db
    .from("fx_rates")
    .upsert(
      { base, quote, rate: fresh.rate, rate_date: fresh.date, provider: fresh.provider },
      { onConflict: "base,quote,rate_date" },
    );
  return fresh;
}


/** Precio actual real con caché corta en BD. Sin dato → null (nunca inventado). */
export async function getQuote(
  symbol: string,
  opts: { maxAgeMinutes?: number } = {},
): Promise<{
  symbol: string;
  price: number;
  currency: string;
  changePct: number | null;
  date: string;
  provider: string;
  providerLabel: string;
  fetchedAt: string;
} | null> {
  const sym = symbol.trim().toUpperCase();
  const maxAge = opts.maxAgeMinutes ?? 20;
  const db = await admin();
  const row = await readAsset(sym);
  const updated = row?.["last_updated_at"] as string | null;
  if (row && row["last_price"] != null && updated && (Date.now() - new Date(updated).getTime()) / 60000 < maxAge) {
    const provider = (row["provider"] as string) ?? "yahoo";
    return {
      symbol: sym,
      price: Number(row["last_price"]),
      currency: (row["currency"] as string) ?? "USD",
      changePct: null,
      date: (row["last_price_date"] as string) ?? updated.slice(0, 10),
      provider,
      providerLabel: providerLabel(provider),
      fetchedAt: updated,
    };
  }

  // Antes de llamar al proveedor se usa la serie diaria ya descargada: evita
  // peticiones innecesarias (y límites de tasa) para un dato que ya tenemos.
  const cached = await readCache(sym, "daily");
  const pts = (cached?.["points"] as SeriePoint[] | undefined) ?? [];
  const fetchedAt = (cached?.["fetched_at"] as string | undefined) ?? null;
  const cachedQuote =
    pts.length > 1 && fetchedAt
      ? (() => {
          const last = pts[pts.length - 1]!;
          const prev = pts[pts.length - 2]!;
          const provider = (cached?.["provider"] as string) ?? "yahoo";
          return {
            symbol: sym,
            price: last.c,
            currency: (cached?.["currency"] as string) ?? (row?.["currency"] as string) ?? "USD",
            changePct: prev.c > 0 ? ((last.c - prev.c) / prev.c) * 100 : null,
            date: last.d,
            provider,
            providerLabel: providerLabel(provider),
            fetchedAt,
          };
        })()
      : null;
  if (cachedQuote && (Date.now() - new Date(fetchedAt!).getTime()) / 36e5 < 24) return cachedQuote;

  const chain = await providerManager.getLatestPrice(sym, row?.["kind"] as Instrument["kind"]);
  if (!chain.ok) {
    await logQuality(sym, "warn", `Precio actual no disponible: ${chain.error}`);
    // Último dato real conocido, con su fecha: nunca un precio inventado.
    return cachedQuote;
  }
  const q = chain.value;
  const now = new Date().toISOString();
  await db
    .from("market_assets")
    .update({ last_price: q.price, last_price_date: q.date, last_updated_at: now, data_status: "ok" })
    .eq("symbol", sym);
  return { ...q, fetchedAt: now };
}

/** Símbolos con caché caducada, para el job de actualización programada. */
export async function staleSymbols(limit = 40): Promise<string[]> {
  const db = await admin();
  const { data } = await db
    .from("market_series")
    .select("symbol, fetched_at")
    .order("fetched_at", { ascending: true })
    .limit(limit);
  return ((data ?? []) as { symbol: string }[]).map((r) => r.symbol);
}
