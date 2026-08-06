@echo off
setlocal
cd /d "%~dp0"

set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" set "POWERSHELL=powershell.exe"

"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%CD%\Start-ChokAnan-CMS.ps1" -Root "%CD%"
if errorlevel 1 (
  echo.
  echo ChokAnan Management System could not start.
  echo Please take a photo of the error above and send it for support.
  echo.
  pause
  exit /b 1
)
endlocal
