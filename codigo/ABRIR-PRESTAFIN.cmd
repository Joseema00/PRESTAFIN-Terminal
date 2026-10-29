@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 goto nonode
if not exist "node_modules\electron\dist\electron.exe" (
  echo Instalando los componentes necesarios. Se necesita internet la primera vez.
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 goto failed
)
if not exist "dist-desktop\index.html" (
  call npm.cmd run desktop:build
  if errorlevel 1 goto failed
)
call npm.cmd run desktop:start
if errorlevel 1 goto failed
exit /b 0
:nonode
echo Necesitas Node.js 24 o superior. Instalalo desde https://nodejs.org y vuelve a abrir este archivo.
pause
exit /b 1
:failed
echo No se pudo abrir Prestafin. Conserva el mensaje de error que aparece arriba.
pause
exit /b 1
