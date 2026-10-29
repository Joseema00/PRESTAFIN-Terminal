import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { newPerson, editPerson, movePortfolio, moveLegacyFinances, DEFAULT_SETTINGS, DEFAULT_MORTGAGE, initialSimulation } from '../../desktop-runtime/people.mjs';
import { validateWorkspace, WorkspaceStore } from '../workspace.mjs';

const interview=(id,alias='Alex')=>({id,alias,createdAt:100,updatedAt:200,step:0,revision:0,rulesVersion:1,answers:{}});
const portfolio=(id,extra={})=>({id,name:id,holdings:[{assetId:'VWCE',amount:1250}],createdAt:100,...extra});
const old=()=>({version:1,portfolios:[portfolio('general'),portfolio('i-a',{origin:'Entrevista a · reglas 1 · rev. 0'}),portfolio('i-b')],activeId:'general',profile:{cash:5000,otherAssets:9000,monthlyContribution:300},mortgage:{...DEFAULT_MORTGAGE,principal:90000},settings:{...DEFAULT_SETTINGS},selectedModules:[3,8],interviews:[interview('a'),{...interview('b'),generated:{portfolioId:'i-b',revision:0,createdAt:200}}],activeInterviewId:'b'});
const current=()=>{const a=newPerson('Ana'),b=newPerson('Beatriz');return {version:2,people:[a,b],activePersonId:a.id,selectedModules:[]};};

