---
description: End-to-end device onboarding workflow composing MycoBrain setup, device registry, and telemetry dashboard for new hardware provisioning.
---

# Device Onboarding Workflow

## Identity
- **Category**: workflows
- **Access Tier**: AUTHENTICATED
- **Depends On**: device-mycobrain-setup, device-registry, device-telemetry
- **Route**: Multiple routes (workflow spans several tools)
- **Key Components**: Composed from device-mycobrain-setup, device-registry, device-telemetry components

## Success Criteria (Eval)
- [ ] MycoBrain device is detected via USB connection and auto-detection triggers
- [ ] Device is registered in the Device Registry with unique ID and metadata
- [ ] Sensor parameters are configured and validated
- [ ] Telemetry data appears in the Telemetry Dashboard within expected timeframe
- [ ] Device is visible on the fleet map at its deployed location

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (see platform-authentication skill)
2. Connect MycoBrain device via USB to the host machine
3. Navigate to NatureOS > Devices > MycoBrain Setup
4. Follow auto-detection prompts
5. Register device in Device Registry
6. Configure sensor parameters
7. Verify telemetry in Telemetry Dashboard
8. Confirm device on fleet map

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| MycoBrain Setup page | Main content area | Starting point for device onboarding |
| USB detection notification/banner | Top of MycoBrain Setup page | Confirms device is physically connected |
| Device info panel (model, firmware, serial) | MycoBrain Setup content | Verify detected device details |
| "Register Device" button | MycoBrain Setup page | Click to proceed to Device Registry |
| Device Registry form | Main content area | Fill in metadata fields (name, location, purpose) |
| Device ID (auto-generated) | Registry form, read-only field | Unique identifier assigned to the device |
| Sensor configuration panel | After registration, or separate tab | Set parameters for each sensor (interval, thresholds) |
| Sensor list with toggle/config controls | Sensor config panel | Enable/disable sensors, set sampling rates |
| "Save Configuration" button | Bottom of sensor config | Save sensor settings to the device |
| Telemetry Dashboard link | After config saved, or sidebar nav | Navigate to verify telemetry data |
| Live telemetry charts | Telemetry Dashboard | Shows real-time sensor data streams |
| Fleet map | Device Fleet or Telemetry Dashboard | Shows device location on geographic map |
| Device status indicator (online/offline) | Fleet map or device list | Confirms device is communicating |

## Core Actions
### Action 1: Connect and detect MycoBrain device
**Goal:** Physically connect the device and verify auto-detection
1. Connect MycoBrain device to the host machine via USB
2. Navigate to NatureOS > Devices > MycoBrain Setup
3. Wait for the auto-detection notification (usually appears within 5-10 seconds)
4. Review detected device info: model, firmware version, serial number
5. Verify the information matches the physical device

### Action 2: Register device in Device Registry
**Goal:** Create a persistent registry entry for the new device
1. Click "Register Device" on the MycoBrain Setup page
2. The Device Registry form opens with some fields pre-populated from detection
3. Fill in required metadata: device name, deployment location, intended purpose
4. Optionally add tags for fleet grouping
5. Review the auto-generated Device ID
6. Click "Register" to save -- confirmation message appears

### Action 3: Configure sensor parameters
**Goal:** Set up sensor sampling rates, thresholds, and alerts
1. After registration, the sensor configuration panel opens (or navigate to it)
2. A list of detected sensors appears (temperature, humidity, spore count, etc.)
3. For each sensor: set sampling interval (e.g., every 30 seconds, every 5 minutes)
4. Set alert thresholds (e.g., temperature > 40C triggers warning)
5. Enable or disable individual sensors as needed
6. Click "Save Configuration" -- settings are pushed to the device

### Action 4: Verify telemetry appears
**Goal:** Confirm the device is successfully sending telemetry data
1. Navigate to the Telemetry Dashboard (sidebar > Devices > Telemetry)
2. Search for or select the newly registered device
3. Live telemetry charts should show data points arriving at the configured interval
4. Verify all enabled sensors are reporting (check each chart/metric)
5. Wait for at least 2-3 data points to confirm consistent data flow

### Action 5: Add device to fleet map
**Goal:** Confirm the device appears on the geographic fleet map
1. Navigate to the Fleet Map (sidebar > Devices > Fleet or within Telemetry Dashboard)
2. Look for the new device pin at its configured deployment location
3. Click the pin to verify device name, status (should show "Online"), and latest readings
4. If the device does not appear, check that location coordinates were set during registration

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| No USB detection notification | Device not powered, cable issue, or driver missing | Check USB cable and power; try a different USB port |
| Detection shows wrong firmware version | Device has outdated firmware | Update firmware via MycoBrain Setup before proceeding |
| Registration fails with duplicate error | Device serial number already registered | Check Device Registry for existing entry; update rather than re-register |
| Sensor config shows no sensors detected | Sensor board not connected or firmware issue | Verify sensor board connection on the physical device |
| Telemetry Dashboard shows no data | Device not transmitting or network issue | Check device status indicator; verify network/WiFi configuration |
| Device not on fleet map | Location not set during registration | Edit device in Device Registry to add GPS coordinates |

## Composability
- **Prerequisite skills**: platform-authentication, device-mycobrain-setup, device-registry
- **Next skills**: device-telemetry (ongoing monitoring), device-fleet (fleet management), infra-sporebase (if SporeBase v4 device)

## Computer Use Notes
- USB connection is physical -- Computer Use cannot plug in cables but can interact with the UI after connection
- Auto-detection uses WebUSB or serial API -- browser may prompt for device access permission
- Device registration is a one-time operation per device; subsequent visits show device status
- Sensor configuration is pushed to the device over USB -- keep device connected until save completes
- Telemetry data may take 30-60 seconds to appear after configuration, depending on sampling interval
- Fleet map requires location coordinates -- indoor devices may need manual coordinate entry

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
