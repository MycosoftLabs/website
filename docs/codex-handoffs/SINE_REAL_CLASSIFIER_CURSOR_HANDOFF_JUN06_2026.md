# SINE Real Acoustic Classifier - Cursor Backend Handoff

Date: June 6, 2026

Prepared by: Codex

Target backend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Website contract repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

## Executive Summary

Morgan QA-tested SINE and confirmed the important failure: `Run SINE analysis` is not doing real learned acoustic classification yet. MINDEX can list NAS-backed acoustic files, stream WAVs, compute basic detector rows, and return waveform/spectrogram-like data. That is not enough.

The current backend is an honest detector shell, not a real classifier. It can produce FFT peaks, activity windows, bird-band heuristics, rotor heuristics, NPS-style heuristics, and shallow spectral feature rows. Those are useful signal evidence, but they do not identify what a recording means.

Cursor must build the real SINE backend: real decoded audio, real PyTorch/TorchScript/ONNX or transformer inference, real embedding/prototype matching, real evidence fusion, real chronological sound transcripts, and real human correction/training review persistence.

This is acoustic-only. Do not work on chemistry, DNA, PubChem, DWSIM, Cantera, or unrelated MINDEX tabs.

## Current Backend Truth

Inspected MINDEX files:

- `mindex_api/services/sine_acoustic/classifier.py`
- `mindex_api/services/sine_acoustic/pipeline.py`
- `mindex_api/services/sine_acoustic/event_views.py`
- `mindex_api/services/sine_acoustic/visualisation.py`
- `mindex_api/services/sine_acoustic/model_runtime.py`
- `mindex_api/services/sine_acoustic/persisted_evidence.py`
- `mindex_api/services/sine_acoustic/request_contract.py`
- `mindex_api/routers/sine_acoustic.py`
- `mindex_api/routers/library.py`
- `migrations/20260606_sine_model_registry_jun06_2026.sql`
- `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`
- `tests/test_acoustic_event_views.py`
- `tests/test_sine_model_runtime.py`
- `tests/test_sine_registry_contract.py`
- `tests/test_sine_request_contract.py`
- `tests/test_sine_evidence_migration_contract.py`

Observed current behavior:

- `classify_acoustic_file()` calls `run_full_analysis()` and returns grouped detector output.
- `run_full_analysis()` loads a mono waveform and runs deterministic detector functions only.
- Registered detector functions currently include:
  - `frequency_fft`
  - `activity_auditok`
  - `bird_microsoft`
  - `uav_rotor`
  - `nps_discovery_match`
  - `deep_signal_features`
  - `visualisation_sonic`
- `event_views.py` now tries to keep detector-only output honest by returning `identification_summary: null` unless model/prototype/fusion/transcript evidence exists.
- `deep_signal_features` is not a neural model. It returns feature evidence, not a 512D learned embedding with prototype proof.
- `bird_microsoft` is a heuristic detector row, not the Microsoft acoustic bird model.
- `uav_rotor` is a rotor-harmonic heuristic, not a trained UAV classifier.
- `nps_discovery_match` is a profile-style heuristic, not National Park Service acoustic discovery model evidence.
- `visualisation.py` can return real waveform/spectrogram arrays, but the backend visualisation must still be treated as P0/P1 quality unless verified against request size, real decoded file path, and high-definition axes.
- The backend now has useful registry/evidence plumbing: `/sine/models`, `/sine/models/{model_id}`, `/sine/prototypes`, `sine.model_artifact`, `sine.prototype`, `sine.model_output`, `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript`.
- `model_runtime.py` only inspects whether registry rows, optional runtime libraries, and artifacts exist. It explicitly does not classify audio and appends `model_inference_not_implemented` when the registry/runtime layer is present but inference is still missing.
- `persisted_evidence.py` can read saved model/prototype/fusion/transcript evidence for an analysis run, but the detector pipeline does not currently create real learned `model_outputs`, real prototype matches, real fusion rows, or real sound transcripts.

Required interpretation:

- A `200` response is not a pass.
- A `status: complete` detector run is not a classification pass.
- Detector evidence is allowed.
- Registry/evidence schema presence is not a classification pass.
- Runtime dependency presence is not a classification pass.
- Semantic identity is not allowed unless backed by real inference rows in `sine.model_output`, real embedding/prototype rows in `sine.prototype_match`, real linked `sine.fusion_evidence`, or evidence-linked `sine.sound_transcript`.

## Current Website Frontend Truth

Inspected Website files:

- `components/sensing/sine-acoustic-player.tsx`
- `lib/mindex/sine-contract.ts`
- `app/sensing/sine/player/page.tsx`
- `app/sensing/[slug]/page.tsx`
- `components/mindex/tabs/library-tab.tsx`

Current shared-surface status:

