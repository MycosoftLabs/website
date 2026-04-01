---
description: Navigate the CREP Dashboard at mycosoft.com — Common Relevant Environmental Picture with fungal-first design, real-time map visualization of fungal observations, MycoBrain data, seismic/volcanic/wildfire/storm layers, and aviation/maritime/satellite feeds.
---

# CREP Dashboard

## Identity
- **Category**: defense
- **Access Tier**: PUBLIC access
- **Depends On**: platform-navigation
- **Route**: /natureos/crep or /dashboard/crep
- **Key Components**: Map view, layer controls, Redis pub/sub real-time feeds, marker/heatmap overlays

## Success Criteria (Eval)
- [ ] CREP Dashboard loads at /natureos/crep or /dashboard/crep
- [ ] Map renders with default primary layers enabled
- [ ] Fungal observations layer shows 200-400 markers
- [ ] MycoBrain device data layer shows sensor locations
- [ ] Layer toggle controls are visible and functional
- [ ] Real-time data updates via Redis pub/sub
- [ ] Secondary layers (seismic, volcanic, wildfires, storms) can be toggled on
- [ ] Demo/transport layers (aviation, maritime, satellites) can be toggled on

## Navigation Path (Computer Use)
1. Navigate to /natureos/crep or /dashboard/crep (no authentication required for PUBLIC access)
2. Wait for the map to render with default layers
3. Use the layer control panel to toggle data layers on/off

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| CREP header or title | Top of page | Confirms correct dashboard loaded |
| Map viewport | Center — full-width map display | Pan, zoom, click markers for details |
| Layer Control Panel | Right side or top-right overlay on map | Toggle data layers on/off |
| Fungal observation markers | Scattered across map — primary layer | Click for observation details |
| MycoBrain device markers | At device locations — primary layer | Click for sensor data |
| SporeBase data markers | Across map — primary layer | Click for spore database entries |
| Feed statistics | Bottom bar or sidebar — "34 earthquakes, 26 wildfires..." | Real-time counts of active events |
| Heatmap overlay | Map background when enabled | Shows density of observations |
| Legend | Corner of map | Color/icon key for marker types |

## Core Actions
### Action 1: View Default Environmental Picture
**Goal:** See the fungal-first Common Relevant Environmental Picture
1. Navigate to /natureos/crep
2. Map loads with primary layers ON by default:
   - Fungal observations (200-400 markers)
   - MycoBrain device data
   - SporeBase data
3. Pan and zoom to area of interest
4. Click markers to see detail popups

### Action 2: Toggle Secondary Layers
**Goal:** Add environmental hazard data to the picture
1. Open the Layer Control Panel (right side or top-right)
2. Toggle ON secondary layers:
   - Seismic (34 earthquakes)
   - Volcanic (3 volcanoes)
   - Wildfires (26 active)
   - Storms / Weather Alerts
   - Solar Flares (10 from SWPC)
3. Observe new markers/overlays appearing on the map

### Action 3: Enable Transport/Demo Layers
**Goal:** View aviation, maritime, and satellite tracking
1. Open Layer Control Panel
2. Scroll to Demo/Transport section (OFF by default)
3. Toggle ON desired layers:
   - Aviation (OpenSky) — real-time aircraft positions
   - Maritime (AISstream) — vessel positions
   - Satellites (CelesTrak) — satellite tracks
4. These layers are data-heavy — may slow rendering

### Action 4: Inspect Individual Events
**Goal:** Get details on a specific observation or event
1. Click a marker on the map
2. Read the popup with event details (type, time, coordinates, source)
3. Follow links to source data if available
4. Close popup by clicking X or clicking elsewhere on map

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Blank map with no markers | Redis pub/sub disconnected or API timeout | Refresh the page; check if data feeds are active |
| Map tiles not loading | Internet connectivity or tile server issue | Check network; try a different map tile provider |
| "0 observations" in feed stats | Data connector offline | Check OEI monitoring for feed health |
| Transport layers cause lag | Too many real-time entities rendering | Zoom into a smaller area; disable unused transport layers |
| Layer toggles unresponsive | JavaScript error in layer control | Refresh the page; check browser console |

## Composability
- **Prerequisite skills**: platform-navigation
- **Next skills**: defense-oei-monitoring, defense-fusarium, device-telemetry

## Computer Use Notes
- This is a PUBLIC page — no login required, but authenticated users may see additional data
- The map is the primary interface — most interaction is clicking markers and toggling layers
- Layer Control Panel may be a floating panel over the map — look for a layers icon (stacked squares)
- Active feed counts (34 earthquakes, 26 wildfires, etc.) update in real-time
- Primary layers are ON by default; secondary are toggleable; demo/transport are OFF by default
- Heatmap mode may be an alternative to marker mode — check for a view toggle
- Real-time data flows via Redis pub/sub — expect continuous updates

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
