# SINE P0 Backend Implementation Blueprint - June 6 2026

Prepared by: Codex

Target repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Use with:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_CLASSIFIER_CURSOR_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_OBJECTIVE_COMPLETION_AUDIT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\mindex\sine-contract.ts`

## Purpose

This blueprint translates the SINE handoff into concrete backend work Cursor can implement in MINDEX.

The current backend can return detector-shaped output, but Morgan QA-tested it and determined that `Run SINE analysis` is not doing real acoustic intelligence. P0 is not finished until MINDEX can decode a real NAS audio blob, compute real signal features, run a registered PyTorch/TorchScript/ONNX model or honestly report `model_unavailable`, persist evidence, and return evidence-backed labels.

This is acoustic-only. Do not work on chemistry, DNA, PubChem, DWSIM, Cantera, or unrelated MINDEX tabs.

## Operational P0/P1 Gates For Navy And Psathyrella

SINE must be designed for field and contract-facing audio work, especially hydrophone/Navy use cases and the Psathyrella buoy device. The backend should not collapse these into an ESC-50-only demo.

P0 must prove:

- Short ESC-50/environmental clips can run a real model with full provenance.
- Missing model or unsupported domains return `model_unavailable`, `unknown`, or `out_of_domain`, not fake labels.
- Large MBARI/hydrophone clips can be visualized and analyzed in bounded 30-second windows or honestly queued.
- Every analysis run stores requested domains/families, window bounds, model/prototype/fusion evidence, and human-review flags.

P1 must add:

- rolling-buffer analysis for Psathyrella buoy and future live hydrophone streams.
- overlapping long-file split inference with window-level result aggregation.
- water-domain heads and/or prototypes for marine life, vessel/propeller, mechanical/infrastructure noise, impulse/explosion/impact, weather/wave state, acoustic ping/comms/test signal, and unknown/OOD.
- operational QA reports that include at least one marine/hydrophone sample and one missing-model/OOD negative case.

## Hard Truth Gate

If no trained model artifact is loaded, the backend must return:

- `model_status: "model_unavailable"`
- no `identification_summary`
- empty `model_outputs`
- empty semantic `deep_signal_matches`
- empty `fusion_evidence`
- empty `sound_transcripts`
- optional non-semantic DSP detector rows only

The frontend now rejects semantic labels that are not tied to model, prototype, or fusion evidence. A `200` response is not a pass.

## Current Frontend Contract Gate

The Website now sends and expects the SINE request contract from:

```text
WEBSITE/website/lib/mindex/sine-contract.ts
```

Cursor must make MINDEX honor these fields instead of ignoring them:

- `require_real_audio=true`
- `require_model_evidence=true`
- `allow_detector_only=true`
- `semantic_fallback=false`
- `llm_fallback=false`
- `prototype_matching=true`
- `sound_transcripts=evidence_backed_only`
- `target_domains=water,air,ground`
- `class_families=marine_bioacoustics,terrestrial_bioacoustics,insect_bioacoustics,air_propeller,water_propeller,vessel_engine,weather_lightning,impulse_explosion,ground_seismic,mechanical,geophysical,unknown_pattern`
- `requested_outputs=detector_events,model_outputs,embeddings,prototype_matches,fusion_evidence,sound_transcripts,diagnostics`

Minimum backend behavior:

- If the request requires model evidence and no registered model is available, return `model_status: "model_unavailable"` and detector-only evidence.
- If a requested domain is unsupported by registered models/prototypes, return `out_of_domain` for that domain instead of guessing.
- If confidence is low, return `unknown`, not the nearest convenient class.
- If the backend returns `identification_summary`, it must also return evidence rows proving that summary.
- If the backend returns `sound_transcripts`, every transcript row must link to model output IDs, prototype match IDs, fusion IDs, or detector evidence IDs.
- If the backend returns `deep_signal_matches`, those rows must be true prototype/embedding matches with model/prototype/vector provenance, not shallow spectral summaries.
- If the backend uses queued long-file analysis, the synchronous response must include job/window metadata the frontend can display.

The frontend exposes browser QA attributes such as `data-sine-model-runtime`, `data-sine-model-evidence`, `data-sine-readiness`, `data-sine-selected-analysis-id`, and `data-sine-scope-source`. Use those after deployment to prove the backend crossed from `mindex-contract-failed` or `instrument-ready-ai-pending` into model-backed readiness.

## Current Code Remediation Gate

Before Cursor trains or wires any new model, keep the current MINDEX code path honest and do not let detector rows become false semantic classifications.

Backend files that must be changed or gated:

```text
mindex_api/services/sine_acoustic/event_views.py
mindex_api/services/sine_acoustic/pipeline.py
mindex_api/services/sine_acoustic/deep_signal.py
mindex_api/services/sine_acoustic/bird.py
mindex_api/services/sine_acoustic/uav.py
mindex_api/services/sine_acoustic/visualisation.py
mindex_api/routers/sine_acoustic.py
tests/test_acoustic_event_views.py
tests/test_sine_acoustic_pipeline.py
```

Current backend state observed June 6:

- `event_views.py` has been tightened so detector-only output can stay honest, with empty model/prototype/fusion/transcript rows unless real evidence is supplied.
- `routers/sine_acoustic.py` now exposes model/prototype registry read paths such as `/sine/models`, `/sine/models/{model_id}`, and `/sine/prototypes`.
- `model_runtime.py` inspects registered model rows, optional runtime dependency availability, artifact paths/checksums, and prototype catalog state, but explicitly does not classify audio.
- `persisted_evidence.py` can read saved `sine.model_output`, `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript` rows when they exist.
- `migrations/20260606_sine_model_registry_jun06_2026.sql` and `migrations/20260606_sine_analysis_evidence_jun06_2026.sql` add the registry/evidence schema needed for real AI output.

Remaining issue map:

- `classifier.py` still calls `run_full_analysis()` and returns detector output.
- `pipeline.py` still only runs detector functions and has no real model/prototype/fusion runtime.
- `POST /api/mindex/library/blobs/{id}/classify` is intentionally a detector/latest-evidence view and must keep declaring `model_inference_run: false`. The real model execution path is `POST /api/mindex/sine/blobs/{id}/analyze`.
- `deep_signal.py` returns a shallow spectral profile as feature evidence, which is not a real neural embedding or prototype match.
- `bird.py` and `uav.py` emit useful heuristic detector rows, but they are not trained bird/UAV model inference.
- `visualisation.py` must still be verified and upgraded to honor the Website oscilloscope request for real high-definition server visualisation across short and long clips.
- Registry/evidence tables and endpoints are necessary scaffolding, not proof of classification. The backend is not done until the analysis runner writes real model/prototype/fusion/transcript evidence from decoded audio.

Required first patch behavior:

- detector-only runs may return frequency/activity/bird/uav/other raw detector rows as signal evidence.
- detector-only runs must not return semantic identity, model name, semantic transcript, or prototype/deep-signal match.
- missing model must be explicit:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
  "deep_signal_matches": [],
  "prototype_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false
  }
}
```

