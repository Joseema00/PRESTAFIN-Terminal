import { validateProposalSettings,type ProposalSettings } from './investment-products';

/** Local interview model. Rules are explicit design assumptions, not a calibrated suitability test. */
export const INTERVIEW_RULES_VERSION = 1;
export const INTERVIEW_STEPS = [
  { title:'Tu objetivo', description:'Primero, qué quieres conseguir y cuándo necesitas el dinero.' },
  { title:'Tu día a día', description:'Conocer el margen de tu economía ayuda a separar el ahorro que puedes invertir.' },
  { title:'Cuánto reservar', description:'Dejamos fuera el dinero de los imprevistos y de los gastos próximos.' },
  { title:'Cuando las cosas bajan', description:'No hay respuestas valientes ni cobardes. Importa lo que realmente harías.' },
  { title:'Lo que conoces', description:'Puedes decir «no lo sé». Estas preguntas sirven para saber qué conviene explicar.' },
  { title:'Tu forma de invertir', description:'Elige lo que te haría sentir cómodo; después contrastamos todo el conjunto.' },
];
export type Answer = string | number;
export type AnswerId = 'goal'|'horizon'|'flexibility'|'target'|'withdrawals'|'incomeSource'|'income'|'expenses'|'debtPayment'|'incomeStability'|'dependents'|'change'|'debt'|'savings'|'nearCosts'|'initial'|'monthly'|'borrowed'|'emergency'|'loss10'|'loss25'|'sleep'|'maxLoss'|'impact'|'past'|'experience'|'frequency'|'diversify'|'bondKnowledge'|'returnKnowledge'|'inflation'|'balance'|'tradeoff'|'guarantee'|'restrictions'|'story'|'optimizationGoal';
export type Answers = Partial<Record<AnswerId, Answer>> & { [key:string]:Answer|undefined };
export type Question = { id:string; step:number; title:string; help?:string; kind:'choice'|'money'|'text'; options?:{value:string;label:string}[]; optional?:boolean };
const choice = (id:string,step:number,title:string,options:[string,string][],help?:string):Question => ({id,step,title,kind:'choice',options:options.map(([value,label]) => ({value,label})),...(help ? {help} : {})});
const money = (id:string,step:number,title:string,help:string):Question => ({id,step,title,help,kind:'money'});
export const QUESTIONS:Question[] = [
  choice('goal',0,'¿Para qué te gustaría que sirviera este dinero?',[
    ['future','Tener más tranquilidad económica en el futuro'],['retirement','Complementar mis ingresos cuando deje de trabajar'],['purchase','Pagar una compra o un proyecto concreto'],['income','Sacar dinero de vez en cuando para vivir'],['unknown','Todavía no lo tengo claro']]),
  choice('horizon',0,'¿Cuándo podrías necesitar por primera vez una parte importante?',[
    ['short','Antes de 3 años'],['medium','Entre 3 y 5 años'],['long','Entre 5 y 10 años'],['verylong','Dentro de más de 10 años'],['unknown','No lo sé todavía']]),
  choice('flexibility',0,'Si llegado ese momento hubiera menos dinero del esperado, ¿podrías aplazar el plan?',[
    ['none','No, tendría que usarlo en esa fecha'],['some','Podría aplazarlo unos meses'],['flexible','Podría esperar varios años'],['unknown','No lo sé']]),
  money('target',0,'¿Hay una cantidad que te gustaría llegar a tener para ese objetivo?','Pon 0 si no tienes una cifra concreta. Una meta más alta no hará que te asignemos más riesgo.'),
  choice('withdrawals',0,'Mientras tanto, ¿necesitarías sacar dinero de esta inversión?',[
    ['none','No, podría dejarlo invertido'],['occasional','Quizá alguna vez, pero tengo otros ahorros'],['regular','Sí, para pagar gastos habituales'],['unknown','No lo sé']]),
  choice('incomeSource',1,'¿De dónde viene principalmente el dinero con el que vives?',[
    ['salary','Un sueldo'],['self','Trabajo por mi cuenta o mi negocio'],['pension','Una pensión o ingresos periódicos similares'],['support','Ayuda familiar u otras personas'],['savings','Mis ahorros'],['other','Varias fuentes u otra situación']]),
  money('income',1,'En un mes normal, ¿cuánto dinero entra en tu hogar después de impuestos?','Usa tu parte disponible para estos gastos, de forma coherente con las siguientes respuestas. No cuentes préstamos ni ganancias inciertas.'),
  money('expenses',1,'¿Cuánto se va al mes en vivienda, comida, suministros, transporte y otros gastos?','Incluye también la parte mensual de gastos anuales. Deja fuera las cuotas de préstamos: las preguntamos después.'),
  money('debtPayment',1,'¿Cuánto pagas al mes por préstamos, hipoteca o compras a plazos?','Pon 0 si no tienes cuotas. No vuelvas a incluirlas en los gastos anteriores.'),
  choice('incomeStability',1,'¿Cómo suelen variar esos ingresos de un mes a otro?',[
    ['stable','Son bastante estables'],['variable','Cambian, pero suelo llegar a los gastos'],['uncertain','Son imprevisibles o a veces no cubren los gastos'],['unknown','No lo sé']]),
  choice('dependents',1,'¿Hay personas que dependen económicamente de ti?',[
    ['none','No'],['shared','Sí, y compartimos esa responsabilidad'],['sole','Sí, y dependen principalmente de mí']]),
  choice('change',1,'¿Prevés algún cambio importante que pueda reducir tus ingresos o aumentar tus gastos en los próximos dos años?',[
    ['no','No preveo ninguno'],['covered','Sí, pero ya he reservado dinero para ello'],['unfunded','Sí, y todavía no sé cómo lo cubriría'],['unknown','Mi situación es incierta']]),
  choice('debt',1,'¿Cómo te encuentras con tus deudas?',[
    ['none','No tengo deudas'],['manageable','Tengo cuotas que puedo pagar con normalidad'],['expensive','Pago tarjetas o créditos con intereses que me cuestan mucho'],['arrears','Me cuesta pagar o tengo recibos pendientes'],['unknown','No conozco bien el coste de mis deudas']]),
  money('savings',2,'¿Cuánto tienes disponible hoy en cuentas y ahorros que puedes usar sin vender inversiones ni tu vivienda?','Incluye aquí todo tu dinero disponible, también el que quieres invertir. No incluyas dinero prestado.'),
  money('nearCosts',2,'¿Cuánto de ese dinero necesitas reservar para gastos importantes en los próximos dos años?','Por ejemplo, una entrada, estudios, una reforma o un cambio de trabajo. No cuentes de nuevo los gastos mensuales normales.'),
  money('initial',2,'De esos ahorros, ¿con cuánto te gustaría empezar?','Indica el importe de la inversión inicial. Contrastaremos si deja suficiente margen para imprevistos.'),
  money('monthly',2,'¿Cuánto podrías añadir cada mes sin apretarte ni pedir dinero prestado?','Puedes poner 0. Lo contrastaremos con lo que entra y sale cada mes.'),
  choice('borrowed',2,'¿Para aportar ese dinero necesitarías pedir un préstamo, usar una tarjeta o vender algo que necesitas?',[
    ['no','No, sale de mis propios ahorros'],['yes','Sí, al menos una parte'],['unknown','Todavía no lo sé']]),
  choice('emergency',2,'Si mañana se estropeara algo caro en casa o dejaras de cobrar unos meses, ¿de dónde saldría el dinero?',[
    ['reserve','De ahorros que dejaría aparte'],['portfolio','Tendría que sacar de esta inversión'],['credit','Tendría que pedir ayuda o crédito'],['unknown','No lo tengo previsto']]),
  choice('loss10',3,'Imagina que lo invertido pasa de {capital} a {minus10} en unos meses. ¿Qué harías?',[
    ['sell','Lo sacaría todo para no ver más pérdidas'],['reduce','Sacaría una parte para estar más tranquilo'],['hold','Lo mantendría si mi situación y mi plan siguen iguales'],['add','Consideraría añadir más, solo con dinero que no necesito'],['unknown','No sé cómo reaccionaría']], 'Es una caída del 10 %. Es un ejemplo, no una previsión ni la mayor pérdida posible.'),
  choice('loss25',3,'Ahora imagina que cae de {capital} a {minus25} y nadie sabe cuándo se recuperará. ¿Qué harías?',[
    ['sell','Lo sacaría todo'],['reduce','Reduciría bastante lo invertido'],['hold','Podría mantenerlo varios años sin contar con una recuperación segura'],['add','Podría mantenerlo y quizá añadir más de mis ahorros disponibles'],['unknown','Necesitaría entender mejor la situación']], 'Es una caída del 25 %. Las pérdidas pueden ser mayores y la recuperación no está garantizada.'),
  choice('sleep',3,'Si vieras varios meses seguidos con pérdidas, ¿cómo afectaría a tu día a día?',[
    ['severe','Me quitaría el sueño o me obligaría a cambiar el plan'],['worried','Me preocuparía bastante y querría reducirlo'],['calm','Me preocuparía, pero podría seguir el plan'],['unknown','No lo sé porque no lo he vivido']]),
  money('maxLoss',3,'Pensando en {capital}, ¿qué cantidad máxima podrías aceptar ver perdida sin abandonar tu plan?','No es una promesa de límite: se puede perder más. Pon 0 si necesitas conservar todo el capital.'),
  choice('impact',3,'Si perdieras una parte importante y no la recuperaras, ¿qué cambiaría en tu vida?',[
    ['essentials','Me faltaría para gastos básicos o deudas'],['goal','Tendría que renunciar a un objetivo importante'],['adjust','Tendría que ajustar algunos planes, pero mantendría mis gastos básicos'],['limited','No comprometería mis gastos ni objetivos esenciales'],['unknown','No sé valorar ese impacto']]),
  choice('past',3,'¿Has visto antes bajar dinero que tenías invertido?',[
    ['never','No me ha pasado'],['sold','Sí, y lo saqué por miedo o necesidad'],['held','Sí, y mantuve el plan'],['added','Sí, y pude añadir más sin necesitar ese dinero']]),
  choice('experience',4,'¿Qué has usado antes para ahorrar o invertir?',[
    ['none','Solo efectivo o una cuenta bancaria'],['deposit','También depósitos o productos que entendía como ahorro estable'],['funds','Fondos o cestas de inversiones diversificadas'],['stocks','Acciones u otras inversiones que suben y bajan'],['unknown','No sé bien qué productos he tenido']]),
  choice('frequency',4,'¿Con qué frecuencia has tomado decisiones sobre inversiones que suben y bajan?',[
    ['never','Nunca'],['rare','Alguna vez, con ayuda'],['regular','Periódicamente desde hace al menos un año'],['often','Con frecuencia desde hace varios años']]),
  choice('diversify',4,'Si una empresa va mal, ¿qué suele depender menos de lo que le pase a esa empresa?',[
    ['single','Tener todo mi dinero en esa empresa'],['basket','Repartirlo entre muchas empresas y otros tipos de inversión'],['same','Da igual cómo lo reparta'],['unknown','No lo sé']]),
  choice('bondKnowledge',4,'Alguien te ofrece una cesta de préstamos a gobiernos y empresas. ¿Qué crees que puede pasar con su valor?',[
    ['fixed','No puede bajar, porque se llaman préstamos'],['changes','Puede subir o bajar; también hay riesgo de no cobrar'],['guaranteed','Siempre me devolverán todo cuando yo quiera salir'],['unknown','No lo sé']]),
  choice('returnKnowledge',4,'Una inversión ganó dinero durante varios años. ¿Qué te dice eso del año que viene?',[
    ['safe','Que ya es una inversión segura'],['repeat','Que probablemente recibiré la misma cantidad'],['uncertain','Que podría ganar o perder; lo anterior no lo asegura'],['unknown','No lo sé']]),
  choice('inflation',4,'Si tu dinero no cambia de cantidad y los precios suben, ¿qué ocurre?',[
    ['less','Puedo comprar menos cosas'],['same','Puedo comprar lo mismo'],['more','Puedo comprar más cosas'],['unknown','No lo sé']]),
  choice('balance',5,'¿Qué mezcla encaja mejor con la forma en que te gustaría cuidar tu dinero?',[
    ['stable','Que casi todo busque movimientos más suaves y solo una parte pequeña busque crecer'],['mostlyStable','Que la mayor parte busque estabilidad y el resto crecimiento'],['balanced','Repartirlo de forma parecida entre estabilidad y crecimiento'],['growth','Que la mayor parte busque crecer, aceptando más altibajos'],['unknown','Necesito ver ejemplos antes de elegir']], 'La parte más estable también puede perder. La parte de crecimiento participa en muchas empresas y puede tener caídas fuertes.'),
  choice('tradeoff',5,'Si un plan con menos sobresaltos creciera menos que el de otras personas, ¿cómo te sentirías?',[
    ['peace','Me compensaría vivir más tranquilo'],['mixed','Me daría algo de rabia, pero aceptaría la diferencia'],['growth','Preferiría más posibilidades de crecer, aceptando también mayores pérdidas'],['unknown','No lo sé']]),
  choice('guarantee',5,'¿Qué necesitas poder decir sobre el dinero que inviertes?',[
    ['required','Necesito tener garantizado que no perderé lo aportado'],['accept','Entiendo y acepto que podría terminar con menos de lo aportado'],['unknown','Antes necesito entender mejor qué podría perder']]),
  choice('restrictions',5,'¿Hay actividades o tipos de empresas en los que no quieras que participe tu dinero?',[
    ['none','No tengo restricciones concretas'],['discuss','Me gustaría hablarlo antes de elegir'],['required','Sí, es una condición importante para mí']], 'Puedes explicarlo en la nota siguiente. El reparto por tipos de inversión no comprueba esas condiciones.'),
  {id:'optimizationGoal',step:5,title:'Si tuvieras que elegir una prioridad para este plan, ¿cuál sería?',kind:'choice',optional:true,options:[{value:'sharpe',label:'Buscar la mejor compensación entre lo que puedo ganar y los altibajos que asumo'},{value:'growth',label:'Buscar el mayor crecimiento posible sin superar lo que puedo arriesgar'},{value:'stability',label:'Reducir los altibajos aunque el crecimiento sea menor'}],help:'Si no se responde, se deduce de las preferencias ya indicadas. La elección nunca eleva los límites de riesgo de la entrevista.'},
  {id:'story',step:5,title:'¿Qué te preocupa más de invertir, y qué tendría que pasar para que sintieras que el plan funciona?',kind:'text',optional:true,help:'Anota sus propias palabras. También puedes recoger preferencias sobre empresas, experiencias y objetivos adicionales.'},
];

