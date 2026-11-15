import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import path from 'node:path';
import { normalizeIsin,validateFundProfile } from '../desktop-runtime/fund-lookup.mjs';
import { lookupFtFund } from '../desktop-runtime/market/ft-funds.server.mjs';

/** Only verified public fund metadata. Kept separately from clients and portfolios. */
export class FundDirectory{
 constructor(directory,lookup=lookupFtFund){this.directory=directory;this.lookup=lookup;this.profiles=new Map();this.pending=new Map();this.writes=Promise.resolve();}
 async load(){
  if(!this.loading)this.loading=(async()=>{
   try{const rows=JSON.parse(await readFile(path.join(this.directory,'fund-directory.json'),'utf8'));
    if(Array.isArray(rows))for(const row of rows.slice(-500)){try{const p=validateFundProfile(row);this.profiles.set(p.isin,p);}catch{}}
   }catch{}
  })();
  await this.loading;
 }
 async list(){await this.load();return [...this.profiles.values()].sort((a,b)=>a.name.localeCompare(b.name));}
 async find(input){
  let isin;try{isin=normalizeIsin(input);}catch(e){return {ok:false,error:e.message};}
  await this.load();
  if(this.pending.has(isin))return this.pending.get(isin);
  const cached=this.profiles.get(isin);
  if(cached&&Date.now()-Date.parse(cached.checkedAt)<6*60*60*1000)return {ok:true,profile:cached};
  const task=(async()=>{
   let profile;
   try{profile=validateFundProfile(await this.lookup(isin));if(profile.isin!==isin)throw new Error('La clase recibida no coincide con el ISIN solicitado.');}
   catch(e){return cached?{ok:true,profile:cached,warning:'Ficha guardada sin actualizar. '+e.message}:{ok:false,error:'No se pudo obtener la ficha. '+e.message};}
   this.profiles.delete(isin);this.profiles.set(isin,profile);
   if(this.profiles.size>500)this.profiles.delete(this.profiles.keys().next().value);
   this.writes=this.writes.catch(()=>{}).then(async()=>{
    await mkdir(this.directory,{recursive:true});const filename=path.join(this.directory,'fund-directory.json');
    await writeFile(filename+'.tmp',JSON.stringify([...this.profiles.values()]),'utf8');await rename(filename+'.tmp',filename);
   });
   try{await this.writes;return {ok:true,profile};}catch{return {ok:true,profile,warning:'Ficha encontrada, pero no se pudo guardar para la próxima sesión.'};}
  })();
  this.pending.set(isin,task);try{return await task;}finally{this.pending.delete(isin);}
 }
}
