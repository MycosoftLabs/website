# SINE Frontend Merge Audit

Date: June 6, 2026

Prepared by: Codex

Scope: Website SINE frontend and the AI Studio prototype merge boundary.

Primary shared player:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\sensing\sine-acoustic-player.tsx`

AI Studio prototype reviewed:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Fungi Compute references reviewed:

```text
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\oscilloscope.tsx
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\stft-spectrogram.tsx
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\spectrum-analyzer.tsx
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\signal-fingerprint.tsx
```

## Verdict

The useful frontend ideas from the Google AI Studio SINE prototype have been merged or represented in the shared Website SINE player. The unsafe prototype backend behavior has not been copied.

SINE is still not complete because the MINDEX backend is not real AI yet. The Website now behaves correctly by showing real audio/scope data and blocking semantic meaning until model/prototype/fusion evidence exists.

## Safe Prototype Concepts Already Merged

The shared SINE player now covers the valuable parts of the AI Studio prototype:

- real acoustic file list from the MINDEX/NAS library
- real audio streaming through the Website BFF
- combined waveform and spectrogram scope canvas
- playback, scrub, hover, playhead, and visible time context
- selected-region loop/reverse/speed controls
- marker and wave annotation save flow
- chronological sound transcript panel
- model architecture recipe panel
- prototype/fingerprint catalog readout
- detector lanes grouped by event family
- human identification correction flow
- human-tagged training review queue
- explicit evidence gate for backend semantic claims
- specific sound-target coverage panel for all 31 requested water, air, and ground targets

## Unsafe Prototype Behavior Rejected

Do not copy these AI Studio prototype pieces into production:

- `GoogleGenAI` / Gemini as primary classifier in `server.ts`
- `mockAcousticBlobs`
- generated WAV buffers
- generated visualisation matrices
- synthetic waveform or spectrogram rows
- filename, source ID, metadata, or prompt-derived semantic labels
- fake model readiness in `SINEStatus.tsx`
- hard-coded model version claims such as `SINE-Embed-v1.0.0` without registry proof
- `DetectorStatus` limited to only bird/UAV-style buckets
- `acoustic_environment` limited to only `air` and `water`
- `DeepSignalMatch` without prototype/vector/model identity
- `SoundTranscriptEntry` without evidence IDs

## Current Shared Player State

The shared player is mounted in three places:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

The player has these high-definition scope features:

- high-DPI canvas
- 8,192 waveform point browser-real-audio fallback
- 256 x 1,024 spectrogram browser-real-audio fallback
- overlay, spectrogram, waveform, spectrum, and waterfall modes
- marine, oscilloscope, plasma, and thermal palettes
- frequency min/max control
- waveform gain and height controls
- spectrogram contrast and opacity controls
- trigger level, edge, and mode controls
- grid, band guide, peak marker, event lane, and persistence toggles
- calibrated acoustic reference strip for ground/seismic, rumble/engine, call/voice, animal/machine detail, and high insect/ultrasonic bands
- hover readouts for time, frequency, power, and amplitude when data exists

This is substantially stronger than the AI Studio `AcousticPlayer.tsx`, which only drew a simplified spectrogram grid and waveform envelope.

Latest UI honesty polish:

- The transcript panel now uses `Chronological acoustic script` rather than implying free-form generated narration.
- When MINDEX has not returned evidence-backed transcript rows, the panel says `Awaiting evidence` instead of `Not generated`.
- The empty transcript state tells the user that raw event lanes can still be inspected while SINE waits for verified model windows.
- Scope source labels now separate `MINDEX decoded scope` from `real audio scope`, so QA can tell whether the dense visualisation came from the backend endpoint or from the browser decoding the real WAV stream.

Latest runtime-context merge:

- The shared player now normalizes `model_context` from MINDEX analysis/classification payloads.
- It also reads runtime fields from `/api/mindex/sine/status`, `/api/mindex/sine/models`, analysis `diagnostics`, and analysis `summary`.
- The player shows runtime blockers such as `model_registry_missing`, `no_loaded_model`, `runtime_dependency_missing`, `prototype_catalog_missing`, or `model_inference_not_implemented`.
- The player no longer treats registry reachability as model readiness. `modelRuntimeLive` requires explicit inference readiness and model proof.
- The `SINE stack` panel now has a `Runtime blockers` card so QA can see why a run is detector-only.
- This is the safe AI Studio merge path: the neural-engine concept is represented in UI, but Gemini/mock/generated semantic behavior remains rejected.

Local terminal verification after runtime-context merge:

```powershell
npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
Invoke-WebRequest http://localhost:3010/sensing/sine?codex_runtime_context_check=1
Invoke-WebRequest http://localhost:3010/api/mindex/sine/status
```

Result:

- lint passed with no warnings or errors
- TypeScript passed
- `/sensing/sine` returned HTTP 200 and contained SINE page content
- `/api/mindex/sine/status` returned HTTP 200, but live fields such as `model_status`, `model_ready`, `inference_ready`, `registered_models`, and `loaded_models` were still null because VM 189 is still on the older deployed MINDEX behavior

Conclusion: the Website is ready to display the new runtime context, but Cursor still needs to deploy/update the MINDEX backend patch before live `3010` can show model blockers and runtime readiness from the backend.

Latest headless browser verification:

```json
{
  "route": "/sensing/sine/player",
  "loadedFiles": "36",
  "totalFiles": "2000",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "scopeSource": "browser-real-audio",
  "scopeSourceLabel": "real audio scope",
  "waveformPoints": "8192",
  "spectrogramRows": "256",
  "spectrogramCols": "1024",
  "architectureObserved": "2",
  "architectureEvidence": "0",
  "architectureTotal": "8",
  "hasChronologicalScript": true,
  "hasAwaitingEvidence": true,
  "hasGroundFilter": true,
  "oldRunFullSineAnalysisText": false
}
```

This confirms the shared player has an oscilloscope-grade real-audio fallback and the AI Studio-style transcript area now stays evidence-gated.

## Fungi Compute Reference Coverage

From `oscilloscope.tsx`, SINE already adapted or mirrored:

- fixed oscilloscope grid feel
- persistence-style trace option
- trigger level display
- cursor/playhead behavior
- channel/signal framing ideas, adapted to audio rather than electrophysiology

From `stft-spectrogram.tsx`, SINE already adapted or mirrored:

- STFT/spectrogram as a primary scientific view
- frequency band overlays
- time-frequency power panels
- colormap/palette control
- explicit frequency range control

From `spectrum-analyzer.tsx`, SINE already adapted or mirrored:

- spectrum mode
- waterfall mode
- peak markers
- frequency axis readouts
- band guides

Remaining frontend improvements are refinements, not blockers for the real backend handoff:

- add a true multi-channel audio view when MINDEX returns channel-specific waveform/spectrogram arrays
- add a dedicated long-file job queue viewer when MINDEX returns queued window jobs
- add a model metrics panel when MINDEX returns artifact, label map, confusion matrix, and calibration metadata

## Current Visualization Evidence

Codex re-probed the current MINDEX visualisation BFF after this merge audit.

Request:

```text
GET /api/mindex/sine/blobs/6a8492b5-0796-43b3-be42-1ccd753f5d12/visualisation
  ?start_sec=0
  &end_sec=5
  &max_waveform_points=8192
  &waveform_points=8192
  &max_time_frames=1024
  &max_frequency_bins=256
  &frequency_bins=256
  &fft_size=2048
  &n_fft=2048
  &hop_length=128
  &window_function=hann
  &include_peaks=true
  &quality=oscilloscope
