# Search Earth Rules Plan

Updated: May 14, 2026

## Rule Contract

Search controls Earth Simulator layers. Users should not need to open map filter controls inside search results. The query, typed or spoken, resolves to:

- enabled Earth layer ids
- entity/live-result types to fetch
- widgets to show
- widget priority/order
- location focus when the query names a place

Committed search text drives intent. Keystrokes in the search input do not open widgets, call Answers, or change Earth filters until the user submits.

## Current Scenario Rules

- `Active earthquakes`: Earth + Events + Answers + News + Research, with earthquake layers only plus physical basemaps: bathymetry, topography, satellite imagery, and satellite streets.
- `earthquakes near power lines and power plants`: earthquake layers plus power plants and transmission lines. It must not infer species such as `ant` from `plants`.
- `show me everything on the map`: Earth-only widget, with the broad working Worldview layer set enabled on the map. Earth2 layers stay off until they are validated.
- `without/no/hide/turn off power lines`: removes transmission lines without disabling earthquakes or power plants.
- Aircraft, vessels, satellites, species, infrastructure, weather, devices, cameras, rail, submarine cables, and events follow the same rule path through `resolveEarthSearchRule`.

## UI Rules

- Mobile search uses the same widgets as desktop, scaled into one-column full-width cards.
- Mobile shows at most two widgets in the first viewport. If Earth is the only widget, it expands to the available phone viewport.
- Desktop Earth-only searches expand Earth across the available search viewport.
- The mobile widget resize/scale button is removed. Widgets are shown/hidden by close buttons and the trackwheel.
- Earth widgets are not draggable in search results so globe drag remains map navigation.
- Trackwheel icons toggle only their own widget. Tapping outside collapses the wheel.

## QA Performed

- TypeScript: `npx tsc --noEmit --pretty false --incremental false`
- Rule tests: `npx jest __tests__/lib/search/earth-search-rules.test.ts --runInBand`
- Visual mobile checks:
  - `Active earthquakes`
  - `earthquakes near power lines and power plants`
  - `show me everything on the map`
  - typing `show me everything on the map` does not alter widgets until Enter
- Visual desktop check:
  - `show me everything on the map` renders Earth-only and expands across the search viewport

## Remaining Operational Notes

- External feeds can still log transient failures or rate limits in development, especially iNaturalist, vessel batches, satellite feeds, and local MINDEX/MAS when the LAN service is unreachable.
- The search UI now degrades around those sources, but production reliability still depends on reachable collectors and warmed caches.
