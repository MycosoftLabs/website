# Earth Sim Live Data Local Toggle Fix — Sep 11, 2026

**Date:** September 11, 2026  
**Status:** Complete  
**Related:** Fusarium Earth Simulator `/fusarium/earth-simulator`, Arraylake ERA5 t2m  
**Owner note:** RJ Ricasata is CFO. Overlay tracks stay `live: false`. No mock rasters.

## Why local toggle failed

1. **Wrong 3010 root.** Port 3010 was serving dirty `WEBSITE/website`, not worktree `website-itdx-codex-v13`. Dirty CREP mounts `FieldRasterLayer` only when `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS === "1"` **and** `!auditAllOffMode` **and** `shouldRenderHeavyOverlays`. All-off / staged-boot keeps the raster unmounted even when the Live Data chip is on. Live (`mycosoft.com`) already always-mounts the layer.
2. **Worktree governor park.** After retarget, `field-raster-layer.tsx` `parkGpu()` hid and tore down slot 0 when ITDX called `setEarthSimScenarioActive(true)`. Toggle on fetched frames, then the governor paused the lowest-score field and the layer vanished.
3. **Empty worktree bake dir.** Worktree has no `public/assets/fields`. Bake lives in sibling `WEBSITE/website/public/assets/fields`. Relative `ARRAYLAKE_FIELD_OUT=./public/assets/fields` is empty on the worktree cwd. The BFF now skips empty dirs and uses the sibling store. Token alias: `ARRAYLAKE_FIELD_TOKEN` or `ARRAYLAKE_TOKEN`.

Not “Arraylake is down.” Live catalog + `era5/t2m` + `0.png` stayed HTTP 200.

## File + fix

| File | Fix |
|---|---|
| `components/crep/layers/field-raster-layer.tsx` | User ON always paints frame 0. Governor pause stops the timer only. Global ERA5 skips viewport cull. |
| `lib/crep/viewport-memory-governor.ts` | `userPinned` Live Data is not evicted for the ITDX scenario. |
| `lib/crep/fields/field-store.ts` | Skip empty bake dirs; resolve `ARRAYLAKE_FIELD_OUT` against cwd; keep sibling `website/public/assets/fields`. |
| `app/api/crep/field/[...path]/route.ts` | Token alias. Catalog `honesty` is `BOUND` when a store exists; otherwise `UNBOUND` + real missing var. |

Dirty `WEBSITE/website` was not reset.

## Verify

- Live: `https://mycosoft.com/api/crep/field/_catalog` and `/api/crep/field/era5/t2m` stay 200.
- Local 3010 process cwd is `website-itdx-codex-v13`.
- Fusarium Live Data under Environmental Conditions: ON → ERA5 raster/frames; OFF → layer gone, no leftover freeze.