```

Observed response summary:

```json
{
  "status": 200,
  "waveform": 800,
  "spectrogram_rows": 64,
  "spectrogram_cols": 44,
  "visualisation_status": null,
  "fft_size": null,
  "hop_length": null,
  "sample_rate": 16000,
  "duration": 5.0
}
```

This proves the remaining authoritative visualisation gap is still in MINDEX. The Website can draw a dense browser-real-audio scope when the browser decode path is available, but Cursor must make the backend endpoint return oscilloscope-grade data from real decoded NAS audio.

Latest smoke-script visualisation gate:

```powershell
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010
```

Result:

```text
Status: instrument_ready_ai_pending
Checks: 5 pass, 3 warn, 0 fail
Backend oscilloscope visualisation warning:
waveform=800
spectrogram=64x44
```

This warning is intentional. The frontend remains deployable as an honest instrument because it can use the real WAV stream for browser-side high-density scope rendering, but backend SINE is not authoritative until `/api/mindex/sine/blobs/{id}/visualisation` returns dense real decoded scope data with the requested FFT/window parameters.

Rendered shared-player smoke gate added:

```powershell
node scripts/sine-player-browser-smoke.mjs --base=http://localhost:3010 --timeout=90000
```

Latest result:

```text
Status: ready_with_warnings
Checks: 16 pass, 1 warn, 0 fail
```

Verified:

- `/sensing/sine` renders the shared player in `standalone` mode.
- `/sensing/sine/player` renders the same shared player in `standalone` mode.
- Both public SINE surfaces loaded 36 acoustic files, all UUID-backed for analysis.
- Both public SINE surfaces rendered `browser-real-audio` high-density scope with 8192 waveform points and a 256 x 1024 spectrogram.
- Both public SINE surfaces exposed 31 sound targets.
- Neither public SINE surface emitted browser console/page errors.
- Neither public SINE surface claimed classifier readiness without model runtime or model evidence.
- `/natureos/mindex` warned because the headless verifier was redirected to login. That is an auth/session limitation of the verifier, not proof that the embed is broken.

Static no-fake frontend guard added:

```powershell
node scripts/sine-no-fake-frontend-smoke.mjs
```

Latest result:

```text
Status: clean
Scanned: 15 files
Findings: 0
```

This verifies the Website SINE lane did not import or instantiate AI Studio fake-classifier behavior. It fails on `@google/genai`, `GoogleGenAI`, `GEMINI_API_KEY`, mock acoustic catalog imports, generated WAV functions, fake matrix generation, enabled LLM/semantic fallback, and hard-coded detector-only semantic labels. It intentionally allows quarantine marker strings in `SineAcousticPlayer`, because those strings help the UI reject bad backend payloads.

Consolidated release gate added:

```powershell
node scripts/sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
```

Latest result:

```text
Status: frontend_ready_backend_pending
Checks: 45 pass, 5 warn, 0 fail
```

This is the cleanest current deployment truth: Website SINE is renderable, honest, no-fake, high-density through real browser audio, checked against the local AI Studio merge boundary, and checked against the local external audio repo audit, while backend AI and backend oscilloscope visualisation remain pending.

Frontend race hardening added:

- `components/sensing/sine-acoustic-player.tsx` now uses a dedicated visualisation request token.
- Stale async scope requests can no longer clear or overwrite the current selected file's scope after a newer visualisation request starts.
- This protects the shared player from ending at `scopeSource=none` when selection, saved-analysis reads, and visualisation requests settle out of order.
- `loadAnalysis()` is now stable across analysis run/job state changes, so selecting a file does not repeatedly reset scope by re-running the selected-file effect after a saved analysis response updates `analysisRunId`.
- The classifier scope card now lists specific target groups and keeps them pending unless model/prototype/fusion/transcript evidence mentions the requested targets. Raw detector events do not mark target coverage.

Validation after the guard and target panel:

```json
{
  "loadedFiles": "36",
  "totalFiles": "2180",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "scopeSource": "browser-real-audio",
  "waveformPoints": "8192",
  "spectrogramRows": "256",
  "spectrogramCols": "1024",
  "soundTargets": "31",
  "soundTargetsCovered": "0",
  "soundTargetGroupsTotal": "9",
  "audioReadyState": 4,
  "hasSpecificTargetPanel": true,
  "nextOverlay": false,
  "requestCounts": {
    "library": 1,
    "visualisation": 1,
    "analysis": 1,
    "wave": 1,
    "human": 1
  }
}
```

This is still not backend completion. It proves the Website can keep a real decoded oscilloscope view stable while MINDEX backend AI and backend visualisation remain incomplete.

## Latest Recipe Merge - June 6 Continuation

Codex added the useful AI Studio and external-code audit concepts directly into the shared `Real classifier recipe` panel without copying unsafe AI Studio backend behavior.

Updated file:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\sensing\sine-acoustic-player.tsx`

