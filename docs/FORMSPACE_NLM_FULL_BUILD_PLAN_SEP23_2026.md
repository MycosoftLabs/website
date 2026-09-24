# FormSpace + Nature Learning Model Full Build Plan — September 23, 2026

**Date:** September 23, 2026  
**Status:** FormSpace track P0–P1 (+ P2 training inject) **complete** (`FORMSPACE_FULL_APP_COMPLETE_SEP23_2026.md`); NLM track P0 complete / P1 substantial (`NLM_P0_P1_BUILD_PROGRESS_SEP23_2026.md`)  
**Owner:** Morgan Rockcoons (approves website edits & deploy)  
**Related:** `docs/ai/nlm.md`, `docs/ai/formspace.md`, `CODEX_HANDOFF_SI_FORMSPACE_NLM_SEP22_2026.md`, `FORMSPACE_NLM_REPOSITORY_MAP_SEP09_2026.md`, `FORMSPACE_NLM_IMPLEMENTATION_STATUS_SEP09_2026.md`, `NLM_P0_P1_BUILD_PROGRESS_SEP23_2026.md`, `FORMSPACE_FULL_APP_COMPLETE_SEP23_2026.md`  
**MAS pointer:** `MAS/mycosoft-mas/docs/FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md` (symlink-style stub to this file)

---

## Executive definition (read first)

| Term | What it is | What it is NOT |
|------|------------|----------------|
| **Nature Learning Model (NLM)** | A **family of signal-state / scenario learning models** that learn from calibrated physical measurements (spectral, acoustic, bioelectric, thermal, chemical, mechanical) via Nature Message Frames (NMF), encoders, temporal state-space backbones, fusion, training objectives, and structured state outputs | **Not** a language model. **Not** a chatbot. **Not** “domain-specific LLM for mycology.” **Not** Ollama / GGUF / chat inference. MYCA chat models live in a separate compartment (`models/myca`). |
| **FormSpace** | Mycosoft’s **typed atlas / chart** for organized states: coordinates, attractors, recovery, reachability, evidence contracts. NLM writes sensor-derived coordinates; FormSpace interprets and tests them | Not a paper-only page. Not Platonic metaphysics as product claim. Not ITDX/Army demo language on public FormSpace surfaces. |

Canonical science language: white papers `docs/ai/nlm.md` and `docs/ai/formspace.md`. Older docs that call NLM an “LLM” (e.g. historical foundation notes) are **wrong** and must not guide copy or architecture.

---

## 1. Vision

Make **FormSpace** and **NLM** fully functional product applications — in **parallel** — so that:

1. **Logged-out visitors** get a strong, honest demo (catalog + dashboards + seeded **scientific base models**, real empty states when live sensors/weights are unavailable).
2. **Logged-in users** get identity, durable memory, saved models, training jobs, ingest, lineage, and agent-orchestrated runs.
3. Every tab is wired to **real** Supabase / MAS / MINDEX / NAS / Merkle services — **no mock data**, no Firebase product path, no invented probabilities.
4. FormSpace engine + graphing tools run as real middle/back-end services, not filler UI.
5. NLM training uses real training engines, modality encoders, FormSpace chart injection, Merkle-rooted artifacts, and agent runtime.
6. Live ingest shows **1–2 real devices with sensors** when data is present; otherwise clear **no-data** states.

### Non-goals (this program)

- Do **not** implement in the planning task (this document only).
- Do **not** change website code without Morgan’s **explicit** permission per change set.
- Do **not** brand, describe, or route NLM through Ollama / chat LLMs / GGUF.
- Do **not** claim fungal “language decoding,” universal cognitive equivalence, or CMMC compliance.
- Do **not** invent Hugging Face / GitHub download URLs (leave **Release pending** until real artifacts exist).
- Do **not** put CUI in these repos or commercial AI tools.
- Do **not** stop Sandbox primary (187) until a blue-green candidate returns HTTP 200 with NAS mount.

---

## 2. Current state vs required (gap)

### What already exists (useful foundation)

