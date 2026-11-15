import {createInterviewModel,sameInterviewModel} from '../src/lib/interview-model';
import {planningContext,samePlanningContext,CLIENT_ALTERNATIVES,alternativeSettings,compositionKey} from '../src/lib/client-plan';
import { validatePortfolioProposal,type PortfolioProposal } from '../src/lib/portfolio-proposal';
import {validateOptimizationStudy} from '../src/lib/optimization';
import {ROLE_MODEL,inferGoal} from '../src/lib/allocation-engine';
import { captureWealth,recordValuation,validateTracking,localDay,type Valuation } from '../src/lib/portfolio-monitor';
import { validateProposalSettings,ROLE_LABELS,type ProductRole,type ProposalSettings } from '../src/lib/investment-products';
import {holdingProduct} from '../src/lib/holding-classification';
import { useSyncExternalStore,useMemo } from 'react';
import {accountModels,validateAccountModels,buildModelPlan,type AccountModel} from '../src/lib/account-models';
import type { Holding } from '../src/lib/portfolio';
import { changeInterviewAnswer, reviewInterview, type Interview, type Answer } from '../src/lib/risk-profile';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, DEFAULT_MORTGAGE, emptyWorkspace, newPortfolio, newPerson, editPerson, movePortfolio, moveLegacyFinances, type Workspace, type Person, type PersonDetails, type WealthProfile, type WealthSettings, type MortgageProfile } from '../src/lib/people';
import { buildInterviewPlan,generationMessage,INTERVIEW_PLAN_VERSION } from '../src/lib/interview-plan';
import type { Inputs } from '../src/lib/finance';
import { validateHistory, type HistoricalData } from '../src/lib/professional-analysis';
import { DEFAULT_ADVISER, validateAdviser, validateReportPreferences, type AdviserSettings, type ReportPreferences } from '../src/lib/adviser';
export { DEFAULT_PROFILE, DEFAULT_SETTINGS, DEFAULT_MORTGAGE };
export type { Workspace, WealthProfile, WealthSettings, MortgageProfile };

let workspace:Workspace=emptyWorkspace();
let status={hydrated:false,saving:false,dirty:false,savedAt:null as number|null,saveError:null as string|null,storage:'local' as 'local'|'cloud'};
let revision=0;
let pending:Promise<unknown>=Promise.resolve();
let writable=false;
let epoch=0;
let workspaceOwner:string|null|undefined;
let initialization=0;
const listeners=new Set<()=>void>();
let snapshot={workspace,status,epoch};
function publish(){snapshot={workspace,status:{...status},epoch};listeners.forEach(fn=>fn());}
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
const getSnapshot=()=>snapshot;

export async function initializeWorkspace(){
  const ticket=++initialization;
  await pending;writable=false;epoch++;workspace=emptyWorkspace();status={...status,hydrated:false,saveError:null};publish();
  try{
    if(!window.prestafin)throw new Error('Abre Prestafin con el acceso de escritorio. El navegador no tiene acceso al guardado de la terminal.');
    const identity=await window.prestafin.workspaceIdentity?.();
    if(ticket!==initialization)return;
    workspaceOwner=identity?.userId;
    status={...status,storage:identity?.storage??'local'};
    if(identity?.configured&&!identity.userId){status={...status,hydrated:true,dirty:false};publish();return;}
    const data=await window.prestafin.loadWorkspace(workspaceOwner);
    if(ticket!==initialization)return;
    if(data)workspace=data;
    writable=true;status={...status,hydrated:true};publish();
    if(!data)await persist();
  }catch(error){status={...status,hydrated:true,saveError:error instanceof Error?error.message:'Error al abrir los datos'};publish();}
}
export async function prepareAccountChange(){await pending;if(status.dirty||status.saveError)throw new Error('Guarda los cambios pendientes antes de cambiar de cuenta.');writable=false;epoch++;publish();}
export async function reloadAccountWorkspace(){if(await window.prestafin?.confirmReloadWorkspace())await initializeWorkspace();}
export async function recoverLegacyWorkspace(owner:string){await pending;if(status.dirty||status.saveError)throw new Error('Guarda los cambios pendientes antes de recuperar fichas anteriores.');const copied=await window.prestafin?.recoverLegacyWorkspace(owner);if(copied)await initializeWorkspace();return copied;}
function persist(){
  if(!writable||!window.prestafin)return Promise.resolve({ok:false,error:'Guardado bloqueado hasta recuperar los datos'});
  const currentRevision=++revision;const data=structuredClone(workspace),owner=workspaceOwner;
  status={...status,saving:true,dirty:true,saveError:null};publish();
  const operation=(async()=>{try{
    const saved=await window.prestafin!.saveWorkspace(data,owner);
    if(revision===currentRevision)status={...status,saving:false,dirty:false,savedAt:saved.savedAt,saveError:null};
    publish();return {ok:true};
  }catch(error){const message=error instanceof Error?error.message:'No se pudieron guardar los cambios';if(revision===currentRevision)status={...status,saving:false,dirty:true,saveError:message};publish();return {ok:false,error:message};}})();
  pending=operation;return operation;
}
function replace(next:Workspace){if(!writable)return;workspace=next;publish();void persist();}
function update(patch:Partial<Workspace>){replace({...workspace,...patch});}
// Callbacks stay bound to their owner even if a different person is selected later.
// Restoring a backup also invalidates callbacks from the previous workspace.
function edit(id:string|null,generation:number,fn:(p:Person)=>Person){if(!writable||!id||epoch!==generation)return;replace(editPerson(workspace,id,fn));}
export async function restoreWorkspace(){
  await pending;
  const data=await window.prestafin?.importWorkspace(workspaceOwner);if(!data)return false;
  workspace=data;epoch++;writable=true;status={...status,hydrated:true,dirty:false,saveError:null,savedAt:Date.now()};publish();return true;
}
export async function exportWorkspace(){await pending;if((status.dirty||status.saveError)&&status.storage!=='cloud')throw new Error('Guarda los cambios antes de exportar');return window.prestafin?.exportWorkspace();}

