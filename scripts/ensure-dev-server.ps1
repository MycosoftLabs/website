# Ensure website dev server is running on port 3010. Run from website repo or scripts folder.
# Use when Cursor restarts and the dev server is down; avoids duplicate servers.
# Feb 12, 2026

$Port = 3010
$WebsiteRoot = if ($PSScriptRoot) { Join-Path $PSScriptRoot ".." } else { ".." }
$WebsiteRoot = (Resolve-Path $WebsiteRoot -ErrorAction SilentlyContinue).Path
if (-not $WebsiteRoot) { $WebsiteRoot = (Get-Location).Path }

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 304) {
        Write-Host "Dev server already running on http://localhost:$Port"
        exit 0
    }
} catch {
    # Not running or not responding
}

Write-Host "Dev server not responding on $Port. Starting..."
Set-Location $WebsiteRoot
& (Join-Path $PSScriptRoot "start-dev.ps1")