- `/sensing/sine/player` renders `SineAcousticPlayer` directly.
- `/sensing/sine` also renders `SineAcousticPlayer` directly for the `sine` slug.
- The MINDEX Library acoustic panel uses the same shared player/component contract.
- Do not create a duplicate SINE player. Improve `components/sensing/sine-acoustic-player.tsx` so all three surfaces move together.

Current frontend capabilities already present:

- Requests high-definition visualisation defaults through `lib/mindex/sine-contract.ts`: 8192 waveform points, 1024 time frames, 256 frequency bins, FFT 2048, hop 128, Hann window, backend peak rows.
- Supports water, air, and ground target domains.
- Supports broad sound targets: marine life, animals, insects, air propellers, water propellers, vessels, machinery, explosions/impulses, lightning, seismic/ground, unknown/OOD, and human-contested labels.
- Uses evidence gates so detector rows do not become trusted semantic meaning.
- Reads model outputs, prototype matches, fusion evidence, and evidence-linked sound transcripts when MINDEX returns them.
- Provides oscilloscope-style modes: overlay, spectrogram, waveform, spectrum, waterfall, grid, persistence, band guides, peaks, event lanes, calibrated divisions, and scope-control knobs.
- Includes human identification controls that save a human label beside model output instead of overwriting it.
- Exposes QA data attributes for model runtime, evidence, catalog rows, selected blob IDs, playback state, analysis state, scope resolution, backend peaks, architecture coverage, target coverage, and sound target coverage.

Website BFF routes already wired for Cursor to satisfy:

- `GET /api/mindex/sine/status` -> MINDEX `/api/mindex/sine/status`
- `GET /api/mindex/sine/models` -> MINDEX `/api/mindex/sine/models`
- `GET /api/mindex/sine/models/{model_id}` -> MINDEX `/api/mindex/sine/models/{model_id}`
- `GET /api/mindex/sine/prototypes` -> MINDEX `/api/mindex/sine/prototypes`
- `GET /api/mindex/sine/blobs/{id}/analysis` -> MINDEX `/api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation` -> MINDEX `/api/mindex/sine/blobs/{id}/visualisation`
- `POST /api/mindex/sine/blobs/{id}/analyze` -> MINDEX `/api/mindex/sine/blobs/{id}/analyze`
- `POST /api/natureos/mindex/library/classify?id={id}` -> MINDEX `/api/mindex/library/blobs/{id}/classify`
- `GET|POST /api/natureos/mindex/library/human-identification` -> MINDEX library human-identification routes
- `GET|POST /api/natureos/mindex/library/wave-annotation` -> MINDEX library wave-annotation routes

Both SINE analyze and Library classify proxy the same no-fake evidence contract. Cursor should treat these Website routes as the frontend contract, not as separate products.
The shared player reads `/api/mindex/sine/models` for registry rows and then reads `/api/mindex/sine/models/{model_id}` for the leading registered model so artifact/checksum/label-map/metrics detail can enrich the same model evidence panel.

Frontend validation from this Codex pass:

- `npm.cmd run lint -- --file components/sensing/sine-acoustic-player.tsx --file lib/mindex/sine-contract.ts`
  - Result: passed with no ESLint warnings or errors.
- `npx.cmd tsc --noEmit --pretty false --project tsconfig.json --incremental false`
  - Result: passed.
- `git diff --check` on the shared SINE files and this handoff
  - Result: no whitespace errors; existing CRLF warning only for `app/sensing/sine/player/page.tsx`.
- Browser runtime probe on `http://localhost:3010/sensing/sine?codex_sine_ready=1780700396769`
  - Result: shared player root present with `data-sine-player-mode="standalone"`.
  - Catalog result: `data-sine-catalog-status="ready"`, `data-sine-known-acoustic-files="2180"`, `data-sine-registry-backed-rows="true"`, `data-sine-loaded-files="36"`.
  - Selected real file: `1-100038-A-14.wav`, source `esc50`, environment `air`, UUID-backed selected ID `6a8492b5-0796-43b3-be42-1ccd753f5d12`.
  - Audio result: HTML audio `readyState=4`, duration `5`, no media error, stream served through `/api/natureos/mindex/library/file?...remote_id=6a8492b5-0796-43b3-be42-1ccd753f5d12`.
  - Scope result: `data-sine-scope-source="browser-real-audio"`, `data-sine-visualisation-status="ready"`, `data-sine-scope-waveform-points="8192"`, `data-sine-scope-spectrogram-rows="256"`, `data-sine-scope-spectrogram-cols="1024"`, `data-sine-scope-fft-size="2048"`, `data-sine-scope-window-function="hann"`.
  - Canvas result: one visible scope canvas with CSS size about `826 x 320` and backing store `1652 x 640`.
  - Controls visible: Overlay, Spectrogram, Waveform, Spectrum, Waterfall, Grid, Persist, Bands, Peaks, Lanes, palette selector, time/frequency division selectors, oscilloscope control bank, transcript panel, and human identification panel.
  - Backend blocker visible: `data-sine-contract-status="contract_violation"`, `data-sine-contract-label="Missing model status"`, `data-sine-readiness="mindex-contract-failed"`, `data-sine-model-runtime-live="false"`, `data-sine-model-evidence-present="false"`, `data-sine-model-targets-covered="0"`, `data-sine-sound-targets-covered="0"`.
