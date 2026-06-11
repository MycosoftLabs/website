# SINE Real AI Classifier Backend Handoff For Cursor

Date: June 6, 2026

Prepared by: Codex

Target backend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Frontend repo and contract source:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

Primary frontend QA surfaces:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

MINDEX VM:

- API: `192.168.0.189:8000`
- NAS acoustic root on VM: `/mnt/nas/mindex/Library/acoustic`
- Models root target on VM/NAS: `/mnt/nas/mindex/models/acoustic`

## Objective

Build the real backend for SINE, the Spectral Intelligence Network acoustic classifier.

Morgan manually QA-tested the audio player and confirmed that `Run SINE analysis` is not actually doing real acoustic AI analysis. The current backend is returning detector-shaped data and semantic-looking labels, but it is not proving real PyTorch, TorchScript, ONNX Runtime, transformer inference, neural embeddings, prototype matching, fusion evidence, or evidence-linked sound transcripts.

Cursor must make MINDEX SINE real.

The pasted ChatGPT backend spec is carried forward here as a hard contract, not as flavor text: SINE must provide chronological Sound Transcripts, deterministic DSP evidence, 512D neural embedding/prototype matching, PyTorch/TorchScript/ONNX model runtime proof, and evidence fusion that links detector events, model outputs, prototype matches, and transcript rows.

This handoff is acoustic-only. Do not work on chemistry, PubChem, DNA computing, DWSIM, Cantera, GANDHA gas sensing, BlueSight visual sensing, Earth Simulator, or unrelated MINDEX tabs in this pass.

## Single Paste Prompt For Cursor

If Morgan wants a shorter handoff to paste directly into Cursor, use this file first:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md`

Requirement-by-requirement traceability:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REQUIREMENTS_TRACEABILITY_MATRIX_JUN06_2026.md`

This full document remains the detailed engineering context. The paste prompt is the operational starting point.

## Current Product Truth

The frontend is working as a real SINE instrument surface:

- It loads real acoustic Library rows from MINDEX.
- It streams real NAS-backed audio.
- It can render waveform/spectrogram from real audio.
- It sends an evidence contract to the backend.
- It has human correction and signal-window annotation UI.
- It refuses to call detector-only backend output "real AI".

The backend is the blocker:

- It can return HTTP 200.
- It can fill detector lanes.
- It can return `bird_likely`, `uav_rotor_likely`, or `spectral_embedding`.
- It can mark an analysis complete.
- It does not prove real model inference, prototype matching, or evidence-linked transcript generation.

Do not ask Codex to hide this in the frontend. Fix MINDEX.

## Current MINDEX Local Source Recheck

Codex also rechecked the current local MINDEX source in:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Important current-state finding:

- The local MINDEX repo now has useful SINE honesty, request-contract, registry, persisted-evidence, model-runtime-inspection, model-output persistence-runner, prototype vector-search seam, post-model fusion/transcript writer, and visualisation scaffolding.
- The active classifier path still calls detector-only analysis through `mindex_api/services/sine_acoustic/classifier.py` and `pipeline.py`.
- `mindex_api/services/sine_acoustic/model_runtime.py` explicitly inspects runtime/artifact readiness but does not run inference.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now provides a concrete TorchScript/ONNX runtime interface: local artifact validation, artifact checksum verification, label-map checksum verification, feature tensor generation, dependency checks, top-k mapping, and provenance-rich model output.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now preserves multi-output embeddings. TorchScript/ONNX models may return direct logits, `[logits, embedding]`, `(logits, embedding)`, or `{logits, embedding}`; successful inference includes `embedding`, `embedding_sha256`, and `embedding_dim`.
- `mindex_api/services/sine_acoustic/analysis_runner.py` now provides the persistence runner seam: select loaded acoustic models, decode real blob audio, call the runtime interface, write proven outputs into `sine.model_output`, and return honest blockers when no model/runtime/artifact is available.
- `mindex_api/services/sine_acoustic/evidence_builder.py` now provides the post-model evidence writer: after a proven `sine.model_output` row exists, it writes `sine.fusion_evidence` and evidence-linked `sine.sound_transcript` rows. It writes nothing for detector-only or unproven model output.
- `mindex_api/services/sine_acoustic/prototype_search.py` now provides the prototype vector-search seam: when a real model runtime returns an embedding vector and `sine.prototype.metadata` contains prototype vectors, it computes cosine similarity and writes `sine.prototype_match` rows with vector/prototype checksums.
- `mindex_api/services/sine_acoustic/classifier.py` and `pipeline.py` now map `request_contract.visualisation_quality` into `visualisation_sonic`, so the active analyze/classify path can return oscilloscope-density waveform/spectrogram data.
- `mindex_api/services/sine_acoustic/event_views.py` is correctly shaped to keep detector-only rows out of `identification_summary` unless model/prototype/fusion/transcript evidence exists.
- `mindex_api/services/sine_acoustic/visualisation.py` has local code that can produce dense real STFT/waveform layers, but the deployed `3010`/VM smoke still reports the backend endpoint as low-resolution. Cursor must verify deployment state and not assume local source is live.
- `mindex_api/services/sine_acoustic/features.py` now provides the local semantic-free feature/window input layer: bounded windows, fixed-length padding/cropping, NumPy STFT, mel filterbank, log-mel spectrograms, `[1, 1, n_mels, frames]` tensors, and `feature_sha256`.
- The AI Studio prototype at `MINDEX\mindex\sine-acoustic-classifier` remains reference-only: `server.ts` imports `@google/genai`, uses `mockAcousticBlobs`, generates WAV buffers, synthesizes visualisation matrices, and returns metadata/Gemini/heuristic semantic labels. Do not copy that backend behavior.

Focused local MINDEX test recheck from Codex:

