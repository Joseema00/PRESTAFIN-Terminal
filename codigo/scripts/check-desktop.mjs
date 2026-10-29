import { readdir,readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function files(dir) { const entries=await readdir(dir,{withFileTypes:true}); const values=await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)));return values.flat(); }
let count=0;
for(const folder of ['desktop','desktop-runtime','scripts']) for(const file of await files(path.join(root,folder))) {
  if(!/\.(mjs|cjs)$/.test(file)) continue;
  const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
  if(check.status!==0) throw new Error(check.stderr);
  count++;
}
const manifest=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(manifest.dependencies && Object.keys(manifest.dependencies).length) throw new Error('El paquete nativo debe contener solo dependencias integradas');
console.log('Sintaxis de '+count+' módulos nativos correcta; paquete sin dependencias de servidor.');
