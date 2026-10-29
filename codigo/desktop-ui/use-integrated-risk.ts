import { useEffect,useMemo,useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productById,type ProductRole } from '../src/lib/investment-products';
import { assetById } from '../src/lib/assets';
import { symbolForAsset } from '../src/lib/market/symbols';
import { historyFromMarket,historicalRisk,structuralRisk,type RiskPosition } from '../src/lib/integrated-risk';
import type { Portfolio,Holding } from '../src/lib/portfolio';
import type { HistoricalData } from '../src/lib/professional-analysis';
import type { MarketBundle } from '../src/lib/market/bundle';
import { usePeople } from './use-portfolios';

// EUR listings cross-checked against issuer/exchange documentation (19 October 2026).
export const PRODUCT_SYMBOLS:Record<string,string>={
 'research-xeon':'XEON.DE','research-iege':'EUN6.DE','research-erne':'ERNE.AS','research-ibgs':'IBGS.AS',
 'research-vagf':'VAGF.DE','research-aggh':'AGGH.MI','research-vwce':'VWCE.DE','research-fwra':'FWRA.MI','research-spyi':'SPYI.DE'
};
export function holdingName(h:Holding){return productById(h.assetId)?.name??h.meta?.name??assetById(h.assetId)?.name??h.assetId;}
export function positionRisk(h:Holding):RiskPosition|null{
 const p=productById(h.assetId);if(p)return {id:h.assetId,name:p.name,amount:h.amount,role:p.role,fee:p.fee};
 const a=assetById(h.assetId),cls=h.meta?.cls??a?.cls;
 const role:ProductRole|null=cls?.startsWith('equity')||cls==='sector'?'equity':cls?.startsWith('bond')?'aggregate':cls==='cash'?'overnight':null;
 return role?{id:h.assetId,name:holdingName(h),amount:h.amount,role,fee:a?.ter??0}:null;
}
async function download(c:Portfolio,force:boolean):Promise<{history:HistoricalData;bundle:MarketBundle}>{
 const bridge=window.prestafin;if(!bridge?.marketBundle)throw new Error('Conexión de mercado disponible al abrir la aplicación de escritorio');
 const holdings=c.holdings.filter(h=>h.amount>0);
 if(holdings.length>30)throw new Error('El histórico integrado admite hasta 30 posiciones por cartera');
 const positions=[];
 for(const h of holdings){
  if(h.assetId==='interview-cash-pending')throw new Error('El capital pendiente todavía no corresponde a productos');
  const p=productById(h.assetId);let symbol=p?.vehicle==='Fondo'?p.isin:PRODUCT_SYMBOLS[h.assetId]??(!p?h.meta?.symbol??symbolForAsset(h.assetId):null);
  if(!symbol&&p&&bridge.marketSearch){const matches=await bridge.marketSearch(p.isin);symbol=matches.results.find(x=>x.isin===p.isin)?.symbol??null;}
  if(!symbol)throw new Error('El proveedor aún no identifica la clase exacta de '+holdingName(h)+'. El análisis de escenarios sigue disponible.');
  positions.push({id:h.assetId,symbol});
 }
 const bundle=await bridge.marketBundle({symbols:[...new Set(positions.map(p=>p.symbol))],riskFree:2.2,lookback:'max',force});
 const currencies=[...new Set(bundle.assets.filter(a=>a.ok&&a.meta?.currency&&a.meta.currency!=='EUR').map(a=>a.meta!.currency.toUpperCase()))];
 if(currencies.length){const fx=await bridge.marketBundle({symbols:currencies.map(c=>c+'EUR=X'),riskFree:2.2,lookback:'max',force});bundle.assets.push(...fx.assets);bundle.sources.push(...fx.sources);}
 return {history:historyFromMarket(c.id,positions,bundle),bundle};
}
export function useIntegratedRisk(c:Portfolio|undefined,riskFree=2.2,method:'sample'|'shrinkage'|'gerber'='shrinkage'){
 const people=usePeople(),force=useRef(false),saved=people.active?.histories?.find(h=>h.portfolioId===c?.id);
 const signature=c?.holdings.filter(h=>h.amount>0).map(h=>h.assetId+':'+(h.meta?.symbol??'')).sort().join('|')??'';
 const query=useQuery({queryKey:['integrated-risk',people.active?.id,c?.id,signature],enabled:!!c&&!!signature&&!c.holdings.some(h=>h.assetId==='interview-cash-pending'),staleTime:6*60*60*1000,retry:false,queryFn:async()=>{const refresh=force.current;force.current=false;return download(c!,refresh);}});
 const history=query.data?.history??saved;
 const analysis=useMemo(()=>{if(!history||!c)return null;try{return historicalRisk(history,c.holdings,riskFree,method);}catch{return null;}},[history,c,riskFree,method]);
 useEffect(()=>{if(query.data?.history&&people.writable&&saved?.importedAt!==query.data.history.importedAt)try{people.saveHistory(query.data.history);}catch{/* Saving failures are surfaced by the workspace status. */}},[query.data,people.active?.id,people.epoch,people.writable,saved?.importedAt]);
 const model=useMemo(()=>{if(!c)return null;const positions=c.holdings.filter(h=>h.amount>0).map(positionRisk);if(positions.some(p=>!p))return null;return structuralRisk(positions as RiskPosition[],riskFree);},[c,riskFree]);
 return {history:analysis?history:null,analysis,model,loading:query.isFetching,error:query.error instanceof Error?query.error.message:null,bundle:query.data?.bundle??null,
  refresh:()=>{force.current=true;void query.refetch();},positions:c?.holdings.filter(h=>h.amount>0).map(h=>({id:h.assetId,name:holdingName(h),amount:h.amount}))??[]};
}
