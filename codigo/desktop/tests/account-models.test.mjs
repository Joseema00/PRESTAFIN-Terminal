import {applyFundModel} from '../../desktop-runtime/fund-models.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {accountModels,buildModelPlan,rankAccountModels,validateAccountModels} from '../../desktop-runtime/account-models.mjs';
import {validateWorkspace} from '../workspace.mjs';
import {healthyAnswers} from './fixtures/interview.mjs';
import {planningContext,samePlanningContext,selectClientFunds,fundSelectionReason,buildClientAlternatives,alternativeSettings,distinctAlternatives,clientRiskDrivers} from '../../desktop-runtime/client-plan.mjs';
import {newPerson,emptyWorkspace} from '../../desktop-runtime/people.mjs';
import {ANDBANK_REFERENCE} from '../../desktop-runtime/reference-models.mjs';
import {createInterviewModel,sameInterviewModel} from '../../desktop-runtime/interview-model.mjs';
const own={id:'user-model-synthetic',name:'Mi monetario',description:'Modelo privado sintético',minYears:0,allocation:[{assetId:'fund-amundi-money',pct:100}],revision:1,createdAt:1,updatedAt:1};
test('aggressive long-term answers allow all-equity without relaxing a short horizon or the euro loss budget',()=>{
 const person=newPerson('Riesgo sintético');person.profile.cash=60000;
 const answers={...healthyAnswers(),initial:150,maxLoss:75};
 const plans=buildClientAlternatives(answers,undefined,planningContext(person));
 const growth=plans.find(o=>o.id==='growth').plan.proposal;
 assert.equal(growth.equity,100);assert.equal(growth.amount,150);assert.equal(growth.stressLoss,75);
 assert.ok(growth.positions.every(p=>p.role==='equity'));assert.equal(clientRiskDrivers(answers).cap,100);
 const held={...answers,loss10:'hold',loss25:'hold'};assert.equal(buildClientAlternatives(held,undefined,planningContext(person))[2].plan.proposal.equity,100);
 const short={...answers,horizon:'short'},shortOptions=buildClientAlternatives(short,undefined,planningContext(person));
 assert.ok(shortOptions.every(o=>o.plan.proposal.equity===0));assert.equal(distinctAlternatives(shortOptions).length,1);
 assert.equal(distinctAlternatives(shortOptions)[0].id,'growth');assert.deepEqual(clientRiskDrivers(short).rows.map(r=>r.key),['horizon']);
 let previous=100;
 for(const maxLoss of [75,50,15,7.5,1.5]){
  const p=buildClientAlternatives({...answers,maxLoss},undefined,planningContext(person))[2].plan.proposal;
  assert.ok(p.equity<=previous+1e-6);assert.ok(p.stressLoss<=maxLoss+.005);previous=p.equity;

 }
 const lowCash={...planningContext(person),cash:400};
 const equityAndCash=alternativeSettings({priority:'funds',variant:'base',excluded:['research-vanguard-bond-fund','fund-vanguard-short'],fundAccessConfirmed:false},'growth');
 const lowBudget=buildClientAlternatives({...answers,maxLoss:7.5},equityAndCash,planningContext(person))[2].plan.proposal;
 assert.ok(lowBudget.equity>8&&lowBudget.equity<8.2,'Continuous allocation must not inherit the grid\'s zero-equity cap');
 assert.ok(lowBudget.stressLoss<=7.5);
 const objective=buildClientAlternatives({...answers,savings:500},undefined,lowCash)[2].plan.proposal;
 assert.equal(objective.kind,'objective');assert.equal(objective.fundedToday,0);assert.equal(objective.amount,150);
});

