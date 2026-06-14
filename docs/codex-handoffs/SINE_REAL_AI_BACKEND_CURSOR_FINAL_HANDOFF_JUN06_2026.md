# SINE Real AI Backend Cursor Final Handoff

Date: June 6, 2026

Use this as the canonical backend handoff for Cursor.

MINDEX repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Website contract repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

## Executive Directive

Morgan QA-tested SINE and confirmed that `Run SINE analysis` is not actually doing real acoustic AI. The current backend can stream real audio and emit detector-shaped rows, but it is not yet identifying what is inside the audio with a real model.

Cursor must build the real SINE acoustic classifier backend. Do not make the frontend hide the problem. Do not turn heuristic detector rows into semantic identity. Do not use Gemini, filename guessing, source metadata guessing, or mock outputs as the classifier.

The required target is a production MINDEX acoustic intelligence stack that decodes real NAS audio, extracts deterministic DSP features, runs real PyTorch/TorchScript/ONNX/transformer-style model inference, performs prototype/fingerprint matching, fuses evidence, emits evidence-linked sound transcripts, and persists both model predictions and human corrections for training review.

## Current Truth

Known working backend/data surfaces:

- MINDEX has real acoustic library rows in `library.blob`.
- The NAS path is mounted on VM 189 under `/mnt/nas/mindex`.
- ESC-50 and MBARI acoustic files have been ingested into the NAS-backed Library.
- Website SINE and MINDEX Library can request acoustic blob lists through the 3010 BFF.
- Audio streams can return WAV bytes for real library blobs.
- Detector modules can produce signal evidence such as FFT peaks, activity windows, bird-band heuristics, rotor heuristics, NPS-style profile heuristics, and a shallow deep-signal feature row.

Known failing backend behavior:

- Detector rows are not enough to identify real-world meaning.
- The current backend path has no verified neural model runner.
- The current backend path has no proven PyTorch/TorchScript/ONNX inference result.
- The current backend path has no real 512D embedding/prototype-nearest-neighbor proof.
- The current backend path has no evidence-backed transcript generator.
- The current backend path can return semantic-looking rows that are not backed by model/prototype/fusion evidence.

Therefore, detector-only output must be treated as signal evidence, not as classification.

## Latest Codex Local Backend Seam

Codex has now added local MINDEX scaffolding that Cursor should preserve and deploy, not replace with another parallel path:

- `mindex_api/services/sine_acoustic/features.py` creates deterministic semantic-free audio windows, log-mel tensors, and `feature_sha256`.
- `mindex_api/services/sine_acoustic/inference_runtime.py` validates local model artifacts, validates label maps, builds feature tensors, dispatches to TorchScript or ONNX Runtime when installed, and returns provenance-rich top-k outputs or honest unavailable statuses.
- `mindex_api/services/sine_acoustic/inference_runtime.py` also preserves multi-output model embeddings from `[logits, embedding]`, `(logits, embedding)`, or `{logits, embedding}` output shapes, returning `embedding`, `embedding_sha256`, and `embedding_dim`.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now returns initial open-set/OOD metrics: `confidence_margin`, `entropy`, `normalized_entropy`, `ood_score`, `ood_status`, `ood_threshold`, and `min_confidence`.
- `mindex_api/services/sine_acoustic/analysis_runner.py` selects loaded acoustic models, decodes real blob audio, calls the runtime interface, writes proven outputs into `sine.model_output`, and returns blockers when no model/runtime/artifact is available.
- `mindex_api/services/sine_acoustic/evidence_builder.py` writes `sine.fusion_evidence` and evidence-linked `sine.sound_transcript` rows after a proven `sine.model_output` exists. It writes nothing for detector-only or unproven model rows.
- `mindex_api/services/sine_acoustic/prototype_search.py` performs cosine similarity over real query/prototype vectors and writes `sine.prototype_match` only when the model runtime returns an embedding vector and `sine.prototype.metadata` contains stored prototype vectors.
- `mindex_api/services/sine_acoustic/classifier.py` and `pipeline.py` now map `request_contract.visualisation_quality` into `visualisation_sonic`, so analyze/classify responses can return oscilloscope-density waveform/spectrogram data when the Website asks for it.
- `mindex_api/routers/sine_acoustic.py` now calls that runner inside `POST /api/mindex/sine/blobs/{id}/analyze` after detector events are written.
- `mindex_api/services/sine_acoustic/event_views.py` only allows `identification_summary` when model/prototype/fusion/transcript evidence has real proof, and now refuses low-confidence or OOD candidate model outputs.

Focused local MINDEX verification after this seam:

