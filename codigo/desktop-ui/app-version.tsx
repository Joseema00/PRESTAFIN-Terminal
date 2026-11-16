import {useEffect,useState} from 'react';

/** Display the version returned by the installed native application. */
export function AppVersion(){
 const [version,setVersion]=useState<string|null>(null);
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>window.prestafin?.appInfo?.()).then(info=>{if(active&&typeof info?.version==='string'&&/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(info.version))setVersion(info.version);}).catch(()=>{});return()=>{active=false;};},[]);
 return <small data-app-version={version??undefined}>{version?'Versión '+version:'Consultando versión…'}</small>;
}
