import {Shell} from './shell';
import {portfolioSearch} from './navigation';
import {PanelRecovery} from './panel-boundary';
import { BillingPage, BillingProvider, AccountPage } from './billing';
import {Welcome} from './welcome';
import { FundExplorer } from './funds';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRootRoute, createRoute, createRouter, RouterProvider, Navigate } from '@tanstack/react-router';
import { Toaster } from '../src/components/ui/sonner';
import { WealthDashboard } from '../src/components/app/wealth-dashboard';
import { PortfolioLab } from '../src/components/app/portfolio-lab';
import { initializeWorkspace } from './use-portfolios';

import { ReportsPage } from './reports';


import { PeoplePage, PersonPage, PersonSimulator } from './people';
import '../src/styles.css';
import './terminal.css';
import './interface.css';

const queryClient = new QueryClient({defaultOptions:{queries:{refetchOnWindowFocus:false}}});

function PageTitle({eyebrow,title,description}:{eyebrow:string;title:string;description:string}) {
  return <div className="terminal-page-title"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>;
}
const rootRoute = createRootRoute({component:Shell});
const routes = [
  createRoute({getParentRoute:() => rootRoute,path:'/',component:PeoplePage}),
  createRoute({getParentRoute:() => rootRoute,path:'/persona',component:PersonPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/entrevista',component:()=><PersonPage initialQuestionnaire/>}),
  createRoute({getParentRoute:() => rootRoute,path:'/mi-patrimonio',component:() => <><PageTitle eyebrow="PATRIMONIO" title="Patrimonio y préstamo" description="Datos económicos de la persona seleccionada y escenarios sobre su cartera activa."/><WealthDashboard/></>}),
  createRoute({getParentRoute:() => rootRoute,path:'/portfolio-lab',validateSearch:portfolioSearch,component:() => <><PageTitle eyebrow="ANÁLISIS" title="Carteras" description="Construye, analiza y sigue las inversiones de esta persona desde un mismo lugar."/><PortfolioLab/></>}),
  createRoute({getParentRoute:() => rootRoute,path:'/informes',component:ReportsPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/simulador',component:PersonSimulator}),
  createRoute({getParentRoute:() => rootRoute,path:'/analisis',component:()=><Navigate to='/portfolio-lab' replace/>}),
  createRoute({getParentRoute:() => rootRoute,path:'/fondos',component:FundExplorer}),
  createRoute({getParentRoute:() => rootRoute,path:'/ajustes',component:()=><Navigate to='/' replace/>}),
  createRoute({getParentRoute:() => rootRoute,path:'/suscripcion',component:BillingPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/cuenta',component:AccountPage}),
  createRoute({getParentRoute:() => rootRoute,path:'/auth',component:()=><Navigate to='/cuenta' replace/>}),
  ...(['/privacy','/terms','/refund'] as const).map(routePath => createRoute({getParentRoute:() => rootRoute,path:routePath,component:()=><Navigate to='/' replace/>})),
];
const router = createRouter({routeTree:rootRoute.addChildren(routes),history:createHashHistory(),defaultPreload:'intent',defaultErrorComponent:({error,reset})=><PanelRecovery message={error instanceof Error?error.message:'No se pudo abrir esta herramienta.'} retry={reset}/>});
declare module '@tanstack/react-router' { interface Register { router:typeof router } }
class ErrorBoundary extends Component<{children:ReactNode},{message:string|null}> {
  override state:{message:string|null} = {message:null};
  static getDerivedStateFromError(error:Error) { return {message:error.message}; }
  override render() { if(this.state.message) return <div className="terminal-fatal"><h1>No se pudo abrir este panel</h1><p>{this.state.message}</p><p>Los archivos guardados se conservan.</p><button onClick={() => location.reload()}>Reabrir Prestafin</button></div>; return this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><QueryClientProvider client={queryClient}><Toaster/><BillingProvider><Welcome><RouterProvider router={router}/></Welcome></BillingProvider></QueryClientProvider></ErrorBoundary>);
void initializeWorkspace();