```powershell
python -m pytest tests\test_sine_inference_runtime.py tests\test_sine_prototype_search.py tests\test_sine_classifier_visualisation_contract.py tests\test_sine_evidence_builder.py tests\test_sine_analysis_runner.py tests\test_sine_feature_extraction.py tests\test_acoustic_event_views.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_request_contract.py tests\test_sine_evidence_migration_contract.py tests\test_sine_acoustic_pipeline.py
```

Result:

```text
44 passed, 1 skipped
```

This proves the current scaffolding parses and the honesty/request-contract/feature/runtime-with-embeddings/persistence-runner/prototype-search/post-model-evidence/analyze-visualisation tests pass. It does not prove real SINE AI, because the local runtime tests still use a mocked execution call and no test in that set trains/registers a real PyTorch/TorchScript/ONNX model artifact, populates real prototype vectors from Library examples, or verifies OOD behavior on real field audio.

## June 6 Frontend Verification Evidence

Codex rechecked the shared SINE frontend after the latest catalog/scope cleanup without restarting the shared `3010` dev server.

Compile checks:

- `npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx --file app/api/mindex/sine/blobs/[id]/visualisation/route.ts` passed.
- `npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false` passed.
- `git diff --check` passed for the touched SINE component and handoff docs.

Route/API probes:

- `GET http://localhost:3010/sensing/sine?codex_scope_pref=1780700396769` returned `200`.
- `GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=1` returned `200` with real acoustic Library JSON, but took about 13 seconds.
- Existing `3010` listener was left alone; Codex did not restart it.

Important backend identity evidence:

- The first acoustic row from `GET /api/natureos/mindex/library?category=acoustic&limit=1` had an encoded path-style id:
  - `YWNvdXN0aWMvZXNjNTAvMS0xMDAwMzItQS0wLndhdg`
  - relative path: `acoustic/esc50/1-100032-A-0.wav`
- A high-definition visualisation request against that id returned `422 Unprocessable Entity`:

```text
GET /api/mindex/sine/blobs/YWNvdXN0aWMvZXNjNTAvMS0xMDAwMzItQS0wLndhdg/visualisation?quality=oscilloscope&ignore_saved_visualisation=true&max_waveform_points=8192&max_time_frames=1024&max_frequency_bins=256
```

This proves the backend is still returning some playable path-only acoustic rows instead of UUID-backed analyzable `library.blob` rows. The Website can stream/play those rows and can build browser-side scope from real audio, but SINE cannot treat them as analyzable records until MINDEX registers and returns stable acoustic UUIDs. Cursor must fix this at the Library/blob registration layer.

The frontend now exposes this state directly:

```text
data-sine-selected-record-mode=analysis-ready
```

means the selected acoustic row has a UUID-backed MINDEX record and can support analysis, wave annotations, and human identification.

```text
data-sine-selected-record-mode=playback-only
```

means the selected file can stream from storage but MINDEX did not return a UUID-backed acoustic record. Cursor should treat any `playback-only` row in the real catalog as a backend registration failure to fix, not as a frontend bug.

The Website also exposes catalog-level counts:

```text
data-sine-analysis-ready-files={count}
data-sine-playback-only-files={count}
```

Cursor's registration acceptance target is simple: playable acoustic rows that come from `library.blob` should appear as `analysis-ready`. A catalog where real playable rows remain `playback-only` is not ready for SINE analysis, wave annotations, human-tagged training review, or real model inference.

The Website also has a `File` filter with `All`, `Analysis ready`, and `Playback only`, plus:

```text
data-sine-file-readiness-filter={all|analysis-ready|playback-only}
```

Use that filter during QA. `Playback only` is the registration backlog. The goal is not to hide it in the frontend; the goal is to register every playable acoustic file with a stable UUID-backed MINDEX acoustic record.

The player also includes a `Registration gaps` quick action. It clears the startup ESC-50 search, reloads the broad acoustic catalog, and switches the file filter to `Playback only`. Use that button to verify catalog registration coverage. If files appear there, MINDEX is still returning streamable rows without stable analyzable acoustic UUIDs.

The Website repo now includes a repeatable smoke script:

```powershell
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010
```

The default smoke script is non-mutating and now checks backend oscilloscope visualisation quality. It requests one UUID-backed ESC-50 file with:

```text
quality=oscilloscope
max_waveform_points=8192
max_frequency_bins=256
max_time_frames=1024
fft_size=2048
hop_length=128
window_function=hann
include_peaks=true
```

Current default smoke result on June 6, 2026:

```text
Status: instrument_ready_ai_pending
Checks: 5 pass, 3 warn, 0 fail

Expected warnings:
- Backend oscilloscope visualisation is still low resolution: waveform=800, spectrogram=64x44.
- No loaded model runtime proof is present.
- No prototype rows are present.
```

This means the Website can deploy as an honest instrument surface, but MINDEX still has to fix the authoritative backend scope endpoint. The backend visualisation response must honor requested dense waveform/spectrogram parameters from real decoded NAS audio, not return the old `800 / 64 x 44` view.

There is also a rendered-player browser smoke:

```powershell
node scripts/sine-player-browser-smoke.mjs --base=http://localhost:3010 --timeout=90000
```

Latest result on June 6, 2026:

```text
Status: ready_with_warnings
Checks: 16 pass, 1 warn, 0 fail
```

This proves the Website surfaces themselves are honest and high-density:

- `/sensing/sine` and `/sensing/sine/player` render the same shared SINE player.
- Both surfaces load 36 real acoustic files.
- Both surfaces show 36 analysis-ready rows and 0 playback-only rows in the rendered catalog.
- Both surfaces use real WAV browser decoding to draw 8192 waveform points and a 256 x 1024 spectrogram.
- Both surfaces expose 31 requested water, air, and ground sound targets.
- Both surfaces have no browser console/page errors.
- Both surfaces do not claim classifier readiness without model runtime or model evidence.
- `/natureos/mindex` warns in headless because the route redirects to login; use `--require-mindex` only with an authenticated session.