- Fresh-tab runtime probe on `http://localhost:3010/sensing/sine?codex_sine_fresh_probe=1780700396769`
  - Result after catalog ready: `data-sine-readiness="instrument-ready-ai-pending"`, `data-sine-contract-status="pending"`, `data-sine-contract-label="No analysis payload"`.
  - Catalog result: `data-sine-catalog-status="ready"`, `data-sine-loaded-files="36"`, `data-sine-filtered-files="36"`, `data-sine-total-files="2000"`, `data-sine-registry-backed-rows="true"`.
  - Scope result: `data-sine-scope-source="browser-real-audio"`, `data-sine-scope-waveform-points="8192"`, `data-sine-scope-spectrogram-rows="256"`, `data-sine-scope-spectrogram-cols="1024"`.
  - Audio/canvas result: HTML audio `readyState=4`, duration `5`, one visible canvas with CSS size about `826 x 320` and backing store `1652 x 640`.
  - Interpretation: the frontend is instrument-ready and waiting for real AI/model evidence; this is the desired non-fake state before Cursor deploys a trained classifier.
- Browser console caveat:
  - Browser dev logs also contained React development errors `Cannot read properties of null (reading 'removeChild')` and `Should not already be working`.
  - These messages are not SINE classification evidence and were not fixed in this backend handoff pass.
  - They resemble existing CREP/MapLibre unmount noise in the repo; keep them separate from the SINE classifier backend task unless a fresh isolated production-style SINE run proves they originate in the shared SINE player.

Frontend conclusion:

The next meaningful SINE gap is not another fake frontend classifier. The Website is ready to display real backend evidence when Cursor provides it. The backend must now return model/prototype/fusion/transcript evidence from real audio, or the frontend will continue to correctly show detector-only/incomplete readiness.

## Hard Rule: No Fake Semantics

When no checksum-verified model artifact is loaded, the response must be honest:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_status": "detector_only",
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
    "metadata_fallback_used": false,
    "synthetic_output_used": false
  }
}
```

Forbidden:

- No Gemini, ChatGPT, MYCA, or any LLM as the primary classifier.
- No classification from filename, folder, dataset label, manifest label, source metadata, or user-facing title.
- No generated WAV buffers.
- No generated waveform or spectrogram matrices.
- No semantic `identification_summary` from detector rows alone.
- No `deep_signal_matches` unless they are true embedding/prototype matches.
- No `sound_transcripts` unless every transcript links to evidence IDs.
- No hard-coded model names like `mindex_sine_v1` unless a real registered model artifact with checksum exists.

Allowed:

- Detector-only signal evidence.
- Honest `unknown`, `out_of_domain`, or `model_unavailable`.
- MYCA explanations later, but only over proven evidence already stored by SINE.

## Google AI Studio Prototype Audit

Local path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Useful frontend/product ideas:

- High-contrast cyan/black hydrophone style.
- Combined waveform plus spectrogram player.
- Chronological `sound_transcripts` lanes.
- Model architecture panels.
- Detector lanes.
- Prototype/fingerprint vocabulary.

Production rejects:

- `server.ts` imports `GoogleGenAI` and asks Gemini to generate acoustic classifications from metadata.
- `server.ts` creates synthetic WAV buffers.
- `server.ts` creates synthetic waveform/spectrogram matrices.
- `src/data/acousticData.ts` is mock data.
- `generateDspHeuristicPayload()` invents labels like whale, dog, UAV, and explosion from metadata.
- `SINEStatus.tsx` presents model readiness/calibration without database/runtime proof.

Cursor must not port the AI Studio server as backend. Use it only as UI vocabulary and response-shape inspiration.

## External Repo Audit And How To Use It

Local audit workspace:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos`

Use these as implementation references. Do not vendor code blindly. Re-check licenses before copying code; no-license repos are design references only.

### `daisukelab/sound-clf-pytorch`

Best P0 PyTorch reference.

Use:

- ResNetish/VGGish/CNN14-style spectrogram model patterns.
- `LMSClfDataset` fixed clip handling.
- `SplitAllDataset` style long-file split inference.
- PyTorch training/evaluation wrapper ideas.
- Penultimate embedding output for prototype matching.

Do not use:

