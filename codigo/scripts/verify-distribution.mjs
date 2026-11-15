import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import asar from '@electron/asar';
const root=path.resolve(import.meta.dirname,'..'),archive=path.join(root,'release','win-unpacked','resources','app.asar');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(JSON.parse(asar.extractFile(archive,'package.json')).version!==pkg.version)throw Error('Installer archive version mismatch');
const config=JSON.parse(asar.extractFile(archive,'desktop/billing-config.json'));
if(!config.cloudEnabled||!config.licensesEnabled||!config.supabasePublishableKey.startsWith('sb_publishable_'))throw Error('Incorrect public account configuration');
if(Object.keys(config).some(k=>!['apiUrl','licensesEnabled','cloudEnabled','supabaseUrl','supabasePublishableKey'].includes(k)))throw Error('Unexpected distributed account configuration');
const forbidden=/(?:^|\/)(?:qa|tests|accounts|node_modules)(?:\/|$)|\.env(?:\.|$)|billing-session|workspace.*\.json|\.sqlite|\.previous$|\.map$/i;
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[A-Za-z0-9]+|\b(?:ghp_|github_pat_|sk_live_|rk_live_|whsec_)[A-Za-z0-9_]{18,}/;
let files=0;
for(const entry of asar.listPackage(archive)){
 const name=entry.replaceAll('\\','/').replace(/^\//,'');const info=asar.statFile(archive,path.normalize(name));if(info.files)continue;
 if(info.link||info.unpacked||forbidden.test(name))throw Error('Unexpected distributed file: '+name);
 if(secret.test(asar.extractFile(archive,path.normalize(name)).toString('utf8')))throw Error('Potential secret in: '+name);files++;
}
const native=asar.extractFile(archive,'desktop/billing.mjs');
if(!native.toString().includes("code!=='PRESTAFIN30'"))throw Error('The installer contains an obsolete redemption client');
if(!native.equals(await readFile(path.join(root,'desktop','billing.mjs'))))throw Error('Native billing code differs from the checked source');
const installerPath=path.join(root,'release','Prestafin.Terminal.exe');
const productVersion=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','(Get-Item -LiteralPath $env:PRESTAFIN_INSTALLER_PATH).VersionInfo.ProductVersion'],{encoding:'utf8',windowsHide:true,env:{...process.env,PRESTAFIN_INSTALLER_PATH:installerPath}}).trim();
if(productVersion!==pkg.version&&productVersion!==pkg.version+'.0')throw Error('Installer executable is obsolete: '+productVersion);
const installer=await readFile(installerPath),sha256=createHash('sha256').update(installer).digest('hex');
const result={version:pkg.version,productVersion,installer:'Prestafin.Terminal.exe',bytes:installer.length,sha256,archiveFiles:files,archiveSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),publicConfiguration:true};
await writeFile(path.join(root,'release','SHA256SUMS.txt'),sha256+'  Prestafin.Terminal.exe\n');
await writeFile(path.join(root,'release','validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
