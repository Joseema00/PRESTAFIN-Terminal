import {useState} from 'react';
import {useBilling,isPermanentLicense,isActivePromo,licenseExpiry} from './billing';
export function LicenseCode(){
  const {state,refresh,now,loading}=useBilling();const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const permanent=isPermanentLicense(state?.license),promo=isActivePromo(state?.license,now),end=licenseExpiry(state?.license);
  const expires=end===null?null:new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short'}).format(end);
  async function redeem(){setBusy(true);setError('');setMessage('');try{await window.prestafin!.billingRedeemCode(code);setCode('');await refresh();setMessage('Código aplicado a tu cuenta. Consulta el estado actualizado de tu acceso.');}catch(e){setError(e instanceof Error?e.message:'No se pudo activar el código.');}finally{setBusy(false);}}
  return <section className="terminal-panel billing-details" aria-label="Código de activación"><h2>{permanent?'Prestafin Pro permanente':promo?'Prueba de 30 días activa':'Activar con un código'}</h2>
    {permanent?<p>Licencia permanente asociada a tu cuenta. Acceso completo sin fecha de caducidad ni renovación automática.</p>:<>
      {promo&&end!==null?<><p>Acceso completo sin tarjeta. Quedan {Math.ceil((end-now)/86400000)} días de prueba.</p><p>Caduca el <strong>{expires}</strong>. Después necesitarás un plan activo para continuar; la prueba no genera cobros ni renovaciones automáticas.</p></>:state?.license?.kind==='promo_30d'?<p>{end!==null&&end<=now?'La prueba de 30 días ha finalizado.':'El acceso promocional no está activo.'} Tus fichas se conservan. Contrata una suscripción para continuar usando las herramientas.</p>:<p>Utiliza <strong>PRESTAFIN30</strong> para activar 30 días de acceso completo sin tarjeta. Se canjea una sola vez por cuenta y no inicia una suscripción.</p>}
      {promo&&<p>Si tienes otro código de Prestafin, también puedes canjearlo aquí.</p>}
      <form onSubmit={e=>{e.preventDefault();void redeem();}}><label htmlFor="license-code">Código de activación</label><input id="license-code" type="text" autoComplete="off" spellCheck={false} maxLength={128} required value={code} disabled={busy||loading||!state?.email} onChange={e=>setCode(e.target.value)}/><button className="terminal-button primary" disabled={busy||loading||!state?.email||!code.trim()}>{busy?'Activando…':'Activar código'}</button></form>{!state?.email&&<p>Inicia sesión y confirma tu correo para canjear el código.</p>}
    </>}
    {state?.licenseError&&<p role="alert">{state.licenseError}</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {permanent&&<p>La licencia no cancela una suscripción anterior. Si tenías una, revisa su renovación desde Gestionar en Stripe.</p>}
  </section>;
}
