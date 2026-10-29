/** GET /api/public/market/search?query=&limit= — búsqueda de activos reales. */
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
  });

export const Route = createFileRoute("/api/public/market/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = (url.searchParams.get("query") ?? "").trim();
        const limit = Math.min(25, Math.max(1, Number(url.searchParams.get("limit") ?? 12) || 12));
        if (query.length < 2) return json({ error: "Indica al menos 2 caracteres" }, 400);
        try {
          const { searchInstruments } = await import("@/lib/market/store.server");
          return json({ results: await searchInstruments(query, limit) });
        } catch (e) {
          return json(
            { error: "El proveedor de datos no está disponible temporalmente.", detail: e instanceof Error ? e.message : null },
            503,
          );
        }
      },
    },
  },
});
