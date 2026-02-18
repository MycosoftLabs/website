@echo off
REM Start website dev server on port 3010 - Feb 12, 2026
REM Run from EXTERNAL terminal (outside Cursor) to prevent Cursor crashes.
REM Double-click or: cd website && scripts\start-dev.cmd

cd /d "%~dp0.."
if exist .next (
    echo Clearing .next cache...
    rmdir /s /q .next 2>nul
    timeout /t 1 /nobreak >nul
)
echo Starting Next.js dev server at http://localhost:3010...
call npm run dev:stable
