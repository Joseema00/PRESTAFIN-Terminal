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

# Interfaz y estudios guardados · 0.18.0

## Encontrar las funciones

- El menú lateral separa el espacio general, las herramientas de la ficha seleccionada y la cuenta. El selector de persona permanece visible.
- **Ctrl+K** o **Buscar herramienta** abre el buscador. Admite palabras con o sin tildes, flechas, Intro y Escape. Puedes ir directamente a correlaciones, optimización, cuestionario, seguimiento o informes.
- En Carteras, **Construir** reúne composición, cartera automática, modelos, optimización y criterios; **Analizar**, riesgo, estrés, Monte Carlo, benchmark y proyección; **Gestionar**, seguimiento, rebalanceo, comparación y fichas.
- **Cómo empezar** muestra cuatro pasos de orientación. No impone un flujo obligatorio.
- El selector de tema conserva tu preferencia. En ventanas estrechas, el botón de menú permite abrir la navegación.

## Abrir y recalcular un estudio

**Ver estudio guardado** muestra la ejecución conservada, con su fecha, entradas y resultados. No descarga precios ni lanza un cálculo: funciona sin conexión si la ficha ya está cargada. En esta vista no se ofrece guardar otra vez la misma versión. La sincronización de la cuenta sí necesita conexión.

Para realizar cambios, pulsa **Preparar nuevo cálculo**, revisa objetivo, base y ajustes y pulsa **Calcular cartera avanzada**. Un cambio en las posiciones o importes invalida un cálculo pendiente. Cuando el resultado sea válido, **Guardar versión del estudio** crea otra cartera y conserva la original. Reintentar el mismo guardado no crea duplicados. El capital de referencia se guarda con las nuevas ejecuciones; un cambio proporcional de importes también exige recalcular.

Si el proceso de cálculo no puede iniciarse, se usa el mismo motor local. Una incompatibilidad matemática o un tiempo de cálculo excedido se informa: no se rebajan límites para aparentar una solución válida. Los mensajes dan acceso a los ajustes, la actualización histórica o la consulta del estudio anterior.

## Completar la clasificación de un producto

En **Carteras → Optimización → Markowitz avanzado**, abre **Clasificación de los productos**. Si una posición coincide por ISIN exacto con el catálogo, se reutilizan su bloque y sus gastos conocidos, incluso si se añadió desde la búsqueda. No se identifica por similitud de nombre.

Para una posición sin información suficiente, comprueba su política de inversión y selecciona el bloque correspondiente. La elección se conserva en la cartera mediante el guardado habitual de la cuenta y aparece como **Elegido por ti**. Cambiarla conserva los ajustes del formulario, cancela un cálculo pendiente e invalida su resultado sin alterar los estudios ya guardados. Eliminar la elección vuelve a la clasificación registrada, si existe. Los productos y límites heredados del cuestionario mantienen su protección.

Si no encaja en ninguno de los cinco bloques (por ejemplo, un fondo mixto o una exposición a oro), usa **Usar histórico para esta cartera**, siempre que no haya restricciones por exposición que exijan clasificarla. Se necesitan al menos 24 meses cerrados y comunes. Elegir esta base no inventa una etiqueta ni elimina límites. Una clasificación manual es una hipótesis del estudio, no una verificación externa de idoneidad.

## Históricos y guardado

Al retirar posiciones se pueden reutilizar las columnas compatibles del histórico guardado, manteniendo los meses originales. Si faltan activos nuevos, se solicita actualizar las series; no se sustituyen por datos ficticios. Las nuevas versiones conservan una copia compatible del histórico de origen cuando hay capacidad en la ficha (máximo 20 históricos). Los históricos originales no se eliminan.

Se informa de errores de descarga, incompatibilidad o guardado; un error de mercado no impide consultar un estudio ya guardado. Cuando una descarga falla y existe histórico compatible, este sigue disponible. El estado inferior distingue «Guardando cambios», «Cambios pendientes» y la confirmación de guardado.

## Preparar el informe

Configura la cartera y contenido, despliega identidad, gráficos, hipótesis o conclusiones cuando los necesites, revisa el documento y pulsa **Generar PDF** en la parte superior. Se conservan todas las opciones de personalización. Las cifras del bloque de optimización corresponden al estudio original, incluido su capital cuando esté registrado.

---

# Optimización continua y estudios guardados · 0.17.0

## Uso