export type InterviewReview={revision:number;reviewedAt:number;adviser:string;notes:string;nextReviewDate:string};
export function isInterviewReviewed(i:Interview):boolean{return !!i.review && i.review.revision===i.revision;}
export function reviewInterview(i:Interview,adviser:string,notes:string,nextReviewDate:string,now=Date.now()):Interview {
  if(!assessInterview(i.answers).complete)throw new Error('Completa las respuestas antes de registrar la revisión');
  if(!adviser.trim()||adviser.trim().length>180||notes.trim().length<20||notes.length>4000)throw new Error('Indica el asesor y una justificación de al menos 20 caracteres');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(nextReviewDate)||!Number.isFinite(Date.parse(nextReviewDate))||nextReviewDate<=new Date(now).toISOString().slice(0,10))throw new Error('Indica una próxima revisión posterior a hoy');
  return {...i,updatedAt:now,review:{revision:i.revision,reviewedAt:now,adviser:adviser.trim(),notes:notes.trim(),nextReviewDate}};
}
export type Interview = {
  id:string; alias:string; createdAt:number; updatedAt:number; step:number; revision:number;
  rulesVersion:1; answers:Answers; review?:InterviewReview; proposalSettings?:ProposalSettings;
  generated?:{portfolioId:string; revision:number; createdAt:number; kind?:'investment'|'planning'|'objective'; planVersion?:2|3|4};
};
export function changeInterviewAnswer(interview:Interview,key:string,value:Answer|undefined,now=Date.now()):Interview {
  const q=QUESTIONS.find(item=>item.id===key);
  if (!q || (value!==undefined && !answerIsValid(q,value))) throw new Error('Respuesta no válida');
  if (interview.answers[key]===value) return interview;
  const answers={...interview.answers};
  if (value===undefined) delete answers[key]; else answers[key]=value;
  // Changing the euro scenario invalidates its previous behavioral answers.
  if (key==='initial') { delete answers.loss10; delete answers.loss25; delete answers.maxLoss; }
  return {...interview,answers,revision:interview.revision+1,updatedAt:now};
}
export type Issue = {id:string; message:string; questions:string[]};
export type Assessment = {
  complete:boolean; ready:boolean; missing:string[]; blockers:Issue[]; warnings:Issue[];
  initial:number; monthly:number; available:number; monthlySurplus:number; reserve:number; reserveMonths:number;
  capacity:number; tolerance:number; preference:number; knowledge:number; equity:number; bonds:number;
  profile:string; reasons:string[]; stressLoss:number; goalContributions:number|null;
};
const euro = (n:number) => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
export const moneyLabel = euro;
export function questionTitle(q:Question,a:Answers) {
  const capital = typeof a.initial === 'number' && a.initial > 0 ? a.initial : 10000;
  const label = typeof a.initial === 'number' && a.initial > 0 ? euro(capital) : euro(capital)+' (ejemplo)';
  return q.title.replaceAll('{capital}',label).replaceAll('{minus10}',euro(capital*.9)).replaceAll('{minus25}',euro(capital*.75));
}
export function answerIsValid(q:Question,v:unknown):boolean {
  if (q.kind==='money') return v==='unknown' || (typeof v==='number' && Number.isFinite(v) && v>=0 && v<=1e10 && Math.abs(Math.round(v*100)/100-v)<1e-6);
  if (q.kind==='text') return typeof v==='string' && v.length<=2000;
  return typeof v==='string' && !!q.options?.some(o => o.value===v);
}
export function sanitizeAnswers(value:unknown):Answers {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Respuestas de entrevista no válidas');
  const result:Answers = {};
  for (const [id,v] of Object.entries(value)) {
    const q=QUESTIONS.find(item => item.id===id);
    if (!q || !answerIsValid(q,v)) throw new Error('Respuesta no válida: '+id);
    result[id]=v as Answer;
  }
  return result;
}
export function validateInterviews(value:unknown):Interview[] {
  if (value===undefined) return [];
  if (!Array.isArray(value) || value.length>100) throw new Error('Número de entrevistas no válido');
  const ids = new Set<string>();
  const text = (v:unknown,max:number) => typeof v==='string' && !!v.trim() && v.length<=max;
  const integer = (v:unknown,max=Number.MAX_SAFE_INTEGER) => typeof v==='number' && Number.isSafeInteger(v) && v>=0 && v<=max;
  return value.map(v => {
    if (!v || !text(v.id,160) || ids.has(v.id) || !text(v.alias,80) || !integer(v.createdAt) || !integer(v.updatedAt) || v.updatedAt<v.createdAt || !integer(v.revision) || !integer(v.step,INTERVIEW_STEPS.length) || v.rulesVersion!==INTERVIEW_RULES_VERSION) throw new Error('Entrevista no válida o versión no compatible');
    ids.add(v.id);
    const review=v.review;
    if(review && (!integer(review.revision)||review.revision>v.revision||!integer(review.reviewedAt)||!text(review.adviser,180)||!text(review.notes,4000)||!/^\d{4}-\d{2}-\d{2}$/.test(review.nextReviewDate)||!Number.isFinite(Date.parse(review.nextReviewDate))))throw new Error('Revisión de entrevista no válida');
    const g=v.generated;
    if (g && ((g.kind!==undefined&&!['investment','planning','objective'].includes(g.kind))||(g.planVersion!==undefined&&![2,3,4].includes(g.planVersion))))throw new Error('Tipo de cartera de entrevista no válido');
    if (g && (!text(g.portfolioId,160) || !integer(g.revision) || g.revision>v.revision || !integer(g.createdAt))) throw new Error('Cartera de entrevista no válida');
    return {id:v.id,alias:v.alias,createdAt:v.createdAt,updatedAt:v.updatedAt,step:v.step,revision:v.revision,rulesVersion:1 as const,answers:sanitizeAnswers(v.answers),...(v.proposalSettings!==undefined?{proposalSettings:validateProposalSettings(v.proposalSettings)}:{}),...(review?{review:{revision:review.revision,reviewedAt:review.reviewedAt,adviser:review.adviser,notes:review.notes,nextReviewDate:review.nextReviewDate}}:{}),...(g ? {generated:{portfolioId:g.portfolioId,revision:g.revision,createdAt:g.createdAt,...(g.kind?{kind:g.kind}:{}),...(g.planVersion?{planVersion:g.planVersion}:{})}} : {})};
  });
}
const lookup = (value:Answer|undefined,table:Record<string,number>,fallback=0) => typeof value==='string' ? table[value] ?? fallback : fallback;
const round = (n:number) => Math.round(n*100)/100;
export function assessInterview(raw:Answers):Assessment {
  const a=sanitizeAnswers(raw);
  const missing=QUESTIONS.filter(q => !q.optional && a[q.id]===undefined).map(q => q.id);
  const n=(id:string) => typeof a[id]==='number' ? a[id] as number : 0;
  const blockers:Issue[]=[], warnings:Issue[]=[], reasons:string[]=[];
  const issue=(id:string,message:string,...questions:string[]) => blockers.push({id,message,questions});
  const warn=(id:string,message:string,...questions:string[]) => warnings.push({id,message,questions});
  const unknown=QUESTIONS.filter(q => q.kind==='money' && a[q.id]==='unknown').map(q => q.id);
  if (unknown.length) issue('unknown-amounts','Faltan importes por concretar. No se sustituyen por ceros.',...unknown);
  const initial=n('initial'), monthly=n('monthly');
  const costs=n('expenses')+n('debtPayment');
  const reserveMonths=a.incomeStability==='stable' && a.dependents!=='sole' ? 6 : 9;
  const reserve=round(costs*reserveMonths);
  const available=round(Math.max(0,n('savings')-n('nearCosts')-reserve));
  const monthlySurplus=round(Math.max(0,n('income')-costs));
  const horizonCap=lookup(a.horizon,{short:0,medium:20,long:60,verylong:80});
  let capacity=horizonCap;
  const limitCapacity=(cap:number,reason:string) => {capacity=Math.min(capacity,cap);reasons.push(reason);};
  if (!missing.length) {
    if (initial<=0) issue('no-capital','Indica un importe inicial positivo. Si todavía no puedes empezar, guarda la entrevista y prepara primero el ahorro.','initial');
    if (costs<=0) issue('no-expenses','Revisa los gastos: hace falta una estimación real para calcular el colchón.','expenses','debtPayment');
    if (n('income')<costs) issue('deficit','Los gastos superan los ingresos. Revisa cómo cubrir esa diferencia antes de comprometer el ahorro.','income','expenses','debtPayment');
    if (initial>available) issue('reserve','La aportación dejaría sin cubrir el colchón de '+reserveMonths+' meses o los gastos próximos. Con estos datos quedan '+euro(available)+' disponibles.','savings','nearCosts','initial');
    if (monthly>monthlySurplus) issue('monthly','La aportación mensual supera el margen declarado de '+euro(monthlySurplus)+'.','monthly','income','expenses','debtPayment');
    if (a.borrowed!=='no') issue('borrowed','Aclara el origen del dinero: esta propuesta solo contempla ahorro propio que no necesitas para vivir.','borrowed');
    if (a.emergency!=='reserve') issue('emergency','Concreta una reserva aparte para imprevistos antes de generar una cartera.','emergency','savings','initial');
    if (['expensive','arrears','unknown'].includes(String(a.debt))) issue('debt','Revisa primero el coste y la situación de las deudas.','debt');
    if (a.debt==='none' && n('debtPayment')>0) issue('debt-conflict','Has indicado cuotas de préstamos y también que no hay deudas. Conviene aclararlo.','debt','debtPayment');
    if (a.change==='unfunded' || a.change==='unknown') issue('change','Concreta cómo cubrir los cambios previstos en ingresos o gastos.','change','nearCosts');
    if (a.horizon==='short' || a.horizon==='unknown') issue('horizon','El plazo es corto o incierto. Separa el dinero de ese objetivo antes de plantear una cartera con altibajos.','horizon');
    if (a.withdrawals==='regular' || a.withdrawals==='unknown' || a.goal==='income') issue('withdrawals','Hace falta un plan específico de retiradas. La cartera automática de esta entrevista está pensada para acumular ahorro.','goal','withdrawals');
    if (a.goal==='unknown' || a.flexibility==='unknown') issue('goal','Concreta el objetivo y cuánto puedes aplazarlo.','goal','flexibility');
    if (a.incomeStability==='unknown') issue('income-unknown','Aclara la estabilidad de los ingresos para valorar la capacidad económica.','incomeStability');
    if (a.guarantee!=='accept') issue('guarantee','Esta cartera puede perder dinero. Si necesitas garantía de capital o no entiendes aún las pérdidas, no encaja esta propuesta.','guarantee');
    if (a.impact==='essentials' || a.impact==='unknown') issue('impact','Las pérdidas no deben comprometer gastos esenciales. Aclara ese impacto antes de continuar.','impact');
    if (a.restrictions!=='none') issue('restrictions','Revisa las actividades o empresas que quieres excluir antes de elegir productos. El catálogo de ejemplo no aplica esos filtros.','restrictions','story');
    if (n('maxLoss')>initial) issue('loss-amount','La pérdida máxima indicada supera el dinero inicial: revisa ambas cifras.','maxLoss','initial');
    if (a.loss10==='unknown' || a.loss25==='unknown' || a.sleep==='unknown' || a.balance==='unknown' || a.tradeoff==='unknown') issue('uncertain-reaction','Comentad los ejemplos de pérdidas y la mezcla deseada; no se interpreta la duda como aceptación de riesgo.','loss10','loss25','sleep','balance','tradeoff');
  }
  reasons.push('El plazo elegido limita la parte de empresas a un máximo del '+horizonCap+' %.');
  if (a.incomeStability!=='stable') limitCapacity(40,'Los ingresos variables limitan la exposición al crecimiento.');
  if (a.dependents==='sole') limitCapacity(50,'Hay personas que dependen principalmente de estos ingresos.');
  if (a.flexibility==='none') limitCapacity(25,'La fecha del objetivo no se puede aplazar.');
  if (a.withdrawals==='occasional') limitCapacity(40,'Podrían hacer falta retiradas ocasionales.');
  if (a.impact==='goal') limitCapacity(20,'Una pérdida pondría en peligro un objetivo importante.');
  if (a.impact==='adjust') limitCapacity(60,'Una pérdida requeriría ajustar otros planes.');
  const loss10=lookup(a.loss10,{sell:0,reduce:20,hold:65,add:80});
  const loss25=lookup(a.loss25,{sell:0,reduce:25,hold:65,add:80});
  const sleep=lookup(a.sleep,{severe:0,worried:25,calm:80});
  const tradeoff=lookup(a.tradeoff,{peace:20,mixed:50,growth:80});
  const tolerance=Math.min(loss10,loss25,sleep,tradeoff);
  const preference=lookup(a.balance,{stable:20,mostlyStable:35,balanced:50,growth:80});
  const knowledgePairs:[AnswerId,string][]=[['diversify','basket'],['bondKnowledge','changes'],['returnKnowledge','uncertain'],['inflation','less']];
  const knowledge=knowledgePairs.filter(([id,correct]) => a[id]===correct).length;
  if (!missing.length && knowledge<4) issue('knowledge','Hay conceptos que explicar y volver a comprobar antes de usar el reparto: repartir el dinero, posibles pérdidas, resultados pasados y precios. No es una nota sobre la persona.',...knowledgePairs.filter(([id,correct]) => a[id]!==correct).map(([id]) => id));
  if (!missing.length && (a.loss10==='sell' || a.loss25==='sell' || a.sleep==='severe' || n('maxLoss')===0)) issue('loss-rejection','La reacción declarada indica que una cartera con pérdidas podría resultar difícil de mantener. Revisad el ejemplo y la necesidad de conservar el capital.','loss10','loss25','sleep','maxLoss');
  if (!missing.length && loss25>loss10+25) issue('reaction-conflict','La respuesta a una caída fuerte acepta más riesgo que la de una caída pequeña. Comentad por qué antes de generar el reparto.','loss10','loss25');
  if (a.past==='sold' && tolerance>=50) warn('past','Antes vendiste durante pérdidas y ahora mantendrías el plan: pregunta qué ha cambiado.','past','loss10','loss25');
  if (preference>tolerance+20) warn('preference-conflict','La mezcla que prefieres implica más altibajos de los que indican tus reacciones. Se aplica el límite más prudente.','balance','sleep','loss25');
  if ((a.experience==='none' || a.experience==='unknown') && (a.frequency==='regular' || a.frequency==='often')) issue('experience-conflict','La experiencia y la frecuencia declaradas no encajan. Aclara qué productos y decisiones hubo.','experience','frequency');
  const experienceCap=['none','deposit','unknown'].includes(String(a.experience)) || ['never','rare'].includes(String(a.frequency)) ? 40 : 80;
  if (experienceCap===40) reasons.push('La experiencia limitada mantiene el ejemplo en un máximo del 40 % en empresas.');
  // Illustrative simultaneous shock: equities -50%, bonds -15%. NOT a maximum loss or quantile.
  const acceptedLossPct=initial>0 ? n('maxLoss')/initial*100 : 0;
  const lossCap=Math.max(0,Math.min(80,Math.floor((acceptedLossPct-15)/.35/5)*5));
  if (!missing.length && acceptedLossPct<15) issue('stress-budget','Incluso el bloque de bonos superaría la pérdida que aceptas en el escenario adverso ilustrativo. Necesita otra conversación sobre capital y liquidez.','maxLoss','guarantee');
  const equity=Math.max(0,Math.floor(Math.min(capacity,tolerance,preference,experienceCap,lossCap)/5)*5);
  const bonds=100-equity;
  reasons.push('Se toma el menor límite entre capacidad económica, reacción a pérdidas, mezcla preferida, experiencia y pérdida aceptable.');
  const stressLoss=round(initial*(equity*.5+bonds*.15)/100);
  const years=lookup(a.horizon,{medium:3,long:5,verylong:10});
  const goalContributions=years>0 ? round(initial+monthly*12*years) : null;
  if (n('target')>0 && goalContributions!==null && n('target')>goalContributions) warn('goal-gap','La cifra deseada supera las aportaciones sin rentabilidad del plazo de referencia. Revisa aportación, plazo o meta; no se eleva el riesgo para alcanzarla.','target','monthly','horizon');
  if (!missing.length && monthly>0 && monthly===monthlySurplus) warn('no-slack','La aportación mensual consume todo el margen declarado. Valora dejar algo de holgura.','monthly');
  return {complete:missing.length===0,ready:missing.length===0 && blockers.length===0,missing,blockers,warnings,initial,monthly,available,monthlySurplus,reserve,reserveMonths,capacity,tolerance,preference,knowledge,equity,bonds,profile:equity<=20?'Prioridad a la estabilidad':equity<=40?'Crecimiento contenido':equity<=60?'Equilibrio con altibajos':'Prioridad al crecimiento',reasons,stressLoss,goalContributions};
}