- Unreviewed external weights.
- Repo-specific configs without MINDEX model registry.

### `IBM/MAX-Audio-Classifier`

Best serving-shape reference.

Use:

- Clean `/predict` style separation: decode, embeddings/features, model inference, postprocess.
- Optional `start_time` style bounded inference.
- Top-k labels with IDs and scores.
- Model metadata endpoint pattern.

Do not use:

- Old TensorFlow/MAX runtime as-is.
- Fixed 527 AudioSet assumptions as SINE's only taxonomy.

### `ksanjeevan/crnn-audio-classification`

Best temporal CRNN reference.

Use:

- Mel spectrogram frontend.
- CNN plus recurrent model for changing patterns.
- Length-aware sequence handling.
- Time-stretch/noise augmentation patterns.

Needed for:

- Whale calls, dolphin whistles/clicks, insects, rotors, propeller cavitation, thunder rolls, tremor/seismic sequences.

### `daisukelab/ml-sound-classifier`

Best long-file/realtime reference.

Use:

- Rolling audio buffer.
- Long spectrogram split inference.
- Geometric/aggregate prediction across windows.
- Domain-specific app configs.
- Class balance, mixup, metrics, confusion matrix.

Needed for:

- MBARI/hydrophone files.
- Psathyrella buoy stream windows.
- Future live Navy/hydrophone workflows.

### `GorillaBus/urban-audio-classifier`

Useful feature/evaluation baseline.

Use:

- Normalized log-mel/MFCC feature helpers.
- Padding to fixed model input width.
- Confusion matrix and per-class metric reporting.
- Augmentation ideas for training only.

### `imfing/audio-classification`

Useful engineered baseline reference.

Use:

- MFCC, chroma, mel, spectral contrast, tonnetz feature vector ideas.
- SVM/dense/1D CNN as sanity baselines only.

Do not use:

- Path-label assumptions.
- Old Keras `predict_classes`.

### `abishek-as/Audio-Classification-Deep-Learning`

Useful only as a baseline comparison reference.

Use:

- Multi-head comparison concept: ANN, 1D CNN, 2D CNN evaluating the same clip.
- Shared feature extractor feeding multiple heads.

Do not use:

- H5 Keras assets.
- Django app.
- Average-only MFCC as primary hydrophone/rotor/seismic classifier.

### `braydenoneal/neural-audio-classification`

Useful TorchScript export reference.

Use:

- `torch.jit.script(...).save(...)`.
- `torch.jit.load(...)` inference pattern.
- Spectrogram artifact generation for QA.

Do not use:

- Spoken-digit label assumptions.
- CUDA-only prediction path.
- Extremely dense hop settings for production long-file analysis unless bounded.

### OVH Marine Sound Classification Notebook

Useful marine domain baseline.

Use:

- Marine mammal dataset/windowing flow.
- 30-second marine window convention.
- Watkins/marine class-family framing after license review.
- Feature list: STFT, rolloff, chroma, RMS, centroid, bandwidth, ZCR, harmony/perceptr, tempo, MFCC.

Do not use:

- Dense tabular classifier as final Navy-grade model.
- Any Kaggle/Watkins data without provenance and license manifest.

### `ilge/gmtk-audio-classification`

The local checkout currently has only `.git`; no working tree files were available locally. Previous audit notes indicate possible HMM/gammatone/event-smoothing ideas. Treat it as not actionable until Cursor/new model fetches and verifies a usable source.

## Target SINE Architecture

SINE must become a multi-layer acoustic intelligence stack:

1. Library blob resolver
2. Real audio decoder
3. Window scheduler for long files and live streams
4. Deterministic DSP feature extractor
5. High-definition visualization generator
6. Registered model artifact loader
7. PyTorch/TorchScript/ONNX/foundation model inference
8. Embedding/prototype search
9. Evidence fusion
10. Chronological sound transcript builder
11. Human correction and contested-label training review
12. Model metrics, provenance, and audit reports

## Domains And Label Families

Do not make SINE only birds and rotors.

SINE must support water, air, and ground.

Water:

- whales
- dolphins
- porpoises
- fish choruses
- underwater biologics
- vessel hums
- boat propellers
- submerged propellers
- sonar/pings
- underwater machinery
- pressure impulses
- explosions/impacts
- weather/wave state
- unknown/out-of-domain

Air:

- birds
- insects
- mammals
- amphibians
- UAVs/drones/quadcopters
- helicopters
- airplanes
- machinery
- actuators/motors
- lightning/thunder
- rain/wind/storms
- explosions/impacts
- unknown/out-of-domain

Ground:

- seismic/earthquake
- underground acoustic activity
- soil bioacoustics
- surface vibration
- motors/actuators/servos/steppers
- infrastructure/mechanical sounds
- impacts/impulses
- unknown/out-of-domain

## P0 Implementation