```powershell
python -m pytest tests\test_sine_inference_runtime.py tests\test_sine_prototype_search.py tests\test_sine_classifier_visualisation_contract.py tests\test_sine_evidence_builder.py tests\test_sine_analysis_runner.py tests\test_sine_feature_extraction.py tests\test_acoustic_event_views.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_request_contract.py tests\test_sine_evidence_migration_contract.py tests\test_sine_acoustic_pipeline.py
```

Result:

```text
46 passed, 1 skipped
```

This still does not make SINE real AI. It means Cursor's next job is precise: install or verify Torch/ONNX Runtime, register a real local model artifact and label map under `/mnt/nas/mindex/models/acoustic/{model_id}`, make the model return both labels and embeddings, populate `sine.prototype` with vector-backed examples, run one UUID-backed acoustic blob through `/sine/blobs/{id}/analyze`, confirm real `sine.model_output`, `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript` rows exist with artifact/checksum/label-map/feature/vector provenance, confirm direct and analyze-path high-definition visualisation on VM 189, and calibrate OOD/open-set thresholds with real validation data.

## Full Backend Build Prompt For Cursor

Cursor, build the real SINE acoustic classifier in MINDEX. The current player proves that real files can be listed and streamed, but Morgan QA confirmed that `Run SINE analysis` does not yet perform real acoustic AI. Treat the existing backend as a detector and visualisation shell that must be converted into a model-backed scientific classifier.

Do this work in:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Do not create a separate toy backend that bypasses MINDEX. Do not build a Gemini/LLM classifier. Do not classify from filenames, folder names, source metadata, dataset labels, or generated signals. SINE may use MYCA later to explain verified evidence, but MYCA must not invent acoustic identity.

The backend must identify and label what is inside real audio by combining these layers:

1. real audio decode from NAS-backed `library.blob` records
2. deterministic DSP and pattern detectors
3. PyTorch/TorchScript/ONNX model outputs
4. transformer or foundation acoustic embeddings when packaged as local verified artifacts
5. prototype/fingerprint nearest-neighbor matching
6. evidence fusion across model, detector, and prototype records
7. chronological sound transcripts linked to evidence IDs
8. human correction and contested-label training review

### P0: Make The Current Endpoint Honest

Before adding any neural model, fix the existing bad behavior.

Current failing behavior:

- `POST /api/mindex/sine/blobs/{id}/analyze` can return `status: complete`.
- It can emit `identification_summary.top_label = bird_likely`.
- It can say `model: mindex_sine_v1`.
- It can emit `uav_rotor_likely`, `spectral_embedding`, or prototype-like rows.
- It can do all of that with zero model outputs, zero fusion rows, zero prototype vector proof, and zero evidence-linked sound transcripts.

Required honest behavior when no verified model is loaded:

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

Detector evidence may still be returned, but only as detector evidence:

- FFT peaks
- STFT/log-mel/PCEN features
- activity windows
- harmonic/rotor candidates
- impulse/blast candidates
- sweep/whistle candidates
- low-frequency/seismic candidates
- bird-band or insect-band detector candidates
- NPS-style profile candidates

These detector rows must not create semantic identity by themselves.

### P1: Real P0 Neural Classifier

Build and register one real deployable model first. The recommended first model is:

`sine-esc50-resnetish-v1`

Minimum requirements:

- framework: PyTorch
- deploy runtime: TorchScript or ONNX Runtime
- input: real decoded WAV/FLAC/etc. samples
- features: log-mel or PCEN spectrogram, plus feature config persisted
- classes: real label map from the training dataset
- output: top-k labels with scores and window bounds
- OOD output: confidence margin, entropy, normalized entropy, OOD score/status, calibrated thresholds, and honest unknown/queued review states
- persistence: `sine.model_output`
- proof: model artifact SHA-256, label-map SHA-256, training manifest, metrics, backend commit, runtime, device

Use these implementation references from the local audit:

- `daisukelab/sound-clf-pytorch` for ResNetish/VGGish/CNN14-style PyTorch spectrogram models
- `IBM/MAX-Audio-Classifier` for clean serving separation and top-k response shape
- `GorillaBus/urban-audio-classifier` for normalized log-mel/MFCC and confusion matrix evaluation patterns
- `imfing/audio-classification` for interpretable feature baselines
- `daisukelab/ml-sound-classifier` for long-window splitting, aggregation, and rolling-buffer ideas

The first positive acceptance test must run one short ESC-50 clip and return a real `model_outputs[]` row. If it only returns detector rows, P1 is not done.

### P2: Water, Air, Ground Domain Models

SINE is not a bird/UAV toy. Build toward these domain heads and label families:

- water: whales, dolphins, porpoises, fish choruses, underwater biologics, vessel hums, boat propellers, submerged propellers, sonar/pings, underwater machinery, pressure impulses, explosions/impacts, weather/wave state, unknown/OOD
- air: birds, insects, mammals, amphibians, UAVs, drones, quadcopters, helicopters, airplanes, machinery, actuators, lightning/thunder, rain/wind/storms, explosions/impacts, unknown/OOD
- ground: seismic/earthquake, underground acoustic activity, soil bioacoustics, surface vibration, motors/actuators/servos/steppers, infrastructure/mechanical sounds, impacts/impulses, unknown/OOD

