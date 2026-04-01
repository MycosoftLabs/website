---
description: Use when navigating or interacting with the Species Explorer heatmap at mycosoft.com/natureos/mindex/explorer — filtering fungal observations by taxonomy, location, or date range and viewing spatial density data.
---

# Species Explorer

## Identity
- **Category**: science
- **Access Tier**: PUBLIC (no login required)
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: `/natureos/mindex/explorer`
- **Key Components**: Deck.gl HeatmapLayer, Mapbox basemap, iNaturalist/GBIF data feeds, temporal timeline slider, species detail cards

## Success Criteria (Eval)
- [ ] Heatmap renders with colored density blobs over a world map
- [ ] Filtering by taxonomy, location, or date range updates the visible observation markers
- [ ] Clicking an observation marker or cluster opens a species detail card with image and metadata
- [ ] Temporal timeline slider changes which observations appear on the map

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` — you will see the Mycosoft homepage with a dark header bar and navigation links.
2. Click **NatureOS** in the top navigation bar — a dropdown or page loads showing NatureOS sections.
3. Click **MINDEX** or navigate directly to `/natureos/mindex` — you see the MINDEX landing page with database stats.
4. Click **Explorer** tab or link — the page transitions to a full-screen interactive map with a heatmap overlay.
5. Alternatively, navigate directly to `mycosoft.com/natureos/mindex/explorer`.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Full-screen interactive map with colored heatmap blobs (red/orange = dense, blue/green = sparse) | Center of the page, fills most of the viewport | Pan by clicking and dragging; zoom with scroll wheel or +/- buttons |
| Taxonomy filter panel (Kingdom, Phylum, Class, Order, Family, Genus, Species dropdowns) | Left sidebar or top filter bar | Click a dropdown to narrow observations to a specific taxonomic group |
| Location search box with magnifying glass icon | Top-left corner above the map | Type a place name or coordinates and press Enter to fly the map there |
| Date range picker or temporal timeline slider | Bottom of the map area, horizontal bar with year/month labels | Drag the left/right handles to set start and end dates for observations |
| Observation markers (dots or clustered circles with count numbers) | Scattered across the map at observation locations | Click a marker to open its detail card |
| Species detail card (popup/modal with species photo, Latin name, observation count, source badge showing iNaturalist or GBIF) | Appears near the clicked marker or as a slide-in panel | Read the details; click the image to enlarge; click "View Full Record" to go to the species page |
| Zoom controls (+/- buttons) | Bottom-right or top-right corner of the map | Click + to zoom in, - to zoom out |
| Layer toggle (Heatmap / Markers / Satellite) | Top-right corner, small icon group | Click to switch between heatmap density view, individual marker view, or satellite basemap |
| Data source badges ("iNaturalist", "GBIF") | Inside species detail cards or in a legend panel | These indicate where the observation data originated |

## Core Actions
### Action 1: Filter by Taxonomy
**Goal:** Narrow the heatmap to show only a specific fungal group.
1. Locate the taxonomy filter panel on the left sidebar or top bar.
2. Click the **Kingdom** dropdown — it may default to "Fungi."
3. Click the **Order** or **Family** dropdown to select a more specific group (e.g., "Agaricales").
4. Watch the heatmap redraw — density blobs shift to reflect only matching observations.
5. To reset, click a "Clear Filters" or "Reset" button, or set dropdowns back to "All."

### Action 2: Filter by Date Range
**Goal:** View observations from a specific time period.
1. Find the temporal timeline slider at the bottom of the map.
2. Drag the left handle to set the start date (e.g., January 2020).
3. Drag the right handle to set the end date (e.g., December 2023).
4. The map updates in real time as you drag, showing only observations within that window.

### Action 3: Inspect a Specific Observation
**Goal:** View details about an individual observation point.
1. Zoom into a region of interest by scrolling or using the + button.
2. As you zoom in, heatmap blobs resolve into individual observation markers or clusters.
3. Click on a marker — a species detail card appears showing: species photo, scientific name, common name, observation date, data source (iNaturalist/GBIF), coordinates.
4. Click "View Full Record" on the card to navigate to the full species page.

### Action 4: Search by Location
**Goal:** Jump the map to a specific geographic area.
1. Click the location search box (top-left, has a magnifying glass icon).
2. Type a location name (e.g., "Pacific Northwest" or "Costa Rica").
3. Press Enter or click the search suggestion — the map flies to that location.
4. The heatmap updates to show observation density in the new viewport.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Blank map with no heatmap colors | Data is still loading, or filters are too restrictive | Wait 5-10 seconds for data to load; if still blank, reset all filters |
| Map shows only a gray background, no tiles | Mapbox basemap failed to load (network or API key issue) | Refresh the page; check network connectivity |
| Clicking a marker does nothing | Marker is a cluster that needs further zoom | Zoom in closer until individual markers appear, then click |
| Timeline slider is not visible | Screen is too narrow or panel is collapsed | Look for a small arrow or expand icon at the bottom edge of the map; click to reveal the timeline |
| "No observations found" message | Filter combination has no matching data | Broaden the taxonomy or date range filters |

## Composability
- **Prerequisite skills**: platform-navigation (to reach NatureOS), platform-natureos-dashboard (to understand NatureOS layout)
- **Next skills**: science-mindex-database (to query raw data behind observations), science-ancestry-explorer (to browse taxonomy of a species found on the map), science-genetics-tools (to analyze genomic data for a discovered species)

## Computer Use Notes
- The map is a WebGL canvas rendered by Deck.gl — standard DOM selectors will not find heatmap elements. Interact by clicking at pixel coordinates on the canvas.
- Heatmap colors are gradient-based: red/orange for high density, blue/green for low density, transparent for zero.
- Scroll-to-zoom on the map can conflict with page scrolling — make sure the mouse cursor is over the map before scrolling.
- Species detail cards may appear as floating popups anchored to the map; they move when you pan.
- Large datasets may take several seconds to render after filter changes — wait for the loading spinner to disappear.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
