import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { normalizeIsin,fundSource,validateFundProfile } from '../../desktop-runtime/fund-lookup.mjs';
import { parseFtProfile,parseFtHistory,lookupFtFund,fetchFtHistory } from '../../desktop-runtime/market/ft-funds.server.mjs';
import { fetchHistoryChain } from '../../desktop-runtime/market/providers.server.mjs';
import { FundDirectory } from '../fund-directory.mjs';
import { configureMarketCache,getSeries } from '../market-store.mjs';
import { FUND_PRODUCTS } from '../../desktop-runtime/fund-catalog.mjs';

async function removeTestDirectory(dir){const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'prestafin-'));await rm(resolved,{recursive:true,force:true});}
const isin='LU0996182563';
const profile=(overrides={})=>({isin,name:'Synthetic Fund A',currency:'USD',providerId:'12345',source:fundSource(isin,'USD'),checkedAt:new Date().toISOString(),income:'Distribución',category:null,domicile:null,launchDate:null,ongoingCharge:null,...overrides});
const summary=(code=isin,currency='USD',income='Income')=>`<h1 class="mod-tearsheet-overview__header__name mod-tearsheet-overview__header__name--small">Synthetic &amp; Fund &#x41;</h1><div data-mod-config="{&quot;xid&quot;:&quot;12345&quot;,&quot;assetClass&quot;:&quot;Fund&quot;,&quot;symbol&quot;:&quot;${code}:${currency}&quot;,&quot;currency&quot;:&quot;${currency}&quot;}"></div><table><tr><th>ISIN</th><td>${code}</td></tr><tr><th>Income treatment</th><td>${income}</td></tr><tr><th>Ongoing charge</th><td>--</td></tr></table>`;
const row=(date,close)=>`<tr><td><span>${date}</span><span>short date</span></td><td>100</td><td>102</td><td>99</td><td>${close}</td><td>0</td></tr>`;
const history={html:row('Wednesday, January 03, 2024','1,123.45')+row('Tuesday, January 02, 2024','1,000.00')};

