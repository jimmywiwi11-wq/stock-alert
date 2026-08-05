@echo off
chcp 65001 >nul
cd /d "%~dp0"
call "เปิดโปรแกรมโชคอนันต์.bat"
timeout /t 2 >nul
start "" "http://127.0.0.1:8765/desktop/tax-invoice/tax_invoice_app.html"
