---
description: Manage satellite operations, geospatial data collection, command and control interface, satellite tracking, and data downlink at mycosoft.com/natureos/ground-station.
---

# Ground Station

## Identity
- **Category**: infra
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/ground-station
- **Key Components**: app/natureos/ground-station/page.tsx, components/natureos/ground-station-dashboard.tsx, components/natureos/satellite-tracker.tsx, components/natureos/downlink-manager.tsx

## Success Criteria (Eval)
- [ ] Ground station dashboard renders with satellite tracking view showing orbital paths
- [ ] Pass prediction table displays upcoming satellite passes with time, elevation, and azimuth
- [ ] Command and control interface is accessible for authorized operators
- [ ] Data downlink management panel shows recent and scheduled downlink sessions with status

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with COMPANY-tier credentials (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Infrastructure" section
5. Click "Ground Station"
6. Wait for ground station dashboard to load -- satellite tracking view and control panels appear
7. Dashboard sections: Satellite Tracker, Pass Predictions, Command & Control, Data Downlink

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Ground station dashboard title bar | Top of content area | Confirms ground station tool is loaded |
| Satellite tracking view (2D/3D orbital map) | Center, large area | Shows satellite positions and orbital paths in real-time |
| Satellite icons on orbital paths | On the tracking map | Click a satellite to select and view details |
| Pass prediction table | Below or beside tracking view | Lists upcoming passes sorted by time |
| Elevation/azimuth columns in pass table | Within pass prediction table | Shows max elevation and azimuth for each pass |
| Command & control panel | Dedicated tab or section | Send commands to satellites (authorized operators only) |
| Command input field | Within C&C panel | Type satellite commands |
| Send command button | Next to command input | Execute the entered command |
| Data downlink manager | Bottom section or tab | Lists recent/scheduled downlink sessions |
| Downlink status indicators | In downlink manager rows | Green=complete, yellow=in-progress, red=failed |
| Ground station status indicator | Top-right area | Shows antenna pointing status and station health |

## Core Actions
### Action 1: Track satellite positions
**Goal:** View real-time satellite positions and orbital paths
1. Wait for the satellite tracking view to load (orbital paths visible on map)
2. Satellites appear as icons moving along their orbital tracks
3. Click on a satellite to select it -- details panel shows orbit parameters, altitude, velocity
4. Use zoom controls to focus on a specific region or view the full globe
5. Selected satellite's ground track highlights on the map

### Action 2: Review pass predictions
**Goal:** See when satellites will be overhead for data collection
1. Navigate to the Pass Predictions section
2. The table lists upcoming passes sorted by ascending time
3. Key columns: satellite name, pass start time, max elevation, duration, azimuth
4. Higher elevation passes (>45 degrees) provide better data collection windows
5. Click on a pass to see detailed trajectory and schedule a downlink session

### Action 3: Execute satellite commands
**Goal:** Send commands to a satellite during a pass window
1. Navigate to the Command & Control panel
2. Select the target satellite from the dropdown
3. Verify the satellite is currently in a pass window (status shows "In View")
4. Enter the command in the command input field
5. Click "Send Command" -- confirmation dialog appears
6. Confirm execution -- command status updates to "Sent", then "Acknowledged" when satellite responds

### Action 4: Manage data downlinks
**Goal:** Monitor and schedule data download sessions from satellites
1. Navigate to the Data Downlink section
2. Review recent downlink sessions: status, data volume, duration, quality metrics
3. To schedule a new downlink, click "Schedule Downlink" button
4. Select satellite, preferred pass window, and data priority
5. Confirm scheduling -- session appears in the upcoming downlinks list
6. Monitor active downlinks: progress bar shows data received vs. expected

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or 403 error | User lacks COMPANY-tier access | Verify COMPANY credentials |
| Tracking view shows no satellites | Orbital data (TLE) not updated or API down | Refresh page; check if TLE data feed is current |
| Pass prediction table is empty | No passes within the selected time window | Extend the time window using the date range selector |
| Command sent but no acknowledgment | Satellite out of range or communication issue | Wait for next pass; check antenna status indicator |
| Downlink session shows "Failed" | Signal loss, interference, or ground station hardware issue | Check ground station status indicator; retry during next pass |
| Antenna status shows "Offline" | Ground station hardware malfunction | Contact ground station operations team |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: infra-monitoring (correlate satellite data with system health), lab-earth-simulator (visualize geospatial data collected from satellites)

## Computer Use Notes
- COMPANY-tier access required -- will see 403 if not authorized
- Satellite positions update in real-time via WebSocket connection
- Pass predictions are calculated using TLE (Two-Line Element) orbital data
- Command & Control operations are logged and audited -- all commands are recorded
- Downlink sessions require ground station antenna to be operational and pointed correctly
- Time displays use UTC by default -- check timezone selector if local time is needed
- The tracking view uses either CesiumJS or a 2D Mercator projection depending on configuration

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
