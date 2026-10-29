# Entrevista y selección de cartera - Prestafin 0.6.0

**Actualización 0.6.0:** la cartera generada utiliza la vista común. El riesgo descarga datos dentro de la terminal y el patrimonio suma las inversiones con seguimiento. Los detalles de optimización, fuentes, gráficos y valoraciones están en `GUIA-CARTERAS-Y-SEGUIMIENTO.md`.

37 preguntas (35 principales y dos opcionales), seis bloques y un resultado que distingue la capacidad de invertir hoy del objetivo futuro. Las respuestas anteriores se conservan. Las preguntas usan situaciones cotidianas y ejemplos adaptados al capital, sin exigir conocimientos sobre renta fija o variable.

## Continuar una entrevista existente

1. Cierra la aplicación anterior, extrae toda la nueva carpeta y abre su ejecutable.
2. Abre la persona y su entrevista. Entra en **Resultado y cartera**.
3. Verás productos con ISIN, pesos, importes, costes y explicación. La generación usa el motor 4, incluso si las mismas respuestas ya habían creado un plan de liquidez con el motor 2.
4. Pulsa **Generar borrador de inversión**, **Generar cartera objetivo** o **Guardar plan de protección**, según el resultado. Se guarda antes de abrir la cartera. No se exige rellenar la revisión del asesor para generar un borrador.
5. En **Estudio y comparación de 11 productos** puedes priorizar coste, cobertura o fondos, elegir una variante más prudente y excluir productos. Estos cambios quedan guardados y crean una nueva revisión.
6. Desde la cartera, abre **Preparar informe del cliente** para elegir nivel y secciones. El resumen y CSV también se pueden descargar directamente.

Los formatos monetarios admitidos son `1.234,56`, `1234,56` y `1234.56`. Se guardan al escribir un importe válido. Los valores incompletos no se convierten en ceros. Cambiar el capital obliga a responder de nuevo los ejemplos de pérdidas en euros. El resto de las respuestas se conserva.

## Cómo decide el nuevo motor

- Reserva 6 meses de gastos y cuotas con ingresos estables y sin dependientes exclusivamente a cargo; 9 en los demás casos. Descuenta además los gastos próximos.
- Si solo una parte del capital deseado está libre, propone invertir esa parte. La aportación mensual se limita al menor entre lo indicado y el margen entre ingresos, gastos y cuotas.
- Si no queda capital libre, muestra una **cartera objetivo con productos** sobre el importe deseado. Indica cero asignable hoy, la falta de reserva y el capital que falta para financiar el objetivo. No suma esa simulación al patrimonio.
- Deudas, cambios sin financiar, retiradas sin plan o conocimientos pendientes convierten el resultado en un objetivo condicionado. Una contradicción en las reacciones, restricciones sin concretar o necesidad de garantía exige protección/revisión antes de elegir fondos.
- Para empresas toma el menor límite de capacidad, tolerancia, preferencia y experiencia. El horizonte establece máximos propios de 0 % antes de 3 años, 20 % entre 3 y 5, 60 % entre 5 y 10 y 80 % después. No son límites oficiales ni una validación psicométrica.
- Ingresos variables, dependientes, fecha inaplazable, retiradas y consecuencias de una pérdida pueden reducir más ese límite. Las mezclas cotidianas corresponden a máximos orientativos de 20, 35, 50 y 80 %; la experiencia limitada impone 40 %.
- La parte defensiva distingue tipo a un día, deuda muy corta, deuda corta y bonos globales cubiertos a EUR. Un plazo corto no recibe automáticamente bonos de larga duración.
- Escenario adverso ilustrativo: empresas -50 %, bonos globales -15 %, cortos -7 %, muy cortos -3 % y bloque a un día -1 %. Se reduce la parte de empresas y, si hace falta, se acorta la parte defensiva para respetar el presupuesto de pérdidas indicado. Los escenarios no son un máximo ni una probabilidad; puede perderse más.
- El reparto usa céntimos y conserva el capital. Selecciona un producto por bloque, evitando juntar varios All-World que se solapan.

## Productos, costes y acceso

Lee `ESTUDIO-PRODUCTOS.md` y abre las fuentes en el comparador. Se trata de un universo curado, no de todo el mercado ni de un optimizador que demuestre una cartera universalmente mejor. No se usan rendimientos pasados para prometer resultados.

