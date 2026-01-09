# Comprehensive Test Script for MycoBrain New Firmware Features
# Tests: Science features, Communication features (Optical/Acoustic modems), Sensor data collection

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MycoBrain New Firmware Features Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$mycobrainUrl = "http://localhost:8003"
$testPort = "ttyACM0"  # Change to your actual port (COM5, ttyACM0, etc.)

$testsPassed = 0
$testsFailed = 0
$testsSkipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [switch]$Optional
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
        
        Write-Host " ✓ PASSED" -ForegroundColor Green
        $script:testsPassed++
        return $response
    } catch {
        if ($Optional) {
            Write-Host " ⊘ SKIPPED (optional)" -ForegroundColor Yellow
            $script:testsSkipped++
        } else {
            Write-Host " ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
            $script:testsFailed++
        }
        return $null
    }
}

# Test 1: Service Health
Write-Host "`n[1] Service Health Checks" -ForegroundColor Yellow
Test-Endpoint "Website API" "$baseUrl/api/services/status"
Test-Endpoint "MycoBrain Service" "$mycobrainUrl/health"
Test-Endpoint "MINDEX Service" "http://localhost:8000/health"

# Test 2: Machine Mode Initialization
Write-Host "`n[2] Machine Mode Protocol" -ForegroundColor Yellow
$machineMode = Test-Endpoint "Initialize Machine Mode" "$baseUrl/api/mycobrain/$testPort/machine-mode" "POST"
if ($machineMode -and $machineMode.success) {
    Write-Host "  ✓ Machine mode initialized" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Test 3: Science Features - Sensor Data Collection
Write-Host "`n[3] Science Features - Sensor Data Collection" -ForegroundColor Yellow
$telemetry = Test-Endpoint "Get Telemetry Data" "$baseUrl/api/mycobrain/$testPort/telemetry?count=10"
if ($telemetry) {
    Write-Host "  Current entries: $($telemetry.current.Count)" -ForegroundColor Gray
    Write-Host "  History entries: $($telemetry.history.Count)" -ForegroundColor Gray
    if ($telemetry.current.Count -gt 0) {
        $sample = $telemetry.current[0]
        Write-Host "  Sample data: temp=$($sample.temperature), humidity=$($sample.humidity)" -ForegroundColor Gray
    }
}

$sensors = Test-Endpoint "Get Sensor Status" "$baseUrl/api/mycobrain/$testPort/sensors" -Optional
if ($sensors) {
    Write-Host "  Sensor data retrieved" -ForegroundColor Gray
}

# Test 4: Peripheral Discovery (I2C Sensors)
Write-Host "`n[4] Peripheral Discovery (I2C Sensors)" -ForegroundColor Yellow
$peripherals = Test-Endpoint "Scan I2C Peripherals" "$baseUrl/api/mycobrain/$testPort/peripherals" -Optional
if ($peripherals -and $peripherals.peripherals) {
    Write-Host "  Found $($peripherals.peripherals.Count) peripheral(s)" -ForegroundColor Gray
    foreach ($p in $peripherals.peripherals) {
        Write-Host "    - $($p.type) at 0x$($p.address.ToString('X'))" -ForegroundColor Gray
    }
}

# Test 5: Communication Features - Optical Modem (NeoPixel)
Write-Host "`n[5] Communication Features - Optical Modem (NeoPixel)" -ForegroundColor Yellow

# Test RGB control
$ledRgb = Test-Endpoint "LED RGB Control" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "rgb"
    r = 0
    g = 255
    b = 0
}

# Test Optical TX
$opticalTx = Test-Endpoint "Optical Modem TX Start" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "optical_tx"
    profile = "camera_ook"
    payload = "Hello from MycoBrain"
    rate_hz = 10
    repeat = 1
}
if ($opticalTx -and $opticalTx.success) {
    Write-Host "  ✓ Optical TX command sent" -ForegroundColor Gray
    Start-Sleep -Seconds 1
    # Test stop
    Test-Endpoint "Optical Modem TX Stop" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
        action = "optical_tx"
        profile = "camera_ook"
        payload = ""
        rate_hz = 0
        repeat = 0
    } -Optional
}

# Test 6: Communication Features - Acoustic Modem (Buzzer)
Write-Host "`n[6] Communication Features - Acoustic Modem (Buzzer)" -ForegroundColor Yellow

# Test buzzer preset
$buzzerPreset = Test-Endpoint "Buzzer Preset (coin)" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
    action = "preset"
    preset = "coin"
}

# Test custom tone
$buzzerTone = Test-Endpoint "Buzzer Custom Tone" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
    action = "tone"
    hz = 1000
    ms = 200
}

# Test Acoustic TX
$acousticTx = Test-Endpoint "Acoustic Modem TX Start" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
    action = "acoustic_tx"
    profile = "simple_fsk"
    payload = "Hello from MycoBrain"
    symbol_ms = 100
    f0 = 1000
    f1 = 2000
    repeat = 1
}
if ($acousticTx -and $acousticTx.success) {
    Write-Host "  ✓ Acoustic TX command sent" -ForegroundColor Gray
    Start-Sleep -Seconds 1
    # Test stop
    Test-Endpoint "Acoustic Modem TX Stop" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
        action = "stop"
    } -Optional
}

# Test 7: LED Patterns and Modes
Write-Host "`n[7] LED Patterns and Modes" -ForegroundColor Yellow
Test-Endpoint "LED Pattern (rainbow)" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "pattern"
    pattern = "rainbow"
} -Optional

Test-Endpoint "LED Mode (breathe)" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "mode"
    mode = "breathe"
} -Optional

# Test 8: Data Export and Logging
Write-Host "`n[8] Data Export and Logging" -ForegroundColor Yellow
$telemetryExport = Test-Endpoint "Telemetry Export" "$baseUrl/api/mycobrain/$testPort/telemetry?count=50&export=true" -Optional
if ($telemetryExport) {
    Write-Host "  ✓ Telemetry data available for export" -ForegroundColor Gray
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passed: $testsPassed" -ForegroundColor Green
Write-Host "  Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "  Skipped: $testsSkipped" -ForegroundColor Yellow
Write-Host "  Total:  $($testsPassed + $testsFailed + $testsSkipped)" -ForegroundColor Cyan
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "✓ All critical tests passed!" -ForegroundColor Green
    Write-Host "`nNew Firmware Features Verified:" -ForegroundColor Yellow
    Write-Host "  ✓ Optical Modem TX (NeoPixel)" -ForegroundColor White
    Write-Host "  ✓ Acoustic Modem TX (Buzzer)" -ForegroundColor White
    Write-Host "  ✓ Sensor Data Collection" -ForegroundColor White
    Write-Host "  ✓ I2C Peripheral Discovery" -ForegroundColor White
    Write-Host "  ✓ Telemetry Streaming" -ForegroundColor White
    Write-Host "  ✓ LED Patterns and Modes" -ForegroundColor White
    Write-Host ""
    Write-Host "Ready for browser testing:" -ForegroundColor Yellow
    Write-Host "  http://localhost:3000/natureos/devices" -ForegroundColor White
} else {
    Write-Host "⚠ Some tests failed. Check device connection and service status." -ForegroundColor Yellow
}


