P2 can add separate registered model artifacts, for example:

- `sine-marine-window-crnn-v1`
- `sine-air-bioacoustic-transformer-v1`
- `sine-rotor-propeller-crnn-v1`
- `sine-ground-seismic-cnn-v1`
- `sine-impulse-weather-v1`

Recommended model families:

- CRNN / CNN-GRU for evolving temporal patterns
- ResNetish/CNN14/PANNs-style CNN for spectrogram classification
- AST, BEATs, CLAP, or another audio transformer/foundation model only when packaged locally with checksum, label map, and metrics
- shallow MFCC/log-mel baselines only as diagnostics, not as final semantic authority

### P3: Prototype And Fingerprint Matching

Build a real prototype catalog. `deep_signal_features` is not enough.

Required prototype fields:

- `prototype_id`
- source dataset/corpus
- license/provenance
- source file/blob/window
- class family
- label
- embedding model ID
- embedding dimension
- vector checksum or stored pgvector reference
- feature config checksum
- created/evaluated timestamps

Required match fields:

- `prototype_id`
- `model_id` or `embedding_model_id`
- `segment_start`
- `segment_end`
- similarity score or distance
- OOD distance/threshold
- source/corpus proof
- vector checksum or embedding reference

Only rows with this proof may appear as `deep_signal_matches` or `prototype_matches`.

### P4: Evidence Fusion And Sound Transcripts

`sound_transcripts` are not speech transcripts and not free prose. They are chronological physical-acoustic interpretations.

Each transcript must link to evidence:

- `model_output_ids`
- `prototype_match_ids`
- `fusion_evidence_ids`
- optional detector event IDs

Example valid transcript:

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

Invalid transcript:

- any prose generated from a filename
- any prose based only on a detector label
- any transcript with no evidence IDs

### P5: Human Correction And Training Review

Morgan must be able to correct wrong model output, such as model says UAV but Morgan knows it is lightning.

Required behavior:

- keep the model prediction
- save the human label separately
- mark it as `human_tagged`
- store segment/window, reviewer, note, certainty, and timestamp
- if human and model disagree, create a contested training-review record
- queue the example for future training/prototype review
- never silently overwrite the model prediction with the human label

### P6: Long Files And Psathyrella Buoy

Large MBARI/hydrophone files and Psathyrella buoy streams must use windows, not whole-file blocking requests.

Required behavior:

- support `start_sec`, `end_sec`, `window_sec`, `overlap_sec`, `window_index`
- default large-file analysis to 30-second windows with overlap
- support queued jobs for long files
- persist per-window outputs
- aggregate summaries only after per-window evidence exists
- support rolling-buffer analysis for buoy/Jetson streams later

### Required API Surfaces

Implement these as production MINDEX routes:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/models/{model_id}`
- `GET /api/mindex/sine/prototypes`
- optional queued-job endpoints for long files

Do not replace these with an unrelated `/api/classify` service unless that service is only an internal worker behind the production MINDEX routes.

### Minimum Completion Evidence Cursor Must Return

Cursor must return:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path
- model artifact SHA-256
- label map path
- label map SHA-256
- model runtime and device
- training dataset and metrics path
- negative missing-model response
- positive ESC-50 model-backed response
- one hydrophone/MBARI or Psathyrella-window response, queued proof, or honest OOD response
- one high-definition visualisation response with real waveform and spectrogram metadata
- one human correction round trip
- `GET /api/mindex/sine/status` showing model registry truth
- Website `3010` smoke showing the frontend accepts only real evidence

## Codex Local Preparation Already Done

Codex prepared local MINDEX patches to make the backend honest and ready for Cursor's real model implementation. These changes were local to the repos and were not staged or committed by Codex.

Local MINDEX files changed or added:

- `mindex_api/services/sine_acoustic/event_views.py`
- `mindex_api/services/sine_acoustic/model_runtime.py`
- `mindex_api/services/sine_acoustic/persisted_evidence.py`
- `mindex_api/services/sine_acoustic/request_contract.py`
- `mindex_api/services/sine_acoustic/visualisation.py`
- `mindex_api/routers/sine_acoustic.py`
- `mindex_api/routers/library.py`
- `migrations/20260606_sine_model_registry_jun06_2026.sql`
- `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`
- `tests/test_acoustic_event_views.py`
- `tests/test_sine_evidence_migration_contract.py`
- `tests/test_sine_model_runtime.py`
- `tests/test_sine_registry_contract.py`
- `tests/test_sine_request_contract.py`
- `tests/test_sine_acoustic_pipeline.py`
- `tests/test_api_contract_openapi.py`
- `docs/SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

