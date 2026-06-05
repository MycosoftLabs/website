# Unified Acoustic Library + Nature Learning Model — Master Specification (May 27, 2026)

> **Active focus (May 27):** Acoustic classifier only. See **`MINDEX/mindex/docs/ACOUSTIC_CLASSIFIER_SCOPE_MAY27_2026.md`** — chemistry / DNA / materials GitHub links are **out of scope** until acoustic Library + SINE are green.

**Purpose:** Single source of truth for Morgan’s unified plan. Use this document to:
1. **Codex** — complete and harden **backend** (MINDEX VM 189, NAS, detectors, LAN exposure, NLM ingest).
2. **New model / agent** — design and implement the **high-end acoustic classifier** inside MINDEX Library (not mock UI).
3. **Cursor / ops** — VM disk, network, deploy, live stack (MAS/MQTT optional).

**Primary dev URLs:**
- MINDEX app: `http://localhost:3010/natureos/mindex`
- SINE player: `http://localhost:3010/sensing/sine/player`
- Product (prod): `https://mycosoft.com/sensing/sine`

**Hard rule:** No mock data in production paths. Empty/error states only when APIs fail.

---

## 1. What Morgan asked for (consolidated)

### 1.1 Acoustic sensing + SINE product

| Request | Intent |
|---------|--------|
| Build **SINE** acoustic library end-to-end | `https://mycosoft.com/sensing/sine` wired to real NAS + MINDEX |
| Store audio on **NAS** `\\192.168.0.105\mycosoft.com\mindex` (VM mount `/mnt/nas/mindex`) | Library files must not live on full VM root disk |
| **VM efficiency** on MINDEX **189** | Disk cleanup, CIFS mount, API container with `mindex_etl` + NAS volume |
| **Test, check, move to next steps** | Verify from **dev PC BFF (3010)**, not only SSH-on-VM |
| **Codex frontend** after backend | Polish MINDEX app; deploy website when approved |
| **Live network** healthy | MAS **188**, MINDEX **189**, MQTT **196**, Earth Simulator devices |
| **Plug in Nature Learning Model (NLM)** | Start with **acoustic player + files** as first integration test |
| **High-end functional acoustic classifier** in Library | Built-in detection: frequency, activity, bird, UAV, NPS, deep-signal, visualization |

### 1.2 Upstream acoustic projects (requested — server-side SINE)

These are the **acoustic** references Morgan wanted integrated into analysis (not cloned as full git submodules in repo):

