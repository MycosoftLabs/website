---
description: Navigate and interact with the Earth Simulator 3D globe tool at mycosoft.com for environmental data visualization and fungal observation mapping.
---

# Earth Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/earth-simulator
- **Key Components**: app/natureos/tools/earth-simulator/page.tsx, components/natureos/tool-viewport.tsx, LazyEarthSimulator

## Success Criteria (Eval)
- [ ] 3D globe renders with visible rotating Earth and grid overlay within the tool viewport
- [ ] At least one data layer (fungal observations, seismic, volcanic, weather, or transport) is toggled on and displays markers/overlays on the globe
- [ ] A specific land tile or region is selected and its environmental data panel is visible

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Earth Simulator"
6. Wait for tool viewport to load (you'll see a title bar reading "Earth Simulator")
7. Wait for the Cesium 3D globe to initialize — a spinning Earth with blue oceans and green/brown landmasses will appear inside a dark canvas area
8. Use mouse drag to rotate the globe, scroll to zoom in/out
9. Use the layer toggle panel (typically on the right or top-right) to enable data overlays

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar with "Earth Simulator" | Top of content area | Confirms tool is loaded |
| 3D rotating globe (Cesium WebGL canvas) | Center of viewport, large area | Click and drag to rotate, scroll to zoom |
| Grid overlay lines on globe surface | Over the globe surface | Visual reference for tile system |
| Layer toggle panel with checkboxes/switches | Right side or top-right overlay | Click toggles to show/hide data layers |
| "Fungal Observations" layer toggle | In layer panel | Toggle to show fungal observation markers |
| "Seismic" layer toggle | In layer panel | Toggle to show seismic activity heatmap |
| "Volcanic" layer toggle | In layer panel | Toggle to show volcanic sites |
| "Weather" layer toggle | In layer panel | Toggle to show weather patterns |
| "Transport" layer toggle | In layer panel | Toggle to show transport routes |
| Land tile selection highlights | On globe when hovering/clicking tiles | Click a tile to select and view data |
| Environmental data panel | Side panel or bottom drawer | Shows data for selected tile/region |
| Loading spinner or progress bar | Center of viewport during load | Wait for it to complete before interacting |

## Core Actions
### Action 1: View global fungal observation data
**Goal:** Display fungal observation markers overlaid on the 3D globe
1. Wait for the globe to finish loading (spinning Earth visible, no loading spinner)
2. Locate the layer toggle panel on the right side of the viewport
3. Find the "Fungal Observations" toggle — it may have a mushroom icon or green dot
4. Click the toggle to enable it — colored markers or clusters will appear on the globe surface
5. Rotate the globe by clicking and dragging to explore different regions
6. Click on an individual marker to see observation details in a popup or side panel

### Action 2: Inspect a specific land tile
**Goal:** Select a grid tile and view its environmental data
1. Zoom into a region of interest by scrolling the mouse wheel over the globe
2. The grid overlay will become more visible as you zoom in, showing rectangular tile boundaries
3. Click on a specific tile — it will highlight with a border or color change
4. An environmental data panel will appear (side panel or bottom drawer) showing temperature, humidity, soil composition, and other metrics for that tile
5. Review the data fields and note any alerts or anomalies

### Action 3: Toggle multiple data layers for comparison
**Goal:** Overlay multiple environmental datasets simultaneously
1. In the layer toggle panel, enable "Seismic" — red/orange dots or heatmap regions appear
2. Enable "Volcanic" — triangle markers appear at volcanic sites
3. Enable "Weather" — cloud patterns or wind flow lines appear
4. Observe how the layers overlap to identify correlations between environmental factors
5. Disable layers one at a time by clicking their toggles to isolate specific data

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Black or empty canvas where globe should be | WebGL not supported or failed to initialize | Refresh the page; ensure browser supports WebGL |
| Globe loads but no grid lines visible | Grid layer may be off by default | Look for a "Grid" toggle in the layer panel and enable it |
| "Loading..." spinner persists for more than 15 seconds | Cesium tiles or Earth-2 data still downloading | Wait up to 30 seconds; if still loading, refresh the page |
| Layer toggles present but no data appears on globe | Data fetch failed or region has no data | Try a different layer; zoom to a populated area like North America or Europe |
| Globe is frozen / not responding to mouse | JavaScript error or memory issue | Refresh the page; the lazy-loaded component may need re-initialization |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-spore-tracker (uses similar map-based visualization), lab-growth-analytics (analyze data from selected regions)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — layer selections and camera position survive page reload
- Heavy components are lazy-loaded via LazyEarthSimulator — may take 2-5 seconds to render
- This is a 3D WebGL tool using Cesium — look for a `<canvas>` element as the main interaction surface
- The globe uses viewport-based loading with 98% memory reduction — only visible tiles load data
- Google Earth Engine integration provides satellite imagery layers
- Earth-2 visualization adds climate and atmospheric overlays
- Mouse interactions: left-click-drag to rotate, scroll to zoom, right-click-drag to tilt

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
