import { readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function emailInput(value){if(typeof value!=='string'||value.length>254||!/^\S+@\S+\.\S+$/.test(value.trim()))throw new Error('Introduce un correo válido.');return value.trim();}
export function passwordInput(value,isNew=false){if(typeof value!=='string'||!value.length||value.length>1024||(isNew&&value.length<8))throw new Error(isNew?'Utiliza una contraseña de al menos 8 caracteres.':'Introduce tu contraseña.');return value;}
export function emailProof(base,email,value,type) {
  if(typeof value!=='string'||value.length>8192)throw new Error('Introduce el código o enlace recibido por correo.');
  const proof=value.trim();
  if(/^\d{6,10}$/.test(proof.replace(/\s/g,'')))return {email,token:proof.replace(/\s/g,''),type};
  if(proof.includes('otp_expired'))throw new Error('Ese enlace ya no es válido. Solicita un correo nuevo y utiliza su código en la terminal.');
  let url;try{url=new URL(proof);}catch{throw new Error('El código o enlace no es válido.');}
  const kind=url.searchParams.get('type'),token=url.searchParams.get('token_hash')??url.searchParams.get('token');
  if(url.origin!==new URL(base).origin||url.username||url.password||url.pathname!=='/auth/v1/verify'||!token||token.length>2048||!((type==='signup'&&['signup','email'].includes(kind))||kind===type))throw new Error('Utiliza el enlace de este proyecto y del tipo de verificación solicitado.');
  return {token_hash:token,type:kind};
}

export function billingConfig(value) {
  const keys=['apiUrl','supabaseUrl','supabasePublishableKey'];
  if(keys.every(k=>!value?.[k])) return null;
  if(['supabaseUrl','supabasePublishableKey'].some(k=>typeof value?.[k]!=='string'||!value[k])||(value.apiUrl!==undefined&&typeof value.apiUrl!=='string')) throw new Error('Configuración de cuenta incompleta.');
  for(const key of ['apiUrl','supabaseUrl']) {
    if(key==='apiUrl'&&!value[key])continue;
    const u=new URL(value[key]);
    const edge=key==='apiUrl'&&u.pathname==='/functions/v1/terminal-billing'&&u.origin===new URL(value.supabaseUrl).origin;
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'&&!edge) throw new Error('La suscripción requiere direcciones HTTPS del servidor autorizado.');
  }
  const key=value.supabasePublishableKey;
  if(value.licensesEnabled!==undefined&&typeof value.licensesEnabled!=='boolean')throw new Error('Configuración de licencias no válida.');
  if(value.cloudEnabled!==undefined&&typeof value.cloudEnabled!=='boolean')throw new Error('Configuración de guardado en cuenta no válida.');
  if(!key.startsWith('sb_publishable_')) {
    let payload;try{payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}
    if(payload?.role!=='anon') throw new Error('Usa solo la clave pública de Supabase.');
  }
  return {...value,apiUrl:(value.apiUrl??'').replace(/\/$/,''),supabaseUrl:value.supabaseUrl.replace(/\/$/,'')};
}
export function stripeUrl(value,kind) {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname!==(kind==='checkout'?'checkout.stripe.com':'billing.stripe.com')) throw new Error('Stripe devolvió una dirección no permitida.');
  return u.href;
}

