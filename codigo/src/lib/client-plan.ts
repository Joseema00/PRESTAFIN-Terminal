import {buildInterviewPlan,type InterviewPlan} from './interview-plan';
import {assessInterview,QUESTIONS,type Answers} from './risk-profile';
import {INVESTMENT_PRODUCTS,compareProducts,productById,type ProposalSettings,type ProductRole} from './investment-products';
import {applyFundModel,type FundModel} from './fund-models';
import {ROLE_MODEL,modelCovariance,inferGoal} from './allocation-engine';
import {optimizeContinuous,type OptimizerInput} from './optimization';
import {personWealth,portfolioValue} from './portfolio-monitor';
import type {Person} from './people';
import type {PortfolioProposal} from './portfolio-proposal';

export type PlanningContext={id:string;name:string;cash:number;investments:number;otherAssets:number;debt:number};
export function planningContext(person:Person):PlanningContext{
 const w=personWealth(person);return {id:person.id,name:person.name,cash:w.cash,investments:pSum(person),otherAssets:w.otherAssets,debt:w.debt};
}
const pSum=(person:Person)=>person.portfolios.filter(p=>!!p.tracking&&!p.proposal).reduce((sum,p)=>sum+portfolioValue(p),0);
export function samePlanningContext(proposal:PortfolioProposal|undefined,context:PlanningContext|undefined){
 return !!context&&!!proposal?.client&&(Object.keys(context) as (keyof PlanningContext)[]).every(k=>proposal.client![k]===context[k]);
}
const eur=(v:number)=>v.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const pct=(v:number)=>v.toLocaleString('es-ES',{maximumFractionDigits:2})+' %';
const label=(a:Answers,key:string)=>QUESTIONS.find(q=>q.id===key)?.options?.find(o=>o.value===a[key])?.label??'Por aclarar';

export const CLIENT_ALTERNATIVES=[
 {id:'stability',name:'Estabilidad',description:'Minimiza la volatilidad supuesta dentro de sus límites.'},
 {id:'sharpe',name:'Equilibrio',description:'Optimiza la relación entre rentabilidad y riesgo supuestos.'},
 {id:'growth',name:'Crecimiento',description:'Maximiza la rentabilidad supuesta sin superar sus límites.'},
] as const;
export function alternativeSettings(settings:ProposalSettings|undefined,objective:typeof CLIENT_ALTERNATIVES[number]['id']):ProposalSettings{
 return {variant:'base',excluded:[],fundAccessConfirmed:false,...settings,priority:'funds',fundAccessMode:'study',allowEtfFallback:false,objective};
}
/** Three independent objectives, never three budgets to invest simultaneously. */
export function buildClientAlternatives(answers:Answers,settings:ProposalSettings|undefined,context:PlanningContext){
 return CLIENT_ALTERNATIVES.map(option=>{
  const plan=buildClientPlan(answers,alternativeSettings(settings,option.id),context);
  return {...option,plan,preferred:option.id===inferGoal(answers)};
 });
}
export function compositionKey(proposal:PortfolioProposal){return JSON.stringify(proposal.positions.map(p=>[p.assetId,Math.round(p.amount*100)]).sort());}
export function distinctAlternatives<T extends {id:string;preferred:boolean;plan:InterviewPlan}>(options:T[]):T[]{
 const seen=new Set<string>(),keep=new Set<string>();
 for(const option of [...options].sort((a,b)=>Number(b.preferred)-Number(a.preferred))){
  const p=option.plan.proposal,key=p?.positions.length?compositionKey(p):option.id;
  if(!seen.has(key)){seen.add(key);keep.add(option.id);}
 }
 return options.filter(o=>keep.has(o.id));
}

