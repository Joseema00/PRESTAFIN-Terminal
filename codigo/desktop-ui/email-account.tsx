import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useBilling } from './billing';
import { prepareAccountChange,recoverLegacyWorkspace } from './use-portfolios';

type Mode='login'|'register'|'confirm'|'forgot'|'reset';
export function EmailAccount() {
  const {state,loading,refresh}=useBilling();
  const [mode,setMode]=useState<Mode>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[proof,setProof]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [legacyLink,setLegacyLink]=useState(false);
  const configured=state?.authConfigured??state?.configured;
  const newPassword=['register','reset'].includes(mode),needsPassword=newPassword||mode==='login',needsProof=mode==='confirm'||mode==='reset';
  function change(next:Mode){setMode(next);setPassword('');setRepeat('');setProof('');setLegacyLink(false);setError('');setMessage('');}
  async function action(fn:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await fn();await refresh();}catch(e){setError(e instanceof Error?e.message:'No se pudo completar la solicitud.');}finally{setPassword('');setRepeat('');setBusy(false);}}
  async function submit(){
    if(newPassword&&password!==repeat){setError('Las contraseñas no coinciden.');return;}
    const api=window.prestafin!;
    await action(async()=>{
      if(mode==='login'){await api.authSignIn(email.trim(),password);setMessage('Sesión iniciada.');}
      if(mode==='register'){
        const result=await api.authSignUp(email.trim(),password);
        if(result.confirmationRequired){setMode('confirm');setMessage('Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión con tu contraseña.');}
        else setMessage('Cuenta creada y sesión iniciada.');
      }
      if(mode==='confirm'){await api.authConfirmEmail(email.trim(),proof);setProof('');setMessage('Correo confirmado y sesión iniciada.');}
      if(mode==='forgot'){await api.authRequestPasswordReset(email.trim());setMode('reset');setMessage('Si el correo corresponde a una cuenta, recibirás las instrucciones de recuperación.');}
      if(mode==='reset'){await api.authResetPassword(email.trim(),proof,password);setProof('');setMode('login');setMessage('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');}
    });
  }
  const titles:Record<Mode,string>={login:'Iniciar sesión',register:'Crear cuenta',confirm:'Confirmar correo',forgot:'Recuperar contraseña',reset:'Establecer nueva contraseña'};
  return <section className="terminal-panel billing-account" aria-label="Cuenta de usuario">
    <div><ShieldCheck size={24}/><h2>{state?.email?'Tu cuenta':titles[mode]}</h2><p>{state?.email??'Tu cuenta se guarda en Supabase. Accede con tu correo y contraseña.'}</p>
      {!state?.email&&<p className="billing-small">Las contraseñas las protege Supabase Auth. La terminal no las guarda en el PC.</p>}
    </div>
    <div className="email-account-form">
      {error&&<p className="terminal-warning" role="alert">{error}</p>}{message&&<p className="billing-notice" role="status">{message}</p>}
      {state?.email?<div className="billing-actions"><button className="terminal-button" disabled={busy} onClick={()=>void action(async()=>{await prepareAccountChange();await window.prestafin!.billingLogout();setMode('login');setProof('');setMessage('Sesión cerrada.');})}>Cerrar sesión</button>{state.user&&<button className="terminal-button" disabled={busy} onClick={()=>void action(async()=>{const copied=await recoverLegacyWorkspace(state.user!.id);setMessage(copied?'Fichas anteriores recuperadas.':'Recuperación cancelada.');})}>Recuperar fichas anteriores de este PC</button>}</div>:<>
        <form onSubmit={e=>{e.preventDefault();void submit();}}>
          <label htmlFor="account-email">Correo electrónico</label><input id="account-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy||!configured} onChange={e=>setEmail(e.target.value)}/>
          {needsProof&&<><label htmlFor="account-proof">{legacyLink?'Enlace de un correo anterior':'Código de confirmación'}</label><input id="account-proof" type="text" inputMode={legacyLink?'text':'numeric'} autoComplete={legacyLink?'off':'one-time-code'} pattern={legacyLink?undefined:'[0-9\\s]{6,20}'} spellCheck={false} required maxLength={legacyLink?8192:20} value={proof} disabled={busy} onChange={e=>setProof(e.target.value)}/><p className="billing-small">{legacyLink?'Copia el enlace original del botón del correo sin abrirlo. Una dirección que termina en otp_expired ya no permite confirmar: solicita un correo nuevo.':'Copia el código del correo más reciente y confírmalo aquí. Es de un solo uso. Si ha caducado, solicita otro.'}</p><button type="button" className="terminal-button" disabled={busy} onClick={()=>{setLegacyLink(!legacyLink);setProof('');}}>{legacyLink?'Usar un código':'Mi correo solo contiene un enlace'}</button></>}
          {needsPassword&&<><label htmlFor="account-password">{newPassword?'Nueva contraseña':'Contraseña'}</label><input id="account-password" type="password" autoComplete={newPassword?'new-password':'current-password'} required minLength={newPassword?8:1} maxLength={1024} value={password} disabled={busy||!configured} onChange={e=>setPassword(e.target.value)}/></>}
          {newPassword&&<><p className="billing-small">Al menos 8 caracteres.</p><label htmlFor="account-repeat">Repetir contraseña</label><input id="account-repeat" type="password" autoComplete="new-password" required minLength={8} maxLength={1024} value={repeat} disabled={busy} onChange={e=>setRepeat(e.target.value)}/></>}
          <div className="billing-actions"><button className="terminal-button primary" type="submit" disabled={busy||loading||!configured}>{busy?'Un momento…':mode==='forgot'?'Enviar instrucciones':mode==='reset'?'Guardar nueva contraseña':titles[mode]}</button></div>
        </form>
        <div className="billing-actions">
          {mode==='login'&&<><button type="button" className="terminal-button" disabled={busy} onClick={()=>change('register')}>Crear una cuenta</button><button type="button" className="terminal-button" disabled={busy} onClick={()=>change('confirm')}>Confirmar mi correo</button><button type="button" className="terminal-button" disabled={busy} onClick={()=>change('forgot')}>He olvidado mi contraseña</button></>}
          {mode==='confirm'&&<><button type="button" className="terminal-button" disabled={busy} onClick={()=>void action(async()=>{await window.prestafin!.authResendConfirmation(email.trim());setProof('');setMessage('Si corresponde, recibirás un correo nuevo. Utiliza solo el código o enlace más reciente.');})}>Reenviar código</button><button type="button" className="terminal-button" disabled={busy} onClick={()=>change('login')}>Ya he confirmado: iniciar sesión</button></>}
          {mode!=='login'&&mode!=='confirm'&&<button type="button" className="terminal-button" disabled={busy} onClick={()=>change('login')}>Volver a iniciar sesión</button>}
        </div>
      </>}
    </div>
  </section>;
}
