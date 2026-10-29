export const REPORT_SECTIONS=['summary','interview','budget','portfolio','risk','costs','mortgage','actions','glossary'] as const;
export type ReportSection=typeof REPORT_SECTIONS[number];
export type ReadingLevel='plain'|'standard'|'technical';
export type AdviserSettings={firm:string;adviser:string;email:string;registration:string;footer:string};
export const DEFAULT_ADVISER:AdviserSettings={firm:'',adviser:'',email:'',registration:'',footer:''};
export type ReportPreferences={level:ReadingLevel;sections:ReportSection[];advisoryFee:number;custodyFee:number;productFee:number;entryFee:number;years:number;grossReturn:number;inflation:number;notes:string};
export const DEFAULT_REPORT:ReportPreferences={level:'plain',sections:[...REPORT_SECTIONS],advisoryFee:0,custodyFee:0,productFee:0,entryFee:0,years:10,grossReturn:0,inflation:0,notes:''};
export function validateAdviser(value:unknown):AdviserSettings {
  if(value===undefined)return {...DEFAULT_ADVISER};
  if(!value||typeof value!=='object')throw new Error('Configuración de asesor no válida');
  const v=value as Record<string,unknown>,r={...DEFAULT_ADVISER};
  for(const k of Object.keys(r) as (keyof AdviserSettings)[]){if(typeof v[k]!=='string'||v[k].length>(k==='footer'?2000:180))throw new Error('Datos del despacho no válidos');r[k]=v[k];}
  return r;
}
export function validateReportPreferences(value:unknown):ReportPreferences {
  if(value===undefined)return {...DEFAULT_REPORT,sections:[...REPORT_SECTIONS]};
  if(!value||typeof value!=='object')throw new Error('Opciones de informe no válidas');
  const v=value as ReportPreferences;
  if(!['plain','standard','technical'].includes(v.level)||!Array.isArray(v.sections)||v.sections.some(x=>!REPORT_SECTIONS.includes(x))||typeof v.notes!=='string'||v.notes.length>6000)throw new Error('Opciones de informe no válidas');
  for(const key of ['advisoryFee','custodyFee','productFee','entryFee','years','grossReturn','inflation'] as const){const n=v[key];if(!Number.isFinite(n)||n>(key==='years'?60:100)||n<(key==='grossReturn'||key==='inflation'?-99:0))throw new Error('Hipótesis del informe no válidas');}
  if(!Number.isInteger(v.years)||v.years<1)throw new Error('Plazo del informe no válido');
  return {level:v.level,sections:[...new Set(v.sections)],advisoryFee:v.advisoryFee,custodyFee:v.custodyFee,productFee:v.productFee,entryFee:v.entryFee,years:v.years,grossReturn:v.grossReturn,inflation:v.inflation,notes:v.notes};
}