| Surface | Status |
|---------|--------|
| FormSpace white paper + KaTeX renderer | Live on localhost paths `/docs/ai/formspace`, product excerpt `/ai/formspace` (Sep 22) |
| NLM white paper (signal-native) | `docs/ai/nlm.md` — canonical definition |
| NLM training **UI shell** | `components/natureos/nlm-training/*` embedded on `/myca/nlm` and `/natureos/model-training` |
| Website BFF stubs | `/api/natureos/nlm-training/*` (models, runs, variants, seed, mindex, mycobrain, preferences, status) |
| MAS FormSpace Stage B | `mycosoft_mas/nlm/formspace/` — ledger + causal pipeline (local verified Sep 09); forecast weights often absent |
| MAS `/api/nlm` | Health / observations / forecasts; **must** stay `model_loaded=false` until NAS scientific artifacts; refuses GGUF |
| Scientific NLM package | `CODE/MAS/NLM` — SSM / graph / heads (not Llama) |
| MINDEX | `nlm_router` NMF persist; acoustic library ingest; `mica` Merkle schema (BLAKE3/CBOR); training SQL migrations |
| Compartment rule | NAS `models/nlm` = scientific NLM; `models/myca` = MYCA chat — **never mix** |

### Critical gaps (blockers)

| Gap | Evidence | Required |
|-----|----------|----------|
| Firebase still in product UI | `Dashboard.tsx`, `AgentControlCenter.tsx`, `AvaniGuardian.tsx`, `IngestionConsole.tsx`, `FingerprintStudio.tsx`, `CreateModel.tsx` import `@/lib/nlm/firebase-hooks` / Firestore | Remove Firebase from product path; Supabase + MINDEX only |
| Client “seed” as truth | Hardcoded base models + `localStorage` variant seed in Dashboard | Server-side **canonical catalog** in MINDEX/registry; idempotent ensure API |
| FormSpace app is mostly paper/downloads | `/ai/formspace` ≠ full artifact program tool | Full FormSpace application: atlas, graphs, perturbation workflows, auth-aware memory |
| FormSpace math not in training loop | Sep 22 handoff | Training config + evaluation inject FormSpace charts / recovery / conformal gates |
| Forecast / weights | Often `model_loaded=false`; frozen ITDX synthetic ≠ production NLM | Calibrate/reuse past real runs; promote only provenance-backed checkpoints on NAS |
| Merkle UI vs ledger | Explorer UI exists; end-to-end not proven | Every model/dataset/job → Merkle root + ECDSA + optional ZK proof on MINDEX |
| Agent panels | Firebase / incomplete MAS binding | Real MAS agent tasks on 188:8001 |
| Ingest honesty | Frames from Firebase era | Live MycoBrain / device registry; show device+sensor when present, empty when not |
| Copy risk | Historical “LLM” framing in some old MAS docs | Public + internal product language follows white paper only |

---

## 3. Architecture

```text
Browser (logged-out demo | logged-in workspace)
  │
  ├─ Next.js FE (3010 / Sandbox 187:3000)
  │     FormSpace App    NLM App (training + dashboards)
  │
  ├─ Website BFF  /api/formspace/*  /api/natureos/nlm-training/*  /api/nlm/*
  │     Auth session (Supabase) · no secrets in NEXT_PUBLIC_*
  │
  ├─ Supabase
  │     Auth · profiles · user memory · saved models · preferences (product plane)
  │
  ├─ MAS 192.168.0.188:8001
  │     /api/nlm (inference, health)
  │     FormSpace engine (atlas, dynamics, graphing jobs)
  │     Training orchestrator + agent runtime (MYCA tasking)
  │     NEVER loads models/myca or *.gguf for NLM
  │
  ├─ Scientific NLM workers (MAS/NLM package + GPU when needed)
  │     Modality encoders · SSM backbone · fusion · task heads
  │     Checkpoints: safetensors/onnx on NAS /mnt/.../models/nlm
  │
  ├─ MINDEX 192.168.0.189:8000
  │     NMF / RootedNatureFrame timeline
  │     Model registry · training runs · library blobs
  │     Merkle / mica ledger · ZK proof store
  │
  └─ NAS 192.168.0.105
        models/nlm/**          scientific weights + model cards
        mindex/Library/**      rooted frames, acoustic, sensor archives
        website/assets/**      media (Sandbox mount required)
```