Local Website files changed or added for the contract/readout:

- `components/sensing/sine-acoustic-player.tsx`
- `lib/mindex/sine-contract.ts`
- `app/api/mindex/sine/status/route.ts`
- `app/api/mindex/sine/blobs/[id]/analysis/route.ts`
- `app/api/mindex/sine/blobs/[id]/analyze/route.ts`
- `app/api/mindex/sine/blobs/[id]/visualisation/route.ts`
- `app/api/natureos/mindex/library/classify/route.ts`
- `docs/codex-handoffs/SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md`
- `docs/codex-handoffs/SINE_FRONTEND_MERGE_AUDIT_JUN06_2026.md`
- this handoff file

Local verification completed by Codex:

- `python -m pytest tests\test_acoustic_event_views.py tests\test_sine_evidence_migration_contract.py tests\test_sine_request_contract.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_acoustic_pipeline.py tests\test_api_contract_openapi.py`
  - Result: `15 passed, 1 skipped`
- `python -m pytest tests`
  - Result: `124 passed, 3 skipped`
- `python -m compileall mindex_api\routers\sine_acoustic.py mindex_api\routers\library.py mindex_api\services\sine_acoustic`
  - Result: success
- `git diff --check` on touched MINDEX SINE files and touched Website SINE files
  - Result: no whitespace errors; line-ending warnings only

Windows pytest emitted a cache/temp cleanup permission warning after success. It did not fail the suite.

## Honesty Contract Cursor Must Preserve

When there is no checksum-verified model artifact loaded and no persisted model/prototype/fusion/transcript evidence, analysis must return a detector-only state:

```json
{
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
    "model_ready": false,
    "model_registry_ready": false,
    "prototype_catalog_ready": false,
    "inference_ready": false,
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false,
    "synthetic_output_used": false
  }
}
```

Allowed detector-only fields:

- `frequency_detections`
- `activity_segments`
- `bird_detections`
- `uav_detections`
- `nps_detections`
- `deep_signal_detections`
- raw impulse, sweep, low-frequency, harmonic, pressure, seismic, and activity detector rows

Forbidden detector-only fields:

- no `identification_summary`
- no `model_outputs`
- no `prototype_matches`
- no `deep_signal_matches`
- no `fusion_evidence`
- no `sound_transcripts`
- no hard-coded model such as `mindex_sine_v1`
- no `classified` status unless real model/prototype/fusion evidence exists

## Real AI Backend Cursor Must Build

Build this in MINDEX, not as a toy standalone API.

### 1. Real Audio Resolution

For a UUID-backed `library.blob`:

- Resolve to the real NAS-backed file path.
- Verify category is acoustic.
- Verify file exists, size is nonzero, and content hash matches if available.
- Decode real audio bytes only. No generated WAV. No mock buffer.
- Support WAV first, then FLAC/MP3/OGG/M4A as codecs are installed.
- Return clear errors for unsupported codecs.

### 2. Windowed Decode

Long files must not block the request indefinitely.

Required behavior:

- Accept `start_sec`, `end_sec`, `window_sec`, `overlap_sec`, and `window_index`.
- Default long-file windows to 30 seconds with 5 seconds overlap unless request overrides.
- For very large MBARI/hydrophone files, return queued job behavior or bounded single-window behavior.
- Persist the window bounds used for each model output.

### 3. Deterministic DSP Layer

Compute real DSP features from decoded samples:

- waveform/envelope
- FFT peak frequencies
- STFT spectrogram
- log-mel or PCEN spectrogram
- RMS/activity
- spectral centroid
- spectral bandwidth
- rolloff
- zero crossing rate
- harmonicity
- rotor/blade-pass candidate features
- impulse/blast/lightning/thunder candidate features
- sweep/whistle/modulation candidate features
- low-frequency ground/seismic candidate features

This layer can feed visual lanes and models, but it is not semantic identity by itself.

### 4. Model Registry

Create and use a real model registry under the `sine` schema.

Required endpoint surfaces:

- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/models/{model_id}`
- `GET /api/mindex/sine/prototypes`
- `GET /api/mindex/sine/status`

Required model metadata:

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
- `input_sample_rate_hz`
- `window_sec`
- `label_count`
- `embedding_dim`
- `device`
- `backend_commit`
- `loaded`
- `load_status`
- `last_loaded_at`

Allowed runtimes:

- PyTorch eager only for development
- TorchScript for deployable PyTorch
- ONNX Runtime for production-friendly inference
- transformer/foundation acoustic models when packaged as a local artifact with checksum and label map

Do not fetch arbitrary model URLs at request time.

### 5. Real Inference Runner

Add a real runner, for example:

`mindex_api/services/sine_acoustic/analysis_runner.py`

Required behavior:

- Query ready rows from `sine.model_artifact`.
- Resolve local/NAS artifact paths.
- Verify artifact SHA-256 before loading.
- Verify label-map SHA-256 before inference.
- Load PyTorch/TorchScript/ONNX Runtime model.
- Resample audio to the model's expected sample rate.
- Build model features exactly as expected by the model.
- Run inference on one or more windows.
- Return calibrated scores.
- Persist model output rows.

Persist every real inference result into `sine.model_output` with:

- `analysis_run_id`
- `blob_id`
- `model_id`
- `output_kind`
- `window_start_sec`
- `window_end_sec`
- `top_label`
- `confidence`
- `ood_score`
- `labels`
- `scores`
- `embedding_ref`
- `embedding_sha256`
- `artifact_sha256`
- `label_map_sha256`
- `runtime_ms`
- `latency_ms`
- `metadata`

Only after at least one verified real model output exists may the response set:

- `model_status: "model_ready"`
- `identification_status: "model_evidence"`
- `identification_summary`

### 6. Embeddings And Prototype Matching

The `deep_signal_features` detector is not enough. Real prototype matching requires:

- a real embedding model
- stable embedding dimension
- stored vector or vector reference
- embedding checksum
- prototype catalog rows
- prototype source/license/provenance
- cosine similarity or distance
- OOD threshold
- segment/window bounds

Persist matches in `sine.prototype_match`.

Return `deep_signal_matches` only from real prototype matches, not from shallow spectral features.

### 7. Evidence Fusion

Persist fusion rows in `sine.fusion_evidence`.

Fusion must link:

- detector event ID
- model output ID
- prototype match ID
- label
- event family
- event type
- score
- weight
- explanation/detail

Fusion may create a stronger final summary only when linked evidence exists.

### 8. Sound Transcripts

Sound transcripts are not speech transcripts. They are chronological physical-activity descriptions.

Example:

```json
{
  "start_sec": 0.0,
  "end_sec": 3.5,
  "label": "low_frequency_whale_vocal",
  "description": "Low-frequency modulated vocalization with descending sweep.",
  "sound_source": "Humpback whale candidate",
  "confidence": 0.94,
  "frequency_range": "120 Hz - 400 Hz",
  "model_output_ids": ["..."],
  "prototype_match_ids": ["..."],
  "fusion_evidence_ids": ["..."]
}
```

Transcript rows must persist in `sine.sound_transcript`.

Do not generate transcript prose unless each transcript row links to at least one model output, prototype match, or fusion evidence row.

### 9. Human Identification Correction Loop

Morgan must be able to correct a model label without deleting model evidence.

Required behavior:

- Existing model prediction remains saved.
- Human correction saves separately.
- Human label is marked as `human_tagged`.
- Store reviewer/user, label, category, confidence/certainty, note, segment/window, and timestamp.
- If human label disagrees with model label, create a contested review/training row.
- Later training can learn from human tags, but the backend should still preserve the original model result and uncertainty.

Use existing wave/human annotation backend work where possible:

- `library.acoustic_wave_annotation`
- `library.acoustic_human_identification`

Add training-review tables if needed.

## Required Sound Domains

Do not reduce SINE to birds and UAVs.

SINE must cover water, air, and ground.

Required broad target domains and families:

- marine mammals: whales, dolphins, porpoises
- fish choruses and underwater biologics
- birds
- terrestrial mammals
- amphibians
- insects
- soil bioacoustics
- unknown hydrophone biologics
- UAVs, drones, quadcopters
- helicopters
- airplanes
- boat propellers
- submerged propellers
- vessel/submarine hums
- sonar/pings
- machinery
- actuators, motors, steppers, servos
- explosions, blasts, impacts
- lightning and thunder
- rain, wind, storms
- earthquake/seismic signatures
- underground/soil/ground surface motion
- water pressure impulses
- unknown/OOD
- human-contested labels

If a target has no model coverage, return honest `model_unavailable`, `unknown`, or `out_of_domain`. Do not guess.

## User-Provided Acoustic References To Audit

Cursor should audit and integrate only what is appropriate, licensed, and technically compatible. Do not blindly paste code.

- `https://github.com/dimastatz/deep-signal`
- `https://github.com/pschatzmann/arduino-audio-tools/wiki/Simple-Frequency-Detection`
- `https://github.com/microsoft/acoustic-bird-detection`
- `https://github.com/amsehili/auditok`
- `https://github.com/pcasabianca/Acoustic-UAV-Identification`
- `https://github.com/nationalparkservice/acoustic_discovery`

Integration expectation:

