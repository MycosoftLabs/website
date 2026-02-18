# Start website dev server in an EXTERNAL window (not tied to Cursor)
# Feb 18, 2026 - Runs on port 3010; close Cursor anytime.
# Double-click or run: powershell -ExecutionPolicy Bypass -File start-dev-external.ps1

param(
    [switch]$NoKill   # Don't kill existing process on 3010
)

$Port = 3010
$WebsiteRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

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

Write-Host "=== Website Dev Server (External) ===" -ForegroundColor Cyan
Write-Host "Port: 3010 | URL: http://localhost:3010" -ForegroundColor Gray
Write-Host "This window will stay open. Close it to stop the dev server." -ForegroundColor Gray
Write-Host ""

npm run dev:next-only
