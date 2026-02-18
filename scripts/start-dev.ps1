# Start website dev server on port 3010 - Feb 12, 2026
# Use this when the dev site isn't running or port 3010 is in use.
# No Docker required; hot reload for Cursor edits.
# When in Cursor and dev server is down: run .\scripts\ensure-dev-server.ps1 to bring up 3010 (one server only).
# If dev server keeps crashing: use -Stable (see docs/DEV_SERVER_CRASH_FIX_FEB12_2026.md). Cache is cleared automatically on every start.

param(
    [switch]$NoKill,      # Don't kill process on 3010; just start (will fail if port in use)
    [switch]$Stable       # Use 8GB Node heap to reduce OOM crashes (npm run dev:stable)
)

$Port = 3010
$WebsiteRoot = $PSScriptRoot + "\.."

# Optional: free port 3010
if (-not $NoKill) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $procId = $conn.OwningProcess | Select-Object -First 1
        Write-Host "Stopping process on port $Port (PID $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Set-Location $WebsiteRoot

# Always clear .next cache on start (fixes EBUSY / corrupted build after crash or restart)
$nextDir = Join-Path $WebsiteRoot ".next"
if (Test-Path $nextDir) {
    Write-Host "Clearing .next cache..."
    Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

if ($Stable) {
    Write-Host "Starting Next.js dev server (stable: 8GB heap) at http://localhost:$Port..."
} else {
    Write-Host "Starting Next.js dev server at http://localhost:$Port (no GPU services)..."
}
Write-Host ""
if ($Stable) { npm run dev:stable } else { npm run dev:next-only }