1. Abre una persona y una cartera con posiciones e importes registrados.
2. Entra en **Optimización → Markowitz avanzado**. Se admite un máximo de 30 posiciones con capital positivo.
3. Elige el objetivo y la base: hipótesis de planificación o histórico común real en EUR. El histórico necesita al menos 24 meses cerrados y consecutivos para todas las posiciones.
4. Ajusta el nivel Esencial, Avanzado o Cuantitativo y pulsa **Calcular cartera avanzada**. Los niveles muestran más controles; todos usan el mismo motor.
5. Examina pesos, importes teóricos, riesgo, frontera, límites y diagnósticos. Puedes comparar con la configuración estándar o restaurar valores predeterminados.
6. Pulsa **Guardar versión del estudio**. Se crea un borrador dentro de esa persona y se conserva la cartera original. Comprueba que el indicador de la terminal confirme el guardado en la cuenta; un error de sincronización no equivale a un guardado remoto confirmado.
7. En Informes, selecciona esa versión, incluye Riesgo e históricos y activa los gráficos de frontera y contribución al riesgo. El informe utiliza las cifras de la ejecución guardada.

## Métodos disponibles

| Método | Qué calcula |
| --- | --- |
| Mínima varianza | Menor varianza bajo las restricciones elegidas. |
| Máximo Sharpe | Mayor cociente entre exceso de media y volatilidad cuando existe exceso positivo. |
| Media-varianza | Media menos aversión por la mitad de la varianza. |
| Rentabilidad mínima | Menor varianza que permite alcanzar la media mínima indicada. |
| Volatilidad máxima | Mayor media admisible sin superar la volatilidad elegida. |
| Equiponderada | Mismo peso de capital por posición. |
| Inversa de volatilidad | Pesos proporcionales al inverso de la volatilidad. |
| Contribución igual al riesgo | Reparto que iguala las contribuciones a la varianza. |

Los tres últimos conservan su definición matemática. Si ese reparto incumple una restricción se explica el conflicto; no se modifica silenciosamente y se sigue llamando igual.

## Campos vacíos y ceros

Un mínimo o máximo individual vacío conserva los límites base de 0 % y 100 %. Un máximo de **0 %** excluye esa posición; una expectativa manual de **0 %** sustituye la media estimada. Una rotación máxima de **0 %** fija la composición actual. La rotación equivale a la mitad de la suma de cambios absolutos de peso. Si la cartera actual no cumple otro límite, el programa señala la incompatibilidad.

Los mínimos y máximos imposibles no se relajan. Los límites del cuestionario sobre empresas y escenario severo se transmiten a nuevas versiones. Ese escenario no limita la pérdida real. Las restricciones adicionales se suman a las heredadas.

La penalización de concentración modifica el objetivo cuadrático. Se admite en mínima varianza, rentabilidad mínima y media-varianza; no se mezcla con un método que no la utilice. La configuración estándar mantiene el objetivo, la base, la referencia y el mandato, y restablece los ajustes adicionales.

## Estimaciones y precisión

Disponibles: covarianza muestral, contracción diagonal configurable, Ledoit–Wolf con intensidad estimada, EWMA y Gerber. El nivel cuantitativo permite configurar sus parámetros y contraer las medias históricas hacia la media del universo. Las expectativas manuales prevalecen sobre esa contracción. Una ventana vacía usa toda la serie común.

Las hipótesis por clase están identificadas como tales. Se descuentan una vez los gastos corrientes conocidos; los históricos no vuelven a descontar gastos internos ya incorporados. Los activos sin clasificación suficiente no reciben hipótesis inventadas.

El cálculo muestra controles de factibilidad y del objetivo, condicionamiento de la matriz y regularización numérica si fue necesaria. Los límites se verifican después de resolver. Una configuración inviable o sin precisión suficiente devuelve un mensaje y no permite guardar un resultado inválido.

## Interpretación y conservación

Los pesos parten de los importes registrados por posición. Una valoración agregada no demuestra que se conozca el valor actual de cada instrumento. Los importes objetivo son presupuestos teóricos: necesitan redondeo, comprobación de participaciones, costes externos y revisión antes de cualquier operación.

Guardar un estudio no compra productos ni modifica el saldo disponible. Las carteras objetivo sin financiación conservan esa condición en versiones sucesivas y no generan proyecciones sobre capital inexistente. La reproducción usa la matriz y las medias originales; calcular de nuevo desde las opciones puede utilizar una ventana descargada más reciente.