function modelPortfolio(model:AccountModel,person:Person){
 const source=model.source,interview=person.interviews.find(i=>i.id===source?.interview.id);
 if(!source||source.proposal.client?.id!==person.id||!interview)throw new Error('El modelo no pertenece a una entrevista de esta persona');
 if(interview.revision!==source.interview.revision||JSON.stringify(interview.answers)!==JSON.stringify(source.interview.answers)||!samePlanningContext(source.proposal,planningContext(person)))throw new Error('La entrevista o el patrimonio han cambiado. Crea el modelo actualizado antes de asignarlo.');
 const proposal=validatePortfolioProposal({...source.proposal,modelAssignment:{id:model.id,name:model.name,revision:model.revision,method:'automatic'}});
 const existing=person.portfolios.find(p=>p.proposal&&JSON.stringify(p.proposal)===JSON.stringify(proposal));
 if(existing)return {portfolio:existing,created:false};
 if(person.portfolios.length>=250)throw new Error('Has alcanzado el límite de carteras de esta persona');
 const portfolio=newPortfolio(model.name,proposal.positions.map(x=>({assetId:x.assetId,amount:x.amount,meta:{symbol:x.isin,isin:x.isin,name:x.name,kind:'Fondo',currency:'EUR',cls:x.role==='equity'?'equity_dev' as const:x.role==='overnight'?'cash' as const:'bond_gov' as const}})),'Modelo creado desde entrevista');
 portfolio.proposal=proposal;return {portfolio,created:true};
}

