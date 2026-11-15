import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import path from 'node:path';
import { BillingClient,billingConfig,emailProof } from '../billing.mjs';
import { AccountWorkspaces } from '../account-workspaces.mjs';
import { emptyWorkspace,newPerson } from '../../desktop-runtime/people.mjs';

const config={apiUrl:'',supabaseUrl:'https://auth.example.test',supabasePublishableKey:'sb_publishable_test'};
const user={id:'9f20fbf4-00f4-49b0-a9d6-cee3ce804a03',email:'synthetic@example.test',email_confirmed_at:'2026-10-30'};
const password='synthetic-Password-Only-For-Tests';
const session={access_token:'private-access',refresh_token:'private-refresh',expires_in:3600,user};
async function fixture(handler){
  const folder=await mkdtemp(path.resolve('qa/email-auth-')),calls=[];
  const crypto={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s).reverse(),decryptString:b=>Buffer.from(b).reverse().toString()};
  const client=new BillingClient({folder,crypto,config,open:async()=>assert.fail('email auth must not open browser'),fetcher:async(url,options)=>{
    const body=options.body?JSON.parse(options.body):undefined;calls.push({url,body,options});
    const value=handler?await handler(url,options,body):url.endsWith('/user')?user:session;
    return value instanceof Response?value:new Response(JSON.stringify(value));
  }});
  return {client,calls,folder,crypto,close:()=>rm(folder,{recursive:true,force:true})};
}
test('email registration waits for confirmation and stores no password or unverified session',async()=>{
  const f=await fixture(async url=>url.endsWith('/signup')?{user:{...user,email_confirmed_at:null}}:assert.fail(url));
  try{
    assert.equal(billingConfig(config).apiUrl,'');
    assert.deepEqual(await f.client.signUp(user.email,password),{confirmationRequired:true});
    assert.deepEqual(f.calls[0].body,{email:user.email,password});assert.equal((await f.client.status()).email,null);
    await assert.rejects(readFile(path.join(f.folder,'billing-session.bin')),{code:'ENOENT'});
  }finally{await f.close();}
});
test('password login verifies identity, encrypts only refresh credentials and survives reopening',async()=>{
  const f=await fixture();try{
    await f.client.signIn(user.email,password);
    assert.match(f.calls[0].url,/token\?grant_type=password$/);assert.equal(f.calls[1].url,config.supabaseUrl+'/auth/v1/user');
    const state=await f.client.status();assert.equal(state.user.id,user.id);assert.equal(state.configured,false);assert.ok(!JSON.stringify(state).includes('private-'));
    const stored=await readFile(path.join(f.folder,'billing-session.bin'));const clear=f.crypto.decryptString(stored);
    assert.ok(!clear.includes(password));assert.ok(!clear.includes('private-access'));assert.ok(!stored.includes(Buffer.from('private-refresh')));
    const reopened=new BillingClient({...f.client});assert.equal((await reopened.status()).email,user.email);
    await assert.rejects(f.client.checkout('month'),/no están activados/);await f.client.logout();assert.equal((await f.client.status()).email,null);
  }finally{await f.close();}
});
test('wrong passwords and unconfirmed or mismatched identities never create a native session',async()=>{
  for(const result of [new Response(JSON.stringify({error_code:'invalid_credentials',msg:password}),{status:400}),{...user,email_confirmed_at:null},{...user,email:'another@example.test'}]){
    const f=await fixture(async url=>url.endsWith('/user')?result:result instanceof Response?result:session);
    try{await assert.rejects(f.client.signIn(user.email,password),e=>!e.message.includes(password));assert.equal(f.client.session,null);}finally{await f.close();}
  }
});
test('confirmation supports codes and matching Supabase links, rejecting other projects and recovery proofs',async()=>{
  assert.deepEqual(emailProof(config.supabaseUrl,user.email,'123456','signup'),{email:user.email,token:'123456',type:'signup'});
  const url=config.supabaseUrl+'/auth/v1/verify?token=hash-from-email&type=signup&redirect_to=https://unused.example.test';
  assert.deepEqual(emailProof(config.supabaseUrl,user.email,url,'signup'),{token_hash:'hash-from-email',type:'signup'});
  assert.throws(()=>emailProof(config.supabaseUrl,user.email,url.replace('auth.example.test','attacker.example.test'),'signup'));
  assert.throws(()=>emailProof(config.supabaseUrl,user.email,url.replace('type=signup','type=recovery'),'signup'));
  const f=await fixture();try{await f.client.confirmEmail(user.email,url);assert.equal(f.client.session.user.id,user.id);assert.equal(f.calls[0].body.type,'signup');}finally{await f.close();}
});
test('recovery changes the password with a fresh verified proof, revokes sessions and never opens app data',async()=>{
  const f=await fixture(async(url,options)=>url.endsWith('/user')&&options.method==='GET'?user:url.endsWith('/user')&&options.method==='PUT'?{user}:url.includes('/logout')?new Response(null,{status:204}):session);
  try{
    await assert.rejects(f.client.resetPassword(user.email,'123456','short'),/8 caracteres/);assert.equal(f.calls.length,0);
    await f.client.resetPassword(user.email,'123456',password);
    const update=f.calls.find(c=>c.options.method==='PUT');assert.deepEqual(update.body,{password});assert.equal(update.options.headers.Authorization,'Bearer private-access');
    assert.ok(f.calls.some(c=>c.url.endsWith('/logout?scope=global')));assert.equal(f.client.session,null);
    await assert.rejects(readFile(path.join(f.folder,'billing-session.bin')),{code:'ENOENT'});
  }finally{await f.close();}
});
test('mail requests are limited and only use the project recovery/resend endpoints',async()=>{
  const f=await fixture(async()=>({}));try{
    await f.client.requestPasswordReset(user.email);assert.ok(f.calls[0].url.endsWith('/recover'));
    await assert.rejects(f.client.resendConfirmation(user.email),/Espera un minuto/);assert.equal(f.calls.length,1);
  }finally{await f.close();}
});

