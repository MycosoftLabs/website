# CREP Integration Test Plan

**Date**: March 10, 2026  
**Status**: Draft – Implementation Plan  
**Author**: MYCA

## Overview

This document is the **canonical test plan** for validating CREP (Common Relevant Environmental Picture) integrations. It addresses gaps between current CREP implementation and required full capabilities, including deck.gl, Shadowbroker, VIZ test features (MODIS, VIIRS, AIRS, Landsat, EONET), satellite imagery filters, military filter modifications, and **biodiversity/wildlife bubble selection and popup widgets (P0)**.

---

## Work Order

1. **P0: Fix biodiversity/wildlife bubbles** – Make them selectable and show popup widgets (do first)
2. Integrate VIZ test features (MODIS, VIIRS, AIRS, Landsat, EONET) into CREP map and Live Data
3. Add satellite imagery layers and filters with on/off toggles
4. Integrate Shadowbroker and deck.gl into filters and map usability
5. Add satellite imagery filters to Live Data area
6. Update military filter modifications
7. Test all integrations
8. Document results and push to GitHub

---

## P0: Biodiversity/Wildlife Bubble Selection (Fix First) ✅ DONE MAR10

### Implementation Complete (Mar 10, 2026)

- **`selectedOther` state** added for weather, earthquake, elephant, device, fire, crisis
- **`onEntityClick`** extended to handle `weather`, `earthquake`, `elephant`, `device`, `fire`, `crisis`; sets `selectedOther`, clears aircraft/vessel/satellite/fungal
- **Map click** clears `selectedOther` when clicking canvas (not marker/popup)
- **OtherEntityMarker** renders when `selectedOther` is set: `MapMarker` + `MarkerContent` + `MarkerPopup` with type-specific icon (Cloud, AlertTriangle, PawPrint, Radio, Flame, Siren), source, coordinates, and properties
- **Fungal** observations remain handled by `FungalMarker` (fungi, plants, birds, mammals, etc.)

### Current Behavior

- Biodiversity/wildlife observations (fungal, plants, birds, mammals, etc.) render as deck.gl IconLayer dots (`crep-fungal` layer)
- `pickable: true` and `onClick` are wired; `handleSelectFungal` is called on entity click for fungal; `setSelectedOther` for weather/earthquake/elephant/device/fire/crisis
- `FungalMarker` shows popup when `selectedFungal`; `OtherEntityMarker` shows popup when `selectedOther`

### Acceptance Criteria

- [x] Every biodiversity/wildlife bubble on the map is **selectable** (clickable)
- [x] Clicking a bubble opens a **popup widget** with observation details
- [x] Popup can be closed; selecting another bubble updates the popup
- [x] Works for Fungi (FungalMarker), and weather, earthquake, elephant, device, fire, crisis (OtherEntityMarker)

---

## Satellite Imagery and Map Filters

### Current State

- CREP map uses MapLibre with **Carto dark** basemap only
- No satellite basemap or imagery overlays
- No MODIS, VIIRS, AIRS, Landsat, or EONET in Live Data filters

### Required Additions

| Layer/Filter | Source | VIZ Demo Reference | Integration Target |
|--------------|--------|---------------------|---------------------|
| MODIS True Color | GIBS | `SatelliteTilesDemo.tsx`, `DeckGibsDemo.tsx` | CREP map overlay + Live Data filter toggle |
| VIIRS Night Lights | GIBS | `SatelliteTilesDemo.tsx` | CREP map overlay + Live Data filter toggle |
| AIRS | GIBS | `SatelliteTilesDemo.tsx` | CREP map overlay + Live Data filter toggle |
| Landsat | NASA/USGS | `LandsatViewerDemo.tsx` | CREP map overlay (live on map) + Live Data filter toggle |
| EONET Events | NASA EONET API | `EonetEventsDemo.tsx`, `app/api/oei/eonet/route.ts` | CREP map layer + Live Data filter toggle |
| Satellite basemap | e.g. Mapbox Satellite / ESRI | N/A | Basemap switcher in map controls |

