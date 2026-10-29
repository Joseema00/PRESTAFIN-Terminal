# Prestafin Terminal 0.6.0 — fichas por persona

La aplicación abre en **Personas**. Desde ahí puedes buscar por nombre, referencia o contacto, crear una ficha o recuperar una archivada. No hace falta un correo, teléfono ni documento de identidad para empezar: basta un nombre o alias.

Consulta `GUIA-CARTERAS-Y-SEGUIMIENTO.md` para los seis gráficos, las cuentas con seguimiento, la optimización por objetivo y el análisis de riesgo integrado.

## Una ficha, todas sus herramientas

- **Resumen:** patrimonio neto, capital registrado en carteras, liquidez y préstamo pendiente; accesos a las herramientas y listado de entrevistas.
- **Editar ficha:** nombre, referencia propia, correo y teléfono opcionales.
- **Notas y próximos pasos:** texto de seguimiento con guardado automático.
- **Patrimonio y préstamo:** un préstamo por persona, liquidez, otros activos, aportaciones y supuestos patrimoniales.
- **Carteras:** cada persona tiene sus propias carteras, posiciones y selección activa. Las carteras de ejemplo de una entrevista se crean en esa misma ficha.
- **Entrevistas:** varias entrevistas por persona para conservar diferentes conversaciones. El título de una entrevista puede cambiarse sin renombrar a la persona.
- **Simulación:** escenario propio guardado. Al empezar toma el préstamo, liquidez y aportaciones de la ficha; el 7 % de rentabilidad inicial es una hipótesis editable. El botón «Cargar datos actuales de la ficha» sustituye el escenario por esos datos. Editar el escenario no cambia los saldos registrados.
- **Informes:** el PDF usa el nombre y correo de la persona, su patrimonio, préstamo y cartera activa. Se exporta al archivo elegido; no se mantiene un archivo interno de PDF.

El selector lateral permite cambiar de persona. El encabezado recuerda de quién son los datos abiertos. Al cambiar se reinician los paneles temporales, conservando lo guardado en cada ficha. Las pestañas internas de una herramienta no son datos económicos guardados.

Archivar una persona conserva todos sus datos y la aparta de la lista de trabajo. Puedes restaurarla en **Personas → Archivadas**. No se elimina su contenido.

## Si ya usabas la versión anterior

Al leer los datos de las versiones 0.1 o 0.2:

1. Cada entrevista anterior genera una ficha con su nombre o alias. Dos nombres iguales no se fusionan automáticamente.
2. Las carteras relacionadas explícitamente con una entrevista pasan a esa ficha, incluidas las revisiones cuyo origen identifica la entrevista.
3. El préstamo, el patrimonio y las carteras que no tienen propietario claro se conservan en **Datos anteriores**. No se asignan basándose en el nombre o en la última entrevista abierta.
4. Puedes renombrar esa ficha si todos sus datos son de la misma persona. También puedes crear las personas necesarias y usar **Organizar los datos anteriores** para trasladar carteras o datos patrimoniales.
5. El traslado del patrimonio requiere que el destino no tenga saldos, préstamo, configuración o simulación propios. Se bloquea si sobrescribiría datos. Una cartera vinculada a una entrevista no se traslada por separado.

Los importes y los activos originales se conservan, sin duplicarlos al trasladarlos. Una ficha sin cartera propia empieza con una cartera vacía. Las respuestas de la entrevista son una fotografía de la conversación y no sobrescriben automáticamente el préstamo, la liquidez o las aportaciones del panel patrimonial.

## Guardado y copias

El formato local pasa a `version: 2`, con una colección `people` y un identificador `activePersonId`. Cada persona contiene sus carteras, entrevistas, patrimonio, préstamo, configuración y simulación.

**Despacho y copias → Exportar copia** incluye todas las personas, también las archivadas. La restauración reemplaza el espacio completo después de la confirmación existente. Se aceptan las copias antiguas y se convierten al nuevo formato. La versión 0.2 no puede abrir copias nuevas de formato 2.

La carpeta de datos local es la misma de Prestafin Terminal. Para actualizar, cierra la versión abierta, extrae toda la carpeta del ZIP nuevo y abre `Prestafin Terminal.exe`. Puedes exportar una copia desde la versión anterior antes de actualizar. La carpeta original del proyecto no se ha modificado.

Límites: 250 fichas, 250 carteras y 100 entrevistas por ficha, sujetos al límite total de 5 MB de la copia. Los datos permanecen en el ordenador, sin cifrar. Esta organización es para un espacio de trabajo local; no crea cuentas ni permisos diferentes para cada persona.

## Comprobaciones

Las pruebas cubren conservación de datos antiguos, nombres repetidos, vínculos ambiguos, separación de saldos y carteras, generación de cartera en la ficha correcta, traslado sin sobrescritura, archivo reversible, guardado y restauración. También comprueban que una respuesta tardía de un panel no escriba en otra persona y que restaurar una copia invalide los callbacks del espacio anterior.

Se mantienen las reglas orientativas de la entrevista descritas en `GUIA-ENTREVISTA.md`.