test('migration preserves all balances and assigns only explicitly linked portfolios',()=>{
  const legacy=old(),data=validateWorkspace(legacy),unassigned=data.people.find(p=>p.legacy),a=data.people.find(p=>p.interviews[0]?.id==='a'),b=data.people.find(p=>p.interviews[0]?.id==='b');
  assert.deepEqual(unassigned.profile,legacy.profile);assert.deepEqual(unassigned.mortgage,legacy.mortgage);assert.deepEqual(unassigned.settings,legacy.settings);assert.equal(unassigned.portfolios[0].id,'general');
  assert.equal(a.portfolios[0].id,'i-a');assert.equal(b.portfolios[0].id,'i-b');assert.deepEqual(a.interviews[0],legacy.interviews[0]);assert.deepEqual(b.interviews[0],legacy.interviews[1]);assert.equal(data.activePersonId,b.id);assert.deepEqual(data.selectedModules,[3,8]);
  assert.equal(a.name,b.name);assert.notEqual(a.id,b.id);assert.equal(a.mortgage.principal,0);assert.equal(b.profile.cash,0);
  assert.deepEqual(validateWorkspace(legacy),data);assert.deepEqual(validateWorkspace(data),data);
  assert.equal(data.people.flatMap(p=>p.portfolios).reduce((s,p)=>s+p.holdings.reduce((n,h)=>n+h.amount,0),0),3750);
});
test('migration retains settings and interviews without inventing ownership from matching names',()=>{
  const legacy=old();legacy.portfolios=[portfolio('general')];legacy.activeId='general';legacy.interviews[1].generated=undefined;
  const data=validateWorkspace(legacy);assert.equal(data.people.length,3);assert.equal(data.people[0].portfolios[0].id,'general');
  for(const p of data.people.slice(1)){assert.equal(p.portfolios[0].holdings.length,0);assert.equal(p.interviews.length,1);}
  assert.deepEqual(validateWorkspace(legacy),data);
});
test('ambiguous legacy links remain unassigned instead of connecting two people',()=>{
  const legacy=old();for(const i of legacy.interviews)i.generated={portfolioId:'general',revision:0,createdAt:200};
  const data=validateWorkspace(legacy);assert.ok(data.people.find(p=>p.legacy).portfolios.some(p=>p.id==='general'));
  for(const p of data.people)for(const i of p.interviews)assert.notEqual(i.generated?.portfolioId,'general');
});
test('editing one dossier cannot alter the other person or their active portfolio',()=>{
  const original=current(),a=original.people[0],b=original.people[1];
  const changed=editPerson(original,a.id,p=>({...p,name:'Ana nueva',mortgage:{...p.mortgage,principal:40000},profile:{...p.profile,cash:400},notes:'Próxima reunión',interviews:[interview('one')],activeInterviewId:'one'}));
  assert.deepEqual(changed.people[1],b);assert.equal(original.people[0].mortgage.principal,0);assert.equal(changed.people[0].mortgage.principal,40000);
  assert.strictEqual(editPerson(original,'unknown',()=>{throw new Error('Must not edit');}),original);
  assert.equal(editPerson(original,a.id,p=>({...p,id:b.id})).people[0].id,a.id);
});
test('native validation rejects cross-person references, duplicate identities and invalid simulations',()=>{
  const data=current(),[a,b]=data.people;
  assert.throws(()=>validateWorkspace({...data,people:[a,a]}));
  assert.throws(()=>validateWorkspace({...data,people:[a,{...b,portfolios:a.portfolios,activeId:a.activeId}]}));
  assert.throws(()=>validateWorkspace({...data,people:[{...a,interviews:[{...interview('test'),generated:{portfolioId:b.activeId,revision:0,createdAt:200}}]},b]}),/otra persona/);
  assert.throws(()=>validateWorkspace({...data,people:[{...a,activeId:b.activeId},b]}));
  assert.throws(()=>validateWorkspace({...data,people:[{...a,activeInterviewId:'none'},b]}));
  assert.throws(()=>validateWorkspace({...data,people:[{...a,simulator:{...initialSimulation(a),currentSavings:-1}},b]}));
  assert.throws(()=>validateWorkspace({...data,people:[{...a,notes:'x'.repeat(6001)},b]}));
  assert.throws(()=>validateWorkspace({...data,people:[{...a,archived:true},b]}));
  const i=interview('duplicate');assert.throws(()=>validateWorkspace({...data,people:[{...a,interviews:[i]},{...b,interviews:[i]}]}));
});
test('portfolio transfer is atomic, preserves holdings, and repairs the source active selection',()=>{
  const data=current(),[a,b]=data.people;a.portfolios[0].holdings=[{assetId:'VWCE',amount:2000}];
  const moved=movePortfolio(data,a.id,b.id,a.activeId);assert.equal(moved.people[0].portfolios.length,1);assert.equal(moved.people[0].portfolios[0].holdings.length,0);
  assert.equal(moved.people[1].activeId,a.activeId);assert.deepEqual(moved.people[1].portfolios[1],a.portfolios[0]);assert.equal(data.people[0].portfolios[0].holdings[0].amount,2000);
  assert.deepEqual(validateWorkspace(moved),moved);
  assert.throws(()=>movePortfolio(moved,a.id,b.id,a.activeId));assert.throws(()=>movePortfolio(data,a.id,a.id,a.activeId));
  a.interviews=[{...interview('linked'),generated:{portfolioId:a.activeId,revision:0,createdAt:200}}];assert.throws(()=>movePortfolio(data,a.id,b.id,a.activeId),/vinculada/);
});
test('assigning legacy finances preserves the total and never overwrites existing destination data',()=>{
  const data=current(),[a,b]=data.people;a.legacy=true;a.mortgage.principal=80000;a.profile.cash=12345;a.simulator=initialSimulation(a);
  const moved=moveLegacyFinances(data,a.id,b.id);assert.equal(moved.people[0].profile.cash,0);assert.equal(moved.people[1].profile.cash,12345);assert.equal(moved.people[1].mortgage.principal,80000);assert.equal(moved.people[1].simulator.principal,80000);assert.deepEqual(validateWorkspace(moved),moved);
  assert.throws(()=>moveLegacyFinances(moved,a.id,b.id),/sobrescribirán/);
  for(const field of ['profile','mortgage','settings','simulator']){const copy=structuredClone(data);if(field==='profile')copy.people[1].profile.cash=1;if(field==='mortgage')copy.people[1].mortgage.rate=4;if(field==='settings')copy.people[1].settings.taxRate=21;if(field==='simulator')copy.people[1].simulator=initialSimulation(b);assert.throws(()=>moveLegacyFinances(copy,a.id,b.id),/sobrescribirán/);}
});
test('all personal data including archive and simulation survive saving, reopening and backup roundtrip',async()=>{
  const data=current();data.people[0].notes='Revisar en noviembre';data.people[0].email='persona@example.test';data.people[0].reference='EXP-001';data.people[0].simulator={...initialSimulation(data.people[0]),monthlySavings:120};data.people[1].archived=true;
  const root=path.resolve('.test-tmp');await mkdir(root,{recursive:true});const dir=await mkdtemp(path.join(root,'prestafin-people-'));
  try{const store=new WorkspaceStore(dir);await store.save(data);const read=await new WorkspaceStore(dir).load();assert.deepEqual(read,data);assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(read))),data);assert.equal(read.people[1].archived,true);}
  finally{assert.equal(path.dirname(path.resolve(dir)),root);assert.ok(path.basename(dir).startsWith('prestafin-people-'));await rm(dir,{recursive:true,force:true});}
});
