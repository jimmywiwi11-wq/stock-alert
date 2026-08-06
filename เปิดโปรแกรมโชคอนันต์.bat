@echo off
chcp 65001 >nul
title เปิดโปรแกรมโชคอนันต์
cd /d "%~dp0"

call "%~dp0start_cms.bat"
exit /b %ERRORLEVEL%
