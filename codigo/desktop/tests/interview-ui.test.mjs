import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync,readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { Window } from 'happy-dom';
import { healthyAnswers } from './fixtures/interview.mjs';

// The actual React screen, router, input events, renderer store and native
// validator run together. Synthetic data only; no user files or market calls.
const browser=new Window({url:'http://localhost/entrevista'});
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLFormElement','Element','SVGElement','Event','MouseEvent','Node','MutationObserver','ResizeObserver','localStorage','sessionStorage'])Object.defineProperty(globalThis,key,{value:key==='window'?browser:browser[key],configurable:true,writable:true});
globalThis.scrollTo=browser.scrollTo.bind(browser);globalThis.getComputedStyle=browser.getComputedStyle.bind(browser);
globalThis.self=browser;globalThis.requestAnimationFrame=browser.requestAnimationFrame.bind(browser);globalThis.cancelAnimationFrame=browser.cancelAnimationFrame.bind(browser);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
registerHooks({
  resolve(specifier,context,next){
    if(specifier==='@tanstack/router-core/isServer')return next(specifier,{...context,conditions:[...context.conditions.filter(c=>c!=='node'),'browser']});
    if(specifier.startsWith('@/')){
      const adapters={'@/hooks/use-portfolios':'use-portfolios.ts','@/hooks/use-auth':'use-auth.ts','@/hooks/use-subscription':'use-subscription.ts','@/hooks/use-market-data':'use-market-data.ts','@/components/app/paywall':'paywall.tsx'};
      if(adapters[specifier])return next(new URL('../../desktop-ui/'+adapters[specifier],import.meta.url).href,context);
      for(const ext of ['.ts','.tsx']){const url=new URL('../../src/'+specifier.slice(2)+ext,import.meta.url);if(existsSync(url))return next(url.href,context);}
    }
    if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)&&context.parentURL){for(const ext of ['.ts','.tsx']){const url=new URL(specifier+ext,context.parentURL);if(existsSync(url))return next(url.href,context);}}
    return next(specifier,context);
  },
  load(url,context,next){
    if(url.endsWith('.css'))return {format:'module',source:'export default {};',shortCircuit:true};
    if(url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
    return next(url,context);
  }
});
const React=await import('react'),{act,createElement:h}=React;
const {createRoot}=await import('react-dom/client');
const {createRootRoute,createRoute,createRouter,createMemoryHistory,RouterProvider,Outlet}=await import('@tanstack/react-router');
const store=await import('../../desktop-ui/use-portfolios.ts');
const {InterviewPage}=await import('../../desktop-ui/interview.tsx');
const {PersonPage}=await import('../../desktop-ui/people.tsx');
const {AnalysisPage}=await import('../../desktop-ui/analysis.tsx');
const {PortfolioLab}=await import('../../src/components/app/portfolio-lab.tsx');
const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
const {QUESTIONS}=await import('../../desktop-runtime/risk-profile.mjs');
const {newPerson,emptyWorkspace}=await import('../../desktop-runtime/people.mjs');
const {validateWorkspace}=await import('../workspace.mjs');
let saved=null,imported=null,failSave=false,saveGate=null,captured;
window.prestafin={loadWorkspace:async()=>null,saveWorkspace:async value=>{if(saveGate)await saveGate;if(failSave)throw new Error('No se pudo escribir el archivo de prueba');saved=validateWorkspace(structuredClone(value));return {savedAt:Date.now()};},importWorkspace:async()=>imported};
await store.initializeWorkspace();
function Shell(){captured={people:store.usePeople(),interviews:store.useInterviews(),portfolios:store.usePortfolios()};return h('main',{className:'terminal-main'},h('div',{key:captured.people.active?.id+':'+captured.people.epoch},h(Outlet)));}
const rootRoute=createRootRoute({component:Shell});
const routeTree=rootRoute.addChildren([createRoute({getParentRoute:()=>rootRoute,path:'/entrevista',component:InterviewPage}),createRoute({getParentRoute:()=>rootRoute,path:'/persona',component:()=>h(QueryClientProvider,{client:queryClient},h(PersonPage))}),createRoute({getParentRoute:()=>rootRoute,path:'/analisis',component:()=>h(QueryClientProvider,{client:queryClient},h(AnalysisPage))}),createRoute({getParentRoute:()=>rootRoute,path:'/portfolio-lab',component:()=>h(QueryClientProvider,{client:queryClient},h(PortfolioLab))})]);
const router=createRouter({routeTree,history:createMemoryHistory({initialEntries:['/entrevista']})});
const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
await act(async()=>{root.render(h(RouterProvider,{router}));await router.load();});
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
async function action(fn){await act(async()=>{await fn();await tick();});}
function button(text){const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(found,'Missing button: '+text);return found;}
async function click(text){await action(()=>button(text).click());}
async function input(key,value){const el=document.querySelector('#question-'+key+' input[type="text"]');assert.ok(el,key);await action(()=>{el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});return el;}
async function reset(answers={},step=0){
  failSave=false;saveGate=null;window.prestafin.marketBundle=async()=>{throw new Error('Sin conexión en esta prueba');};
  const person=newPerson('Persona sintética');const now=Date.now();person.interviews=[{id:crypto.randomUUID(),alias:'Entrevista de prueba',createdAt:now,updatedAt:now,step,revision:1,rulesVersion:1,answers}];person.activeInterviewId=person.interviews[0].id;
  imported={...emptyWorkspace(),people:[person],activePersonId:person.id};
  await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/entrevista'});});
  return person;
}
after(async()=>{await act(async()=>root.unmount());queryClient.clear();await browser.happyDOM.abort();browser.close();});

