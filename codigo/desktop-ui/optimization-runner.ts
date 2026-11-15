import {optimizeContinuous,type OptimizerInput,type OptimizerResult} from '../src/lib/optimization';

type Handlers={done:(result:OptimizerResult)=>void;error:(message:string)=>void;fallback?:()=>void};
/** A failed worker launch must not make valid saved studies or inputs unusable.
 * Numerical errors and timeouts stay explicit; only launch failures use fallback. */
export function startOptimization(input:OptimizerInput,handlers:Handlers,createWorker:()=>Worker=()=>new Worker(new URL('./optimization.worker.ts',import.meta.url),{type:'module'})){
 let worker:Worker|null=null,timer:ReturnType<typeof setTimeout>|null=null,stopped=false,local=false;
 const clear=()=>{worker?.terminate();worker=null;if(timer)clearTimeout(timer);timer=null;};
 const fail=(message:string)=>{if(stopped)return;stopped=true;clear();handlers.error(message);};
 const finish=(result:OptimizerResult)=>{if(stopped)return;stopped=true;clear();handlers.done(result);};
 const fallback=()=>{if(stopped||local)return;local=true;clear();handlers.fallback?.();timer=setTimeout(()=>{if(stopped)return;try{finish(optimizeContinuous(input));}catch(e){fail(e instanceof Error?e.message:'No se pudo calcular el estudio.');}},30);};
 try{
  worker=createWorker();
  worker.onmessage=e=>{if(e.data?.error)fail(String(e.data.error));else if(e.data?.result)finish(e.data.result);else fail('La respuesta del cálculo está incompleta. Vuelve a calcular.');};
  worker.onerror=e=>{e.preventDefault?.();fallback();};
  worker.onmessageerror=()=>fail('No se pudo leer el resultado. Vuelve a calcular.');
  timer=setTimeout(()=>fail('El cálculo ha superado 20 segundos. Reduce las posiciones o revisa las restricciones antes de reintentarlo.'),20000);
  worker.postMessage(input);
 }catch{fallback();}
 return ()=>{stopped=true;clear();};
}