- frequency detection should inform deterministic DSP lanes
- Auditok-style activity should inform activity segmentation
- Microsoft bird detection should become a real model path only if weights/runtime can be packaged and validated
- UAV detection should become a real rotor/propeller model or well-labeled detector lane with clear non-semantic status
- NPS acoustic discovery should inform prototype/fingerprint matching and catalog structure
- deep-signal should become real embedding/prototype logic only if a real model/vector path is implemented

## Baseline External Codebases Morgan Specifically Wants Used

Codex verified that local audit checkouts already exist at:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-temp\sine-audio-repo-audit`

Cursor should use these as implementation references, not Website dependencies. Review licenses before copying code. Prefer reimplementing the useful architecture in MINDEX's style.

### `GorillaBus/urban-audio-classifier`

URL:

`https://github.com/GorillaBus/urban-audio-classifier`

Use:

- normalized log-mel / MFCC preprocessing patterns
- padding to fixed feature width
- fold-aware evaluation, confusion matrix, and per-class metrics
- terrestrial/urban environmental class baseline

Do not use:

- direct LGPL code reuse without license review
- notebook-only training as production runtime

### `IBM/MAX-Audio-Classifier`

URL:

`https://github.com/IBM/MAX-Audio-Classifier`

Use:

- clean serving separation: decode -> embedding -> classifier preprocess -> inference -> postprocess
- top-k response contract with label IDs, labels, and probabilities
- start-time/window handling for long clips
- AudioSet/VGGish-style general environmental head as a design reference

Do not use:

- old TensorFlow 1 serving code as the final SINE runtime
- AudioSet 527 classes as the only SINE taxonomy

### `abishek-as/Audio-Classification-Deep-Learning`

URL:

`https://github.com/abishek-as/Audio-Classification-Deep-Learning`

Use:

- multiple-head comparison idea: ANN / CNN1D / CNN2D opinions over a common feature extractor
- simple MFCC baseline for regression tests

Do not use:

- Keras H5/Django app as production SINE
- averaged MFCC as the main hydrophone or buoy classifier

### `daisukelab/ml-sound-classifier`

URL:

`https://github.com/daisukelab/ml-sound-classifier`

Use:

- rolling buffer / chunked audio processing
- long-file spectrogram splitting with overlap
- geometric mean or calibrated aggregation over repeated windows
- real-time edge-device pattern for Psathyrella buoy / Jetson work
- class-balance, mixup, oversampling, and confusion-matrix training patterns

Do not use:

- old frozen TensorFlow graph runtime directly
- desktop PyAudio capture as the production server dependency

### `daisukelab/sound-clf-pytorch`

URL:

`https://github.com/daisukelab/sound-clf-pytorch`

Use:

- PyTorch ResNetish/VGGish-style spectrogram model family
- adaptive pooling for variable spectrogram sizes
- log-mel input recipe
- P0 `sine-esc50-resnetish-v1` model architecture reference

Do not use:

- unverified/no-license code copy without review
- model artifact without checksum, metrics, and label map

### `ilge/gmtk-audio-classification`

URL:

`https://github.com/ilge/gmtk-audio-classification`

Use:

- temporal persistence / smoothing concepts
- false-positive reduction across multiple windows
- filterbank/envelope feature ideas for sustained events

Do not use:

- Windows-invalid path structure as a vendored package
- temporal smoothing as proof of semantic identity by itself

### `ksanjeevan/crnn-audio-classification`

URL:

`https://github.com/ksanjeevan/crnn-audio-classification`

Use:

- CRNN / CNN / RNN model families for variable-length temporal audio
- mel spectrogram frontend with recurrent sequence modeling
- augmentation patterns such as stretch/noise/crop for training
- P1 head for whale songs, dolphin clicks, rotors, repeated insect patterns, and seismic/impulse sequences

Do not use:

- a single CRNN as the entire SINE stack; it should be one registered model family

### `imfing/audio-classification`

URL:

`https://github.com/imfing/audio-classification`

Use:

- interpretable feature baseline:
  - MFCC
  - chroma
  - mel
  - spectral contrast
  - tonnetz
- diagnostics and model-explanation feature rows

Do not use:

- classic feature vector baseline as the only classifier

### OVH marine sound classification notebook

URL:

`https://github.com/ovh/ai-training-examples/blob/main/notebooks/audio/audio-classification/notebook-marine-sound-classification.ipynb`

Use:

- marine mammal / hydrophone dataset workflow
- 30-second marine-window convention
- Watkins-style marine mammal class workflow
- feature set:
  - chroma
  - RMS
  - spectral centroid
  - spectral bandwidth
  - rolloff
  - zero crossing rate
  - harmony/perceptr
  - tempo
  - MFCC

Do not use:

- notebook-only workflow as deployable backend

### `braydenoneal/neural-audio-classification`

URL:

`https://github.com/braydenoneal/neural-audio-classification`

Use:

- TorchScript save/load pattern
- spectrogram image classifier concept
- simple educational deployment reference