Codex also added a static no-fake frontend guard:

```powershell
node scripts/sine-no-fake-frontend-smoke.mjs
```

Latest result:

```text
Status: clean
Scanned: 15 files
Findings: 0
```

This scans the Website SINE component/BFF lane for actual fake-classifier code paths: `@google/genai`, `GoogleGenAI`, `GEMINI_API_KEY`, AI Studio mock catalogs, generated WAV functions, fake visualisation matrix generation, enabled `semantic_fallback`/`llm_fallback`, and hard-coded fake semantic labels. Defensive strings inside the player that quarantine backend Gemini/mock/synthetic markers are allowed and should remain.

Codex added a consolidated SINE release gate:

```powershell
node scripts/sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
```

Latest result:

```text
Status: frontend_ready_backend_pending
Checks: 45 pass, 5 warn, 0 fail
```

This command runs the no-fake frontend guard, AI Studio merge audit, external audio repo audit, API/backend contract smoke, and rendered-player browser smoke. Cursor should use this as the first website-side readiness check after backend changes. The gate should move from `frontend_ready_backend_pending` toward `ready` only after MINDEX returns high-definition backend visualisation, loaded model runtime proof, prototype rows, and no semantic contract violations.

AI Studio merge audit:

```powershell
node scripts/sine-aistudio-merge-audit.mjs
```

Latest result:

```text
Status: ready
Checks: 14 pass, 0 warn, 0 fail
```

This verifies the useful AI Studio concepts are represented in the real shared player while Gemini, mock acoustic rows, generated WAV streams, generated visualisation matrices, metadata fallback labels, and hard-coded demo meanings are excluded.

External audio repo audit:

```powershell
node scripts/sine-external-repo-audit.mjs
```

Latest result:

```text
Status: ready
Repos: 9 pass, 1 warn, 0 fail
```

The one warning is `ilge/gmtk-audio-classification`, because historical filenames can fail Windows checkout. Treat GMTK as a git-object/design reference unless the checkout is repaired.

There is also an optional mutating analysis-contract probe:

```powershell
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010 --run-analysis
```

Cursor should use `--run-analysis` after backend changes. It POSTs one short ESC-50 row through the Website BFF with `semantic_fallback=false`, `llm_fallback=false`, and `sound_transcripts=evidence_backed_only`. It fails if MINDEX returns semantic identification without confirmed model/prototype/fusion/transcript evidence, warns if the response is honestly model-pending, and passes only when real evidence exists.

Current failure on June 6, 2026:

```text
node scripts/sine-phase-one-smoke.mjs --base=http://localhost:3010 --run-analysis

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

This is the exact backend behavior Cursor must remove: no semantic identification label unless there is confirmed model/prototype/fusion/transcript evidence. If no model is loaded, return honest detector evidence plus `model_status=model_unavailable` and no final semantic identification.

## Hard No-Fake Rule

Production SINE must never use these as semantic classification:

- Gemini or another LLM as the primary classifier.
- Filename-derived labels.
- Source metadata-derived labels.
- Mock acoustic blobs.
- Generated WAV files.
- Synthetic waveform or spectrogram matrices.
- Detector-only labels promoted into final identification.
- `deep_signal_matches` without a real embedding/prototype/vector proof.
- `sound_transcripts` without evidence IDs.

Detector evidence is allowed. Fake meaning is not.

If no real model is loaded, return this honestly:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
  "prototype_matches": [],
  "deep_signal_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "audio_decoded": true,
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false
  }
}
```

Non-semantic DSP arrays may still be non-empty:

- `frequency_detections`
- `activity_segments`
- `impulse_candidates`
- `rotor_candidates`
- `sweep_candidates`
- `energy_windows`
- `fft_peaks`

Those are signal evidence, not final meaning.

## Current Frontend Evidence Contract

