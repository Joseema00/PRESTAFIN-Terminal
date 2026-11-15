import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudWorkspace,CloudWorkspaces} from '../cloud-workspaces.mjs';
import {emptyWorkspace,newPerson} from '../../desktop-runtime/people.mjs';
const owner='a0000000-0000-4000-8000-000000000001',other='b0000000-0000-4000-8000-000000000002';
const workspace=(name)=>{const p=newPerson(name);return {...emptyWorkspace(),people:[p],activePersonId:p.id};};
function service(){
 const rows=new Map(),calls=[];let offline=false,timeout=false;
 function client(id=owner){return {session:{user:{id},access_token:id},config:{supabaseUrl:'https://synthetic.example.test'},run:fn=>fn(),auth:async function(){return this.session;},request:async(_base,route,options)=>{
  calls.push({route,...structuredClone(options)});if(offline)throw new Error('Sin conexión');const key=options.token;
  if(route.startsWith('/rest/v1/terminal_workspaces?'))return rows.has(key)?[structuredClone(rows.get(key))]:[];
  const b=options.body,current=rows.get(key);if(current?.operation===b.p_operation_id){assert.deepEqual(current.data,b.p_data);return {revision:current.revision,updated_at:current.updated_at};}
  if((current?.revision??0)!==b.p_expected_revision)return {conflict:true};
  const next={data:structuredClone(b.p_data),revision:b.p_expected_revision+1,updated_at:new Date().toISOString(),operation:b.p_operation_id};rows.set(key,next);
  if(timeout){timeout=false;throw new Error('Tiempo de espera agotado');}return {revision:next.revision,updated_at:next.updated_at};
 }};}
 return {rows,calls,client,set offline(v){offline=v;},set timeout(v){timeout=v;}};
}
test('cloud workspaces migrate only the signed-in account, preserve the local original and restore on a second device',async()=>{
 const s=service(),old=workspace('Migración sintética');let migrations=0;
 const manager=new CloudWorkspaces({billing:s.client(),local:{get:id=>{assert.equal(id,owner);return {load:async()=>{migrations++;return old;},save:()=>assert.fail('No local writes')};}}});
 assert.throws(()=>manager.get(other),/cuenta/);const first=manager.get(owner);assert.deepEqual(await first.load(),old);assert.equal(migrations,1);
 const next=workspace('Cambio en mi cuenta');await first.save(next);assert.deepEqual(old.people[0].name,'Migración sintética');
 const second=new CloudWorkspace({owner,billing:s.client(),migrate:()=>assert.fail('Cloud data wins')});assert.deepEqual(await second.load(),next);
 const another=new CloudWorkspace({owner:other,billing:s.client(other)});assert.equal(await another.load(),null);assert.ok(s.calls.filter(c=>c.route.includes('terminal_workspaces?')).every(c=>c.route.includes('user_id=eq.')));
});
test('network failure and corrupt cloud data never silently fall back to local data',async()=>{
 const s=service(),store=new CloudWorkspace({owner,billing:s.client(),migrate:()=>assert.fail('Never fallback')});s.offline=true;await assert.rejects(store.load(),/conexión/);
 s.offline=false;s.rows.set(owner,{revision:1,data:{version:2,people:'invalid'}});await assert.rejects(store.load());
 await assert.rejects(store.save(workspace('Blocked')),/Abre los datos/);
 const next=service(),billing=next.client(),loaded=new CloudWorkspace({owner,billing});await loaded.load();billing.auth=async()=>{throw new Error('Sin conexión para renovar sesión');};
 const draft=workspace('Cambios mientras la sesión caduca');await assert.rejects(loaded.save(draft),/renovar sesión/);assert.deepEqual(await loaded.exportValue(),draft);assert.equal(next.rows.size,0);
 billing.session={user:{id:other},access_token:other};await assert.rejects(loaded.exportValue(),/cuenta/);
});

test('personalized client snapshots and private models survive the cloud contract and remain account isolated',async()=>{
 const {buildModelPlan,accountModels}=await import('../../desktop-runtime/account-models.mjs');
 const {planningContext}=await import('../../desktop-runtime/client-plan.mjs');
 const {createInterviewModel}=await import('../../desktop-runtime/interview-model.mjs');
 const {healthyAnswers}=await import('./fixtures/interview.mjs');
 const value=workspace('Cliente sintético de nube'),person=value.people[0];person.profile.cash=60000;
 const plan=buildModelPlan(healthyAnswers(),accountModels(),undefined,planningContext(person));
 person.portfolios[0].holdings=plan.holdings;person.portfolios[0].proposal=plan.proposal;
 const interview={id:'cloud-model-source',alias:'Entrevista sintética',createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1,answers:healthyAnswers()};
 value.modelPortfolios=[createInterviewModel(interview,planningContext(person),'Modelo privado sintético')];value.modelLibraryRevision=1;
 const s=service(),first=new CloudWorkspace({owner,billing:s.client()});await first.load();await first.save(value);
 const second=new CloudWorkspace({owner,billing:s.client()});assert.deepEqual(await second.load(),value);
 const another=new CloudWorkspace({owner:other,billing:s.client(other)});assert.equal(await another.load(),null);
 assert.deepEqual(s.rows.get(owner).data.people[0].portfolios[0].proposal.client,plan.proposal.client);
});
test('lost save responses retry idempotently and stale devices cannot overwrite newer account versions',async()=>{
 const s=service(),a=new CloudWorkspace({owner,billing:s.client()}),b=new CloudWorkspace({owner,billing:s.client()});await a.load();await a.save(workspace('Original'));await b.load();
 const updated=workspace('Guardado aunque se perdió respuesta');s.timeout=true;await assert.rejects(a.save(updated),/espera/);assert.deepEqual(await a.exportValue(),updated);await a.save(updated);assert.equal(s.rows.get(owner).revision,2);
 const draft=workspace('Pendiente en otro equipo');await assert.rejects(b.save(draft),/otro dispositivo/);assert.deepEqual(await b.exportValue(),draft);assert.deepEqual(s.rows.get(owner).data,updated);
 await b.load();assert.deepEqual(await b.exportValue(),updated);await b.save(draft);assert.equal(s.rows.get(owner).revision,3);
});
test('account switches reject pending workspace access even when an old manager object is retained',async()=>{
 const s=service(),billing=s.client(),store=new CloudWorkspace({owner,billing});await store.load();billing.session={user:{id:other},access_token:other};
 await assert.rejects(store.save(workspace('No mezclar')),/cuenta/);assert.equal(s.rows.size,0);
});
