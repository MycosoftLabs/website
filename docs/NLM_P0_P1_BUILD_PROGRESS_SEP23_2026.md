# NLM Full Functional Path — P0/P1 Progress — September 23, 2026

**Date:** September 23, 2026  
**Status:** P0 complete · P1 substantially landed · P2 partial (Merkle transparent proofs)  
**Track:** Nature Learning Model only (FormSpace engine ownership stays with FormSpace sibling)  
**Plan:** `docs/FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md`  
**Permission:** Morgan explicit BUILD NOW — website + backend

---

## Shipped

### P0 — Honest demo + Firebase kill

| Item | Status |
|------|--------|
| Canonical §5 catalog (modality + scenario + legacy bases) | Done — `lib/nlm/canonical-seeds.ts` (~32 models) |
| Public catalog API | Done — `GET /api/natureos/nlm-training/catalog` |
| Models API serves catalog logged-out | Done — merges catalog + optional live MAS card + auth Supabase rows |
| Variants API public catalog read | Done |
| Seed API full catalog + public GET status | Done |
| Firebase product path removed | Done — `firebase-hooks` → `api-hooks`; `firebase.ts` throws; writes via `bff-store` |
| Zero `firebase/firestore` imports under `nlm-training` | Verified |
| Zero `Math.random` fabricated metrics in `nlm-training` | Verified |
| Logged-out dashboard = catalog demo; CTA to sign in | Done |
| Empty states for sensors / fingerprints / acoustic / agents CPU | Done |

### P1 — Training / ingest / wiring

| Item | Status |
|------|--------|
| Live ingest BFF | Done — `GET /api/natureos/nlm-training/ingest/live` (MycoBrain/MAS devices or empty) |
| IngestionConsole live device panel | Done |
| Training runs via Supabase BFF | Existing + BFF write shim |
| MAS training export refuses GGUF/Ollama | Done — safetensors/onnx/pt only |
| MAS `/api/nlm/training/attest` | Done — SHA-256 Merkle + ECDSA P-256 + transparent inclusion proofs |
| MAS `/api/nlm/training/health` | Done |
| Frame commit → MAS attest / MINDEX NMF | Done — `POST .../mindex` (503 if both down; no synthetic roots) |
| FormSpace chart IDs on training request model | Present on MAS `StartTrainingRequest` (consume FormSpace APIs when ready) |

### Tests

- `vitest run lib/nlm/canonical-seeds.test.ts` — **3 passed**
- `merkle_attest.attest_payloads` — ECDSA signed locally

---

## Still open

| Item | Phase | Notes |
|------|-------|-------|
| Durable Supabase seed of full catalog (needs auth owner session) | P1 | Idempotent POST ready; run when logged in as owner |
| GPU worker training producing live loss curves | P1/P2 | Jobs queue to MAS; metrics empty until worker reports |
| AgentControlCenter → full MAS task completion events | P2 | Agents list soft-wired; no fake CPU |
| ZK succinct proofs (Halo2/groth16) | P2 | Transparent Merkle proofs ship now; ZK deferred |
| RootedNatureFrame NAS timeline end-to-end | P2 | Attest + NMF persist path ready; NAS binary archive follow-up |
| FormSpace engine injection into eval loop | P2 | Consume FormSpace sibling APIs — do not own FormSpace engine |
| Blue-green deploy NLM surfaces | P3 | Not cut over this task |
| MINDEX `nlm.model_registry` table CRUD | P1/P2 | Catalog currently in-memory + Supabase `nlm_models`; promote to MINDEX registry when migration ready |

---

## Language lock

- NLM = **Nature Learning Model** (signal-state / scenario) — **not** an LLM  
- No Ollama / GGUF branding on NLM product surfaces  
- Demo catalog = real registry seeds (`catalog_only`), not fake live streams  

---

## Key paths

| Layer | Path |
|-------|------|
| Catalog | `WEBSITE/website/lib/nlm/canonical-seeds.ts` |
| Hooks | `WEBSITE/website/lib/nlm/api-hooks.ts`, `bff-store.ts` |
| BFF | `app/api/natureos/nlm-training/{catalog,ingest/live,models,variants,seed,mindex}` |
| MAS | `mycosoft_mas/nlm/merkle_attest.py`, `core/routers/nlm_training_api.py` (`/attest`, `/export`, `/health`) |
| UI | `/myca/nlm` via `NlmTrainingApplication` |

---

## Verify locally

1. `http://localhost:3010/myca/nlm` logged-out → catalog models visible  
2. `GET /api/natureos/nlm-training/catalog` → §5 IDs  
3. `GET /api/natureos/nlm-training/ingest/live` → devices or empty  
4. No Firebase / Math.random under `components/natureos/nlm-training`