test('ISIN normalizes pasted whitespace and case, verifies all catalogue checksums and rejects malformed codes',()=>{
 assert.equal(normalizeIsin(' lu0996 182563\n'),isin);
 for(const p of FUND_PRODUCTS)assert.equal(normalizeIsin(p.isin),p.isin);
 for(const value of [null,42,'','LU0996182564','AAPL','https://example.com','../../secret','X'.repeat(100),'LU099618256A'])assert.throws(()=>normalizeIsin(value));
});
test('fund identity requires matching table, fund asset type, class symbol and explicit currency',()=>{
 const p=parseFtProfile(summary(),isin);assert.equal(p.name,'Synthetic & Fund A');assert.equal(p.currency,'USD');assert.equal(p.income,'Distribución');assert.equal(p.ongoingCharge,null);assert.equal(p.category,null);
 assert.throws(()=>parseFtProfile(summary('IE00BYX5NX33'),isin),/verificable/);
 assert.throws(()=>parseFtProfile(summary().replace('Fund&quot;','Equity&quot;'),isin));
 assert.throws(()=>parseFtProfile(summary().replace(`${isin}:USD`,`${isin}:EUR`),isin));
 assert.throws(()=>parseFtProfile('<html>Temporarily unavailable</html>',isin));
 const acc=parseFtProfile(summary(isin,'EUR','Accumulation').replace('<td>--</td>','<td>0.30%</td>'),isin);assert.equal(acc.income,'Acumulación');assert.equal(acc.ongoingCharge,.3);
 assert.equal(parseFtProfile(summary(isin,'USD','--'),isin).income,'No confirmado');
 for(const change of [{source:'https://evil.example'},{currency:''},{providerId:'../1'},{ongoingCharge:NaN},{isin:'LU0996182564'}])assert.throws(()=>validateFundProfile(profile(change)));
});
test('NAV parser uses close column, dates, native currency and distribution status without synthetic total returns',()=>{
 const s=parseFtHistory(history,profile());assert.equal(s.currency,'USD');assert.equal(s.instrument.isin,isin);assert.equal(s.adjusted,false);
 assert.deepEqual(s.points,[{d:'2024-01-02',c:1000,a:1000},{d:'2024-01-03',c:1123.45,a:1123.45}]);
 assert.equal(parseFtHistory(history,profile({income:'Acumulación'})).adjusted,true);
 assert.equal(parseFtHistory(history,profile({income:'No confirmado'})).adjusted,false);
 for(const raw of [{},null,{html:'<h1>Error</h1>'},{html:row('Tuesday, January 02, 2024','-5')},{html:row('Tuesday, February 30, 2024','100')},{html:row('Tuesday, January 02, 2099','100')},{html:history.html+row('Wednesday, January 03, 2024','1111')},{html:'<tr><td>changed format</td></tr>'}])assert.throws(()=>parseFtHistory(raw,profile()));
 assert.deepEqual(parseFtHistory({html:history.html+row('Thursday, January 04, 2024','--')},profile()).points,s.points);
});
test('live adapter requests only verified identifiers, deduplicates lookup, and never falls back to an unverified ticker',async()=>{
 const old=globalThis.fetch,calls=[];
 try{
  globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,text:async()=>String(url).includes('get-historical')?JSON.stringify(history):summary()};};
  const [a,b]=await Promise.all([lookupFtFund(isin),lookupFtFund(isin)]);assert.deepEqual(a,b);assert.equal(calls.length,1);
  const s=await fetchFtHistory(isin);assert.equal(s.currency,'USD');const requested=new URL(calls[1]);assert.equal(requested.searchParams.get('symbol'),'12345');assert.equal(requested.searchParams.get('startDate'),(Number(new Date().getUTCFullYear())-10)+new Date().toISOString().slice(4,10).replace(/-/g,'/'));
  const invalid=await fetchHistoryChain('LU0996182564','daily');assert.equal(invalid.ok,false);assert.equal(calls.length,3);
  globalThis.fetch=async url=>{calls.push(String(url));return {ok:false,status:429};};
  const missing=await fetchHistoryChain('ES0112611001','daily');assert.equal(missing.ok,false);assert.match(missing.error,/HTTP 429/);assert.ok(calls.every(u=>u.startsWith('https://markets.ft.com/')));
 }finally{globalThis.fetch=old;}
});
test('fund directory persists unique verified classes, deduplicates requests and survives restart or offline refresh',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'prestafin-funds-'));let count=0;
 try{
  const directory=new FundDirectory(dir,async()=>{count++;return profile();});
  const [a,b]=await Promise.all([directory.find(isin),directory.find(isin.toLowerCase())]);assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(count,1);assert.equal((await directory.list()).length,1);
  const disk=JSON.parse(await readFile(path.join(dir,'fund-directory.json'),'utf8'));assert.equal(disk.length,1);
  disk[0].checkedAt='2000-01-01T00:00:00Z';disk.push({...disk[0],isin:'LU0996182564'});await writeFile(path.join(dir,'fund-directory.json'),JSON.stringify(disk));
  const restarted=new FundDirectory(dir,async()=>{throw new Error('Sin conexión');});assert.equal((await restarted.list()).length,1);
  const offline=await restarted.find(isin);assert.equal(offline.ok,true);assert.match(offline.warning,/sin actualizar/);assert.equal(offline.profile.currency,'USD');
  assert.equal((await restarted.find('LU0996182564')).ok,false);
  assert.equal((await restarted.find('IE00BYX5NX33')).ok,false);assert.equal((await restarted.list()).length,1);
 }finally{await removeTestDirectory(dir);}
});
test('directory refuses a provider that returns another valid share class',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'prestafin-funds-'));
 try{const directory=new FundDirectory(dir,async()=>profile({isin:'IE00BYX5NX33',source:fundSource('IE00BYX5NX33','USD')}));const result=await directory.find(isin);assert.equal(result.ok,false);assert.equal((await directory.list()).length,0);}finally{await removeTestDirectory(dir);}
});
test('fund price cache preserves native currency and source, and marks offline copies as stale',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'prestafin-nav-')),old=globalThis.fetch;
 try{
  configureMarketCache(dir);globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify(history)});
  const first=await getSeries(isin,'daily',{force:true});assert.equal(first.ok,true);assert.equal(first.series.meta.currency,'USD');assert.match(first.series.meta.providerLabel,/Financial Times/);assert.equal(first.series.meta.adjusted,false);
  globalThis.fetch=async()=>{throw new Error('offline');};const fallback=await getSeries(isin,'daily',{force:true});assert.equal(fallback.ok,true);assert.equal(fallback.series.meta.quality,'partial');assert.match(fallback.series.meta.note,/offline/);assert.deepEqual(fallback.series.points,first.series.points);
 }finally{globalThis.fetch=old;await removeTestDirectory(dir);}
});
