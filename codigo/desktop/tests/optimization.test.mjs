import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizeContinuous,estimateHistory,validateOptimizerInput,validateOptimizationStudy,constraintViolations,spectrum,OPTIMIZER_VERSION} from '../../desktop-runtime/optimization.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} (tol ${t})`);
const input=(over={})=>({ids:['a','b'],names:['A','B'],means:[6,10],cov:[[400,0],[0,900]],currentWeights:[.5,.5],riskFree:2,method:'minVariance',source:'Synthetic analytic fixture',basis:'assumptions',...over});
test('QP minimum variance, target return and utility match analytic solutions',()=>{
 const min=optimizeContinuous(input());close(min.point.weights[0],900/1300);close(min.point.vol,Math.sqrt(400*900/1300));
 const target=optimizeContinuous(input({method:'targetReturn',targetReturn:8}));close(target.point.weights[0],.5);close(target.point.mean,8);
 const utility=optimizeContinuous(input({method:'utility',riskAversion:5}));close(utility.point.weights[0],(.09-.04/5)/.13);
 assert.ok(min.diagnostics.stationarityResidual<1e-6);assert.ok(min.frontier.length>20);
 for(let i=1;i<min.frontier.length;i++){assert.ok(min.frontier[i].mean>=min.frontier[i-1].mean);assert.ok(min.frontier[i].vol>=min.frontier[i-1].vol-1e-6);}
});
test('maximum Sharpe matches the unconstrained tangency solution and is deterministic',()=>{
 const x=input({method:'maxSharpe'}),r=optimizeContinuous(x);close(r.point.weights[0],(4/400)/(4/400+8/900),2e-5);assert.deepEqual(optimizeContinuous(x),r);
 assert.throws(()=>optimizeContinuous(input({method:'maxSharpe',riskFree:12})),/superior/);
 assert.throws(()=>optimizeContinuous(input({method:'maxSharpe',cov:[[0,0],[0,0]]})),/nula/);
});
test('risk cap is honored and infeasibility is explicit',()=>{
 const r=optimizeContinuous(input({method:'targetRisk',maxVolatility:20}));close(r.point.vol,20,1e-5);assert.ok(r.point.mean>8);
 const capped=optimizeContinuous(input({method:'maxSharpe',maxVolatility:17}));assert.ok(capped.point.vol<=17+1e-6);
 assert.throws(()=>optimizeContinuous(input({maxVolatility:10})),/inviable/);
 assert.throws(()=>optimizeContinuous(input({method:'targetReturn'})),/necesita/);
});
test('empty options preserve defaults and explicit zero excludes an asset',()=>{
 assert.deepEqual(optimizeContinuous(input()),optimizeContinuous(input({targetReturn:null,maxVolatility:null,maxTurnover:null,minWeights:[null,null],maxWeights:[null,null]})));
 const r=optimizeContinuous(input({maxWeights:[0,null]}));close(r.point.weights[0],0);close(r.point.weights[1],1);
 const frozen=optimizeContinuous(input({maxTurnover:0}));close(frozen.point.weights[0],.5);
 assert.throws(()=>optimizeContinuous(input({method:'inverseVolatility',maxTurnover:0})),/rotación/);
 assert.throws(()=>optimizeContinuous(input({maxWeights:[.4,.4]})),/100/);
 assert.throws(()=>optimizeContinuous(input({minWeights:[.6,.6]})),/100/);
 assert.throws(()=>validateOptimizerInput(input({targetReturn:false})),/Parámetro/);
});
test('linear group limits and turnover survive optimization without renormalization',()=>{
 const x=input({method:'utility',riskAversion:.1,maxTurnover:.1,limits:[{name:'Equity cap',coefficients:[0,100],max:55}]});
 const r=optimizeContinuous(x);assert.ok(r.point.weights[1]<=.55+1e-7);assert.ok(r.point.turnover<=.1+1e-7);assert.ok(constraintViolations(x,r.point.weights).every(v=>v.residual<1e-6));
 assert.throws(()=>optimizeContinuous(input({limits:[{name:'Impossible',coefficients:[1,1],max:.5}]})),/incompatibles/);
});
test('singular matrices are diagnosed; indefinite/nonfinite inputs are rejected',()=>{
 const r=optimizeContinuous(input({cov:[[400,400],[400,400]]}));assert.ok(r.diagnostics.ridge>0);assert.equal(r.diagnostics.conditionNumber,null);assert.ok(r.warnings.some(s=>s.includes('singular')));
 assert.throws(()=>optimizeContinuous(input({cov:[[1,2],[2,1]]})),/semidefinida/);
 assert.throws(()=>optimizeContinuous(input({cov:[[1,NaN],[NaN,1]]})),/finita/);
 assert.throws(()=>optimizeContinuous(input({cov:[[1,.1],[.2,1]]})),/simétrica/);
 close(spectrum([[2,1],[1,2]])[0],1);
});
test('equal, inverse volatility and ERC preserve their definitions and reject incompatible bounds',()=>{
 close(optimizeContinuous(input({method:'equal'})).point.weights[0],.5);
 close(optimizeContinuous(input({method:'inverseVolatility'})).point.weights[0],.6);
 const r=optimizeContinuous(input({method:'riskParity'}));close(r.point.weights[0],.6);close(r.point.riskShares[0],.5);
 assert.throws(()=>optimizeContinuous(input({method:'equal',maxWeights:[.4,1]})),/incumple/);
 assert.throws(()=>optimizeContinuous(input({method:'inverseVolatility',cov:[[0,0],[0,1]]})),/positivas/);
});
test('continuous studies handle thirty assets and more than the previous four-product grid',()=>{
 const n=30,x=input({ids:Array.from({length:n},(_,i)=>'a'+i),names:Array.from({length:n},(_,i)=>'A'+i),means:Array(n).fill(5),cov:Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?100:0)),currentWeights:Array(n).fill(1/n)});
 const r=optimizeContinuous(x,5);for(const w of r.point.weights)close(w,1/n);close(r.point.vol,Math.sqrt(100/n));
});
function history(){return {portfolioId:'p',source:'Synthetic closed monthly returns',currency:'EUR',importedAt:Date.UTC(2026,10,1),columns:['a','b'],rows:Array.from({length:60},(_,i)=>({month:new Date(Date.UTC(2020,i,1)).toISOString().slice(0,7),returns:[.02*Math.sin(i)+.003,.04*Math.cos(i)+.005]}))};}
test('estimators use the selected common window, preserve explicit zero and return PSD matrices',()=>{
 const d=history();for(const method of ['sample','shrinkage','ledoitWolf','ewma','gerber']){const r=estimateHistory(d,{method,window:36});assert.equal(r.observations,36);assert.equal(r.dataStart,d.rows[24].month);assert.ok(spectrum(r.cov)[0]>=-1e-8);}
 assert.deepEqual(estimateHistory(d,{method:'sample'}).cov,estimateHistory(d,{method:'shrinkage',shrinkage:0}).cov);
 const r=estimateHistory(d,{method:'sample',overrides:[0,null]});assert.equal(r.means[0],0);assert.notEqual(r.means[1],0);
 assert.throws(()=>estimateHistory(d,{method:'sample',window:0}),/ventana/);
 assert.throws(()=>estimateHistory(d,{method:'ewma',decay:1}),/rango/);
});

