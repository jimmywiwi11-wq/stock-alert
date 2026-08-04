@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Join-Path ([Environment]::GetFolderPath('Desktop')) 'ChokAnan Management System.lnk'; if(Test-Path $p){Remove-Item -LiteralPath $p; Write-Host 'Shortcut removed:' $p}else{Write-Host 'Shortcut was not found on Desktop'}"
endlocal