The first acceptance test should fail on the current backend and pass only after the false `bird_likely`/`mindex_sine_v1` promotion is removed.

## Library Blob Identity Gate

SINE cannot analyze path-only NAS rows. Every selectable acoustic file returned by MINDEX must be tied to a `library.blob` UUID.

Required behavior:

- `GET /api/mindex/library/blobs?category=acoustic&limit=...` returns audio rows with UUID-backed `id` or `blob_id`.
- `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=...` returns registered ESC-50 audio rows with UUIDs, not only filesystem fallback rows.
- Rows may also include `analysis_id`, `remote_id`, or `uuid`; the Website will use the first UUID-shaped value for analysis, annotations, and human training tags.
- The encoded NAS path id can exist as `file_id`, but it is for streaming only.
- `.wav.manifest.json` files should be attached as metadata/manifest references, not shown as playable acoustic files.
- Search must include filename, relative path, source/dataset ids, sensor type, acoustic environment, labels/tags, human labels, and model labels.

Website mitigation:

- The SINE player and MINDEX Library panel now separate stream id from analysis id.
- Path-only files can play and render browser scope, but analysis/classify/save controls require a UUID-backed record.
- QA hooks expose both `data-sine-selected-id` and `data-sine-selected-analysis-id`.

## Do Not Use As Production Backend

The local AI Studio prototype at:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

is reference-only. Do not copy its backend behavior into production. Specifically do not use:

- `GoogleGenAI`
- Gemini prompts as the primary classifier
- `mockAcousticBlobs`
- generated WAV streams
- generated waveform/spectrogram matrices
- filename or metadata based semantic labels
- heuristic fallback labels that pretend to be model evidence

