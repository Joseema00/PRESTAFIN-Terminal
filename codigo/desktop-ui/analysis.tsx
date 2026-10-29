import { usePortfolios } from './use-portfolios';
import { RiskPanels } from './risk-panels';
import { holdingName } from './use-integrated-risk';
import './professional.css';
export const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
export const pct=(n:number)=>new Intl.NumberFormat('es-ES',{style:'percent',maximumFractionDigits:2}).format(n);
export const labelFor=(h:{assetId:string;meta?:{name:string}})=>holdingName({assetId:h.assetId,amount:0,...(h.meta?{meta:{...h.meta,symbol:'',kind:'',currency:'EUR'}}:{})});
export function AnalysisPage(){const store=usePortfolios(),c=store.active;if(!c)return null;return <div className="professional-page"><div className="terminal-page-title"><span>RIESGO DE LA PERSONA Y SU CARTERA</span><h1>Análisis de riesgo</h1><p>Escenarios, concentración, correlaciones y medidas históricas calculadas dentro de la terminal.</p></div><label className="pro-selector">Cartera analizada<select value={c.id} onChange={e=>store.setActiveId(e.target.value)}>{store.portfolios.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><RiskPanels key={c.id} portfolio={c}/></div>;}