test('UI: fill all six blocks with real input/radio events, generate without review and open the saved portfolio',async()=>{
  await reset();const answers={...healthyAnswers(),initial:20000.01};
  for(let step=0;step<6;step++){
    for(const q of QUESTIONS.filter(q=>q.step===step&&!q.optional)){
      if(q.kind==='money')await input(q.id,String(answers[q.id]).replace('.',','));
      else await action(()=>{const radio=document.querySelector('input[name="'+q.id+'"][value="'+answers[q.id]+'"]');assert.ok(radio,q.id);radio.click();});
    }
    await click(step===5?'Ver resultado':'Siguiente bloque');
  }
  assert.equal(captured.interviews.active.answers.initial,20000.01);assert.equal(captured.interviews.active.review,undefined);
  assert.equal(button('Generar borrador de inversión').disabled,false);
  await click('Generar borrador de inversión');assert.equal(router.state.location.pathname,'/portfolio-lab');
  const id=captured.portfolios.active.id;assert.ok(Math.abs(captured.portfolios.active.holdings.reduce((s,h)=>s+h.amount,0)-20000.01)<1e-8);
  assert.equal(saved.people[0].activeId,id);assert.equal(saved.people[0].interviews[0].generated.kind,'investment');
  await action(()=>router.navigate({to:'/entrevista'}));await click('Abrir cartera creada');assert.equal(captured.portfolios.active.id,id);assert.equal(captured.portfolios.portfolios.length,2);
});
test('UI: the objective portfolio opens concrete products, preserves its conditions and persists the snapshot',async()=>{
  await reset({...healthyAnswers(),savings:6000},6);
  assert.match(document.body.textContent,/Cartera objetivo con productos concretos/);
  await click('Generar cartera objetivo');assert.equal(router.state.location.pathname,'/portfolio-lab');
  assert.match(document.body.textContent,/CARTERA OBJETIVO/);assert.match(document.body.textContent,/IE00BK5BQT80/);
  assert.equal(captured.portfolios.active.proposal.fundedToday,0);assert.equal(captured.portfolios.active.proposal.fundingGap,28000);
  assert.equal(saved.people[0].interviews[0].generated.kind,'objective');assert.deepEqual(saved.people[0].portfolios.at(-1).proposal,captured.portfolios.active.proposal);
});
test('UI: product selection controls recalculate, save settings and create a new version',async()=>{
 await reset(healthyAnswers(),6);const select=document.querySelector('select[aria-label="Criterio de selección"]');
 await action(()=>{select.value='coverage';select.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(saved.people[0].interviews[0].proposalSettings.priority,'coverage');
 await click('Generar borrador de inversión');assert.ok(captured.portfolios.active.proposal.positions.some(x=>x.isin==='IE00B3YLTY66'));
 const original=captured.portfolios.active.id;await action(()=>router.navigate({to:'/entrevista'}));
 const variant=document.querySelector('select[aria-label="Reparto de riesgo"]');await action(()=>{variant.value='cautious';variant.dispatchEvent(new Event('change',{bubbles:true}));});
 await click('Generar borrador de inversión');assert.notEqual(captured.portfolios.active.id,original);assert.ok(captured.portfolios.active.proposal.equity<=40);assert.equal(captured.portfolios.portfolios.length,3);
});
test('reports keep proposal funding separate, use saved product costs and never substitute newer interview answers',async()=>{
 const {buildProfessionalReport}=await import('../../desktop-ui/professional-report.ts');
 const {buildInterviewPlan}=await import('../../desktop-runtime/interview-plan.mjs');
 const {DEFAULT_ADVISER,DEFAULT_REPORT}=await import('../../desktop-runtime/adviser.mjs');
 const person=newPerson('Persona sintética');person.profile.cash=6000;
 const p=buildInterviewPlan({...healthyAnswers(),savings:6000});person.portfolios[0].holdings=p.holdings;person.portfolios[0].proposal={...p.proposal,interviewId:'source-interview',revision:1};
 person.interviews=[{id:'source-interview',alias:'Entrevista',createdAt:Date.now(),updatedAt:Date.now(),revision:2,rulesVersion:1,step:6,answers:healthyAnswers()}];
 person.activeInterviewId='source-interview';
 const report=buildProfessionalReport(person,DEFAULT_ADVISER,DEFAULT_REPORT),texts=report.blocks.map(x=>x.text.join(' ')).join(' ');
 assert.match(texts,/Patrimonio neto registrado: 6000/);assert.match(texts,/modificado o eliminado/);assert.match(texts,/Proyección de acumulación omitida/);assert.ok(!texts.includes('Al final del supuesto:'));
 assert.match(texts,/IE00BK5BQT80/);assert.match(texts,/Coste corriente ponderado/);
 const rows=report.blocks.find(x=>x.title==='Composición de la cartera').rows;assert.ok(rows.some(row=>row[0].includes('IE00BK5BQT80')));
});
test('planning reports omit return projections and do not add pending cash to net wealth twice',async()=>{
  const {buildProfessionalReport}=await import('../../desktop-ui/professional-report.ts');
  const {DEFAULT_ADVISER,DEFAULT_REPORT}=await import('../../desktop-runtime/adviser.mjs');
  const person=newPerson('Persona sintética');person.profile.cash=20000;person.portfolios[0].holdings=[{assetId:'interview-cash-pending',amount:20000}];
  const report=buildProfessionalReport(person,DEFAULT_ADVISER,DEFAULT_REPORT);
  assert.match(report.blocks.find(b=>b.title==='Resumen personal').text.join(' '),/Patrimonio neto registrado: 20.000/);
  assert.match(report.blocks.find(b=>b.title==='Costes y poder adquisitivo').text.join(' '),/Proyecciones omitidas/);
});
test('UI: unknown budget links to the relevant question, saves decimals immediately and preserves explicit unknowns on focus',async()=>{
  await reset({...healthyAnswers(),income:'unknown'},6);await click('Completar datos para generar');
  assert.equal(captured.interviews.active.step,1);assert.match(document.querySelector('[role="alert"]').textContent,/Revisa estos datos/);
  let field=document.querySelector('#question-income input[type="text"]');await action(()=>{field.focus();field.blur();});assert.equal(captured.interviews.active.answers.income,'unknown');
  field=await input('income','4.000,25');assert.equal(captured.interviews.active.answers.income,4000.25);assert.equal(saved.people[0].interviews[0].answers.income,4000.25);
  await input('income','4.000,');assert.equal(captured.interviews.active.answers.income,undefined);await action(()=>field.blur());assert.match(document.querySelector('#error-income').textContent,/decimales/);
  await input('income','4.000,25');await click('Siguiente bloque');assert.equal(captured.interviews.active.step,2);
});
test('UI: changing capital invalidates euro loss scenarios and the next generation points to missing answers',async()=>{
  await reset(healthyAnswers(),2);await input('initial','25000');
  for(const key of ['loss10','loss25','maxLoss'])assert.equal(captured.interviews.active.answers[key],undefined);
  await action(()=>[...document.querySelectorAll('.interview-steps button')].at(-1).click());await click('Completar datos para generar');assert.equal(captured.interviews.active.step,3);
});
test('UI: a failed save shows an error and retry opens the same portfolio without duplication',async()=>{
  await reset(healthyAnswers(),6);failSave=true;await click('Generar borrador de inversión');
  assert.equal(router.state.location.pathname,'/entrevista');assert.match(document.querySelector('[role="alert"]').textContent,/archivo de prueba/);assert.equal(captured.portfolios.portfolios.length,2);
  const id=captured.portfolios.active.id;failSave=false;await click('Abrir cartera creada');assert.equal(router.state.location.pathname,'/portfolio-lab');assert.equal(captured.portfolios.active.id,id);assert.equal(captured.portfolios.portfolios.length,2);
});
test('UI: switching person while a portfolio is saving cannot open the wrong dossier',async()=>{
  const owner=await reset(healthyAnswers(),6);let release;saveGate=new Promise(resolve=>release=resolve);
  await click('Generar borrador de inversión');assert.equal(button('Guardando cartera…').disabled,true);
  await action(()=>captured.people.create('Otra persona sintética'));const other=captured.people.active.id;
  await action(()=>release());saveGate=null;
  assert.equal(router.state.location.pathname,'/entrevista');assert.equal(captured.people.active.id,other);assert.equal(captured.portfolios.active.holdings.length,0);
  assert.equal(saved.people.find(p=>p.id===owner.id).portfolios.length,2);
});

async function selectTab(text){const el=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent===text);assert.ok(el,'Missing tab '+text);await action(()=>{el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));el.click();});}
test('UI: generated portfolios retain normal tabs, download risk data without CSV and keep the optimization version',async()=>{
 await reset({...healthyAnswers(),optimizationGoal:'sharpe'},6);const {syntheticBundle}=await import('./fixtures/market.mjs');let downloads=0;
 window.prestafin.marketBundle=async({symbols})=>{downloads++;return syntheticBundle(symbols);};
 await click('Generar borrador de inversión');
 for(const text of ['Composición','Optimización','Riesgo y correlaciones','Monte Carlo','Rebalanceo','Seguimiento'])assert.ok([...document.querySelectorAll('[role="tab"]')].some(x=>x.textContent===text));
 await selectTab('Riesgo y correlaciones');await action(async()=>{await new Promise(r=>setTimeout(r,50));});
 assert.ok(downloads>0);assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);assert.ok(saved.people[0].histories.length);
 assert.ok(!document.body.textContent.includes('Importar un histórico'));assert.equal(document.querySelector('textarea'),null);
 await selectTab('Optimización');const previous=captured.portfolios.active.id;await click('Guardar como nueva versión');
 assert.notEqual(captured.portfolios.active.id,previous);assert.equal(captured.portfolios.active.proposal.optimization.goal,'sharpe');assert.ok(captured.portfolios.portfolios.some(p=>p.id===previous));
});
test('UI: investments enter tracking and net wealth only on registration, and the person overview handles no debt',async()=>{
 await reset(healthyAnswers(),6);window.prestafin.marketBundle=async()=>{throw new Error('Sin conexión');};await click('Generar borrador de inversión');
 const proposalId=captured.portfolios.active.id;await action(()=>captured.portfolios.setProfile({cash:40000,otherAssets:50000,monthlyContribution:300}));
 await selectTab('Seguimiento');assert.equal(button('Registrar inversión realizada').disabled,true);
 await action(()=>document.querySelector('input[type="checkbox"]').click());await click('Registrar inversión realizada');
 assert.notEqual(captured.portfolios.active.id,proposalId);assert.ok(captured.portfolios.active.tracking);assert.equal(captured.people.active.profile.cash,20000);
 assert.ok(captured.portfolios.portfolios.find(c=>c.id===proposalId).proposal);assert.ok(saved.people[0].portfolios.at(-1).tracking);
 await action(()=>router.navigate({to:'/persona'}));assert.match(document.body.textContent,/Sin préstamo registrado/);assert.ok(document.querySelectorAll('.chart-panel').length>=8);assert.match(document.body.textContent,/90[.\s]?000/);
 await action(()=>router.navigate({to:'/analisis'}));assert.match(document.body.textContent,/Escenarios de estrés en euros/);assert.ok(!document.body.textContent.includes('CSV con separador'));
});

