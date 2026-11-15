export const REPORT_SECTIONS=['summary','interview','budget','portfolio','risk','costs','mortgage','actions','glossary'] as const;
export type ReportSection=typeof REPORT_SECTIONS[number];
export type ReadingLevel='plain'|'standard'|'technical';
export type AdviserSettings={firm:string;adviser:string;email:string;registration:string;footer:string};
export const DEFAULT_ADVISER:AdviserSettings={firm:'',adviser:'',email:'',registration:'',footer:''};
export const REPORT_CHARTS=['balance','structure','budget','allocation','wealthHistory','accountHistory','marketHistory','costs','mortgage','optimizationFrontier','optimizationRisk'] as const;
export type ReportChartId=typeof REPORT_CHARTS[number];
export type ReportPreferences={level:ReadingLevel;sections:ReportSection[];advisoryFee:number;custodyFee:number;productFee:number;entryFee:number;years:number;grossReturn:number;inflation:number;notes:string;title:string;subtitle:string;purpose:string;sectionNotes:Partial<Record<ReportSection,string>>;charts:ReportChartId[];chartTheme:'brand'|'mono';includeCover:boolean;includeContents:boolean;includeTables:boolean};
export const DEFAULT_REPORT:ReportPreferences={level:'standard',sections:[...REPORT_SECTIONS],advisoryFee:0,custodyFee:0,productFee:0,entryFee:0,years:10,grossReturn:0,inflation:0,notes:'',title:'Informe patrimonial y financiero',subtitle:'Situación actual, análisis y plan de seguimiento',purpose:'',sectionNotes:{},charts:[...REPORT_CHARTS],chartTheme:'brand',includeCover:true,includeContents:true,includeTables:true};
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
  const extra={title:v.title??DEFAULT_REPORT.title,subtitle:v.subtitle??DEFAULT_REPORT.subtitle,purpose:v.purpose??'',charts:v.charts??[...REPORT_CHARTS],sectionNotes:v.sectionNotes??{},chartTheme:v.chartTheme??'brand',includeCover:v.includeCover??true,includeContents:v.includeContents??true,includeTables:v.includeTables??true};
  for(const [key,max] of [['title',160],['subtitle',250],['purpose',1800]] as const)if(typeof extra[key]!=='string'||extra[key].length>max)throw new Error('Texto de personalización no válido');
  if(!Array.isArray(extra.charts)||extra.charts.some(x=>!REPORT_CHARTS.includes(x))||!['brand','mono'].includes(extra.chartTheme)||['includeCover','includeContents','includeTables'].some(k=>typeof extra[k as 'includeCover']!=='boolean'))throw new Error('Presentación del informe no válida');
  if(!extra.sectionNotes||typeof extra.sectionNotes!=='object'||Array.isArray(extra.sectionNotes)||Object.entries(extra.sectionNotes).some(([k,v])=>!REPORT_SECTIONS.includes(k as ReportSection)||typeof v!=='string'||v.length>3000))throw new Error('Comentarios por sección no válidos');
  return {level:v.level,sections:[...new Set(v.sections)],advisoryFee:v.advisoryFee,custodyFee:v.custodyFee,productFee:v.productFee,entryFee:v.entryFee,years:v.years,grossReturn:v.grossReturn,inflation:v.inflation,notes:v.notes,...extra,charts:[...new Set(extra.charts)],sectionNotes:{...extra.sectionNotes}};

}
