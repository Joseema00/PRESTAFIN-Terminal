import { captureWealth, personWealth, type WealthSnapshot } from './portfolio-monitor';
import type { Holding, Portfolio } from './portfolio';
import type { Interview } from './risk-profile';
import type { Inputs } from './finance';
import type { HistoricalData } from './professional-analysis';
import type { AdviserSettings, ReportPreferences } from './adviser';

export type WealthProfile = { cash:number; otherAssets:number; monthlyContribution:number };
export type WealthSettings = { contribGrowth:number; inflation:number; taxRate:number; expenses:number; share:number; realTerms:boolean };
export type MortgageProfile = { principal:number; rate:number; years:number; extraMonthly:number };
export const DEFAULT_PROFILE:WealthProfile = {cash:0,otherAssets:0,monthlyContribution:0};
export const DEFAULT_SETTINGS:WealthSettings = {contribGrowth:2,inflation:2.5,taxRate:20,expenses:0,share:0,realTerms:false};
export const DEFAULT_MORTGAGE:MortgageProfile = {principal:0,rate:3.1,years:25,extraMonthly:0};
export type Dossier = { portfolios:Portfolio[]; activeId:string; profile:WealthProfile; settings:WealthSettings; mortgage:MortgageProfile; interviews:Interview[]; activeInterviewId:string|null };
export type Person = Dossier & { id:string; name:string; email:string; phone:string; reference:string; notes:string; createdAt:number; updatedAt:number; archived:boolean; legacy:boolean; simulator:Inputs|null; reportPreferences?:ReportPreferences; histories?:HistoricalData[]; wealthHistory?:WealthSnapshot[] };
export type Workspace = { version:2; people:Person[]; activePersonId:string|null; selectedModules:number[]; adviser?:AdviserSettings };
export type LegacyWorkspace = Dossier & { version:1; selectedModules:number[] };
export type PersonDetails = Pick<Person,'name'|'email'|'phone'|'reference'|'notes'>;

export const newPortfolio = (name='Cartera principal',holdings:Holding[]=[],origin?:string):Portfolio => ({id:crypto.randomUUID(),name,holdings,createdAt:Date.now(),...(origin ? {origin} : {})});
export function newPerson(name:string):Person {
  const portfolio=newPortfolio(); const now=Date.now();
  return {id:crypto.randomUUID(),name:name.trim().slice(0,80)||'Sin nombre',email:'',phone:'',reference:'',notes:'',createdAt:now,updatedAt:now,archived:false,legacy:false,simulator:null,
    portfolios:[portfolio],activeId:portfolio.id,profile:{...DEFAULT_PROFILE},settings:{...DEFAULT_SETTINGS},mortgage:{...DEFAULT_MORTGAGE},interviews:[],activeInterviewId:null};
}
export const emptyWorkspace = ():Workspace => ({version:2,people:[],activePersonId:null,selectedModules:[]});

// Migration uses explicit links only. Equal names are not evidence of equal ownership.
export function migrateLegacy(old:LegacyWorkspace):Workspace {
  const usedIds=new Set(old.portfolios.map(p=>p.id));let nextEmpty=0;
  const blankPortfolio=(createdAt:number)=>{let id:string;do{id='migration-empty-'+nextEmpty++;}while(usedIds.has(id));usedIds.add(id);return {id,name:'Cartera principal',holdings:[],createdAt};};
  const base=newPerson('Datos anteriores'); base.legacy=true;
  base.id='legacy-workspace'; base.notes='Patrimonio, préstamo y carteras sin propietario identificado de la versión anterior. Puedes renombrar esta ficha o asignar sus datos desde el resumen.';
  base.profile={...old.profile};base.settings={...old.settings};base.mortgage={...old.mortgage};
  base.createdAt=Math.min(...old.portfolios.map(p=>p.createdAt));base.updatedAt=base.createdAt;
  base.portfolios=[blankPortfolio(base.createdAt)];base.activeId=base.portfolios[0]!.id;
  const owners=new Map<string,string>();
  for(const p of old.portfolios) {
    const matches=old.interviews.filter(i=>i.generated?.portfolioId===p.id || p.origin?.startsWith('Entrevista '+i.id+' '));
    if(matches.length===1)owners.set(p.id,matches[0]!.id);
  }
  const people=old.interviews.map(i=>{
    const person=newPerson(i.alias); person.id='person-'+i.id;person.createdAt=i.createdAt;person.updatedAt=i.updatedAt;
    person.portfolios=[blankPortfolio(i.createdAt)];person.activeId=person.portfolios[0]!.id;
    person.interviews=[{...i}];person.activeInterviewId=i.id;
    const portfolios=old.portfolios.filter(p=>owners.get(p.id)===i.id);
    if(portfolios.length) {person.portfolios=portfolios;person.activeId=portfolios.find(p=>p.id===i.generated?.portfolioId)?.id ?? portfolios[0]!.id;}
    return person;
  });
  // Ambiguous links remain with the original data, without attaching someone else's portfolio.
  for(const person of people) for(const i of person.interviews) if(i.generated && old.portfolios.some(p=>p.id===i.generated!.portfolioId) && owners.get(i.generated.portfolioId)!==i.id) delete i.generated;
  const remaining=old.portfolios.filter(p=>!owners.has(p.id));
  if(remaining.length){base.portfolios=remaining;base.activeId=remaining.some(p=>p.id===old.activeId)?old.activeId:remaining[0]!.id;}
  // Always preserve the previous workspace settings, even when balances are zero.
  people.unshift(base);
  return {version:2,people,activePersonId:people.find(p=>p.activeInterviewId===old.activeInterviewId && old.activeInterviewId!==null)?.id ?? people[0]?.id ?? null,selectedModules:old.selectedModules};
}

