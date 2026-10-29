# Prestafin Terminal 0.6.0 — alcance de esta entrega

**Actualización 0.6.0:** la cartera generada utiliza la vista común. El riesgo descarga datos dentro de la terminal y el patrimonio suma las inversiones con seguimiento. Los detalles de optimización, fuentes, gráficos y valoraciones están en `GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

## Cambios que ya están implementados

- Entrevistas: entrada de euros con coma decimal y puntos de miles; guardado inmediato de valores válidos y aviso de errores al salir del campo; aviso al cambiar el capital de los escenarios; dudas separadas de respuestas completadas; navegación a la pregunta pendiente; guardado por persona.
- Revisión del asesor vinculada a la revisión de respuestas, con responsable, justificación y próxima fecha. Un cambio deja desactualizada esa revisión. La revisión es independiente de la generación del borrador. Una entrevista completa con capital definido crea inversión o planificación según las respuestas.
- Informes: tres niveles de lectura, cuatro selecciones de contenido y nueve secciones seleccionables, con vista previa y PDF. Cartera y entrevista seleccionables; opciones e hipótesis guardadas por persona. Alcance, fuentes y límites siempre incluidos.
- Análisis de riesgo: descarga integrada de rendimientos mensuales ajustados en EUR, VaR/ES al 95 % y 99 %, caída máxima, concentración, volatilidad, diagnósticos descriptivos, comprobación temporal del VaR, covarianzas muestral/contraída/Gerber y contribución al riesgo.
- Carteras: vista unificada, optimización por objetivo, escenarios, Monte Carlo, benchmark, rebalanceo y seguimiento.
- Despacho y copias: datos profesionales que aparecen en los documentos; exportación y restauración de todos los expedientes. Desaparecen el catálogo de ampliaciones y las promociones de planes de la interfaz de escritorio.
- Patrimonio por persona: suma las inversiones con seguimiento; las propuestas y los borradores no se añaden. Sin cuentas registradas conserva el saldo manual seleccionado anterior.

## Entrevistas y límites de interpretación

Se mantienen las 37 preguntas (35 principales y dos opcionales) y la evaluación base versión 1. La generación usa ahora un motor separado, versión 4, descrito en `GUIA-ENTREVISTA.md` y `ESTUDIO-PRODUCTOS.md`: capital financiable, objetivo condicionado o protección/revisión. El catálogo estudiado distingue cinco bloques y compara costes, exposición, divisa, estructura y acceso. El escenario por bloque es una hipótesis propia, no una calibración ni un límite de pérdida. Se conserva la compatibilidad con propuestas antiguas; la primera regeneración crea otra versión.

La propuesta guarda una instantánea de criterios, posiciones, costes y fuentes. Los informes usan esa instantánea y no mezclan respuestas de otra revisión. Las propuestas sin ejecutar se excluyen del patrimonio. Las de objetivo no proyectan rentabilidad sobre capital todavía no disponible.

Los importes válidos se guardan al escribirlos. Formatos admitidos: `1.234,56`, `1234,56`, `1234.56`. `1.234` significa mil doscientos treinta y cuatro. Los textos incompletos o inválidos se señalan y no sustituyen el dato por un cero. Los datos necesarios que falten se muestran con acceso directo a su pregunta. La apertura espera al guardado y los reintentos reutilizan la misma cartera.

La próxima revisión se registra como fecha planificada; no programa avisos externos ni verifica la periodicidad exigible para un servicio concreto. Las respuestas de conocimientos no sustituyen una evaluación completa de la experiencia en cada producto.

## Históricos y cálculos

El análisis histórico utiliza series descargadas automáticamente o históricos guardados anteriormente para esa cartera. No utiliza parámetros del catálogo como sustitutos de meses ausentes. El asesor debe contrastar fuente, ajustes, conversión a EUR y derechos de uso antes de entregar las cifras. La aplicación valida el formato y la cobertura; no puede acreditar esa declaración.

La pantalla ya no solicita CSV. Los históricos de copias anteriores siguen siendo compatibles con el validador interno. Entre 24 y 1.200 meses consecutivos y cerrados, de 1 a 40 posiciones. No admite rentabilidades iguales o inferiores a −100 %, huecos ni duplicados. Hay un máximo de 20 conjuntos históricos por persona; el archivo completo conserva el límite de 5 MB.

Se reconstruye una cartera con los pesos actuales, reajustados mensualmente. No es una medición de la rentabilidad real de la cuenta: no conoce sus operaciones, aportaciones pasadas ni cambios de pesos. Tiene sesgo de selección retrospectiva y no equivale a probar una estrategia ejecutable históricamente.

| Concepto | Implementación y límites |
| --- | --- |
| VaR histórico | Cuantil empírico de pérdidas mensuales; índice `ceil(confianza × n)`. Puede ser negativo si la muestra tiene ganancias. No es una pérdida máxima. |
| ES histórico | Integral empírica de la cola superior de pérdidas, con masa fraccionaria en la frontera. Evita incluir todas las observaciones empatadas indiscriminadamente. |
| Muestra de cola | Se presenta `n × (1 − confianza)`. Una cifra calculable puede seguir siendo muy incierta por escasez de observaciones. |
| Volatilidad | Desviación muestral mensual por raíz de 12. No se usa raíz de 252 ni se anualiza el VaR automáticamente. |
| Rendimiento | Composición de rendimientos, anualizada por `12 / n`. No es una previsión. |
| Contracción | 25 % fijo hacia la diagonal. No es una estimación óptima Ledoit-Wolf. |
| Gerber | Umbral 0,5 veces la desviación muestral; estados respecto a cero. Cociente `(nUU+nDD−nUD−nDU)/(T−nNN)` del apéndice A-3. Covarianza reescalada por desviaciones. Series constantes aportan varianza cero. |
| Riesgo por posición | `w_i (Σw)_i / (w'Σw)`. Suma uno cuando la varianza es positiva; puede ser negativo. Cero convencional si la varianza es nula. |
| Posiciones efectivas | `1 / suma(w_i²)`. No mide diversificación por emisores ni subyacentes de fondos. |
| EWMA | λ fijo 0,94 sobre observaciones mensuales; se muestra como hipótesis. No se presenta como parámetro calibrado ni como convención diaria trasladada automáticamente. |
| Contraste temporal | Cada VaR 95 % usa los 60 meses anteriores; se cuentan excedencias de los meses siguientes. No usa el mes que pretende anticipar. No incorpora pruebas de cobertura condicional ni certifica validez. |
| Asimetría y curtosis | Momentos descriptivos estandarizados con desviación muestral; no estimadores insesgados ni pruebas de normalidad. |
| Costes | Entrada sobre capital inicial y tasa anual agregada convertida en factor mensual; aportaciones al final del mes. Se separan pagos de costes e impacto total por capitalización. No incluye impuestos, spreads ni honorarios sobre aportaciones. |
| Bono | Cupón anual, vencimiento entero, tipo constante, sin opciones, impago ni cupón corrido. Sensibilidad mediante duración modificada y convexidad. |

## Uso de los libros aportados

Se incorporan conceptos concretos, no todos los modelos de cada obra. El artículo de Gerber sustenta el estimador robusto; Paleologo, la concentración y la descomposición de riesgo; McNeil, Frey y Embrechts, las pérdidas de cola; Danielsson y Tsay, los diagnósticos y la estimación temporal de volatilidad; Hull, la sensibilidad de renta fija. Las fórmulas, hipótesis y límites se explican en pantalla.

El libro de teoría del riesgo actuarial trata problemas distintos —seguros, siniestros y ruina— y no se ha convertido sin justificación en un generador de carteras. El libro de valoración de empresas sirve de referencia para distinguir el valor estimado del precio; esta entrega no incluye un módulo de valoración empresarial. Tampoco se implementan calibración GARCH, cópulas, EVT, modelos de crédito, derivados, factores ni optimización robusta completa. No se atribuye validación o respaldo a los autores.

## Verificación realizada

77 pruebas automatizadas superadas: guardado, reapertura, copias, migración, separación entre personas, referencias, reglas de entrevistas, entrada monetaria, revisión desactualizada, cobertura histórica, ES fraccionario, Gerber, costes y sensibilidad de bonos. Siete pruebas de la pantalla React con DOM simulado cubren los seis bloques, generación y apertura sin revisión, planificación, decimales, desconocidos, cambios de capital, errores de guardado y cambio de persona. Dos pruebas adicionales verifican informes, costes de producto, separación patrimonial y conservación de versiones. Hay regresiones específicas de conversión del plan 2 al 3, selección por criterios, acceso a fondos, exclusiones y conservación de céntimos en múltiples perfiles. No sustituyen la aceptación visual del ejecutable. Comprobación de tipos y compilación de producción superadas. Los logos originales conservan los mismos bytes.

En la versión 0.5.0 se generaron y renderizaron los tres niveles de PDF con datos ficticios, revisando las páginas, tablas y saltos. También se ha ensayado una fila excepcionalmente larga para verificar que se pagina y conserva su final. Los ejemplos no son datos de clientes ni resultados de mercado. Se conservan como muestras del formato; las incorporaciones de objetivo y seguimiento al informe 0.6.0 se verifican mediante pruebas del generador, sin una nueva comprobación gráfica nativa.

La apertura e interacción visual de la aplicación Windows no se han podido verificar: Electron/Chrome y el controlador gráfico disponible fallaron antes de cargar la interfaz. La compilación no sustituye esa prueba. Las exportaciones PDF se verificaron invocando directamente el mismo generador que utiliza la aplicación; el diálogo de descarga nativo sigue pendiente de ensayo manual.

## Pendiente antes de una venta como producto profesional

Esta entrega no se declara lista al 100 % para comercialización. Quedan comprobaciones y trabajo concretos:

1. Prueba funcional de aceptación en Windows real: entrevistas, cambios de persona, guardado, restauración y descarga; pruebas con dispositivos y escalados de pantalla previstos.
2. Revisión independiente de modelos, productos y proceso de asesoramiento. El cuestionario no está validado como evaluación de idoneidad ni cubre por sí solo todos los requisitos de un servicio.
3. Diseño y auditoría de protección de datos para el despliegue: los archivos actuales no están cifrados y no hay roles por empleado, conservación automática, auditoría inmutable ni firma.
4. Licencias de datos de mercado y de distribución; la consulta de Yahoo sigue siendo exploratoria y su uso comercial no se ha verificado.
5. Instalador firmado, actualización segura, soporte, recuperación y pruebas de despliegue. Se entrega una carpeta de aplicación x64 comprimida, sin firma ni instalador NSIS validado.
6. Si se presta asesoramiento de inversión, validación jurídica del servicio, sus responsables, documentación y autorizaciones aplicables. Esta aplicación no concede autorización profesional.

Fuentes públicas contrastadas en octubre de 2026:

- CNMV, idoneidad: https://www.cnmv.es/portal/inversor/idoneidad?lang=es
- CNMV, asesoramiento: https://www.cnmv.es/portal/inversor/asesoramiento?lang=es
- ESMA, directrices sobre requisitos de idoneidad: https://www.esma.europa.eu/document/guidelines-certain-aspects-mifid-ii-suitability-requirements-1
- AEPD, seguridad de los tratamientos: https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/seguridad-de-los-tratamientos

La CNMV explica las dimensiones de conocimientos/experiencia, objetivos y situación financiera, y la necesidad de explicar la adecuación de la recomendación. La AEPD describe medidas técnicas y organizativas proporcionadas al riesgo. Las referencias orientan el diseño; no acreditan cumplimiento automático.
