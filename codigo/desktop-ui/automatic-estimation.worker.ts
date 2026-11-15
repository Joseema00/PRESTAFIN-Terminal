import {estimateAutomaticHistory} from '../src/lib/automatic-optimization';
import type {HistoricalData} from '../src/lib/professional-analysis';
self.onmessage=(event:MessageEvent<HistoricalData>)=>{try{self.postMessage({result:estimateAutomaticHistory(event.data)});}catch(e){self.postMessage({error:e instanceof Error?e.message:'No se pudo estimar el histórico.'});}};