Safe ideas from that prototype are UI vocabulary only: chronological transcripts, model architecture panels, prototype search, detector lanes, and high-contrast hydrophone styling.

Additional local audit findings:

- `server.ts` is not a valid backend reference because it generates WAV buffers, synthetic spectrograms, Gemini metadata classifications, and deterministic semantic fallbacks.
- `src/data/acousticData.ts` is not a valid catalog reference because it is mock data with fake stream URLs and labels.
- `src/components/SINEStatus.tsx` is not a valid readiness reference because it presents model/runtime/calibration claims without registry evidence.
- `src/components/AcousticPlayer.tsx` and `src/components/ModelExplorer.tsx` are useful only for UI/UX concepts: combined scope canvas, hover/playhead interaction, transcript lanes, and architecture explanation panels.

## Oscilloscope-Grade Visualisation Contract

The frontend needs SINE visualisation to feel like the Fungi Compute oscilloscope/spectrogram tools, not a small decorative preview.

Frontend references:

```text
WEBSITE/website/components/fungi-compute/oscilloscope.tsx
WEBSITE/website/components/fungi-compute/stft-spectrogram.tsx
WEBSITE/website/components/fungi-compute/spectrum-analyzer.tsx
WEBSITE/website/components/fungi-compute/signal-fingerprint.tsx
```

Backend endpoint requirements for `GET /api/mindex/sine/blobs/{id}/visualisation`:

- accept optional `start_sec`, `end_sec`, `max_waveform_points`, `max_time_frames`, and `max_frequency_bins`.
- decode actual NAS audio bytes for the selected `library.blob` UUID.
- return at least 8192 waveform/envelope points for ordinary short clips unless the request asks for fewer.
- return at least 256 frequency bins x 1024 time frames for ordinary short clips unless the request asks for fewer.
- return explicit `fft_size`, `hop_length`, `window_function`, `sample_rate_hz`, `duration_sec`, `frequency_min_hz`, `frequency_max_hz`, `db_floor`, `db_ceiling`, and `normalization`.
- return `visualisation_status: "ready" | "clamped" | "queued" | "failed"`.
- return `clamp` metadata when large clips are downsampled.
- return `peaks[]` with `time_sec`, `frequency_hz`, `magnitude_db`, `prominence`, and `source`.
- return channel metadata and channel-specific arrays when the file is multi-channel.
- never generate waveform or spectrogram rows from filename, source ID, label, metadata, or synthetic math.

The frontend should then support:

- time zoom/window selection.
- frequency range control.
- amplitude gain and vertical offset.
- dB floor/ceiling.
- grid, peak, overlay, waveform, spectrogram, and waterfall modes.
- loop region playback and marker persistence through wave annotation APIs.

Acceptance:

- A backend visualisation is accepted only when `scope_source` can be `mindex-backend` and the returned points/bins match the requested real decoded clip/window.
- Browser-side decoded fallback is useful for playback QA, but it does not satisfy backend visualisation completion.

## P0 File-Level Work Plan

Recommended MINDEX modules:

```text
mindex_api/services/sine_acoustic/audio_decode.py
mindex_api/services/sine_acoustic/features.py
mindex_api/services/sine_acoustic/visualisation.py
mindex_api/services/sine_acoustic/model_registry.py
mindex_api/services/sine_acoustic/inference_runtime.py
mindex_api/services/sine_acoustic/prototype_search.py
mindex_api/services/sine_acoustic/evidence_fusion.py
mindex_api/services/sine_acoustic/transcripts.py
mindex_api/services/sine_acoustic/analysis_runner.py
mindex_api/services/sine_acoustic/human_corrections.py
mindex_api/routers/sine_acoustic.py
```

Recommended ETL/training modules:

```text
scripts/train_sine_esc50_p0.py
mindex_etl/jobs/train_sine_esc50_p0.py
mindex_etl/jobs/build_sine_prototypes_p0.py
mindex_etl/jobs/evaluate_sine_model.py
mindex_etl/sine/datasets.py
mindex_etl/sine/features.py
mindex_etl/sine/models.py
mindex_etl/sine/export.py
```

Recommended migration:

```text
migrations/20260606_sine_real_ai_p0_jun06_2026.sql
```

Recommended tests:

```text
tests/test_sine_no_fake_semantics.py
tests/test_sine_audio_decode_visualisation.py
tests/test_sine_model_registry.py
tests/test_sine_missing_model_contract.py
tests/test_sine_esc50_model_output.py
tests/test_sine_prototype_contract.py
tests/test_sine_windowed_analysis.py
tests/test_sine_human_correction.py
tests/test_sine_esc50_training_artifact_script.py
```

