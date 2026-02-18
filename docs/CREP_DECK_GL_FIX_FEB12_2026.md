# CREP Deck.gl Mapbox Fix (Feb 12, 2026)

## Problem
- **deck.getView is not a function**: With `@deck.gl/mapbox` and deck.gl v9, `getViewport()` in `deck-utils.js` called `deck.getView(MAPBOX_VIEW_ID)`. In v9, `getView` lives on `deck.viewManager`, not on `deck`, so the call threw and the CREP map showed no data (no aircraft, vessels, events, etc.).
- **No data on map**: Switching to `interleaved: false` avoided the error but the overlay did not show entities (interleaved mode is required for the current integration so layers render correctly with the map).

## Solution
1. **Reverted** `EntityDeckLayer` to **`interleaved: true`** so deck layers render as MapLibre custom layers and entities display again.
2. **Patched** `@deck.gl/mapbox` so `getViewport()` works with deck.gl v9:
   - In `node_modules/@deck.gl/mapbox/dist/deck-utils.js`, `getViewport()` now resolves the view via:
     - `deck.getView(id)` when it exists (older API), or
     - `deck.viewManager?.getView(id)` (v9 API).
3. **Patch persistence**: Added `patch-package` and `patches/@deck.gl+mapbox+9.2.7.patch`. After `npm install`, run `npx patch-package` (or rely on `postinstall`) so the patch is re-applied.

## Files changed
- `components/crep/layers/deck-entity-layer.tsx`: `interleaved: true`.
- `node_modules/@deck.gl/mapbox/dist/deck-utils.js`: getView fallback (and `patches/@deck.gl+mapbox+9.2.7.patch`).
- `package.json`: `postinstall`: `patch-package`, devDependency `patch-package`.

## Tests
- `npm run test:crep` (or `npx jest tests/crep`): 12 tests in `tests/crep/s2-indexer.test.ts` and `tests/crep/unified-entity-schema.test.ts` — all passing.

## Verification
1. Open CREP dashboard (`/dashboard/crep`).
2. Ensure "LIVE" streaming is on; map should show aircraft, vessels, satellites, events, and other entities.
3. No console error `deck.getView is not a function`.
