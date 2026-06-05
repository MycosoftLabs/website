# MINDEX NatureOS App — Frontend Handoff for Codex (May 27, 2026)

**Status:** Backend on **189** repaired (disk + Library blobs). **Re-test Library tab on 3010** — your unavailable-state UX should now show real acoustic rows when BFF succeeds.

**Return handoff (Codex UI + Cursor backend):** `MINDEX_CODEX_RETURN_HANDOFF_MAY27_2026.md`

**Master test handoff (SINE + MINDEX + NAS + MQTT context):** `SINE_MINDEX_STACK_CODEX_FRONTEND_TEST_HANDOFF_MAY27_2026.md`

**Target URL (prod):** https://mycosoft.com/natureos/mindex  
**Dev URL:** http://localhost:3010/natureos/mindex (port **3010** only; `npm run dev:next-only`)

---

## Codex frontend work (May 27, 2026 — keep)

You already improved **http://localhost:3010/natureos/mindex** while 189 was disk-full:

- Library shows **storage/API unavailable** clearly (not a broken filter).
- File groups paginated; stay empty until real backend rows arrive.
- Removed duplicate “no files found / no filter match” copy.
- No fake SINE/audio UI without a selected file.
- Post-timeout: **“MINDEX Library storage is unavailable.”**

**Cursor backend fix (same day):** VM root disk was **100%** → pruned **88 GB** local backup; NAS `Library/` on CIFS verified; API returns **2180** acoustic blobs. BFF smoke:

- `GET /api/mindex/library/storage` → `remote_nas: true`, `policy: ok`
- `GET /api/mindex/library/blobs?category=acoustic` → `total: 2180`

Re-run your browser checklist — lists should populate; keep unavailable copy only when BFF actually fails.

---

## What Cursor already did (do not redo)

### MINDEX API on VM 189 (LIVE)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/mindex/health` | 200 | v3.0.0 |
| `GET /api/mindex/stats` | 200 | Fixed missing-table rollback (`stats.py`) |
| `GET /api/mindex/etl-status` | 200 | 17 registry jobs, `pipeline=mindex-master-etl` |
| `GET /api/mindex/console` | 200 | **10,164** taxa, **823,972** obs, NAS mounted |
| `POST /api/mindex/sync` | Queues real ETL | Maps sources → `run_all --jobs` |
| `POST /api/mindex/etl/run` | Per-job run | Body: `{ "job": "inat_taxa" }` |

**NAS (verified on VM):** `available: true`, mount `/mnt/nas/mindex`, ~96.7 GB total, ~9.6 GB used.

Deploy script (for reference): `MINDEX/mindex/_deploy_mindex_console_may27_2026.py`

### Website BFF + UI (in repo, NOT on sandbox yet)

| File | Purpose |
|------|---------|
| `app/api/natureos/mindex/console/route.ts` | Proxy `GET /api/mindex/console` |
| `app/api/natureos/mindex/stats/route.ts` | Real stats + etl-status; **no iNaturalist fallback** |
| `app/api/natureos/mindex/sync/route.ts` | Real sync with `mindexUpstreamHeaders` |
| `app/api/natureos/mindex/etl/run/route.ts` | Per-job ETL proxy |
| `app/api/natureos/mindex/taxa/route.ts` | Auth headers fixed |
| `app/api/mindex/genome-tracks/route.ts` | Uses `/api/mindex/genomes` |
| `app/natureos/mindex/explorer/page.tsx` | `/api/mindex/taxa` |
| `components/natureos/mindex-dashboard.tsx` | `fetchConsole`, `runEtlJob` |
| `components/mindex/tabs/overview-tab.tsx` | NAS + earth totals |
| `components/mindex/tabs/data-pipeline-tab.tsx` | Job table + **Run** buttons |
| `components/mindex/tabs/mindex-dashboard-types.ts` | `MindexConsole`, `EtlJobInfo` |
| `lib/mindex-bff-auth.ts` | `X-Internal-Token` + `X-API-Key` |

MAS doc: `MAS/mycosoft-mas/docs/MINDEX_APP_CONSOLE_MAY27_2026.md`

---

## Your scope (Codex)

### 1. Environment

**Chain RPC (backend only — do NOT add to website `NEXT_PUBLIC_*`):**

