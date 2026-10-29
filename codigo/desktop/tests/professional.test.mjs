import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyInput } from '../../desktop-runtime/interview-input.mjs';
import { tailRisk,covariance,riskContributions,analyseHistory,costProjection,bondAnalytics,parseHistoryCSV,validateHistory } from '../../desktop-runtime/professional-analysis.mjs';
import { changeInterviewAnswer,reviewInterview,isInterviewReviewed,validateInterviews } from '../../desktop-runtime/risk-profile.mjs';
import { validateWorkspace } from '../workspace.mjs';
import { emptyWorkspace,newPerson } from '../../desktop-runtime/people.mjs';
import { DEFAULT_REPORT,DEFAULT_ADVISER } from '../../desktop-runtime/adviser.mjs';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function history(count=100){return {portfolioId:'p',source:'Synthetic test data, EUR total returns',importedAt:Date.UTC(2026,9,18),currency:'EUR',columns:['a','b'],rows:Array.from({length:count},(_,i)=>({month:new Date(Date.UTC(2010,i,1)).toISOString().slice(0,7),returns:[.02*Math.sin(i),.01*Math.cos(i)]}))};}
test('Spanish monetary entry preserves cents and rejects partial or malformed values',()=>{
  for(const [s,n] of [['1.234,56',1234.56],['1234.56',1234.56],['0,01',.01],['1.234',1234],['1 234,50 €',1234.5],['0',0]])assert.equal(parseMoneyInput(s),n);
  assert.equal(parseMoneyInput(''),undefined);
  for(const s of ['-1','Infinity','1e3','1,','1.2,34','12,345','10000000001','1,23,45'])assert.throws(()=>parseMoneyInput(s),s);
});
test('empirical expected shortfall handles fractional quantile mass and ties',()=>{
  const r=tailRisk([-.1,-.2,-.2,.1],.625);close(r.var,.2);close(r.es,.2);close(r.tailObservations,1.5);
  const s=tailRisk([-.1,-.2,-.3,.1],.625);close(s.var,.2);close(s.es,(.3+.5*.2)/1.5);
  const gains=tailRisk([.01,.02,.03],.95);assert.ok(gains.var<0);assert.ok(gains.es>=gains.var-1e-10);
});
test('Gerber excludes only joint-neutral observations, and risk contributions add to one',()=>{
  const rows=[[.1,.1],[-.1,-.1],[0,.1],[0,0]],sample=covariance(rows),gerber=covariance(rows,'gerber');
  close(gerber[0][1]/Math.sqrt(sample[0][0]*sample[1][1]),2/3);
  const r=riskContributions(gerber,[.4,.6]);close(r.shares.reduce((s,v)=>s+v,0),1);
  const shrunk=covariance(rows,'shrinkage');close(shrunk[0][1],sample[0][1]*.75);close(shrunk[0][0],sample[0][0]);
  assert.deepEqual(covariance([[0,0],[0,0]],'gerber'),[[0,0],[0,0]]);
});
test('historical import rejects gaps, duplicates, future months, nonfinite returns and missing coverage',()=>{
  const good=history();assert.equal(validateHistory(good).rows.length,100);
  const holdings=[{assetId:'a',amount:600},{assetId:'b',amount:400}];const r=analyseHistory(good,holdings);assert.equal(r.months,100);close(r.effectivePositions,1/.52);close(r.risk.volatility,r.volatility);
  assert.throws(()=>analyseHistory(good,holdings.slice(0,1)),/exactamente/);
  for(const mutation of [x=>{x.rows[1].month=x.rows[0].month;},x=>{x.rows.pop();x.rows[1].month='2001-01';},x=>{x.rows[0].returns[0]=NaN;},x=>{x.importedAt=Date.UTC(2010,1,1);},x=>{x.rows=x.rows.slice(0,20);},x=>{x.columns=['a','a'];}]){const bad=structuredClone(good);mutation(bad);assert.throws(()=>validateHistory(bad));}
  const csv='mes;a;b\n'+good.rows.map(r=>r.month+';'+r.returns.map(x=>String(x*100).replace('.',',')).join(';')).join('\n');
  const parsed=parseHistoryCSV(csv,'p','Synthetic',good.importedAt);close(parsed.rows[5].returns[1],good.rows[5].returns[1]);
  assert.throws(()=>parseHistoryCSV(csv.replace(/;[^;\n]+\n/,';;\n'),'p','Synthetic',good.importedAt));
});
test('walk-forward VaR never includes the month being tested',()=>{
  const d=history(61);d.rows.forEach(r=>{r.returns=[0,0];});d.rows[60].returns=[-.5,-.5];
  const r=analyseHistory(d,[{assetId:'a',amount:50},{assetId:'b',amount:50}]);assert.equal(r.backtest.observations,1);assert.equal(r.backtest.breaches,1);close(r.drawdown,-.5);
});
test('cost projection conserves deposits with zero growth and distinguishes fees from opportunity cost',()=>{
  const zero=costProjection(10000,100,10,0,0,0,0);close(zero.net,22000);close(zero.gross,22000);close(zero.paid,0);close(zero.impact,0);
  const costs=costProjection(10000,0,1,0,1,2,0);close(costs.net,9702,1e-7);close(costs.paid,298,1e-7);close(costs.impact,298,1e-7);
  const positive=costProjection(10000,100,10,5,1,0,2);assert.ok(positive.impact>positive.paid);assert.ok(positive.net>positive.real);
  assert.throws(()=>costProjection(10000,0,2,5,100,0,2));
});
test('bond duration agrees with the sensitivity of a zero-coupon price',()=>{
  const b=bondAnalytics(1000,0,5,10);close(b.price,1000/1.05**10);close(b.macaulay,10);close(b.modifiedDuration,10/1.05);
  const delta=.0001;const up=bondAnalytics(1000,0,5+delta*100,10).price,down=bondAnalytics(1000,0,5-delta*100,10).price;close((down-up)/(2*delta*b.price),b.modifiedDuration,1e-5);
});
test('configuration, report options and imported histories survive native canonicalization',()=>{
  const p=newPerson('Synthetic');const h=history();h.portfolioId=p.activeId;p.histories=[h];p.reportPreferences={...DEFAULT_REPORT,sections:['summary','costs'],notes:'Notas de prueba'};
  const w={...emptyWorkspace(),people:[p],activePersonId:p.id,adviser:{...DEFAULT_ADVISER,firm:'Prueba'}};const round=validateWorkspace(JSON.parse(JSON.stringify(w)));assert.deepEqual(round,w);
  assert.throws(()=>validateWorkspace({...w,adviser:{...w.adviser,firm:123}}));
  assert.throws(()=>validateWorkspace({...w,people:[{...p,histories:[h,h]}]}));
});
test('review requires complete answers and changing answers makes an existing review stale',()=>{
  const i={id:'i',alias:'Test',createdAt:1,updatedAt:1,step:0,revision:0,rulesVersion:1,answers:{}};
  assert.throws(()=>reviewInterview(i,'Adviser','Detailed review of the financial situation','2099-01-01'));
  const recorded={...i,review:{revision:0,reviewedAt:2,adviser:'Test',notes:'A documented test review',nextReviewDate:'2099-01-01'}};
  assert.equal(isInterviewReviewed(recorded),true);const changed=changeInterviewAnswer(recorded,'income',1000,3);assert.equal(isInterviewReviewed(changed),false);assert.deepEqual(validateInterviews([changed])[0].review,recorded.review);
  assert.throws(()=>validateInterviews([{...changed,review:{...recorded.review,revision:2}}]));
});
