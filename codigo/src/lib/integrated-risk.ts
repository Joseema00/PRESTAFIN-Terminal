import type { MarketBundle } from './market/bundle';
import { analyseHistory,validateHistory,type HistoricalData } from './professional-analysis';
import { ROLE_MODEL,modelCovariance,allocationPoint } from './allocation-engine';
import type { ProductRole } from './investment-products';

export type MarketPosition={id:string;symbol:string};
/** Complete EUR total-return alignment. No missing-asset renormalization or artificial fill. */
export function historyFromMarket(portfolioId:string,positions:MarketPosition[],bundle:MarketBundle,now=Date.now()):HistoricalData{
 if(!positions.length)throw new Error('Añade posiciones para calcular el histórico');
 const closed=new Date(now).toISOString().slice(0,7);
 const series=positions.map(p=>{
  const a=bundle.assets.find(a=>a.symbol.toUpperCase()===p.symbol.toUpperCase());
  if(a&&!a.ok)throw new Error('No se pudo actualizar '+p.symbol+': '+(a.error?.includes('429')?'el proveedor limita las peticiones (HTTP 429); inténtalo más tarde':a.error??'sin cobertura')+'.');
  if(!a?.ok||!a.meta?.adjusted||!a.monthly?.length)throw new Error('Falta una serie ajustada para '+p.symbol);
  const currency=a.meta.currency.toUpperCase();
  const fx=currency==='EUR'?null:bundle.assets.find(x=>x.symbol.toUpperCase()===currency+'EUR=X');
  if(currency!=='EUR'&&(!fx?.ok||!fx.monthly?.length))throw new Error('Falta la conversión histórica '+currency+'/EUR para '+p.symbol);
  const points=new Map<string,number>();
  for(const pt of a.monthly){
   const month=pt.d.slice(0,7);if(month>=closed)continue;
   const rate=fx?.monthly?.find(x=>x.d.slice(0,7)===month);
   if(fx&&(!rate||Math.abs(Date.parse(rate.d)-Date.parse(pt.d))>4*86400000))continue;
   const value=pt.a*(rate?.c??1);if(!Number.isFinite(value)||value<=0)continue;
   points.set(month,value);
  }
  return points;
 });
 const months=[...series[0]!.keys()].filter(m=>series.every(s=>s.has(m))).sort();
 if(months.length<25)throw new Error('Se necesitan 24 rentabilidades mensuales cerradas comunes; la cobertura disponible aún no alcanza ese periodo');
 const serial=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5));
 // Keep the latest consecutive segment; gaps are never silently joined.
 let start=0;for(let i=1;i<months.length;i++)if(serial(months[i]!)-serial(months[i-1]!)!==1)start=i;
 const aligned=months.slice(start);if(aligned.length<25)throw new Error('Las series tienen huecos: faltan 24 meses consecutivos comunes');
 const source=[...new Set(bundle.assets.filter(x=>x.ok).map(x=>x.meta?.providerLabel).filter(Boolean))].join(', ')||'Proveedor de mercado';
 return validateHistory({portfolioId,source:(source+' · descarga integrada · cierres ajustados; conversión histórica a EUR cuando procede').slice(0,300),importedAt:now,currency:'EUR',columns:positions.map(p=>p.id),rows:aligned.slice(1).map((month,i)=>({month,returns:series.map(s=>s.get(month)!/s.get(aligned[i]!)!-1)}))});
}
export function historicalRisk(data:HistoricalData,holdings:{assetId:string;amount:number}[],riskFree=2.2,method:'sample'|'shrinkage'|'gerber'='shrinkage'){
 const r=analyseHistory(data,holdings,method),rf=(1+riskFree/100)**(1/12)-1;
 const returns=data.rows.map(row=>row.returns.reduce((s,v,i)=>s+v*r.weights[i]!,0));
 const excess=returns.map(v=>v-rf),avg=excess.reduce((s,v)=>s+v,0)/excess.length;
 const sd=Math.sqrt(excess.reduce((s,v)=>s+(v-avg)**2,0)/(excess.length-1));
 const downside=Math.sqrt(excess.reduce((s,v)=>s+Math.min(0,v)**2,0)/excess.length);
 let index=100,peak=100;
 const curve=data.rows.map((row,i)=>{index*=1+returns[i]!;peak=Math.max(peak,index);return {date:row.month,index,drawdown:(index/peak-1)*100,return:returns[i]!*100};});
 return {...r,curve,returns,sharpe:sd>1e-12?avg/sd*Math.sqrt(12):null,sortino:downside>1e-12?avg/downside*Math.sqrt(12):null,riskFree};
}
export type RiskPosition={id:string;name:string;amount:number;role:ProductRole;fee:number};
export function structuralRisk(positions:RiskPosition[],riskFree=2.2){
 const total=positions.reduce((s,p)=>s+p.amount,0);if(!total)return null;
 const weights=positions.map(p=>p.amount/total),roles=positions.map(p=>p.role),cov=modelCovariance(roles),means=positions.map(p=>ROLE_MODEL[p.role].mean-p.fee);
 const point=allocationPoint({means,cov,roles,riskFree},weights);
 const variance=point.vol**2;
 const shares=weights.map((w,i)=>variance?w*weights.reduce((s,v,j)=>s+v*cov[i]![j]!,0)/variance:0);
 const shocks:{name:string;values:Record<ProductRole,number>}[]=[
  {name:'Caída conjunta severa',values:{overnight:-1,ultrashort:-3,short:-7,aggregate:-15,equity:-50}},
  {name:'Subida de tipos y presión de inflación',values:{overnight:0,ultrashort:-1.5,short:-5,aggregate:-12,equity:-20}},
  {name:'Recesión con recuperación de bonos',values:{overnight:0,ultrashort:0,short:2,aggregate:5,equity:-35}},
  {name:'Fortaleza del euro y caída global',values:{overnight:0,ultrashort:-.5,short:-1,aggregate:-3,equity:-25}}
 ];
 return {...point,total,weights,shares,cov,roles,fee:weights.reduce((s,w,i)=>s+w*positions[i]!.fee,0),effectivePositions:1/weights.reduce((s,w)=>s+w*w,0),scenarios:shocks.map(s=>{const pct=weights.reduce((v,w,i)=>v+w*s.values[roles[i]!],0);return {name:s.name,pct,loss:total*pct/100};})};
}