What changed:

- Each real-classifier layer now includes a field-use explanation so the UI ties the architecture to Psathyrella buoy, hydrophone, Navy, field, and MYCA evidence workflows.
- Each layer now lists implementation references from the audited codebase and local stack:
  - `Fungi Compute oscilloscope`
  - `Arduino frequency detection`
  - `auditok activity`
  - `sound-clf-pytorch`
  - `CRNN audio classification`
  - `MAX Audio embedding flow`
  - `ESC-50 P0`
  - `UrbanSound-style metrics`
  - `OVH marine windows`
  - `NPS acoustic discovery`
  - `deep-signal concept`
  - `512D MINDEX prototype bank`
- These references render as planning/provenance chips. They do not mark the backend as complete and do not clear the evidence gate.

Validation:

```powershell
npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx --file lib/mindex/sine-contract.ts
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
git diff --check -- components\sensing\sine-acoustic-player.tsx lib\mindex\sine-contract.ts docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_FINAL_HANDOFF_JUN06_2026.md docs\codex-handoffs\SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md
```

Result:

- focused lint passed
- TypeScript passed
- diff check passed
- no files were staged

Browser smoke after the recipe merge:

```json
{
  "route": "/sensing/sine/player",
  "hasPlayer": true,
  "loadedFiles": "36",
  "totalFiles": "2180",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "readiness": "MINDEX contract failed",
  "referencesVisible": [
    "Fungi Compute oscilloscope",
    "sound-clf-pytorch",
    "CRNN audio classification",
    "NPS acoustic discovery"
  ]
}
```

