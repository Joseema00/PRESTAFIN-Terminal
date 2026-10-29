import type { Person } from './people';
import type { Portfolio } from './portfolio';
export type Valuation={date:string;value:number;netFlow:number;note:string};
export type PortfolioTracking={valuations:Valuation[]};
export type WealthSnapshot={date:string;investments:number;cash:number;otherAssets:number;debt:number};
export const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const validDay=(day:unknown)=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day&&day<=localDay();
const money=(n:unknown,negative=false)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e12&&(negative||n>=0);
export function validateTracking(input:unknown):PortfolioTracking{
 const v=input as PortfolioTracking;
 if(!v||!Array.isArray(v.valuations)||!v.valuations.length||v.valuations.length>1200)throw new Error('Seguimiento de cartera no válido');
 let previous='';
 const valuations=v.valuations.map((r,i)=>{
  if(!r||!validDay(r.date)||r.date<=previous||!money(r.value)||!money(r.netFlow,true)||typeof r.note!=='string'||r.note.length>500||i===0&&r.netFlow!==0||i>0&&r.value-r.netFlow<0)throw new Error('Valoración no válida: fecha única y pasada, saldo no negativo y flujos al cierre');
  previous=r.date;return {date:r.date,value:r.value,netFlow:r.netFlow,note:r.note};
 });return {valuations};
}
export function validateWealthHistory(input:unknown):WealthSnapshot[]{
 if(!Array.isArray(input)||input.length>1200)throw new Error('Evolución patrimonial no válida');let previous='';
 return input.map(v=>{if(!v||!validDay(v.date)||v.date<=previous||!['investments','cash','otherAssets','debt'].every(k=>money(v[k])))throw new Error('Saldo patrimonial no válido');previous=v.date;return {date:v.date,investments:v.investments,cash:v.cash,otherAssets:v.otherAssets,debt:v.debt};});
}
export function portfolioValue(c:Portfolio):number{return c.tracking?.valuations.at(-1)?.value??c.holdings.filter(h=>h.assetId!=='interview-cash-pending').reduce((s,h)=>s+h.amount,0);}
export function personWealth(p:Person){
 const accounts=p.portfolios.filter(c=>!!c.tracking&&!c.proposal);
 const selected=p.portfolios.find(c=>c.id===p.activeId);
 // Old manual dossiers retain their selected balance until they are explicitly registered.
 const legacy=!accounts.length&&selected&&!selected.proposal&&!selected.mode?[selected]:[];
 const investments=[...accounts,...legacy].reduce((s,c)=>s+portfolioValue(c),0);
 const assets=investments+p.profile.cash+p.profile.otherAssets;
 return {investments,cash:p.profile.cash,otherAssets:p.profile.otherAssets,debt:p.mortgage.principal,assets,net:assets-p.mortgage.principal,accounts,legacy:!!legacy.length};
}
export function captureWealth(p:Person,date=localDay()):Person{
 const w=personWealth(p);const item={date,investments:w.investments,cash:w.cash,otherAssets:w.otherAssets,debt:w.debt};
 const history=[...(p.wealthHistory??[]).filter(x=>x.date!==date),item].sort((a,b)=>a.date.localeCompare(b.date)).slice(-1200);
 return {...p,wealthHistory:history};
}
export function accountSeries(c:Portfolio){
 let index=100;const rows=c.tracking?.valuations??[];
 return rows.map((r,i)=>{const prior=rows[i-1];const change=prior&&prior.value>0?(r.value-r.netFlow)/prior.value-1:null;if(change!==null)index*=1+change;return {...r,index:i===0?100:index,change,gain:prior?r.value-prior.value-r.netFlow:0};});
}
export function recordValuation(c:Portfolio,item:Valuation):Portfolio{
 if(c.proposal)throw new Error('Registra una inversión realizada antes de anotar su evolución');
 const existing=c.tracking?.valuations??[];
 if(existing.length&&item.date<existing.at(-1)!.date)throw new Error('La valoración debe ser posterior o del mismo día que la última');
 const valuations=[...existing.filter(r=>r.date!==item.date),item];
 if(valuations.length===1)valuations[0]={...item,netFlow:0};
 const tracking=validateTracking({valuations});
 const total=c.holdings.reduce((s,h)=>s+h.amount,0);
 // Valuation changes total balance only; individual weights remain the recorded allocation.
 if(total===0&&item.value>0)throw new Error('Revisa la composición de la cuenta antes de registrar una nueva inversión después de un saldo cero');
 const holdings=total>0?c.holdings.map(h=>({...h,amount:h.amount/total*item.value})):c.holdings;
 return {...c,holdings,tracking};
}
