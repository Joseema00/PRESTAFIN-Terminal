/** Continuous, long-only portfolio studies. All public returns are annual %,
 * covariance is annual percentage-points squared, weights are fractions.
 * No prices, profile limits or missing observations are invented here. */
// @ts-expect-error quadprog 2.0.0 exposes JS without TypeScript declarations.
import { solveQP } from 'quadprog';
import { covariance as historicalCovariance, validateHistory, type HistoricalData } from './professional-analysis';

export const OPTIMIZER_VERSION = 'PRESTAFIN-QP-1';
export const METHODS = {minVariance:'Mínima varianza',maxSharpe:'Máximo Sharpe',utility:'Media-varianza con aversión al riesgo',targetReturn:'Mínima varianza con rentabilidad mínima',targetRisk:'Máxima rentabilidad con volatilidad máxima',equal:'Equiponderada',inverseVolatility:'Inversa de volatilidad',riskParity:'Contribución igual al riesgo'} as const;
export type Method = keyof typeof METHODS;
export type CovarianceMethod = 'sample'|'shrinkage'|'ledoitWolf'|'ewma'|'gerber';
export type EstimationSettings = {method:CovarianceMethod;window:number|null;shrinkage:number;decay:number;threshold:number;meanShrinkage:number;overrides:Array<number|null>};
export type LinearLimit = {name:string;coefficients:number[];min?:number|null;max?:number|null};
export type AutomaticEstimationAudit={version:'PRESTAFIN-AUTO-1';method:'baseline'|'ridge';reason:string;trainingMonths:number;validationMonths:number;baselineMse:number|null;ridgeMse:number|null;improvement:number|null;alpha:number|null};
export type OptimizerInput = {
 automatic?:AutomaticEstimationAudit;
 ids:string[];names:string[];means:number[];cov:number[][];currentWeights:number[];riskFree:number;
 method:Method;minWeights?:Array<number|null>;maxWeights?:Array<number|null>;limits?:LinearLimit[];
 targetReturn?:number|null;maxVolatility?:number|null;maxTurnover?:number|null;
 riskAversion?:number|null;concentrationPenalty?:number|null;
 source:string;basis:'history'|'assumptions';dataStart?:string;dataEnd?:string;observations?:number;
 estimator?:string;estimationSettings?:EstimationSettings;
};
export type SolverDiagnostics = {solver:string;iterations:number;primalResidual:number;stationarityResidual:number;complementarityResidual:number;ridge:number;minEigenvalue:number;conditionNumber:number|null;activeConstraints:string[]};
export type OptimizerPoint = {weights:number[];mean:number;vol:number;sharpe:number|null;turnover:number;effectivePositions:number;riskShares:number[]};
export type OptimizerResult = {point:OptimizerPoint;minimumVariance:OptimizerPoint;current:OptimizerPoint;equal:OptimizerPoint;frontier:OptimizerPoint[];diagnostics:SolverDiagnostics;warnings:string[]};
export type OptimizationStudy = {version:typeof OPTIMIZER_VERSION;createdAt:number;capital?:number;unfundedObjective?:boolean;input:OptimizerInput;result:OptimizerResult};
const sum=(x:number[])=>x.reduce((s,v)=>s+v,0);
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i]!,0);
const mv=(a:number[][],x:number[])=>a.map(r=>dot(r,x));
const matrix=(n:number,f:(i:number,j:number)=>number)=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>f(i,j)));
const present=(x:unknown):x is number=>x!==null&&x!==undefined;
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const bound=(x:unknown,min:number,max:number)=>finite(x)&&x>=min&&x<=max;
const TOL=2e-7;

/** Jacobi rotations for a real symmetric matrix, bounded at 30 assets. */
export function spectrum(cov:number[][]):number[]{
 const n=cov.length,a=cov.map(r=>[...r]),scale=Math.max(1e-20,...a.map((r,i)=>Math.abs(r[i]!)));
 for(let k=0;k<100*n*n;k++){
  let p=0,q=0,largest=0;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i]![j]!)>largest){p=i;q=j;largest=Math.abs(a[i]![j]!);}
  if(largest<=scale*1e-13)return a.map((r,i)=>r[i]!).sort((x,y)=>x-y);
  const app=a[p]![p]!,aqq=a[q]![q]!,apq=a[p]![q]!,theta=.5*Math.atan2(2*apq,aqq-app),c=Math.cos(theta),s=Math.sin(theta);
  for(let i=0;i<n;i++)if(i!==p&&i!==q){const x=a[i]![p]!,y=a[i]![q]!;a[i]![p]=a[p]![i]=c*x-s*y;a[i]![q]=a[q]![i]=s*x+c*y;}
  a[p]![p]=c*c*app-2*s*c*apq+s*s*aqq;a[q]![q]=s*s*app+2*s*c*apq+c*c*aqq;a[p]![q]=a[q]![p]=0;
 }
 throw new Error('La comprobación de la covarianza no ha convergido.');
}

