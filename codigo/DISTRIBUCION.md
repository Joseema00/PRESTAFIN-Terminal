# Distribución de Prestafin Terminal

## Separación entre programa y datos

El instalador contiene el programa, sus recursos y la configuración pública del cliente. No debe incluir entrevistas, carteras personales, informes exportados, sesiones, claves privadas ni copias del espacio de trabajo.

La instalación fija está en `../PRESTAFIN TERMINAL/Prestafin-Terminal`. Las sesiones y los archivos locales de cada usuario se guardan fuera de esa carpeta, en el directorio de datos de Electron. La configuración publicada tiene `cloudEnabled: true`: las entrevistas, fichas, modelos y carteras se guardan en `public.terminal_workspaces` de Supabase, asociados al usuario autenticado.

Las políticas de esa tabla deben mantener `auth.uid() = user_id` tanto para leer como para insertar o actualizar. La función `terminal_save_workspace` toma el propietario de la sesión, no de un identificador enviado por el cliente. Nunca incluir una clave `service_role`, una clave secreta, credenciales de usuario o una sesión en el instalador. Una clave pública de cliente no sustituye estas reglas de acceso.

Actualizar el programa no debe borrar ni copiar los datos entre cuentas. No exportar datos reales para incorporarlos al código o a una release. Los perfiles de prueba pertenecen exclusivamente a `qa`.

## Paquete preparado de la instalación fija

La distribución preparada el 14 de noviembre de 2026 usa exactamente el `app.asar` de la instalación fija **0.23.0**, no el código 0.24.0 que estaba en desarrollo. Se genera un instalador NSIS de Windows x64 con todos los componentes necesarios.

- Archivo: `release/Prestafin.Terminal.exe`.
- Tamaño: 105069206 bytes.
- SHA-256: `96c57cc70d115f6f75c309b5a9af4bd8f180fa9cf302471649c0ddcfeaa66e86`.
- Instalación por usuario, con directorio seleccionable y accesos directos.
- Sin firma digital de editor.
- No borra los datos de la aplicación al desinstalar.

`scripts/prepare-distribution.mjs` selecciona expresamente los componentes permitidos y revisa el archivo de la aplicación. Excluye `app.asar.previous`, los informes, los ejemplos externos, las herramientas de desarrollo y cualquier archivo no permitido. El manifiesto y la configuración del empaquetador quedan en `qa/distribution`.

El script exige que su carpeta temporal `qa/distribution/app` esté vacía para evitar mezclar archivos de distintas entregas. No apuntarlo a una carpeta de datos personales ni a la instalación fija. Revisar y retirar únicamente los temporales generados antes de preparar otra versión.

Para empaquetar la instalación fija revisada:

```powershell
node scripts/prepare-distribution.mjs
node node_modules/electron-builder/cli.js --prepackaged qa/distribution/app --win nsis --x64 --config qa/distribution/builder.json --publish never
```

## Futuras actualizaciones

1. Realizar los cambios en el código y ejecutar `desktop:check`, `desktop:typecheck` y `desktop:build`. Las pruebas deben usar datos ficticios.
2. Identificar con claridad la versión que se va a distribuir. Para publicar cambios nuevos, construir esa versión completa; no reutilizar el instalador 0.23.0 ni cambiar únicamente su etiqueta.
3. Revisar el contenido empaquetado y las reglas de acceso por cuenta. No copiar carpetas de datos locales ni exportaciones de Supabase.
4. Probar el paquete con un perfil vacío, la separación entre cuentas y la conservación de datos durante una actualización. Las comprobaciones de arranque no sustituyen una instalación completa en otro equipo.
5. Publicar el instalador completo en una release pública de `Joseema00/Prestafin-Terminal-Downloads`, con el nombre exacto `Prestafin.Terminal.exe`. No publicar únicamente el ejecutable de `win-unpacked`.
6. Verificar la descarga completa y comparar su SHA-256 con el instalador local.

El enlace de la web se conserva entre versiones:

https://github.com/Joseema00/Prestafin-Terminal-Downloads/releases/latest/download/Prestafin.Terminal.exe

## Comprobaciones realizadas

- Los 75 archivos extraídos del instalador coinciden con la distribución revisada.
- La aplicación extraída arranca con un perfil aislado vacío y muestra el inicio de sesión.
- Los módulos empaquetados de cuentas, guardado y autenticación coinciden con los módulos sometidos a las pruebas.
- Pasaron 214 pruebas del código, la comprobación de tipos y la compilación.
- Se revisaron las políticas reales de Supabase y una consulta con identidad ficticia no pudo leer espacios de otras cuentas.

Pendiente: instalación de principio a fin en otro equipo Windows y prueba de actualización allí. Estas verificaciones no acreditan por sí solas la validación comercial del producto.