### P0.1 Audio Resolve And Decode

Build:

- `mindex_api/services/sine_acoustic/audio_decode.py`
- or upgrade `audio_io.py` if Cursor prefers the existing file.

Requirements:

- Resolve `library.blob` by UUID.
- Verify category is acoustic.
- Resolve NAS-backed file path safely under mounted storage.
- Verify file exists and size is nonzero.
- Verify content hash when available.
- Decode real audio only.
- Support WAV first, then FLAC/MP3/OGG/M4A with ffmpeg fallback.
- Preserve source sample rate, channel count, duration, and codec diagnostics.
- Resample only after source diagnostics are stored.

### P0.2 High-Definition Visualization

Upgrade:

- `mindex_api/services/sine_acoustic/visualisation.py`
- `GET /api/mindex/sine/blobs/{id}/visualisation`

Requirements:

- Accept `start_sec`, `end_sec`, `max_waveform_points`, `max_time_frames`, `max_frequency_bins`, `fft_size`, `hop_length`, and `window_function`.
- Return real decoded data only.
- Short clips should support at least 8192 waveform/envelope points.
- Short clips should support at least 256 frequency bins x 1024 time frames.
- Return `sample_rate_hz`, `duration_sec`, `channels`, `fft_size`, `hop_length`, `window_function`, `db_floor`, `db_ceiling`, `normalization`, `frequency_min_hz`, `frequency_max_hz`.
- Return `peaks[]` with `time_sec`, `frequency_hz`, `magnitude_db`, `prominence`, and `source`.
- Return `visualisation_status: ready | clamped | queued | failed`.
- Return clamp/downsample metadata for large files.
- Plan multi-channel metadata.

Frontend reference components:

- `WEBSITE/website/components/fungi-compute/oscilloscope.tsx`
- `WEBSITE/website/components/fungi-compute/stft-spectrogram.tsx`
- `WEBSITE/website/components/fungi-compute/spectrum-analyzer.tsx`
- `WEBSITE/website/components/fungi-compute/signal-fingerprint.tsx`

### P0.3 Honest Missing-Model Contract