// Tokens stay in the main process and are encrypted with the operating system.
export class BillingClient {
  constructor({config,folder,crypto,open,fetcher=fetch}) {
    this.config=billingConfig(config);this.folder=folder;this.crypto=crypto;this.open=open;this.fetcher=fetcher;
    this.file=path.join(folder,'billing-session.bin');this.session=null;this.loaded=false;this.tail=Promise.resolve();this.lastMail=0;
  }
  run(fn){const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next;}
  async request(base,route,{body,token,method}={}) {
    const response=await this.fetcher(base+route,{method:method??(body===undefined?'GET':'POST'),redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(base===this.config.supabaseUrl?{apikey:this.config.supabasePublishableKey}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const value=response.status===204?{}:await response.json();
    if(!response.ok) {
      if(value.error_code==='invalid_credentials')throw new Error('Correo o contraseña incorrectos.');
      if(value.error_code==='email_not_confirmed')throw new Error('Confirma tu correo antes de iniciar sesión.');
      if(value.error_code==='weak_password')throw new Error('Supabase requiere una contraseña más segura. Usa una contraseña más larga y menos común.');
      if(value.error_code==='otp_expired')throw new Error('El código o enlace ha caducado o ya se ha utilizado. Solicita otro correo.');
      if(route.startsWith('/functions/v1/terminal-license/')&&typeof value.error==='string')throw new Error(value.error.slice(0,200));
      if(value.error_code==='over_email_send_rate_limit'||value.error_code==='email_address_not_authorized')throw new Error('Supabase no puede enviar este correo ahora. Revisa el servicio SMTP y sus límites de envío.');
      if(response.status===401)throw new Error('La sesión ha caducado. Cierra la sesión y vuelve a entrar.');
      if(response.status===429)throw new Error('Demasiados intentos. Espera un minuto antes de repetir.');
      throw new Error(base===this.config.apiUrl&&typeof value.error==='string'?value.error:'No se pudo completar la solicitud. Comprueba los datos o inténtalo de nuevo.');
    }
    return value;
  }
  requireConfig(){if(!this.config)throw new Error('La cuenta de Supabase todavía no está configurada.');}
  async save(session) {
    if(!session?.access_token||!session.refresh_token||!session.user?.email)throw new Error('Respuesta de acceso no válida.');
    if(!this.crypto.isEncryptionAvailable())throw new Error('Windows no permite guardar la sesión de forma segura.');
    const next={...session,expires_at:session.expires_at??Math.floor(Date.now()/1000)+session.expires_in};
    const encrypted=this.crypto.encryptString(JSON.stringify({refresh_token:next.refresh_token,project:this.config.supabaseUrl}));
    await mkdir(this.folder,{recursive:true});await writeFile(this.file+'.next',encrypted,{mode:0o600});await rename(this.file+'.next',this.file);this.session=next;
  }
  async auth() {
    this.requireConfig();
    if(!this.loaded){
      this.loaded=true;
      try{const saved=JSON.parse(this.crypto.decryptString(await readFile(this.file)));if(saved.project===this.config.supabaseUrl)this.session={refresh_token:saved.refresh_token};}
      catch(error){if(error.code!=='ENOENT'){this.loaded=false;throw new Error('No se pudo recuperar la sesión. Cierra la sesión y vuelve a entrar.');}}
    }
    if(this.session&&(!this.session.expires_at||this.session.expires_at<Date.now()/1000+60))await this.save(await this.request(this.config.supabaseUrl,'/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:this.session.refresh_token}}));
    return this.session;
  }
  status(){return this.run(async()=>{
    if(!this.config)return {configured:false,email:null,subscription:null,eligible:false};
    const session=await this.auth();
    const account={configured:!!this.config.apiUrl,licensesConfigured:!!this.config.licensesEnabled,authConfigured:true,email:session?.user?.email??null,user:session?{id:session.user.id,email:session.user.email}:null};
    let license=null,licenseError='';
    if(session&&this.config.licensesEnabled)try{license=await this.license(session);}catch{licenseError='No se pudo consultar la licencia. Comprueba la conexión y actualiza el estado.';}
    const permanent=license?.status==='active'&&license?.kind==='pro_permanent';
    const promotion=license?.status==='active'&&license?.kind==='promo_30d'&&Number.isFinite(Date.parse(license.expiresAt))&&Date.parse(license.expiresAt)>Date.now();
    const granted=permanent||promotion;
    if(!session||!this.config.apiUrl)return {...account,license,licenseError,subscription:null,eligible:granted};
    try{
      const state=await this.request(this.config.apiUrl,'/v1/status',{token:session.access_token});
      return {...state,...account,configured:state.configured!==false,license,licenseError,eligible:granted||state.eligible,verifiedAt:Date.now()};
    }catch(error){if(!granted)throw error;return {...account,license,licenseError,subscription:null,eligible:true,billingError:'No se pudo consultar la facturación.',verifiedAt:Date.now()};}
  });}
  async license(session){return (await this.request(this.config.supabaseUrl,'/functions/v1/terminal-license/status',{token:session.access_token})).license??null;}
  redeemCode(code){return this.run(async()=>{
    this.requireConfig();if(!this.config.licensesEnabled)throw new Error('El servicio de códigos aún no está conectado.');
    if(typeof code!=='string'||code.length>128)throw new Error('Código no válido.');
    code=code.replace(/[\s-]/g,'').toUpperCase();if(code!=='PRESTAFIN30'&&!/^PFTPRO[A-F0-9]{48}$/.test(code))throw new Error('Código no válido.');
    const session=await this.auth();if(!session)throw new Error('Inicia sesión y confirma tu correo para activar el código.');
    await this.request(this.config.supabaseUrl,'/functions/v1/terminal-license/redeem',{body:{code},token:session.access_token});return true;
  });}
  identity(){return this.run(async()=>({configured:!!this.config,userId:this.config?(await this.auth())?.user?.id??null:null,storage:this.config?.cloudEnabled?'cloud':'local'}));}
  async verifiedSession(data,expectedEmail) {
    if(!data?.access_token||!data.refresh_token)throw new Error('No se pudo verificar la sesión.');
    const user=await this.request(this.config.supabaseUrl,'/auth/v1/user',{token:data.access_token});
    if(!user.id||!user.email||!user.email_confirmed_at||user.email.toLowerCase()!==expectedEmail.toLowerCase())throw new Error('La cuenta verificada no coincide con este correo.');
    return {...data,user};
  }
  signIn(email,password){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);password=passwordInput(password);
    if(await this.auth())throw new Error('Cierra la sesión actual antes de cambiar de cuenta.');
    const data=await this.request(this.config.supabaseUrl,'/auth/v1/token?grant_type=password',{body:{email,password}});
    await this.save(await this.verifiedSession(data,email));this.loaded=true;return true;
  });}
  signUp(email,password){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);password=passwordInput(password,true);
    if(await this.auth())throw new Error('Cierra la sesión actual antes de crear otra cuenta.');
    const data=await this.request(this.config.supabaseUrl,'/auth/v1/signup',{body:{email,password}});
    if(data.access_token){await this.save(await this.verifiedSession(data,email));this.loaded=true;return {confirmationRequired:false};}
    return {confirmationRequired:true};
  });}
  mailAllowed(){if(Date.now()-this.lastMail<60000)throw new Error('Espera un minuto antes de solicitar otro correo.');this.lastMail=Date.now();}
  resendConfirmation(email){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);this.mailAllowed();
    await this.request(this.config.supabaseUrl,'/auth/v1/resend',{body:{type:'signup',email}});return true;
  });}
  confirmEmail(email,proof){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);
    if(await this.auth())throw new Error('Cierra la sesión actual antes de confirmar otra cuenta.');
    const body=emailProof(this.config.supabaseUrl,email,proof,'signup');
    const data=await this.request(this.config.supabaseUrl,'/auth/v1/verify',{body});
    await this.save(await this.verifiedSession(data,email));this.loaded=true;return true;
  });}
  requestPasswordReset(email){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);this.mailAllowed();
    await this.request(this.config.supabaseUrl,'/auth/v1/recover',{body:{email}});return true;
  });}
  resetPassword(email,proof,password){return this.run(async()=>{
    this.requireConfig();email=emailInput(email);password=passwordInput(password,true);
    if(await this.auth())throw new Error('Cierra la sesión actual antes de recuperar una cuenta.');
    const body=emailProof(this.config.supabaseUrl,email,proof,'recovery');
    const data=await this.request(this.config.supabaseUrl,'/auth/v1/verify',{body});
    const session=await this.verifiedSession(data,email);
    await this.request(this.config.supabaseUrl,'/auth/v1/user',{body:{password},token:session.access_token,method:'PUT'});
    // Recovery authorizes only the password change; it never opens financial data.
    try{await this.request(this.config.supabaseUrl,'/auth/v1/logout?scope=global',{body:{},token:session.access_token});}catch{}
    return true;
  });}
  checkout(plan){return this.run(async()=>{
    if(!this.config?.apiUrl)throw new Error('Los pagos todavía no están activados.');
    if(!['month','year'].includes(plan))throw new Error('Plan no válido.');
    const session=await this.auth();if(!session)throw new Error('Entra con tu correo para continuar.');
    const license=this.config.licensesEnabled?await this.license(session):null;
    if(license?.kind==='pro_permanent'&&license.status==='active')throw new Error('Tu cuenta ya tiene acceso Pro permanente. No necesitas contratar otra suscripción.');
    const result=await this.request(this.config.apiUrl,'/v1/checkout',{body:{plan},token:session.access_token});
    await this.open(stripeUrl(result.url,'checkout'));return true;
  });}
  portal(){return this.run(async()=>{
    if(!this.config?.apiUrl)throw new Error('Los pagos todavía no están activados.');
    const session=await this.auth();if(!session)throw new Error('Entra con tu correo para continuar.');
    const result=await this.request(this.config.apiUrl,'/v1/portal',{body:{},token:session.access_token});
    await this.open(stripeUrl(result.url,'portal'));return true;
  });}
  logout(){return this.run(async()=>{
    // Local logout must remain possible even when the network or refresh fails.
    const token=this.session?.access_token;this.session=null;this.loaded=true;
    await rm(this.file,{force:true});await rm(this.file+'.next',{force:true});
    if(token&&this.config)try{await this.request(this.config.supabaseUrl,'/auth/v1/logout?scope=local',{body:{},token});}catch{}
    return true;
  });}
}
