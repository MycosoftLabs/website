# Mycosoft Service Startup Script
# Automatically starts all required services

Write-Host "Starting Mycosoft Services..." -ForegroundColor Green

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$websiteRoot = Split-Path -Parent $scriptDir

# Start Service Manager
Write-Host "Starting Service Manager..." -ForegroundColor Yellow
$serviceManagerPath = Join-Path $websiteRoot "services\service_manager.py"
Start-Process python -ArgumentList $serviceManagerPath -WindowStyle Hidden

# Wait a moment for services to start
Start-Sleep -Seconds 3

Write-Host "Services started!" -ForegroundColor Green
Write-Host "Service Manager is monitoring all services." -ForegroundColor Cyan






