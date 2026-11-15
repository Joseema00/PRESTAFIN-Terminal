import { normalizeIsin,fundSource,validateFundProfile } from '../fund-lookup';
import type { FundProfile } from '../fund-lookup';
import { cleanFundPoints } from '../fund-performance';
import type { ProviderSeries } from './providers.server';

const profiles=new Map<string,FundProfile>(),pending=new Map<string,Promise<FundProfile>>();
const TTL=6*60*60*1000;
function decode(value:string):string{
 return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,entity:string)=>{
  const known:Record<string,string>={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
  if(entity[0]!=='#')return known[entity.toLowerCase()]??'';
  const n=entity[1]?.toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
  return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
 });
}
const plain=(s:string)=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const unavailable='No hay una ficha de fondo verificable para este ISIN en la fuente disponible. Puede ser otro tipo de instrumento o una clase sin cobertura.';
export function parseFtProfile(html:string,input:string):FundProfile{
 const isin=normalizeIsin(input),fields=new Map<string,string>();
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const pair=/<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(row[1]!);
  if(pair)fields.set(plain(pair[1]!),plain(pair[2]!));
 }
 if(fields.get('ISIN')!==isin)throw new Error(unavailable);
 let config:{xid:string;symbol:string;currency:string}|undefined;
 for(const match of html.matchAll(/data-mod-config="([^"]*)"/g)){
  try{
   const c=JSON.parse(decode(match[1]!));
   if(c.assetClass==='Fund'&&c.symbol===isin+':'+c.currency&&/^[A-Z]{3}$/.test(c.currency)&&/^\d{1,16}$/.test(String(c.xid)))config={xid:String(c.xid),symbol:c.symbol,currency:c.currency};
  }catch{/* Unrelated page widget. */}
 }
 const heading=/<h1\b[^>]*class="[^"]*mod-tearsheet-overview__header__name[^"\s]*(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
 if(!config||!heading)throw new Error(unavailable);
 const field=(key:string)=>{const s=fields.get(key);return s&&s!=='--'&&s!=='-'?s:null;};
 const charge=field('Ongoing charge'),income=field('Income treatment');
 return validateFundProfile({isin,name:plain(heading[1]!),currency:config.currency,providerId:config.xid,
  source:fundSource(isin,config.currency),checkedAt:new Date().toISOString(),
  income:income==='Accumulation'?'Acumulación':income==='Income'||income==='Distribution'?'Distribución':'No confirmado',
  category:field('Morningstar category'),domicile:field('Domicile'),launchDate:field('Launch date'),
  ongoingCharge:charge&&/^\d+(?:\.\d+)?%$/.test(charge)?Number(charge.slice(0,-1)):null});
}
async function getPublicText(url:string):Promise<string>{
 const response=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept':'text/html, application/json'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(response.status===404?unavailable:`No se pudo consultar Financial Times (HTTP ${response.status}). Inténtalo más tarde.`);
 const text=await response.text();
 if(text.length>20_000_000)throw new Error('La respuesta del proveedor supera el tamaño permitido.');
 return text;
}
export async function lookupFtFund(input:string):Promise<FundProfile>{
 const isin=normalizeIsin(input),cached=profiles.get(isin);
 if(cached&&Date.now()-Date.parse(cached.checkedAt)<TTL)return cached;
 const active=pending.get(isin);if(active)return active;
 const task=(async()=>{const profile=parseFtProfile(await getPublicText(fundSource(isin)),isin);profiles.set(isin,profile);if(profiles.size>500)profiles.delete(profiles.keys().next().value!);return profile;})();
 pending.set(isin,task);
 try{return await task;}finally{pending.delete(isin);}
}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function parseFtHistory(raw:unknown,profile:FundProfile):ProviderSeries{
 const p=validateFundProfile(profile),html=(raw as {html?:unknown})?.html;
 if(typeof html!=='string'||!html.trim())throw new Error('La ficha existe, pero el proveedor no ofrece histórico para esta clase.');
 const points=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1]!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]!);
  if(cells.length!==6)throw new Error('El proveedor ha cambiado el formato del histórico.');
  const date=/\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\b/.exec(plain(cells[0]!));
  const close=plain(cells[4]!);
  if(close==='--'||close==='-')continue; // No price on this date; never interpolate.
  if(!date||!/^\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^\d+(?:\.\d+)?$/.test(close))throw new Error('Fecha o valor liquidativo no reconocido.');
  const d=`${date[3]}-${String(months.indexOf(date[1]!)+1).padStart(2,'0')}-${date[2]!.padStart(2,'0')}`,c=Number(close.replace(/,/g,''));
  points.push({d,c,a:c});
 }
 const clean=cleanFundPoints(points);
 if(clean.length<2)throw new Error('Histórico insuficiente para calcular rentabilidades de esta clase.');
 return {instrument:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:p.currency,provider:'ft-funds',providerId:p.providerId},
  points:clean,dividends:[],splits:[],frequency:'daily',currency:p.currency,adjusted:p.income==='Acumulación'};
}
export async function fetchFtHistory(isin:string):Promise<ProviderSeries>{
 const profile=await lookupFtFund(isin);
 // Large date ranges can produce a provider HTTP-500 page with HTTP status 200.
 // Request bounded intervals, with no extrapolation between returned prices.
 const today=new Date().toISOString().slice(0,10),launch=/^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(profile.launchDate??'');
 const month=launch?months.findIndex(m=>m.startsWith(launch[2]!)):-1;
 const inception=launch&&month>=0?`${launch[3]}-${String(month+1).padStart(2,'0')}-${launch[1]}`:null;
 const fallback=`${Number(today.slice(0,4))-10}${today.slice(4)}`;
 let start=inception&&inception>='1900-01-01'&&inception<=today&&new Date(inception).toISOString().slice(0,10)===inception?inception:fallback;
 const parts:string[]=[];
 while(start<=today){
  const next=`${Number(start.slice(0,4))+10}-01-01`,end=next>today?today:new Date(Date.parse(next)-86400000).toISOString().slice(0,10);
  const params=new URLSearchParams({symbol:profile.providerId,startDate:start.replace(/-/g,'/'),endDate:end.replace(/-/g,'/')});
  const text=await getPublicText('https://markets.ft.com/data/equities/ajax/get-historical-prices?'+params);
  let raw:{html?:unknown};
  try{raw=JSON.parse(text);}catch{throw new Error('La ficha está disponible, pero el proveedor no pudo entregar su histórico. Vuelve a actualizarlo más tarde.');}
  if(typeof raw?.html!=='string')throw new Error('El proveedor no devolvió un histórico reconocible.');
  parts.push(raw.html);
  if(end===today)break;
  start=next;
 }
 return parseFtHistory({html:parts.join('')},profile);
}