The frontend sends the contract from:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\mindex\sine-contract.ts`

MINDEX must honor these fields:

```json
{
  "require_real_audio": true,
  "require_model_evidence": true,
  "allow_detector_only": true,
  "semantic_fallback": false,
  "llm_fallback": false,
  "prototype_matching": true,
  "sound_transcripts": "evidence_backed_only",
  "target_domains": ["water", "air", "ground"],
  "requested_outputs": [
    "detector_events",
    "model_outputs",
    "embeddings",
    "prototype_matches",
    "fusion_evidence",
    "sound_transcripts",
    "diagnostics"
  ]
}
```

Supported target domains must include:

- Water: hydrophones, underwater biological calls, vessel noise, underwater propellers, sonar/pings, water pressure impulses.
- Air: bird/animal/insect sounds, drones, helicopters, aircraft, thunder/lightning, explosions, human/site activity.
- Ground: seismic/earthquake, soil/underground acoustics, surface vibration, motor/actuator vibration, impacts.

Supported class families must include at least:

- `marine_bioacoustics`
- `terrestrial_bioacoustics`
- `insect_bioacoustics`
- `air_propeller`
- `water_propeller`
- `vessel_engine`
- `weather_lightning`
- `impulse_explosion`
- `ground_seismic`
- `mechanical`
- `geophysical`
- `unknown_pattern`

If a domain is not covered by loaded models or prototypes, return `out_of_domain` or `unknown`, not the nearest convenient label.

## API Endpoints Cursor Must Make Real

Existing routes to fix or extend:

```text
POST /api/mindex/sine/blobs/{blob_id}/analyze
GET  /api/mindex/sine/blobs/{blob_id}/analysis
GET  /api/mindex/sine/blobs/{blob_id}/visualisation
GET  /api/mindex/sine/status
GET  /api/mindex/sine/models
GET  /api/mindex/sine/models/{model_id}
GET  /api/mindex/sine/prototypes
POST /api/mindex/library/blobs/{blob_id}/classify
GET  /api/mindex/library/blobs/{blob_id}
POST /api/mindex/library/wave-annotation
GET  /api/mindex/library/wave-annotations
POST /api/mindex/library/human-identification
GET  /api/mindex/library/human-identifications
```

Routes the frontend is ready for and Cursor should add if missing:

```text
GET  /api/mindex/sine/training/human-tags
GET  /api/mindex/sine/jobs/{job_id}
POST /api/mindex/sine/blobs/{blob_id}/reanalyze
POST /api/mindex/sine/models/register
POST /api/mindex/sine/prototypes/rebuild
```

All model, prototype, training, and human review routes must use internal auth. Do not expose credentials or VM env information in UI responses.

## Required Backend Architecture

Build SINE as a real FastAPI/Python acoustic AI service inside MINDEX.

Recommended module layout:

```text
mindex_api/services/sine_acoustic/audio_decode.py
mindex_api/services/sine_acoustic/features.py
mindex_api/services/sine_acoustic/windowing.py
mindex_api/services/sine_acoustic/visualisation.py
mindex_api/services/sine_acoustic/model_registry.py
mindex_api/services/sine_acoustic/inference_runtime.py
mindex_api/services/sine_acoustic/embedding_runtime.py
mindex_api/services/sine_acoustic/prototype_search.py
mindex_api/services/sine_acoustic/detectors.py
mindex_api/services/sine_acoustic/evidence_fusion.py
mindex_api/services/sine_acoustic/transcripts.py
mindex_api/services/sine_acoustic/analysis_runner.py
mindex_api/services/sine_acoustic/training_queue.py
mindex_api/services/sine_acoustic/human_corrections.py
mindex_api/routers/sine_acoustic.py
```

Recommended ETL and training layout:

```text
mindex_etl/sine/datasets.py
mindex_etl/sine/features.py
mindex_etl/sine/models.py
mindex_etl/sine/train.py
mindex_etl/sine/export.py
mindex_etl/sine/evaluate.py
mindex_etl/jobs/train_sine_esc50_p0.py
mindex_etl/jobs/build_sine_prototypes_p0.py
mindex_etl/jobs/evaluate_sine_model.py
```

## Audio Decode Requirements

SINE must analyze registered `library.blob` UUIDs, not anonymous file paths.

Required behavior:

- Resolve `blob_id` from `library.blob`.
- Verify `category = acoustic`.
- Resolve the NAS file path under `/mnt/nas/mindex/Library/acoustic`.
- Reject path traversal.
- Ignore manifest sidecar files as playable audio.
- Decode actual audio bytes from the NAS path.
- Support WAV now.
- Add FLAC, MP3, OGG, and future containers through `soundfile`, `librosa`, or `ffmpeg` fallback.
- Preserve original sample rate, channel count, duration, file size, and content hash.
- Convert samples to float32.
- Preserve channel metadata.
- Downmix intentionally only when the requested model requires mono.
- Resample only after recording original diagnostics.

The response diagnostics must prove the decode:

```json
{
  "audio_decoded": true,
  "source_path": "redacted or relative path only",
  "sample_rate_in": 48000,
  "sample_rate_model": 16000,
  "channels": 1,
  "duration_sec": 5.0,
  "content_hash": "sha256...",
  "decoder": "soundfile|ffmpeg|librosa",
  "window_start_sec": 0,
  "window_end_sec": 5
}
```

## Deterministic DSP Layer

Compute deterministic signal evidence from decoded samples before model inference.

Required DSP features:

- waveform envelope
- waveform peaks
- STFT
- linear spectrogram
- log-mel spectrogram
- PCEN where useful
- MFCC
- RMS energy
- zero crossing rate
- spectral centroid
- spectral bandwidth
- spectral rolloff
- spectral contrast
- FFT peak detection
- acoustic activity segmentation
- chirp/sweep candidates
- impulse/pressure-spike candidates
- rotor/harmonic-stack candidates
- low-frequency seismic/ground candidates
- underwater cavitation/propeller candidates

The current `bird.py`, `uav.py`, `deep_signal.py`, and `pipeline.py` can remain as detector evidence, but their outputs must not create semantic identity unless model/prototype/fusion proof exists.

## External Audio Code Cursor Must Actually Use

Codex already cloned and audited Morgan's requested audio-classification repositories into:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos`

Supporting audit doc:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Cursor must read that audit and inspect the local repos before implementing. Do not build another detector shell from scratch while ignoring these working baselines. Also do not vendor external code blindly. Review licenses and reimplement the useful patterns in MINDEX style.

Concrete repo-to-MINDEX implementation map:

