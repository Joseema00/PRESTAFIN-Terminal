import { validateTracking,validateWealthHistory } from '../desktop-runtime/portfolio-monitor.mjs';
import { validateAllocationAudit } from '../desktop-runtime/allocation-engine.mjs';
import { validatePortfolioProposal,assertProposalHoldings } from '../desktop-runtime/portfolio-proposal.mjs';
import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { validateInterviews } from '../desktop-runtime/risk-profile.mjs';
import { validateHistory } from '../desktop-runtime/professional-analysis.mjs';
import { validateAdviser, validateReportPreferences } from '../desktop-runtime/adviser.mjs';
import { migrateLegacy } from '../desktop-runtime/people.mjs';

export const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;
const num = (v, name, min = 0, max = 1e12) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Valor no válido: ' + name);
  return v;
};
const str = (v, name, max = 180, empty = false) => {
  if (typeof v !== 'string' || (!empty && !v.trim()) || v.length > max) throw new Error('Texto no válido: ' + name);
  return v;
};
function validateDossier(value) {
  if (!Array.isArray(value.portfolios) || value.portfolios.length < 1 || value.portfolios.length > 250) throw new Error('Número de carteras no válido');
  const ids = new Set();
  const portfolios = value.portfolios.map(p => {
    const id = str(p.id, 'id', 160);
    if (ids.has(id)) throw new Error('Identificador de cartera duplicado');
    ids.add(id);
    if (!Array.isArray(p.holdings) || p.holdings.length > 500) throw new Error('Posiciones no válidas');
    const proposal=p.proposal===undefined?undefined:validatePortfolioProposal(p.proposal);
    if(proposal)assertProposalHoldings(proposal,p.holdings);
    const tracking=p.tracking===undefined?undefined:validateTracking(p.tracking);
    if(proposal&&tracking)throw new Error('Una propuesta no puede tener valoraciones de cuenta');
    if(tracking&&Math.abs(p.holdings.reduce((s,h)=>s+h.amount,0)-tracking.valuations.at(-1).value)>.02)throw new Error('La valoración no coincide con el saldo de posiciones');
    const mandate=p.mandate===undefined?undefined:validateAllocationAudit(p.mandate);
    return {
      id, name: str(p.name, 'nombre', 120), createdAt: num(p.createdAt, 'fecha', 0, Number.MAX_SAFE_INTEGER),
      ...(p.origin !== undefined ? { origin: str(p.origin, 'origen', 160, true) } : {}),
      ...(proposal?{proposal}:{}),...(tracking?{tracking}:{}),...(p.mode==='draft'?{mode:'draft'}:{}),...(mandate?{mandate}:{}),
      holdings: p.holdings.map(h => ({
        assetId: str(h.assetId, 'activo', 160), amount: num(h.amount, 'importe'),
        ...(h.meta ? { meta: {
          symbol: str(h.meta.symbol, 'símbolo', 64), name: str(h.meta.name, 'activo', 180),
          kind: str(h.meta.kind, 'tipo', 80), currency: str(h.meta.currency, 'divisa', 8, true),
          ...(h.meta.isin !== undefined ? { isin: h.meta.isin === null ? null : str(h.meta.isin, 'ISIN', 32, true) } : {}),
          ...(h.meta.cls !== undefined ? { cls: str(h.meta.cls, 'clase', 40) } : {}),
        } } : {}),
      })),
    };
  });
  if (!ids.has(value.activeId)) throw new Error('La cartera activa no existe');
  const p = value.profile, s = value.settings, m = value.mortgage;
  if (!p || !s || !m || typeof s.realTerms !== 'boolean') throw new Error('Perfil incompleto');
  const modules = value.selectedModules ?? [];
  const interviews = validateInterviews(value.interviews);
  const activeInterviewId = value.activeInterviewId ?? null;
  if (activeInterviewId !== null && !interviews.some(i => i.id === activeInterviewId)) throw new Error('La entrevista activa no existe');
  if (!Array.isArray(modules) || modules.some(n => !Number.isInteger(n) || n < 1 || n > 28)) throw new Error('Selección no válida');
  return {
    portfolios, activeId: value.activeId,
    profile: { cash: num(p.cash,'liquidez'), otherAssets:num(p.otherAssets,'otros activos'), monthlyContribution:num(p.monthlyContribution,'aportación') },
    mortgage: { principal:num(m.principal,'capital'), rate:num(m.rate,'tipo',0,100), years:num(m.years,'plazo',1,100), extraMonthly:num(m.extraMonthly,'amortización') },
    settings: { contribGrowth:num(s.contribGrowth,'crecimiento',-99,100), inflation:num(s.inflation,'inflación',-99,100), taxRate:num(s.taxRate,'impuestos',0,100), expenses:num(s.expenses,'gastos'), share:num(s.share,'reparto',0,1), realTerms:s.realTerms },
    selectedModules:[...new Set(modules)], interviews, activeInterviewId,
  };
}

