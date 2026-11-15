import {Buffer} from 'node:buffer';
import {createBilling,BillingError,verifySignature} from '../../../services/terminal-billing/core.mjs';
import {cloudStore} from '../../../services/terminal-billing/cloud-store.mjs';
import {stripeApi} from '../../../services/terminal-billing/stripe-api.mjs';
export function createHandler({env,fetcher=fetch,storageFactory=cloudStore}){
 const base=env.SUPABASE_URL,publicUrl=base+'/functions/v1/terminal-billing';
 const rate=new Map();
 const missing=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'].filter(k=>!env[k]);
 const ready=missing.length===0&&/^(rk|sk)_(live|test)_/.test(env.STRIPE_SECRET_KEY)&&env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_');
 const live=/^(rk|sk)_live_/.test(env.STRIPE_SECRET_KEY??'');
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 return async req=>{try{
  const route=new URL(req.url).pathname.split('/terminal-billing')[1]??'';
  if(req.method==='GET'&&route==='/health')return json(200,{ok:true,configured:ready,environment:ready?(live?'live':'test'):null});
  if(req.method==='GET'&&route==='/return')return new Response('PRESTAFIN-TERMINAL\n\nVuelve a la terminal y pulsa Actualizar estado. Tu suscripción se verificará con Stripe. Puedes cerrar esta página.',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"}});
  if(!((route==='/v1/status'&&req.method==='GET')||(['/v1/checkout','/v1/portal','/v1/webhook'].includes(route)&&req.method==='POST')))return json(404,{error:'Ruta no disponible.'});
  const webhook=route==='/v1/webhook';
  let user;
  if(!webhook){
   const authorization=req.headers.get('authorization');if(!authorization||!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)||authorization.length>8192)return json(401,{error:'Inicia sesión.'});
   const response=await fetcher(base+'/auth/v1/user',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)return json(response.status>=500?503:401,{error:'Sesión no válida.'});user=await response.json();
   if(!user.id||!user.email||!user.email_confirmed_at||user.is_anonymous)return json(401,{error:'Confirma tu correo para continuar.'});
   const minute=Math.floor(Date.now()/60000),last=rate.get(user.id),count=last?.minute===minute?last.count+1:1;rate.set(user.id,{minute,count});if(rate.size>10000)for(const[id,value]of rate)if(value.minute<minute)rate.delete(id);if(count>30)return json(429,{error:'Demasiadas solicitudes. Espera un minuto.'});
  }
  if(!ready){if(route==='/v1/status')return json(200,{configured:false,eligible:false,subscription:null,trialAvailable:false,hasCustomer:false,setupPending:true});return json(503,{error:'Los pagos están pendientes de activar en el servidor de Prestafin.'});}
  const storage=storageFactory({url:base,key:env.SUPABASE_SERVICE_ROLE_KEY,fetcher});
  const billing=createBilling({storage,stripe:stripeApi({...env},fetcher),prices:{month:env.STRIPE_PRICE_MONTH,year:env.STRIPE_PRICE_YEAR},portalConfiguration:env.STRIPE_PORTAL_CONFIGURATION,live,publicUrl});
  if(route==='/v1/status')return json(200,{...await billing.status(user),configured:true});
  const limit=webhook?262144:2048;const reader=req.body?.getReader();let size=0,chunks=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return json(413,{error:'Solicitud demasiado grande.'});}chunks.push(value);}
  const raw=Buffer.concat(chunks);
  if(webhook){const event=verifySignature(raw,req.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET);return json(200,await billing.webhook(event));}
  let body;try{body=JSON.parse(raw.toString()||'{}');}catch{return json(400,{error:'Solicitud no válida.'});}
  if(!body||Array.isArray(body)||typeof body!=='object')return json(400,{error:'Solicitud no válida.'});
  if(route==='/v1/checkout'){
   if(Object.keys(body).some(k=>k!=='plan'))return json(400,{error:'Solo se admite la periodicidad del plan.'});
   const entitlement=await fetcher(base+'/rest/v1/terminal_entitlements?'+new URLSearchParams({user_id:'eq.'+user.id,select:'license_type,revoked_at',limit:'1'}),{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:req.headers.get('authorization')},signal:AbortSignal.timeout(15000)});
   if(!entitlement.ok)throw new BillingError('No se pudo comprobar tu licencia permanente.',503);
   if((await entitlement.json()).some(x=>x.revoked_at===null&&x.license_type==='pro_permanent'))throw new BillingError('Tu cuenta ya tiene acceso Pro permanente. No necesitas otra suscripción.',409);
   return json(200,await billing.checkout(user,body.plan));
  }
  if(Object.keys(body).length)return json(400,{error:'Solicitud no válida.'});return json(200,await billing.portal(user));
 }catch(error){return json(error instanceof BillingError?error.status:503,{error:error instanceof BillingError?error.message:'Servicio temporalmente no disponible. Inténtalo de nuevo.'});}};
}