Interpretation:

- The shared player still loads real acoustic files from MINDEX through the 3010 BFF.
- The recipe panel now surfaces the real implementation direction in the app.
- The readiness state correctly remains `MINDEX contract failed` until Cursor builds and deploys real model/prototype/fusion/transcript evidence.

## Shared Surface Validation - June 6 Continuation

Codex found one shared-surface regression during the final pass: the compact embedded player inside `http://localhost:3010/natureos/mindex` -> Library -> Acoustic mounted the SINE shell but did not bootstrap the acoustic catalog. The standalone surfaces were loading files, but the MINDEX compact surface stayed at `0` loaded files.

Fix applied:

- `components/sensing/sine-acoustic-player.tsx` now bootstraps the first acoustic catalog request through the same startup path that loads SINE status/models/prototypes.
- The search debounce still handles later query changes.
- A `lastCatalogSearchRef` prevents duplicate startup fetches.
- This avoids the compact embed losing its first catalog request during local-dev auth and MINDEX tab hydration churn.

Headless localhost validation after the fix:

```json
{
  "sensing_sine_player": {
    "status": 200,
    "loadedFiles": "36",
    "totalFiles": "2000",
    "selectedId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
    "scopeSource": "browser-real-audio",
    "waveformPoints": "8192",
    "spectrogramRows": "256",
    "spectrogramCols": "1024",
    "audioReadyState": 4,
    "oldRunFullText": false
  },
  "sensing_sine_public": {
    "status": 200,
    "loadedFiles": "36",
    "totalFiles": "2180",
    "selectedId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
    "scopeSource": "browser-real-audio",
    "waveformPoints": "8192",
    "spectrogramRows": "256",
    "spectrogramCols": "1024",
    "soundTargets": "31",
    "soundTargetsCovered": "0",
    "soundTargetGroupsTotal": "9"
  },
  "mindex_library_acoustic_embed": {
    "status": 200,
    "localDevLoginUsed": true,
    "playerMode": "compact",
    "loadedFiles": "80",
    "totalFiles": "2180",
    "selectedId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
    "scopeSource": "browser-real-audio",
    "waveformPoints": "8192",
    "spectrogramRows": "256",
    "spectrogramCols": "1024",
    "audioReadyState": 4
  }
}
```