La frontera y las métricas históricas son análisis dentro de muestra. No son una validación fuera de muestra, una garantía de rendimiento ni un óptimo entre todos los fondos del mercado. Se estudia el universo seleccionado, con las fuentes y restricciones indicadas.

## Funciones anteriores

La opción **Malla clásica (5 %)** conserva el cálculo anterior. Se mantienen el cuestionario, modelos privados, composición, históricos, seguimiento, escenarios, Monte Carlo, rebalanceo, informes y eliminación con confirmación.

---

# Carteras automáticas y gestión por persona · 0.15.0

## Biblioteca privada y asignación al finalizar

En **Carteras → Modelos de cartera → Añadir cartera modelo**, introducir nombre, plazo mínimo, descripción y fondos con pesos que sumen 100 %. Se pueden copiar modelos iniciales, editar los propios y eliminarlos con confirmación. Cada cuenta tiene su biblioteca; se guarda en Supabase junto a sus clientes. El editor admite las ocho clases de fondos documentadas, no cualquier ficha encontrada sin evaluación suficiente.

Al completar el último bloque del cuestionario o preparar su PDF se guarda la asignación de un modelo compatible. También se pueden retomar cuestionarios anteriores desde Cartera automática. Se compara el conjunto de 16 modelos iniciales y los privados, aplicando plazo, límites de capacidad, tolerancia, pérdidas, liquidez, reservas, experiencia, exclusiones y condiciones de protección. Entre los compatibles se utiliza crecimiento, estabilidad o Sharpe según la prioridad expresada, con desempate por costes. Estas métricas proceden de hipótesis de planificación.

Puedes seleccionar cualquier modelo para el cliente: **Asignar este modelo** si cumple los criterios, o **Seleccionar para estudio** si requiere revisión. En este último caso se guarda un borrador con las razones; no se presenta como recomendación compatible. Editar o eliminar una plantilla no modifica composiciones ya asignadas. La revisión del modelo y de la biblioteca queda registrada; regenerar tras cambios conserva las versiones anteriores.

## Crear desde el cuestionario

Abrir una persona, entrar en **Carteras → Cartera automática** o pulsar **Crear cartera desde el cuestionario**. Elegir el cuestionario respondido, el mismo que genera el PDF de respuestas.

La propuesta se calcula en pantalla a partir de su revisión guardada. Pulsar **Generar y guardar cartera** para conservarla dentro de esa persona. Las pestañas habituales permiten consultar composición, riesgo, costes y criterios del cliente. Abrir de nuevo la misma propuesta no crea duplicados. Si cambian las respuestas o las condiciones de selección, se conserva la versión anterior y se genera otra.

El apartado muestra la fecha y revisión utilizadas. Si la liquidez declarada en el cuestionario difiere de Patrimonio, señala la diferencia y usa expresamente el cuestionario: no mezcla ni sobrescribe ambos importes.

## Cómo se selecciona

Se estudian objetivos y plazo, flexibilidad y retiradas, ingresos y estabilidad, gastos y cuotas, dependientes, próximos cambios, deudas, ahorro, colchón, aportaciones, financiación prestada, pérdidas aceptadas, reacción ante caídas, experiencia, conocimientos y restricciones.

El motor conserva el mínimo de los límites de capacidad económica, tolerancia, preferencia y experiencia. La propuesta de referencia usa una malla de cinco puntos porcentuales; después se comparan las composiciones fijas de los modelos compatibles. El elegido es el mejor de esa biblioteca según el criterio, no el óptimo de todos los fondos del mercado. Sus medias y covarianzas son hipótesis documentadas de planificación, no una predicción ni un histórico real.

Por defecto utiliza fondos de inversión: monetario, renta fija corta o global y renta variable según proceda. Si no existe un fondo elegible en el bloque defensivo previsto, considera uno de menor riesgo de escenario. La asignación de modelos se limita a fondos y mantiene los ETF fuera de este flujo.

El universo automático contiene 17 productos documentados, de los que ocho son fondos. La ficha adicional de un ISIN o una entrada del buscador no acredita política, duración, crédito, costes y acceso suficientes para asignarle un peso. Se muestran esas entradas como pendientes de estudio o consulta manual. No se afirma analizar todos los fondos y activos del mercado ni conocer los disponibles en cada comercializador.

