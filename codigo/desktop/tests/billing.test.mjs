import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createBilling,verifySignature,summarize,validatePrice,requireAutomaticTaxSetup } from '../../services/terminal-billing/core.mjs';
import { handler,config } from '../../services/terminal-billing/server.mjs';
import { billingConfig,stripeUrl,BillingClient } from '../billing.mjs';

const NOW=1800000000000,user={id:'user-fixture',email:'billing@example.test',email_confirmed_at:'2026-10-01'};
const prices={month:'price_month',year:'price_year'};
function price(plan){return {id:prices[plan],active:true,livemode:false,currency:'eur',unit_amount:plan==='month'?5000:49000,recurring:{interval:plan,interval_count:1,usage_type:'licensed'},tax_behavior:'inclusive',billing_scheme:'per_unit'};}
function sub(status='trialing',plan='month'){return {id:'sub_fixture',customer:'cus_fixture',status,trial_end:NOW/1000+86400,created:NOW/1000,items:{data:[{quantity:1,price:price(plan),current_period_end:NOW/1000+86400*30}]}};}
function fixture(){
  const db=new DatabaseSync(':memory:');const calls=[],sessions=new Map(),keys=new Map();let subs=[],clock=NOW,failAfterCreate=false;
  const stripe=async(method,route,params,key)=>{
    calls.push({method,route,params,key});
    if(key&&keys.has(key))return keys.get(key);
    if(route==='/customers'){const c={id:'cus_fixture'};keys.set(key,c);return c;}
    if(route.startsWith('/subscriptions?'))return {data:subs,has_more:false};
    if(route.startsWith('/prices/'))return price(route.endsWith('year')?'year':'month');
    if(route==='/checkout/sessions'){
      const s={id:'cs_'+sessions.size,status:'open',url:'https://checkout.stripe.com/c/pay/test'};
      sessions.set(s.id,s);keys.set(key,s);if(failAfterCreate){failAfterCreate=false;throw new Error('timeout after Stripe accepted');}return s;
    }
    if(route.endsWith('/expire')){sessions.get(route.split('/')[3]).status='expired';return {};}
    if(route.startsWith('/checkout/sessions/'))return sessions.get(route.split('/')[3]);
    if(route==='/billing_portal/sessions')return {url:'https://billing.stripe.com/p/session/test'};
    throw new Error('Unexpected Stripe request '+route);
  };
  const billing=createBilling({db,stripe,prices,live:false,publicUrl:'https://billing.example.test',portalConfiguration:'bpc_test',now:()=>clock});
  return {db,billing,calls,sessions,setSubs:x=>subs=x,advance:ms=>clock+=ms,fail:()=>failAfterCreate=true,close:()=>db.close()};
}