Observed request proof:

- `GET /api/natureos/mindex/library?category=acoustic&limit=36&offset=0&q=esc` returned real rows on the standalone surfaces.
- `GET /api/natureos/mindex/library?category=acoustic&limit=80&offset=0&q=esc` returned real rows in the MINDEX compact embed.
- `GET /api/natureos/mindex/library/file?...remote_id=6a8492b5-0796-43b3-be42-1ccd753f5d12` returned real WAV stream responses.
- `GET /api/mindex/sine/blobs/6a8492b5-0796-43b3-be42-1ccd753f5d12/visualisation?...quality=oscilloscope` returned 200, but the frontend still used `browser-real-audio` because the backend scope is not dense enough yet.

One unrelated MINDEX console resource returned 503 during the compact embed probe. It was not a SINE/library/status/file request and did not block the SINE player. Do not widen this into Earth Simulator or unrelated MINDEX tabs during the SINE phase-one deploy check.

## Architecture Vocabulary Imported From AI Studio

The current shared SINE player and handoff use this AI Studio concept safely:

```text
Input audio -> float32 decode
STFT + log-mel + PCEN + MFCC deltas
ResNetish/CNN trunk
CRNN/GRU temporal block
attention pooling
512D normalized embedding projection
semantic heads
prototype retrieval
evidence fusion
chronological sound transcripts
```

This vocabulary is visible in the shared SINE recipe panel and in the Cursor backend handoff. It must remain descriptive until MINDEX returns real model registry and runtime proof.

## Backend Dependency That Frontend Cannot Fake

The frontend cannot make SINE real by itself. Cursor must implement:

- real NAS audio decode
- real high-definition visualisation endpoint
- real model registry
- real PyTorch/TorchScript/ONNX inference
- real embeddings and prototype catalog
- real evidence fusion
- real evidence-linked sound transcripts
- real human correction/training review persistence

The frontend must keep showing `AI pending`, `MINDEX contract failed`, or equivalent blocked states until those backend proofs exist.

## June 6 Frontend Honesty Patch

Codex tightened the shared player after rechecking the current MINDEX source and Website BFF routes.

Patch:

- `components/sensing/sine-acoustic-player.tsx`

What changed:

- The player no longer derives an `identification_summary` from raw detector rows.
- Detector rows such as frequency peaks, activity segments, bird-band heuristics, rotor heuristics, and deep-signal placeholder rows remain visible as signal evidence lanes.
- A top-level identification can now be derived only from proven model output, proven model/prototype fusion, proven prototype/deep-signal evidence, or evidence-linked transcript rows.
- This prevents a future honest backend response such as `model_status: model_unavailable` plus detector-only evidence from being falsely treated as a semantic classification failure by the frontend itself.

Validation:

```powershell
npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx
npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false
```

Both passed.

## Chrome And Supabase Notes

The original objective mentioned `@chrome` and `@supabase`.

Chrome:

- No Chrome profile, cookies, login state, or extension state is needed for the current SINE frontend/backend handoff.
- Local verification can use the in-app browser or headless Playwright against `localhost:3010`.
- Use Chrome only if Morgan specifically asks to inspect the page in his real Chrome profile.

