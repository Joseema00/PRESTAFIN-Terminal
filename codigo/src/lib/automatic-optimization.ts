import {estimateHistory,type AutomaticEstimationAudit} from './optimization';
import {validateHistory,type HistoricalData} from './professional-analysis';
const average=(a:number[])=>a.reduce((s,v)=>s+v,0)/a.length;
const shrink=(values:number[])=>{const m=average(values);return values.map(v=>.5*v+.5*m);};
const alphas=[.1,1,10,100];
function features(values:number[],end:number){const tail=values.slice(end-6,end),mean=average(tail);return [values[end-1]!,values[end-2]!,average(values.slice(end-3,end)),mean,Math.sqrt(average(tail.map(v=>(v-mean)**2)))];}
/** Ridge with an unpenalized intercept; scales are fitted on training rows only. */
function predict(values:number[],end:number,alpha:number){
 const xs=Array.from({length:end-6},(_,i)=>features(values,i+6)),ys=values.slice(6,end),p=5,center=Array.from({length:p},(_,j)=>average(xs.map(x=>x[j]!))),scale=center.map((m,j)=>Math.sqrt(average(xs.map(x=>(x[j]!-m)**2)))||1),ym=average(ys);
 const z=xs.map(x=>x.map((v,j)=>(v-center[j]!)/scale[j]!));
 const matrix=Array.from({length:p},(_,i)=>[...Array.from({length:p},(_,j)=>z.reduce((s,x)=>s+x[i]!*x[j]!,0)+(i===j?alpha:0)),z.reduce((s,x,k)=>s+x[i]!*(ys[k]!-ym),0)]);
 for(let i=0;i<p;i++){let pivot=i;for(let k=i+1;k<p;k++)if(Math.abs(matrix[k]![i]!)>Math.abs(matrix[pivot]![i]!))pivot=k;[matrix[i],matrix[pivot]]=[matrix[pivot]!,matrix[i]!];const d=matrix[i]![i]!;for(let j=i;j<=p;j++)matrix[i]![j]!/=d;for(let k=0;k<p;k++)if(k!==i){const f=matrix[k]![i]!;for(let j=i;j<=p;j++)matrix[k]![j]!-=f*matrix[i]![j]!;}}
 const next=features(values,end),raw=ym+next.reduce((s,v,j)=>s+(v-center[j]!)/scale[j]!*matrix[j]![p]!,0),base=average(values.slice(0,end));
 // Training-range clipping and 50% shrinkage are part of the validated predictor.
 const low=Math.min(...values.slice(0,end)),high=Math.max(...values.slice(0,end));
 return .5*base+.5*Math.min(high,Math.max(low,raw));
}
export function ridgeWalkForward(raw:HistoricalData){
 const h=validateHistory(raw),rows=h.rows.slice(-120),n=rows.length,columns=h.columns.length;
 const audit:AutomaticEstimationAudit={version:'PRESTAFIN-AUTO-1',method:'baseline',reason:'Menos de 72 meses comunes: se utiliza Ledoit-Wolf y media histórica contraída.',trainingMonths:n,validationMonths:0,baselineMse:null,ridgeMse:null,improvement:null,alpha:null};
 if(n<72)return {audit,predictions:null,trace:[] as {month:string;trainingEnd:string;predictions:number[];baseline:number[]}[]};
 const series=h.columns.map((_,j)=>rows.map(r=>r.returns[j]!)),start=n-24,tuneStart=Math.max(36,start-12);
 const scores=alphas.map(alpha=>{let error=0;for(let t=tuneStart;t<start;t++){const predicted=shrink(series.map(v=>predict(v,t,alpha)));for(let j=0;j<columns;j++)error+=(predicted[j]!-series[j]![t]!)**2;}return {alpha,error};});
 const alpha=scores.sort((a,b)=>a.error-b.error||b.alpha-a.alpha)[0]!.alpha;
 let baselineMse=0,ridgeMse=0;const trace=[];
 for(let t=start;t<n;t++){const predictions=shrink(series.map(v=>predict(v,t,alpha))),baseline=shrink(series.map(v=>average(v.slice(0,t))));for(let j=0;j<columns;j++){ridgeMse+=(predictions[j]!-rows[t]!.returns[j]!)**2;baselineMse+=(baseline[j]!-rows[t]!.returns[j]!)**2;}trace.push({month:rows[t]!.month,trainingEnd:rows[t-1]!.month,predictions,baseline});}
 baselineMse/=24*columns;ridgeMse/=24*columns;const improvement=baselineMse>1e-20?1-ridgeMse/baselineMse:0,accepted=improvement>=.05;
 return {audit:{...audit,method:accepted?'ridge':'baseline',reason:accepted?'Ridge contraído supera la media histórica en error mensual fuera de muestra; no garantiza mejora de inversión.':'Ridge no supera el umbral de mejora del 5 % frente a la media histórica; se conserva la referencia.',trainingMonths:n,validationMonths:24,baselineMse,ridgeMse,improvement,alpha} as AutomaticEstimationAudit,predictions:accepted?shrink(series.map(v=>predict(v,n,alpha))):null,trace};
}
export function estimateAutomaticHistory(raw:HistoricalData){
 const history=validateHistory(raw),selected={...history,rows:history.rows.slice(-120)};
 const base=estimateHistory(selected,{method:'ledoitWolf',meanShrinkage:.5}),evaluation=ridgeWalkForward(selected);
 // Annualized monthly expectations, not a twelve-month forecast. Cross-asset
 // shrinkage is fixed in advance and disclosed alongside the validation audit.
 const forecast=evaluation.predictions;
 return {...base,means:forecast?forecast.map(v=>v*1200):base.means,estimator:forecast?'Ledoit-Wolf · Ridge temporal contraído':'Ledoit-Wolf · media histórica contraída 50 %',automatic:evaluation.audit};
}
