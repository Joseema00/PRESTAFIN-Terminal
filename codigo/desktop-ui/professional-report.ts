import { personWealth,accountSeries } from '../src/lib/portfolio-monitor';
import { GOAL_LABELS } from '../src/lib/allocation-engine';
import { jsPDF } from 'jspdf';
import type { Person } from '../src/lib/people';
import type { AdviserSettings,ReportPreferences,ReportSection } from '../src/lib/adviser';
import { assessInterview,isInterviewReviewed,QUESTIONS,questionTitle,budgetIsKnown } from '../src/lib/risk-profile';
import { analyseHistory,costProjection } from '../src/lib/professional-analysis';
import { monthlyPayment } from '../src/lib/finance';

export const SECTION_LABELS:Record<ReportSection,string>={summary:'Resumen personal',interview:'Entrevista y revisión',budget:'Capacidad y reservas',portfolio:'Composición de la cartera',risk:'Riesgo e históricos',costs:'Costes y poder adquisitivo',mortgage:'Préstamo e intereses',actions:'Plan de seguimiento',glossary:'Diccionario y explicaciones'};
export type ReportBlock={title:string;text:string[];headers?:string[];rows?:string[][]};
export type ProfessionalReport={id:string;createdAt:number;person:string;reference:string;firm:string;adviser:string;level:string;status:string;blocks:ReportBlock[];footer:string};
const euro=(n:number)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const pct=(n:number)=>new Intl.NumberFormat('es-ES',{style:'percent',maximumFractionDigits:2}).format(n);
export function buildProfessionalReport(person:Person,adviser:AdviserSettings,options:ReportPreferences,names:Record<string,string>={},now=Date.now(),id=crypto.randomUUID()):ProfessionalReport {
  const portfolio=person.portfolios.find(p=>p.id===person.activeId)!;
  const proposal=portfolio.proposal;
  const pending=portfolio.holdings.filter(h=>h.assetId==='interview-cash-pending').reduce((s,h)=>s+h.amount,0),planning=pending>0;
  const total=portfolio.holdings.reduce((s,h)=>s+h.amount,0),net=personWealth(person).net;
  const linkedInterview=person.interviews.find(i=>i.id===(proposal?.interviewId??person.activeInterviewId));
  const interview=proposal&&linkedInterview?.revision!==proposal.revision?undefined:linkedInterview,assessment=interview?assessInterview(interview.answers):null;
  const reviewed=!!interview&&isInterviewReviewed(interview),plain=options.level==='plain',technical=options.level==='technical';
  const blocks:ReportBlock[]=[];
  const add=(section:ReportSection,text:string[],headers?:string[],rows?:string[][])=>{if(!options.sections.includes(section))return;const existing=blocks.find(b=>b.title===SECTION_LABELS[section]);if(existing){existing.text.push(...text);if(headers)existing.headers=headers;if(rows)existing.rows=rows;}else blocks.push({title:SECTION_LABELS[section],text,...(headers?{headers}:{}),...(rows?{rows}:{})});};
  add('summary',[
    plain?`${person.name}, este documento reúne lo que has contado sobre tu situación y los datos registrados. Sirve para conversar con tu asesor y comprobar qué falta antes de tomar decisiones.`:'Resumen de la situación declarada, la cartera seleccionada y las hipótesis del análisis para apoyar la revisión profesional.',
    `Patrimonio neto registrado: ${euro(net)}. Incluye liquidez y otros activos e inversiones con seguimiento, menos el préstamo. Sin cuentas con seguimiento se conserva el saldo manual seleccionado de versiones anteriores. Las propuestas y borradores se excluyen del patrimonio.`,
    `Capital introducido en esa cartera: ${euro(total)}. No es una valoración automática actualizada; fecha de corte del documento: ${new Date(now).toLocaleDateString('es-ES')}.`,
    ...(planning?[`Cartera de planificación: ${euro(pending)} pendientes de asignar, sin producto ni rentabilidad prevista. Este importe se excluye del patrimonio neto calculado para evitar sumarlo otra vez a la liquidez declarada.`]:[]),
    ...(proposal?[`Propuesta guardada: ${proposal.kind==='objective'?'cartera objetivo condicionada':proposal.kind==='planning'?'plan de protección':'borrador de inversión'}; motor 3, revisión ${proposal.revision}. Capital asignable hoy: ${euro(proposal.fundedToday)}. No se han ejecutado operaciones.`]:[]),
    ...(proposal?[]:[assessment?.ready?`Orientación de la entrevista: ${assessment.profile}. ${reviewed?'Existe una revisión del asesor para estas respuestas.':'Pendiente de revisión del asesor para estas respuestas.'}`:'La entrevista está incompleta o presenta puntos que requieren aclaración. No se emite una propuesta personalizada de productos.']),
  ]);
  if(interview&&assessment){
    add('interview',[
      `Entrevista «${interview.alias}» · reglas ${interview.rulesVersion} · revisión ${interview.revision} · actualizada ${new Date(interview.updatedAt).toLocaleString('es-ES')}.`,
      `${QUESTIONS.filter(q=>!q.optional).length-assessment.missing.length} respuestas principales recogidas; ${assessment.missing.length} pendientes. Las respuestas «no lo sé» requieren aclaración y no equivalen a cero.`,
      ...(proposal?[]:assessment.blockers).map(x=>'Pendiente: '+x.message),...assessment.warnings.map(x=>'Conversación: '+x.message),
      ...(!proposal&&assessment.ready?[`Reparto orientativo: ${assessment.bonds} % en bonos y ${assessment.equity} % en empresas. Los bonos también pueden perder valor; no se garantiza el capital.`,`Escenario ilustrativo: empresas −50 % y bonos −15 % simultáneamente producirían una pérdida de ${euro(assessment.stressLoss)} sobre ${euro(assessment.initial)}. Puede haber pérdidas mayores. El escenario no es una previsión.`,...(!plain?assessment.reasons:[])]:[]),
      ...(interview.review?[`Revisión de ${interview.review.adviser}: ${reviewed?'vinculada a estas respuestas':'desactualizada; las respuestas cambiaron'}. ${interview.review.notes}`,`Próxima revisión prevista: ${interview.review.nextReviewDate}.`]:['Revisión profesional pendiente de registrar.']),
      'Las reglas del cuestionario son criterios propios de la herramienta y no constituyen un test de idoneidad validado. La selección final exige verificar productos, costes, disponibilidad, restricciones, preferencias de sostenibilidad y adecuación individual.',
    ],technical?['Pregunta','Respuesta declarada']:undefined,technical?QUESTIONS.map(q=>{const v=interview.answers[q.id];return [questionTitle(q,interview.answers),v===undefined?'Sin responder':v==='unknown'?'No lo sé todavía':q.kind==='money'?euro(Number(v)):q.options?.find(o=>o.value===v)?.label??String(v)];}):undefined);
  }else add('interview',[proposal?'Se conserva el resumen de la propuesta original. La entrevista se ha modificado o eliminado: sus respuestas actuales no se presentan como si hubieran generado esta versión.':'No hay una entrevista seleccionada para esta persona.']);
  add('budget',proposal?[`Capital de referencia: ${euro(proposal.amount)}. Asignable hoy a esta propuesta: ${euro(proposal.fundedToday)}.`,`Colchón separado: ${euro(proposal.reserve)}. Disponible después de reservas y gastos próximos: ${euro(proposal.available)}.`,`Falta para completar las reservas: ${euro(proposal.reserveGap)}. Falta para financiar el objetivo completo y las reservas: ${euro(proposal.fundingGap)}; estas cifras no se suman entre sí.`,`Aportación mensual limitada al margen declarado: ${euro(proposal.monthly)}. ${proposal.kind==='objective'?'Primero se completa la reserva y se revisan las condiciones antes de invertir.':'Revisar la eficiencia de las aportaciones según mínimos y comisiones.'}`]:assessment&&budgetIsKnown(interview!.answers)?[
    `Inversión inicial deseada: ${euro(assessment.initial)}; aportación mensual deseada: ${euro(assessment.monthly)}.`,
    `Reserva de emergencia orientativa: ${euro(assessment.reserve)} (${assessment.reserveMonths} meses de gastos y cuotas). Disponible después de reservas y gastos próximos: ${euro(assessment.available)}.`,
    `Margen mensual declarado tras gastos y cuotas: ${euro(assessment.monthlySurplus)}. Revisa gastos extraordinarios y cambios de ingresos antes de comprometer esa cantidad.`,
    'Estos importes proceden de la entrevista. Los saldos patrimoniales y las aportaciones de las proyecciones son registros independientes: el asesor debe conciliarlos antes de recomendar operaciones.',
  ]:['Faltan importes de la entrevista para evaluar capacidad, reservas y aportaciones. No se han reemplazado los datos ausentes por ceros.']);
  if(proposal)add('portfolio',[
    `Cartera: ${portfolio.name}. ${proposal.kind==='objective'?'Simulación de un objetivo que todavía no se puede financiar.':'Propuesta sin operaciones ejecutadas.'}`,
    ...proposal.reasons,...proposal.conditions,
    'Los importes son presupuestos en EUR. Faltan cotización, participaciones, redondeos y costes del intermediario. La elección compara un universo de 11 productos; no garantiza ser la mejor de todo el mercado.',
  ],['Producto / ISIN','Importe','Peso','Coste corriente anual'],proposal.positions.map(x=>[x.name+' / '+x.isin,euro(x.amount),pct(x.weight/100),pct(x.fee/100)+' / '+euro(x.amount*x.fee/100)]));
  else add('portfolio',[...(planning?['La posición pendiente es un registro de planificación. No representa una compra, un depósito ni una recomendación de productos.']:[]),`Cartera: ${portfolio.name}. Importes registrados en EUR, con independencia de la divisa de cotización del instrumento.`,`El porcentaje describe el reparto del capital introducido. No comprueba automáticamente el emisor, el riesgo subyacente, los costes del producto ni las restricciones de la persona.`,...(portfolio.origin?['Origen: '+portfolio.origin]:[])],['Posición','Importe registrado','Peso'],portfolio.holdings.map(h=>[h.assetId==='interview-cash-pending'?'Liquidez pendiente de asignar (sin producto)':names[h.assetId]??h.meta?.name??h.assetId,euro(h.amount),total?pct(h.amount/total):'Sin capital']));
  const audit=proposal?.optimization??portfolio.mandate;
  if(audit)add('risk',[`Objetivo de optimización: ${GOAL_LABELS[audit.goal]}. Base: ${audit.basis==='history'?'histórico hasta '+audit.dataEnd:'hipótesis de planificación'}. Referencia supuesta: ${audit.riskFree} % anual.`, `Límites: empresas como máximo ${audit.equityCap} % y pérdida del escenario severo hasta ${audit.lossLimit} %. Se evaluaron ${audit.candidateCount} repartos en pasos de ${audit.step} puntos porcentuales. Máximo de la malla evaluada, no un óptimo universal ni una garantía.`,audit.basis==='history'?'Medias mensuales anualizadas y covarianza de la muestra. La optimización retrospectiva puede sobreajustar el periodo.':'Las rentabilidades, volatilidades y correlaciones son supuestos propios del modelo, no observaciones de mercado.']);
  if(portfolio.tracking){const rows=accountSeries(portfolio),first=rows[0]!,last=rows.at(-1)!;add('portfolio',[`Seguimiento de la cuenta: ${rows.length} valoraciones declaradas, de ${first.date} a ${last.date}. Saldo actual ${euro(last.value)}. Resultado monetario desde inicio, descontando flujos: ${euro(last.value-first.value-rows.slice(1).reduce((s,r)=>s+r.netFlow,0))}. La rentabilidad usa la convención de flujos al cierre del periodo y requiere conciliar las valoraciones con los extractos.`]);}
  const data=person.histories?.find(h=>h.portfolioId===portfolio.id);
  if(proposal?.positions.length)add('risk',[`Escenario hipotético del reparto: pérdida de ${euro(proposal.stressLoss)} sobre ${euro(proposal.amount)}. No es una previsión, un máximo ni una probabilidad.`, 'Hipótesis simultáneas: empresas -50 %, bonos globales -15 %, bonos cortos -7 %, bonos muy cortos -3 %, bloque a un día -1 %. No equivalen a observaciones históricas.']);
  if(planning)add('risk',['No se calculan medidas de riesgo mientras existan importes pendientes de asignar. La ausencia de un producto no equivale a una inversión sin riesgo.']);
  else if(data){try{
    const r=analyseHistory(data,portfolio.holdings);
    add('risk',[
      `Fuente declarada: ${data.source}. Importación: ${new Date(data.importedAt).toLocaleString('es-ES')}. ${r.months} meses cerrados, de ${r.start} a ${r.end}; rentabilidades totales en EUR.`,
      'Reconstrucción con pesos actuales constantes y reajuste mensual; no es la rentabilidad real de una cuenta. No incluye costes del asesor ni fiscalidad. Las cifras pasadas no garantizan resultados futuros.',
      plain?'La volatilidad mide cuánto osciló el valor. La mayor caída muestra cuánto llegó a bajar desde un máximo anterior. VaR indica un umbral de pérdida de la muestra y ES la pérdida media de los peores resultados; ninguno limita lo que se puede perder.':'Volatilidad muestral anualizada con raíz de 12; rendimiento compuesto anualizado. VaR como cuantil empírico y ES por integración fraccional de la cola. Horizonte de pérdida: un mes.',
      `La cola al 99 % contiene solo ${r.var99.tailObservations.toFixed(2)} meses equivalentes. ${r.var99.tailObservations<10?'La escasez de observaciones hace especialmente incierta esa estimación.':'La cola histórica sigue sujeta a incertidumbre y cambios de régimen.'}`,
      ...(technical?[`Asimetría descriptiva: ${r.skewness.toFixed(3)}; exceso de curtosis: ${r.excessKurtosis.toFixed(3)}; autocorrelación a un mes: ${r.autocorrelation.toFixed(3)}; autocorrelación de cuadrados: ${r.squaredAutocorrelation.toFixed(3)}.`,`Comprobación temporal VaR 95 %: ${r.backtest.breaches} excedencias / ${r.backtest.observations} meses evaluables, frente a ${r.backtest.expected.toFixed(1)} esperadas. Ventanas previas de 60 meses; sin observaciones futuras en cada cálculo. No es una certificación estadística del modelo.`]:[]),
    ],['Medida','Resultado'],[['Rendimiento anualizado histórico',pct(r.annualizedReturn)],['Volatilidad anualizada',pct(r.volatility)],['Mayor caída observada',pct(r.drawdown)],['VaR 95 % · un mes',pct(r.var95.var)+' / '+euro(r.var95.var*total)],['ES 95 % · un mes',pct(r.var95.es)+' / '+euro(r.var95.es*total)],['VaR 99 % · un mes',pct(r.var99.var)+' / '+euro(r.var99.var*total)],['ES 99 % · un mes',pct(r.var99.es)+' / '+euro(r.var99.es*total)],['Posiciones efectivas · 1 / suma de pesos²',r.effectivePositions.toFixed(2)]]);
  }catch(error){add('risk',['No se calculan medidas históricas: '+(error instanceof Error?error.message:'Datos incompatibles')]);}}
  else add('risk',['No hay un histórico completo guardado para esta cartera. Se omiten las medidas históricas en lugar de usar referencias del catálogo como si fueran observaciones. La terminal lo descarga al abrir Análisis de riesgo cuando el proveedor tiene cobertura.']);
  if(proposal?.positions.length)add('costs',[`Coste corriente ponderado de los productos: ${proposal.feePct.toFixed(3)} % anual, aproximadamente ${euro(proposal.feeAnnual)} sobre capital constante. Datos del emisor revisados el ${proposal.catalogDate}.`, 'TER/OCF: no incluyen todos los gastos de negociación, spreads, transacciones, custodia, asesoramiento ni fiscalidad. No confundir con una rentabilidad neta.']);
  if(proposal?.kind==='objective')add('costs',['Proyección de acumulación omitida: el capital de esta cartera objetivo no está disponible hoy. El coste indicado solo describe el escenario de referencia.']);
  else if(planning)add('costs',['Proyecciones omitidas: primero debe definirse qué capital se invertirá y en qué productos. No se aplica una rentabilidad supuesta al dinero pendiente.']);
  else if(options.sections.includes('costs')){
    const productFee=proposal?.feePct??options.productFee,contribution=proposal?.monthly??person.profile.monthlyContribution;
    const fee=options.advisoryFee+options.custodyFee+productFee;
    const projection=costProjection(total,contribution,options.years,options.grossReturn,fee,options.entryFee,options.inflation);
    add('costs',[
      `Hipótesis editadas por el asesor: rendimiento bruto ${options.grossReturn} % anual; inflación ${options.inflation} %; ${options.years} años; aportación mensual ${euro(contribution)} al final de cada mes. No son previsiones ni datos del mercado.`,
      `Costes anuales: asesoramiento ${options.advisoryFee} %, custodia ${options.custodyFee} %, productos ${productFee.toFixed(3)} %; suma ${fee} %. Entrada sobre capital inicial: ${options.entryFee} %. Un cero significa que se ha introducido cero, no que el producto sea gratuito.`,
      `Al final del supuesto: ${euro(projection.net)} después de costes; ${euro(projection.real)} en poder adquisitivo de hoy. Costes acumulados: ${euro(projection.paid)}. Impacto total frente al escenario sin costes: ${euro(projection.impact)}, incluyendo la diferencia de capitalización.`,
      'Modelo determinista: rendimiento mensual constante; factor mensual de coste derivado de la tasa anual agregada. Sin impuestos, spreads, costes de transacción, salidas ni costes sobre nuevas aportaciones. Evita descontar dos veces gastos ya incluidos en una rentabilidad neta.',
    ],['Año','Sin costes','Después de costes','Euros de hoy'],projection.rows.filter(x=>!plain||x.year===1||x.year%5===0||x.year===options.years).map(x=>[String(x.year),euro(x.gross),euro(x.net),euro(x.real)]));
  }
  const m=person.mortgage,q=monthlyPayment(m.principal,m.rate,m.years),n=Math.max(1,Math.round(m.years*12));
  add('mortgage',m.principal>0?[`Capital pendiente registrado: ${euro(m.principal)}; tipo nominal anual ${m.rate} %; plazo ${m.years} años.`,`Cuota mensual teórica: ${euro(q)}. Intereses teóricos hasta el final: ${euro(Math.max(0,q*n-m.principal))}. Sistema francés con cuotas constantes y tipo fijo supuesto.`,`Amortización adicional registrada: ${euro(m.extraMonthly)} al mes; no incluida en esta cuota base. Consulta el simulador para comparar estrategias.`,`No es la TAE ni una oferta vinculante. Faltan seguros, comisiones, fechas exactas, reglas contractuales de revisión del tipo y posibles compensaciones por amortización.`]:['No se ha registrado capital pendiente de préstamo.']);
  add('actions',[
    ...(!reviewed?['Completar o actualizar la revisión del asesor antes de emitir una propuesta de productos.']:[]),
    ...(!data?['Actualizar y contrastar el histórico desde Análisis de riesgo antes de entregar cifras históricas.']:[]),
    'Conciliar saldos, deudas, reservas y aportaciones con documentación actualizada; confirmar circunstancias que hayan cambiado.',
    'Explicar las pérdidas posibles y los costes en euros; comprobar la comprensión con palabras de la persona.',
    'Documentar la selección de productos y las preferencias, restricciones y sostenibilidad; entregar la información aplicable antes de cualquier operación.',
    interview?.review?'Fecha prevista para revisar el expediente: '+interview.review.nextReviewDate+'.':'Fijar la próxima revisión y qué cambios exigirían adelantarla.',
    ...(options.notes.trim()?[options.notes.trim()]:[]),
  ]);
  add('glossary',[
    'Renta fija: préstamos a gobiernos o empresas. Su valor puede bajar por tipos, impago o falta de compradores. «Fija» no significa «sin riesgo».',
    'Renta variable: participaciones en empresas. Puedes ganar o perder y las caídas pueden ser intensas y prolongadas.',
    'Diversificación: repartir exposiciones reduce la dependencia de una sola inversión. No impide pérdidas generales.',
    'Liquidez: posibilidad de recuperar dinero cuando lo necesitas y a un precio razonable. Una reserva para imprevistos tiene una función distinta a la cartera.',
    'Inflación y costes: reducen lo que el dinero permite comprar. Compara siempre importes, plazos y conceptos equivalentes.',
    ...(technical?['Riesgo de modelo: una fórmula, una muestra o una hipótesis pueden representar mal el futuro. La calidad del cálculo no elimina el error de estimación, los sesgos de datos ni los cambios de dependencia entre activos.']:[]),
  ]);
  blocks.push({title:'Alcance, fuentes y límites',text:[
    'Documento de trabajo de Prestafin Terminal 0.5.0. Los saldos, respuestas y preferencias son datos declarados. La revisión registrada no es una firma electrónica ni un certificado de cumplimiento. Este informe no sustituye la evaluación de idoneidad ni su explicación individualizada por el profesional responsable.',
    'Los escenarios son hipotéticos. No se garantizan rentabilidades ni límites de pérdida. No se ejecutan operaciones. Fiscalidad y condiciones de productos requieren verificación individual y vigente.',
    'Fundamentos del módulo de análisis: Gerber y colaboradores (dependencia robusta, apéndice A-3); McNeil, Frey y Embrechts (VaR/ES y riesgo de cola); Danielsson y Tsay (volatilidad y diagnóstico temporal); Paleologo (concentración y contribución al riesgo); Hull (sensibilidad de bonos). Las implementaciones son parciales y no reproducen íntegramente los libros ni sus modelos.',
    'Referencias profesionales: CNMV, Idoneidad y Asesoramiento (cnmv.es/portal/inversor/idoneidad y /asesoramiento); ESMA, directrices sobre idoneidad; AEPD, seguridad de los tratamientos. Consultadas en octubre de 2026. La adecuación normativa de cada servicio debe ser validada por la entidad.',
    ...(proposal?[`Estudio de productos revisado el ${proposal.catalogDate}; identificación por ISIN. Acceso y documentación precontractual deben confirmarse con el comercializador.`,...proposal.positions.map(x=>x.isin+': '+x.source)]:[]),
    ...(adviser.registration?['Identificación profesional declarada por el asesor (sin verificación automática): '+adviser.registration]:[]),
    ...(adviser.email?['Contacto del despacho: '+adviser.email]:[]),
  ]});
  return {id,createdAt:now,person:person.name,reference:person.reference||person.id.slice(-6),firm:adviser.firm||'Prestafin',adviser:adviser.adviser||'Asesor pendiente de identificar',level:plain?'Explicación sencilla':technical?'Anexo técnico':'Lectura detallada',status:reviewed?'Documento de trabajo · entrevista revisada':'Borrador · revisión pendiente',blocks,footer:adviser.footer};
}

