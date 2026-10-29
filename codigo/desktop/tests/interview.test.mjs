import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,rm } from 'node:fs/promises';
import path from 'node:path';
import { QUESTIONS,assessInterview,interviewHoldings,validateInterviews,sanitizeAnswers,questionTitle,interviewReport,changeInterviewAnswer,budgetIsKnown } from '../../desktop-runtime/risk-profile.mjs';
import { validateWorkspace,WorkspaceStore } from '../workspace.mjs';

const answers=()=>({goal:'future',horizon:'verylong',flexibility:'flexible',target:0,withdrawals:'none',incomeSource:'salary',income:4000,expenses:1200,debtPayment:300,incomeStability:'stable',dependents:'none',change:'no',debt:'manageable',savings:60000,nearCosts:5000,initial:20000,monthly:300,borrowed:'no',emergency:'reserve',loss10:'add',loss25:'add',sleep:'calm',maxLoss:10000,impact:'limited',past:'held',experience:'funds',frequency:'regular',diversify:'basket',bondKnowledge:'changes',returnKnowledge:'uncertain',inflation:'less',balance:'growth',tradeoff:'growth',guarantee:'accept',restrictions:'none'});
const interview=()=>({id:'person-1',alias:'Persona de prueba',createdAt:1792100000000,updatedAt:1792100000000,step:6,revision:35,rulesVersion:1,answers:answers()});
const workspace=()=>({version:1,portfolios:[{id:'p1',name:'Cartera',holdings:[],createdAt:Date.now()}],activeId:'p1',profile:{cash:0,otherAssets:0,monthlyContribution:0},mortgage:{principal:0,rate:3,years:25,extraMonthly:0},settings:{contribGrowth:2,inflation:2.5,taxRate:20,expenses:0,share:0,realTerms:false},selectedModules:[]});
const has=(a,id)=>assessInterview(a).blockers.some(i=>i.id===id);