Supabase:

- The current authoritative SINE path is Website BFF -> MINDEX VM 189 -> MINDEX Postgres/NAS.
- Do not route SINE classification through Supabase unless Morgan explicitly changes the architecture.
- If future MYCA/NLM training review mirrors human labels to Supabase, it must follow Supabase RLS/security rules and must not expose service-role keys or private rows to browser clients.

## Cursor Frontend/Backend Coordination Prompt

Paste this to Cursor if it needs the frontend merge boundary:

```text
Read:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_FRONTEND_MERGE_AUDIT_JUN06_2026.md
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_BACKEND_CURSOR_FULL_HANDOFF_JUN06_2026.md
D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md

Do not copy the AI Studio Gemini/mock backend. The Website already merged the safe frontend concepts: high-def scope UI, architecture recipe, prototype panel, transcript panel, human correction, and evidence gates.

Your job is MINDEX backend reality:

1. stop fake semantic detector labels
2. return honest model_unavailable when no model is loaded
3. decode real NAS audio
4. return high-definition waveform/spectrogram metadata
5. add model registry/prototype endpoints
6. run real PyTorch/TorchScript/ONNX inference
7. persist model/prototype/fusion/transcript evidence
8. verify through localhost:3010 that one real model-backed clip clears the Website evidence gate
```

## June 6 Visible-Window Fingerprint Merge

Codex added one more safe frontend merge from the Fungi Compute / AI Studio direction:

- `components/sensing/sine-acoustic-player.tsx`

What changed:

- The shared player now renders an `Acoustic fingerprint` panel inside the Window measurements section.
- The panel is derived only from real `scopeMeasurements` for the visible spectrogram window: band power share, dominant band, spectral peak counts, and window bounds.
- The panel shows a compact polar-style fingerprint plus per-band bars, similar in spirit to the Fungi Compute signal fingerprint, but acoustic-specific.
- The copy explicitly says this is visible-window band power and peak structure only, not a semantic classifier.
- It exposes QA hooks:
  - `data-sine-fingerprint-ready`
  - `data-sine-fingerprint-bands`
  - `data-sine-fingerprint-dominant`

Why this is safe:

- It does not use AI Studio Gemini output.
- It does not use mock acoustic blobs.
- It does not generate species, vessel, UAV, whale, lightning, or other meaning.
- It does not clear the backend evidence gate.
- It gives Morgan a more oscilloscope-grade measurement surface while Cursor builds the real model/prototype backend.

AI Studio prototype audit note:

- Reused product vocabulary: chronological sound transcripts, SINE-Embed / 512D prototype bank concept, layered DSP -> embedding -> semantic heads architecture, and dense acoustic timeline language.
- Excluded backend behavior: Gemini classification, mock blobs, generated WAV streams, generated spectrogram matrices, filename/source-metadata semantic payloads, and hard-coded transcript identities.
- Added verifier: `scripts/sine-aistudio-merge-audit.mjs` returns `ready`, 14 pass, 0 warn, 0 fail. It checks both sides of the boundary: useful AI Studio UI/schema concepts present in the shared player, unsafe AI Studio backend behavior absent from the Website SINE lane, and the pasted ChatGPT spec carried into the Cursor backend contract.

## June 6 Catalog Retry And Evidence-Gate Verification

Codex patched the shared SINE player to handle two real local QA failures without faking backend intelligence.

Patch:

- `components/sensing/sine-acoustic-player.tsx`

What changed:

- Added catalog QA attributes:
  - `data-sine-catalog-status`
  - `data-sine-catalog-retries`
  - `data-sine-catalog-loading-since`
  - `data-sine-known-acoustic-files`
  - `data-sine-registry-backed-rows`
  - `data-sine-storage-label`
- Added playback QA attributes:
  - `data-sine-playback-status`
  - `data-sine-playback-playing`
  - `data-sine-playback-current-time`
  - `data-sine-playback-duration`