Before adding model output, keep the endpoint honest:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`

If no registered model is loaded:

- return detector evidence only
- return `model_status: model_unavailable`
- return `identification_summary: null`
- return empty `model_outputs`, `prototype_matches`, `deep_signal_matches`, `fusion_evidence`, `sound_transcripts`
- set all fallback flags to false

Add tests that fail if detector labels become semantic identity.

## P1 Real Learned Model

First real deployable model:

`sine-esc50-resnetish-v1`

Requirements:

- PyTorch training.
- Deploy as TorchScript or ONNX Runtime.
- Input: decoded real audio windows.
- Feature: log-mel or PCEN spectrogram.
- Output: top-k labels, scores, OOD score if available, window bounds.
- Persist output to `sine.model_output`.
- Register artifact in `sine.model_artifact`.
- Store label map, model checksum, metrics, confusion matrix, training manifest, backend commit, runtime, and device.

Acceptance:

- One short ESC-50 clip returns a real `model_outputs[]` row.
- The row includes `model_id`, `model_version`, `artifact_sha256`, `label_map_sha256`, `start_sec`, `end_sec`, top labels, confidence, and latency.
- If the same clip only returns detector rows, P1 is not done.

## P2 Water/Air/Ground Models

After P1:

- `sine-marine-window-crnn-v1`
- `sine-air-bioacoustic-transformer-v1`
- `sine-rotor-propeller-crnn-v1`
- `sine-ground-seismic-cnn-v1`
- `sine-impulse-weather-v1`

Recommended model families:

- CRNN / CNN-GRU for evolving sequences.
- ResNetish/CNN14/PANNs-style CNN for spectrogram classification.
- AST, BEATs, CLAP, or other audio foundation models only when packaged locally with checksum, label map, metrics, and clear license/provenance.
- MFCC/log-mel shallow baselines only as diagnostics.

## P3 Prototype And Fingerprint Matching

Build a real prototype catalog. This is required for "deep signal matching."

Prototype requirements:

- `prototype_id`
- source dataset/corpus
- license/provenance
- source blob/window
- domain
- class family
- label
- embedding model ID
- embedding dimension, target 512D when using the deep embedding path
- vector checksum or pgvector reference
- feature config checksum
- metrics/evaluation timestamps

Match requirements:

- `prototype_id`
- `model_id` or `embedding_model_id`
- `segment_start`
- `segment_end`
- similarity/distance
- OOD threshold
- source/corpus proof
- vector checksum

Only these proof-backed rows may appear as `deep_signal_matches` or `prototype_matches`.

## P4 Evidence Fusion And Sound Transcripts

Sound transcripts are not speech transcripts and not free prose. They are chronological physical-acoustic interpretations tied to evidence.

Each transcript must include:

- `start_sec`
- `end_sec`
- `label`
- `description`
- `sound_source`
- `confidence`
- `frequency_range`
- `model_output_ids`
- `prototype_match_ids`
- `fusion_evidence_ids`
- optional detector event IDs

Do not insert transcript rows unless at least one evidence array is non-empty.

Valid example:

```json
{
  "start_sec": 3.5,
  "end_sec": 7.0,
  "label": "modulated_low_frequency_vocalization",
  "description": "Low-frequency modulated sweep with strong harmonic structure.",
  "sound_source": "marine mammal candidate",
  "confidence": 0.86,
  "frequency_range": "120 Hz - 750 Hz",
  "model_output_ids": ["uuid"],
  "prototype_match_ids": ["uuid"],
  "fusion_evidence_ids": ["uuid"]
}
```

Invalid:

- description generated from filename
- description generated from dataset title
- description generated from detector label alone
- transcript with no evidence IDs

## P5 Human Correction And Training Review

Morgan must be able to correct wrong model output without overwriting the model.

Example:

- model says UAV
- Morgan knows it is lightning

Required behavior:

- keep the model prediction
- save the human label separately
- mark it as `human_tagged`
- store reviewer, certainty, notes, window/segment, timestamp
- create contested review record when model and human disagree
- queue a training example for future review
- never silently overwrite model output with the human label

Existing backend annotations may already include:

- `library.acoustic_wave_annotation`
- `library.acoustic_human_identification`

Extend or bridge those into `sine.human_review_queue` and `sine.training_example`.

## P6 Long Files, Psathyrella Buoy, And Navy/Hydrophone Use

Large MBARI files and future Psathyrella buoy streams must use bounded windows.

Requirements:

- support `start_sec`, `end_sec`, `window_sec`, `overlap_sec`, `window_index`
- default large-file analysis to 30-second windows with overlap
- support queued background jobs
- persist per-window model outputs
- aggregate only after per-window evidence exists
- support rolling-buffer analysis for buoy/Jetson streams later
- include water/ground operational categories, not only air/bird/UAV

Acceptance:

- One short ESC-50 clip model-backed result.
- One missing-model/OOD negative result.
- One MBARI/hydrophone or Psathyrella-window bounded result, queued result, or honest OOD result.
- No whole-file blocking request against giant files.

## Required Database Schema

Use existing `library.blob` as file source. Add or complete `sine` schema tables:

- `sine.model_artifact`
- `sine.model_label_map`
- `sine.analysis_run`
- `sine.detector_event`
- `sine.model_output`
- `sine.prototype`
- `sine.prototype_embedding`
- `sine.prototype_match`
- `sine.fusion_evidence`
- `sine.sound_transcript`
- `sine.human_review_queue`
- `sine.training_example`

Minimum required columns are described below.

### `sine.model_artifact`

- `id uuid primary key`
- `model_id text unique not null`
- `model_name text not null`
- `model_version text not null`
- `domain text not null`
- `target_domains text[] not null default '{}'`
- `class_families text[] not null default '{}'`
- `framework text not null`
- `runtime text not null`
- `artifact_uri text not null`
- `artifact_sha256 text not null`
- `label_map_uri text not null`
- `label_map_sha256 text not null`
- `training_dataset text not null`
- `training_manifest_uri text`
- `metrics_uri text`
- `confusion_matrix_uri text`
- `embedding_dim integer`
- `window_sec numeric not null`
- `sample_rate integer not null`
- `n_mels integer`
- `status text not null`
- `loaded boolean not null default false`
- `device text`
- `backend_commit text`
- `registered_at timestamptz not null default now()`
- `last_loaded_at timestamptz`
- `last_successful_inference_at timestamptz`
- `load_error text`

### `sine.analysis_run`

- `id uuid primary key`
- `blob_id uuid not null`
- `status text not null`
- `model_status text not null`
- `analysis_scope text not null`
- `start_sec numeric`
- `end_sec numeric`
- `window_sec numeric`
- `window_index integer`
- `window_count integer`
- `requested_by text`
- `evidence_contract jsonb not null default '{}'::jsonb`
- `audio_decoded boolean not null default false`
- `sample_rate_in integer`
- `sample_rate_model integer`
- `channels integer`
- `duration_sec numeric`
- `feature_pipeline text`
- `semantic_fallback_used boolean not null default false`
- `llm_fallback_used boolean not null default false`
- `filename_fallback_used boolean not null default false`
- `metadata_fallback_used boolean not null default false`
- `created_at timestamptz not null default now()`
- `started_at timestamptz`
- `completed_at timestamptz`
- `error text`

### `sine.model_output`

- `id uuid primary key`
- `analysis_run_id uuid not null references sine.analysis_run(id)`
- `blob_id uuid not null`
- `model_id text not null references sine.model_artifact(model_id)`
- `model_version text not null`
- `framework text not null`
- `runtime text not null`
- `artifact_sha256 text not null`
- `label_map_sha256 text not null`
- `start_sec numeric not null`
- `end_sec numeric not null`
- `top_labels jsonb not null`
- `embedding_id uuid`
- `embedding_sha256 text`
- `ood_score numeric`
- `latency_ms integer`
- `created_at timestamptz not null default now()`

### `sine.detector_event`

- `id uuid primary key`
- `analysis_run_id uuid not null references sine.analysis_run(id)`
- `blob_id uuid not null`
- `detector text not null`
- `event_type text not null`
- `start_sec numeric not null`
- `end_sec numeric not null`
- `confidence numeric`
- `value numeric`
- `unit text`
- `features jsonb not null default '{}'::jsonb`

### `sine.prototype`, `sine.prototype_match`, `sine.fusion_evidence`, `sine.sound_transcript`

These tables must store enough IDs and checksums to prove every semantic label. Do not allow any semantic response without evidence rows.

## Required API Surfaces

Keep the production MINDEX routes. Do not replace them with a standalone toy `/api/classify` unless it is an internal worker behind these routes.

- `GET /api/mindex/sine/status`
- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/models/{model_id}`
- `GET /api/mindex/sine/prototypes`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `POST /api/mindex/library/wave-annotation`
- `GET /api/mindex/library/wave-annotations`
- `POST /api/mindex/library/human-identification`
- `GET /api/mindex/library/human-identifications`
- optional queued-job endpoints for long files

