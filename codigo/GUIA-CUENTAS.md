# Cuentas de Prestafin Terminal 0.15.0

## Bienvenida y acceso

La aplicación muestra una pantalla inicial con el isotipo de Prestafin. Comprueba la sesión y, si sigue siendo válida, abre automáticamente la terminal. Si no hay sesión, presenta correo y contraseña, registro, confirmación y recuperación.

Las cuentas se guardan en Supabase Auth del proyecto Prestafin, `cpauzzbjcesctgpvnzax`. Supabase gestiona los hashes de las contraseñas; la terminal no las guarda. Solo conserva un refresh token cifrado con Electron safeStorage. Los clientes, cuestionarios, carteras, modelos privados y preferencias se guardan en Supabase bajo el identificador de tu cuenta. Al iniciar sesión en otro equipo se recupera ese espacio. No existe una excepción de fundador que permita consultar fichas de otras cuentas desde la terminal.

## Guardado y recuperación de datos

La tabla `terminal_workspaces` tiene políticas RLS de lectura, inserción y actualización por `auth.uid()`. El ejecutable usa una clave pública y la sesión del consumidor; no incorpora claves de administración. El guardado conserva la versión anterior y comprueba la revisión antes de sustituirla. Si otro equipo ha guardado cambios, se bloquea la sobrescritura y se permite exportar los cambios pendientes y recargar la cuenta.

Si falla la conexión, el error se muestra y los cambios pendientes quedan en memoria mientras la ventana siga abierta. No se indica que estén guardados ni se escriben nuevas fichas financieras en un archivo local de respaldo. Para salir sin perderlos, reintentar o exportarlos expresamente. Se necesita conexión para abrir y guardar el espacio de la cuenta.

Al abrir por primera vez una cuenta sin datos remotos, se migra únicamente su archivo local anterior de `accounts/<user_id>`. Los originales se conservan para evitar pérdidas. Si la nube ya contiene datos, prevalece y no se mezcla silenciosamente con archivos de otro equipo. La migración de la cuenta local ya está confirmada en Supabase. La comprobación no ha subido ni modificado sus fichas.

En el PC siguen la credencial de sesión cifrada, recursos y cachés públicas de mercado, así como las exportaciones que el usuario solicite. Los archivos anteriores no se borran automáticamente.

## Confirmar el correo y evitar otp_expired

El error `otp_expired` significa que el enlace es inválido, ha caducado o ya se ha utilizado. Los escáneres de seguridad del correo pueden consumir enlaces antes de que el usuario los abra. No es prueba de un fallo de prestafin.tech ni se arregla reutilizando la URL del error.

1. Abrir **Confirmar mi correo** en la bienvenida o en Mi cuenta.
2. Introducir el correo y pulsar **Reenviar código**.
3. Usar solo el código del mensaje más reciente. Un reenvío puede invalidar el anterior.
4. Introducir el código en la terminal y pulsar **Confirmar correo**.
5. Una vez confirmado, el acceso habitual sigue siendo correo y contraseña.

Si el correo actual todavía contiene solo un enlace, usar **Mi correo solo contiene un enlace** y copiar el enlace original del botón sin abrirlo. La URL que ya contiene `otp_expired` no sirve para verificar la cuenta.

La confirmación verifica la identidad. El código de activación que se describe más abajo es independiente y concede la licencia.

## Plantillas profesionales: preparadas, pendientes de aplicar en Auth

No se ha podido modificar la configuración Auth remota con la conexión MCP disponible, que permite administrar SQL y funciones pero no editar plantillas o SMTP. No se ha cambiado el remitente real ni enviado un correo nuevo de prueba.

Las plantillas están preparadas con marca Prestafin, asunto en español, instrucciones y `{{ .Token }}` en lugar de un enlace consumible:

- `supabase/templates/confirmation.html`: Confirm sign up. Asunto **PRESTAFIN · Confirma tu cuenta**.
- `supabase/templates/recovery.html`: Reset password. Asunto **PRESTAFIN · Recupera tu contraseña**.

Para aplicarlas desde el Dashboard:

1. Abrir https://supabase.com/dashboard/project/cpauzzbjcesctgpvnzax/auth/templates
2. En **Confirm sign up**, copiar el HTML completo de `confirmation.html` en el cuerpo, introducir el asunto indicado y guardar.
3. En **Reset password**, copiar `recovery.html`, introducir su asunto y guardar.
4. En https://supabase.com/dashboard/project/cpauzzbjcesctgpvnzax/auth/smtp configurar **Sender name: Prestafin**. El correo del remitente debe pertenecer al dominio verificado por el proveedor SMTP. No basta con cambiar el texto de la plantilla.
5. Desactivar el seguimiento de enlaces del proveedor y enviar un nuevo mensaje desde la terminal. No reutilizar un correo anterior al cambio.

No se presupone una dirección ni un proveedor SMTP: hacen falta los datos del servicio del titular y la verificación DNS que corresponda. No introducir contraseñas SMTP ni claves de administración en el ejecutable, el repositorio o el chat.

