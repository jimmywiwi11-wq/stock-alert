@echo off
chcp 65001 >nul
title เปิดโปรแกรมโชคอนันต์

cd /d "%~dp0"

echo.
echo ==========================================
echo   กำลังเปิด ChokAnan Management System
echo ==========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$port=8765; ^
$root=(Get-Location).Path; ^
$existing=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; ^
if($existing){ ^
  $pids=$existing.OwningProcess | Sort-Object -Unique; ^
  foreach($pid in $pids){ try{ Stop-Process -Id $pid -Force -ErrorAction Stop }catch{} }; ^
  Start-Sleep -Milliseconds 700 ^
}; ^
$server=Join-Path $root 'Start-ChokAnan-CMS-Server.ps1'; ^
if(!(Test-Path $server)){ Write-Host 'ไม่พบไฟล์ Start-ChokAnan-CMS-Server.ps1'; exit 2 }; ^
Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('\"'+$server+'\"'),'-Root',('\"'+$root+'\"'),'-Port',$port) -WorkingDirectory $root -WindowStyle Hidden; ^
$ready=$false; ^
for($i=0;$i -lt 40;$i++){ ^
  Start-Sleep -Milliseconds 250; ^
  try{ $r=Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:'+$port+'/index.html') -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} }catch{} ^
}; ^
if(!$ready){ Write-Host 'เปิดเซิร์ฟเวอร์ไม่สำเร็จ'; exit 3 }; ^
Start-Process ('http://127.0.0.1:'+$port+'/index.html');"

if errorlevel 1 (
  echo.
  echo เปิดโปรแกรมไม่สำเร็จ
  echo กรุณาถ่ายภาพหน้าต่างนี้ส่งมา
  pause
  exit /b 1
)

echo.
echo เปิดโปรแกรมเรียบร้อยแล้ว
timeout /t 2 >nul
exit /b 0
