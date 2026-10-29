import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MarketBundle, MarketSearchResult } from "@/lib/market/bundle";
import type { ProviderInfo } from "@/lib/market/provider-types";

const searchSchema = z.object({ query: z.string().min(1).max(64), limit: z.number().min(1).max(25).optional() });
const lookbackSchema = z.enum(["1y", "3y", "5y", "10y", "max"]);
const bundleSchema = z.object({
  symbols: z.array(z.string().min(1).max(32)).min(1).max(30),
  riskFree: z.number().min(0).max(20).optional(),
  force: z.boolean().optional(),
  lookback: lookbackSchema.optional(),
});

export const searchMarketAssets = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => searchSchema.parse(d))
  .handler(async ({ data }): Promise<MarketSearchResult> => {
    const { searchInstruments } = await import("@/lib/market/store.server");
    try {
      const results = await searchInstruments(data.query, data.limit ?? 12);
      return { results, error: null };
    } catch (e) {
      return { results: [], error: e instanceof Error ? e.message : "Búsqueda no disponible" };
    }
  });

export const getMarketBundle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bundleSchema.parse(d))
  .handler(async ({ data }): Promise<MarketBundle> => {
    const { buildBundle } = await import("@/lib/market/bundle.server");
    return buildBundle(data.symbols, {
      riskFree: data.riskFree ?? 0,
      force: data.force ?? false,
      ...(data.lookback ? { lookback: data.lookback } : {}),
    });
  });

export const getFxRate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ base: z.string().length(3), quote: z.string().length(3) }).parse(d))
  .handler(async ({ data }) => {
    const { getFx } = await import("@/lib/market/store.server");
    return (await getFx(data.base.toUpperCase(), data.quote.toUpperCase())) ?? null;
  });

/** Precio actual real de uno o varios símbolos. Sin dato → null explícito. */
export const getLatestPrices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ symbols: z.array(z.string().min(1).max(32)).min(1).max(30) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getQuote } = await import("@/lib/market/store.server");
    const quotes = await Promise.all(data.symbols.map((s) => getQuote(s)));
    return { quotes: quotes.filter((q): q is NonNullable<typeof q> => Boolean(q)), generatedAt: new Date().toISOString() };
  });

/** Datos fundamentales del activo (los que el proveedor ofrezca). */
export const getAssetFundamentals = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ symbol: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { providerManager } = await import("@/lib/market/provider-manager.server");
    const res = await providerManager.getFundamentalData(data.symbol.toUpperCase());
    return res.ok ? { data: res.value, error: null } : { data: null, error: res.error };
  });

/** Inventario de proveedores y su estado de configuración. */
export const listMarketProviders = createServerFn({ method: "GET" }).handler(async (): Promise<{
  providers: ProviderInfo[];
}> => {
  const { providerManager } = await import("@/lib/market/provider-manager.server");
  return { providers: providerManager.list() };
});
