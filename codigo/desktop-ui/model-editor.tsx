import {useState} from 'react';
import {useModelLibrary} from './use-portfolios';
import {modelStats,type FundModel} from '../src/lib/fund-models';
import {validateAccountModels,type AccountModel} from '../src/lib/account-models';
import {FUND_PRODUCTS} from '../src/lib/fund-catalog';
import './model-editor.css';
export function ModelEditor({model,onClose}:{model?:FundModel|undefined;onClose:()=>void}){
 const library=useModelLibrary(),[name,setName]=useState(()=>model?(model.name+(library.ownModels.find(m=>m.id===model.id)?.source?' · ajuste':'')).slice(0,120):''),[description,setDescription]=useState(model?.description??''),[years,setYears]=useState(model?.minYears??0),[allocation,setAllocation]=useState(()=>structuredClone(model?.allocation??[{assetId:'fund-amundi-money',pct:100}])),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [modelId]=useState(()=>model&&library.ownModels.some(m=>m.id===model.id&&!m.source)?model.id:'user-model-'+crypto.randomUUID());
 const existing=library.ownModels.find(m=>m.id===modelId),total=allocation.reduce((n,x)=>n+(Number.isFinite(x.pct)?x.pct:0),0);
 async function save(){setBusy(true);setError('');try{
  const now=Date.now();const input:AccountModel={id:modelId,name,description,minYears:years,allocation,revision:1,createdAt:now,updatedAt:now};
  validateAccountModels([input]);library.save(input);const result=await library.saveNow();if(!result.ok)throw new Error(result.error);onClose();
 }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el modelo.');}finally{setBusy(false);}}
 return <section className="terminal-panel model-editor" aria-label="Editor de modelo"><h3>{existing?'Editar mi modelo':'Añadir modelo a mi cuenta'}</h3><p>Esta composición pertenece a tu biblioteca. Los cambios se guardan en tu cuenta y no modifican las carteras ya asignadas a clientes.</p>{model&&library.ownModels.find(m=>m.id===model.id)?.source&&<p>Este ajuste se guarda como copia manual; el modelo generado y sus respuestas de origen se conservan.</p>}<form onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy||!library.writable}>
  <div className="model-editor-fields"><label>Nombre del modelo<input aria-label="Nombre del modelo" value={name} required maxLength={120} onChange={e=>setName(e.target.value)}/></label><label>Plazo mínimo de estudio (años)<input aria-label="Plazo mínimo del modelo" type="number" min={0} max={100} step={.25} value={years} required onChange={e=>setYears(e.target.valueAsNumber)}/></label></div>
  <label>Descripción<textarea aria-label="Descripción del modelo" maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <div className="model-editor-positions">{allocation.map((row,i)=><div key={i}><label>Fondo {i+1}<select aria-label={'Fondo del modelo '+(i+1)} value={row.assetId} onChange={e=>setAllocation(allocation.map((x,j)=>j===i?{...x,assetId:e.target.value}:x))}>{FUND_PRODUCTS.map(p=><option key={p.id} value={p.id}>{p.name} · {p.isin}</option>)}</select></label><label>Peso (%)<input aria-label={'Peso del modelo '+(i+1)} required type="number" min={.01} max={100} step={.01} value={Number.isFinite(row.pct)?row.pct:''} onChange={e=>setAllocation(allocation.map((x,j)=>j===i?{...x,pct:e.target.valueAsNumber}:x))}/></label><button type="button" className="terminal-button secondary" disabled={allocation.length===1} onClick={()=>setAllocation(allocation.filter((_,j)=>j!==i))}>Quitar fondo {i+1}</button></div>)}</div>
  <p><strong>Total: {total.toLocaleString('es-ES',{maximumFractionDigits:2})} %</strong> · Debe sumar 100 %.</p><button className="terminal-button secondary" type="button" disabled={allocation.length>=FUND_PRODUCTS.length} onClick={()=>{const next=FUND_PRODUCTS.find(p=>!allocation.some(x=>x.assetId===p.id));if(next)setAllocation([...allocation,{assetId:next.id,pct:0}]);}}>Añadir fondo</button>
  <p>Los fondos disponibles son clases documentadas. El plazo que definas no elimina los riesgos del fondo ni las limitaciones de cada cliente.</p>
  {error&&<p className="terminal-warning" role="alert">{error}</p>}<div className="model-editor-actions"><button className="terminal-button primary" type="submit">{busy?'Guardando…':'Guardar modelo en mi cuenta'}</button><button className="terminal-button secondary" type="button" onClick={onClose}>Cancelar edición</button></div>
 </fieldset></form></section>;
}