Alternativa para administración: `scripts/configure-auth-mail.mjs --apply` aplica y verifica exclusivamente las dos plantillas, sus asuntos y el nombre Prestafin usando un `SUPABASE_ACCESS_TOKEN` de administración disponible en el entorno local. Sin `--apply` no modifica nada. No sustituye el Site URL, no cambia otras plantillas, no inventa ni borra credenciales SMTP y no autentica el dominio por sí solo.

## Recuperación

En **He olvidado mi contraseña**, solicitar el correo y usar el código en la pantalla de recuperación, introducir y repetir la nueva contraseña. Si todavía se recibe un enlace antiguo, se admite el enlace original mediante la opción correspondiente. Los códigos son de un solo uso y están sujetos a la caducidad y límites de Supabase. Se admiten códigos pegados con espacios.

La recuperación autoriza el cambio de contraseña; no abre las fichas. Después se vuelve al inicio de sesión y se solicita el cierre global de sesiones. Esa solicitud adicional puede no completarse ante una incidencia de red.

## Código Pro permanente

Después de confirmar el correo e iniciar sesión, abrir **Mi cuenta** o **Suscripción**, localizar **Activar con un código**, introducir el código privado y pulsar **Activar código**.

- El código emitido se puede canjear para una sola cuenta confirmada.
- La licencia se guarda en Supabase y no tiene fecha de caducidad ni renovación.
- El código no confirma el correo, no crea una cuenta y no inicia un cargo ni una prueba.
- Repetir el canje en la misma cuenta es idempotente. Otra cuenta no puede utilizarlo.
- Un código usado no puede reactivar una licencia revocada. No se incluyen códigos universales en la aplicación.
- El código completo no se guarda en el repositorio ni en el ejecutable; la base contiene únicamente su hash SHA-256.
- La licencia requiere conexión para verificar el estado y no cancela una suscripción anterior en Stripe.

El servicio **terminal-license** está desplegado en Supabase. Verifica el JWT y consulta Auth para obtener la identidad confirmada. Las tablas tienen RLS; el cliente solo puede consultar su propia licencia y no puede listar códigos ni conceder acceso. El canje corre en una transacción con bloqueo por cuenta y código, límite de intentos, claves únicas y persistencia de su primer titular.

En esta versión las herramientas requieren una licencia permanente activa o, cuando esté conectado el servidor de pagos, una suscripción vigente. Si la verificación falla, el acceso no se concede por el simple hecho de que Stripe esté pendiente.

## Datos anteriores

Tras entrar, **Recuperar fichas anteriores de este PC** muestra el correo de destino y solicita confirmación de titularidad. Copia el archivo al espacio de Supabase de una cuenta sin fichas, conserva el original y no sobrescribe una cuenta que ya tenga personas. Cerrar sesión conserva los datos y limpia la ficha visible.

## Pagos

Los planes son 50 EUR/mes o 490 EUR/año. PRESTAFIN30 activa 30 días Pro sin tarjeta, una sola vez por cuenta y sin renovación automática. Los nuevos pagos no incluyen una prueba adicional. La aplicación tiene el servicio de facturación desplegado en Supabase; los cobros requieren completar la configuración fiscal real de Stripe. Registrar una cuenta o canjear el código no inicia una suscripción.

La licencia permanente permite acceder sin contratar esos planes. No representa una suscripción Stripe pagada y no cancela contratos anteriores.

## Validación y actualización

**153 pruebas automatizadas superadas**, tipos correctos y compilación de producción. Incluyen guardado y restauración entre dispositivos con servidor controlado, aislamiento, migración por cuenta, respuestas perdidas, conflictos de revisión y biblioteca privada. Las consultas reales verifican RLS, políticas por titular y rechazo del acceso anónimo en la nueva tabla/RPC. La migración y el guardado real de la cuenta local se han comprobado mediante consultas limitadas a su titular: están presentes los identificadores originales del cliente, sus cinco carteras y su cuestionario, además de una cartera guardada posteriormente. Se han conservado los archivos anteriores. No se ha sobrescrito ni eliminado información para realizar esta comprobación. La restauración desde un segundo equipo físico no se ha ensayado; las pruebas automatizadas de recuperación entre clientes sí han pasado.

La revisión automática rechazó la prueba remota que creaba perfiles ficticios en `auth.users`, aunque incluía rollback. No se ha ejecutado ni se ha intentado por otra vía. No se han creado esas cuentas. La entrega de las nuevas plantillas sigue pendiente de prueba.

La captura gráfica no ha podido ejecutarse en el entorno; no se declara verificada la apariencia del ejecutable.

Versión 0.15.0 instalada y verificada. Las siguientes actualizaciones se aplican desde la misma carpeta con el comando habitual:

```powershell
node "C:\Users\jmloe\Documents\ChatGPT\PRESTAFIN\codigo\scripts\update-local.mjs"
```

Referencias: https://supabase.com/docs/guides/auth/auth-email-templates y https://supabase.com/docs/guides/auth/auth-smtp