### Layer responsibilities

| Layer | Owns |
|-------|------|
| **FE** | FormSpace app UX, NLM training dashboards, logged-out demo chrome, empty states |
| **Website BFF** | Auth gating, proxy to MAS/MINDEX, never invent metrics |
| **MAS** | FormSpace engine, NLM training job orchestration, agent runtime, `/api/nlm` inference |
| **MAS/NLM package** | Encoders, training loop math, checkpoint I/O |
| **MINDEX** | NMF persistence, catalog, Merkle roots, timeline queries |
| **NAS** | Weights, rooted frame binaries, library media |
| **Chain** | Append-only Merkleized object ledger + ECDSA + ZK proofs (see §7) |
| **Devices** | MycoBrain / registered sensors → real ingest only |

---

## 4. Auth & UX matrix

| Capability | Logged-out | Logged-in |
|------------|------------|-----------|
| FormSpace paper / SI overview | Full | Full |
| FormSpace **demo atlas** (seeded charts, replay trajectories from published fixtures with provenance) | Yes — labeled **Demo / catalog** | Yes + personal overlays |
| FormSpace live inference against user’s devices | No / CTA to sign in | Yes if devices + data exist; else empty |
| FormSpace saved charts, experiments, memory | No | Yes (Supabase + MINDEX refs) |
| NLM top-of-page **dashboard** | Fully functional **demo**: catalog models, pipeline explainers, graphs from **seeded catalog metrics** (real registry rows, not random) | Same + **user** jobs/models/memory |
| NLM create / train / save | CTA | Full |
| Ingest console | Show architecture + empty or public demo stream if one exists | Live devices; empty if offline |
| Merkle explorer | Public read of **catalog** lineage | Full personal + catalog |
| Agents | Read-only explanation | Task MYCA/MAS agents |
| Downloads | Real links or **Release pending** | Same + owned artifacts |

**Honesty rule:** Demo catalog rows are **real registry records** (hard-coded scientific catalog seeded server-side once). They are not fake live sensor streams. Live panels abstain or show no-data when sensors/weights are unavailable.

---

## 5. Seed model catalog (concrete — robust bases, not placeholders)

Server-side idempotent catalog in MINDEX (`nlm.model_registry` / equivalent). Each entry: `model_id`, `family`, `modalities[]`, `scenario`, `objective`, `architecture_ref`, `checkpoint_status` (`catalog_only` | `weights_on_nas` | `calibrating`), `provenance`, `formspace_chart_ids[]`.

### 5.1 By sensor / modality family

| ID | Name | Primary modalities | Objective |
|----|------|--------------------|-----------|
| `nlm-spectral-base-v1` | NLM-Spectral Base | RGB, IR, multispectral, LiFi pulse | Spectral state / stress / object patches |
| `nlm-acoustic-air-v1` | NLM-Acoustic Air | Mic, STFT/Mel | Species/event/anomaly (air) |
| `nlm-acoustic-hydro-v1` | NLM-Acoustic Hydro | Hydrophone | Underwater events / mammals / vessels |
| `nlm-bioelectric-fci-v1` | NLM-Funga Bioelectric | FCI voltage, impedance | Fungal state transitions |
| `nlm-thermal-base-v1` | NLM-Thermal | BME/temp arrays, IR | Thermal gradients / fire onset features |
| `nlm-chemical-voc-v1` | NLM-VOC / Chemical | BME688 heater profiles, VOC/VSC/CO2 | Gas class + drift-corrected smell |
| `nlm-mechanical-vib-v1` | NLM-Mechanical | Accel, pressure, seismic | Vibration / propeller / structural |
| `nlm-soil-env-v1` | NLM-Soil | Moisture, EC, pH, temp | Soil health / stress |
| `nlm-weather-micro-v1` | NLM-Weather | Station + ERA5 context | Microclimate forecast (abstain if unbound) |
| `nlm-fusion-multimodal-v1` | NLM-Fusion | Cross-modal | Multi-device world state |