| Host | Variable | Provider |
|------|----------|----------|
| MINDEX VM **189** `.env` | `SOLANA_RPC_URL` | QuickNode Solana mainnet (MYCA ledger / `getTokenSupply`) |
| MINDEX VM **189** `.env` | `ETHEREUM_RPC_URL` | Infura mainnet (internal jobs; not exposed on public pages) |

Values live in MAS `.credentials.local` and VM `.env` only. After changing RPC URLs, run `docker compose up -d api --force-recreate` on 189 so the API container picks up env (see `MINDEX/mindex/_configure_chain_rpc_may27_2026.py`).

### 1b. Website dev `.env.local` (unchanged pattern)

In `WEBSITE/website/.env.local` (must match VM):

```env
MINDEX_API_URL=http://192.168.0.189:8000
MINDEX_API_BASE_URL=http://192.168.0.189:8000
MINDEX_INTERNAL_TOKEN=<same as VM .env MINDEX_INTERNAL_TOKENS first value>
# or MINDEX_API_KEY=<VM MINDEX_API_KEY>
# On MINDEX VM 189: MYCA_SOLANA_MINT=EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3
MAS_API_URL=http://192.168.0.188:8001
```

Restart dev server externally after env changes (`npm run dev:next-only` on **3010**).

### 2. Verify locally (logged in as COMPANY / @mycosoft.org)

- [ ] `/natureos/mindex` — Overview shows real counts (not zeros), NAS card, earth entity totals
- [ ] **Data pipeline** tab — 17 jobs listed; **Run** triggers `POST /api/natureos/mindex/etl/run` and shows toast/feedback
- [ ] **Sync** still works via existing sync UI → `POST /api/natureos/mindex/sync`
- [ ] Explorer `/natureos/mindex/explorer` — taxa load from BFF
- [ ] No mock data, no iNat fallback in stats when MINDEX is up

### 3. Frontend gaps (still placeholder or thin)

| Area | Path / note |
|------|-------------|
| Species detail tabs | `[id]` routes — chemistry, bio, network sections may be stubs |
| Map / sensors | Wire to real MINDEX/MAS device APIs if still empty |
| Mobile | `@mobile-engineer` audit at 375px / 390px |
| 501 BFF routes | Run route-validator; fix any proxy returning 501 |
| Earth Search bridge | `lib/search/earth-entity-bridge.ts`, `FluidSearchCanvas.tsx` — separate thread; only if Morgan asks |

### 4. Hard rules

- **Never** re-add iNaturalist totals as fallback when MINDEX counts are zero (`stats/route.ts`).
- **Never** mock taxa/obs/ETL/NAS numbers.
- Empty state + error state only when API fails.
- Website deploy: commit → push → SSH 187 → Docker rebuild with NAS mount → **Cloudflare Purge Everything**.

```bash
docker run -d --name mycosoft-website -p 3000:3000 \
  -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
  --restart unless-stopped mycosoft-always-on-mycosoft-website:latest
```

### 5. Optional BFF improvement

If `GET /api/natureos/mindex/stats` returns 503 but console works, BFF could merge `console.stats` as fallback (backend now returns 200 for `/stats` — verify first).

---

## Quick API smoke (from dev machine)

```powershell
$base = "http://192.168.0.189:8000/api/mindex"
$h = @{ "X-Internal-Token" = $env:MINDEX_INTERNAL_TOKEN }
Invoke-RestMethod "$base/console" -Headers $h
Invoke-RestMethod "$base/stats" -Headers $h
Invoke-RestMethod "$base/etl-status" -Headers $h
```

---

## ETL job names (for Run buttons)

From registry on VM: `inat_taxa`, `gbif`, `mycobank`, `genetics`, `fungidb`, `pubchem`, `chemspider`, etc. (17 total). Sync source map: `iNaturalist`→`inat_taxa`, `GBIF`→`gbif`, `GenBank`→`genetics`.

---

## Out of scope for this handoff

- MINDEX ETL scheduler container (`python -m mindex_etl.scheduler`) — ops on 189 if jobs should run on cron
- Sandbox website deploy was intentionally left to Codex/Morgan
- Earth Simulator / MycoBrain field backend — see `MAS/mycosoft-mas/docs/EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md`

---

## Contact / context

Prior thread: MINDEX app “nothing working” — root cause was wrong BFF paths, taco-only etl-status, fake sync, and missing console API. Backend is fixed and deployed; finish the product in the browser.
