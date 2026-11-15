import {randomUUID} from 'node:crypto';
import {BillingError} from './core.mjs';
export function cloudStore({url,key,fetcher=fetch,now=Date.now}){
 const leases=new Map();
 async function request(route,{method='GET',body,prefer}={}){
  const response=await fetcher(url+'/rest/v1/'+route,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok)throw new BillingError('No se pudo guardar la operación de suscripción. Inténtalo de nuevo.',503);
  const raw=await response.text();return raw?JSON.parse(raw):null;
 }
 const filter=id=>'user_id=eq.'+encodeURIComponent(id);
 return {
  get:async id=>(await request('terminal_billing_accounts?'+filter(id)+'&select=*'))[0],
  create:id=>request('terminal_billing_accounts?on_conflict=user_id',{method:'POST',body:{user_id:id,customer_key:randomUUID()},prefer:'resolution=ignore-duplicates,return=minimal'}),
  acquire:async(id,lease)=>{const ok=await request('rpc/terminal_billing_acquire',{method:'POST',body:{p_user:id,p_lease:lease}});if(ok)leases.set(id,lease);return ok;},
  release:async(id,lease)=>{await request('terminal_billing_accounts?'+filter(id)+'&lease_id=eq.'+lease,{method:'PATCH',body:{lease_id:null,lease_until:0},prefer:'return=minimal'});if(leases.get(id)===lease)leases.delete(id);},
  patch:async(id,values)=>{
   if(!leases.has(id)||Object.keys(values).some(k=>!['trial_used','customer_started','customer_id','attempt'].includes(k)))throw new BillingError('Operación de suscripción no autorizada.',409);
   const rows=await request('terminal_billing_accounts?'+filter(id)+'&lease_id=eq.'+leases.get(id)+'&lease_until=gt.'+now(),{method:'PATCH',body:values,prefer:'return=representation'});
   if(rows.length!==1)throw new BillingError('La operación ha caducado. Actualiza el estado antes de continuar.',409);
  },
  markTrial:customer=>request('terminal_billing_accounts?customer_id=eq.'+encodeURIComponent(customer),{method:'PATCH',body:{trial_used:1},prefer:'return=minimal'})
 };
}
