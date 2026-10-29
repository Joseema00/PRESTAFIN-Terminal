import test from 'node:test';
import assert from 'node:assert/strict';
import { FUND_MODELS,modelStats,modelToHoldings,modelCompatibility,applyFundModel } from '../../desktop-runtime/fund-models.mjs';
import { FUND_DETAILS,FUND_PRODUCTS,FUND_PUBLISHED_ANNUAL } from '../../desktop-runtime/fund-catalog.mjs';
import { productById } from '../../desktop-runtime/investment-products.mjs';
import { cleanFundPoints,fundPerformance,returnBetween,chartWindow } from '../../desktop-runtime/fund-performance.mjs';
import { parseVanguardHistory,fetchVanguardHistory } from '../../desktop-runtime/market/fund-provider.server.mjs';
import { buildInterviewPlan } from '../../desktop-runtime/interview-plan.mjs';
import { validatePortfolioProposal } from '../../desktop-runtime/portfolio-proposal.mjs';
import { healthyAnswers } from './fixtures/interview.mjs';
const p=(d,a)=>({d,c:a,a});

test('published annual history covers every model class with an exact-ISIN source and ten complete calendar years',()=>{
 const ids=new Set(FUND_MODELS.flatMap(m=>m.allocation.map(p=>p.assetId)));
 assert.equal(ids.size,6);
 for(const id of ids){const snapshot=FUND_PUBLISHED_ANNUAL[id];assert.ok(snapshot,id);assert.equal(snapshot.isin,productById(id).isin);assert.equal(snapshot.currency,'EUR');assert.equal(snapshot.source,`https://fund-docs.vanguard.com/${snapshot.isin.toLowerCase()}-en.pdf`);assert.deepEqual(snapshot.years.map(x=>x.year),[2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]);assert.ok(snapshot.years.every(x=>Number.isFinite(x.value)));}
 assert.equal(FUND_PUBLISHED_ANNUAL['fund-vanguard-world'].years.find(x=>x.year===2022).value,-12.8);
 assert.equal(FUND_PUBLISHED_ANNUAL['fund-vanguard-euro-gov'].years.find(x=>x.year===2022).value,-18.3);
 assert.equal(FUND_PUBLISHED_ANNUAL['research-fidelity'],undefined);
});

