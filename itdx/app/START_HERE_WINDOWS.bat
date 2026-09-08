@echo off
setlocal
cd /d "%~dp0"
title Mycosoft ITDX26 - Setup and Launch
if not exist "launch.py" goto incomplete
if not exist "bundled_documents\index.json" goto incomplete
set "ITDX_PYTHON="
set "ITDX_PY_ARGS="
call :find_python
if defined ITDX_PYTHON goto launch

echo Python 3.10 or newer was not found. Installing Python with Microsoft WinGet...
where winget >nul 2>nul
if errorlevel 1 goto python_manual
winget install --exact --id Python.Python.3.14 --source winget --scope user --accept-source-agreements --accept-package-agreements
call :find_python
if not defined ITDX_PYTHON goto python_manual

:launch
"%ITDX_PYTHON%" %ITDX_PY_ARGS% -X utf8 "launch.py" %*
set "ITDX_EXIT=%ERRORLEVEL%"
if "%ITDX_EXIT%"=="0" exit /b 0
echo.
echo The app could not start. The error above and local_data\startup.log explain why.
pause
exit /b %ITDX_EXIT%

:find_python
where py >nul 2>nul
if errorlevel 1 goto standard_paths
py -3 -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3,10) else 1)" >nul 2>nul
if errorlevel 1 goto standard_paths
set "ITDX_PYTHON=py"
set "ITDX_PY_ARGS=-3"
exit /b 0
:standard_paths
for %%V in (314 313 312 311 310) do call :try_python "%LocalAppData%\Programs\Python\Python%%V\python.exe"
for %%V in (314 313 312 311 310) do call :try_python "%ProgramFiles%\Python%%V\python.exe"
if defined ITDX_PYTHON exit /b 0
for /f "delims=" %%P in ('where python 2^>nul ^| findstr /I /V "WindowsApps"') do call :try_python "%%P"
exit /b 0
:try_python
if defined ITDX_PYTHON exit /b 0
if not exist "%~1" exit /b 0
"%~1" -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3,10) else 1)" >nul 2>nul
if errorlevel 1 exit /b 0
set "ITDX_PYTHON=%~1"
set "ITDX_PY_ARGS="
exit /b 0

:python_manual
echo.
echo Python installation needs your computer's installer or a reopened terminal.
echo The official Python download page will open. Install Python, then double-click this launcher again.
start "" "https://www.python.org/downloads/windows/"
pause
exit /b 1

:incomplete
echo.
echo Extract the ENTIRE ZIP first using Extract All. Then open the extracted folder.
echo Double-click START_HERE_WINDOWS.bat from that folder, not from inside the ZIP.
pause
exit /b 1
