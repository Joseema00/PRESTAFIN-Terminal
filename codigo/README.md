## Versión 0.26.0 — PRESTAFIN30 y continuidad del acceso

PRESTAFIN30 activa 30 días Pro sin tarjeta en la cuenta verificada. El servidor fija inicio y vencimiento, permite un único canje por cuenta y rechaza repetirlo incluso después de caducar. No inicia una suscripción ni un cobro. La aplicación muestra los días restantes y la caducidad y cierra las funciones Pro al vencer también cuando conserva un estado en caché. Los datos y su exportación se conservan. Una licencia permanente o una suscripción vigente mantienen el acceso.

Se puede contratar el plan mensual (50 EUR) o anual (490 EUR) durante la promoción o después. Los nuevos Checkout no ofrecen 14 días y las sesiones pendientes con esa oferta se sustituyen; las suscripciones ya contratadas conservan sus condiciones. Se corrige la comprobación de licencias del pago para consultar las columnas reales del servidor. Stripe conserva los cobros y renovaciones; el canje del código no consulta ni crea tarjetas.

La RPC de canje sigue restringida al servidor, con RLS y un registro por cuenta bloqueado en transacción. La identidad y el correo confirmado se verifican con Auth en la Edge Function; se retira una lectura duplicada de auth.users que fallaba por permisos, sin conceder nuevos permisos sobre autenticación. Fuente reproducible de la configuración: supabase/sql/terminal-promo.sql.

Comprobación real con cuentas ficticias aisladas: acceso por contraseña, dos canjes concurrentes (solo uno aceptado), 30 días exactos, rechazo del segundo canje, mismo vencimiento tras volver a iniciar sesión y rechazo después de caducar. Ningún dato de clientes se ha usado para las pruebas. El 15-11-2026 Stripe devuelve una lista vacía de registros fiscales: los cobros reales siguen pendientes de esa configuración del titular. No se ha creado ningún registro fiscal por suposición ni realizado un cargo.

Se incluyen las correcciones de históricos 0.25.1 y todas las funciones de 0.25.0. Las pruebas de interfaz usan React con datos ficticios; la comprobación nativa y la instalación se documentan por separado según su resultado.

## Versión 0.25.1 — histórico exacto y cobertura por fondo

La consulta integrada prioriza el ISIN de la clase de los fondos externos. Los identificadores Yahoo `0P0001T8V7.F` y `0P0001A94F.F` se resuelven respectivamente a MyInvestor Value C (`ES0165243025`) y Cobas Large Cap P Acc EUR (`LU1598720172`). Son correspondencias exactas contrastadas en FT y con CNMV/emisor el 15-11-2026; un ISIN explícito conserva prioridad. No se buscan clases por similitud del nombre.

En la descarga comprobada, Yahoo devolvía MyInvestor C desde febrero de 2025, insuficiente para 24 rentabilidades mensuales. La descarga FT de estas mismas clases devuelve MyInvestor desde septiembre de 2024 y Cobas desde octubre de 2019: 25 rentabilidades mensuales comunes cerradas, de octubre de 2024 a octubre de 2026. Resultado puntual reproducido por el motor: `qa/history-coverage-live.json`; no garantiza la cobertura futura de la fuente ni de otras clases.

Si no hay cobertura suficiente, Riesgo muestra cada producto con nombre, ISIN, fuente, fechas y número de rentabilidades consecutivas. Distingue serie corta, meses ausentes, falta de ajustes, conversión a EUR y error del proveedor. No pasa automáticamente a hipótesis de planificación; estas siguen disponibles mediante una elección explícita. Una actualización fallida conserva el histórico compatible y muestra el error. Los nuevos históricos descargados guardan la identidad de sus posiciones y rechazan su reutilización al cambiar clase o identificador, también tras reabrir los datos. Los CSV y estudios anteriores se conservan. Los históricos integrados antiguos de fondos que no guardaban esta identidad requieren una nueva descarga para verificar la clase; no se eliminan.

Comprobación de la interfaz mediante React/DOM con datos ficticios; la captura nativa del ejecutable sigue pendiente por la restricción de Windows para iniciar el navegador/Electron en este entorno. No se han modificado los datos de ningún cliente.

