# Earth Simulator Local Stability Review - May 31, 2026

Owner: Codex
Surface: local website dev server on `http://localhost:3010/natureos/earth-simulator`
Deployment status: **not deployed**. Do not deploy until Morgan explicitly approves after local testing.

## Purpose

This document records what was changed, what was attempted, what was restored, and what still must be tested before any blue-green deploy. It exists because the local Earth Simulator started showing these regressions:

- Hover cards getting stuck on the map.
- Map/icon clicks freezing after 10 to 30 seconds or immediately after zooming into San Diego.
- Mushroom 1 and Hyphae 1 widgets sometimes showing offline/no telemetry while beep commands still work.
- Psathyrella / COM4 boot-loop noise possibly poisoning device payloads.
- Local fungal/species icons disappearing even though live is working.
- Eagle Eye camera thumbnails and camera widgets producing mixed Caltrans HLS results.

## Hard Rules For This Work

- No deploy from this state.
- Fungal species behavior must match live and must not be altered as part of the freeze fix.
- A broken/boot-looping COM4 device must not freeze or degrade Earth Simulator.
- Camera hover, Eagle Eye, and device widgets must fail independently and recover without trapping clicks.
- Anything that still depends on firmware, MAS, MINDEX, or COM4 hardware should be handed to Cursor, not patched blindly in the website.

## Current Local Change Set Under Review

These are the files currently touched in the local working tree that are relevant to this stability pass. The repo has many other dirty files from Cursor and prior work; this list is the active review scope.

| File | Status | Purpose |
| --- | --- | --- |
| `app/dashboard/crep/CREPDashboardClient.tsx` | Modified | Earth Simulator device marker/widget wiring, hover cleanup, Eagle Eye readiness, field device normalization, COM4 raw telemetry clamp, local fungal marker gate restoration. |
| `components/crep/devices/DeviceWidget.tsx` | Modified | Device widget close behavior, non-trapping visual scrim, busy-state guard, Psathyrella buoy panel and controls. |
| `app/api/earth-simulator/devices/route.ts` | Modified | Cached/stale-safe field-device API, COM4 telemetry fallback, optional command snapshot disabled by default. |
| `components/crep/eagle-eye/eagle-live-stream.tsx` | Modified | Caltrans HLS playback through local HLS proxy. |
| `lib/crep/eagle-viewport-sources.ts` | Modified | Eagle Eye sources sorted by distance to viewport center before slicing. |
| `app/api/mycobrain/[port]/control/route.ts` | Modified | Local MycoBrain control command path fixes. |
| `app/api/mycobrain/[port]/buzzer/route.ts` | Modified | Local buzzer command mapping fixes. |
| `app/api/mycobrain/[port]/led/route.ts` | Modified | Local LED command mapping fixes. |
| `components/mycobrain/widgets/peripheral-widget.tsx` | Modified | Defensive peripheral widget rendering for missing widget/icon metadata. |

## Changes Made Or Confirmed In This Pass

### 1. Fungal marker gate restored to live baseline

Local had diverged from the checked-in live baseline:

- Local broken state: `const shouldRenderDomMarkers = false`
- Live/baseline state: `const shouldRenderDomMarkers = true`

That directly explains why local fungal/species DOM icons were missing even when `/api/crep/fungal` returned observations. I restored it to:

```ts
const shouldRenderDomMarkers = true;
```

Important: this is a restoration, not a new fungal behavior change.

### 2. COM4 raw telemetry is clamped before entering UI props

Added `clampDeviceRawTelemetry()` in `CREPDashboardClient.tsx`.

Reason: when COM4 is boot-looping or returning noisy mixed serial output, the raw text should not be placed into map feature props or widget props at unbounded size. That can create heavy React/MapLibre payloads and make a broken device affect the map.

Current clamp size: last 6000 characters.

### 3. Device widget no longer uses a click-trapping scrim

`DeviceWidget.tsx` now uses:

- `pointer-events-none` on the full-screen wrapper and scrim.
- `pointer-events-auto` only on the dialog.
- `type="button"` on controls/close buttons.
- A mounted ref so async control completion does not call state after unmount.

Goal: if a device command is slow, unauthorized, or fails, the widget should still close and the map should still respond.

### 4. Device API has stale cache and optional COM4 telemetry fallback

`/api/earth-simulator/devices` now has:

- 15 second in-process cache.
- stale response while a refresh is in flight.
- fallback to cached payload if refresh fails.
- COM4 telemetry fallback from local MycoBrain or MAS if the registry row has no useful telemetry.
- command-based sensor snapshot disabled unless `EARTH_SIM_DEVICES_DISABLE_SENSOR_COMMAND_SNAPSHOT=0`.

Goal: a COM4 boot loop should not make the entire devices endpoint slow or fail.

### 5. Eagle Eye thumbnails are decoupled from MYCA readiness

