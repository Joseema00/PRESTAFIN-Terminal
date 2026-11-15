import {Link,useRouterState} from '@tanstack/react-router';
import {usePeople,usePortfolios,useInterviews} from './use-portfolios';
import {assessInterview} from '../src/lib/risk-profile';
import './client-journey.css';
export function ClientJourney(){
 const people=usePeople(),store=usePortfolios(),interviews=useInterviews(),path=useRouterState({select:s=>s.location.pathname}),panel=useRouterState({select:s=>(s.location.search as {panel?:string}).panel});
 if(!people.active)return null;
 const interview=interviews.active,assessment=interview?assessInterview(interview.answers):null,hasPortfolio=!!store.active?.holdings.some(h=>h.amount>0),hasStudy=!!store.active?.optimizationStudy;
 const current=path==='/mi-patrimonio'||path==='/persona'?0:path==='/entrevista'?1:path==='/informes'?4:path==='/portfolio-lab'&&['optimizacion','riesgo','estres','montecarlo','benchmark','proyeccion','rebalanceo'].includes(panel??'')?3:path==='/portfolio-lab'?2:-1;
 const steps=[{title:'Datos y patrimonio',to:'/mi-patrimonio',note:'Patrimonio y aportaciones'},{title:'Cuestionario',to:'/entrevista',note:assessment?.ready?'Respuestas completas':assessment?.complete?'Revisar condiciones':'Responder o continuar'},{title:'Cartera',to:'/portfolio-lab',note:hasPortfolio?store.active!.name:'Crear desde respuestas o manualmente'},{title:'Análisis',to:'/portfolio-lab',note:hasStudy?'Estudio guardado':'Optimización automática'},{title:'Informe',to:'/informes',note:'Revisar y exportar PDF'}] as const;
 return <nav className="client-journey" aria-label="Recorrido del cliente"><div className="journey-context"><strong>{people.active.name} <small>{store.portfolios.length} carteras</small></strong><div><Link to="/persona">Resumen de la ficha ↗</Link><Link to="/">Cambiar persona</Link></div></div><ol>{steps.map((step,i)=><li key={i}><Link to={step.to} search={i===3?{panel:'optimizacion'}:i===2?{panel:hasPortfolio?'composicion':'automatica'}:{}} aria-current={i===current?'step':undefined}><span>{i+1}</span><div><strong>{step.title}</strong><small>{step.note}</small></div></Link></li>)}</ol></nav>;
}