export function validateOptimizerInput(raw:OptimizerInput):OptimizerInput{
 const x=raw,n=x?.ids?.length;
 if(!n||n>30||new Set(x.ids).size!==n||x.ids.some(v=>typeof v!=='string'||!v||v.length>160)||!Array.isArray(x.names)||x.names.length!==n||x.names.some(v=>typeof v!=='string'||v.length>180)||!Object.hasOwn(METHODS,x.method))throw new Error('Selecciona entre 1 y 30 posiciones distintas y un método válido.');
 if(!Array.isArray(x.means)||x.means.length!==n||x.means.some(v=>!bound(v,-1200,12000))||!Array.isArray(x.currentWeights)||x.currentWeights.length!==n||x.currentWeights.some(v=>!bound(v,0,1))||Math.abs(sum(x.currentWeights)-1)>TOL||!bound(x.riskFree,-99,100))throw new Error('Rentabilidades, referencia o pesos actuales no válidos.');
 if(!Array.isArray(x.cov)||x.cov.length!==n||x.cov.some(r=>!Array.isArray(r)||r.length!==n||r.some(v=>!finite(v)||Math.abs(v)>1e8)))throw new Error('Matriz de covarianza incompleta o no finita.');
 const scale=Math.max(1,...x.cov.map((r,i)=>Math.abs(r[i]!)));
 if(x.cov.some((r,i)=>r[i]!<0||r.some((v,j)=>Math.abs(v-x.cov[j]![i]!)>scale*1e-10)))throw new Error('La covarianza debe ser simétrica y tener varianzas no negativas.');
 if(spectrum(x.cov)[0]!< -scale*1e-9)throw new Error('La covarianza no es semidefinida positiva. Revisa el estimador o los datos; no se corrige silenciosamente.');
 for(const values of [x.minWeights,x.maxWeights])if(values!==undefined&&(!Array.isArray(values)||values.length!==n||values.some(v=>v!==null&&!bound(v,0,1))))throw new Error('Los límites individuales deben estar entre 0 % y 100 %, o vacíos.');
 const lo=x.ids.map((_,i)=>x.minWeights?.[i]??0),hi=x.ids.map((_,i)=>x.maxWeights?.[i]??1);
 if(lo.some((v,i)=>v>hi[i]!))throw new Error('El peso mínimo supera al máximo de algún activo.');
 if(sum(lo)>1+1e-10)throw new Error('Los pesos mínimos suman más del 100 %. Reduce alguno de ellos.');
 if(sum(hi)<1-1e-10)throw new Error('Los pesos máximos no permiten invertir el 100 %. Aumenta alguno o incorpora más activos.');
 for(const [v,a,b,label] of [[x.targetReturn,-1200,12000,'rentabilidad mínima'],[x.maxVolatility,0,10000,'volatilidad máxima'],[x.maxTurnover,0,1,'rotación máxima'],[x.riskAversion,.001,10000,'aversión al riesgo'],[x.concentrationPenalty,0,100,'penalización de concentración']] as const)if(present(v)&&!bound(v,a,b))throw new Error('Parámetro no válido: '+label);
 if(x.method==='targetReturn'&&!present(x.targetReturn))throw new Error('Este objetivo necesita una rentabilidad mínima.');
 if(x.method==='targetRisk'&&!present(x.maxVolatility))throw new Error('Este objetivo necesita una volatilidad máxima.');
 if(x.limits!==undefined&&(!Array.isArray(x.limits)||x.limits.length>40))throw new Error('Demasiadas restricciones de grupos.');
 for(const l of x.limits??[])if(!l||typeof l.name!=='string'||l.name.length>180||!Array.isArray(l.coefficients)||l.coefficients.length!==n||l.coefficients.some(v=>!bound(v,-10000,10000))||(present(l.min)&&!bound(l.min,-10000,10000))||(present(l.max)&&!bound(l.max,-10000,10000))||(present(l.min)&&present(l.max)&&l.min>l.max))throw new Error('Restricción de grupo incompleta o contradictoria.');
 if(!['history','assumptions'].includes(x.basis)||typeof x.source!=='string'||!x.source||x.source.length>600||x.estimator!==undefined&&(typeof x.estimator!=='string'||x.estimator.length>300))throw new Error('Falta la procedencia de las entradas.');
 if(x.basis==='history'&&(!Number.isInteger(x.observations)||!bound(x.observations,24,1200)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(x.dataStart??'')||!/^\d{4}-(0[1-9]|1[0-2])$/.test(x.dataEnd??'')||x.dataStart!>x.dataEnd!))throw new Error('La ventana histórica debe estar identificada y contener al menos 24 meses.');
 const e=x.estimationSettings;
 if(e&&(!['sample','shrinkage','ledoitWolf','ewma','gerber'].includes(e.method)||e.window!==null&&(!Number.isInteger(e.window)||!bound(e.window,24,1200))||!bound(e.shrinkage,0,1)||!bound(e.decay,.01,.9999)||!bound(e.threshold,.01,2)||!bound(e.meanShrinkage,0,1)||!Array.isArray(e.overrides)||e.overrides.length!==n||e.overrides.some(v=>v!==null&&!bound(v,-1200,12000))))throw new Error('Ajustes guardados del estimador no válidos.');
 const audit=x.automatic;
 if(audit&&(audit.version!=='PRESTAFIN-AUTO-1'||!['baseline','ridge'].includes(audit.method)||typeof audit.reason!=='string'||audit.reason.length>600||!Number.isInteger(audit.trainingMonths)||!bound(audit.trainingMonths,24,120)||!Number.isInteger(audit.validationMonths)||![0,24].includes(audit.validationMonths)||[audit.baselineMse,audit.ridgeMse].some(v=>v!==null&&!bound(v,0,1e8))||audit.improvement!==null&&!bound(audit.improvement,-1e12,1)||audit.alpha!==null&&![.1,1,10,100].includes(audit.alpha)||audit.method==='ridge'&&(audit.validationMonths!==24||audit.trainingMonths<72||audit.improvement===null||audit.improvement<.05)))throw new Error('Auditoría del estimador automático no válida.');
 if(audit){
  if(x.basis!=='history'||audit.trainingMonths!==x.observations)throw new Error('Auditoría automática incompatible con la base histórica.');
  if(audit.validationMonths===24){if(audit.trainingMonths<72||audit.baselineMse===null||audit.ridgeMse===null||audit.alpha===null||audit.improvement===null||Math.abs(audit.improvement-(audit.baselineMse>1e-20?1-audit.ridgeMse/audit.baselineMse:0))>1e-9)throw new Error('Auditoría temporal incoherente.');}
  else if(audit.method!=='baseline'||audit.baselineMse!==null||audit.ridgeMse!==null||audit.alpha!==null||audit.improvement!==null)throw new Error('Auditoría sin validación incoherente.');
 }
 // Canonical fields only: preserve explicit zero, strip unrelated payloads.
 return {...(audit?{automatic:{version:audit.version,method:audit.method,reason:audit.reason,trainingMonths:audit.trainingMonths,validationMonths:audit.validationMonths,baselineMse:audit.baselineMse,ridgeMse:audit.ridgeMse,improvement:audit.improvement,alpha:audit.alpha}}:{}),ids:[...x.ids],names:[...x.names],means:[...x.means],cov:x.cov.map(r=>[...r]),currentWeights:[...x.currentWeights],riskFree:x.riskFree,method:x.method,source:x.source,basis:x.basis,
  ...(x.minWeights?{minWeights:[...x.minWeights]}:{}),...(x.maxWeights?{maxWeights:[...x.maxWeights]}:{}),...(x.limits?{limits:x.limits.map(l=>({name:l.name,coefficients:[...l.coefficients],min:l.min??null,max:l.max??null}))}:{}),
  targetReturn:x.targetReturn??null,maxVolatility:x.maxVolatility??null,maxTurnover:x.maxTurnover??null,riskAversion:x.riskAversion??5,concentrationPenalty:x.concentrationPenalty??0,
  ...(x.basis==='history'?{dataStart:x.dataStart,dataEnd:x.dataEnd,observations:x.observations}:{}),...(x.estimator?{estimator:x.estimator}:{}),...(e?{estimationSettings:{method:e.method,window:e.window,shrinkage:e.shrinkage,decay:e.decay,threshold:e.threshold,meanShrinkage:e.meanShrinkage,overrides:[...e.overrides]}}:{})};
}

