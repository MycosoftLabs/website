# SINE Phase One Deploy Readiness Checklist

Date: June 6, 2026

Prepared by: Codex

Repo: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

Branch observed: `codex/myca-website-security-boundary`

## Scope

This is the deploy-owner checklist for the Website-side SINE Phase One work.

Phase One makes the SINE frontend and BFF honest, playable, high-definition, and ready to receive real backend model evidence. It does not claim that the acoustic classifier is scientifically complete.

Current truth:

- Real acoustic files load from MINDEX/NAS.
- The SINE player can stream real WAV audio.
- The shared player renders high-density browser-side waveform and spectrogram scope from real audio when backend visualisation is low-resolution or unavailable.
- The UI refuses to treat detector-only backend output as confirmed sound meaning.
- ESC-50 startup rows and the current broad first page are UUID-backed locally.
- MINDEX still needs real PyTorch/TorchScript/ONNX or transformer inference, prototype/vector evidence, fusion rows, and evidence-backed sound transcripts before SINE is real AI.

## Stage Set

Review and stage only SINE-lane files when Morgan approves committing.

Frontend/shared player:

```text
app/sensing/[slug]/page.tsx
app/sensing/sine/player/page.tsx
components/sensing/sine-acoustic-player.tsx
components/mindex/tabs/library-tab.tsx
lib/mindex/sine-contract.ts
scripts/sine-phase-one-smoke.mjs
scripts/sine-player-browser-smoke.mjs
scripts/sine-no-fake-frontend-smoke.mjs
scripts/sine-aistudio-merge-audit.mjs
scripts/sine-release-gate.mjs
scripts/sine-external-repo-audit.mjs
```

Website BFF and MINDEX proxy routes:

```text
app/api/mindex/sine/blobs/[id]/analysis/route.ts
app/api/mindex/sine/blobs/[id]/analyze/route.ts
app/api/mindex/sine/blobs/[id]/visualisation/route.ts
app/api/mindex/sine/status/route.ts
app/api/mindex/sine/models/route.ts
app/api/mindex/sine/models/[model_id]/route.ts
app/api/mindex/sine/prototypes/route.ts
app/api/natureos/mindex/library/route.ts
app/api/natureos/mindex/library/classify/route.ts
app/api/natureos/mindex/sine/training/human-tags/route.ts
```

SINE handoff docs that are useful to keep:

```text
docs/codex-handoffs/SINE_PLAYER_SHARED_SURFACES_HANDOFF_JUN05_2026.md
docs/codex-handoffs/SINE_REAL_AI_CLASSIFIER_BACKEND_CURSOR_PROMPT_JUN06_2026.md
docs/codex-handoffs/SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md
docs/codex-handoffs/SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md
docs/codex-handoffs/SINE_PHASE_ONE_DEPLOY_READINESS_JUN06_2026.md
```

Optional SINE docs to review before staging because there are many overlapping drafts:

```text
docs/codex-handoffs/SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md
docs/codex-handoffs/SINE_FRONTEND_MERGE_AUDIT_JUN06_2026.md
docs/codex-handoffs/SINE_OBJECTIVE_COMPLETION_AUDIT_JUN06_2026.md
docs/codex-handoffs/SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md
docs/codex-handoffs/SINE_REAL_AI_BACKEND_CURSOR_FINAL_HANDOFF_JUN06_2026.md
docs/codex-handoffs/SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md
docs/codex-handoffs/SINE_REAL_SYSTEM_UPGRADE_PLAN_JUN05_2026.md
```

## Do Not Stage

Do not stage the whole dirty Website tree.

Avoid unrelated files unless another owner explicitly includes them:

```text
app/api/crep/**
app/api/earth-simulator/**
app/dashboard/crep/**
components/crep/**
components/ui/map.tsx
components/search/**
lib/crep/**
public/data/crep/**
screenshots/**
artifacts/**
.codex-*
var/**
tsconfig.tsbuildinfo
```

`tsconfig.tsbuildinfo` changed from local type-check activity and should not be staged unless the repo intentionally tracks TypeScript cache churn.

## Frontend Behavior Added

Shared SINE player behavior now includes:

