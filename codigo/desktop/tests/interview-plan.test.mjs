import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInterviewPlan,PENDING_CASH_ID,generationMessage } from '../../desktop-runtime/interview-plan.mjs';
import { INVESTMENT_PRODUCTS,DEFAULT_PROPOSAL_SETTINGS,compareProducts } from '../../desktop-runtime/investment-products.mjs';
import { validatePortfolioProposal } from '../../desktop-runtime/portfolio-proposal.mjs';
import { healthyAnswers } from './fixtures/interview.mjs';
const settings=patch=>({...DEFAULT_PROPOSAL_SETTINGS,...patch});
const plan=(patch={},options)=>buildInterviewPlan({...healthyAnswers(),...patch},options);
test('long horizon produces a funded global portfolio with concrete ISINs and no pending cash',()=>{
 const p=plan({initial:20000.01});assert.equal(p.kind,'investment');assert.equal(p.canCreate,true);
 assert.ok(Math.abs(p.proposal.equity-80)<.001);assert.equal(Math.round(p.holdings.reduce((s,h)=>s+h.amount,0)*100),2000001);
 assert.equal(p.holdings[0].meta.isin,'IE00BK5BQT80');assert.ok(p.holdings.some(h=>h.meta.isin==='IE00BG47KH54'));assert.ok(p.holdings.every(h=>h.assetId!==PENDING_CASH_ID));
 assert.deepEqual(validatePortfolioProposal(p.proposal),p.proposal);
});
test('reserve shortfall generates a clearly unfunded objective with products instead of an unassigned cash holding',()=>{
 const p=plan({savings:6000});assert.equal(p.kind,'objective');assert.equal(p.proposal.fundedToday,0);assert.equal(p.proposal.available,0);
 assert.equal(p.proposal.reserveGap,8000);assert.equal(p.proposal.fundingGap,28000);assert.equal(p.amount,20000);
 assert.ok(p.proposal.positions.some(x=>x.role==='equity'));assert.ok(p.holdings.every(x=>x.meta?.isin));
 assert.match(p.proposal.reasons.join(' '),/ni se suma al patrimonio/);
});
test('partial funding uses only the free capital and caps monthly contributions independently',()=>{
 const p=plan({savings:22000,monthly:3000});assert.equal(p.kind,'investment');assert.equal(p.amount,8000);assert.equal(p.proposal.monthly,2500);
 assert.equal(p.proposal.fundedToday,8000);assert.equal(p.proposal.fundingGap,12000);assert.equal(p.proposal.positions.reduce((s,x)=>s+x.monthly,0),2500);
});
test('short horizon selects an overnight instrument, not equities or long-duration bonds',()=>{
 const p=plan({horizon:'short'});assert.equal(p.kind,'investment');assert.deepEqual(p.proposal.positions.map(x=>x.role),['overnight']);assert.equal(p.holdings[0].meta.isin,'LU0290358497');
 const uncertain=plan({horizon:'short',change:'unfunded'});assert.equal(uncertain.kind,'objective');assert.equal(uncertain.proposal.fundedToday,0);assert.ok(uncertain.issues.some(i=>i.id==='change'));
});
test('low accepted loss chooses a shorter defensive role and does not inherit the old 15% all-bond blocker',()=>{
 for(const [maxLoss,role]of [[200,'overnight'],[600,'ultrashort'],[1400,'short']]){const p=plan({maxLoss});assert.equal(p.kind,'investment');assert.equal(p.proposal.positions[0].role,role);assert.ok(p.proposal.stressLoss<=maxLoss);}
});
test('risk aversion, preference, horizon and experience constrain equity independently',()=>{
 for(const [patch,max]of [[{balance:'stable'},20],[{sleep:'worried'},25],[{horizon:'medium'},20],[{experience:'none',frequency:'never'},40],[{impact:'goal'},20]])assert.ok(plan(patch).proposal.equity<=max+.001);
 assert.ok(plan({},settings({variant:'cautious'})).proposal.stressLoss<plan().proposal.stressLoss);
 assert.equal(plan({loss10:'sell',loss25:'sell',sleep:'severe'}).proposal.equity,0);
});
test('explicit guarantees, essential expenses, exclusions and contradictory reactions never get unqualified fund recommendations',()=>{
 for(const patch of [{guarantee:'required'},{maxLoss:0},{impact:'essentials'},{restrictions:'required'},{loss10:'reduce',loss25:'add'}]){const p=plan(patch);assert.equal(p.kind,'planning');assert.equal(p.proposal.positions.length,0);assert.equal(p.proposal.fundedToday,0);}
 const knowledge=plan({bondKnowledge:'unknown'});assert.equal(knowledge.kind,'objective');assert.equal(knowledge.proposal.fundedToday,0);assert.ok(knowledge.issues.some(i=>i.id==='knowledge'));
});
test('unknown risk preferences and budget data point to the actual question instead of assuming risk or zero',()=>{
 for(const key of ['initial','savings','income','expenses','debtPayment','nearCosts','monthly','maxLoss','horizon','sleep','guarantee']){
  const p=plan({[key]:'unknown'});assert.equal(p.canCreate,false,key);assert.ok(p.required.includes(key),key);assert.equal(p.holdings.length,0);assert.match(generationMessage(p),/Revisa estos datos/);
 }
 assert.equal(plan({savings:0}).kind,'objective');assert.equal(plan({initial:0}).canCreate,false);assert.equal(plan({maxLoss:20001}).canCreate,false);
});
test('product selection compares peers and changes for coverage, fund preference and explicit exclusions',()=>{
 assert.equal(plan({},settings({priority:'coverage'})).proposal.positions.find(p=>p.role==='equity').isin,'IE00B3YLTY66');
 assert.equal(plan({},settings({excluded:['research-vwce']})).proposal.positions.find(p=>p.role==='equity').isin,'IE000716YHJ7');
 const funds=plan({},settings({priority:'funds',fundAccessConfirmed:true}));assert.ok(funds.proposal.positions.some(p=>p.isin==='IE00BYX5NX33'));assert.ok(funds.proposal.positions.some(p=>p.isin==='IE00B18GC888'));
 assert.match(funds.proposal.conditions.join(' '),/no incorpora emergentes/);
 const noAccess=compareProducts('aggregate',10000,settings({priority:'funds'}));assert.equal(noAccess.find(p=>p.id==='research-vanguard-bond-fund').eligible,false);
 const blocked=plan({},settings({excluded:INVESTMENT_PRODUCTS.filter(p=>p.role==='equity').map(p=>p.id)}));assert.equal(blocked.kind,'planning');assert.match(blocked.description,/No queda un producto elegible/);
});
test('conservation, loss budget, finite costs and role diversification hold over multiple capital and risk profiles',()=>{
 for(const initial of [.01,1,100.01,19999.99,20000.01,46000])for(const pct of [1,3,7,15,25,50])for(const horizon of ['short','medium','long','verylong']){
  const maxLoss=Math.round(initial*pct)/100;if(maxLoss===0)continue;
  const p=plan({initial,maxLoss,horizon,monthly:200.01});
  if(!p.proposal.positions.length)continue;
  assert.equal(Math.round(p.holdings.reduce((s,h)=>s+h.amount,0)*100),Math.round(p.amount*100));
  assert.ok(Math.abs(p.proposal.positions.reduce((s,x)=>s+x.weight,0)-100)<1e-7);
  assert.ok(p.proposal.stressLoss<=maxLoss+.01);assert.ok(Number.isFinite(p.proposal.feeAnnual));
  assert.equal(new Set(p.proposal.positions.map(x=>x.role)).size,p.proposal.positions.length);
  assert.deepEqual(validatePortfolioProposal(p.proposal),p.proposal);
 }
});
test('native proposal validation rejects corrupt metadata and preserves valid source snapshots',()=>{
 const valid=plan().proposal;
 for(const mutate of [p=>p.amount++,p=>p.positions[0].source='javascript:alert(1)',p=>p.positions[0].isin='invented',p=>p.positions[0].weight=NaN,p=>p.fundedToday=Infinity,p=>p.settings.excluded=['unknown']]){const p=structuredClone(valid);mutate(p);assert.throws(()=>validatePortfolioProposal(p));}
 assert.ok(INVESTMENT_PRODUCTS.every(p=>/^https:\/\//.test(p.source)&&/^[A-Z]{2}[A-Z0-9]{10}$/.test(p.isin)));
});