| External code | Cursor should extract/reimplement | MINDEX target |
|---|---|---|
| `GorillaBus/urban-audio-classifier` | normalized log-mel and MFCC helpers, feature image padding, per-class metrics/confusion matrix flow | `mindex_api/services/sine_acoustic/features.py`, `mindex_etl/sine/features.py`, `mindex_etl/sine/evaluate.py` |
| `IBM/MAX-Audio-Classifier` | clean serving wrapper, model metadata endpoint, start-time/windowed prediction, top-k postprocessing, VGGish-style embedding separation | `mindex_api/services/sine_acoustic/inference_runtime.py`, `model_registry.py`, `analysis_runner.py`, `routers/sine_acoustic.py` |
| `abishek-as/Audio-Classification-Deep-Learning` | multiple model heads over one feature extractor and MFCC baseline comparison | `mindex_etl/sine/models.py`, `tests/test_sine_model_registry.py`, `tests/test_sine_esc50_model_output.py` |
| `daisukelab/ml-sound-classifier` | rolling buffer, long-data split inference, geometric/ensemble aggregation, class balancing, mixup, per-domain configs | `windowing.py`, `analysis_runner.py`, `mindex_etl/sine/train.py`, Psathyrella buoy streaming follow-up |
| `daisukelab/sound-clf-pytorch` | P0 PyTorch ResNetish/VGGish spectrogram model, `SplitAllDataset`, PyTorch Lightning-style train/validation/test flow, CNN14 embedding branch concept | `mindex_etl/jobs/train_sine_esc50_p0.py`, `mindex_etl/sine/models.py`, `mindex_api/services/sine_acoustic/inference_runtime.py`, `embedding_runtime.py` |
| `ilge/gmtk-audio-classification` | temporal smoothing, hysteresis, HMM-like duration priors, gammatone/bandpass event logic | `detectors.py`, `evidence_fusion.py`, `tests/test_sine_windowed_analysis.py` |
| `ksanjeevan/crnn-audio-classification` | CRNN/GRU temporal model, length-aware batches, packed sequence handling, spectrogram augmentation | P1 `mindex_etl/sine/models.py`, `analysis_runner.py`, temporal whale/insect/rotor/seismic heads |
| `imfing/audio-classification` | engineered feature vector baseline: MFCC, chroma, mel, spectral contrast, tonnetz; simple SVM/NN sanity baseline | `features.py`, `detectors.py`, `tests/test_sine_no_fake_semantics.py` |
| OVH marine sound notebook | 30-second marine windows, marine mammal feature set, marine class manifest shape, hydrophone/Navy domain baseline | `mindex_etl/jobs/build_sine_marine_p0.py`, `mindex_etl/sine/datasets.py`, future `sine-marine-mammal-p0` |
| `braydenoneal/neural-audio-classification` | TorchScript save/load pattern, minimal PyTorch spectrogram CNN, high-resolution spectrogram QA artifact generation | `mindex_etl/sine/export.py`, `inference_runtime.py`, `tests/test_sine_esc50_model_output.py` |

Required direct implementation consequences:

- `features.py` must expose reusable functions for log-mel, MFCC, STFT, PCEN, spectral contrast, chroma, RMS, ZCR, centroid, bandwidth, rolloff, tonnetz/harmonic features, and engineered feature vectors.
- Current local `mindex_api/services/sine_acoustic/features.py` already provides the P0 subset Cursor should consume first: bounded windows, fixed-length audio, NumPy STFT, mel filterbank, log-mel spectrograms, feature tensors, and `feature_sha256`. Extend it for MFCC/PCEN/chroma/spectral contrast later; do not replace it with another hidden feature path.
- `windowing.py` or the existing `features.py` window helpers must support fixed windows, split-all long-file inference, overlap, aggregation, and rolling-buffer metadata for buoy streams.
- `inference_runtime.py` must implement model loading, checksum validation, TorchScript or ONNX inference, top-k postprocessing, and model status reporting.
- Current local `mindex_api/services/sine_acoustic/inference_runtime.py` already implements the P0 runtime seam and passes mocked-execution contract tests. Cursor should wire it into `analysis_runner.py`/analyze/classify persistence after installing or verifying Torch/ONNX Runtime and registering a real artifact.
- `embedding_runtime.py` and `prototype_search.py` must implement true embedding extraction and cosine/vector search, not the current shallow `deep_signal_features` row.
- `evidence_fusion.py` must smooth and fuse model, prototype, and detector evidence using duration priors and confidence/OOD logic.
- `transcripts.py` must generate chronological physical acoustic transcript rows only after evidence fusion.
- Tests must prove the repo-derived patterns are actually wired by checking real feature shapes, window counts, model output provenance, prototype IDs/vector checksums, fusion links, and transcript evidence links.

Useful external acoustic references Morgan asked to include:

- `dimastatz/deep-signal` for signal embedding/pattern concept.
- `pschatzmann/arduino-audio-tools` frequency detection concepts.
- `microsoft/acoustic-bird-detection` for bird pipeline reference.
- `amsehili/auditok` for activity segmentation.
- `pcasabianca/Acoustic-UAV-Identification` for UAV/rotor reference.
- `nationalparkservice/acoustic_discovery` for NPS acoustic discovery and cataloging concepts.

Review licenses before copying any code. Prefer reimplementing the relevant patterns in MINDEX style.

## High-Definition Visualization Requirements

The frontend now behaves like an oscilloscope and spectrogram. The backend visualisation endpoint must return real high-resolution data from actual audio.

`GET /api/mindex/sine/blobs/{blob_id}/visualisation` must honor:

- `start_sec`
- `end_sec`
- `max_waveform_points`
- `max_time_frames`
- `max_frequency_bins`
- `fft_size`
- `hop_length`
- `window_function`
- `db_floor`
- `db_ceiling`
- `include_peaks`
- `quality=oscilloscope`
- `ignore_saved_visualisation=true`

For ordinary short clips, the backend should be able to return:

- 8,192 waveform points.
- 256 frequency bins.
- 1,024 time frames.
- peak rows with time, frequency, magnitude, prominence, and detector source.

If a file is too large, return `visualisation_status: "queued"` or require a bounded window. Do not return low-res stale cached data when high-res was requested.

## Real AI Model Runtime Requirements

The backend must include a real inference runtime. Acceptable runtimes:

- PyTorch eager for development.
- TorchScript for production.
- ONNX Runtime for production.
- Optional transformer runtime when model artifacts are available.

Minimum runtime features:

- Load model artifacts from `/mnt/nas/mindex/models/acoustic/{model_id}/`.
- Verify model checksum before loading.
- Verify label map checksum before inference.
- Record runtime framework, device, load status, and load error.
- Support CPU now.
- Support CUDA if available, but CPU must work.
- Cache loaded model handles safely.
- Do not mark `loaded=true` until the artifact and label map are validated.
- Return `model_status: "model_unavailable"` if artifacts are missing.
- Return `model_status: "model_load_failed"` if dependencies or checksums fail.

