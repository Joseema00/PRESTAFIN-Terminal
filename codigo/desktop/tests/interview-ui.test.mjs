import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync,readFileSync,writeFileSync,mkdirSync } from 'node:fs';
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
    if(url.endsWith('.png'))return {format:'module',source:'export default '+JSON.stringify('data:image/png;base64,'+readFileSync(fileURLToPath(url)).toString('base64'))+';',shortCircuit:true};
    if(url.endsWith('.css'))return {format:'module',source:'export default {};',shortCircuit:true};
    if(url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
    return next(url,context);
  }
});
const React=await import('react'),{act,createElement:h}=React;
const {createRoot}=await import('react-dom/client');
const {createRootRoute,createRoute,createRouter,createMemoryHistory,RouterProvider,Outlet,useRouterState}=await import('@tanstack/react-router');
const store=await import('../../desktop-ui/use-portfolios.ts');
const {InterviewPage}=await import('../../desktop-ui/interview.tsx');
const {PersonPage}=await import('../../desktop-ui/people.tsx');
const {AnalysisPage}=await import('../../desktop-ui/analysis.tsx');
const {PortfolioLab}=await import('../../src/components/app/portfolio-lab.tsx');
const {ReportsPage}=await import('../../desktop-ui/reports.tsx');
const {BillingProvider,BillingPage,BillingGate}=await import('../../desktop-ui/billing.tsx');
const {FundExplorer}=await import('../../desktop-ui/funds.tsx');
const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
const queryClient=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
const {QUESTIONS}=await import('../../desktop-runtime/risk-profile.mjs');
const {productById}=await import('../../desktop-runtime/investment-products.mjs');
const {newPerson,emptyWorkspace}=await import('../../desktop-runtime/people.mjs');
const {validateWorkspace}=await import('../workspace.mjs');
let saved=null,imported=null,failSave=false,saveGate=null,captured;
window.prestafin={loadWorkspace:async()=>null,saveWorkspace:async value=>{if(saveGate)await saveGate;if(failSave)throw new Error('No se pudo escribir el archivo de prueba');saved=validateWorkspace(structuredClone(value));return {savedAt:Date.now()};},importWorkspace:async()=>imported};
await store.initializeWorkspace();
function Shell(){captured={people:store.usePeople(),interviews:store.useInterviews(),portfolios:store.usePortfolios(),models:store.useModelLibrary()};const pathname=useRouterState({select:s=>s.location.pathname});return h('main',{className:'terminal-main'},h('div',{key:pathname==='/suscripcion'?'account':captured.people.active?.id+':'+captured.people.epoch},h(Outlet)));}
const rootRoute=createRootRoute({component:Shell});
const routeTree=rootRoute.addChildren([createRoute({getParentRoute:()=>rootRoute,path:'/suscripcion',component:()=>h(BillingProvider,null,h(BillingPage))}),createRoute({getParentRoute:()=>rootRoute,path:'/informes',component:ReportsPage}),createRoute({getParentRoute:()=>rootRoute,path:'/fondos',component:()=>h(QueryClientProvider,{client:queryClient},h(FundExplorer))}),createRoute({getParentRoute:()=>rootRoute,path:'/entrevista',component:InterviewPage}),createRoute({getParentRoute:()=>rootRoute,path:'/persona',component:()=>h(QueryClientProvider,{client:queryClient},h(PersonPage))}),createRoute({getParentRoute:()=>rootRoute,path:'/analisis',component:()=>h(QueryClientProvider,{client:queryClient},h(AnalysisPage))}),createRoute({getParentRoute:()=>rootRoute,path:'/portfolio-lab',component:()=>h(QueryClientProvider,{client:queryClient},h(PortfolioLab))})]);
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
  const person=newPerson('Persona sintética');person.profile.cash=typeof answers.savings==='number'?answers.savings:0;const now=Date.now();person.interviews=[{id:crypto.randomUUID(),alias:'Entrevista de prueba',createdAt:now,updatedAt:now,step,revision:1,rulesVersion:1,answers}];person.activeInterviewId=person.interviews[0].id;
  imported={...emptyWorkspace(),people:[person],activePersonId:person.id};
  await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/entrevista'});});
  return person;
}
after(async()=>{await act(async()=>root.unmount());queryClient.clear();await browser.happyDOM.abort();browser.close();});

test('UI model assignment: short horizon shows its limit; reviewing genuine answers changes the model and preserves the original',async()=>{
 await reset({...healthyAnswers(),horizon:'short',initial:150,maxLoss:50});
 await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));
 let panel=document.querySelector('[aria-label="Modelo según entrevista"]');assert.ok(panel);
 assert.match(panel.textContent,/Monetario EUR 100/);assert.match(panel.textContent,/Antes de 3 años/);assert.match(panel.textContent,/parte defensiva/);
 assert.match(panel.textContent,/1,50/);assert.match(panel.textContent,/0,30/);assert.match(panel.textContent,/150,00/);
 await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.portfolios.length,2);assert.equal(captured.models.ownModels.length,0);
 const original=captured.portfolios.active.id;
 await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.active.id,original);assert.equal(captured.portfolios.portfolios.length,2);
 await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));panel=document.querySelector('[aria-label="Modelo según entrevista"]');
 await action(()=>panel.querySelector('.risk-decision a').click());assert.equal(captured.interviews.active.step,0);
 await action(()=>captured.interviews.answer(captured.interviews.active.id,'horizon','verylong'));await action(()=>captured.interviews.answer(captured.interviews.active.id,'maxLoss',75));
 await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));assert.match(document.querySelector('.assigned-model').textContent,/Global 100 \/ 0/);
 await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.active.proposal.equity,100);assert.equal(captured.portfolios.active.holdings.length,2);
 assert.equal(captured.portfolios.portfolios.find(p=>p.id===original).proposal.equity,0);
});

test('UI model assignment: failed save retries without duplicates, opens complete holdings and reloads saved evidence',async()=>{
 const person=await reset(healthyAnswers());await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));
 const count=captured.portfolios.portfolios.length,oldActive=captured.portfolios.active.id;
 const panel=document.querySelector('.assigned-model');assert.equal(panel.querySelectorAll('.assigned-fund').length,2);assert.match(panel.textContent,/100 % renta variable/);
 failSave=true;await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.portfolios.length,count+1);assert.equal(captured.models.ownModels.length,0);assert.equal(captured.portfolios.active.id,oldActive);assert.match(panel.textContent,/No se pudo escribir/);
 failSave=false;await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.portfolios.length,count+1);assert.equal(captured.portfolios.active.proposal.modelAssignment.id,'fund-global-100');assert.equal(captured.portfolios.active.holdings.length,2);
 const archive=validateWorkspace(structuredClone(saved));assert.equal(archive.people.find(p=>p.id===person.id).portfolios.length,count+1);
 imported=archive;await action(()=>store.restoreWorkspace());assert.equal(captured.portfolios.active.proposal.modelAssignment.id,'fund-global-100');
 await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.portfolios.length,count+1);
});

test('UI model assignment: protection and capacity block saving; delayed save never navigates into another client',async()=>{
 await reset({...healthyAnswers(),guarantee:'required'});await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));assert.equal(button('Asignar y guardar esta cartera').disabled,true);
 const person=await reset(healthyAnswers());person.portfolios=Array.from({length:250},(_,i)=>({...person.portfolios[0],id:'limit-model-'+i,name:'Cartera '+i}));person.activeId=person.portfolios[0].id;
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}});});
 await click('Asignar y guardar esta cartera');assert.equal(captured.portfolios.portfolios.length,250);assert.equal(captured.models.ownModels.length,0);assert.match(document.body.textContent,/límite de carteras/);
 await reset(healthyAnswers());await action(()=>router.navigate({to:'/portfolio-lab',search:{panel:'automatica'}}));
 let release;saveGate=new Promise(resolve=>{release=resolve;});await click('Asignar y guardar esta cartera');const firstId=captured.people.active.id;
 await action(()=>captured.people.create('Otro cliente sintético'));const nextId=captured.people.active.id;await action(async()=>{release();await tick();});saveGate=null;
 assert.notEqual(firstId,nextId);assert.equal(captured.people.active.id,nextId);assert.equal(captured.portfolios.portfolios.length,1);
});

test('UI: fill all six blocks with real input/radio events, generate without review and open the saved portfolio',async()=>{
  await reset();const answers={...healthyAnswers(),initial:20000.01};await action(()=>captured.portfolios.setProfile({...captured.portfolios.profile,cash:answers.savings}));
  for(let step=0;step<6;step++){
    for(const q of QUESTIONS.filter(q=>q.step===step&&!q.optional)){
      if(q.kind==='money')await input(q.id,String(answers[q.id]).replace('.',','));
      else await action(()=>{const radio=document.querySelector('input[name="'+q.id+'"][value="'+answers[q.id]+'"]');assert.ok(radio,q.id);radio.click();});
    }
    await click(step===5?'Ver resultado':'Siguiente bloque');
  }
  assert.equal(captured.interviews.active.answers.initial,20000.01);assert.equal(captured.interviews.active.review,undefined);
  assert.ok(captured.interviews.active.generated);assert.equal(captured.portfolios.active.proposal.modelAssignment.method,'automatic');
  assert.equal(button('Abrir cartera creada').disabled,false);
  await click('Abrir cartera creada');assert.equal(router.state.location.pathname,'/portfolio-lab');
  const id=captured.portfolios.active.id;assert.ok(Math.abs(captured.portfolios.active.holdings.reduce((s,h)=>s+h.amount,0)-20000.01)<1e-8);
  assert.equal(saved.people[0].activeId,id);assert.equal(saved.people[0].interviews[0].generated.kind,'investment');
  await action(()=>router.navigate({to:'/entrevista'}));await click('Abrir cartera creada');assert.equal(captured.portfolios.active.id,id);assert.equal(captured.portfolios.portfolios.length,2);
});
test('UI: the objective portfolio opens concrete products, preserves its conditions and persists the snapshot',async()=>{
  await reset({...healthyAnswers(),savings:6000},6);
  assert.match(document.body.textContent,/Modelo propuesto/);
  await click('Generar cartera objetivo');assert.equal(router.state.location.pathname,'/portfolio-lab');
  assert.match(document.body.textContent,/CARTERA OBJETIVO/);assert.ok(captured.portfolios.active.proposal.positions.every(x=>productById(x.assetId).vehicle==='Fondo'));
  assert.equal(captured.portfolios.active.proposal.fundedToday,0);assert.equal(captured.portfolios.active.proposal.fundingGap,28000);
  assert.equal(saved.people[0].interviews[0].generated.kind,'objective');assert.deepEqual(saved.people[0].portfolios.at(-1).proposal,captured.portfolios.active.proposal);
});
test('UI: product selection controls recalculate, save settings and create a new version',async()=>{
 await reset(healthyAnswers(),6);const select=document.querySelector('select[aria-label="Criterio de selección"]');
 assert.equal(select.disabled,true);assert.equal(select.value,'funds');
 await click('Generar borrador de inversión');assert.ok(captured.portfolios.active.proposal.positions.every(x=>productById(x.assetId).vehicle==='Fondo'));assert.ok(captured.portfolios.active.proposal.modelAssignment);
 const original=captured.portfolios.active.id;await action(()=>router.navigate({to:'/entrevista'}));
 const variant=document.querySelector('select[aria-label="Reparto de riesgo"]');await action(()=>{variant.value='cautious';variant.dispatchEvent(new Event('change',{bubbles:true}));});
 await click('Generar borrador de inversión');assert.notEqual(captured.portfolios.active.id,original);assert.ok(captured.portfolios.active.proposal.equity<=50);assert.equal(captured.portfolios.portfolios.length,3);
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

async function selectTab(text){let el=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent===text);if(!el){const groups={"Composición":"Construir","Cartera automática":"Construir","Modelos de cartera":"Construir","Optimización":"Construir","Criterios del cliente":"Construir","Riesgo y correlaciones":"Analizar","Escenarios de estrés":"Analizar","Monte Carlo":"Analizar","Benchmark":"Analizar","Proyección y costes":"Analizar","Seguimiento":"Gestionar","Rebalanceo":"Gestionar","Comparar":"Gestionar","Fichas de fondos":"Gestionar"};await action(()=>[...document.querySelectorAll('.portfolio-group-navigation button')].find(b=>b.textContent===groups[text])?.click());el=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent===text);}assert.ok(el,'Missing tab '+text);await action(()=>{el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));el.click();});}