test('Ledoit-Wolf matches an independent sklearn reference on the same 36 monthly observations',()=>{
 const r=estimateHistory(history(),{method:'ledoitWolf',window:36});
 // Independently calculated with sklearn.covariance.ledoit_wolf, centered MLE.
 const expected=[[26.98870666896599,-1.4812928745458327],[-1.4812928745458327,92.16185309812698]];
 r.cov.forEach((row,i)=>row.forEach((v,j)=>close(v,expected[i][j],1e-10)));close(r.shrinkage,.07982115071649884,1e-12);
});
test('saved studies reproduce metrics and reject corrupt results or constraints',()=>{
 const x=input(),s={version:OPTIMIZER_VERSION,createdAt:100,input:x,result:optimizeContinuous(x)};
 assert.equal(validateOptimizationStudy({...s,capital:12345.67}).capital,12345.67);assert.throws(()=>validateOptimizationStudy({...s,capital:NaN}),/Capital/);
 const saved=validateOptimizationStudy(s);assert.deepEqual(validateOptimizationStudy(saved),saved);
 assert.deepEqual(optimizeContinuous(saved.input),saved.result);
 assert.throws(()=>validateOptimizationStudy({...s,result:{...s.result,point:{...s.result.point,mean:80}}}),/métricas/);
 assert.throws(()=>validateOptimizationStudy({...s,input:{...x,maxWeights:[0,1]}}),/restricciones/);
});

test('saved estimator settings retain zero, validate ranges and survive canonical validation',()=>{
 const estimationSettings={method:'ewma',window:36,shrinkage:0,decay:.9,threshold:.7,meanShrinkage:0,overrides:[0,null]};
 const x=input({estimationSettings}),s={version:OPTIMIZER_VERSION,createdAt:100,input:x,result:optimizeContinuous(x)};
 assert.deepEqual(validateOptimizationStudy(s).input.estimationSettings,estimationSettings);
 assert.throws(()=>validateOptimizerInput({...x,estimationSettings:{...estimationSettings,decay:1}}),/Ajustes/);
});
