# Start CREP-only dev server on port 3020 - Feb 2026
# Use this when working on CREP so the main dev server (3010) and Cursor don't get clogged or crash.
# All API links use the current origin, so http://localhost:3020/dashboard/crep works correctly.

param(
    [switch]$NoKill   # Don't kill process on 3020; just start (will fail if port in use)
)

$Port = 3020
$WebsiteRoot = $PSScriptRoot + "\.."

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
Write-Host "CREP-only dev server (avoids clogging main dev server / Cursor)"
Write-Host "  URL: http://localhost:$Port/dashboard/crep"
Write-Host ""
npm run dev:crep