Each model output must include:

```json
{
  "id": "uuid",
  "model_id": "sine-esc50-resnetish-v1",
  "model_name": "SINE ESC-50 Environmental CNN",
  "model_version": "v1",
  "framework": "pytorch",
  "runtime": "torchscript",
  "artifact_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/model.pt",
  "model_checksum": "sha256...",
  "label_map_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/labels.json",
  "label_map_checksum": "sha256...",
  "training_dataset": "ESC-50",
  "start_sec": 0,
  "end_sec": 5,
  "sample_rate": 16000,
  "window_sec": 5,
  "top_labels": [
    { "label": "rain", "score": 0.91, "category": "weather" }
  ],
  "embedding_id": "uuid-or-null",
  "latency_ms": 12
}
```

If any semantic label is returned without this kind of model proof, the backend fails the frontend contract.

## P0 Model Build

Build the first real model as:

`sine-esc50-resnetish-v1`

Purpose:

- Prove end-to-end real model training, export, registry, loading, inference, persistence, and frontend readiness.
- Use ESC-50 because the data is already ingested and short enough for fast proof.

Training requirements:

- Use registered MINDEX `library.blob` rows and dataset manifests.
- Do not infer labels from filenames unless the registered ESC-50 manifest maps them.
- Train a PyTorch log-mel CNN/ResNetish model.
- Fixed 5-second windows for ESC-50.
- Use padding/cropping where needed.
- Save metrics, confusion matrix, and label map.
- Export to TorchScript or ONNX.
- Produce a penultimate-layer embedding for prototype matching.

Artifact layout:

```text
/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/
  model.pt
  labels.json
  training_config.json
  metrics.json
  confusion_matrix.json
  manifest.json
  artifact.sha256
  label_map.sha256
```

Registry row requirements:

- model ID and version.
- framework and runtime.
- artifact URI and checksum.
- label map URI and checksum.
- training dataset and manifest.
- metrics and confusion matrix URI.
- sample rate.
- window size.
- embedding dimension.
- target domains.
- class families.
- model status.
- load status.
- backend commit.

## P1 Model Families

After P0 proves the stack, add these model families:

1. Broad environmental acoustic model
   - AudioSet/PANNs/CNN14 style or equivalent.
   - Use as a broad event recognizer for air, water, mechanical, weather, and impulse classes.

2. Bird and animal model
   - Replace current `bird_microsoft` heuristic with a real model path.
   - Keep current bird detector only as signal evidence.

3. UAV/rotor/propeller model
   - Build air rotor, water propeller, helicopter, aircraft, and vessel signatures.
   - Use harmonic-stack DSP as evidence, not final identity.

4. Hydrophone/marine model
   - Add MBARI, NOAA/NPS-style hydrophone domain windows.
   - Distinguish whales, dolphins, fish chorus, vessel/propeller, water impulse, sonar/ping, and unknown.

5. Ground/seismic model
   - Add soil, underground, surface, motor, vibration, earthquake/seismic, and impact categories.

6. Transformer or contrastive embedding model
   - Add AST, PaSST, BEATs, CLAP-style, or an equivalent acoustic transformer/embedding model when artifacts are available.
   - Use embeddings for prototype search and open-set/OOD scoring.

Do not block P0 on every P1 model. P0 must get one real model working end-to-end.

## Prototype Bank And Pattern Matching

Build a real prototype/fingerprint layer. This is where SINE becomes a pattern finder instead of only a classifier.

Required behavior:

- Extract embeddings from a real model or transformer.
- Store embeddings with model ID, model version, vector dimension, vector checksum, source blob, label, source dataset, and human/model provenance.
- Build prototype rows for known sounds.
- Compare query window embeddings to prototypes using cosine similarity or another explicit metric.
- Return OOD distance or score.
- Never return `deep_signal_matches` without vector/prototype proof.

Prototype match row must include:

```json
{
  "id": "uuid",
  "prototype_id": "uuid",
  "embedding_id": "uuid",
  "embedding_model_id": "sine-esc50-resnetish-v1",
  "embedding_dim": 512,
  "vector_checksum": "sha256...",
  "label": "lightning_thunder",
  "source": "human-tagged MINDEX Library",
  "score": 0.87,
  "distance": 0.13,
  "segment_start": 3.5,
  "segment_end": 7.0
}
```

Use `pgvector` if available. If not, store vectors in arrays/JSONB as P0 and make a clear follow-up for `pgvector`.

## Evidence Fusion

Create an evidence fusion layer that links:

- model outputs
- prototype matches
- DSP detector events
- human correction context
- domain support/OOD status

Fusion rows must be explicit and persisted.

Required output:

```json
{
  "id": "uuid",
  "kind": "model_dsp_prototype_fusion",
  "label": "lightning_thunder",
  "event_family": "weather_lightning",
  "score": 0.84,
  "model_output_ids": ["uuid"],
  "prototype_match_ids": ["uuid"],
  "detector_event_ids": ["uuid"],
  "human_identification_ids": [],
  "start_sec": 1.2,
  "end_sec": 4.8
}
```

The frontend will not treat fusion as valid unless it is linked to model/prototype evidence.

## Chronological Sound Transcripts

SINE transcripts are not speech transcription. They are chronological physical acoustic interpretations.

The backend should generate `sound_transcripts` only after evidence fusion. Do not generate transcript prose from filenames, dataset labels, or LLM guesses.

Each transcript must include:

- start/end seconds.
- label.
- human-readable description.
- sound source when known.
- confidence.
- frequency range.
- evidence IDs.
- uncertainty/OOD note when needed.

Example:

```json
{
  "id": "uuid",
  "start_sec": 0.0,
  "end_sec": 3.5,
  "label": "Low-frequency marine vocalization",
  "description": "A low-frequency modulated vocal window with energy concentrated below 400 Hz.",
  "sound_source": "Unknown marine mammal",
  "confidence": 0.72,
  "frequency_range": "120 Hz - 400 Hz",
  "model_output_ids": ["uuid"],
  "prototype_ids": ["uuid"],
  "fusion_evidence_ids": ["uuid"],
  "detector_event_ids": ["uuid"],
  "status": "evidence_backed"
}
```

If the model is uncertain, transcript status should be `unknown` or `needs_review`, not a confident label.

## Human Correction And Training Review Loop

The frontend now lets Morgan correct an identification, for example:

> "The model called this UAV, but I know it is lightning."

Cursor must persist this as human evidence without overwriting model history.

Human correction requirements:

- Store human label.
- Store model prediction at the time of correction.
- Mark `contested=true` when human label disagrees with model/fusion label.
- Store selected region start/end.
- Store loop/reverse/playback rate context.
- Store waveform/spectrogram settings.
- Store selected-region measurements when provided.
- Store confidence and note.
- Queue it for training review.
- Keep it queryable by `GET /api/mindex/sine/training/human-tags`.

This lets future models learn from human-tagged corrections while still checking whether the human was wrong.

## Database Schema

Use or extend existing SINE migrations if present:

- `migrations/20260606_sine_model_registry_jun06_2026.sql`
- `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`
- library wave/human annotation migrations.

Required tables or equivalent:

```text
sine.model_artifact
sine.analysis_run
sine.analysis_window
sine.detector_event
sine.model_output
sine.embedding
sine.prototype
sine.prototype_match
sine.fusion_evidence
sine.sound_transcript
sine.human_review_queue
sine.training_example
library.acoustic_wave_annotation
library.acoustic_human_identification
```

Every persisted row should include:

- UUID primary key.
- blob UUID.
- analysis run ID.
- start/end seconds where applicable.
- created timestamp.
- model/prototype IDs where applicable.
- raw metadata JSONB for future extension.

## Long File And Streaming Requirements

SINE must not try to analyze a 500 MB MBARI file synchronously as one giant clip.

Required behavior:

- For long files, require bounded windows or queue a job.
- Default window: 30 seconds.
- Default overlap: 5 seconds.
- Return job ID and progress.
- Persist per-window results.
- Aggregate clip-level summary only after window results exist.
- Keep window coordinates in every output.

Future Psathyrella buoy path:

- Support rolling buffers.
- Analyze near-real-time acoustic chunks.
- Keep stream/source/device metadata.
- Support water, air, and ground deployment modes.

## Docker And Dependencies

Update the MINDEX API/ETL environment as needed.

Likely dependencies:

- `numpy`
- `scipy`
- `soundfile`
- `librosa`
- `torch`
- `torchaudio`
- `onnxruntime`
- `scikit-learn`
- `auditok`
- optional `pgvector` support if DB allows it

Requirements:

- API container can import runtime deps.
- ETL/training container can train/export/evaluate.
- CPU inference works.
- CUDA is optional and detected honestly.
- Dependency failures return clear `model_load_failed` or `runtime_unavailable`, not fake results.

## Expected Analyze Response Shape

Positive real model response:

```json
{
  "status": "complete",
  "model_status": "model_ready",
  "analysis_run_id": "uuid",
  "blob_id": "uuid",
  "identification_summary": {
    "top_label": "rain",
    "category": "weather_lightning",
    "type": "rain_wind_weather",
    "confidence": 0.91,
    "ood_score": 0.08,
    "model_output_id": "uuid",
    "fusion_evidence_id": "uuid"
  },
  "detector_events": [],
  "frequency_detections": [],
  "activity_segments": [],
  "model_outputs": [],
  "embeddings": [],
  "prototype_matches": [],
  "deep_signal_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "audio_decoded": true,
    "sample_rate_in": 48000,
    "sample_rate_model": 16000,
    "channels": 1,
    "window_sec": 5,
    "feature_pipeline": "log_mel",
    "runtime": "torchscript",
    "device": "cpu",
    "latency_ms": 12
  }
}
```

The arrays above should contain the real rows; they are abbreviated here for shape. The frontend checks the provenance inside those arrays.

## Tests Cursor Must Add

Add focused tests before deploying:

```text
tests/test_sine_missing_model_contract.py
tests/test_sine_no_fake_semantics.py
tests/test_sine_audio_decode_visualisation.py
tests/test_sine_model_registry.py
tests/test_sine_esc50_model_output.py
tests/test_sine_prototype_contract.py
tests/test_sine_fusion_contract.py
tests/test_sine_sound_transcripts.py
tests/test_sine_human_training_queue.py
tests/test_sine_windowed_analysis.py
```

Minimum test gates:

1. Missing model test
   - No model artifact loaded.
   - Analyze real ESC-50 blob.
   - Response has `model_status: model_unavailable`.
   - No semantic identification, transcript, prototype match, or fake model.

2. Real model test
   - Registered `sine-esc50-resnetish-v1`.
   - Analyze real ESC-50 blob.
   - Response has model output with artifact/checksum/label map/training provenance.
   - `identification_summary` links to evidence.

3. Prototype test
   - Query embedding generated by real model.
   - Prototype match includes prototype ID, embedding ID, vector checksum, model ID, score/distance, and window bounds.

4. Transcript test
   - Transcript rows exist only when linked to fusion/model/prototype evidence.

5. Human correction test
   - Save human label "lightning".
   - Preserve model label "uav".
   - Mark contested.
   - Row appears in training queue.

6. Long file test
   - Analyze a large MBARI/hydrophone file.
   - Backend queues or windows it.
   - No synchronous timeout.
   - Every result has window coordinates.

7. Visualization test
   - Request 8192 waveform points and 256 x 1024 spectrogram.
   - Backend honors request for a short real WAV or explicitly reports a legitimate clamp.

