# MINDEX Backend Handoff — Cursor Complete (May 27, 2026)

**Status:** Complete — MINDEX/SINE/NAS/Library verified on **189** (disk pruned, **2180** blobs); Codex return: `MINDEX_CODEX_RETURN_HANDOFF_MAY27_2026.md`  
**Source requests:** `MINDEX_BACKEND_CURSOR_REQUESTS_JUN03_2026.md`  
**MINDEX VM:** `192.168.0.189:8000`  
**Dev UI:** `http://localhost:3010/natureos/mindex` (do **not** restart port 3010 from this thread)

---

## What Cursor delivered

### Deployed to VM 189 (live)

| Area | Result |
|------|--------|
| Taxonomy / Encyclopedia | `GET /api/mindex/taxa` → **200** (tiered fallback when `bio.taxon_full` / media grants unavailable) |
| Ledger / Solana | `GET /api/mindex/ledger` → **200**, public mainnet RPC + fallbacks |
| Integrity | `summary`, `anchors/recent`, `records/recent`, `record/{id}`, `days/{date}/leaves` → **200** |
| ETL console | `etl-status`, `console`, `POST /sync`, `POST /etl/run` → **200** |
| Bio plane | `GET /api/mindex/bio/summary` → **200** |
| Data tab APIs | `GET /api/mindex/data/catalog`, `GET /api/mindex/data/search?q=...` → **200** |
| Storage / network | `GET /api/mindex/storage/nodes`, `/network/nodes` → **200** (migration + fallback) |
| Compounds | `GET /api/mindex/compounds` → **200** (empty until PubChem/ChemSpider ingest completes) |
| Genomes | `GET /api/mindex/genomes` → **200** (empty until `bio.genome` populated) |
| DB grants | `migrations/20260603_grants_bio_obs_core_superuser.sql` applied as **postgres** |
| Network schema | `migrations/20260603_network_storage.sql` applied |
| Observation joins | `scripts/backfill_observation_taxon_ids.py` run on VM |
| Content hashes | `scripts/backfill_content_hashes.py` run on VM |
| ETL (bounded) | `mycobank`, `pubchem`, `genetics`, `traits` incremental runs (`--max-pages 3`) on VM |

### Website BFF fixes (local repo — not deployed to sandbox)

| File | Fix |
|------|-----|
| `app/api/mindex/integrity/record/[id]/route.ts` | Upstream path `integrity/record/{id}` (was `records/`) |
| `app/api/mindex/integrity/proof/[id]/route.ts` | Same |
| `app/api/mindex/integrity/verify/[id]/route.ts` | Same |
| `app/api/mindex/integrity/records/recent/route.ts` | **New** — proxies MINDEX `records/recent` |
| `app/api/natureos/mindex/genomes/route.ts` | Uses `fetchMindexWithAuthRetry` (internal token + API key) |
| `app/api/natureos/mindex/genomes/route.ts` | No demo fallback (prior session) |
| `app/api/natureos/mindex/compounds/route.ts` | Explicit empty/error, no mock data |

Deploy script: `MINDEX/mindex/_deploy_mindex_handoff_complete_may27_2026.py`

---

## Codex test checklist (frontend + backend)

Use **logged-in** dev session (`MINDEX_INTERNAL_TOKEN` or `MINDEX_API_KEY` in website `.env.local`).

### 1. Overview / console

- [ ] `GET /api/natureos/mindex/stats` — taxon ~10k+, observations ~824k, not zeros
- [ ] `GET /api/natureos/mindex/console` — NAS mounted, 17 ETL jobs, `taxonomy_diagnostics` present
- [ ] Biological panel shows **registered, empty** only where tables are still empty (genomes/compounds/traits until longer ETL)

### 2. Encyclopedia

- [ ] `GET /api/natureos/mindex/taxa?limit=50` → 200, rows with names
- [ ] Search `?q=amanita` → 200
- [ ] Species detail loads when `taxon_id` present on observations (backfill improved joins; may need more ETL/backfill batches)

### 3. Data pipeline

- [ ] Data tab lists 17 jobs from `/api/natureos/mindex/sync` or console
- [ ] **Run** on `mycobank` / `pubchem` / `genetics` via `POST /api/natureos/mindex/etl/run` — job queues on 189
- [ ] After long runs, `/api/natureos/mindex/compounds` and `/genomes` show `source: "mindex"` with rows

### 4. Integrity + ledger

- [ ] Integrity summary shows numeric `taxon.total` (hashed may still be partial until backfill completes)
- [ ] `GET /api/mindex/integrity/records/recent?limit=8` → items (BFF + MINDEX alias)
- [ ] Hash chain visualizer loads record by id without 503 path mismatch
- [ ] `GET /api/natureos/mindex/ledger` → Solana connected, MYCA mint supply readable