## Database Schema

Create a `sine` schema if it does not exist. Keep `library.blob` as the source of acoustic files. Do not duplicate file metadata unnecessarily.

### `sine.model_artifact`

Required columns:

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

### `sine.model_label_map`

Required columns:

- `id uuid primary key`
- `model_id text not null references sine.model_artifact(model_id)`
- `label_id integer not null`
- `label text not null`
- `category text`
- `family text`
- `domain text`
- `source_dataset text`
- unique `(model_id, label_id)`

### `sine.analysis_run`

Required columns:

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

### `sine.detector_event`

Required columns:

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

Detector events are useful signal evidence, but they are not semantic classification unless linked to model/prototype evidence.

### `sine.model_output`

Required columns:

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

### `sine.prototype`

Required columns:

- `id uuid primary key`
- `prototype_id text unique not null`
- `label text not null`
- `category text`
- `domain text`
- `source_dataset text not null`
- `source_blob_id uuid`
- `start_sec numeric`
- `end_sec numeric`
- `model_id text not null`
- `embedding_dim integer not null`
- `embedding_sha256 text not null`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`

### `sine.prototype_embedding`

Required columns:

- `id uuid primary key`
- `prototype_id text not null references sine.prototype(prototype_id)`
- `model_id text not null`
- `embedding_dim integer not null`
- `embedding vector` if pgvector is available, otherwise `embedding float8[] not null`
- `embedding_sha256 text not null`
- `created_at timestamptz not null default now()`

### `sine.prototype_match`

Required columns:

- `id uuid primary key`
- `analysis_run_id uuid not null references sine.analysis_run(id)`
- `model_output_id uuid references sine.model_output(id)`
- `prototype_id text not null references sine.prototype(prototype_id)`
- `label text not null`
- `score numeric`
- `distance numeric`
- `similarity numeric`
- `source_dataset text not null`
- `model_id text not null`
- `embedding_dim integer not null`
- `embedding_sha256 text`
- `created_at timestamptz not null default now()`

### `sine.fusion_evidence`

Required columns:

- `id uuid primary key`
- `analysis_run_id uuid not null references sine.analysis_run(id)`
- `blob_id uuid not null`
- `kind text not null`
- `label text not null`
- `event_family text`
- `start_sec numeric not null`
- `end_sec numeric not null`
- `score numeric not null`
- `model_output_id uuid references sine.model_output(id)`
- `prototype_match_id uuid references sine.prototype_match(id)`
- `detector_event_ids uuid[] not null default '{}'`
- `explanation jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

### `sine.sound_transcript`

Required columns:

- `id uuid primary key`
- `analysis_run_id uuid not null references sine.analysis_run(id)`
- `blob_id uuid not null`
- `start_sec numeric not null`
- `end_sec numeric not null`
- `label text not null`
- `description text not null`
- `sound_source text`
- `confidence numeric not null`
- `frequency_range text`
- `model_output_ids uuid[] not null default '{}'`
- `fusion_evidence_ids uuid[] not null default '{}'`
- `prototype_ids text[] not null default '{}'`
- `created_at timestamptz not null default now()`

Do not insert transcript rows unless at least one evidence array is non-empty.

### `sine.human_review_queue`

Required columns:

- `id uuid primary key`
- `blob_id uuid not null`
- `analysis_run_id uuid references sine.analysis_run(id)`
- `model_output_id uuid references sine.model_output(id)`
- `human_identification_id uuid`
- `model_label text`
- `human_label text not null`
- `disagreement boolean not null default false`
- `review_status text not null default 'open'`
- `priority text not null default 'normal'`
- `created_at timestamptz not null default now()`
- `resolved_at timestamptz`

### `sine.training_example`

Required columns:

- `id uuid primary key`
- `blob_id uuid not null`
- `start_sec numeric`
- `end_sec numeric`
- `label text not null`
- `label_source text not null`
- `human_identification_id uuid`
- `analysis_run_id uuid`
- `model_id text`
- `dataset_split text`
- `review_status text not null default 'pending'`
- `created_at timestamptz not null default now()`

Human labels must be stored beside model labels. They must not overwrite model outputs.

## Service Responsibilities

### `audio_decode.py`

Responsibilities:

