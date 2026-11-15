import test from 'node:test';import assert from 'node:assert/strict';
import {marketHistoryCoverage,historyFromMarket} from '../../desktop-runtime/integrated-risk.mjs';
import {holdingFundIsin} from '../../desktop-runtime/fund-identity.mjs';
const now=Date.UTC(2026,10,15),rows=(start,length)=>Array.from({length},(_,i)=>({d:new Date(Date.UTC(2020,start+i+1,0)).toISOString().slice(0,10),c:100+i,a:100+i}));
const asset=(symbol,start,length)=>({symbol,ok:true,meta:{currency:'EUR',adjusted:true,providerLabel:'Synthetic test'},monthly:rows(start,length)});
const bundle=assets=>({assets,sources:[],matrix:null,generatedAt:new Date(now).toISOString(),lookback:'max'});
const positions=[{id:'a',symbol:'A',name:'Fondo completo',isin:'ES0165243009'},{id:'b',symbol:'B',name:'Fondo limitado',isin:'ES0165243025'}];
test('coverage names the fund that limits the common history and counts returns rather than prices',()=>{const b=bundle([asset('A',0,61),asset('B',49,12)]),c=marketHistoryCoverage(positions,b,now);assert.equal(c.assets[0].status,'ready');assert.equal(c.assets[1].status,'short');assert.equal(c.assets[1].consecutiveReturns,11);assert.match(c.message,/Fondo limitado.*ES0165243025.*11/);assert.equal(c.ready,false);assert.throws(()=>historyFromMarket('p',positions,b,now),/Fondo limitado/);});
test('long individual histories with short overlap are diagnosed as alignment, not a missing fund',()=>{const c=marketHistoryCoverage(positions,bundle([asset('A',0,36),asset('B',24,36)]),now);assert.ok(c.assets.every(a=>a.status==='ready'));assert.equal(c.commonReturns,11);assert.match(c.message,/histórico individual suficiente/);});
test('coverage distinguishes gaps, unadjusted prices, currency failures and provider errors',()=>{const a=asset('A',0,61);a.monthly.splice(55,1);assert.equal(marketHistoryCoverage([positions[0]],bundle([a]),now).assets[0].status,'gaps');for(const [b,status] of [[{...a,meta:{...a.meta,adjusted:false}},'unadjusted'],[{...a,meta:{...a.meta,currency:'USD'}},'fx'],[{symbol:'A',ok:false,error:'HTTP 429'},'missing']])assert.equal(marketHistoryCoverage([positions[0]],bundle([b]),now).assets[0].status,status);});
test('exact external fund ISIN takes priority; verified aliases never change an explicit class',()=>{const h={assetId:'market-0P0001T8V7.F',amount:1,meta:{symbol:'0P0001T8V7.F',kind:'Fondo',name:'MyInvestor Value C'}};assert.equal(holdingFundIsin(h),'ES0165243025');assert.equal(holdingFundIsin({...h,meta:{...h.meta,isin:'ES0165243009'}}),'ES0165243009');assert.equal(holdingFundIsin({...h,meta:{...h.meta,symbol:'0P0001A94F.F'}}),'LU1598720172');assert.equal(holdingFundIsin({...h,meta:{...h.meta,symbol:'OTHER'}}),null);assert.equal(holdingFundIsin({...h,meta:{...h.meta,kind:'ETF'}}),null);});


test('FX diagnostics blame the currency only when conversion removes sufficient native coverage',()=>{
 const fund={...asset('A',49,12),meta:{currency:'USD',adjusted:true}},fx=asset('USDEUR=X',0,61);
 assert.equal(marketHistoryCoverage([positions[0]],bundle([fund,fx]),now).assets[0].status,'short');
 const longFund={...asset('A',0,61),meta:{currency:'USD',adjusted:true}},shortFx=asset('USDEUR=X',49,12);
 assert.equal(marketHistoryCoverage([positions[0]],bundle([longFund,shortFx]),now).assets[0].status,'fx');
});

test('download identity survives native validation and blocks reuse after changing a share class',async()=>{
 const {validateHistory,holdingHistoryKey,analyseHistory}=await import('../../desktop-runtime/professional-analysis.mjs');
 const {validateWorkspace}=await import('../workspace.mjs');
 const {newPerson,emptyWorkspace}=await import('../../desktop-runtime/people.mjs');
 const person=newPerson('Identidad sintética'),c=person.portfolios[0];c.holdings=[{assetId:'a',amount:1000,meta:{symbol:'A',kind:'Fondo',name:'Fondo ficticio',isin:'ES0165243025',currency:'EUR'}}];
 const h=validateHistory({...historyFromMarket(c.id,[positions[0]],bundle([asset('A',0,61)]),now),holdingKeys:{a:holdingHistoryKey(c.holdings[0])}});person.histories=[h];
 const stored=validateWorkspace({...emptyWorkspace(),people:[person],activePersonId:person.id}).people[0].histories[0];assert.deepEqual(stored.holdingKeys,h.holdingKeys);assert.doesNotThrow(()=>analyseHistory(stored,c.holdings));
 const changed=structuredClone(c.holdings);changed[0].meta.isin='ES0165243009';assert.throws(()=>analyseHistory(stored,changed),/clase o el identificador/);
 const legacy={...h};delete legacy.holdingKeys;assert.throws(()=>analyseHistory(legacy,changed),/histórico anterior/);
 assert.doesNotThrow(()=>analyseHistory({...legacy,source:'CSV manual sintético'},c.holdings));
 assert.throws(()=>validateHistory({...h,holdingKeys:{a:55}}),/Identidad/);
});
