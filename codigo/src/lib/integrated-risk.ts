import type { MarketBundle } from './market/bundle';
import { analyseHistory,validateHistory,type HistoricalData } from './professional-analysis';
import { ROLE_MODEL,modelCovariance,allocationPoint } from './allocation-engine';
import type { ProductRole } from './investment-products';

export type MarketPosition={id:string;symbol:string;name?:string;isin?:string};
export type AssetHistoryCoverage={id:string;symbol:string;name:string;isin:string|null;source:string;first:string|null;last:string|null;closings:number;consecutiveReturns:number;status:'ready'|'short'|'missing'|'unadjusted'|'fx'|'gaps';reason:string};
export type HistoryCoverage={assets:AssetHistoryCoverage[];commonFirst:string|null;commonLast:string|null;commonReturns:number;ready:boolean;message:string|null};
const serial=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5));
function latestSegment(months:string[]){let start=0;for(let i=1;i<months.length;i++)if(serial(months[i]!)-serial(months[i-1]!)!==1)start=i;return months.slice(start);}
function inspect(positions:MarketPosition[],bundle:MarketBundle,now:number){
 const closed=new Date(now).toISOString().slice(0,7),maps:Map<string,number>[]=[],assets:AssetHistoryCoverage[]=[];
 for(const p of positions){
  const a=bundle.assets.find(a=>a.symbol.toUpperCase()===p.symbol.toUpperCase()),currency=a?.meta?.currency?.toUpperCase(),fx=currency&&currency!=='EUR'?bundle.assets.find(x=>x.symbol.toUpperCase()===currency+'EUR=X'):null;
  const points=new Map<string,number>(),nativeMonths:string[]=[];let status:AssetHistoryCoverage['status']='ready',reason='Histórico individual suficiente';
  if(!a?.ok||!a.monthly?.length){status='missing';reason=a?.error??'Falta una serie ajustada para esta clase.';}
  else if(!a.meta?.adjusted){status='unadjusted';reason='La fuente no confirma una serie ajustada; no se presenta como rentabilidad total.';}
  else if(!currency||currency!=='EUR'&&(!fx?.ok||!fx.monthly?.length)){status='fx';reason='No está disponible la conversión histórica a EUR de esta clase.';}
  if(status==='ready')for(const pt of a!.monthly!){const month=pt.d.slice(0,7);if(month>=closed||!Number.isFinite(pt.a)||pt.a<=0)continue;nativeMonths.push(month);const rate=fx?.monthly?.find(x=>x.d.slice(0,7)===month);if(fx&&(!rate||Math.abs(Date.parse(rate.d)-Date.parse(pt.d))>4*86400000))continue;const value=pt.a*(rate?.c??1);if(Number.isFinite(value)&&value>0)points.set(month,value);}
  const months=[...points.keys()].sort(),segment=latestSegment(months),returns=Math.max(0,segment.length-1);
  if(status==='ready'&&returns<24){status=months.length>=25?'gaps':'short';reason=status==='gaps'?'Hay huecos; el último tramo consecutivo no alcanza 24 rentabilidades mensuales.':'La fuente devuelve solo '+returns+' rentabilidades mensuales cerradas consecutivas; se necesitan 24.';}
  if(currency&&currency!=='EUR'&&(status==='short'||status==='gaps')&&fx&&latestSegment([...new Set(nativeMonths)].sort()).length>=25){status='fx';reason='La conversión '+currency+'/EUR no cubre suficientes cierres de este fondo.';}
  maps.push(points);assets.push({id:p.id,symbol:p.symbol,name:p.name??a?.instrument?.name??p.symbol,isin:p.isin??a?.instrument?.isin??null,source:a?.meta?.providerLabel??'Proveedor de mercado',first:months[0]??null,last:months.at(-1)??null,closings:months.length,consecutiveReturns:returns,status,reason});
 }
 const common=maps.length?[...maps[0]!.keys()].filter(m=>maps.every(s=>s.has(m))).sort():[],aligned=latestSegment(common),commonReturns=Math.max(0,aligned.length-1),ready=assets.length>0&&assets.every(a=>a.status==='ready')&&commonReturns>=24;
 let message:string|null=null;
 if(!ready){const failed=assets.filter(a=>a.status!=='ready');message=failed.length?failed.map(a=>a.name+' ('+(a.isin??a.symbol)+'): '+a.reason+(a.first?' Cobertura descargada: '+a.first+' a '+a.last+'.':'')).join(' '):'Los fondos tienen histórico individual suficiente, pero solo coinciden '+commonReturns+' rentabilidades mensuales consecutivas'+(aligned.length?' entre '+aligned[0]+' y '+aligned.at(-1):'')+'. No se mezclan periodos ni se rellenan meses ausentes.';}
 return {maps,aligned,report:{assets,commonFirst:aligned[0]??null,commonLast:aligned.at(-1)??null,commonReturns,ready,message} as HistoryCoverage};
}
export function marketHistoryCoverage(positions:MarketPosition[],bundle:MarketBundle,now=Date.now()):HistoryCoverage{return inspect(positions,bundle,now).report;}
/** Complete EUR total-return alignment, with named coverage diagnostics. */
export function historyFromMarket(portfolioId:string,positions:MarketPosition[],bundle:MarketBundle,now=Date.now()):HistoricalData{
 if(!positions.length)throw new Error('Añade posiciones para calcular el histórico');
 const {maps,aligned,report}=inspect(positions,bundle,now);if(!report.ready)throw new Error(report.message??'No hay cobertura histórica suficiente.');
 const source=[...new Set(report.assets.map(a=>a.source))].join(', ');
 return validateHistory({portfolioId,source:(source+' · descarga integrada · cierres ajustados; conversión histórica a EUR cuando procede').slice(0,300),importedAt:now,currency:'EUR',columns:positions.map(p=>p.id),rows:aligned.slice(1).map((month,i)=>({month,returns:maps.map(s=>s.get(month)!/s.get(aligned[i]!)!-1)}))});
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
