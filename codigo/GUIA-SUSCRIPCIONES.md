## Versión 0.26.0 — PRESTAFIN30 y continuidad del acceso

PRESTAFIN30 activa 30 días Pro sin tarjeta en la cuenta verificada. El servidor fija inicio y vencimiento, permite un único canje por cuenta y rechaza repetirlo incluso después de caducar. No inicia una suscripción ni un cobro. La aplicación muestra los días restantes y la caducidad y cierra las funciones Pro al vencer también cuando conserva un estado en caché. Los datos y su exportación se conservan. Una licencia permanente o una suscripción vigente mantienen el acceso.

Se puede contratar el plan mensual (50 EUR) o anual (490 EUR) durante la promoción o después. Los nuevos Checkout no ofrecen 14 días y las sesiones pendientes con esa oferta se sustituyen; las suscripciones ya contratadas conservan sus condiciones. Se corrige la comprobación de licencias del pago para consultar las columnas reales del servidor. Stripe conserva los cobros y renovaciones; el canje del código no consulta ni crea tarjetas.

La RPC de canje sigue restringida al servidor, con RLS y un registro por cuenta bloqueado en transacción. La identidad y el correo confirmado se verifican con Auth en la Edge Function; se retira una lectura duplicada de auth.users que fallaba por permisos, sin conceder nuevos permisos sobre autenticación. Fuente reproducible de la configuración: supabase/sql/terminal-promo.sql.

Comprobación real con cuentas ficticias aisladas: acceso por contraseña, dos canjes concurrentes (solo uno aceptado), 30 días exactos, rechazo del segundo canje, mismo vencimiento tras volver a iniciar sesión y rechazo después de caducar. Ningún dato de clientes se ha usado para las pruebas. El 15-11-2026 Stripe devuelve una lista vacía de registros fiscales: los cobros reales siguen pendientes de esa configuración del titular. No se ha creado ningún registro fiscal por suposición ni realizado un cargo.

Se incluyen las correcciones de históricos 0.25.1 y todas las funciones de 0.25.0. Las pruebas de interfaz usan React con datos ficticios; la comprobación nativa y la instalación se documentan por separado según su resultado.

## Configuración vigente

Servicio de licencias: `/functions/v1/terminal-license`; estado y canje requieren una sesión Auth confirmada. El código no es una clave secreta y no se consume globalmente al primer usuario. Las licencias permanentes usan su servicio y tablas anteriores. Las sesiones y datos personales no se distribuyen con el programa.

Servicio Stripe: `/functions/v1/terminal-billing`; mantiene webhooks firmados, portal, idempotencia, precios y requisitos de impuestos. Completa únicamente las inscripciones fiscales que correspondan realmente al titular en Stripe Tax antes de habilitar cobros. Comprueba ambos planes en un sandbox separado y después sus recursos de producción. No se ofrecen pruebas automáticas en Checkout.

El archivo `desktop/billing-config.json` incluye solo las direcciones del proyecto y la clave pública. Las claves Stripe y de servidor permanecen en Supabase. No copies secretos a la aplicación ni a GitHub.
