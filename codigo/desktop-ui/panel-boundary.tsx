import {Component,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {RefreshCw,ArrowLeft,TriangleAlert} from 'lucide-react';
export function PanelRecovery({message,retry}:{message:string;retry:()=>void}){return <section className="terminal-panel panel-recovery" role="alert"><TriangleAlert size={28}/><h2>Este panel necesita volver a cargarse</h2><p>Puedes reintentarlo o continuar desde la ficha. Los datos del espacio de trabajo se conservan.</p><div className="portfolio-actions"><button className="terminal-button" onClick={retry}><RefreshCw size={15}/>Volver a intentar</button><Link to="/" className="terminal-button secondary"><ArrowLeft size={15}/>Ir a Personas</Link></div><details><summary>Detalle del problema</summary><p>{message}</p></details></section>;}
export class PanelBoundary extends Component<{children:ReactNode},{message:string|null}>{
 override state:{message:string|null}={message:null};
 static getDerivedStateFromError(error:Error){return {message:error.message};}
 override render(){return this.state.message?<PanelRecovery message={this.state.message} retry={()=>this.setState({message:null})}/>:this.props.children;}
}
