import test from 'node:test';
import assert from 'node:assert/strict';
import {healthyAnswers} from './fixtures/interview.mjs';
import {ACCOUNT_DEFAULT_MODELS,buildModelPlan,rankAccountModels} from '../../desktop-runtime/account-models.mjs';
import {modelStats} from '../../desktop-runtime/fund-models.mjs';
import {validatePortfolioProposal} from '../../desktop-runtime/portfolio-proposal.mjs';

const context={id:'independent-review-person',name:'Revisión independiente sintética',cash:60000,investments:0,otherAssets:0,debt:0};
const settings={priority:'funds',variant:'base',excluded:[],fundAccessConfirmed:false,fundAccessMode:'study',allowEtfFallback:false};
const modelPlan=(patch={},models=ACCOUNT_DEFAULT_MODELS,options=settings,person=context)=>buildModelPlan({...healthyAnswers(),...patch},models,options,person);

test('independent review: existing models match prudent, balanced and aggressive interview percentages',()=>{
 for(const [patch,expected] of [[{balance:'stable',tradeoff:'peace'},20],[{balance:'balanced',tradeoff:'mixed'},50],[{},100]]){
  const plan=modelPlan(patch),p=plan.proposal;
  assert.equal(plan.canCreate,true);assert.ok(p);
  assert.ok(ACCOUNT_DEFAULT_MODELS.some(m=>m.id===p.modelAssignment.id),'Must assign a real existing library model');
  assert.equal(p.equity,expected);assert.equal(p.positions.filter(x=>x.role==='overnight').length,0);
  const assigned=ACCOUNT_DEFAULT_MODELS.find(m=>m.id===p.modelAssignment.id);
  assert.equal(modelStats(assigned).bonds,100-expected);
  assert.deepEqual(validatePortfolioProposal(p),p);
  if(expected===100){assert.equal(p.modelAssignment.id,'fund-global-100');assert.equal(p.positions.length,2);}
 }
});

test('independent review: optimization objective cannot replace a declared model allocation with money market',()=>{
 for(const optimizationGoal of ['stability','sharpe','growth']){
  const plan=modelPlan({optimizationGoal});
  assert.equal(plan.proposal.modelAssignment.id,'fund-global-100');assert.equal(plan.proposal.equity,100);
 }
 const balanced=modelPlan({balance:'balanced',tradeoff:'mixed'},ACCOUNT_DEFAULT_MODELS,{...settings,objective:'stability'});
 assert.equal(balanced.proposal.equity,50);
});

test('independent review: explicit loss and horizon constraints still govern model suitability',()=>{
 const p=modelPlan({initial:150,maxLoss:50}).proposal;
 assert.equal(p.amount,150);assert.equal(p.modelAssignment.id,'fund-global-50');
 assert.ok(p.stressLoss<=50);assert.ok(p.equity<100);
 const short=modelPlan({initial:150,maxLoss:75,horizon:'short'}).proposal;
 assert.equal(short.equity,0);assert.equal(short.modelAssignment.id,'fund-money-100');
 const protectedPlan=modelPlan({guarantee:'required'});
 assert.equal(protectedPlan.kind,'planning');assert.equal(protectedPlan.proposal.positions.length,0);
 const noModel=modelPlan({},[]);
 assert.equal(noModel.canCreate,false);assert.equal(noModel.holdings.length,0);assert.equal(noModel.proposal,undefined);
 const incompatible=modelPlan({horizon:'short'},ACCOUNT_DEFAULT_MODELS.filter(m=>m.id==='fund-global-100'));
 assert.equal(incompatible.canCreate,false);assert.equal(incompatible.holdings.length,0);
});

test('independent review: exact private models participate without changing library entries or client answers',()=>{
 const privateModel={id:'user-model-independent',name:'Privada 35 / 65',description:'Solo prueba sintética',minYears:10,allocation:[{assetId:'fund-vanguard-world',pct:35},{assetId:'fund-vanguard-short',pct:65}],revision:3,createdAt:1,updatedAt:2};
 const models=[...ACCOUNT_DEFAULT_MODELS,privateModel],answers={...healthyAnswers(),balance:'mostlyStable'},before=structuredClone({answers,models,context});
 const result=rankAccountModels(answers,models,settings,context);
 assert.equal(result.best.model.id,privateModel.id);
 const p=buildModelPlan(answers,models,settings,context).proposal;
 assert.equal(p.modelAssignment.id,privateModel.id);assert.equal(p.modelAssignment.revision,3);assert.equal(p.equity,35);
 assert.deepEqual({answers,models,context},before);
});

test('independent review: funding and fractional allocations remain concrete and reproducible',()=>{
 const lowCash={...context,cash:400};
 const objective=modelPlan({initial:150,maxLoss:75,savings:500},ACCOUNT_DEFAULT_MODELS,settings,lowCash).proposal;
 assert.equal(objective.kind,'objective');assert.equal(objective.fundedToday,0);assert.equal(objective.amount,150);
 assert.equal(objective.modelAssignment.id,'fund-global-100');
 const p=modelPlan({balance:'balanced',tradeoff:'mixed',initial:20000.01,monthly:200.03}).proposal;
 assert.equal(Math.round(p.positions.reduce((s,x)=>s+x.amount,0)*100),2000001);
 assert.equal(Math.round(p.positions.reduce((s,x)=>s+x.monthly,0)*100),20003);
 assert.deepEqual(validatePortfolioProposal(p),p);
 const excluded=modelPlan({},ACCOUNT_DEFAULT_MODELS,{...settings,excluded:['fund-vanguard-emerging']}).proposal;
 assert.ok(excluded.positions.every(x=>x.assetId!=='fund-vanguard-emerging'));
 assert.ok(excluded.modelAssignment.id.startsWith('fund-'));
});

test('independent review: compatible private models do not depend on the core-fund optimizer universe',()=>{
 const privateModel={id:'user-model-independent-small',name:'Modelo RV documentado',description:'Caso sintético para validar el mandato',minYears:10,allocation:[{assetId:'fund-vanguard-small',pct:100}],revision:1,createdAt:1,updatedAt:1};
 const plan=modelPlan({},[privateModel],{...settings,excluded:['fund-vanguard-world','research-fidelity']});
 assert.equal(plan.canCreate,true);assert.equal(plan.proposal?.modelAssignment?.id,privateModel.id);
 assert.equal(plan.proposal.equity,100);assert.equal(plan.proposal.positions[0].assetId,'fund-vanguard-small');
});

test('independent review: a one-cent difference cannot admit a model exceeding the accepted euro loss',()=>{
 for(const [initial,maxLoss,savings] of [[20000.01,10000,60000],[100000000.01,50000000,1000000000]]){
  const person={...context,cash:savings};
  const borderline=modelPlan({initial,maxLoss,savings},ACCOUNT_DEFAULT_MODELS,settings,person).proposal;
  assert.ok(borderline.equity<100);assert.ok(borderline.stressLoss<=maxLoss);
  assert.equal(Math.round(borderline.positions.reduce((sum,p)=>sum+p.amount,0)*100),Math.round(initial*100));
  assert.deepEqual(validatePortfolioProposal(borderline),borderline);
  const permitted=modelPlan({initial,maxLoss:maxLoss+.01,savings},ACCOUNT_DEFAULT_MODELS,settings,person).proposal;
  assert.equal(permitted.equity,100);assert.ok(permitted.stressLoss<=maxLoss+.01);
  assert.equal(permitted.modelAssignment.id,'fund-global-100');
 }
});