### Implementation Tasks

| # | Task | Files | Notes |
|---|------|-------|-------|
| 1 | Add satellite imagery filter toggles to Live Data area | `CREPDashboardClient.tsx` (OEIMapControls / new section) | MODIS, VIIRS, AIRS, Landsat, EONET toggles |
| 2 | Add basemap switcher (Carto dark vs satellite) | Map controls, CREP map component | User can toggle map style |
| 3 | Port GIBS TileLayer (MODIS, VIIRS, AIRS) into CREP deck.gl overlay | `deck-entity-layer` or new `deck-gibs-layer` | Use DeckGibsDemo / SatelliteTilesDemo logic |
| 4 | Port Landsat overlay into CREP | LandsatViewerDemo logic | Landsat imagery overlaid live on map |
| 5 | Port EONET events into CREP map | EonetEventsDemo, `/api/oei/eonet` | Fetch EONET, render as entities; filter toggle in Live Data |
| 6 | Add layer toggles for each imagery type | CREPDashboardClient layers state | User can turn MODIS/VIIRS/AIRS/Landsat/EONET on/off |

### Acceptance Criteria

- [ ] Live Data area has filter toggles for: MODIS True Color, VIIRS Night Lights, AIRS, Landsat, EONET Events
- [ ] Each toggle controls visibility of the corresponding imagery/events layer on the map
- [ ] Map supports at least one satellite basemap option (e.g. satellite style)
- [ ] Level of detail includes actual satellite imagery, not only MapLibre/Carto vector

---

## VIZ Test Features Integration

### Existing Components (Not in CREP)

| Component | Path | Capability |
|-----------|------|------------|
| SatelliteTilesDemo | `components/demo/viz/SatelliteTilesDemo.tsx` | MODIS, VIIRS, AIRS via GIBS |
| DeckGibsDemo | `components/demo/viz/DeckGibsDemo.tsx` | deck.gl + GIBS tiles |
| EonetEventsDemo | `components/demo/viz/EonetEventsDemo.tsx` | EONET events on map |
| LandsatViewerDemo | `components/demo/viz/LandsatViewerDemo.tsx` | Landsat imagery |

These are only used on `/demo/viz-test`. They must be integrated into CREP dashboard map and filters.

### Tasks

- Extract reusable logic from each demo (GIBS URLs, EONET fetch, Landsat tile logic)
- Add CREP-specific wrappers that plug into CREP map, layers state, and Live Data filters
- Wire filter toggles in Live Data to show/hide each layer

---

## Shadowbroker and deck.gl

### Current State

- Shadowbroker is referenced in `app/api/oei/eonet/route.ts` comment ("Part of Shadowbroker / EO imagery expansion")
- No dedicated Shadowbroker UI or filter in CREP
- deck.gl is used for entity layers (aircraft, vessels, satellites, fungal, others)

### Required

- Integrate Shadowbroker concepts into CREP filters (EO intelligence, event correlation)
- Ensure deck.gl is used for all overlay rendering (entities + satellite imagery)
- Shadowbroker filter/section in Live Data or map controls for EO-related layers

### Tasks

- Define Shadowbroker filter schema (what toggles, what layers)
- Add Shadowbroker filter UI to OEIMapControls or CrepMapPreferencesPanel
- Wire Shadowbroker toggles to EO layers (EONET, satellite imagery, etc.)

---

## Military Filter Modifications

### Current State

- `groundFilter` includes `showMilitary: false`
- Military layers: militaryAir, militaryNavy, militaryBases, militaryDrones – all **mock**
- `OEIMapControls` and `CrepMapPreferencesPanel` use `groundFilter`

### Required

- Apply intended military filter modifications (from prior plans/specs)
- Ensure military filter changes are reflected in Live Data and map

### Tasks

- Locate military filter modification spec (CREP plan, OEI docs)
- Extend groundFilter schema if needed (e.g. per-subcategory toggles)
- Replace mock military data with real sources when available; document mock vs real
- Add military filter controls to Live Data area if not present
- Verify military layers respect filter state

