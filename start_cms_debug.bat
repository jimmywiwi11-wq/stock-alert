@echo off
setlocal
cd /d "%~dp0"

set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" set "POWERSHELL=powershell.exe"

echo Starting ChokAnan Management System in debug mode...
echo Repository: %CD%
echo.
"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%CD%\Start-ChokAnan-CMS.ps1" -Root "%CD%" -DebugMode
set "EXITCODE=%ERRORLEVEL%"
echo.
echo PowerShell exit code: %EXITCODE%
echo.
pause
exit /b %EXITCODE%