test('visible risk drivers agree with engine limits across individual constraints and cautious mode',()=>{
 const person=newPerson('Diagnóstico sintético');person.profile.cash=60000;
 for(const patch of [{horizon:'medium'},{horizon:'long'},{incomeStability:'variable'},{dependents:'sole'},{flexibility:'none'},{withdrawals:'occasional'},{impact:'goal'},{loss10:'reduce',loss25:'reduce'},{sleep:'worried'},{tradeoff:'peace'},{balance:'balanced'},{experience:'none',frequency:'never'},{}]){
  const a={...healthyAnswers(),...patch};
  for(const variant of ['base','cautious']){
   const settings=alternativeSettings({priority:'funds',variant,excluded:[],fundAccessConfirmed:false},'growth');
   const p=buildClientAlternatives(a,settings,planningContext(person))[2].plan.proposal;
   assert.equal(clientRiskDrivers(a,settings).cap,p.optimization.equityCap);
  }
 }
});
test('continuous alternatives conserve cents and loss budgets across small capitals, horizons and risk tolerances',()=>{
 const person=newPerson('Céntimos sintéticos');person.profile.cash=60000;
 for(const initial of [.01,1,150,20000.01])for(const lossPct of [1,3,5,7,15,33,50])for(const horizon of ['short','medium','long','verylong']){
  const maxLoss=Math.round(initial*lossPct)/100;if(!maxLoss)continue;
  for(const {plan} of buildClientAlternatives({...healthyAnswers(),initial,maxLoss,horizon,monthly:200.01},undefined,planningContext(person))){
   const p=plan.proposal;if(!p.positions.length)continue;
   assert.equal(Math.round(p.positions.reduce((s,x)=>s+x.amount,0)*100),Math.round(p.amount*100));
   assert.equal(Math.round(p.positions.reduce((s,x)=>s+x.monthly,0)*100),20001);
   assert.ok(p.equity<=p.optimization.equityCap+1e-6);assert.ok(p.stressLoss<=maxLoss+.005);
  }
 }
});
test('three alternatives optimize separate objectives on the same interview, preserve cents and survive native validation',()=>{
 const person=newPerson('Tres alternativas sintéticas');person.profile.cash=60000;
 const interview={id:'source-triple',alias:'Respuestas originales',createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1,answers:{...healthyAnswers(),initial:20000.01,monthly:300.03}};
 const original=structuredClone(interview),options=buildClientAlternatives(interview.answers,undefined,planningContext(person));
 assert.equal(options.length,3);assert.equal(new Set(options.map(o=>JSON.stringify(o.plan.proposal.positions))).size,3);
 const equity=options.map(o=>o.plan.proposal.equity);assert.ok(equity[0]<equity[1]&&equity[1]<equity[2]);
 const models=options.map(o=>createInterviewModel(interview,planningContext(person),o.name,alternativeSettings(undefined,o.id)));
 for(const [i,model] of models.entries()){
  const p=model.source.proposal;
  assert.equal(p.settings.objective,options[i].id);assert.equal(p.optimization.goal,options[i].id);
  assert.equal(Math.round(p.positions.reduce((s,p)=>s+p.amount,0)*100),2000001);
  assert.equal(Math.round(p.positions.reduce((s,p)=>s+p.monthly,0)*100),30003);
  assert.ok(p.equity<=p.optimization.equityCap+1e-6);assert.ok(p.stressLoss<=p.amount*p.optimization.lossLimit/100+.01);
  assert.ok(p.positions.every(p=>p.amount>0&&p.isin&&p.weight>0));
  assert.deepEqual(model.source.interview.answers,original.answers);
 }
 assert.deepEqual(validateAccountModels(models),models);assert.deepEqual(interview,original);
});
test('alternatives respect each risk profile, funding gaps, exclusions, and protection answers',()=>{
 const person=newPerson('Límites sintéticos');person.profile.cash=60000;
 for(const patch of [{balance:'stable',tradeoff:'peace'},{balance:'balanced',tradeoff:'mixed'},{horizon:'short'},{maxLoss:250}]){
  for(const option of buildClientAlternatives({...healthyAnswers(),...patch},undefined,planningContext(person))){
   const p=option.plan.proposal;assert.ok(p.positions.length);
   assert.ok(p.equity<=p.optimization.equityCap+1e-6);assert.ok(p.stressLoss<=p.amount*p.optimization.lossLimit/100+.01);
   if(patch.horizon==='short')assert.equal(p.equity,0);
  }
 }
 const excluded=buildClientAlternatives(healthyAnswers(),alternativeSettings({priority:'funds',variant:'base',excluded:['research-fidelity'],fundAccessConfirmed:false},'growth'),planningContext(person));
 assert.ok(excluded.every(o=>o.plan.proposal.positions.every(p=>p.assetId!=='research-fidelity')));
 person.profile.cash=400;
 for(const option of buildClientAlternatives({...healthyAnswers(),savings:500,initial:150,horizon:'short',maxLoss:50},undefined,planningContext(person))){
  assert.equal(option.plan.proposal.kind,'objective');assert.equal(option.plan.proposal.fundedToday,0);assert.equal(option.plan.proposal.amount,150);
 }
 for(const option of buildClientAlternatives({...healthyAnswers(),guarantee:'required'},undefined,planningContext(person)))assert.equal(option.plan.proposal.positions.length,0);
});
test('interview model creation freezes its inputs and validates the saved allocation against its origin',()=>{
 const person=newPerson('Origen sintético');person.profile.cash=60000;
 const interview={id:'source-synthetic',alias:'Entrevista principal',createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1,answers:healthyAnswers()};
 const model=createInterviewModel(interview,planningContext(person),'Modelo desde respuestas');
 assert.equal(model.source.interview.id,interview.id);assert.equal(model.source.proposal.client.cash,60000);assert.equal(model.source.proposal.interviewId,interview.id);
 assert.deepEqual(validateAccountModels([model])[0],model);assert.ok(sameInterviewModel(model,createInterviewModel(interview,planningContext(person),model.name)));
 interview.answers.maxLoss=4000;interview.revision++;person.profile.cash=20000;
 assert.equal(model.source.interview.answers.maxLoss,10000);assert.equal(model.source.interview.revision,1);assert.equal(model.source.proposal.client.cash,60000);
 const changed=createInterviewModel(interview,planningContext(person),model.name);assert.equal(sameInterviewModel(model,changed),false);
 const tampered=structuredClone(model);tampered.allocation=[{...tampered.allocation[0],pct:99},{assetId:'fund-amundi-money',pct:1}];assert.throws(()=>validateAccountModels([tampered]),/reparto editado/);
 const wrong=structuredClone(model);wrong.source.interview.revision++;assert.throws(()=>validateAccountModels([wrong]),/origen/);
});

