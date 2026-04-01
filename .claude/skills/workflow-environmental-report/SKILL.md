---
description: Generate environmental reports by composing CREP Dashboard, OEI Monitoring, and Earth Simulator for data visualization and report capture.
---

# Environmental Report Generation Workflow

## Identity
- **Category**: workflows
- **Access Tier**: AUTHENTICATED
- **Depends On**: defense-crep-dashboard, defense-oei-monitoring, lab-earth-simulator
- **Route**: Multiple routes (workflow spans several tools)
- **Key Components**: Composed from defense-crep-dashboard, defense-oei-monitoring, lab-earth-simulator components

## Success Criteria (Eval)
- [ ] CREP Dashboard loads showing active environmental events with severity indicators
- [ ] Data layers (fungal, seismic, weather) toggle on/off correctly on the CREP map
- [ ] Earth Simulator 3D globe renders with environmental data overlays
- [ ] Data snapshots can be captured from the Earth Simulator view
- [ ] Report generation produces a structured environmental summary document

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (see platform-authentication skill)
2. Open NatureOS and navigate to CREP Dashboard
3. Review active environmental events
4. Toggle relevant data layers (fungal, seismic, weather)
5. Switch to Earth Simulator for 3D visualization
6. Capture data snapshots
7. Generate the environmental report

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| CREP Dashboard map view | Main content area | Interactive map with environmental event overlays |
| Active events list/panel | Side panel or overlay | Lists current environmental events with severity |
| Layer toggle controls (fungal, seismic, weather) | Map control panel, usually right side | Click toggles to show/hide data layers |
| Fungal activity overlay (green/brown heatmap) | On CREP map when enabled | Shows fungal network activity patterns |
| Seismic activity overlay (red/orange dots) | On CREP map when enabled | Shows recent seismic events |
| Weather overlay (cloud patterns, wind) | On CREP map when enabled | Shows weather patterns and precipitation |
| Earth Simulator link/navigation | In sidebar or CREP dashboard | Click to switch to 3D globe view |
| 3D Earth globe | Earth Simulator viewport | Rotate, zoom to explore environmental data in 3D |
| Snapshot/capture button | Earth Simulator toolbar | Click to capture current view as an image |
| Generate Report button | CREP Dashboard or toolbar | Click to compile data into a report |
| Report preview/download | Modal or new page | Review and download the generated report |

## Core Actions
### Action 1: Review active environmental events
**Goal:** Identify current environmental events requiring documentation
1. Open CREP Dashboard from NatureOS sidebar (Defense section)
2. Wait for the map and events to load
3. Scan the active events list for high-severity items
4. Click on individual events to see details (location, magnitude, start time, trend)
5. Note events that should be included in the report

### Action 2: Enable and analyze data layers
**Goal:** Overlay multiple environmental datasets for comprehensive analysis
1. In the CREP map controls, locate the layer toggle panel
2. Enable "Fungal Activity" layer -- green/brown heatmap appears on map
3. Enable "Seismic" layer -- red/orange dots show recent seismic events
4. Enable "Weather" layer -- cloud and precipitation patterns appear
5. Observe correlations between layers (e.g., seismic activity near fungal networks)
6. Zoom into areas of interest to examine detail

### Action 3: Visualize in 3D with Earth Simulator
**Goal:** Get a global 3D perspective on environmental data
1. Navigate to Earth Simulator (from sidebar or CREP Dashboard link)
2. Wait for 3D globe to initialize
3. Enable the same data layers used in CREP Dashboard
4. Rotate the globe to view the region of interest
5. Zoom in for detail; zoom out for broader context
6. Note visual patterns and anomalies for the report

### Action 4: Capture data snapshots
**Goal:** Save visual evidence for the report
1. In Earth Simulator, position the globe to show the desired view
2. Click the "Snapshot" or capture button in the toolbar
3. The snapshot is saved to a gallery or clipboard
4. Repeat for multiple views (global overview, regional detail, layer comparisons)
5. Snapshots will be embedded in the generated report

### Action 5: Generate the environmental report
**Goal:** Compile all data into a structured report document
1. Navigate back to CREP Dashboard or use the report generation feature
2. Click "Generate Report" button
3. Select date range and events to include
4. Choose which data layers and snapshots to embed
5. Review the report preview -- check that all sections are populated
6. Download or export the report in the desired format (PDF, markdown)

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| CREP map shows no events | No active events or data feed disconnected | Check date range filter; verify OEI data connection |
| Layer toggle has no visible effect | Layer data not available for current region/timeframe | Zoom out or change the date range; try a different layer |
| Earth Simulator fails to load | WebGL issue or network timeout | Refresh page; ensure browser supports WebGL |
| Snapshot button does nothing | Browser permission for canvas capture denied | Allow canvas/clipboard permissions in browser settings |
| Report generation shows "No data" | No events selected or date range too narrow | Adjust selection criteria; ensure at least one event is included |

## Composability
- **Prerequisite skills**: platform-authentication, defense-crep-dashboard, defense-oei-monitoring, lab-earth-simulator
- **Next skills**: workflow-threat-assessment (if events require security escalation)

## Computer Use Notes
- This workflow crosses three tools -- allow navigation time between each
- CREP Dashboard and Earth Simulator both use map-based interfaces with different rendering engines
- Data layer toggles may have slightly different names between CREP and Earth Simulator
- Snapshot capture requires browser canvas/clipboard permissions
- Report generation may take 10-30 seconds depending on data volume
- Generated reports include timestamps and data source attribution automatically

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
