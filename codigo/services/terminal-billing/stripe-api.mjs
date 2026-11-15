import {BillingError} from './core.mjs';
export function stripeApi(settings,fetcher=fetch) {
  return async(method,route,params,key)=>{
    const response=await fetcher('https://api.stripe.com/v1'+route,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+settings.STRIPE_SECRET_KEY,'Stripe-Version':'2026-09-30.endive','Content-Type':'application/x-www-form-urlencoded',...(key?{'Idempotency-Key':key}:{})},body:method==='POST'?new URLSearchParams(Object.entries(params??{}).map(([k,v])=>[k,String(v)])):undefined});
    const result=await response.json();
    if(!response.ok)throw new BillingError('Stripe no pudo completar la operación. Inténtalo de nuevo o contacta con soporte.',502);
    return result;
  };
}
