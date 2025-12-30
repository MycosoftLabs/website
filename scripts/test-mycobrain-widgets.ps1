# Test Script for MycoBrain Widget Integration
# Tests all new NDJSON protocol widgets and API endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MycoBrain Widget Integration Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$mycobrainUrl = "http://localhost:8003"
$testPort = "ttyACM0"  # Change to your actual port (COM5, ttyACM0, etc.)

$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
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
        Write-Host " ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $null
    }
}

# Test 1: Service Health
Write-Host "`n[1] Service Health Checks" -ForegroundColor Yellow
Test-Endpoint "Website API" "$baseUrl/api/services/status"
Test-Endpoint "MycoBrain Service" "$mycobrainUrl/health"
Test-Endpoint "MINDEX Service" "http://localhost:8000/health"

# Test 2: Port Discovery
Write-Host "`n[2] Port Discovery" -ForegroundColor Yellow
$ports = Test-Endpoint "List Available Ports" "$baseUrl/api/mycobrain/ports"
if ($ports -and $ports.ports.Count -gt 0) {
    Write-Host "  Found $($ports.ports.Count) port(s)" -ForegroundColor Gray
    $testPort = $ports.ports[0].port -or $ports.ports[0].path -or "ttyACM0"
}

# Test 3: Machine Mode API
Write-Host "`n[3] Machine Mode Protocol" -ForegroundColor Yellow
$machineMode = Test-Endpoint "Initialize Machine Mode" "$baseUrl/api/mycobrain/$testPort/machine-mode" "POST"
if ($machineMode -and $machineMode.success) {
    Write-Host "  Machine mode initialized successfully" -ForegroundColor Gray
}

# Test 4: Peripheral Discovery
Write-Host "`n[4] Peripheral Discovery" -ForegroundColor Yellow
$peripherals = Test-Endpoint "Scan Peripherals" "$baseUrl/api/mycobrain/$testPort/peripherals"
if ($peripherals -and $peripherals.peripherals) {
    Write-Host "  Found $($peripherals.peripherals.Count) peripheral(s)" -ForegroundColor Gray
    foreach ($p in $peripherals.peripherals) {
        Write-Host "    - $($p.type) at $($p.address)" -ForegroundColor Gray
    }
}

# Test 5: LED Control API
Write-Host "`n[5] LED Control Widget" -ForegroundColor Yellow
$ledTest = Test-Endpoint "LED RGB Control" "$baseUrl/api/mycobrain/$testPort/led" "POST" @{
    action = "rgb"
    r = 255
    g = 0
    b = 0
}
$ledStatus = Test-Endpoint "LED Status" "$baseUrl/api/mycobrain/$testPort/led"

# Test 6: Buzzer Control API
Write-Host "`n[6] Buzzer Control Widget" -ForegroundColor Yellow
$buzzerTest = Test-Endpoint "Buzzer Preset" "$baseUrl/api/mycobrain/$testPort/buzzer" "POST" @{
    action = "preset"
    preset = "coin"
}

# Test 7: Telemetry API
Write-Host "`n[7] Telemetry Streaming" -ForegroundColor Yellow
$telemetry = Test-Endpoint "Get Telemetry" "$baseUrl/api/mycobrain/$testPort/telemetry?count=10"
if ($telemetry) {
    Write-Host "  History: $($telemetry.history.Count) entries" -ForegroundColor Gray
    Write-Host "  Current: $($telemetry.current.Count) entries" -ForegroundColor Gray
}

# Test 8: Communication API (LoRa)
Write-Host "`n[8] Communication Panel" -ForegroundColor Yellow
$loraTest = Test-Endpoint "LoRa Status" "$baseUrl/api/mycobrain/$testPort/control" "POST" @{
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
    Write-Host "✓ All tests passed! Widgets are ready to use." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Open http://localhost:3000/natureos/devices" -ForegroundColor White
    Write-Host "  2. Connect to your MycoBoard device" -ForegroundColor White
    Write-Host "  3. Click 'Initialize Machine Mode' in Diagnostics tab" -ForegroundColor White
    Write-Host "  4. Widgets will appear in Controls, Sensors, Communication, and Analytics tabs" -ForegroundColor White
} else {
    Write-Host "⚠ Some tests failed. Check service status and device connection." -ForegroundColor Yellow
}