test('UI: continuous study survives save, native roundtrip, reopening and PDF with original inputs',async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');
 const original=structuredClone(captured.portfolios.active);await selectTab('Optimización');
 assert.match(document.body.textContent,/MODO AVANZADO · AUTOMÁTICO/);
 await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.equal(document.querySelector('.optimization-error')?.textContent,undefined);
 await click('Guardar versión del estudio');await action(()=>captured.portfolios.saveNow());
 const studyPortfolio=structuredClone(captured.portfolios.active),study=studyPortfolio.optimizationStudy;
 assert.ok(study);assert.equal(studyPortfolio.mode,'draft');assert.equal(studyPortfolio.tracking,undefined);
 assert.deepEqual(captured.portfolios.portfolios.find(p=>p.id===original.id),original);
 assert.equal(study.input.limits.filter(l=>l.name.startsWith('Cuestionario · ')).length,2);
 assert.deepEqual(saved.people[0].portfolios.find(p=>p.id===studyPortfolio.id).optimizationStudy,study);
 imported=structuredClone(saved);await action(()=>store.restoreWorkspace());await selectTab('Optimización');
 const oldWorker=globalThis.Worker;let workerStarts=0;globalThis.Worker=class{constructor(){workerStarts++;throw new Error('Worker unavailable');}};
 try{await click('Ver estudio guardado');assert.equal(workerStarts,0);}finally{globalThis.Worker=oldWorker;}
 assert.equal(button('Guardar versión del estudio').disabled,true);assert.match(document.body.textContent,/no necesita conexión/);
 assert.equal(document.querySelector('.optimization-error')?.textContent,undefined);
 const {buildProfessionalReport,professionalPDF}=await import('../../desktop-ui/professional-report.ts');
 const {DEFAULT_ADVISER,DEFAULT_REPORT}=await import('../../desktop-runtime/adviser.mjs');
 const report=buildProfessionalReport(captured.people.active,DEFAULT_ADVISER,{...DEFAULT_REPORT,charts:[...DEFAULT_REPORT.charts,'optimizationFrontier','optimizationRisk']});
 const block=report.blocks.find(b=>b.title==='Estudio de construcción y optimización');assert.ok(block);
 assert.match(block.text.join(' '),/cifras originales/);assert.deepEqual(block.charts[0].series[0].values,study.result.frontier.map(p=>p.mean));
 assert.equal(block.rows.length,study.input.ids.length);assert.ok(professionalPDF(report).output('arraybuffer').byteLength>10000);
});

test('UI: zero turnover is explicit, impossible bounds block saving and source mandate cannot be dropped',async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');await selectTab('Optimización');
 await action(()=>document.querySelector('.optimization-settings summary').click());
 const number=async(label,value)=>action(()=>{const el=[...document.querySelectorAll('input')].find(e=>e.getAttribute('aria-label')===label);assert.ok(el,label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});
 await number('Rotación máxima (%)','0');await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.match(document.body.textContent,/conservar exactamente los pesos actuales/);
 const {optimizeContinuous,OPTIMIZER_VERSION}=await import('../../desktop-runtime/optimization.mjs');
 const source=captured.portfolios.active,holdings=source.holdings.filter(h=>h.amount>0),total=holdings.reduce((s,h)=>s+h.amount,0),n=holdings.length;
 const input={ids:holdings.map(h=>h.assetId),names:holdings.map(h=>h.assetId),means:Array(n).fill(1),cov:Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?100:0)),currentWeights:holdings.map(h=>h.amount/total),riskFree:0,method:'minVariance',source:'Synthetic',basis:'assumptions',maxTurnover:0};
 assert.throws(()=>captured.portfolios.createOptimizationStudy(source.id,{version:OPTIMIZER_VERSION,createdAt:Date.now(),input,result:optimizeContinuous(input)}),/mandato/);
 const labels=[...document.querySelectorAll('input[aria-label^="Máximo "]')].map(e=>e.getAttribute('aria-label')).filter(l=>!l.includes('(%)'));
 for(const label of labels)await number(label,'0');await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,50)));
 assert.match(document.querySelector('.optimization-error').textContent,/100 %/);assert.ok(![...document.querySelectorAll('button')].some(b=>b.textContent==='Guardar versión del estudio'));
});

test('legacy helpers respect explicit maximum weights and risk-parity definition',async()=>{
 const {clampWeights}=await import('../../src/lib/portfolio.ts');const {riskParityWeights}=await import('../../src/lib/portfolio-advanced.ts');
 const w=clampWeights([.99,.005,.005],0,.4);assert.ok(w.every(v=>v<=.4));assert.ok(Math.abs(w.reduce((s,v)=>s+v,0)-1)<1e-12);
 assert.throws(()=>clampWeights([.5,.5],0,.4),/incompatibles/);
 const rp=riskParityWeights([[.04,0],[0,.09]]);assert.ok(Math.abs(rp[0]-.6)<1e-6);
 assert.throws(()=>riskParityWeights([[.04,0],[0,.09]],.55),/incumple/);
});

test('classification uses exact ISIN identity and never guesses an unknown fund from its name or vehicle',async()=>{
 const {holdingProduct,positionRisk}=await import('../../src/lib/holding-classification.ts');
 const known={assetId:'market-FR0011176635',amount:1000,meta:{symbol:'FR0011176635',isin:'FR0011176635',name:'Nombre del proveedor',kind:'Fondo',currency:'EUR'}};
 assert.equal(holdingProduct(known).id,'fund-amundi-money');assert.equal(positionRisk(known).role,'overnight');assert.equal(positionRisk(known).id,known.assetId);
 assert.equal(positionRisk({...known,planningRole:'equity'}).role,'overnight');
 const unknown={assetId:'market-test',amount:1000,meta:{symbol:'UNKNOWN.TEST',name:'Fondo de bonos aparentemente monetario',kind:'Fondo',currency:'EUR'}};
 assert.equal(positionRisk(unknown),null);assert.equal(positionRisk({...unknown,meta:{...unknown.meta,kind:'ETF'}}),null);
 assert.equal(positionRisk({...unknown,meta:{...unknown.meta,kind:'Acción'}}).role,'equity');
 assert.equal(positionRisk({...unknown,meta:{...unknown.meta,cls:'gold'}}),null);
 assert.equal(positionRisk({...unknown,planningRole:'short'}).role,'short');
 assert.equal(holdingProduct({...known,meta:{...known.meta,isin:'IE00B03HD192'}}),undefined,'a different share-class ISIN must not use the symbol as a fallback');
});

test('UI: complete a missing planning block, preserve settings, calculate and persist the choice with the account',async()=>{
 const person=newPerson('Clasificación sintética'),portfolio=person.portfolios[0];
 portfolio.holdings=[{assetId:'market-FR0011176635',amount:1000,meta:{symbol:'FR0011176635',isin:'FR0011176635',name:'Monetario identificado',kind:'Fondo',currency:'EUR'}},{assetId:'market-UNKNOWN.TEST',amount:1000,meta:{symbol:'UNKNOWN.TEST',name:'Fondo sintético sin clasificar',kind:'Fondo',currency:'EUR'}}];
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};window.prestafin.marketBundle=async()=>{throw new Error('Synthetic offline');};queryClient.clear();
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab'});});await selectTab('Optimización');
 assert.equal(button('Calcular cartera avanzada').disabled,false);assert.match(document.querySelector('.exposure-review').textContent,/1 por completar/);
 assert.equal(document.querySelectorAll('select[aria-label^="Bloque de planificación de "]').length,1);
 await action(()=>{const select=document.querySelector('[aria-label="Objetivo avanzado"]');select.value='equal';select.dispatchEvent(new Event('change',{bubbles:true}));});
 await action(()=>{const select=document.querySelector('[aria-label="Bloque de planificación de Fondo sintético sin clasificar"]');select.value='equity';select.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(button('Calcular cartera avanzada').disabled,false);assert.equal(document.querySelector('[aria-label="Objetivo avanzado"]').value,'equal');
 assert.throws(()=>captured.portfolios.setPlanningRole(portfolio.id,'market-FR0011176635','equity'),/identificada/);
 await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));assert.equal(document.querySelector('.optimization-error'),null);
 await click('Guardar versión del estudio');await action(()=>captured.portfolios.saveNow());
 const id=captured.portfolios.active.id,study=captured.portfolios.active.optimizationStudy;
 assert.equal(study.input.method,'equal');assert.match(study.input.source,/bloques elegidos por el usuario/);assert.equal(captured.portfolios.active.holdings.find(h=>h.assetId==='market-UNKNOWN.TEST').planningRole,'equity');
 imported=structuredClone(saved);await action(()=>store.restoreWorkspace());await selectTab('Optimización');await click('Ver estudio guardado');
 assert.equal(captured.portfolios.active.id,id);assert.equal(document.querySelector('[aria-label="Bloque de planificación de Fondo sintético sin clasificar"]').value,'equity');assert.deepEqual(captured.portfolios.active.optimizationStudy,study);
 const invalid=structuredClone(saved);invalid.people[0].portfolios[0].holdings[1].planningRole='invented';assert.throws(()=>validateWorkspace(invalid),/Bloque de planificación no válido/);
 await action(()=>captured.portfolios.setPlanningRole(id,'market-UNKNOWN.TEST',null));assert.equal(button('Calcular cartera avanzada').disabled,false);
 assert.equal(captured.portfolios.active.optimizationStudy.createdAt,study.createdAt,'the original saved calculation stays intact');
});

test('UI: an unclassified manual portfolio can use actual common history without inventing blocks',async()=>{
 const person=reportPerson();imported={...emptyWorkspace(),people:[person],activePersonId:person.id};queryClient.clear();
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab'});});await selectTab('Optimización');
 assert.equal(button('Calcular cartera avanzada').disabled,true);await click('Usar histórico para esta cartera');assert.equal(button('Calcular cartera avanzada').disabled,false);
 await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));assert.equal(document.querySelector('.optimization-error'),null);
 await click('Guardar versión del estudio');assert.equal(captured.portfolios.active.optimizationStudy.input.basis,'history');assert.ok(captured.portfolios.active.holdings.every(h=>h.planningRole===undefined));
});

test('optimization runner recovers from worker launch errors and cancellation suppresses stale results',async()=>{
 const {startOptimization}=await import('../../desktop-ui/optimization-runner.ts');
 const input={ids:['a','b'],names:['A','B'],means:[6,10],cov:[[400,0],[0,900]],currentWeights:[.5,.5],riskFree:2,method:'minVariance',source:'Synthetic worker test',basis:'assumptions'};
 let falls=0;
 const result=await new Promise((resolve,reject)=>startOptimization(input,{done:resolve,error:reject,fallback:()=>falls++},()=>{throw new Error('Launch blocked');}));
 assert.equal(falls,1);assert.ok(Math.abs(result.point.weights[0]-900/1300)<1e-6);
 let finished=false;const cancel=startOptimization(input,{done:()=>{finished=true;},error:()=>{finished=true;}},()=>{throw new Error('Unavailable');});cancel();await new Promise(r=>setTimeout(r,60));assert.equal(finished,false);
 let fake,terminated=0,fallbacks=0;
 const forwarded=new Promise(resolve=>startOptimization(input,{done:()=>assert.fail('Numerical errors must not be hidden'),error:resolve,fallback:()=>fallbacks++},()=>fake={terminate:()=>terminated++,postMessage:()=>{}}));
 fake.onmessage({data:{error:'Restricciones incompatibles'}});assert.equal(await forwarded,'Restricciones incompatibles');assert.equal(fallbacks,0);assert.equal(terminated,1);
 const recovered=new Promise((resolve,reject)=>startOptimization(input,{done:resolve,error:reject,fallback:()=>fallbacks++},()=>fake={terminate:()=>terminated++,postMessage:()=>{}}));
 fake.onerror({preventDefault(){}});assert.ok((await recovered).point);assert.equal(fallbacks,1);
});

