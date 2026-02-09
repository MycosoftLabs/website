# Start website dev server on port 3010 - Feb 6, 2026
# Use this when the dev site isn't running or port 3010 is in use.
# No Docker required; hot reload for Cursor edits.

param(
    [switch]$NoKill   # Don't kill process on 3010; just start (will fail if port in use)
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
Write-Host "Starting Next.js dev server at http://localhost:$Port (no GPU services)..."
Write-Host ""
npm run dev:next-only
