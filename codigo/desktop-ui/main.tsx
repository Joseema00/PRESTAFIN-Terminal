import { FundExplorer } from './funds';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider, useNavigate, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, ChartNoAxesCombined, FlaskConical, FileText, Settings2, Search, ArrowUpRight, ChevronRight, CircleHelp, Moon, Sun, Users } from 'lucide-react';
import { Toaster } from '../src/components/ui/sonner';
import { WealthDashboard } from '../src/components/app/wealth-dashboard';
import { PortfolioLab } from '../src/components/app/portfolio-lab';
import wordmark from '../src/assets/wordmark.png';
import isotipo from '../src/assets/isotipo.png';
import { usePortfolios, usePeople, initializeWorkspace } from './use-portfolios';
import { AnalysisPage } from './analysis';
import { ReportsPage } from './reports';
import { SettingsPage } from './settings';
import { InterviewPage } from './interview';
import { PeoplePage, PersonPage, PersonSimulator } from './people';
import '../src/styles.css';
import './terminal.css';

const NAV = [
  {to:'/',label:'Personas',code:'01',icon:Users},
  {to:'/persona',label:'Resumen de la persona',code:'02',icon:LayoutDashboard},
  {to:'/mi-patrimonio',label:'Patrimonio y préstamo',code:'03',icon:ChartNoAxesCombined},
  {to:'/portfolio-lab',label:'Carteras',code:'04',icon:ChartNoAxesCombined},
  {to:'/entrevista',label:'Entrevistas',code:'05',icon:CircleHelp},
  {to:'/simulador',label:'Simulación',code:'06',icon:FlaskConical},
  {to:'/informes',label:'Informes',code:'07',icon:FileText},
  {to:'/analisis',label:'Análisis de riesgo',code:'08',icon:FlaskConical},
  {to:'/fondos',label:'Fondos e históricos',code:'09',icon:ChartNoAxesCombined},
  {to:'/ajustes',label:'Despacho y copias',code:'10',icon:Settings2},
] as const;
const PERSON_ROUTES=new Set(['/persona','/mi-patrimonio','/portfolio-lab','/entrevista','/simulador','/informes','/analisis']);
const queryClient = new QueryClient({defaultOptions:{queries:{refetchOnWindowFocus:false}}});

