import {useEffect,useState} from 'react';
import {Trash2} from 'lucide-react';
import {toast} from 'sonner';
import type {Portfolio} from '../src/lib/portfolio';
import type {usePortfolios} from './use-portfolios';
import './delete-portfolio.css';
export function DeletePortfolio({portfolio,store}:{portfolio:Portfolio;store:ReturnType<typeof usePortfolios>}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
  async function remove(){
    store.remove(portfolio.id);setOpen(false);
    const saved=await store.saveNow();if(saved.ok)toast.success('Cartera eliminada de esta persona.');else toast.error(saved.error??'No se pudo guardar la eliminación. Reintenta el guardado.');
  }
  return <><button className="terminal-button secondary portfolio-delete-button" disabled={store.saving||!store.userId} onClick={()=>setOpen(true)}><Trash2 size={15}/>Eliminar cartera</button>
    {open&&<div className="portfolio-delete-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section className="terminal-panel portfolio-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-portfolio-title" aria-describedby="delete-portfolio-description"><h2 id="delete-portfolio-title">¿Eliminar esta cartera?</h2><p id="delete-portfolio-description">Se eliminará <strong>{portfolio.name}</strong> de esta persona, junto con su composición, seguimiento e históricos asociados. Las otras carteras, los datos manuales de Patrimonio y las respuestas del cuestionario se conservan.</p>{portfolio.tracking&&<p>Eliminar el registro local no vende inversiones ni devuelve dinero a la liquidez. Si representa una cuenta real, exporta sus datos y concilia el patrimonio antes de eliminarla.</p>}{store.portfolios.length===1&&<p>Al ser la última, se abrirá una cartera vacía para continuar trabajando.</p>}<div className="billing-actions"><button autoFocus className="terminal-button secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="terminal-button portfolio-delete-confirm" disabled={store.saving} onClick={()=>void remove()}>Sí, eliminar cartera</button></div></section></div>}
  </>;
}
