# Search Intelligence Router Implementation

Updated May 22, 2026.

## What Changed

- Submitted searches now use the shared `SearchPlan` as the source of truth for widget order, Earth layers, entity families, live result types, and answer context.
- Typing in the search field does not open or reorder widgets; widget changes happen after committed search intent.
- Geospatial searches expand the full planned widget bundle immediately, even before live data finishes hydrating.
- Earth searches pass canonical plan layers into the embedded CREP Earth Simulator instead of re-deriving weaker local filters.
- Earthquake-only searches stay fast while mixed searches, such as earthquakes near power lines and power plants, fetch the broader Earth Intelligence buckets they need.
- Infrastructure search now returns real power plant registry rows and a sourced transmission/substation layer item, while detailed line geometry remains rendered by CREP/MINDEX Earth layers.
- The QA artifact waits for required widget data before snapshotting and filters dev-only HMR/geolocation/provider-noise console messages.

## Covered Search Rules

- `Active earthquakes`: Earth, Events, Answers, News, Research with only earthquake plus physical base layers.
- `earthquakes near power lines and power plants`: Earth, Events, Infrastructure, Risk, Power Grid, Answers, News, Research, with earthquake, power plant, and transmission layers.
- `show me everything on the map`: Earth and Answers with all working CREP layers except unvalidated Earth2 layers.
- Non-earthquake hazards such as landslides and oil spills now resolve to event-first Earth bundles instead of species/default widgets.

## Validation

- Focused Jest: `lib/search/__tests__/search-plan.test.ts` and `lib/search/__tests__/search-qa-artifact.test.ts` passed.
- Focused TypeScript filtering showed no errors in the edited search files; full repo `tsc` remains blocked by unrelated MYCA voice/test-voice edits in the dirty worktree.
- Live QA shard: `artifacts/search-qa-fast-final2/search-qa-results-2026-05-22T04-30-45-731Z.json`
  - 3 scenarios
  - 3 observations
  - 0 findings
  - 0 critical

## Remaining Work

- Run the larger thousand-search QA sweep after the unrelated MYCA TypeScript errors are cleaned up.
- Add source-health and ETL request persistence for live widgets that remain empty after hydration.
- Add production mobile/tablet smoke checks after deployment.
