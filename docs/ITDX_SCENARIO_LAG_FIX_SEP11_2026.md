# ITDX Scenario Lag Fix — Sep 11, 2026

**Date:** September 11, 2026  
**Status:** Complete  
**Related:** Fusarium Earth Simulator `/fusarium/earth-simulator`, ITDX overlay / Intel Feed  
**Owner note:** RJ Ricasata is CFO. Overlay remains `live: false` / SYNTHETIC EXERCISE.

## Root cause (file + loop)

The freeze with **all CREP filters off** was the ITDX scenario player, not weather/species budget.

1. **`lib/itdx/map-layer.mjs` `attachReplay()`** reinstalled GeoJSON on MapLibre **`idle` and `styledata`**. Globe first paint + any style tick → `install()` → `setData` / `addLayer` → more idle → death spiral.
2. **`lib/itdx/replay-store.ts`** ran `setInterval(advanceClock, Math.min(200, sampleInterval))` and could apply **up to 12 ticks per fire**. Each tick rebuilt fusion + 65-point circles and called `install()`.
3. **`components/itdx/ITDXReplayLayer.tsx`** auto-called `replay.focus()` on first attach (camera `fitBounds` while the globe started).
4. **`components/fusarium/itdx/itdx-earth-left-panel.tsx`** called `replay.enable(true)` **and** `replay.focus()` on mount.

MapLibre already has one pump. ITDX was a second full restyle loop.

## What was removed / throttled

| Change | Effect |
|---|---|
| Removed `idle` + `styledata` listeners | One attach; style reload only on `load` / `style.load` |
| Playback clock floor **400ms**, **one tick per fire** | No 12-step burst, no 50–200ms restyle |
| `install('tick')` is `setData` only | No per-tick `onStatus` / `console.info` / layer rebuild |
| Removed first-paint `replay.focus()` | Globe can pan/tilt/zoom; Focus AO stays user-initiated |
| Overlay collapsed by default; no `snapshot()` while collapsed | Chip does not rebuild fusion every tick |
| Live OSM pathways capped at **48** Fort Stewart ways | No planet-wide tracks |

## Honesty

Scenario movement is **synthetic** (`live: false`). Do not claim live COP.

## Verify

- `/fusarium/earth-simulator` with weather / species / Live Data **all off**
- Globe pans, tilts, zooms without freeze from first start
- Play 1×–20× moves the four Fort Stewart markers without locking the camera
