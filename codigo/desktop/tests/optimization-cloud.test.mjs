import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatePortfolioCloud,optimizeContinuous,validateOptimizationStudy,OPTIMIZER_VERSION} from '../../desktop-runtime/optimization.mjs';

const fixture=(over={})=>({ids:['a','b'],names:['A','B'],means:[6,10],cov:[[400,0],[0,900]],currentWeights:[.5,.5],riskFree:2,method:'minVariance',source:'Independent synthetic cloud fixture',basis:'assumptions',...over});
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const anchors=r=>[r.point,r.minimumVariance,...r.frontier];

test('cloud preserves every generated point, repeats deterministically and computes analytic metrics',()=>{
 const x=fixture(),r=optimizeContinuous(x),before=JSON.stringify({x,r});
 const cloud=simulatePortfolioCloud(x,anchors(r));
 assert.equal(cloud.points.length,1500);
 assert.equal(cloud.admissible.length+cloud.excluded.length,1500);
 assert.deepEqual(cloud,simulatePortfolioCloud(x,anchors(r)));
 assert.equal(JSON.stringify({x,r}),before);
 assert.deepEqual(cloud.points.map(p=>p.sample),Array.from({length:1500},(_,i)=>i+1));
 for(const p of cloud.points){const [a,b]=p.weights;close(a+b,1);assert.ok(a>=0&&b>=0);close(p.mean,6*a+10*b);close(p.vol,Math.sqrt(400*a*a+900*b*b));close(p.sharpe,(p.mean-2)/p.vol);}
 const max=Math.max(...cloud.admissible.map(p=>p.sharpe));close(cloud.bestSharpe.sharpe,max);
});

test('excluded points remain visible and cannot win the admissible Sharpe comparison',()=>{
 const x=fixture({maxWeights:[1,.25]}),r=optimizeContinuous(x),cloud=simulatePortfolioCloud(x,anchors(r));
 assert.ok(cloud.excluded.length>0);assert.ok(cloud.admissible.length>0);
 for(const p of cloud.points)assert.equal(p.admissible,p.weights[1]<=.25+2e-7);
 assert.ok(cloud.bestSharpe.weights[1]<=.25+2e-7);
 close(cloud.bestSharpe.sharpe,Math.max(...cloud.admissible.map(p=>p.sharpe)));
 assert.ok(cloud.excluded.some(p=>p.sharpe>cloud.bestSharpe.sharpe));
});

test('explicit zero turnover retains only the current composition as admissible',()=>{
 const x=fixture({maxTurnover:0}),r=optimizeContinuous(x),cloud=simulatePortfolioCloud(x,anchors(r));
 assert.ok(cloud.admissible.length>0);assert.ok(cloud.excluded.length>0);
 for(const p of cloud.admissible){close(p.weights[0],.5);close(p.weights[1],.5);close(p.turnover,0);}
 const noExtraLimit=simulatePortfolioCloud({...x,maxTurnover:null},anchors(r));
 assert.equal(noExtraLimit.excluded.length,0);
});

test('one asset and zero volatility produce finite points and no undefined Sharpe winner',()=>{
 const x=fixture({ids:['cash'],names:['Cash'],means:[2],cov:[[0]],currentWeights:[1],maxVolatility:0});
 const r=optimizeContinuous(x),cloud=simulatePortfolioCloud(x,anchors(r),80);
 assert.equal(cloud.points.length,80);assert.equal(cloud.admissible.length,80);assert.equal(cloud.bestSharpe,null);
 for(const p of cloud.points){assert.deepEqual(p.weights,[1]);assert.equal(p.vol,0);assert.equal(p.mean,2);assert.equal(p.sharpe,null);}
});

test('thirty asset cloud supports the full universe and retains all samples',()=>{
 const n=30,x=fixture({ids:Array.from({length:n},(_,i)=>'a'+i),names:Array.from({length:n},(_,i)=>'Asset '+i),means:Array(n).fill(5),cov:Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?100:0)),currentWeights:Array(n).fill(1/n)});
 const r=optimizeContinuous(x,5),cloud=simulatePortfolioCloud(x,anchors(r));
 assert.equal(cloud.points.length,1500);assert.equal(cloud.admissible.length,1500);
 for(const p of cloud.points){assert.equal(p.weights.length,n);close(p.weights.reduce((a,b)=>a+b,0),1);close(p.mean,5);close(p.vol,10*Math.sqrt(p.weights.reduce((a,b)=>a+b*b,0)));}
});

test('saved study recreates the same cloud without growing or changing its payload',()=>{
 const x=fixture({maxWeights:[.8,null]}),study=validateOptimizationStudy({version:OPTIMIZER_VERSION,createdAt:100,capital:12000,input:x,result:optimizeContinuous(x)});
 const serialized=JSON.stringify(study),cloud=simulatePortfolioCloud(study.input,anchors(study.result));
 const reopened=validateOptimizationStudy(JSON.parse(serialized));
 assert.deepEqual(simulatePortfolioCloud(reopened.input,anchors(reopened.result)),cloud);
 assert.equal(JSON.stringify(study),serialized);assert.equal(JSON.stringify(reopened),serialized);assert.ok(serialized.length<250000);
});

test('cloud rejects unsupported sample sizes instead of silently truncating',()=>{
 for(const count of [0,5001,1.5,NaN])assert.throws(()=>simulatePortfolioCloud(fixture(),[],count),/simulación/);
});