function Shell() {
  const pathname = useRouterState({select:s => s.location.pathname});
  const current = NAV.find(n => n.to === pathname) ?? NAV[0];
  const store = usePortfolios();
  const people = usePeople();
  const navigate = useNavigate();
  const [search,setSearch] = useState('');
  const [command,setCommand] = useState(false);
  const [dark,setDark] = useState(() => localStorage.getItem('prestafin.theme') !== 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark',dark); localStorage.setItem('prestafin.theme',dark ? 'dark' : 'light'); },[dark]);
  useEffect(() => {
    const key = (event:KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommand(x => !x); }
      if (event.key === 'Escape') setCommand(false);
    };
    window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key);
  },[]);
  return <div className="terminal-shell">
    <aside className="terminal-sidebar">
      <Link to="/" className="terminal-brand" aria-label="Prestafin, inicio"><img src={wordmark} alt="Prestafin"/><span>TERMINAL / 01</span></Link>
      <div className="sidebar-person"><label htmlFor="selected-person">PERSONA SELECCIONADA</label><select id="selected-person" value={people.active?.id??''} disabled={!people.writable||!people.people.some(p=>!p.archived)} onChange={e=>{people.select(e.target.value);void navigate({to:'/persona'});}}><option value="" disabled>Elige una persona</option>{people.people.filter(p=>!p.archived).map(p=><option key={p.id} value={p.id}>{p.name} · {p.reference||p.id.slice(-6)}</option>)}</select><Link to="/"><Users size={12}/>Ver todas las personas</Link></div>
      <div className="sidebar-label">HERRAMIENTAS DE LA FICHA</div>
      <nav aria-label="Navegación principal">{NAV.map(n => PERSON_ROUTES.has(n.to)&&!people.active?<span key={n.to} className="terminal-nav disabled" title="Selecciona una persona"><n.icon size={16}/><span>{n.label}</span><small>{n.code}</small></span>:<Link key={n.to} to={n.to} activeOptions={{exact:true}} className="terminal-nav" activeProps={{className:'terminal-nav active'}}><n.icon size={16}/><span>{n.label}</span><small>{n.code}</small></Link>)}</nav>
      <div className="sidebar-bottom"><img src={isotipo} alt=""/><div><strong>Edición de escritorio</strong><span>Archivo local · EUR</span></div></div>
    </aside>
    <section className="terminal-workspace">
      <header className="terminal-toolbar"><div><span className="toolbar-prefix">PRESTAFIN</span><ChevronRight size={13}/><strong>{current.label}</strong></div><div><button className="command-button" onClick={() => setCommand(true)}><Search size={14}/> Ir a una herramienta <kbd>Ctrl K</kbd></button><button className="icon-button" title={dark ? 'Tema claro' : 'Tema oscuro'} onClick={() => setDark(!dark)}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button></div></header>
      <main className="terminal-main">
        {store.saveError && <div className="terminal-warning" role="alert">{store.saveError} <Link to="/ajustes">Abrir recuperación de datos</Link></div>}
        {store.hydrated ? PERSON_ROUTES.has(pathname)&&!people.active ? <section className="terminal-panel people-empty"><Users size={32}/><h2>Elige una persona para continuar</h2><p>Sus herramientas y datos se mostrarán dentro de su ficha.</p><Link to="/" className="terminal-button">Ir al menú de personas</Link></section> : <div key={(people.active?.id??'directory')+':'+people.epoch}>{PERSON_ROUTES.has(pathname)&&people.active&&<div className="person-context"><span><Users size={15}/>Estás trabajando con <strong>{people.active.name}</strong></span><Link to="/">Cambiar de persona</Link></div>}<Outlet/></div> : <p>Cargando el espacio de trabajo…</p>}
      </main>
      <footer className="terminal-status"><span><i className={store.saveError ? 'status-error' : ''}/>{store.saveError ? 'ERROR DE GUARDADO' : store.saving ? 'GUARDANDO' : 'GUARDADO LOCAL'}</span><span>{people.active?.name??'Directorio de personas'}<b>·</b>{store.portfolios.length} carteras<b>·</b>Datos de mercado bajo demanda<b>·</b>v0.7.0</span></footer>
    </section>
    {command && <div className="command-backdrop" onClick={() => setCommand(false)}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Buscar herramienta" onClick={e => e.stopPropagation()}><label><Search size={18}/><input autoFocus placeholder="Buscar herramienta…" value={search} onChange={e => setSearch(e.target.value)}/><button onClick={() => setCommand(false)}>Esc</button></label>{NAV.filter(n => (!PERSON_ROUTES.has(n.to)||people.active)&&n.label.toLowerCase().includes(search.toLowerCase())).map(n => <Link key={n.to} to={n.to} onClick={() => {setCommand(false);setSearch('');}}><n.icon size={17}/>{n.label}<ArrowUpRight size={14}/></Link>)}</div></div>}
  </div>;
}
function PageTitle({eyebrow,title,description}:{eyebrow:string;title:string;description:string}) {
  return <div className="terminal-page-title"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>;
}
const rootRoute = createRootRoute({component:Shell});
const routes = [
  createRoute({getParentRoute:() => rootRoute,path:'/',component:PeoplePage}),
  createRoute({getParentRoute:() => rootRoute,path:'/persona',component:PersonPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/entrevista',component:InterviewPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/mi-patrimonio',component:() => <><PageTitle eyebrow="PATRIMONIO" title="Patrimonio y préstamo" description="Datos económicos de la persona seleccionada y escenarios sobre su cartera activa."/><WealthDashboard/></>}),
  createRoute({getParentRoute:() => rootRoute,path:'/portfolio-lab',component:() => <><PageTitle eyebrow="ANÁLISIS" title="Portfolio Lab" description="Carteras, optimización, riesgo y series históricas disponibles."/><PortfolioLab/></>}),
  createRoute({getParentRoute:() => rootRoute,path:'/informes',component:ReportsPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/simulador',component:PersonSimulator}),
  createRoute({getParentRoute:() => rootRoute,path:'/analisis',component:AnalysisPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/fondos',component:FundExplorer}),
  createRoute({getParentRoute:() => rootRoute,path:'/ajustes',component:SettingsPage}),
  ...(['/auth','/suscripcion','/cuenta','/privacy','/terms','/refund'] as const).map(routePath => createRoute({getParentRoute:() => rootRoute,path:routePath,component:SettingsPage})),
];
const router = createRouter({routeTree:rootRoute.addChildren(routes),history:createHashHistory(),defaultPreload:'intent'});
declare module '@tanstack/react-router' { interface Register { router:typeof router } }
class ErrorBoundary extends Component<{children:ReactNode},{message:string|null}> {
  override state:{message:string|null} = {message:null};
  static getDerivedStateFromError(error:Error) { return {message:error.message}; }
  override render() { if(this.state.message) return <div className="terminal-fatal"><h1>No se pudo abrir este panel</h1><p>{this.state.message}</p><p>Los archivos guardados se conservan.</p><button onClick={() => location.reload()}>Reabrir Prestafin</button></div>; return this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><QueryClientProvider client={queryClient}><Toaster/><RouterProvider router={router}/></QueryClientProvider></ErrorBoundary>);
void initializeWorkspace();