The Eagle Eye prefetch readiness was changed so thumbnails can load before MYCA analysis is fully ready:

- previous: gated by `mycaAssetsReady`
- current: gated by audit/search/isolation state only

This matched Morgan's observation that Eagle Eye thumbnails started appearing immediately again in some refreshes.

### 6. Eagle Eye sources are viewport-centered

`filterSourcesInViewport()` now sorts cameras by distance to viewport center before slicing.

This prevents the six Eagle Eye thumbnails from choosing random distant cameras when the viewport is over San Diego or another demo area.

### 7. Caltrans HLS proxy is used for DOT/Caltrans streams

`eagle-live-stream.tsx` now routes `.m3u8` Caltrans streams through `/api/eagle/hls-proxy`.

Current logs show mixed results:

- Many HLS playlists/chunks return `200`.
- Some Caltrans streams return `502`.
- Some camera JPG fallbacks return `200`.

This means some failures are probably upstream or stream-specific, but UI must handle them without freezing.

### 8. Non-fungi species fetch queue no longer aborts itself

Morgan verified on local that Fungi paints immediately again, but Plants, Mammals, Fish, Reptiles, Insects, and Birds were inconsistent until more buttons were clicked. Terminal probes showed the local API does return San Diego rows for every kingdom, so the issue was not empty source data.

Fix in `CREPDashboardClient.tsx`:

- When a user enables multiple species buckets quickly, each requested kingdom is queued.
- The old behavior scheduled the next queued fetch 900 ms after the first fetch started.
- Because the current fetch often takes 1.5 to 4.5 seconds, the next nonce could abort the in-flight fetch before it populated the store.
- The new behavior schedules the next queued species fetch only after the current fetch finishes or fails, so Plants/Birds/Mammals/Fish/Reptiles/Insects are hydrated sequentially instead of cancelling each other.

This does not change the working Fungi filter logic; it only changes the queue timing for additional species buckets.

## Attempted And Restored

### Fungal DOM marker removal was rejected

At one point local had `shouldRenderDomMarkers = false` to reduce DOM pressure. This made fungal/species icons disappear locally, which violates the requirement that local match live. It has been restored to `true`.

Do not reintroduce this as a general fix. If DOM pressure remains a problem, fix marker batching, hover throttling, or native layer interop without removing fungal/species visibility.

## Current Evidence From Logs

Recent local logs show:

- `/api/crep/fungal` returns observations, for example `Returning 167 observations across 1 kingdoms`.
- MINDEX sometimes times out for fungal and infrastructure proxy calls.
- Caltrans HLS proxy has mixed `200` and `502` responses.
- `/api/earth-simulator/devices` returns `200`, sometimes after a slow first response, then faster cache responses.
- No current compile failure was seen in the last log tail, but hot reload/compile churn was still active.

Important interpretation: species data is not simply empty. At least some local failures are render/interaction state failures, not only backend data failures.

## Open Risks

### A. Hover freeze still not proven fixed

Symptoms still reported:

- Hover card stuck on screen.
- Hover/click freezes after San Diego zoom.
- Sometimes the whole map becomes unresponsive while device pulse CSS continues.

Likely paths to inspect next:

- `bindFeatureHoverPreview()` in `CREPDashboardClient.tsx`
- camera hover handlers in `components/crep/layers/eagle-eye-overlay.tsx`
- device marker hover from custom DOM overlay
- global `MapAssetHoverPreview`

Required behavior:

- Hover state must clear on `movestart`, `zoomstart`, `dragstart`, `wheel`, `pointerdown`, and `mouseleave`.
- Repeated hover over the same camera/device must be de-duped.
- No full raw camera/device object should be sent through hover if compact props are enough.

### B. COM4 boot loop must not affect Earth Simulator

Current design direction:

- Show Psathyrella marker at the Project Oyster coordinate even if COM4 is offline.
- Mark telemetry as stale/offline if COM4 cannot provide fresh data.
- Do not call command-based sensor reads from Earth Simulator during normal device polling unless explicitly enabled for diagnostics.
- Do not let COM4 raw serial text enter MapLibre features unbounded.

### C. Device online/offline status may be mixed with command reachability

Morgan observed Mushroom 1 and Hyphae 1 showing offline/no telemetry but still responding to beep. That means:

- control path can be healthy while telemetry heartbeat is stale, or
- UI status mapping is too strict, or
- cached/stale device payload is overwriting a newer live status.

This needs a targeted status audit before deploy.

### D. Species filters need full browser validation

After restoring `shouldRenderDomMarkers = true` and fixing sequential queued species fetches, test all species filters again:

- Fungi
- Plants
- Birds
- Mammals
- Fish / Marine
- Reptiles / Amphibians
- Insects / Arachnids

Each must paint icons without disabling infrastructure incorrectly and without interfering with fungi.