### 5.2 By species / scenario (training targets)

| ID | Scenario | Notes |
|----|----------|-------|
| `nlm-scen-mycelium-growth-v1` | Mycelium / colony growth | Imagery + bioelectric + humidity |
| `nlm-scen-fungal-smell-v1` | Fungal VOC / smell signatures | Chemical primary |
| `nlm-scen-bee-acoustic-v1` | Bees / hive acoustics | Air acoustic |
| `nlm-scen-dolphin-acoustic-v1` | Dolphins | Hydro |
| `nlm-scen-whale-acoustic-v1` | Whales | Hydro + long-horizon |
| `nlm-scen-propeller-uav-v1` | Propeller / drone rotor | Mechanical + acoustic UAV |
| `nlm-scen-drone-visual-v1` | Drones (visual/spectral) | Spectral + motion |
| `nlm-scen-lightning-v1` | Lightning / EM-optical events | Spectral + RF if available |
| `nlm-scen-fire-thermal-v1` | Fire / wildfire onset | Thermal + VOC + weather context |
| `nlm-scen-light-spectrum-v1` | Spectrum of light / LiFi | Spectral / optical comms features |
| `nlm-scen-gas-plume-v1` | Gas plumes / contamination | Chemical + wind context |
| `nlm-scen-petri-virtual-v1` | Virtual Petri / lab culture | Simulation → NMF bridge |

### 5.3 Reuse from past calibrated work

| Source | Action |
|--------|--------|
| Acoustic library (ESC-50, MBARI, SINE detectors) | Promote as **encoder baselines** + training datasets with Merkle hashes — not as chat models |
| FormSpace Stage B ledger + acceptance oracles | Keep as **validation fixtures**; do not promote synthetic ITDX `weights.pt` as production forecast NLM |
| NAS `/models/nlm` incoming checkpoints | Calibrate, card, promote with provenance; fail-closed if missing |
| Frozen ITDX v1.4 FormSpace lab | `legacy_reference` only — labeled synthetic; never set `model_loaded=true` from it |

---

## 6. Parallel workstreams + phases (P0–P3)

Two parallel tracks from day one. Website FE work requires Morgan’s explicit go-ahead before coding.

### Workstream A — FormSpace application

| Phase | Focus | Owners (agents / repos) |
|-------|-------|-------------------------|
| **P0** | Product IA: FormSpace app shell (tabs: Atlas, Graphs, Experiments, Evidence, Memory); kill filler; wire BFF stubs; auth matrix; demo catalog charts | `website-dev` + `frontend-dev` (WEBSITE) after Morgan permission; `documentation-manager` |
| **P1** | FormSpace **engine API** on MAS: chart CRUD, trajectory compute, recovery/perturbation jobs, graph exports; MINDEX persistence of Form States | `backend-dev` + `api-developer` (MAS); `database-engineer` (MINDEX) |
| **P2** | Graphing tools (real series from engine); inject FormSpace into NLM training configs; shadow inference | MAS FormSpace + NLM training; `scientific-systems` |
| **P3** | Blue-green deploy FormSpace+NLM surfaces; operator studies; promote only evidenced charts | `deploy-pipeline` + `regression-guard` |

### Workstream B — NLM application (training + runtime)

| Phase | Focus | Owners |
|-------|-------|--------|
| **P0** | Kill Firebase/localStorage mocks; migrate hooks to Supabase/MINDEX; server seed of §5 catalog; logged-out dashboard from catalog; empty-state audit all tabs | `website-dev` (after permission); `backend-dev`; `security-auditor` |
| **P1** | Training engine: real jobs on MAS/NLM workers; variants; ingest console ← MycoBrain/devices; graphs from job metrics; user memory | `backend-dev`; `device-firmware` / `mycobrain-ops`; `data-pipeline` |
| **P2** | Merkle+ECDSA+ZK lineage; RootedNatureFrame timeline on NAS; agent runtime (AgentControlCenter → MAS); FormSpace-coupled evaluation | `database-engineer`; MAS merkle/mica owners; `integration-hub` |
| **P3** | Multi-device ingest; cross-device transfer tests; edge export (onnx); blue-green ship; NLM-Bench subset green | `test-engineer`; `deploy-pipeline`; `scientific-systems` |

