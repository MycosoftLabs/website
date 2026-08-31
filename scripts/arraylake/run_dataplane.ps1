# Earth Simulator — Arraylake data plane runner (introspect → bake)
# Requires: pip deps + ARRAYLAKE_TOKEN or `arraylake auth login`
param(
  [string]$Dataset = "",
  [string]$Variable = "",
  [switch]$IntrospectOnly,
  [switch]$SkipIntrospect
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root

$creds = Join-Path (Split-Path $root -Parent) "MAS\mycosoft-mas\.credentials.local"
if (-not (Test-Path $creds)) {
  $creds = Join-Path $env:USERPROFILE ".mycosoft-credentials"
}
if (Test-Path $creds) {
  Get-Content $creds | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
      [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
  }
}
if (Test-Path ".env.local") {
  Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^([^#=]+)=(.*)$") {
      $k = $matches[1].Trim()
      if ($k -match "^ARRAYLAKE") {
        [Environment]::SetEnvironmentVariable($k, $matches[2].Trim(), "Process")
      }
    }
  }
}

if (-not $env:ARRAYLAKE_CATALOG_URL) {
  $env:ARRAYLAKE_CATALOG_URL = "http://localhost:3010/api/crep/field/_catalog"
}
if (-not $env:ARRAYLAKE_FIELD_OUT) {
  $env:ARRAYLAKE_FIELD_OUT = Join-Path $root "fields_out"
}

Write-Host "Catalog: $($env:ARRAYLAKE_CATALOG_URL)"
Write-Host "Output:  $($env:ARRAYLAKE_FIELD_OUT)"

if (-not $env:ARRAYLAKE_TOKEN) {
  Write-Host "WARNING: ARRAYLAKE_TOKEN not set. Run: arraylake auth login" -ForegroundColor Yellow
}

if (-not $SkipIntrospect) {
  python scripts/arraylake/introspect.py
  if ($IntrospectOnly) { exit 0 }
}

$args = @()
if ($Dataset) { $args += $Dataset }
if ($Variable) { $args += $Variable }
python scripts/arraylake/bake_field.py @args