test('optimization save retries are idempotent and a proportional capital change requires recalculation',async()=>{
 await reset();let original;await action(()=>{original=captured.portfolios.create('Synthetic capital',[{assetId:'a',amount:5000},{assetId:'b',amount:5000}]);});
 const {optimizeContinuous,OPTIMIZER_VERSION}=await import('../../desktop-runtime/optimization.mjs');
 const input={ids:['a','b'],names:['A','B'],means:[6,10],cov:[[400,0],[0,900]],currentWeights:[.5,.5],riskFree:2,method:'minVariance',source:'Synthetic',basis:'assumptions'};
 const study={version:OPTIMIZER_VERSION,createdAt:Date.now(),capital:10000,input,result:optimizeContinuous(input)};
 let id;await action(()=>{id=captured.portfolios.createOptimizationStudy(original.id,study);});const count=captured.portfolios.portfolios.length;
 await action(()=>assert.equal(captured.portfolios.createOptimizationStudy(original.id,study),id));assert.equal(captured.portfolios.portfolios.length,count);
 await action(()=>captured.portfolios.setHoldings(original.id,[{assetId:'a',amount:10000},{assetId:'b',amount:10000}]));
 assert.throws(()=>captured.portfolios.createOptimizationStudy(original.id,study),/capital cambió/);
});

test('portfolio tool navigation accepts only known panels and includes every existing tool',async()=>{
 const {portfolioSearch,PORTFOLIO_GROUPS,normalized}=await import('../../desktop-ui/navigation.ts');
 assert.deepEqual(portfolioSearch({panel:'riesgo'}),{panel:'riesgo'});assert.deepEqual(portfolioSearch({panel:'missing'}),{});assert.deepEqual(portfolioSearch({panel:{}}),{});
 assert.equal(PORTFOLIO_GROUPS.flatMap(g=>g.tools).length,14);assert.equal(normalized('  Optimización  '),'optimizacion');
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');await selectTab('Optimización');
 assert.equal(router.state.location.search.panel,'optimizacion');await selectTab('Seguimiento');assert.equal(router.state.location.search.panel,'seguimiento');
});

test('UI shell: keyboard search opens the exact tool and Escape restores focus',{timeout:15000},async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');
 const {Shell:WorkspaceShell}=await import('../../desktop-ui/shell.tsx'),{BillingContext}=await import('../../desktop-ui/billing.tsx'),{portfolioSearch}=await import('../../desktop-ui/navigation.ts');
 const route=createRootRoute({component:()=>h(BillingContext.Provider,{value:{state:{configured:false,email:null,eligible:true,subscription:null},loading:false,error:'',refresh:async()=>{}}},h(WorkspaceShell))});
 const routes=['/','/persona','/entrevista','/portfolio-lab','/fondos','/mi-patrimonio','/simulador','/informes','/cuenta','/suscripcion'].map(path=>createRoute({getParentRoute:()=>route,path,...(path==='/portfolio-lab'?{validateSearch:portfolioSearch}:{}),component:()=>h('p',null,'Synthetic route content')}));
 const r=createRouter({routeTree:route.addChildren(routes),history:createMemoryHistory({initialEntries:['/persona']})});
 const node=document.createElement('div');document.body.append(node);const ui=createRoot(node);
 try{
  await act(async()=>{ui.render(h(RouterProvider,{router:r}));await r.load();});
  assert.equal(node.querySelectorAll('.client-journey li').length,5);assert.ok(node.querySelector('.client-journey').textContent.includes(captured.people.active.name));const search=node.querySelector('.command-button');await action(()=>search.click());
  let field=node.querySelector('[aria-label="Buscar una función"]');assert.ok(document.activeElement===field,'Search input receives focus');
  await action(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,'correlacion');field.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(node.querySelectorAll('.command-result').length,1);
  await action(()=>field.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  assert.equal(r.state.location.pathname,'/portfolio-lab');assert.equal(r.state.location.search.panel,'riesgo');assert.equal(Boolean(node.querySelector('[role="dialog"]')),false);
  await action(()=>search.click());field=node.querySelector('[aria-label="Buscar una función"]');
  await action(()=>field.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.ok(document.activeElement===search,'Escape restores focus to the search button');
  await action(()=>node.querySelector('.sidebar-help').click());assert.equal(node.querySelectorAll('.workspace-guide li').length,4);
 }finally{await act(async()=>ui.unmount());node.remove();document.documentElement.classList.remove('dark');}
});

test('UI: removing a position reuses compatible saved history and new study versions retain their historical series',async()=>{
 await reset(healthyAnswers(),6);const {syntheticBundle}=await import('./fixtures/market.mjs');window.prestafin.marketBundle=async({symbols})=>syntheticBundle(symbols);
 await click('Generar borrador de inversión');await selectTab('Riesgo y correlaciones');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.ok(captured.people.active.histories?.length);
 await selectTab('Optimización');await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));await click('Guardar versión del estudio');
 const current=captured.portfolios.active;assert.ok(captured.people.active.histories.some(h=>h.portfolioId===current.id));
 const kept=current.holdings.filter(h=>h.amount>0).slice(0,1);await action(()=>captured.portfolios.setHoldings(current.id,kept));
 window.prestafin.marketBundle=async()=>{throw new Error('Synthetic offline');};queryClient.clear();await selectTab('Riesgo y correlaciones');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);assert.ok(!document.body.textContent.includes('no cubre todos sus activos'));
});

test('UI: advanced studies keep unfunded objectives unfunded across generations and omit projection charts',async()=>{
 await reset({...healthyAnswers(),savings:6000},6);await click('Generar cartera objetivo');
 for(let i=0;i<2;i++){
  await selectTab('Optimización');await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));
  assert.equal(document.querySelector('.optimization-error')?.textContent,undefined);
  await click('Guardar versión del estudio');assert.equal(captured.portfolios.active.optimizationStudy.unfundedObjective,true);
 }
 const {buildProfessionalReport}=await import('../../desktop-ui/professional-report.ts'),{DEFAULT_ADVISER,DEFAULT_REPORT}=await import('../../desktop-runtime/adviser.mjs');
 const r=buildProfessionalReport(captured.people.active,DEFAULT_ADVISER,DEFAULT_REPORT);
 assert.match(r.blocks.find(b=>b.section==='costs').text.join(' '),/Proyección de acumulación omitida/);
 assert.ok(!r.blocks.flatMap(b=>b.charts??[]).some(c=>c.id==='costs'));
});

test('UI: an aggregate account valuation preserves recorded allocation weights when creating a study',async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');
 const positionCapital=captured.portfolios.active.holdings.reduce((s,h)=>s+h.amount,0);
 const previousWeights=captured.portfolios.active.holdings.map(h=>h.amount/positionCapital);
 await action(()=>captured.portfolios.registerInvestment(captured.portfolios.active.id,false,'2026-01-01'));
 await action(()=>captured.portfolios.recordValuation(captured.portfolios.active.id,{date:'2026-02-01',value:23000,netFlow:0,note:'Synthetic account valuation'}));
 await selectTab('Optimización');await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.equal(document.querySelector('.optimization-error')?.textContent,undefined);
 await click('Guardar versión del estudio');const c=captured.portfolios.active;
 assert.ok(Math.abs(c.optimizationStudy.input.currentWeights.reduce((s,w)=>s+w,0)-1)<1e-9);
 c.optimizationStudy.input.currentWeights.forEach((w,i)=>assert.ok(Math.abs(w-previousWeights[i])<1e-10));
 assert.ok(Math.abs(c.holdings.reduce((s,h)=>s+h.amount,0)-23000)<1e-6);
});
test('UI: generated portfolios retain normal tabs, download risk data without CSV and keep the optimization version',async()=>{
 await reset({...healthyAnswers(),optimizationGoal:'sharpe'},6);const {syntheticBundle}=await import('./fixtures/market.mjs');let downloads=0;
 window.prestafin.marketBundle=async({symbols})=>{downloads++;return syntheticBundle(symbols);};
 await click('Generar borrador de inversión');
 for(const text of ['Composición','Optimización','Riesgo y correlaciones','Monte Carlo','Rebalanceo','Seguimiento'])await selectTab(text);
 await selectTab('Riesgo y correlaciones');await action(async()=>{await new Promise(r=>setTimeout(r,50));});
 assert.ok(downloads>0);assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);assert.ok(saved.people[0].histories.length);
 assert.ok(!document.body.textContent.includes('Importar un histórico'));assert.equal(document.querySelector('textarea'),null);
 await selectTab('Optimización');await action(()=>[...document.querySelectorAll('summary')].find(s=>s.textContent.startsWith('Malla clásica (5 %)')).click());const previous=captured.portfolios.active.id;await click('Guardar como nueva versión');
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
 await action(()=>router.navigate({to:'/analisis'}));assert.match(document.body.textContent,/HISTÓRICO POR PRODUCTO/);await click('Ver hipótesis de planificación');assert.match(document.body.textContent,/Escenarios de estrés en euros/);assert.ok(!document.body.textContent.includes('CSV con separador'));
});

test('UI: fund templates preserve the person and open their normal portfolio with its historical fund sheet',async()=>{
 await reset(healthyAnswers(),6);
 window.prestafin.fundHistory=async({id})=>{const {productById}=await import('../../desktop-runtime/investment-products.mjs');const p=productById(id);return {ok:true,series:{instrument:{symbol:p.isin,isin:p.isin,name:p.name,kind:'Fondo',currency:'EUR',provider:'test'},points:[{d:'2023-12-29',c:100,a:100},{d:'2024-12-31',c:110,a:110},{d:'2025-12-31',c:121,a:121}],dividends:[],splits:[],meta:{provider:'test',providerLabel:'Datos sintéticos de prueba',currency:'EUR',frequency:'daily',firstDate:'2023-12-29',lastDate:'2025-12-31',pointCount:3,fetchedAt:'2026-10-29T00:00:00Z',adjusted:true,quality:'real'}}};};
 await click('Generar borrador de inversión');const original=captured.portfolios.active.id,person=captured.people.active.id;
 assert.match(document.body.textContent,/Reparto entre renta variable y renta fija/);
 await selectTab('Modelos de cartera');assert.equal(document.querySelectorAll('.fund-model').length,16);
 const first=[...document.querySelectorAll('.fund-model button')].find(b=>b.textContent==='Asignar este modelo'&&!b.disabled);assert.ok(first);await action(()=>first.click());
 assert.equal(captured.people.active.id,person);assert.notEqual(captured.portfolios.active.id,original);assert.ok(captured.portfolios.portfolios.some(p=>p.id===original));
 assert.equal(captured.portfolios.active.proposal.kind,'investment');assert.equal(captured.portfolios.active.proposal.fundedToday,20000);assert.ok(captured.portfolios.active.holdings.every(h=>h.meta.isin));
 await selectTab('Modelos de cartera');const view=[...document.querySelectorAll('.fund-model-positions button')].find(b=>b.textContent.includes('Vanguard'));assert.ok(view);await action(()=>view.click());
 assert.match(document.body.textContent,/Rentabilidades por periodo/);assert.match(document.body.textContent,/Datos sintéticos de prueba/);assert.match(document.body.textContent,/Rentabilidades mensuales/);
 await action(()=>captured.portfolios.saveNow());assert.ok(saved.people.find(p=>p.id===person).portfolios.find(p=>p.id===captured.portfolios.active.id));
});

test('UI: missing daily prices preserves sourced annual history without inventing monthly data or NAV',async()=>{
 await reset(healthyAnswers(),6);queryClient.clear();window.prestafin.fundHistory=async()=>({ok:false,symbol:'IE00B03HD191',error:'Proveedor de prueba sin conexión'});
 await click('Generar borrador de inversión');await selectTab('Fichas de fondos');
 assert.match(document.body.textContent,/Proveedor de prueba sin conexión/);assert.match(document.body.textContent,/Histórico diario no disponible/);assert.ok(!document.body.textContent.includes('Rentabilidades mensuales (%)'));
 assert.match(document.body.textContent,/Pendiente de datos/);assert.equal(document.querySelectorAll('.fund-published-table tbody tr').length,10);assert.match(document.querySelector('.fund-published').textContent,/no incluyen 2026/);assert.equal(document.querySelector('.fund-published a').href,'https://fund-docs.vanguard.com/ie00b03hd191-en.pdf');
});