export function useModelLibrary(){
 const {workspace:w,status:s,epoch:generation}=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
 const models=useMemo(()=>accountModels(w.modelPortfolios),[w.modelPortfolios]);
 function saveModel(input:AccountModel){
  if(!writable||epoch!==generation)throw new Error('Abre tu cuenta antes de guardar modelos.');
  const existing=workspace.modelPortfolios?.find(m=>m.id===input.id),now=Date.now();
  const model=validateAccountModels([{...input,revision:(existing?.revision??0)+1,createdAt:existing?.createdAt??now,updatedAt:now}])[0]!;
  update({modelPortfolios:validateAccountModels([...(workspace.modelPortfolios??[]).filter(m=>m.id!==model.id),model]),modelLibraryRevision:(workspace.modelLibraryRevision??0)+1});return model;
 }
 return {...s,writable,models,ownModels:w.modelPortfolios??[],revision:w.modelLibraryRevision??0,save:saveModel,
  assignFromInterview:(id:string)=>{
   if(!writable||epoch!==generation||workspace.activePersonId!==w.activePersonId)throw new Error('Selecciona la persona antes de asignar su modelo');
   const person=workspace.people.find(p=>p.id===w.activePersonId&&!p.archived),interview=person?.interviews.find(i=>i.id===id);
   if(!person||!interview)throw new Error('La entrevista no pertenece a esta persona');
   const plan=buildModelPlan(interview.answers,accountModels(workspace.modelPortfolios),interview.proposalSettings,planningContext(person));
   if(!plan.canCreate||!plan.proposal?.modelAssignment||!plan.proposal.positions.length||plan.kind==='planning')throw new Error(plan.description);
   const proposal=validatePortfolioProposal({...plan.proposal,interviewId:interview.id,revision:interview.revision});
   const existing=person.portfolios.find(p=>p.proposal&&JSON.stringify(p.proposal)===JSON.stringify(proposal));
   if(existing)return existing.id;
   if(person.portfolios.length>=250)throw new Error('Has alcanzado el límite de carteras de esta persona');
   const portfolio=newPortfolio(proposal.modelAssignment!.name,plan.holdings,'Modelo asignado según entrevista');portfolio.proposal=proposal;
   replace(editPerson(workspace,person.id,p=>({...p,portfolios:[...p.portfolios,portfolio]})));
   return portfolio.id;
  },
  createAlternatives:(id:string,settings?:ProposalSettings)=>{
   if(!writable||epoch!==generation||workspace.activePersonId!==w.activePersonId)throw new Error('Selecciona la persona antes de crear sus carteras');
   const person=workspace.people.find(p=>p.id===w.activePersonId&&!p.archived),interview=person?.interviews.find(i=>i.id===id);
   if(!person||!interview)throw new Error('La entrevista no pertenece a esta persona');
   let models=[...(workspace.modelPortfolios??[])],nextPerson=person,added=0;
   const candidates=CLIENT_ALTERNATIVES.map(option=>({option,candidate:createInterviewModel(interview,planningContext(person),(option.name+' · '+person.name).slice(0,120),alternativeSettings(settings,option.id))}));
   const seen=new Set<string>(),keep=new Set<string>(),preferred=inferGoal(interview.answers);
   for(const {option,candidate} of [...candidates].sort((a,b)=>Number(b.option.id===preferred)-Number(a.option.id===preferred))){const key=compositionKey(candidate.source!.proposal);if(!seen.has(key)){seen.add(key);keep.add(option.id);}}
   const result=candidates.filter(c=>keep.has(c.option.id)).map(({option,candidate})=>{
    const existing=models.find(m=>sameInterviewModel(m,candidate)),model=existing??candidate;
    if(!existing){models.push(model);added++;}
    const {portfolio,created}=modelPortfolio(model,nextPerson);
    if(created)nextPerson={...nextPerson,portfolios:[...nextPerson.portfolios,portfolio]};
    return {objective:option.id,name:model.name,modelId:model.id,portfolioId:portfolio.id};
   });
   // Preflight every limit and all three calculations before committing any change.
   models=validateAccountModels(models);
   if(added||nextPerson!==person)replace({...editPerson(workspace,person.id,()=>nextPerson),modelPortfolios:models,modelLibraryRevision:(workspace.modelLibraryRevision??0)+added});
   return result;
  },
  createFromInterview:(id:string,name:string,settings?:ProposalSettings)=>{
   if(!writable||epoch!==generation||workspace.activePersonId!==w.activePersonId)throw new Error('Selecciona la persona antes de crear su modelo');
   const person=workspace.people.find(p=>p.id===w.activePersonId&&!p.archived),interview=person?.interviews.find(i=>i.id===id);
   if(!person||!interview)throw new Error('La entrevista no pertenece a esta persona');
   const candidate=createInterviewModel(interview,planningContext(person),name,settings);
   const existing=workspace.modelPortfolios?.find(m=>sameInterviewModel(m,candidate));
   return existing??saveModel(candidate);
  },
  createWithFunds:(id:string,name:string,settings?:ProposalSettings)=>{
   if(!writable||epoch!==generation||workspace.activePersonId!==w.activePersonId)throw new Error('Selecciona la persona antes de crear su cartera');
   const person=workspace.people.find(p=>p.id===w.activePersonId&&!p.archived),interview=person?.interviews.find(i=>i.id===id);
   if(!person||!interview)throw new Error('La entrevista no pertenece a esta persona');
   const candidate=createInterviewModel(interview,planningContext(person),name,settings);
   const existing=workspace.modelPortfolios?.find(m=>sameInterviewModel(m,candidate)),model=existing??candidate;
   const models=existing?workspace.modelPortfolios!:validateAccountModels([...(workspace.modelPortfolios??[]),model]);
   const {portfolio,created}=modelPortfolio(model,person);
   // Model and funded/objective positions are committed together, with no empty intermediate template.
   if(!existing||created){
    const next=created?editPerson(workspace,person.id,p=>({...p,portfolios:[...p.portfolios,portfolio]})):workspace;
    replace({...next,modelPortfolios:models,modelLibraryRevision:(workspace.modelLibraryRevision??0)+(existing?0:1)});
   }
   return {modelId:model.id,portfolioId:portfolio.id};
  },
  createPortfolioFromModel:(id:string)=>{
   if(!writable||epoch!==generation||workspace.activePersonId!==w.activePersonId)throw new Error('Selecciona la persona antes de crear su cartera');
   const model=workspace.modelPortfolios?.find(m=>m.id===id),person=workspace.people.find(p=>p.id===w.activePersonId&&!p.archived);
   if(!model||!person)throw new Error('Selecciona un modelo y una persona');
   const {portfolio,created}=modelPortfolio(model,person);
   if(created)edit(person.id,generation,p=>({...p,portfolios:[...p.portfolios,portfolio]}));
   return portfolio.id;
  },
  remove:(id:string)=>{if(writable&&epoch===generation)update({modelPortfolios:(workspace.modelPortfolios??[]).filter(m=>m.id!==id),modelLibraryRevision:(workspace.modelLibraryRevision??0)+1});},saveNow:persist};
}