### 5. Storage / library

- [ ] Storage tab: `network/nodes` or `storage/nodes` returns NAS + Sandbox nodes
- [x] **Acoustic ingest running on 189** — `library.blob` + NAS `Library/acoustic/` (see `MINDEX/mindex/docs/NLM_AUDIO_INGEST_STARTED_MAY27_2026.md`)
- [x] **NAS CIFS live on 189** — `GET /api/mindex/library/storage` → `remote_nas: true`, `fstype: cifs`, ~7.2 TB free (May 27 2026 verify)
- [x] Library tab: `GET /api/mindex/library/blobs?category=acoustic` → **200**, **2180** rows (sample verified)
- [x] **3010 BFF** — `/api/mindex/library/storage` and `/api/mindex/library/blobs` → **200**, same totals (after disk prune)
- [x] **VM disk prune** — removed `/var/lib/mindex-nas-local-backup-20260604005520`; root **~10%** used (~88 GB free). Script: `scripts/_prune_disk_and_verify_library_may27.py`
- [ ] `POST /api/mindex/library/import` to extend sources / raise `--max-gb` (up to NAS capacity)
- [ ] **Codex UI** — re-verify Library tab populates (see `MINDEX_CODEX_RETURN_HANDOFF_MAY27_2026.md`; Codex fixed empty/unavailable UX while disk was full)

### 6. SINE acoustic player (May 27 2026)

- [x] `GET /api/mindex/sine/status` → **200**, 7 detectors, **2180** acoustic blobs
- [x] `GET /api/mindex/library/blobs?category=acoustic` → **200** (BFF + direct 189)
- [ ] `POST /api/mindex/sine/blobs/{id}/analyze` → frequency, auditok, bird, UAV, NPS, deep-signal features (needs numpy/scipy/soundfile in API image for full pipeline)
- [x] Dev BFF: `http://localhost:3010/api/mindex/sine/status` → **200**
- [ ] Dev player UI: `http://localhost:3010/sensing/sine/player` (manual browser check)
- Doc: `MINDEX/mindex/docs/SINE_ACOUSTIC_BACKEND_MAY27_2026.md`

**VM API container (May 27):** `mindex-api` runs `mindex-etl:latest` with `-v mindex_api`, `-v mindex_etl`, `-v /mnt/nas/mindex`, `MINDEX_INTERNAL_TOKENS` synced from service token. Recreate: `scripts/_recreate_api_with_etl_may27_2026.py`.

### 6. Sandbox deploy (when Morgan approves)

1. Commit **website** BFF changes + any UI tweaks Codex makes  
2. Push → SSH 187 → rebuild container + NAS mount  
3. Purge Cloudflare  
4. Compare `localhost:3010` vs `sandbox.mycosoft.com/natureos/mindex`

---

## Known limits (honest, not mock)

| Item | State |
|------|--------|
| `bio.genome` / `bio.compound` row counts | Often **0** until full ETL runs (bounded 3-page jobs seeded data only) |
| `bio.taxon_full` rich image counts | Needs **media** schema grants; list still works via `core.taxon` fallback |
| Bitcoin Umbrel / Hypergraph / Platform One full rails | Health stubs only; Solana read path is live |
| Umbrel / P1 credentials | Server-side `.env` on 189 only — never in UI |

### Run longer ETL on 189 (ops)

```bash
# On MINDEX VM, after SSH:
cd /home/mycosoft/mindex
docker compose exec -T api python -m mindex_etl.jobs.run_all --incremental --jobs pubchem --max-pages 50
docker compose exec -T api python -m mindex_etl.jobs.run_all --incremental --jobs genetics --max-pages 20
docker compose exec -T api python scripts/backfill_observation_taxon_ids.py --max-batches 500
```

---

## Environment (website `.env.local`)

```env
MINDEX_API_URL=http://192.168.0.189:8000
MINDEX_API_BASE_URL=http://192.168.0.189:8000
MINDEX_INTERNAL_TOKEN=<first value from VM MINDEX_INTERNAL_TOKENS>
MAS_API_URL=http://192.168.0.188:8001
```

Optional publish (Request 004): `MYCORRHIZAE_PUBLISH_KEY` server-side only in BFF — never `NEXT_PUBLIC_*`.

---

## Approval criteria for deployment

- All checklist items above pass on **3010** against live **189** API  
- No `source: "demo"` on genomes/compounds routes  
- Encyclopedia and observations usable without HTTP 500 on taxa  
- Integrity hash-chain can load at least one record when anchors exist in `ledger.anchor`  
- Morgan signs off → sandbox deploy + Cloudflare purge per `deployment-checklist.mdc`

**Related:** `MINDEX_APP_CONSOLE_FRONTEND_HANDOFF_MAY27_2026.md` (Codex UI scope)
