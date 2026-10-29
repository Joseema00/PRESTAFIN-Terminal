import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Asset } from "@/lib/assets";
import { getMarketBundle, searchMarketAssets } from "@/lib/market.functions";
import type { MarketBundle } from "@/lib/market/bundle";
import { hydrate, symbolsFor, type HydratedUniverse } from "@/lib/market/hydrate";
import { RISK_FREE } from "@/lib/portfolio";
import type { Lookback } from "@/lib/market/provider-types";

/**
 * Descarga las series históricas reales de los activos indicados y devuelve el
 * universo hidratado (rentabilidades, volatilidades y correlaciones reales).
 */
export function useMarketData(assets: Asset[], lookback: Lookback = "max") {
  const fetchBundle = useServerFn(getMarketBundle);
  const symbols = useMemo(() => [...new Set(symbolsFor(assets))].sort(), [assets]);

  const query = useQuery<MarketBundle>({
    queryKey: ["market-bundle", symbols, lookback],
    enabled: symbols.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchBundle({ data: { symbols, riskFree: RISK_FREE, lookback } }),
  });

  const universe: HydratedUniverse = useMemo(
    () => hydrate(assets, query.data ?? null),
    [assets, query.data],
  );

  return {
    universe,
    bundle: query.data ?? null,
    isLoading: query.isLoading && symbols.length > 0,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    generatedAt: query.data?.generatedAt ?? null,
    lookback,
    sources: query.data?.sources ?? [],
  };
}

/** Búsqueda en vivo por ticker, ISIN o nombre contra el proveedor de datos. */
export function useMarketSearch(query: string) {
  const search = useServerFn(searchMarketAssets);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const q = useQuery({
    queryKey: ["market-search", debounced],
    enabled: debounced.length >= 2,
    staleTime: 10 * 60 * 1000,
    queryFn: () => search({ data: { query: debounced, limit: 12 } }),
  });

  return {
    results: q.data?.results ?? [],
    error: q.data?.error ?? (q.error ? (q.error as Error).message : null),
    isLoading: q.isFetching && debounced.length >= 2,
    query: debounced,
  };
}

/** Serie mensual real de un único símbolo, para usarlo como índice de referencia. */
export function useBenchmarkSeries(symbol: string | null) {
  const fetchBundle = useServerFn(getMarketBundle);
  const sym = (symbol ?? "").trim().toUpperCase();

  const q = useQuery<MarketBundle>({
    queryKey: ["market-bundle", [sym]],
    enabled: sym.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: () => fetchBundle({ data: { symbols: [sym], riskFree: RISK_FREE } }),
  });

  const asset = q.data?.assets?.[0] ?? null;
  return {
    symbol: sym,
    monthly: asset?.ok ? (asset.monthly ?? []) : [],
    name: asset?.instrument?.name ?? sym,
    error: asset && !asset.ok ? (asset.error ?? "Sin datos") : q.error ? (q.error as Error).message : null,
    isLoading: q.isFetching && sym.length > 0,
  };
}
