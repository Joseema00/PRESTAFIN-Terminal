import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { WorkspaceStore, validateWorkspace } from '../workspace.mjs';
import { isAppUrl, resolveAsset, validateMarketRequest } from '../security.mjs';
import { monthlyPayment } from '../../desktop-runtime/finance.mjs';
import { runWealth } from '../../desktop-runtime/wealth.mjs';
import { toMonthly,computeMetrics } from '../../desktop-runtime/market/metrics.mjs';

const fixture = () => ({version:1,portfolios:[{id:'local-1',name:'Principal',holdings:[],createdAt:Date.now()}],activeId:'local-1',
  profile:{cash:0,otherAssets:0,monthlyContribution:0},mortgage:{principal:0,rate:3,years:25,extraMonthly:0},
  settings:{contribGrowth:2,inflation:2.5,taxRate:20,expenses:0,share:0,realTerms:false},selectedModules:[],interviews:[],activeInterviewId:null});
const testRoot=path.resolve('.test-tmp');
async function temporary() { await mkdir(testRoot,{recursive:true}); return mkdtemp(path.join(testRoot,'prestafin-')); }
async function cleanup(directory) {
  const resolved=path.resolve(directory);
  assert.equal(path.dirname(resolved),testRoot);
  assert.ok(path.basename(resolved).startsWith('prestafin-'));
  await rm(resolved,{recursive:true,force:true});
}

test('a native workspace survives reopening and preserves its previous version',async() => {
  const dir = await temporary();
  try {
    const store = new WorkspaceStore(dir); assert.equal(await store.load(),null);
    const original = fixture(); await store.save(original);
    const updated = {...original,profile:{...original.profile,cash:12000}}; await store.save(updated);
    assert.equal((await new WorkspaceStore(dir).load()).people[0].profile.cash,12000);
    assert.equal(JSON.parse(await readFile(path.join(dir,'workspace.json.previous'),'utf8')).people[0].profile.cash,0);
  } finally { await cleanup(dir); }
});
test('concurrent saves retain the latest complete state',async() => {
  const dir = await temporary();
  try { const store = new WorkspaceStore(dir); await Promise.all(Array.from({length:15},(_,i) => store.save({...fixture(),profile:{cash:i,otherAssets:0,monthlyContribution:0}}))); assert.equal((await store.load()).people[0].profile.cash,14); }
  finally { await cleanup(dir); }
});
test('damaged workspace is reported, never silently replaced with a blank account',async() => {
  const dir = await temporary();
  try { const file = path.join(dir,'workspace.json'); await writeFile(file,'broken'); await assert.rejects(new WorkspaceStore(dir).load(),/conservado/); assert.equal(await readFile(file,'utf8'),'broken'); }
  finally { await cleanup(dir); }
});
test('restoration rejects invalid financial inputs, duplicate IDs and broken references',() => {
  assert.throws(() => validateWorkspace({...fixture(),activeId:'missing'}));
  assert.throws(() => validateWorkspace({...fixture(),profile:{cash:-1,otherAssets:0,monthlyContribution:0}}));
  assert.throws(() => validateWorkspace({...fixture(),portfolios:[...fixture().portfolios,...fixture().portfolios]}));
  assert.throws(() => validateWorkspace({...fixture(),settings:{...fixture().settings,inflation:NaN}}));
  assert.throws(() => validateWorkspace({...fixture(),version:2}));
});
test('restoration preserves portfolios, metadata and module selection',() => {
  const data = fixture(); data.portfolios[0].holdings = [{assetId:'custom-a',amount:150,meta:{symbol:'AAPL',name:'Apple',kind:'Acción',currency:'USD'}}]; data.selectedModules=[9,10,28];
  const restored=validateWorkspace(JSON.parse(JSON.stringify(data))); assert.deepEqual(restored.people[0].portfolios,data.portfolios); assert.deepEqual(restored.selectedModules,data.selectedModules);
});
test('native protocol denies foreign hosts and traversal paths',() => {
  assert.equal(isAppUrl('https://app'),false); assert.equal(isAppUrl('prestafin://evil/'),false);
  assert.equal(isAppUrl('prestafin://app/#/informes'),true);
  const root=path.resolve('dist-desktop');
  assert.equal(resolveAsset(root,'prestafin://app/assets/main.js'),path.join(root,'assets/main.js'));
  assert.throws(() => resolveAsset(root,'prestafin://app/%2e%2e%2fsecret'));
  assert.throws(() => resolveAsset(root,'prestafin://app/%5c..%5csecret'));
  assert.throws(() => resolveAsset(root,'prestafin://app/%00'));
});
test('market IPC accepts symbols, not arbitrary URLs or oversized portfolios',() => {
  assert.deepEqual(validateMarketRequest({symbols:['aapl','AAPL','^GSPC'],lookback:'5y',riskFree:2}).symbols,['AAPL','^GSPC']);
  assert.throws(() => validateMarketRequest({symbols:['https://example.com']}));
  assert.throws(() => validateMarketRequest({symbols:Array(31).fill('AAPL')}));
  assert.throws(() => validateMarketRequest({symbols:['AAPL'],lookback:'today'}));
});
test('existing loan engine handles zero interest and known annuity correctly',() => {
  assert.equal(monthlyPayment(120000,0,10),1000);
  assert.ok(Math.abs(monthlyPayment(180000,3.1,25)-862.970876)<.01);
});
test('zero-balance local profile produces finite projections without phantom wealth',() => {
  const run=runWealth({principal:0,rate:3,years:25,cash:0,otherAssets:0,portfolio:0,monthly:0,contribGrowth:2,extraPayment:0,er:0,vol:0,inflation:2.5,taxRate:20,monthlyExpenses:0,cashRate:1.5},0);
  assert.equal(run.netAfterTax,0);
  assert.ok(run.series.every(p => Number.isFinite(p.net) && p.net===0));
});
test('monthly aggregation uses actual observations and does not fabricate missing months',() => {
  assert.deepEqual(toMonthly([{d:'2025-01-01',c:10,a:10},{d:'2025-01-31',c:11,a:11},{d:'2025-03-02',c:13,a:13}]).map(p => p.d),['2025-01-31','2025-03-02']);
});
test('a flat historical series has zero volatility',() => {
  const points=Array.from({length:30},(_,i)=>({d:new Date(Date.UTC(2023,i,1)).toISOString().slice(0,10),c:100,a:100}));
  const result=computeMetrics({instrument:{symbol:'TEST',name:'Test',kind:'ETF',currency:'EUR',provider:'fixture'},points,dividends:[],splits:[],meta:{provider:'fixture',providerLabel:'Fixture',currency:'EUR',frequency:'monthly',firstDate:points[0].d,lastDate:points.at(-1).d,pointCount:points.length,fetchedAt:new Date().toISOString(),adjusted:true,quality:'real'}},{riskFree:0});
  assert.equal(result.vol,0);
});
