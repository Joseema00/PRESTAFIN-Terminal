// Run with Electron, outside the shipped archive. Never reads a real user's profile.
const {app}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.resolve(process.env.PRESTAFIN_SMOKE_ARCHIVE||path.join(root,'release','win-unpacked','resources','app.asar'));
const profile=fs.mkdtempSync(path.join(root,'qa','installed-smoke-profile-')),out=path.join(root,'qa','installed-smoke');
fs.mkdirSync(profile,{recursive:true});fs.mkdirSync(out,{recursive:true});app.setPath('userData',profile);
// Read the archive itself with ASAR interception disabled, then restore Electron's
// virtual filesystem before importing the packaged application.
process.noAsar=true;
const asar=require('@electron/asar'),version=JSON.parse(asar.extractFile(archive,'package.json')).version;
assert.ok(asar.extractFile(archive,'desktop/billing.mjs').toString().includes("code!=='PRESTAFIN30'"));
const archiveSha256=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
process.noAsar=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn){for(let n=0;n<50;n++){if(await fn())return;await pause(400);}throw Error('Installed UI did not reach the expected state');}
let win,done=false;const errors=[];
app.on('browser-window-created',(_event,window)=>{
 win=window;win.show=()=>{};
 win.webContents.on('render-process-gone',(_e,d)=>errors.push('renderer: '+d.reason));
 win.webContents.once('did-finish-load',async()=>{
  try{
   const result={version,archiveSha256,isolatedProfile:true};
   await waitFor(()=>win.webContents.executeJavaScript("!!document.querySelector('#account-email')"));result.loginScreen=true;
   const fixture=process.env.PRESTAFIN_SMOKE_FIXTURE;
   if(fixture){
    const user=JSON.parse(fs.readFileSync(fixture,'utf8'))[1];
    await win.webContents.executeJavaScript(`window.prestafin.authSignIn(${JSON.stringify(user.email)},${JSON.stringify(user.password)})`);
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('focus'));location.hash='/suscripcion'");
    await waitFor(()=>win.webContents.executeJavaScript("!!document.querySelector('#license-code')&&!document.querySelector('#license-code').disabled"));
    const prior=await win.webContents.executeJavaScript('window.prestafin.billingStatus()');
    if(prior.license?.kind!=='promo_30d')await win.webContents.executeJavaScript("window.prestafin.billingRedeemCode('PRESTAFIN30')");
    const status=await win.webContents.executeJavaScript('window.prestafin.billingStatus()');assert.equal(status.eligible,true);assert.equal(status.license.kind,'promo_30d');
    assert.equal(Date.parse(status.license.expiresAt)-Date.parse(status.license.activatedAt),30*86400000);
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('focus'))");
    await waitFor(()=>win.webContents.executeJavaScript("document.body.innerText.includes('Prueba de 30 días activa')"));
    result.realAccountLogin=true;result.realCodeRedemption=prior.license?.kind!=='promo_30d';result.expiresAt=status.license.expiresAt;
    await waitFor(()=>win.webContents.executeJavaScript("/Quedan \\d+ d[ií]as/.test(document.body.innerText)&&document.body.innerText.includes('Caduca el')"));result.daysAndExpiryVisible=true;
    const replay=await win.webContents.executeJavaScript("window.prestafin.billingRedeemCode('PRESTAFIN30').then(()=>false,e=>e.message.includes('ya fue canjeado'))");assert.equal(replay,true);result.replayRejected=true;
   }
   assert.deepEqual(errors,[]);await fs.promises.writeFile(path.join(out,'screen.png'),(await win.webContents.capturePage()).toPNG());
   if(fixture)await win.webContents.executeJavaScript('window.prestafin.billingLogout()');
   await fs.promises.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));done=true;app.exit(0);
  }catch(e){await fs.promises.writeFile(path.join(out,'failed-screen.png'),(await win.webContents.capturePage()).toPNG());console.error(e.stack);app.exit(1);}
 });
});
setTimeout(()=>{if(!done){console.error('Installed smoke timed out');app.exit(2);}},65000).unref();
import(pathToFileURL(path.join(archive,'desktop','main.mjs')).href).catch(e=>{console.error(e.stack);app.exit(1);});
