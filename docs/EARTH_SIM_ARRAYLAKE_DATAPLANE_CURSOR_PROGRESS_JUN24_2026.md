# Earth Simulator Arraylake data plane — Cursor progress (Jun 24 2026)

**Status:** Data-plane code complete; **blocked on Arraylake auth** for introspect + bake.  
**Related:** `CURSOR_ARRAYLAKE_FIELDS_DATAPLANE_JUN24_2026.md`, `EARTH_SIM_ARRAYLAKE_FIELDS_IMPLEMENTATION_JUN24_2026.md`

## Done this session

| Item | Outcome |
|------|---------|
| Python deps | `arraylake`, `zarr>=3`, `icechunk`, `xarray`, `rioxarray`, `pyproj`, `pillow` installed locally |
| `bake_field.py` | HRRR/MRMS reprojection via `ensure_latlon()` + `prepare_frame()`; Sentinel-2 `truecolor` RGB bake; local catalog default `localhost:3010/api/crep/field/_catalog` |
| `introspect.py` | CRS hints from `grid_mapping` coords |
| `registry.ts` | `reproject: true` on `hrrr` + `mrms`; optional `nativeCrs` / `reproject` on `FieldDataset` |
| `.env.example` | `ARRAYLAKE_TOKEN`, `ARRAYLAKE_CATALOG_URL`, `ARRAYLAKE_FIELD_OUT` documented |
| CI | `.github/workflows/arraylake-field-bake.yml` — cron every 3h + manual dispatch |
| Runner | `scripts/arraylake/run_dataplane.ps1` — introspect → bake with env loading |
| BFF verify | `GET /api/crep/field/_catalog` → 10 datasets; `GET /api/crep/field/era5/t2m` → graceful `baked:false` (no mock data) |
| Dev server | Restarted on **3010** so `NEXT_PUBLIC_ES_ARRAYLAKE_FIELDS=1` is active |

## Blocked — needs Morgan once

1. **Arraylake auth** (not on dev PC, MAS VM 188, or `.credentials.local`):
   ```powershell
   arraylake auth login
   # or add to website .env.local / GitHub secret:
   # ARRAYLAKE_TOKEN=<token from Earthmover dashboard>
   ```
2. **Introspect + registry confirm:**
   ```powershell
   cd WEBSITE/website
   .\scripts\arraylake\run_dataplane.ps1 -IntrospectOnly
   # Fix any VERIFY zarrVar/timeDim/nativeCrs in lib/crep/fields/registry.ts from arraylake_cubes.json
   ```
3. **Bake + serve:**
   ```powershell
   $env:ARRAYLAKE_FIELD_OUT = "D:\...\WEBSITE\website\public\assets\fields"
   .\scripts\arraylake\run_dataplane.ps1
   # In .env.local (server):
   # ARRAYLAKE_FIELD_BASE=http://localhost:3010/assets/fields   # local
   # ARRAYLAKE_FIELD_BASE=https://mycosoft.com/assets/fields     # prod NAS mount
   ```
4. **Deploy** — only after Morgan approves; set prod env + purge Cloudflare.

## Local test URL

http://localhost:3010/natureos/earth-simulator → layer panel → **Nature & Climate** (14 toggles, default OFF).  
Without baked frames toggles mount but render nothing (correct contract).

## Acceptance criteria (remaining)

- [ ] `arraylake_cubes.json` with real schemas (auth)
- [ ] Registry VERIFY fields confirmed
- [ ] All 10 cubes baked to `ARRAYLAKE_FIELD_OUT`
- [ ] `GET /api/crep/field/era5/t2m` → `baked:true`, non-empty `frames`
- [ ] Earth Sim animates at least one field with `ARRAYLAKE_FIELD_BASE` set
- [ ] GitHub secret `ARRAYLAKE_TOKEN` + prod `ARRAYLAKE_FIELD_OUT` on NAS path
