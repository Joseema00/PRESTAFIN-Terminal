import { validatePortfolioProposal,type PortfolioProposal } from '../src/lib/portfolio-proposal';
import { captureWealth,recordValuation,validateTracking,localDay,type Valuation } from '../src/lib/portfolio-monitor';
import { validateProposalSettings,type ProposalSettings } from '../src/lib/investment-products';
import { useSyncExternalStore } from 'react';
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
let status={hydrated:false,saving:false,dirty:false,savedAt:null as number|null,saveError:null as string|null};
let revision=0;
let pending:Promise<unknown>=Promise.resolve();
let writable=false;
let epoch=0;
const listeners=new Set<()=>void>();
let snapshot={workspace,status,epoch};
function publish(){snapshot={workspace,status:{...status},epoch};listeners.forEach(fn=>fn());}
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
const getSnapshot=()=>snapshot;

export async function initializeWorkspace(){
  try{
    if(!window.prestafin)throw new Error('Abre Prestafin con el acceso de escritorio. El navegador no tiene acceso al guardado local.');
    const data=await window.prestafin.loadWorkspace();
    if(data)workspace=data;
    writable=true;status={...status,hydrated:true};publish();
    if(!data)await persist();
  }catch(error){status={...status,hydrated:true,saveError:error instanceof Error?error.message:'Error al abrir los datos'};publish();}
}
function persist(){
  if(!writable||!window.prestafin)return Promise.resolve({ok:false,error:'Guardado bloqueado hasta recuperar los datos'});
  const currentRevision=++revision;const data=structuredClone(workspace);
  status={...status,saving:true,dirty:true,saveError:null};publish();
  const operation=(async()=>{try{
    const saved=await window.prestafin!.saveWorkspace(data);
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
  const data=await window.prestafin?.importWorkspace();if(!data)return false;
  workspace=data;epoch++;writable=true;status={...status,hydrated:true,dirty:false,saveError:null,savedAt:Date.now()};publish();return true;
}
export async function exportWorkspace(){await pending;if(status.dirty||status.saveError)throw new Error('Guarda los cambios antes de exportar');return window.prestafin?.exportWorkspace();}

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
    create:(name:string)=>{if(!writable)throw new Error('El guardado local no está disponible');if(workspace.people.length>=250)throw new Error('Has alcanzado el límite de 250 fichas');if(!name.trim())throw new Error('Escribe un nombre o alias');const p=newPerson(name);update({people:[...workspace.people,p],activePersonId:p.id});return p.id;},
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
      if(i.generated?.planVersion===INTERVIEW_PLAN_VERSION&&i.generated?.revision===i.revision&&p.portfolios.some(x=>x.id===i.generated?.portfolioId)){result=i.generated.portfolioId;return {...p,activeId:result};}
      const plan=buildInterviewPlan(i.answers,i.proposalSettings);
      if(!plan.canCreate)throw new Error(generationMessage(plan));
      if(p.portfolios.length>=250)throw new Error('Has alcanzado el límite de carteras de esta persona');
      const portfolio=newPortfolio(((plan.kind==='planning'?'Plan de protección · ':plan.kind==='objective'?'Cartera objetivo · ':'Propuesta de inversión · ')+i.alias).slice(0,120),plan.holdings,'Entrevista '+i.id+' · reglas 1 · rev. '+i.revision+' · plan '+INTERVIEW_PLAN_VERSION+' · '+plan.kind);
      portfolio.proposal={...plan.proposal!,interviewId:i.id,revision:i.revision};
      result=portfolio.id;return {...p,portfolios:[...p.portfolios,portfolio],activeId:result,interviews:p.interviews.map(item=>item.id===id?{...item,generated:{portfolioId:result,revision:i.revision,createdAt:Date.now(),kind:plan.kind as 'planning'|'investment'|'objective',planVersion:INTERVIEW_PLAN_VERSION as 4}}:item)};
    });if(!result)throw new Error('El guardado local no está disponible');return result;},
  };
}
export function usePortfolios(){
  const {workspace:w,status:s,epoch:generation}=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  const person=w.people.find(p=>p.id===w.activePersonId&&!p.archived);
  const change=(fn:(p:Person)=>Person)=>edit(person?.id??null,generation,fn);
  const active=person?.portfolios.find(p=>p.id===person.activeId)??person?.portfolios[0];
  return {...s,userId:writable&&person?person.id:null,cloudReady:writable&&!!person,syncing:false,saveNow:persist,
    portfolios:person?.portfolios??[],active,activeId:active?.id??'',
    createProposalVersion:(id:string,input:PortfolioProposal,name?:string)=>{let result='';change(p=>{const original=p.portfolios.find(c=>c.id===id);if(!original?.proposal)throw new Error('No se encuentra la propuesta original');if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');const proposal=validatePortfolioProposal(input);const c=newPortfolio((name??('Optimización · '+original.name)).slice(0,120),proposal.positions.map(x=>({assetId:x.assetId,amount:x.amount,meta:{symbol:x.isin,isin:x.isin,name:x.name,kind:'Fondo / ETF',currency:'EUR'}})),'Versión de optimización');c.proposal=proposal;result=c.id;return {...p,portfolios:[...p.portfolios,c],activeId:c.id};});return result;},
    recordValuation:(id:string,value:Valuation)=>change(p=>({...p,portfolios:p.portfolios.map(c=>c.id===id?recordValuation(c,value):c)})),
    registerInvestment:(id:string,fromCash:boolean,date=localDay())=>{let result='';change(p=>{const c=p.portfolios.find(c=>c.id===id);if(!c||!c.holdings.length||c.holdings.some(h=>h.assetId==='interview-cash-pending'))throw new Error('La cartera necesita productos y capital');const total=c.holdings.reduce((s,h)=>s+h.amount,0);if(!(total>0))throw new Error('El capital debe ser positivo');if(c.tracking)throw new Error('Esta cartera ya tiene seguimiento');if(fromCash&&p.profile.cash<total)throw new Error('No hay suficiente liquidez registrada para el traspaso');if(p.portfolios.length>=250)throw new Error('Límite de carteras alcanzado');const account=c.proposal?newPortfolio(('Inversión · '+c.name).slice(0,120),structuredClone(c.holdings),'Registro de inversión realizada'):{...c};delete account.mode;account.tracking=validateTracking({valuations:[{date,value:total,netFlow:0,note:'Saldo inicial declarado por el asesor'}]});if(c.proposal?.optimization)account.mandate=structuredClone(c.proposal.optimization);result=account.id;return {...p,profile:{...p.profile,cash:p.profile.cash-(fromCash?total:0)},portfolios:c.proposal?[...p.portfolios,account]:p.portfolios.map(x=>x.id===id?account:x),activeId:account.id};});return result;},
    setActiveId:(id:string)=>change(p=>p.portfolios.some(x=>x.id===id)?{...p,activeId:id}:p),
    create:(name:string,holdings:Holding[]=[],origin?:string)=>{const portfolio=newPortfolio(name,holdings,origin);portfolio.mode='draft';change(p=>{if(p.portfolios.length>=250)throw new Error('Límite de 250 carteras por persona');return {...p,portfolios:[...p.portfolios,portfolio],activeId:portfolio.id};});return portfolio;},
    remove:(id:string)=>change(p=>{const rest=p.portfolios.filter(x=>x.id!==id);const next=rest.length?rest:[newPortfolio()];return {...p,portfolios:next,activeId:next.some(x=>x.id===p.activeId)?p.activeId:next[0]!.id};}),
    rename:(id:string,name:string)=>change(p=>({...p,portfolios:p.portfolios.map(x=>x.id===id?{...x,name:name.trim().slice(0,120)||x.name}:x)})),
    setHoldings:(id:string,holdings:Holding[])=>change(p=>({...p,portfolios:p.portfolios.map(x=>x.id===id&&!x.proposal&&!x.tracking?{...x,holdings}:x)})),
    addAsset:(id:string,assetId:string,amount:number,meta?:Holding['meta'])=>change(p=>({...p,portfolios:p.portfolios.map(x=>{if(x.id!==id||x.proposal||x.tracking)return x;const exists=x.holdings.some(h=>h.assetId===assetId);return {...x,holdings:exists?x.holdings.map(h=>h.assetId===assetId?{...h,amount:h.amount+amount}:h):[...x.holdings,{assetId,amount,...(meta?{meta}:{})}]};})})),
    profile:person?.profile??DEFAULT_PROFILE,setProfile:(profile:WealthProfile)=>change(p=>({...p,profile})),
    mortgage:person?.mortgage??DEFAULT_MORTGAGE,setMortgage:(mortgage:MortgageProfile)=>change(p=>({...p,mortgage})),
    settings:person?.settings??DEFAULT_SETTINGS,setSettings:(settings:WealthSettings)=>change(p=>({...p,settings})),
    selectedModules:w.selectedModules,setSelectedModules:(selectedModules:number[])=>update({selectedModules}),
  };
}
