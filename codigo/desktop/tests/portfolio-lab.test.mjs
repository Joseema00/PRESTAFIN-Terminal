import test from 'node:test';
import assert from 'node:assert/strict';
import {allocationSweep,bounded,fundAlternatives,planningBasis,portfolioSnapshot,simulateScenarios} from '../../desktop-runtime/portfolio-lab.mjs';
const holdings=[{assetId:'research-fidelity',amount:6000},{assetId:'research-vanguard-bond-fund',amount:4000}];
test('lab: exact capital and concentration remain available without classification or history',()=>{
 const unknown=[{assetId:'unknown-share-class',amount:12000,meta:{name:'Unclassified fund',symbol:'UNKNOWN',currency:'EUR',kind:'Fondo'}}];
 const s=portfolioSnapshot(unknown);assert.equal(s.total,12000);assert.equal(s.effective,1);assert.equal(s.coverage,0);assert.equal(planningBasis(unknown).basis,null);assert.deepEqual(fundAlternatives(unknown),[]);
 assert.equal(portfolioSnapshot([...unknown,{assetId:'invalid',amount:NaN},{assetId:'zero',amount:0}]).total,12000);
});
test('lab: all alternative metrics use the same planning basis and preserve current holdings',()=>{
 const copy=structuredClone(holdings),base=planningBasis(holdings).basis,rows=fundAlternatives(holdings,{count:5,maxAllocation:.2});assert.ok(base);assert.ok(rows.length>=3);
 assert.deepEqual(holdings,copy);assert.equal(new Set(rows.map(x=>x.product.isin)).size,rows.length);
 for(const a of rows){assert.equal(a.product.vehicle,'Fondo');assert.ok(a.allocation>0&&a.allocation<=.2);assert.ok(Math.abs(a.weights.reduce((s,w)=>s+w,0)-1)<1e-12);assert.ok(Math.abs(a.metrics.sharpe-(a.metrics.mean-2.2)/a.metrics.vol)<1e-12);assert.equal(a.improves,a.improvement>1e-6);assert.ok(Math.abs(a.improvement-(a.metrics.sharpe-base.metrics.sharpe))<1e-12);}
});
test('lab: fund candidates respect equity/stress limits and no improvement is guaranteed',()=>{
 const a=fundAlternatives(holdings,{metric:'cost',equityCap:62,lossLimit:50,count:5});for(const row of a){assert.ok(Math.abs(row.improvement-(planningBasis(holdings).basis.metrics.fee-row.metrics.fee))<1e-12);const eq=row.weights.slice(0,-1)[0]+(row.product.role==='equity'?row.allocation:0);assert.ok(eq<=.62+1e-9);}
 assert.deepEqual(fundAlternatives(holdings,{equityCap:0,maxAllocation:.2}),[]);
});
test('lab: infeasible concentration caps are never silently relaxed',()=>{
 const result=allocationSweep(holdings,2.2,'sharpe',.2);assert.equal(result.cap,.2);assert.equal(result.best,null);assert.equal(result.points.length,0);assert.ok(result.current.vol>0);
 const feasible=allocationSweep(holdings,2.2,'volatility',.7);assert.ok(feasible.best);assert.ok(feasible.points.every(p=>p.weights.every(w=>w<=.7+1e-9)));
});
test('lab: blank/invalid optional settings restore bounded defaults and zero remains meaningful',()=>{
 assert.equal(bounded(null,2000,100,20000),2000);assert.equal(bounded(NaN,2000,100,20000),2000);assert.equal(bounded(50000,2000,100,20000),20000);assert.equal(bounded(0,5,0,100),0);
 const r=simulateScenarios({initial:100,monthly:10,years:1,sims:100,mean:0,vol:0,goal:220});assert.equal(r.median,220);assert.equal(r.p5,220);assert.equal(r.p95,220);assert.equal(r.contributed,220);assert.equal(r.pGoal,1);assert.equal(r.pLoss,0);assert.equal(r.drawdown95,0);assert.equal(r.histogram.reduce((s,b)=>s+b.count,0),100);
});
test('lab: all stochastic processes are seeded, finite, ordered and leave input data untouched',()=>{
 for(const model of ['gbm','jump','regime','ou','bootstrap']){
  const input={initial:10000,monthly:100,years:2,sims:150,seed:82,mean:5,vol:18,model,history:Array.from({length:36},(_,i)=>Math.sin(i)*.03)};const before=structuredClone(input),a=simulateScenarios(input),b=simulateScenarios(input);assert.deepEqual(a,b);assert.deepEqual(input,before);assert.equal(a.model,model);assert.equal(a.curve[0].p50,10000);assert.equal(a.curve.at(-1).year,2);
  for(const p of a.curve){assert.ok(p.p5<=p.p25&&p.p25<=p.p50&&p.p50<=p.p75&&p.p75<=p.p95);assert.ok(Number.isFinite(p.p95)&&p.p5>=0);assert.ok(p.drawdown95>=0&&p.drawdown95<=100);}
  assert.equal(a.paths.length,24);assert.ok(a.paths.every(p=>p.length===a.curve.length));assert.ok(a.tailMean<=a.p5+1e-9);
 }
});
test('lab: missing historical bootstrap never fabricates observations and identifies fallback',()=>{
 const r=simulateScenarios({initial:100,years:1,sims:100,model:'bootstrap',history:[.01]});assert.equal(r.requested,'bootstrap');assert.equal(r.model,'gbm');assert.equal(r.fallback,true);
});
test('lab: drawdown excludes new contributions and costs/inflation do not create real history',()=>{
 const input={initial:10000,monthly:100,years:3,sims:150,mean:4,vol:20,seed:38};const a=simulateScenarios(input),b=simulateScenarios({...input,monthly:100000});assert.equal(a.drawdown95,b.drawdown95);assert.ok(b.median>a.median);
 const c=simulateScenarios({...input,extraFee:2,inflation:2});assert.ok(c.median<a.median);assert.ok(c.contributed<a.contributed);
});
test('lab: compensated Merton drift preserves the intended expectation within Monte Carlo tolerance',()=>{
 const a=simulateScenarios({initial:10000,years:1,sims:5000,model:'jump',mean:5,vol:0,jumpIntensity:1,jumpMean:-20,jumpVol:10,seed:99});assert.ok(Math.abs(a.expected/(10000*Math.exp(.05))-1)<.035);
});
