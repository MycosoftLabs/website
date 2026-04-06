---
description: Navigate the Telemetry Dashboard at mycosoft.com for real-time MycoBrain sensor data — temperature, humidity, pressure, gas resistance charts with live WebSocket updates.
---

# Device Telemetry Dashboard

## Identity
- **Category**: devices
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation, device-registry
- **Route**: /natureos/devices/telemetry
- **Key Components**: Time-series charts, WebSocket data stream, sensor reading panels

## Success Criteria (Eval)
- [ ] Telemetry Dashboard loads at /natureos/devices/telemetry
- [ ] Temperature chart renders with real-time data points
- [ ] Humidity chart renders with real-time data points
- [ ] Pressure chart renders with real-time data points
- [ ] Gas resistance (VOC) chart renders with real-time data points
- [ ] WebSocket connection established — live data flowing
- [ ] Device selector allows switching between registered devices

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Navigate to NatureOS > Devices > Telemetry — or go directly to /natureos/devices/telemetry
3. Wait for charts to initialize and WebSocket connection to establish
4. Select a device from the device dropdown if multiple devices are registered

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Telemetry" heading | Top of main content | Confirms correct page |
| Device selector dropdown | Top-left or toolbar area | Select which device to view data for |
| Temperature chart | Upper-left quadrant or first chart | Line chart showing degrees C/F over time |
| Humidity chart | Upper-right quadrant or second chart | Line chart showing % relative humidity over time |
| Pressure chart | Lower-left quadrant or third chart | Line chart showing hPa over time |
| Gas Resistance chart | Lower-right quadrant or fourth chart | Line chart showing ohms/VOC index over time |
| Live indicator | Near header — pulsing dot or "LIVE" badge | Confirms WebSocket is active |
| Time range selector | Above or below charts | Adjust time window (1h, 6h, 24h, 7d) |

## Core Actions
### Action 1: View Real-Time Sensor Data
**Goal:** Monitor live environmental readings from a MycoBrain device
1. Navigate to /natureos/devices/telemetry
2. Select target device from the device dropdown
3. Observe the four charts: temperature, humidity, pressure, gas resistance
4. Verify the live indicator shows active WebSocket connection
5. Watch data points appear in real-time (every 1-2 seconds)

### Action 2: Change Time Range
**Goal:** View historical sensor data over different periods
1. Locate the time range selector
2. Click desired range: 1h, 6h, 24h, or 7d
3. Wait for charts to re-render with historical data
4. Scroll or zoom within charts for detail

### Action 3: Export Telemetry Data
**Goal:** Download sensor readings for analysis
1. Look for an export or download button near the charts
2. Select export format (CSV, JSON)
3. Choose time range for export
4. Download the file

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Charts show "No data" | No device selected or device offline | Select a device from dropdown; verify device is online in registry |
| Live indicator missing or grey | WebSocket connection failed | Refresh the page; check browser console for connection errors |
| Flat lines on charts | Sensor not reporting or stuck | Check device health in registry; power cycle the MycoBrain |
| Gas resistance readings erratic | BME688 sensor warming up or VOC spike | Wait 5-10 minutes for sensor stabilization; check environment |
| Access denied | Not COMPANY-tier authenticated | Re-login with COMPANY-level credentials |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation, device-registry
- **Next skills**: device-fleet, device-smell-training, defense-crep-dashboard

## Computer Use Notes
- Charts may take 2-3 seconds to render after page load
- The live indicator is typically a small green pulsing dot — look for it near the page header
- Gas resistance values can range widely (thousands to millions of ohms) — the chart auto-scales
- Hover over data points to see exact values and timestamps
- If charts appear blank, try selecting a different time range first

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
