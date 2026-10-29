import type { Holding } from './portfolio';
import { productById } from './investment-products';
import { ROLE_MODEL,allocateCents,modelCovariance,MODEL_VERSION } from './allocation-engine';
import { validatePortfolioProposal,type PortfolioProposal } from './portfolio-proposal';
export type FundModel={id:string;name:string;description:string;minYears:number;allocation:{assetId:string;pct:number}[]};
const WORLD='fund-vanguard-world',EM='fund-vanguard-emerging',BOND='research-vanguard-bond-fund',SHORT='fund-vanguard-short',SMALL='fund-vanguard-small',GOV='fund-vanguard-euro-gov';
const rows=(pairs:[string,number][])=>pairs.filter(([,pct])=>pct>0).map(([assetId,pct])=>({assetId,pct}));
export const FUND_MODELS:FundModel[]=[
 ...Array.from({length:11},(_,i)=>{const eq=i*10,rf=100-eq;return {id:'fund-global-'+eq,name:`Global ${eq} / ${rf}`,minYears:eq===0?3:eq<=30?5:eq<=60?7:10,
  description:!eq?'Bonos globales de 1–5 años; conserva riesgo de tipos, crédito y cobertura.':'Núcleo desarrollado con un 10 % del bloque de acciones en emergentes. Los bonos combinan duración global y vencimientos cortos.',allocation:!eq?rows([[SHORT,100]]):rows([[WORLD,eq*.9],[EM,eq*.1],[BOND,rf*.6],[SHORT,rf*.4]])};}),
 {id:'fund-short-20',name:'Duración corta 20 / 80',minYears:5,description:'Empresas desarrolladas y bonos globales de 1–5 años cubiertos a euros. Menor duración no significa capital garantizado.',allocation:rows([[WORLD,20],[SHORT,80]])},
 {id:'fund-short-40',name:'Duración corta 40 / 60',minYears:7,description:'Reduce el peso de la duración frente al modelo global equivalente; mantiene riesgo empresarial y de crédito.',allocation:rows([[WORLD,40],[SHORT,60]])},
 {id:'fund-euro-40',name:'Deuda pública euro 40 / 60',minYears:7,description:'Empresas desarrolladas y deuda pública en euros. Mantiene riesgo de duración y concentración regional.',allocation:rows([[WORLD,40],[GOV,60]])},
 {id:'fund-small-80',name:'Empresas pequeñas 80 / 20',minYears:10,description:'60 % desarrollado, 10 % emergentes, 10 % pequeñas empresas y 20 % bonos. El satélite refuerza la exposición a pequeñas empresas.',allocation:rows([[WORLD,60],[EM,10],[SMALL,10],[BOND,20]])},
];
export function modelStats(model:FundModel){
 let equity=0,bonds=0,cash=0,fee=0,stress=0;
 for(const x of model.allocation){const p=productById(x.assetId);if(!p||p.vehicle!=='Fondo')throw new Error('El modelo debe contener fondos identificados');
  if(p.role==='equity')equity+=x.pct;else if(p.role==='overnight')cash+=x.pct;else bonds+=x.pct;fee+=x.pct*p.fee/100;stress+=x.pct*ROLE_MODEL[p.role].shock/100;}
 if(Math.abs(equity+bonds+cash-100)>1e-8)throw new Error('El modelo no suma 100 %');return {equity,bonds,cash,fee,stress};
}
export function modelToHoldings(model:FundModel,capital:number):Holding[]{
 if(!Number.isFinite(capital)||capital<=0||capital>1e12)throw new Error('Indica un capital positivo');modelStats(model);
 const roles=model.allocation.map(x=>productById(x.assetId)!.role),amounts=allocateCents(capital,model.allocation.map(x=>x.pct/100),roles);
 return model.allocation.map((x,i)=>{const p=productById(x.assetId)!;return {assetId:x.assetId,amount:amounts[i]!,meta:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:'EUR',cls:p.role==='equity'?'equity_dev' as const:'bond_gov' as const}};}).filter(h=>h.amount>0);
}
export function modelCompatibility(model:FundModel,proposal?:PortfolioProposal,horizonYears?:number){
 const s=modelStats(model),reasons:string[]=[];
 if(!proposal)return {compatible:false,reviewed:false,reasons:['Sin entrevista completa vinculada: borrador independiente.']};
 if(proposal.kind==='planning')reasons.push('La entrevista exige protección o aclaraciones antes de seleccionar fondos.');
 const cap=proposal.optimization?.equityCap??proposal.equity,loss=proposal.optimization?.lossLimit??(proposal.amount?proposal.stressLoss/proposal.amount*100:0);
 if(s.equity>cap+.001)reasons.push(`Supera el límite de renta variable de ${cap.toFixed(1)} %.`);
 if(s.stress>loss+.001)reasons.push(`Escenario del modelo: ${s.stress.toFixed(1)} %; presupuesto de pérdida: ${loss.toFixed(1)} %.`);
 const rank={overnight:0,ultrashort:1,short:2,aggregate:3,equity:4};
 const maxDefensive=Math.max(0,...(proposal.optimization?.roles??proposal.positions.map(p=>p.role)).filter(r=>r!=='equity').map(r=>rank[r]));
 if(model.allocation.some(x=>{const r=productById(x.assetId)!.role;return r!=='equity'&&rank[r]>maxDefensive;}))reasons.push('Los bonos tienen más duración que la admitida en la propuesta.');
 if(horizonYears!==undefined&&horizonYears<model.minYears)reasons.push(`Horizonte de estudio: al menos ${model.minYears} años.`);
 if(model.allocation.some(x=>proposal.settings.excluded.includes(x.assetId)))reasons.push('Incluye un fondo excluido por el asesor.');
 return {compatible:!reasons.length,reviewed:true,reasons};
}
export function applyFundModel(model:FundModel,original:PortfolioProposal,horizonYears?:number):PortfolioProposal{
 const fit=modelCompatibility(model,original,horizonYears);if(!fit.compatible)throw new Error(fit.reasons.join(' '));
 const cap=original.optimization?.equityCap??original.equity,loss=original.optimization?.lossLimit??original.stressLoss/original.amount*100;
 const products=model.allocation.map(x=>productById(x.assetId)!),roles=products.map(p=>p.role),amounts=allocateCents(original.amount,model.allocation.map(x=>x.pct/100),roles,cap,loss);
 const monthly=allocateCents(original.monthly,amounts.map(v=>v/original.amount),roles);
 const positions=products.map((p,i)=>({assetId:p.id,name:p.name,isin:p.isin,role:p.role,weight:amounts[i]!/original.amount*100,amount:amounts[i]!,monthly:monthly[i]!,fee:p.fee,source:p.source})).filter(p=>p.amount>0);
 const feePct=positions.reduce((s,p)=>s+p.weight*p.fee/100,0);
 const cov=modelCovariance(roles).map((row,i)=>row.map((v,j)=>roles[i]===roles[j]?ROLE_MODEL[roles[i]!].vol**2:v));
 const access=original.settings.fundAccessConfirmed;
 return validatePortfolioProposal({...original,kind:access?original.kind:'objective',fundedToday:access?original.fundedToday:0,settings:{...original.settings,priority:'funds'},positions,
  equity:positions.filter(p=>p.role==='equity').reduce((s,p)=>s+p.weight,0),stressLoss:Math.round(positions.reduce((s,p)=>s+p.amount*ROLE_MODEL[p.role].shock/100,0)*100)/100,feePct,feeAnnual:Math.round(original.amount*feePct)/100,
  optimization:{modelVersion:MODEL_VERSION,ids:products.map(p=>p.id),roles,means:products.map(p=>ROLE_MODEL[p.role].mean-p.fee),cov,riskFree:original.optimization?.riskFree??2.2,equityCap:cap,lossLimit:loss,goal:original.optimization?.goal??'sharpe',basis:'assumptions',candidateCount:1,step:5},
  reasons:[...original.reasons.filter(s=>!s.startsWith('Objetivo:')&&!s.startsWith('Parte de empresas resultante:')&&!s.startsWith('Se optimiza')&&!s.startsWith('Optimización de planificación')).slice(-32),`Modelo elegido por el asesor: ${model.name}. Conserva los límites de la entrevista. Elegir una plantilla no es maximizar Sharpe.`, 'Las exposiciones son objetivos por mandato del fondo, no su desglose diario interno.'],
  conditions:[...original.conditions.filter(s=>!s.includes('no incorpora emergentes')&&!s.startsWith('Para «')).slice(-34),'Confirmar acceso a cada clase, mínimos y KID vigente con el comercializador. El mínimo directo puede diferir del de una plataforma.',...(!access?['Cartera objetivo: acceso a estas clases todavía sin confirmar.']:[])]});
}
