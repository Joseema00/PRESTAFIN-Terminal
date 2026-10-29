import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeAllocation,modelCovariance,validAllocationInput,allocateCents } from '../../desktop-runtime/allocation-engine.mjs';
import { buildInterviewPlan } from '../../desktop-runtime/interview-plan.mjs';
import { validatePortfolioProposal,optimizeProposal } from '../../desktop-runtime/portfolio-proposal.mjs';
import { historyFromMarket,historicalRisk,structuralRisk } from '../../desktop-runtime/integrated-risk.mjs';
import { validateTracking,recordValuation,accountSeries,personWealth,captureWealth } from '../../desktop-runtime/portfolio-monitor.mjs';
import { newPerson,emptyWorkspace } from '../../desktop-runtime/people.mjs';
import { validateWorkspace } from '../workspace.mjs';
import { healthyAnswers } from './fixtures/interview.mjs';

const input=()=>({ids:['a','b'],roles:['equity','short'],means:[6,4],cov:[[400,0],[0,25]],riskFree:2,equityCap:60,lossLimit:50,goal:'sharpe'});
test('Sharpe chooses the tangency neighbourhood, growth reaches the risk cap and stability minimizes variance',()=>{
 const sharpe=optimizeAllocation(input()),growth=optimizeAllocation({...input(),goal:'growth'}),stable=optimizeAllocation({...input(),goal:'stability'});
 // Analytical unconstrained tangency ratio is (6-2)/400 : (4-2)/25 = 1:8.
 assert.equal(sharpe.best.weights[0],.1);assert.equal(growth.best.weights[0],.6);
 // Min-variance two-asset independent solution is 25/(400+25), near 5% on the grid.
 assert.equal(stable.best.weights[0],.05);
 assert.ok(sharpe.best.sharpe>growth.best.sharpe);assert.ok(stable.best.vol<sharpe.best.vol);
 assert.deepEqual(optimizeAllocation(input()),sharpe);
 for(const p of sharpe.candidates){assert.ok(p.weights.every(w=>w>=0));assert.ok(Math.abs(p.weights.reduce((s,v)=>s+v,0)-1)<1e-9);assert.ok(p.weights[0]<=.6);}
});
test('covariance must be symmetric and positive semidefinite; class model meets the condition',()=>{
 assert.throws(()=>validAllocationInput({...input(),cov:[[1,2],[2,1]]}));
 assert.throws(()=>validAllocationInput({...input(),cov:[[1,0],[1,1]]}));
 validAllocationInput({...input(),cov:modelCovariance(['equity','short'])});
});
test('explicit interview priorities change the allocation without increasing the capacity or loss bounds',()=>{
 const plans=['sharpe','growth','stability'].map(optimizationGoal=>buildInterviewPlan({...healthyAnswers(),optimizationGoal}));
 assert.equal(plans[0].proposal.optimization.goal,'sharpe');assert.equal(plans[1].proposal.optimization.goal,'growth');
 assert.ok(plans[0].proposal.equity<plans[1].proposal.equity);assert.ok(plans[2].proposal.equity<=plans[1].proposal.equity);
 for(const p of plans){assert.ok(p.proposal.equity<=80);assert.ok(p.proposal.stressLoss<=10000);validatePortfolioProposal(p.proposal);}
 const small=allocateCents(.01,[.8,.2],['equity','short'],80,50);assert.deepEqual(small,[0,.01]);
});
test('new optimized proposals preserve funds, cents and limits and reject expanding the interview mandate',()=>{
 const p=buildInterviewPlan(healthyAnswers()).proposal;
 const audit={...p.optimization,goal:'sharpe'},next=optimizeProposal(p,audit);
 assert.ok(next.equity<p.equity);assert.equal(Math.round(next.positions.reduce((s,x)=>s+x.amount,0)*100),Math.round(p.amount*100));
 assert.equal(Math.round(next.positions.reduce((s,x)=>s+x.monthly,0)*100),Math.round(p.monthly*100));
 assert.throws(()=>optimizeProposal(p,{...audit,equityCap:100}));
 assert.throws(()=>validatePortfolioProposal({...p,stressLoss:0}));assert.throws(()=>validatePortfolioProposal({...p,equity:99}));
});

