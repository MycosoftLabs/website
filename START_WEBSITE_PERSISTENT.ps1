# Persistent Website Service Script
# This ensures the website ALWAYS runs on port 3000
# Run this script to start the website, and it will keep running even if Cursor closes

$ErrorActionPreference = "Stop"

$websitePath = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website"
$port = 3000

Write-Host "=== Starting Website Persistent Service ===" -ForegroundColor Cyan
Write-Host "Path: $websitePath" -ForegroundColor White
Write-Host "Port: $port" -ForegroundColor White
Write-Host ""

# Kill any existing processes on port 3000
Write-Host "Checking for existing processes on port $port..." -ForegroundColor Yellow
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $processId = $existing.OwningProcess
    Write-Host "Killing process $processId on port $port..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Kill any other Next.js dev servers
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    $cmd -like "*next*dev*" -or $cmd -like "*npm*dev*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Change to website directory
Set-Location $websitePath

# Set PORT environment variable explicitly
$env:PORT = $port

# Start the website
Write-Host "Starting website on port $port..." -ForegroundColor Green
Write-Host "This will run in the background and persist even if this window closes." -ForegroundColor Yellow
Write-Host ""

# Start in a new window that stays open
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$websitePath'; `$env:PORT='$port'; Write-Host 'Website running on port $port' -ForegroundColor Green; npm run dev"
) -WindowStyle Minimized

Start-Sleep -Seconds 5

# Verify it started
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing -TimeoutSec 5
    Write-Host "SUCCESS: Website is running on port $port" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Website may still be starting. Check in a few seconds." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Website service started. It will continue running even if you close this window." -ForegroundColor Cyan
Write-Host "To stop it, find the PowerShell window running 'npm run dev' and close it." -ForegroundColor White
