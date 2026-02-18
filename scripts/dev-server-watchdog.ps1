# Dev Server Watchdog - Feb 17, 2026
# Monitors localhost:3010 every 30s. Restarts dev server if it stops responding.
# Also ensures MycoBrain service (8003) is always running when dev server is on.
# Runs as a background process, installed in Windows Startup folder.

$Port        = 3010
$MASRoot     = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas"
$CheckEvery  = 30
$StartDelay  = 5
$MaxFails    = 3
$WebsiteRoot = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website"
$LogFile     = Join-Path $WebsiteRoot "logs\dev-server-watchdog.log"
$LogDir      = Split-Path $LogFile

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log ($msg, $lvl) {
    if (-not $lvl) { $lvl = "INFO" }
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$lvl] $msg"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

function Is-Up {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Is-MycoBrainUp {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8003/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Ensure-MycoBrainRunning {
    if (Is-MycoBrainUp) { return $true }
    $script = Join-Path $MASRoot "scripts\mycobrain-service.ps1"
    if (-not (Test-Path $script)) {
        Write-Log "MycoBrain service script not found: $script" "WARN"
        return $false
    }
    Write-Log "MycoBrain service down. Starting..."
    & $script start 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    return (Is-MycoBrainUp)
}

function Kill-Port {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        if ($c.OwningProcess -and $c.OwningProcess -ne 0) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds $StartDelay
}

function Start-DevServer {
    Write-Log "Starting: npm run dev:next-only"
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c npm run dev:next-only" `
        -WorkingDirectory $WebsiteRoot `
        -WindowStyle Minimized
    Write-Log "Dev server process launched."
}

function Wait-ForServer {
    $limit   = 120
    $elapsed = 0
    Write-Log "Waiting up to ${limit}s for server on :$Port..."
    while ($elapsed -lt $limit) {
        if (Is-Up) {
            Write-Log "Server is UP at http://localhost:$Port"
            return $true
        }
        Start-Sleep -Seconds 5
        $elapsed += 5
    }
    Write-Log "Server did not come up within ${limit}s." "WARN"
    return $false
}

# ----- main -----
Write-Log "=== Dev Server Watchdog started. Checking every ${CheckEvery}s ==="

$fails    = 0
$restarts = 0

# Ensure MycoBrain runs whenever dev server is on
if (-not (Ensure-MycoBrainRunning)) {
    Write-Log "MycoBrain service could not be started (dev server may still work)" "WARN"
} else {
    Write-Log "MycoBrain service (8003) is running."
}

if (-not (Is-Up)) {
    Write-Log "Server not running at startup. Starting now..."
    Kill-Port
    Start-DevServer
    Wait-ForServer | Out-Null
    $fails = 0
} else {
    Write-Log "Dev server already running. Watchdog active."
}

while ($true) {
    Start-Sleep -Seconds $CheckEvery

    if (Is-Up) {
        if ($fails -gt 0) { Write-Log "Server recovered. Resetting counter." }
        $fails = 0
        # MycoBrain must run whenever dev server is on
        if (-not (Is-MycoBrainUp)) {
            Ensure-MycoBrainRunning | Out-Null
        }
    } else {
        $fails++
        Write-Log "Not responding (fail $fails/$MaxFails)" "WARN"

        if ($fails -ge $MaxFails) {
            $restarts++
            Write-Log "=== RESTART #$restarts ===" "WARN"
            Kill-Port
            Start-DevServer
            $ok = Wait-ForServer

            if ($ok) {
                Write-Log "Server restarted OK."
            } else {
                Write-Log "Server failed to restart." "ERROR"
            }
            $fails = 0
        }
    }
}