export function evaluatePortfolio(input:OptimizerInput,weights:number[]):OptimizerPoint{
 const marginal=mv(input.cov,weights),variance=dot(weights,marginal),vol=Math.sqrt(Math.max(0,variance)),mean=dot(weights,input.means);
 return {weights:[...weights],mean,vol,sharpe:vol>1e-10?(mean-input.riskFree)/vol:null,turnover:sum(weights.map((w,i)=>Math.abs(w-input.currentWeights[i]!)))/2,effectivePositions:1/dot(weights,weights),riskShares:weights.map((w,i)=>variance>1e-18?w*marginal[i]!/variance:0)};
}
export function constraintViolations(x:OptimizerInput,w:number[]):{name:string;residual:number}[]{
 const values=[{name:'Presupuesto 100 %',residual:Math.abs(sum(w)-1)}];
 for(let i=0;i<w.length;i++)values.push({name:'Mínimo '+x.names[i],residual:(x.minWeights?.[i]??0)-w[i]!},{name:'Máximo '+x.names[i],residual:w[i]!-(x.maxWeights?.[i]??1)});
 for(const l of x.limits??[]){const v=dot(l.coefficients,w);if(present(l.min))values.push({name:l.name+' mínimo',residual:(l.min-v)/Math.max(1,Math.abs(l.min))});if(present(l.max))values.push({name:l.name+' máximo',residual:(v-l.max)/Math.max(1,Math.abs(l.max))});}
 const p=evaluatePortfolio(x,w);
 if(present(x.targetReturn))values.push({name:'Rentabilidad mínima',residual:(x.targetReturn-p.mean)/Math.max(1,Math.abs(x.targetReturn))});
 if(present(x.maxVolatility))values.push({name:'Volatilidad máxima',residual:(p.vol-x.maxVolatility)/Math.max(1,x.maxVolatility)});
 if(present(x.maxTurnover))values.push({name:'Rotación máxima',residual:p.turnover-x.maxTurnover});
 return values;
}