## Versión 0.25.0 · recorrido del cliente y optimización automática

La ficha, el patrimonio, el cuestionario, la cartera, el análisis y el informe comparten un recorrido con accesos directos. Carteras agrupa todas sus herramientas en Construir, Analizar y Gestionar, con buscador; conserva las rutas anteriores y la malla clásica como herramienta adicional.

Markowitz abre siempre en modo avanzado automático y calcula con los importes y límites ya guardados. Los ajustes manuales continúan disponibles en un desplegable opcional. Si un objetivo necesita un umbral y se deja vacío, se usa el punto medio entre los extremos de su frontera compatible. La aversión automática de media-varianza es una regla de planificación propia: 2 + 8 × (1 − límite de RV/100), usando 60 % como referencia técnica cuando no hay mandato. No representa una estimación psicológica del cliente. La referencia anual de 2,2 % es una hipótesis, no un tipo de mercado descargado. Los ceros explícitos se conservan.

Cuando hay histórico común exacto, el modo automático usa hasta 120 meses, covarianza Ledoit-Wolf y medias contraídas al 50 % hacia la media del universo. Con al menos 72 meses, ajusta regresiones Ridge por activo: último mes, penúltimo, media de 3 meses, media y desviación de 6 meses. Alpha se elige entre 0,1/1/10/100 mediante 12 predicciones temporales anteriores a los 24 meses finales de evaluación. Cada ajuste estandariza solo su entrenamiento, limita la predicción al rango observado de ese entrenamiento y la contrae al 50 % hacia su media. La contracción entre activos del 50 % se aplica también durante selección y evaluación.

Ridge se utiliza únicamente si reduce al menos un 5 % el error cuadrático mensual agregado frente a la media histórica contraída en esas 24 predicciones fuera de muestra. Es un umbral de ingeniería propio, no significación estadística ni una garantía financiera. Los coeficientes se reajustan al histórico disponible para la siguiente estimación; no existe un modelo preentrenado con datos de clientes ni una certificación de rendimiento real. Las medias mensuales se anualizan por 12: no son pronósticos de rentabilidad a doce meses. No hay backtest de rentabilidad de cartera ni inclusión de costes de ejecución en esa comparación de predictores.

El estudio guarda las entradas resueltas, fuente, ventana y auditoría del estimador, y las incluye en su PDF. Una versión guardada se abre sin reentrenarla. La comparación estándar conserva la base y el intervalo histórico; no compara histórico con hipótesis sin indicarlo. Se cancelan los cálculos anteriores al cambiar de composición.

Sin histórico se utilizan hipótesis documentadas cuando se conocen las exposiciones. Si no se puede identificar un producto ni descargar una serie exacta, no se inventan precios ni se eluden los límites heredados. No se han alterado las respuestas ni las carteras anteriores.