Terminal evidence from local San Diego bbox (`north=32.9&south=32.4&east=-116.7&west=-117.4`, `source=all`, `limit=400`):

| Kingdom request | Rows | Time |
| --- | ---: | ---: |
| Fungi | 211 | 4613 ms |
| Plantae | 129 | 3267 ms |
| Aves | 88 | 3161 ms |
| Mammalia | 86 | 3417 ms |
| Reptilia | 31 | 1490 ms |
| Insecta | 154 | 3184 ms |
| Actinopterygii | 42 | 1460 ms |

Conclusion: backend/source data exists locally. Remaining failures are UI timing/rendering unless a later probe contradicts this.

### E. Camera health is mixed

Need separate UI-vs-upstream classification:

- UI failure: thumbnail/widget freezes, stuck spinner forever, click breaks controls.
- Upstream failure: HLS playlist or segment returns `502`, but fallback image works.
- Unsupported feed: still image only, no live HLS available.

Morgan's latest local Chula Vista pass: Eagle Eye thumbnails were live, changed as the viewport moved, camera click flew to the camera, and camera widget playback worked. Keep testing other cities, but Chula Vista camera UI is no longer the first blocker.

## Required Local Test Checklist Before Deploy

Use local `3010`. Do not deploy until these pass.

1. Hard refresh Earth Simulator at San Diego.
2. Wait 30 seconds without touching the map.
3. Confirm map can still zoom/pan smoothly.
4. Confirm hover cards do not get stuck after idle.
5. Confirm fungal icons are visible if Fungi is on.
6. Toggle Fungi off/on and confirm fungi changes, not infrastructure.
7. Toggle Plants, Birds, Mammals, Fish, Reptiles, Insects one at a time.
8. Toggle multiple species together and confirm no crash/freeze.
9. Click Mushroom 1, Hyphae 1, Psathyrella.
10. Close each widget without freezing.
11. If COM4 is boot-looping/offline, Psathyrella must show stale/offline but not break the map.
12. Test Mushroom 1 and Hyphae 1 beep only while authenticated/local test session allows it.
13. Hover and click at least six San Diego cameras.
14. Eagle Eye must populate six local viewport thumbnails within a reasonable time.
15. Camera widgets must close and not freeze controls.
16. Fly to Menlo Park, San Francisco, Los Angeles, San Diego.
17. Repeat camera hover/click and species filter smoke in those cities.
18. Watch the dev logs for compile errors, runtime errors, and repeated endpoint storms.

## Terminal/API Probes To Run

```powershell
Invoke-WebRequest "http://localhost:3010/api/earth-simulator/devices" -UseBasicParsing
Invoke-WebRequest "http://localhost:3010/api/crep/fungal?quick=true&fallbackLive=true&kingdom=Fungi&north=32.9&south=32.4&east=-116.7&west=-117.4&source=all&limit=6000" -UseBasicParsing
Invoke-WebRequest "http://localhost:3010/api/eagle/sources?limit=1200&live=0&bbox=-117.4,32.47,-116.72,32.8" -UseBasicParsing
```

Expected:

- devices API returns all three field devices or stale/offline rows without 500.
- fungal API returns observations.
- eagle source API returns camera rows quickly enough for UI.

## Next Engineering Steps

1. Restart or clean reload local dev after the fungal marker restoration.
2. Verify no build/runtime error is present.
3. Browser-test the checklist above.
4. If freeze remains, add hover-event instrumentation counters and compact hover payloads in `eagle-eye-overlay.tsx` and `bindFeatureHoverPreview()`.
5. If device status flips offline while controls work, audit status merge order in `/api/earth-simulator/devices`.
6. If camera streams keep returning 502, document stream-specific upstream failures separately from UI failures.

## Cursor Handoff If Needed

Cursor should own firmware and service-level issues:

- COM4 boot loop and firmware flash failure.
- COM4 acoustic/optical TX firmware behavior.
- BME688 B detection after solder bridge repair.
- MycoBrain service sensor/peripheral scan API behavior.
- MAS/MINDEX persistence of sensor identities.

Codex should own:

- Earth Simulator front-end resilience when any one device is broken.
- Map hover/click stability.
- Widget close behavior.
- Browser QA and local-only website fixes.

## Current Decision

Hold for Morgan approval before deployment. After the fungal marker restoration and sequential species-fetch queue fix, Morgan physically tested local Earth Simulator and reported that the experience now looks fine: fungal icons are visible at refresh, cameras and Eagle Eye thumbnails are playing in Chula Vista, camera widgets open/play/close, and map interaction no longer showed the immediate freeze during that pass.

Do not continue broad exploratory edits from this point unless a new failure is reproduced. The next move should be either:

1. A focused browser/terminal smoke using this checklist, or
2. A blue-green deploy only after Morgan explicitly gives the command.