### Sequencing (what blocks what)

```text
P0 mock-kill + catalog seed
  → blocks honest logged-out demo and logged-in memory
P0 auth matrix
  → blocks saved models
P1 training workers + NAS weights path
  → blocks “train” as real
P1 device ingest
  → blocks live ingest panel
P1 FormSpace engine API
  → blocks FormSpace app beyond paper
P2 Merkle chain
  → blocks trustworthy lineage UI
P2 agent wiring
  → blocks Agent / AVANI tabs
P3 blue-green
  → blocked until P0–P2 verification gates green on localhost
```

---

## 7. Chain / Merkle / ZK design

### Recommendation

**Do not build a Bitcoin-style PoW chain.** Build an **application-specific Merkleized evidence ledger** (append-only, content-addressed), with:

1. **Content hashing:** Prefer continuing MINDEX `mica` content-addressed objects; **normalize public product proofs to SHA-256** of canonical CBOR/JSON for interoperability with Morgan’s requirement (or dual-hash: internal BLAKE3 + published SHA-256 attestation).
2. **Tree:** Binary Merkle tree over batch of NMF / model / job leaves → `merkle_root`.
3. **Signing:** **ECDSA (P-256 or secp256k1 — pick one org-wide; recommend P-256)** over `(merkle_root || timestamp || producer_id)`.
4. **ZK:** **Zcash-inspired** succinct proofs for *membership / non-disclosure*: prove a frame or model is in a rooted timeline **without revealing** sibling payloads. Start with **Halo2-style or groth16 circuit over Merkle path** (research spike in P2); ship **transparent Merkle inclusion proofs** in P1 if ZK circuit is not ready — never fake ZK badges.

### Efficiency rationale

| Option | Verdict |
|--------|---------|
| Bitcoin / public L1 | Rejected — latency, cost, irrelevant consensus |
| Full Ethereum L2 for every frame | Overkill for lab/field rates |
| **MINDEX mica + SHA-256 attestation + ECDSA + optional ZK** | Fits existing `0021_mica_merkle_ledger.sql`, NAS binaries, and scientific rates |

### Data path

```text
Raw sample → calibrate → NMF → (optional RootedNatureFrame)
  → hash leaf (SHA-256)
  → append mica.ca_object / event_object
  → batch Merkle root
  → ECDSA sign
  → store proof + root on MINDEX
  → binary payload on NAS (storage_ref)
  → Explorer UI reads roots only (empty if none)
```

---

## 8. API / endpoint inventory (build or wire)

### Website BFF (new or harden)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/formspace/atlas` | Charts / Form States (auth-aware) |
| POST | `/api/formspace/graph` | Graphing job proxy |
| POST | `/api/formspace/experiment` | Perturbation / recovery trial |
| GET | `/api/formspace/demo` | Logged-out demo catalog |
| * | `/api/natureos/nlm-training/*` | Already present — remove mock backends; bind real |
| GET | `/api/natureos/nlm-training/catalog` | Canonical seed model catalog |
| GET | `/api/natureos/nlm-training/ingest/live` | Devices+sensors or empty |
| GET | `/api/nlm/hero-runtime` | Keep honest abstain when unbound |

### MAS (188)

| Path | Purpose |
|------|---------|
| `/api/nlm/health`, load, observations, forecasts | Existing — fail-closed |
| `/api/formspace/*` (new) | Engine: atlas, dynamics, graphs |
| `/api/nlm/training/jobs` | Start/status/metrics for signal-model training |
| `/api/nlm/agents/*` or MYCA task APIs | Agent runtime for training/ops |
| Device heartbeat / network devices | Ingest source of truth |

### MINDEX (189)

