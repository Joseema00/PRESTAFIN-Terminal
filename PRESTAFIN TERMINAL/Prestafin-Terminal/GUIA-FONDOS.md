# Fondos y carteras modelo — versión 0.7.0

La aplicación se actualiza en el mismo directorio. Abre `Prestafin Terminal.exe`; no necesitas otro ZIP. El código activo está en la carpeta `codigo` del espacio PRESTAFIN.

## Dónde están los cambios

- **Entrevistas → Resultado** y **Carteras → Composición** muestran renta variable, renta fija y monetario/a un día. El colchón está fuera del reparto. Los límites provienen de plazo, capacidad, tolerancia, preferencias, experiencia y presupuesto de pérdidas.
- **Carteras → 15 carteras de fondos** ofrece once escalones de RV de 0 a 100 %, dos variantes de bonos cortos, una de deuda pública euro y una con pequeñas empresas. Se muestran composición, ISIN, OCF ponderado, horizonte de estudio y escenario hipotético de pérdida.
- Una propuesta de entrevista solo permite aplicar modelos dentro de sus límites. La elección crea una nueva versión en la vista habitual; conserva la cartera anterior. Sin entrevista vinculada se crea un borrador independiente. El acceso a las clases debe verificarse con el comercializador.
- **Fondos e históricos**, en el menú lateral, abre el catálogo sin necesitar una persona. También puedes pulsar **Ver ficha** en una posición o el nombre del fondo en un modelo.

## Datos y gráficos

Las fichas muestran valor liquidativo, evolución base 100, caídas desde máximos, rentabilidades acumuladas y anualizadas, años naturales y meses. Se incluyen fecha inicial/final, proveedor, fecha de descarga, ISIN y divisa. Los meses sin cobertura no se rellenan. Una rentabilidad parcial no se presenta como un año completo.

Los seis fondos Vanguard del catálogo tienen identificador de clase vinculado a la consulta pública de valores liquidativos que usa el sitio del emisor. La clase Fidelity existente se busca por su ISIN y solo se acepta una coincidencia explícita con el mismo ISIN, tipo Fondo y EUR; su cobertura puede no estar disponible. No se sustituye un fondo por un ETF ni por otra clase. Las siete clases son de acumulación; la evolución del valor liquidativo ya incorpora la reinversión y los gastos internos. No se restan esas comisiones una segunda vez.

Se conserva la copia local y se muestra el error si falla una actualización. Cuando no existe histórico diario válido, se muestra el motivo y los indicadores diarios quedan pendientes. La resolución de red del entorno de desarrollo impidió verificar la descarga real. El adaptador se verificó con respuestas de prueba, no con una descarga en producción. La apertura gráfica de Electron también queda pendiente en un entorno Windows normal.

Las seis clases Vanguard incluyen además un gráfico y una tabla disponibles sin conexión con las rentabilidades anuales reales de 2016 a 2025. Proceden de la fila del fondo (no del índice) en la página 2 de los documentos oficiales por ISIN, fechados el 17-02-2026 y consultados el 29-10-2026. Cada ficha enlaza su PDF original. Son cifras en EUR, con reinversión y gastos corrientes incorporados, redondeadas a un decimal por el emisor. No incluyen 2026, no son precios diarios y no se usan para fabricar datos mensuales, caídas, volatilidades o historiales de las carteras modelo. La clase Fidelity no tiene esta copia documental anual.

## Fuentes documentales

Los costes no son una consulta en tiempo real; las fechas documentales aparecen en cada ficha. Confirmar KID, acceso, mínimos y costes vigentes antes de contratar.

| Clase | ISIN | Fuente |
|---|---|---|
| Vanguard Global Stock EUR Acc | IE00B03HD191 | https://fund-docs.vanguard.com/Global_Stock_Index_Fund_9837_EUR_ES_INT_IRISH.pdf |
| Vanguard Emerging Markets EUR Acc | IE0031786696 | https://www.vanguard.co.uk/professional/product/fund/equity/9229/emerging-markets-stock-index-fund-eur-acc |
| Vanguard Global Bond EUR Hedged Acc | IE00B18GC888 | https://www.vanguard.co.uk/professional/product/fund/bond/9197/global-bond-index-fund-eur-hedged-acc |
| Vanguard Global Short-Term Bond EUR Hedged Acc | IE00BH65QP47 | https://www.vanguard.co.uk/professional/product/fund/bond/9110/global-short-term-bond-index-fund-eur-hedged-acc |
| Vanguard Global Small-Cap EUR Acc | IE00B42W4L06 | https://fund-docs.vanguard.com/Global_Small-Cap_Index_Fund_9159_EUR_ES_INT_IRISH.pdf |
| Vanguard Euro Government Bond EUR Acc | IE0007472990 | https://fund-docs.vanguard.com/ie0007472990-en.pdf |
| Fidelity MSCI World P-Acc-EUR | IE00BYX5NX33 | https://www.fidelityinternational.com/FILPS/Documents/en/current/ret.en.gb.IE00BYX5NX33.pdf |

## Alcance y comprobaciones

Los modelos son diseños de Prestafin, no carteras oficiales de Vanguard ni carteras con historial propio. Su composición no acredita idoneidad. Las exposiciones son las de los mandatos de los fondos, no sus posiciones diarias. Los escenarios y parámetros prospectivos se identifican como hipótesis. Elegir una plantilla no equivale a maximizar Sharpe.

87 pruebas automáticas superadas, incluidas conservación de importes, límites de las entrevistas, persistencia por persona, apertura de la cartera habitual, fichas con datos de prueba, correspondencia de los históricos anuales con las clases y errores sin precios ficticios. Compilación y comprobación de tipos verificadas.

Antes de un uso comercial, validar estabilidad y condiciones/licencias del proveedor de datos, distribución de las clases, costes vigentes y requisitos profesionales. La instalación conserva las limitaciones de seguridad documentadas en METODOLOGIA-Y-VALIDACION.md; esta actualización no cifra los datos locales ni ejecuta operaciones.
