# FUSARIUM Launchpad - provision platform secret placeholders + Stripe webhook
#
# Creates/ensures .env.local keys. Supabase service_role cannot be exported via MCP —
# use apply_migration/execute_sql for schema; runtime BFF keys use session RPCs.
# If STRIPE_SECRET_KEY is set, registers the Launchpad webhook endpoint and
# writes STRIPE_LAUNCHPAD_WEBHOOK_SECRET once (HTTPS URLs preferred; localhost may 400).
# SAM_API_KEY is OPTIONAL — collector skips honestly when unset (no mock awards).
#
# Usage:
#   .\scripts\launchpad\provision-platform-secrets.ps1
#   .\scripts\launchpad\provision-platform-secrets.ps1 -WebhookUrl "https://sandbox.mycosoft.com/api/fusarium/launchpad/stripe/webhook"
#   .\scripts\launchpad\provision-platform-secrets.ps1 -NonInteractive
#   .\scripts\launchpad\provision-platform-secrets.ps1 -NonInteractive -SkipStripeWebhook
#
# Never commit .env.local. LAUNCHPAD_ENABLED stays 0 unless Morgan flips it.
# ASCII-only file: PowerShell 5.x breaks on em-dash / arrow Unicode in string literals.

param(
  [string]$WebhookUrl = "http://localhost:3010/api/fusarium/launchpad/stripe/webhook",
  [switch]$NonInteractive,
  [switch]$SkipStripeWebhook
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$EnvLocal = Join-Path $RepoRoot ".env.local"
$EnvExample = Join-Path $RepoRoot ".env.example"

function Read-DotEnv([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $map[$k] = $v
  }
  return $map
}

function Upsert-EnvLine([string]$Path, [string]$Key, [string]$Value) {
  $lines = @()
  if (Test-Path $Path) { $lines = @(Get-Content $Path) }
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) {
    $out += ""
    $out += "# Launchpad platform secret (provision-platform-secrets.ps1)"
    $out += "$Key=$Value"
  }
  Set-Content -Path $Path -Value $out -Encoding UTF8
}

Write-Host "Launchpad platform secrets provisioning"
Write-Host "Repo: $RepoRoot"

if (-not (Test-Path $EnvLocal)) {
  Write-Host "Creating .env.local from .env.example placeholders (if present)..."
  if (Test-Path $EnvExample) {
    Copy-Item $EnvExample $EnvLocal
  } else {
    New-Item -ItemType File -Path $EnvLocal | Out-Null
  }
}

$envMap = Read-DotEnv $EnvLocal

$requiredKeys = @(
  @{ Key = "NEXT_PUBLIC_SUPABASE_URL"; Hint = "Supabase project URL (MCP get_project_url / Dashboard)" },
  @{ Key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; Hint = "Supabase anon/publishable (MCP get_publishable_keys)" },
  @{ Key = "SUPABASE_SERVICE_ROLE_KEY"; Hint = "OPTIONAL for keys UI (session RPCs). Required for ingest/agent lp_ verify + webhook writes. Not exportable via Supabase MCP — use existing machine env if present." },
  @{ Key = "STRIPE_SECRET_KEY"; Hint = "Stripe secret (sk_test preferred; live needs ALLOW_STRIPE_LIVE_PROVISION=1)" },
  @{ Key = "STRIPE_LAUNCHPAD_WEBHOOK_SECRET"; Hint = "Created by this script OR Stripe webhook signing secret" },
  @{ Key = "SAM_API_KEY"; Hint = "OPTIONAL — leave empty; collector skips with honest empty (no mock awards)" },
  @{ Key = "LAUNCHPAD_ENABLED"; Hint = "Keep 0 in sandbox/prod until Morgan go" },
  @{ Key = "LAUNCHPAD_INGEST_TOKEN"; Hint = "DEPRECATED break-glass - prefer tenant lp_ keys (scope=ingest)" },
  @{ Key = "LAUNCHPAD_AGENT_ROOT_SECRET"; Hint = "DEPRECATED break-glass - prefer tenant lp_ keys (scope=agent)" }
)

foreach ($item in $requiredKeys) {
  $k = $item.Key
  $cur = $envMap[$k]
  if ([string]::IsNullOrWhiteSpace($cur)) {
    if ($k -eq "LAUNCHPAD_ENABLED") {
      Upsert-EnvLine $EnvLocal $k "0"
      Write-Host "SET $k=0 (kill switch off)"
      continue
    }
    if ($NonInteractive) {
      Upsert-EnvLine $EnvLocal $k ""
      Write-Host "PLACEHOLDER $k=  ($($item.Hint))"
      continue
    }
    Write-Host ""
    Write-Host "$k is empty."
    Write-Host "  $($item.Hint)"
    $pasted = Read-Host "Paste value for $k (Enter to leave empty placeholder)"
    Upsert-EnvLine $EnvLocal $k $pasted
  } else {
    Write-Host "OK $k is set (value not printed)"
  }
}

# Refresh map
$envMap = Read-DotEnv $EnvLocal

if (-not $SkipStripeWebhook) {
  $stripeKey = $envMap["STRIPE_SECRET_KEY"]
  if ([string]::IsNullOrWhiteSpace($stripeKey)) {
    Write-Host "Skip Stripe webhook: STRIPE_SECRET_KEY not set."
  } elseif ($stripeKey.StartsWith("sk_live_") -and $env:ALLOW_STRIPE_LIVE_PROVISION -ne "1") {
    Write-Host "Skip Stripe webhook: live key without ALLOW_STRIPE_LIVE_PROVISION=1"
  } else {
    Write-Host "Registering Stripe webhook endpoint: $WebhookUrl"
    $form = "url=$([uri]::EscapeDataString($WebhookUrl))"
    $form += ("&description=" + [uri]::EscapeDataString("FUSARIUM Launchpad entitlements"))
    foreach ($ev in @(
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed"
    )) {
      $form += ("&enabled_events[]=" + [uri]::EscapeDataString($ev))
    }

    try {
      $resp = Invoke-RestMethod -Method Post -Uri "https://api.stripe.com/v1/webhook_endpoints" `
        -Headers @{ Authorization = "Bearer $stripeKey" } `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $form
      $secret = $resp.secret
      if ($secret) {
        Upsert-EnvLine $EnvLocal "STRIPE_LAUNCHPAD_WEBHOOK_SECRET" $secret
        Write-Host "Wrote STRIPE_LAUNCHPAD_WEBHOOK_SECRET to .env.local (shown once by Stripe)."
        Write-Host "Endpoint id: $($resp.id)"
      } else {
        Write-Host "Webhook created but secret missing in response (may already exist). Check Stripe Dashboard."
        Write-Host ($resp | ConvertTo-Json -Depth 4)
      }
    } catch {
      Write-Host "Stripe webhook create failed: $($_.Exception.Message)"
      Write-Host "If endpoint already exists, copy signing secret from Stripe Dashboard > Webhooks."
    }
  }
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Schema/RPCs: Supabase MCP apply_migration/execute_sql (prod hnevnsxnhfibhbsipqvz already has launchpad_api_keys)."
Write-Host "  2. Keys UI BFF uses session RPCs — no service_role required for Settings create/list/revoke."
Write-Host "  3. Ingest/agent Bearer lp_ verify + Stripe webhook ledger need SUPABASE_SERVICE_ROLE_KEY in runtime env (not MCP-exportable)."
Write-Host "  4. SAM_API_KEY optional — run-sam-collector exits 0 when unset (honest skip)."
Write-Host "  5. Stripe catalog: npx tsx scripts/launchpad/provision-stripe-catalog.ts"
Write-Host "  6. Keep LAUNCHPAD_ENABLED=0 in sandbox/prod until Morgan go."
Write-Host "Done."