/** Reusable paginated layout; rows and text split before crossing the footer. */
export function professionalPDF(report:ProfessionalReport,logo?:string){
  const pdf=new jsPDF({unit:'mm',format:'a4',compress:true}),left=18,width=174,bottom=276;let y=0;
  const clean=(s:string)=>s.replaceAll('\u202f',' ').replaceAll('\u00a0',' ').replaceAll('−','-').replaceAll('→',' > ').replaceAll('²','2');
  function header(){pdf.setFillColor(17,57,57);pdf.rect(0,0,210,31,'F');if(logo){pdf.setFillColor(255,255,255);pdf.roundedRect(left,6,46,18,2,2,'F');pdf.addImage(logo,'PNG',left+4,10,38,9);}else{pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text('PRESTAFIN',left,18);}pdf.setTextColor(255);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('INFORME PERSONAL',192,14,{align:'right'});pdf.text(clean(report.reference).slice(0,45),192,21,{align:'right'});y=41;}
  function page(){pdf.addPage();header();}
  function need(height:number){if(y+height>bottom)page();}
  function paragraph(text:string,size=9){pdf.setFont('helvetica','normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(text),width) as string[];const height=lines.length*4.6+3;if(height<bottom-41)need(height);pdf.setFont('helvetica','normal');pdf.setFontSize(size);for(const line of lines){need(5);pdf.setFont('helvetica','normal');pdf.setFontSize(size);pdf.setTextColor(35,61,63);pdf.text(line,left,y);y+=4.6;}y+=3;}
  function title(text:string){need(17);pdf.setDrawColor(195,215,211);pdf.line(left,y-3,192,y-3);pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.setTextColor(17,76,70);const lines=pdf.splitTextToSize(clean(text),width) as string[];for(const line of lines){pdf.text(line,left,y+3);y+=5.5;}y+=7;}
  function table(headers:string[],rows:string[][]){
    const widths=headers.length===2?[width*.58,width*.42]:Array(headers.length).fill(width/headers.length) as number[];
    function draw(cells:string[],head:boolean){
      pdf.setFont('helvetica',head?'bold':'normal');pdf.setFontSize(head?8:8.5);
      const lines=cells.map((cell,i)=>pdf.splitTextToSize(clean(cell),widths[i]!-6) as string[]);let offset=0,max=Math.max(...lines.map(x=>x.length),1);
      const rowHeight=max*4+4;
      if(!head&&rowHeight<bottom-55&&y+rowHeight>bottom){page();draw(headers,true);}
      while(offset<max){if(y+10>bottom){page();if(!head)draw(headers,true);}const fit=Math.max(1,Math.floor((bottom-y-4)/4)),count=Math.min(max-offset,fit),height=count*4+4;
        if(head){pdf.setFillColor(229,239,235);pdf.rect(left,y-3,width,height,'F');}
        pdf.setTextColor(35,61,63);pdf.setFont('helvetica',head?'bold':'normal');pdf.setFontSize(head?8:8.5);
        let x=left;for(let i=0;i<cells.length;i++){pdf.text(lines[i]!.slice(offset,offset+count),x+3,y+1,{lineHeightFactor:1.33});x+=widths[i]!;}y+=height;offset+=count;
        if(offset<max){page();if(!head)draw(headers,true);}
      }
      pdf.setDrawColor(225,232,230);pdf.line(left,y-3,192,y-3);
    }
    need(20);draw(headers,true);for(const row of rows)draw(row,false);y+=8;
  }
  header();
  pdf.setFont('helvetica','bold');pdf.setFontSize(21);pdf.setTextColor(17,57,57);
  const nameLines=pdf.splitTextToSize(clean(report.person),width) as string[];pdf.text(nameLines,left,y);y+=nameLines.length*8+3;
  paragraph(report.level+' · '+report.status);paragraph(report.firm+' · '+report.adviser);paragraph(new Date(report.createdAt).toLocaleString('es-ES')+' · ID '+report.id,8);y+=6;
  for(const block of report.blocks){pdf.setFont('helvetica','normal');pdf.setFontSize(9);const firstHeight=(pdf.splitTextToSize(clean(block.text[0]??''),width) as string[]).length*4.6+3;need(Math.min(bottom-41,20+firstHeight));title(block.title);for(const text of block.text)paragraph(text);if(block.headers&&block.rows?.length)table(block.headers,block.rows);}
  if(report.footer){title('Nota del despacho');paragraph(report.footer);}
  const pages=pdf.getNumberOfPages();for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setDrawColor(210,224,220);pdf.line(18,283,192,283);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(80,100,98);pdf.text('PRESTAFIN · Información financiera personal · '+clean(report.reference).slice(0,45),18,289);pdf.text(`${i} / ${pages}`,192,289,{align:'right'});}
  pdf.setProperties({title:'Prestafin · '+report.person,subject:report.level,author:report.adviser,creator:'Prestafin Terminal 0.5.0'});return pdf;
}