---

## Layers and Live Data Summary

### Live Data Area (Current)

- **LIVE DATA FEEDS** header with streaming status (aircraft, vessels, satellites)
- **OEIMapControls** – aircraftFilter, vesselFilter, satelliteFilter, spaceWeatherFilter, groundFilter
- **CrepMapPreferencesPanel** – save/load map preferences
- Widgets: Space Weather, Flight Tracker, Vessel Tracker, Satellite Tracker, Smart Fence, Presence Detection

### Required Additions to Live Data

| Addition | Description |
|----------|-------------|
| Satellite imagery filters | MODIS, VIIRS, AIRS, Landsat, EONET toggles |
| Shadowbroker filters | EO intelligence toggles |
| Military filter updates | Per-user modifications as specified |
| Basemap/layer toggles | Satellite vs vector basemap; imagery overlay on/off |

---

## Test Matrix

After implementation, run through:

| # | Test | Expected |
|---|------|----------|
| 1 | Click biodiversity (fungal) bubble | Popup widget with species, source, photo |
| 2 | Click wildlife (plant, bird, mammal) bubble | Popup widget with observation details |
| 3 | Toggle MODIS | MODIS True Color layer appears/disappears on map |
| 4 | Toggle VIIRS | VIIRS Night Lights layer appears/disappears |
| 5 | Toggle AIRS | AIRS layer appears/disappears |
| 6 | Toggle Landsat | Landsat imagery overlay appears/disappears |
| 7 | Toggle EONET | EONET events appear/disappear on map |
| 8 | Switch basemap to satellite | Map shows satellite basemap |
| 9 | Shadowbroker filters | EO layers respond to Shadowbroker toggles |
| 10 | Military filters | Military layers respect groundFilter |

---

## File Reference

| Purpose | Path |
|---------|------|
| CREP dashboard | `app/dashboard/crep/CREPDashboardClient.tsx` |
| Deck entity layer | `components/crep/layers/deck-entity-layer.tsx` |
| Fungal marker | `components/crep/markers/fungal-marker.tsx` |
| Entity detail panel | `components/crep/panels/entity-detail-panel.tsx` |
| Map controls | `components/crep/map-controls.tsx` |
| Map preferences | `components/crep/CrepMapPreferencesPanel.tsx` |
| VIZ demos | `components/demo/viz/` (SatelliteTilesDemo, LandsatViewerDemo, EonetEventsDemo, DeckGibsDemo) |
| EONET API | `app/api/oei/eonet/route.ts` |
| VIZ test page | `app/demo/viz-test/VizTestClient.tsx` |

---

## Related Documents

- [CREP_PLANES_BOATS_SATELLITES_FEB12_2026.md](./CREP_PLANES_BOATS_SATELLITES_FEB12_2026.md)
- [CREP_DECK_GL_FIX_FEB12_2026.md](./CREP_DECK_GL_FIX_FEB12_2026.md)
- [CREP_FIXES_FEB18_2026.md](./CREP_FIXES_FEB18_2026.md)
- [CREP_MARKER_CLICK_FIX_AUDIT.md](./CREP_MARKER_CLICK_FIX_AUDIT.md)
- [crep plan.md](./crep%20plan.md)

---

## Completion Checklist

- [x] P0 biodiversity bubble fix implemented (selectedOther + OtherEntityMarker for weather/earthquake/elephant/device/fire/crisis; fungal already worked)
- [ ] Satellite imagery filters added to Live Data
- [ ] MODIS, VIIRS, AIRS, Landsat, EONET integrated into CREP map
- [ ] Shadowbroker integrated into filters
- [ ] deck.gl used for imagery overlays where applicable
- [ ] Military filter modifications applied
- [ ] All tests in Test Matrix pass
- [ ] Completion doc created (CREP_INTEGRATION_COMPLETE_MAR10_2026.md)
- [ ] MASTER_DOCUMENT_INDEX.md updated
- [ ] Changes pushed to GitHub