test('billing: paid checkout uses exact prices, no automatic trial, card collection and fixed return destinations',async()=>{
  const f=fixture();try{
    await f.billing.status(user);f.advance(86400000*3); // Merely viewing prices must not start the customer request or trial.
    await f.billing.checkout(user,'year');
    const p=f.calls.find(c=>c.route==='/checkout/sessions').params;
    assert.equal(p['line_items[0][price]'],'price_year');assert.equal(p['subscription_data[trial_period_days]'],undefined);
    assert.equal(p.payment_method_collection,'always');assert.equal(p.customer,'cus_fixture');assert.equal(p.success_url,'https://billing.example.test/return?result=success');
    assert.equal(p['payment_method_types[0]'],undefined);assert.match(p.integration_identifier,/^prestafin_terminal_[a-z]{8}$/);
    assert.equal(p['consent_collection[terms_of_service]'],'required');
    await assert.rejects(f.billing.checkout(user,'price_tampered'),/Plan no válido/);
    const p50=price('month');validatePrice(p50,'month',false);assert.throws(()=>validatePrice({...p50,unit_amount:1},'month',false));assert.throws(()=>validatePrice({...p50,tax_behavior:'exclusive'},'month',false));assert.throws(()=>validatePrice(p50,'month',true));
  }finally{f.close();}
});
test('billing: a Tax address without an active registration blocks live checkout before customer creation',async()=>{
  assert.throws(()=>requireAutomaticTaxSetup({status:'active'},{data:[]}),/configuración fiscal/);
  assert.throws(()=>requireAutomaticTaxSetup({status:'pending'},{data:[{status:'active'}]}),/configuración fiscal/);
  assert.throws(()=>requireAutomaticTaxSetup({status:'active'},{data:[{status:'expired'}]}),/configuración fiscal/);
  requireAutomaticTaxSetup({status:'active'},{data:[{status:'active'}]});
  const db=new DatabaseSync(':memory:');const calls=[];
  const stripe=async(method,route)=>{calls.push({method,route});if(route==='/tax/settings')return {status:'active'};if(route.startsWith('/tax/registrations'))return {data:[]};throw new Error('Must not create a customer or checkout');};
  try{
    const billing=createBilling({db,stripe,prices,live:true,publicUrl:'https://billing.example.test',portalConfiguration:'bpc_test',now:()=>NOW});
    await assert.rejects(billing.checkout(user,'month'),/configuración fiscal/);
    assert.equal(calls.some(c=>c.method==='POST'),false);
  }finally{db.close();}
});
test('billing: restricted keys support separate live/test environments without exposing secrets',()=>{
  const env={STRIPE_SECRET_KEY:'rk_live_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_MONTH:prices.month,STRIPE_PRICE_YEAR:prices.year,STRIPE_PORTAL_CONFIGURATION:'bpc_fixture',SUPABASE_URL:'https://auth.example.test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',PUBLIC_URL:'https://billing.example.test',BILLING_DB:':memory:'};
  assert.equal(config(env).live,true);
  assert.equal(config({...env,STRIPE_SECRET_KEY:'rk_test_fixture'}).live,false);
  assert.throws(()=>config({...env,STRIPE_SECRET_KEY:'pk_live_fixture'}),/Claves/);
});
test('billing: repeats reuse checkout, switching plan expires it and parallel calls cannot create two',async()=>{
  const f=fixture();try{
    const results=await Promise.allSettled([f.billing.checkout(user,'month'),f.billing.checkout(user,'month')]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    await f.billing.checkout(user,'month');assert.equal(f.sessions.size,1);
    await f.billing.checkout(user,'year');assert.equal(f.sessions.size,2);assert.equal(f.sessions.get('cs_0').status,'expired');
  }finally{f.close();}
});
test('billing: timeout after checkout creation is recovered with the same persisted idempotency key',async()=>{
  const f=fixture();try{f.fail();await assert.rejects(f.billing.checkout(user,'month'),/timeout/);await f.billing.checkout(user,'month');assert.equal(f.sessions.size,1);const calls=f.calls.filter(c=>c.route==='/checkout/sessions');assert.equal(calls[0].key,calls[1].key);assert.deepEqual(calls[0].params,calls[1].params);}finally{f.close();}
});
test('billing: canceled subscribers can return but never receive another trial',async()=>{
  const f=fixture();try{
    await f.billing.checkout(user,'month');f.sessions.get('cs_0').status='complete';f.setSubs([sub('trialing')]);
    await assert.rejects(f.billing.checkout(user,'year'),/Ya tienes/);
    assert.equal((await f.billing.status(user)).trialAvailable,false);
    f.setSubs([sub('canceled')]);await f.billing.checkout(user,'year');
    const p=f.calls.filter(c=>c.route==='/checkout/sessions').at(-1).params;
    assert.equal(p['subscription_data[trial_period_days]'],undefined);
  }finally{f.close();}
});
test('billing: subscription entitlement checks expiry, recognized product, quantity and payment status',()=>{
  for(const status of ['active','trialing'])assert.equal(summarize(sub(status),prices,NOW).eligible,true);
  for(const status of ['past_due','unpaid','incomplete','incomplete_expired','canceled','paused'])assert.equal(summarize(sub(status),prices,NOW).eligible,false);
  assert.equal(summarize({...sub(),trial_end:NOW/1000-1},prices,NOW).eligible,false);
  assert.equal(summarize({...sub(),pause_collection:{}},prices,NOW).eligible,false);
  const wrong=sub();wrong.items.data[0].price.id='price_elsewhere';assert.equal(summarize(wrong,prices,NOW).eligible,false);
  const qty=sub();qty.items.data[0].quantity=2;assert.equal(summarize(qty,prices,NOW).eligible,false);
});
test('billing: forged/stale webhook signatures fail; duplicates and late events cannot restore access',async()=>{
  const raw=Buffer.from(JSON.stringify({livemode:false,type:'customer.subscription.created',data:{object:sub()}}));
  const t=NOW/1000,secret='whsec_fixture',signature=createHmac('sha256',secret).update(t+'.').update(raw).digest('hex');
  const event=verifySignature(raw,`t=${t},v1=${'0'.repeat(64)},v1=${signature}`,secret,NOW);
  assert.throws(()=>verifySignature(Buffer.from('{}'),`t=${t},v1=${signature}`,secret,NOW));
  assert.throws(()=>verifySignature(raw,`t=${t},v1=${signature}`,secret,NOW+301000));
  const f=fixture();try{
    await f.billing.checkout(user,'month');await f.billing.webhook(event);await f.billing.webhook(event);
    f.setSubs([sub('canceled')]);assert.equal((await f.billing.status(user)).eligible,false);assert.equal((await f.billing.status(user)).trialAvailable,false);
    await assert.rejects(f.billing.webhook({...event,livemode:true}));
  }finally{f.close();}
});
test('billing: portal ownership always comes from server storage',async()=>{
  const f=fixture();try{await f.billing.checkout(user,'month');await f.billing.portal(user);const p=f.calls.at(-1).params;assert.equal(p.customer,'cus_fixture');assert.equal(p.configuration,'bpc_test');await assert.rejects(f.billing.portal({id:'another-user'}));}finally{f.close();}
});
test('billing: HTTPS/public-key configuration and external URL allowlist reject secrets and fake Stripe URLs',()=>{
  assert.equal(billingConfig({}),null);
  assert.throws(()=>billingConfig({apiUrl:'https://example.test',supabaseUrl:'https://x.supabase.co',supabasePublishableKey:'sb_secret_no'}));
  for(const url of ['http://checkout.stripe.com','https://checkout.stripe.com.evil.test','https://checkout.stripe.com@evil.test','https://checkout.stripe.com:444/pay'])assert.throws(()=>stripeUrl(url,'checkout'));
  assert.equal(stripeUrl('https://billing.stripe.com/p/session','portal'),'https://billing.stripe.com/p/session');
});
test('billing native: only encrypted refresh token is saved, no token reaches the renderer, logout preserves workspace',async()=>{
  const folder=await mkdtemp(path.resolve('qa/billing-'));const opens=[];
  const crypto={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s).reverse(),decryptString:b=>Buffer.from(b).reverse().toString()};
  let fail=false;
  const fetcher=async url=>{
    if(fail)throw new Error('offline');
    const value=url.endsWith('/auth/v1/user')?user:url.includes('/token?')?{access_token:'access-secret',refresh_token:'refresh-secret',expires_in:3600,user}:{eligible:true,subscription:sub(),url:'https://checkout.stripe.com/c/pay/test'};
    return new Response(JSON.stringify(value),{status:200});
  };
  const native=new BillingClient({folder,crypto,open:async url=>opens.push(url),fetcher,config:{apiUrl:'https://billing.example.test',supabaseUrl:'https://auth.example.test',supabasePublishableKey:'sb_publishable_test'}});
  try{
    await native.signIn(user.email,'synthetic-password');const bytes=await readFile(path.join(folder,'billing-session.bin'));assert.ok(!bytes.includes(Buffer.from('refresh-secret')));assert.ok(!crypto.decryptString(bytes).includes('access-secret'));
    const state=await native.status();assert.equal(state.email,user.email);assert.ok(!JSON.stringify(state).includes('secret'));
    const reopened=new BillingClient({...native});assert.equal((await reopened.status()).email,user.email);
    await native.checkout('year');assert.equal(opens.length,1);
    fail=true;await assert.rejects(native.status(),/offline/);await native.logout();assert.equal((await native.status()).eligible,false);
  }finally{await rm(folder,{recursive:true,force:true});}
});
test('billing HTTP: auth is mandatory, identity cannot be supplied in request and webhooks require signatures',async()=>{
  const f=fixture();
  const server=http.createServer(handler({billing:f.billing,settings:{SUPABASE_URL:'https://auth.example.test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',STRIPE_WEBHOOK_SECRET:'whsec_fixture'},clock:()=>NOW,fetcher:async()=>new Response(JSON.stringify(user))}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(url+'/v1/status')).status,401);
    const auth={Authorization:'Bearer signed-test-token','Content-Type':'application/json'};
    assert.equal((await fetch(url+'/v1/checkout',{method:'POST',headers:auth,body:JSON.stringify({plan:'month',customer:'cus_someone_else'})})).status,400);
    assert.equal((await fetch(url+'/v1/status',{headers:auth})).status,200);
    assert.equal((await fetch(url+'/v1/webhook',{method:'POST',body:'{}'})).status,400);
    const result=await fetch(url+'/return?result=success');assert.equal(result.status,200);assert.match(await result.text(),/comprobará tu suscripción/);
  }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});


test('billing: a persisted old trial checkout is expired and replaced with a paid session',async()=>{
 const f=fixture();try{
  await f.billing.checkout(user,'month');const row=f.db.prepare('select * from billing_accounts where user_id=?').get(user.id),attempt=JSON.parse(row.attempt);attempt.params['subscription_data[trial_period_days]']=14;
  f.db.prepare('update billing_accounts set attempt=? where user_id=?').run(JSON.stringify(attempt),user.id);
  await f.billing.checkout(user,'month');assert.equal(f.sessions.get('cs_0').status,'expired');assert.equal(f.sessions.size,2);
  assert.equal(f.calls.filter(c=>c.route==='/checkout/sessions').at(-1).params['subscription_data[trial_period_days]'],undefined);assert.equal((await f.billing.status(user)).trialAvailable,false);
 }finally{f.close();}
});