test('blank interview has no inferred preferences or actionable allocation',()=>{
  const r=assessInterview({});assert.equal(r.complete,false);assert.equal(r.ready,false);
  assert.equal(r.missing.length,35);assert.equal(QUESTIONS.length,37);
  assert.throws(()=>interviewHoldings({}));
});
test('completed interview separates reserves from invested capital and conserves cents',()=>{
  const a={...answers(),initial:20000.01};const r=assessInterview(a);
  assert.equal(r.ready,true);assert.equal(r.reserve,9000);assert.equal(r.available,46000);assert.equal(r.monthlySurplus,2500);
  assert.equal(r.equity,80);assert.equal(r.bonds,20);assert.equal(r.stressLoss,8600);
  const holdings=interviewHoldings(a);assert.equal(holdings.length,2);
  assert.ok(Math.abs(holdings.reduce((s,h)=>s+h.amount,0)-20000.01)<1e-8);
  assert.deepEqual(holdings.map(h=>h.assetId),['vwce','agh']);
});
test('risk capacity cannot be overridden by a strong desire for growth',()=>{
  const base=answers();
  const cases=[['incomeStability','variable',40],['dependents','sole',50],['flexibility','none',25],['impact','goal',20],['horizon','medium',20],['withdrawals','occasional',40]];
  for(const [key,value,cap] of cases){const r=assessInterview({...base,[key]:value});assert.ok(r.equity<=cap,key);assert.ok(r.equity<=r.capacity);}
  assert.equal(assessInterview({...base,incomeStability:'variable'}).reserve,13500);
});
test('changing the preferred mix cannot exceed loss tolerance or financial limits',()=>{
  const base={...answers(),sleep:'worried'};
  for(const balance of ['stable','mostlyStable','balanced','growth']){const r=assessInterview({...base,balance});assert.ok(r.equity<=25);assert.ok(r.equity<=r.preference);}
  const r=assessInterview({...base,balance:'growth'});assert.equal(r.ready,true);assert.equal(r.equity,25);assert.ok(r.warnings.some(i=>i.id==='preference-conflict'));
});
test('a higher financial target never raises the assigned risk',()=>{
  const small=assessInterview({...answers(),target:30000}),large=assessInterview({...answers(),target:5000000});
  assert.equal(small.equity,large.equity);assert.equal(large.ready,true);assert.ok(large.warnings.some(i=>i.id==='goal-gap'));
});
test('a smaller acceptable euro loss never raises risk, and too-small budgets stop creation',()=>{
  let previous=80;
  for(const maxLoss of [10000,8500,7000,5500,4000,3000]){const r=assessInterview({...answers(),maxLoss});assert.equal(r.ready,true);assert.ok(r.equity<=previous);assert.ok(r.stressLoss<=maxLoss+.01);previous=r.equity;}
  assert.ok(has({...answers(),maxLoss:2999},'stress-budget'));
  assert.ok(has({...answers(),maxLoss:0},'loss-rejection'));
  assert.throws(()=>interviewHoldings({...answers(),maxLoss:0}));
});
test('cash needs, debt, borrowed money, short horizons and capital guarantees prevent creation',()=>{
  const cases=[['initial',50000,'reserve'],['monthly',3000,'monthly'],['income',1000,'deficit'],['expenses',10000,'deficit'],['borrowed','yes','borrowed'],['debt','expensive','debt'],['change','unfunded','change'],['emergency','portfolio','emergency'],['horizon','short','horizon'],['guarantee','required','guarantee'],['impact','essentials','impact'],['withdrawals','regular','withdrawals'],['goal','income','withdrawals'],['restrictions','required','restrictions']];
  for(const [key,value,id] of cases){const a={...answers(),[key]:value};assert.ok(has(a,id),id);assert.equal(assessInterview(a).ready,false);assert.throws(()=>interviewHoldings(a),id);}
});
test('explicit unknowns stay unknown, and never become actionable zero amounts',()=>{
  for(const q of QUESTIONS.filter(q=>q.kind==='money')){const a={...answers(),[q.id]:'unknown'};assert.ok(has(a,'unknown-amounts'));assert.throws(()=>interviewHoldings(a));}
  for(const id of ['goal','horizon','flexibility','withdrawals','incomeStability','change','debt','borrowed','emergency','loss10','loss25','sleep','impact','balance','tradeoff','guarantee'])assert.equal(assessInterview({...answers(),[id]:'unknown'}).ready,false,id);
  const i=interview();i.answers.initial='unknown';assert.equal(budgetIsKnown(i.answers),false);
  const report=interviewReport(i);assert.ok(report.includes('No lo sé todavía'));assert.ok(!report.includes('Aportación inicial: 0'));
});
test('understanding is checked independently from experience and cannot offset low tolerance',()=>{
  for(const key of ['diversify','bondKnowledge','returnKnowledge','inflation']){const r=assessInterview({...answers(),[key]:'unknown'});assert.equal(r.knowledge,3);assert.equal(r.ready,false);}
  const beginner=assessInterview({...answers(),experience:'none',frequency:'never'});assert.equal(beginner.ready,true);assert.equal(beginner.equity,40);
  const worried=assessInterview({...answers(),sleep:'worried'});assert.equal(worried.knowledge,4);assert.equal(worried.equity,25);
});
test('contradictory behavior, debt and experience are surfaced explicitly',()=>{
  assert.ok(has({...answers(),loss10:'reduce',loss25:'add'},'reaction-conflict'));
  assert.ok(has({...answers(),debt:'none'},'debt-conflict'));
  assert.ok(has({...answers(),experience:'none',frequency:'often'},'experience-conflict'));
});
test('changing invested amount invalidates euro scenarios and the old portfolio revision',()=>{
  const i={...interview(),generated:{portfolioId:'p1',revision:35,createdAt:1792100000000}};
  const next=changeInterviewAnswer(i,'initial',5000,1792100000100);
  assert.equal(next.revision,36);assert.equal(next.generated.revision,35);assert.equal(next.answers.loss10,undefined);assert.equal(next.answers.loss25,undefined);assert.equal(next.answers.maxLoss,undefined);
  assert.equal(next.answers.income,4000);assert.equal(i.answers.loss10,'add');assert.equal(assessInterview(next.answers).ready,false);
  assert.strictEqual(changeInterviewAnswer(i,'initial',20000),i);
});
test('scenario questions use the persons own amount and exports include plain answers',()=>{
  const q=QUESTIONS.find(q=>q.id==='loss25');const text=questionTitle(q,{initial:20000});
  assert.ok(text.includes('20.000'));assert.ok(text.includes('15.000'));assert.ok(!text.includes('{'));
  const i=interview();i.answers.story='Me preocupa el dinero para mi familia.';
  const report=interviewReport(i);assert.ok(report.includes('Me preocupa el dinero para mi familia.'));assert.ok(report.includes('Empresas (renta variable): 80%'));assert.ok(report.includes('No es un límite de pérdida'));
  i.answers.guarantee='required';assert.ok(!interviewReport(i).includes('Empresas (renta variable):'));
});
test('native import rejects corrupt interviews, unsafe amounts and incompatible versions',()=>{
  for(const value of [-1,NaN,Infinity,1e12,0.001])assert.throws(()=>sanitizeAnswers({...answers(),initial:value}));
  assert.throws(()=>sanitizeAnswers({...answers(),loss10:'unrecognized'}));
  assert.throws(()=>sanitizeAnswers({...answers(),invented:'yes'}));
  assert.throws(()=>validateInterviews([interview(),interview()]));
  assert.throws(()=>validateInterviews([{...interview(),rulesVersion:9}]));
  assert.throws(()=>validateInterviews([{...interview(),step:7}]));
  assert.throws(()=>validateInterviews([{...interview(),generated:{portfolioId:'p1',revision:99,createdAt:0}}]));
  assert.throws(()=>validateWorkspace({...workspace(),interviews:[interview()],activeInterviewId:'missing'}));
});
test('old workspaces still load and interviews survive native save, reopening and export roundtrip',async()=>{
  const migrated=validateWorkspace(workspace());assert.deepEqual(migrated.people[0].interviews,[]);assert.equal(migrated.people[0].activeInterviewId,null);
  const root=path.resolve('.test-tmp');await mkdir(root,{recursive:true});const dir=await mkdtemp(path.join(root,'prestafin-interview-'));
  try {
    const i=interview();i.generated={portfolioId:'p1',revision:i.revision,createdAt:i.createdAt};
    const data=validateWorkspace({...workspace(),interviews:[i],activeInterviewId:i.id});
    const store=new WorkspaceStore(dir);await store.save(data);
    const read=await new WorkspaceStore(dir).load();assert.deepEqual(read,data);assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(read))),data);
    // Removing a portfolio must not destroy its source interview or prevent restoration.
    const deleted={...data,people:data.people.map(p=>p.interviews.length?{...p,portfolios:[{id:'new',name:'Nueva',holdings:[],createdAt:Date.now()}],activeId:'new'}:p)};
    assert.equal(validateWorkspace(deleted).people.find(p=>p.interviews.length).interviews[0].generated.portfolioId,'p1');
  } finally {assert.equal(path.dirname(path.resolve(dir)),root);assert.ok(path.basename(dir).startsWith('prestafin-interview-'));await rm(dir,{recursive:true,force:true});}
});