test('UI: fund templates preserve the person and open their normal portfolio with its historical fund sheet',async()=>{
 await reset(healthyAnswers(),6);
 window.prestafin.fundHistory=async({id})=>{const {productById}=await import('../../desktop-runtime/investment-products.mjs');const p=productById(id);return {ok:true,series:{instrument:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:'EUR',provider:'test'},points:[{d:'2023-12-29',c:100,a:100},{d:'2024-12-31',c:110,a:110},{d:'2025-12-31',c:121,a:121}],dividends:[],splits:[],meta:{provider:'test',providerLabel:'Datos sintéticos de prueba',currency:'EUR',frequency:'daily',firstDate:'2023-12-29',lastDate:'2025-12-31',pointCount:3,fetchedAt:'2026-10-29T00:00:00Z',adjusted:true,quality:'real'}}};};
 await click('Generar borrador de inversión');const original=captured.portfolios.active.id,person=captured.people.active.id;
 assert.match(document.body.textContent,/Reparto entre renta variable y renta fija/);
 await selectTab('15 carteras de fondos');assert.equal(document.querySelectorAll('.fund-model').length,15);
 const first=[...document.querySelectorAll('.fund-model button')].find(b=>b.textContent==='Crear propuesta con este modelo'&&!b.disabled);assert.ok(first);await action(()=>first.click());
 assert.equal(captured.people.active.id,person);assert.notEqual(captured.portfolios.active.id,original);assert.ok(captured.portfolios.portfolios.some(p=>p.id===original));
 assert.equal(captured.portfolios.active.proposal.kind,'objective');assert.equal(captured.portfolios.active.proposal.fundedToday,0);assert.ok(captured.portfolios.active.holdings.every(h=>h.meta.isin));
 const view=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Ver ficha'));assert.ok(view);await action(()=>view.click());
 assert.match(document.body.textContent,/Rentabilidades por periodo/);assert.match(document.body.textContent,/Datos sintéticos de prueba/);assert.match(document.body.textContent,/Rentabilidades mensuales/);
 await action(()=>captured.portfolios.saveNow());assert.ok(saved.people.find(p=>p.id===person).portfolios.find(p=>p.id===captured.portfolios.active.id));
});

test('UI: missing daily prices preserves sourced annual history without inventing monthly data or NAV',async()=>{
 await reset(healthyAnswers(),6);queryClient.clear();window.prestafin.fundHistory=async()=>({ok:false,symbol:'IE00B03HD191',error:'Proveedor de prueba sin conexión'});
 await click('Generar borrador de inversión');await selectTab('Fichas de fondos');
 assert.match(document.body.textContent,/Proveedor de prueba sin conexión/);assert.match(document.body.textContent,/Histórico diario no disponible/);assert.ok(!document.body.textContent.includes('Rentabilidades mensuales (%)'));
 assert.match(document.body.textContent,/Pendiente de datos/);assert.equal(document.querySelectorAll('.fund-published-table tbody tr').length,10);assert.match(document.querySelector('.fund-published').textContent,/no incluyen 2026/);assert.equal(document.querySelector('.fund-published a').href,'https://fund-docs.vanguard.com/ie00b03hd191-en.pdf');
});