- resolve `library.blob` by ID
- validate category is acoustic
- resolve file path under NAS storage
- reject path traversal or missing file
- decode using `soundfile`, `librosa`, or `ffmpeg` fallback
- normalize channel shape
- expose original sample rate, channels, duration, and byte/hash diagnostics
- resample to the model sample rate only after preserving source diagnostics

### `features.py`

Responsibilities:

- waveform summary
- STFT
- log-mel
- optional PCEN
- MFCC
- spectral centroid, bandwidth, rolloff, contrast
- RMS and zero-crossing rate
- FFT peak detection
- activity windows
- impulse candidates
- harmonic/rotor candidates
- sweep/chirp candidates
- low-frequency ground/seismic candidates

### `visualisation.py`

Responsibilities:

- use decoded audio bytes, not generated math
- honor query params:
  - `waveform_points`
  - `spectrogram_rows`
  - `spectrogram_cols`
  - `start_sec`
  - `end_sec`
  - `windowed`
- return arrays sized for the Website high-definition scope
- include sample rate, duration, channel, and generation diagnostics

### `model_registry.py`

Responsibilities:

- validate model artifact and label map checksums
- register model metadata in Postgres
- expose `/api/mindex/sine/models`
- expose `/api/mindex/sine/models/{model_id}`
- never mark a model loaded if the artifact is missing, checksum fails, or runtime load fails

### `inference_runtime.py`

Responsibilities:

- load PyTorch, TorchScript, or ONNX model
- warm the model
- prepare log-mel tensors
- run windowed inference
- return top-k labels, scores, embeddings, OOD score, latency, and model provenance
- update `last_successful_inference_at`

### `prototype_search.py`

Responsibilities:

- build prototype embeddings from labeled training examples
- search nearest prototypes by cosine similarity or distance
- persist `sine.prototype_match`
- expose `/api/mindex/sine/prototypes`
- reject placeholder/mock/generated/metadata-derived prototype rows

### `evidence_fusion.py`

Responsibilities:

- combine model outputs, prototype matches, and detector events
- create `sine.fusion_evidence` rows only when evidence exists
- keep detector-only fusion in debug fields if needed, but do not call it semantic proof
- calculate confidence/OOD and contested-state hints

### `transcripts.py`

Responsibilities:

- generate short, bounded sound transcript rows only from evidence links
- avoid LLM prose for P0
- never create transcript text without model/prototype/fusion IDs
- phrase output as acoustic meaning, not backend jargon

### `analysis_runner.py`

Responsibilities:

- own `POST /api/mindex/sine/blobs/{id}/analyze`
- honor the Website evidence contract exactly
- create `sine.analysis_run`
- decode audio
- compute deterministic features
- run model if available
- run prototype search if embeddings exist
- persist all evidence rows
- return current run payload
- queue long files or windowed jobs rather than timing out

### `human_corrections.py`

Responsibilities:

- persist user corrections from Library and SINE player
- keep model and human labels side-by-side
- mark disagreements as contested
- enqueue review/training rows
- expose human identification history for a blob and selected time window

## API Contract Details

### `GET /api/mindex/sine/status`

Must return:

- `status`
- `product: "SINE"`
- acoustic blob counts
- registered detector count
- model status:
  - `model_status`
  - `models_loaded`
  - `active_model_id`
  - `framework`
  - `runtime`
  - `device`
  - `last_successful_inference_at`

Do not claim model readiness from deterministic detectors alone.

### `GET /api/mindex/sine/models`

Must return either:

- real model rows with artifact/checksum/runtime proof, or
- honest empty/missing state with `status: "model_registry_unavailable"` or `model_status: "model_unavailable"`

Each model row should include:

- `model_id`
- `model_name`
- `model_version`
- `framework`
- `runtime`
- `artifact_uri`
- `artifact_sha256`
- `label_map_uri`
- `label_map_sha256`
- `training_dataset`
- `metrics_uri`
- `confusion_matrix_uri`
- `loaded`
- `device`
- `backend_commit`
- `last_successful_inference_at`

### `GET /api/mindex/sine/prototypes`

Must return real prototype rows:

- `prototype_id`
- `label`
- `category`
- `domain`
- `source_dataset`
- `model_id`
- `embedding_dim`
- `embedding_sha256`
- `source_blob_id`
- optional window bounds

No label-only catalog rows.

### `GET /api/mindex/sine/blobs/{id}/visualisation`

