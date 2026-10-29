import type { SeriePoint } from './market/types';
const DAY=86400000;
export function cleanFundPoints(points:SeriePoint[],today=new Date().toISOString().slice(0,10)):SeriePoint[]{
 const map=new Map<string,SeriePoint>();
 for(const p of points){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.d)||!Number.isFinite(Date.parse(p.d))||new Date(p.d).toISOString().slice(0,10)!==p.d||p.d>today||!Number.isFinite(p.c)||p.c<=0||!Number.isFinite(p.a)||p.a<=0)throw new Error('La serie contiene fechas o valores no válidos');
  const previous=map.get(p.d);if(previous&&(previous.c!==p.c||previous.a!==p.a))throw new Error('Dos valores diferentes para la misma fecha');map.set(p.d,{d:p.d,c:p.c,a:p.a});
 }
 return [...map.values()].sort((a,b)=>a.d.localeCompare(b.d));
}
function lastOnOrBefore(points:SeriePoint[],date:string){for(let i=points.length-1;i>=0;i--)if(points[i]!.d<=date)return points[i];return undefined;}
function monthsBefore(date:string,months:number){const d=new Date(date+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
export function returnBetween(points:SeriePoint[],start:string,end:string,toleranceDays=7){
 const before=(date:string)=>{const p=lastOnOrBefore(points,date);return p&&(Date.parse(date)-Date.parse(p.d))/DAY<=toleranceDays?p:null;};
 const a=before(start),b=before(end);if(!a||!b||a.d>=b.d)return null;
 const years=(Date.parse(b.d)-Date.parse(a.d))/DAY/365.25;
 return {value:(b.a/a.a-1)*100,annualized:years>=.99?((b.a/a.a)**(1/years)-1)*100:null,start:a.d,end:b.d};
}
export function fundPerformance(raw:SeriePoint[]){
 const points=cleanFundPoints(raw),last=points.at(-1);if(points.length<2||!last)return null;
 const periods=[{label:'1 mes',months:1},{label:'3 meses',months:3},{label:'6 meses',months:6},{label:'Año en curso',months:0},{label:'1 año',months:12},{label:'3 años',months:36},{label:'5 años',months:60},{label:'10 años',months:120}].map(p=>({...p,...returnBetween(points,p.months?monthsBefore(last.d,p.months):`${Number(last.d.slice(0,4))-1}-12-31`,last.d)}));
 let peak=points[0]!.a;
 const chart=points.map(p=>{peak=Math.max(peak,p.a);return {date:p.d,nav:p.c,index:p.a/points[0]!.a*100,drawdown:(p.a/peak-1)*100};});
 const minYear=Number(points[0]!.d.slice(0,4)),maxYear=Number(last.d.slice(0,4));
 const annual=Array.from({length:maxYear-minYear+1},(_,i)=>{const year=minYear+i,end=year===maxYear?last.d:`${year}-12-31`;return {year,partial:year===maxYear&&last.d<`${year}-12-28`,result:returnBetween(points,`${year-1}-12-31`,end)};});
 const monthly=annual.map(({year})=>({year,values:Array.from({length:12},(_,m)=>{
  const end=new Date(Date.UTC(year,m+1,0)).toISOString().slice(0,10),prev=new Date(Date.UTC(year,m,0)).toISOString().slice(0,10);
  if(prev>=last.d)return null;return returnBetween(points,prev,end>last.d?last.d:end);
 })}));
 const completed=monthly.flatMap(y=>y.values.filter((v,m)=>v&&new Date(Date.UTC(y.year,m+1,0)).toISOString().slice(0,10)<=last.d).map(v=>v!.value/100));
 const mean=completed.reduce((s,n)=>s+n,0)/(completed.length||1);
 const volatility=completed.length>=12?Math.sqrt(completed.reduce((s,n)=>s+(n-mean)**2,0)/(completed.length-1)*12)*100:null;
 const since=returnBetween(points,points[0]!.d,last.d);
 return {points,chart,periods,annual,monthly,last,first:points[0]!,since,volatility,maxDrawdown:Math.min(...chart.map(p=>p.drawdown)),monthlyObservations:completed.length};
}
export function chartWindow(points:SeriePoint[],range:'1m'|'6m'|'1y'|'3y'|'5y'|'max'){
 const last=points.at(-1);if(!last||range==='max')return points;
 const months={ '1m':1,'6m':6,'1y':12,'3y':36,'5y':60 }[range],start=monthsBefore(last.d,months);
 const anchor=lastOnOrBefore(points,start),validAnchor=anchor&&(Date.parse(start)-Date.parse(anchor.d))/DAY<=7;
 return points.filter(p=>p.d>=(validAnchor?anchor.d:start));
}
