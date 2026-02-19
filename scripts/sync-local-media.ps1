# Mycosoft Website - Local Media Sync - Feb 18 2026
#
# WORKFLOW:
#   1. Drop videos into: website/videos/  (staging)
#   2. Run: .\scripts\sync-local-media.ps1
#   3. Files copied to public/assets/<section>/ for local dev
#   4. Also upload same files to NAS: \\192.168.0.105\mycosoft.com\website\assets\<section>\
#
# PATH MAPPING:
#   Staging    -> website/videos/<file>
#   Local dev  -> public/assets/<section>/<file>   = /assets/<section>/<file> on web
#   NAS        -> \\192.168.0.105\mycosoft.com\website\assets\<section>\<file>
#   Production -> /assets/<section>/<file>  (Docker volume mounts NAS to /app/public/assets)

param([switch]$DryRun, [switch]$Force)

$Root    = Split-Path $PSScriptRoot -Parent
$Staging = Join-Path $Root "videos"
$Assets  = Join-Path $Root "public\assets"

# MEDIA MANIFEST - add new entries here whenever a video is staged
$Manifest = @(
    @{ Src = "Mycosoft Commercial 1.mp4";  Dest = "about us\Mycosoft Commercial 1.mp4" },
    @{ Src = "Mycosoft - Hello World.mp4"; Dest = "about us\Mycosoft - Hello World.mp4" },
    @{ Src = "Mushroom 1 - In Lab.mp4";   Dest = "mushroom1\Mushroom 1 - In Lab.mp4" },
    @{ Src = "Mushroom 1 - In Nature.mp4";Dest = "mushroom1\Mushroom 1 - In Nature.mp4" }
)

Write-Host "Mycosoft Website Media Sync" -ForegroundColor Cyan
Write-Host "Staging: $Staging"
Write-Host "Assets:  $Assets"
if ($DryRun) { Write-Host "DRY RUN - no files will be copied" -ForegroundColor Yellow }
Write-Host ""

$copied = 0; $skipped = 0; $missing = 0; $errors = 0

foreach ($entry in $Manifest) {
    $srcPath  = Join-Path $Staging $entry.Src
    $destPath = Join-Path $Assets  $entry.Dest
    $destDir  = Split-Path $destPath -Parent

    if (-not (Test-Path $srcPath)) {
        Write-Host "  MISSING   $($entry.Src)" -ForegroundColor DarkGray
        $missing++
        continue
    }

    if ((Test-Path $destPath) -and -not $Force) {
        $ss = (Get-Item $srcPath).Length
        $ds = (Get-Item $destPath).Length
        if ($ss -eq $ds) {
            Write-Host "  OK        $($entry.Dest)" -ForegroundColor DarkGreen
            $skipped++
            continue
        }
    }

    $mb = [math]::Round((Get-Item $srcPath).Length / 1MB, 1)

    if ($DryRun) {
        Write-Host "  WOULD COPY $($entry.Src) => $($entry.Dest) (${mb}MB)" -ForegroundColor Yellow
        $copied++
        continue
    }

    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    try {
        Copy-Item -Path $srcPath -Destination $destPath -Force
        Write-Host "  COPIED    $($entry.Dest) (${mb}MB)" -ForegroundColor Green
        $copied++
    } catch {
        Write-Host "  ERROR     $($entry.Dest): $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "Done: $copied copied, $skipped already synced, $missing not staged, $errors errors" -ForegroundColor Cyan
Write-Host "NAS reminder: \\192.168.0.105\mycosoft.com\website\assets\" -ForegroundColor Yellow

