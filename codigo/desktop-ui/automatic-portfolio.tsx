import {planningContext,samePlanningContext} from '../src/lib/client-plan';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {Sparkles,ArrowRight,ClipboardList,ShieldCheck} from 'lucide-react';
import {useInterviews,usePeople,useModelLibrary,usePortfolios} from './use-portfolios';
import {PersonalizedModels} from './personalized-models';
import {buildModelPlan} from '../src/lib/account-models';
import {ProposalSummary,ProductStudy} from './proposal-view';
import {generationMessage,INTERVIEW_PLAN_VERSION} from '../src/lib/interview-plan';
import {DEFAULT_PROPOSAL_SETTINGS,INVESTMENT_PRODUCTS,compareProducts,validateProposalSettings,type ProposalSettings} from '../src/lib/investment-products';
import {QUESTIONS,assessInterview,type Interview} from '../src/lib/risk-profile';
import './automatic-portfolio.css';
const eur=(v:number)=>v.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const initialSettings=(i:Interview):ProposalSettings=>({...DEFAULT_PROPOSAL_SETTINGS,...i.proposalSettings,priority:'funds',fundAccessMode:'study',allowEtfFallback:false});
export function AutomaticPortfolio({onCreated}:{onCreated:()=>void}){
 const interviews=useInterviews(),portfolios=usePortfolios();
 return <><PersonalizedModels interview={interviews.active??undefined} onSaved={()=>{}} onOpenPortfolio={id=>{portfolios.setActiveId(id);onCreated();}}/><details className="terminal-panel chart-panel"><summary>Estudiar una propuesta individual</summary><SinglePortfolio onCreated={onCreated}/></details></>;
}
function SinglePortfolio({onCreated}:{onCreated:()=>void}){
  const store=useInterviews();
  useEffect(()=>{if(!store.active&&store.interviews[0])store.select(store.interviews[0].id);},[store.active?.id,store.interviews.length]);
  return <div className="automatic-portfolio"><section className="terminal-panel auto-heading"><span className="eyebrow">DEL CUESTIONARIO A UNA PROPUESTA</span><h2><Sparkles size={23}/>Cartera automática</h2><p>Fondos, importes y siguiente paso según la entrevista y el patrimonio de esta persona.</p><div className="auto-steps"><span>01 · Respuestas</span><span>02 · Selección y reparto</span><span>03 · Guardar propuesta</span></div></section>
    {!store.interviews.length?<section className="terminal-panel auto-empty"><ClipboardList size={30}/><h3>Primero, responde el cuestionario de esta persona</h3><p>Las respuestas del mismo cuestionario que genera el PDF se utilizarán para construir la cartera.</p><Link to="/entrevista" className="terminal-button primary">Responder cuestionario<ArrowRight size={15}/></Link></section>:<>
      <section className="terminal-panel"><label htmlFor="automatic-questionnaire">Cuestionario de esta persona</label><select id="automatic-questionnaire" value={store.active?.id??''} onChange={e=>store.select(e.target.value)}>{store.interviews.map(i=><option value={i.id} key={i.id}>{i.alias} · revisión {i.revision}</option>)}</select><Link to="/entrevista" className="terminal-button secondary">Revisar respuestas</Link></section>
      {store.active&&<AutomaticDraft key={store.active.id} interview={store.active} onCreated={onCreated}/>}
    </>}
  </div>;
}
function AutomaticDraft({interview,onCreated}:{interview:Interview;onCreated:()=>void}){
  const store=useInterviews(),people=usePeople(),library=useModelLibrary(),navigate=useNavigate();
  const [settings,setSettings]=useState<ProposalSettings>(()=>initialSettings(interview)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const plan=useMemo(()=>buildModelPlan(interview.answers,library.models,settings,people.active?planningContext(people.active):undefined),[interview.answers,settings,library.models,people.active]),assessment=assessInterview(interview.answers);
  const sameSettings=JSON.stringify(validateProposalSettings(interview.proposalSettings))===JSON.stringify(validateProposalSettings(settings));
  const existing=sameSettings&&interview.generated?.planVersion===INTERVIEW_PLAN_VERSION&&interview.generated.revision===interview.revision&&interview.generated.modelLibraryRevision===library.revision&&store.portfolios.some(p=>p.id===interview.generated?.portfolioId&&samePlanningContext(p.proposal,people.active?planningContext(people.active):undefined));
  const allComparisons=INVESTMENT_PRODUCTS.map(p=>{
    const row=compareProducts(p.role,plan.amount,settings).find(x=>x.id===p.id)!;
    const selected=plan.proposal?.positions.some(x=>x.assetId===p.id);
    return {...row,selected:!!selected,reason:selected?'Producto del reparto propuesto. '+row.reason:!row.eligible?row.reason:!plan.proposal?.positions.some(x=>x.role===p.role)?'Bloque no utilizado: no es necesario para los límites y necesidades de este reparto.':row.reason};
  });
  const cash=people.active?.profile.cash,savings=interview.answers.savings;
  const known=(...keys:string[])=>keys.every(key=>typeof interview.answers[key]==='number');
  const reserveKnown=known('expenses','debtPayment','nearCosts')&&['stable','variable','uncertain'].includes(String(interview.answers.incomeStability))&&['none','shared','sole'].includes(String(interview.answers.dependents));
  const mismatch=typeof savings==='number'&&typeof cash==='number'&&Math.abs(savings-cash)>.01;
  function review(questionId:string){const q=QUESTIONS.find(q=>q.id===questionId);if(q)store.setStep(interview.id,q.step);void navigate({to:'/entrevista'});}
  async function create(){
    if(busy)return;const id=interview.id;setBusy(true);setError('');
    try{
      const latest=store.current(id);if(!latest||!store.isCurrent(id))return;
      const check=buildModelPlan(latest.answers,library.models,settings,people.active?planningContext(people.active):undefined);if(!check.canCreate)throw new Error(generationMessage(check));
      store.configure(id,settings);store.generate(id);const revision=store.current(id)!.revision;
      const saved=await store.saveNow();if(!saved.ok)throw new Error(saved.error??'No se pudo guardar la propuesta.');
      if(mounted.current&&store.isCurrent(id)&&store.current(id)?.revision===revision)onCreated();
    }catch(e){if(mounted.current&&store.isCurrent(id))setError(e instanceof Error?e.message:'No se pudo generar la cartera.');}
    finally{if(mounted.current)setBusy(false);}
  }
  const explain=(id:string)=>{const q=QUESTIONS.find(x=>x.id===id),v=interview.answers[id];return q?.options?.find(o=>o.value===v)?.label??'Pendiente de aclarar';};
  return <>
    <details className="terminal-panel auto-source"><summary>Respuestas y patrimonio · {people.active?.name}</summary><div><span className="eyebrow">RESPUESTAS GUARDADAS</span><h3>{interview.alias}</h3><p>Revisión {interview.revision} · Actualizada el {new Date(interview.updatedAt).toLocaleString('es-ES')}.</p></div><ShieldCheck size={27}/><p>Se estudian plazo, objetivo, retiradas, ingresos y estabilidad, gastos, cuotas, dependientes, reserva, dinero prestado, pérdidas aceptables, experiencia, comprensión y restricciones.</p>
      <dl className="auto-facts"><div><dt>Plazo declarado</dt><dd>{explain('horizon')}</dd></div><div><dt>Ahorros declarados</dt><dd>{typeof savings==='number'?eur(savings):'Por aclarar'}</dd></div><div><dt>Colchón y gastos próximos</dt><dd>{reserveKnown?eur(assessment.reserve+Number(interview.answers.nearCosts)):'Por aclarar'}</dd></div><div><dt>Margen mensual tras gastos y cuotas</dt><dd>{known('income','expenses','debtPayment')?eur(assessment.monthlySurplus):'Por aclarar'}</dd></div><div><dt>Capital libre tras reservas</dt><dd>{reserveKnown&&known('savings')?eur(plan.available):'Por aclarar'}</dd></div><div><dt>Pérdida aceptada en euros</dt><dd>{typeof interview.answers.maxLoss==='number'?eur(interview.answers.maxLoss):'Por aclarar'}</dd></div></dl>
      {mismatch&&<p className="terminal-warning">La entrevista indica {eur(savings as number)} y Patrimonio {eur(cash!)} de liquidez. Se usa el menor importe para calcular lo disponible. <Link to="/mi-patrimonio">Revisar patrimonio</Link></p>}
    </details>
    <details className="terminal-panel auto-controls"><summary>Ajustar preferencias de la propuesta</summary><h3>Preferencia de productos</h3><p>El reparto se calcula con los fondos documentados y los límites de esta entrevista.</p><label>Enfoque del reparto<select aria-label="Enfoque de la cartera automática" value={settings.variant} disabled={busy} onChange={e=>{setSettings({...settings,variant:e.target.value as ProposalSettings['variant']});setError('');}}><option value="base">Ajustado a las respuestas</option><option value="cautious">Más prudente que el perfil obtenido</option></select></label><p>Fondos de inversión; confirma los mínimos de las clases propuestas con tu intermediario.</p></details>
    {plan.required.length>0?<section className="terminal-panel"><h3>Completa estos datos antes de generar</h3><ul className="auto-missing">{plan.required.map(id=><li key={id}><button className="fund-text-link" onClick={()=>review(id)}>{QUESTIONS.find(q=>q.id===id)?.title??id}<ArrowRight size={14}/></button></li>)}</ul><p>Una respuesta desconocida no se interpreta como cero ni como aceptación de riesgo.</p></section>:<>
      <div className="auto-save"><div><strong>{plan.title}</strong><p>{plan.description}</p></div><button className="terminal-button primary" disabled={busy||!store.writable||!plan.canCreate} onClick={()=>void create()}>{busy?'Guardando propuesta…':existing?'Abrir propuesta guardada':plan.kind==='planning'?'Guardar plan de protección':plan.kind==='objective'?'Guardar cartera objetivo':'Generar y guardar cartera'}</button></div>
      {error&&<p className="terminal-warning" role="alert">{error}</p>}
      {plan.proposal&&<ProposalSummary proposal={plan.proposal}/>}
    </>}
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}><ProductStudy preferFundsOnly settings={settings} comparisons={allComparisons} onChange={next=>{setSettings({...next,priority:'funds',fundAccessMode:'study'});setError('');}}/></fieldset>

  </>;
}
