import {useEffect,useRef,useState} from 'react';
import {Link,Outlet,useNavigate,useRouterState} from '@tanstack/react-router';
import {LayoutDashboard,ChartNoAxesCombined,FlaskConical,FileText,Search,ArrowUpRight,ChevronRight,CircleHelp,Moon,Sun,Users,CreditCard,Menu,X,Check,CloudUpload} from 'lucide-react';
import {ClientJourney} from './client-journey';
import {BillingGate} from './billing';
import {usePortfolios,usePeople,exportWorkspace,reloadAccountWorkspace} from './use-portfolios';
import {NAV,PERSON_ROUTES,PORTFOLIO_TOOLS,normalized} from './navigation';
import {PanelBoundary} from './panel-boundary';
import isotipo from '../src/assets/isotipo.png';

const icons={people:Users,overview:LayoutDashboard,chart:ChartNoAxesCombined,simulation:FlaskConical,report:FileText,billing:CreditCard};
export function Shell(){
 const pathname=useRouterState({select:s=>s.location.pathname}),store=usePortfolios(),people=usePeople(),navigate=useNavigate();
 const current=NAV.find(n=>n.to===pathname)??NAV[2];
 const [command,setCommand]=useState(false),[search,setSearch]=useState(''),[activeResult,setActiveResult]=useState(0),[menu,setMenu]=useState(false),[guide,setGuide]=useState(false),[actionError,setActionError]=useState('');
 const [dark,setDark]=useState(()=>{try{return localStorage.getItem('prestafin.theme')==='dark';}catch{return false;}});
 const dialog=useRef<HTMLDivElement>(null),searchButton=useRef<HTMLButtonElement>(null),wasCommandOpen=useRef(false);
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);try{localStorage.setItem('prestafin.theme',dark?'dark':'light');}catch{/* Theme does not block account use. */}},[dark]);
 useEffect(()=>{setMenu(false);setCommand(false);setActionError('');},[pathname,people.active?.id]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommand(v=>!v);}if(e.key==='Escape'){setCommand(false);setMenu(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{if(command){wasCommandOpen.current=true;setSearch('');setActiveResult(0);dialog.current?.querySelector('input')?.focus();}else if(wasCommandOpen.current){wasCommandOpen.current=false;searchButton.current?.focus();}},[command]);
 const closeCommand=()=>setCommand(false);
 const entries=[...NAV.filter(n=>!PERSON_ROUTES.has(n.to)||people.active).map(n=>({id:n.to,label:n.label,hint:n.hint,open:()=>void navigate({to:n.to})})),...(people.active?PORTFOLIO_TOOLS.filter(t=>t.id!=='criterios'||store.active?.proposal).map(t=>({id:'tool-'+t.id,label:t.label,hint:'Carteras · '+t.hint,open:()=>void navigate({to:'/portfolio-lab',search:{panel:t.id}})})):[]),...(people.active?[{id:'questionnaire',label:'Responder cuestionario',hint:'Respuestas y PDF de la persona',open:()=>void navigate({to:'/entrevista'})}]:[])];
 const results=entries.filter(e=>normalized(e.label+' '+e.hint).includes(normalized(search)));
 useEffect(()=>{dialog.current?.querySelector('.command-result.selected')?.scrollIntoView?.({block:'nearest'});},[activeResult]);
 const run=(fn:()=>void)=>{closeCommand();fn();};
 const saveLabel=store.saveError?'Guardado pendiente':store.saving?'Guardando cambios…':store.dirty?'Cambios pendientes':store.savedAt?(store.storage==='cloud'?'Guardado en mi cuenta':'Guardado local'):'Espacio preparado';
 async function save(){const r=await store.saveNow();if(!r.ok)setActionError(r.error??'No se pudo guardar.');else setActionError('');}
 return <div className={'terminal-shell'+(menu?' sidebar-open':'')}>
  <a className="skip-content" href="#main-content">Ir al contenido</a>
  {menu&&<button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={()=>setMenu(false)}/>}
  <aside className="terminal-sidebar" aria-label="Menú de Prestafin" inert={command}>
   <Link to="/" className="terminal-brand" aria-label="Prestafin, inicio"><img src={isotipo} alt=""/><span><strong>PRESTAFIN</strong><small>TERMINAL</small></span></Link>
   <div className="sidebar-person"><label htmlFor="selected-person">Ficha de trabajo</label><select id="selected-person" value={people.active?.id??''} disabled={!people.writable||!people.people.some(p=>!p.archived)} onChange={e=>{people.select(e.target.value);void navigate({to:'/persona'});}}><option value="" disabled>Selecciona una persona</option>{people.people.filter(p=>!p.archived).map(p=><option key={p.id} value={p.id}>{p.name} · {p.reference||p.id.slice(-6)}</option>)}</select></div>
   <nav aria-label="Navegación principal">{['Espacio de trabajo','Ficha seleccionada','Mi espacio'].map(group=><div className="navigation-group" key={group}><div className="sidebar-label">{group}</div>{NAV.filter(n=>n.group===group).map(n=>{const Icon=icons[n.icon];return PERSON_ROUTES.has(n.to)&&!people.active?<span key={n.to} className="terminal-nav disabled" aria-disabled="true" title="Selecciona una persona en el directorio"><Icon size={18}/><span>{n.label}</span></span>:<Link key={n.to} to={n.to} activeOptions={{exact:true}} className="terminal-nav" activeProps={{className:'terminal-nav active','aria-current':'page'}}><Icon size={18}/><span>{n.label}</span><ChevronRight size={13}/></Link>;})}</div>)}</nav>
   <button className="sidebar-help" onClick={()=>{setGuide(v=>!v);setMenu(false);}} aria-expanded={guide}><CircleHelp size={18}/><span>Cómo empezar<small>Guía rápida de la terminal</small></span></button>
   <div className="sidebar-bottom"><span>Prestafin Terminal</span><small>Versión 0.26.0</small></div>
  </aside>
  <section className="terminal-workspace" inert={command}>
   <header className="terminal-toolbar"><div><button className="icon-button menu-toggle" aria-label="Abrir menú" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><Menu size={21}/></button><span className="toolbar-prefix">{PERSON_ROUTES.has(pathname)?'Ficha de trabajo':'Mi espacio'}</span><ChevronRight size={14}/><strong>{pathname==='/entrevista'?'Cuestionario':current?.label}</strong></div><div><button ref={searchButton} className="command-button" onClick={()=>setCommand(true)}><Search size={17}/><span>Buscar herramienta</span><kbd>Ctrl K</kbd></button><button className="icon-button" aria-label={dark?'Cambiar a tema claro':'Cambiar a tema oscuro'} title={dark?'Tema claro':'Tema oscuro'} onClick={()=>setDark(!dark)}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></div></header>
   <main className="terminal-main" id="main-content" tabIndex={-1}>
    {(store.saveError||actionError)&&<div className="terminal-warning" role="alert"><strong>Hay cambios pendientes de guardar</strong><p>{actionError||store.saveError}</p><div className="portfolio-actions"><button className="terminal-button" onClick={()=>void save()}>Reintentar guardado</button>{store.storage==='cloud'&&<><button className="terminal-button secondary" onClick={()=>void exportWorkspace().catch(e=>setActionError(e.message))}>Exportar cambios pendientes</button><button className="terminal-button secondary" onClick={()=>void reloadAccountWorkspace().catch(e=>setActionError(e.message))}>Recargar desde mi cuenta</button></>}</div></div>}
    {guide&&<section className="terminal-panel workspace-guide"><div><h2>De la ficha al informe</h2><button className="icon-button" aria-label="Cerrar guía" onClick={()=>setGuide(false)}><X size={18}/></button></div><ol>{[{to:'/',title:'Elige una persona',text:'Crea o abre su ficha. Sus datos y carteras permanecen juntos.'},{to:'/entrevista',title:'Completa el cuestionario',text:'Registra las respuestas y prepara su PDF.'},{to:'/portfolio-lab',title:'Trabaja la cartera',text:'Construye, compara y revisa los riesgos y resultados.'},{to:'/informes',title:'Prepara el informe',text:'Elige contenido y gráficos; revisa y exporta a PDF.'}].map((step,i)=><li key={step.to}><span>{i+1}</span><div>{(i===0||people.active)?<Link to={step.to}>{step.title}</Link>:<strong>{step.title}</strong>}<p>{step.text}</p></div></li>)}</ol></section>}
    {store.hydrated?PERSON_ROUTES.has(pathname)&&!people.active?<section className="terminal-panel people-empty"><Users size={32}/><h2>Elige una persona para continuar</h2><p>Encontrarás todas sus herramientas dentro de su ficha.</p><Link to="/" className="terminal-button">Ir al menú de personas</Link></section>:<div key={(people.active?.id??'directory')+':'+people.epoch}>{PERSON_ROUTES.has(pathname)&&people.active&&<ClientJourney/>}<PanelBoundary key={pathname}>{(pathname==='/suscripcion'||pathname==='/cuenta')?<Outlet/>:<BillingGate><Outlet/></BillingGate>}</PanelBoundary></div>:<div className="loading-workspace" role="status"><span className="loading-dot"/><h2>Abriendo tu espacio de trabajo</h2><p>Cargando las fichas y los datos guardados de tu cuenta.</p></div>}
   </main>
   <footer className="terminal-status" aria-live="polite"><span className={store.saveError?'save-pending':''}>{store.saving||store.dirty||store.saveError?<CloudUpload size={14}/>:<Check size={14}/>} {saveLabel}</span><span>{store.savedAt?'Último guardado '+new Date(store.savedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'Datos de mercado bajo demanda'}<b>·</b>EUR</span></footer>
  </section>
  {command&&<div className="command-backdrop" onClick={closeCommand}><div ref={dialog} className="command-dialog" role="dialog" aria-modal="true" aria-label="Buscar herramienta" onClick={e=>e.stopPropagation()} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();closeCommand();}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActiveResult(v=>results.length?(v+(e.key==='ArrowDown'?1:-1)+results.length)%results.length:0);}
   if(e.key==='Enter'&&e.target instanceof HTMLInputElement&&results[activeResult]){e.preventDefault();run(results[activeResult]!.open);}
   if(e.key==='Tab'){const nodes=[...dialog.current!.querySelectorAll<HTMLElement>('input,button')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }}><label><Search size={21}/><input autoFocus aria-label="Buscar una función" placeholder="Ej.: riesgo, cuestionario, PDF…" value={search} onChange={e=>{setSearch(e.target.value);setActiveResult(0);}}/><button aria-label="Cerrar búsqueda" onClick={closeCommand}><X size={18}/></button></label><p className="search-hint">Escribe una función o usa las flechas y pulsa Intro</p><div className="command-results">{results.map((entry,i)=><button className={'command-result'+(i===activeResult?' selected':'')} key={entry.id} onMouseEnter={()=>setActiveResult(i)} onClick={()=>run(entry.open)}><span><strong>{entry.label}</strong><small>{entry.hint}</small></span><ArrowUpRight size={17}/></button>)}{!results.length&&<p className="search-empty">No hay coincidencias. Prueba con «cartera», «fondos» o «informe».</p>}</div></div></div>}
 </div>;
}
