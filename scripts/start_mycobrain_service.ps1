# Start MycoBrain Service for COM7
# Auto-starts in background and logs to file

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$websiteDir = Split-Path -Parent $scriptDir
$serviceScript = Join-Path $websiteDir "services\mycobrain\mycobrain_service.py"
$logFile = Join-Path $websiteDir "logs\mycobrain-service.log"

# Create logs directory
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

# Stop existing service if running
Write-Host "Checking for existing MycoBrain service..."
$existing = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        $cmd -like "*mycobrain_service*"
    } catch {
        $false
    }
}

if ($existing) {
    Write-Host "Stopping existing service..."
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Start new service
Write-Host "Starting MycoBrain service..."
Write-Host "  Service: $serviceScript"
Write-Host "  Log: $logFile"

Set-Location $websiteDir

# Use Start-Job to properly redirect output
$job = Start-Job -ScriptBlock {
    param($script, $log, $errLog, $dir)
    Set-Location $dir
    python $script *> $log 2> $errLog
} -ArgumentList $serviceScript, $logFile, (Join-Path $websiteDir "logs\mycobrain-service-errors.log"), $websiteDir

Start-Sleep -Seconds 5

# Check if service is responding
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8003/health" -TimeoutSec 5
    $processId = $job.Id  # Use job ID as reference
} catch {
    Write-Host "[WARNING] Service may not have started. Check log: $logFile" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

# Check if it started
if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Service failed to start. Check log: $logFile" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] MycoBrain service started (PID: $($process.Id))" -ForegroundColor Green
Write-Host "  Log file: $logFile"
Write-Host "  To view logs: Get-Content $logFile -Tail 50 -Wait"