type Constraint={a:number[];b:number;name:string};
type QPSolution={weights:number[];diagnostics:SolverDiagnostics};
class InfeasibleConstraints extends Error {}
/** Active-set convex QP. An explicit, reported numerical ridge handles singular
 * covariance and turnover auxiliary variables; constraints are never relaxed. */
function quadratic(x:OptimizerInput,varianceWeight:number,returnWeight:number,penalty=0,target?:number):QPSolution{
 const n=x.ids.length,aux=present(x.maxTurnover),dim=aux?2*n:n;
 const eigen=spectrum(x.cov),scale=Math.max(1e-8,eigen.at(-1)!/10000),ridge=Math.max(scale*(varianceWeight===0?1e-6:1e-9),-eigen[0]!/10000+scale*1e-9);
 const d=Array.from({length:dim},(_,i)=>i<n?returnWeight*x.means[i]!/100:0);
 const D=matrix(dim,(i,j)=>i<n&&j<n?varianceWeight*x.cov[i]![j]!/10000+(i===j?ridge+penalty:0):i===j?ridge:0);
 const rows:Constraint[]=[{a:Array.from({length:dim},(_,i)=>i<n?1:0),b:1,name:'Presupuesto 100 %'}];
 for(let i=0;i<n;i++){
  const a=Array(dim).fill(0);a[i]=1;rows.push({a,b:x.minWeights?.[i]??0,name:'Mínimo '+x.names[i]});
  rows.push({a:a.map(v=>-v),b:-(x.maxWeights?.[i]??1),name:'Máximo '+x.names[i]});
 }
 for(const l of x.limits??[]){const a=[...l.coefficients,...Array(dim-n).fill(0)];if(present(l.min))rows.push({a,b:l.min,name:l.name+' mínimo'});if(present(l.max))rows.push({a:a.map(v=>-v),b:-l.max,name:l.name+' máximo'});}
 const floor=Math.max(x.targetReturn??-Infinity,target??-Infinity);
 if(Number.isFinite(floor))rows.push({a:[...x.means.map(v=>v/100),...Array(dim-n).fill(0)],b:floor/100,name:'Rentabilidad mínima'});
 if(aux){
  for(let i=0;i<n;i++){const a=Array(dim).fill(0);a[i]=-1;a[n+i]=1;rows.push({a,b:-x.currentWeights[i]!,name:'Rotación compra '+x.names[i]});const b=[...a];b[i]=1;rows.push({a:b,b:x.currentWeights[i]!,name:'Rotación venta '+x.names[i]});}
  rows.push({a:Array.from({length:dim},(_,i)=>i<n?0:-1),b:-2*x.maxTurnover!,name:'Rotación máxima'});
 }
 // Scale rows and objective independently to avoid percentage-vs-weight issues.
 const normalized=rows.map(r=>{const s=Math.max(...r.a.map(Math.abs),Math.abs(r.b),1e-12);return {...r,a:r.a.map(v=>v/s),b:r.b/s};});
 const objectiveScale=Math.max(...D.flat().map(Math.abs),...d.map(Math.abs),1e-10);
 const ds=D.map(r=>r.map(v=>v/objectiveScale)),ls=d.map(v=>v/objectiveScale);
 const solverA=[[],...Array.from({length:dim},(_,i)=>[0,...normalized.map(r=>r.a[i]!)])];
 const result=solveQP([[],...ds.map(r=>[0,...r])],[0,...ls],solverA,[0,...normalized.map(r=>r.b)],1);
 if(result.message){if(result.message.includes('inconsistent'))throw new InfeasibleConstraints('Restricciones incompatibles: no existe un reparto que cumpla todos los límites. Revisa mínimos, máximos, grupos, rotación y rentabilidad.');throw new Error('Problema numérico del solver: '+result.message);}
 const z=(result.solution as number[]).slice(1),w=z.slice(0,n),lambda=(result.Lagrangian as number[]).slice(1);
 if(z.length!==dim||z.some(v=>!finite(v)))throw new Error('El solver no devolvió una solución finita.');
 const residual=Math.max(...normalized.map((r,i)=>i===0?Math.abs(dot(r.a,z)-r.b):Math.max(0,r.b-dot(r.a,z))));
 // The Fortran port may reverse equality columns in place. Multipliers refer
 // to that returned orientation, not necessarily the original equality sign.
 const reduced=mv(ds,z).map((v,i)=>v-ls[i]!-sum(normalized.slice(1).map((r,j)=>r.a[i]!*lambda[j+1]!)));
 const equalityMultiplier=dot(reduced,normalized[0]!.a)/dot(normalized[0]!.a,normalized[0]!.a);
 const stationarity=Math.max(...reduced.map((v,i)=>Math.abs(v-equalityMultiplier*normalized[0]!.a[i]!)),...lambda.slice(1).map(v=>Math.max(0,-v)));
 const complementarity=Math.max(0,...normalized.slice(1).map((r,i)=>Math.abs(lambda[i+1]!*(dot(r.a,z)-r.b))));
 if(residual>TOL||stationarity>1e-5||complementarity>1e-5)throw new Error(`La solución no supera los controles de precisión (factibilidad ${residual.toExponential(2)}, estacionariedad ${stationarity.toExponential(2)}, complementariedad ${complementarity.toExponential(2)}); no se guarda una cartera inválida.`);
 return {weights:w,diagnostics:{solver:'Goldfarb–Idnani · quadprog 2.0.0',iterations:result.iterations[1],primalResidual:residual,stationarityResidual:stationarity,complementarityResidual:complementarity,ridge:ridge*10000,minEigenvalue:eigen[0]!,conditionNumber:eigen[0]!>0?eigen.at(-1)!/eigen[0]!:null,activeConstraints:normalized.filter((r,i)=>i===0||Math.abs(dot(r.a,z)-r.b)<1e-7).map(r=>r.name)}};
}

