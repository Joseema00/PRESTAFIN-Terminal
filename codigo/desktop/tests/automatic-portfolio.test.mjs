import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInterviewPlan} from '../../desktop-runtime/interview-plan.mjs';
import {DEFAULT_PROPOSAL_SETTINGS,productById,validateProposalSettings} from '../../desktop-runtime/investment-products.mjs';
import {validatePortfolioProposal} from '../../desktop-runtime/portfolio-proposal.mjs';
import {healthyAnswers} from './fixtures/interview.mjs';
const settings={...DEFAULT_PROPOSAL_SETTINGS,priority:'funds',fundAccessMode:'study',allowEtfFallback:false};
test('automatic fund draft uses a documented monetary fund for short horizons and keeps the reserve out',()=>{
  const p=buildInterviewPlan({...healthyAnswers(),horizon:'short'},settings);
  assert.equal(p.kind,'investment');assert.equal(p.proposal.positions.length,1);
  assert.equal(p.proposal.positions[0].isin,'FR0011176635');assert.equal(p.proposal.positions[0].role,'overnight');
  assert.equal(p.proposal.fundedToday,20000);assert.equal(p.proposal.reserve,9000);assert.equal(p.proposal.feePct,.2);
  assert.match(p.proposal.conditions.join(' '),/mínimo efectivo y acceso/);assert.ok(!p.proposal.reasons.join(' ').includes('garantizado'));
  assert.deepEqual(validatePortfolioProposal(p.proposal),p.proposal);
});
test('fund-only construction covers defensive gaps without substituting an ETF or raising scenario risk',()=>{
  const a={...healthyAnswers(),maxLoss:600};const p=buildInterviewPlan(a,settings);
  assert.ok(p.proposal.positions.every(x=>productById(x.assetId).vehicle==='Fondo'));
  assert.equal(p.proposal.positions[0].role,'overnight');assert.ok(p.proposal.stressLoss<=a.maxLoss);
  const withEtf=buildInterviewPlan(a,{...settings,allowEtfFallback:true});assert.equal(withEtf.proposal.positions[0].role,'ultrashort');
  assert.equal(productById(withEtf.proposal.positions[0].assetId).vehicle,'ETF');
  const noMoney=buildInterviewPlan({...a,horizon:'short'},{...settings,excluded:['fund-amundi-money']});assert.equal(noMoney.kind,'planning');assert.equal(noMoney.proposal.positions.length,0);
});
test('automatic scenarios preserve capital, loss constraints, funding and costs across household situations',()=>{
  for(const horizon of ['short','medium','long','verylong'])for(const maxLoss of [200,600,1400,3000,10000])for(const savings of [0,6000,22000,60000]){
    const p=buildInterviewPlan({...healthyAnswers(),horizon,maxLoss,savings,monthly:3000},settings);
    assert.ok(p.canCreate);assert.deepEqual(validatePortfolioProposal(p.proposal),p.proposal);
    if(!p.proposal.positions.length)continue;
    assert.ok(p.proposal.positions.every(x=>productById(x.assetId).vehicle==='Fondo'));
    assert.equal(Math.round(p.proposal.positions.reduce((s,x)=>s+x.amount,0)*100),Math.round(p.amount*100));
    assert.ok(p.proposal.stressLoss<=maxLoss+.01);assert.equal(p.proposal.monthly,2500);
    if(p.kind==='objective')assert.equal(p.proposal.fundedToday,0);
    else assert.ok(p.proposal.fundedToday<=p.proposal.available);
  }
});
test('guarantees, unsupported restrictions and missing data cannot become automatic purchases',()=>{
  for(const patch of [{guarantee:'required'},{restrictions:'required'},{impact:'essentials'},{maxLoss:0}]){
    const p=buildInterviewPlan({...healthyAnswers(),...patch},settings);assert.equal(p.kind,'planning');assert.equal(p.proposal.fundedToday,0);assert.equal(p.proposal.positions.length,0);
  }
  for(const key of ['income','savings','initial','horizon','maxLoss']){const p=buildInterviewPlan({...healthyAnswers(),[key]:'unknown'},settings);assert.equal(p.canCreate,false);assert.ok(p.required.includes(key));}
  assert.throws(()=>validateProposalSettings({...settings,allowEtfFallback:'yes'}));
  assert.throws(()=>validateProposalSettings({...settings,fundAccessMode:'ignore'}));
});
