import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLicenseHandler,normalizeLicenseCode,hashLicenseCode} from '../../supabase/functions/terminal-license/handler.mjs';
import {configureMail,mailSettings} from '../../scripts/configure-auth-mail.mjs';
const code='PFT-PRO-'+Array(6).fill('ABCDEF12').join('-');
const user={id:'9f20fbf4-00f4-49b0-a9d6-cee3ce804a03',email_confirmed_at:'2026-10-30'};
const row={activated_at:'2026-10-30T00:00:00Z',revoked_at:null};
function fixture({identity=user,authStatus=200,result=row,fail=false}={}){
  const calls=[];const handler=createLicenseHandler({url:'https://auth.example.test',key:'server-only-service-key',fetcher:async(url,options)=>{
    calls.push({url,options});if(fail)throw new Error('secret internal SQL data');
    if(url.endsWith('/auth/v1/user'))return Response.json(identity,{status:authStatus});
    return Response.json(url.includes('/rpc/')?result:result?[result]:[]);
  }});
  const req=(route,body,authorization='Bearer user-session')=>new Request('https://auth.example.test/functions/v1/terminal-license/'+route,{method:body===undefined?'GET':'POST',headers:{authorization,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {handler,req,calls};
}
test('license: random code normalization and hashing never include the clear code in the RPC',async()=>{
  assert.equal(normalizeLicenseCode(code.toLowerCase()),code.replaceAll('-',''));
  assert.equal((await hashLicenseCode(code)).length,64);
  assert.throws(()=>normalizeLicenseCode('PFT-PRO-1234'));assert.throws(()=>normalizeLicenseCode('x'.repeat(200)));
  const f=fixture();const r=await f.handler(f.req('redeem',{code}));assert.equal(r.status,200);
  const rpc=JSON.parse(f.calls[1].options.body);assert.equal(rpc.p_user_id,user.id);assert.equal(rpc.p_code_hash,await hashLicenseCode(code));assert.ok(!f.calls[1].options.body.includes(code));
  const body=await r.json();assert.equal(body.license.kind,'pro_permanent');assert.equal(body.license.permanent,true);assert.ok(!JSON.stringify(body).includes('server-only'));
});
test('license: expired sessions, unconfirmed accounts and caller-supplied owners cannot redeem',async()=>{
  for(const props of [{authStatus:401},{identity:{...user,email_confirmed_at:null}}]){
    const f=fixture(props),r=await f.handler(f.req('redeem',{code}));assert.ok([401,403].includes(r.status));assert.equal(f.calls.length,1);
  }
  const f=fixture();assert.equal((await f.handler(f.req('redeem',{code,userId:'another-user'}))).status,400);assert.equal(f.calls.length,1);
  assert.equal((await f.handler(f.req('status',undefined,''))).status,401);
});
test('license: status is restricted to the verified owner and revoked access stays revoked',async()=>{
  const f=fixture({result:{...row,revoked_at:'2026-11-01'}});const r=await f.handler(f.req('status'));assert.equal((await r.json()).license.status,'revoked');
  assert.equal(new URL(f.calls[1].url).searchParams.get('user_id'),'eq.'+user.id);
  assert.equal((await fixture({result:null}).handler(f.req('status')).then(r=>r.json())).license,null);
});
test('license: reused/invalid codes, attempt limits and server outages fail without leaking details',async()=>{
  for(const [result,status] of [[{error:'Código no válido o ya utilizado.',status:400},400],[{error:'Demasiados intentos.',status:429},429]]){
    const f=fixture({result});assert.equal((await f.handler(f.req('redeem',{code}))).status,status);
  }
  const f=fixture({fail:true});const r=await f.handler(f.req('status'));assert.equal(r.status,503);assert.ok(!(await r.text()).includes('SQL'));
  const normal=fixture();assert.equal((await normal.handler(normal.req('redeem',{code:'x'.repeat(2000)}))).status,413);
  assert.equal((await normal.handler(normal.req('other'))).status,404);
});
test('mail: branded OTP templates contain no consumable verification link and preserve unrelated settings',async()=>{
  for(const kind of ['confirmation','recovery']){
    const html=await readFile(new URL('../../supabase/templates/'+kind+'.html',import.meta.url),'utf8');
    assert.ok(html.includes('{{ .Token }}'));assert.ok(html.includes('PRESTAFIN'));assert.ok(!html.includes('.ConfirmationURL'));assert.ok(!html.includes('.TokenHash'));
  }
  const calls=[];const result=await configureMail({token:'management-test-only',fetcher:async(url,options)=>{calls.push({url,options});return Response.json(options.method==='PATCH'?{}:{...mailSettings,smtp_host:'smtp.example.test'});}});
  assert.equal(result.applied,true);const patch=JSON.parse(calls[1].options.body);
  assert.equal(patch.smtp_sender_name,'Prestafin');assert.equal(patch.site_url,undefined);assert.equal(patch.smtp_pass,undefined);assert.equal(patch.smtp_admin_email,undefined);
  await assert.rejects(configureMail({}),/SUPABASE_ACCESS_TOKEN/);
});


test('license PRESTAFIN30: public code uses server-owned account, no Stripe and replay is refused',async()=>{
 const until=new Date(Date.now()+30*86400000).toISOString(),f=fixture({result:{redeemed_at:new Date().toISOString(),expires_at:until}});
 const response=await f.handler(f.req('redeem',{code:'prestafin30'}));assert.equal(response.status,200);const body=await response.json();assert.equal(body.license.kind,'promo_30d');assert.equal(body.license.permanent,false);assert.equal(body.license.expiresAt,until);assert.equal(body.license.status,'active');
 const rpc=f.calls.find(c=>c.url.endsWith('/rpc/terminal_redeem_promo'));assert.deepEqual(JSON.parse(rpc.options.body),{p_user_id:user.id,p_code:'PRESTAFIN30'});assert.ok(!f.calls.some(c=>c.url.includes('stripe')));
 const replay=fixture({result:{error:'PRESTAFIN30 ya fue canjeado en esta cuenta.',status:409}});assert.equal((await replay.handler(replay.req('redeem',{code:'PRESTAFIN30'}))).status,409);
});