/** Frontier via target-return QPs, including endpoints; never random portfolios. */
export function optimizeContinuous(raw:OptimizerInput,frontierCount=25):OptimizerResult{
 const x=validateOptimizerInput(raw),n=x.ids.length,warnings:string[]=[];
 if(!Number.isInteger(frontierCount)||frontierCount<2||frontierCount>61)throw new Error('La frontera admite de 2 a 61 puntos.');
 if(x.maxTurnover===0){
  if(['equal','inverseVolatility','riskParity'].includes(x.method)){const defined=optimizeContinuous({...x,maxTurnover:null},2);if(defined.point.weights.some((w,i)=>Math.abs(w-x.currentWeights[i]!)>TOL))throw new Error('Este reparto incumple la rotación máxima de 0 %.');}
  const point=evaluatePortfolio(x,x.currentWeights),violations=constraintViolations(x,point.weights).filter(v=>v.residual>TOL),eigen=spectrum(x.cov);
  if(violations.length)throw new Error('La rotación máxima de 0 % fija la cartera actual, que incumple: '+violations.map(v=>v.name).join(', '));
  if(x.method==='maxSharpe'&&point.sharpe===null)throw new Error('Volatilidad nula: Sharpe no está definido.');
  return {point,minimumVariance:point,current:point,equal:evaluatePortfolio(x,Array(n).fill(1/n)),frontier:[point],diagnostics:{solver:'Solución única · rotación máxima 0 %',iterations:0,primalResidual:0,stationarityResidual:0,complementarityResidual:0,ridge:0,minEigenvalue:eigen[0]!,conditionNumber:eigen[0]!>0?eigen.at(-1)!/eigen[0]!:null,activeConstraints:['Rotación máxima 0 %']},warnings:['La rotación de 0 % obliga a conservar exactamente los pesos actuales.']};
 }
 const min=quadratic(x,1,0),minimumVariance=evaluatePortfolio(x,min.weights),current=evaluatePortfolio(x,x.currentWeights),equal=evaluatePortfolio(x,Array(n).fill(1/n));
 if(present(x.maxVolatility)&&minimumVariance.vol>x.maxVolatility+1e-7)throw new Error('Volatilidad máxima inviable: la mínima compatible con los demás límites es '+minimumVariance.vol.toFixed(4)+' % anual.');
 const at=(target:number)=>quadratic(x,1,0,0,target);
 // Find the feasible return endpoint using target-return QPs. This avoids
 // pretending a tiny-ridge quadratic objective is an exact linear program.
 let upper=Math.max(...x.means);
 try{at(upper);}catch(error){
  if(!(error instanceof InfeasibleConstraints))throw error;
  let a=minimumVariance.mean,b=upper;
  for(let k=0;k<45&&b-a>1e-8;k++){const mid=(a+b)/2;try{at(mid);a=mid;}catch(error){if(!(error instanceof InfeasibleConstraints))throw error;b=mid;}}
  upper=a;
 }
 upper=Math.max(minimumVariance.mean,upper-1e-8);
 let ceiling=upper;
 if(present(x.maxVolatility)&&evaluatePortfolio(x,at(upper).weights).vol>x.maxVolatility+1e-8){let a=minimumVariance.mean,b=upper;for(let k=0;k<45;k++){const m=(a+b)/2;if(evaluatePortfolio(x,at(m).weights).vol<=x.maxVolatility)a=m;else b=m;}ceiling=a;}
 const frontier:Array<OptimizerPoint>=[];
 for(let k=0;k<frontierCount;k++){const target=minimumVariance.mean+(ceiling-minimumVariance.mean)*k/(frontierCount-1);const p=evaluatePortfolio(x,at(target).weights);if(!frontier.length||p.mean>frontier.at(-1)!.mean+1e-8)frontier.push(p);}
 let solution=min;
 const penalty=x.concentrationPenalty!/100;
 if(penalty&&['maxSharpe','equal','inverseVolatility','riskParity','targetRisk'].includes(x.method))throw new Error('La penalización de concentración se admite en mínima varianza, rentabilidad mínima y media-varianza. Desactívala para este método.');
 if(x.method==='maxSharpe'){
  if(ceiling<=x.riskFree+1e-8)throw new Error('No hay rentabilidad esperada superior a la referencia dentro de estos límites. Usa otro objetivo o revisa las hipótesis; no se atribuye un máximo Sharpe positivo inexistente.');
  // For positive excess return, the optimum lies on the minimum-variance
  // frontier. The ratio is quasiconcave there; deterministic golden search.
  let a=Math.max(minimumVariance.mean,x.riskFree+1e-8),b=ceiling;
  const ratio=(r:number)=>{const s=at(r),p=evaluatePortfolio(x,s.weights);if(p.vol<1e-10)throw new Error('Existe exceso de rentabilidad con volatilidad nula: Sharpe no está definido. Revisa los datos.');return {s,score:p.sharpe!};};
  const g=(Math.sqrt(5)-1)/2;let c=b-g*(b-a),d=a+g*(b-a),fc=ratio(c),fd=ratio(d);
  for(let k=0;k<50&&b-a>1e-9;k++){if(fc.score>fd.score){b=d;d=c;fd=fc;c=b-g*(b-a);fc=ratio(c);}else{a=c;c=d;fc=fd;d=a+g*(b-a);fd=ratio(d);}}
  solution=[ratio(Math.max(minimumVariance.mean,x.riskFree+1e-8)),ratio(ceiling),fc,fd].sort((u,v)=>v.score-u.score)[0]!.s;
 }else if(x.method==='targetRisk')solution=at(ceiling);
 else if(['minVariance','targetReturn','utility'].includes(x.method)){
  const v=x.method==='utility'?x.riskAversion!:1,r=x.method==='utility'?1:0;
  solution=quadratic(x,v,r,penalty);
  if(present(x.maxVolatility)&&evaluatePortfolio(x,solution.weights).vol>x.maxVolatility+1e-8){
   let lo=0,hi=1;for(let k=0;k<60&&evaluatePortfolio(x,quadratic(x,v+hi,r,penalty).weights).vol>x.maxVolatility+1e-8;k++)hi*=2;
   for(let k=0;k<50;k++){const mid=(lo+hi)/2;if(evaluatePortfolio(x,quadratic(x,v+mid,r,penalty).weights).vol>x.maxVolatility)lo=mid;else hi=mid;}
   solution=quadratic(x,v+hi,r,penalty);
  }
 }else{
  let weights=Array(n).fill(1/n),iterations=0;
  if(x.method==='inverseVolatility'){if(x.cov.some((row,i)=>row[i]!<=0))throw new Error('La inversa de volatilidad requiere volatilidades positivas.');const inv=x.cov.map((row,i)=>1/Math.sqrt(row[i]!));weights=inv.map(v=>v/sum(inv));}
  if(x.method==='riskParity'){
   if(spectrum(x.cov)[0]!<=1e-12)throw new Error('La contribución igual al riesgo requiere una covarianza definida positiva; elige contracción o revisa activos redundantes.');
   let z=x.cov.map((r,i)=>1/Math.sqrt(n*r[i]!));
   for(iterations=0;iterations<10000;iterations++){
    for(let i=0;i<n;i++){const a=x.cov[i]![i]!,b=dot(x.cov[i]!,z)-a*z[i]!,disc=Math.sqrt(b*b+4*a/n);z[i]=b>=0?(2/n)/(disc+b):(disc-b)/(2*a);}
    weights=z.map(v=>v/sum(z));if(Math.max(...evaluatePortfolio(x,weights).riskShares.map(v=>Math.abs(v-1/n)))<1e-8)break;
   }
   if(iterations===10000)throw new Error('La paridad de riesgo no ha convergido.');
  }
  const violations=constraintViolations(x,weights).filter(v=>v.residual>TOL);
  if(violations.length)throw new Error('Este reparto incumple: '+violations.map(v=>v.name).join(', ')+'. Se conserva su definición; utiliza Markowitz para imponer esos límites.');
  solution={weights,diagnostics:{...min.diagnostics,solver:x.method==='riskParity'?'Descenso cíclico de coordenadas · presupuesto de riesgo':'Fórmula directa',iterations,stationarityResidual:0,complementarityResidual:0,ridge:0,activeConstraints:[],primalResidual:Math.max(0,...constraintViolations(x,weights).map(v=>v.residual))}};
 }
 const point=evaluatePortfolio(x,solution.weights),violations=constraintViolations(x,point.weights).filter(v=>v.residual>TOL);
 if(violations.length)throw new Error('Resultado rechazado por incumplimiento de '+violations.map(v=>v.name).join(', '));
 if(solution.diagnostics.ridge>0)warnings.push('Regularización numérica diagonal: '+solution.diagnostics.ridge.toExponential(3)+' puntos porcentuales². Las métricas se evalúan con la covarianza original.');
 if(solution.diagnostics.conditionNumber===null||solution.diagnostics.conditionNumber>1e8)warnings.push('Covarianza singular o mal condicionada: los pesos pueden ser sensibles a pequeñas variaciones.');
 if(x.basis==='history')warnings.push('Estimación dentro de muestra con composición actual; no es un backtest walk-forward ni una predicción.');
 if(constraintViolations(x,equal.weights).some(v=>v.residual>TOL))warnings.push('La referencia equiponderada incumple algún límite y solo se muestra como comparación.');
 if(penalty)warnings.push('La penalización de concentración modifica el objetivo; el resultado no es la mínima varianza sin penalización.');
 return {point,minimumVariance,current,equal,frontier,diagnostics:solution.diagnostics,warnings};
}

