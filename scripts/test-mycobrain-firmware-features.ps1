# Comprehensive Test Script for MycoBrain New Firmware Features
# Tests: Optical/Acoustic Modems, Science Features, Communication

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MycoBrain Firmware Features Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$mycobrainUrl = "http://localhost:8003"
$testPort = "ttyACM0"  # Change to your actual port

$testsPassed = 0
$testsFailed = 0

function Test-Feature {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [scriptblock]$Validator = $null
    )
    
    Write-Host "[TEST] $Name..." -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 10
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        
        if ($Validator) {
            $valid = & $Validator $response
            if (-not $valid) {
                throw "Validation failed"
            }
        }
        
        Write-Host " ✓ PASSED" -ForegroundColor Green
        $script:testsPassed++
        return $response
    } catch {
        Write-Host " ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $null
    }
}

# Test 1: Service Health
Write-Host "`n[1] Service Health" -ForegroundColor Yellow
Test-Feature "Website API" "$baseUrl/api/services/status"
Test-Feature "MycoBrain Service" "$mycobrainUrl/health"
Test-Feature "MINDEX Service" "http://localhost:8000/health"

# Test 2: Machine Mode Initialization
Write-Host "`n[2] Machine Mode Protocol" -ForegroundColor Yellow
$machineMode = Test-Feature "Initialize Machine Mode" "$baseUrl/api/mycobrain/$testPort/machine-mode" "POST"
if ($machineMode -and $machineMode.success) {
    Write-Host "  ✓ Machine mode active" -ForegroundColor Gray
}

# Test 3: LED Control - Basic RGB
Write-Host "`n[3] LED Control - Basic Features" -ForegroundColor Yellow
Test-Feature "LED RGB Control" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "rgb"
    r = 255
    g = 0
    b = 0
}
Test-Feature "LED Pattern" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "pattern"
    pattern = "rainbow"
}

# Test 4: LED Control - Optical Modem TX (NEW FIRMWARE FEATURE)
Write-Host "`n[4] LED Optical Modem TX (New Firmware)" -ForegroundColor Yellow
$opticalProfiles = @("camera_ook", "camera_manchester", "spatial_sm")
foreach ($profile in $opticalProfiles) {
    Test-Feature "Optical TX: $profile" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
        action = "optical_tx"
        profile = $profile
        payload = "Hello MycoBrain"
        rate_hz = 10
        repeat = 1
    }
}

# Test 5: Buzzer Control - Basic Presets
Write-Host "`n[5] Buzzer Control - Basic Features" -ForegroundColor Yellow
$presets = @("coin", "bump", "power", "1up", "morgio")
foreach ($preset in $presets) {
    Test-Feature "Buzzer Preset: $preset" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
        action = "preset"
        preset = $preset
    }
    Start-Sleep -Milliseconds 200
}

# Test 6: Buzzer Control - Custom Tone
Write-Host "`n[6] Buzzer Custom Tone" -ForegroundColor Yellow
Test-Feature "Custom Tone (1000Hz, 200ms)" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
    action = "tone"
    hz = 1000
    ms = 200
}

# Test 7: Buzzer Control - Acoustic Modem TX (NEW FIRMWARE FEATURE)
Write-Host "`n[7] Buzzer Acoustic Modem TX (New Firmware)" -ForegroundColor Yellow
$acousticProfiles = @("simple_fsk", "ggwave_like", "dtmf")
foreach ($profile in $acousticProfiles) {
    Test-Feature "Acoustic TX: $profile" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
        action = "acoustic_tx"
        profile = $profile
        payload = "Test Message"
        symbol_ms = 100
        f0 = 1000
        f1 = 2000
        repeat = 1
    }
    Start-Sleep -Milliseconds 300
}

# Test 8: Telemetry & Sensor Data
Write-Host "`n[8] Telemetry & Science Data" -ForegroundColor Yellow
$telemetry = Test-Feature "Get Telemetry" "$baseUrl/api/mycobrain/$testPort/telemetry?count=10"
if ($telemetry) {
    Write-Host "  Current: $($telemetry.current.Count) entries" -ForegroundColor Gray
    Write-Host "  History: $($telemetry.history.Count) entries" -ForegroundColor Gray
    if ($telemetry.current.Count -gt 0) {
        $sample = $telemetry.current[0]
        Write-Host "  Sample data: temp=$($sample.temperature), humidity=$($sample.humidity)" -ForegroundColor Gray
    }
}

# Test 9: Peripheral Discovery
Write-Host "`n[9] Peripheral Discovery" -ForegroundColor Yellow
$peripherals = Test-Feature "Scan Peripherals" "$baseUrl/api/mycobrain/$testPort/peripherals" "POST"
if ($peripherals -and $peripherals.peripherals) {
    Write-Host "  Found $($peripherals.peripherals.Count) peripheral(s)" -ForegroundColor Gray
    foreach ($p in $peripherals.peripherals) {
        Write-Host "    - $($p.type) at 0x$($p.address.ToString('X'))" -ForegroundColor Gray
    }
}

# Test 10: Communication Features
Write-Host "`n[10] Communication Features" -ForegroundColor Yellow
Test-Feature "LoRa Status" "$baseUrl/api/mycobrain/$testPort/control" "POST" @{
    peripheral = "lora"
    action = "status"
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passed: $testsPassed" -ForegroundColor Green
Write-Host "  Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "  Total:  $($testsPassed + $testsFailed)" -ForegroundColor Cyan
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✓ All firmware features tested successfully!" -ForegroundColor Green
    Write-Host "`nNew Firmware Features Verified:" -ForegroundColor Yellow
    Write-Host "  ✓ Optical Modem TX (3 profiles)" -ForegroundColor White
    Write-Host "  ✓ Acoustic Modem TX (3 profiles)" -ForegroundColor White
    Write-Host "  ✓ Enhanced LED control" -ForegroundColor White
    Write-Host "  ✓ Enhanced Buzzer control" -ForegroundColor White
    Write-Host "  ✓ Telemetry streaming" -ForegroundColor White
    Write-Host "  ✓ Peripheral discovery" -ForegroundColor White
} else {
    Write-Host "⚠ Some tests failed. Check device connection and firmware version." -ForegroundColor Yellow
}

Write-Host "`nNext: Test in browser at http://localhost:3000/natureos/devices" -ForegroundColor Cyan
























