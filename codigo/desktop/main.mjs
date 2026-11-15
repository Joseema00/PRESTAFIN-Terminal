import { app, BrowserWindow, protocol, net, ipcMain, dialog, Menu, session, shell, safeStorage } from 'electron';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { APP_ORIGIN, isAppUrl, resolveAsset, validateMarketRequest } from './security.mjs';
import { WorkspaceStore, validateWorkspace, MAX_WORKSPACE_BYTES } from './workspace.mjs';
import { configureMarketCache,getSeries } from './market-store.mjs';
import { BillingClient } from './billing.mjs';
import { AccountWorkspaces } from './account-workspaces.mjs';
import {CloudWorkspaces} from './cloud-workspaces.mjs';
import { FundDirectory } from './fund-directory.mjs';
import { normalizeIsin } from '../desktop-runtime/fund-lookup.mjs';
import { FUND_PRODUCTS } from '../desktop-runtime/fund-catalog.mjs';
import { buildBundle } from '../desktop-runtime/market/bundle.server.mjs';
import { searchChain } from '../desktop-runtime/market/providers.server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
app.setName('Prestafin Terminal');
protocol.registerSchemesAsPrivileged([{scheme:'prestafin',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
let window, store, accountSpaces, billing, closing = false, saveFailed = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',() => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(start).catch(error => { dialog.showErrorBox('Prestafin no pudo abrirse',error.message); app.quit(); });
}

function trusted(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !isAppUrl(event.senderFrame.url)) throw new Error('Solicitud no autorizada');
}
function handle(name,fn) { ipcMain.handle(name,async(event,...args) => { trusted(event); return fn(...args); }); }
async function start() {
  store = new WorkspaceStore(app.getPath('userData'));
  billing=new BillingClient({config:JSON.parse(await readFile(path.join(root,'desktop','billing-config.json'),'utf8')),folder:app.getPath('userData'),crypto:safeStorage,open:url=>shell.openExternal(url)});
  const localSpaces=new AccountWorkspaces(app.getPath('userData'),{enabled:()=>!!billing.config,userId:()=>billing.session?.user?.id??null});
  accountSpaces=billing.config?.cloudEnabled?new CloudWorkspaces({billing,local:localSpaces}):localSpaces;
  configureMarketCache(path.join(app.getPath('userData'),'market-cache'));
  const fundDirectory=new FundDirectory(path.join(app.getPath('userData'),'market-cache'));
  const dist = path.join(root,'dist-desktop');
  await stat(path.join(dist,'index.html'));
  protocol.handle('prestafin',async request => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido',{status:405});
    try {
      let filename = resolveAsset(dist,request.url);
      if (new URL(request.url).pathname === '/') filename = path.join(dist,'index.html');
      try { if (!(await stat(filename)).isFile()) throw new Error('not-file'); }
      catch { return new Response('Archivo no encontrado',{status:404}); }
      return net.fetch(pathToFileURL(filename).toString(),{method:request.method});
    } catch { return new Response('Ruta no permitida',{status:403}); }
  });

  handle('workspace:identity',()=>billing.identity());
  handle('workspace:load',owner => accountSpaces.get(owner).load());
  handle('workspace:save',async(value,owner) => {
    try { const result = await accountSpaces.get(owner).save(value); saveFailed = false; return result; }
    catch(error) { saveFailed = true; throw error; }
  });
  handle('workspace:export',async() => {
    const store=accountSpaces.get(billing.session?.user?.id);
    await store.flush();
    const value = await (store.exportValue?store.exportValue():store.load());
    if (!value) throw new Error('No hay datos guardados');
    const choice = await dialog.showSaveDialog(window,{title:'Exportar copia de seguridad',defaultPath:'Prestafin-copia-' + new Date().toISOString().slice(0,10) + '.json',filters:[{name:'Copia de Prestafin',extensions:['json']}]});
    if (choice.canceled || !choice.filePath) return false;
    await writeFile(choice.filePath,JSON.stringify(value,null,2),'utf8');
    return true;
  });
  handle('workspace:import',async owner => {
    const store=accountSpaces.get(owner);
    const selected = await dialog.showOpenDialog(window,{title:'Restaurar copia de Prestafin',properties:['openFile'],filters:[{name:'Copia de Prestafin',extensions:['json']}]});
    if (selected.canceled || !selected.filePaths[0]) return null;
    const filename = selected.filePaths[0];
    if ((await stat(filename)).size > MAX_WORKSPACE_BYTES) throw new Error('La copia supera 5 MB');
    const value = validateWorkspace(JSON.parse(await readFile(filename,'utf8')));
    const confirm = await dialog.showMessageBox(window,{type:'question',buttons:['Cancelar','Restaurar'],defaultId:0,cancelId:0,message:'¿Sustituir los datos de tu cuenta por esta copia?',detail:'Se conservará la versión anterior del espacio de trabajo.'});
    if (confirm.response !== 1) return null;
    accountSpaces.get(owner);
    await store.save(value);
    saveFailed = false;
    return value;
  });
  handle('market:bundle',input => { const {symbols,...opts} = validateMarketRequest(input); return buildBundle(symbols,opts); });
  handle('market:fundLookup',input=>fundDirectory.find(input));
  handle('market:fundList',()=>fundDirectory.list());
  handle('market:fundHistory',input=>{
    const p=FUND_PRODUCTS.find(p=>p.id===input?.id);
    const isin=p?.isin??normalizeIsin(input?.id);
    return getSeries(isin,'daily',{force:input?.force===true});
  });
  handle('market:search',async query => {
    if (typeof query !== 'string' || query.length > 64 || query.trim().length < 2) return {results:[],error:null};
    const results = await searchChain(query.trim(),12);
    return {results,error:results.length ? null : 'Sin coincidencias o proveedor no disponible'};
  });
  handle('workspace:recoverLegacy',async owner=>{
    const target=accountSpaces.get(owner);await accountSpaces.flush();
    const current=await target.load();
    if(current?.people?.length||current?.modelPortfolios?.length)throw new Error('Esta cuenta ya contiene fichas o modelos. Exporta e importa una copia para elegir cómo restaurarlos.');
    const previous=await store.load();if(!previous)throw new Error('No hay datos anteriores en este PC.');
    const choice=await dialog.showMessageBox(window,{type:'question',buttons:['Cancelar','Copiar a mi cuenta'],defaultId:0,cancelId:0,message:'¿Copiar las fichas anteriores de este PC a '+billing.session.user.email+'?',detail:'Hazlo solo si esos datos te pertenecen. Se conservarán el archivo original y la versión anterior del espacio de tu cuenta.'});
    if(choice.response!==1)return false;accountSpaces.get(owner);await target.save(previous);return true;
  });
  handle('billing:status',()=>billing.status());
  handle('billing:redeemCode',code=>billing.redeemCode(code));
  handle('auth:signIn',(email,password)=>billing.signIn(email,password));
  handle('auth:signUp',(email,password)=>billing.signUp(email,password));
  handle('auth:confirmEmail',(email,proof)=>billing.confirmEmail(email,proof));
  handle('auth:resendConfirmation',email=>billing.resendConfirmation(email));
  handle('auth:requestPasswordReset',email=>billing.requestPasswordReset(email));
  handle('auth:resetPassword',(email,proof,password)=>billing.resetPassword(email,proof,password));
  handle('billing:checkout',plan=>billing.checkout(plan));
  handle('billing:portal',()=>billing.portal());
  handle('billing:logout',async()=>{await accountSpaces.flush();const result=await billing.logout();accountSpaces.stores?.clear();return result;});
  handle('workspace:confirmReload',async()=>{const choice=await dialog.showMessageBox(window,{type:'question',buttons:['Cancelar','Recargar desde mi cuenta'],defaultId:0,cancelId:0,message:'¿Volver a cargar los datos guardados en tu cuenta?',detail:'Los cambios de esta ventana que no se hayan guardado se descartarán. Puedes exportarlos antes de recargar.'});return choice.response===1;});
  handle('app:info',() => ({version:app.getVersion(),dataPath:app.getPath('userData'),mode:billing.config?.cloudEnabled?'cloud':'local'}));
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  // The renderer only talks to packaged resources. Provider requests run through narrow IPC methods.
  session.defaultSession.webRequest.onBeforeRequest((details,callback) => {
    const scheme = new URL(details.url).protocol;
    callback({cancel: !['prestafin:','file:','data:','blob:','devtools:'].includes(scheme)});
  });
  session.defaultSession.on('will-download',(_event,item) => {
    item.setSaveDialogOptions({title:'Guardar archivo de Prestafin',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
  });
  createWindow();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Archivo',submenu:[{label:'Inicio',accelerator:'Ctrl+1',click:() => window?.loadURL(APP_ORIGIN + '/#/')},{type:'separator'},{role:'quit',label:'Salir'}]},
    {label:'Edición',submenu:[{role:'undo',label:'Deshacer'},{role:'redo',label:'Rehacer'},{type:'separator'},{role:'cut',label:'Cortar'},{role:'copy',label:'Copiar'},{role:'paste',label:'Pegar'},{role:'selectAll',label:'Seleccionar todo'}]},
    {label:'Vista',submenu:[{role:'resetZoom',label:'Tamaño original'},{role:'zoomIn',label:'Ampliar'},{role:'zoomOut',label:'Reducir'},{role:'togglefullscreen',label:'Pantalla completa'}]},
  ]));
}
function createWindow() {
  window = new BrowserWindow({width:1480,height:960,minWidth:1024,minHeight:700,show:false,title:'Prestafin Terminal',backgroundColor:'#10181d',icon:path.join(root,'desktop/icon.ico'),
    webPreferences:{preload:path.join(root,'desktop/preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}});
  window.webContents.on('will-navigate',(event,url) => { if (!isAppUrl(url)) event.preventDefault(); });
  window.webContents.setWindowOpenHandler(({url}) => {
    if (url.startsWith('https://')) {
      const host = new URL(url).hostname;
      if (!/(^|\.)lovable\.(dev|app)$/.test(host)) void shell.openExternal(url);
    }
    return {action:'deny'};
  });
  window.once('ready-to-show',() => window.show());
  window.on('close',async event => {
    if (closing) return;
    event.preventDefault();
    try { await accountSpaces.flush(); if (saveFailed) throw new Error('Último guardado fallido'); }
    catch {
      const choice = await dialog.showMessageBox(window,{type:'warning',buttons:['Volver a la aplicación','Salir sin guardar'],defaultId:0,cancelId:0,message:'No se han podido guardar todos los cambios.'});
      if (choice.response !== 1) return;
    }
    closing = true; window.close();
  });
  window.on('closed',() => { window = null; });
  void window.loadURL(APP_ORIGIN + '/#/');
}
app.on('window-all-closed',() => app.quit());
