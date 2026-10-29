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
