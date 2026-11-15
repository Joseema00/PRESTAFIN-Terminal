## Versión 0.25.1 — histórico exacto y cobertura por fondo

La consulta integrada prioriza el ISIN de la clase de los fondos externos. Los identificadores Yahoo `0P0001T8V7.F` y `0P0001A94F.F` se resuelven respectivamente a MyInvestor Value C (`ES0165243025`) y Cobas Large Cap P Acc EUR (`LU1598720172`). Son correspondencias exactas contrastadas en FT y con CNMV/emisor el 15-11-2026; un ISIN explícito conserva prioridad. No se buscan clases por similitud del nombre.

En la descarga comprobada, Yahoo devolvía MyInvestor C desde febrero de 2025, insuficiente para 24 rentabilidades mensuales. La descarga FT de estas mismas clases devuelve MyInvestor desde septiembre de 2024 y Cobas desde octubre de 2019: 25 rentabilidades mensuales comunes cerradas, de octubre de 2024 a octubre de 2026. Resultado puntual reproducido por el motor: `qa/history-coverage-live.json`; no garantiza la cobertura futura de la fuente ni de otras clases.

Si no hay cobertura suficiente, Riesgo muestra cada producto con nombre, ISIN, fuente, fechas y número de rentabilidades consecutivas. Distingue serie corta, meses ausentes, falta de ajustes, conversión a EUR y error del proveedor. No pasa automáticamente a hipótesis de planificación; estas siguen disponibles mediante una elección explícita. Una actualización fallida conserva el histórico compatible y muestra el error. Los nuevos históricos descargados guardan la identidad de sus posiciones y rechazan su reutilización al cambiar clase o identificador, también tras reabrir los datos. Los CSV y estudios anteriores se conservan. Los históricos integrados antiguos de fondos que no guardaban esta identidad requieren una nueva descarga para verificar la clase; no se eliminan.

Comprobación de la interfaz mediante React/DOM con datos ficticios; la captura nativa del ejecutable sigue pendiente por la restricción de Windows para iniciar el navegador/Electron en este entorno. No se han modificado los datos de ningún cliente.

# Actualización de fondos y selección automática · 0.14.0

Se incorpora la clase **Amundi Euro Liquidity Short Term Responsible E (C), FR0011176635**, un fondo monetario de corto plazo en EUR. Su KID vigente consultado está fechado el 19/08/2026: coste corriente de gestión/administración del 0,20 % anual, separado del 0,03 % de operaciones estimado. No se confunde con otra clase ni se considera un depósito garantizado. El mínimo y acceso efectivo del intermediario quedan pendientes.

Documento oficial: https://www.amundi.es/retail/dl/doc/kid-priips/FR0011176635/SPA/ESP

El catálogo pasa a ocho fondos y el filtro incluye Monetarios. Los históricos de la nueva clase dependen de cobertura pública; no se genera un historial artificial ni se copia el de otra clase. El apartado **Carteras → Cartera automática** prioriza los fondos documentados y explica las exclusiones; consulta `GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

Las notas siguientes describen las funciones anteriores, que se conservan.

# Fichas e históricos de fondos — versión 0.9.0

## Buscar una clase por ISIN

Abre **Fondos e históricos** o la pestaña **Fichas de fondos** de una cartera. Pega el ISIN y pulsa **Buscar ISIN** o Intro. Se normalizan espacios y minúsculas y se comprueba el dígito de control. La consulta identifica la clase y la divisa exactas; no se limita a los siete fondos iniciales. Buscar por nombre filtra las fichas ya guardadas.

Las fichas verificadas se guardan localmente (hasta 500), sin duplicarlas por ISIN. Incluyen nombre, divisa, tratamiento de rentas, categoría, domicilio, lanzamiento y coste corriente cuando la fuente los facilita. Un coste desconocido no se presenta como cero. Los mínimos y el acceso efectivo deben confirmarse con el comercializador.

## Fuentes y límites

Se consulta la información pública de Financial Times para otras gestoras y su histórico de valores liquidativos por identificador verificado. Los seis fondos Vanguard del catálogo mantienen como primera fuente el emisor, con alternativa por ISIN en Financial Times. La ficha se mantiene aunque no haya precios suficientes. Ningún proveedor público garantiza todos los ISIN: puede faltar una clase, no existir histórico o tratarse de otro instrumento. La aplicación indica el motivo sin sustituirlo por otra clase o por un ETF.

El histórico se descarga en intervalos de hasta diez años para evitar errores del proveedor con fondos antiguos. Si no se conoce el lanzamiento, se solicita una ventana de diez años. El inicio disponible se muestra expresamente y puede ser posterior al lanzamiento. No se rellenan días sin precio ni se fabrica rentabilidad a partir de tablas anuales. Los cálculos usan la precisión publicada por la fuente.

Las cifras y los gráficos permanecen en la divisa de la clase, sin conversión automática a EUR. En acumulación, el valor liquidativo incorpora las rentas reinvertidas. En distribución o cuando el tratamiento no está confirmado, las variaciones excluyen distribuciones y no se presentan como rentabilidad total. Los datos guardados se conservan ante errores de actualización y se identifican como copia sin actualizar. La caché ordinaria dura seis horas.

Los gráficos incluyen valor liquidativo, base 100, caídas, periodos, años naturales y meses; se pueden ampliar y seleccionar intervalos. Se mantienen las 15 carteras modelo y las tablas documentales de rentabilidades anuales Vanguard 2016–2025. Una ficha externa es informativa: no modifica automáticamente el universo de propuestas ni ejecuta operaciones.

## Comprobaciones de esta actualización

El 30-10-2026 se descargaron valores reales de Amundi LU0996182563 (3.144 observaciones desde 2014), Fidelity IE00BYX5NX33 (2.217 desde 2018), BlackRock LU0072462426 en USD (7.515 desde 1997), Azvalor ES0112611001 (2.605 desde 2015) y Vanguard IE00B03HD191 directamente del emisor (3.081 desde 2014). Son comprobaciones puntuales, no una garantía permanente del proveedor.

Las pruebas automáticas cubren identidad, divisa, ISIN inválidos, formato de precios, guardado y reinicio, uso sin conexión, distribución, ausencia de costes, duplicados y respuestas tardías de búsqueda. La comprobación visual del ejecutable nativo en Windows sigue pendiente; las interacciones de la interfaz se comprueban en un navegador simulado.

La instalación se actualiza en la misma carpeta. Se conservan las personas y carteras. Antes de redistribuir datos comercialmente deben verificarse las condiciones y licencias de las fuentes, además de las limitaciones generales documentadas en METODOLOGIA-Y-VALIDACION.md.
