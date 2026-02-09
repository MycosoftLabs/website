# =============================================================================
# Get dev keys from internal keys API and optionally write to .env.local
# Usage:
#   .\scripts\get-dev-keys.ps1
#   .\scripts\get-dev-keys.ps1 -AppendToEnv
#   .\scripts\get-dev-keys.ps1 -BaseUrl http://localhost:3010 -Secret $env:INTERNAL_KEYS_ADMIN_SECRET
# =============================================================================

param(
    [string]$BaseUrl = "http://localhost:3010",
    [string]$Secret = $env:INTERNAL_KEYS_ADMIN_SECRET,
    [switch]$AppendToEnv
)

$apiUrl = "$BaseUrl/api/internal/keys/dev"
$headers = @{ "Content-Type" = "application/json" }
if ($Secret) { $headers["X-Internal-Keys-Secret"] = $Secret }

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
} catch {
    Write-Error "Failed to get dev keys. Is the dev server running at $BaseUrl? Error: $_"
    exit 1
}

Write-Host "Dev keys (env snippet):" -ForegroundColor Green
Write-Host $response.envSnippet
Write-Host ""

if ($AppendToEnv) {
    $envPath = Join-Path (Get-Location) ".env.local"
    $snippet = $response.envSnippet
    if (-not (Test-Path $envPath)) {
        Set-Content -Path $envPath -Value "# Appended by get-dev-keys.ps1`n$snippet"
        Write-Host "Created $envPath with keys." -ForegroundColor Green
    } else {
        $existing = Get-Content $envPath -Raw
        if ($existing -match "MINDEX_API_KEY=") {
            Write-Host ".env.local already contains key vars. Paste the snippet above manually if you want to replace." -ForegroundColor Yellow
        } else {
            Add-Content -Path $envPath -Value "`n# Dev keys from get-dev-keys.ps1`n$snippet"
            Write-Host "Appended keys to $envPath" -ForegroundColor Green
        }
    }
} else {
    Write-Host "To append to .env.local run: .\scripts\get-dev-keys.ps1 -AppendToEnv" -ForegroundColor Cyan
}