const now=Date.UTC(2026,9,19);
function asset(symbol,currency='EUR',rate=.01){let value=100;return {symbol,ok:true,meta:{currency,adjusted:true,providerLabel:'Synthetic test data',quality:'real'},monthly:Array.from({length:37},(_,i)=>{value*=1+rate;return {d:new Date(Date.UTC(2023,i+1,0)).toISOString().slice(0,10),a:value,c:value};})};}
const bundle=assets=>({assets,sources:[],generatedAt:new Date(now).toISOString(),matrix:null,lookback:'max'});
test('integrated histories use adjusted closed months with complete holdings and exact EUR conversion',()=>{
 const a=asset('AAA','USD',.01),fx=asset('USDEUR=X','EUR',.02);
 const h=historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([a,fx]),now);
 assert.equal(h.rows.length,36);assert.ok(h.rows.every(r=>Math.abs(r.returns[0]-(1.01*1.02-1))<1e-10));
 assert.throws(()=>historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([a]),now),/conversión/);
 assert.throws(()=>historyFromMarket('p',[{id:'a',symbol:'AAA'},{id:'b',symbol:'MISSING'}],bundle([a,fx]),now),/serie ajustada/);
 const noAdjust={...asset('AAA'),meta:{...a.meta,currency:'EUR',adjusted:false}};assert.throws(()=>historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([noAdjust]),now));
});
test('gaps and incomplete histories never become artificial returns or partial-coverage portfolios',()=>{
 const a=asset('AAA');a.monthly.splice(30,1);
 assert.throws(()=>historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([a]),now),/huecos/);
 const b=asset('AAA');b.monthly=b.monthly.slice(-24);assert.throws(()=>historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([b]),now),/24/);
});
test('historical risk uses actual portfolio returns and never subtracts fees twice',()=>{
 const h=historyFromMarket('p',[{id:'a',symbol:'AAA'}],bundle([asset('AAA')]),now),r=historicalRisk(h,[{assetId:'a',amount:10000}],0);
 assert.ok(Math.abs(r.annualizedReturn-(1.01**12-1))<1e-10);assert.ok(Math.abs(r.curve.at(-1).index-100*1.01**36)<1e-8);assert.equal(r.sharpe,null);assert.equal(r.drawdown,0);
 const m=structuralRisk([{id:'a',name:'Bond',amount:3000,role:'short',fee:.1},{id:'b',name:'Equity',amount:7000,role:'equity',fee:.14}]);
 assert.ok(Math.abs(m.shares.reduce((s,v)=>s+v,0)-1)<1e-9);assert.equal(m.scenarios[0].loss,-3710);
});
test('account performance separates deposits and withdrawals from gains and survives native serialization',()=>{
 let c={id:'c',name:'Account',createdAt:now,holdings:[{assetId:'x',amount:1000}],tracking:{valuations:[{date:'2025-01-01',value:1000,netFlow:0,note:'Opening'}]}};
 c=recordValuation(c,{date:'2025-02-01',value:1600,netFlow:500,note:'Deposit at close'});
 c=recordValuation(c,{date:'2025-03-01',value:1560,netFlow:-200,note:'Withdrawal at close'});
 const rows=accountSeries(c);assert.ok(Math.abs(rows.at(-1).index-121)<1e-9);assert.equal(rows[1].gain,100);assert.equal(rows[2].gain,160);
 const p=newPerson('Synthetic');p.portfolios=[c];p.activeId=c.id;
 const w={...emptyWorkspace(),people:[p],activePersonId:p.id};assert.deepEqual(validateWorkspace(w).people[0].portfolios[0].tracking,c.tracking);
 assert.throws(()=>validateTracking({valuations:[{date:'2025-02-30',value:10,netFlow:0,note:''}]}));
 assert.throws(()=>recordValuation(c,{date:'2024-01-01',value:100,netFlow:0,note:''}));
});
test('wealth sums registered accounts, excludes alternatives and proposals, and records negative net worth with debt',()=>{
 let p=newPerson('Synthetic');p.profile.cash=200;p.profile.otherAssets=500;p.mortgage.principal=2000;
 const account=(id,value)=>({id,name:id,createdAt:now,holdings:[{assetId:'x',amount:value}],tracking:{valuations:[{date:'2025-01-01',value,netFlow:0,note:''}]}});
 const proposal=buildInterviewPlan(healthyAnswers());p.portfolios=[account('a',100),account('b',300),{id:'draft',name:'Draft',createdAt:now,mode:'draft',holdings:[{assetId:'x',amount:99999}]},{id:'proposal',name:'Proposal',createdAt:now,holdings:proposal.holdings,proposal:proposal.proposal}];p.activeId='proposal';
 assert.equal(personWealth(p).investments,400);assert.equal(personWealth(p).net,-900);
 p=captureWealth(p,'2025-01-01');p.profile.cash=300;p=captureWealth(p,'2025-02-01');assert.equal(p.wealthHistory.length,2);
 const w={...emptyWorkspace(),people:[p],activePersonId:p.id};assert.deepEqual(validateWorkspace(w).people[0].wealthHistory,p.wealthHistory);
});
