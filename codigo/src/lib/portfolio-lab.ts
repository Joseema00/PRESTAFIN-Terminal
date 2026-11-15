import type {Holding} from './portfolio';
import {holdingName,holdingProduct,positionRisk} from './holding-classification';
import {INVESTMENT_PRODUCTS,type ProductRole} from './investment-products';
import {modelCovariance,ROLE_MODEL} from './allocation-engine';

/** All returns and volatility in this module use annual percentage points.
 * These are explicit planning assumptions, never fabricated market prices. */
export const LAB_VERSION='PRESTAFIN-LAB-2026-11';
export const bounded=(v:number|null|undefined,fallback:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function portfolioSnapshot(holdings:Holding[]){
 const positions=holdings.filter(h=>Number.isFinite(h.amount)&&h.amount>0),total=positions.reduce((s,h)=>s+h.amount,0);
 const weights=positions.map(h=>h.amount/(total||1)),known=positions.map(positionRisk),covered=known.reduce((s,p)=>s+(p?.amount??0),0);
 const fee=known.reduce((s,p)=>s+(p?p.amount*p.fee:0),0)/(total||1),hhi=weights.reduce((s,w)=>s+w*w,0);
 return {positions,total,weights,known,covered,coverage:total?covered/total:0,fee,hhi,effective:hhi?1/hhi:0,largest:Math.max(0,...weights),rows:positions.map((h,i)=>({id:h.assetId,name:holdingName(h),amount:h.amount,weight:weights[i]!*100,role:known[i]?.role??null,fee:known[i]?.fee??null}))};
}
export type Metric='sharpe'|'sortino'|'return'|'volatility'|'var'|'cvar'|'cost'|'concentration';
export function planningMetrics(means:number[],cov:number[][],weights:number[],fees:number[],riskFree=2.2){
 const mean=weights.reduce((s,w,i)=>s+w*means[i]!,0),variance=weights.reduce((s,w,i)=>s+w*weights.reduce((q,v,j)=>q+v*cov[i]![j]!,0),0),vol=Math.sqrt(Math.max(0,variance));
 const fee=weights.reduce((s,w,i)=>s+w*(fees[i]??0),0),hhi=weights.reduce((s,w)=>s+w*w,0);
 const excess=mean-riskFree,z=vol>1e-9?excess/vol:0,t=1/(1+.2316419*Math.abs(z)),density=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI),tail=density*t*(.31938153+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429)))),cdf=z>=0?tail:1-tail,downside=Math.sqrt(Math.max(0,(vol*vol+excess*excess)*cdf-excess*vol*density));
 return {mean,vol,sharpe:vol>1e-9?excess/vol:null,sortino:vol>1e-9&&downside>1e-9?excess/downside:null,var95:Math.max(0,1.644853626951*vol-mean),cvar95:Math.max(0,2.062712807507*vol-mean),fee,hhi,effective:hhi>0?1/hhi:0};
}
export function planningBasis(holdings:Holding[],riskFree=2.2){
 const snapshot=portfolioSnapshot(holdings);if(!snapshot.total||snapshot.known.some(x=>!x))return {snapshot,basis:null};
 const positions=snapshot.known.filter((x):x is NonNullable<typeof x>=>!!x),roles=positions.map(p=>p.role),means=positions.map(p=>ROLE_MODEL[p.role].mean-p.fee),cov=modelCovariance(roles),fees=positions.map(p=>p.fee);
 return {snapshot,basis:{positions,roles,means,cov,fees,metrics:planningMetrics(means,cov,snapshot.weights,fees,riskFree)}};
}
export function metricValue(m:ReturnType<typeof planningMetrics>,metric:Metric):number|null{return metric==='sharpe'?m.sharpe:metric==='sortino'?m.sortino:metric==='return'?m.mean:metric==='volatility'?m.vol:metric==='var'?m.var95:metric==='cvar'?m.cvar95:metric==='cost'?m.fee:m.hhi;}
export const higherIsBetter=(metric:Metric)=>metric==='sharpe'||metric==='sortino'||metric==='return';
export function metricImprovement(before:number|null,after:number|null,metric:Metric){return before===null||after===null?null:(after-before)*(higherIsBetter(metric)?1:-1);}
export function fundAlternatives(holdings:Holding[],options:{metric?:Metric;count?:number;maxAllocation?:number;riskFree?:number;equityCap?:number;lossLimit?:number}={}){
 const {snapshot,basis}=planningBasis(holdings,options.riskFree);if(!basis)return [];
 const metric=options.metric??'sharpe',max=bounded(options.maxAllocation,.2,.01,.5),existing=new Set(holdings.map(h=>holdingProduct(h)?.isin??h.meta?.isin)),results=[];
 for(const product of INVESTMENT_PRODUCTS.filter(p=>p.vehicle==='Fondo'&&!existing.has(p.isin))){
  const roles:ProductRole[]=[...basis.roles,product.role],means=[...basis.means,ROLE_MODEL[product.role].mean-product.fee],cov=modelCovariance(roles),fees=[...basis.fees,product.fee];let best:null|{allocation:number;weights:number[];metrics:ReturnType<typeof planningMetrics>;improvement:number|null}=null;
  for(let j=1;j<=10;j++){
   const allocation=max*j/10,weights=[...snapshot.weights.map(w=>w*(1-allocation)),allocation];
   const equity=weights.reduce((s,w,i)=>s+(roles[i]==='equity'?w*100:0),0),stress=weights.reduce((s,w,i)=>s+w*ROLE_MODEL[roles[i]!].shock,0);
   if(equity>(options.equityCap??100)+1e-8||stress>(options.lossLimit??100)+1e-8)continue;
   const metrics=planningMetrics(means,cov,weights,fees,options.riskFree),improvement=metricImprovement(metricValue(basis.metrics,metric),metricValue(metrics,metric),metric);
   if(!best||(improvement??-Infinity)>(best.improvement??-Infinity))best={allocation,weights,metrics,improvement};
  }
  if(best)results.push({product,...best,improves:best.improvement!==null&&best.improvement>1e-6});
 }
 return results.sort((a,b)=>(b.improvement??-Infinity)-(a.improvement??-Infinity)).slice(0,Math.round(bounded(options.count,5,1,5)));
}
export function allocationSweep(holdings:Holding[],riskFree=2.2,metric:Metric='sharpe',maxWeight=1){
 const {snapshot,basis}=planningBasis(holdings,riskFree);if(!basis)return null;
 const n=snapshot.weights.length,cap=bounded(maxWeight,1,0,1);let random=seeded(76216),points=[];
 for(let k=0;k<1200;k++){
  let weights=k===0?[...snapshot.weights]:k===1?Array(n).fill(1/n):Array.from({length:n},()=>-Math.log(Math.max(1e-12,random())));
  if(k>1){const sum=weights.reduce((s,w)=>s+w,0);weights=weights.map(w=>w/sum);}
  if(weights.some(w=>w>cap+1e-9))continue;
  points.push({weights,...planningMetrics(basis.means,basis.cov,weights,basis.fees,riskFree)});
 }
 const current=planningMetrics(basis.means,basis.cov,snapshot.weights,basis.fees,riskFree);
 points.sort((a,b)=>(metricImprovement(metricValue(current,metric),metricValue(b,metric),metric)??-Infinity)-(metricImprovement(metricValue(current,metric),metricValue(a,metric),metric)??-Infinity));
 return {current,best:points[0]??null,points,cap};
}
export function seeded(seed:number){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
const quantile=(sorted:number[],p:number)=>{const x=(sorted.length-1)*p,i=Math.floor(x);return sorted[i]!+(sorted[Math.min(i+1,sorted.length-1)]!-sorted[i]!)*(x-i);};
export type ProcessModel='gbm'|'jump'|'regime'|'ou'|'bootstrap';
export type SimulationInput={initial:number;monthly?:number;years?:number;sims?:number;seed?:number;mean?:number;vol?:number;extraFee?:number;inflation?:number;goal?:number;model?:ProcessModel;jumpIntensity?:number;jumpMean?:number;jumpVol?:number;stressMean?:number;stressVolMultiplier?:number;crisisIntensity?:number;recoveryMonths?:number;kappa?:number;history?:number[];blockLength?:number};
export function simulateScenarios(input:SimulationInput){
 const initial=bounded(input.initial,0,0,1e12),monthly=bounded(input.monthly,0,0,1e9),years=Math.round(bounded(input.years,10,1,40)),sims=Math.round(bounded(input.sims,2000,100,20000)),seed=Math.round(bounded(input.seed,20261115,0,4294967295));
 const mean=bounded(input.mean,5,-50,50)/100,vol=bounded(input.vol,15,0,100)/100,fee=Math.log1p(bounded(input.extraFee,0,0,20)/100),inflation=Math.log1p(bounded(input.inflation,0,-10,30)/100),goal=bounded(input.goal,100000,0,1e12),months=years*12,step=Math.ceil(months/120),dt=1/12;
 const history=(input.history??[]).filter(x=>Number.isFinite(x)&&x>-1),requested=input.model??'gbm',model=requested==='bootstrap'&&history.length<24?'gbm':requested;
 const lambda=bounded(input.jumpIntensity,.35,0,5),jm=bounded(input.jumpMean,-20,-90,20)/100,js=bounded(input.jumpVol,10,0,50)/100,compensation=lambda*(Math.exp(jm+js*js/2)-1),stressMean=bounded(input.stressMean,-20,-80,30)/100,multiplier=bounded(input.stressVolMultiplier,1.8,1,5),crisisRate=bounded(input.crisisIntensity,.25,0,5),recovery=bounded(input.recoveryMonths,6,1,60),kappa=bounded(input.kappa,1,0,10),block=Math.round(bounded(input.blockLength,12,1,24));
 const rng=seeded(seed),normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng()),checkpoints=Array.from({length:Math.floor(months/step)+1},(_,i)=>i*step);if(checkpoints.at(-1)!==months)checkpoints.push(months);
 const buckets:number[][]=checkpoints.map(()=>[]),drawdownBuckets:number[][]=checkpoints.map(()=>[]),paths:number[][]=[],finals:number[]=[],drawdowns:number[]=[];
 let contributed=initial;for(let m=1;m<=months;m++)contributed+=monthly*Math.exp(-inflation*m/12);
 for(let s=0;s<sims;s++){
  let capital=initial,index=1,peak=1,maxDD=0,x=0,regime=false,histIndex=0,checkpoint=0,path:number[]=[];
  buckets[0]!.push(initial);drawdownBuckets[0]!.push(0);if(s<24)path.push(initial);
  for(let m=1;m<=months;m++){
   let logReturn:number;
   if(model==='bootstrap'){if((m-1)%block===0)histIndex=Math.floor(rng()*history.length);logReturn=Math.log1p(history[histIndex%history.length]!);histIndex++;}
   else if(model==='ou'){const decay=Math.exp(-kappa*dt),next=decay*x+vol*Math.sqrt(kappa>1e-9?(1-decay*decay)/(2*kappa):dt)*normal();logReturn=mean*dt+next-x;x=next;}
   else{
    if(model==='regime'){if(regime){if(rng()<1-Math.exp(-1/recovery))regime=false;}else if(rng()<1-Math.exp(-crisisRate*dt))regime=true;}
    const sigma=regime?vol*multiplier:vol,mu=regime?stressMean:mean;
    logReturn=(mu-.5*sigma*sigma-(model==='jump'?compensation:0))*dt+sigma*Math.sqrt(dt)*normal();
    if(model==='jump'){let count=0,p=1,limit=Math.exp(-lambda*dt);do{count++;p*=Math.max(1e-12,rng());}while(p>limit);count--;if(count)logReturn+=count*jm+Math.sqrt(count)*js*normal();}
   }
   logReturn-=fee*dt;const factor=Math.exp(logReturn);index*=factor;peak=Math.max(peak,index);maxDD=Math.max(maxDD,1-index/peak);capital=capital*factor+monthly;
   if(m===checkpoints[checkpoint+1]){checkpoint++;const real=capital*Math.exp(-inflation*m/12);buckets[checkpoint]!.push(real);drawdownBuckets[checkpoint]!.push(maxDD*100);if(s<24)path.push(real);}
  }
  finals.push(capital*Math.exp(-inflation*years));drawdowns.push(maxDD*100);if(s<24)paths.push(path);
 }
 const curve=buckets.map((b,i)=>{b.sort((a,b)=>a-b);drawdownBuckets[i]!.sort((a,b)=>a-b);return {year:checkpoints[i]!/12,p5:quantile(b,.05),p25:quantile(b,.25),p50:quantile(b,.5),p75:quantile(b,.75),p95:quantile(b,.95),drawdown50:quantile(drawdownBuckets[i]!,.5),drawdown95:quantile(drawdownBuckets[i]!,.95)};});
 finals.sort((a,b)=>a-b);drawdowns.sort((a,b)=>a-b);const min=finals[0]!,max=finals.at(-1)!,width=(max-min)/30||1,histogram=Array.from({length:30},(_,i)=>({capital:min+(i+.5)*width,count:0}));for(const x of finals)histogram[Math.min(29,Math.floor((x-min)/width))]!.count++;
 const threshold=quantile(finals,.05),tail=finals.filter(v=>v<=threshold);
 return {model,requested,fallback:model!==requested,sims,seed,years,curve,paths,finals,histogram,contributed,pLoss:finals.filter(x=>x<contributed).length/sims,pGoal:goal>0?finals.filter(x=>x>=goal).length/sims:null,p5:quantile(finals,.05),median:quantile(finals,.5),p95:quantile(finals,.95),expected:finals.reduce((s,x)=>s+x,0)/sims,tailMean:tail.reduce((s,x)=>s+x,0)/tail.length,drawdown95:quantile(drawdowns,.95)};
}
