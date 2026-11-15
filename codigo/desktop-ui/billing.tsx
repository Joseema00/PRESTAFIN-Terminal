import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CreditCard, Check, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import './billing.css';
import { initializeWorkspace } from './use-portfolios';
import { EmailAccount } from './email-account';
import { LicenseCode } from './license-code';

export type BillingLicense = {kind:'pro_permanent';status:'active'|'revoked';permanent:boolean;activatedAt:string;expiresAt?:null}|{kind:'promo_30d';status:'active'|'revoked'|'expired';permanent:false;activatedAt:string;expiresAt:string};
export type BillingState={configured:boolean;authConfigured?:boolean;licensesConfigured?:boolean;license?:BillingLicense|null;licenseError?:string;billingError?:string;user?:{id:string;email:string}|null;email:string|null;eligible:boolean;trialAvailable?:boolean;hasCustomer?:boolean;environment?:'test'|'live';verifiedAt?:number;subscription:null|{status:string;plan:'month'|'year'|null;trialEnd:number|null;periodEnd:number|null;cancelAtPeriodEnd:boolean;cancelAt:number|null}};
type BillingContextValue={state:BillingState|null;loading:boolean;error:string;refresh:()=>Promise<void>};
export const BillingContext=createContext<BillingContextValue|null>(null);
export function BillingProvider({children}:{children:ReactNode}) {
  const [state,setState]=useState<BillingState|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const inFlight=useRef<Promise<void>|null>(null),mounted=useRef(true);
  const previousOwner=useRef<string|null|undefined>(undefined);
  const refresh=useCallback(()=>{
    if(inFlight.current)return inFlight.current;
    const task=(async()=>{
      await Promise.resolve();
      try{
        if(!window.prestafin?.billingStatus)throw new Error('Abre la versión actualizada de Prestafin Terminal para consultar la suscripción.');
        const result=await window.prestafin.billingStatus();
        if(result.authConfigured&&previousOwner.current!==(result.user?.id??null)){await initializeWorkspace();previousOwner.current=result.user?.id??null;}
        if(mounted.current){setState(result);setError('');}
      }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo verificar la suscripción.');}
      finally{if(mounted.current)setLoading(false);inFlight.current=null;}
    })();inFlight.current=task;return task;
  },[]);
  useEffect(()=>{
    mounted.current=true;void refresh();
    const onFocus=()=>void refresh();window.addEventListener('focus',onFocus);
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);
    return ()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('focus',onFocus);};
  },[refresh]);
  return <BillingContext.Provider value={{state,loading,error,refresh}}>{children}</BillingContext.Provider>;
}
export function licenseExpiry(license:BillingState['license']):number|null {
  if(license?.kind!=='promo_30d')return null;
  const expires=Date.parse(license.expiresAt);return Number.isFinite(expires)?expires:null;
}
export function isPermanentLicense(license:BillingState['license']):boolean{return license?.kind==='pro_permanent'&&license.status==='active';}
export function isActivePromo(license:BillingState['license'],now=Date.now()):boolean {const end=licenseExpiry(license);return license?.kind==='promo_30d'&&license.status==='active'&&end!==null&&end>now;}
export function isSubscriptionActive(subscription:BillingState['subscription'],now=Date.now()):boolean {
  if(!subscription||!['active','trialing'].includes(subscription.status)||!Number.isFinite(subscription.periodEnd)||!subscription.periodEnd||subscription.periodEnd*1000<=now)return false;
  if(subscription.cancelAt!==null&&subscription.cancelAt*1000<=now)return false;
  return subscription.status!=='trialing'||subscription.trialEnd==null||subscription.trialEnd*1000>now;
}
/** Recheck cached access at the exact expiry, even when the server cannot refresh. */
export function useBilling(){
  const context=useContext(BillingContext);if(!context)throw new Error('Falta el proveedor de suscripción.');
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    const current=Date.now(),ends=[licenseExpiry(context.state?.license),context.state?.subscription?.periodEnd?context.state.subscription.periodEnd*1000:null,context.state?.subscription?.trialEnd?context.state.subscription.trialEnd*1000:null,context.state?.subscription?.cancelAt?context.state.subscription.cancelAt*1000:null].filter((v):v is number=>v!==null&&v>current);
    const delay=ends.length?Math.min(30000,Math.max(10,Math.min(...ends)-current+5)):30000;
    const timer=setTimeout(()=>setNow(Date.now()),delay);return()=>clearTimeout(timer);
  },[context.state,now]);
  return {...context,now:Math.max(now,Date.now())};
}
const date=(seconds:number|null|undefined)=>seconds?new Intl.DateTimeFormat('es-ES',{dateStyle:'long'}).format(new Date(seconds*1000)):'Pendiente de confirmar';
const statuses:Record<string,string>={trialing:'Prueba gratuita',active:'Suscripción activa',past_due:'Pago pendiente',unpaid:'Pago sin completar',canceled:'Suscripción cancelada',incomplete:'Pago por completar',incomplete_expired:'Pago caducado',paused:'Suscripción pausada'};

