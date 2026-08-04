@echo off
setlocal
set "SCRIPT=%~dp0Create_Tax_Invoice_App_Shortcut.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
if errorlevel 1 (
  echo.
  echo Failed to create Tax Invoice App shortcut.
  pause
  exit /b 1
)
echo.
echo Tax Invoice App desktop shortcut has been created.
pause