Fuentes metodológicas: [Ridge](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html), [validación temporal](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html), [prevención de filtraciones](https://scikit-learn.org/stable/common_pitfalls.html). Implementación TypeScript local; no utiliza scikit-learn en producción.

Las pruebas usan perfiles y series sintéticos aislados; no acreditan rendimiento en mercados reales. Previsualización DOM/SVG posible; captura nativa y descarga real pendientes si Windows impide ejecutarlas.

## Versión 0.24.0 · entrevista → reparto → modelo existente

En Carteras → Cartera automática, selecciona la entrevista y pulsa **Asignar y guardar esta cartera**. Las respuestas determinan el reparto de referencia; el sistema filtra la biblioteca por plazo, pérdida aceptada y exclusiones y elige el modelo compatible más próximo. Deja de usar mínima varianza o Sharpe para decidir el modelo del cliente. Los empates priorizan menor monetario, coste y un identificador estable.

La pantalla principal sustituye las tres alternativas por el modelo asignado, su reparto RV/RF/monetario, fondos, ISIN, importes iniciales y aportaciones. El monetario se identifica por separado y no se presenta como renta fija. Si no hay un modelo compatible, no se inventa una cartera. Las condiciones de financiación y las respuestas originales se conservan.

La asignación guarda los fondos completos sin añadir modelos nuevos, retrasa la apertura hasta confirmar el guardado y reutiliza la misma propuesta al reintentar. Motor de entrevista 10: las propuestas antiguas se conservan y la nueva generación usa modelos de biblioteca. Los estudios avanzados siguen disponibles fuera del flujo principal.

Revisión independiente de motor y de interfaz React con datos ficticios: perfiles20/80,50/50,100/0, horizonte corto, modelos propios, presupuesto de pérdida, reservas, guardado y reintentos. Previsualización DOM completada; captura visual nativa pendiente por bloqueo de Electron/Edge en el entorno. Descargas reales de mercado pendientes. Ver registros qa/model-assignment-* para los resultados de comprobación.


### Ajustes opcionales y simulación completa

Puedes añadir productos sin importe: se guardan con 0 € y no entran en el análisis hasta completarlos. En optimización, los límites vacíos no restringen; las hipótesis técnicas vacías usan los valores automáticos visibles. Un cero explícito se conserva. Los objetivos de rentabilidad mínima y volatilidad máxima sí requieren su umbral.

El gráfico muestra los 1.500 repartos generados, sin recortes: admisibles en azul y fuera de límites en rojo. Destaca la frontera calculada, mínima varianza, resultado del objetivo y mejor Sharpe de la muestra admisible. La muestra determinista v1 combina vértices, pesos aleatorios normalizados y mezclas de puntos admisibles de la frontera. No es uniforme, no representa probabilidades ni cubre todos los repartos posibles. Los puntos coincidentes se superponen. Se reconstruye desde las entradas guardadas sin añadir grandes cargas a la cuenta ni modificar el óptimo guardado.

## Versión 0.23.0 · riesgo explicado y renta variable hasta el 100 %

Carteras → Cartera automática muestra las respuestas concretas que limitan la renta variable y enlaces para revisarlas. El perfil de mayor tolerancia puede llegar al 100 % cuando plazo, capacidad, experiencia y presupuesto de pérdida lo permiten. Mantener una inversión durante una caída ya no exige contestar que se compraría más para admitir ese límite. No se cambian respuestas guardadas para obtener un reparto determinado.

El motor continuo aplica el presupuesto de pérdidas a la cartera completa. Ya no hereda la reducción de renta variable de la malla anterior ni descarta un fondo por superar el presupuesto si se invirtiera el 100 % en él: una posición menor puede cumplirlo. El horizonte sigue determinando los bloques defensivos admisibles. Son hipótesis y reglas de planificación propias, no porcentajes impuestos ni validados por un regulador.

Los tres objetivos se calculan y las composiciones idénticas se muestran y guardan una sola vez, conservando el enfoque más próximo a las preferencias. Los fondos, pesos, importes y aportaciones se muestran sin la antigua tabla ancha; las cifras monetarias conservan dos decimales. Una falta de reservas sigue generando un objetivo sin financiar, nunca una inversión ejecutada.

Motor de entrevista 9; se conservan las fuentes y propuestas antiguas de las versiones 7 y 8. Validación: 207 pruebas automatizadas, incluidos perfiles agresivos, límites por respuesta, conservación de céntimos, presupuestos de pérdida y reapertura. Comprobación visual nativa y descarga real de mercados pendientes.

## Versión 0.22.0 · tres carteras desde la entrevista

En Carteras → Cartera automática o Modelos de cartera, selecciona la entrevista y pulsa **Crear las 3 carteras**. Se calculan Estabilidad (mínima varianza), Equilibrio (Sharpe) y Crecimiento (rentabilidad supuesta máxima), con fondos, ISIN, pesos, importes y aportaciones. Cada una distribuye el mismo capital: son alternativas y no se suman.

Las tres conservan los límites del cliente, reservas, disponibilidad y respuestas originales. Se guardan juntas con sus modelos privados; reintentar un guardado no crea duplicados. Si los objetivos producen el mismo reparto, se muestra la coincidencia; si faltan datos o se exige capital garantizado, se explica qué impide generar fondos. Se utiliza el catálogo documentado, no todo el mercado ni precios de ejecución.

Navegación principal reducida a composición, creación, modelos y comparación. Análisis avanzados, biblioteca de plantillas y propuesta individual quedan desplegables.

Validación: 203 pruebas automatizadas, comprobación TypeScript y compilación de producción. La comprobación gráfica nativa y las descargas reales siguen pendientes. Comprobar la versión instalada tras ejecutar ACTUALIZAR-PRESTAFIN.cmd; preparar un paquete no significa que Windows haya permitido instalarlo.

# Carteras con fondos según la entrevista · 0.21.0

En **Carteras → Modelos de cartera**, selecciona la entrevista y pulsa **Crear cartera con fondos**. Una sola acción guarda el modelo privado y la cartera con los fondos, ISIN, pesos e importes calculados, y abre su composición. **Guardar solo el modelo** queda como alternativa para preparar una plantilla sin crear todavía una cartera.

La selección utiliza los límites derivados del plazo, capacidad económica, reacción a pérdidas, mezcla preferida, experiencia y presupuesto de pérdida declarado. Se elige una clase de fondo por exposición elegible; las clases solapadas quedan como alternativas. Se respetan exclusiones y el enfoque más prudente. La prioridad de estabilidad, Sharpe o crecimiento sigue determinando la distribución dentro de esos límites: aceptar más riesgo no obliga a agotarlo.

**Por qué este fondo** explica su función y los importes concretos de esta propuesta. Las razones y las respuestas de origen se conservan con la cartera. Los cambios posteriores requieren otra versión. Los modelos y carteras se guardan juntos; un reintento reutiliza ambos. Si las respuestas requieren protección de capital o aclaraciones, se muestra qué revisar y no se añaden fondos incompatibles. La reserva no se invierte y los objetivos sin financiación permanecen separados del patrimonio real.

El universo es el catálogo documentado de fondos de Prestafin, no todo el mercado. Los límites numéricos, covarianzas y escenarios son hipótesis propias de planificación; no son el indicador SRI del KID ni un test de idoneidad validado. La selección sigue pendiente de confirmar KID vigente, mínimos y acceso con el intermediario. No se han realizado compras.

El generador pasa a versión 8; los modelos de origen 7 se conservan. Todos los equipos que vayan a editar las nuevas carteras necesitan 0.21.0. Actualiza con **ACTUALIZAR-PRESTAFIN.cmd** después de cerrar la terminal.

Validación 0.21.0: 199 pruebas automáticas superadas, tipos y compilación de producción correctos. Se verifican perfiles de riesgo distintos, selección de fondos, exclusiones, creación conjunta de modelo y cartera, guardado y reapertura, fallos de persistencia y reintentos sin duplicados. Revisión visual nativa y descargas reales de mercado pendientes.

## Historial 0.20.1

# Crear modelos desde entrevista · 0.20.1

En **Carteras → Modelos de cartera**, el creador está visible. Elige la entrevista, indica el nombre y pulsa **Crear y guardar modelo**. El resultado confirma el nombre guardado y muestra el modelo entre los propios. **Crear cartera con este modelo** guarda y abre su composición exacta. El enfoque más prudente sigue disponible en **Ajustar enfoque**.

Se utiliza inicialmente la entrevista activa, sin sustituirla por la vinculada a una cartera antigua. Si falla el guardado, el error permanece visible y se puede reintentar sin duplicar el modelo ni su cartera. Las plantillas de la biblioteca también se abren al terminar de guardarse. Se eliminan los pasos duplicados para abrir/cerrar el creador, el enlace que podía apuntar a un modelo oculto por un filtro y los listados informativos de activos sin acciones en Cartera automática.

Para aplicar la actualización, cierra la terminal y abre **ACTUALIZAR-PRESTAFIN.cmd** en su carpeta habitual. Si Windows mantiene bloqueado `app.asar`, el actualizador conserva la instalación anterior y el paquete preparado; no borres el archivo ni cambies sus permisos. Después de actualizar, comprueba **0.20.1** en el pie de la terminal.

No necesitas repetir la entrevista. Si faltan datos, el creador enlaza las preguntas concretas. Si las respuestas exigen protección de capital o aclaraciones incompatibles con seleccionar fondos, no permite guardar un modelo vacío. Cuando falta financiación, el reparto se muestra como objetivo futuro.

Cada modelo nuevo conserva la entrevista, sus respuestas y revisión, el patrimonio utilizado y la propuesta de origen. Puedes consultarlos en **Origen** dentro de su tarjeta y filtrar **Creados desde entrevista**. Guardar otra vez los mismos datos y nombre reutiliza el modelo; cambiar respuestas, patrimonio, nombre o enfoque crea otro sin sobrescribir el anterior. Editar un modelo generado crea una copia manual y conserva el original.

El cálculo utiliza el motor y el catálogo documentado existentes, con hipótesis de planificación. La definición del modelo no representa compras ejecutadas. La procedencia se conserva mediante el contrato de guardado de la cuenta; actualiza los dispositivos que editen estos modelos a 0.20.0 para que conozcan sus campos de origen.

Validación 0.20.1: 195 pruebas automáticas superadas, comprobación de tipos y compilación de producción correctas. Pruebas con datos sintéticos de creación, errores de persistencia, reintentos sin duplicados, cambio de entrevista y cambio de persona durante un guardado. La revisión visual nativa y las descargas reales de mercado permanecen pendientes.

## Historial 0.19

# Carteras personalizadas · 0.19.0

La cartera automática combina la entrevista con la liquidez registrada de la persona. Usa el menor saldo entre ambos registros, separa reserva y gastos próximos, limita aportaciones al margen mensual y conserva el contexto de origen con cada propuesta. Los otros activos y las inversiones con seguimiento no se convierten en efectivo disponible. Una contradicción entre deuda registrada y entrevista deja la asignación pendiente.

En **Carteras → Modelos de cartera** se puede crear la cartera de la persona y guardar su modelo privado. El reparto se calcula de forma continua con los fondos documentados elegibles y respeta los límites de exposición y pérdida de la entrevista. Cambiar el patrimonio invalida el acceso rápido a la propuesta anterior; generar otra versión conserva la original.

La vista principal muestra cifras, composición, motivos y siguiente paso. **Ver análisis, condiciones y metodología** conserva el detalle. La comparación de productos y las respuestas también permanecen disponibles en desplegables.

Se añaden seis perfiles externos de **La Pizarra de Andrés / Andbank**, con distribución publicada a **30/09/2026**, consultada el **07/11/2026**: https://andbank.es/boutiquehub/la-pizarra-de-andres/. Se distinguen crédito de alto rendimiento, emergentes y alternativos. Son referencias comparativas; no se atribuyen sus fondos, riesgos ni resultados al modelo personalizado de Prestafin.

Verificación 0.19: 187 pruebas automáticas de la revisión completa superadas, comprobación de tipos y compilación de producción correctas. La inspección visual nativa volvió a quedar bloqueada por el entorno de Windows (Edge no pudo iniciar); las series reales de mercado de los fondos no se han verificado en esta revisión. Se comprobó el contrato JSONB y las políticas de cuenta en Supabase mediante consultas de metadatos; las pruebas de escritura y reapertura usan perfiles y servicios sintéticos.

## Historial 0.18

# Prestafin Terminal 0.18.0

Verificación: 182 pruebas automáticas superadas; comprobación de tipos y compilación de producción correctas. La inspección visual nativa no pudo completarse en este entorno.

Interfaz renovada en el espacio de trabajo habitual: navegación por áreas, temas claro y oscuro, controles más legibles, menú adaptable al ancho de ventana y búsqueda directa con Ctrl+K. Carteras agrupa las catorce herramientas en Construir, Analizar y Gestionar. La guía «Cómo empezar» orienta desde la ficha hasta el informe. Se conservan las funciones y datos anteriores.

Los estudios se abren con **Ver estudio guardado**, sin ejecutar de nuevo el optimizador ni necesitar datos actuales. **Preparar nuevo cálculo** inicia otra versión. Se corrigen fallos al arrancar el worker, resultados desactualizados tras cambiar posiciones, guardados duplicados e históricos incompatibles cuando solo se han retirado posiciones. Las incompatibilidades matemáticas y la falta de cobertura se explican; no se ocultan inventando datos.

Los informes presentan sus opciones en apartados desplegables y mantienen la vista previa y el botón de PDF a mano. Véase GUIA-CARTERAS-Y-SEGUIMIENTO.md para el flujo actualizado y METODOLOGIA-Y-VALIDACION.md para las comprobaciones y sus límites.

La optimización reconoce productos del catálogo por ISIN exacto aunque se hayan añadido desde la búsqueda. El apartado **Clasificación de los productos** identifica los datos pendientes y permite guardar bloques de planificación elegidos por el usuario. Los fondos desconocidos no reciben una exposición inventada; las carteras manuales también pueden utilizar series históricas comunes.

## Historial: 0.17.0

# Prestafin Terminal 0.17.0

Comprobación de esta versión: 174 pruebas superadas, TypeScript sin errores y compilación de producción correcta. La inspección visual nativa sigue pendiente.

Nuevo bloque en **Carteras → Optimización → Markowitz avanzado**: optimización continua de hasta 30 posiciones, ocho métodos, cinco estimadores de covarianza, límites individuales y por bloque, control de rotación y comparación con la configuración estándar. Los cálculos se ejecutan en un proceso de trabajo del navegador que se puede cancelar. Se conserva la malla clásica de cinco puntos porcentuales y las funciones anteriores.

Cada versión del estudio conserva las entradas numéricas, parámetros, restricciones, resultados y diagnósticos mediante el guardado de la cuenta. Los informes incorporan la frontera y la contribución al riesgo del estudio seleccionado. Los objetivos sin capital disponible siguen identificados como no financiados.

La metodología y el alcance de las comprobaciones están en METODOLOGIA-Y-VALIDACION.md; el uso paso a paso, en GUIA-CARTERAS-Y-SEGUIMIENTO.md. Esta actualización desarrolla el bloque de construcción de carteras; no representa la implementación íntegra de todas las ampliaciones del documento de propuesta.

## Historial: 0.16.0

# Prestafin Terminal 0.16.0

Servicio de suscripciones desplegado en Supabase y conexión incorporada a la terminal. Mantiene 14 días de prueba, 50 EUR/mes y 490 EUR/año. 157 pruebas superadas. Los cobros requieren todavía guardar los secretos Stripe en el servidor y completar la configuración fiscal real. Ver GUIA-SUSCRIPCIONES.md. No se han realizado cargos.

## Historial: 0.15.0

# Prestafin Terminal 0.15.0

Clientes, cuestionarios, carteras, modelos privados y preferencias guardados en la cuenta Supabase, con separación por titular y control de conflictos entre equipos. Biblioteca editable en **Carteras → Modelos de cartera** y asignación automática al completar el cuestionario. Cualquier modelo puede seleccionarse para estudio si requiere revisión. Ver `GUIA-CUENTAS.md` y `GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

153 pruebas superadas, tipos correctos y compilación de producción. Versión 0.15.0 instalada en la carpeta habitual; 26 archivos empaquetados verificados. La migración y el guardado real de la cuenta local se han comprobado mediante consultas limitadas a su titular: están presentes los identificadores originales del cliente, sus cinco carteras y su cuestionario, además de una cartera guardada posteriormente. Se han conservado los archivos anteriores. No se ha sobrescrito ni eliminado información para realizar esta comprobación. La captura gráfica del ejecutable no ha podido completarse: Electron y Chrome finalizan antes de generar la imagen en este entorno.

## Historial: 0.14.0

**Carteras → Cartera automática** utiliza las respuestas guardadas del cuestionario para construir y explicar una propuesta, con preferencia por fondos de inversión. Amplía el estudio con un fondo monetario, conserva reservas y restricciones y distingue inversión posible, objetivo sin financiar y protección. También añade eliminación de carteras con confirmación y utiliza el isotipo original facilitado por el titular en la interfaz, los PDF y los recursos de icono. Guía: `GUIA-CARTERAS-Y-SEGUIMIENTO.md`. La actualización queda preparada en la instalación habitual hasta liberar el archivo abierto por Windows; versión instalada comprobada: 0.13.0.

## Notas de 0.10.0

Nueva sección **Suscripción**: 14 días de prueba, 50 EUR/mes o 490 EUR/año. Incluye acceso mediante código de correo, pago y gestión en Stripe, estado verificado y conservación/exportación de datos al cancelar.

**Activación externa pendiente:** la configuración de pagos permanece vacía. No hay cobros ni prueba en marcha; se conserva el uso local de esta instalación. El servidor, Stripe y el correo deben configurarse y verificarse antes de distribuir una versión comercial. Consulta `GUIA-SUSCRIPCIONES.md` para la activación y las pruebas reales pendientes.

Se mantienen los informes con isotipo y PRESTAFIN-TERMINAL y todas las funciones anteriores. La aplicación se actualiza en la carpeta fija, sin otra entrega.

Los apartados siguientes documentan las versiones anteriores.

# Prestafin Terminal 0.9.1

Los informes PDF muestran el isotipo original junto a PRESTAFIN-TERMINAL en la cabecera de todas sus páginas.

En **Fondos e históricos → Fichas e históricos**, pega un ISIN y pulsa **Buscar ISIN** (o Intro). La búsqueda consulta otras gestoras, valida el código y confirma la clase y su divisa. Las fichas encontradas se guardan para próximas sesiones. Los gráficos utilizan valores liquidativos reales con la cobertura disponible; no se garantiza que todos los ISIN del mercado tengan ficha o histórico público.

La versión conserva los gráficos interactivos, los PDF de respuestas desde la ficha personal y los datos guardados. La instalación se actualiza en la misma carpeta, sin crear otra entrega.

## Informes personalizados con gráficos

En **Informes** puedes editar título, subtítulo y objetivo; elegir portada, índice y tablas; ordenar apartados; añadir comentarios por sección y conclusiones; y seleccionar gráficos en colores Prestafin o en escala de grises. Las preferencias se guardan por persona. La firma y los datos del despacho se comparten entre informes.

Los documentos incorporan barras de balance, presupuesto y composición; un diagrama patrimonial; históricos de cierres y seguimiento; reconstrucción histórica y caídas cuando existen datos compatibles; y escenarios de costes, inflación y amortización. Los gráficos se exportan como vectores al PDF, con sus fuentes y explicaciones. No se inventan históricos ausentes ni se presentan aportaciones como rentabilidad. Los borradores de objetivos sin capital disponible no generan curvas de inversión financiada.

# Prestafin Terminal 0.8.0

Actualización de interfaz: gráficos ampliables (Esc para reducir), selección de intervalos en los históricos de fondos y cuestionarios integrados en la ficha personal con exportación a PDF. Se retiran del menú Entrevistas, Análisis de riesgo y Despacho y copias. El análisis dentro de cada cartera sigue disponible. Se conservan las personas, respuestas y carteras guardadas.

Desde Resumen de la persona → Documentos de respuestas puedes descargar un PDF o abrir Responder cuestionario. El documento identifica persona, revisión, fecha y todas las preguntas; distingue respuestas pendientes y pagina textos largos. No genera una cartera automáticamente.

Los apartados siguientes conservan la documentación de versiones anteriores.

# Actualización actual: Prestafin Terminal 0.7.0

Instalación fija en este espacio de trabajo. Consulta **GUIA-FONDOS.md** para las 15 carteras de fondos, las fichas, la cobertura y la validación de esta actualización. El resto de este documento describe la base anterior y se conserva como referencia.

# Prestafin Terminal 0.6.0

Aplicación Windows para trabajar por personas: patrimonio, préstamo, entrevistas, carteras, seguimiento, análisis de riesgo e informes. Mantiene los logos originales y funciona con guardado local, sin cuentas de pago ni sincronización con Lovable.

## Abrir

Cierra la versión anterior, extrae **todo** `Prestafin-Terminal-Windows.zip` y abre `Prestafin Terminal.exe` dentro de la carpeta extraída. Conserva sus DLL y `resources`. No requiere Node.js. Es una carpeta de aplicación x64, sin instalador ni firma digital.

## Cambios de esta versión

- Las carteras de la entrevista abren la pantalla común de **Carteras**: composición, optimización, riesgo, estrés, rebalanceo, Monte Carlo, benchmark, seguimiento, proyección, comparación y modelos. Los motivos de la propuesta están en **Criterios del cliente**.
- La entrevista incorpora una prioridad adicional, expresada sin tecnicismos: mejor compensación entre ganancias y altibajos, mayor crecimiento dentro del perfil o menor volatilidad. Si se omite, se deduce de las preferencias ya declaradas. Las preguntas anteriores siguen guardadas.
- El motor 4 busca el mejor reparto de una malla de 5 puntos porcentuales dentro del universo y los límites de riesgo admitidos. La generación usa hipótesis de planificación explícitas; Optimización también permite estudiar medias y covarianzas históricas cuando se dispone de cobertura completa. Conserva versiones y parámetros.
- Análisis de riesgo descarga las series desde la terminal, sin pedir CSV. Incluye volatilidad, Sharpe, Sortino, VaR/ES, caída máxima, correlaciones, contribuciones y escenarios en euros. La descarga puede fallar por cobertura, conexión o límites del proveedor: se conserva el histórico guardado y no se inventan observaciones.
- La ficha incluye seis gráficos: patrimonio y deuda, distribución patrimonial, evolución de cartera, ingresos y gastos, amortización proyectada y composición. Añade perfil, plazo, margen de ahorro, reserva, revisión y asuntos pendientes.
- Seguimiento registra saldos y aportaciones/retiradas. Las inversiones realizadas entran en el patrimonio solo al registrarlas; las propuestas y los borradores permanecen separados. Puede elegirse descontar el capital de la liquidez registrada.

## Datos, informes y actualización

La actualización conserva las fichas anteriores. El primer recálculo de una entrevista antigua crea otra versión. Los históricos, valoraciones y cierres patrimoniales se incluyen en las copias de **Despacho y copias**. El archivo local no está cifrado; la versión anterior se conserva como copia de recuperación.

El patrimonio suma las cuentas con seguimiento. Mientras no haya ninguna, conserva el saldo de la cartera manual seleccionada de versiones anteriores. No suma alternativas como si fueran compras. Las cuotas, saldos de préstamo y respuestas de la entrevista son datos distintos y deben conciliarse.

Los informes conservan sus niveles sencillo, detallado y técnico, secciones e hipótesis configurables. Incorporan el objetivo de optimización y el seguimiento cuando existen. Los PDF de ejemplos usan información ficticia; no representan clientes ni resultados de mercado.

## Comprobaciones y límites de la entrega

77 pruebas automáticas superadas, con 9 interacciones de interfaz, validación nativa, importación de copias, aislamiento por persona, optimización, redondeos, descarga simulada de históricos y valoración con flujos. Tipos y compilación comprobados. El inicio gráfico del ejecutable en un Windows de uso normal sigue pendiente de verificación.

En la prueba de conexión del 19 de octubre de 2026, Yahoo Finance respondió HTTP 429 para los dos símbolos consultados. La conexión integrada está implementada y verificada con respuestas controladas; no se afirma que el proveedor sirva datos siempre. No se ha acreditado una licencia comercial de redistribución. Los fondos cuya clase exacta no pueda identificarse quedan sin histórico automático.

No ejecuta compras, no ofrece una garantía de capital y no certifica idoneidad ni preparación regulatoria para comercialización. El mejor Sharpe de la malla y la muestra elegidas no garantiza el mejor resultado futuro. Lee `GUIA-CARTERAS-Y-SEGUIMIENTO.md`, `METODOLOGIA-Y-VALIDACION.md` y `ESTUDIO-PRODUCTOS.md`.

La aplicación no incorpora los servicios de cuenta, pagos, Supabase o correo de la web original. Los archivos web de referencia conservados en el código no se empaquetan en el ejecutable. Una vinculación externa entre repositorio y Lovable no se modifica desde esta aplicación.
