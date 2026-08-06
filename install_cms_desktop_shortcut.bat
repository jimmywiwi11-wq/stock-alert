@echo off
setlocal
cd /d "%~dp0"

set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" set "POWERSHELL=powershell.exe"

"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_cms_desktop_shortcut.ps1"
if errorlevel 1 (
  echo.
  echo Failed to create ChokAnan Management System shortcut.
  pause
  exit /b 1
)

echo.
echo ChokAnan Management System shortcut has been created.
pause
endlocal
