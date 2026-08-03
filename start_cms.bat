@echo off
setlocal
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0Start-ChokAnan-CMS.ps1"
endlocal
