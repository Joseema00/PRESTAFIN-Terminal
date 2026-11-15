import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const project='cpauzzbjcesctgpvnzax';
const confirmation=await readFile(new URL('../supabase/templates/confirmation.html',import.meta.url),'utf8');
const recovery=await readFile(new URL('../supabase/templates/recovery.html',import.meta.url),'utf8');
export const mailSettings={smtp_sender_name:'Prestafin',mailer_subjects_confirmation:'PRESTAFIN · Confirma tu cuenta',mailer_templates_confirmation_content:confirmation,mailer_subjects_recovery:'PRESTAFIN · Recupera tu contraseña',mailer_templates_recovery_content:recovery};
export async function configureMail({token,fetcher=fetch}){
  if(!token)throw new Error('Falta SUPABASE_ACCESS_TOKEN. No uses la clave pública ni service_role. Puedes guardar las dos plantillas desde Authentication > Emails del Dashboard.');
  const endpoint='https://api.supabase.com/v1/projects/'+project+'/config/auth';
  const auth={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const current=await fetcher(endpoint,{headers:auth,signal:AbortSignal.timeout(15000)});
  if(!current.ok)throw new Error('No se pudo consultar la configuración Auth. HTTP '+current.status);
  // A scoped PATCH preserves SMTP credentials, the Site URL and unrelated email templates.
  const update=await fetcher(endpoint,{method:'PATCH',headers:auth,body:JSON.stringify(mailSettings),signal:AbortSignal.timeout(15000)});
  if(!update.ok)throw new Error('No se pudieron aplicar las plantillas. HTTP '+update.status);
  const check=await fetcher(endpoint,{headers:auth,signal:AbortSignal.timeout(15000)});
  if(!check.ok)throw new Error('Las plantillas se enviaron, pero falta comprobar la configuración.');
  const result=await check.json();
  if(!Object.entries(mailSettings).every(([k,v])=>result[k]===v))throw new Error('La configuración leída no coincide con las plantillas enviadas.');
  return {project,applied:true,codeTemplates:true,senderName:'Prestafin',customSmtp:!!result.smtp_host};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--apply'))console.log(JSON.stringify({project,applied:false,templates:['supabase/templates/confirmation.html','supabase/templates/recovery.html'],senderName:'Prestafin',requires:'SUPABASE_ACCESS_TOKEN y --apply. El remitente del dominio requiere SMTP verificado.'}));
  else configureMail({token:process.env.SUPABASE_ACCESS_TOKEN}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
