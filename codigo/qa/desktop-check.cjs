const {app,BrowserWindow}=require('electron');
const path=require('node:path');const fs=require('node:fs/promises');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');const out=path.join(root,'qa','results');
app.setPath('userData',path.join(root,'qa','profile'));
app.on('browser-window-created',(_event,win)=>{
 win.show=()=>{};
 win.webContents.on('did-fail-load',(_e,c,m)=>console.error('LOAD',c,m));
 win.webContents.on('console-message',(_event,level,message)=>{if(level>=2)console.error('RENDERER',message);});
 win.webContents.once('did-finish-load',async()=>{
  try{await fs.mkdir(out,{recursive:true});await win.webContents.executeJavaScript("location.hash='/fondos'");await new Promise(r=>setTimeout(r,1800));
   const text=await win.webContents.executeJavaScript('document.body.innerText');await fs.writeFile(path.join(out,'funds-ui.txt'),text);
   await fs.writeFile(path.join(out,'funds.png'),(await win.webContents.capturePage()).toPNG());console.log('FUND_UI',text.includes('Fichas e históricos'),text.includes('v0.7.0'));app.exit(0);
  }catch(e){console.error(e);app.exit(1);}
 });
});
setTimeout(()=>{console.error('QA_TIMEOUT');app.exit(2);},25000).unref();
import(pathToFileURL(path.join(root,'desktop','main.mjs')).href);
