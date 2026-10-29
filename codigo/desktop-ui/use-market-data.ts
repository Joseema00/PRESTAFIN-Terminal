import { useQuery } from '@tanstack/react-query';
import { useEffect,useMemo,useState } from 'react';
import type { Asset } from '../src/lib/assets';
import type { MarketBundle, MarketSearchResult } from '../src/lib/market/bundle';
import { hydrate,symbolsFor } from '../src/lib/market/hydrate';
import { RISK_FREE } from '../src/lib/portfolio';
import type { Lookback } from '../src/lib/market/provider-types';

function bridge() { if (!window.prestafin) throw new Error('Los datos de mercado están disponibles en la aplicación de escritorio'); return window.prestafin; }
export function useMarketData(assets:Asset[],lookback:Lookback='max') {
  const symbols = useMemo(() => [...new Set(symbolsFor(assets))].sort(),[assets]);
  const query = useQuery<MarketBundle>({queryKey:['market-bundle',symbols,lookback],enabled:symbols.length>0,staleTime:30*60*1000,retry:false,
    queryFn:() => bridge().marketBundle({symbols,riskFree:RISK_FREE,lookback})});
  const universe = useMemo(() => hydrate(assets,query.data ?? null),[assets,query.data]);
  return {universe,bundle:query.data ?? null,isLoading:query.isLoading && symbols.length>0,isFetching:query.isFetching,
    error:query.error?.message ?? null,refetch:query.refetch,generatedAt:query.data?.generatedAt ?? null,lookback,sources:query.data?.sources ?? []};
}
export function useMarketSearch(input:string) {
  const [query,setQuery] = useState(input.trim());
  useEffect(() => { const timer = setTimeout(() => setQuery(input.trim()),350); return () => clearTimeout(timer); },[input]);
  const result = useQuery<MarketSearchResult>({queryKey:['market-search',query],enabled:query.length>=2,retry:false,staleTime:10*60*1000,
    queryFn:() => bridge().marketSearch(query)});
  return {query,results:result.data?.results ?? [],error:result.data?.error ?? result.error?.message ?? null,isLoading:result.isFetching};
}
export function useBenchmarkSeries(symbol:string|null) {
  const sym = (symbol ?? '').trim().toUpperCase();
  const query = useQuery<MarketBundle>({queryKey:['market-benchmark',sym],enabled:!!sym,retry:false,staleTime:30*60*1000,
    queryFn:() => bridge().marketBundle({symbols:[sym],riskFree:RISK_FREE})});
  const asset = query.data?.assets[0];
  return {symbol:sym,monthly:asset?.ok ? asset.monthly ?? [] : [],name:asset?.instrument?.name ?? sym,
    error:asset && !asset.ok ? asset.error ?? 'Sin datos' : query.error?.message ?? null,isLoading:query.isFetching};
}