test('15 distinct fund-only models preserve the declared mix and cents at small and large capital',()=>{
 assert.equal(FUND_MODELS.length,15);assert.equal(new Set(FUND_MODELS.map(m=>JSON.stringify(m.allocation))).size,15);
 for(const m of FUND_MODELS){const s=modelStats(m);assert.equal(s.equity+s.bonds+s.cash,100);
  for(const capital of [.01,1.03,10000.01,999999.99]){const holdings=modelToHoldings(m,capital);assert.equal(Math.round(holdings.reduce((s,h)=>s+h.amount,0)*100),Math.round(capital*100));assert.ok(holdings.every(h=>productById(h.assetId).vehicle==='Fondo'&&h.meta.isin===productById(h.assetId).isin));}}
 assert.throws(()=>modelToHoldings(FUND_MODELS[0],NaN));assert.throws(()=>modelToHoldings(FUND_MODELS[0],0));
});
test('models cannot override guarantees, loss limits, exclusions, duration or time horizon',()=>{
 const original=buildInterviewPlan(healthyAnswers()).proposal;
 assert.ok(modelCompatibility(FUND_MODELS[6],original,10).compatible);
 assert.equal(modelCompatibility(FUND_MODELS[10],original,10).compatible,false);
 assert.equal(modelCompatibility(FUND_MODELS[6],original,1).compatible,false);
 assert.equal(modelCompatibility(FUND_MODELS[6],{...original,settings:{...original.settings,excluded:['fund-vanguard-world']}},10).compatible,false);
 const protectedPlan=buildInterviewPlan({...healthyAnswers(),guarantee:'required'}).proposal;
 assert.equal(modelCompatibility(FUND_MODELS[0],protectedPlan,10).compatible,false);
 const short=buildInterviewPlan({...healthyAnswers(),horizon:'short'}).proposal;
 assert.equal(modelCompatibility(FUND_MODELS[0],short,10).compatible,false);
 assert.throws(()=>applyFundModel(FUND_MODELS[10],original,10));
});
test('applying a model retains a valid proposal, risk bounds and all funding fields; access pending stays conditional',()=>{
 const original=buildInterviewPlan(healthyAnswers()).proposal;
 const candidate=applyFundModel(FUND_MODELS[6],original,10);
 assert.equal(candidate.kind,'objective');assert.equal(candidate.fundedToday,0);assert.equal(candidate.amount,original.amount);assert.equal(candidate.optimization.equityCap,original.optimization.equityCap);
 assert.deepEqual(validatePortfolioProposal(candidate),candidate);
 assert.ok(candidate.positions.every(p=>productById(p.assetId).vehicle==='Fondo'));
 const funded=applyFundModel(FUND_MODELS[6],{...original,settings:{...original.settings,fundAccessConfirmed:true}},10);
 assert.equal(funded.kind,'investment');assert.equal(funded.fundedToday,original.fundedToday);
 // Two equity funds do not acquire fictitious low correlation from a shared planning block.
 assert.equal(funded.optimization.cov[0][1],funded.optimization.cov[0][0]);
});
test('same-class NAV returns distinguish cumulative, annualized and incomplete calendar periods',()=>{
 const data=[p('2021-12-31',100),p('2022-06-30',90),p('2022-12-30',110),p('2023-12-29',121),p('2024-12-31',133.1),p('2025-06-30',140)];
 const r=fundPerformance(data);assert.ok(Math.abs(r.annual.find(x=>x.year===2022).result.value-10)<1e-9);assert.equal(r.annual[0].result,null);assert.equal(r.annual.at(-1).partial,true);
 assert.ok(Math.abs(r.since.value-40)<1e-9);assert.ok(Math.abs(r.maxDrawdown+10)<1e-9);assert.equal(r.periods.find(x=>x.months===120).value,undefined);
 assert.equal(r.volatility,null);assert.equal(r.monthly[0].values.every(x=>x===null),true);
});
test('missing dates are not bridged into period returns, and duplicate/future/invalid prices are rejected',()=>{
 assert.equal(returnBetween([p('2024-01-01',100),p('2024-02-29',110)],'2024-01-31','2024-02-29'),null);
 for(const points of [[p('2099-01-01',100)],[p('2024-02-30',100)],[p('2024-01-01',0)],[p('2024-01-01',100),p('2024-01-01',101)]])assert.throws(()=>cleanFundPoints(points));
 assert.deepEqual(cleanFundPoints([p('2024-01-02',101),p('2024-01-01',100),p('2024-01-01',100)]),[p('2024-01-01',100),p('2024-01-02',101)]);
 assert.equal(chartWindow([p('2024-01-31',100),p('2024-02-29',110),p('2024-03-31',120)],'1m')[0].d,'2024-02-29');
});
const response=(currency='EUR',portId='9197')=>({data:{funds:[{portId,profile:{fundCurrency:currency},pricingDetails:{navPrices:{items:[{asOfDate:'2024-02-01',price:101,currencyCode:currency},{asOfDate:'2024-01-01',price:100,currencyCode:currency}]}}}]}});
test('issuer parser rejects another share-class identifier or currency and preserves NAV dates and values',()=>{
 const r=parseVanguardHistory(response(),'IE00B18GC888');assert.equal(r.instrument.isin,'IE00B18GC888');assert.equal(r.currency,'EUR');assert.equal(r.adjusted,true);assert.deepEqual(r.points,[p('2024-01-01',100),p('2024-02-01',101)]);
 assert.throws(()=>parseVanguardHistory(response('USD'),'IE00B18GC888'));assert.throws(()=>parseVanguardHistory(response('EUR','9837'),'IE00B18GC888'));assert.throws(()=>parseVanguardHistory({errors:[{}]},'IE00B18GC888'));
 for(const fund of FUND_PRODUCTS)assert.ok(FUND_DETAILS[fund.id]?.page.startsWith('https://'));
});
test('issuer request uses the known class and public endpoint; errors do not generate fallback prices',async()=>{
 const old=globalThis.fetch;try{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://www.vanguard.co.uk/gpx/graphql');assert.deepEqual(JSON.parse(options.body).variables.portIds,['9197']);return {ok:true,json:async()=>response()};};
  assert.equal((await fetchVanguardHistory('IE00B18GC888')).points.length,2);
  globalThis.fetch=async()=>({ok:false,status:429});await assert.rejects(fetchVanguardHistory('IE00B18GC888'),/HTTP 429/);
 }finally{globalThis.fetch=old;}
});
