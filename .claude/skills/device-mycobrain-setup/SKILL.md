---
description: Navigate and configure MycoBrain hardware devices (ESP32-S3 + BME688 sensor) via mycosoft.com Computer Use — USB serial detection, optical/acoustic modem TX, 22 REST API endpoints, real-time WebSocket updates.
---

# MycoBrain Setup

## Identity
- **Category**: devices
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation
- **Route**: /natureos/mycobrain
- **Key Components**: services/mycobrain/README.md, services/mycobrain/, FastAPI service on port 8765

## Success Criteria (Eval)
- [ ] MycoBrain page loads with device status panel visible
- [ ] USB serial auto-detection triggers and shows connected device
- [ ] Environmental sensor readings (temperature, humidity, pressure, gas resistance/VOC) display in real-time
- [ ] Optical Modem TX controls (NeoPixel LEDs) are accessible — Camera OOK, Camera Manchester, Spatial modulation modes
- [ ] Acoustic Modem TX controls (Buzzer) are accessible — FSK, GGWave-like protocol, DTMF encoding modes
- [ ] REST API endpoints respond on port 8765
- [ ] WebSocket real-time updates stream sensor data

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Open the sidebar or navigate to NatureOS
3. Click "MycoBrain" in the device section or go directly to /natureos/mycobrain
4. Wait for the page to fully load — device connection panel appears
5. If a MycoBrain device is connected via USB, auto-detection populates the device info

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| MycoBrain header/title | Top of main content area | Confirms correct page loaded |
| Device Connection Status | Upper section — shows "Connected"/"Disconnected" | Verify USB serial auto-detection |
| Sensor Readings Panel | Center — temperature, humidity, pressure, gas resistance | Read live BME688 data |
| Optical Modem TX Controls | Mid-section — NeoPixel LED settings | Select modulation mode: Camera OOK, Camera Manchester, Spatial |
| Acoustic Modem TX Controls | Below optical — Buzzer settings | Select encoding: FSK, GGWave, DTMF |
| API Status Indicator | Footer or sidebar — port 8765 status | Verify FastAPI service is running |
| WebSocket Feed | Real-time data stream area | Confirm live updates are flowing |

## Core Actions
### Action 1: Verify Device Connection
**Goal:** Confirm MycoBrain hardware is detected via USB serial
1. Navigate to /natureos/mycobrain
2. Look for the device connection panel showing ESP32-S3 info
3. Verify BME688 sensor readings are populating (temperature, humidity, pressure, gas resistance)
4. Check MDP v1 (Mycosoft Device Protocol) handshake status

### Action 2: Configure Optical Modem TX
**Goal:** Set up NeoPixel LED transmission mode
1. Locate the Optical Modem TX section
2. Select modulation mode: Camera OOK, Camera Manchester, or Spatial
3. Configure transmission parameters
4. Test transmission via the test button

### Action 3: Configure Acoustic Modem TX
**Goal:** Set up buzzer-based data transmission
1. Locate the Acoustic Modem TX section
2. Select encoding: FSK, GGWave-like protocol, or DTMF
3. Configure frequency and timing parameters
4. Test transmission

### Action 4: Query REST API
**Goal:** Interact with the 22 FastAPI endpoints on port 8765
1. Use the API panel or navigate to the endpoint documentation
2. Select an endpoint from the 22 available routes
3. Configure parameters and send request
4. Verify response in the output panel

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "No device detected" | USB serial not connected or driver missing | Check physical USB connection; verify ESP32-S3 drivers installed |
| Sensor readings show "N/A" or zeros | BME688 sensor not initialized | Power cycle the device; check MDP v1 handshake |
| "Service unavailable" on API calls | FastAPI service not running on port 8765 | Restart the mycobrain service; check logs |
| WebSocket disconnects repeatedly | Network instability or service crash | Check server logs; verify WebSocket endpoint health |
| Access denied page | Not logged in with COMPANY-tier account | Re-authenticate with COMPANY-level credentials |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation
- **Next skills**: device-registry, device-telemetry, device-fleet, device-smell-training

## Computer Use Notes
- The USB auto-detection may take 2-3 seconds after page load — wait for the connection status indicator before interacting
- NeoPixel LED preview may render as a colored strip on screen — look for the visual indicator
- Sensor readings update via WebSocket — values change every 1-2 seconds
- The 22 REST API endpoints are documented inline; scroll down to see the full list
- Port 8765 must be accessible from the browser for API testing

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
