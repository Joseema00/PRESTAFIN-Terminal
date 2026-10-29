/**
 * POST /api/public/market/refresh — job de actualización programada.
 *
 * Requiere cabecera `Authorization: Bearer <MARKET_REFRESH_SECRET>`.
 * Refresca las series de los símbolos indicados (o los más antiguos en caché)
 * y deja constancia del resultado en el registro de sincronizaciones.
 */
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/market/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (process.env["MARKET_REFRESH_SECRET"] ?? "").trim();
        if (!secret) return json({ error: "Job no configurado: falta MARKET_REFRESH_SECRET" }, 503);
        const auth = request.headers.get("authorization") ?? "";
        if (auth !== `Bearer ${secret}`) return json({ error: "No autorizado" }, 401);

        let symbols: string[] = [];
        let limit = 25;
        try {
          const body = (await request.json()) as { symbols?: string[]; limit?: number };
          symbols = (body.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean);
          limit = Math.min(60, Math.max(1, body.limit ?? 25));
        } catch {
          /* cuerpo opcional */
        }

        const { getSeries, staleSymbols } = await import("@/lib/market/store.server");
        const targets = symbols.length ? symbols.slice(0, 60) : await staleSymbols(limit);

        const results: { symbol: string; ok: boolean; error?: string }[] = [];
        for (const s of targets) {
          try {
            const r = await getSeries(s, "daily", { force: true });
            results.push(r.ok ? { symbol: s, ok: true } : { symbol: s, ok: false, error: r.error });
          } catch (e) {
            results.push({ symbol: s, ok: false, error: e instanceof Error ? e.message : "Error" });
          }
        }

        return json({
          refreshed: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok),
          finishedAt: new Date().toISOString(),
        });
      },
    },
  },
});