export function estimateHistory(data:HistoricalData,options:{method:CovarianceMethod;window?:number|null;shrinkage?:number|null;decay?:number|null;threshold?:number|null;meanShrinkage?:number|null;overrides?:Array<number|null>}){
 const d=validateHistory(data),window=options.window??d.rows.length;
 if(!Number.isInteger(window)||window<24||window>d.rows.length)throw new Error('La ventana debe tener entre 24 meses y los meses disponibles.');
 const selected=d.rows.slice(-window),rows=selected.map(r=>r.returns),n=d.columns.length,t=rows.length;
 const means=Array.from({length:n},(_,j)=>sum(rows.map(r=>r[j]!))/t),sample=historicalCovariance(rows,'sample');
 const alpha=options.shrinkage??.25,decay=options.decay??.94,threshold=options.threshold??.5,meanShrinkage=options.meanShrinkage??0;
 if(!bound(alpha,0,1)||!bound(decay,.01,.9999)||!bound(threshold,.01,2)||!bound(meanShrinkage,0,1))throw new Error('Parámetros del estimador fuera de rango.');
 let cov=sample,usedShrinkage:number|null=null;
 if(options.method==='shrinkage'){cov=sample.map((r,i)=>r.map((v,j)=>i===j?v:(1-alpha)*v));usedShrinkage=alpha;}
 else if(options.method==='gerber')cov=historicalCovariance(rows,'gerber',threshold);
 else if(options.method==='ewma'){
  const q=rows.map((_,i)=>decay**(t-1-i)),weights=q.map(v=>v/sum(q)),mu=Array.from({length:n},(_,j)=>sum(rows.map((r,i)=>weights[i]!*r[j]!))),den=1-dot(weights,weights);
  cov=matrix(n,(i,j)=>sum(rows.map((r,k)=>weights[k]!*(r[i]!-mu[i]!)*(r[j]!-mu[j]!)))/den);
 }else if(options.method==='ledoitWolf'){
  // Ledoit-Wolf linear shrinkage toward trace(S)/N * I; MLE S uses 1/T.
  const centered=rows.map(r=>r.map((v,j)=>v-means[j]!)),S=sample.map(r=>r.map(v=>v*(t-1)/t)),mu=sum(S.map((r,i)=>r[i]!))/n;
  const delta=sum(S.flatMap((r,i)=>r.map((v,j)=>(v-(i===j?mu:0))**2)))/n;
  const beta=(sum(centered.map(r=>dot(r,r)**2))/t-sum(S.flatMap(r=>r.map(v=>v*v))))/(n*t);
  usedShrinkage=delta>0?Math.max(0,Math.min(1,beta/delta)):0;
  cov=S.map((r,i)=>r.map((v,j)=>(1-usedShrinkage!)*v+(i===j?usedShrinkage!*mu:0)));
 }else if(options.method!=='sample')throw new Error('Estimador desconocido.');
 if(options.overrides&&(options.overrides.length!==n||options.overrides.some(v=>v!==null&&!bound(v,-1200,12000))))throw new Error('Expectativas manuales no válidas.');
 const overall=sum(means)/n;
 return {means:means.map((v,i)=>options.overrides?.[i]??((1-meanShrinkage)*v+meanShrinkage*overall)*1200),cov:cov.map(r=>r.map(v=>v*120000)),dataStart:selected[0]!.month,dataEnd:selected.at(-1)!.month,observations:t,shrinkage:usedShrinkage,estimator:options.method+(usedShrinkage!==null?' · contracción '+(usedShrinkage*100).toFixed(2)+' %':'')+(options.method==='ewma'?' · λ '+decay:'')+(options.method==='gerber'?' · umbral '+threshold:'')+' · media contraída '+(meanShrinkage*100).toFixed(2)+' %',quality:{observations:t,assets:n,observationsPerAsset:t/n,constantAssets:sample.flatMap((r,i)=>r[i]!<=1e-18?[d.columns[i]!]:[])}};
}