export function usePeople(){
  const {workspace:w,status:s,epoch:generation}=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  const active=w.people.find(p=>p.id===w.activePersonId&&!p.archived)??null;
  return {...s,writable,people:w.people,active,epoch:generation,adviser:w.adviser??DEFAULT_ADVISER,
    snapshotWealth:()=>edit(active?.id??null,generation,p=>captureWealth(p)),
    saveAdviser:(value:AdviserSettings)=>{if(epoch===generation)update({adviser:validateAdviser(value)});},
    saveHistory:(input:HistoricalData)=>edit(active?.id??null,generation,p=>{const data=validateHistory(input);if(!p.portfolios.some(c=>c.id===data.portfolioId))throw new Error('La cartera no pertenece a esta persona');const histories=[...(p.histories??[]).filter(h=>h.portfolioId!==data.portfolioId),data];if(histories.length>20)throw new Error('Máximo de 20 históricos por persona');return {...p,histories};}),
    removeHistory:(portfolioId:string)=>edit(active?.id??null,generation,p=>({...p,histories:(p.histories??[]).filter(h=>h.portfolioId!==portfolioId)})),
    setReportPreferences:(value:ReportPreferences)=>edit(active?.id??null,generation,p=>({...p,reportPreferences:validateReportPreferences(value)})),
    select:(id:string)=>{if(workspace.people.some(p=>p.id===id&&!p.archived))update({activePersonId:id});},
    create:(name:string)=>{if(!writable)throw new Error('El guardado de tu cuenta no está disponible');if(workspace.people.length>=250)throw new Error('Has alcanzado el límite de 250 fichas');if(!name.trim())throw new Error('Escribe un nombre o alias');const p=newPerson(name);update({people:[...workspace.people,p],activePersonId:p.id});return p.id;},
    saveDetails:(id:string,details:PersonDetails)=>edit(id,generation,p=>({...p,...details,name:details.name.trim().slice(0,80)||p.name})),
    archive:(id:string,archived:boolean)=>{if(!writable||epoch!==generation)return;const next=editPerson(workspace,id,p=>({...p,archived}));replace({...next,activePersonId:archived&&next.activePersonId===id?null:next.activePersonId});},
    setSimulator:(inputs:Inputs)=>edit(active?.id??null,generation,p=>({...p,simulator:inputs})),
    movePortfolio:(to:string,portfolioId:string)=>{if(!writable||!active||epoch!==generation)return;replace(movePortfolio(workspace,active.id,to,portfolioId));},
    moveFinances:(to:string)=>{if(!writable||!active||epoch!==generation)return;replace(moveLegacyFinances(workspace,active.id,to));},
  };
}
export function useInterviews(){
  const {workspace:w,status:s,epoch:generation}=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  const person=w.people.find(p=>p.id===w.activePersonId&&!p.archived);
  const change=(fn:(p:Person)=>Person)=>edit(person?.id??null,generation,fn);
  const editInterview=(id:string,fn:(i:Interview)=>Interview)=>change(p=>({...p,interviews:p.interviews.map(i=>i.id===id?fn(i):i)}));
  return {...s,saveNow:persist,isCurrent:(id:string)=>epoch===generation&&workspace.activePersonId===person?.id&&workspace.people.find(p=>p.id===person?.id)?.activeInterviewId===id,current:(id:string)=>workspace.people.find(p=>p.id===person?.id)?.interviews.find(i=>i.id===id),writable:writable&&!!person,personName:person?.name??'',interviews:person?.interviews??[],active:person?.interviews.find(i=>i.id===person.activeInterviewId)??null,portfolios:person?.portfolios??[],
    select:(id:string)=>change(p=>p.interviews.some(i=>i.id===id)?{...p,activeInterviewId:id}:p),
    create:()=>{if(!writable||!person)throw new Error('Selecciona una persona');const current=workspace.people.find(p=>p.id===person.id);if(!current||current.interviews.length>=100)throw new Error('Has alcanzado el límite de 100 entrevistas por persona');const now=Date.now();const i:Interview={id:crypto.randomUUID(),alias:(person.name+' · '+new Date(now).toLocaleDateString('es-ES')).slice(0,80),createdAt:now,updatedAt:now,step:0,revision:0,rulesVersion:1,answers:{}};change(p=>({...p,interviews:[...p.interviews,i],activeInterviewId:i.id}));return i.id;},
    rename:(id:string,alias:string)=>editInterview(id,i=>({...i,alias:alias.trim().slice(0,80)||i.alias,updatedAt:Date.now()})),
    setStep:(id:string,step:number)=>editInterview(id,i=>({...i,step})),
    answer:(id:string,key:string,value:Answer|undefined)=>editInterview(id,i=>changeInterviewAnswer(i,key,value)),
    configure:(id:string,value:ProposalSettings)=>editInterview(id,i=>{const proposalSettings=validateProposalSettings(value);return JSON.stringify(proposalSettings)===JSON.stringify(validateProposalSettings(i.proposalSettings))?i:{...i,proposalSettings,revision:i.revision+1,updatedAt:Date.now()};}),
    review:(id:string,adviser:string,notes:string,nextReviewDate:string)=>editInterview(id,i=>reviewInterview(i,adviser,notes,nextReviewDate)),
    remove:(id:string)=>change(p=>{const interviews=p.interviews.filter(i=>i.id!==id);return {...p,interviews,activeInterviewId:p.activeInterviewId===id?interviews[0]?.id??null:p.activeInterviewId};}),
    generate:(id:string)=>{let result='';change(p=>{
      const i=p.interviews.find(item=>item.id===id);if(!i)throw new Error('No se encuentra la entrevista');
      if(i.generated?.planVersion===INTERVIEW_PLAN_VERSION&&i.generated?.revision===i.revision&&i.generated.modelLibraryRevision===(workspace.modelLibraryRevision??0)&&p.portfolios.some(x=>x.id===i.generated?.portfolioId&&samePlanningContext(x.proposal,planningContext(p)))){result=i.generated.portfolioId;return {...p,activeId:result};}
      const plan=buildModelPlan(i.answers,accountModels(workspace.modelPortfolios),i.proposalSettings,planningContext(p));
      if(!plan.canCreate)throw new Error(generationMessage(plan));
      if(p.portfolios.length>=250)throw new Error('Has alcanzado el límite de carteras de esta persona');
      const portfolio=newPortfolio(((plan.kind==='planning'?'Plan de protección · ':plan.kind==='objective'?'Cartera objetivo · ':'Propuesta de inversión · ')+i.alias).slice(0,120),plan.holdings,'Entrevista '+i.id+' · reglas 1 · rev. '+i.revision+' · plan '+INTERVIEW_PLAN_VERSION+' · '+plan.kind);
      portfolio.proposal={...plan.proposal!,interviewId:i.id,revision:i.revision};
      result=portfolio.id;return {...p,portfolios:[...p.portfolios,portfolio],activeId:result,interviews:p.interviews.map(item=>item.id===id?{...item,generated:{portfolioId:result,revision:i.revision,createdAt:Date.now(),kind:plan.kind as 'planning'|'investment'|'objective',planVersion:INTERVIEW_PLAN_VERSION,modelLibraryRevision:workspace.modelLibraryRevision??0}}:item)};
    });if(!result)throw new Error('El guardado de tu cuenta no está disponible');return result;},
  };
}
export function usePortfolios(){
  const {workspace:w,status:s,epoch:generation}=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  const person=w.people.find(p=>p.id===w.activePersonId&&!p.archived);
  const change=(fn:(p:Person)=>Person)=>edit(person?.id??null,generation,fn);
  const active=person?.portfolios.find(p=>p.id===person.activeId)??person?.portfolios[0];
  return {...s,userId:writable&&person?person.id:null,cloudReady:writable&&!!person,syncing:false,saveNow:persist,
    createProposal:(input:PortfolioProposal,name:string,activate=true)=>{let result='';change(p=>{if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');const proposal=validatePortfolioProposal(input);const c=newPortfolio(name.slice(0,120),proposal.positions.map(x=>({assetId:x.assetId,amount:x.amount,meta:{symbol:x.isin,isin:x.isin,name:x.name,kind:'Fondo',currency:'EUR',cls:x.role==='equity'?'equity_dev' as const:x.role==='overnight'?'cash' as const:'bond_gov' as const}})),'Modelo asignado al cliente');c.proposal=proposal;result=c.id;return {...p,portfolios:[...p.portfolios,c],activeId:activate?c.id:p.activeId};});if(!result)throw new Error('El guardado de tu cuenta no está disponible');return result;},
    portfolios:person?.portfolios??[],active,activeId:active?.id??'',
    createOptimizationStudy:(id:string,input:import('../src/lib/optimization').OptimizationStudy)=>{const study=validateOptimizationStudy(input);let result='';change(p=>{
      const source=p.portfolios.find(c=>c.id===id);if(!source)throw new Error('No se encuentra la cartera original');
      const original=source.proposal?.optimization??source.mandate;
      const equityCap=original?.equityCap??source.proposal?.equity,lossLimit=original?.lossLimit??(source.proposal&&source.proposal.amount>0?source.proposal.stressLoss/source.proposal.amount*100:undefined);
      if(equityCap!==undefined&&lossLimit!==undefined){
        const roles=study.input.ids.map(id=>original?.roles[original.ids.indexOf(id)]??source.proposal?.positions.find(p=>p.assetId===id)?.role);
        if(roles.some(r=>!r))throw new Error('Revisa el mandato antes de ampliar el universo');
        const equity=roles.reduce((sum,r,i)=>sum+(r==='equity'?100*study.result.point.weights[i]!:0),0),stress=roles.reduce((sum,r,i)=>sum+ROLE_MODEL[r!].shock*study.result.point.weights[i]!,0);
        if(equity>equityCap+1e-6||stress>lossLimit+1e-6)throw new Error('El estudio supera los límites heredados del cuestionario');
        for(const expected of [{name:'Cuestionario · empresas',coefficients:roles.map(r=>r==='equity'?100:0),max:equityCap},{name:'Cuestionario · escenario severo',coefficients:roles.map(r=>ROLE_MODEL[r!].shock),max:lossLimit}]){
          const actual=study.input.limits?.find(l=>l.name===expected.name);
          if(!actual||actual.max==null||actual.max>expected.max||actual.coefficients.some((v,i)=>Math.abs(v-expected.coefficients[i]!)>1e-9))throw new Error('El estudio no conserva el mandato del cuestionario. Vuelve a calcular.');
        }
      }
      const inherited=source.optimizationStudy?.input;
      for(const l of inherited?.limits??[])if(l.name.startsWith('Cuestionario · ')){
        if(study.input.ids.some(id=>!inherited!.ids.includes(id)))throw new Error('Revisa el mandato antes de ampliar el universo');
        const value=study.input.ids.reduce((s,id,i)=>s+l.coefficients[inherited!.ids.indexOf(id)]!*study.result.point.weights[i]!,0);
        if(l.max!=null&&value>l.max+1e-6||l.min!=null&&value<l.min-1e-6)throw new Error('El estudio supera los límites heredados del cuestionario');
          const actual=study.input.limits?.find(v=>v.name===l.name);
          if(!actual||l.max!=null&&(actual.max==null||actual.max>l.max)||l.min!=null&&(actual.min==null||actual.min<l.min)||actual.coefficients.some((v,i)=>Math.abs(v-l.coefficients[inherited!.ids.indexOf(study.input.ids[i]!)]!)>1e-9))throw new Error('El estudio no conserva los límites heredados. Vuelve a calcular.');
      }
      if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');
      const total=source.holdings.reduce((s,h)=>s+h.amount,0);if(!(total>0))throw new Error('El estudio necesita capital positivo');
      if(study.capital!==undefined&&Math.abs(study.capital-total)>Math.max(1e-6,total*1e-9))throw new Error('El capital cambió después del cálculo. Vuelve a calcular con los importes actuales.');
      if(study.input.ids.some((id,i)=>Math.abs(study.input.currentWeights[i]!-(source.holdings.find(h=>h.assetId===id)?.amount??0)/total)>1e-7))throw new Error('La composición cambió después del cálculo. Vuelve a calcular.');
      const previous=p.portfolios.find(c=>c.optimizationStudy?.createdAt===study.createdAt&&JSON.stringify(c.optimizationStudy.input)===JSON.stringify(study.input)&&c.optimizationStudy.capital===total);if(previous){result=previous.id;return {...p,activeId:result};}
      const holdings=study.input.ids.map((assetId,i)=>{const h=source.holdings.find(h=>h.assetId===assetId);if(!h)throw new Error('El universo del estudio ha cambiado');return {...h,amount:Math.max(0,study.result.point.weights[i]!)*total};});
      const c=newPortfolio(('Estudio · '+source.name).slice(0,120),holdings,'Optimización continua · sin operaciones ejecutadas');c.mode='draft';c.optimizationStudy=structuredClone({...study,capital:total,...(source.proposal?.kind==='objective'||source.optimizationStudy?.unfundedObjective?{unfundedObjective:true}:{})});if(source.modelStudy)c.modelStudy=structuredClone(source.modelStudy);
      const mandate=source.proposal?.optimization??source.mandate;if(mandate)c.mandate=structuredClone(mandate);
      if(source.proposal?.kind==='objective')c.modelStudy={id:source.id,name:'Estudio de un objetivo aún sin financiar',reasons:['El capital utilizado es un objetivo patrimonial y no un saldo disponible.','Esta versión es un estudio matemático; requiere revisión del profesional.']};
      const sourceHistory=p.histories?.find(h=>h.portfolioId===source.id),targetIds=c.holdings.filter(h=>h.amount>0).map(h=>h.assetId);
      const history=sourceHistory&&p.histories!.length<20&&targetIds.every(id=>sourceHistory.columns.includes(id))?validateHistory({...sourceHistory,portfolioId:c.id,columns:targetIds,rows:sourceHistory.rows.map(r=>({month:r.month,returns:targetIds.map(id=>r.returns[sourceHistory.columns.indexOf(id)]!)}))}):null;
      result=c.id;return {...p,portfolios:[...p.portfolios,c],activeId:c.id,...(history?{histories:[...(p.histories??[]),history]}:{})};
    });if(!result)throw new Error('El guardado de la cuenta no está disponible');return result;},
    createProposalVersion:(id:string,input:PortfolioProposal,name?:string)=>{let result='';change(p=>{const original=p.portfolios.find(c=>c.id===id);if(!original?.proposal)throw new Error('No se encuentra la propuesta original');if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');const proposal=validatePortfolioProposal(input);const c=newPortfolio((name??('Optimización · '+original.name)).slice(0,120),proposal.positions.map(x=>({assetId:x.assetId,amount:x.amount,meta:{symbol:x.isin,isin:x.isin,name:x.name,kind:'Fondo / ETF',currency:'EUR',cls:x.role==='equity'?'equity_dev' as const:x.role==='overnight'?'cash' as const:'bond_gov' as const}})),'Versión de optimización');c.proposal=proposal;result=c.id;return {...p,portfolios:[...p.portfolios,c],activeId:c.id};});return result;},
    recordValuation:(id:string,value:Valuation)=>change(p=>({...p,portfolios:p.portfolios.map(c=>c.id===id?recordValuation(c,value):c)})),
    registerInvestment:(id:string,fromCash:boolean,date=localDay())=>{let result='';change(p=>{const c=p.portfolios.find(c=>c.id===id);if(!c||!c.holdings.length||c.holdings.some(h=>h.assetId==='interview-cash-pending'))throw new Error('La cartera necesita productos y capital');const total=c.holdings.reduce((s,h)=>s+h.amount,0);if(!(total>0))throw new Error('El capital debe ser positivo');if(c.tracking)throw new Error('Esta cartera ya tiene seguimiento');if(fromCash&&p.profile.cash<total)throw new Error('No hay suficiente liquidez registrada para el traspaso');if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');const account=c.proposal?newPortfolio(('Inversión · '+c.name).slice(0,120),structuredClone(c.holdings),'Registro de inversión realizada'):{...c};delete account.mode;account.tracking=validateTracking({valuations:[{date,value:total,netFlow:0,note:'Saldo inicial declarado por el asesor'}]});if(c.proposal?.optimization)account.mandate=structuredClone(c.proposal.optimization);result=account.id;return {...p,profile:{...p.profile,cash:p.profile.cash-(fromCash?total:0)},portfolios:c.proposal?[...p.portfolios,account]:p.portfolios.map(x=>x.id===id?account:x),activeId:account.id};});return result;},
    setActiveId:(id:string)=>change(p=>p.portfolios.some(x=>x.id===id)?{...p,activeId:id}:p),
    create:(name:string,holdings:Holding[]=[],origin?:string,modelStudy?:{id:string;name:string;reasons:string[]},activate=true)=>{const portfolio=newPortfolio(name,holdings,origin);portfolio.mode='draft';if(modelStudy)portfolio.modelStudy=modelStudy;change(p=>{if(p.portfolios.length>=250)throw new Error('Límite de 250 carteras por persona');return {...p,portfolios:[...p.portfolios,portfolio],activeId:activate?portfolio.id:p.activeId};});return portfolio;},
    remove:(id:string)=>change(p=>{if(!p.portfolios.some(x=>x.id===id))return p;const rest=p.portfolios.filter(x=>x.id!==id);const next=rest.length?rest:[newPortfolio()];return {...p,portfolios:next,activeId:next.some(x=>x.id===p.activeId)?p.activeId:next[0]!.id,...(p.histories?{histories:p.histories.filter(h=>h.portfolioId!==id)}:{}),interviews:p.interviews.map(i=>{if(i.generated?.portfolioId!==id)return i;const copy={...i};delete copy.generated;return copy;})};}),
    rename:(id:string,name:string)=>change(p=>({...p,portfolios:p.portfolios.map(x=>x.id===id?{...x,name:name.trim().slice(0,120)||x.name}:x)})),
    setHoldings:(id:string,holdings:Holding[])=>change(p=>({...p,portfolios:p.portfolios.map(x=>x.id===id&&!x.proposal&&!x.tracking?{...x,holdings}:x)})),
    setPlanningRole:(id:string,assetId:string,role:ProductRole|null)=>{
      if(role!==null&&!Object.hasOwn(ROLE_LABELS,role))throw new Error('Selecciona un bloque de planificación válido');
      if(!writable||!person)throw new Error('El guardado de tu cuenta no está disponible');
      change(p=>{const c=p.portfolios.find(c=>c.id===id),holding=c?.holdings.find(h=>h.assetId===assetId);
        if(!c||!holding)throw new Error('No se encuentra esta posición');
        if(holdingProduct(holding)||c.proposal||c.mandate||c.optimizationStudy?.input.limits?.some(l=>l.name.startsWith('Cuestionario · ')))throw new Error('Esta exposición ya está identificada por el catálogo o el cuestionario');
        return {...p,portfolios:p.portfolios.map(x=>x.id===id?{...x,holdings:x.holdings.map(h=>{if(h.assetId!==assetId)return h;const next={...h};if(role===null)delete next.planningRole;else next.planningRole=role;return next;})}:x)};
      });
    },
    addAsset:(id:string,assetId:string,amount:number,meta?:Holding['meta'])=>change(p=>({...p,portfolios:p.portfolios.map(x=>{if(x.id!==id||x.proposal||x.tracking)return x;const exists=x.holdings.some(h=>h.assetId===assetId);return {...x,holdings:exists?x.holdings.map(h=>h.assetId===assetId?{...h,amount:h.amount+amount}:h):[...x.holdings,{assetId,amount,...(meta?{meta}:{})}]};})})),
    profile:person?.profile??DEFAULT_PROFILE,setProfile:(profile:WealthProfile)=>change(p=>({...p,profile})),
    mortgage:person?.mortgage??DEFAULT_MORTGAGE,setMortgage:(mortgage:MortgageProfile)=>change(p=>({...p,mortgage})),
    settings:person?.settings??DEFAULT_SETTINGS,setSettings:(settings:WealthSettings)=>change(p=>({...p,settings})),
    selectedModules:w.selectedModules,setSelectedModules:(selectedModules:number[])=>update({selectedModules}),
  };
}
