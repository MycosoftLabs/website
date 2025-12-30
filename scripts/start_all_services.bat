@echo off
REM Mycosoft Complete System Startup Script (Batch version)
REM Starts all services: Docker containers, Next.js website, Python services

echo ========================================
echo Mycosoft Complete System Startup
echo ========================================
echo.

cd /d "%~dp0\.."
set WEBSITE_ROOT=%~dp0\..
set MAS_ROOT=C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas

REM ============================================
REM 1. START DOCKER CONTAINERS
REM ============================================
echo [1/5] Starting Docker Containers...
cd /d "%MAS_ROOT%"
call docker compose -f docker-compose.essential.yml up -d
timeout /t 5 /nobreak >nul
echo   Docker containers started
echo.

REM ============================================
REM 2. START NEXT.JS WEBSITE
REM ============================================
echo [2/5] Starting Next.js Website...
cd /d "%WEBSITE_ROOT%"

REM Kill existing Next.js on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM Start Next.js
echo   Starting Next.js dev server on port 3000...
start /B npm run dev
timeout /t 10 /nobreak >nul
echo   Next.js website starting...
echo.

REM ============================================
REM 3. START MYCOBRAIN SERVICE
REM ============================================
echo [3/5] Starting MycoBrain Service...
if exist "%WEBSITE_ROOT%\services\mycobrain\mycobrain_service.py" (
    start /B python "%WEBSITE_ROOT%\services\mycobrain\mycobrain_service.py"
    timeout /t 3 /nobreak >nul
    echo   MycoBrain service started
) else (
    echo   MycoBrain service file not found
)
echo.

REM ============================================
REM 4. START SERVICE MANAGER
REM ============================================
echo [4/5] Starting Service Manager...
if exist "%WEBSITE_ROOT%\services\service_manager.py" (
    start /B python "%WEBSITE_ROOT%\services\service_manager.py"
    timeout /t 2 /nobreak >nul
    echo   Service Manager started
) else (
    echo   Service Manager file not found
)
echo.

REM ============================================
REM 5. SUMMARY
REM ============================================
echo [5/5] Services Started
echo.
echo ========================================
echo All Services Started!
echo ========================================
echo.
echo Access Points:
echo   • Website:        http://localhost:3000
echo   • MAS API:         http://localhost:8001
echo   • N8N:            http://localhost:5678
echo   • MAS Dashboard:  http://localhost:3100
echo   • MyCA App:       http://localhost:3001
echo   • MINDEX API:     http://localhost:8000
echo.
echo Services are running independently of Cursor.
echo.
pause








