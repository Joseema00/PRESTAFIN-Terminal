@echo off
setlocal
if exist "%~dp0scripts\update-local.mjs" (
  set "prestafin_updater=%~dp0scripts\update-local.mjs"
  set "prestafin_exe=%~dp0..\PRESTAFIN TERMINAL\Prestafin-Terminal\Prestafin Terminal.exe"
) else (
  set "prestafin_updater=%~dp0..\..\codigo\scripts\update-local.mjs"
  set "prestafin_exe=%~dp0Prestafin Terminal.exe"
)
echo Actualizando Prestafin Terminal. Cierra la terminal antes de continuar.
node "%prestafin_updater%" --wait
if errorlevel 1 goto failed
echo Actualizacion completada. Abriendo Prestafin Terminal...
start "" "%prestafin_exe%"
exit /b 0
:failed
echo.
echo La actualizacion no se ha completado. Consulta el mensaje anterior.
echo Si indica archivo bloqueado, reinicia Windows y ejecuta este archivo antes de abrir Prestafin o Codex.
pause
exit /b 1