test('interview model creation reports missing answers and respects protection requirements',()=>{
 const person=newPerson('Protección sintética');person.profile.cash=60000;
 const interview={id:'guard-synthetic',alias:'Protección',createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1,answers:{...healthyAnswers(),income:'unknown'}};
 assert.throws(()=>createInterviewModel(interview,planningContext(person),'Modelo'),/Revisa estos datos/);
 interview.answers={...healthyAnswers(),guarantee:'required'};assert.throws(()=>createInterviewModel(interview,planningContext(person),'Modelo'),/proteger|capital|protección/);
 interview.answers=healthyAnswers();assert.throws(()=>createInterviewModel(interview,planningContext(person),'   '),/nombre/);
});
test('private model validation preserves account metadata and rejects invalid or duplicate allocations',()=>{
 const w=validateWorkspace({version:2,people:[],activePersonId:null,modelPortfolios:[own],modelLibraryRevision:1});assert.deepEqual(w.modelPortfolios,[own]);assert.equal(w.modelLibraryRevision,1);
 for(const allocation of [[{assetId:'unknown',pct:100}],[{assetId:'fund-amundi-money',pct:99}],[{assetId:'fund-amundi-money',pct:50},{assetId:'fund-amundi-money',pct:50}]])assert.throws(()=>validateAccountModels([{...own,allocation}]));
 assert.throws(()=>validateAccountModels([own,own]));assert.throws(()=>validateAccountModels([{...own,minYears:NaN}]));
});

