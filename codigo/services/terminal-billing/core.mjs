import { createHmac, timingSafeEqual, randomUUID, randomBytes } from 'node:crypto';

export class BillingError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
export function verifySignature(raw,header,secret,now=Date.now()) {
  const parts=String(header??'').split(',').map(p=>p.split('='));
  const timestamps=parts.filter(p=>p[0]==='t');
  if(timestamps.length!==1||!/^\d+$/.test(timestamps[0][1]))throw new BillingError('Firma no válida.');
  const timestamp=timestamps[0][1];
  if(Math.abs(now/1000-Number(timestamp))>300)throw new BillingError('Firma caducada.');
  const expected=createHmac('sha256',secret).update(timestamp+'.').update(raw).digest();
  if(!parts.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v)&&timingSafeEqual(expected,Buffer.from(v,'hex'))))throw new BillingError('Firma no válida.');
  return JSON.parse(raw.toString('utf8'));
}
export function validatePrice(price,plan,live) {
  if(!price.active||price.livemode!==live||price.currency!=='eur'||price.unit_amount!==(plan==='month'?5000:49000)||price.recurring?.interval!==plan||price.recurring?.interval_count!==1||price.recurring?.usage_type!=='licensed'||price.tax_behavior!=='inclusive'||price.billing_scheme!=='per_unit'||price.transform_quantity)throw new BillingError('El precio de Stripe no coincide con el plan publicado.',503);
}
export function requireAutomaticTaxSetup(settings,registrations) {
  if(settings?.status!=='active'||!registrations?.data?.some(r=>r.status==='active'))throw new BillingError('Los pagos aún no están activados: falta completar la configuración fiscal de Stripe.',503);
}
export function summarize(sub,prices,now=Date.now()) {
  if(!sub)return {subscription:null,eligible:false};
  const item=sub.items?.data?.[0];
  const plan=Object.entries(prices).find(([,id])=>id===item?.price?.id)?.[0]??null;
  const end=sub.status==='trialing'?sub.trial_end:item?.current_period_end??sub.current_period_end;
  const eligible=!!plan&&item?.quantity===1&&sub.items?.data?.length===1&&['trialing','active'].includes(sub.status)&&Number.isFinite(end)&&end*1000>now&&!sub.pause_collection;
  return {eligible,subscription:{status:sub.status,plan,trialEnd:sub.trial_end??null,periodEnd:end??null,cancelAtPeriodEnd:!!sub.cancel_at_period_end,cancelAt:sub.cancel_at??null}};
}
export function createBilling({db,storage,stripe,prices,live,publicUrl,portalConfiguration,now=Date.now}) {
  if(!storage){db.exec(`CREATE TABLE IF NOT EXISTS billing_accounts (
    user_id TEXT PRIMARY KEY, customer_id TEXT UNIQUE, trial_used INTEGER NOT NULL DEFAULT 0,
    customer_key TEXT NOT NULL, customer_started INTEGER NOT NULL, attempt TEXT,
    lease_id TEXT, lease_until INTEGER NOT NULL DEFAULT 0
  );`);
  storage={
    get:id=>db.prepare('SELECT * FROM billing_accounts WHERE user_id=?').get(id),
    create:id=>db.prepare('INSERT OR IGNORE INTO billing_accounts(user_id,customer_key,customer_started) VALUES(?,?,?)').run(id,randomUUID(),0),
    acquire:(id,lease)=>db.prepare('UPDATE billing_accounts SET lease_id=?,lease_until=? WHERE user_id=? AND lease_until<?').run(lease,now()+600000,id,now()).changes>0,
    release:(id,lease)=>db.prepare('UPDATE billing_accounts SET lease_id=NULL,lease_until=0 WHERE user_id=? AND lease_id=?').run(id,lease),
    patch:(id,values)=>{for(const [key,value]of Object.entries(values)){if(!['trial_used','customer_started','customer_id','attempt'].includes(key))throw new Error('Invalid billing field');db.prepare('UPDATE billing_accounts SET '+key+'=? WHERE user_id=?').run(value,id);}},
    markTrial:customer=>db.prepare('UPDATE billing_accounts SET trial_used=1 WHERE customer_id=?').run(customer)
  };}
  const get=id=>storage.get(id);
  const patch=(id,values)=>storage.patch(id,values);
  async function locked(id,fn) {
    await storage.create(id);const lease=randomUUID();
    const acquired=await storage.acquire(id,lease);
    if(!acquired)throw new BillingError('Ya hay una operación en curso. Espera unos segundos y actualiza.',409);
    try{return await fn(await get(id));}finally{await storage.release(id,lease);}
  }
  async function subscriptions(customer) {
    const result=[];let cursor='';
    for(let page=0;page<5;page++) {
      const data=await stripe('GET','/subscriptions?'+new URLSearchParams({customer,status:'all',limit:'100',...(cursor?{starting_after:cursor}:{})}));
      result.push(...data.data);if(!data.has_more)return result;cursor=data.data.at(-1)?.id;
    }
    throw new BillingError('No se pudo verificar todo el historial de suscripción. Contacta con soporte.',503);
  }
  const current=subs=>subs.find(s=>!['canceled','incomplete_expired'].includes(s.status))??subs[0]??null;
  async function inspect(row) {
    if(!row.customer_id)return [];
    const subs=await subscriptions(row.customer_id);
    if(subs.length)await patch(row.user_id,{trial_used:1});
    return subs;
  }
  return {
    async status(user) {
      return locked(user.id,async row=>{
        const subs=await inspect(row);
        return {...summarize(current(subs),prices,now()),trialAvailable:false,hasCustomer:!!row.customer_id,environment:live?'live':'test'};
      });
    },
    async checkout(user,plan) {
      if(!Object.hasOwn(prices,plan))throw new BillingError('Plan no válido.');
      return locked(user.id,async row=>{
        // A configured Tax address is not proof of a tax registration.
        // Block live signup until collection has actually been configured.
        if(live)requireAutomaticTaxSetup(await stripe('GET','/tax/settings'),await stripe('GET','/tax/registrations?status=active&limit=1'));
        if(!row.customer_id) {
          if(!row.customer_started){await patch(user.id,{customer_started:now()});row=await get(user.id);}
          // Never risk creating another customer after Stripe's idempotency retention window.
          if(now()-row.customer_started>23*3600000)throw new BillingError('La cuenta requiere reconciliación con Stripe. Contacta con soporte.',409);
          const c=await stripe('POST','/customers',{email:user.email,'metadata[prestafin_user]':user.id,'metadata[application]':'prestafin-terminal'},'customer-'+row.customer_key);
          await patch(user.id,{customer_id:c.id});row=await get(user.id);
        }
        const subs=await inspect(row);
        if(subs.some(s=>!['canceled','incomplete_expired'].includes(s.status)))throw new BillingError('Ya tienes una suscripción. Usa Gestionar en Stripe para modificarla.',409);
        validatePrice(await stripe('GET','/prices/'+prices[plan]),plan,live);
        let attempt=row.attempt?JSON.parse(row.attempt):null;
        if(attempt) {
          if(!attempt.session&&now()-attempt.created>23*3600000)throw new BillingError('El pago pendiente requiere reconciliación. Contacta con soporte.',409);
          if(!attempt.session){const session=await stripe('POST','/checkout/sessions',attempt.params,'checkout-'+attempt.key);attempt.session=session.id;await patch(user.id,{attempt:JSON.stringify(attempt)});}
          const session=await stripe('GET','/checkout/sessions/'+attempt.session);
          if(session.status==='complete'&&!subs.length)throw new BillingError('Stripe está confirmando tu suscripción. Pulsa Actualizar estado.',409);
          const repeatedTrial=!!(attempt.params['subscription_data[trial_period_days]']||attempt.params['subscription_data[trial_end]']);
          if(session.status==='open'&&attempt.plan===plan&&!repeatedTrial)return {url:session.url};
          if(session.status==='open')await stripe('POST','/checkout/sessions/'+session.id+'/expire',{});
          await patch(user.id,{attempt:null});
        }
        attempt={key:randomUUID(),created:now(),plan,params:{
          customer:row.customer_id,mode:'subscription',client_reference_id:user.id,
          'line_items[0][price]':prices[plan],'line_items[0][quantity]':1,
          payment_method_collection:'always',
          integration_identifier:'prestafin_terminal_'+Array.from(randomBytes(8),v=>String.fromCharCode(97+v%26)).join(''),
          'subscription_data[metadata][prestafin_user]':user.id,'subscription_data[metadata][application]':'prestafin-terminal',
          'automatic_tax[enabled]':true,'customer_update[address]':'auto',billing_address_collection:'required',
          'tax_id_collection[enabled]':true,
          'consent_collection[terms_of_service]':'required',locale:'es',
          success_url:publicUrl+'/return?result=success',cancel_url:publicUrl+'/return?result=cancel',
          'custom_text[submit][message]':'Renovación automática: '+(plan==='month'?'50 EUR al mes.':'490 EUR al año.')
        }};
        await patch(user.id,{attempt:JSON.stringify(attempt)});
        const session=await stripe('POST','/checkout/sessions',attempt.params,'checkout-'+attempt.key);
        attempt.session=session.id;await patch(user.id,{attempt:JSON.stringify(attempt)});
        return {url:session.url};
      });
    },
    async portal(user) {
      const row=await get(user.id);if(!row?.customer_id)throw new BillingError('Todavía no tienes una cuenta de facturación.');
      return stripe('POST','/billing_portal/sessions',{customer:row.customer_id,configuration:portalConfiguration,return_url:publicUrl+'/return'}).then(s=>({url:s.url}));
    },
    async webhook(event) {
      if(event.livemode!==live)throw new BillingError('Modo de Stripe incorrecto.');
      // No cached entitlement to overwrite: status always queries Stripe live.
      // This monotonic flag is idempotent and independent of event ordering.
      const session=event.data?.object;
      const completedCheckout=['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&session?.mode==='subscription'&&['paid','no_payment_required'].includes(session.payment_status);
      if(completedCheckout||['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) {
        const customer=event.data?.object?.customer;
        if(typeof customer==='string')await storage.markTrial(customer);
      }
      return {received:true};
    }
  };
}
