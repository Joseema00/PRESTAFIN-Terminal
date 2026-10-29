import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { validateWorkspace } from '../workspace.mjs';

// Exercise the actual renderer store with React's server snapshot and a validated
// local persistence bridge. No browser, market request or real user file is used.
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const store=await import('../../desktop-ui/use-portfolios.ts');
let saved=null,imported=null;
globalThis.window={prestafin:{loadWorkspace:async()=>saved,saveWorkspace:async value=>{saved=validateWorkspace(structuredClone(value));return {savedAt:Date.now()};},importWorkspace:async()=>imported,exportWorkspace:async()=>true}};
await store.initializeWorkspace();
function read(){let result;function Capture(){result={people:store.usePeople(),portfolios:store.usePortfolios(),interviews:store.useInterviews()};return null;}renderToString(createElement(Capture));return result;}
async function reset(){imported={version:2,people:[],activePersonId:null,selectedModules:[]};await store.restoreWorkspace();}

test('renderer store keeps loans, holdings, interviews and simulations isolated when switching people',async()=>{
  await reset();read().people.create('Ana');const ana=read();
  ana.portfolios.setMortgage({...ana.portfolios.mortgage,principal:55000});ana.portfolios.setProfile({...ana.portfolios.profile,cash:12000});
  ana.portfolios.addAsset(ana.portfolios.activeId,'VWCE',2000);const ai=read().interviews.create();read().interviews.answer(ai,'initial',3000);
  read().people.setSimulator({principal:55000,annualRate:3,years:15,monthlySavings:100,currentSavings:12000,expectedReturn:5,inflation:2,taxRate:20});
  const anaCallbacks=read();const anaId=ana.people.active.id;
  read().people.create('Beatriz');const bea=read(),beaId=bea.people.active.id;
  assert.equal(bea.portfolios.mortgage.principal,0);assert.equal(bea.portfolios.profile.cash,0);assert.equal(bea.interviews.interviews.length,0);assert.equal(bea.portfolios.active.holdings.length,0);
  bea.portfolios.setMortgage({...bea.portfolios.mortgage,principal:75000});const bi=read().interviews.create();read().interviews.answer(bi,'initial',800);
  // A previously rendered callback is invoked after the person switch.
  anaCallbacks.portfolios.setProfile({...anaCallbacks.portfolios.profile,cash:13000});
  assert.equal(read().people.active.id,beaId);assert.equal(read().portfolios.profile.cash,0);
  // An ID belonging to someone else cannot be selected or edited through this dossier.
  read().portfolios.setActiveId(anaCallbacks.portfolios.activeId);read().portfolios.setHoldings(anaCallbacks.portfolios.activeId,[]);read().interviews.answer(ai,'initial',999);
  assert.equal(read().portfolios.activeId,bea.portfolios.activeId);assert.equal(read().interviews.active.id,bi);
  read().people.select(anaId);const resumed=read();assert.equal(resumed.portfolios.profile.cash,13000);assert.equal(resumed.portfolios.mortgage.principal,55000);assert.equal(resumed.portfolios.active.holdings[0].amount,2000);assert.equal(resumed.interviews.active.answers.initial,3000);assert.equal(resumed.people.active.simulator.monthlySavings,100);
  await resumed.portfolios.saveNow();assert.deepEqual(validateWorkspace(saved),saved);
});

test('archive is reversible and restoring a backup invalidates old editing callbacks',async()=>{
  await reset();read().people.create('Original');const before=read(),id=before.people.active.id;
  before.people.saveDetails(id,{name:'Original',email:'',phone:'',reference:'42',notes:'Conservar'});
  read().people.archive(id,true);assert.equal(read().people.active,null);assert.equal(read().portfolios.portfolios.length,0);assert.equal(read().people.people[0].notes,'Conservar');
  read().people.archive(id,false);read().people.select(id);const stale=read();imported=structuredClone(saved);imported.people[0].profile.cash=99;await store.restoreWorkspace();
  stale.portfolios.setProfile({...stale.portfolios.profile,cash:777});assert.equal(read().portfolios.profile.cash,99);assert.equal(read().people.active.reference,'42');
});