La preferencia por fondos requiere comprobar la clase y el mínimo con el comercializador. El acceso directo al Vanguard Global Bond estudiado tiene un mínimo de un millón de euros; un acceso distinto no se presupone. Si falta un fondo elegible para un bloque, el sistema identifica expresamente el ETF alternativo. Si todas las opciones de un bloque están excluidas, explica el motivo y no inventa otro producto.

El coste ponderado utiliza TER/OCF verificado. No incluye todos los gastos de transacción, spread, intermediación, asesoramiento o fiscalidad. Los importes son presupuestos: faltan precios de ejecución, participaciones enteras/fraccionadas y posibles remanentes. No se ejecutan órdenes.

## Versiones e informes

Una propuesta conserva productos, importes, costes, criterios, condiciones y fuentes en una instantánea. Cambiar la entrevista genera otra versión sin sobrescribir la anterior; repetir sin cambios abre la existente. Si se modifica o elimina la entrevista original, el informe no atribuye las respuestas nuevas a la propuesta antigua.

Las propuestas sin ejecutar se excluyen del patrimonio registrado. Para una cartera objetivo el informe omite la proyección de un capital que todavía no está disponible. Los análisis históricos requieren importar un histórico documentado; no usan parámetros inventados para los productos estudiados.

La aplicación funciona localmente y no sincroniza respuestas con Lovable, Supabase ni servicios de IA. Abrir una fuente del emisor abre el navegador; no añade respuestas ni importes a la dirección. Los archivos locales y copias contienen información personal sin cifrar.

## Referencias del diseño

La separación de objetivos, conocimientos/experiencia, tolerancia y situación financiera sigue las dimensiones descritas por CNMV y ESMA. Las preguntas y umbrales son propios de la herramienta, no una evaluación de idoneidad certificada.

- CNMV: https://www.cnmv.es/portal/inversor/idoneidad?lang=es
- ESMA: https://www.esma.europa.eu/document/guidelines-certain-aspects-mifid-ii-suitability-requirements-1

## Guion completo

En este documento, los escenarios usan 10.000 € solo como ejemplo. En pantalla se adaptan al importe de la persona.


### 1. Tu objetivo


**1. ¿Para qué te gustaría que sirviera este dinero?**

- Tener más tranquilidad económica en el futuro
- Complementar mis ingresos cuando deje de trabajar
- Pagar una compra o un proyecto concreto
- Sacar dinero de vez en cuando para vivir
- Todavía no lo tengo claro

**2. ¿Cuándo podrías necesitar por primera vez una parte importante?**

- Antes de 3 años
- Entre 3 y 5 años
- Entre 5 y 10 años
- Dentro de más de 10 años
- No lo sé todavía

**3. Si llegado ese momento hubiera menos dinero del esperado, ¿podrías aplazar el plan?**

- No, tendría que usarlo en esa fecha
- Podría aplazarlo unos meses
- Podría esperar varios años
- No lo sé

**4. ¿Hay una cantidad que te gustaría llegar a tener para ese objetivo?**

Pon 0 si no tienes una cifra concreta. Una meta más alta no hará que te asignemos más riesgo.

Respuesta: importe en euros, o «No lo sé todavía».

**5. Mientras tanto, ¿necesitarías sacar dinero de esta inversión?**

- No, podría dejarlo invertido
- Quizá alguna vez, pero tengo otros ahorros
- Sí, para pagar gastos habituales
- No lo sé

### 2. Tu día a día


**6. ¿De dónde viene principalmente el dinero con el que vives?**

- Un sueldo
- Trabajo por mi cuenta o mi negocio
- Una pensión o ingresos periódicos similares
- Ayuda familiar u otras personas
- Mis ahorros
- Varias fuentes u otra situación

**7. En un mes normal, ¿cuánto dinero entra en tu hogar después de impuestos?**

Usa tu parte disponible para estos gastos, de forma coherente con las siguientes respuestas. No cuentes préstamos ni ganancias inciertas.

Respuesta: importe en euros, o «No lo sé todavía».

**8. ¿Cuánto se va al mes en vivienda, comida, suministros, transporte y otros gastos?**

Incluye también la parte mensual de gastos anuales. Deja fuera las cuotas de préstamos: las preguntamos después.

