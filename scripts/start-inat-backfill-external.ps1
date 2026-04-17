# Long-running iNat -> MINDEX backfill (external window / not Cursor terminal)
# Loads MINDEX_API_URL / MINDEX_API_KEY from website .env.local then runs tsx worker.
# Apr 17, 2026

$WebsiteRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $WebsiteRoot

$envLocal = Join-Path $WebsiteRoot ".env.local"
if (-not (Test-Path $envLocal)) {
    Write-Error ".env.local not found — add MINDEX_API_URL and MINDEX_API_KEY"
    exit 1
}

Get-Content $envLocal | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $k = $matches[1].Trim()
        $v = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
}

if (-not $env:MINDEX_API_URL -or -not $env:MINDEX_API_KEY) {
    Write-Error "MINDEX_API_URL and MINDEX_API_KEY must be set in .env.local"
    exit 1
}

Write-Host "Starting iNat backfill -> $env:MINDEX_API_URL (cursor in var/inat-backfill-cursor.json)"
npx tsx scripts/inat-backfill.ts
