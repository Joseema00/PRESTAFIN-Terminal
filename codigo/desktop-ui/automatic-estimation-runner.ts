import {estimateAutomaticHistory} from '../src/lib/automatic-optimization';
import type {HistoricalData} from '../src/lib/professional-analysis';
type Result=ReturnType<typeof estimateAutomaticHistory>;
export function startAutomaticEstimation(history:HistoricalData,handlers:{done:(r:Result)=>void;error:(s:string)=>void}){
 let worker:Worker|null=null,timer:ReturnType<typeof setTimeout>|null=null,stopped=false,local=false;
 const clear=()=>{worker?.terminate();worker=null;if(timer)clearTimeout(timer);timer=null;};
 const done=(r:Result)=>{if(stopped)return;stopped=true;clear();handlers.done(r);};
 const fail=(s:string)=>{if(stopped)return;stopped=true;clear();handlers.error(s);};
 const fallback=()=>{if(stopped||local)return;local=true;clear();timer=setTimeout(()=>{if(stopped)return;try{done(estimateAutomaticHistory(history));}catch(e){fail(e instanceof Error?e.message:'Estimación no disponible.');}},30);};
 try{worker=new Worker(new URL('./automatic-estimation.worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>e.data?.error?fail(String(e.data.error)):e.data?.result?done(e.data.result):fail('Respuesta de estimación incompleta.');worker.onerror=e=>{e.preventDefault?.();fallback();};timer=setTimeout(()=>fail('La estimación ha superado el tiempo disponible.'),20000);worker.postMessage(history);}catch{fallback();}
 return ()=>{stopped=true;clear();};
}
