# Test Device Registration Script
# Tests MycoBrain device registration via Device Manager API

param(
    [string]$Port = "COM5",
    [string]$DeviceId = "mycobrain-test-001",
    [string]$FirmwareVersion = "1.0.0"
)

$ErrorActionPreference = "Continue"

Write-Host "`n=== Device Registration Test ===" -ForegroundColor Cyan
Write-Host ""

$RegistrationUrl = "http://localhost:3000/api/mycobrain/$Port/register"

$RegistrationData = @{
    device_id = $DeviceId
    port = $Port
    serial_number = "TEST-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    firmware_version = $FirmwareVersion
    location = @{
        latitude = 0.0
        longitude = 0.0
        name = "Test Location"
    }
    metadata = @{
        test = $true
        timestamp = (Get-Date).ToISOString()
    }
} | ConvertTo-Json -Depth 10

Write-Host "Testing device registration..." -ForegroundColor Yellow
Write-Host "  Port: $Port" -ForegroundColor Gray
Write-Host "  Device ID: $DeviceId" -ForegroundColor Gray
Write-Host "  URL: $RegistrationUrl" -ForegroundColor Gray
Write-Host ""

try {
    $Response = Invoke-RestMethod -Uri $RegistrationUrl `
        -Method Post `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $RegistrationData `
        -TimeoutSec 15 `
        -ErrorAction Stop
    
    Write-Host "✓ Registration successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Registration Results:" -ForegroundColor Cyan
    $Response | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($Response.registrations) {
        Write-Host ""
        Write-Host "Service Registration Status:" -ForegroundColor Yellow
        foreach ($service in $Response.registrations.PSObject.Properties) {
            $status = if ($service.Value.error) { "❌ Failed" } else { "✅ Success" }
            Write-Host "  $($service.Name): $status" -ForegroundColor $(if ($service.Value.error) { "Red" } else { "Green" })
            if ($service.Value.error) {
                Write-Host "    Error: $($service.Value.error)" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Host "✗ Registration failed!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $Reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $ResponseBody = $Reader.ReadToEnd()
        Write-Host "  Response: $ResponseBody" -ForegroundColor Red
    }
}

Write-Host ""