## Deployment Checklist

Cursor should not mark this done until all of this is true on VM 189:

- Migrations applied.
- API container restarted.
- Runtime dependencies installed in the correct container image.
- `GET /api/mindex/sine/status` returns real model registry state.
- `GET /api/mindex/sine/models` returns either honest unavailable state or real loaded model rows.
- `POST /api/mindex/sine/blobs/{esc50_uuid}/analyze` passes missing-model contract before model load.
- `POST /api/mindex/sine/blobs/{esc50_uuid}/analyze` passes positive model contract after P0 model load.
- `GET /api/mindex/sine/blobs/{esc50_uuid}/visualisation?...quality=oscilloscope` returns high-definition real visualization.
- `GET /api/mindex/sine/training/human-tags` returns human-tag queue rows when tags exist.
- `http://localhost:3010/sensing/sine` moves from `MINDEX contract failed` to model-backed readiness only when real evidence exists.

## Commands Cursor Should Run

Local backend tests:

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex
python -m pytest tests
```

Backend source search for forbidden fake semantics:

```powershell
rg -n "bird_likely|uav_rotor_likely|spectral_embedding|mindex_sine_v1|Gemini|GoogleGenAI|mockAcousticBlobs|generated WAV|synthetic|filename_fallback|metadata_fallback" mindex_api mindex_etl tests
```

Smoke after deploy:

```powershell
curl.exe -s http://192.168.0.189:8000/api/mindex/health
curl.exe -s http://192.168.0.189:8000/api/mindex/sine/status
curl.exe -s http://192.168.0.189:8000/api/mindex/sine/models
curl.exe -s "http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=5"
```

Use the internal auth token for protected routes. Do not paste token values into docs or chat.

## Acceptance Matrix

This backend pass is not done when:

- the API returns HTTP 200 only.
- detector lanes populate.
- `bird_likely` or `uav_rotor_likely` appears without model proof.
- the frontend can play audio but readiness still says `MINDEX contract failed`.
- a transcript exists but has no evidence IDs.
- `deep_signal_matches` exists but has no prototype/vector proof.
- a model endpoint exists but no artifact/checksum/label map is loaded.

This backend pass is done when:

- SINE can decode real NAS audio.
- SINE can produce high-definition real visualization.
- Missing models are reported honestly.
- At least one P0 PyTorch/TorchScript/ONNX model runs on a real registered acoustic blob.
- Model outputs are persisted with artifact and label-map provenance.
- Prototype matches are real embedding/vector comparisons.
- Fusion evidence links model/prototype/DSP evidence.
- Sound transcripts are chronological and evidence-linked.
- Human corrections are saved, contested when needed, and exposed for training review.
- The Website frontend shows model-backed readiness only when the above evidence exists.

## Paste-Ready Cursor Prompt

Use this exactly as the next Cursor objective:

```text
You are Cursor working in D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex.

Morgan QA-tested SINE and confirmed that Run SINE analysis is not doing real acoustic AI. Fix the MINDEX backend. This is acoustic-only.

Build the real SINE classifier stack:

1. Stop fake semantic output. If no model artifact is loaded, analyze must return model_status=model_unavailable, no identification_summary, no model_outputs, no prototype/deep_signal semantic matches, no fusion_evidence, and no sound_transcripts. DSP detector rows may remain as detector evidence only.
2. Decode real registered library.blob acoustic UUIDs from /mnt/nas/mindex/Library/acoustic. Preserve sample rate, channels, duration, hash, and window diagnostics.
3. Make /sine/blobs/{id}/visualisation honor high-definition oscilloscope params from the Website: 8192 waveform points, 256 frequency bins, 1024 time frames, fft_size, hop_length, dB floor/ceiling, peaks, and real sample-derived arrays.
4. Implement model registry/runtime with PyTorch/TorchScript or ONNX Runtime. Load model artifacts from /mnt/nas/mindex/models/acoustic/{model_id}, verify checksums and label maps, and report honest model_status.
5. Train/export/register P0 model sine-esc50-resnetish-v1 from registered ESC-50 rows. Use log-mel CNN/ResNetish PyTorch, export TorchScript or ONNX, store metrics/confusion matrix/manifest/checksums.
6. Add real inference into POST /api/mindex/sine/blobs/{id}/analyze. Persist model_outputs with model/artifact/checksum/label-map/training provenance and window coordinates.
7. Build embeddings and prototype search. deep_signal_matches must come only from real embedding/vector/prototype comparisons with prototype ID, embedding ID, vector checksum, model ID, score/distance, and window bounds.
8. Calibrate open-set/OOD behavior. Persist confidence margin, entropy, normalized entropy, OOD score/status, thresholds, and honest unknown/queued-review states. Weak or out-of-distribution clips must not create confident semantic identity.
9. Build evidence_fusion rows linking model outputs, prototype matches, and detector events.
10. Generate chronological sound_transcripts only when linked to model/prototype/fusion evidence IDs.
11. Persist human corrections and expose GET /api/mindex/sine/training/human-tags. If human label disagrees with model label, mark contested and keep both records.
12. Add tests for missing-model honesty, no fake semantics, real ESC-50 model output, prototype contract, OOD/open-set rejection, fusion contract, transcript evidence links, high-def visualization, human training queue, and long-file windowing.
13. Deploy to VM 189, install runtime deps, apply migrations, restart API, and smoke test from 3010.

Do not use Gemini, mockAcousticBlobs, generated WAVs, synthetic matrices, filename labels, metadata labels, or detector-only semantic classification. Do not touch chemistry or unrelated MINDEX tabs.

Completion requires the Website at /sensing/sine to move from MINDEX contract failed to model-backed readiness only when real model/prototype/fusion/transcript evidence exists.
```
