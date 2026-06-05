# iNat → MINDEX CI Fix + Front-End Test Handoff (Codex)

**Date:** May 27, 2026  
**Status:** CI **fixed on `main`** — Codex owns front-end verification  
**Related:** `MAS/mycosoft-mas/docs/EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md` (MycoBrain markers; separate from fungal/iNat)

---

## CI: fixed (nothing more required for Actions)

| Item | State |
|------|--------|
| Failure | [Run #585](https://github.com/MycosoftLabs/website/actions/runs/26604873157) — `curl` exit 22, **HTTP 409** on `POST /api/etl/inat/sync` |
| Root cause | Website iNat ETL **disabled** (`CREP_WEBSITE_ALLOW_INAT_ETL != 1`). Ingestion moved to **MINDEX ETL** (VM 189, job `inat_obs` ~every 5 min). |
| Fix | `.github/workflows/inat-delta-sync.yml` — **verify** migration (GET status + MINDEX health), no POST to disabled route |
| `main` | Workflow updated; recent runs **success** (e.g. run `26892378940`, ~8s) |

**Do not** re-enable website cron POST or set `CREP_WEBSITE_ALLOW_INAT_ETL=1` on production unless doing a one-off operator diagnostic.

---

## Architecture (what Codex is testing)

```
iNaturalist API
       ↓
MINDEX ETL scheduler (VM 189, inat_obs ~5 min)
       ↓
PostgreSQL + PostGIS (observations, taxon metadata)
       ↓
MINDEX API :8000  ←── website .env MINDEX_API_URL
       ↓
GET /api/crep/fungal?source=mindex-only&bbox=...
       ↓
Earth Simulator / Fungal Atlas / CREP map layers
```

Website **must not** crawl iNat on user map pan/zoom. ETL on the website container is off by design.

---

## Codex front-end test plan

### Environment

| Surface | URL | Notes |
|---------|-----|--------|
| Local dev | http://localhost:3010 | `npm run dev:next-only`; `.env.local` → `MINDEX_API_URL=http://192.168.0.189:8000` |
| Sandbox / prod | https://sandbox.mycosoft.com or https://mycosoft.com | After blue/green deploy from `main` |

### 1. API smoke (browser or curl)

**A. Website delegates iNat ETL (expect disabled)**

```http
GET /api/etl/inat/sync
```

Expect: `ok: true`, `disabled: true` (not 409 on GET).

**B. MINDEX path for map (primary)**

```http
GET /api/crep/fungal?source=mindex-only&bbox=-117.5,32.5,-116.5,33.5&limit=50
```

Optional: `&quick=true` (see flaky note below).

Expect: JSON with observations array **length > 0** when MINDEX is healthy (San Diego bbox often has fungi after ETL).

**C. Production health**

```http
GET /api/health
```

Expect: service `mindex-api` → `status: "up"`.

**D. Direct MINDEX (from LAN only)**

```http
GET http://192.168.0.189:8000/health
GET http://192.168.0.189:8000/api/mindex/observations?source=inat&limit=5
```

Use when website proxy looks empty but VM ETL should have data.

### 2. Earth Simulator UI (manual)

| Step | Action | Pass criteria |
|------|--------|----------------|
| 1 | Open `/natureos/earth-simulator` (or current Earth route) | Map loads, no blocking errors in console |
| 2 | Enable **fungal / iNat / nature** layer (exact label per current UI) | Layer toggle works on desktop + mobile width |
| 3 | Fly to **San Diego** (~32.71, -117.16) | Markers or heat/tiles appear (not empty with “loading” forever) |
| 4 | Click a fungal observation | Popup shows taxon name, date, link to iNat URI when metadata present |
| 5 | Pan/zoom quickly | No full map freeze; no unbounded refetch storm (compare to prior mover/fungal LOD issues) |
| 6 | Repeat on **375px** width | Mobile nav + layer panel usable (44px targets) |

### 3. Known flaky issue (fix if empty map)

**File:** `WEBSITE/website/app/api/crep/fungal/route.ts`

- `quick=true` uses a **~1500ms soft timeout** on MINDEX fetch.
- When MINDEX responds in **~2s**, API may return **empty** `mindex-only` even though data exists.
- **Codex test:** Compare same bbox **with and without** `quick=true`. If only `quick=false` returns data, increase soft timeout or remove quick path for `mindex-only` (website change — OK per this handoff).

### 4. Regression checks

| Check | Fail if |
|-------|---------|
| Mock data | Hardcoded observation arrays in UI or API |
| Website ETL cron | `CREP_WEBSITE_ALLOW_INAT_ETL=1` on prod without intent |
| `mindex-sync-all` inat sink | Still GETs `/api/etl/inat/sync?since=` for observations — GET returns **status only**, not obs list (low priority; MINDEX ETL is canonical) |

---

## MINDEX backend state (for debugging empty map)

VM **192.168.0.189** — patches applied May 27 (may not be on git `main` yet):

- `mindex_etl/scheduler.py` — `inat_obs` every 5 min
- `mindex_etl/jobs/sync_inat_observations.py` — lookback, backfill, 429 retry
- `mindex_api/routers/observations.py` — bbox `ST_Intersects`, taxon in metadata, upsert updates

**Operator follow-up on VM (if map still empty):**

1. Add `INAT_API_TOKEN` to VM `.env`, recreate `api` + `etl` containers
2. Run one-shot backfill (from MINDEX repo on VM):
   ```bash
   docker compose exec -T api python -m mindex_etl.jobs.sync_inat_observations \
     --domain-mode all --per-page 50 --max-pages 5 --lookback-hours 48 --backfill-records 2000
   ```
3. Confirm: `GET .../observations?bbox=...&kingdom=Fungi` returns rows with `taxon_name` / `kingdom` in metadata

---

## Deploy (if testing sandbox/prod UI)

Website **`main`** — use **Instant Deploy / blue-green** only (see `FIELD_MYCOBRAIN_DEPLOY_HANDOFF_MAY27_2026.md`). Purge Cloudflare after cutover.

No deploy needed for the **GitHub Actions** fix — already on `main`.

---

## Handoff summary for Morgan

| Area | Owner | Status |
|------|--------|--------|
| Actions `inat-delta-sync` | Cursor | **Done** on `main` |
| MINDEX ETL + API | Codex / infra | Verify token + backfill on 189 |
| Earth Simulator fungal UI | **Codex** | Run test plan above |
| `quick=true` timeout | **Codex** (website) | Fix if reproduced |
| MycoBrain field markers | Codex | See Earth Simulator MycoBrain handoff (deploy `0b752fc7`+) |

**Paste into Codex:**

> CI for iNat→MINDEX is fixed (workflow verifies MINDEX owns sync). Test Earth Simulator fungal layer: `/api/crep/fungal?source=mindex-only` with SD bbox, with/without `quick=true`, then UI on 3010 and sandbox after deploy. If empty at ~2s MINDEX latency, fix 1500ms soft timeout in `app/api/crep/fungal/route.ts`. MINDEX ETL on 189 — confirm `INAT_API_TOKEN` and backfill if API has no fungi.
