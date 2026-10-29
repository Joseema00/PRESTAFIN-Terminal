import { allocateCents,inferGoal,GOAL_LABELS,MODEL_VERSION,ROLE_MODEL,modelCovariance,optimizeAllocation } from './allocation-engine';
import { assessInterview,sanitizeAnswers,QUESTIONS,type Answers,type Issue } from './risk-profile';
import { compareProducts,productById,RESEARCH_DATE,validateProposalSettings,ROLE_LABELS,type ProposalSettings,type ProductRole,type ProductComparison } from './investment-products';
import type { PortfolioProposal,ProposalPosition } from './portfolio-proposal';
import type { Holding } from './portfolio';
export const PENDING_CASH_ID='interview-cash-pending';
export const INTERVIEW_PLAN_VERSION=4;
export const ROLE_SHOCK:Record<ProductRole,number>={overnight:1,ultrashort:3,short:7,aggregate:15,equity:50};
export type InterviewPlan={kind:'incomplete'|'investment'|'objective'|'planning';canCreate:boolean;title:string;description:string;holdings:Holding[];amount:number;available:number;required:string[];issues:Issue[];proposal?:PortfolioProposal;comparisons:ProductComparison[]};
const round=(n:number)=>Math.round(n*100)/100;
const distribute=(total:number,weights:number[])=>{const cents=Math.round(total*100),parts=weights.map(w=>Math.floor(cents*w/100));const left=cents-parts.reduce((s,n)=>s+n,0);const order=weights.map((w,i)=>({i,remainder:cents*w/100-parts[i]!})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);for(let i=0;i<left;i++){const index=order[i%order.length]!.i;parts[index]=parts[index]!+1;}return parts.map(n=>n/100);};
/** Model policy, deliberately separate from knowledge checks and actual funding. Explicit model assumptions are saved separately from observed market data. */
export function buildInterviewPlan(raw:Answers,settings?:ProposalSettings):InterviewPlan{
 const a=sanitizeAnswers(raw),r=assessInterview(a),options=validateProposalSettings(settings);
 const required=[...r.missing];
 for(const key of ['initial','savings','nearCosts','income','expenses','debtPayment','monthly','maxLoss'])if(typeof a[key]!=='number'&&!required.includes(key))required.push(key);
 if(typeof a.initial==='number'&&a.initial<=0&&!required.includes('initial'))required.push('initial');
 for(const key of ['horizon','goal','flexibility','impact','loss10','loss25','sleep','balance','tradeoff','guarantee'])if(a[key]==='unknown'&&!required.includes(key))required.push(key);
 if(Number(a.maxLoss)>r.initial&&!required.includes('maxLoss'))required.push('maxLoss');
 if(required.length)return {kind:'incomplete',canCreate:false,title:'Faltan datos para crear la cartera',description:'Completa los datos señalados. Los importes desconocidos y las dudas sobre el riesgo no se convierten en ceros.',holdings:[],amount:0,available:r.available,required,issues:r.blockers,comparisons:[]};
 const n=(key:string)=>Number(a[key]);
 const adapted=new Set(['reserve','monthly','stress-budget','loss-rejection',...(a.horizon==='short'?['horizon']:[])]);
 const conditions=r.blockers.filter(i=>!adapted.has(i.id)).map(i=>i.message);
 const financialIssue=r.blockers.some(i=>['deficit','borrowed','emergency','debt','debt-conflict','change','no-expenses','income-unknown','withdrawals'].includes(i.id));
 const kind:'investment'|'objective'=r.available<=0||conditions.length?'objective':'investment';
 let fundedToday=financialIssue||conditions.length?0:round(Math.min(r.initial,r.available));
 if(kind==='objective')fundedToday=0;
 const amount=kind==='investment'?fundedToday:r.initial;
 const reserveGap=round(Math.max(0,r.reserve+n('nearCosts')-n('savings'))),fundingGap=round(Math.max(0,r.reserve+n('nearCosts')+r.initial-n('savings')));
 const monthly=round(Math.min(r.monthly,r.monthlySurplus));
 const reasons=[`Se separan ${r.reserveMonths} meses de gastos y cuotas, además de los gastos próximos. El colchón queda fuera de los productos.`,
  'Se optimiza la prioridad del cliente respetando plazo, capacidad económica, reacción a pérdidas, preferencia y experiencia. Una meta más alta no aumenta los límites de riesgo.'];
 if(kind==='objective')reasons.push('Esta cartera muestra un objetivo condicionado. No representa dinero invertible hoy ni se suma al patrimonio. Antes de financiarla hay que completar las reservas y resolver las condiciones indicadas.');
 else if(amount<r.initial)reasons.push('Se reduce el capital inicial al disponible después de las reservas. No se deja toda la propuesta pendiente por pedir más de lo disponible.');
 if(monthly<r.monthly)reasons.push('La aportación mensual se reduce al margen entre ingresos, gastos y cuotas. No se presupone una financiación adicional.');
 const snapshot:PortfolioProposal={version:3,catalogDate:RESEARCH_DATE,kind,settings:options,amount,available:r.available,fundedToday,reserve:r.reserve,reserveGap,fundingGap,monthly,equity:0,stressLoss:0,feePct:0,feeAnnual:0,reasons,conditions,positions:[]};
 function planning(message:string):InterviewPlan{
  snapshot.kind='planning';snapshot.fundedToday=0;snapshot.conditions=[...snapshot.conditions,message];snapshot.positions=[];
  return {kind:'planning',canCreate:true,title:'Plan de protección y revisión',description:message,holdings:[{assetId:PENDING_CASH_ID,amount}],amount,available:r.available,required:[],issues:r.blockers,proposal:snapshot,comparisons:[]};
 }
 if(a.guarantee==='required'||n('maxLoss')===0||a.impact==='essentials')return planning('La persona necesita proteger el capital o sus gastos esenciales. Compara cuentas y depósitos con entidad, garantía aplicable, plazo y condiciones verificados; ningún fondo de este estudio garantiza el capital. No se inventa una oferta bancaria.');
 if(a.restrictions!=='none')return planning('Hay exclusiones o preferencias por concretar. Define esas condiciones antes de seleccionar un producto que pueda incumplirlas. El estudio sigue disponible para la conversación.');
 if(r.blockers.some(i=>['reaction-conflict','experience-conflict'].includes(i.id)))return planning('Las respuestas contienen contradicciones sobre las pérdidas o la experiencia. Revisa las respuestas señaladas antes de elegir productos.');
 const lossPct=n('maxLoss')/r.initial*100;
 if(lossPct<ROLE_SHOCK.overnight)return planning('La pérdida aceptada no alcanza ni el escenario ilustrativo del bloque a un día. Revisa una solución de protección bancaria y sus condiciones.');
 const experienceCap=['none','deposit','unknown'].includes(String(a.experience))||['never','rare'].includes(String(a.frequency))?40:80;
 let equity=Math.floor(Math.min(r.capacity,r.tolerance,r.preference,experienceCap)/5)*5;
 reasons.push(`Límites derivados de las respuestas: capacidad económica y plazo ${r.capacity} %, tolerancia a pérdidas ${r.tolerance} %, preferencia estabilidad/crecimiento ${r.preference} % y experiencia ${experienceCap} %. Se utiliza el menor y después se aplica el presupuesto de pérdidas.`);
 if(options.variant==='cautious')equity=Math.floor(equity/2/5)*5;
 const long=['long','verylong'].includes(String(a.horizon));
 let defensive:ProductRole=a.horizon==='short'?'overnight':lossPct>=15&&long&&r.capacity>=40?'aggregate':lossPct>=7&&r.tolerance>0?'short':lossPct>=3?'ultrashort':'overnight';
 if(options.variant==='cautious'&&defensive==='aggregate')defensive='short';
 while(equity>0&&(equity*50+(100-equity)*ROLE_SHOCK[defensive])/100>lossPct)equity-=5;
 const ladder:ProductRole[]=['aggregate','short','ultrashort','overnight'];
 while(ROLE_SHOCK[defensive]>lossPct&&defensive!=='overnight')defensive=ladder[ladder.indexOf(defensive)+1]!;
 const roles:ProductRole[]=[...(equity>0?['equity' as ProductRole]:[]),defensive,...(defensive==='aggregate'?['short' as ProductRole]:[])];
 const candidates=roles.map(role=>compareProducts(role,amount/20,options).find(x=>x.selected)).map(row=>row&&productById(row.id));
 if(candidates.some(p=>!p))return planning('No queda un producto elegible para alguno de los bloques. Revisa las exclusiones y el acceso al catálogo.');
 const input={ids:candidates.map(p=>p!.id),roles,means:roles.map((r,i)=>ROLE_MODEL[r].mean-candidates[i]!.fee),cov:modelCovariance(roles),riskFree:2.2,equityCap:equity,lossLimit:lossPct,goal:inferGoal(a)};
 const optimized=optimizeAllocation(input);
 if(!optimized.best)return planning('No se encuentra un reparto que cumpla los límites de pérdida y exposición de la entrevista. Revisa el objetivo y las condiciones.');
 snapshot.optimization={...input,modelVersion:MODEL_VERSION,basis:'assumptions',candidateCount:optimized.candidates.length,step:5};
 const blocks=roles.map((role,i)=>({role,weight:optimized.best!.weights[i]!*100})).filter(b=>b.weight>0);
 reasons.push('Objetivo: '+GOAL_LABELS[input.goal]+'. Se han comparado '+optimized.candidates.length+' repartos admisibles en pasos de 5 puntos porcentuales, sin apalancamiento.');
 reasons.push('Optimización de planificación con hipótesis propias de rentabilidad, volatilidad y correlación, netas del coste corriente del producto. Referencia sin riesgo supuesta: 2,2 % anual. No es una cotización, un máximo universal ni una garantía de resultados. Las hipótesis se pueden consultar en Optimización.');
 const amounts=allocateCents(amount,blocks.map(b=>b.weight/100),blocks.map(b=>b.role),input.equityCap,input.lossLimit),monthlies=distribute(monthly,blocks.map(b=>b.weight));
 const comparisons:ProductComparison[]=[],positions:ProposalPosition[]=[];
 for(let i=0;i<blocks.length;i++){
  const b=blocks[i]!,rows=compareProducts(b.role,amounts[i]!,options);comparisons.push(...rows);
  const chosen=input.ids[input.roles.indexOf(b.role)];for(const row of rows)row.selected=row.id===chosen&&row.eligible;const selected=rows.find(x=>x.selected),p=selected&&productById(selected.id);
  if(!p){const result=planning('No queda un producto elegible para «'+ROLE_LABELS[b.role]+'». Revisa las exclusiones y el acceso al catálogo; no se sustituye sin avisar por un producto de más riesgo.');result.comparisons=comparisons;return result;}
  if(amounts[i]!>0)positions.push({assetId:p.id,name:p.name,isin:p.isin,role:b.role,weight:b.weight,amount:amounts[i]!,monthly:monthlies[i]!,fee:p.fee,source:p.source});
  if(options.priority==='funds'&&p.vehicle==='ETF')conditions.push('Para «'+ROLE_LABELS[b.role]+'» no hay un fondo elegible en este estudio. Se muestra un ETF como alternativa, sin atribuirle el régimen fiscal de los fondos.');
  if(p.developedOnly)conditions.push('El fondo de empresas elegido cubre mercados desarrollados; esta alternativa no incorpora emergentes.');
 }
 for(const p of positions)p.weight=p.amount/amount*100;
 const actualMonthly=distribute(monthly,positions.map(p=>p.weight));positions.forEach((p,i)=>{p.monthly=actualMonthly[i]!;});
 snapshot.positions=positions;snapshot.equity=positions.filter(p=>p.role==='equity').reduce((s,p)=>s+p.weight,0);
 snapshot.stressLoss=round(positions.reduce((s,p)=>s+p.amount*ROLE_SHOCK[p.role]/100,0));
 snapshot.feePct=positions.reduce((s,p)=>s+p.weight*p.fee/100,0);snapshot.feeAnnual=round(amount*snapshot.feePct/100);
 reasons.push(`Parte de empresas resultante: ${snapshot.equity.toFixed(1)} %. El resto usa ${ROLE_LABELS[defensive].toLowerCase()}, según plazo y pérdida aceptada.`);
 reasons.push('El escenario aplica caídas hipotéticas del 50 % a empresas, 15 % a bonos globales, 7 % a bonos cortos, 3 % a bonos muy cortos y 1 % al bloque a un día. No son máximos, probabilidades ni estimaciones históricas.');
 conditions.push('Propuesta por importes, no órdenes: confirmar KID vigente, comercialización, acceso, precio, participaciones enteras o fraccionadas, spread y comisiones. No se han consultado cotizaciones en tiempo real.');
 const holdings:Holding[]=positions.map(p=>({assetId:p.assetId,amount:p.amount,meta:{symbol:p.isin,name:p.name,isin:p.isin,kind:productById(p.assetId)!.vehicle,currency:'EUR',cls:p.role==='equity'?'equity_dev':p.role==='overnight'?'cash':'bond_gov'}}));
 return {kind,canCreate:true,title:kind==='objective'?'Cartera objetivo con productos concretos':'Propuesta adaptada a las respuestas',description:kind==='objective'?'Puedes ver y guardar el reparto que se estudiaría al resolver las condiciones. El capital disponible hoy y lo que falta para financiar el objetivo se muestran por separado.':'Se asigna únicamente el capital que cabe después de reservar el colchón y los gastos próximos. Los productos se comparan dentro del universo estudiado.',holdings,amount,available:r.available,required:[],issues:r.blockers.filter(i=>!adapted.has(i.id)),proposal:snapshot,comparisons};
}
export function generationMessage(plan:InterviewPlan):string{
 if(plan.canCreate)return plan.description;
 return 'Revisa estos datos antes de generar: '+plan.required.map(id=>QUESTIONS.find(q=>q.id===id)?.title??id).join(' · ');
}
