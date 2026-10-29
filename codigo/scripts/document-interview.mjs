import { writeFile } from 'node:fs/promises';
import { QUESTIONS,INTERVIEW_STEPS,questionTitle } from '../desktop-runtime/risk-profile.mjs';

const intro=`# Entrevista de inversión · Prestafin 0.2

La nueva sección **Entrevista de inversión** contiene 36 preguntas en seis bloques: 35 respuestas principales y una nota abierta opcional. Se abre desde el menú lateral o el buscador Ctrl+K. Las personas pueden responder sin conocer los términos renta fija o renta variable.

## Uso

1. Crea una entrevista por persona y usa un nombre de referencia o alias.
2. Lee las preguntas sin sugerir respuestas. Las opciones no están preseleccionadas. «No lo sé» se conserva como duda, no como un importe cero ni como aceptación de riesgo.
3. Puedes cambiar de bloque, salir y continuar después; el progreso se guarda con el resto del espacio local.
4. Revisa el resultado y vuelve a las preguntas señaladas. Los ejemplos de pérdidas se adaptan al capital inicial; si lo cambias, esas respuestas se vuelven a pedir.
5. Cuando el conjunto sea coherente, crea una **cartera de ejemplo** en Portfolio Lab. Las cantidades suman el capital inicial. El colchón queda fuera. No se compran productos ni se programan aportaciones.
6. Exporta las respuestas y el resumen como texto. También puedes exportar un guion en blanco. Las copias JSON de Ajustes incluyen todas las entrevistas.

Cambiar respuestas no altera carteras anteriores. Crear de nuevo sin cambios abre la cartera existente; tras editar, crea una nueva versión. Eliminar una entrevista conserva sus carteras. Si se elimina una cartera desde Portfolio Lab, se puede volver a generar desde su entrevista.

## Cómo se calcula

Estas son reglas explícitas de diseño para una herramienta orientativa; no son umbrales oficiales, un cuestionario psicométrico validado ni una certificación de idoneidad.

- Se reservan 6 meses de gastos y cuotas si los ingresos son estables y no hay dependientes exclusivamente a cargo; en los demás casos se reservan 9. Se apartan además los gastos extraordinarios próximos.
- La inversión inicial no puede superar el ahorro disponible tras ambas reservas. La aportación periódica no puede superar ingresos menos gastos y cuotas.
- Se separan **capacidad económica**, **tolerancia a las pérdidas**, **preferencia de mezcla** y **conocimientos/experiencia**. Una dimensión alta no compensa una restricción en otra.
- El plazo limita la parte de empresas: 20 % entre 3–5 años, 60 % entre 5–10 y 80 % a más de 10. Un plazo menor o desconocido requiere revisar el objetivo antes de generar la cartera.
- Otros límites económicos: ingresos variables 40 %, dependientes principalmente a cargo 50 %, objetivo con fecha inaplazable 25 %, retiradas ocasionales 40 %, pérdida que compromete un objetivo importante 20 % o que requiere ajustar planes 60 %.
- Las reacciones ante caídas del 10 % y del 25 %, la inquietud y la preferencia entre tranquilidad y crecimiento imponen límites separados. Se usa el menor, no una media que pueda ocultar una respuesta preocupante.
- Las mezclas descritas en lenguaje cotidiano corresponden, como referencia interna, a máximos del 20 %, 35 %, 50 % y 80 % en empresas. No pretenden medir una preferencia exacta. La experiencia limitada añade un máximo del 40 %.
- Se comprueba la comprensión de diversificación, pérdidas en bonos, resultados pasados e inflación. Si hay dudas, se muestran explicaciones y se revisan las respuestas antes de generar el ejemplo. Saber más no aumenta automáticamente el riesgo.
- Para contrastar la pérdida aceptable se usa un escenario ilustrativo simultáneo de -50 % en empresas y -15 % en bonos. El peso en empresas se limita también para que ese escenario no supere el importe declarado. No es una probabilidad, un VaR ni la mayor pérdida posible. Si incluso el bloque de bonos supera la pérdida aceptable, no se genera una cartera.
- El peso final en empresas es el menor de todos los límites, redondeado hacia abajo a intervalos de 5 puntos. El resto son bonos. Se admite una mezcla con 0 % en empresas si encaja el conjunto; los bonos siguen teniendo riesgo.
- Los objetivos ambiciosos solo abren una conversación sobre ahorro, plazo o meta: nunca elevan el riesgo para intentar alcanzarlos. La comparación de aportaciones usa 3, 5 o 10 años según el intervalo declarado y no supone rentabilidad.

Se detiene la generación ante datos incompletos, importes desconocidos, necesidad de garantías, gastos esenciales expuestos a pérdidas, déficit mensual, deudas caras o pendientes, dinero prestado, cambios económicos no cubiertos, retiradas regulares o contradicciones relevantes. Las restricciones sobre actividades o empresas requieren una revisión específica, porque los productos de ejemplo no aplican esos filtros.

## Cartera y datos

La simulación reutiliza referencias del catálogo original: VWCE para empresas globales; IBGS para bonos si la parte de empresas es de hasta el 25 %, o AGGH en los demás casos. Es una selección sencilla de ejemplo, sin evaluación individual de productos, costes, fiscalidad, liquidez, accesibilidad o sostenibilidad. Los parámetros esperados del catálogo no son cotizaciones ni rendimientos garantizados.

Las entrevistas funcionan sin conexión. No se envían respuestas a Lovable, Supabase ni servicios de IA. Abrir posteriormente Portfolio Lab puede pedir precios de los símbolos de la cartera al proveedor de mercado existente; la entrevista y sus importes no forman parte de esa consulta.

Los datos se guardan en el archivo local, sin cifrar. Evita anotar identificadores personales innecesarios. El motor se encuentra en \\src/lib/risk-profile.ts; la interfaz en \\desktop-ui/interview.tsx. Las reglas llevan versión 1 y las copias anteriores a esta función se migran con la lista de entrevistas vacía.

## Referencias para el diseño

La distinción entre objetivos, conocimientos/experiencia y situación financiera sigue las dimensiones generales explicadas por la CNMV. Las preguntas y los umbrales numéricos son propios de esta implementación, no una reproducción ni una validación del supervisor.

- CNMV, evaluación de la idoneidad: https://www.cnmv.es/portal/inversor/idoneidad?lang=es
- ESMA, directrices sobre determinados aspectos de los requisitos de idoneidad de MiFID II, ESMA35-43-3172: https://www.esma.europa.eu/document/guidelines-certain-aspects-mifid-ii-suitability-requirements-1

## Guion completo

En este documento, los escenarios usan 10.000 € solo como ejemplo. En pantalla se adaptan al importe de la persona.
`;
const lines=[intro];
for (const [step,section] of INTERVIEW_STEPS.entries()) {
  lines.push(`\n### ${step+1}. ${section.title}\n`);
  for (const q of QUESTIONS.filter(q=>q.step===step)) {
    lines.push(`\n**${QUESTIONS.indexOf(q)+1}. ${questionTitle(q,{})}${q.optional?' (opcional)':''}**\n`);
    if(q.help) lines.push(q.help+'\n');
    if(q.options) lines.push(...q.options.map(o=>'- '+o.label));
    else lines.push(q.kind==='money'?'Respuesta: importe en euros, o «No lo sé todavía».':'Respuesta libre.');
  }
}
await writeFile(new URL('../GUIA-ENTREVISTA.md',import.meta.url),lines.join('\n'),'utf8');
console.log('Guía y 36 preguntas documentadas.');