test('personalized planning reconciles recorded cash, reserves and the specific client interview',()=>{
 const person=newPerson('Ana sintética');person.profile.cash=400;
 const answers={...healthyAnswers(),horizon:'short',savings:500,expenses:200,debtPayment:0,income:700,nearCosts:500,initial:150,monthly:200,maxLoss:50,change:'unfunded',debt:'none'};
 const plan=buildModelPlan(answers,accountModels(),undefined,planningContext(person)),p=plan.proposal;
 assert.equal(p.client.name,person.name);assert.equal(p.client.declaredSavings,500);assert.equal(p.client.cash,400);
 assert.equal(p.reserve,1200);assert.equal(p.reserveGap,1300);assert.equal(p.fundingGap,1450);assert.equal(p.fundedToday,0);assert.equal(p.available,0);assert.equal(p.monthly,200);
 assert.equal(p.equity,0);assert.equal(p.positions.length,1);assert.equal(p.positions[0].role,'overnight');assert.match(p.reasons.join(' '),/Ana sintética/);assert.match(p.reasons.join(' '),/400/);
 const portfolio=person.portfolios[0];portfolio.proposal=p;portfolio.holdings=plan.holdings;
 const restored=validateWorkspace({...emptyWorkspace(),people:[person],activePersonId:person.id});assert.deepEqual(restored.people[0].portfolios[0].proposal,p);
 assert.ok(samePlanningContext(p,planningContext(person)));person.profile.cash=500;assert.equal(samePlanningContext(p,planningContext(person)),false);
});

test('assigned library models obey capital and risk limits across goals and preserve zero-cash protection',()=>{
 const person=newPerson('Cliente de límites');person.profile.cash=60000;
 for(const horizon of ['short','medium','long','verylong'])for(const optimizationGoal of ['growth','stability','sharpe']){
  const plan=buildModelPlan({...healthyAnswers(),horizon,optimizationGoal},accountModels(),undefined,planningContext(person)),p=plan.proposal;
  assert.ok(plan.canCreate);assert.ok(p.positions.every(x=>x.weight>=0&&x.amount>=0));assert.ok(p.fundedToday<=person.profile.cash-p.reserve-p.client.nearCosts+.01);
  assert.ok(p.equity<=p.optimization.equityCap+.02);assert.ok(p.stressLoss<=p.amount*p.optimization.lossLimit/100+.02);
  assert.ok(accountModels().some(m=>m.id===p.modelAssignment.id));assert.equal(p.modelAssignment.method,'automatic');
 }
 const debt=buildModelPlan({...healthyAnswers(),debt:'none'},accountModels(),undefined,{...planningContext(person),debt:90000});assert.equal(debt.proposal.fundedToday,0);assert.equal(debt.proposal.fundingGap,0);assert.match(debt.description,/condiciones señaladas/);assert.match(debt.proposal.conditions.join(' '),/90[.\s]?000/);
 const zero=buildModelPlan(healthyAnswers(),accountModels(),undefined,{...planningContext(person),cash:0});assert.equal(zero.proposal.available,0);assert.equal(zero.proposal.fundedToday,0);
 const protection=buildModelPlan({...healthyAnswers(),guarantee:'required'},accountModels(),undefined,planningContext(person));assert.equal(protection.kind,'planning');assert.equal(protection.proposal.positions.length,0);
});

test('external references retain six published profiles and do not merge alternative or credit exposures',()=>{
 assert.equal(ANDBANK_REFERENCE.profiles.length,6);assert.equal(ANDBANK_REFERENCE.asOf,'2026-09-30');
 for(const p of ANDBANK_REFERENCE.profiles)assert.ok(Math.abs(p.weights.reduce((a,b)=>a+b,0)-100)<1e-9);
 assert.equal(ANDBANK_REFERENCE.profiles.at(-1).weights[4],81);assert.equal(ANDBANK_REFERENCE.profiles.at(-1).weights[6],19);
 assert.ok(ANDBANK_REFERENCE.blocks.includes('Alto rendimiento'));assert.ok(ANDBANK_REFERENCE.blocks.includes('Alternativos RF'));
});
test('assignment ranks only compatible models and records a stable, auditable model snapshot',()=>{
 const models=accountModels([own]);const p=buildModelPlan({...healthyAnswers(),horizon:'short'},models);assert.equal(p.proposal.positions.length,1);assert.equal(p.proposal.positions[0].role,'overnight');assert.equal(p.holdings[0].meta.cls,'cash');assert.equal(p.proposal.modelAssignment.method,'automatic');
 const chosen=buildModelPlan(healthyAnswers(),[own]);assert.equal(chosen.proposal.modelAssignment.id,own.id);assert.equal(chosen.proposal.modelAssignment.revision,1);assert.equal(chosen.proposal.fundedToday,20000);
 own.name='Nombre cambiado';assert.equal(chosen.proposal.modelAssignment.name,'Mi monetario');own.name='Mi monetario';
 for(const patch of [{guarantee:'required'},{maxLoss:0},{restrictions:'required'},{impact:'essentials'}])assert.equal(rankAccountModels({...healthyAnswers(),...patch},models).best,undefined);
 assert.equal(rankAccountModels({...healthyAnswers(),income:'unknown'},models).best,undefined);
 const excluded=rankAccountModels({...healthyAnswers(),horizon:'short'},models,{priority:'funds',variant:'base',excluded:['fund-amundi-money'],fundAccessConfirmed:false});assert.equal(excluded.best,undefined);
});

