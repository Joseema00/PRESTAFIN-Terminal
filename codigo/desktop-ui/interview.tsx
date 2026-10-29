import { ProposalSummary,ProductStudy } from './proposal-view';
import { proposalText } from '../src/lib/portfolio-proposal';
import { INTERVIEW_PLAN_VERSION } from '../src/lib/interview-plan';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Download, Plus, Trash2, MessageCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePeople } from './use-portfolios';
import { buildInterviewPlan, generationMessage } from '../src/lib/interview-plan';
import { parseMoneyInput } from '../src/lib/interview-input';
import { isInterviewReviewed } from '../src/lib/risk-profile';
import { useInterviews } from './use-portfolios';
import { QUESTIONS, INTERVIEW_STEPS, assessInterview, questionTitle, moneyLabel, interviewReport, budgetIsKnown, type Question, type Answers, type Answer, type Interview, type Issue } from '../src/lib/risk-profile';
import './interview.css';

function downloadText(text:string,name:string) {
  const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function blankQuestionnaire() {
  const text=['PRESTAFIN · GUION DE ENTREVISTA','Lee las preguntas sin sugerir una respuesta. Anota las dudas y los ejemplos que dé la persona. Los importes se expresan en euros.'];
  for (const [step,section] of INTERVIEW_STEPS.entries()) {
    text.push('',section.title.toUpperCase());
    for (const q of QUESTIONS.filter(item=>item.step===step)) {
      text.push('',questionTitle(q,{}),q.help ?? '',...(q.options?.map(o=>'[ ] '+o.label) ?? ['Respuesta: ____________________________']));
    }
  }
  text.push('','Las cifras de pérdidas del guion en blanco usan 10.000 € de ejemplo. En la aplicación se adaptan al importe inicial.');
  downloadText(text.join('\n'),'Prestafin-guion-entrevista.txt');
}
function MoneyAnswer({q,title,value,onAnswer}:{q:Question;title:string;value:Answer|undefined;onAnswer:(key:string,v:Answer|undefined)=>void}) {
  const format=(v:Answer|undefined)=>typeof v==='number'?String(v).replace('.',','):'';
  const [draft,setDraft]=useState(format(value)),[error,setError]=useState('');
  const editing=useRef(false),invalid=useRef(false);
  useEffect(()=>{if(!editing.current&&!invalid.current){setDraft(format(value));setError('');}},[value]);
  function change(raw:string){
    setDraft(raw);setError('');
    try{const amount=parseMoneyInput(raw);invalid.current=false;onAnswer(q.id,amount);}
    catch{invalid.current=true;onAnswer(q.id,undefined);}
  }
  function commit(){
    editing.current=false;
    if(invalid.current){try{parseMoneyInput(draft);}catch(e){setError(e instanceof Error?e.message:'Importe no válido');}}
  }
  return <><div className="interview-money-row"><label className="interview-money"><span className="sr-only">{title}</span><input type="text" inputMode="decimal" autoComplete="off" maxLength={30} placeholder="Sin responder" value={draft} aria-invalid={!!error} aria-describedby={'help-'+q.id+(error?' error-'+q.id:'')} onFocus={()=>{editing.current=true;}} onChange={e=>change(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/><span>€</span></label><label className="unknown-money"><input type="checkbox" checked={value==='unknown'} onChange={e=>{editing.current=false;invalid.current=false;setDraft('');setError('');onAnswer(q.id,e.target.checked?'unknown':undefined);}}/>No lo sé todavía</label></div>{error&&<p className="question-error" id={'error-'+q.id} role="alert">{error}</p>}</>;
}
function AdviserReview({interview,writable,onReview}:{interview:Interview;writable:boolean;onReview:(adviser:string,notes:string,next:string)=>void}){
  const {adviser:settings}=usePeople();
  const [adviser,setAdviser]=useState(interview.review?.adviser??settings.adviser),[notes,setNotes]=useState(interview.review?.notes??''),[next,setNext]=useState(interview.review?.nextReviewDate??''),[confirmed,setConfirmed]=useState(false);
  const reviewed=isInterviewReviewed(interview);
  return <section className="terminal-panel interview-adviser"><h3>Revisión y seguimiento del asesor</h3><p>{reviewed?'Revisión registrada para estas respuestas.':interview.review?'Las respuestas cambiaron desde la última revisión. Revisa de nuevo el conjunto.':'Puedes generar el borrador sin rellenar este apartado. Registra aquí tu revisión cuando hayas contrastado la información.'}</p><p className="interview-caption">Recoge objetivos adicionales, conocimientos y experiencia, necesidades de liquidez, restricciones y preferencias de sostenibilidad. No presupongas que la persona quiere asumir más riesgo por conocer más productos.</p><fieldset disabled={!writable}><label>Asesor responsable<input maxLength={180} value={adviser} onChange={e=>{setAdviser(e.target.value);setConfirmed(false);}}/></label><label>Justificación y asuntos tratados<textarea rows={5} maxLength={4000} placeholder="Resume por qué el planteamiento encaja, qué se ha explicado, qué documentación falta y las preferencias o restricciones que se deberán comprobar al seleccionar productos." value={notes} onChange={e=>{setNotes(e.target.value);setConfirmed(false);}}/></label><label>Próxima revisión<input type="date" value={next} onChange={e=>{setNext(e.target.value);setConfirmed(false);}}/></label><label className="review-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>He contrastado los datos, la comprensión y las dudas con la persona. Esta anotación no sustituye la evaluación de idoneidad ni la selección documentada de productos.</label><button className="terminal-button secondary" disabled={!confirmed||!assessInterview(interview.answers).complete} onClick={()=>{try{onReview(adviser,notes,next);setConfirmed(false);toast.success('Revisión registrada para estas respuestas');}catch(e){toast.error(e instanceof Error?e.message:'No se pudo registrar la revisión');}}}>Registrar revisión</button></fieldset>{interview.review&&<small>Revisión {interview.review.revision} · {new Date(interview.review.reviewedAt).toLocaleString('es-ES')} · Próxima cita: {interview.review.nextReviewDate}</small>}</section>;
}
function QuestionField({q,answers,onAnswer,showMissing}:{q:Question;answers:Answers;onAnswer:(key:string,v:Answer|undefined)=>void;showMissing:boolean}) {
  const value=answers[q.id];
  const missing=showMissing && !q.optional && value===undefined;
  const helpId='help-'+q.id;
  return <fieldset className={'interview-question '+(missing?'is-missing':'')} id={'question-'+q.id}>
    <legend><span>{String(QUESTIONS.indexOf(q)+1).padStart(2,'0')}</span>{questionTitle(q,answers)}{q.optional && <small>Opcional</small>}</legend>
    {q.help && <p id={helpId} className="question-help">{q.help}{q.id==='initial'&&' Si cambias este importe, tendrás que responder de nuevo a las tres preguntas sobre pérdidas en euros.'}</p>}
    {q.kind==='choice' && <div className="interview-options">{q.options?.map(o=><label key={o.value} className={value===o.value?'chosen':''}><input type="radio" name={q.id} value={o.value} checked={value===o.value} onChange={()=>onAnswer(q.id,o.value)} aria-describedby={q.help?helpId:undefined}/><span>{o.label}</span></label>)}</div>}
    {q.kind==='money' && <MoneyAnswer q={q} title={questionTitle(q,answers)} value={value} onAnswer={onAnswer}/>}
    {q.kind==='text' && <textarea aria-label={q.title} aria-describedby={helpId} maxLength={2000} rows={4} value={typeof value==='string'?value:''} placeholder="Sus preocupaciones, sus prioridades, lo que conviene comentar…" onChange={e=>onAnswer(q.id,e.currentTarget.value)}/>}
    {missing && <p className="question-error" role="alert">Falta esta respuesta. También puedes indicar que aún no lo sabes cuando aparezca esa opción.</p>}
  </fieldset>;
}
function Alias({interview,writable,onSave}:{interview:Interview;writable:boolean;onSave:(name:string)=>void}) {
  const [name,setName]=useState(interview.alias);
  useEffect(()=>setName(interview.alias),[interview.alias]);
  return <label className="interview-alias"><span>Título de esta entrevista</span><input disabled={!writable} maxLength={80} value={name} onChange={e=>setName(e.target.value)} onBlur={()=>{onSave(name);if(!name.trim())setName(interview.alias);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}
function Issues({items,onReview}:{items:Issue[];onReview:(id:string)=>void}) {
  return <ul className="interview-issues">{items.map(item=><li key={item.id}><span>{item.message}</span>{item.questions[0] && <button onClick={()=>onReview(item.questions[0]!)}>Revisar respuesta <ArrowRight size={13}/></button>}</li>)}</ul>;
}
const band=(n:number) => n<=20?'Baja':n<=40?'Contenida':n<=60?'Media':'Alta';

export function InterviewPage() {
  const store=useInterviews();
  const interview=store.active;
  const navigate=useNavigate();
  const [showMissing,setShowMissing]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [creating,setCreating]=useState(false);
  const [generationError,setGenerationError]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{setGenerationError('');},[interview?.id,interview?.revision]);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{setShowMissing(false);setConfirmDelete(false);heading.current?.focus({preventScroll:true});},[interview?.id,interview?.step]);
  const start=()=>{try{store.create();}catch(e){toast.error(e instanceof Error?e.message:'No se pudo crear la entrevista');}};
  const r=interview?assessInterview(interview.answers):null;
  const plan=interview?buildInterviewPlan(interview.answers,interview.proposalSettings):null;
  const total=QUESTIONS.filter(q=>!q.optional).length;
  const done=r?total-r.missing.length:0;
  const step=interview?.step??0;
  const isResult=step===INTERVIEW_STEPS.length;
  function go(next:number) {
    if (!interview) return;
    store.setStep(interview.id,next);
    document.querySelector('.terminal-main')?.scrollTo({top:0,behavior:'smooth'});
  }
  function review(id:string) {
    const q=QUESTIONS.find(item=>item.id===id);if(!q)return;
    go(q.step);
    // Rendering follows the store update; focus the actual control without hiding other questions.
    requestAnimationFrame(()=>document.querySelector<HTMLInputElement|HTMLTextAreaElement>('#question-'+id+' input, #question-'+id+' textarea')?.focus());
  }
  function next() {
    if (!interview)return;
    const latest=store.current(interview.id)??interview;
    const missing=QUESTIONS.find(q=>q.step===step && !q.optional && latest.answers[q.id]===undefined);
    if(missing){setShowMissing(true);document.querySelector<HTMLInputElement>('#question-'+missing.id+' input')?.focus();return;}
    go(step+1);
  }
  async function save(){
    const saved=await store.saveNow();
    if(!mounted.current)return;
    if(saved.ok){setGenerationError('');toast.success('Respuestas guardadas');}
    else{setGenerationError(saved.error??'No se pudieron guardar los cambios');toast.error(saved.error??'Error al guardar');}
  }
  async function generate() {
    if(!interview || creating)return;
    const id=interview.id,latest=store.current(id);
    if(!latest)return;
    const currentPlan=buildInterviewPlan(latest.answers,latest.proposalSettings);
    const alreadyCreated=latest.generated?.planVersion===INTERVIEW_PLAN_VERSION&&latest.generated?.revision===latest.revision&&store.portfolios.some(p=>p.id===latest.generated?.portfolioId);
    if(!alreadyCreated&&!currentPlan.canCreate){setGenerationError(generationMessage(currentPlan));review(currentPlan.required[0]!);setShowMissing(true);return;}
    setCreating(true);setGenerationError('');
    try{
      store.generate(id);
      const saved=await store.saveNow();
      if(!saved.ok)throw new Error(saved.error??'No se pudo guardar la cartera');
      if(!mounted.current||!store.isCurrent(id))return;
      toast.success(currentPlan.kind==='objective'?'Cartera objetivo creada y guardada':currentPlan.kind==='planning'?'Plan de protección guardado':'Borrador de inversión creado y guardado');
      await navigate({to:'/portfolio-lab'});
    }catch(e){if(mounted.current&&store.isCurrent(id)){const message=e instanceof Error?e.message:'No se pudo generar la cartera';setGenerationError(message);toast.error(message);}}
    finally{if(mounted.current)setCreating(false);}
  }
  const existing=interview?.generated?.planVersion===INTERVIEW_PLAN_VERSION && interview.generated.revision===interview.revision && store.portfolios.some(p=>p.id===interview.generated?.portfolioId);
  return <div className="interview-page">
    <div className="terminal-page-title"><span>CONOCER ANTES DE INVERTIR</span><h1>Entrevista de inversión.</h1><p>Una conversación sobre su vida, su dinero y cómo se sentiría si las cosas no salen como espera. Sin pedirle que sepa de bolsa.</p></div>
    <div className="interview-toolbar"><label><span className="sr-only">Elegir entrevista</span><select value={interview?.id??''} onChange={e=>store.select(e.target.value)} disabled={!store.interviews.length}><option value="" disabled>Selecciona una entrevista</option>{store.interviews.map(i=><option key={i.id} value={i.id}>{i.alias}</option>)}</select></label><button className="terminal-button" disabled={!store.writable || store.interviews.length>=100} onClick={start}><Plus size={16}/>Nueva entrevista</button><button className="terminal-button secondary" onClick={blankQuestionnaire}><Download size={15}/>Guion en blanco</button></div>
    {!interview && <section className="terminal-panel interview-empty"><ClipboardList size={32}/><h2>Primero escucha. Después construye.</h2><p>{QUESTIONS.length} preguntas en seis bloques, con ejemplos adaptados al dinero que esa persona quiere invertir. Puedes pausar la entrevista y retomarla después.</p><div className="interview-empty-blocks">{INTERVIEW_STEPS.map((s,i)=><span key={s.title}><b>{String(i+1).padStart(2,'0')}</b>{s.title}</span>)}</div><button className="terminal-button" disabled={!store.writable} onClick={start}>Empezar entrevista <ArrowRight size={16}/></button><p className="interview-caption">Las respuestas se guardan en este ordenador. Puedes usar un alias; no hace falta DNI, teléfono ni correo.</p></section>}
    {interview && r && plan && <>
      <div className="interview-identity"><Alias key={interview.id} interview={interview} writable={store.writable} onSave={name=>store.rename(interview.id,name)}/><div className="interview-progress"><span>{done} de {total} respuestas · {Object.values(interview.answers).filter(v=>v==='unknown').length} por aclarar</span><progress max={total} value={done} aria-label="Progreso de la entrevista"/><small>{store.saveError?'Hay cambios sin guardar':store.saving?'Guardando respuestas…':'Guardado local; puedes continuar más tarde'}</small><button className="terminal-button secondary" disabled={!store.writable||store.saving} onClick={()=>void save()}>Guardar ahora</button></div></div>
      {generationError&&<div className="interview-callout" role="alert"><AlertCircle size={20}/><p>{generationError}</p></div>}
      <div className="interview-layout"><nav className="interview-steps" aria-label="Bloques de la entrevista">{INTERVIEW_STEPS.map((s,index)=>{
        const group=QUESTIONS.filter(q=>q.step===index && !q.optional);const complete=group.every(q=>interview.answers[q.id]!==undefined&&interview.answers[q.id]!=='unknown');
        return <button key={s.title} className={step===index?'active':''} aria-current={step===index?'step':undefined} onClick={()=>go(index)}><span>{complete?<Check size={14}/>:String(index+1).padStart(2,'0')}</span><div>{s.title}<small>{group.filter(q=>interview.answers[q.id]!==undefined).length}/{group.length} respuestas</small></div></button>;
      })}<button className={isResult?'active':''} aria-current={isResult?'step':undefined} onClick={()=>go(INTERVIEW_STEPS.length)}><span><ClipboardList size={15}/></span><div>Resultado y cartera<small>Revisar el conjunto</small></div></button><div className="interview-guide"><MessageCircle size={17}/><strong>Para quien entrevista</strong><p>Lee sin sugerir una opción. Pregunta «¿por qué?» y anota dudas con sus palabras. No intentes conseguir un perfil más arriesgado.</p></div></nav>
      <fieldset className="interview-content" disabled={!store.writable}>
      {!isResult?<section className="terminal-panel interview-form"><header><span>BLOQUE {step+1} / {INTERVIEW_STEPS.length}</span><h2 ref={heading} tabIndex={-1}>{INTERVIEW_STEPS[step]!.title}</h2><p>{INTERVIEW_STEPS[step]!.description}</p></header>{QUESTIONS.filter(q=>q.step===step).map(q=><QuestionField key={q.id} q={q} answers={interview.answers} showMissing={showMissing} onAnswer={(key,value)=>store.answer(interview.id,key,value)}/>)}<footer className="interview-actions"><button className="terminal-button secondary" disabled={step===0} onClick={()=>go(step-1)}><ArrowLeft size={15}/>Anterior</button><button className="terminal-button" onClick={next}>{step===INTERVIEW_STEPS.length-1?'Ver resultado':'Siguiente bloque'}<ArrowRight size={15}/></button></footer></section>:
      <div className="interview-result">
        <section className="terminal-panel interview-result-intro"><span className="eyebrow">LECTURA DE LA ENTREVISTA</span><h2 ref={heading} tabIndex={-1}>{plan.title}</h2><p>{plan.description}</p><button className="terminal-button secondary" onClick={()=>downloadText(interviewReport(interview,false)+(plan.proposal?'\n\n'+proposalText(plan.proposal):''),'Prestafin-entrevista-'+interview.id.slice(0,8)+'.txt')}><Download size={15}/>Exportar respuestas y resumen</button></section>
        <section className="terminal-panel interview-create" aria-label="Generar cartera"><h3>{existing?'Tu cartera está creada':'Guardar esta propuesta en su ficha'}</h3>{plan.required.length>0&&<div className="interview-pending"><p>Datos necesarios para generar:</p>{plan.required.map(id=><button key={id} onClick={()=>review(id)}>{questionTitle(QUESTIONS.find(q=>q.id===id)!,interview.answers)} <ArrowRight size={13}/></button>)}</div>}{interview.generated&&!existing&&<p className="interview-caption">La cartera anterior se conserva. Esta generación usa el nuevo motor y las respuestas guardadas; no necesitas repetir la entrevista.</p>}<button className="terminal-button" disabled={!store.writable||creating} onClick={()=>void generate()}>{creating?'Guardando cartera…':existing?'Abrir cartera creada':!plan.canCreate?'Completar datos para generar':plan.kind==='objective'?'Generar cartera objetivo':plan.kind==='planning'?'Guardar plan de protección':'Generar borrador de inversión'}<ArrowRight size={16}/></button><p className="interview-caption">Se guarda en la ficha de {store.personName} y se abre automáticamente. Puedes ajustar el criterio y excluir productos en el estudio que aparece debajo.</p></section>
        {plan.proposal&&<ProposalSummary proposal={plan.proposal}/>}
        <ProductStudy settings={interview.proposalSettings} comparisons={plan.comparisons} onChange={settings=>store.configure(interview.id,settings)}/>
        {r.missing.length>0 && <section className="interview-callout" role="status"><AlertCircle size={20}/><div><h3>Faltan {r.missing.length} respuestas</h3><p>Completa las respuestas principales para crear el borrador correspondiente.</p><button onClick={()=>review(r.missing[0]!)}>Continuar por la primera pendiente <ArrowRight size={14}/></button></div></section>}
        {plan.issues.length>0 && <section className="terminal-panel interview-review"><h3>Puntos a revisar antes de invertir</h3><Issues items={plan.issues} onReview={review}/></section>}
        {r.complete && budgetIsKnown(interview.answers) && <section className="interview-budget"><div><span>Importe que quiere invertir</span><strong>{moneyLabel(r.initial)}</strong><small>Inicial · {moneyLabel(r.monthly)}/mes después</small></div><div><span>Colchón que se deja aparte</span><strong>{moneyLabel(r.reserve)}</strong><small>{r.reserveMonths} meses de gastos y cuotas</small></div><div><span>Disponible tras las reservas</span><strong>{moneyLabel(r.available)}</strong><small>Descontando también los gastos próximos</small></div></section>}
        {r.complete&&<section className="interview-reading"><div><span>Capacidad económica</span><strong>{band(r.capacity)}</strong><small>Plazo, ingresos y consecuencias de perder.</small></div><div><span>Tolerancia a las pérdidas</span><strong>{band(r.tolerance)}</strong><small>Decisiones y preocupaciones; no se compensa con más conocimientos.</small></div><div><span>Conceptos comprendidos</span><strong>{r.knowledge} de 4</strong><small>Los conceptos pendientes figuran como condición de la propuesta.</small></div></section>}
        {r.warnings.length>0 && <section className="terminal-panel interview-review"><h3>Temas para comentar</h3><Issues items={r.warnings} onReview={review}/></section>}
        <details className="terminal-panel interview-glossary"><summary>Explicaciones sencillas para continuar la conversación</summary><dl><dt>Repartir el dinero</dt><dd>Invertir en muchas empresas reduce la dependencia de una sola. No elimina las pérdidas del conjunto.</dd><dt>Bonos o renta fija</dt><dd>Son préstamos a gobiernos o empresas. Su precio cambia y puede haber impagos; un fondo de bonos no garantiza recuperar todo cuando quieras salir.</dd><dt>Lo que pasó antes</dt><dd>Que una inversión ganara en el pasado no asegura que vaya a hacerlo después.</dd><dt>Precios y ahorro</dt><dd>Si los precios suben y tu dinero no crece, podrás comprar menos con él.</dd><dt>Estabilidad y crecimiento</dt><dd>Buscar más crecimiento suele exigir convivir con mayores altibajos. Ninguno de los dos bloques de esta cartera garantiza el capital.</dd></dl></details>
        <details className="terminal-panel interview-review-details"><summary>Revisión del asesor y próxima cita · independiente de la generación</summary><AdviserReview key={interview.id+':'+interview.revision} interview={interview} writable={store.writable} onReview={(adviser,notes,next)=>store.review(interview.id,adviser,notes,next)}/></details>
        <p className="interview-disclaimer">Herramienta orientativa para conversar y simular; no es una evaluación de idoneidad validada. Las respuestas son información financiera personal y se incluyen en las copias locales, sin cifrar. No se envían a servicios externos.</p>
      </div>}
      </fieldset></div>
      <div className="interview-bottom"><span>Último cambio: {new Date(interview.updatedAt).toLocaleString('es-ES')} · Revisión {interview.revision}</span>{confirmDelete?<div><span>¿Eliminar solo esta entrevista? La cartera se conserva.</span><button onClick={()=>{store.remove(interview.id);setConfirmDelete(false);}}>Sí, eliminar</button><button onClick={()=>setConfirmDelete(false)}>Cancelar</button></div>:<button onClick={()=>setConfirmDelete(true)}><Trash2 size={13}/>Eliminar entrevista</button>}</div>
    </>}
  </div>;
}
