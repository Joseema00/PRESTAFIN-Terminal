import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import {spawnSync} from 'node:child_process';
import {build} from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// These original domain modules are dependency-free. No web server or secrets are bundled.
const files = ['portfolio-lab','holding-classification','assets','assets-extended','fund-identity','automatic-optimization','interview-model','client-plan','reference-models','account-models','fund-lookup','market/ft-funds.server','fund-catalog','fund-models','fund-performance','market/fund-provider.server','market/providers.server','market/metrics','market/provider-types','market/bundle.server','finance','wealth','risk-profile','people','interview-input','interview-plan','investment-products','portfolio-proposal','allocation-engine','portfolio-monitor','integrated-risk','adviser','professional-analysis'];
for (const file of files) {
  const input = path.join(root,'src/lib',file + '.ts');
  let js = stripTypeScriptTypes(await readFile(input,'utf8'),{mode:'strip'});
  js = js.replace(/(from\s+["'])(\.[^"']+)(["'])/g,(_,a,b,c) => a + b + '.mjs' + c);
  js = js.replace('"./store.server.mjs"','"../../desktop/market-store.mjs"');
  const output = path.join(root,'desktop-runtime',file + '.mjs');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,js,'utf8');
}
// Bundle the numerical dependency for the native validator: no npm install on
// the client's computer and no external module lookup inside the ASAR.
await build({root,configFile:false,publicDir:false,logLevel:'error',build:{outDir:path.join(root,'desktop-runtime'),emptyOutDir:false,minify:false,target:'es2022',lib:{entry:path.join(root,'src/lib/optimization.ts'),formats:['es'],fileName:()=> 'optimization.mjs'}}});
await writeFile(path.join(root,'desktop-runtime/optimization-LICENSE.txt'),'quadprog 2.0.0 — '+await readFile(path.join(root,'node_modules/quadprog/LICENSE'),'utf8'));
// Reuse the supplied artwork; only downscale the window ICO when the PNG exceeds its format limit.
const png = await readFile(path.join(root,'src/assets/isotipo.png'));
const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
if (width <= 256 && height <= 256) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1,2); header.writeUInt16LE(1,4);
  header[6] = width === 256 ? 0 : width; header[7] = height === 256 ? 0 : height;
  header.writeUInt16LE(1,10); header.writeUInt16LE(32,12); header.writeUInt32LE(png.length,14); header.writeUInt32LE(22,18);
  await writeFile(path.join(root,'desktop/icon.ico'),Buffer.concat([header,png]));
} else if(process.platform==='win32') {
  const powershell=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const script=await readFile(path.join(root,'scripts/prepare-brand.ps1'),'utf8');
  const result=spawnSync(powershell,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,encoding:'utf8',timeout:20000,env:{...process.env,PRESTAFIN_BRAND_SOURCE:path.join(root,'src/assets/isotipo.png'),PRESTAFIN_BRAND_ICON:path.join(root,'desktop/icon.ico')}});
  if(result.status!==0)throw new Error('No se pudo preparar el icono original de Prestafin: '+(result.stderr||result.error?.message||result.status));
}
console.log('Motor de escritorio preparado.');