/** Revalidate saved inputs, metrics and feasibility, without rerunning a current
 * market download or changing a historical result on reopening. */
export function validateOptimizationStudy(raw:OptimizationStudy):OptimizationStudy{
 if(!raw||raw.version!==OPTIMIZER_VERSION||!Number.isSafeInteger(raw.createdAt)||raw.createdAt<0||JSON.stringify(raw).length>250000)throw new Error('Estudio de optimización no válido.');
 if(raw.unfundedObjective!==undefined&&typeof raw.unfundedObjective!=='boolean')throw new Error('Situación de financiación no válida.');
 if(raw.capital!==undefined&&!bound(raw.capital,0,1e14))throw new Error('Capital del estudio no válido.');
 const input=validateOptimizerInput(raw.input),r=raw.result;
 if(!r||!Array.isArray(r.frontier)||r.frontier.length>61||!Array.isArray(r.warnings)||r.warnings.length>20||r.warnings.some(v=>typeof v!=='string'||v.length>1000))throw new Error('Resultados del estudio no válidos.');
 const point=(p:OptimizerPoint)=>{if(!p||!Array.isArray(p.weights)||p.weights.length!==input.ids.length||p.weights.some(v=>!finite(v)||v< -TOL||v>1+TOL)||Math.abs(sum(p.weights)-1)>TOL)throw new Error('Pesos guardados no válidos.');const actual=evaluatePortfolio(input,p.weights);for(const k of ['mean','vol','turnover','effectivePositions'] as const)if(!finite(p[k])||Math.abs(p[k]-actual[k])>1e-6)throw new Error('Las métricas guardadas no coinciden con sus entradas.');if(p.sharpe!==null&&(!finite(p.sharpe)||actual.sharpe===null||Math.abs(p.sharpe-actual.sharpe)>1e-6)||p.sharpe===null&&actual.sharpe!==null)throw new Error('Sharpe guardado incoherente.');return actual;};
 const chosen=point(r.point);if(constraintViolations(input,chosen.weights).some(v=>v.residual>TOL))throw new Error('El estudio guardado incumple sus restricciones.');
 const frontier=r.frontier.map(point),minimumVariance=point(r.minimumVariance),current=point(r.current),equal=point(r.equal);
 if(!frontier.length||[minimumVariance,...frontier].some(p=>constraintViolations(input,p.weights).some(v=>v.residual>TOL))||frontier.some((p,i)=>i>0&&(p.mean<frontier[i-1]!.mean-1e-6||p.vol<frontier[i-1]!.vol-1e-6)))throw new Error('La frontera guardada no respeta las restricciones o su orden.');
 if(current.weights.some((w,i)=>Math.abs(w-input.currentWeights[i]!)>TOL)||equal.weights.some(w=>Math.abs(w-1/input.ids.length)>TOL))throw new Error('Referencias del estudio incoherentes.');
 const d=r.diagnostics;if(!d||typeof d.solver!=='string'||d.solver.length>180||!Array.isArray(d.activeConstraints)||d.activeConstraints.length>160||d.activeConstraints.some(v=>typeof v!=='string'||v.length>220)||['iterations','primalResidual','stationarityResidual','complementarityResidual','ridge','minEigenvalue'].some(k=>!finite(d[k as keyof SolverDiagnostics]))||d.conditionNumber!==null&&!bound(d.conditionNumber,0,1e30)||d.primalResidual>TOL||d.stationarityResidual>1e-5||d.complementarityResidual>1e-5)throw new Error('Diagnósticos guardados no válidos.');
 if(!Number.isInteger(d.iterations)||d.iterations<0||[d.primalResidual,d.stationarityResidual,d.complementarityResidual,d.ridge].some(v=>v<0))throw new Error('Diagnósticos guardados no válidos.');
 return {version:OPTIMIZER_VERSION,createdAt:raw.createdAt,...(raw.capital!==undefined?{capital:raw.capital}:{}),...(raw.unfundedObjective?{unfundedObjective:true}:{}),input,result:{point:chosen,minimumVariance,current,equal,frontier,diagnostics:{solver:d.solver,iterations:d.iterations,primalResidual:d.primalResidual,stationarityResidual:d.stationarityResidual,complementarityResidual:d.complementarityResidual,ridge:d.ridge,minEigenvalue:d.minEigenvalue,conditionNumber:d.conditionNumber,activeConstraints:[...d.activeConstraints]},warnings:[...r.warnings]}};
}

