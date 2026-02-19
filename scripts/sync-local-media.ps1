# Mycosoft Website - Local Media Sync - Feb 19 2026
#
# WORKFLOW:
#   1. Drop videos into: website/videos/  (staging)
#      Drop images into: website/videos/  (same staging folder, any extension)
#   2. Run: .\scripts\sync-local-media.ps1
#   3. Files copied to public/assets/<section>/ for local dev
#   4. Also upload same files to NAS: \\192.168.0.105\mycosoft.com\website\assets\<section>\
#
# PATH MAPPING:
#   Staging    -> website/videos/<file>
#   Local dev  -> public/assets/<section>/<file>   = /assets/<section>/<file> on web
#   NAS        -> \\192.168.0.105\mycosoft.com\website\assets\<section>\<file>
#   Production -> /assets/<section>/<file>  (Docker volume mounts NAS to /app/public/assets)
#
# NOTE: Large images (team photos, logos) are also NAS-served. NOT committed to git.
# Upload them to NAS at: assets/team/ and assets/logos/

param([switch]$DryRun, [switch]$Force)

$Root    = Split-Path $PSScriptRoot -Parent
$Staging = Join-Path $Root "videos"
$Assets  = Join-Path $Root "public\assets"

# MEDIA MANIFEST - add new entries here whenever media is staged
$Manifest = @(
    # ── About Us videos ───────────────────────────────────────────────────────
    @{ Src = "Mycosoft Commercial 1.mp4";          Dest = "about us\Mycosoft Commercial 1.mp4" },
    @{ Src = "Mycosoft - Hello World.mp4";         Dest = "about us\Mycosoft - Hello World.mp4" },
    @{ Src = "10343918-hd_1920_1080_24fps.mp4";    Dest = "about us\10343918-hd_1920_1080_24fps.mp4" },

    # ── Mushroom 1 device videos ──────────────────────────────────────────────
    @{ Src = "Mushroom 1 - In Lab.mp4";            Dest = "mushroom1\Mushroom 1 - In Lab.mp4" },
    @{ Src = "Mushroom 1 - In Nature.mp4";         Dest = "mushroom1\Mushroom 1 - In Nature.mp4" },

    # ── Team bio photos (NAS: assets/team/) ───────────────────────────────────
    @{ Src = "morgan-rockwell.png";   Dest = "team\morgan-rockwell.png" },
    @{ Src = "garret-baquet.png";     Dest = "team\garret-baquet.png" },
    @{ Src = "rj-ricasata.png";       Dest = "team\rj-ricasata.png" },
    @{ Src = "chris-freetage.png";    Dest = "team\chris-freetage.png" },
    @{ Src = "alberto-septien.png";   Dest = "team\alberto-septien.png" },

    # ── MYCA logos (NAS: assets/logos/) ───────────────────────────────────────
    @{ Src = "myca-logo-icon.png";    Dest = "logos\myca-logo-icon.png" },
    @{ Src = "myca-logo-dark.png";    Dest = "logos\myca-logo-dark.png" },
    @{ Src = "myca-logo-full.png";    Dest = "logos\myca-logo-full.png" },
    @{ Src = "myca-logo-square.png";  Dest = "logos\myca-logo-square.png" }

    # ── Add new entries below ──────────────────────────────────────────────────
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