- Same `SineAcousticPlayer` used by `/sensing/sine`, `/sensing/sine/player`, and MINDEX Library Acoustic.
- Real MINDEX/NAS audio stream with a native browser fallback control.
- High-definition scope preference using real decoded audio when backend scope is lower-resolution.
- Oscilloscope-style waveform/spectrogram/spectrum/waterfall controls.
- Selection, loop, reverse, markers, wave notes, and human identification UI.
- Human tags and model/human disagreement UI.
- Evidence contract gates so semantic labels require model/prototype/fusion/transcript evidence.
- `File` readiness filter: `All`, `Analysis ready`, `Playback only`.
- `Registration gaps` quick action that reloads the broad catalog and filters to playback-only rows.

Important QA attributes:

```text
data-sine-player="true"
data-sine-player-mode="standalone|embedded|compact"
data-sine-catalog-status
data-sine-loaded-files
data-sine-analysis-ready-files
data-sine-playback-only-files
data-sine-file-readiness-filter
data-sine-selected-record-mode
data-sine-selected-analysis-id
data-sine-model-runtime-live
data-sine-model-evidence-present
data-sine-readiness-label
data-sine-scope-source
```

## Local Validation Already Run

Latest focused SINE validation from Codex:

```powershell
npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx --file app/api/mindex/sine/blobs/[id]/visualisation/route.ts
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010
node scripts/sine-player-browser-smoke.mjs --base=http://localhost:3010 --timeout=90000
node scripts/sine-no-fake-frontend-smoke.mjs
node scripts/sine-aistudio-merge-audit.mjs
node scripts/sine-external-repo-audit.mjs
node scripts/sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010 --run-analysis
git diff --check -- components/sensing/sine-acoustic-player.tsx docs/codex-handoffs/SINE_PLAYER_SHARED_SURFACES_HANDOFF_JUN05_2026.md docs/codex-handoffs/SINE_REAL_AI_CLASSIFIER_BACKEND_CURSOR_PROMPT_JUN06_2026.md app/api/mindex/sine/blobs/[id]/visualisation/route.ts lib/mindex/sine-contract.ts
```

Results:

- SINE lint passed.
- Full TypeScript check passed.
- SINE Phase One smoke script passed with warnings for missing real model/prototype evidence.
  - Latest script result: `instrument_ready_ai_pending`, 5 pass, 3 warn, 0 fail.
  - Expected warnings: low-resolution backend oscilloscope visualisation, no loaded model runtime proof, and no prototype rows yet.
- New default visualisation-quality probe:
  - Uses the first UUID-backed ESC-50 row.
  - Requests `quality=oscilloscope`, `max_waveform_points=8192`, `max_frequency_bins=256`, `max_time_frames=1024`, `fft_size=2048`, `hop_length=128`, and `include_peaks=true`.
  - Current backend response is reachable but still low resolution: `waveform_points=800`, `spectrogram_rows=64`, `spectrogram_columns=44`, `fft_size=null`, `hop_length=null`.
  - This remains a backend blocker for authoritative MINDEX scope output, even though the Website can fall back to browser-real-audio visualization from the actual WAV stream.
- Optional analysis probe:
  - Use `--run-analysis` only when it is acceptable to POST one short ESC-50 analysis/evidence-contract request.
  - This fails if MINDEX returns a semantic identification without confirmed model/prototype/fusion/transcript evidence.
  - It warns, not fails, when the run is honest detector-only or model-evidence-pending.
  - Current result on June 6, 2026: `--run-analysis` fails, correctly, because MINDEX returns a semantic identification with no proven model outputs, no fusion evidence, no evidence-backed transcripts, and an unproven prototype-like match.
- Rendered-player browser smoke:
  - Latest result: `ready_with_warnings`, 16 pass, 1 warn, 0 fail.
  - June 7 post-crash recheck: `/sensing/sine` and `/sensing/sine/player` both render the shared player with 36 loaded, 36 analysis-ready, 0 playback-only, 8192 waveform points, 256 x 1024 spectrogram, 31 sound targets, no browser console/page errors, and `data-sine-readiness-label="Instrument ready / AI pending"`.
  - June 8 verifier hardening: `scripts/sine-player-browser-smoke.mjs` now has a watchdog and crash-report path so Playwright/browser weirdness emits JSON with the failing surface instead of a blank `No JSON payload returned` failure.
  - `/natureos/mindex`: warning only because the headless browser was redirected to login. Use `--require-mindex` only when the verifier has an authenticated browser/session or the deploy target intentionally exposes the route.
