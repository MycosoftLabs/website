---
description: Navigate Device Fleet Management at mycosoft.com — fleet overview, geospatial device map, alert center, and analytics insights across all deployed MycoBrain devices.
---

# Device Fleet Management

## Identity
- **Category**: devices
- **Access Tier**: COMPANY-only
- **Depends On**: platform-authentication, platform-navigation, device-registry
- **Routes**:
  - /natureos/devices/fleet — Fleet overview
  - /natureos/devices/map — Geospatial device map
  - /natureos/devices/alerts — Alert center
  - /natureos/devices/insights — Analytics
- **Key Components**: Fleet table, map view, alert list, analytics charts

## Success Criteria (Eval)
- [ ] Fleet overview page loads with all deployed devices listed
- [ ] Geospatial map renders with device markers at correct locations
- [ ] Alert center shows active alerts with severity levels
- [ ] Analytics/insights page shows fleet-wide metrics and trends
- [ ] Navigation between the four sub-pages works correctly

## Navigation Path (Computer Use)
1. Log in with COMPANY-tier credentials
2. Navigate to NatureOS > Devices > Fleet — or go directly to /natureos/devices/fleet
3. Use the sub-navigation tabs to switch between Fleet, Map, Alerts, and Insights views

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Fleet Overview tab | Top tabs or sub-navigation | Click for device fleet table |
| Map tab | Top tabs or sub-navigation | Click for geospatial view |
| Alerts tab | Top tabs or sub-navigation | Click for alert center |
| Insights tab | Top tabs or sub-navigation | Click for analytics |
| Device fleet table | Center of Fleet view — rows per device | Review status, location, health |
| Map with device markers | Full-width on Map view | Click markers for device info popups |
| Alert list | Center of Alerts view — sorted by severity | Review and acknowledge alerts |
| Analytics charts | Center of Insights view | Review fleet-wide trends |
| Device count summary | Top of Fleet view — total/online/offline counts | Quick fleet health check |

## Core Actions
### Action 1: Review Fleet Status
**Goal:** Get an overview of all deployed devices
1. Navigate to /natureos/devices/fleet
2. Review the device count summary (total, online, offline)
3. Scan the fleet table for devices needing attention
4. Sort by status or last seen to find problem devices

### Action 2: View Devices on Map
**Goal:** See geographic distribution of deployed devices
1. Click the Map tab or navigate to /natureos/devices/map
2. Wait for the map to render with device markers
3. Zoom and pan to explore device locations
4. Click a marker to see device details in a popup
5. Use map controls to toggle layers or filter by status

### Action 3: Manage Alerts
**Goal:** Review and respond to device alerts
1. Click the Alerts tab or navigate to /natureos/devices/alerts
2. Review the alert list sorted by severity (critical, warning, info)
3. Click an alert to see details and affected device
4. Acknowledge or dismiss alerts as appropriate
5. Follow remediation steps if provided

### Action 4: Analyze Fleet Insights
**Goal:** Review fleet-wide analytics and trends
1. Click the Insights tab or navigate to /natureos/devices/insights
2. Review fleet health metrics (uptime %, average sensor readings)
3. Examine trend charts over time
4. Identify anomalies or patterns across the fleet

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Empty fleet table | No devices registered or API error | Check device registry first; verify API connectivity |
| Map shows no markers | Devices lack location data or map tiles failed to load | Update device locations in registry; check internet for map tiles |
| "0 alerts" when devices are offline | Alert rules not configured | Check alert configuration; ensure thresholds are set |
| Insights charts empty | Insufficient historical data | Allow devices to run for sufficient time to generate trends |
| Access denied | Not COMPANY-tier authenticated | Re-login with COMPANY-level credentials |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation, device-registry
- **Next skills**: device-telemetry, defense-crep-dashboard, defense-fusarium

## Computer Use Notes
- The map view uses Leaflet or Mapbox — standard map controls apply (scroll to zoom, drag to pan)
- Device markers on the map may be color-coded: green = online, red = offline, yellow = warning
- Alert severity badges use standard colors: red = critical, orange = warning, blue = info
- The four sub-pages share a tab bar — look for it directly below the page header
- Fleet table supports sorting by clicking column headers and filtering via a search/filter bar

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
