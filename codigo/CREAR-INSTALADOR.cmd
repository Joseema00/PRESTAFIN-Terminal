@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 goto nonode
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto failed
call npm.cmd run desktop:dist
if errorlevel 1 goto failed
echo Los ejecutables estan en la carpeta release.
pause
exit /b 0
:nonode
echo Necesitas Node.js 24 o superior: https://nodejs.org
pause
exit /b 1
:failed
echo No se pudo generar el instalador. Conserva el mensaje de error que aparece arriba.
pause
exit /b 1
