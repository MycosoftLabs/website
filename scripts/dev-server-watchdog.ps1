# Dev Server Watchdog - Feb 17, 2026
# Monitors localhost:3010 every 30s. Restarts dev server if it stops responding.
# Runs as a background process, installed in Windows Startup folder.

$Port        = 3010
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
