import { useEffect,useMemo,useRef,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {holdingProduct,holdingName,positionRisk} from '../src/lib/holding-classification';
export {holdingName,positionRisk} from '../src/lib/holding-classification';
import {holdingFundIsin} from '../src/lib/fund-identity';
import { symbolForAsset } from '../src/lib/market/symbols';
import { historyFromMarket,marketHistoryCoverage,type HistoryCoverage,historicalRisk,structuralRisk,type RiskPosition } from '../src/lib/integrated-risk';
import type { Portfolio } from '../src/lib/portfolio';
import {validateHistory,holdingHistoryKey,type HistoricalData } from '../src/lib/professional-analysis';
import type { MarketBundle } from '../src/lib/market/bundle';
import { usePeople } from './use-portfolios';

// EUR listings cross-checked against issuer/exchange documentation (19 October 2026).
export const PRODUCT_SYMBOLS:Record<string,string>={
 'research-xeon':'XEON.DE','research-iege':'EUN6.DE','research-erne':'ERNE.AS','research-ibgs':'IBGS.AS',
 'research-vagf':'VAGF.DE','research-aggh':'AGGH.MI','research-vwce':'VWCE.DE','research-fwra':'FWRA.MI','research-spyi':'SPYI.DE'
};
async function download(c:Portfolio,force:boolean):Promise<{history:HistoricalData|null;bundle:MarketBundle;coverage:HistoryCoverage}>{
 const bridge=window.prestafin;if(!bridge?.marketBundle)throw new Error('Conexión de mercado disponible al abrir la aplicación de escritorio');
 const holdings=c.holdings.filter(h=>h.amount>0);
 if(holdings.length>30)throw new Error('El histórico integrado admite hasta 30 posiciones por cartera');
 const positions=[];
 for(const h of holdings){
  if(h.assetId==='interview-cash-pending')throw new Error('El capital pendiente todavía no corresponde a productos');
  const p=holdingProduct(h),isin=p?.vehicle==='Fondo'?p.isin:holdingFundIsin(h);let symbol=isin??PRODUCT_SYMBOLS[p?.id??h.assetId]??(!p?h.meta?.symbol??symbolForAsset(h.assetId):null);
  if(!symbol&&p&&bridge.marketSearch){const matches=await bridge.marketSearch(p.isin);symbol=matches.results.find(x=>x.isin===p.isin)?.symbol??null;}
  if(!symbol)throw new Error('El proveedor aún no identifica la clase exacta de '+holdingName(h)+'. El análisis de escenarios sigue disponible.');
  positions.push({id:h.assetId,symbol,name:holdingName(h),...(isin?{isin}:{})});
 }
 const bundle=await bridge.marketBundle({symbols:[...new Set(positions.map(p=>p.symbol))],riskFree:2.2,lookback:'max',force});
 const currencies=[...new Set(bundle.assets.filter(a=>a.ok&&a.meta?.currency&&a.meta.currency!=='EUR').map(a=>a.meta!.currency.toUpperCase()))];
 if(currencies.length){const fx=await bridge.marketBundle({symbols:currencies.map(c=>c+'EUR=X'),riskFree:2.2,lookback:'max',force});bundle.assets.push(...fx.assets);bundle.sources.push(...fx.sources);}
 const coverage=marketHistoryCoverage(positions,bundle);const history=coverage.ready?validateHistory({...historyFromMarket(c.id,positions,bundle),holdingKeys:Object.fromEntries(holdings.map(h=>[h.assetId,holdingHistoryKey(h)]))}):null;return {history,bundle,coverage};
}
export function useIntegratedRisk(c:Portfolio|undefined,riskFree=2.2,method:'sample'|'shrinkage'|'gerber'='shrinkage'){
 const people=usePeople(),force=useRef(false),saved=people.active?.histories?.find(h=>h.portfolioId===c?.id);
 const [saveError,setSaveError]=useState<string|null>(null);
 const signature=c?.holdings.filter(h=>h.amount>0).map(h=>h.assetId+':'+(h.meta?.symbol??'')+':'+(h.meta?.isin??'')+':'+(h.meta?.kind??'')).sort().join('|')??'';
 const query=useQuery({queryKey:['integrated-risk','coverage-v2',people.active?.id,c?.id,signature],enabled:!!c&&!!signature&&!c.holdings.some(h=>h.assetId==='interview-cash-pending'),staleTime:6*60*60*1000,retry:false,queryFn:async()=>{
  const refresh=force.current;force.current=false;let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([download(c!,refresh),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('El proveedor tarda demasiado en responder. Puedes reintentar; los estudios guardados siguen disponibles.')),45000);})]);}finally{if(timer)clearTimeout(timer);}
 }});
 const selected=useMemo(()=>{
  if(!c)return {history:null,analysis:null,error:null};
  const ids=c.holdings.filter(h=>h.amount>0).map(h=>h.assetId);let error:string|null=null;
  for(const candidate of [query.data?.history,saved]){
   if(!candidate)continue;
   try{
    if(ids.some(id=>!candidate.columns.includes(id)))throw new Error('La composición cambió y la serie guardada no cubre todos sus activos. Actualiza los históricos.');
    const history=validateHistory({...candidate,columns:ids,rows:candidate.rows.map(row=>({month:row.month,returns:ids.map(id=>row.returns[candidate.columns.indexOf(id)]!)}))});
    return {history,analysis:historicalRisk(history,c.holdings,riskFree,method),error:null};
   }catch(e){error=e instanceof Error?e.message:'El histórico no es compatible con la composición actual.';}
  }
  return {history:null,analysis:null,error};
 },[query.data?.history,saved,c,riskFree,method]);
 useEffect(()=>{setSaveError(null);if(query.data?.history&&people.writable&&saved?.importedAt!==query.data.history.importedAt)try{people.saveHistory(query.data.history);}catch(e){setSaveError(e instanceof Error?e.message:'No se pudo guardar el histórico en esta ficha.');}},[query.data,people.active?.id,people.epoch,people.writable,saved?.importedAt]);
 const model=useMemo(()=>{if(!c)return null;const positions=c.holdings.filter(h=>h.amount>0).map(positionRisk);if(positions.some(p=>!p))return null;return structuralRisk(positions as RiskPosition[],riskFree);},[c,riskFree]);
 return {history:selected.history,analysis:selected.analysis,model,loading:query.isFetching,error:selected.error??(query.error instanceof Error?query.error.message:query.data?.coverage.message??null),coverage:query.data?.coverage??null,saveError,bundle:query.data?.bundle??null,
  refresh:()=>{force.current=true;void query.refetch();},positions:c?.holdings.filter(h=>h.amount>0).map(h=>({id:h.assetId,name:holdingName(h),amount:h.amount}))??[]};
}