/** Concrete answers behind a limit; never change answers to obtain a desired portfolio. */
export function clientRiskDrivers(a:Answers,settings?:ProposalSettings){
 const r=assessInterview(a),horizon=({short:0,medium:20,long:60,verylong:100} as Record<string,number>)[String(a.horizon)]??0;
 const rows=[
  {key:'horizon',name:'Plazo de esta inversión',cap:horizon},
  {key:'incomeStability',name:'Estabilidad de ingresos',cap:a.incomeStability==='stable'?100:40},
  {key:'dependents',name:'Personas a cargo',cap:a.dependents==='sole'?50:100},
  {key:'flexibility',name:'Flexibilidad del objetivo',cap:a.flexibility==='none'?25:100},
  {key:'withdrawals',name:'Retiradas previstas',cap:a.withdrawals==='occasional'?40:100},
  {key:'impact',name:'Consecuencias de las pérdidas',cap:a.impact==='goal'?20:a.impact==='adjust'?60:100},
  {key:'loss10',name:'Reacción a una caída del 10 %',cap:({sell:0,reduce:20,hold:100,add:100} as Record<string,number>)[String(a.loss10)]??0},
  {key:'loss25',name:'Reacción a una caída del 25 %',cap:({sell:0,reduce:25,hold:100,add:100} as Record<string,number>)[String(a.loss25)]??0},
  {key:'sleep',name:'Convivir con las pérdidas',cap:({severe:0,worried:25,calm:100} as Record<string,number>)[String(a.sleep)]??0},
  {key:'tradeoff',name:'Prioridad declarada',cap:({peace:20,mixed:50,growth:100} as Record<string,number>)[String(a.tradeoff)]??0},
  {key:'balance',name:'Mezcla preferida',cap:r.preference},
  {key:'experience',name:'Experiencia',cap:['none','deposit','unknown'].includes(String(a.experience))?40:100},
  {key:'frequency',name:'Frecuencia de inversión',cap:['never','rare'].includes(String(a.frequency))?40:100},
 ];
 const cap=Math.min(...rows.map(row=>row.cap));
 return {cap:settings?.variant==='cautious'?cap/2:cap,rows:rows.filter(row=>row.cap===cap).map(row=>({...row,answer:label(a,row.key)}))};
}

/** One documented fund per eligible exposure; overlapping share classes are alternatives. */
export function selectClientFunds(proposal:PortfolioProposal,horizon?:unknown){
 const audit=proposal.optimization;if(!audit||!proposal.positions.length)return [];
 const rank:Record<ProductRole,number>={overnight:0,ultrashort:1,short:2,aggregate:3,equity:4};
 // Eligibility follows the horizon, not a product's stand-alone shock. A small
 // position in a bond fund can fit a budget below that fund's 100%-weight shock.
 const horizonRank=({short:0,medium:2,long:3,verylong:3} as Record<string,number>)[String(horizon)];
 const maxDefensive=horizonRank===undefined?Math.max(0,...audit.roles.filter(r=>r!=='equity').map(r=>rank[r])):Math.min(horizonRank,proposal.settings.variant==='cautious'?2:3);
 const roles=(Object.keys(rank) as ProductRole[]).filter(role=>role==='equity'?audit.equityCap>0:rank[role]<=maxDefensive);
 return roles.flatMap(role=>{
  const eligible=new Set(compareProducts(role,proposal.amount,proposal.settings).filter(row=>row.eligible).map(row=>row.id));
  const fund=INVESTMENT_PRODUCTS.filter(p=>p.vehicle==='Fondo'&&p.role===role&&p.coreEligible!==false&&eligible.has(p.id)).sort((a,b)=>a.fee-b.fee||a.id.localeCompare(b.id))[0];
  return fund?[fund]:[];
 });
}

export function fundSelectionReason(proposal:PortfolioProposal,assetId:string):string{
 const p=proposal.positions.find(p=>p.assetId===assetId);if(!p)return '';
 // Persisted wording keeps the original client context when answers change later.
 return proposal.reasons.find(r=>r.startsWith(p.isin+': '))?.slice(p.isin.length+2)??'';
}

