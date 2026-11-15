import {validateModelSource,type InterviewModelSource} from './interview-model';
import {buildClientPlan,clientRiskDrivers,type PlanningContext} from './client-plan';
import {FUND_MODELS,modelStats,modelCompatibility,applyFundModel,type FundModel} from './fund-models';
import {type InterviewPlan} from './interview-plan';
import {allocationPoint,modelCovariance,ROLE_MODEL,inferGoal} from './allocation-engine';
import {productById,type ProposalSettings} from './investment-products';
import type {Answers} from './risk-profile';
export type AccountModel=FundModel&{source?:InterviewModelSource;revision:number;createdAt:number;updatedAt:number};
export const ACCOUNT_DEFAULT_MODELS:FundModel[]=[{id:'fund-money-100',name:'Monetario EUR 100',description:'Fondo monetario de corto plazo. No es un depósito ni garantiza el capital.',minYears:0,allocation:[{assetId:'fund-amundi-money',pct:100}]},...FUND_MODELS];
export function validateAccountModels(value:unknown):AccountModel[]{
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>100)throw new Error('La biblioteca admite hasta 100 modelos propios.');
  const ids=new Set<string>();
  return value.map(raw=>{
    const m=raw as AccountModel;
    if(!m||typeof m.id!=='string'||!/^user-model-[a-z0-9-]{1,100}$/.test(m.id)||ids.has(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>120||typeof m.description!=='string'||m.description.length>2000||!Number.isFinite(m.minYears)||m.minYears<0||m.minYears>100||!Number.isSafeInteger(m.revision)||m.revision<1||![m.createdAt,m.updatedAt].every(n=>Number.isSafeInteger(n)&&n>=0)||!Array.isArray(m.allocation)||!m.allocation.length||m.allocation.length>10)throw new Error('Indica nombre, plazo y una composición válida para el modelo.');
    ids.add(m.id);const seen=new Set<string>();
    const allocation=m.allocation.map(x=>{const p=productById(x.assetId);if(!p||p.vehicle!=='Fondo'||seen.has(x.assetId)||!Number.isFinite(x.pct)||x.pct<=0||x.pct>100)throw new Error('Selecciona fondos estudiados, sin duplicados, con pesos positivos.');seen.add(x.assetId);return {assetId:x.assetId,pct:x.pct};});
    const source=m.source===undefined?undefined:validateModelSource(m.source);
    if(source&&(allocation.length!==source.proposal.positions.length||allocation.some(x=>{const p=source.proposal.positions.find(p=>p.assetId===x.assetId);return !p||Math.abs(p.weight-x.pct)>1e-7;})))throw new Error('El reparto editado debe guardarse como modelo manual');
    const model={...(source?{source}:{}),id:m.id,name:m.name.trim(),description:m.description,minYears:m.minYears,allocation,revision:m.revision,createdAt:m.createdAt,updatedAt:m.updatedAt};modelStats(model);return model;
  });
}
export const accountModels=(own:AccountModel[]=[])=>[...ACCOUNT_DEFAULT_MODELS,...own];
export function rankAccountModels(answers:Answers,models:FundModel[],settings?:ProposalSettings,context?:PlanningContext){
  const options:ProposalSettings={variant:'base',excluded:[],fundAccessConfirmed:false,...settings,priority:'funds',fundAccessMode:'study',allowEtfFallback:false};
  const plan=context?buildClientPlan(answers,options,context,'mandate'):buildClientPlan(answers,options,{id:'unlinked-study',name:'Estudio',cash:Number(answers.savings??0),investments:0,otherAssets:0,debt:0},'mandate');
  const target=clientRiskDrivers(answers,options).cap;
  const horizon=({short:0,medium:3,long:5,verylong:10} as Record<string,number>)[String(answers.horizon)],goal=inferGoal(answers);
  const rows=models.map(model=>{
    const stats=modelStats(model),fit=modelCompatibility(model,plan.proposal,horizon),roles=model.allocation.map(x=>productById(x.assetId)!.role);
    const point=allocationPoint({roles,means:model.allocation.map(x=>ROLE_MODEL[productById(x.assetId)!.role].mean-productById(x.assetId)!.fee),cov:modelCovariance(roles),riskFree:plan.proposal?.optimization?.riskFree??2.2},model.allocation.map(x=>x.pct/100));
    const score=-Math.abs(stats.equity-target); // Match the interview allocation, never minimum variance or Sharpe.
    return {model,stats,fit,point,score};
  }).sort((a,b)=>Number(b.fit.compatible)-Number(a.fit.compatible)||b.score-a.score||a.stats.cash-b.stats.cash||a.stats.fee-b.stats.fee||a.model.id.localeCompare(b.model.id));
  return {plan,goal,rows,best:plan.canCreate&&plan.kind!=='planning'?rows.find(x=>x.fit.compatible):undefined};
}
export function buildModelPlan(answers:Answers,models:FundModel[],settings?:ProposalSettings,context?:PlanningContext):InterviewPlan{
  const result=rankAccountModels(answers,models,settings,context),base=result.plan;
  if(!base.proposal||base.kind==='planning')return base;
  if(!result.best){const {proposal:unused,...unassigned}=base;return {...unassigned,canCreate:false,title:'No hay un modelo compatible',description:'Ningún modelo de tu biblioteca cumple el plazo, el reparto, las exclusiones y la pérdida aceptada. Revisa los motivos de incompatibilidad o añade un modelo adecuado.',holdings:[]};}
  const model=result.best.model,proposal=applyFundModel(model,base.proposal,({short:0,medium:3,long:5,verylong:10} as Record<string,number>)[String(answers.horizon)]);
  proposal.modelAssignment={id:model.id,name:model.name,revision:('revision' in model?Number(model.revision):1),method:'automatic'};
  proposal.reasons=proposal.reasons.filter(s=>!s.startsWith('Modelo elegido por el asesor:'));proposal.conditions=proposal.conditions.filter(s=>!s.startsWith('Clase propuesta para estudio:'));
  const target=clientRiskDrivers(answers,proposal.settings).cap,stats=modelStats(model);
  proposal.reasons=proposal.reasons.filter(s=>!s.startsWith('Tu límite previo'));
  proposal.reasons.push('Reparto de referencia según las respuestas: '+target+' % renta variable y '+(100-target)+' % parte defensiva (renta fija o monetario según plazo y pérdidas). Modelo compatible más próximo: '+model.name+' ('+stats.equity+' % RV, '+stats.bonds+' % RF, '+stats.cash+' % monetario).');
  if(Math.abs(stats.equity-target)>.01)proposal.reasons.push('El modelo reduce la renta variable respecto al reparto de referencia porque los modelos más próximos no cumplen todas las condiciones de plazo, pérdidas o productos excluidos. Consulta la comparación de modelos.');
  proposal.reasons.push('Modelo asignado automáticamente: '+model.name+'. Selección por cercanía al reparto y compatibilidad con la entrevista; no por mínima varianza ni por rentabilidad supuesta.');
  for(const pos of proposal.positions)proposal.reasons.push(pos.isin+': '+pos.weight.toLocaleString('es-ES',{maximumFractionDigits:2})+' % del capital de '+(proposal.client?.name??'esta entrevista')+'. Fondo del modelo '+model.name+'. '+productById(pos.assetId)!.coverage);

  const holdings=proposal.positions.map(p=>({assetId:p.assetId,amount:p.amount,meta:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:'EUR',cls:p.role==='equity'?'equity_dev' as const:p.role==='overnight'?'cash' as const:'bond_gov' as const}}));
  return {...base,title:'Modelo propuesto: '+model.name,description:'Reparto asignado: '+stats.equity+' % renta variable · '+stats.bonds+' % renta fija'+(stats.cash?' · '+stats.cash+' % monetario':'')+'. '+base.description,proposal,kind:proposal.kind,holdings,amount:proposal.amount,comparisons:base.comparisons.map(row=>({...row,selected:proposal.positions.some(p=>p.assetId===row.id),reason:proposal.positions.some(p=>p.assetId===row.id)?'Fondo incluido en el modelo asignado. '+row.reason:row.reason}))};
}
