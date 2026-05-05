# Fluid Search total rebuild — May 03 2026

**Date:** May 03, 2026  
**Status:** Shipped (structural wave)  
**Scope:** `/search` Fluid Search canvas — layout, streaming, intent, connectors, FAB, tests.

## Summary

- **Canvas:** Bottom widget bar removed; `MagneticGrid` packs tiles; `FastActionRadial` FAB opens ranked shortcuts (`IntentPlan.secondaryWidgets` → heuristic route fallback).
- **Streaming:** `useStreamingSearch` debounces 250ms, consumes SSE from `GET /api/search/stream` (`route`, `widget-data`, `stream-error`, `done`).
- **Intent:** `POST /api/search/route` returns blended `IntentPlan` via `computeBlended-intent.ts`.
- **Connectors:** `lib/search/connectors/_framework.ts` (`defineConnector`); Earth MINDEX-first path refactored through `earthMindexFirstConnector` in `earth-search-connectors.ts` (live fallback + ingest when MINDEX empty).
- **Suggestions:** `SuggestionChipsPanel` in `ActivityStreamPanel` (MYCA context + search actions).
- **Tests:** Playwright `e2e/widgets/` — `helpers/widget-test-utils.ts` (`assertWidgetRendersRealData`; FAB: **close only when `fast-action-radial-layer` is mounted** (do not use `title` alone — soft `/search` navigations can desync); if `title` is “Close” with no layer, one click resets; then open + **`radialLayer.first()` attached** before `fast-action-${type}`). Probes: `camera-unified-probe`, `devices-unified-probe`, `weather-unified-probe` (skip when unified POST has no rows). **`E2E_FORCE_*_MATRIX=1`** — fail hard instead of skipping.
- **FAB radial:** Up to **16** shortcuts; **pinned** first: `species`, `chemistry`, `genetics`, `news`, `weather`, `cameras`, `devices` so long `secondaryWidgets` lists cannot push matrix types out of the radial; slightly larger hit target (`radius` 130px, 300–320px panel).
- **Earth / cameras connector:** Overpass mirrors tried in parallel (`Promise.any`) with per-request timeout; cameras still need **`MINDEX_INTERNAL_TOKEN`** (or equivalent) for `eagle_video` plus reachable Overpass — empty unified cameras in locked-down dev is expected unless forced.

## File inventory (website)

| Area | Path |
|------|------|
| Canvas | `components/search/fluid/FluidSearchCanvas.tsx` |
| Magnetic grid | `components/search/fluid/MagneticGrid.tsx` |
| FAB radial | `components/search/fluid/FastActionRadial.tsx` |
| Streaming hook | `hooks/use-streaming-search.ts` |
| Suggestion chips | `components/search/panels/SuggestionChipsPanel.tsx`, `ActivityStreamPanel.tsx` |
| SSE API | `app/api/search/stream/route.ts` |
| Intent API | `app/api/search/route/route.ts` |
| Blended intent | `lib/search/compute-blended-intent.ts` |
| Connector framework | `lib/search/connectors/_framework.ts` |
| Earth connectors | `lib/search/earth-search-connectors.ts` (`earthMindexFirstConnector`) |
| Widget registry | `lib/search/widget-registry.ts` |
| Playwright | `playwright.config.ts`, `e2e/widgets/**`, helpers `camera-unified-probe`, `devices-unified-probe`, `weather-unified-probe` |

## Verification

1. Local: `npm run dev:next-only` → open `/search?q=weather%20in%20Tokyo` — widgets load; FAB opens ranked icons.
2. SSE: DevTools → Network → `stream` (EventSource) — events `route` → `widget-data` → `done`.
3. E2E: `PW_NO_WEB_SERVER=1 npm run test:e2e:widgets` (with dev already on 3010) or allow Playwright `webServer` to start Next.

## Follow-ups

- Per-connector SSE chunks (not only unified snapshot) + MINDEX ingest per widget when routes exist on 189.
- Additional widget scaffolds (`traffic`, `events`, …) beyond empty states as APIs land.
- CI job wiring `test:e2e:widgets` with secrets for live MINDEX/MAS when ready.

## Related

- `docs/FLUID_SEARCH_FULL_AI_INTERFACE_MILESTONE1_APR17_2026.md` (context contract)  
- MAS indexes: `docs/API_CATALOG_FEB04_2026.md`, `docs/MASTER_DOCUMENT_INDEX.md`, `.cursor/CURSOR_DOCS_INDEX.md`