| Path | Purpose |
|------|---------|
| `POST/GET /nlm/nmf` | Existing NMF persist |
| Model registry CRUD | Catalog + user models |
| Training run lineage | Job ↔ Merkle root |
| `mica` / Merkle APIs | Roots, inclusion proofs, signatures |
| Library blobs / acoustic | Dataset refs for acoustic NLMs |
| Rooted frame timeline | NAS `storage_ref` + time index |

---

## 9. Ingest + device path (real only)

1. **Primary path:** MycoBrain service (8003) → MAS device registry → BFF `/ingest/live`.
2. **Show in UI:** `device_id`, display name, role, sensor channels, last sample age, NMF/frame id if persisted.
3. **If no device / no samples:** empty state copy — never synthetic waveforms.
4. **Target for P1 demo:** 1–2 registered devices with at least one live modality (e.g. BME environmental + one bioelectric or acoustic if available).
5. **NAS:** Rooted frame binaries under `mindex/` library paths; DB holds hashes + refs only.

---

## 10. Verification / acceptance tests

### P0

- [ ] Zero Firebase imports under `components/natureos/nlm-training` and `lib/nlm` product path  
- [ ] No `localStorage` as source of truth for models/variants  
- [ ] Catalog seed idempotent via API; Dashboard loads from registry  
- [ ] Logged-out NLM dashboard renders catalog without auth  
- [ ] Grep clean for mock/fake/`Math.random` metrics in training UI  

### P1

- [ ] Logged-in create model → durable row survives refresh  
- [ ] Train job produces real metrics from worker (or honest failed/unavailable)  
- [ ] Ingest shows real device+sensor **or** empty  
- [ ] FormSpace engine returns chart/trajectory JSON for demo chart id  

### P2

- [ ] Every training artifact has Merkle root + ECDSA signature in MINDEX  
- [ ] Explorer shows root; empty when none  
- [ ] Agent task UI → MAS → completion event stored  
- [ ] FormSpace fields present on training job config  

### P3 / ship

- [ ] Localhost:3010 acceptance suite green  
- [ ] Blue-green: candidate HTTP 200 + NAS mount before cutover  
- [ ] Origin `192.168.0.187:3000` + public URL verified; Cloudflare purged  
- [ ] No Ollama branding in NLM/FormSpace UI copy  

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| LLM framing creeps back into copy/docs | Gate on white paper language; reject “LLM/Ollama/chat” in NLM product PRs |
| Firebase leftover | P0 hard ban; CI grep |
| Synthetic ITDX weights promoted | Keep `legacy_reference`; never `model_loaded=true` from synthetic |
| Website edit without permission | Plan-only now; Morgan gates each FE PR |
| 187 downtime during deploy | Blue-green rule; restore-only if site down |
| ZK circuit delay | Ship transparent Merkle proofs first; ZK as P2 additive |
| No live devices | Empty ingest OK; do not fabricate |
| Scope explosion (chemistry GitHubs, etc.) | Stay on sensor/scenario catalog; defer unrelated links |

---

## 12. Public / internal language checklist

**Allowed:** Nature Learning Model, signal-state model, scenario model, modality encoder, NMF, FormSpace atlas, RootedNatureFrame, Merkle lineage, training engine, forecast head, abstain/no-data.

**Forbidden on NLM/FormSpace product surfaces:** LLM, large language model, chatbot-as-NLM, Ollama, GGUF-as-NLM, “domain-specific LLM for mycology,” fake confidence scores, mock sensor streams.

---

## 13. Immediate next actions (after Morgan approves plan)

1. Morgan approves this plan + grants **scoped website permission** for P0 FormSpace shell + NLM mock-kill.  
2. Spin parallel agent tracks A/B per §6.  
3. Land server-side catalog seed (§5) before any marketing “demo models” claim.  
4. Do not Instant Deploy until P0–P2 gates pass on localhost.

---

## Document control

| Field | Value |
|-------|-------|
| Filename | `FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md` |
| Location | `WEBSITE/website/docs/` (canonical) |
| MAS index | Pointer entry in CURSOR_DOCS_INDEX + MASTER_DOCUMENT_INDEX |
| Implementation | **NLM track in progress** — see `NLM_P0_P1_BUILD_PROGRESS_SEP23_2026.md` |
