import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createHandler} from '../../supabase/functions/terminal-billing/handler.mjs';
import {cloudStore} from '../../services/terminal-billing/cloud-store.mjs';
import {billingConfig} from '../billing.mjs';
const base='https://synthetic.supabase.co',url=base+'/functions/v1/terminal-billing',user={id:'a0000000-0000-4000-8000-000000000001',email:'synthetic@example.test',email_confirmed_at:'2026-10-31'};
const env={SUPABASE_URL:base,SUPABASE_ANON_KEY:'anon-fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',STRIPE_SECRET_KEY:'rk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_MONTH:'price_month',STRIPE_PRICE_YEAR:'price_year',STRIPE_PORTAL_CONFIGURATION:'bpc_fixture'};
const auth={Authorization:'Bearer synthetic-token'};
test('edge billing health and account status report incomplete setup without enabling payments or exposing secrets',async()=>{
 const handler=createHandler({env:{...env,STRIPE_SECRET_KEY:''},fetcher:async()=>new Response(JSON.stringify(user))});
 assert.deepEqual(await (await handler(new Request(url+'/health'))).json(),{ok:true,configured:false,environment:null});
 assert.equal((await handler(new Request(url+'/v1/status'))).status,401);
 const response=await handler(new Request(url+'/v1/status',{headers:auth}));assert.equal(response.status,200);const state=await response.json();assert.equal(state.configured,false);assert.equal(state.eligible,false);assert.equal(state.trialAvailable,false);
 assert.equal((await handler(new Request(url+'/v1/checkout',{method:'POST',headers:auth,body:'{"plan":"month"}'}))).status,503);
});
test('edge billing verifies account identity, refuses forged webhooks and processes signed subscription notifications',async()=>{
 let marked=null;
 const handler=createHandler({env,storageFactory:()=>({markTrial:async c=>{marked=c;}}),fetcher:async()=>new Response(JSON.stringify(user))});
 assert.equal((await handler(new Request(url+'/v1/webhook',{method:'POST',body:'{}'}))).status,400);
 const data=JSON.stringify({livemode:false,type:'customer.subscription.created',data:{object:{customer:'cus_fixture'}}}),t=Math.floor(Date.now()/1000),signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(t+'.'+data).digest('hex');
 assert.equal((await handler(new Request(url+'/v1/webhook',{method:'POST',headers:{'stripe-signature':'t='+t+',v1='+signature},body:data}))).status,200);assert.equal(marked,'cus_fixture');
 const signed=async object=>{const raw=JSON.stringify(object),sig=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(t+'.'+raw).digest('hex');return handler(new Request(url+'/v1/webhook',{method:'POST',headers:{'stripe-signature':'t='+t+',v1='+sig},body:raw}));};
 marked=null;await signed({livemode:false,type:'checkout.session.completed',data:{object:{customer:'cus_unpaid',mode:'subscription',payment_status:'unpaid'}}});assert.equal(marked,null);
 await signed({livemode:false,type:'checkout.session.async_payment_succeeded',data:{object:{customer:'cus_paid',mode:'subscription',payment_status:'paid'}}});assert.equal(marked,'cus_paid');
 const denied=createHandler({env,fetcher:async()=>new Response('{}',{status:401})});assert.equal((await denied(new Request(url+'/v1/portal',{method:'POST',headers:auth,body:'{}'}))).status,401);
});
test('cloud billing storage fences writes by account and lease and preserves trial history across workers',async()=>{
 const calls=[];let accept=true;
 const storage=cloudStore({url:base,key:'service-fixture',now:()=>100,fetcher:async (url,options)=>{calls.push({url,options});if(url.endsWith('/rpc/terminal_billing_acquire'))return new Response('true');if(options.method==='PATCH'&&options.headers.Prefer==='return=representation')return new Response(accept?'[{"user_id":"owner"}]':'[]');return new Response(null,{status:204});}});
 await assert.rejects(storage.patch(user.id,{customer_id:'cus_forbidden'}),/autorizada/);assert.equal(calls.length,0);
 const emptyInsert=cloudStore({url:base,key:'service-fixture',fetcher:async()=>new Response(null,{status:201})});await emptyInsert.create(user.id);
 await storage.acquire(user.id,'lease-fixture');await storage.patch(user.id,{customer_id:'cus_fixture'});
 const saved=calls.at(-1);assert.ok(saved.url.includes('lease_id=eq.lease-fixture'));assert.ok(saved.url.includes('lease_until=gt.100'));assert.ok(saved.url.includes(user.id));
 accept=false;await assert.rejects(storage.patch(user.id,{trial_used:1}),/caducado/);await storage.release(user.id,'lease-fixture');await assert.rejects(storage.patch(user.id,{attempt:null}),/autorizada/);
});
test('native billing accepts only the project-owned edge path and rejects foreign or arbitrary paths',()=>{
 const config={supabaseUrl:base,supabasePublishableKey:'sb_publishable_fixture',apiUrl:url};assert.equal(billingConfig(config).apiUrl,url);
 for(const apiUrl of ['https://evil.example/functions/v1/terminal-billing',base+'/arbitrary',url+'?token=x'])assert.throws(()=>billingConfig({...config,apiUrl}));
});


test('edge checkout verifies the real permanent entitlement columns before calling Stripe',async()=>{
 const calls=[];const handler=createHandler({env,storageFactory:()=>({}),fetcher:async target=>{
  calls.push(target);if(target.endsWith('/auth/v1/user'))return Response.json(user);
  if(target.includes('/terminal_entitlements?')){assert.equal(new URL(target).searchParams.get('select'),'license_type,revoked_at');return Response.json([{license_type:'pro_permanent',revoked_at:null}]);}
  assert.fail('Permanent accounts must not call Stripe');
 }});
 const response=await handler(new Request(url+'/v1/checkout',{method:'POST',headers:auth,body:'{"plan":"month"}'}));assert.equal(response.status,409);assert.match((await response.json()).error,/Pro permanente/);assert.equal(calls.length,2);
});
