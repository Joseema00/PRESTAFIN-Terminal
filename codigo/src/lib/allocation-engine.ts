import type { ProductRole } from './investment-products';

export type AllocationGoal='sharpe'|'growth'|'stability';
export const GOAL_LABELS:Record<AllocationGoal,string>={sharpe:'Mejor relación rentabilidad / riesgo',growth:'Mayor crecimiento dentro del perfil',stability:'Menor volatilidad dentro del universo'};
export const MODEL_VERSION='PRESTAFIN-2026-10-v1';
// Explicit planning assumptions, not market observations or calibrated forecasts.
export const ROLE_MODEL:Record<ProductRole,{mean:number;vol:number;shock:number}>={
 overnight:{mean:2.2,vol:.6,shock:1},ultrashort:{mean:2.6,vol:1.5,shock:3},short:{mean:3,vol:3,shock:7},aggregate:{mean:3.8,vol:6.5,shock:15},equity:{mean:6.5,vol:17,shock:50}
};
export type AllocationInput={ids:string[];roles:ProductRole[];means:number[];cov:number[][];riskFree:number;equityCap:number;lossLimit:number;goal:AllocationGoal};
export type AllocationPoint={weights:number[];mean:number;vol:number;sharpe:number|null;stress:number};
export type AllocationAudit={modelVersion:string;goal:AllocationGoal;basis:'assumptions'|'history';source?:string;dataEnd?:string;observations?:number;riskFree:number;equityCap:number;lossLimit:number;ids:string[];roles:ProductRole[];means:number[];cov:number[][];candidateCount:number;step:number};
export function inferGoal(a:Record<string,unknown>):AllocationGoal{
 if(['sharpe','growth','stability'].includes(String(a['optimizationGoal'])))return a['optimizationGoal'] as AllocationGoal;
 if(a['guarantee']==='required'||a['balance']==='stable'||a['tradeoff']==='peace')return 'stability';
 return a['balance']==='growth'&&a['tradeoff']==='growth'?'growth':'sharpe';
}
export function modelCovariance(roles:ProductRole[]):number[][]{
 // Shared market factor plus a residual per role. Same-role products have no
 // assumed diversification benefit in the absence of measured correlations.
 const loading:Record<ProductRole,number>={overnight:.1,ultrashort:.45,short:.65,aggregate:.75,equity:.2};
 return roles.map(a=>roles.map(b=>ROLE_MODEL[a].vol*ROLE_MODEL[b].vol*(a===b?1:loading[a]*loading[b])));
}
export function allocateCents(total:number,weights:number[],roles:ProductRole[],equityCap=100,lossLimit=100):number[]{
 const cents=Math.round(total*100),parts=weights.map(w=>Math.floor(cents*w)),order=weights.map((w,i)=>({i,r:cents*w-parts[i]!})).sort((a,b)=>b.r-a.r||a.i-b.i);
 let left=cents-parts.reduce((s,v)=>s+v,0);for(const x of order){if(left--<=0)break;parts[x.i]=parts[x.i]!+1;}
 // Whole cents must also respect the mandate. Assign rounding residuals to the least risky block.
 const lowest=roles.reduce((best,r,i)=>ROLE_MODEL[r].shock<ROLE_MODEL[roles[best]!].shock?i:best,0);
 for(let attempt=0;attempt<roles.length*3;attempt++){
  const eq=parts.reduce((s,v,i)=>s+(roles[i]==='equity'?v:0),0),shock=parts.reduce((s,v,i)=>s+v*ROLE_MODEL[roles[i]!].shock,0);
  const equityOver=eq>cents*equityCap/100+1e-8;if(!equityOver&&shock<=cents*lossLimit+1e-8)break;
  const from=parts.map((v,i)=>({v,i,shock:ROLE_MODEL[roles[i]!].shock})).filter(x=>x.v>0&&x.i!==lowest&&(!equityOver||roles[x.i]==='equity')).sort((a,b)=>b.shock-a.shock)[0];
  if(!from)throw new Error('El capital es demasiado pequeño para respetar estos límites al redondear');parts[from.i]=parts[from.i]!-1;parts[lowest]=parts[lowest]!+1;
 }
 return parts.map(v=>v/100);
}
export function allocationPoint(input:Pick<AllocationInput,'means'|'cov'|'roles'|'riskFree'>,weights:number[]):AllocationPoint{
 const mean=weights.reduce((s,w,i)=>s+w*input.means[i]!,0);
 const variance=weights.reduce((s,w,i)=>s+w*weights.reduce((n,v,j)=>n+v*input.cov[i]![j]!,0),0);
 const vol=Math.sqrt(Math.max(0,variance));
 return {weights:[...weights],mean,vol,sharpe:vol>1e-9?(mean-input.riskFree)/vol:null,stress:weights.reduce((s,w,i)=>s+w*ROLE_MODEL[input.roles[i]!].shock,0)};
}
export function validAllocationInput(x:AllocationInput):void{
 const n=x.ids.length;
 if(!n||n>4||new Set(x.ids).size!==n||x.roles.length!==n||x.means.length!==n||x.cov.length!==n||x.roles.some(r=>!ROLE_MODEL[r])||x.means.some(v=>!Number.isFinite(v)||v<-99||v>100)||!Number.isFinite(x.riskFree)||x.riskFree<-20||x.riskFree>30||!Number.isFinite(x.equityCap)||x.equityCap<0||x.equityCap>100||!Number.isFinite(x.lossLimit)||x.lossLimit<0||x.lossLimit>100||!GOAL_LABELS[x.goal])throw new Error('Datos de optimización no válidos');
 if(x.cov.some((row,i)=>row.length!==n||row.some((v,j)=>!Number.isFinite(v)||Math.abs(v-x.cov[j]?.[i]!)>1e-7)||row[i]!<0))throw new Error('Covarianza no válida');
 // Cholesky with small tolerance; rejects indefinite covariance supplied in backups.
 const L=Array.from({length:n},()=>Array(n).fill(0) as number[]);
 for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
  const v=x.cov[i]![j]!-L[i]!.slice(0,j).reduce((s,t,k)=>s+t*L[j]![k]!,0);
  if(i===j){if(v< -1e-7)throw new Error('Covarianza no semidefinida positiva');L[i]![j]=Math.sqrt(Math.max(0,v));}
  else if(L[j]![j]!>1e-9)L[i]![j]=v/L[j]![j]!;else if(Math.abs(v)>1e-7)throw new Error('Covarianza no semidefinida positiva');
 }
}
/** Exhaustive long-only grid, no random lottery, leverage or short positions. */
export function optimizeAllocation(input:AllocationInput,step=5){
 validAllocationInput(input);
 if(!Number.isInteger(step)||step<1||100%step!==0)throw new Error('Paso no válido');
 const candidates:AllocationPoint[]=[];const n=input.ids.length;
 function visit(weights:number[],left:number){
  if(weights.length===n-1){const w=[...weights,left].map(v=>v/100);const eq=w.reduce((s,v,i)=>s+(input.roles[i]==='equity'?v*100:0),0);
   if(eq>input.equityCap+1e-8)return;const point=allocationPoint(input,w);if(point.stress<=input.lossLimit+1e-8)candidates.push(point);return;}
  for(let v=0;v<=left;v+=step)visit([...weights,v],left-v);
 }
 visit([],100);
 const compare=(a:AllocationPoint,b:AllocationPoint)=>input.goal==='growth'?b.mean-a.mean||a.vol-b.vol:input.goal==='stability'?a.vol-b.vol||b.mean-a.mean:(b.sharpe??-Infinity)-(a.sharpe??-Infinity)||a.vol-b.vol;
 candidates.sort(compare);
 const ordered=[...candidates].sort((a,b)=>a.vol-b.vol||b.mean-a.mean);let best=-Infinity;
 const frontier=ordered.filter(p=>{if(p.mean<=best+1e-9)return false;best=p.mean;return true;});
 return {best:candidates[0]??null,candidates,frontier,step};
}
export function validateAllocationAudit(raw:unknown):AllocationAudit{
 const x=raw as AllocationAudit;
 if(!x||x.modelVersion!==MODEL_VERSION||!['assumptions','history'].includes(x.basis)||!Array.isArray(x.ids)||x.ids.some(id=>typeof id!=='string'||id.length>160)||!Array.isArray(x.roles)||!Array.isArray(x.means)||!Array.isArray(x.cov)||!Number.isInteger(x.candidateCount)||x.candidateCount<1||x.candidateCount>20000||x.step!==5)throw new Error('Registro de optimización no válido');
 if(x.basis==='history'&&(typeof x.source!=='string'||!x.source||x.source.length>300||typeof x.dataEnd!=='string'||!/^\d{4}-\d{2}$/.test(x.dataEnd)||!Number.isInteger(x.observations)||x.observations!<24||x.observations!>1200))throw new Error('Fuente de optimización no válida');
 validAllocationInput(x);
 return {modelVersion:x.modelVersion,goal:x.goal,basis:x.basis,...(x.basis==='history'?{source:x.source!,dataEnd:x.dataEnd!,observations:x.observations!}:{}),riskFree:x.riskFree,equityCap:x.equityCap,lossLimit:x.lossLimit,ids:[...x.ids],roles:[...x.roles],means:[...x.means],cov:x.cov.map(r=>[...r]),candidateCount:x.candidateCount,step:x.step};
}