/** Visual sample v1: deterministic, not a probability forecast or an optimizer.
 * Preserve every generated point, including infeasible portfolios. Recreated
 * from the saved study so cloud workspaces do not store thousands of weights. */
export function simulatePortfolioCloud(raw:OptimizerInput,anchors:OptimizerPoint[],count=1500){
 const x=validateOptimizerInput(raw),n=x.ids.length;
 if(!Number.isInteger(count)||count<1||count>5000)throw new Error('La simulación admite entre 1 y 5000 repartos.');
 let seed=20261114;
 const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return (seed+.5)/4294967296;};
 const feasible=anchors.filter(p=>p.weights.length===n&&p.weights.every(Number.isFinite)&&!constraintViolations(x,p.weights).some(v=>v.residual>TOL));
 const points:Array<OptimizerPoint&{admissible:boolean;sample:number}>=[];
 for(let k=0;k<count;k++){
  let w:number[];
  if(k<n)w=x.ids.map((_,i)=>i===k?1:0);
  else if(k%3===0&&feasible.length){
   const a=feasible[Math.floor(random()*feasible.length)]!,b=feasible[Math.floor(random()*feasible.length)]!,t=random();
   w=a.weights.map((v,i)=>v*t+b.weights[i]!*(1-t));
  }else{
   const exponent=k%2?1:3,values=x.ids.map(()=>Math.pow(-Math.log(random()),exponent)),total=sum(values);
   w=values.map(v=>v/total);
  }
  const p=evaluatePortfolio(x,w);
  points.push({...p,admissible:!constraintViolations(x,w).some(v=>v.residual>TOL),sample:k+1});
 }
 const admissible=points.filter(p=>p.admissible),excluded=points.filter(p=>!p.admissible);
 const bestSharpe=admissible.filter(p=>p.sharpe!==null).reduce<(typeof points)[number]|null>((best,p)=>!best||p.sharpe!>best.sharpe!?p:best,null);
 return {points,admissible,excluded,bestSharpe};
}