Las clases pendientes de acceso pueden aparecer en el borrador, identificadas como condicionadas a comprobar comercialización y mínimos. No se afirma que estén listas para contratar. Los costes corrientes no incluyen automáticamente intermediación, custodia, operaciones ni impuestos.

## Situaciones que cambian el resultado

- Datos financieros o preferencias imprescindibles desconocidos: se señalan las preguntas pendientes y no se genera una composición por defecto.
- Capital parcialmente disponible: se reduce el importe y se conserva la reserva.
- Falta de colchón, financiación o condiciones sin resolver: la cartera es un objetivo sin financiar y no se suma al patrimonio.
- Garantía de capital, gastos esenciales comprometidos o restricciones pendientes: se ofrece un plan de protección/revisión sin presentar fondos como garantizados.
- El reparto respeta el presupuesto del escenario de pérdida y limita las aportaciones al excedente declarado. La pérdida real puede superar el escenario.

La propuesta es un borrador para revisar; no ejecuta órdenes ni convierte el capital objetivo en una inversión realizada.

## Eliminar una cartera

Seleccionar la cartera y pulsar **Eliminar cartera**. La confirmación muestra su nombre; cancelar conserva todo. Confirmar elimina su composición, seguimiento e históricos asociados solo en esa persona. Se limpia el enlace de cartera generada del cuestionario y se conservan sus respuestas. Las otras personas y carteras permanecen intactas.

Eliminar una cuenta registrada no vende inversiones ni traslada dinero a la liquidez. Los datos manuales de Patrimonio se conservan, pero los totales derivados de las carteras se recalculan. Si se elimina la última cartera, queda una cartera vacía para continuar trabajando.

## Identidad visual y comprobación

El archivo original `Prestafin 0/logo isotipo.png` sustituye a la P anterior en el recurso compartido por bienvenida, interfaz e informes. El favicon usa el mismo archivo. El icono de ventana se prepara a partir de esa imagen en formato ICO de 256 píxeles. Los PDF del cuestionario muestran también el isotipo junto a PRESTAFIN-TERMINAL.

153 pruebas superadas; comprobación de tipos y compilación de producción correctas. Incluyen escenarios financieros, selección de fondos, guardado y versiones, eliminación/cancelación, conservación del cuestionario y aislamiento entre personas. Los perfiles usados son ficticios y no se han eliminado carteras reales durante las pruebas. La inspección gráfica del ejecutable sigue pendiente en este entorno.

Versión 0.15.0 instalada y verificada en la carpeta habitual. Para futuras actualizaciones:

```powershell
node "C:\Users\jmloe\Documents\ChatGPT\PRESTAFIN\codigo\scripts\update-local.mjs"
```

Las notas siguientes conservan la metodología previa.

# Carteras, riesgo y ficha personal · 0.6.0

## Una pantalla de cartera

Abre una persona, completa o retoma su entrevista y genera la cartera. Aparecerá en **Carteras**, con las mismas pestañas que una cartera manual. No necesitas convertirla ni importar datos para ver su composición, escenarios o estudiar sus hipótesis. **Criterios del cliente** conserva motivos, condiciones, presupuesto y fuentes. **Crear versión editable** abre un borrador independiente.

## Objetivo y Sharpe

La pregunta opcional del último bloque expresa la prioridad en lenguaje cotidiano. Si no se responde, preferir estabilidad y tranquilidad conduce al objetivo de menor volatilidad; preferir crecimiento y aceptar sus altibajos conduce al mayor crecimiento; las preferencias intermedias usan Sharpe.

La creación utiliza medias anuales brutas supuestas: 2,2 % a un día, 2,6 % muy corto, 3 % corto, 3,8 % bonos globales y 6,5 % empresas. Volatilidades: 0,6 / 1,5 / 3 / 6,5 / 17 %. Deduce el coste corriente conocido del producto. No son previsiones calibradas ni datos observados. Correlaciones mediante un factor común con cargas 0,1 / 0,45 / 0,65 / 0,75 / 0,2 y residuos independientes, garantizando una matriz semidefinida positiva.

La búsqueda enumera repartos sin apalancamiento ni ventas cortas en pasos de 5 puntos. Respeta los límites de exposición y del escenario adverso derivados de la entrevista. Los céntimos sobrantes no pueden elevar la exposición por encima del límite. El objetivo de crecimiento maximiza la media de esa base; estabilidad minimiza su volatilidad; Sharpe maximiza (media − referencia) / volatilidad. La referencia inicial de 2,2 % es una hipótesis editable, no una cotización oficial.