Respuesta: importe en euros, o «No lo sé todavía».

**9. ¿Cuánto pagas al mes por préstamos, hipoteca o compras a plazos?**

Pon 0 si no tienes cuotas. No vuelvas a incluirlas en los gastos anteriores.

Respuesta: importe en euros, o «No lo sé todavía».

**10. ¿Cómo suelen variar esos ingresos de un mes a otro?**

- Son bastante estables
- Cambian, pero suelo llegar a los gastos
- Son imprevisibles o a veces no cubren los gastos
- No lo sé

**11. ¿Hay personas que dependen económicamente de ti?**

- No
- Sí, y compartimos esa responsabilidad
- Sí, y dependen principalmente de mí

**12. ¿Prevés algún cambio importante que pueda reducir tus ingresos o aumentar tus gastos en los próximos dos años?**

- No preveo ninguno
- Sí, pero ya he reservado dinero para ello
- Sí, y todavía no sé cómo lo cubriría
- Mi situación es incierta

**13. ¿Cómo te encuentras con tus deudas?**

- No tengo deudas
- Tengo cuotas que puedo pagar con normalidad
- Pago tarjetas o créditos con intereses que me cuestan mucho
- Me cuesta pagar o tengo recibos pendientes
- No conozco bien el coste de mis deudas

### 3. Cuánto reservar


**14. ¿Cuánto tienes disponible hoy en cuentas y ahorros que puedes usar sin vender inversiones ni tu vivienda?**

Incluye aquí todo tu dinero disponible, también el que quieres invertir. No incluyas dinero prestado.

Respuesta: importe en euros, o «No lo sé todavía».

**15. ¿Cuánto de ese dinero necesitas reservar para gastos importantes en los próximos dos años?**

Por ejemplo, una entrada, estudios, una reforma o un cambio de trabajo. No cuentes de nuevo los gastos mensuales normales.

Respuesta: importe en euros, o «No lo sé todavía».

**16. De esos ahorros, ¿con cuánto te gustaría empezar?**

Indica el importe de la inversión inicial. Contrastaremos si deja suficiente margen para imprevistos.

Respuesta: importe en euros, o «No lo sé todavía».

**17. ¿Cuánto podrías añadir cada mes sin apretarte ni pedir dinero prestado?**

Puedes poner 0. Lo contrastaremos con lo que entra y sale cada mes.

Respuesta: importe en euros, o «No lo sé todavía».

**18. ¿Para aportar ese dinero necesitarías pedir un préstamo, usar una tarjeta o vender algo que necesitas?**

- No, sale de mis propios ahorros
- Sí, al menos una parte
- Todavía no lo sé

**19. Si mañana se estropeara algo caro en casa o dejaras de cobrar unos meses, ¿de dónde saldría el dinero?**

- De ahorros que dejaría aparte
- Tendría que sacar de esta inversión
- Tendría que pedir ayuda o crédito
- No lo tengo previsto

### 4. Cuando las cosas bajan


**20. Imagina que lo invertido pasa de 10.000,00 € (ejemplo) a 9000,00 € en unos meses. ¿Qué harías?**

Es una caída del 10 %. Es un ejemplo, no una previsión ni la mayor pérdida posible.

- Lo sacaría todo para no ver más pérdidas
- Sacaría una parte para estar más tranquilo
- Lo mantendría si mi situación y mi plan siguen iguales
- Consideraría añadir más, solo con dinero que no necesito
- No sé cómo reaccionaría

**21. Ahora imagina que cae de 10.000,00 € (ejemplo) a 7500,00 € y nadie sabe cuándo se recuperará. ¿Qué harías?**

Es una caída del 25 %. Las pérdidas pueden ser mayores y la recuperación no está garantizada.

- Lo sacaría todo
- Reduciría bastante lo invertido
- Podría mantenerlo varios años sin contar con una recuperación segura
- Podría mantenerlo y quizá añadir más de mis ahorros disponibles
- Necesitaría entender mejor la situación

**22. Si vieras varios meses seguidos con pérdidas, ¿cómo afectaría a tu día a día?**

- Me quitaría el sueño o me obligaría a cambiar el plan
- Me preocuparía bastante y querría reducirlo
- Me preocuparía, pero podría seguir el plan
- No lo sé porque no lo he vivido