export function BillingPage({accountOnly=false}:{accountOnly?:boolean}) {
  const {state,loading,error,refresh,now}=useBilling();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[actionError,setActionError]=useState('');
  async function action(fn:()=>Promise<unknown>,success:string){
    setBusy(true);setActionError('');setMessage('');
    try{await fn();setMessage(success);await refresh();}catch(e){setActionError(e instanceof Error?e.message:'No se pudo completar la operación.');}finally{setBusy(false);}
  }
  const subscription=state?.subscription;
  const existing=subscription&&!['canceled','incomplete_expired'].includes(subscription.status);
  const permanent=isPermanentLicense(state?.license),promo=isActivePromo(state?.license,now),promoEnd=licenseExpiry(state?.license);
  return <div className="billing-page">
    <div className="terminal-page-title"><span>{accountOnly?'CUENTA DE USUARIO':'CUENTA Y FACTURACIÓN'}</span><h1>{accountOnly?'Tu cuenta de Prestafin Terminal':'Tu suscripción a Prestafin Terminal'}</h1><p>{accountOnly?'Regístrate o inicia sesión con tu correo y contraseña.':'Un único plan con todas las herramientas. Elige cómo quieres pagarlo.'}</p></div>
    {loading&&<p role="status">Comprobando la suscripción…</p>}
    {state?.configured===false&&<div className="terminal-warning" role="status"><strong>Pagos pendientes de activación.</strong> Los planes están preparados. Los cobros estarán disponibles cuando el servicio de pago esté conectado. El código PRESTAFIN30 permite activar una prueba de 30 días sin tarjeta cuando el servicio de licencias esté disponible.</div>}
    {(error||actionError)&&<div className="terminal-warning" role="alert">{actionError||error}</div>}
    {state?.billingError&&<p role="alert">{state.billingError}</p>}
    {message&&<p className="billing-notice" role="status">{message}</p>}
    {state?.environment==='test'&&<div className="terminal-warning">Modo de pruebas de Stripe: esta conexión no admite cobros reales.</div>}
    <EmailAccount/>
    <LicenseCode/>
    {accountOnly&&<section className="terminal-panel billing-details"><h2>Tu cuenta y tus fichas</h2><p>Tus clientes, cuestionarios, carteras y modelos propios se guardan en tu cuenta. Al entrar desde otro equipo se recuperan los datos guardados.</p><p>Si utilizabas la terminal antes de crear tu cuenta, inicia sesión y pulsa «Recuperar fichas anteriores de este PC». La terminal te pedirá confirmar la copia a tu cuenta.</p><a className="terminal-button" href="#/suscripcion">Ver mi suscripción</a></section>}
    {!accountOnly&&<>
    {state?.email&&<section className="terminal-panel billing-state" aria-label="Estado de suscripción"><div><span className="billing-kicker">ESTADO VERIFICADO</span><h2>{error?'Sin verificar':permanent?'Pro permanente':isSubscriptionActive(subscription??null,now)?(statuses[subscription!.status]??'Suscripción activa'):promo?'Prueba de 30 días activa':state?.license?.kind==='promo_30d'?'Prueba de 30 días finalizada':subscription?(statuses[subscription.status]??'Pendiente de revisión'):'Sin suscripción'}</h2>
      {!error&&subscription&&<><p>{subscription.plan==='year'?'Plan anual · 490 €/año':subscription.plan==='month'?'Plan mensual · 50 €/mes':'Plan pendiente de revisión'}</p><p>{subscription.cancelAtPeriodEnd||subscription.cancelAt?'Acceso previsto hasta: ':subscription.status==='trialing'?'Fin de la prueba y primer cobro: ':subscription.status==='active'?'Próxima renovación: ':'Fecha del periodo: '}{date(subscription.cancelAt??subscription.periodEnd)}</p>{(subscription.cancelAtPeriodEnd||subscription.cancelAt)&&<p>Renovación cancelada. No se renovará al terminar el periodo.</p>}{subscription.status==='past_due'&&<p>Actualiza tu método de pago en Stripe para recuperar el acceso.</p>}</>}
      {!error&&promo&&promoEnd!==null&&<><p>Acceso completo sin tarjeta. Quedan {Math.ceil((promoEnd-now)/86400000)} días.</p><p>Caduca el {new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short'}).format(promoEnd)}.</p></>}
      {!error&&state?.license?.kind==='promo_30d'&&!promo&&!permanent&&!isSubscriptionActive(subscription??null,now)&&<p>El periodo promocional ha terminado. Contrata un plan mensual o anual para continuar usando las herramientas.</p>}
      {error&&<p>Comprueba la conexión y vuelve a consultar el estado.</p>}
    </div><div className="billing-actions"><button className="terminal-button" disabled={busy} onClick={()=>void action(refresh,'Estado consultado.')}><RefreshCw size={15}/>Actualizar estado</button>{state.hasCustomer&&<button className="terminal-button" disabled={busy||!!error} onClick={()=>void action(()=>window.prestafin!.billingPortal(),'Stripe se ha abierto en tu navegador. Vuelve aquí después de gestionar tu suscripción.')}><ExternalLink size={15}/>Gestionar en Stripe</button>}</div></section>}
    {!state?.email&&error&&<button className="terminal-button" disabled={busy} onClick={()=>void action(()=>window.prestafin!.billingLogout(),'Sesión local restablecida. Vuelve a entrar con tu correo.')}>Restablecer sesión</button>}
    <div className="billing-plans">{(['month','year'] as const).map(plan=><section key={plan} className={'terminal-panel billing-plan '+(plan==='year'?'featured':'')} aria-label={plan==='month'?'Plan mensual':'Plan anual'}>
      <span className="billing-kicker">{plan==='month'?'FLEXIBILIDAD MENSUAL':'MEJOR PRECIO ANUAL'}</span><h2>{plan==='month'?'Mensual':'Anual'}</h2><p className="billing-price">{plan==='month'?'50':'490'} €<span>/{plan==='month'?'mes':'año'}</span></p>
      <p className="billing-saving">{plan==='year'?'Ahorras 110 € al año · equivalente a 40,83 €/mes':'Facturación mensual · 600 € en doce meses'}</p>
      <ul><li><Check size={16}/>Todas las herramientas de la terminal</li><li><Check size={16}/>Personas, patrimonio y carteras</li><li><Check size={16}/>Fichas de fondos, gráficos e informes PDF</li><li><Check size={16}/>Gestión de facturas y cancelación en Stripe</li></ul>
      <button className={'terminal-button '+(plan==='year'?'primary':'')} disabled aria-disabled="true"><CreditCard size={17}/>Próximamente</button>
      <p className="billing-small">{plan==='month'?'50 € cada mes':'490 € cada año en un único cargo'}. Renovación automática hasta cancelar.</p>
    </section>)}</div>
    <section className="terminal-panel billing-details"><h2>Cómo funciona</h2><p>Activa el código PRESTAFIN30 para probar la terminal durante 30 días sin tarjeta. Se utiliza una sola vez por cuenta y no inicia una suscripción ni una renovación automática. Cuando termine, necesitarás un plan activo o una licencia permanente para continuar.</p><p>La contratación de nuevos planes estará disponible próximamente. Los botones mensual y anual no abren ninguna página ni crean cargos. Las suscripciones y licencias permanentes existentes mantienen su acceso y gestión. Para verificar el acceso necesitas conexión a Internet.</p><p>La suscripción corresponde a tu cuenta de acceso, no a las personas que gestionas en la terminal. Tus fichas, respuestas y carteras se guardan en tu cuenta y no se envían a Stripe.</p></section>
    </>}
  </div>;
}

export function BillingGate({children}:{children:ReactNode}) {
  const {state,error,loading,refresh,now}=useBilling();
  const [exportError,setExportError]=useState('');
  const needsLogin=!!state?.authConfigured&&!state.email;
  if(!needsLogin&&((!error&&state?.eligible&&(isPermanentLicense(state.license)||isActivePromo(state.license,now)||isSubscriptionActive(state.subscription,now)))||(state?.configured===false&&!state.licensesConfigured&&!state.license)))return <>{children}</>;
  if(needsLogin)return <section className="terminal-panel billing-gate"><ShieldCheck size={32}/><h2>Entra en tu cuenta para continuar</h2><p>Crea tu cuenta con correo y contraseña para abrir tus fichas en este PC.</p><a className="terminal-button primary" href="#/cuenta">Ir a mi cuenta</a></section>;
  return <section className="terminal-panel billing-gate"><ShieldCheck size={32}/><h2>{loading?'Comprobando el acceso…':error?'No se pudo verificar la suscripción':'Activa tu acceso a Prestafin Terminal'}</h2><p>{error||state?.licenseError||'Entra en Suscripción para activar tu código o gestionar tu plan.'}</p><p>Los datos de tu cuenta se conservan. Puedes exportar una copia aunque tu suscripción no esté activa.</p><div className="billing-actions"><a className="terminal-button primary" href="#/suscripcion">Ir a Suscripción</a><button className="terminal-button" onClick={()=>void refresh()}>Reintentar</button><button className="terminal-button" onClick={()=>void window.prestafin?.exportWorkspace().catch(e=>setExportError(e.message))}>Exportar mis datos</button></div>{exportError&&<p role="alert">{exportError}</p>}</section>;
}
export function AccountPage(){return <BillingPage accountOnly/>;}
