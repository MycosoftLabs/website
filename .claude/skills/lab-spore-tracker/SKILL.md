---
description: Navigate and interact with the Spore Tracker at mycosoft.com for tracking global spore distribution patterns and dispersal mapping with MycoBrain sensor integration (COMPANY-only access).
---

# Spore Tracker

## Identity
- **Category**: lab-tools
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/spore-tracker
- **Key Components**: app/natureos/tools/spore-tracker/page.tsx, components/natureos/tool-viewport.tsx, spore-tracker components

## Success Criteria (Eval)
- [ ] Spore tracker map loads showing global or regional spore dispersal patterns with colored markers or heatmap overlays
- [ ] A specific spore detection event is selected on the map and its details (species, concentration, timestamp, sensor source) are displayed
- [ ] MycoBrain sensor data feed is visible and connected, showing real-time or recent spore detection readings

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with a COMPANY-tier account (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Spore Tracker"
6. Wait for tool viewport to load (you'll see a title bar reading "Spore Tracker")
7. A map visualization will appear showing spore dispersal data with markers, heatmaps, or flow lines
8. Use filters and map controls to explore spore distribution patterns

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Spore Tracker" | Top of content area | Confirms tool is loaded |
| Map visualization (world or regional map) | Center of viewport, large area | Main display — zoom, pan, click markers |
| Spore detection markers (colored dots/pins) | Scattered across the map | Click for details on individual detections |
| Heatmap overlay (color gradient on map) | Over geographic regions | Red=high concentration, blue=low |
| Dispersal flow lines (curved arrows on map) | Between regions on map | Show spore movement direction and volume |
| Species filter dropdown | Top of viewport or left panel | Filter markers by fungal species |
| Date/time range selector | Top of viewport | Set the time window for displayed data |
| Concentration threshold slider | In filter panel | Filter out low-concentration readings |
| MycoBrain sensor panel | Right side panel or bottom drawer | Shows connected sensors and their status |
| Sensor status indicators (green/yellow/red dots) | In MycoBrain sensor panel | Green=active, yellow=intermittent, red=offline |
| Live data feed indicator | Top-right corner | Pulses when receiving real-time sensor data |
| Detection detail popup/card | Appears on marker click | Shows species, concentration (spores/m3), timestamp, sensor ID |
| Summary statistics bar | Top of viewport, below filters | Total detections, active sensors, dominant species |
| Export/Report button | Top-right toolbar | Download spore distribution data or generate reports |

## Core Actions
### Action 1: Explore global spore distribution
**Goal:** View the worldwide pattern of spore detections and identify hotspots
1. When the map loads, it will show the full global view with markers or heatmap
2. Look for clusters of colored markers — dense clusters indicate spore hotspots
3. Zoom into a region of interest by scrolling the mouse wheel over the map
4. Pan by clicking and dragging to explore different geographic areas
5. The heatmap overlay (if active) shows concentration gradients — look for red/orange zones
6. Dispersal flow lines (curved arrows) show directional movement patterns between regions
7. Review the summary statistics bar at the top: total detections count, number of active sensors, most common species

### Action 2: Investigate a specific spore detection event
**Goal:** Click on a marker to see detailed information about a spore detection
1. Zoom into a region with visible markers on the map
2. Click on an individual marker (colored dot or pin)
3. A detection detail popup will appear showing:
   - Species name (e.g., "Ganoderma lucidum spores")
   - Concentration (e.g., "1,250 spores/m3")
   - Detection timestamp (date and time)
   - Source sensor ID (e.g., "MycoBrain-Sensor-042")
   - GPS coordinates
   - Environmental conditions at detection (wind speed, humidity, temperature)
4. Click the sensor ID link to see more readings from that sensor in the MycoBrain panel
5. Close the popup by clicking the X or clicking elsewhere on the map

### Action 3: Filter by species and time range
**Goal:** Narrow the display to a specific species during a specific time period
1. Locate the species filter dropdown at the top of the viewport
2. Click and select a species (e.g., "Aspergillus niger") — the map will update to show only markers for that species
3. Use the date/time range selector to set a window (e.g., last 7 days)
4. The map will redraw with only matching detections
5. Adjust the concentration threshold slider to filter out low readings (e.g., only show detections above 100 spores/m3)
6. The summary statistics will update to reflect the filtered dataset
7. Look for patterns — seasonal spikes, geographic clustering, correlation with weather events

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or "Insufficient Permissions" | Account is not COMPANY tier | Log in with a COMPANY-tier account; this tool requires elevated access |
| Map loads but no markers or heatmap visible | Filters may be too restrictive or no data for current view | Reset all filters; expand date range to "All Time"; zoom out to global view |
| MycoBrain sensor panel shows all sensors as red/offline | Sensors are disconnected or data feed is interrupted | This is a data source issue — check device-mycobrain-setup skill; data will appear when sensors reconnect |
| Map tiles fail to load (gray or blank map) | Map tile server issue | Refresh the page; check internet connection |
| Live data indicator is not pulsing | Real-time feed may be paused or disconnected | Look for a "Connect" or "Resume" button in the sensor panel |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-earth-simulator (broader environmental context for spore patterns), device-mycobrain-setup (configure sensors that feed spore data), lab-growth-analytics (analyze spore count trends over time)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — filter settings, map position, and selected markers survive page reload
- COMPANY-only access — ensure the logged-in account has COMPANY tier permissions
- Integrates with MycoBrain sensor data — real-time readings come from deployed hardware sensors
- The map is the primary interaction surface — click markers for details, scroll to zoom, drag to pan
- Spore tracker components handle the map rendering and data overlay logic
- Large datasets (thousands of markers) may cause the map to render slowly — use filters to reduce data volume

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