export function editPerson(workspace:Workspace,id:string,edit:(person:Person)=>Person):Workspace {
  if(!workspace.people.some(p=>p.id===id))return workspace;
  return {...workspace,people:workspace.people.map(p=>{if(p.id!==id)return p;let next={...edit(p),id:p.id,updatedAt:Date.now()};const before=personWealth(p),after=personWealth(next);if(!p.wealthHistory?.length||['investments','cash','otherAssets','debt'].some(k=>before[k as 'cash']!==after[k as 'cash']))next=captureWealth(next);return next;})};
}

export function movePortfolio(workspace:Workspace,fromId:string,toId:string,portfolioId:string):Workspace {
  const source=workspace.people.find(p=>p.id===fromId), target=workspace.people.find(p=>p.id===toId);
  if(!source || !target || fromId===toId || target.archived)throw new Error('Elige otra persona activa');
  const portfolio=source.portfolios.find(p=>p.id===portfolioId);
  if(!portfolio)throw new Error('La cartera ya no está en esta ficha');
  if(source.interviews.some(i=>i.generated?.portfolioId===portfolioId || portfolio.origin?.startsWith('Entrevista '+i.id+' ')))throw new Error('Esta cartera está vinculada a una entrevista. Conserva ambos datos en la misma ficha.');
  if(target.portfolios.length>=250)throw new Error('Esta persona ya tiene 250 carteras');
  const rest=source.portfolios.filter(p=>p.id!==portfolioId);if(!rest.length)rest.push(newPortfolio());
  let result=editPerson(workspace,fromId,p=>({...p,portfolios:rest,activeId:rest.some(x=>x.id===p.activeId)?p.activeId:rest[0]!.id}));
  result=editPerson(result,toId,p=>({...p,portfolios:[...p.portfolios,portfolio],activeId:portfolio.id}));
  return result;
}

export function moveLegacyFinances(workspace:Workspace,fromId:string,toId:string):Workspace {
  const source=workspace.people.find(p=>p.id===fromId),target=workspace.people.find(p=>p.id===toId);
  if(!source?.legacy || !target || fromId===toId || target.archived)throw new Error('Elige una persona activa');
  if(Object.values(target.profile).some(n=>n!==0)||target.mortgage.principal!==0||target.mortgage.extraMonthly!==0||target.simulator!==null||JSON.stringify(target.settings)!==JSON.stringify(DEFAULT_SETTINGS)||JSON.stringify(target.mortgage)!==JSON.stringify(DEFAULT_MORTGAGE))throw new Error('La ficha de destino ya tiene datos patrimoniales. No se sobrescribirán.');
  let result=editPerson(workspace,toId,p=>({...p,profile:source.profile,mortgage:source.mortgage,settings:source.settings,simulator:source.simulator}));
  result=editPerson(result,fromId,p=>({...p,profile:{...DEFAULT_PROFILE},mortgage:{...DEFAULT_MORTGAGE},settings:{...DEFAULT_SETTINGS},simulator:null}));
  return result;
}

export function initialSimulation(person:Person):Inputs {
  return {principal:person.mortgage.principal,annualRate:person.mortgage.rate,years:person.mortgage.years,monthlySavings:person.profile.monthlyContribution,currentSavings:person.profile.cash,expectedReturn:7,inflation:person.settings.inflation,taxRate:person.settings.taxRate};
}
