# Prestafin Terminal 0.26.0

El código fuente vigente está en **codigo/**. Incluye PRESTAFIN30 (30 días Pro sin tarjeta, un único canje por cuenta), la optimización y navegación 0.25 y la corrección de históricos por clase de fondo.

Los instaladores públicos se distribuyen exclusivamente desde [Prestafin-Terminal-Downloads](https://github.com/Joseema00/Prestafin-Terminal-Downloads/releases/latest). La carpeta antigua de instalación de este repositorio se conserva como histórico y no debe utilizarse para descargar la versión actual. Web: https://prestafin-terminal.com.

Para compilar: entra en codigo, ejecuta npm ci, npm run desktop:check, npm run desktop:typecheck y npm run desktop:build. La validación detallada y los límites de la comprobación nativa están en codigo/VALIDACION-0.26.md. Los cobros Stripe requieren completar la configuración fiscal del titular; PRESTAFIN30 no requiere tarjeta ni inicia cobros.

---

## Versión 0.24.0 · entrevista → reparto → modelo existente

En Carteras → Cartera automática, selecciona la entrevista y pulsa **Asignar y guardar esta cartera**. Las respuestas determinan el reparto de referencia; el sistema filtra la biblioteca por plazo, pérdida aceptada y exclusiones y elige el modelo compatible más próximo. Deja de usar mínima varianza o Sharpe para decidir el modelo del cliente. Los empates priorizan menor monetario, coste y un identificador estable.

La pantalla principal sustituye las tres alternativas por el modelo asignado, su reparto RV/RF/monetario, fondos, ISIN, importes iniciales y aportaciones. El monetario se identifica por separado y no se presenta como renta fija. Si no hay un modelo compatible, no se inventa una cartera. Las condiciones de financiación y las respuestas originales se conservan.

La asignación guarda los fondos completos sin añadir modelos nuevos, retrasa la apertura hasta confirmar el guardado y reutiliza la misma propuesta al reintentar. Motor de entrevista 10: las propuestas antiguas se conservan y la nueva generación usa modelos de biblioteca. Los estudios avanzados siguen disponibles fuera del flujo principal.

Revisión independiente de motor y de interfaz React con datos ficticios: perfiles20/80,50/50,100/0, horizonte corto, modelos propios, presupuesto de pérdida, reservas, guardado y reintentos. Previsualización DOM completada; captura visual nativa pendiente por bloqueo de Electron/Edge en el entorno. Descargas reales de mercado pendientes. Ver registros qa/model-assignment-* para los resultados de comprobación.

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

# Prestafin Terminal 0.21.0

**Carteras → Modelos de cartera → Crear cartera con fondos** guarda el modelo privado y su cartera con productos, pesos e importes derivados de la entrevista. Una clase por exposición elegible, límites de riesgo conservados y explicación por fondo. Instrucciones actuales: `codigo/GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

Validación 0.21.0: 199 pruebas automáticas superadas, tipos y compilación de producción correctos. Se verifican perfiles de riesgo distintos, selección de fondos, exclusiones, creación conjunta de modelo y cartera, guardado y reapertura, fallos de persistencia y reintentos sin duplicados. Revisión visual nativa y descargas reales de mercado pendientes.

## Historial 0.20.1

# Prestafin Terminal 0.20.1

Corrección del creador de modelos: una acción para crear y guardar, resultado visible y apertura de la cartera guardada. Reintentos sin duplicados, entrevista activa como origen y eliminación de controles duplicados y listados sin acciones. Instrucciones actuales: `codigo/GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

195 pruebas automáticas superadas, tipos y compilación correctos. Pendientes la revisión visual nativa y las descargas reales de mercado.

## Historial previo

# Prestafin Terminal 0.16.0

Servicio de suscripciones desplegado en Supabase y conexión incorporada a la terminal. Mantiene 14 días de prueba, 50 EUR/mes y 490 EUR/año. 157 pruebas superadas. Los cobros requieren todavía guardar los secretos Stripe en el servidor y completar la configuración fiscal real. Ver GUIA-SUSCRIPCIONES.md. No se han realizado cargos.

## Historial: 0.15.0

# Prestafin Terminal 0.15.0

Clientes, cuestionarios, carteras, modelos privados y preferencias guardados en la cuenta Supabase, con separación por titular y control de conflictos entre equipos. Biblioteca editable en **Carteras → Modelos de cartera** y asignación automática al completar el cuestionario. Cualquier modelo puede seleccionarse para estudio si requiere revisión. Ver `codigo/GUIA-CUENTAS.md` y `codigo/GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

153 pruebas superadas, tipos correctos y compilación de producción. Versión 0.15.0 instalada en la carpeta habitual; 26 archivos empaquetados verificados. La migración y el guardado real de la cuenta local se han comprobado mediante consultas limitadas a su titular: están presentes los identificadores originales del cliente, sus cinco carteras y su cuestionario, además de una cartera guardada posteriormente. Se han conservado los archivos anteriores. No se ha sobrescrito ni eliminado información para realizar esta comprobación. La captura gráfica del ejecutable no ha podido completarse: Electron y Chrome finalizan antes de generar la imagen en este entorno.

## Historial: 0.14.0

**Carteras → Cartera automática** utiliza las respuestas guardadas del cuestionario para construir y explicar una propuesta, con preferencia por fondos de inversión. Amplía el estudio con un fondo monetario, conserva reservas y restricciones y distingue inversión posible, objetivo sin financiar y protección. También añade eliminación de carteras con confirmación y utiliza el isotipo original facilitado por el titular en la interfaz, los PDF y los recursos de icono. Guía: `codigo/GUIA-CARTERAS-Y-SEGUIMIENTO.md`. La actualización queda preparada en la instalación habitual hasta liberar el archivo abierto por Windows; versión instalada comprobada: 0.13.0.

## Notas de 0.10.0

Nueva sección **Suscripción**: 14 días de prueba, 50 EUR/mes o 490 EUR/año. Incluye acceso mediante código de correo, pago y gestión en Stripe, estado verificado y conservación/exportación de datos al cancelar.

**Activación externa pendiente:** la configuración de pagos permanece vacía. No hay cobros ni prueba en marcha; se conserva el uso local de esta instalación. El servidor, Stripe y el correo deben configurarse y verificarse antes de distribuir una versión comercial. Consulta `codigo/GUIA-SUSCRIPCIONES.md` para la activación y las pruebas reales pendientes.

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

# Prestafin Terminal

Proyecto privado de Prestafin Terminal. Versión actual de la aplicación: **0.7.0**.

## Contenido

- `codigo/`: código fuente, pruebas, recursos gráficos, dependencias declaradas y documentación. `codigo/GUIA-FONDOS.md` describe la actualización actual y sus límites.
- `PRESTAFIN TERMINAL/Prestafin-Terminal/`: aplicación completa de Windows x64, con su ejecutable, bibliotecas, recursos y licencias. Abrir `Prestafin Terminal.exe` conservando toda la carpeta.
- `PRESTAFIN TERMINAL/Prestafin-Terminal.zip`: archivo anterior que ya existía en el espacio de trabajo. No es el paquete actualizado de la versión 0.7.0; usar la carpeta de aplicación anterior.
- `AGENTS.md`: instrucciones del espacio de trabajo fijo.

Se excluyen dependencias instaladas (`node_modules`), compilados intermedios, registros, perfiles de prueba, cachés, credenciales y archivos de datos personales. Las dependencias se recuperan con `npm ci`; la aplicación empaquetada completa sí está incluida.

## Descargar la aplicación completa

Los ejecutables y archivos binarios se guardan con **Git LFS**. Clonar con Git y Git LFS instalados y ejecutar `git lfs pull` dentro del repositorio. Comprobar que los archivos binarios descargados tienen su tamaño real antes de abrir la aplicación; un archivo de texto pequeño con una referencia LFS no es el ejecutable.

La terminal guarda las personas y carteras en el perfil local de Windows. Esos datos no se incluyen en el repositorio.

## Desarrollo

Requiere Node.js 24 o posterior y npm. Desde `codigo/`:

```powershell
npm ci
npm run desktop:check
npm run desktop:typecheck
npm run desktop:build
npm run desktop:start
```

Para actualizar la instalación de este mismo espacio, después de compilar y cerrar la aplicación:

```powershell
node scripts/update-local.mjs
```

El script se ejecuta desde `codigo/` y actualiza `../PRESTAFIN TERMINAL/Prestafin-Terminal`, conservando una copia de `app.asar` anterior. Para generar una distribución desde otro equipo, usar `npm run desktop:folder`.

## Estado de validación

La versión 0.7.0 superó 87 pruebas automáticas, la comprobación de tipos y la compilación. Se verificó el contenido de 38 archivos de la aplicación empaquetada. La comprobación visual en Windows y la descarga diaria real de fondos siguen pendientes; el entorno utilizado no permitió completarlas. Los datos anuales documentales de Vanguard se distinguen de las series diarias.

Este repositorio debe permanecer **privado**. No se concede una licencia de redistribución del código propio. Se conservan las licencias y avisos de los componentes de terceros incluidos.