## Expected Analyze Response Shape

The frontend is ready to consume this style of response:

```json
{
  "status": "complete",
  "analysis_run_id": "uuid",
  "model_status": "model_ready",
  "identification_status": "model_evidence",
  "identification_summary": {
    "top_label": "lightning_thunder",
    "category": "weather_impulse",
    "type": "air_ground_transient",
    "confidence": 0.91,
    "ood_score": 0.08,
    "model": "sine-impulse-weather-v1"
  },
  "model_outputs": [
    {
      "id": "uuid",
      "model_id": "sine-impulse-weather-v1",
      "model_version": "1.0.0",
      "artifact_sha256": "sha256",
      "label_map_sha256": "sha256",
      "start_sec": 0.0,
      "end_sec": 5.0,
      "top_labels": [
        {"label": "lightning_thunder", "score": 0.91},
        {"label": "uav_rotor", "score": 0.12}
      ],
      "ood_score": 0.08,
      "latency_ms": 42
    }
  ],
  "prototype_matches": [],
  "fusion_evidence": [
    {
      "id": "uuid",
      "label": "lightning_thunder",
      "event_family": "weather_impulse",
      "start_sec": 0.0,
      "end_sec": 5.0,
      "score": 0.89,
      "model_output_id": "uuid",
      "detector_event_ids": ["uuid"]
    }
  ],
  "sound_transcripts": [
    {
      "start_sec": 0.0,
      "end_sec": 5.0,
      "label": "lightning_thunder",
      "description": "Short high-energy impulse followed by broadband thunder decay.",
      "sound_source": "weather event candidate",
      "confidence": 0.89,
      "frequency_range": "40 Hz - 8 kHz",
      "model_output_ids": ["uuid"],
      "fusion_evidence_ids": ["uuid"],
      "prototype_ids": []
    }
  ],
  "frequency_detections": [],
  "activity_segments": [],
  "detector_evidence": [],
  "diagnostics": {
    "audio_decoded": true,
    "sample_rate_in": 16000,
    "channels": 1,
    "runtime": "onnxruntime",
    "device": "cpu",
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false,
    "synthetic_output_used": false
  }
}
```

## Tests Cursor Must Add

Add backend tests that prove:

- detector-only cannot produce `identification_summary`
- detector-only cannot produce `sound_transcripts`
- missing model returns `model_unavailable`
- fake model names are rejected
- visualisation is computed from decoded samples and includes requested size/axis metadata
- ESC-50 registered model can produce `model_outputs[]`
- model artifact SHA mismatch prevents inference
- label-map SHA mismatch prevents inference
- large MBARI file returns bounded window or queued response
- human correction creates a review queue row without overwriting model output
- prototypes require vector checksum or pgvector reference
- transcript rows require evidence IDs

Recommended test files:

- `tests/test_sine_no_fake_semantics.py`
- `tests/test_sine_audio_decode_visualisation.py`
- `tests/test_sine_model_registry.py`
- `tests/test_sine_missing_model_contract.py`
- `tests/test_sine_esc50_model_output.py`
- `tests/test_sine_prototype_contract.py`
- `tests/test_sine_windowed_analysis.py`
- `tests/test_sine_human_correction.py`