Do not use:

- spectrogram image-only classifier as final SINE

## Scientifically Useful SINE Upgrade Plan

The production architecture should be a layered evidence system, not a single magic classifier.

### P0: Make SINE Honest And Prove One Real Model

Goal:

- The backend must stop pretending detector-only output is meaning.
- One short ESC-50/environmental clip must produce real model-backed output.

Deliverables:

- detector-only runs return `model_unavailable` with no semantic identity.
- `sine.model_artifact` has at least one registered P0 artifact.
- `sine-esc50-resnetish-v1` or equivalent is trained/exported to TorchScript or ONNX.
- artifact SHA-256 and label-map SHA-256 are verified before inference.
- one ESC-50 clip returns persisted `sine.model_output`.
- frontend SINE gate changes from blocked to evidence-backed only for that real model result.

Recommended model:

- log-mel ResNetish/VGGish-style PyTorch model using the `sound-clf-pytorch` pattern.
- support an interpretable MFCC/log-mel baseline from `urban-audio-classifier` / `imfing` for diagnostics.

### P1: Hydrophone / Navy / Psathyrella Buoy Domain

Goal:

- Move beyond ESC-50 and support real water/air/ground recordings relevant to contracts and field devices.

Deliverables:

- 30-second windowed hydrophone analysis for MBARI/Watkins/Psathyrella files.
- marine mammal/vessel/propeller/sonar/mechanical/water-pressure classes.
- CRNN/GRU or transformer model for evolving sequences.
- long-file queued analysis with per-window persistence.
- rolling-buffer analysis job for buoy or Jetson streams using overlap and smoothing.
- OOD/unknown handling so SINE can admit that a sound is not covered.

Recommended model families:

- marine mammal/vessel head from OVH/Watkins-style feature windows.
- CRNN/GRU temporal head from `ksanjeevan/crnn-audio-classification` style.
- rolling-buffer chunking and smoothing from `daisukelab/ml-sound-classifier`.

### P2: Prototype Retrieval And Sound Transcripts

Goal:

- Make SINE useful for unknown and rare patterns by matching fingerprints, not only closed-set class labels.

Deliverables:

- 512D or other stable embedding model.
- prototype table with source, license, segment, vector checksum, embedding model ID, and metadata.
- cosine-distance or inner-product nearest-neighbor retrieval.
- `sine.prototype_match` rows for proven matches.
- `sine.fusion_evidence` rows linking detectors, model outputs, and prototype matches.
- `sine.sound_transcript` rows only when linked evidence exists.
- human-corrected contested examples automatically enter training review.

Recommended model families:

- modern PANNs/CNN14, AST, BEATs, CLAP, or equivalent if packaged locally with checksums.
- do not call remote LLMs to identify sounds.

### P3: MYCA/Nature Learning Model Automation

Goal:

- MYCA can explain and operate on the real evidence without inventing labels.

Deliverables:

- MYCA readout receives model/prototype/fusion/transcript evidence only.
- MYCA can propose review notes, compare model vs human labels, and queue retraining candidates.
- MYCA cannot override or fabricate acoustic identity.
- MYCA/NLM memory stores facts about verified evidence, contested labels, and training-review state.

## Concrete MINDEX Module Map For Cursor

Recommended backend modules:

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
```

Recommended ETL/training modules:

```text
mindex_etl/sine/datasets.py
mindex_etl/sine/features.py
mindex_etl/sine/train_resnetish.py
mindex_etl/sine/train_crnn.py
mindex_etl/sine/export_model.py
mindex_etl/sine/build_prototypes.py
mindex_etl/sine/evaluate_model.py
mindex_etl/jobs/train_sine_esc50_p0.py
mindex_etl/jobs/train_sine_marine_p1.py
mindex_etl/jobs/build_sine_prototypes_p1.py
```

Required model artifact layout:

```text
/mnt/nas/mindex/models/sine/{model_id}/
  model.onnx or model.ts
  labels.json
  metrics.json
  feature_config.json
  training_manifest.json
  checksums.sha256
```


## Required API Response Shape

Production analyze/classify responses should converge on:

```json
{
  "analysis_run_id": "uuid",
  "analysis_engine": "sine_acoustic",
  "model_status": "model_ready",
  "identification_status": "model_evidence",
  "identification_summary": {
    "top_label": "lightning_thunder",
    "category": "weather_acoustics",
    "type": "lightning",
    "confidence": 0.91,
    "ood_score": 0.08,
    "status": "model_evidence",
    "model": "sine-esc50-p0-v1"
  },
  "activity_segments": [],
  "frequency_detections": [],
  "bird_detections": [],
  "uav_detections": [],
  "nps_detections": [],
  "deep_signal_matches": [],
  "model_outputs": [],
  "prototype_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "audio_decoded": true,
    "sample_rate_in": 44100,
    "channels": 1,
    "model_ready": true,
    "model_registry_ready": true,
    "prototype_catalog_ready": true,
    "inference_ready": true,
    "latency_ms": 0,
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false,
    "synthetic_output_used": false
  }
}
```

The arrays above must contain real persisted evidence rows when relevant. Empty arrays are acceptable only when the response says detector-only, unknown, OOD, queued, or model unavailable.

## Oscilloscope-Grade Visualisation

The frontend asks the backend for high-definition signal data. Implement the backend path so it honors:

Local UI/science references:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\oscilloscope.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\stft-spectrogram.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\spectrum-analyzer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\signal-fingerprint.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\sensing\sine-acoustic-player.tsx`

