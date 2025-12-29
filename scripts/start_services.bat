@echo off
REM Mycosoft Service Startup Script
REM Automatically starts all required services

echo Starting Mycosoft Services...

cd /d "%~dp0\.."

REM Start Service Manager
echo Starting Service Manager...
start /B python services\service_manager.py

REM Wait a moment
timeout /t 3 /nobreak >nul

echo Services started!
echo Service Manager is monitoring all services.

pause