test('native licenses: account-bound redemption, permanent access, revocation and billing outages',async()=>{
  const code='PFT-PRO-'+Array(6).fill('ABCDEF12').join('-');let active=true,offline=false;
  const f=await fixture(async url=>{
    if(url.includes('/terminal-license/')){if(offline)throw new Error('offline');return {license:active?{kind:'pro_permanent',status:'active',permanent:true,activatedAt:'2026-10-30'}:null};}
    if(url.endsWith('/v1/status'))throw new Error('billing offline');
    return url.endsWith('/user')?user:session;
  });
  try{
    f.client.config.licensesEnabled=true;await assert.rejects(f.client.redeemCode(code),/Inicia sesión/);
    await f.client.signIn(user.email,password);await f.client.redeemCode(code);
    const call=f.calls.find(c=>c.url.endsWith('/redeem'));assert.deepEqual(Object.keys(call.body),['code']);assert.equal(call.options.headers.Authorization,'Bearer private-access');
    f.client.config.apiUrl='https://billing.example.test';let state=await f.client.status();assert.equal(state.eligible,true);assert.equal(state.license.permanent,true);assert.equal(state.licensesConfigured,true);
    await assert.rejects(f.client.checkout('month'),/Pro permanente/);
    f.client.config.apiUrl='';active=false;state=await f.client.status();assert.equal(state.eligible,false);
    offline=true;state=await f.client.status();assert.equal(state.eligible,false);assert.ok(state.licenseError);
  }finally{await f.close();}
});
test('account workspaces isolate users, retain legacy files and reject stale account saves',async()=>{
  const folder=await mkdtemp(path.resolve('qa/account-isolation-'));
  const first=user.id,second='4c376870-42ee-4b58-80b4-541d458bb682';let active=first;
  const spaces=new AccountWorkspaces(folder,{enabled:()=>true,userId:()=>active});
  try{
    const legacy={...emptyWorkspace(),people:[newPerson('Ficha anterior sintética')]};legacy.activePersonId=legacy.people[0].id;await spaces.legacy.save(legacy);
    const data={...emptyWorkspace(),people:[newPerson('Cuenta A sintética')]};data.activePersonId=data.people[0].id;await spaces.get(first).save(data);
    active=second;assert.equal(await spaces.get(second).load(),null);assert.throws(()=>spaces.get(first),/cuenta ha cambiado/);assert.throws(()=>spaces.get('../outside'),/cuenta ha cambiado/);
    active=null;assert.throws(()=>spaces.get(second),/cuenta ha cambiado/);
    active=first;assert.equal((await spaces.get(first).load()).people[0].name,'Cuenta A sintética');assert.equal((await spaces.legacy.load()).people[0].name,'Ficha anterior sintética');await spaces.flush();
  }finally{await rm(folder,{recursive:true,force:true});}
});


test('native PRESTAFIN30: redemption reaches the authenticated service, access survives billing outage and expired trials cannot reopen Pro',async()=>{
 let expires=Date.now()+30*86400000,paid=false,billingOffline=true;let used=false;
 const f=await fixture(async(url,options,body)=>{
  if(url.endsWith('/redeem')){assert.equal(body.code,'PRESTAFIN30');if(used)return Response.json({error:'PRESTAFIN30 ya fue canjeado en esta cuenta.'},{status:409});used=true;return {license:{kind:'promo_30d'}};}
  if(url.includes('/terminal-license/'))return {license:used?{kind:'promo_30d',status:expires>Date.now()?'active':'expired',permanent:false,activatedAt:'2026-11-15',expiresAt:new Date(expires).toISOString()}:null};
  if(url.endsWith('/v1/status')){if(billingOffline)throw new Error('Stripe offline');return {configured:true,eligible:paid,subscription:paid?{status:'active',periodEnd:Math.floor((Date.now()+86400000)/1000)}:null};}
  if(url.endsWith('/v1/checkout'))return {url:'https://checkout.stripe.com/c/pay/test'};
  return url.endsWith('/user')?user:session;
 });
 try{
  f.client.config.licensesEnabled=true;await f.client.signIn(user.email,password);await f.client.redeemCode(' prestafin30 ');f.client.config.apiUrl='https://billing.example.test';
  let status=await f.client.status();assert.equal(status.eligible,true);assert.equal(status.license.kind,'promo_30d');const original=status.license.expiresAt;
  await assert.rejects(f.client.redeemCode('PRESTAFIN30'),/ya fue canjeado/);assert.equal((await f.client.status()).license.expiresAt,original);
  f.client.open=async()=>{};await f.client.checkout('month');assert.ok(f.calls.some(c=>c.url.endsWith('/v1/checkout')));
  expires=Date.now()-1000;billingOffline=false;status=await f.client.status();assert.equal(status.eligible,false);assert.equal(status.license.status,'expired');
  paid=true;assert.equal((await f.client.status()).eligible,true);
 }finally{await f.close();}
});
