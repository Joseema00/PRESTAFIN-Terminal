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
