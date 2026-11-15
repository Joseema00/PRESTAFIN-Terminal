// Package the fixed installation without personal files, backups or developer tools.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir,readFile,writeFile,cp,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),asar=require('@electron/asar');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'..','PRESTAFIN TERMINAL','Prestafin-Terminal');
const stage=path.join(root,'qa','distribution','app');
const archive=path.join(source,'resources','app.asar');
const pkg=JSON.parse(asar.extractFile(archive,'package.json'));
const config=JSON.parse(asar.extractFile(archive,'desktop/billing-config.json'));
if(!config.cloudEnabled||!config.supabaseUrl||!config.supabasePublishableKey)throw Error('Account cloud storage must be configured.');
const allowedConfig=['apiUrl','licensesEnabled','cloudEnabled','supabaseUrl','supabasePublishableKey'];
if(Object.keys(config).some(k=>!allowedConfig.includes(k)))throw Error('Unexpected public configuration field.');
if(!config.supabasePublishableKey.startsWith('sb_publishable_')){
  const claims=JSON.parse(Buffer.from(config.supabasePublishableKey.split('.')[1],'base64url'));
  if(claims.role!=='anon')throw Error('Only public client keys may be distributed.');
}
const forbidden=/\.env(?:\.|$)|workspace.*\.json|billing-session|\.sqlite|\.pdf$|\.csv$|\.previous$|\.map$|(?:^|\/)(?:qa|tests|accounts|node_modules)(?:\/|$)/i;
const suspicious=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sb_secret_[a-zA-Z0-9]+|\b(?:ghp_|github_pat_|sk_live_)[a-zA-Z0-9_]+|jmloespinosa27@gmail\.com|Jose Maria Lopez Espinosa/i;
const manifest=[];
for(const entry of asar.listPackage(archive)){
  const name=entry.replaceAll('\\','/').replace(/^\//,'');
  const info=asar.statFile(archive,path.normalize(name));
  if(info.files)continue;
  if(info.unpacked||info.link||forbidden.test(name))throw Error('Unexpected archive entry: '+name);
  const bytes=asar.extractFile(archive,path.normalize(name));
  if(suspicious.test(bytes.toString('utf8')))throw Error('Sensitive content requires review: '+name);
  manifest.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const files=['Prestafin Terminal.exe','chrome_100_percent.pak','chrome_200_percent.pak','d3dcompiler_47.dll','dxcompiler.dll','dxil.dll','ffmpeg.dll','icudtl.dat','libEGL.dll','libGLESv2.dll','LICENSE.electron.txt','LICENSES.chromium.html','resources.pak','snapshot_blob.bin','v8_context_snapshot.bin','vk_swiftshader.dll','vk_swiftshader_icd.json','vulkan-1.dll','resources/app.asar'];
await mkdir(stage,{recursive:true});
// Reject leftovers rather than risk shipping an old file on a repeated run.
const prior=await readdir(stage);
if(prior.length)throw Error('Distribution staging must be empty. Review it before retrying.');
for(const name of files){await stat(path.join(source,name));await mkdir(path.dirname(path.join(stage,name)),{recursive:true});await cp(path.join(source,name),path.join(stage,name));}
await mkdir(path.join(stage,'locales'),{recursive:true});
for(const name of await readdir(path.join(source,'locales'))){if(!/^[\w-]+\.pak$/.test(name))throw Error('Unexpected locale file');await cp(path.join(source,'locales',name),path.join(stage,'locales',name));}
const build={appId:'tech.prestafin.terminal',productName:'Prestafin Terminal',extraMetadata:{version:pkg.version},directories:{output:'release'},win:{icon:'desktop/icon.ico'},nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:'Prestafin Terminal',artifactName:'Prestafin.Terminal.exe',deleteAppDataOnUninstall:false}};
await writeFile(path.join(root,'qa','distribution','builder.json'),JSON.stringify(build,null,2));
await writeFile(path.join(root,'qa','distribution','manifest.json'),JSON.stringify({version:pkg.version,source,archiveSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),files,archiveFiles:manifest},null,2));
console.log(JSON.stringify({version:pkg.version,archiveFiles:manifest.length,stage,cloudEnabled:true,publicClientKey:true}));