**23. Pensando en 10.000,00 € (ejemplo), ¿qué cantidad máxima podrías aceptar ver perdida sin abandonar tu plan?**

No es una promesa de límite: se puede perder más. Pon 0 si necesitas conservar todo el capital.

Respuesta: importe en euros, o «No lo sé todavía».

**24. Si perdieras una parte importante y no la recuperaras, ¿qué cambiaría en tu vida?**

- Me faltaría para gastos básicos o deudas
- Tendría que renunciar a un objetivo importante
- Tendría que ajustar algunos planes, pero mantendría mis gastos básicos
- No comprometería mis gastos ni objetivos esenciales
- No sé valorar ese impacto

**25. ¿Has visto antes bajar dinero que tenías invertido?**

- No me ha pasado
- Sí, y lo saqué por miedo o necesidad
- Sí, y mantuve el plan
- Sí, y pude añadir más sin necesitar ese dinero

### 5. Lo que conoces


**26. ¿Qué has usado antes para ahorrar o invertir?**

- Solo efectivo o una cuenta bancaria
- También depósitos o productos que entendía como ahorro estable
- Fondos o cestas de inversiones diversificadas
- Acciones u otras inversiones que suben y bajan
- No sé bien qué productos he tenido

**27. ¿Con qué frecuencia has tomado decisiones sobre inversiones que suben y bajan?**

- Nunca
- Alguna vez, con ayuda
- Periódicamente desde hace al menos un año
- Con frecuencia desde hace varios años

**28. Si una empresa va mal, ¿qué suele depender menos de lo que le pase a esa empresa?**

- Tener todo mi dinero en esa empresa
- Repartirlo entre muchas empresas y otros tipos de inversión
- Da igual cómo lo reparta
- No lo sé

**29. Alguien te ofrece una cesta de préstamos a gobiernos y empresas. ¿Qué crees que puede pasar con su valor?**

- No puede bajar, porque se llaman préstamos
- Puede subir o bajar; también hay riesgo de no cobrar
- Siempre me devolverán todo cuando yo quiera salir
- No lo sé

**30. Una inversión ganó dinero durante varios años. ¿Qué te dice eso del año que viene?**

- Que ya es una inversión segura
- Que probablemente recibiré la misma cantidad
- Que podría ganar o perder; lo anterior no lo asegura
- No lo sé

**31. Si tu dinero no cambia de cantidad y los precios suben, ¿qué ocurre?**

- Puedo comprar menos cosas
- Puedo comprar lo mismo
- Puedo comprar más cosas
- No lo sé

### 6. Tu forma de invertir


**32. ¿Qué mezcla encaja mejor con la forma en que te gustaría cuidar tu dinero?**

La parte más estable también puede perder. La parte de crecimiento participa en muchas empresas y puede tener caídas fuertes.

- Que casi todo busque movimientos más suaves y solo una parte pequeña busque crecer
- Que la mayor parte busque estabilidad y el resto crecimiento
- Repartirlo de forma parecida entre estabilidad y crecimiento
- Que la mayor parte busque crecer, aceptando más altibajos
- Necesito ver ejemplos antes de elegir

**33. Si un plan con menos sobresaltos creciera menos que el de otras personas, ¿cómo te sentirías?**

- Me compensaría vivir más tranquilo
- Me daría algo de rabia, pero aceptaría la diferencia
- Preferiría más posibilidades de crecer, aceptando también mayores pérdidas
- No lo sé

**34. ¿Qué necesitas poder decir sobre el dinero que inviertes?**

- Necesito tener garantizado que no perderé lo aportado
- Entiendo y acepto que podría terminar con menos de lo aportado
- Antes necesito entender mejor qué podría perder

**35. ¿Hay actividades o tipos de empresas en los que no quieras que participe tu dinero?**

Puedes explicarlo en la nota siguiente. El reparto por tipos de inversión no comprueba esas condiciones.

- No tengo restricciones concretas
- Me gustaría hablarlo antes de elegir
- Sí, es una condición importante para mí

**36. ¿Qué te preocupa más de invertir, y qué tendría que pasar para que sintieras que el plan funciona? (opcional)**

Anota sus propias palabras. También puedes recoger preferencias sobre empresas, experiencias y objetivos adicionales.

Respuesta libre.