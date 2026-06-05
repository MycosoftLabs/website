# iNat / MINDEX Front-End Smoke - June 3, 2026

## Scope

This handoff covers the front-end/API route check requested after Cursor's iNat -> MINDEX and Search -> Earth Simulator bridge work. No deployment was run from this pass.

Primary docs referenced:

- `docs/codex-handoffs/INAT_MINDEX_FRONTEND_TEST_HANDOFF_MAY27_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\docs\EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md`

## Front-End Fix Applied

File changed:

- `app/api/crep/fungal/route.ts`

Problem:

- `source=mindex-only&quick=true` could return an empty response when the first MINDEX fetch took longer than the quick viewport soft timeout.
- This made a healthy MINDEX response look empty at first load.

Fix:

- `source=mindex-only` now uses the normal MINDEX timeout and bypasses the quick soft-timeout-to-empty behavior.
- Normal quick map requests still keep the bounded soft timeout when they are not explicitly `mindex-only`.

## Validation Evidence

San Diego bbox used:

```text
-117.5,32.5,-116.5,33.5
```

Repeated first-load style probe:

```powershell
http://localhost:3010/api/crep/fungal?source=mindex-only&quick=true&bbox=-117.5,32.5,-116.5,33.5&limit=50&kingdom=Fungi&nocache=true
```

Results after the patch:

```text
run 1: 39 observations, mindex_primary, 1287 ms
run 2: 39 observations, mindex_primary, 3123 ms
run 3: 39 observations, mindex_primary, 2052 ms
run 4: 39 observations, mindex_primary, 992 ms
run 5: 39 observations, mindex_primary, 1092 ms
run 6: 39 observations, mindex_primary, 1363 ms
```

Post clean dev-server restart:

```text
source=mindex-only: 39 observations, mindex_primary, 6291 ms
source=mindex-only&quick=true: 39 observations, mindex_primary, 1038 ms
source=all&quick=true: 50 observations, dual_source_merged, mindex=4, inaturalist=46, 5116 ms
```

Lint:

```powershell
npm.cmd run lint -- --file app/api/crep/fungal/route.ts --file app/api/mindex/unified-search/earth/route.ts --file lib/search/earth-entity-bridge.ts --file lib/search/earth-search-connectors.ts
```

Result:

```text
No ESLint warnings or errors
```

Local browser smoke after clean restart:

```text
http://localhost:3010/natureos/earth-simulator?lat=32.7157&lng=-117.1611&zoom=10
```

Observed:

- Earth Simulator shell rendered.
- Intel Feed rendered.
- MYCA Analysis rendered.
- Map canvas rendered.
- Fungal badge rendered (`62 FUNGI` during the browser smoke).
- Events and devices rendered.

## Search / Earth Bridge Status

The new BFF route is reachable but currently returns empty result buckets for tested queries:

```powershell
http://localhost:3010/api/mindex/unified-search/earth?q=earthquake&limit=5
http://localhost:3010/api/mindex/unified-search/earth?q=earthquakes%20near%20san%20francisco&limit=5
http://localhost:3010/api/mindex/unified-search/earth?q=fungi%20san%20diego&limit=5
http://localhost:3010/api/mindex/unified-search/earth?q=show%20devices%20on%20map&limit=5
http://localhost:3010/api/mindex/unified-search/earth?q=San%20Diego&limit=5
```

Observed:

```text
all tested queries: total=0, universal_results=0, events=0, devices=0, fungi=0
```

The older `/api/earth` fallback still returns expected live buckets:

```text
earthquake: events=1374
earthquakes near san francisco: events=1374
show devices on map: devices=3
```

This points to a backend/indexing issue in MINDEX unified earth search, not the front-end bridge code itself.

## Cursor Backend Handoff

Please check the MINDEX unified earth search backend on VM 189:

1. Confirm `/api/mindex/unified-search/earth` returns non-empty `universal_results` and domain buckets for:
   - `earthquake`
   - `earthquakes near san francisco`
   - `fungi san diego`
   - `show devices on map`
   - `San Diego`
2. Confirm the website BFF can authenticate to VM 189 with `X-Internal-Token`.
3. Confirm MINDEX has indexed/queriable earth domains for events, devices, fungi, cameras, and civic/infrastructure records.
4. Investigate local logs showing:
   - `MINDEX taxa API error: HTTP 500`
   - `/api/natureos/mindex/taxa?limit=50` returning 500
   - `/api/mindex/unified-search/earth` returning empty successful responses
5. If `/api/mindex/unified-search/earth` is still being populated by a new migration/index job, run that job and re-test the exact queries above.

## Notes

- The iNat/MINDEX fungal front-end timeout issue is fixed locally.
- No AM/ECM raster behavior was intentionally changed in this pass.
- No blue-green deployment was run.
- The local `3010` dev server was clean restarted and `.next` cache was regenerated because the browser had stale module/HMR errors even though the source files existed.
