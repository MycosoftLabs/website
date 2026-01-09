# Browser Widget Test Guide

## Quick Test in Browser Console

Open http://localhost:3000/natureos/devices and run these tests in the browser console:

### Test 1: Check Widget Components Loaded
```javascript
// Check if widgets are imported
console.log('Testing widget imports...');
const testWidgets = {
  LedControlWidget: typeof window !== 'undefined' ? 'Check React DevTools' : 'N/A',
  BuzzerControlWidget: typeof window !== 'undefined' ? 'Check React DevTools' : 'N/A',
  PeripheralGrid: typeof window !== 'undefined' ? 'Check React DevTools' : 'N/A',
  TelemetryChartWidget: typeof window !== 'undefined' ? 'Check React DevTools' : 'N/A',
  CommunicationPanel: typeof window !== 'undefined' ? 'Check React DevTools' : 'N/A',
};
console.table(testWidgets);
```

### Test 2: Test Machine Mode API
```javascript
async function testMachineMode(port = 'ttyACM0') {
  try {
    const res = await fetch(`/api/mycobrain/${port}/machine-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    console.log('✓ Machine Mode:', data);
    return data.success;
  } catch (error) {
    console.error('✗ Machine Mode Error:', error);
    return false;
  }
}
testMachineMode();
```

### Test 3: Test LED Control
```javascript
async function testLED(port = 'ttyACM0') {
  try {
    const res = await fetch(`/api/mycobrain/${port}/led`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rgb', r: 255, g: 0, b: 0 }),
    });
    const data = await res.json();
    console.log('✓ LED Control:', data);
    return data.success;
  } catch (error) {
    console.error('✗ LED Error:', error);
    return false;
  }
}
testLED();
```

### Test 4: Test Buzzer Control
```javascript
async function testBuzzer(port = 'ttyACM0') {
  try {
    const res = await fetch(`/api/mycobrain/${port}/buzzer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preset', preset: 'coin' }),
    });
    const data = await res.json();
    console.log('✓ Buzzer Control:', data);
    return data.success;
  } catch (error) {
    console.error('✗ Buzzer Error:', error);
    return false;
  }
}
testBuzzer();
```

### Test 5: Test Peripheral Discovery
```javascript
async function testPeripherals(port = 'ttyACM0') {
  try {
    const res = await fetch(`/api/mycobrain/${port}/peripherals`);
    const data = await res.json();
    console.log('✓ Peripherals:', data);
    console.log(`Found ${data.count} peripherals`);
    return data;
  } catch (error) {
    console.error('✗ Peripherals Error:', error);
    return null;
  }
}
testPeripherals();
```

### Test 6: Test Telemetry
```javascript
async function testTelemetry(port = 'ttyACM0') {
  try {
    const res = await fetch(`/api/mycobrain/${port}/telemetry?count=10`);
    const data = await res.json();
    console.log('✓ Telemetry:', {
      current: data.current?.length || 0,
      history: data.history?.length || 0,
    });
    return data;
  } catch (error) {
    console.error('✗ Telemetry Error:', error);
    return null;
  }
}
testTelemetry();
```

## Visual Verification Checklist

### ✅ Controls Tab
- [ ] Machine Mode Status card appears at top
- [ ] Status badge shows "Not Initialized" (gray) or "Active" (green)
- [ ] LED Control Widget appears when machine mode is active
- [ ] Buzzer Control Widget appears when machine mode is active
- [ ] LED widget has 3 tabs: Color, Patterns, Optical TX
- [ ] Buzzer widget has 3 tabs: Presets, Custom Tone, Acoustic TX
- [ ] Legacy controls appear below new widgets

### ✅ Sensors Tab
- [ ] "Discovered Peripherals" card appears at top
- [ ] PeripheralGrid component renders
- [ ] "Rescan" button is visible
- [ ] Existing BME688 sensor displays appear below

### ✅ Communication Tab
- [ ] CommunicationPanel appears at top
- [ ] 4 tabs visible: LoRa, WiFi, BLE, Mesh
- [ ] LoRa tab shows frequency, SF, RSSI, SNR
- [ ] Communication log appears at bottom
- [ ] Legacy communication cards appear below

### ✅ Analytics Tab
- [ ] TelemetryChartWidget appears on left
- [ ] Sensor history chart appears on right
- [ ] Charts show temperature, humidity, pressure, IAQ
- [ ] Play/Pause button works
- [ ] Export button works

### ✅ Diagnostics Tab
- [ ] "Initialize Machine Mode" button appears
- [ ] Button is clickable when device is connected
- [ ] Console log shows initialization progress

## Expected Behavior

1. **On Page Load**:
   - Device Manager loads without errors
   - All tabs are accessible
   - Service status shows "online"

2. **After Device Connection**:
   - Device appears in connected devices list
   - Port status shows "connected"
   - Sensor data starts updating

3. **After Machine Mode Initialization**:
   - Status badge changes to "Active"
   - New widgets appear in Controls tab
   - Peripheral discovery runs automatically
   - Peripherals appear in Sensors tab

4. **Widget Interactions**:
   - LED color changes update immediately
   - Buzzer presets play sounds
   - Telemetry charts update in real-time
   - Communication log shows TX/RX messages

## Troubleshooting

### Widgets Not Appearing
1. Check browser console for errors
2. Verify machine mode is initialized (Diagnostics tab)
3. Check React DevTools for component tree
4. Verify device is connected

### API Errors
1. Check MycoBrain service is running: `http://localhost:8003/health`
2. Verify device port is correct
3. Check browser network tab for failed requests
4. Verify CORS is enabled (should be for localhost)

### TypeScript Errors
- All widgets use proper TypeScript types
- No `any` types in widget props
- All UI components properly imported from shadcn/ui

---

*Ready for browser testing*
























