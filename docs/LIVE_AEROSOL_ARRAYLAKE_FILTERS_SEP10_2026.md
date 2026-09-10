# Live Aerosol Arraylake Filters — September 10, 2026

**Date:** September 10, 2026  
**Status:** Bind via same-origin BFF + sibling/NAS/public bake. No secrets. No 187 race.  
**Worktree:** `website-itdx-codex-v13`

## Why live said UNBOUND

Live `/api/crep/field/era5/t2m` returned 200 with `baked:false` and reason `ARRAYLAKE_FIELD_BASE not configured`. The old hook treated `base_configured === false` and empty manifests as **unbound**.

MINDEX AQ/PM/FIRMS returned 200 FeatureCollections with `meta.upstream: "unavailable"`. The classifier labeled that **unbound** even though the BFF was bound.

Earth-2 spore often returns `{runs:[],count:0,source:"mas"}` (no `zones`). That became **error** / **unbound** instead of no-data.

Smoke used the same **unbound** badge as missing env. It is optional / quarantined → **NOT_SUPPLIED**.

## Env / store (no secret values)

| Check | Local 3010 worktree | Live / 187 image |
|---|---|---|
| Field catalog | 200 | 200 |
| `ARRAYLAKE_FIELD_BASE` | optional; BFF is the bind | often unset |
| Local bake in this worktree `public/assets/fields` | absent | image `public/` usually absent |
| Sibling bake `WEBSITE/website/public/assets/fields` | present (era5, hrrr, mrms, helios, alive, canopy-height, sentinel2, geo-stereo-wind, biomass-*) | not in the container unless NAS-mounted |
| NAS `/opt/mycosoft/media/website/assets/fields` | copied from `website/public/assets/fields` (fields tree only) | live static `/assets/fields/era5/t2m/manifest.json` is 200; old BFF still ignores it until this route ships |
| AQ BFF | 200, features `[]`, `upstream: unavailable` | same |
| Wind BFF | 200 with u/v | 200 with u/v |
| Smoke | NOT_SUPPLIED | NOT_SUPPLIED |
| AirNow | unbound only if `AIRNOW_API_KEY` missing | same |

## Fix

- Catalog always `base_configured: true` because `/api/crep/field` exists.
- Prefer local / sibling / NAS / `public/data/fields` bake, then optional HTTP `ARRAYLAKE_FIELD_BASE`.
- Frame URLs rewrite through `/api/crep/field/{ds}/{var}/{file}` so live uses the same proxy 3010 uses.
- Empty bake / empty features / `upstream: unavailable` → **no data** / **NOT_SUPPLIED**.
- **UNBOUND** only for catalog/manifest **404** or a required missing env (`AIRNOW_API_KEY`).
- Offline evidence mode without a package stays unbound (no file).
- Optional 8765/8766 lab banner is unchanged.

Live still needs this BFF on the serving image (owned by the existing blue-green lane). This lane does not recreate 187. After that image ships, NAS bake or the same BFF proxy is enough — toggles are on/off + data or empty, not a permanent unbound.

No mock plumes. No secrets printed.
