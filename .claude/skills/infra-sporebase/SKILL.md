---
description: Monitor SporeBase v4 hardware devices, biological collection systems, sensor data, and device health at mycosoft.com/natureos/sporebase.
---

# SporeBase Monitor

## Identity
- **Category**: infra
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/sporebase
- **Key Components**: app/natureos/sporebase/page.tsx, components/natureos/sporebase-monitor.tsx, components/natureos/device-health-panel.tsx

## Success Criteria (Eval)
- [ ] SporeBase monitor dashboard renders with a device fleet list showing SporeBase v4 units
- [ ] Sensor data panel displays live readings (temperature, humidity, spore count, air quality) from at least one device
- [ ] Collection status indicators show active/idle/error states for biological collection systems
- [ ] Device health panel shows battery level, connectivity status, and last heartbeat timestamp

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with COMPANY-tier credentials (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Infrastructure" section
5. Click "SporeBase"
6. Wait for SporeBase monitor to load -- device fleet list and detail panels appear
7. Dashboard sections: Device Fleet List, Sensor Data, Collection Status, Device Health

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| SporeBase monitor title bar | Top of content area | Confirms SporeBase tool is loaded |
| Device fleet list (table or card grid) | Left side or top section | Lists all SporeBase v4 units with name, ID, status indicator |
| Status indicators (green/yellow/red dots) | Next to each device in fleet list | Green=active, yellow=idle, red=error |
| Sensor data panel | Center/right side when device selected | Shows live sensor readings in real-time |
| Temperature gauge | Within sensor data panel | Current temperature from device sensor |
| Humidity gauge | Within sensor data panel | Current relative humidity |
| Spore count display | Within sensor data panel | Spore particles detected per cubic meter |
| Air quality index | Within sensor data panel | AQI reading from device |
| Collection status section | Below or alongside sensor data | Biological collection system state (collecting/idle/error) |
| Device health panel | Bottom or right section | Battery %, signal strength, last heartbeat, uptime |
| Fleet map view toggle | Top-right area | Switches between list view and geographic map view |

## Core Actions
### Action 1: Review fleet status
**Goal:** Get an overview of all SporeBase v4 devices and their operational state
1. Wait for fleet list to load (device rows/cards appear with status indicators)
2. Scan the status indicators: count green (active), yellow (idle), red (error) devices
3. Sort or filter the list by status to surface problematic devices first
4. Note total active vs. expected fleet count

### Action 2: Inspect individual device sensor data
**Goal:** View live sensor readings from a specific SporeBase v4 unit
1. Click on a device in the fleet list to select it
2. The sensor data panel populates with that device's live readings
3. Review temperature, humidity, spore count, and air quality values
4. Check that readings are within expected ranges for the deployment location
5. Look at timestamp to confirm data is fresh (within last few minutes)

### Action 3: Monitor biological collection status
**Goal:** Verify collection systems are operating correctly
1. With a device selected, review the Collection Status section
2. Status should show "Collecting" during active sampling or "Idle" between cycles
3. If status shows "Error", note the error code and timestamp
4. Check collection cycle history to see completed vs. failed cycles
5. For errored devices, use device-mycobrain-setup skill for troubleshooting

### Action 4: Check device health
**Goal:** Ensure devices have adequate battery, connectivity, and uptime
1. Review the Device Health panel for the selected device
2. Battery level: below 20% indicates need for maintenance visit
3. Signal strength: weak signal may cause intermittent data gaps
4. Last heartbeat: should be within the last 5 minutes for active devices
5. Uptime: unexpected restarts may indicate firmware issues

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or 403 error | User lacks COMPANY-tier access | Verify COMPANY credentials |
| Fleet list is empty | No devices registered or API connection failed | Check device-registry for registered devices; refresh page |
| Sensor data shows "No Data" for selected device | Device is offline or sensor malfunction | Check device health panel for connectivity status |
| Collection status stuck on "Error" | Mechanical failure or calibration issue | Note error code; dispatch maintenance via device-fleet |
| All devices show "Idle" unexpectedly | Collection schedule may be paused globally | Check collection schedule configuration |
| Map view shows no device locations | GPS data not available or map tiles failed to load | Switch to list view; check device GPS configuration |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: device-mycobrain-setup (troubleshoot device issues), device-telemetry (detailed telemetry analysis), infra-monitoring (correlate with system alerts)

## Computer Use Notes
- COMPANY-tier access required -- will see 403 if not authorized
- Sensor data updates via WebSocket -- readings refresh automatically every few seconds
- Fleet list supports sorting by column header click and filtering by status dropdown
- Map view uses Leaflet/Mapbox -- device locations shown as colored pins
- Selecting a device in the fleet list highlights it on the map and vice versa
- Device health heartbeat timeout is 5 minutes -- device shown as offline after that

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