Must return real arrays:

- waveform derived from decoded audio
- spectrogram derived from decoded audio
- sample rate, channels, duration
- feature generation diagnostics

If the file is too large, return bounded-window data or a queueable status, not generated filler.

### `POST /api/mindex/sine/blobs/{id}/analyze`

Must accept:

- `start_sec`
- `end_sec`
- `windowed`
- `window_source`
- `require_real_audio`
- `require_model_evidence`
- `allow_detector_only`
- `semantic_fallback=false`
- `llm_fallback=false`
- `prototype_matching=true`
- JSON body `evidence_contract`

Must return:

- `analysis_run_id`
- `blob_id`
- `status`
- `model_status`
- `frequency_detections`
- `activity_segments`
- `model_outputs`
- `deep_signal_matches`
- `fusion_evidence`
- `sound_transcripts`
- `diagnostics`

If no model is loaded, it must still prove audio was decoded and detectors ran, but semantic arrays must stay empty.

### `POST /api/mindex/library/blobs/{id}/classify`

Must return a Library classification view, not a new model inference run:

- `model_inference_run: false`
- `model_inference_route: /api/mindex/sine/blobs/{id}/analyze`
- detector groups and high-definition visualisation from real decoded audio
- latest persisted model/prototype/fusion/transcript evidence only if a prior analysis run exists

It must never claim fresh `model_outputs[]` were produced by the Library classify route. New learned inference belongs in `/api/mindex/sine/blobs/{id}/analyze`.

### `GET /api/mindex/sine/blobs/{id}/analysis`

Must accept:

- `analysis_run_id`
- `job_id`
- `start_sec`
- `end_sec`
- `windowed`
- `window_source`

Must return the matching submitted job/window/run, not a random latest whole-file result.

### Human Corrections

Existing or new routes must support:

- save human label
- save optional selected region bounds
- save confidence/source notes
- mark disagreement with model label
- enqueue training/review row
- return latest human identification beside model outputs

Human labels are training evidence, not replacement predictions.

## P0 Model Plan

### Current Codex Scaffold

Codex added:

```text
MINDEX/mindex/scripts/train_sine_esc50_p0.py
MINDEX/mindex/scripts/verify_sine_model_artifact_package.py
MINDEX/mindex/scripts/smoke_sine_model_artifact_inference.py
MINDEX/mindex/scripts/build_sine_prototype_catalog.py
MINDEX/mindex/scripts/verify_sine_real_ai_e2e.py
MINDEX/mindex/tests/test_sine_esc50_training_artifact_script.py
MINDEX/mindex/tests/test_sine_model_artifact_package_verifier.py
MINDEX/mindex/tests/test_sine_model_artifact_runtime_smoke_script.py
MINDEX/mindex/tests/test_sine_prototype_catalog_builder_script.py
MINDEX/mindex/tests/test_sine_real_ai_e2e_verifier.py
```

This script is artifact-only. It does not mark a model loaded, does not insert fake rows into Postgres, and does not write analysis evidence. When real ESC-50 audio and real labels are present, it trains a small TorchScript CNN that returns classification logits plus an embedding vector.

The package it writes contains:

```text
model.torchscript.pt
labels.json
metrics.json
confusion_matrix.json
training_manifest.json
model_registry_row.json
register_model_artifact.sql
```

Example:

```powershell
python scripts\train_sine_esc50_p0.py `
  --audio-root /mnt/nas/mindex/Library/acoustic/esc50 `
  --metadata-csv /mnt/nas/mindex/Library/acoustic/esc50/meta/esc50.csv `
  --output-root /mnt/nas/mindex/models/acoustic `
  --epochs 12 `
  --batch-size 32
```

After the artifact package exists, Cursor must inspect metrics, apply `register_model_artifact.sql`, install/verify Torch in the API or worker image, mark the artifact loaded only after checksum/runtime validation, and run a real UUID-backed ESC-50 blob through `/api/mindex/sine/blobs/{id}/analyze`.

Before applying `register_model_artifact.sql`, run the package verifier:

```powershell
python scripts\verify_sine_model_artifact_package.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/verification_report.json
```

The verifier is a pre-registration gate. It does not load the model, does not mark a model ready, and does not write to Postgres. It fails if required package files are missing, checksums do not match, labels/metrics/confusion/manifest disagree, the registry SQL is malformed, or the package claims `loaded=true` before a runtime inference probe has passed. It also rejects duplicate labels, non-square or non-integer confusion matrices, missing or inconsistent train/validation counts, and incomplete inference feature metadata; required `feature_params` include `n_fft`, `hop_length`, `n_mels`, `max_frames`, and `window_sec`.

After registration SQL exists but before the model is marked loaded, run the runtime smoke:

```powershell
python scripts\smoke_sine_model_artifact_inference.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --wav-path /mnt/nas/mindex/Library/acoustic/esc50/<known-esc50-clip>.wav `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/runtime_smoke_report.json `
  --write-loaded-sql /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/mark_model_loaded.sql
