# Earth Sim Viewport Memory Governor — September 10, 2026

**Date:** September 10, 2026  
**Status:** In `website-itdx-codex-v13` (`lib/crep/viewport-memory-governor.ts`). 187 not cut.  
**RJ Ricasata = CFO.**

## Rule

Logical viewport (camera + pad, span-capped by zoom) is the only bbox for Live Data rasters, wind particles, env points, and manned-layer fetches. Globe tilt must not become a worldwide AABB.

Heap / WebGL / hidden-tab pressure pauses the **oldest animated overlay** (radar / wind / field-raster). Static ECM/AM/env stays. **In-view planes, ships, and sats the user turned on are not dropped.** Off-view tiles go first.

Max concurrent animated overlays: **2** (1 under critical heap). Probe: `window.__crep_memory_governor`.

Fly buttons keep `crepMapFlyTo` retry. Hidden-tab pause + WebGL-lost stay.

## CONUS thresholds (measured intent, not guessed device class)

| Combo | Pitch | Expected |
|---|---|---|
| ECM + one Live Data raster | 0–60° | Draw in logical CONUS window |
| Wind + radar (2 animated) | tilt | Both may run; third animated pauses |
| Heap warn / critical | any | Oldest animated pauses; movers in view stay |
| Hidden tab / WebGL lost | — | Animated pause; globe not blanked |

Default Earth Sim zoom is **3** (CONUS ~72°×48° logical cap). Do not require rest-of-planet tiles.
