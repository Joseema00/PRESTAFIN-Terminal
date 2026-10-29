/**
 * GET /api/public/market/assets/:symbol            — ficha + último precio real
 * GET /api/public/market/assets/:symbol?history=1  — serie histórica real
 * Parámetros: interval=daily|weekly|monthly, lookback=1y|3y|5y|10y|max
 */
import { createFileRoute } from "@tanstack/react-router";
import { lookbackYears, type Lookback } from "@/lib/market/provider-types";
import type { Frequency } from "@/lib/market/types";

const json = (body: unknown, status = 200, maxAge = 300) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": `public, max-age=${maxAge}` },
  });

const UNAVAILABLE = "El proveedor de datos no está disponible temporalmente.";

export const Route = createFileRoute("/api/public/market/assets/$symbol")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const symbol = decodeURIComponent(params.symbol).trim().toUpperCase();
        const url = new URL(request.url);
        const wantsHistory = url.searchParams.get("history") === "1";
        const interval = (url.searchParams.get("interval") ?? "daily") as Frequency;
        const lookback = (url.searchParams.get("lookback") ?? "max") as Lookback;

        try {
          if (!wantsHistory) {
            const { getQuote } = await import("@/lib/market/store.server");
            const quote = await getQuote(symbol);
            if (!quote) return json({ error: "No disponible", symbol }, 404, 60);
            return json({ symbol, latest: quote, source: quote.providerLabel }, 200, 60);
          }

          const { getSeries } = await import("@/lib/market/store.server");
          const res = await getSeries(symbol, ["daily", "weekly", "monthly"].includes(interval) ? interval : "daily");
          if (!res.ok) return json({ error: res.error, symbol }, 404, 60);

          const years = lookbackYears(lookback);
          let points = res.series.points;
          if (years && points.length) {
            const from = new Date(points[points.length - 1]!.d);
            from.setFullYear(from.getFullYear() - years);
            const cut = from.toISOString().slice(0, 10);
            const trimmed = points.filter((p) => p.d >= cut);
            if (trimmed.length > 12) points = trimmed;
          }

          return json({
            symbol,
            instrument: res.series.instrument,
            meta: { ...res.series.meta, pointCount: points.length },
            lookback,
            points,
            dividends: res.series.dividends,
            splits: res.series.splits,
          });
        } catch (e) {
          return json({ error: UNAVAILABLE, detail: e instanceof Error ? e.message : null }, 503, 0);
        }
      },
    },
  },
});
