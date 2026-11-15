const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
export function normalizeLicenseCode(value){
  if(typeof value!=='string'||value.length>128)throw new Error('Código no válido.');
  const code=value.replace(/[\s-]/g,'').toUpperCase();
  if(!/^PFTPRO[A-F0-9]{48}$/.test(code))throw new Error('Código no válido.');
  return code;
}
export async function hashLicenseCode(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizeLicenseCode(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function licenseView(row){return row?{kind:'pro_permanent',status:row.revoked_at?'revoked':'active',permanent:true,activatedAt:row.activated_at}:null;}
function promoView(row){if(!row)return null;const active=Number.isFinite(Date.parse(row.expires_at))&&Date.parse(row.expires_at)>Date.now();return {kind:'promo_30d',status:active?'active':'expired',permanent:false,activatedAt:row.redeemed_at,expiresAt:row.expires_at};}
export function createLicenseHandler({url,key,fetcher=fetch}){
  async function api(route,options={}){
    const r=await fetcher(url+route,{...options,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...options.headers}});
    if(!r.ok)throw new Error('Servicio de licencias no disponible.');
    return r.status===204?null:r.json();
  }
  return async req=>{
    try{
      const path=new URL(req.url).pathname;
      const isStatus=path.endsWith('/terminal-license/status')&&req.method==='GET';
      const isRedeem=path.endsWith('/terminal-license/redeem')&&req.method==='POST';
      if(!isStatus&&!isRedeem)return reply({error:'Ruta no disponible.'},404);
      const authorization=req.headers.get('authorization')??'';
      if(!/^Bearer [^\s]{1,8192}$/.test(authorization))return reply({error:'Inicia sesión para continuar.'},401);
      // Always resolve the signed-in identity with Auth. No user ID or metadata from the body is trusted.
      const auth=await fetcher(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!auth.ok)return reply({error:'La sesión no es válida. Vuelve a entrar.'},401);
      const user=await auth.json();
      if(!user.id||!user.email_confirmed_at)return reply({error:'Confirma tu correo antes de activar una licencia.'},403);
      if(isStatus){
        const rows=await api('/rest/v1/terminal_entitlements?'+new URLSearchParams({user_id:'eq.'+user.id,select:'activated_at,revoked_at',limit:'1'}));
        const permanent=licenseView(rows[0]);
        if(permanent?.status==='active')return reply({license:permanent});
        const promotions=await api('/rest/v1/terminal_promo_redemptions?'+new URLSearchParams({user_id:'eq.'+user.id,select:'redeemed_at,expires_at',limit:'1'}));
        const promo=promoView(promotions[0]);
        return reply({license:promo?.status==='active'?promo:permanent??promo});
      }
      if(Number(req.headers.get('content-length')??0)>1024)return reply({error:'Solicitud demasiado grande.'},413);
      const reader=req.body?.getReader();if(!reader)return reply({error:'Introduce un código.'},400);
      let size=0,chunks=[];
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return reply({error:'Solicitud demasiado grande.'},413);}chunks.push(value);}
      let data;try{data=JSON.parse(await new Blob(chunks).text());}catch{return reply({error:'Solicitud no válida.'},400);}
      if(!data||Object.keys(data).some(k=>k!=='code'))return reply({error:'Solicitud no válida.'},400);
      if(typeof data.code==='string'&&data.code.trim().toUpperCase()==='PRESTAFIN30'){
        const result=await api('/rest/v1/rpc/terminal_redeem_promo',{method:'POST',body:JSON.stringify({p_user_id:user.id,p_code:'PRESTAFIN30'})});
        if(result.error)return reply({error:result.error},[401,403,409,429].includes(result.status)?result.status:400);
        return reply({license:promoView(result)});
      }
      let hash;try{hash=await hashLicenseCode(data.code);}catch{return reply({error:'Código no válido.'},400);}
      const result=await api('/rest/v1/rpc/terminal_redeem_license',{method:'POST',body:JSON.stringify({p_user_id:user.id,p_code_hash:hash})});
      if(result.error)return reply({error:result.error},result.status===429?429:400);
      return reply({license:licenseView(result)});
    }catch{return reply({error:'No se pudo verificar la licencia. Inténtalo de nuevo.'},503);}
  };
}