test('risk-driven fund selection distinguishes liquidity, intermediate and growth needs without overlapping exposures',()=>{
 const person=newPerson('Perfil sintético');person.profile.cash=60000;
 const settings={priority:'funds',variant:'base',excluded:[],fundAccessConfirmed:false,fundAccessMode:'study',allowEtfFallback:false};
 const patches=[{horizon:'short',balance:'stable',tradeoff:'peace',maxLoss:500},{horizon:'long',balance:'balanced',tradeoff:'mixed',maxLoss:5000},{horizon:'verylong',balance:'growth',tradeoff:'growth',maxLoss:10000}];
 const plans=patches.map(patch=>buildModelPlan({...healthyAnswers(),...patch},accountModels(),settings,planningContext(person)).proposal);
 assert.equal(plans[0].equity,0);assert.ok(plans[0].positions.every(p=>p.role==='overnight'));assert.ok(plans[1].positions.some(p=>p.role==='short'||p.role==='aggregate'));
 assert.ok(plans[1].equity>0&&plans[1].equity<plans[2].equity);assert.equal(plans[2].equity,100);
 for(const p of plans){
  const pool=selectClientFunds(p);assert.ok(pool.length);assert.ok(pool.every(f=>f.vehicle==='Fondo'));assert.equal(new Set(pool.map(f=>f.role)).size,pool.length);
  assert.ok(p.equity<=p.optimization.equityCap+.001);assert.ok(p.stressLoss<=p.amount*p.optimization.lossLimit/100+.01);
  assert.ok(p.positions.every(f=>fundSelectionReason(p,f.assetId).length>0));assert.match(p.reasons.join(' '),/reacción a pérdidas/);
 }
 const alternative=buildModelPlan(healthyAnswers(),accountModels(),{...settings,excluded:['research-fidelity']},planningContext(person)).proposal;
 assert.ok(alternative.positions.some(p=>p.assetId==='fund-vanguard-world'));assert.ok(alternative.positions.every(p=>p.assetId!=='research-fidelity'));
 const cautious=buildModelPlan(healthyAnswers(),accountModels(),{...settings,variant:'cautious'},planningContext(person)).proposal;assert.ok(cautious.equity<=plans[2].equity/2);
});

test('legacy model origins stay readable and assigning another fund model discards explanations of superseded positions',()=>{
 const person=newPerson('Cliente de versión');person.profile.cash=60000;
 const interview={id:'versioned-risk',alias:'Entrevista',createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1,answers:healthyAnswers()};
 const current=createInterviewModel(interview,planningContext(person),'Perfil guardado');assert.equal(current.source.planVersion,10);
 const legacy=structuredClone(current);legacy.source.planVersion=7;assert.equal(validateAccountModels([legacy])[0].source.planVersion,7);
 const before=structuredClone(current.source.proposal),applied=applyFundModel(own,current.source.proposal);
 assert.ok(applied.reasons.every(r=>!current.source.proposal.positions.some(p=>r.startsWith(p.isin+': '))));
 assert.deepEqual(current.source.proposal,before);
});