/** Recorded cash limits funding; property and existing portfolios are never spent again. */
export function buildClientPlan(raw:Answers,settings:ProposalSettings|undefined,context:PlanningContext,construction:'continuous'|'mandate'='continuous'):InterviewPlan{
 const declared=typeof raw.savings==='number'?raw.savings:undefined;
 const answers={...raw,...(declared!==undefined?{savings:Math.min(declared,context.cash)}:{})};
 const base=buildInterviewPlan(answers,settings,construction==='mandate'?'mandate':'allocate'),assessment=assessInterview(answers);
 if(!base.proposal)return base;
 let proposal=base.proposal;
 if(proposal.positions.length&&proposal.optimization){
  // The continuous solver enforces the loss budget itself. Do not inherit the
  // grid's equity reduction made assuming a fixed defensive bond allocation.
  const experience=['none','deposit','unknown'].includes(String(raw.experience))||['never','rare'].includes(String(raw.frequency))?40:100;
  const cap=Math.min(assessment.capacity,assessment.tolerance,assessment.preference,experience);
  proposal={...proposal,optimization:{...proposal.optimization,equityCap:proposal.settings.variant==='cautious'?cap/2:cap}};
  const audit=proposal.optimization!,products=selectClientFunds(proposal,answers.horizon);
  if(products.length&&construction==='mandate'){
   const roles=products.map(p=>p.role);
   proposal.optimization={...audit,ids:products.map(p=>p.id),roles,means:products.map(p=>ROLE_MODEL[p.role].mean-p.fee),cov:modelCovariance(roles)};
  }
  if(products.length&&construction==='continuous'){
   const roles=products.map(p=>p.role),means=products.map(p=>ROLE_MODEL[p.role].mean-p.fee),goal=proposal.settings.objective??inferGoal(answers);
   const method=goal==='growth'?'targetRisk':goal==='sharpe'&&Math.max(...means)>audit.riskFree?'maxSharpe':'minVariance';
   const input:OptimizerInput={ids:products.map(p=>p.id),names:products.map(p=>p.name),means,cov:modelCovariance(roles),currentWeights:products.map(()=>1/products.length),riskFree:audit.riskFree,method,...(goal==='growth'?{maxVolatility:Math.max(...roles.map(r=>ROLE_MODEL[r].vol))}:{}),basis:'assumptions',source:'Hipótesis por bloque · selección personalizada de fondos',limits:[{name:'Cuestionario · empresas',coefficients:roles.map(r=>r==='equity'?100:0),max:audit.equityCap},{name:'Cuestionario · escenario severo',coefficients:roles.map(r=>ROLE_MODEL[r].shock),max:audit.lossLimit}]};
   let result;try{result=optimizeContinuous(input);}catch(e){
    if(method==='maxSharpe'&&e instanceof Error&&e.message.startsWith('No hay rentabilidad esperada superior')){result=optimizeContinuous({...input,method:'minVariance'});proposal.conditions.push('Con tus límites no hay exceso de rentabilidad supuesto sobre la referencia del 2,2 %. Se utiliza mínima varianza.');}
    else throw e;
   }
   const allocation=products.map((p,i)=>({assetId:p.id,pct:result.point.weights[i]!*100})).filter(x=>x.pct>1e-7);
   proposal.optimization={...audit,ids:input.ids,roles,means,cov:input.cov,goal};
   // applyFundModel allocates cents and checks the original interview limits again.
   const model:FundModel={id:'personalized-'+context.id.slice(0,120),name:('Personalizada · '+context.name).slice(0,120),description:'Reparto calculado con su entrevista y patrimonio.',minYears:0,allocation};
   proposal=applyFundModel(model,proposal);
   proposal.modelAssignment={id:model.id,name:model.name,revision:1,method:'automatic'};
   proposal.optimization={...proposal.optimization!,goal,construction:'continuous',candidateCount:1,step:0};
  }
 }
 if(context.debt>0&&raw.debt==='none'){
  proposal={...proposal,kind:proposal.kind==='planning'?'planning':'objective',fundedToday:0,conditions:[...proposal.conditions,`Patrimonio registra ${eur(context.debt)} de deuda y la entrevista indica que no hay deudas. Revisa ambos datos antes de asignar capital.`]};
 }
 proposal.client={...context,declaredSavings:declared??0,nearCosts:Number(answers.nearCosts??0),horizon:label(raw,'horizon'),goal:label(raw,'goal'),reserveMonths:assessment.reserveMonths,monthlySurplus:assessment.monthlySurplus,maxLoss:Number(raw.maxLoss??0)};
 const decision=proposal.kind==='planning'?`La selección de fondos queda pendiente por las condiciones de tu entrevista.`:proposal.kind==='objective'?(proposal.fundingGap>0?`Hoy puedes asignar ${eur(proposal.fundedToday)}. Faltan ${eur(proposal.fundingGap)} para cubrir reservas y el objetivo de ${eur(proposal.amount)}.`:'El saldo registrado cubre el capital estudiado, pero la asignación queda pendiente por las condiciones señaladas.'):`Puedes estudiar ${eur(proposal.fundedToday)} de los ${eur(Number(raw.initial))} que querías invertir.`;
 const binding=Math.min(assessment.capacity,assessment.tolerance,assessment.preference,['none','deposit','unknown'].includes(String(raw.experience))||['never','rare'].includes(String(raw.frequency))?40:100);
 proposal.reasons=[
  `${context.name}: ${label(raw,'horizon').toLowerCase()}; objetivo: ${label(raw,'goal').toLowerCase()}${typeof raw.target==='number'&&raw.target>0?' ('+eur(raw.target)+')':''}.`,
  `Se toman ${eur(Math.min(declared??0,context.cash))} de liquidez contrastada. Se reservan ${eur(proposal.reserve)} (${assessment.reserveMonths} meses de gastos y cuotas) y ${eur(Number(answers.nearCosts??0))} para gastos próximos. ${decision}`,
  ...(proposal.positions.length?[`Tu límite previo de renta variable es ${pct(binding)}; el reparto queda en ${pct(proposal.equity)} tras aplicar plazo, presupuesto de pérdida de ${eur(Number(raw.maxLoss))} y el enfoque elegido.`]:[]),
  ...(context.investments||context.otherAssets||context.debt?[`Ya constan ${eur(context.investments)} en inversiones, ${eur(context.otherAssets)} en otros activos y ${eur(context.debt)} de deuda. Se conservan fuera del capital que se distribuye.`]:[]),
 ];
 if(declared!==undefined&&Math.abs(declared-context.cash)>.01)proposal.reasons.push(`La entrevista declara ${eur(declared)} y Patrimonio ${eur(context.cash)} en liquidez; se usa el menor importe hasta conciliar ambos.`);
 if(proposal.optimization){
  const audit=proposal.optimization,experience=['none','deposit','unknown'].includes(String(raw.experience))||['never','rare'].includes(String(raw.frequency))?40:100;
  proposal.reasons.push(`Límites de ${context.name}: plazo y capacidad ${pct(assessment.capacity)}, reacción a pérdidas ${pct(assessment.tolerance)}, mezcla preferida ${pct(assessment.preference)} y experiencia ${pct(experience)} de renta variable. Tras el presupuesto de pérdidas${proposal.settings.variant==='cautious'?' y el enfoque más prudente':''}, se aplica un máximo de ${pct(audit.equityCap)}.`);
  for(const p of proposal.positions){
   const product=productById(p.assetId)!;
   const purpose=p.role==='equity'?`Dedica ${pct(p.weight)} al crecimiento en empresas, dentro del límite de ${pct(audit.equityCap)} de renta variable.`:p.role==='overnight'?`Mantiene ${eur(p.amount)} del reparto en instrumentos monetarios; la reserva de ${eur(proposal.reserve+Number(answers.nearCosts??0))} permanece aparte.`:`Dedica ${eur(p.amount)} a la parte de bonos para el plazo declarado: ${label(raw,'horizon').toLowerCase()}.`;
   proposal.reasons.push(`${p.isin}: ${purpose} ${product.coverage} El reparto completo arroja una pérdida hipotética de ${eur(proposal.stressLoss)}, frente a ${eur(proposal.amount*audit.lossLimit/100)} de presupuesto para el capital estudiado; las pérdidas reales pueden ser mayores.`);
  }
 }
 const holdings=proposal.kind==='planning'?base.holdings:proposal.positions.map(p=>({assetId:p.assetId,amount:p.amount,meta:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:'EUR',cls:p.role==='equity'?'equity_dev' as const:p.role==='overnight'?'cash' as const:'bond_gov' as const}}));
 return {...base,kind:proposal.kind,proposal,holdings,available:proposal.available,amount:proposal.amount,title:proposal.kind==='planning'?'Plan de protección y revisión · '+context.name:'Cartera personalizada · '+context.name,description:decision};
}
