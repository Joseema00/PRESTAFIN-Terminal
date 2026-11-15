import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {usePeople,useInterviews,useModelLibrary} from './use-portfolios';
import {buildClientPlan,clientRiskDrivers,planningContext,fundSelectionReason} from '../src/lib/client-plan';
import {buildModelPlan,rankAccountModels} from '../src/lib/account-models';
import {ANDBANK_REFERENCE} from '../src/lib/reference-models';
import {QUESTIONS,questionTitle,type Interview} from '../src/lib/risk-profile';
import type {InterviewModelSource} from '../src/lib/interview-model';
import {percent} from './risk-panels';
const money=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});

type Actions={onSaved:(id:string)=>void;onOpenPortfolio:(id:string)=>void};
export function PersonalizedModels({interview,onSaved,onOpenPortfolio}:{interview:Interview|undefined}&Actions){
 const people=usePeople(),interviews=useInterviews();
 const [selectedId,setSelectedId]=useState<string|null>(null);
 // The chosen interview may be removed or arrive after the screen has mounted.
 const selected=interviews.interviews.find(i=>i.id===selectedId)??interviews.interviews.find(i=>i.id===interview?.id)??interviews.active??interviews.interviews[0];
 return <section className="terminal-panel chart-panel personalized-model" aria-label="Crear modelo desde entrevista">
  <span className="eyebrow">{people.active?.name??'Selecciona una persona'} · REPARTO SEGÚN LA ENTREVISTA</span><h3>Tu reparto y su cartera modelo</h3>
  {!selected?<p>No hay entrevistas guardadas para esta persona. <Link to="/entrevista">Responder cuestionario</Link></p>:<>
   <label>Entrevista<select aria-label="Entrevista para crear el modelo" value={selected.id} onChange={e=>setSelectedId(e.target.value)}>{interviews.interviews.map(i=><option key={i.id} value={i.id}>{i.alias} · revisión {i.revision}</option>)}</select></label>
   <AssignedModel key={'assigned:'+people.active?.id+':'+people.epoch+':'+selected.id} interview={selected} onOpenPortfolio={onOpenPortfolio}/>
   <details className="model-options"><summary>Crear un modelo individual</summary><InterviewModelForm key={people.active?.id+':'+people.epoch+':'+selected.id} interview={selected} onSaved={onSaved} onOpenPortfolio={onOpenPortfolio}/></details>
  </>}
 </section>;
}
function AssignedModel({interview,onOpenPortfolio}:{interview:Interview;onOpenPortfolio:(id:string)=>void}){
 const people=usePeople(),library=useModelLibrary(),interviews=useInterviews(),person=people.active!;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true),inFlight=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const result=useMemo(()=>{try{return {plan:buildModelPlan(interview.answers,library.models,interview.proposalSettings,planningContext(person)),ranking:rankAccountModels(interview.answers,library.models,interview.proposalSettings,planningContext(person)),error:''};}catch(e){return {plan:null,ranking:null,error:e instanceof Error?e.message:'No se pudo asignar el modelo.'};}},[interview,library.models,person]);
 const plan=result.plan,p=plan?.proposal,drivers=clientRiskDrivers(interview.answers,interview.proposalSettings),selected=result.ranking?.best;
 const ready=!!(plan?.canCreate&&p?.positions.length&&p.modelAssignment&&plan.kind!=='planning');
 const review=(key:string)=>{interviews.select(interview.id);const q=QUESTIONS.find(q=>q.id===key);if(q)interviews.setStep(interview.id,q.step);};
 async function save(){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{const id=library.assignFromInterview(interview.id);const saved=await library.saveNow();if(!saved.ok)throw new Error(saved.error??'No se pudo guardar en tu cuenta.');if(mounted.current)onOpenPortfolio(id);}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar la cartera.');}
  finally{inFlight.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="assigned-model" aria-label="Modelo según entrevista">
  {plan?.required.length?<p>Faltan respuestas: {plan.required.map(id=><Link key={id} to="/entrevista" onClick={()=>review(id)}>{QUESTIONS.find(q=>q.id===id)?.title??id} · </Link>)}</p>:null}
  {ready&&p&&selected&&<>
   <div className="assignment-target"><span>Reparto de referencia de la entrevista</span><strong>{percent(drivers.cap)} renta variable · {percent(100-drivers.cap)} {selected.stats.cash>0?'parte defensiva':'renta fija'}</strong></div>
   <h4>Modelo asignado: {selected.model.name}</h4>
   <div className="fund-split-labels"><strong>Renta variable: {percent(selected.stats.equity)}</strong><strong>Renta fija: {percent(selected.stats.bonds)}</strong>{selected.stats.cash>0&&<strong>Monetario: {percent(selected.stats.cash)}</strong>}</div>
   <p>{selected.stats.cash>0?'La parte defensiva de este modelo utiliza monetario, no renta fija. Las condiciones de plazo, pérdidas y biblioteca determinan este reparto.':Math.abs(selected.stats.equity-drivers.cap)<.01?'El modelo coincide con el porcentaje de renta variable de la entrevista.':'Se ha elegido el modelo compatible más cercano. Los modelos con más renta variable no cumplen alguna de las condiciones indicadas debajo.'}</p>
   <div className="fund-split-labels"><span>{p.kind==='objective'?'Capital objetivo':'Capital del estudio'}: <strong>{money(p.amount)}</strong></span><span>Disponible hoy: <strong>{money(p.fundedToday)}</strong></span><span>Aportación: <strong>{money(p.monthly)}/mes</strong></span></div>
   {p.kind==='objective'&&<p className="terminal-warning">Cartera objetivo aún sin financiar o pendiente de resolver condiciones. {plan.description}</p>}
   <div className="assigned-funds">{p.positions.map(pos=><article className="assigned-fund" key={pos.assetId}><strong>{pos.name}</strong><small>{pos.isin}</small><dl><div><dt>Peso</dt><dd>{percent(pos.weight,2)}</dd></div><div><dt>Importe</dt><dd>{money(pos.amount)}</dd></div><div><dt>Al mes</dt><dd>{money(pos.monthly)}</dd></div></dl></article>)}</div>
   <p>Coste corriente: {money(p.feeAnnual)}/año · Pérdida del escenario hipotético: −{money(p.stressLoss)}.</p>
   {(drivers.cap<100||selected.stats.equity<drivers.cap)&&<section className="risk-decision" aria-label="Respuestas que determinan el reparto"><h4>Qué limita este reparto</h4>{drivers.rows.filter(row=>row.cap<100).map(row=><p key={row.key}>{row.name}: <strong>«{row.answer}»</strong>. <Link to="/entrevista" onClick={()=>review(row.key)}>Revisar esta respuesta</Link></p>)}
    {interview.proposalSettings?.variant==='cautious'&&<p>El enfoque más prudente reduce a la mitad el límite de renta variable.</p>}
    {selected.stats.equity<drivers.cap&&<><p>Pérdida aceptada: {money(p.client?.maxLoss??Number(interview.answers.maxLoss))} sobre {money(Number(interview.answers.initial))}. <Link to="/entrevista" onClick={()=>review('maxLoss')}>Revisar pérdida aceptada</Link></p>{result.ranking!.rows.filter(row=>!row.fit.compatible&&row.stats.equity>selected.stats.equity&&row.stats.equity<=drivers.cap).slice(0,3).map(row=><p key={row.model.id}><strong>{row.model.name}:</strong> {row.fit.reasons.join(' ')}</p>)}</>}
   </section>}
   <details><summary>Condiciones y explicación del modelo</summary>{p.reasons.map((reason,i)=><p key={i}>{reason}</p>)}{p.conditions.map((condition,i)=><p key={i}>{condition}</p>)}<small>Hipótesis de planificación, no garantías. Acceso, mínimos y documentación de los fondos pendientes de comprobar.</small></details>
  </>}
  {plan&&!ready&&!plan.required.length&&<p role="status">{plan.kind==='planning'?p?.conditions.at(-1):plan.description} <Link to="/entrevista" onClick={()=>interviews.select(interview.id)}>Revisar entrevista</Link></p>}
  <button className="terminal-button primary" disabled={busy||!ready||!library.writable} onClick={()=>void save()}>{busy?'Guardando cartera…':'Asignar y guardar esta cartera'}</button>
  {(error||result.error||!library.writable)&&<p role="alert">{error||result.error||library.saveError||'Abre los datos de tu cuenta antes de guardar.'}</p>}
 </div>;
}
function InterviewModelForm({interview,onSaved,onOpenPortfolio}:{interview:Interview}&Actions){
 const people=usePeople(),interviews=useInterviews(),library=useModelLibrary(),person=people.active!;
 const [name,setName]=useState(('Personalizada · '+person.name).slice(0,120)),[variant,setVariant]=useState<'base'|'cautious'>(interview.proposalSettings?.variant??'base');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<{id:string;input:string}|null>(null);
 const mounted=useRef(true),inFlight=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const context=planningContext(person);
 const settings=useMemo(()=>({...interview.proposalSettings,priority:'funds' as const,variant,excluded:interview.proposalSettings?.excluded??[],fundAccessConfirmed:interview.proposalSettings?.fundAccessConfirmed??false,fundAccessMode:'study' as const,allowEtfFallback:false}),[interview.proposalSettings,variant]);
 const result=useMemo(()=>{try{return {plan:buildClientPlan(interview.answers,settings,planningContext(person)),error:''};}catch(e){return {plan:null,error:e instanceof Error?e.message:'No se pudo calcular el modelo.'};}},[interview.answers,settings,person]);
 const plan=result.plan,proposal=plan?.proposal;
 const input=JSON.stringify({id:interview.id,revision:interview.revision,answers:interview.answers,context,settings,name:name.trim()});
 const savedModel=saved?.input===input?library.ownModels.find(m=>m.id===saved.id):undefined;
 async function create(mode:'funds'|'model'|'saved'='funds'){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{
   if(mode==='saved'&&!savedModel)throw new Error('Guarda el modelo actualizado antes de crear su cartera.');
   const asPortfolio=mode!=='model';
   const id=mode==='funds'?library.createWithFunds(interview.id,name,settings).portfolioId:mode==='saved'?library.createPortfolioFromModel(savedModel!.id):library.createFromInterview(interview.id,name,settings).id;
   const stored=await library.saveNow();if(!stored.ok)throw new Error(stored.error??'No se pudo guardar en tu cuenta.');
   if(!mounted.current)return;
   if(asPortfolio)onOpenPortfolio(id);else{setSaved({id,input});onSaved(id);}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar.');}
  finally{inFlight.current=false;if(mounted.current)setBusy(false);}
 }
 return <>
  <form className="interview-model-form" aria-label="Datos del modelo" onSubmit={e=>{e.preventDefault();void create();}}>
   <fieldset disabled={busy||!library.writable}>
    <label>Nombre de la cartera y del modelo<input aria-label="Nombre del modelo generado" required maxLength={120} value={name} onChange={e=>{setName(e.target.value);setError('');}}/></label>
    <details className="model-options"><summary>Ajustar enfoque</summary><label>Enfoque<select aria-label="Enfoque del modelo generado" value={variant} onChange={e=>{setVariant(e.target.value as typeof variant);setError('');}}><option value="base">Según sus respuestas</option><option value="cautious">Más prudente</option></select></label></details>
    {plan?.required.length? <div className="interview-model-missing"><p>Faltan estas respuestas de {person.name}:</p><ul>{plan.required.map(id=><li key={id}><Link to="/entrevista" onClick={()=>{interviews.select(interview.id);const q=QUESTIONS.find(q=>q.id===id);if(q)interviews.setStep(interview.id,q.step);}}>{QUESTIONS.find(q=>q.id===id)?.title??id}</Link></li>)}</ul></div>:null}
    {proposal&&<>
     <p>{plan!.description}</p><div className="fund-split-labels"><strong>Asignable hoy: {money(proposal.fundedToday)}</strong><strong>Reserva y gastos próximos: {money(proposal.reserve+(proposal.client?.nearCosts??0))}</strong><strong>Aportación: {money(proposal.monthly)}/mes</strong></div>
     {!!proposal.positions.length&&<div className="table-scroll"><table className="pro-table" aria-label="Vista previa del modelo generado"><thead><tr><th>Fondo / ISIN</th><th>Peso</th><th>{proposal.kind==='objective'?'Importe objetivo':'Importe del estudio'}</th></tr></thead><tbody>{proposal.positions.map(p=><tr key={p.assetId}><td>{p.name}<small>{p.isin}</small>{fundSelectionReason(proposal,p.assetId)&&<details className="fund-selection-reason"><summary>Por qué este fondo</summary><p>{fundSelectionReason(proposal,p.assetId)}</p></details>}</td><td>{percent(p.weight,2)}</td><td>{money(p.amount)}</td></tr>)}</tbody></table></div>}
     {proposal.optimization&&<p>Renta variable: {percent(proposal.equity,2)} · Pérdida del escenario hipotético: −{money(proposal.stressLoss)} · Coste corriente: {money(proposal.feeAnnual)}/año.</p>}
     {!proposal.positions.length&&<p role="status">{proposal.conditions.at(-1)} <Link to="/entrevista" onClick={()=>interviews.select(interview.id)}>Revisar respuestas</Link></p>}
    </>}
    <button className="terminal-button primary" type="submit" disabled={!proposal?.positions.length||!name.trim()}>{busy?'Guardando…':'Crear cartera con fondos'}</button>
    <button className="terminal-button secondary" type="button" disabled={!proposal?.positions.length||!name.trim()} onClick={()=>void create('model')}>Guardar solo el modelo</button>
   </fieldset>
  </form>
  {(!library.writable||result.error||error)&&<p role="alert" className="terminal-warning">{error||result.error||library.saveError||'Abre los datos de tu cuenta para guardar modelos.'}</p>}
  {savedModel&&<div className="model-created" role="status" aria-label="Modelo creado">
   <strong>Modelo creado: {savedModel.name}</strong><p>{savedModel.allocation.length} fondos · entrevista {interview.alias}, revisión {interview.revision}. {library.dirty||library.saveError?'Hay cambios pendientes de sincronizar.':library.storage==='cloud'?'Guardado en tu cuenta.':'Guardado en este espacio.'}</p>
   <button className="terminal-button" type="button" disabled={busy||!library.writable} onClick={()=>void create('saved')}>{busy?'Guardando…':'Crear cartera con este modelo'}</button>
  </div>}
 </>;
}

export function ModelReferences(){
 const [selected,setSelected]=useState(0),reference=ANDBANK_REFERENCE.profiles[selected]!;
 return <details className="terminal-panel chart-panel reference-models"><summary>Referencias de Andbank · 6 perfiles</summary><p>La Pizarra de Andrés · distribución publicada a 30/09/2026. <a href={ANDBANK_REFERENCE.source} target="_blank" rel="noreferrer">Consultar fuente ↗</a></p>
  <label>Perfil de referencia<select aria-label="Referencia de Andbank" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{ANDBANK_REFERENCE.profiles.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select></label>
  <div className="table-scroll"><table className="pro-table"><thead><tr><th>Bloque publicado</th><th>{reference.name}</th></tr></thead><tbody>{ANDBANK_REFERENCE.blocks.map((b,i)=><tr key={b}><td>{b}</td><td>{percent(reference.weights[i]!,2)}</td></tr>)}</tbody></table></div>
  <small>Referencia externa. Para asignarla faltan la validación de sus clases y la modelización de cada exposición.</small>
 </details>;
}

export function ModelOrigin({source}:{source:InterviewModelSource|undefined}){
 if(!source)return null;
 const {interview,proposal}=source,client=proposal.client!;
 return <details className="model-origin"><summary>Origen: {interview.alias} · revisión {interview.revision}</summary>
  <p>{client.name} · liquidez registrada {money(client.cash)} · plazo {client.horizon} · modelo {proposal.settings.variant==='cautious'?'más prudente':'según sus respuestas'}.</p>
  <small>Respuestas y cifras conservadas al crear este modelo.</small>
  <div className="table-scroll"><table className="pro-table"><thead><tr><th>Pregunta</th><th>Respuesta de origen</th></tr></thead><tbody>{QUESTIONS.filter(q=>interview.answers[q.id]!==undefined).map(q=>{const value=interview.answers[q.id];return <tr key={q.id}><td>{questionTitle(q,interview.answers)}</td><td>{typeof value==='number'?money(value):q.options?.find(o=>o.value===value)?.label??value}</td></tr>;})}</tbody></table></div>
 </details>;
}
