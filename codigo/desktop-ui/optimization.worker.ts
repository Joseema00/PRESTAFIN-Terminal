import {optimizeContinuous,type OptimizerInput} from '../src/lib/optimization';
self.onmessage=(event:MessageEvent<OptimizerInput>)=>{
 try{self.postMessage({result:optimizeContinuous(event.data)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:'No se pudo resolver el estudio.'});}
};