- Added a bounded stale-load retry when SINE status reports known acoustic blobs but the catalog request stays in `loading`.
- Added a bounded registry-backed retry when the Website temporarily falls back to path-only local NAS rows while MINDEX status proves UUID-backed acoustic rows exist.
- Added pointer-down transport triggering in addition to click so manual media playback starts at the earliest browser activation point.

Fresh `localhost:3010` browser proof after the patch:

```json
{
  "route": "/sensing/sine/player",
  "catalogStatus": "ready",
  "loadedFiles": "36",
  "totalFiles": "2180",
  "registryBackedRows": "true",
  "selectedId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "storageLabel": "NAS 7346.7 GB free",
  "scopeSource": "browser-real-audio",
  "waveformPoints": "8192",
  "spectrogramRows": "256",
  "spectrogramCols": "1024",
  "audioReadyState": 4
}
```

Evidence check proof:

```json
{
  "analysisStatus": "complete",
  "analysisRunId": "19cc95dd-51cf-4fb0-93c8-66fa7e22d04e",
  "contractStatus": "contract_violation",
  "contractLabel": "Missing model status",
  "readiness": "MINDEX contract failed",
  "evidenceReady": "2",
  "evidenceTotal": "8"
}
```

Playback status:

- The native `<audio>` element loads the selected WAV with `readyState=4`, `duration=5`, and no media error.
- Under in-app browser automation, both the custom transport and native bar remain blocked by the browser media gesture policy; the custom button now surfaces `Playback needs one click on the built-in audio bar in this browser. After that, the SINE transport can follow.`
- Do not claim automated audio playback was proven until Morgan manually retests the same patched page or a browser surface grants media activation.

Interpretation:

- The frontend is now robust against transient zero-file and path-only fallback catalog states.
- The frontend still correctly refuses to treat current backend `Run SINE analysis` output as real AI.
- Cursor must implement the real model/prototype/fusion/transcript backend before the SINE evidence gate can pass.

MINDEX embedded verification after local dev login:

```json
{
  "route": "/natureos/mindex",
  "tab": "Library",
  "playerMode": "compact",
  "catalogStatus": "ready",
  "loadedFiles": "80",
  "totalFiles": "2180",
  "registryBackedRows": "true",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "storageLabel": "NAS 7346.7 GB free",
  "readiness": "Library signal ready",
  "modelRuntimeLive": "false",
  "modelEvidencePresent": "false",
  "evidenceReady": "1",
  "evidenceTotal": "8"
}
```

The embedded player is no longer an empty or infinitely expanding file surface. It mounts the same shared SINE component, lists real MINDEX acoustic rows, includes the `Ground` signal filter, and exposes the broader animal, insect, water-propeller, air-propeller, impulse, ground/seismic, mechanical, activity, frequency, and pattern stack. It still cannot claim real sound meaning until MINDEX returns registered model/prototype/fusion/transcript evidence.

Public `/sensing/sine` final settle check:

```json
{
  "route": "/sensing/sine",
  "playerMode": "standalone",
  "catalogStatus": "ready",
  "loadedFiles": "36",
  "totalFiles": "2180",
  "registryBackedRows": "true",
  "selectedAnalysisId": "6a8492b5-0796-43b3-be42-1ccd753f5d12",
  "analysisStatus": "complete",
  "analysisRunId": "19cc95dd-51cf-4fb0-93c8-66fa7e22d04e",
  "contractStatus": "contract_violation",
  "contractLabel": "Missing model status",
  "readiness": "MINDEX contract failed",
  "waveformPoints": "8192",
  "spectrogramRows": "256",
  "spectrogramCols": "1024",
  "audioReadyState": 4,
  "audioDurationSec": 5,
  "audioError": null
}
```

This is the desired frontend behavior for Phase One: it proves real audio can load and render, while clearly refusing to present detector-only output as real AI classification.
