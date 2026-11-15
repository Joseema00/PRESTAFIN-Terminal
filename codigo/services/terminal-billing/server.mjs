import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BillingError,createBilling,verifySignature } from './core.mjs';

export function config(env=process.env) {
  const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_MONTH','STRIPE_PRICE_YEAR','STRIPE_PORTAL_CONFIGURATION','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','PUBLIC_URL','BILLING_DB'];
  for(const key of required)if(!env[key])throw new Error('Falta '+key);
  if(!/^(sk|rk)_(test|live)_/.test(env.STRIPE_SECRET_KEY)||!env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_'))throw new Error('Claves Stripe no válidas.');
  for(const key of ['SUPABASE_URL','PUBLIC_URL']){const u=new URL(env[key]);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error(key+' debe ser un origen HTTPS.');}
  return {...env,live:/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY),PUBLIC_URL:env.PUBLIC_URL.replace(/\/$/,''),SUPABASE_URL:env.SUPABASE_URL.replace(/\/$/,'')};
}
export {stripeApi} from './stripe-api.mjs';
import {stripeApi} from './stripe-api.mjs';
export function handler({billing,settings,fetcher=fetch,clock=Date.now}) {
  const rate=new Map();
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try {
      const url=new URL(req.url,'http://internal');
      if(req.method==='GET'&&url.pathname==='/health')return json(200,{ok:true});
      if(req.method==='GET'&&url.pathname==='/return') {
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        return res.end('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PRESTAFIN-TERMINAL</title><body style="font:18px system-ui;max-width:620px;margin:12vh auto;padding:24px"><h1>PRESTAFIN-TERMINAL</h1><p>Vuelve a la terminal y pulsa <strong>Actualizar estado</strong>.</p><p>La aplicación comprobará tu suscripción directamente con Stripe. Puedes cerrar esta ventana.</p></body></html>');
      }
      const webhook=url.pathname==='/v1/webhook';
      if(!((webhook||['/v1/checkout','/v1/portal'].includes(url.pathname))&&req.method==='POST')&&!(url.pathname==='/v1/status'&&req.method==='GET'))return json(404,{error:'Ruta no disponible.'});
      const chunks=[];let length=0;
      for await(const chunk of req){length+=chunk.length;if(length>(webhook?262144:2048))throw new BillingError('Solicitud demasiado grande.',413);chunks.push(chunk);}
      const raw=Buffer.concat(chunks);
      if(webhook){const event=verifySignature(raw,req.headers['stripe-signature'],settings.STRIPE_WEBHOOK_SECRET,clock());return json(200,await billing.webhook(event));}
      // Bearer identity is verified by Supabase; no user/customer/price IDs from the client are trusted.
      const auth=req.headers.authorization;
      if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9_.-]+$/.test(auth)||auth.length>8192)throw new BillingError('Inicia sesión.',401);
      const response=await fetcher(settings.SUPABASE_URL+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:settings.SUPABASE_PUBLISHABLE_KEY,Authorization:auth}});
      if(!response.ok)throw new BillingError('Sesión no válida.',response.status>=500?503:401);
      const user=await response.json();
      if(!user.id||!user.email||!user.email_confirmed_at||user.is_anonymous)throw new BillingError('Verifica tu correo para continuar.',401);
      const bucket=Math.floor(clock()/60000);const entry=rate.get(user.id);
      const count=entry?.bucket===bucket?entry.count+1:1;rate.set(user.id,{bucket,count});
      if(rate.size>10000)for(const [id,value] of rate)if(value.bucket<bucket)rate.delete(id);
      if(count>30)throw new BillingError('Demasiadas solicitudes. Espera un minuto.',429);
      if(url.pathname==='/v1/status')return json(200,await billing.status(user));
      let body;try{body=JSON.parse(raw.toString()||'{}');}catch{throw new BillingError('Solicitud no válida.');}
      if(!body||Array.isArray(body)||typeof body!=='object')throw new BillingError('Solicitud no válida.');
      if(url.pathname==='/v1/checkout') {
        if(Object.keys(body).some(k=>k!=='plan'))throw new BillingError('Solo se admite la periodicidad del plan.');
        return json(200,await billing.checkout(user,body.plan));
      }
      if(Object.keys(body).length)throw new BillingError('Solicitud no válida.');
      return json(200,await billing.portal(user));
    }catch(error){
      // Never log tokens, raw Stripe responses or personal data.
      json(error instanceof BillingError?error.status:503,{error:error instanceof BillingError?error.message:'Servicio temporalmente no disponible. Vuelve a intentarlo.'});
    }
  };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const settings=config();mkdirSync(path.dirname(settings.BILLING_DB),{recursive:true,mode:0o700});
  const db=new DatabaseSync(settings.BILLING_DB);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const billing=createBilling({db,stripe:stripeApi(settings),prices:{month:settings.STRIPE_PRICE_MONTH,year:settings.STRIPE_PRICE_YEAR},live:settings.live,publicUrl:settings.PUBLIC_URL,portalConfiguration:settings.STRIPE_PORTAL_CONFIGURATION});
  const server=http.createServer(handler({billing,settings}));server.requestTimeout=30000;server.headersTimeout=15000;
  server.listen(Number(settings.PORT??8080),'0.0.0.0',()=>console.log('Prestafin billing: servicio iniciado ('+(settings.live?'live':'test')+').'));
}
