export const PORTFOLIO_GROUPS:{label:string;description:string;tools:{id:string;label:string;hint:string}[]}[]=[
 {label:'Construir',description:'Composición y decisiones',tools:[
  {id:'composicion',label:'Composición',hint:'Editar posiciones e importes'},
  {id:'automatica',label:'Cartera automática',hint:'Crear una cartera desde el cuestionario'},
  {id:'modelos',label:'Modelos de cartera',hint:'Crear y asignar modelos privados'},
  {id:'optimizacion',label:'Optimización',hint:'Calcular o consultar estudios guardados'},
  {id:'criterios',label:'Criterios del cliente',hint:'Consultar el origen de una propuesta'}]},
 {label:'Analizar',description:'Riesgo y posibilidades',tools:[
  {id:'riesgo',label:'Riesgo y correlaciones',hint:'Históricos y contribución al riesgo'},
  {id:'estres',label:'Escenarios de estrés',hint:'Estudiar pérdidas hipotéticas'},
  {id:'montecarlo',label:'Monte Carlo',hint:'Simular trayectorias posibles'},
  {id:'benchmark',label:'Benchmark',hint:'Comparar con un índice'},
  {id:'proyeccion',label:'Proyección y costes',hint:'Capital, aportaciones e inflación'}]},
 {label:'Gestionar',description:'Seguimiento y consulta',tools:[
  {id:'seguimiento',label:'Seguimiento',hint:'Registrar saldos y movimientos'},
  {id:'rebalanceo',label:'Rebalanceo',hint:'Comparar pesos actuales y objetivo'},
  {id:'comparar',label:'Comparar',hint:'Ver las carteras de la persona'},
  {id:'fondos',label:'Fichas de fondos',hint:'Consultar productos e históricos'}]}
];
export const PORTFOLIO_TOOLS=PORTFOLIO_GROUPS.flatMap(g=>g.tools);
export function portfolioSearch(search:Record<string,unknown>):{panel?:string}{return typeof search['panel']==='string'&&PORTFOLIO_TOOLS.some(t=>t.id===search['panel'])?{panel:search['panel']}:{};}
export const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const NAV=[
 {to:'/',label:'Personas',hint:'Directorio de clientes y fichas',group:'Espacio de trabajo',icon:'people'},
 {to:'/fondos',label:'Fondos e históricos',hint:'Buscar un ISIN y consultar sus series',group:'Espacio de trabajo',icon:'chart'},
 {to:'/persona',label:'Ficha de la persona',hint:'Visión general y cuestionario',group:'Ficha seleccionada',icon:'overview'},
 {to:'/entrevista',label:'Cuestionario',hint:'Respuestas, perfil y PDF',group:'Ficha seleccionada',icon:'report'},
 {to:'/mi-patrimonio',label:'Patrimonio y préstamo',hint:'Activos, deuda y aportaciones',group:'Ficha seleccionada',icon:'chart'},
 {to:'/portfolio-lab',label:'Carteras',hint:'Construir, analizar y hacer seguimiento',group:'Ficha seleccionada',icon:'chart'},
 {to:'/simulador',label:'Simulación',hint:'Comparar amortizar e invertir',group:'Ficha seleccionada',icon:'simulation'},
 {to:'/informes',label:'Informes',hint:'Preparar informes PDF personalizados',group:'Ficha seleccionada',icon:'report'},
 {to:'/suscripcion',label:'Suscripción',hint:'Plan, pagos y licencia',group:'Mi espacio',icon:'billing'},
 {to:'/cuenta',label:'Mi cuenta',hint:'Acceso y datos de la cuenta',group:'Mi espacio',icon:'people'},
] as const;
export const PERSON_ROUTES=new Set(['/persona','/mi-patrimonio','/portfolio-lab','/entrevista','/simulador','/informes','/analisis']);
