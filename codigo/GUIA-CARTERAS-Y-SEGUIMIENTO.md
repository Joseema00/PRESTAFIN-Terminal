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