test('generated interview portfolios remain with their person and repeated generation reuses the same revision',async()=>{
  await reset();read().people.create('Inversora');const id=read().interviews.create();
  const answers={goal:'future',horizon:'verylong',flexibility:'flexible',target:0,withdrawals:'none',incomeSource:'salary',income:4000,expenses:1200,debtPayment:300,incomeStability:'stable',dependents:'none',change:'no',debt:'manageable',savings:60000,nearCosts:5000,initial:20000,monthly:300,borrowed:'no',emergency:'reserve',loss10:'add',loss25:'add',sleep:'calm',maxLoss:10000,impact:'limited',past:'held',experience:'funds',frequency:'regular',diversify:'basket',bondKnowledge:'changes',returnKnowledge:'uncertain',inflation:'less',balance:'growth',tradeoff:'growth',guarantee:'accept',restrictions:'none'};
  for(const [key,value]of Object.entries(answers))read().interviews.answer(id,key,value);
  // Generating a draft must not require an unrelated adviser review form.
  assert.equal(read().interviews.active.review,undefined);
  const owner=read().people.active.id,portfolioId=read().interviews.generate(id);assert.equal(read().interviews.generate(id),portfolioId);
  assert.equal(read().portfolios.active.holdings.reduce((s,h)=>s+h.amount,0),20000);
  read().people.create('Otra persona');assert.equal(read().portfolios.portfolios.length,1);assert.equal(read().portfolios.active.holdings.length,0);assert.throws(()=>read().interviews.generate(id),/encuentra/);
  read().people.select(owner);assert.equal(read().portfolios.activeId,portfolioId);assert.equal(read().interviews.active.generated.portfolioId,portfolioId);
  await read().portfolios.saveNow();assert.equal(saved.people.find(p=>p.id===owner).portfolios.length,2);
});

test('old plan version regenerates with saved answers and keeps both audit versions',async()=>{
 const {healthyAnswers}=await import('./fixtures/interview.mjs');
 const {newPerson,emptyWorkspace}=await import('../../desktop-runtime/people.mjs');
 const p=newPerson('Persona de migración'),now=Date.now(),oldId=p.portfolios[0].id;
 p.portfolios[0].holdings=[{assetId:'interview-cash-pending',amount:20000}];
 p.interviews=[{id:'migration-interview',alias:'Entrevista',createdAt:now,updatedAt:now,step:6,revision:35,rulesVersion:1,answers:{...healthyAnswers(),savings:6000},generated:{portfolioId:oldId,revision:35,createdAt:now,kind:'planning',planVersion:2}}];p.activeInterviewId='migration-interview';
 imported={...emptyWorkspace(),people:[p],activePersonId:p.id};await store.restoreWorkspace();
 const id=read().interviews.generate('migration-interview');assert.notEqual(id,oldId);assert.equal(read().portfolios.portfolios.length,2);
 assert.equal(read().interviews.active.generated.planVersion,4);assert.equal(read().portfolios.active.proposal.kind,'objective');
 assert.equal(read().interviews.generate('migration-interview'),id);await read().portfolios.saveNow();
 const before=structuredClone(saved);imported=before;await store.restoreWorkspace();assert.deepEqual(read().portfolios.active.proposal,before.people[0].portfolios.at(-1).proposal);
 assert.equal(read().interviews.active.answers.initial,20000);assert.equal(read().interviews.active.answers.savings,6000);
 read().interviews.configure('migration-interview',{priority:'coverage',variant:'base',excluded:[],fundAccessConfirmed:false});
 const next=read().interviews.generate('migration-interview');assert.notEqual(next,id);assert.equal(read().portfolios.portfolios.length,3);
 assert.ok(read().portfolios.active.proposal.positions.some(x=>x.isin==='IE00B3YLTY66'));
});
