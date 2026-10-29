import { validateAllocationAudit, allocateCents, optimizeAllocation, GOAL_LABELS, ROLE_MODEL, type AllocationAudit } from './allocation-engine';
import { productById,validateProposalSettings,type ProposalSettings,type ProductRole } from './investment-products';
export type ProposalPosition={assetId:string;name:string;isin:string;role:ProductRole;weight:number;amount:number;monthly:number;fee:number;source:string};
export type PortfolioProposal={version:3;optimization?:AllocationAudit;catalogDate:string;kind:'investment'|'objective'|'planning';interviewId?:string;revision?:number;settings:ProposalSettings;amount:number;available:number;fundedToday:number;reserve:number;reserveGap:number;fundingGap:number;monthly:number;equity:number;stressLoss:number;feePct:number;feeAnnual:number;reasons:string[];conditions:string[];positions:ProposalPosition[]};
/** Canonical snapshot retained in backups. No arbitrary properties or executable URLs. */
export function validatePortfolioProposal(value:unknown):PortfolioProposal{
 const v=value as PortfolioProposal;
 const finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!v||v.version!==3||!['investment','objective','planning'].includes(v.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(v.catalogDate)||!['amount','available','fundedToday','reserve','reserveGap','fundingGap','monthly','stressLoss','feeAnnual'].every(k=>finite(v[k as keyof PortfolioProposal]))||!finite(v.equity,100)||!finite(v.feePct,100))throw new Error('Resumen de cartera no válido');
 if(v.interviewId!==undefined&&(typeof v.interviewId!=='string'||!v.interviewId||v.interviewId.length>160))throw new Error('Origen de propuesta no válido');
 if(v.revision!==undefined&&(!Number.isSafeInteger(v.revision)||v.revision<0))throw new Error('Revisión de propuesta no válida');
 const strings=(items:unknown)=>{if(!Array.isArray(items)||items.length>40||items.some(s=>typeof s!=='string'||s.length>2000))throw new Error('Explicación de cartera no válida');return [...items] as string[];};
 if(!Array.isArray(v.positions)||v.positions.length>10)throw new Error('Composición de propuesta no válida');
 const positions=v.positions.map(p=>{
  const product=productById(p.assetId);
  if(!product||p.isin!==product.isin||p.role!==product.role||typeof p.name!=='string'||p.name.length>180||!finite(p.weight,100)||!finite(p.amount)||!finite(p.monthly)||!finite(p.fee,100)||typeof p.source!=='string'||!/^https:\/\//.test(p.source)||p.source.length>1000)throw new Error('Producto de propuesta no válido');
  return {assetId:p.assetId,name:p.name,isin:p.isin,role:p.role,weight:p.weight,amount:p.amount,monthly:p.monthly,fee:p.fee,source:p.source};
 });
 if(new Set(positions.map(p=>p.assetId)).size!==positions.length)throw new Error('Producto de propuesta duplicado');
 if(v.kind!=='planning'&&(!positions.length||Math.abs(positions.reduce((s,p)=>s+p.amount,0)-v.amount)>.011||Math.abs(positions.reduce((s,p)=>s+p.weight,0)-100)>.02||positions.some(p=>Math.abs(p.weight-p.amount/v.amount*100)>.001)||Math.abs(positions.reduce((s,p)=>s+p.monthly,0)-v.monthly)>.011))throw new Error('La composición no cuadra con el capital');
 if(v.kind==='planning'&&positions.length||v.kind!=='investment'&&v.fundedToday!==0||v.kind==='investment'&&(Math.abs(v.fundedToday-v.amount)>.011||v.fundedToday>v.available+.011))throw new Error('Capital financiable de propuesta no válido');
 const measuredEquity=positions.filter(p=>p.role==='equity').reduce((s,p)=>s+p.weight,0);const measuredStress=Math.round(positions.reduce((s,p)=>s+p.amount*ROLE_MODEL[p.role].shock/100,0)*100)/100;
 if(Math.abs(v.equity-measuredEquity)>.001||Math.abs(v.stressLoss-measuredStress)>.011)throw new Error('Riesgo de propuesta incoherente');
 const weightedFee=positions.reduce((s,p)=>s+p.weight*p.fee/100,0);
 if(Math.abs(v.feePct-weightedFee)>.00001||Math.abs(v.feeAnnual-v.amount*v.feePct/100)>.011)throw new Error('Costes de propuesta incoherentes');
 const optimization=v.optimization===undefined?undefined:validateAllocationAudit(v.optimization);
 if(optimization&&(optimization.ids.some((id,i)=>productById(id)?.role!==optimization.roles[i])||positions.some(p=>!optimization.ids.includes(p.assetId))||v.equity>optimization.equityCap+.02||v.stressLoss>v.amount*optimization.lossLimit/100+.02))throw new Error('La propuesta supera los límites de su optimización');
 return {version:3,...(optimization?{optimization}:{}),catalogDate:v.catalogDate,kind:v.kind,...(v.interviewId?{interviewId:v.interviewId}:{}),...(v.revision!==undefined?{revision:v.revision}:{}),settings:validateProposalSettings(v.settings),amount:v.amount,available:v.available,fundedToday:v.fundedToday,reserve:v.reserve,reserveGap:v.reserveGap,fundingGap:v.fundingGap,monthly:v.monthly,equity:v.equity,stressLoss:v.stressLoss,feePct:v.feePct,feeAnnual:v.feeAnnual,reasons:strings(v.reasons),conditions:strings(v.conditions),positions};
}
export function assertProposalHoldings(p:PortfolioProposal,holdings:{assetId:string;amount:number}[]):void{
 const expected=p.kind==='planning'?[{assetId:'interview-cash-pending',amount:p.amount}]:p.positions;
 if(holdings.length!==expected.length||new Set(holdings.map(h=>h.assetId)).size!==holdings.length||expected.some(e=>!holdings.some(h=>h.assetId===e.assetId&&Math.abs(h.amount-e.amount)<.001)))throw new Error('Las posiciones no coinciden con la propuesta guardada');
}
export function optimizeProposal(original:PortfolioProposal,input:AllocationAudit):PortfolioProposal{
 const audit=validateAllocationAudit(input);
 const limits=original.optimization;
 if(limits&&(audit.equityCap>limits.equityCap||audit.lossLimit>limits.lossLimit||audit.ids.some(id=>!limits.ids.includes(id))))throw new Error('La optimización no puede ampliar los límites de la entrevista');
 if(!limits&&(audit.equityCap>original.equity+.01||audit.lossLimit>original.stressLoss/original.amount*100+.01||audit.ids.some(id=>!original.positions.some(p=>p.assetId===id))))throw new Error('Conserva los límites de la propuesta anterior');
 const result=optimizeAllocation(audit);if(!result.best)throw new Error('No hay una solución admisible');
 const split=(total:number)=>{const cents=Math.round(total*100),values=result.best!.weights.map(w=>Math.floor(cents*w));let rest=cents-values.reduce((s,v)=>s+v,0);const order=result.best!.weights.map((w,i)=>({i,r:cents*w-values[i]!})).sort((a,b)=>b.r-a.r);for(const x of order){if(rest--<=0)break;values[x.i]=values[x.i]!+1;}return values.map(v=>v/100);};
 const amounts=allocateCents(original.amount,result.best.weights,audit.roles,audit.equityCap,audit.lossLimit),monthly=allocateCents(original.monthly,amounts.map(v=>v/original.amount),audit.roles);
 const positions=audit.ids.map((id,i)=>{const p=productById(id);if(!p||p.role!==audit.roles[i])throw new Error('Producto fuera del universo');return {assetId:id,name:p.name,isin:p.isin,role:p.role,weight:amounts[i]!/original.amount*100,amount:amounts[i]!,monthly:monthly[i]!,fee:p.fee,source:p.source};}).filter(p=>p.amount>0);
 const feePct=positions.reduce((s,p)=>s+p.weight*p.fee/100,0);
 return validatePortfolioProposal({...original,optimization:{...audit,candidateCount:result.candidates.length},positions,equity:positions.filter(p=>p.role==='equity').reduce((s,p)=>s+p.weight,0),stressLoss:Math.round(positions.reduce((s,p)=>s+p.amount*ROLE_MODEL[p.role].shock/100,0)*100)/100,feePct,feeAnnual:Math.round(original.amount*feePct)/100,reasons:[...original.reasons.filter(s=>!s.startsWith('Objetivo:')&&!s.startsWith('Parte de empresas resultante:')),`Objetivo: ${GOAL_LABELS[audit.goal]}. ${result.candidates.length} repartos admisibles. Base: ${audit.basis==='history'?'medias y covarianzas históricas hasta '+audit.dataEnd:'hipótesis de planificación'}. No predice el resultado futuro.`].slice(-40)});
}
export function proposalText(p:PortfolioProposal):string{
 const eur=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 return [p.kind==='objective'?'CARTERA OBJETIVO · SIMULACIÓN CONDICIONADA':p.kind==='investment'?'PROPUESTA DE INVERSIÓN · SIN OPERACIONES EJECUTADAS':'PLAN DE PROTECCIÓN Y REVISIÓN',
 `Capital de referencia: ${eur(p.amount)}. Capital asignable hoy: ${eur(p.fundedToday)}. Reserva aparte: ${eur(p.reserve)}.`,
 `Falta para completar la reserva: ${eur(p.reserveGap)}. Falta para financiar todo el objetivo y las reservas: ${eur(p.fundingGap)}.`,
 ...p.positions.map(x=>`${x.name} · ${x.isin} · ${x.weight.toFixed(2)} % · ${eur(x.amount)} · coste corriente ${x.fee.toFixed(2)} % anual.`),
 ...p.reasons,...p.conditions,
 ...(p.positions.length?[`Coste corriente ponderado: ${p.feePct.toFixed(3)} % / ${eur(p.feeAnnual)} al año sobre capital constante. No incluye intermediación, spreads, transacciones, asesoramiento ni impuestos.`,
 `Pérdida del escenario ilustrativo: ${eur(p.stressLoss)}. No es una previsión ni un límite de pérdida.`]:[]),
 `Fuentes del emisor consultadas el ${p.catalogDate}.`,...p.positions.map(x=>x.isin+': '+x.source)].join('\n');
}