## Deployment Evidence Cursor Must Return

Cursor should not say "done" until it returns:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path on NAS or VM
- model artifact SHA-256
- label map path
- label map SHA-256
- model runtime and device
- training dataset manifest path
- metrics/confusion matrix path
- `GET /api/mindex/sine/status` showing model registry truth
- negative missing-model response
- positive ESC-50 model-backed response
- one hydrophone/MBARI/Psathyrella bounded-window response, queued response, or honest OOD response
- one high-definition visualisation response with waveform/spectrogram metadata
- one human correction round trip
- website `3010` smoke showing the frontend accepts evidence-backed classification

## Paste-Ready Cursor Prompt

Cursor, build the real SINE acoustic classifier backend in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`.

Morgan QA-tested SINE and confirmed `Run SINE analysis` is not doing real AI. The current code is a detector shell only. It can decode/list/stream files and emit FFT/activity/bird/UAV/NPS/deep-signal-shaped detector rows, but it does not run a real learned classifier, does not produce model-backed identity, does not perform real 512D embedding/prototype matching, and does not create evidence-linked sound transcripts.

Do not fake this. Do not use Gemini, ChatGPT, MYCA, filenames, folder names, dataset labels, source metadata, or generated WAV/spectrogram data as classification evidence. MYCA can later explain proven evidence, but it must not invent the identity.

First, preserve the honest detector-only contract: if no checksum-verified model is loaded, return `model_status: model_unavailable`, `identification_status: detector_only`, `identification_summary: null`, empty `model_outputs`, empty `prototype_matches`, empty `deep_signal_matches`, empty `fusion_evidence`, and empty `sound_transcripts`. Detector evidence may still be returned, but it is not semantic identity.

Then build the real backend:

1. Resolve acoustic `library.blob` UUIDs to NAS-backed files safely.
2. Decode real audio bytes with source diagnostics.
3. Add bounded/windowed decode for long MBARI/hydrophone files.
4. Upgrade high-definition visualization from real samples with 8192 waveform points and 256x1024 spectrogram support for short clips.
5. Build deterministic DSP features: STFT, log-mel/PCEN, MFCC, RMS, ZCR, centroid, bandwidth, rolloff, spectral contrast, harmonic/rotor, impulse/lightning/blast, sweep/whistle, low-frequency/seismic.
6. Add a real model registry under `sine` schema with artifact checksum, label-map checksum, training manifest, metrics, runtime, and device.
7. Build a real inference runner for PyTorch/TorchScript/ONNX.
8. Train/register first P0 model `sine-esc50-resnetish-v1` from real ESC-50/MINDEX acoustic rows.
9. Persist real outputs to `sine.model_output`.
10. Build prototype/fingerprint catalog and nearest-neighbor matching; only proof-backed rows may appear as `deep_signal_matches`.
11. Build evidence fusion and chronological `sound_transcripts`; transcript rows must link to model/prototype/fusion evidence IDs.
12. Build human correction/training review: model says UAV, human says lightning, both are saved and disagreement enters review/training queue.
13. Add water/air/ground model-family plan for marine, animal/insect, rotor/propeller, impulse/weather, and ground/seismic domains.

Use the audited repos as references only:

- `daisukelab/sound-clf-pytorch`: PyTorch ResNetish/VGGish/CNN14, split-all long inference.
- `IBM/MAX-Audio-Classifier`: clean serving wrapper and top-k shape.
- `ksanjeevan/crnn-audio-classification`: CRNN temporal models.
- `daisukelab/ml-sound-classifier`: rolling buffers and long-file aggregation.
- `GorillaBus/urban-audio-classifier`: log-mel/MFCC normalization and evaluation.
- `imfing/audio-classification`: engineered baseline features.
- `abishek-as/Audio-Classification-Deep-Learning`: multiple-head baseline comparison only.
- `braydenoneal/neural-audio-classification`: TorchScript save/load pattern.
- OVH marine notebook: 30-second marine mammal/hydrophone windowing reference.

Do not copy no-license code without review. Prefer implementing the relevant patterns in MINDEX style.

Required production routes:

- `GET /api/mindex/sine/status`
- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/models/{model_id}`
- `GET /api/mindex/sine/prototypes`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- annotation and human-identification routes already used by the frontend

Acceptance evidence you must return:

- commit hash
- migrations applied
- VM 189 deploy status
- model artifact path and SHA-256
- label map path and SHA-256
- model runtime/device
- training manifest and metrics/confusion matrix
- negative missing-model response
- positive ESC-50 model-backed response
- bounded MBARI/hydrophone/Psathyrella response or honest OOD/queued response
- high-definition visualization response
- human correction round trip
- `3010` website smoke with evidence-backed classification accepted by the SINE frontend

Until those are returned, backend SINE is not done.
