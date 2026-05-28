# Earth Simulator, Search Earth Widget, MYCA, and Mobile Handoff

Date: 2026-05-28
Workspace: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
Local QA surface: `http://localhost:3010`
Deploy status: local only in this pass. No production deploy was performed in this handoff step.

## Executive State

The local Earth Simulator and search surfaces are running again on port `3010`. The most recent rapid terminal QA shows `200` responses for the home page, Earth Simulator, search pages, MycoBrain device API, San Diego fungi, global events, satellites, buoys, Eagle cameras, and San Diego viewport intelligence.

This worktree is intentionally dirty and contains many prior same-day Earth Simulator changes. Do not reset it. There are unrelated/generated artifacts and screenshots in the worktree. Keep future commits tightly scoped and review diffs before staging.

## What Was Completed Today

### Earth Simulator Mobile and Tablet Layout

- Removed the CREP classification strip from Earth Simulator. The text `CREP // COMMON RELEVANT ENVIRONMENTAL PICTURE // UNCLASSIFIED // FOUO` is no longer rendered.
- Rebuilt the phone layout so the map is the primary surface.
- Hid the NatureOS side rail only for phone Earth Simulator mode so the globe starts at full phone width.
- Replaced placeholder mobile drawers with the real Earth Simulator panels:
  - `Intel` opens the real left Intel Feed as a bottom sheet.
  - `MYCA` opens the real right MYCA Analysis panel as a bottom sheet.
  - `Civic` opens the right panel on the viewport intelligence tab.
- Bottom sheets are capped to roughly half the phone viewport and slide from the bottom.
- Desktop and tablet retain the side-panel layout.
- Desktop/tablet status footer remains; phone hides the status footer to preserve map area.

Key files:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `app/globals.css`
- `app/natureos/NatureOSLayoutClient.tsx`
- `components/crep/mobile/crep-mobile-shell.tsx`

Evidence:

- `screenshots/earth-responsive-phone-initial-final2-2026-05-28.png`
- `screenshots/earth-responsive-phone-intel-final2-2026-05-28.png`
- `screenshots/earth-responsive-phone-myca-final2-2026-05-28.png`
- `screenshots/earth-responsive-tablet-final-2026-05-28.png`
- `docs/reports/earth-simulator-responsive-smoke-2026-05-28.json`

### Search Earth Widget and Device Widget Recovery

- Repaired `/search` initialization by removing the fragile client dynamic import wrapper and statically importing `SearchPageContent` through the existing Suspense boundary.
- Seeded search device results from canonical field MycoBrain deployments so `Show devices on map` has immediate Mushroom 1 and Hyphae 1 results.
- Hydrated the search device widget with the same live telemetry fields used by Earth Simulator:
  - temperature
  - humidity
  - IAQ
  - eCO2
  - pressure
  - gas resistance
  - registry ID
  - agent URL
  - sensor slot
- Expanded the search device widget to `2x2` so real telemetry has room.
- Wired selected/focused device state so clicking a device card focuses the Earth widget and highlights the device row.
- Fixed search side panel collapse buttons so the left and right panels collapse with single clicks.

Key files:

- `app/search/SearchClientEntry.tsx`
- `components/search/SearchLayout.tsx`
- `components/search/fluid/FluidSearchCanvas.tsx`
- `components/search/fluid/widgets/EarthWidget.tsx`
- `components/search/fluid/widgets/FallbackWidget.tsx`
- `lib/search/earth-search-connectors.ts`
- `lib/search/unified-search-sdk.ts`
- `lib/search/widget-registry.ts`

### MycoBrain Field Device Surface

- Local API smoke confirms `/api/earth-simulator/devices` returns 2 devices:
  - `Mushroom 1`
  - `Hyphae 1`
- The UI has screenshots from today showing field MycoBrain widgets and pulsing markers.
- Production control path still requires auth for command actions. That is correct from a security standpoint, but command testing needs an authenticated admin session or a dedicated safe local test harness.

Evidence:

- `docs/reports/earth-field-mycobrain-devices-2026-05-27.md`
- `screenshots/earth-field-mycobrain-pulsing-markers-2026-05-28.png`
- `docs/reports/earth-simulator-rapid-terminal-qa-2026-05-28.json`