- Frontend no-fake-semantics smoke:
  - `node scripts/sine-no-fake-frontend-smoke.mjs`
  - Latest result: `clean`, 15 files scanned, 0 findings.
  - This guards the Website SINE lane from accidentally importing the AI Studio Gemini/mock/generated-WAV classifier code while allowing defensive quarantine strings in the player.
- AI Studio merge audit:
  - `node scripts/sine-aistudio-merge-audit.mjs`
  - Latest result: `ready`, 14 pass, 0 warn, 0 fail.
  - This proves the safe AI Studio concepts and pasted ChatGPT backend spec are represented in the shared Website player/Cursor handoff: chronological transcripts, high-definition scope, oscilloscope controls, architecture/prototype panels, human correction, evidence gates, transcript schema, deterministic DSP, 512D embeddings, and evidence fusion.
  - It also proves the unsafe prototype server behavior remains excluded: Gemini, mock acoustic rows, generated WAV streams, synthetic visualisation matrices, metadata semantic fallback, and hard-coded demo meanings.
- Consolidated release gate:
  - `node scripts/sine-release-gate.mjs --base=http://localhost:3010 --timeout=45000`
  - Latest post-crash result on June 8: `frontend_ready_backend_pending`, 45 pass, 5 warn, 0 fail.
  - This runs the no-fake frontend guard, AI Studio merge audit, external audio repo audit, API/backend contract smoke, and rendered-player browser smoke in one command.
  - The remaining warnings are expected until Cursor fixes backend oscilloscope visualisation, model runtime proof, prototype rows, authenticated MINDEX embed verification, and the known GMTK local checkout limitation is either resolved or kept as design-reference-only.
  - `scripts/sine-release-gate.mjs` now bounds each child smoke step. If a child hangs, the gate reports the timed-out step instead of hanging the deploy check.
  - `scripts/sine-player-browser-smoke.mjs` now uses a bounded retry when a rendered player snapshots during transient audio decode/page state, then still fails if the retry cannot produce high-density scope.
- External audio repo audit:
  - `node scripts/sine-external-repo-audit.mjs`
  - Latest result: `ready`, 9 pass, 1 warn, 0 fail.
  - The warning is `ilge/gmtk-audio-classification` because historical filenames can fail Windows checkout. Treat GMTK as a git-object/design reference unless the checkout is repaired.
  - The other requested repos are verified locally under `.codex-artifacts/sine-repos` with concrete implementation patterns found.
- Diff whitespace check passed.

Browser probe on `http://localhost:3010/sensing/sine?codex_gap_action=1780700396769`:

- `Registration gaps` button was visible and clicked.
- After broad catalog reload:
  - `data-sine-loaded-files=36`
  - `data-sine-analysis-ready-files=36`
  - `data-sine-playback-only-files=0`
  - `data-sine-file-readiness-filter=playback-only`
  - `data-sine-filtered-files=0`
  - `data-sine-selected-record-mode=none`
- UI showed `No acoustic files match this filter`, which is correct when no playback-only rows are in the loaded broad catalog page.

Direct API probes:

```text
GET /api/natureos/mindex/library?category=acoustic&limit=36&q=esc
GET /api/natureos/mindex/library?category=acoustic&limit=36
GET /api/mindex/sine/status
```

Observed:

- `q=esc&limit=36`: 36 rows, 36 UUID-backed, 0 playback-only, total 2000.
- broad `limit=36`: 36 rows, 36 UUID-backed, 0 playback-only, total 2180.
- SINE status: `product=SINE`, `acoustic_blobs=2180`, `detectors_registered=7`.

## Pre-Deploy Smoke

Before a Website deploy, run:

```powershell
npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx --file app/api/mindex/sine/blobs/[id]/visualisation/route.ts
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
node scripts/sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010
node scripts/sine-phase-one-smoke.mjs --self-test
node scripts/sine-player-browser-smoke.mjs --base=http://localhost:3010 --timeout=90000
node scripts/sine-no-fake-frontend-smoke.mjs
node scripts/sine-aistudio-merge-audit.mjs
node scripts/sine-external-repo-audit.mjs
```

