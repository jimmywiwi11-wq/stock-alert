@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ซ่อมไอคอนเดสก์ท็อป.ps1"
if errorlevel 1 (
  echo.
  echo ซ่อมไอคอนไม่สำเร็จ
  pause
  exit /b 1
)
echo.
echo ซ่อมไอคอนเรียบร้อยแล้ว
echo ต่อไปให้เปิดจากไอคอน ChokAnan Management System บน Desktop
pause
