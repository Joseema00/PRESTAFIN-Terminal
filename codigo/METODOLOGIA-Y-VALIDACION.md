## Versión 0.25.0 · recorrido del cliente y optimización automática

Verificación: 232 pruebas generales y previsualización DOM/SVG adicional superadas. TypeScript y compilación correctos. Revisión independiente completada. Registros: qa/unified-final-check.log, qa/unified-final-typecheck.log, qa/unified-build.log y qa/unified-preview.log. El intento de instalación dejó preparado app.asar.next 0.25.0; la instalación conserva 0.24.0 por bloqueo EPERM de Windows.

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


Verificación 0.24: 222 pruebas generales superadas y 1 prueba adicional del SVG de Recharts que comprueba los 1.500 puntos renderizados. TypeScript sin errores. Revisión independiente de 7 casos de simulación superada. Registros: `qa/optional-simulation-check.log`, `qa/optional-simulation-typecheck.log`, `qa/optimization-cloud-render.log` y `qa/optimization-cloud-independent.log`. Esta comprobación DOM/SVG no sustituye una revisión visual nativa ni verifica descargas reales de mercado.

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

Referencias consultadas sobre las dimensiones a considerar: [CNMV · Evaluación de la idoneidad](https://internet.cnmv.es/portal/Inversor/Idoneidad?lang=es) y [ESMA · Directrices sobre idoneidad](https://www.esma.europa.eu/sites/default/files/2023-04/ESMA35-43-3172_Guidelines_on_certain_aspects_of_the_MiFID_II_suitability_requirements.pdf). Estas referencias no validan los porcentajes ni las hipótesis internas del programa.

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

Las nuevas propuestas guardan la versión 7 del generador y marcan el cálculo continuo con paso 0. Todos los equipos que abran estas propuestas deben actualizarse a 0.19.0. Las propuestas anteriores mantienen sus datos y su metodología original.

Verificación 0.19: 187 pruebas automáticas de la revisión completa superadas, comprobación de tipos y compilación de producción correctas. La inspección visual nativa volvió a quedar bloqueada por el entorno de Windows (Edge no pudo iniciar); las series reales de mercado de los fondos no se han verificado en esta revisión. Se comprobó el contrato JSONB y las políticas de cuenta en Supabase mediante consultas de metadatos; las pruebas de escritura y reapertura usan perfiles y servicios sintéticos.

## Historial 0.18

# Interfaz y recuperación · versión 0.18.0

Verificación: 182 pruebas automáticas superadas; comprobación de tipos y compilación de producción correctas. La inspección visual nativa no pudo completarse en este entorno.

La lectura de estudios se separa del cálculo: el validador verifica la instantánea existente y muestra sus resultados originales. No se modifica la fecha de la ejecución al abrirla. Las versiones nuevas incorporan el capital de referencia como campo opcional compatible con instantáneas anteriores. La fórmula de optimización y sus restricciones no cambian en esta versión.

El lanzador captura errores de creación y carga del worker y permite calcular con el mismo motor local. Los errores numéricos, respuestas incompletas y expiración de tiempo se mantienen explícitos. La cancelación impide que resultados atrasados sustituyan otra configuración. Los límites de tamaño y los controles de precisión se conservan.

El guardado comprueba tanto pesos como capital frente a la fuente; los reintentos de una ejecución guardada son idempotentes. El histórico puede alinearse con un subconjunto de posiciones sin rellenar meses ni introducir nuevas series. Los avisos de descarga, validación y guardado se muestran. Una nueva versión copia las series compatibles cuando no supera el límite existente de históricos; no elimina otras series para liberar espacio.

La identidad de productos de búsqueda se resuelve por ISIN exacto de clase, manteniendo el identificador original de la posición. No se infiere la exposición de un nombre ni del vehículo «Fondo» o «ETF». Los bloques manuales se validan contra las cinco opciones existentes, se preservan al guardar y cargar la cuenta y no sustituyen exposiciones del catálogo ni del mandato. Se comprueban clasificación pendiente, cálculo tras completarla, conservación de ajustes, validación nativa, reapertura y cálculo histórico sin clasificación inventada.

La interfaz conserva las catorce herramientas de cartera. Se validan los destinos del buscador, la navegación a pestañas concretas, la apertura y cierre por teclado y la devolución del foco. Los fallos de panel permiten reintentar sin reiniciar todo el espacio de trabajo. Se mantienen las confirmaciones de acciones destructivas y las restricciones de la cuenta.

La comprobación visual de la interfaz compilada se intentó con un perfil ficticio y un navegador aislado. Edge terminó antes de generar la captura, con errores del entorno de Windows (servicio de fallos y acceso denegado). No se considera superada la inspección visual nativa. Las pruebas de interfaz se ejecutan con Happy DOM; no sustituyen una revisión visual. No se han usado fichas personales ni efectuado cobros para las pruebas.

---

# Optimización continua · versión 0.17.0

Comprobación de esta versión: 174 pruebas superadas, TypeScript sin errores y compilación de producción correcta. La inspección visual nativa sigue pendiente.

## Implementación

El motor PRESTAFIN-QP-1 resuelve programas cuadráticos convexos con quadprog 2.0.0, implementación del método de conjunto activo de Goldfarb–Idnani. Se incluye su licencia MIT en el paquete. Entradas públicas: medias anuales en porcentaje, covarianzas anuales en puntos porcentuales al cuadrado y pesos en fracciones. Para resolver se convierten las medias y covarianzas a unidades decimales y se escalan objetivos y restricciones.

Se impone inversión del 100 %, sin cortos ni apalancamiento, límites por posición, restricciones lineales por bloque, media mínima y rotación mediante variables auxiliares de valor absoluto. La frontera se construye resolviendo problemas de mínima varianza para rentabilidades objetivo; no procede de ordenar una nube aleatoria. Su extremo superior se busca mediante factibilidad de objetivos de retorno. Solo la incompatibilidad del solver se interpreta como frontera de factibilidad: un fallo numérico se comunica.

El límite de volatilidad se resuelve por búsqueda sobre objetivos de retorno o mediante el multiplicador de riesgo del objetivo cuadrático. El máximo Sharpe usa una búsqueda determinista sobre la frontera con exceso de rentabilidad positivo. Se rechazan casos sin exceso positivo y los cocientes indefinidos con volatilidad nula. La contribución igual al riesgo usa descenso cíclico de coordenadas y exige covarianza definida positiva; su residuo máximo de contribución es 1e-8.

Los límites vacíos, cero explícito y opciones no válidas se distinguen. No se renormalizan pesos para ocultar incumplimientos. La rotación nula se trata como composición única; no sustituye las definiciones de equiponderación, inversa de volatilidad o contribución igual al riesgo cuando son incompatibles.

Se comprueba simetría, finitud y semidefinición positiva mediante autovalores. Se rechazan matrices materialmente indefinidas. La pequeña regularización diagonal del solver se declara; las métricas se recalculan con la covarianza original. Tolerancia de factibilidad normalizada: 2e-7; estacionariedad y complementariedad: 1e-5. Son controles numéricos, no acreditación comercial ni validación de las hipótesis económicas.

## Estimadores

- Muestra: covarianza centrada con divisor T−1.
- Contracción diagonal: mantiene las varianzas y reduce covarianzas por 1−α; α se configura explícitamente.
- Ledoit–Wolf: contracción estimada de la covarianza con divisor T hacia su varianza media multiplicada por la identidad. La intensidad se acota entre cero y uno. Contraste independiente con sklearn.covariance.ledoit_wolf sobre 36 observaciones sintéticas.
- EWMA: pesos exponenciales normalizados, centrado ponderado y corrección por 1−suma de pesos al cuadrado. Su media esperada permanece separada del estimador de covarianza.
- Gerber: estados por umbral de desviación; numerador concordancias menos discordancias y denominador T menos observaciones conjuntamente neutrales, ecuación A-3 del artículo facilitado. Se combina con volatilidades muestrales.

Se anualizan las medias aritméticas mensuales por 12 y las covarianzas mensuales por 12. Esta convención no estima autocovarianzas entre meses. Las medias se pueden contraer hacia la media transversal del universo o sustituir por expectativas explícitas, incluido cero. No se completa ningún mes ausente ni se mezclan clases, monedas o periodos para fabricar cobertura.

## Persistencia y PDF

El estudio conserva identificadores, nombres, medias, matriz, pesos de origen, método, restricciones, configuración del estimador, ventana, fuente, fecha, solución, referencias, frontera y diagnósticos. El validador nativo recalcula las métricas, comprueba restricciones y orden de frontera y conserva únicamente campos admitidos. El guardado utiliza el espacio existente de la cuenta y su control de conflictos; no requiere crear otra base de datos ni migrar datos personales.

Las nuevas versiones conservan el mandato del cuestionario y la condición de objetivo sin financiar. La cartera original permanece. Los PDF usan el estudio guardado, con gráficos vectoriales; no actualizan sus cifras con precios posteriores. Para más de diez posiciones, el gráfico de riesgo muestra nueve y la suma del resto; la tabla conserva el detalle completo y las contribuciones negativas.

## Verificación y límites

Pruebas analíticas de dos activos, comparación de tangencia, mínimos y máximos incompatibles, ceros, límites de grupos y rotación, matrices singulares/indefinidas, universo de 30 activos, estimadores, instantáneas alteradas y conservación del mandato. Las pruebas de interfaz comprueban cálculo, guardado, reapertura, reproducción, generación del PDF, objetivos no financiados, seguimiento y compatibilidad con la malla clásica. Se utilizan exclusivamente personas y series sintéticas.

La inspección gráfica del ejecutable y una descarga real nueva quedan pendientes en este entorno; las pruebas funcionales de interfaz utilizan Happy DOM. No se ha realizado una nueva prueba de cobro ni una publicación externa en esta actualización. La comprobación del código no acredita la cobertura de cualquier ISIN ni valida la distribución comercial.

Este bloque no incorpora Black–Litterman, CVaR como objetivo de optimización, HRP, cardinalidad entera, optimización robusta, bootstrap ni evaluación walk-forward del optimizador. No hay botones que prometan esos métodos. Se conserva la comprobación temporal del VaR ya existente, que es distinta de evaluar una estrategia de asignación fuera de muestra.

Referencias técnicas consultadas para este bloque: MOSEK Portfolio Optimization Cookbook, apartados de Markowitz y costes; documentación Mean-Variance de PyPortfolioOpt; código y licencia de albertosantini/quadprog; apéndice A-3 de The Gerber Statistic: A Robust Co-Movement Measure for Portfolio Optimization. Se han revisado estos apartados concretos; no se atribuye una lectura íntegra a todos los libros aportados.

---

# Actualización 0.9.0 — fondos e informes

Las fichas admiten consulta externa por ISIN validado, identidad y divisa exactas. Las verificaciones de descargas reales y sus límites se documentan en GUIA-FONDOS.md.

Los informes comparten un modelo de gráficos vectoriales entre vista previa y PDF. El balance utiliza personWealth, por lo que excluye propuestas y borradores e incorpora los saldos de cuentas con seguimiento. El histórico patrimonial une únicamente cierres guardados; sus variaciones no se atribuyen automáticamente a rentabilidad. El seguimiento compara saldo y capital inicial más flujos netos. Las reconstrucciones históricas requieren exactamente las posiciones positivas de la cartera y la validación de meses completos; emplean pesos constantes y reajuste mensual, no operaciones reales. El punto base 100 se sitúa antes del primer mes de rentabilidad.

Las proyecciones de costes usan el mismo motor que sus tablas; separan cuotas cobradas de la pérdida de capitalización, y saldo nominal de poder adquisitivo. Las carteras objetivo sin financiación y la liquidez pendiente de asignación no producen curvas de inversión. El préstamo se modela con tipo constante y cuota francesa; el extra reduce plazo. No se sustituye el contrato bancario ni se presupone que los datos declarados estén conciliados.

Las opciones nuevas se migran con valores por defecto al leer preferencias anteriores. Se validan títulos, comentarios, identificadores de gráficos, orden de apartados y opciones de presentación. Las pruebas comprueban persistencia por persona, exclusión de capital pendiente, flujos, procedencia, valores graficados y creación de PDF. Se ha generado y revisado visualmente un PDF de prueba con datos ficticios, gráficos y tablas. La apertura gráfica del ejecutable nativo en Windows sigue pendiente; las pruebas de interfaz se ejecutan con navegador simulado.

La documentación anterior se conserva a continuación como referencia histórica.

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
