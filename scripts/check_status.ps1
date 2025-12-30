# Mycosoft System Status Check
# Quickly verifies all services are running

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Mycosoft System Status Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Port
    )
    
    $status = "✗"
    $color = "Red"
    
    if ($Url) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction Stop
            $status = "✓"
            $color = "Green"
        } catch {
            # Check if port is open
            $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
            if ($connection) {
                $status = "⚠"
                $color = "Yellow"
            }
        }
    } else {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connection) {
            $status = "✓"
            $color = "Green"
        }
    }
    
    Write-Host "  $status $Name" -ForegroundColor $color
}

# Check Docker containers
Write-Host "Docker Containers:" -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" | Select-String "mycosoft"
if ($containers) {
    foreach ($container in $containers) {
        Write-Host "  ✓ $container" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ No Docker containers running" -ForegroundColor Red
}
Write-Host ""

# Check services
Write-Host "Services:" -ForegroundColor Yellow
Test-Service -Name "Next.js Website (Port 3000)" -Url "http://localhost:3000" -Port 3000
Test-Service -Name "MAS Orchestrator (Port 8001)" -Url "http://localhost:8001/health" -Port 8001
Test-Service -Name "N8N Workflows (Port 5678)" -Url "http://localhost:5678" -Port 5678
Test-Service -Name "MyCA App (Port 3001)" -Url "http://localhost:3001" -Port 3001
Test-Service -Name "MAS Dashboard (Port 3100)" -Url "http://localhost:3100" -Port 3100
Test-Service -Name "PostgreSQL (Port 5433)" -Port 5433
Test-Service -Name "Redis (Port 6390)" -Port 6390
Test-Service -Name "Qdrant (Port 6345)" -Port 6345
Test-Service -Name "Whisper (Port 8765)" -Port 8765
Test-Service -Name "TTS (Port 5500)" -Port 5500
Test-Service -Name "MINDEX API (Port 8000)" -Url "http://localhost:8000" -Port 8000

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  • Website:        http://localhost:3000" -ForegroundColor White
Write-Host "  • MAS API:         http://localhost:8001" -ForegroundColor White
Write-Host "  • N8N:            http://localhost:5678" -ForegroundColor White
Write-Host "  • MAS Dashboard:  http://localhost:3100" -ForegroundColor White
Write-Host "  • MyCA App:       http://localhost:3001" -ForegroundColor White
Write-Host "  • MINDEX API:     http://localhost:8000" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan







