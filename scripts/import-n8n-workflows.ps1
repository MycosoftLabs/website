# n8n Workflow Import Helper Script
# Helps import MycoBrain workflows into n8n

param(
    [string]$N8N_URL = "http://localhost:5678",
    [string]$N8N_API_KEY = $env:N8N_API_KEY,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

Write-Host "`n=== n8n Workflow Import Helper ===" -ForegroundColor Cyan
Write-Host ""

# Workflow files to import
$WorkflowFiles = @(
    @{
        Name = "MycoBrain Telemetry Forwarder"
        File = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\13_mycobrain_telemetry_forwarder.json"
        Description = "Scheduled telemetry forwarding to MINDEX"
    },
    @{
        Name = "MycoBrain Optical/Acoustic Modem"
        File = "C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\n8n\workflows\14_mycobrain_optical_acoustic_modem.json"
        Description = "Webhook-triggered modem control"
    }
)

Write-Host "Workflows to import:" -ForegroundColor Yellow
foreach ($wf in $WorkflowFiles) {
    if (Test-Path $wf.File) {
        $content = Get-Content $wf.File -Raw | ConvertFrom-Json
        Write-Host "  ✅ $($wf.Name)" -ForegroundColor Green
        Write-Host "     File: $(Split-Path $wf.File -Leaf)" -ForegroundColor Gray
        Write-Host "     Description: $($wf.Description)" -ForegroundColor Gray
        Write-Host "     Nodes: $($content.nodes.Count)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ $($wf.Name): File not found" -ForegroundColor Red
        Write-Host "     Expected: $($wf.File)" -ForegroundColor Gray
    }
    Write-Host ""
}

if ($DryRun) {
    Write-Host "DRY RUN MODE - No workflows will be imported" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To import manually:" -ForegroundColor Cyan
    Write-Host "  1. Open n8n UI: $N8N_URL" -ForegroundColor White
    Write-Host "  2. Click 'Workflows' in sidebar" -ForegroundColor White
    Write-Host "  3. Click 'Import from File' or '+' button" -ForegroundColor White
    Write-Host "  4. Select workflow files listed above" -ForegroundColor White
    Write-Host "  5. Click 'Import' and activate workflows" -ForegroundColor White
    exit 0
}

# Check if API key is available
if (-not $N8N_API_KEY) {
    Write-Host "⚠️ N8N_API_KEY not set - Manual import required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual Import Instructions:" -ForegroundColor Cyan
    Write-Host "  1. Open n8n UI: $N8N_URL" -ForegroundColor White
    Write-Host "  2. Navigate to Workflows" -ForegroundColor White
    Write-Host "  3. Click 'Import from File' or '+' button" -ForegroundColor White
    foreach ($wf in $WorkflowFiles) {
        if (Test-Path $wf.File) {
            Write-Host "  4. Import: $(Split-Path $wf.File -Leaf)" -ForegroundColor White
        }
    }
    Write-Host "  5. Activate workflows (toggle switch)" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set N8N_API_KEY environment variable for automatic import" -ForegroundColor Gray
    exit 0
}

# Try API import
Write-Host "Attempting API import..." -ForegroundColor Yellow
$SuccessCount = 0
$FailCount = 0

foreach ($wf in $WorkflowFiles) {
    if (-not (Test-Path $wf.File)) {
        Write-Host "  ⚠️ Skipping: $($wf.Name) (file not found)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  Importing: $($wf.Name)..." -NoNewline
    
    try {
        $WorkflowJson = Get-Content $wf.File -Raw
        $Headers = @{
            "Content-Type" = "application/json"
            "X-N8N-API-KEY" = $N8N_API_KEY
        }
        
        $Response = Invoke-RestMethod -Uri "$N8N_URL/api/v1/workflows" `
            -Method Post `
            -Headers $Headers `
            -Body $WorkflowJson `
            -ErrorAction Stop
        
        Write-Host " ✅ (ID: $($Response.id))" -ForegroundColor Green
        $SuccessCount++
    } catch {
        Write-Host " ❌ ($($_.Exception.Message))" -ForegroundColor Red
        $FailCount++
    }
}

Write-Host ""
Write-Host "Import Summary:" -ForegroundColor Cyan
Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "Green" })

if ($FailCount -gt 0) {
    Write-Host ""
    Write-Host "If API import failed, use manual import via n8n UI:" -ForegroundColor Yellow
    Write-Host "  $N8N_URL" -ForegroundColor White
}