test('UI: questionnaire opens inside the person and produces a document instead of a portfolio result',async()=>{
 await reset(healthyAnswers(),6);await action(()=>router.navigate({to:'/persona'}));
 assert.ok(!document.body.textContent.includes('Entrevistas y seguimiento'));
 await click('Responder cuestionario');assert.equal(router.state.location.pathname,'/persona');
 assert.ok(document.querySelector('dialog'));assert.match(document.body.textContent,/PDF de las respuestas/);
 assert.ok(!document.body.textContent.includes('Generar borrador de inversión'));
 await click('Cerrar cuestionario');assert.equal(document.querySelector('dialog'),null);
 const expand=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Ampliar gráfico:'));
 assert.ok(expand);await action(()=>expand.click());assert.ok(document.querySelector('.chart-expanded'));
 await action(()=>window.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(document.querySelector('.chart-expanded'),null);
});

test('PDF of answers includes incomplete and long answers with page footers',async()=>{
 const {interviewPDF}=await import('../../desktop-ui/interview-pdf.ts');
  const {inflateSync}=await import('node:zlib');
  const logo='data:image/png;base64,'+readFileSync(new URL('../../src/assets/isotipo.png',import.meta.url)).toString('base64');
  const doc=interviewPDF({id:'test',alias:'Prueba',revision:2,updatedAt:Date.now(),answers:{...healthyAnswers(),income:undefined,[QUESTIONS.find(q=>q.kind==='text').id]:'Texto de prueba '.repeat(500)}},'Persona sintética',logo);
  const output=doc.output(),decoded=[...output.matchAll(/<<([\s\S]*?)>>\s*stream\r?\n/g)].filter(m=>!m[1].includes('/Subtype /Image')).map(m=>{const length=[...m[1].matchAll(/\/Length (\d+)/g)].at(-1);assert.ok(length);const start=m.index+m[0].length,bytes=Buffer.from(output.slice(start,start+Number(length[1])),'latin1');return (m[1].includes('/FlateDecode')?inflateSync(bytes):bytes).toString('latin1');}).join('\n');
  assert.ok(output.startsWith('%PDF-'));assert.ok(decoded.includes('Sin responder'));assert.ok(doc.getNumberOfPages()>1);assert.ok(decoded.includes('Documento personal'));assert.ok(decoded.includes('PRESTAFIN-TERMINAL'));assert.ok(output.includes('/Subtype /Image'));
});

const lookupProfile={isin:'LU0996182563',name:'Fondo de prueba USD distribución',currency:'USD',providerId:'12345',source:'https://markets.ft.com/data/funds/tearsheet/summary?s=LU0996182563%3AUSD',checkedAt:'2026-10-30T00:00:00Z',income:'Distribución',category:null,domicile:'Luxembourg',launchDate:null,ongoingCharge:null};
async function fundSearch(value){const el=document.querySelector('input[aria-label="Nombre o ISIN"]');await action(()=>{el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
async function openFunds(rows=[]){
 await action(()=>router.navigate({to:'/persona'}));queryClient.clear();
 window.prestafin.fundList=async()=>rows;
 window.prestafin.fundHistory=async({id})=>id!==lookupProfile.isin?{ok:false,symbol:id,error:'Sin datos de prueba'}:{ok:true,series:{instrument:{symbol:id,isin:id,name:lookupProfile.name,kind:'Fondo',currency:'USD',provider:'test'},points:[{d:'2023-12-29',c:100,a:100},{d:'2024-12-31',c:110,a:110},{d:'2025-12-31',c:121,a:121}],dividends:[],splits:[],meta:{provider:'test',providerLabel:'Fuente sintética de prueba',currency:'USD',frequency:'daily',firstDate:'2023-12-29',lastDate:'2025-12-31',pointCount:3,fetchedAt:'2026-10-30T00:00:00Z',adjusted:false,quality:'real'}}};
 await action(()=>router.navigate({to:'/fondos'}));
}
test('UI: pasted ISIN opens an external class, shows USD and excludes distributions, with no invented fee or duplicate',async()=>{
 await openFunds();let calls=0;window.prestafin.fundLookup=async isin=>{calls++;assert.equal(isin,lookupProfile.isin);return {ok:true,profile:lookupProfile};};
 await fundSearch(' lu0996 182563 ');await click('Buscar ISIN');await action(tick);
 assert.equal(document.querySelector('select[aria-label="Fondo seleccionado"]').value,lookupProfile.isin);
 assert.match(document.body.textContent,/121,00 USD/);assert.match(document.body.textContent,/no incluye distribuciones/);assert.match(document.body.textContent,/No facilitados/);assert.match(document.body.textContent,/sin conversión de divisa/);
 assert.match(document.body.textContent,/Rentabilidades mensuales/);assert.equal(document.querySelector('.fund-published'),null);
 await click('Buscar ISIN');assert.equal(calls,2);assert.match(document.querySelector('.terminal-chip').textContent,/9 fondos/);
 await openFunds([lookupProfile]);assert.ok([...document.querySelector('select[aria-label="Fondo seleccionado"]').options].some(o=>o.value===lookupProfile.isin));
});
test('UI: invalid and uncovered ISIN leave the current sheet intact and surface the reason',async()=>{
 await openFunds();let calls=0;window.prestafin.fundLookup=async()=>{calls++;return {ok:false,error:'Clase sin cobertura pública'};};
 const current=document.querySelector('select[aria-label="Fondo seleccionado"]').value;
 await fundSearch('LU0996182564');await click('Buscar ISIN');assert.equal(calls,0);assert.match(document.body.textContent,/dígito de control/);
 await fundSearch(lookupProfile.isin);await click('Buscar ISIN');assert.equal(calls,1);assert.match(document.body.textContent,/Clase sin cobertura pública/);
 assert.equal(document.querySelector('select[aria-label="Fondo seleccionado"]').value,current);assert.match(document.querySelector('.terminal-chip').textContent,/8 fondos/);
});
test('UI: a delayed ISIN response cannot overwrite a more recent manual selection',async()=>{
 await openFunds();let resolve;window.prestafin.fundLookup=()=>new Promise(r=>{resolve=r;});
 await fundSearch(lookupProfile.isin);await click('Buscar ISIN');assert.ok(button('Buscando ISIN…').disabled);
 const select=document.querySelector('select[aria-label="Fondo seleccionado"]');const selected=select.value;
 await action(()=>select.dispatchEvent(new Event('change',{bubbles:true})));
 await action(()=>resolve({ok:true,profile:lookupProfile}));assert.equal(select.value,selected);assert.match(document.querySelector('.terminal-chip').textContent,/8 fondos/);
});

function reportPerson(){
 const person=newPerson('Persona ficticia para comprobar informes');person.reference='PRUEBA-INFORMES';
 person.profile={cash:10000,otherAssets:180000,monthlyContribution:300};person.mortgage={principal:90000,rate:3.1,years:20,extraMonthly:100};
 const portfolio=person.portfolios[0];portfolio.name='Cuenta de prueba';portfolio.holdings=[{assetId:'a',amount:13800},{assetId:'b',amount:9200}];
 portfolio.tracking={valuations:[{date:'2024-01-31',value:20000,netFlow:0,note:'Saldo inicial sintético'},{date:'2024-12-31',value:22500,netFlow:2000,note:'Aportación de prueba'},{date:'2025-12-31',value:23000,netFlow:500,note:'Cierre de prueba'}]};
 person.wealthHistory=[{date:'2024-01-31',cash:7000,investments:20000,otherAssets:170000,debt:98000},{date:'2024-12-31',cash:9000,investments:22500,otherAssets:175000,debt:94000},{date:'2025-12-31',cash:10000,investments:23000,otherAssets:180000,debt:90000}];
 person.histories=[{portfolioId:portfolio.id,source:'Serie sintética exclusivamente para pruebas',importedAt:Date.UTC(2026,9,30),currency:'EUR',columns:['a','b'],rows:Array.from({length:100},(_,i)=>({month:new Date(Date.UTC(2017,i,1)).toISOString().slice(0,7),returns:[.02*Math.sin(i)+.004,.008*Math.cos(i)+.001]}))}];
 person.interviews=[{id:'test-interview',alias:'Presupuesto ficticio',createdAt:1,updatedAt:2,step:6,revision:1,rulesVersion:1,answers:healthyAnswers()}];person.activeInterviewId='test-interview';return person;
}
test('reports: personalized ordered sections, real account flows, historical reconstruction and vector PDF agree',async()=>{
 const {buildProfessionalReport,professionalPDF}=await import('../../desktop-ui/professional-report.ts');const {DEFAULT_REPORT,DEFAULT_ADVISER}=await import('../../desktop-runtime/adviser.mjs');
 const person=reportPerson(),options={...DEFAULT_REPORT,title:'Informe de prueba personalizado',purpose:'Revisar el balance y distinguir ahorro, resultado e hipótesis.',grossReturn:5,inflation:2,advisoryFee:.5,sections:['portfolio','summary','budget','risk','costs','mortgage','actions'],sectionNotes:{portfolio:'Comentario particular conservado.'}};
 const report=buildProfessionalReport(person,DEFAULT_ADVISER,options,{a:'Fondo sintético A',b:'Fondo sintético B'});
 assert.equal(report.blocks[0].section,'portfolio');assert.equal(report.blocks[1].section,'summary');assert.equal(report.presentation.title,options.title);assert.ok(report.blocks[0].text.some(t=>t.includes('Comentario particular conservado')));
 const charts=report.blocks.flatMap(b=>b.charts??[]);assert.equal(charts.length,10);
 const account=charts.find(c=>c.id==='accountHistory');assert.deepEqual(account.series[0].values,[20000,22500,23000]);assert.deepEqual(account.series[1].values,[20000,22000,22500]);
 assert.equal(charts.find(c=>c.id==='balance').series[0].values.at(-1),123000);assert.equal(charts.find(c=>c.id==='marketHistory').series[0].values[0],100);
 const costs=charts.find(c=>c.id==='costs');assert.equal(costs.series.length,3);assert.match(costs.caption,/hipotética/);assert.equal(charts.find(c=>c.id==='mortgage').series.length,2);
 const logo='data:image/png;base64,'+readFileSync(new URL('../../src/assets/isotipo.png',import.meta.url)).toString('base64');const pdf=professionalPDF(report,logo);assert.ok(pdf.getNumberOfPages()>=6);const dir=new URL('../../qa/results/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('informe-personalizado.pdf',dir),Buffer.from(pdf.output('arraybuffer')));
 const simple=buildProfessionalReport(person,DEFAULT_ADVISER,{...options,charts:[],includeTables:false,includeCover:false,includeContents:false});assert.equal(simple.blocks.flatMap(b=>b.charts??[]).length,0);assert.ok(professionalPDF(simple).getNumberOfPages()<pdf.getNumberOfPages());
});
test('reports: missing observations do not create history, and objectives never project unavailable capital',async()=>{
 const {buildProfessionalReport}=await import('../../desktop-ui/professional-report.ts');const {DEFAULT_REPORT,DEFAULT_ADVISER}=await import('../../desktop-runtime/adviser.mjs');const {buildInterviewPlan}=await import('../../desktop-runtime/interview-plan.mjs');
 const person=newPerson('Prueba sin histórico');person.profile.cash=1000;person.mortgage.principal=10000;let report=buildProfessionalReport(person,DEFAULT_ADVISER,DEFAULT_REPORT);
 assert.ok(!report.blocks.flatMap(b=>b.charts??[]).some(c=>['wealthHistory','accountHistory','marketHistory'].includes(c.id)));assert.equal(report.blocks.flatMap(b=>b.charts??[]).find(c=>c.id==='balance').series[0].values.at(-1),-9000);
 const proposal=buildInterviewPlan({...healthyAnswers(),savings:6000}).proposal;person.portfolios[0].proposal=proposal;report=buildProfessionalReport(person,DEFAULT_ADVISER,DEFAULT_REPORT);assert.ok(!report.blocks.flatMap(b=>b.charts??[]).some(c=>c.id==='costs'));
});
test('UI: report customization persists per person and selected charts appear in the preview',async()=>{
 const {DEFAULT_REPORT}=await import('../../desktop-runtime/adviser.mjs');
 imported={...emptyWorkspace(),people:[reportPerson()],activePersonId:null};imported.activePersonId=imported.people[0].id;
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/informes'});});
 assert.equal(document.querySelectorAll('.report-figure').length,10);
 const title=[...document.querySelectorAll('label')].find(l=>l.textContent==='Título del informe').querySelector('input');
 await action(()=>{title.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(title,'Balance y seguimiento de prueba');title.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(document.querySelector('.report-preview').textContent,/Balance y seguimiento de prueba/);
 const chart=[...document.querySelectorAll('label')].find(l=>l.textContent==='Diagrama del balance patrimonial').querySelector('input');await action(()=>chart.click());assert.equal(document.querySelectorAll('.report-figure').length,9);
 await action(()=>document.querySelector('button[aria-label="Subir Composición de la cartera"]').click());
 await action(()=>captured.portfolios.saveNow());assert.equal(saved.people[0].reportPreferences.title,'Balance y seguimiento de prueba');assert.ok(!saved.people[0].reportPreferences.charts.includes('structure'));assert.ok(saved.people[0].reportPreferences.sections.indexOf('portfolio')<DEFAULT_REPORT.sections.indexOf('portfolio'));
});


test('UI automatic portfolio: saved questionnaire produces a fund-only portfolio, preserves versions and retries do not duplicate',async()=>{
  await reset(healthyAnswers(),6);window.prestafin.fundList=async()=>[];
  await action(()=>router.navigate({to:'/portfolio-lab'}));await click('Crear cartera desde el cuestionario');
  assert.match(document.body.textContent,/Cartera automática/);assert.match(document.body.textContent,/Revisión 1/);
  assert.ok(document.querySelector('#automatic-questionnaire'));assert.ok(document.querySelector('select[aria-label="Criterio de selección"]').disabled);
  const before=captured.portfolios.portfolios.length;await click('Generar y guardar cartera');assert.equal(captured.portfolios.portfolios.length,before+1);
  const first=structuredClone(captured.portfolios.active);assert.ok(first.proposal.positions.every(p=>productById(p.assetId).vehicle==='Fondo'));
  assert.equal(saved.people[0].activeId,first.id);assert.equal(first.proposal.settings.fundAccessMode,'study');
  await click('Crear cartera desde el cuestionario');await click('Abrir propuesta guardada');assert.equal(captured.portfolios.portfolios.length,before+1);assert.equal(captured.portfolios.active.id,first.id);
  await action(()=>captured.interviews.answer(captured.interviews.active.id,'guarantee','required'));await click('Crear cartera desde el cuestionario');assert.match(document.body.textContent,/Plan de protección y revisión/);
  await click('Guardar plan de protección');assert.equal(captured.portfolios.active.proposal.kind,'planning');assert.equal(captured.portfolios.active.proposal.fundedToday,0);
  assert.deepEqual(captured.portfolios.portfolios.find(p=>p.id===first.id),first);
});

test('UI automatic portfolio: incomplete financial answers link to the missing question and create no portfolio',async()=>{
  await reset({...healthyAnswers(),income:'unknown'},6);await action(()=>router.navigate({to:'/portfolio-lab'}));await click('Crear cartera desde el cuestionario');
  const count=captured.portfolios.portfolios.length;assert.match(document.body.textContent,/Completa estos datos/);assert.ok(![...document.querySelectorAll('button')].some(b=>b.textContent==='Generar y guardar cartera'));
  assert.equal([...document.querySelectorAll('.auto-facts>div')].find(row=>row.textContent.includes('Margen mensual')).querySelector('dd').textContent,'Por aclarar');
  await action(()=>[...document.querySelectorAll('.auto-missing button')].find(b=>b.textContent.includes('cuánto dinero entra')).click());assert.equal(router.state.location.pathname,'/entrevista');assert.equal(captured.interviews.active.step,1);assert.equal(captured.portfolios.portfolios.length,count);
});

test('UI delete portfolio: cancellation preserves it, confirmation removes only this persons portfolio and linked history',async()=>{
  const first=reportPerson(),second=newPerson('Otra persona sintética');
  imported={...emptyWorkspace(),people:[first,second],activePersonId:first.id};
  await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab'});});
  const id=captured.portfolios.active.id;const other=structuredClone(captured.people.people[1]),profile=structuredClone(captured.portfolios.profile);
  await click('Eliminar cartera');assert.ok(document.querySelector('[role="alertdialog"]'));await click('Cancelar');assert.equal(captured.portfolios.active.id,id);
  await click('Eliminar cartera');await click('Sí, eliminar cartera');assert.equal(document.querySelector('[role="alertdialog"]'),null);
  assert.ok(!captured.portfolios.portfolios.some(p=>p.id===id));assert.equal(captured.portfolios.portfolios.length,1);assert.equal(captured.portfolios.active.holdings.length,0);
  assert.deepEqual(captured.people.people[1],other);assert.deepEqual(captured.portfolios.profile,profile);assert.equal(captured.people.active.histories.length,0);assert.equal(saved.people[0].interviews.length,1);
});

test('UI personalized models: create from the interview, save privately, inspect references and regenerate after wealth changes',async()=>{
 await reset(healthyAnswers(),6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 assert.ok(document.querySelector('.personalized-model'));await click('Guardar solo el modelo');
 assert.equal(saved.modelPortfolios.length,1);assert.match(saved.modelPortfolios[0].name,/Persona sintética/);assert.ok(saved.modelPortfolios[0].allocation.every(x=>productById(x.assetId)?.vehicle==='Fondo'));
 const reference=document.querySelector('[aria-label="Referencia de Andbank"]');assert.equal(reference.options.length,6);
 await action(()=>{reference.value='5';reference.dispatchEvent(new Event('change',{bubbles:true}));});assert.match(document.querySelector('.reference-models').textContent,/Agresivo/);
 await click('Crear cartera con este modelo');const first=structuredClone(captured.portfolios.active),firstId=first.id;
 assert.equal(first.proposal.client.cash,60000);assert.equal(first.proposal.fundedToday,20000);assert.equal(first.proposal.optimization.construction,'continuous');
 await selectTab('Cartera automática');const short=document.querySelector('.proposal-compact').cloneNode(true);short.querySelectorAll('details').forEach(d=>d.remove());
 assert.match(short.textContent,/Persona sintética/);assert.ok(short.textContent.split(/\s+/).length<350);assert.ok(document.querySelector('.proposal-full-details'));
 await action(()=>captured.portfolios.setProfile({...captured.portfolios.profile,cash:20000}));
 assert.ok(![...document.querySelectorAll('button')].some(b=>b.textContent==='Abrir propuesta guardada'));
 await action(()=>captured.interviews.generate(captured.interviews.active.id));assert.notEqual(captured.portfolios.active.id,firstId);assert.equal(captured.portfolios.active.proposal.fundedToday,6000);
 assert.deepEqual(captured.portfolios.portfolios.find(c=>c.id===firstId),first);
 const id=captured.portfolios.active.id;await action(()=>captured.interviews.generate(captured.interviews.active.id));assert.equal(captured.portfolios.active.id,id);
 await action(()=>captured.portfolios.saveNow());imported=structuredClone(saved);await action(()=>store.restoreWorkspace());assert.equal(captured.portfolios.active.proposal.client.cash,20000);
});

test('UI model creator selects an interview, preserves source revisions and saves edited generated models as manual copies',async()=>{
 const person=newPerson('Cliente del creador');person.profile.cash=60000;
 const interview=(id,alias,answers)=>({id,alias,answers,createdAt:1,updatedAt:2,revision:1,step:6,rulesVersion:1});
 person.interviews=[interview('creator-long','Plan a largo plazo',healthyAnswers()),interview('creator-short','Plan a corto plazo',{...healthyAnswers(),horizon:'short'})];person.activeInterviewId='creator-long';
 const other=newPerson('Otra ficha');other.interviews=[interview('foreign-interview','Entrevista ajena',healthyAnswers())];other.activeInterviewId='foreign-interview';
 imported={...emptyWorkspace(),people:[person,other],activePersonId:person.id};
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab'});});await selectTab('Modelos de cartera');
 const select=document.querySelector('[aria-label="Entrevista para crear el modelo"]');assert.equal(select.options.length,2);assert.ok(![...select.options].some(x=>x.value==='foreign-interview'));
 await action(()=>{select.value='creator-short';select.dispatchEvent(new Event('change',{bubbles:true}));});
 const name=document.querySelector('[aria-label="Nombre del modelo generado"]');await action(()=>{name.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(name,'Liquidez personalizada');name.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('Guardar solo el modelo');assert.equal(saved.modelPortfolios.length,1);
 const model=structuredClone(saved.modelPortfolios[0]);assert.equal(model.source.interview.id,'creator-short');assert.equal(model.source.proposal.equity,0);assert.equal(captured.interviews.active.id,'creator-long');
 await click('Guardar solo el modelo');assert.equal(captured.models.ownModels.length,1);assert.equal(captured.models.ownModels[0].id,model.id);
 await action(()=>captured.interviews.answer('creator-short','maxLoss',2000));await click('Guardar solo el modelo');assert.equal(saved.modelPortfolios.length,2);
 assert.deepEqual(saved.modelPortfolios.find(m=>m.id===model.id),model);assert.equal(saved.modelPortfolios.at(-1).source.interview.revision,2);
 const card=document.getElementById('model-'+model.id);assert.ok(card);assert.match(card.querySelector('.model-origin').textContent,/Plan a corto plazo/);
 await action(()=>[...card.querySelectorAll('button')].find(b=>b.textContent==='Editar mi modelo').click());assert.match(document.querySelector('.model-editor').textContent,/copia manual/);
 await action(()=>document.querySelector('.model-editor form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(saved.modelPortfolios.length,3);assert.equal(saved.modelPortfolios.at(-1).source,undefined);assert.deepEqual(saved.modelPortfolios.find(m=>m.id===model.id),model);
 assert.throws(()=>captured.models.createFromInterview('foreign-interview','Ajeno'),/no pertenece/);
 const stale=captured.models.createFromInterview;await action(()=>captured.people.select(other.id));assert.throws(()=>stale('creator-long','Antiguo'),/Selecciona la persona/);
});

test('UI model creator exposes missing questions and blocks fund models when capital protection is required',async()=>{
 await reset({...healthyAnswers(),income:'unknown'},6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 assert.ok(document.querySelector('.interview-model-missing'));assert.match(document.querySelector('.interview-model-missing').textContent,/cuánto dinero entra/);
 assert.equal(button('Guardar solo el modelo').disabled,true);
 await reset({...healthyAnswers(),guarantee:'required'},6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 assert.equal(button('Guardar solo el modelo').disabled,true);assert.match(document.querySelector('.personalized-model').textContent,/capital|protección/);
});

test('UI models: add a private model, reopen and edit it, select an incompatible model for study and delete the template',async()=>{
 await reset({...healthyAnswers(),horizon:'short'},6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 await click('Añadir cartera modelo');let input=document.querySelector('input[aria-label="Nombre del modelo"]');
 async function name(value){await action(()=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
 await name('Modelo privado de prueba');await action(()=>document.querySelector('.model-editor form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(saved.modelPortfolios.length,1);const id=saved.modelPortfolios[0].id;assert.equal(saved.modelPortfolios[0].name,'Modelo privado de prueba');
 await click('Editar mi modelo');input=document.querySelector('input[aria-label="Nombre del modelo"]');await name('Modelo revisado');await action(()=>document.querySelector('.model-editor form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(saved.modelPortfolios.length,1);assert.equal(saved.modelPortfolios[0].id,id);assert.equal(saved.modelPortfolios[0].revision,2);
 const card=[...document.querySelectorAll('.fund-model')].find(c=>c.querySelector('h3').textContent==='Global 100 / 0');assert.ok(card);const count=captured.portfolios.portfolios.length;
 await action(()=>[...card.querySelectorAll('button')].find(b=>b.textContent==='Seleccionar para estudio').click());assert.equal(captured.portfolios.portfolios.length,count+1);assert.equal(captured.portfolios.active.mode,'draft');assert.ok(captured.portfolios.active.modelStudy.reasons.length);assert.equal(captured.portfolios.active.proposal,undefined);
 await selectTab('Modelos de cartera');await click('Eliminar modelo');await click('Confirmar eliminación del modelo');await action(()=>captured.portfolios.saveNow());assert.equal(saved.modelPortfolios.length,0);assert.ok(captured.portfolios.active.modelStudy);
});

test('UI model creator uses the active interview over an older portfolio and recovers when the selected interview is removed',async()=>{
 await reset({...healthyAnswers(),horizon:'short'},6);
 const oldId=captured.interviews.active.id;
 await action(()=>captured.interviews.generate(oldId));const oldPortfolio=captured.portfolios.active.id;
 let latestId;await action(()=>{latestId=captured.interviews.create();for(const [key,value] of Object.entries(healthyAnswers()))captured.interviews.answer(latestId,key,value);});
 await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 assert.equal(document.querySelector('[aria-label="Entrevista para crear el modelo"]').value,latestId);
 await click('Guardar solo el modelo');assert.equal(saved.modelPortfolios[0].source.interview.id,latestId);
 assert.equal(captured.portfolios.active.id,oldPortfolio);assert.ok(document.querySelector('[aria-label="Modelo creado"]'));
 await action(()=>captured.interviews.remove(latestId));
 assert.equal(document.querySelector('[aria-label="Entrevista para crear el modelo"]').value,oldId);
 assert.equal(document.querySelector('[aria-label="Modelo creado"]'),null);
 await click('Guardar solo el modelo');assert.equal(saved.modelPortfolios.at(-1).source.interview.id,oldId);
});

test('UI model creation keeps errors visible, reveals filtered results and retries model and portfolio saves without duplicates',async()=>{
 await reset(healthyAnswers(),6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 const oldPortfolio=captured.portfolios.active.id;
 const filter=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='fit'));
 await action(()=>{filter.value='fit';filter.dispatchEvent(new Event('change',{bubbles:true}));});
 failSave=true;await click('Guardar solo el modelo');
 assert.match(document.querySelector('.personalized-model [role="alert"]').textContent,/No se pudo escribir/);
 assert.equal(captured.models.ownModels.length,1);assert.equal(document.querySelector('[aria-label="Modelo creado"]'),null);
 failSave=false;await click('Guardar solo el modelo');
 assert.equal(saved.modelPortfolios.length,1);const model=structuredClone(saved.modelPortfolios[0]);
 assert.equal(filter.value,'own');assert.ok(document.getElementById('model-'+model.id));
 failSave=true;await click('Crear cartera con este modelo');
 assert.equal(captured.portfolios.active.id,oldPortfolio);assert.equal(captured.portfolios.portfolios.length,2);
 assert.match(document.querySelector('.personalized-model [role="alert"]').textContent,/No se pudo escribir/);
 const createdId=captured.portfolios.portfolios.at(-1).id;
 failSave=false;await click('Crear cartera con este modelo');
 assert.equal(captured.portfolios.active.id,createdId);assert.equal(captured.portfolios.portfolios.length,2);
 assert.equal(captured.portfolios.active.proposal.modelAssignment.id,model.id);
 assert.deepEqual(captured.portfolios.active.proposal.positions,model.source.proposal.positions);
 assert.ok(document.querySelector('.portfolio-table'));assert.equal(document.querySelector('.personalized-model'),null);
 await action(()=>captured.portfolios.saveNow());imported=structuredClone(saved);await action(()=>store.restoreWorkspace());
 assert.equal(captured.models.ownModels[0].id,model.id);assert.equal(captured.portfolios.active.id,createdId);
 await action(()=>captured.interviews.answer(model.source.interview.id,'maxLoss',2000));
 assert.throws(()=>captured.models.createPortfolioFromModel(model.id),/han cambiado/);
});

test('UI model creator prevents double submission and cannot navigate into another person after a delayed save',async()=>{
 const first=await reset(healthyAnswers(),6);const other=newPerson('Otro cliente sintético');
 imported={...emptyWorkspace(),people:[first,other],activePersonId:first.id};await action(()=>store.restoreWorkspace());
 await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 let release;saveGate=new Promise(resolve=>{release=resolve;});
 await action(()=>{const save=button('Guardar solo el modelo');save.click();save.click();});
 assert.equal(captured.models.ownModels.length,1);release();saveGate=null;await action(()=>tick());
 assert.ok(document.querySelector('[aria-label="Modelo creado"]'));
 saveGate=new Promise(resolve=>{release=resolve;});await click('Crear cartera con este modelo');
 await action(()=>captured.people.select(other.id));release();saveGate=null;await action(()=>tick());
 assert.equal(captured.people.active.id,other.id);assert.equal(captured.portfolios.active.id,other.activeId);
 assert.equal(captured.portfolios.portfolios.length,1);
});

test('UI library assignment opens compatible and study portfolios only after persistence and preserves retry identity',async()=>{
 for(const [name,label] of [['Monetario EUR 100','Asignar este modelo'],['Global 100 / 0','Seleccionar para estudio']]){
  await reset({...healthyAnswers(),horizon:'short'},6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
  const oldId=captured.portfolios.active.id;
  const choose=()=>{const card=[...document.querySelectorAll('.fund-model')].find(c=>c.querySelector('h3').textContent===name);assert.ok(card);[...card.querySelectorAll('button')].find(b=>b.textContent===label).click();};
  failSave=true;await action(choose);assert.equal(captured.portfolios.active.id,oldId);assert.equal(captured.portfolios.portfolios.length,2);assert.match(document.body.textContent,/No se pudo escribir/);
  const pendingId=captured.portfolios.portfolios.at(-1).id;
  failSave=false;await action(choose);assert.equal(captured.portfolios.active.id,pendingId);assert.equal(captured.portfolios.portfolios.length,2);assert.ok(document.querySelector('.portfolio-table'));
 }
});

test('UI one-click creation adds risk-matched funds and a private model together, opens the holdings and retries without duplicates',async()=>{
 await reset(healthyAnswers(),6);await action(()=>router.navigate({to:'/portfolio-lab'}));await selectTab('Modelos de cartera');
 assert.equal(captured.models.ownModels.length,0);const originalId=captured.portfolios.active.id;
 failSave=true;await click('Crear cartera con fondos');
 assert.equal(captured.models.ownModels.length,1);assert.equal(captured.portfolios.portfolios.length,2);assert.equal(captured.portfolios.active.id,originalId);
 assert.match(document.querySelector('.personalized-model [role="alert"]').textContent,/No se pudo escribir/);
 const pending=structuredClone(captured.portfolios.portfolios.at(-1));assert.equal(pending.holdings.length,1);assert.equal(pending.proposal.equity,100);
 assert.ok(pending.holdings.every(h=>productById(h.assetId).vehicle==='Fondo'));assert.equal(pending.proposal.modelAssignment.id,captured.models.ownModels[0].id);
 failSave=false;await click('Crear cartera con fondos');
 assert.equal(captured.portfolios.active.id,pending.id);assert.equal(captured.portfolios.portfolios.length,2);assert.equal(saved.modelPortfolios.length,1);
 assert.ok(document.querySelector('.portfolio-table'));assert.equal(document.querySelectorAll('.portfolio-table .fund-selection-reason').length,pending.holdings.length);
 assert.match(document.querySelector('.fund-selection-reason').textContent,/límite|reserva|bonos/);
 assert.deepEqual(captured.portfolios.active.holdings,pending.holdings);
 await action(()=>captured.portfolios.saveNow());imported=structuredClone(saved);await action(()=>store.restoreWorkspace());assert.deepEqual(captured.portfolios.active.holdings,pending.holdings);
 await selectTab('Modelos de cartera');await click('Crear cartera con fondos');assert.equal(captured.portfolios.portfolios.length,2);assert.equal(captured.models.ownModels.length,1);
});

test('one-click fund creation leaves the account unchanged if the interview blocks investment or the portfolio limit is reached',async()=>{
 await reset({...healthyAnswers(),guarantee:'required'},6);
 assert.throws(()=>captured.models.createWithFunds(captured.interviews.active.id,'Protección'),/capital|proteger|protección/);
 assert.equal(captured.models.ownModels.length,0);assert.equal(captured.portfolios.portfolios.length,1);
 const person=await reset(healthyAnswers(),6);const sample=person.portfolios[0];
 person.portfolios=Array.from({length:250},(_,i)=>({...structuredClone(sample),id:'full-portfolio-'+i}));person.activeId=person.portfolios[0].id;
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};await action(()=>store.restoreWorkspace());
 assert.throws(()=>captured.models.createWithFunds(captured.interviews.active.id,'Sin espacio'),/límite/);
 assert.equal(captured.models.ownModels.length,0);assert.equal(captured.portfolios.portfolios.length,250);
});

test('UI billing: setup pending disables payments; verified account selects annual checkout and manages cancellation',async()=>{
  let state={configured:false,email:null,eligible:false,subscription:null};let selected=null,portal=0;
  window.prestafin.billingStatus=async()=>structuredClone(state);
  window.prestafin.billingCheckout=async plan=>{selected=plan;return true;};
  window.prestafin.billingPortal=async()=>{portal++;return true;};
  await action(()=>router.navigate({to:'/suscripcion'}));
  assert.match(document.body.textContent,/Pagos pendientes de activación/);
  let annual=document.querySelector('[aria-label="Plan anual"] button');assert.equal(annual.disabled,true);
  assert.match(document.body.textContent,/490/);assert.match(document.body.textContent,/Ahorras 110/);
  await action(()=>router.navigate({to:'/persona'}));
  state={configured:true,email:'billing@example.test',eligible:false,subscription:null,trialAvailable:true,hasCustomer:false,environment:'test'};
  await action(()=>router.navigate({to:'/suscripcion'}));
  annual=document.querySelector('[aria-label="Plan anual"] button');assert.equal(annual.disabled,false);
  await action(()=>annual.click());assert.equal(selected,'year');assert.match(document.body.textContent,/Stripe se ha abierto/);
  state={...state,eligible:true,hasCustomer:true,trialAvailable:false,subscription:{status:'trialing',plan:'year',periodEnd:1900000000,trialEnd:1900000000,cancelAtPeriodEnd:true,cancelAt:null}};
  await click('Actualizar estado');assert.match(document.body.textContent,/Renovación cancelada/);
  assert.equal(document.querySelector('[aria-label="Plan anual"] button').disabled,true);
  await click('Gestionar en Stripe');assert.equal(portal,1);
  window.prestafin.billingStatus=async()=>{throw new Error('Sin conexión a facturación');};
  await click('Actualizar estado');assert.match(document.body.textContent,/Sin verificar/);assert.match(document.body.textContent,/Sin conexión/);
  await action(()=>router.navigate({to:'/persona'}));
});

test('UI billing gate: expired trials and network failures block tools while local export remains available',async()=>{
  let state={configured:true,email:'billing@example.test',eligible:true,subscription:{status:'trialing',plan:'month',periodEnd:Math.floor(Date.now()/1000)-1}};
  let fail=false,exports=0;
  window.prestafin.billingStatus=async()=>{if(fail)throw new Error('Servicio sin conexión');return structuredClone(state);};
  window.prestafin.exportWorkspace=async()=>{exports++;return true;};
  const node=document.createElement('div');document.body.append(node);const gateRoot=createRoot(node);
  try{
    await action(()=>gateRoot.render(h(BillingProvider,null,h(BillingGate,null,h('p',null,'HERRAMIENTAS PROTEGIDAS')))));
    assert.ok(!node.textContent.includes('HERRAMIENTAS PROTEGIDAS'));
    await action(()=>[...node.querySelectorAll('button')].find(b=>b.textContent==='Exportar mis datos').click());assert.equal(exports,1);
    state.subscription.periodEnd=Math.floor(Date.now()/1000)+86400;
    await action(()=>window.dispatchEvent(new Event('focus')));assert.match(node.textContent,/HERRAMIENTAS PROTEGIDAS/);
    fail=true;await action(()=>window.dispatchEvent(new Event('focus')));assert.ok(!node.textContent.includes('HERRAMIENTAS PROTEGIDAS'));assert.match(node.textContent,/Servicio sin conexión/);
    fail=false;state={configured:false,email:null,eligible:false,subscription:null};
    await action(()=>window.dispatchEvent(new Event('focus')));assert.match(node.textContent,/HERRAMIENTAS PROTEGIDAS/);
  }finally{await action(()=>gateRoot.unmount());node.remove();}
});

test('UI account: password login, registration confirmation and logout keep accounts isolated',async()=>{
  const original={identity:window.prestafin.workspaceIdentity,load:window.prestafin.loadWorkspace};
  const id='9f20fbf4-00f4-49b0-a9d6-cee3ce804a03';let state={configured:false,authConfigured:true,user:null,email:null,eligible:false,subscription:null};
  const person=newPerson('Cuenta de correo sintética');let registrations=0,logins=0;
  window.prestafin.workspaceIdentity=async()=>({configured:true,userId:state.user?.id??null});
  window.prestafin.loadWorkspace=async owner=>{assert.equal(owner,id);return {...emptyWorkspace(),people:[person],activePersonId:person.id};};
  window.prestafin.billingStatus=async()=>structuredClone(state);
  window.prestafin.authSignIn=async(email,password)=>{logins++;assert.equal(email,'synthetic@example.test');assert.equal(password,'synthetic-password');if(logins===1)throw new Error('Correo o contraseña incorrectos.');state.user={id,email};state.email=email;return true;};
  window.prestafin.authSignUp=async(email,password)=>{registrations++;assert.equal(email,'synthetic@example.test');assert.equal(password,'synthetic-password');return {confirmationRequired:true};};
  window.prestafin.authConfirmEmail=async(email,proof)=>{assert.equal(proof,'123456');state.user={id,email};state.email=email;return true;};
  window.prestafin.billingLogout=async()=>{state.user=null;state.email=null;return true;};
  async function field(name,value){const el=document.getElementById(name);assert.ok(el,name);await action(()=>{el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
  try{
    await action(()=>router.navigate({to:'/suscripcion'}));assert.equal(captured.people.people.length,0);
    assert.ok(!document.body.textContent.includes('Continuar con Google'));
    await field('account-email','synthetic@example.test');await field('account-password','synthetic-password');await click('Iniciar sesión');
    assert.match(document.body.textContent,/Correo o contraseña incorrectos/);assert.equal(document.getElementById('account-password').value,'');
    await click('Crear una cuenta');await field('account-password','synthetic-password');await field('account-repeat','different-password');await click('Crear cuenta');assert.equal(registrations,0);assert.match(document.body.textContent,/no coinciden/);
    await field('account-repeat','synthetic-password');await click('Crear cuenta');assert.equal(registrations,1);assert.ok(document.getElementById('account-proof'));assert.equal(captured.people.people.length,0);
    await field('account-proof','123456');await click('Confirmar correo');assert.equal(captured.people.people[0].name,'Cuenta de correo sintética');
    await click('Cerrar sesión');assert.equal(captured.people.people.length,0);
    await field('account-password','synthetic-password');await click('Iniciar sesión');assert.equal(logins,2);assert.equal(captured.people.people.length,1);
    await click('Cerrar sesión');assert.equal(captured.people.people.length,0);
  }finally{
    window.prestafin.workspaceIdentity=original.identity;window.prestafin.loadWorkspace=original.load;
    await action(()=>router.navigate({to:'/persona'}));
  }
});

test('UI account: recovery requires email proof and a repeated new password before returning to login',async()=>{
  const state={configured:false,authConfigured:true,user:null,email:null,eligible:false,subscription:null};let requests=0,resets=0;
  window.prestafin.billingStatus=async()=>structuredClone(state);
  window.prestafin.authRequestPasswordReset=async email=>{requests++;assert.equal(email,'synthetic@example.test');return true;};
  window.prestafin.authResetPassword=async(email,proof,password)=>{resets++;assert.equal(email,'synthetic@example.test');assert.equal(proof,'654321');assert.equal(password,'new-synthetic-password');return true;};
  async function field(name,value){const el=document.getElementById(name);assert.ok(el,name);await action(()=>{el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
  await action(()=>router.navigate({to:'/suscripcion'}));
  await click('He olvidado mi contraseña');await field('account-email','synthetic@example.test');await click('Enviar instrucciones');assert.equal(requests,1);
  await field('account-proof','654321');await field('account-password','new-synthetic-password');await field('account-repeat','new-synthetic-password');await click('Guardar nueva contraseña');assert.equal(resets,1);
  assert.match(document.body.textContent,/Contraseña actualizada/);assert.equal(document.getElementById('account-password').value,'');assert.equal(document.getElementById('account-proof'),null);
  await action(()=>router.navigate({to:'/persona'}));
});

test('UI welcome: a new launch shows branding, then login or the valid account workspace',async()=>{
  const {Welcome}=await import('../../desktop-ui/welcome.tsx');
  let state={configured:false,authConfigured:true,email:null,user:null,eligible:false,subscription:null};
  window.prestafin.billingStatus=async()=>structuredClone(state);
  const node=document.createElement('div');document.body.append(node);const welcomeRoot=createRoot(node);
  try{
    await action(()=>welcomeRoot.render(h(BillingProvider,null,h(Welcome,null,h('p',null,'TERMINAL ABIERTA')))));
    assert.match(node.textContent,/Preparando tu espacio/);assert.ok(!node.textContent.includes('TERMINAL ABIERTA'));
    await action(()=>new Promise(resolve=>setTimeout(resolve,700)));assert.match(node.textContent,/Accede a tu terminal/);assert.ok(node.querySelector('#account-password'));
    state={...state,email:'synthetic@example.test',user:{id:'9f20fbf4-00f4-49b0-a9d6-cee3ce804a03',email:'synthetic@example.test'}};
    await action(()=>window.dispatchEvent(new Event('focus')));assert.match(node.textContent,/TERMINAL ABIERTA/);assert.equal(node.querySelector('#account-password'),null);
    state={...state,email:null,user:null};await action(()=>window.dispatchEvent(new Event('focus')));assert.match(node.textContent,/Accede a tu terminal/);
  }finally{await action(()=>welcomeRoot.unmount());node.remove();}
});

test('UI license: redeeming refreshes permanent access and disables new paid checkout; revocation blocks tools',async()=>{
  const permanent={kind:'pro_permanent',status:'active',permanent:true,activatedAt:'2026-10-30'};
  let state={configured:false,licensesConfigured:true,authConfigured:true,email:'synthetic@example.test',user:{id:'9f20fbf4-00f4-49b0-a9d6-cee3ce804a03',email:'synthetic@example.test'},eligible:false,subscription:null};
  const code='PFT-PRO-'+Array(6).fill('ABCDEF12').join('-');let calls=0;
  window.prestafin.billingStatus=async()=>structuredClone(state);
  window.prestafin.billingRedeemCode=async value=>{assert.equal(value,code);calls++;state={...state,eligible:true,license:permanent};return true;};
  await action(()=>router.navigate({to:'/suscripcion'}));const el=document.querySelector('#license-code');
  await action(()=>{el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,code);el.dispatchEvent(new Event('input',{bubbles:true}));});
  await click('Activar código');assert.equal(calls,1);assert.match(document.body.textContent,/Prestafin Pro permanente/);assert.equal(document.querySelector('#license-code'),null);
  assert.equal(document.querySelector('[aria-label="Plan mensual"] button').disabled,true);
  const node=document.createElement('div');document.body.append(node);const gateRoot=createRoot(node);
  try{
    await action(()=>gateRoot.render(h(BillingProvider,null,h(BillingGate,null,h('p',null,'ACCESO PERMANENTE')))));assert.match(node.textContent,/ACCESO PERMANENTE/);
    state={...state,eligible:false,license:{...permanent,status:'revoked'}};await action(()=>window.dispatchEvent(new Event('focus')));assert.ok(!node.textContent.includes('ACCESO PERMANENTE'));
  }finally{await action(()=>gateRoot.unmount());node.remove();await action(()=>router.navigate({to:'/persona'}));}
});


test('UI: empty optional optimization fields use visible defaults and retain the full simulation',async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');await selectTab('Optimización');
 const choose=async(label,value)=>action(()=>{const el=document.querySelector('select[aria-label="'+label+'"]');assert.ok(el);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});
 const number=async(label,value)=>action(()=>{const el=document.querySelector('input[aria-label="'+label+'"]');assert.ok(el,label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});
 await action(()=>document.querySelector('.optimization-settings summary').click());await choose('Objetivo avanzado','utility');
 for(const label of ['Referencia anual supuesta (%)','Aversión al riesgo','Rotación máxima (%)','Penalización de concentración (%)'])await number(label,'');
 assert.equal(document.querySelector('input[aria-label="Referencia anual supuesta (%)"]').value,'');
 assert.match(document.body.textContent,/Vacío: se usa 2.2/);
 await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,150)));
 assert.equal(document.querySelector('.optimization-error'),null);
 assert.match(document.body.textContent,/1500 repartos simulados/);
 await click('Guardar versión del estudio');await action(()=>captured.portfolios.saveNow());
 const study=captured.portfolios.active.optimizationStudy;assert.equal(study.input.riskFree,2.2);assert.equal(study.input.riskAversion,5);assert.equal(study.input.maxTurnover,null);assert.equal(study.input.concentrationPenalty,0);
 await click('Preparar nuevo cálculo');await choose('Objetivo avanzado','targetReturn');
 assert.equal(document.querySelector('input[aria-label="Rentabilidad mínima anual (%)"]').value,'');
 await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,150)));assert.equal(document.querySelector('.optimization-error'),null);assert.ok(document.body.textContent.includes('resultado del estudio'));
});


test('UI: the real chart renders every simulated point and highlights solver and sample solutions',async()=>{
 const originalRect=HTMLElement.prototype.getBoundingClientRect;
 HTMLElement.prototype.getBoundingClientRect=function(){return this.classList.contains('recharts-responsive-container')?{x:0,y:0,top:0,left:0,right:900,bottom:420,width:900,height:420,toJSON(){return {};}}:originalRect.call(this);};
 try{
  await reset(healthyAnswers(),6);await click('Generar borrador de inversión');await selectTab('Optimización');
  await click('Calcular cartera avanzada');await action(()=>new Promise(r=>setTimeout(r,200)));
  const chart=document.querySelector('.advanced-optimization .recharts-wrapper');assert.ok(chart);
  const series=[...chart.querySelectorAll('.recharts-scatter')];assert.ok(series.length>=5);
  assert.equal(series.filter(g=>g.querySelector('[fill="#64b9db"], [fill="#da7880"]')).reduce((sum,g)=>sum+g.querySelectorAll('.recharts-scatter-symbol').length,0),1500);
  for(const label of ['Mínima varianza','Mejor Sharpe simulado','Resultado'])assert.ok(chart.textContent.includes(label));
  mkdirSync(new URL('../../qa/results/',import.meta.url),{recursive:true});
  writeFileSync(new URL('../../qa/results/optimization-cloud-render.html',import.meta.url),'<meta charset="utf-8"><title>Prueba de gráfico con datos ficticios</title><body style="background:#102220;color:#f0f6f4">'+chart.outerHTML+'</body>');
 }finally{HTMLElement.prototype.getBoundingClientRect=originalRect;}
});


test('UI: automatic advanced mode calculates without numeric input and preserves the interview mandate',async()=>{
 await reset(healthyAnswers(),6);await click('Generar borrador de inversión');await selectTab('Optimización');
 for(let i=0;i<30&&!document.querySelector('.advanced-optimization .model-result');i++)await action(()=>new Promise(r=>setTimeout(r,30)));
 assert.equal(document.querySelector('select[aria-label="Nivel de configuración"]'),null);
 assert.equal(document.querySelector('.optimization-settings').open,false);
 assert.equal(document.querySelector('.optimization-error'),null);assert.ok(document.querySelector('.advanced-optimization .model-result'));
 assert.match(document.body.textContent,/MODO AVANZADO · AUTOMÁTICO/);
 await click('Guardar versión del estudio');const input=captured.portfolios.active.optimizationStudy.input;
 assert.equal(input.method,'utility');assert.equal(input.limits.filter(l=>l.name.startsWith('Cuestionario · ')).length,2);assert.ok(input.riskAversion>=2);
});

test('UI: automatic history trains on the saved exact universe and retains its audit offline',async()=>{
 const person=newPerson('Estudio automático sintético'),c=person.portfolios[0];c.holdings=[{assetId:'fund-vanguard-world',amount:5000},{assetId:'fund-vanguard-short',amount:5000}];
 const h={portfolioId:c.id,source:'Synthetic automatic study',importedAt:Date.UTC(2026,10,15),currency:'EUR',columns:c.holdings.map(h=>h.assetId),rows:Array.from({length:96},(_,i)=>({month:new Date(Date.UTC(2000+Math.floor(i/12),i%12,1)).toISOString().slice(0,7),returns:[.004+.02*Math.sin(i*.6),.003+.01*Math.cos(i*.6)]}))};person.histories=[h];
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};queryClient.clear();window.prestafin.marketBundle=async()=>{throw new Error('Synthetic offline');};
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab',search:{panel:'optimizacion'}});});
 for(let i=0;i<60&&!document.querySelector('.advanced-optimization .model-result');i++)await action(()=>new Promise(r=>setTimeout(r,30)));
 assert.equal(document.querySelector('.optimization-error'),null);assert.ok(document.querySelector('.automatic-estimation-audit'));
 await click('Comparar con configuración estándar');await action(()=>new Promise(r=>setTimeout(r,180)));
 const compare=[...document.querySelectorAll('section')].find(el=>el.querySelector('h3')?.textContent==='Estándar y configuración personalizada');assert.ok(compare);
 const {estimateHistory,optimizeContinuous}=await import('../../desktop-runtime/optimization.mjs');const estimated=estimateHistory(h,{method:'shrinkage'});const expected=optimizeContinuous({ids:h.columns,names:h.columns,means:estimated.means,cov:estimated.cov,currentWeights:[.5,.5],riskFree:2.2,method:'utility',basis:'history',source:h.source,dataStart:estimated.dataStart,dataEnd:estimated.dataEnd,observations:estimated.observations,riskAversion:5});
 const observed=Number(compare.querySelectorAll('tbody tr')[1].children[2].textContent.replace(/[^0-9,.-]/g,'').replace(',','.'));assert.ok(Math.abs(observed-expected.point.vol)<.001);
 await click('Guardar versión del estudio');await action(()=>captured.portfolios.saveNow());const study=structuredClone(captured.portfolios.active.optimizationStudy);
 assert.equal(study.input.basis,'history');assert.equal(study.input.automatic.trainingMonths,96);assert.equal(study.input.automatic.validationMonths,24);
 assert.deepEqual(study.input.ids,h.columns);assert.equal(study.input.source,h.source);
 imported=structuredClone(saved);await action(()=>store.restoreWorkspace());await selectTab('Optimización');assert.deepEqual(captured.portfolios.active.optimizationStudy,study);
 assert.match(document.body.textContent,/Estudio guardado/);assert.ok(document.querySelector('.automatic-estimation-audit'));
});


test('UI: changing the automatic universe cannot reuse obsolete per-position settings',async()=>{
 const person=newPerson('Cambio de universo sintético'),c=person.portfolios[0];c.holdings=[{assetId:'fund-vanguard-world',amount:5000},{assetId:'fund-vanguard-short',amount:5000}];
 person.histories=[{portfolioId:c.id,source:'Synthetic two assets',importedAt:Date.UTC(2026,10,15),currency:'EUR',columns:c.holdings.map(h=>h.assetId),rows:Array.from({length:72},(_,i)=>({month:new Date(Date.UTC(2000+Math.floor(i/12),i%12,1)).toISOString().slice(0,7),returns:[.005+.02*Math.sin(i*.6),.003+.01*Math.cos(i*.6)]}))}];
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};queryClient.clear();window.prestafin.marketBundle=async()=>{throw new Error('Synthetic offline');};
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab',search:{panel:'optimizacion'}});});
 for(let i=0;i<50&&!document.querySelector('.advanced-optimization .model-result');i++)await action(()=>new Promise(r=>setTimeout(r,30)));
 await action(()=>captured.portfolios.setHoldings(c.id,[c.holdings[0]]));
 for(let i=0;i<50&&!document.querySelector('.advanced-optimization .model-result');i++)await action(()=>new Promise(r=>setTimeout(r,30)));
 assert.equal(document.querySelector('.optimization-error'),null);await click('Guardar versión del estudio');
 const input=captured.portfolios.active.optimizationStudy.input;assert.deepEqual(input.ids,[c.holdings[0].assetId]);assert.equal(input.minWeights.length,1);assert.equal(input.maxWeights.length,1);assert.equal(input.automatic.trainingMonths,72);
});


test('UI: external fund history prefers the verified share class and coverage names each missing fund',async()=>{
 const {syntheticBundle}=await import('./fixtures/market.mjs'),person=newPerson('Cobertura sintética'),c=person.portfolios[0];
 c.holdings=[{assetId:'market-0P0001T8V7.F',amount:1000,meta:{symbol:'0P0001T8V7.F',name:'MyInvestor Value C de prueba',kind:'Fondo',currency:'EUR'}},{assetId:'market-0P0001A94F.F',amount:1000,meta:{symbol:'0P0001A94F.F',name:'Cobas Large Cap P de prueba',kind:'Fondo',currency:'EUR'}}];
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};queryClient.clear();const calls=[];
 window.prestafin.marketBundle=async({symbols})=>{calls.push(symbols);return syntheticBundle(symbols);};
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab',search:{panel:'riesgo'}});});await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.deepEqual(calls[0],['ES0165243025','LU1598720172']);assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);
 // Change only the explicit class ISIN while preserving the old ticker.
 const holdings=structuredClone(captured.portfolios.active.holdings);holdings[0].meta.isin='ES0165243009';
 window.prestafin.marketBundle=async({symbols})=>{calls.push(symbols);const b=syntheticBundle(symbols);b.assets[0].monthly=b.assets[0].monthly.slice(-12);return b;};
 await action(()=>captured.portfolios.setHoldings(c.id,holdings));await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.ok(calls.at(-1).includes('ES0165243009'));const coverage=document.querySelector('[aria-label="Cobertura del histórico por fondo"]');assert.ok(coverage);assert.match(coverage.textContent,/MyInvestor Value C de prueba/);assert.match(coverage.textContent,/ES0165243009/);assert.match(coverage.textContent,/11/);assert.match(coverage.textContent,/Cobas Large Cap P de prueba/);
 // An earlier download must not be attributed to a different share class, even offline after reopening.
 assert.match(document.querySelector('.risk-source .eyebrow').textContent,/HISTÓRICO POR PRODUCTO/);
 await action(()=>captured.portfolios.saveNow());imported=structuredClone(saved);queryClient.clear();window.prestafin.marketBundle=async()=>{throw new Error('Synthetic offline after class change');};
 await action(()=>store.restoreWorkspace());await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.match(document.querySelector('.risk-source .eyebrow').textContent,/HISTÓRICO POR PRODUCTO/);
 assert.match(document.body.textContent,/clase o el identificador/);
});


test('UI: a failed refresh is visible and preserves the verified historical analysis',async()=>{
 const {syntheticBundle}=await import('./fixtures/market.mjs'),person=newPerson('Reintento sintético'),c=person.portfolios[0];c.holdings=[{assetId:'fund-vanguard-world',amount:1000}];
 imported={...emptyWorkspace(),people:[person],activePersonId:person.id};queryClient.clear();window.prestafin.marketBundle=async({symbols})=>syntheticBundle(symbols);
 await action(async()=>{await store.restoreWorkspace();await router.navigate({to:'/portfolio-lab',search:{panel:'riesgo'}});});await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);
 window.prestafin.marketBundle=async()=>{throw new Error('Error sintético al actualizar el proveedor');};await click('Actualizar mercado');await action(()=>new Promise(r=>setTimeout(r,100)));
 assert.match(document.body.textContent,/Error sintético al actualizar el proveedor/);assert.match(document.body.textContent,/HISTÓRICO DE MERCADO EN EUR/);
});


test('UI PRESTAFIN30: active promotion shows its fixed expiry, permits paid plans and preserves permanent access',async()=>{
 const {BillingContext}=await import('../../desktop-ui/billing.tsx');
 const node=document.createElement('div');document.body.append(node);const promoRoot=createRoot(node);
 const started=Date.now(),expires=started+30*86400000;
 let refreshes=0,selected=null;
 const previousCheckout=window.prestafin.billingCheckout;
 window.prestafin.billingCheckout=async plan=>{selected=plan;return true;};
 let state={configured:true,authConfigured:true,licensesConfigured:true,email:'promo-ui@example.test',eligible:true,subscription:null,license:{kind:'promo_30d',status:'active',permanent:false,activatedAt:new Date(started).toISOString(),expiresAt:new Date(expires).toISOString()}};
 const render=()=>promoRoot.render(h(BillingContext.Provider,{value:{state,loading:false,error:'',refresh:async()=>{refreshes++;}}},h(React.Fragment,null,h(BillingPage),h(BillingGate,null,h('p',{'data-promo-protected':true},'HERRAMIENTAS DE PRUEBA')))));
 try{
  await action(render);
  assert.match(node.textContent,/Prueba de 30 días activa/);assert.match(node.textContent,/Quedan 30 días/);assert.match(node.textContent,/sin tarjeta/);
  assert.ok(node.textContent.includes(new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short'}).format(expires)));
  assert.ok(!/14 días|Empezar 14/.test(node.textContent));assert.ok(node.querySelector('[data-promo-protected]'));
  let plans=[...node.querySelectorAll('.billing-plan button')];assert.equal(plans.length,2);assert.ok(plans.every(b=>!b.disabled));
  await action(()=>plans[1].click());assert.equal(selected,'year');assert.equal(refreshes,1);assert.ok(node.querySelector('[data-promo-protected]'));
  state={...state,license:{kind:'pro_permanent',status:'active',permanent:true,activatedAt:new Date(started).toISOString()}};
  await action(render);
  assert.match(node.querySelector('[aria-label="Código de activación"]').textContent,/Licencia permanente/);
  assert.ok(node.querySelector('[data-promo-protected]'));plans=[...node.querySelectorAll('.billing-plan button')];assert.ok(plans.every(b=>b.disabled));
  assert.ok(!node.textContent.includes('La prueba de 30 días ha finalizado'));
 }finally{await action(()=>promoRoot.unmount());node.remove();window.prestafin.billingCheckout=previousCheckout;}
});

test('UI PRESTAFIN30: a cached active promotion expires on time without a server refresh or restarting',async()=>{
 const {BillingContext}=await import('../../desktop-ui/billing.tsx'),{LicenseCode}=await import('../../desktop-ui/license-code.tsx');
 const node=document.createElement('div');document.body.append(node);const expiryRoot=createRoot(node);let refreshes=0;
 const current=Date.now(),state={configured:true,authConfigured:true,licensesConfigured:true,email:'expiry-ui@example.test',eligible:true,subscription:null,license:{kind:'promo_30d',status:'active',permanent:false,activatedAt:new Date(current-30*86400000).toISOString(),expiresAt:new Date(current+100).toISOString()}};
 try{
  await action(()=>expiryRoot.render(h(BillingContext.Provider,{value:{state,loading:false,error:'',refresh:async()=>{refreshes++;}}},h(React.Fragment,null,h(LicenseCode),h(BillingGate,null,h('p',{'data-promo-protected':true},'ACCESO PROMOCIONAL'))))));
  assert.ok(node.querySelector('[data-promo-protected]'));assert.match(node.textContent,/Caduca el/);
  await action(()=>new Promise(resolve=>setTimeout(resolve,180)));
  assert.equal(node.querySelector('[data-promo-protected]'),null);assert.ok(node.querySelector('.billing-gate'));assert.match(node.textContent,/La prueba de 30 días ha finalizado/);assert.equal(refreshes,0);
 }finally{await action(()=>expiryRoot.unmount());node.remove();}
});

test('UI PRESTAFIN30: expired or revoked promotional access is denied while an active paid subscription still grants access',async()=>{
 const {BillingContext}=await import('../../desktop-ui/billing.tsx'),{LicenseCode}=await import('../../desktop-ui/license-code.tsx');
 const node=document.createElement('div');document.body.append(node);const mixedRoot=createRoot(node),current=Date.now();
 let state={configured:true,authConfigured:true,licensesConfigured:true,email:'paid-ui@example.test',eligible:true,subscription:null,license:{kind:'promo_30d',status:'active',permanent:false,activatedAt:new Date(current-31*86400000).toISOString(),expiresAt:new Date(current-86400000).toISOString()}};
 const render=()=>mixedRoot.render(h(BillingContext.Provider,{value:{state,loading:false,error:'',refresh:async()=>{}}},h(React.Fragment,null,h(LicenseCode),h(BillingGate,null,h('p',{'data-promo-protected':true},'HERRAMIENTAS ACTIVAS')))));
 try{
  await action(render);assert.equal(node.querySelector('[data-promo-protected]'),null);assert.match(node.textContent,/La prueba de 30 días ha finalizado/);
  state={...state,license:{...state.license,status:'revoked',expiresAt:new Date(current+86400000).toISOString()}};
  await action(render);assert.equal(node.querySelector('[data-promo-protected]'),null);assert.match(node.textContent,/El acceso promocional no está activo/);
  state={...state,subscription:{status:'active',plan:'month',trialEnd:null,periodEnd:Math.floor((current+30*86400000)/1000),cancelAtPeriodEnd:false,cancelAt:null}};
  await action(render);assert.ok(node.querySelector('[data-promo-protected]'));
 }finally{await action(()=>mixedRoot.unmount());node.remove();}
});