/** Examples from the existing catalogue, never order execution or a product screening. */
export function interviewHoldings(answers:Answers):{assetId:string;amount:number}[] {
  const r=assessInterview(answers);
  if (!r.ready) throw new Error('Revisa las respuestas pendientes antes de generar la cartera');
  const equity=round(r.initial*r.equity/100), bonds=round(r.initial-equity);
  return [{assetId:'vwce',amount:equity},{assetId:r.equity<=25?'ibgs':'agh',amount:bonds}].filter(h => h.amount>0);
}

export function interviewReport(interview:Interview,legacyAllocation=true):string {
  const r=assessInterview(interview.answers);
  const lines=[`PRESTAFIN · ENTREVISTA · ${interview.alias}`,`Actualizada: ${new Date(interview.updatedAt).toLocaleString('es-ES')}`,`Reglas: ${interview.rulesVersion} · Revisión: ${interview.revision}`,'',legacyAllocation?(r.ready?'REPARTO ORIENTATIVO: '+r.profile:'PENDIENTE DE REVISIÓN'):'RESPUESTAS DECLARADAS · ver propuesta adjunta',...(legacyAllocation?r.blockers:[]).map(i=>'• '+i.message),...r.warnings.map(i=>'• '+i.message)];
  if (r.complete && budgetIsKnown(interview.answers)) lines.push('',`Aportación inicial: ${euro(r.initial)} · mensual: ${euro(r.monthly)}`,`Reserva separada: ${euro(r.reserve)} (${r.reserveMonths} meses) · Gastos próximos: ${euro(Number(interview.answers.nearCosts))}`,`Disponible después de reservas: ${euro(r.available)}`);
  if (legacyAllocation && r.ready) lines.push(`Empresas (renta variable): ${r.equity}% · Bonos (renta fija): ${r.bonds}%`,`Escenario hipotético simultáneo: empresas -50%, bonos -15% → pérdida ${euro(r.stressLoss)}. No es un límite de pérdida ni una previsión.`,...r.reasons);
  if(interview.generated)lines.push('',`CARTERA CREADA: ${interview.generated.kind==='objective'?'Cartera objetivo condicionada':interview.generated.kind==='planning'?'Planificación y revisión':'Borrador de inversión'} · revisión ${interview.generated.revision}${interview.generated.revision!==interview.revision?' (las respuestas cambiaron después)':''}`);
  if(interview.review)lines.push('','REVISIÓN DEL ASESOR: '+(isInterviewReviewed(interview)?'Vinculada a estas respuestas':'Desactualizada; las respuestas cambiaron'),interview.review.adviser,interview.review.notes,'Próxima revisión: '+interview.review.nextReviewDate);
  lines.push('','RESPUESTAS');
  for (const q of QUESTIONS) {
    const v=interview.answers[q.id];
    const answer=v===undefined?'Sin responder':v==='unknown'?'No lo sé todavía':q.kind==='money'?euro(Number(v)):q.options?.find(o=>o.value===v)?.label ?? String(v);
    lines.push('',questionTitle(q,interview.answers),answer);
  }
  lines.push('','Herramienta orientativa de conversación y simulación. No es un test de idoneidad validado ni una garantía de capital. Consulta en la propuesta adjunta los productos, los criterios, las condiciones y las fuentes. No hay cotizaciones de ejecución. No ejecuta compras.');
  return lines.join('\n');
}

export function budgetIsKnown(a:Answers):boolean {
  return ['initial','monthly','income','expenses','debtPayment','savings','nearCosts'].every(id=>typeof a[id]==='number');
}
