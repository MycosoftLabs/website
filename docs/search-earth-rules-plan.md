# Search Earth Rules Plan

Updated: May 14, 2026

## Rule Contract

Search controls Earth Simulator layers. Users should not need to open map filter controls inside search results. The query, typed or spoken, resolves to:

- enabled Earth layer ids
- entity/live-result types to fetch
- widgets to show
- widget priority/order
- location focus when the query names a place
- a structured `SearchPlan` for Answers context, ETL acquisition, and QA scenarios

Committed search text drives intent. Keystrokes in the search input do not open widgets, call Answers, or change Earth filters until the user submits.

## SearchPlan Contract

`classifyAndRoute(query)` now attaches `route.searchPlan`. The plan contains normalized intent, entity families, primary widget, ordered widgets, Earth layers, live result types, collective Answers context, potential ETL acquisition requests, and QA tags.

Entity families are generated from taxonomy rules instead of hand-authored one-off searches. Current families cover events, species, genetics, chemistry, infrastructure, vehicles, weather, devices, space, marine/transport, economy/content, and general fallback.

If a widget has no data but the taxonomy knows approved candidate sources, the user-facing state is `Data is being acquired momentarily.` Internal MINDEX/MAS/NAS/cache text must not be shown in the UI.

## Current Scenario Rules

- `Active earthquakes`: Earth + Events + Answers + News + Research, with earthquake layers only plus physical basemaps: bathymetry, topography, satellite imagery, and satellite streets.
- `earthquakes near power lines and power plants`: earthquake layers plus power plants and transmission lines. It must not infer species such as `ant` from `plants`.
- `show me everything on the map`: Earth-only widget, with the broad working Worldview layer set enabled on the map. Earth2 layers stay off until they are validated.
- `Amanita muscaria near Oregon`: Species remains first, with Earth, Genetics, Chemistry, Research, News, and Answers following.
- `vessels near submarine cables`: Earth, Vessels, Marine, Infrastructure, Answers, and News with vessel, port, route, fishing/container, cable, and physical basemap layers.
- `aircraft over Los Angeles`: Earth, Aircraft, Transport, Weather, Answers, and News with aviation and aviation-route layers.
- `active wildfires`: Earth, Events, Wildfire, Air Quality, Answers, and News.
- `without/no/hide/turn off power lines`: removes transmission lines without disabling earthquakes or power plants.
- Aircraft, vessels, satellites, species, infrastructure, weather, devices, cameras, rail, submarine cables, and events follow the same rule path through `resolveEarthSearchRule`.

## QA And Monitor Rules

- `generateSearchIntelligenceScenarios(limit)` expands golden queries plus templates such as `{event} near {infrastructure}` and `{species} in {region}` into deterministic scenario expectations.
- `/api/search/qa/scenarios?limit=500` exposes a monitor report with widget order, Earth layers, forbidden layers, live result types, and empty-widget acquisition candidates.
- Scheduled CI should run the generated scenarios against router contracts, then run visual Playwright subsets for golden searches.
- In-app monitors should periodically run production searches and create ETL requests for empty widgets with approved online sources.

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
- SearchPlan tests: `npx jest lib/search/__tests__/search-plan.test.ts --runInBand`
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