export function validateWorkspace(value) {
  if (!value || ![1,2].includes(value.version)) throw new Error('Formato de copia no compatible');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_WORKSPACE_BYTES) throw new Error('Archivo demasiado grande');
  if(value.version===1) return validateWorkspace(migrateLegacy({...validateDossier(value),version:1}));
  if(!Array.isArray(value.people)||value.people.length>250)throw new Error('Número de personas no válido');
  const ids=new Set(),portfolioOwners=new Map(),interviewIds=new Set();
  const people=value.people.map(p=>{
    const id=str(p.id,'persona',180);
    if(ids.has(id))throw new Error('Identificador de persona duplicado');ids.add(id);
    if(typeof p.archived!=='boolean'||typeof p.legacy!=='boolean')throw new Error('Estado de persona no válido');
    const dossier=validateDossier(p);
    if(p.histories!==undefined&&(!Array.isArray(p.histories)||p.histories.length>20||new Set(p.histories.map(h=>h.portfolioId)).size!==p.histories.length))throw new Error('Históricos duplicados o demasiados conjuntos de datos');
    const histories=p.histories?.map(validateHistory);
    delete dossier.selectedModules;
    for(const portfolio of dossier.portfolios){if(portfolioOwners.has(portfolio.id))throw new Error('Una cartera pertenece a varias personas');portfolioOwners.set(portfolio.id,id);}
    for(const i of dossier.interviews){if(interviewIds.has(i.id))throw new Error('Una entrevista pertenece a varias personas');interviewIds.add(i.id);}
    let simulator=null;
    if(p.simulator!==null){const s=p.simulator;if(!s)throw new Error('Simulación incompleta');simulator={principal:num(s.principal,'capital'),annualRate:num(s.annualRate,'tipo',0,100),years:num(s.years,'plazo',1,100),monthlySavings:num(s.monthlySavings,'ahorro mensual'),currentSavings:num(s.currentSavings,'ahorro'),expectedReturn:num(s.expectedReturn,'rentabilidad',-99,100),inflation:num(s.inflation,'inflación',-99,100),taxRate:num(s.taxRate,'impuestos',0,100)};}
    return {...dossier,id,name:str(p.name,'nombre de persona',80),email:str(p.email,'correo',160,true),phone:str(p.phone,'teléfono',40,true),reference:str(p.reference,'referencia',80,true),notes:str(p.notes,'notas',6000,true),createdAt:num(p.createdAt,'fecha',0,Number.MAX_SAFE_INTEGER),updatedAt:num(p.updatedAt,'fecha',0,Number.MAX_SAFE_INTEGER),archived:p.archived,legacy:p.legacy,simulator,...(histories?{histories}:{}),...(p.wealthHistory!==undefined?{wealthHistory:validateWealthHistory(p.wealthHistory)}:{}),...(p.reportPreferences!==undefined?{reportPreferences:validateReportPreferences(p.reportPreferences)}:{})};
  });
  for(const person of people) for(const interview of person.interviews){
    const owner=portfolioOwners.get(interview.generated?.portfolioId);
    if(owner && owner!==person.id)throw new Error('La entrevista apunta a la cartera de otra persona');
  }
  const activePersonId=value.activePersonId;
  if(activePersonId!==null && !people.some(p=>p.id===activePersonId&&!p.archived))throw new Error('La persona activa no existe o está archivada');
  const modules=value.selectedModules??[];
  if(!Array.isArray(modules)||modules.some(n=>!Number.isInteger(n)||n<1||n>28))throw new Error('Selección no válida');
  return {version:2,people,activePersonId,selectedModules:[...new Set(modules)],...(value.adviser!==undefined?{adviser:validateAdviser(value.adviser)}:{})};
}

// One queue, atomic replacement, previous valid version kept beside the current file.
export class WorkspaceStore {
  constructor(directory) { this.directory = directory; this.file = path.join(directory,'workspace.json'); this.queue = Promise.resolve(); }
  async load() {
    try { return validateWorkspace(JSON.parse(await readFile(this.file,'utf8'))); }
    catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new Error('No se pudo leer el espacio de trabajo. Se ha conservado el archivo. Restaura una copia desde Ajustes.');
    }
  }
  save(input) {
    const data = validateWorkspace(input);
    const write = this.queue.catch(() => {}).then(async () => {
      await mkdir(this.directory,{recursive:true});
      const tmp = this.file + '.tmp';
      await writeFile(tmp,JSON.stringify(data,null,2),{encoding:'utf8',mode:0o600});
      try { await copyFile(this.file,this.file + '.previous'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await rename(tmp,this.file);
      return { savedAt:Date.now() };
    });
    this.queue = write;
    return write;
  }
  flush() { return this.queue; }
}