The Fungi Compute components prove the desired interaction style: real canvas signal buffers, adjustable grid/scale, STFT columns, frequency bands, peaks, waterfall/fingerprint views, and exportable measurements. The SINE player is the acoustic-specific shared surface; it needs MINDEX to return enough real backend data for the same level of inspection.

- `start_sec`
- `end_sec`
- `max_waveform_points=8192`
- `max_time_frames=1024`
- `max_frequency_bins=256`
- `fft_size=2048`
- `hop_length=128`
- `window_function=hann`
- `db_floor=-96`
- `db_ceiling=0`
- `include_peaks=true`
- `quality=oscilloscope`
- `ignore_saved_visualisation=true`

Return:

- waveform points
- spectrogram power matrix
- frequency axis
- time axis
- peak rows
- duration
- sample rate
- channel count
- FFT size
- hop length
- window function
- dB bounds
- frequency bounds
- visualisation status
- DSP backend

No generated/synthetic visualisation.

## Website Contract Cursor Must Honor

The Website sends an evidence contract from:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/natureos/mindex/library/classify?id={id}`
- shared SINE player analyze action

Required request fields include:

- `target_domains`: `water`, `air`, `ground`
- broad class families
- sound target list
- requested outputs
- model/prototype/vector/transcript evidence requirements
- detector-only honesty
- no semantic fallback
- no LLM fallback
- no filename fallback
- no metadata fallback
- no synthetic output
- 30-second default windows
- oscilloscope visualisation quality

Preserve this contract in DB summaries and diagnostics so every analysis run has an audit trail.

## No-Go Rules

- No mock data.
- No generated WAV rows.
- No metadata/filename/source classifier.
- No Gemini or LLM classifier for acoustic identity.
- No semantic `identification_summary` without evidence IDs.
- No transcript prose without evidence IDs.
- No model readiness without artifact checksum and runtime proof.
- No silent fallback to fake labels.
- No frontend-only fix that hides missing backend inference.

## Acceptance Criteria

Cursor cannot call this backend complete until all of these pass:

1. Missing-model analyze returns `model_unavailable` and no semantic identity.
2. One short ESC-50 clip returns a real model-backed output with model artifact, runtime, checksum, label map, window bounds, scores, top label, OOD/confidence, and latency.
3. One hydrophone/MBARI or Psathyrella acoustic window returns either a bounded model result or honest queued/OOD/model-unavailable state.
4. One negative/OOD case returns no fake semantic label.
5. One human correction persists beside the model prediction and enters training review.
6. `GET /api/mindex/sine/status` reports model registry truth, loaded models, runtime backends, inference readiness, and blockers.
7. `GET /api/mindex/sine/models` and `/prototypes` return real registry/catalog rows or honest unavailable status.
8. `GET /api/mindex/sine/blobs/{id}/visualisation` returns real high-resolution decoded arrays for a short clip.
9. Website `http://localhost:3010/sensing/sine` shows the model gate clear only for real model-backed evidence.
10. MINDEX tests pass locally and on VM 189 after deploy.

## Cursor Execution Order

1. Review Codex local patches and keep the detector-only honesty behavior.
2. Apply migrations for model registry and evidence persistence.
3. Deploy the honesty/registry/evidence patches to VM 189.
4. Re-test through VM and 3010 BFF so the frontend sees honest `model_unavailable` until real models exist.
5. Add real model artifact packaging under the NAS or approved local model path.
6. Implement checksum-verified PyTorch/TorchScript/ONNX model loading.
7. Implement windowed real inference and persist `sine.model_output`.
8. Add real prototype/fingerprint catalog and persist `sine.prototype_match`.
9. Add fusion evidence and evidence-linked sound transcripts.
10. Calibrate OOD/open-set thresholds and prove weak/OOD clips do not become confident semantic identity.
11. Wire human correction/training-review persistence.
12. Run full tests and smoke through `http://localhost:3010/sensing/sine`.

## Final Note

SINE is allowed to say "I do not know yet." That is the correct state until a real acoustic model, verified artifact, label map, prototype catalog, and evidence-linked transcript path exist.
