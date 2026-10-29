import { mkdir,cp,readFile,writeFile,copyFile,rename,readdir,stat,rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
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
await asar.createPackage(stage,next);
const check=['desktop/main.mjs','desktop/preload.cjs','desktop-runtime/fund-catalog.mjs','desktop-runtime/fund-models.mjs','desktop-runtime/fund-performance.mjs','desktop-runtime/market/fund-provider.server.mjs','dist-desktop/index.html'];
for(const file of await readdir(path.join(root,'dist-desktop','assets')))check.push('dist-desktop/assets/'+file);
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const name of check){if(hash(asar.extractFile(next,path.normalize(name)))!==hash(await readFile(path.join(root,name))))throw new Error('No coincide el archivo empaquetado: '+name);}
if(JSON.parse(asar.extractFile(next,'package.json')).version!==pkg.version)throw new Error('Versión no válida');
await copyFile(destination,destination+'.previous');
await rename(next,destination);
for(const name of ['README.md','GUIA-PERSONAS.md','GUIA-ENTREVISTA.md','GUIA-CARTERAS-Y-SEGUIMIENTO.md','METODOLOGIA-Y-VALIDACION.md','ESTUDIO-PRODUCTOS.md','GUIA-FONDOS.md']){
 try{await copyFile(path.join(root,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}
}
await writeFile(path.join(target,'LEEME.txt'),`PRESTAFIN TERMINAL ${pkg.version}\n\nAbre Prestafin Terminal.exe desde esta carpeta, conservando todos los archivos.\nNo es necesario extraer ningún ZIP.\n\nNovedades: 15 carteras modelo de fondos, reparto RV/RF vinculado a la entrevista, fichas de fondos, gráficos y rentabilidades con fechas y fuentes.\nVer GUIA-FONDOS.md para cobertura, pruebas y límites de la actualización.\n\nCódigo y futuras actualizaciones: ${root}\n`,'utf8');
console.log(JSON.stringify({version:pkg.version,installation:target,verifiedFiles:check.length,sha256:hash(await readFile(destination))}));