```

The smoke script is the load gate. It does not update Postgres directly. It verifies the package, decodes a real WAV, runs the actual TorchScript/ONNX inference seam, refuses OOD/low-confidence output by default, and writes guarded `mark_model_loaded.sql` only after runtime proof. Cursor may apply that SQL only after inspecting the report.

After model runtime smoke passes, build the prototype/fingerprint catalog:

```powershell
python scripts\build_sine_prototype_catalog.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --audio-root /mnt/nas/mindex/Library/acoustic/esc50 `
  --metadata-csv /mnt/nas/mindex/Library/acoustic/esc50/meta/esc50.csv `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --min-examples-per-label 5 `
  --write-json /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/prototypes.json `
  --write-sql /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/register_prototypes.sql
```

This script is the prototype gate. It does not update Postgres directly. It uses real model embeddings from labeled clips, averages vectors per label, writes `metadata.centroid` and `metadata.prototype_vector`, stores vector/prototype checksums, and refuses OOD/low-confidence embeddings unless explicitly overridden for debugging.

After the model and prototype catalog are registered, run the live API E2E proof:

```powershell
python scripts\verify_sine_real_ai_e2e.py `
  --api-base http://192.168.0.189:8000 `
  --query esc `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/e2e_real_ai_report.json
```

This script is the completion gate. It fails if the live backend only returns detector evidence or HTTP 200 shells. Passing requires loaded model proof, checksum-backed prototype catalog rows, per-run model outputs, scored prototype matches, fusion evidence, and evidence-linked sound transcripts from a UUID-backed acoustic blob. The verifier cross-links the chain: model outputs must match a loaded registry model by `model_id`, `artifact_sha256`, and `label_map_sha256`; prototype matches must point at registered prototype catalog IDs.

### Model Name

`sine-esc50-resnetish-v1`

### Training Data

Primary P0:

- ESC-50 files already ingested into `library.blob`
- verified manifest rows from `library.manifest` or equivalent

Optional P0/P1 additions:

- small MBARI verified subset for hydrophone smoke
- user-recorded Psathyrella buoy clips after human labels exist

Do not use unlabeled MBARI files as positive semantic labels unless a manifest/prototype label exists.

### Architecture

Use the external audit as guidance:

- P0 CNN/ResNetish log-mel classifier based on the `daisukelab/sound-clf-pytorch` pattern
- log-mel tensor input
- fixed 5-second ESC-50 windows
- embedding from penultimate layer for prototype matching
- export to TorchScript or ONNX

P1 after P0:

- CRNN/GRU temporal model from `ksanjeevan/crnn-audio-classification` ideas
- transformer/AST/BEATs/PANNs for broader labels
- domain heads for water, air, ground, animal, insect, weather/lightning, explosion/impact, rotor, mechanical, and unknown/OOD

### Model Artifact Layout

Recommended NAS layout:

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

### Required Metrics

Store:

- accuracy
- precision
- recall
- F1
- per-class metrics
- confusion matrix
- training dataset counts
- validation split method
- model artifact checksum
- label map checksum

## P0 Implementation Phases

### Phase A - Purge Fake Semantics

Tasks:

- remove or quarantine production paths that return semantic labels without evidence
- add the missing-model negative test
- make current no-model response honest

Pass:

- current ESC-50 analyze with no model returns `model_unavailable`
- no `identification_summary`
- no unproven `deep_signal_matches`
- no transcript prose

### Phase B - Real Decode And Visualisation

Tasks:

- implement real decode from `library.blob`
- implement high-definition waveform/spectrogram from samples
- honor visualisation query params

Pass:

- `GET /visualisation?waveform_points=8192&spectrogram_rows=256&spectrogram_cols=1024` returns arrays derived from bytes
- generated math matrices are gone

### Phase C - Model Registry

Tasks:

