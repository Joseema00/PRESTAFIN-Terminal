import {useEffect,useState,type ReactNode} from 'react';
import {useBilling} from './billing';
import {EmailAccount} from './email-account';
import isotipo from '../src/assets/isotipo.png';
import './welcome.css';
import {AppVersion} from './app-version';
export function Welcome({children}:{children:ReactNode}){
  const {state,loading,error,refresh}=useBilling();const [ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setReady(true),650);return()=>clearTimeout(timer);},[]);
  if(!ready||loading)return <main className="prestafin-splash" role="status"><img src={isotipo} alt=""/><strong>PRESTAFIN<span>TERMINAL</span></strong><p>Preparando tu espacio de trabajo…</p><div className="welcome-progress"/></main>;
  if(state?.email||(!state?.authConfigured&&state&&!error))return <>{children}</>;
  return <main className="prestafin-welcome">
    <section className="welcome-intro"><div className="welcome-brand"><img src={isotipo} alt=""/><span>PRESTAFIN<span>TERMINAL</span></span></div><span className="welcome-eyebrow">TU ESPACIO DE ANÁLISIS PATRIMONIAL</span><h1>Todo empieza con una buena perspectiva.</h1><p>Personas, patrimonio, carteras e informes. Un espacio para comprender cada situación y trabajar con criterio.</p><div className="welcome-points"><span>01 · Organiza tus fichas</span><span>02 · Analiza y compara</span><span>03 · Explica con informes</span></div><small>Edición de escritorio · Clientes y modelos vinculados a tu cuenta.</small></section>
    <section className="welcome-access billing-page"><p className="welcome-eyebrow">BIENVENIDO A PRESTAFIN</p><h2>Accede a tu terminal</h2><p>Inicia sesión o crea tu cuenta para continuar.</p>
      {error&&<div className="terminal-warning" role="alert"><p>{error}</p><div className="billing-actions"><button className="terminal-button" disabled={busy} onClick={()=>void refresh()}>Reintentar conexión</button><button className="terminal-button" disabled={busy} onClick={()=>{setBusy(true);void window.prestafin?.billingLogout().then(refresh).finally(()=>setBusy(false));}}>Restablecer sesión</button></div></div>}
      <EmailAccount/>
      <small>Al acceder podrás activar tu licencia o gestionar tu suscripción.</small><AppVersion/>
    </section>
  </main>;
}