### Earth Simulator Data and Runtime Work

This worktree also contains same-day changes around:

- iNaturalist/MINDEX fungal data paths.
- Nature stream and fungal endpoint handling.
- Eagle Eye camera source normalization and thumbnail/video stability.
- Static infrastructure and level-of-detail policy.
- Aircraft, vessel, and satellite registries.
- Viewport environment/intel prefetching.
- Geolocation and map control behavior.
- Earth-2 controls being disabled/inert until the GPU backend is ready.
- MycoBrain device catalog and network routes.
- Navigation click/touch handling.

These changes need final review before staging because many files changed and some work was interleaved with other agents and prior local edits.

## Rapid QA Results

Commands run:

```powershell
npx.cmd tsc --noEmit --pretty false --incremental false
npx.cmd jest lib/search/__tests__/search-plan.test.ts --runInBand
node <responsive smoke script>
node <endpoint smoke script>
Invoke-WebRequest http://localhost:3010/natureos/earth-simulator?_codex_health=2
```

Results:

- TypeScript: passed.
- Search plan Jest suite: passed, 7 tests.
- Earth Simulator route: `200`.
- Search devices page: `200`.
- Search devices API: `200`, `totalCount: 2`.
- Search active earthquakes API: `200`, `totalCount: 1480`.
- Earth Simulator devices API: `200`, 2 devices: Mushroom 1 and Hyphae 1.
- San Diego fungi API: `200`, 233 observations in rapid probe.
- Global events API: `200`, 200 events in rapid limited probe.
- Satellites API: `200`, 100 from SatNOGS.
- Buoys API: `200`, 856 from cache.
- Eagle sources API for San Diego bbox: `200`, 20 sources.
- San Diego viewport intel: `200`, place resolves to San Diego, San Diego County, California, United States.

Reports:

- `docs/reports/earth-simulator-rapid-terminal-qa-2026-05-28.json`
- `docs/reports/earth-simulator-responsive-smoke-2026-05-28.json`

## Known Blockers and Risks

- MINDEX/iNaturalist latency still appears in the dev logs. The APIs return data, but slow upstream paths can still hurt interactive stability.
- `/api/earth-simulator/devices` returned successfully but took about 7.1 seconds in the rapid terminal probe. That is too slow for a hot path and should be cached or warmed.
- San Diego fungi returned 233 observations in the rapid probe, but the user expects broader and fresher iNaturalist coverage. MINDEX ETL and live iNaturalist ingestion still need continued work.
- Search unified API returns grouped object buckets, not a flat `results` array. This is expected in the current implementation, but QA scripts should read `totalCount` and bucket keys.
- This is a dirty worktree with many untracked screenshots/logs. Do not stage everything blindly.
- Live deploy must not happen until local visual QA is repeated after any final cleanup and the production health/cutover plan is explicit.

## Next Best Actions

1. Review the large dirty worktree and split commits by safety boundary:
   - mobile/tablet layout
   - search Earth widget/device widget
   - device/MYCA field integration
   - data/runtime endpoint hardening
2. Keep `3010` running and manually verify:
   - phone initial map is full width
   - phone `Intel` opens/closes real Intel Feed
   - phone `MYCA` opens/closes MYCA Analysis
   - search `Show devices on map` shows two devices and device details
   - search `Active earthquakes` shows Earth + events
3. Tighten device API latency.
4. Continue MINDEX iNaturalist ETL work so live nature data is already stored and hot.
5. Only after all local QA passes, prepare blue-green deploy with health checks and public smoke tests.

## Reactivation Prompt

Use this if this thread is resumed elsewhere:

```text
Continue from D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website. Read docs/codex-handoffs/2026-05-28-earth-simulator-search-mobile-handoff.md and docs/reports/earth-simulator-rapid-terminal-qa-2026-05-28.json first. Do not reset the dirty worktree. Treat localhost:3010 as the local QA surface. Finish local visual QA for Earth Simulator phone/tablet and search Earth widgets, then split changes into safe commits before any deploy. Do not deploy until the user explicitly asks and local QA is current.
```