En **Optimización**, puedes elegir también el histórico descargado. Usa medias aritméticas mensuales anualizadas y covarianza con contracción fija del 25 % hacia la diagonal. Requiere cobertura de todos los productos. No resta otra vez los gastos internos contenidos en los cierres ajustados. El resultado está expuesto a error de estimación y sobreajuste del periodo. **Guardar como nueva versión** conserva la anterior, sin operar ni modificar una cuenta real.

## Riesgo integrado

Al entrar en Riesgo, Optimización, Monte Carlo, Benchmark o en la ficha, la terminal solicita los datos por sus identificadores de mercado. Los ETF del estudio tienen correspondencias de clase y bolsa; los fondos requieren que la búsqueda identifique el ISIN exacto. No se sustituye una clase por otra sin identificación.

El histórico exige 25 cierres ajustados para obtener 24 rendimientos mensuales completos y consecutivos. Los meses abiertos se excluyen; los huecos no se rellenan. Si cotiza en otra divisa, se descarga también su conversión histórica a EUR; faltas de cobertura y fechas incompatibles impiden el cálculo agregado. No se elimina una posición ausente para renormalizar las demás.

La reconstrucción utiliza los pesos actuales y reajuste mensual. No representa lo que ganó una persona antes de tener esa cartera. Si el proveedor falla o limita peticiones, aparece el motivo; la caché y el histórico previo se conservan. Los escenarios y métricas de planificación están etiquetados como modelo. No se necesita un archivo CSV.

## Registrar la evolución real

1. Comprueba en Composición los productos e importes realmente adquiridos.
2. En **Seguimiento**, elige la fecha del saldo inicial y confirma que corresponde a inversiones realizadas.
3. Elige si ese capital sale de la liquidez de la ficha o ya estaba invertido fuera de ella. En el primer caso se descuenta; se bloquea si el saldo no alcanza.
4. Registra otras valoraciones con fecha, valor total y flujo neto. Positivo es aportación, negativo retirada. Los flujos se consideran al cierre del periodo; para flujos materiales en otras fechas, utiliza valoraciones intermedias.
5. Una fecha repetida sustituye ese cierre. Las aportaciones futuras no se confunden con ganancias. El resultado monetario es cambio de saldo menos flujos; el índice encadena (saldo final − flujo al cierre) / saldo anterior.

Los cambios de saldo mantienen el reparto porcentual registrado por producto. No sustituyen una conciliación de posiciones y operaciones con el extracto. Los flujos no actualizan por sí solos las cuentas bancarias. Se conservan hasta 1.200 valoraciones por cuenta. Después de un saldo cero hay que revisar la composición antes de registrar una nueva inversión.

## Ficha patrimonial

Las cuentas con seguimiento se suman al patrimonio junto con liquidez y otros activos, descontando el préstamo registrado. Los borradores y propuestas quedan fuera. Sin cuentas registradas se conserva el comportamiento anterior para el saldo manual seleccionado. No existe una agregación bancaria ni un registro completo de todas las deudas: el formulario patrimonial mantiene un préstamo por persona, y la entrevista recoge cuotas y circunstancias adicionales.

Se guarda un cierre patrimonial por día al cambiar datos económicos. Al entrar por primera vez se registra el punto de partida. Si solo existe una fecha, se muestra el saldo y no se fabrica una curva pasada. La amortización del préstamo y las simulaciones son proyecciones identificadas como tales. La entrevista no sobrescribe automáticamente saldos patrimoniales.

## Marco consultado

- CFA Institute, Portfolio Risk and Return I: https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/portfolio-risk-return-part-1
- CFA Institute, Principles of Asset Allocation: https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/principles-asset-allocation
- ESMA, artículo 25 MiFID II (objetivos, tolerancia y capacidad de pérdidas): https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-25-assessment-suitability-and
- Correspondencias de producto: documentación del emisor enlazada en `ESTUDIO-PRODUCTOS.md`; VAGF en Vanguard; EUN6 y ERNE en iShares; FWRA en Borsa Italiana (ISIN IE000716YHJ7). Consultado el 19 de octubre de 2026. La metodología propia no se presenta como certificada por esas entidades.