| Detector ID | Upstream | Integration style in repo |
|-------------|----------|---------------------------|
| `frequency_fft` | [arduino-audio-tools](https://github.com/pschatzmann/arduino-audio-tools) (FFT peak concept) | Python FFT in `mindex_api/services/sine_acoustic/frequency.py` |
| `activity_auditok` | [auditok](https://github.com/amsehili/auditok) | Pip dependency; `activity.py` |
| `bird_microsoft` | [microsoft/acoustic-bird-detection](https://github.com/microsoft/acoustic-bird-detection) | **Heuristic** mel/harmonic scorer in `bird.py` — not full ONNX pipeline yet |
| `uav_rotor` | [Acoustic-UAV-Identification](https://github.com/pcasabianca/Acoustic-UAV-Identification) | **Heuristic** harmonic stack in `uav.py` |
| `nps_discovery_match` | [nationalparkservice/acoustic_discovery](https://github.com/nationalparkservice/acoustic_discovery) | Profile match in `nps_match.py` |
| `deep_signal_features` | [deep-signal](https://github.com/dimastatz/deep-signal) | Single-file spectral embedding in `deep_signal.py` — **not** full Spark cluster |
| `visualisation_sonic` | [Sonic Visualiser](https://www.sonicvisualiser.org/) | Waveform + STFT JSON in `visualisation.py` |

**Honest:** Upstream repos were **not** vendored or installed as full codebases. MINDEX implements **registry + pipeline + heuristics** aligned to those projects. Production-grade weights (ONNX, Spark, published bird models) are **follow-up** for the “new model” workstream.

### 1.3 Chemistry / materials / DNA computing links (separate track — NOT done)

Morgan also listed these URLs for broader **NLM / scientific computing** context. They are **not** integrated into the acoustic Library stack as of May 27, 2026:

| Resource | URL | Status |
|----------|-----|--------|
| Open Chemistry | https://github.com/openchemistry | Not cloned/integrated |
| Awesome Python Chemistry | https://github.com/lmmentel/awesome-python-chemistry | Reference only |
| Awesome Cheminformatics | https://github.com/hsiaoyi0504/awesome-cheminformatics | Reference only |
| Datasets for MLPs | https://github.com/Arif-PhyChem/datasets_and_databases_4_MLPs | Reference only |
| MatChem-LLM | https://github.com/materials-data-facility/matchem-llm | Reference only |
| Awesome chemistry datasets | https://github.com/kjappelbaum/awesome-chemistry-datasets | Reference only |
| DNA computing simulators | zobront, UC-Davis simd-dna, vitortterra, DNA-and-Natural-Algorithms-Group/multistrand, gigasquid/chemical-computing | Not integrated |
| Cantera | https://cantera.org/ | Not integrated |
| DWSIM | https://dwsim.org/index.php/download/ | Not integrated |

**NLM repo** (`MAS/NLM/`) exists as a package skeleton; **acoustic ingest** runs via `mindex_etl/jobs/ingest_nlm_audio_p0` on MINDEX, not via cloning the chemistry GitHub list above.

---

## 2. System architecture

```mermaid
flowchart TB
  subgraph dev [Dev PC port 3010]
    UI[MINDEX App + Library Tab + SINE Player]
    BFF[Next.js API routes]
  end
  subgraph vm189 [MINDEX VM 192.168.0.189]
    API[MINDEX API :8000]
    PG[(Postgres library.blob)]
    NASmount["/mnt/nas/mindex CIFS"]
  end
  subgraph nas [NAS 192.168.0.105]
    Files[Library/acoustic WAVs]
  end
  subgraph vm188 [MAS VM 192.168.0.188]
    MAS[Orchestrator :8001]
  end
  subgraph nlm [NLM future]
    Classifier[Acoustic Classifier Service]
  end
  UI --> BFF
  BFF -->|HTTP X-Internal-Token| API
  API --> PG
  API --> NASmount
  NASmount --> Files
  BFF --> MAS
  API -->|POST analyze| Classifier
  Classifier -.->|reads WAV| NASmount
```

| Path | Protocol | Required for Library + SINE |
|------|----------|----------------------------|
| Dev BFF → **189:8000** | HTTP + `X-Internal-Token` | **Gate 0** — must pass from dev machine |
| API → Postgres **189:5432** | SQL (`library.blob`) | Blob list + metadata |
| API → **NAS CIFS** | Filesystem | Stream/analyze WAV |
| API → **NLM classifier** (planned) | In-process or sidecar | High-end detection |

---

## 3. Frontend inventory (WEBSITE/website) — complete

### 3.1 Pages

| Route | File | Role |
|-------|------|------|
| `/natureos/mindex` | `app/natureos/mindex/page.tsx` (+ layout) | Main MINDEX console |
| `/natureos/mindex/explorer` | `app/natureos/mindex/explorer/page.tsx` | Taxa explorer |
| `/sensing/sine/player` | `app/sensing/sine/player/page.tsx` | Standalone SINE acoustic player |

### 3.2 MINDEX dashboard tabs (`components/mindex/tabs/`)

| Tab | File | Data sources |
|-----|------|----------------|
| Overview | `overview-tab.tsx` | `/api/natureos/mindex/console`, stats |
| Encyclopedia | `encyclopedia-tab.tsx` | taxa BFF |
| Data pipeline | `data-pipeline-tab.tsx` | ETL status, run job |
| **Library** | **`library-tab.tsx`** | **`/api/natureos/mindex/library`**, storage, stream, SINE analyze |
| Genomics, Chemistry, Bio, Devices, etc. | respective `*-tab.tsx` | various BFF |
| Types / nav | `mindex-dashboard-types.ts`, `mindex-nav-items.ts` | shared types |

### 3.3 Library tab — frontend behavior (Codex + Cursor, keep)

**File:** `components/mindex/tabs/library-tab.tsx` (~3000+ lines)

**Designed for real data only:**
- Categories, pagination, file groups (acoustic, spectral, bioelectric, chemical, thermal, tactile).
- **Storage card** — NAS/API availability; shows **“MINDEX Library storage is unavailable”** when backend unreachable (not a filter bug).
- **No duplicate** “no files found” / “no filter match” messaging.
- **No fake SINE/audio** visualization when no file selected.
- **Audio element** playback via stream URL.
- **Waveform / spectrum** via `Oscilloscope`, `SpectrumAnalyzer` when preview/analysis data exists.
- **Detector result fields** mapped from backend (when analysis run):
  - `frequency_detections`, `activity_segments`, `bird_detections`, `uav_detections`, `nps_detections`, `deep_signal_matches`
  - Legacy aliases: `acoustic_events`, `pattern_matches`, `sine_matches`

**BFF aggregation:** `app/api/natureos/mindex/library/route.ts`  
- Fetches `GET /api/mindex/library/storage`, `GET /api/mindex/library/blobs?category=...`, optional SINE status.  
- Builds catalog via `lib/mindex/library-files.ts` (`buildMindexLibraryCatalog`).  
- **Critical:** `resolveMindexServerBaseUrl()` → `MINDEX_API_URL` (default `http://192.168.0.189:8000`).

**Related BFF:**
- `app/api/natureos/mindex/library/file/route.ts` — single file / stream proxy

### 3.4 SINE acoustic player (standalone)

**File:** `components/sensing/sine-acoustic-player.tsx`

| Feature | BFF |
|---------|-----|
| List blobs | `GET /api/mindex/sine/library/blobs` |
| Stream | `GET /api/mindex/sine/library/blobs/{id}/stream` |
| Analyze | `POST /api/mindex/sine/blobs/{id}/analyze` |
| Analysis JSON | `GET /api/mindex/sine/blobs/{id}/analysis` |
| Visualisation | `GET /api/mindex/sine/blobs/{id}/visualisation` |
| Status | `GET /api/mindex/sine/status` |

Canvas: waveform (green stroke), spectrogram (heatmap), detection event list — **no render until real `vis` JSON**.

### 3.5 Website BFF — MINDEX + SINE routes

**Catch-all proxy:** `app/api/mindex/[[...path]]/route.ts`

**SINE-specific:**
- `app/api/mindex/sine/status/route.ts`
- `app/api/mindex/sine/detectors/route.ts`
- `app/api/mindex/sine/library/blobs/route.ts`
- `app/api/mindex/sine/library/blobs/[id]/stream/route.ts`
- `app/api/mindex/sine/blobs/[id]/analyze/route.ts`
- `app/api/mindex/sine/blobs/[id]/analysis/route.ts`
- `app/api/mindex/sine/blobs/[id]/visualisation/route.ts`

**NatureOS MINDEX:**
- `app/api/natureos/mindex/console/route.ts`
- `app/api/natureos/mindex/stats/route.ts`
- `app/api/natureos/mindex/sync/route.ts`
- `app/api/natureos/mindex/etl/run/route.ts`
- `app/api/natureos/mindex/taxa/route.ts`
- `app/api/natureos/mindex/library/route.ts`
- `app/api/natureos/mindex/library/file/route.ts`
- (plus genomes, compounds, ledger, integrity proxies — see repo list)

**Auth:** `lib/mindex-bff-auth.ts` — `fetchMindexWithAuthRetry`; prefers `MINDEX_INTERNAL_TOKEN` or first `MINDEX_INTERNAL_TOKENS` value; retries with `MINDEX_API_KEY` on 401.

### 3.6 Website `.env.local` (dev PC — must match VM)

```env
MINDEX_API_URL=http://192.168.0.189:8000
MINDEX_API_BASE_URL=http://192.168.0.189:8000
MINDEX_INTERNAL_TOKEN=<first token from VM MINDEX_INTERNAL_TOKENS>
MAS_API_URL=http://192.168.0.188:8001
NEXT_PUBLIC_MAS_API_URL=http://192.168.0.188:8001
```

Restart dev server externally after changes: `npm run dev:next-only` (port **3010** only).

### 3.7 Frontend verification checklist (from dev machine)

```powershell
$h = @{ "X-Internal-Token" = $env:MINDEX_INTERNAL_TOKEN }

# Gate 0 — direct to VM (must succeed)
Invoke-WebRequest "http://192.168.0.189:8000/api/mindex/health" -UseBasicParsing -TimeoutSec 12
Invoke-RestMethod "http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=3" -Headers $h

# Gate 1 — BFF
Invoke-RestMethod "http://localhost:3010/api/natureos/mindex/library" -Headers $h
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/status" -Headers $h
```

**Browser (logged in COMPANY):**
1. `/natureos/mindex` → Library tab → files list, select row, play audio.
2. `/sensing/sine/player` → select clip → Run analysis → waveform/spectrogram/events.

---

## 4. Backend inventory (for Codex) — MINDEX VM 189

### 4.1 Repos and paths

| Repo | Path | VM |
|------|------|-----|
| MINDEX | `MINDEX/mindex/` | `/home/mycosoft/mindex` on **189** |
| MAS | `MAS/mycosoft-mas/` | **188** |
| NLM package | `MAS/NLM/` | dev / future service |
| Website | `WEBSITE/website/` | dev **3010**; prod **187** |

### 4.2 MINDEX API — Library + SINE

| Component | Path |
|-----------|------|
| Library router | `mindex_api/routers/library.py` |
| SINE router | `mindex_api/routers/sine_acoustic.py` |
| SINE services | `mindex_api/services/sine_acoustic/*.py` |
| NAS helper | `mindex_etl/library/nas_mount.py` |
| Migrations | `migrations/20260604_library_blob_labels_may27_2026.sql`, `migrations/20260605_sine_acoustic_stack_may27_2026.sql` |
| Audio ingest | `mindex_etl/jobs/ingest_nlm_audio_p0.py` |
| Tests | `tests/test_sine_acoustic_pipeline.py` |
| Docs | `docs/SINE_ACOUSTIC_BACKEND_MAY27_2026.md` |

### 4.3 MINDEX API endpoints (internal token)

**Library:**
```
GET  /api/mindex/library/storage
GET  /api/mindex/library/catalog
GET  /api/mindex/library/blobs?category=acoustic&limit=&offset=
GET  /api/mindex/library/blobs/{id}
GET  /api/mindex/library/blobs/{id}/stream
POST /api/mindex/library/import
```

**SINE:**
```
GET  /api/mindex/sine/status
GET  /api/mindex/sine/detectors
POST /api/mindex/sine/blobs/{id}/analyze
GET  /api/mindex/sine/blobs/{id}/analysis
GET  /api/mindex/sine/blobs/{id}/visualisation
```

**Console / ETL (MINDEX app other tabs):**
```
GET  /api/mindex/console
GET  /api/mindex/stats
GET  /api/mindex/etl-status
POST /api/mindex/sync
POST /api/mindex/etl/run
```

### 4.4 Database + NAS (verified on VM when healthy)

| Asset | Value |
|-------|--------|
| `library.blob` acoustic rows | **2180** (ingested; MBARI Pacific Sound, etc.) |
| NAS mount | `//192.168.0.105/mycosoft.com/mindex` → `/mnt/nas/mindex` |
| NAS Library size | ~88G+ on CIFS (after rsync from local backup) |
| VM root disk | Was **100%**; pruned to **~10%** after removing local backup dir |

### 4.5 API container requirements

```bash
# On 189 — container must have:
# - Publish 0.0.0.0:8000:8000  (LAN reachable from dev PC)
# - Volumes: mindex_api, mindex_etl, /mnt/nas/mindex
# - DATABASE_URL=postgresql://mindex:mindex@mindex-postgres:5432/mindex  (docker network hostname)
# - MINDEX_INTERNAL_TOKENS synced with service token
# - pip install -e '.[sine]'  # numpy scipy soundfile auditok
```

**Ops scripts (MAS/MINDEX):**
- `MINDEX/scripts/_prune_disk_and_verify_library_may27.py`
- `MINDEX/scripts/_expose_mindex_api_lan_may27.py`
- `MINDEX/scripts/_fix_api_db_and_lan_may27.py`
- `MINDEX/scripts/finish_mindex_nas_and_sine_may27_2026.py`
- `MINDEX/_deploy_sine_acoustic_may27_2026.py`

### 4.6 Known backend gaps (Codex must close)

| Gap | Symptom | Fix |
|-----|---------|-----|
| **LAN exposure** | Dev PC `TcpTestSucceeded` false on :8000 | Bind `0.0.0.0:8000`, firewall allow 192.168.0.0/24 |
| **DB URL in container** | `library/blobs` **503** after recreate | `DATABASE_URL` → `mindex-postgres:5432` |
| **Auth mismatch** | **401** from dev with wrong token | Sync `MINDEX_INTERNAL_TOKEN` in website `.env.local` |
| **SINE pip deps** | Analyze fails / partial | `pip install -e '.[sine]'` in API image |
| **Heuristic detectors only** | Bird/UAV not production ONNX | New model workstream |
| **Chemistry repos** | Not in stack | Separate NLM phase |

---

## 5. Network & verification state (honest timeline)

| Check | VM localhost (SSH) | Dev PC → 189:8000 | Dev PC → 3010 BFF |
|-------|------------------|-------------------|-------------------|
| Health | 200 (sometimes `db: degraded`) | Was **timeout**; after expose script **200** | Depends on 189 |
| library/blobs | 200 / 503 / 401 at various times | **401** then needs DB fix | **timeout** when 189 down |
| library/storage | `remote_nas: true` when DB+NAS OK | Same gate | Same gate |

**Morgan/Codex are correct:** VM-only verification does **not** prove the website BFF path. **Gate 0** is mandatory:

`http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=3` → **200** with `total > 0` **from the dev machine**.

---

## 6. Nature Learning Model (NLM) — plug-in plan

### 6.1 First test (acoustic player + files)

**Order of operations:**
1. Pass **Gate 0** and **Gate 1** (section 3.7).
2. Confirm **stream** plays in browser (`<audio src="/api/.../stream">`).
3. Run **`POST /api/mindex/sine/blobs/{id}/analyze`** on one MBARI WAV; confirm analysis JSON populates Library tab detector panels.
4. Wire **NLM** as the orchestration/training layer that **owns detector registry + future model weights** (repo `MAS/NLM/`), while MINDEX remains execution host on 189.

### 6.2 Target “high-end acoustic classifier” (new model scope)

**In scope for new agent:**
- Replace or augment heuristics in `bird.py`, `uav.py`, `deep_signal.py` with **real models** (ONNX/Torch), staged on NAS under `/mnt/nas/mindex/models/acoustic/`.
- Unified **classification API** on MINDEX: e.g. `POST /api/mindex/library/blobs/{id}/classify` returning multi-label scores + explainability.
- Persist results in `library.blob` analysis JSON or `library.analysis_run` table.
- Library tab reads persisted results (frontend already mapped).

**Out of scope for first acoustic test:**
- Full chemistry/DNA/Cantera/DWSIM integration (section 1.3).
- MQTT live device ingest (separate; Earth Simulator / MycoBrain).

### 6.3 Suggested NLM service shape

```
NLM (train/registry)  →  exports detector configs + weights to NAS
MINDEX API (189)      →  loads weights, runs inference on blob stream
Website BFF (3010)    →  unchanged proxy pattern
```

---

## 7. Work split (three agents)

| Owner | Responsibility |
|-------|----------------|
| **Codex — backend** | LAN :8000, Docker API+DB+NAS, tokens, `pip install .[sine]`, verify all MINDEX endpoints from **dev PC**, ingest jobs, deploy docs, chemistry/NLM ingest **only if scoped** |
| **Codex — frontend** (done/pause) | Library UX, no mock, pagination, unavailable states — **do not revert** |
| **New model — classifier** | Production detector pipeline, weights, classify API, persistence, benchmarks on 2180 blobs |
| **Cursor — ops** | VM disk prune (done), Proxmox/SSH, MAS/MQTT, handoff docs |

---

## 8. Acceptance criteria (Definition of Done)

### 8.1 Acoustic Library MVP

- [ ] From **dev PC**: `library/blobs?category=acoustic&limit=3` → **200**, `total >= 2180`
- [ ] From **3010 BFF**: `/api/natureos/mindex/library` returns files with `root_status` / storage **ok** (not `missing`)
- [ ] Library tab: list → select → **audio plays** → waveform/spectrum visible
- [ ] **POST analyze** returns detector JSON; UI shows frequency/activity/bird/UAV/NPS/deep-signal blocks
- [ ] No mock labels, no fake canvas, no iNat fallback for counts

### 8.2 NLM integration phase 1

- [ ] NLM documents detector taxonomy aligned with `detector_registry.py`
- [ ] At least one **non-heuristic** model path (e.g. bird ONNX) running on 189
- [ ] Classify results stored and reloadable without re-running full analysis

### 8.3 Production deploy (Morgan approval)

- [ ] Website commit → Sandbox **187** + NAS mount + Cloudflare purge
- [ ] Compare `localhost:3010` vs `sandbox.mycosoft.com/natureos/mindex`

---

## 9. Related documents

| Doc | Role |
|-----|------|
| `MINDEX_CODEX_RETURN_HANDOFF_MAY27_2026.md` | Short return after disk fix |
| `MINDEX_APP_CONSOLE_FRONTEND_HANDOFF_MAY27_2026.md` | Codex UI scope |
| `MINDEX_BACKEND_CURSOR_COMPLETE_MAY27_2026.md` | Backend checklist |
| `SINE_MINDEX_STACK_CODEX_FRONTEND_TEST_HANDOFF_MAY27_2026.md` | SINE + stack diagram |
| `MINDEX/mindex/docs/SINE_ACOUSTIC_BACKEND_MAY27_2026.md` | SINE API detail |
| `MAS/mycosoft-mas/docs/LIVE_NETWORK_STACK_STATUS_MAY27_2026.md` | MAS/MQTT/Earth |
| `MAS/mycosoft-mas/docs/EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md` | Field devices |

---

## 10. Prompt snippet for “new model” agent

> You are building the **Mycosoft MINDEX Acoustic Classifier** for the Library tab and SINE player. Read `UNIFIED_ACOUSTIC_LIBRARY_NLM_MASTER_SPEC_MAY27_2026.md`. Assume frontend in `library-tab.tsx` and `sine-acoustic-player.tsx` is complete and maps `frequency_detections`, `activity_segments`, `bird_detections`, `uav_detections`, `nps_detections`, `deep_signal_matches`. Implement production-grade inference on MINDEX VM **189**, NAS-mounted WAVs, Postgres `library.blob` (2180 acoustic rows). Do not use mock data. Start by making `POST /api/mindex/library/blobs/{id}/analyze` and classify endpoints return real scores from at least one trained/exported model on NAS. Chemistry/GitHub list in section 1.3 is **out of scope** unless explicitly added later.

---

**Document owner:** Cursor (MAS/MINDEX/website coordination)  
**Last updated:** May 27, 2026  
**Status:** Living spec for unified plan — update when Gate 0 passes consistently from dev PC.
