import { mkdir,cp,readFile,writeFile,copyFile,rename,readdir,stat,rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { finished } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

async function diagnose() {
  if(process.platform!=='win32')throw new Error('Este diagnostico requiere Windows.');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const script=await readFile(path.join(root,'scripts','diagnose-update.ps1'),'utf8');
  const target=path.join(path.dirname(root),'PRESTAFIN TERMINAL','Prestafin-Terminal');
  const powershell=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const result=await promisify(execFile)(powershell,['-NoProfile','-NonInteractive','-Command',script],{
    windowsHide:true,timeout:30000,encoding:'utf8',maxBuffer:1024*1024,
    env:{...process.env,PRESTAFIN_UPDATE_TARGET:target}
  });
  console.log(result.stdout.trim());
  if(result.stderr.trim())console.error(result.stderr.trim());
}
// Keep the existing installation in place if Windows refuses replacement.
// Do not unlink the destination or change file permissions to force an update.
export async function replaceArchive(next,destination,{move=rename,wait=delay,attempts=10,onLocked=()=>{}}={}) {
  for(let attempt=0;attempt<attempts;attempt++) {
    try { await move(next,destination); return; }
    catch(error) {
      if(!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;
      await onLocked({attempt:attempt+1,attempts,code:error.code});
      if(attempt===attempts-1)throw new Error(
        'Windows no permite sustituir app.asar ('+error.code+').\n'+
        'La instalacion actual se conserva y el paquete nuevo queda preparado en app.asar.next.\n'+
        'Guarda tu trabajo y cierra Prestafin Terminal. Si sigue apareciendo en el Administrador de tareas, comprueba que haya terminado de cerrarse.\n'+
        'Reinicia Windows y ejecuta ACTUALIZAR-PRESTAFIN.cmd antes de abrir Prestafin o Codex.\n'+
        'Si persiste tras reiniciar Windows, hay que revisar el bloqueo o los permisos; no borres app.asar.',
        {cause:error});
      await wait(500);
    }
  }
}

async function main() {
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.dirname(root),target=path.join(workspace,'PRESTAFIN TERMINAL','Prestafin-Terminal');
if(!target.startsWith(workspace+path.sep))throw new Error('Destino fuera del espacio de trabajo');
const require=createRequire(import.meta.url),asar=require('@electron/asar');
const stage=path.resolve(root,'qa','package-stage');
if(stage!==path.join(root,'qa','package-stage')||!stage.startsWith(workspace+path.sep))throw new Error('Directorio temporal fuera del proyecto');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
for(const folder of ['desktop','desktop-runtime','dist-desktop'])await cp(path.join(root,folder),path.join(stage,folder),{recursive:true,filter:src=>!src.includes(path.sep+'tests')});
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,version:pkg.version,type:'module',main:pkg.main,description:pkg.description,author:pkg.author}));
const destination=path.join(target,'resources','app.asar'),next=destination+'.next';
await stat(path.join(target,'Prestafin Terminal.exe'));await stat(path.join(stage,'dist-desktop','index.html'));
const output=await asar.createPackage(stage,next);
// asar 3 returns its write stream before the file descriptor has closed.
if(output && typeof output.on==='function')await finished(output);
const check=['desktop-runtime/fund-identity.mjs','desktop-runtime/integrated-risk.mjs','desktop-runtime/professional-analysis.mjs','desktop-runtime/automatic-optimization.mjs','desktop-runtime/interview-model.mjs','desktop-runtime/client-plan.mjs','desktop-runtime/reference-models.mjs','desktop-runtime/optimization.mjs','desktop-runtime/optimization-LICENSE.txt','desktop/cloud-workspaces.mjs','desktop-runtime/account-models.mjs','desktop/icon.ico','dist-desktop/favicon.png','desktop/account-workspaces.mjs','desktop/billing.mjs','desktop/billing-config.json','desktop/fund-directory.mjs','desktop-runtime/fund-lookup.mjs','desktop-runtime/market/ft-funds.server.mjs','desktop-runtime/market/providers.server.mjs','desktop/market-store.mjs','desktop/main.mjs','desktop/preload.cjs','desktop-runtime/fund-catalog.mjs','desktop-runtime/fund-models.mjs','desktop-runtime/fund-performance.mjs','desktop-runtime/market/fund-provider.server.mjs','dist-desktop/index.html'];
  check.push('desktop-runtime/portfolio-lab.mjs','desktop-runtime/holding-classification.mjs','desktop-runtime/assets.mjs','desktop-runtime/assets-extended.mjs');
  for(const file of await readdir(path.join(root,'dist-desktop','assets')))check.push('dist-desktop/assets/'+file);
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const name of check){if(hash(asar.extractFile(next,path.normalize(name)))!==hash(await readFile(path.join(root,name))))throw new Error('No coincide el archivo empaquetado: '+name);}
if(JSON.parse(asar.extractFile(next,'package.json')).version!==pkg.version)throw new Error('Versión no válida');
if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({version:pkg.version,prepared:true,installation:target,verifiedFiles:check.length,sha256:hash(await readFile(next))}));return;}
await copyFile(destination,destination+'.previous');
const waitForUnlock=process.argv.includes('--wait');
await replaceArchive(next,destination,{attempts:waitForUnlock?241:10,onLocked:({attempt})=>{
 if(attempt===1)console.log('El archivo esta ocupado. La version anterior y el paquete nuevo se conservan.');
 if(waitForUnlock&&attempt===1)console.log('Esperando hasta 2 minutos. Guarda tu trabajo y cierra Prestafin y Codex; deja esta ventana abierta.');
 if(waitForUnlock&&attempt%30===0)console.log('Sigue bloqueado. Esperando a que Windows permita la sustitucion...');
}});
for(const name of ['ACTUALIZAR-PRESTAFIN.cmd','README.md','GUIA-PERSONAS.md','GUIA-ENTREVISTA.md','GUIA-CARTERAS-Y-SEGUIMIENTO.md','METODOLOGIA-Y-VALIDACION.md','ESTUDIO-PRODUCTOS.md','GUIA-FONDOS.md','GUIA-SUSCRIPCIONES.md','GUIA-CUENTAS.md']){
 try{await copyFile(path.join(root,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}
}
await writeFile(path.join(target,'LEEME.txt'),`PRESTAFIN TERMINAL ${pkg.version}\n\nAbre Prestafin Terminal.exe desde esta carpeta, conservando todos los archivos.\nNo es necesario extraer ningún ZIP.\n\nNovedades 0.27: laboratorio de cartera, controles opcionales con valores automaticos, procesos estocasticos, graficos y conclusiones PDF, alternativas de fondos con metricas comparables. Planes mensual y anual Proximamente, sin redireccion.\n\nHistorial 0.26: PRESTAFIN30, 30 dias Pro sin tarjeta una sola vez por cuenta, caducidad visible y suscripcion de pago opcional. Retirada la prueba automatica de 14 dias en nuevos pagos.\n\nHistorial 0.25.1: historicos de fondos por clase exacta, cobertura individual y errores de proveedor visibles. MyInvestor Value C y Cobas Large Cap P comprobados con 25 rentabilidades mensuales comunes. No se reutiliza un historico descargado tras cambiar la clase del producto.\n\nHistorial 0.25: recorrido unificado del cliente, herramientas de cartera agrupadas y Markowitz avanzado automatico; estimador robusto y Ridge condicionado a validacion temporal cuando existe historico suficiente. Ajustes manuales opcionales conservados.\n\nHistorial 0.24: asignacion de modelos existentes segun entrevista, ajustes opcionales y grafico con los 1500 repartos simulados y soluciones destacadas. Consulta README.md para detalles y limites de validacion.\n\nHistorial 0.21: crear cartera con fondos desde la entrevista en una accion; modelo y cartera guardados juntos, seleccion por exposiciones compatibles con el riesgo y explicacion individual por fondo.\n\nHistorial 0.20.1: creador directo de modelos, resultado visible, apertura de la cartera guardada y reintentos sin duplicados. Se usa la entrevista activa y se eliminan controles duplicados y listados sin acciones.\n\nHistorial 0.20: creador de modelos desde una entrevista seleccionada, nombre y enfoque editables, vista previa, guardado privado y respuestas de origen conservadas. Los reintentos no duplican modelos y los cambios de respuestas crean otra versión.\n\nHistorial 0.19: carteras personalizadas desde entrevista y liquidez registrada, reparto continuo, modelos privados y seis perfiles externos de Andbank para comparación. Resumen breve de cada cliente con análisis ampliado desplegable.\n\nHistorial 0.18: interfaz renovada, herramientas agrupadas, buscador con acceso directo, opciones de informe desplegables y apertura sin conexión de estudios guardados. Recuperación ante fallos de inicio del cálculo, protección contra duplicados y conservación de históricos compatibles. Clasificación por ISIN exacto y bloques de planificación editables para productos pendientes.\n\nHistorial 0.17: optimización continua de hasta 30 activos, ocho métodos, cinco estimadores de covarianza, restricciones verificadas, versiones del estudio guardadas en la cuenta y gráficos del estudio en PDF. Se conserva la malla clásica. Ver GUIA-CARTERAS-Y-SEGUIMIENTO.md y METODOLOGIA-Y-VALIDACION.md.\n\nHistorial 0.16: servidor de suscripciones desplegado en Supabase; activación de cobros pendiente de secretos Stripe y configuración fiscal del titular. Ver GUIA-SUSCRIPCIONES.md. Novedades 0.15: clientes, cuestionarios, carteras y modelos privados guardados en la cuenta Supabase, con migración de su archivo local y control de conflictos entre dispositivos. Editor de modelos y asignación al completar el cuestionario. Carteras > Cartera automática desde las respuestas guardadas, con preferencia por fondos y separación de reservas y objetivos; eliminación de carteras con confirmación; isotipo original. Pantalla de bienvenida, confirmación por código y licencia Pro permanente canjeable por cuenta. Plantillas y remitente del correo pendientes de aplicar en Auth/SMTP. Cuenta Supabase con correo y contraseña, registro, confirmación y recuperación; fichas y modelos guardados en Supabase por cuenta (ver GUIA-CUENTAS.md). Sección Suscripción con planes de 50 EUR/mes y 490 EUR/año sin prueba automática adicional (servidor desplegado; configuración fiscal pendiente). Búsqueda por ISIN fuera del catálogo inicial, fichas guardadas, históricos por clase y divisa, informes personalizables con gráficos vectoriales, históricos y explicaciones; PDF de respuestas.\nVer GUIA-SUSCRIPCIONES.md para activar pagos. Ver GUIA-FONDOS.md para cobertura, pruebas y límites de la actualización.\n\nCódigo y futuras actualizaciones: ${root}\n`,'utf8');
console.log(JSON.stringify({version:pkg.version,installation:target,verifiedFiles:check.length,sha256:hash(await readFile(destination))}));

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const diagnostic=process.argv.includes('--diagnose');
  (diagnostic?diagnose():main()).catch(error=>{console.error('\nNo se pudo completar '+(diagnostic?'el diagnostico':'la actualizacion')+'.\n'+error.message);process.exitCode=1;});
}