The release gate is the primary one-command SINE check. The individual scripts remain useful when debugging a specific layer.

Current expected release-gate result before Cursor fixes backend AI and backend visualisation:

```text
Status: frontend_ready_backend_pending
Checks: 45 pass, 5 warn, 0 fail
Backend blockers:
- Backend oscilloscope visualisation is still low resolution.
- No loaded model runtime proof is present.
- No prototype rows are present.
External-code warning:
- `ilge/gmtk-audio-classification` is partial on Windows checkout and should stay design-reference-only unless repaired.
Auth/session warning:
- MINDEX Library Acoustic embed redirects to login in headless browser verification.
```

Current expected default result before Cursor fixes backend AI and backend visualisation:

```text
Status: instrument_ready_ai_pending
Checks: 5 pass, 3 warn, 0 fail
Warnings:
- Backend oscilloscope visualisation is still low resolution: waveform=800, spectrogram=64x44.
- No loaded model runtime proof is present.
- No prototype rows are present.
```

Optional mutating probe:

```powershell
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010 --run-analysis
```

Use the optional probe when Cursor says the real classifier is fixed. It should move from warning to pass only when the backend returns confirmed model/prototype/fusion/transcript evidence without semantic contract violations.

Current optional-probe blocker:

```text
Optional short-clip analysis contract: FAIL
model_outputs=0
fusion_evidence=0
sound_transcripts=0
prototype_matches=1
proven_prototype_matches=0
has_identification_label=true
has_confirmed_evidence=false
contract_violation=true
```

This proves the current backend still promotes sound meaning without the evidence contract the Website requires.

If `3010` is already running and available, verify:

```text
http://localhost:3010/sensing/sine
http://localhost:3010/sensing/sine/player
http://localhost:3010/natureos/mindex
```

Checks:

- Public `/sensing/sine` shows the full shared player.
- Standalone `/sensing/sine/player` shows the same shared player.
- MINDEX Library Acoustic uses the compact shared player.
- Acoustic files load without `0 shown from 0 loaded`.
- Native audio fallback has a real stream.
- `Registration gaps` is visible and leaves no stale selected card when the filtered list is empty.
- Readiness should stay honest: `Scientific classifier ready` must not appear unless real model/prototype/fusion/transcript evidence exists.

The browser smoke script checks rendered shared-player state through these attributes:

```text
data-sine-player-mode
data-sine-loaded-files
data-sine-analysis-ready-files
data-sine-playback-only-files
data-sine-selected-record-mode
data-sine-scope-source
data-sine-scope-waveform-points
data-sine-scope-spectrogram-rows
data-sine-scope-spectrogram-cols
data-sine-model-runtime-live
data-sine-model-evidence-present
data-sine-readiness-label
data-sine-sound-targets
```

It also fails on browser console/page errors, including duplicate React key errors and build/runtime errors.

## Backend Handoff

Cursor should use:

```text
docs/codex-handoffs/SINE_REAL_AI_CLASSIFIER_BACKEND_CURSOR_PROMPT_JUN06_2026.md
docs/codex-handoffs/SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md
docs/codex-handoffs/SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md
```

Backend acceptance still requires:

- Real audio decode from NAS-backed `library.blob` rows.
- Real P0 model artifact trained/exported/registered.
- Runtime load proof with framework/runtime/artifact/checksum fields.
- Per-run `model_outputs`.
- Prototype or vector evidence with stable ids/checksums.
- Fusion evidence linking model, detector, and prototype rows.
- Evidence-backed `sound_transcripts`.
- Honest `model_status=model_unavailable` when no model artifact is loaded.
- No Gemini/mock/filename-derived semantic classifier path.

## Final Deploy Note

Phase One is deployable as an honest SINE instrument surface if the deploy owner accepts that the backend classifier is still pending.

Do not market or describe this as a finished AI acoustic classifier yet. It is a real acoustic file player, high-definition signal workbench, and evidence-gated frontend ready for the real MINDEX SINE backend.
