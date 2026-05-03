---
description: Navigate Virtual Petri Dish v2 (May 02, 2026) — R3F + Rust engine via MAS BFF, species from MINDEX, optional SegFormer segment proxy; primary routes /natureos/virtual-petri-dish and /natureos/tools/petri-dish.
---

# Virtual Petri Dish v2 (lab-petri-dish)

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED (NatureOS tools; public marketing may deep-link apps)
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Primary routes**
  - `/natureos/virtual-petri-dish` — full-page v2 (`PetriDishV2App`, R3F `PetriDishViewer`)
  - `/natureos/tools/petri-dish` — tool shell + embed (`petri-dish-embed` → same v2 app when wired)
- **Key components (website)**
  - `components/petri-dish-v2/petri-dish-app.tsx` — health, step/reset/pause, compound preview, species search (`/api/search/unified`), ledger, recording, AI segment
  - `components/petri-dish-v2/viewer.tsx` — Three.js dish, hyphae lines, instanced organisms; `?petriStats=1` for perf overlay
  - `lib/petri-dish-v2/petri-api.ts`, `rest-engine-worker.ts`, `ai-tracker.ts`, `recording.ts`
- **BFF (Next.js)** — browser calls same-origin; server forwards to MAS / seg:
  - `/api/simulation/petri/v2/[[...path]]` → MAS `.../api/simulation/petri/v2/...`
  - `/api/simulation/petri-seg/[[...path]]` → `PETRI_SEG_SERVICE_URL` (default Sandbox `http://192.168.0.187:8051`)

## Success Criteria (Eval)
- [ ] 3D circular dish renders; hyphae / colony instances update after **Step** or auto-play
- [ ] **Health** shows engine reachable (via MAS → `PETRI_ENGINE_V2_URL` on 187:8050) or clear error text
- [ ] Species search returns **real** rows from unified search (empty state if MINDEX unavailable — no fake species cards)
- [ ] Compound / environment sliders change preview state (client + optional engine sync)
- [ ] **AI segment** returns tracks when seg service + ONNX configured; otherwise shows error, not mock masks

## Navigation Path (Computer Use)
1. `mycosoft.com` → NatureOS (`/natureos`)
2. Open **Virtual Petri Dish** (`/natureos/virtual-petri-dish`) or Tools → Petri Dish
3. Wait for **Connecting…** / health to resolve
4. Use **Step**, **Reset**, **Pause**; optional **Auto** for timed steps (worker + REST)
5. Open **Tools** sheet (mobile) or left rail (desktop); pick tool / organism class
6. **Species** — search uses live API; select a row to tag session context
7. **Record** — WebM when supported; MP4 path optional per browser
8. **Compare** — optional MyceliumSeg strip when dataset URLs configured in app

## API surface (for agents / tests)
| Client path | Backend |
|-------------|---------|
| `GET /api/simulation/petri/v2/health` | MAS → Rust `petri_engine_service` |
| `POST /api/simulation/petri/v2/step` | Forwarded JSON body |
| `POST /api/simulation/petri/v2/reset` | Forwarded |
| `POST /api/simulation/petri/v2/pause` | Body `{"paused": true}` safe default |
| `POST /api/simulation/petri-seg/segment` | FastAPI seg service (ONNX optional) |

## Env (website server)
- `MAS_API_URL` — MAS orchestrator for BFF
- `PETRI_SEG_SERVICE_URL` or `NEXT_PUBLIC_PETRI_SEG_SERVICE_URL` — seg proxy target

## MAS / infra
- `PETRI_ENGINE_V2_URL` — e.g. `http://192.168.0.187:8050`
- MINDEX migration `0016_petri_dish_v2.sql` — schema `petri_v2` for sessions/frames/tracks

## Common failure modes
| Symptom | Cause | Action |
|---------|--------|--------|
| 503 on `/api/simulation/petri/v2/*` | MAS missing `PETRI_ENGINE_V2_URL` or engine down | Set env on 188; start `petri_engine_service` on 187 |
| Empty species list | MINDEX/search unreachable | Check `MINDEX_API_URL` / unified search |
| AI segment 502 | Seg service not running | Start `services/petri_seg_service` on 187, set `MYCELIUMSEG_ONNX_PATH` if using ONNX |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-compound-simulator, lab-lifecycle-simulator, lab-growth-analytics, workflow-research-pipeline

## Docs (MAS repo)
- `docs/PETRI_DISH_V2_ARCHITECTURE_MAY02_2026.md`
- `docs/PETRI_DISH_V2_RUNBOOK_MAY02_2026.md`
- `docs/PETRI_DISH_V2_COMPLETE_MAY02_2026.md`

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
