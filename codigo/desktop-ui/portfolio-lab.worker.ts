import {simulateScenarios,type SimulationInput} from '../src/lib/portfolio-lab';
self.onmessage=(event:MessageEvent<{id:number;input:SimulationInput}>)=>{try{self.postMessage({id:event.data.id,result:simulateScenarios(event.data.input)});}catch(e){self.postMessage({id:event.data.id,error:e instanceof Error?e.message:'No se pudo completar la simulación.'});}};
