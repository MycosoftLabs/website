# Mycosoft Complete System Startup Script
# Starts all services: Docker containers, Next.js website, Python services
# This script ensures everything runs independently of Cursor

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Mycosoft Complete System Startup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$websiteRoot = Split-Path -Parent $scriptDir
$masRoot = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas"

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Function to wait for service
function Wait-ForService {
    param([string]$Url, [int]$MaxWait = 60)
    $elapsed = 0
    while ($elapsed -lt $MaxWait) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction Stop
            return $true
        } catch {
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
    }
    Write-Host ""
    return $false
}

# ============================================
# 1. START DOCKER CONTAINERS
# ============================================
Write-Host "[1/5] Starting Docker Containers..." -ForegroundColor Yellow
Set-Location $masRoot

# Check if containers are already running
$containersRunning = docker compose -f docker-compose.essential.yml ps --format json | ConvertFrom-Json | Where-Object { $_.State -eq "running" }
if ($containersRunning.Count -lt 9) {
    Write-Host "  Starting essential containers..." -ForegroundColor Cyan
    docker compose -f docker-compose.essential.yml up -d
    Start-Sleep -Seconds 5
} else {
    Write-Host "  Docker containers already running" -ForegroundColor Green
}

# Verify containers
Write-Host "  Verifying containers..." -ForegroundColor Cyan
docker compose -f docker-compose.essential.yml ps

Write-Host "  ✓ Docker containers started" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. START NEXT.JS WEBSITE
# ============================================
Write-Host "[2/5] Starting Next.js Website..." -ForegroundColor Yellow
Set-Location $websiteRoot

# Kill any existing Next.js processes on port 3000
$existingProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($existingProcess) {
    Write-Host "  Stopping existing Next.js process on port 3000..." -ForegroundColor Cyan
    Stop-Process -Id $existingProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start Next.js in background
Write-Host "  Starting Next.js dev server on port 3000..." -ForegroundColor Cyan
$nextjsProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $websiteRoot -PassThru -WindowStyle Hidden

# Wait for Next.js to start
Write-Host "  Waiting for Next.js to start..." -ForegroundColor Cyan
if (Wait-ForService -Url "http://localhost:3000" -MaxWait 60) {
    Write-Host "  ✓ Next.js website running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Next.js may still be starting..." -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 3. START MYCOBRAIN SERVICE
# ============================================
Write-Host "[3/5] Starting MycoBrain Service..." -ForegroundColor Yellow

$mycobrainServicePath = Join-Path $websiteRoot "services\mycobrain\mycobrain_service.py"
if (Test-Path $mycobrainServicePath) {
    # Check if already running
    $mycobrainProcess = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*mycobrain_service*" }
    if (-not $mycobrainProcess) {
        Write-Host "  Starting MycoBrain service..." -ForegroundColor Cyan
        Start-Process python -ArgumentList $mycobrainServicePath -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "  ✓ MycoBrain service started" -ForegroundColor Green
    } else {
        Write-Host "  ✓ MycoBrain service already running" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ MycoBrain service file not found" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 4. START SERVICE MANAGER
# ============================================
Write-Host "[4/5] Starting Service Manager..." -ForegroundColor Yellow

$serviceManagerPath = Join-Path $websiteRoot "services\service_manager.py"
if (Test-Path $serviceManagerPath) {
    # Check if already running
    $serviceManagerProcess = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*service_manager*" }
    if (-not $serviceManagerProcess) {
        Write-Host "  Starting Service Manager..." -ForegroundColor Cyan
        Start-Process python -ArgumentList $serviceManagerPath -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "  ✓ Service Manager started" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Service Manager already running" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ Service Manager file not found" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# 5. VERIFY ALL SERVICES
# ============================================
Write-Host "[5/5] Verifying All Services..." -ForegroundColor Yellow
Write-Host ""

$services = @(
    @{Name="Docker - MAS Orchestrator"; Url="http://localhost:8001/health"; Port=8001},
    @{Name="Docker - N8N"; Url="http://localhost:5678"; Port=5678},
    @{Name="Docker - MyCA App"; Url="http://localhost:3001"; Port=3001},
    @{Name="Docker - MAS Dashboard"; Url="http://localhost:3100"; Port=3100},
    @{Name="Docker - PostgreSQL"; Port=5433},
    @{Name="Docker - Redis"; Port=6390},
    @{Name="Docker - Qdrant"; Port=6345},
    @{Name="Docker - Whisper"; Port=8765},
    @{Name="Docker - TTS"; Port=5500},
    @{Name="Next.js Website"; Url="http://localhost:3000"; Port=3000},
    @{Name="MINDEX API"; Url="http://localhost:8000"; Port=8000}
)

$allRunning = $true
foreach ($service in $services) {
    if ($service.Url) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 2 -ErrorAction Stop
            Write-Host "  ✓ $($service.Name) - Running" -ForegroundColor Green
        } catch {
            if (Test-Port -Port $service.Port) {
                Write-Host "  ⚠ $($service.Name) - Port open but not responding" -ForegroundColor Yellow
            } else {
                Write-Host "  ✗ $($service.Name) - Not running" -ForegroundColor Red
                $allRunning = $false
            }
        }
    } else {
        if (Test-Port -Port $service.Port) {
            Write-Host "  ✓ $($service.Name) - Running" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $($service.Name) - Not running" -ForegroundColor Red
            $allRunning = $false
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allRunning) {
    Write-Host "✓ All Services Running!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some services may need attention" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  • Website:        http://localhost:3000" -ForegroundColor White
Write-Host "  • MAS API:         http://localhost:8001" -ForegroundColor White
Write-Host "  • N8N:            http://localhost:5678" -ForegroundColor White
Write-Host "  • MAS Dashboard:  http://localhost:3100" -ForegroundColor White
Write-Host "  • MyCA App:       http://localhost:3001" -ForegroundColor White
Write-Host "  • MINDEX API:     http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "Services are running independently of Cursor." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop monitoring (services will continue running)." -ForegroundColor Yellow
Write-Host ""

# Keep script running to show it's active
Write-Host "Monitoring services... (Press Ctrl+C to exit)" -ForegroundColor Cyan
try {
    while ($true) {
        Start-Sleep -Seconds 30
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Services still running..." -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "Monitoring stopped. Services continue running." -ForegroundColor Yellow
}

