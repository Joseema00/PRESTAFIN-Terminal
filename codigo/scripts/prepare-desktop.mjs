import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// These original domain modules are dependency-free. No web server or secrets are bundled.
const files = ['fund-catalog','fund-models','fund-performance','market/fund-provider.server','market/providers.server','market/metrics','market/provider-types','market/bundle.server','finance','wealth','risk-profile','people','interview-input','interview-plan','investment-products','portfolio-proposal','allocation-engine','portfolio-monitor','integrated-risk','adviser','professional-analysis'];
for (const file of files) {
  const input = path.join(root,'src/lib',file + '.ts');
  let js = stripTypeScriptTypes(await readFile(input,'utf8'),{mode:'strip'});
  js = js.replace(/(from\s+["'])(\.[^"']+)(["'])/g,(_,a,b,c) => a + b + '.mjs' + c);
  js = js.replace('"./store.server.mjs"','"../../desktop/market-store.mjs"');
  const output = path.join(root,'desktop-runtime',file + '.mjs');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,js,'utf8');
}
// ICO format can embed a PNG. Preserve the supplied brand pixels unchanged.
const png = await readFile(path.join(root,'src/assets/isotipo.png'));
const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
if (width <= 256 && height <= 256) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1,2); header.writeUInt16LE(1,4);
  header[6] = width === 256 ? 0 : width; header[7] = height === 256 ? 0 : height;
  header.writeUInt16LE(1,10); header.writeUInt16LE(32,12); header.writeUInt32LE(png.length,14); header.writeUInt32LE(22,18);
  await writeFile(path.join(root,'desktop/icon.ico'),Buffer.concat([header,png]));
}
console.log('Motor de escritorio preparado.');