- add schema
- register model artifacts
- implement model status and model list endpoints
- checksum validate artifacts

Pass:

- `/api/mindex/sine/models` returns real provenance or honest empty state
- status does not claim a model is loaded without runtime proof

### Phase D - ESC-50 P0 Training And Export

Tasks:

- train `sine-esc50-resnetish-v1`
- export model artifact
- write label map and metrics
- register artifact in DB

Pass:

- one short ESC-50 clip returns `model_outputs[]` with model ID, runtime, artifact checksum, label map checksum, label scores, and latency

### Phase E - Prototype Retrieval

Tasks:

- create embeddings from labeled examples
- build prototype catalog
- implement cosine nearest-neighbor search
- persist matches

Pass:

- `GET /prototypes` returns real prototype rows
- per-run `deep_signal_matches` includes prototype ID, model/vector proof, and score/distance

### Phase F - Fusion And Transcripts

Tasks:

- fuse model outputs, prototype matches, and detector evidence
- create transcript rows only from evidence links

Pass:

- `fusion_evidence[]` links to model/prototype IDs
- `sound_transcripts[]` links to `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`

### Phase G - Long File Windows

Tasks:

- support bounded windows on MBARI/hydrophone files
- queue large jobs
- poll by job/run/window

Pass:

- 30-second MBARI window returns or queues reliably
- polling returns the same window result
- no synchronous whole-file timeout

### Phase H - Human Corrections

Tasks:

- persist human label with selected region
- preserve model label
- mark disagreement
- enqueue review/training row

Pass:

- model says `UAV`, human says `lightning`; both persist and review queue contains the contested row

### Phase I - Website Acceptance

Tasks:

- verify from `http://localhost:3010/sensing/sine/player`
- verify `/sensing/sine`
- verify `/natureos/mindex` Library -> Acoustic

Pass:

- real ESC-50 run reaches `Scientific classifier ready`
- no `MINDEX contract failed`
- model/prototype/fusion/transcript checklist rows become ready for the selected run

## External Repo Guidance Mapped To Implementation

- `daisukelab/sound-clf-pytorch`: strongest P0 PyTorch/log-mel/ResNetish pattern. Reimplement model, dataset, split-window, and export ideas in MINDEX.
- `IBM/MAX-Audio-Classifier`: use the model-wrapper/API separation and top-k/windowed response pattern. Do not copy old TensorFlow runtime.
- `daisukelab/ml-sound-classifier`: use rolling buffers, long spectrogram splitting, prediction smoothing, mixup/class balancing, and domain configs. Do not copy old Keras/PB runtime.
- `ksanjeevan/crnn-audio-classification`: P1 CRNN/GRU temporal model for repeated/evolving sounds.
- `GorillaBus/urban-audio-classifier`: fold-aware evaluation, confusion matrix, augmentation and metrics reporting.
- `imfing/audio-classification`: engineered DSP baseline features and regression tests.
- `OVH marine notebook`: P1 marine mammal/hydrophone 30-second windows.
- `braydenoneal/neural-audio-classification`: TorchScript artifact and prediction sanity pattern only.
- `ilge/gmtk-audio-classification`: modernize temporal smoothing ideas; do not deploy GMTK.
- `abishek-as/Audio-Classification-Deep-Learning`: multiple-head comparison idea only; do not use H5/Django path.

## Cursor Completion Report

Cursor must return all of this before calling backend complete:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path
- model artifact SHA256
- label map path
- label map SHA256
- framework/runtime/device
- training dataset counts
- metrics path
- confusion matrix path
- `GET /api/mindex/sine/models` sample response summary
- missing-model negative response summary
- short ESC-50 positive response summary
- 30-second MBARI/hydrophone window response summary
- prototype catalog response summary
- human correction round-trip summary
- exact commands used
- known limits and next models needed

## Final Definition Of Complete

P0 is complete only when:

1. Fake semantic paths are gone or quarantined.
2. Missing model behavior is honest.
3. Real audio decode and high-definition visualisation work from NAS bytes.
4. At least one real model artifact is trained or loaded.
5. Model outputs include artifact/runtime/checksum/label-map proof.
6. Prototype matches include stable prototype and vector proof.
7. Fusion/transcript rows link to evidence IDs.
8. Human corrections persist beside model predictions.
9. Long files use bounded windows or queued jobs.
10. The Website SINE player reaches `Scientific classifier ready` for one real short run.

If the system returns semantic labels without evidence, it is still broken.
