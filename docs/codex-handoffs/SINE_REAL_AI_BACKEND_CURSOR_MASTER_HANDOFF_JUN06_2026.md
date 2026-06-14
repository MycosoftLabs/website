# SINE Real AI Backend Master Handoff For Cursor

Date: June 6, 2026

Prepared by: Codex

Target backend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Website/frontend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

Primary frontend QA surfaces:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

MINDEX VM:

- `192.168.0.189:8000`
- NAS audio root on VM: `/mnt/nas/mindex/Library/acoustic`
- Windows NAS reference: `\\192.168.0.105`

Supporting docs already written by Codex:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_BACKEND_CURSOR_FULL_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

## Executive Directive

Morgan manually QA-tested the SINE audio player and confirmed that `Run SINE analysis` is not actually doing real acoustic AI analysis. Treat the current backend as an incomplete detector shell. It may return HTTP 200 and detector-shaped JSON, but it does not prove real PyTorch, TorchScript, ONNX, neural network, transformer, embedding, prototype matching, evidence fusion, or sound transcript generation.

Cursor must build the real MINDEX SINE acoustic classifier backend.

This is acoustic-only. Do not work on chemistry, DNA, PubChem, DWSIM, Cantera, or unrelated MINDEX tabs in this pass.

## Operational Stakes: Navy And Psathyrella Buoy

This backend is not a demo classifier. It is part of the SINE acoustic intelligence stack for Navy-facing work, hydrophone deployments, and the Psathyrella buoy device path. Treat false certainty as a product failure. For defense, marine, and field-device use, an honest `unknown`, `model_unavailable`, or `out_of_domain` result is safer and more useful than a fake semantic label.

Cursor must build toward these operational gates:

- Hydrophone/buoy clips can be analyzed in bounded windows, starting with 30-second windows for MBARI/hydrophone files.
- Long files are split into overlapping windows with explicit `start_sec`, `end_sec`, `window_index`, `overlap_sec`, and job/progress metadata.
- Psathyrella buoy audio can be treated as a streaming or near-real-time source using rolling buffers, not only one-off uploaded clips.
- Water-domain results distinguish at least these families when models/prototypes exist: marine life, vessel/propeller, mechanical/infrastructure noise, impulse/explosion/impact, weather/wave state, acoustic ping/comms/test signal, and unknown/OOD.
- Air-domain results distinguish at least these families when models/prototypes exist: animal, insect, UAV/rotor, aircraft/helicopter, machinery, weather/lightning/thunder, impulse/explosion/impact, human/site activity, and unknown/OOD.
- Ground-domain results distinguish at least these families when models/prototypes exist: seismic/earthquake, soil/underground acoustic activity, vibration/actuator/motor, impact/impulse, infrastructure/mechanical, and unknown/OOD.
- Every operational result must carry provenance: blob UUID, file path, sensor/device/source, model version, model artifact checksum, label map checksum, window bounds, feature parameters, confidence, OOD score, and evidence links.
- The system must preserve negative and contested examples. If Morgan tags a clip as lightning when the current model says UAV, both records must remain available for review/training.
- For contract-facing QA, Cursor must provide one marine/hydrophone sample report and one missing-model/OOD negative report. Do not use only an ESC-50 smoke as proof that SINE is operationally ready.

## What "Real Analysis" Means

`Run SINE analysis` is real only when the backend can prove all of this for a selected audio blob:

1. It resolved a real `library.blob` acoustic UUID.
2. It decoded actual NAS-backed audio bytes, not generated data.
3. It computed deterministic signal evidence from samples.
4. It ran a registered AI model, or honestly returned `model_status: "model_unavailable"`.
5. Model outputs include model identity, artifact path, checksum, label map, framework/runtime, device, training dataset, and window coordinates.
6. Prototype or fingerprint matches include stable prototype identity, embedding/vector proof, source dataset, score or distance, and model identity.
7. Fusion evidence links model outputs, prototype matches, and detector events.
8. Sound transcripts are chronological and evidence-linked. They must not be free-floating prose.
9. Human corrections are saved beside model predictions, marked contested when they disagree, and queued for future training or prototype review.
10. The website can verify the result and move from `MINDEX contract failed` or `AI pending` to `Scientific classifier ready`.

If any semantic label appears without model, prototype, fusion, or transcript evidence, the backend is still wrong.

## Current Failure

Observed current behavior from the Website BFF against real acoustic clips:

- `POST /api/mindex/sine/blobs/{uuid}/analyze` can return HTTP 200.
- It can report `status: complete`.
- It can emit semantic-looking labels such as `bird_likely`, `uav_rotor_likely`, `avian_or_insect_band`, or `spectral_embedding`.
- It can omit `model_status`.
- It can return zero `model_outputs`.
- It can return zero `fusion_evidence`.
- It can return zero evidence-linked `sound_transcripts`.
- It can return a `deep_signal_matches` row without real prototype/vector proof.

The Website now flags this as:

- `MINDEX contract failed`
- `Semantic contract violation`

That is correct. Cursor should fix the backend, not ask Codex to hide the failure.

## Morgan QA Escalation - June 6 2026

Morgan did additional hands-on QA in the SINE audio player and confirmed the important product truth: `Run SINE analysis` is not currently doing real acoustic AI. The frontend can load and play NAS-backed audio and can build a real browser-side waveform/spectrogram from decoded audio bytes, but the backend analysis result is still detector/heuristic shaped output.

Cursor must treat this as a backend rebuild task, not a UI bug. The current backend is not acceptable just because it returns HTTP 200 or fills detector lanes. The P0 deliverable is a real acoustic classifier pipeline with real decoded samples, PyTorch/TorchScript/ONNX inference, persisted model/prototype/fusion evidence, and evidence-linked sound transcripts.

Codex has hardened the Website so unproven prototype/deep-signal rows are rendered as unverified backend rows when the MINDEX response violates the evidence contract. This is intentional. Cursor should not try to make the frontend accept weak rows. Cursor should make MINDEX return real evidence.

Minimum Cursor completion bar:

- If no model artifact is loaded, MINDEX returns `model_status: "model_unavailable"` and no semantic label.
- If a semantic label is returned, it has a real model output, prototype match, fusion evidence row, or evidence-linked transcript behind it.
- `deep_signal_matches` come from actual embeddings/vector similarity and include prototype identity, vector/model proof, source, score or distance, and window bounds.
- `sound_transcripts` describe physical acoustic windows and carry evidence IDs; they are not prose generated from filenames, source names, or detector labels.
- Human tags stay separate from model predictions and can be contested when Morgan corrects a wrong model result.

Website verification after the June 6 frontend guard:

- `http://localhost:3010/sensing/sine/player` loaded `36` files from the 2,180-row acoustic library.
- selected blob: `6a8492b5-0796-43b3-be42-1ccd753f5d12`.
- selected file: `acoustic/esc50/1-100038-A-14.wav`.
- root state: `data-sine-contract-status="contract_violation"`.
- root state: `data-sine-readiness-label="MINDEX contract failed"`.
- visual scope source: `browser-real-audio`.
- waveform points: `8192`.
- spectrogram size: `256 x 1024`.
- frontend text now renders unproven deep-signal/prototype rows as `Unverified backend matches`.
- frontend no longer presents current weak backend rows as confirmed `Prototype matches` when the MINDEX evidence contract fails.

## June 6 Live Re-Test Evidence

Codex re-tested the current deployed MINDEX path through the Website BFF on June 6, 2026. This is the latest concrete failure evidence Cursor should reproduce before and after the backend fix.

Selected real acoustic blob:

`6a8492b5-0796-43b3-be42-1ccd753f5d12`

Selected file:

`acoustic/esc50/1-100038-A-14.wav`

Frontend surface:

`http://localhost:3010/sensing/sine`

Library proof:

- `GET /api/natureos/mindex/library?category=acoustic&limit=20` returns HTTP 200.
- SINE status reports `acoustic_blobs: 2180`.
- The page loads 36 ESC-50 rows on startup and selects a real WAV.
- The real browser audio stream decodes successfully as 5 seconds, 48 kHz, mono.

Backend visualisation failure:

Request:

`GET /api/mindex/sine/blobs/6a8492b5-0796-43b3-be42-1ccd753f5d12/visualisation`

Query params included:

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

Actual backend response summary:

```json
{
  "status": 200,
  "visualisation_status": null,
  "duration_sec": 5,
  "sample_rate_hz": 16000,
  "channels": null,
  "waveform_points": 800,
  "spectrogram_rows": 64,
  "spectrogram_cols": 44,
  "fft_size": null,
  "hop_length": null,
  "window_function": null,
  "frequency_min_hz": null,
  "frequency_max_hz": null,
  "db_floor": null,
  "db_ceiling": null,
  "peaks": 0,
  "keys": ["duration_sec", "layers", "reference", "sample_rate_hz", "spectrogram", "waveform"]
}
```

This proves the backend is not honoring the oscilloscope visualisation contract. The Website now compensates by decoding the real audio stream in the browser and building an 8,192-point waveform plus 256 x 1,024 spectrogram, but this is a frontend fallback. MINDEX must return the real high-definition visualisation itself.

Backend analysis failure:

Request:

`POST /api/mindex/sine/blobs/6a8492b5-0796-43b3-be42-1ccd753f5d12/analyze`

Evidence contract included:

```json
{
  "require_real_audio": true,
  "require_model_evidence": true,
  "allow_detector_only": true,
  "semantic_fallback": false,
  "llm_fallback": false,
  "prototype_matching": true,
  "sound_transcripts": "evidence_backed_only"
}
```

Actual backend response summary:

```json
{
  "status": 200,
  "payload_status": "complete",
  "model_status": null,
  "identification_summary": {
    "top_label": "bird_likely",
    "label": "bird_likely",
    "confidence": 1,
    "engine": "bird_microsoft",
    "model": "mindex_sine_v1",
    "status": "classified",
    "dominant_frequency_hz": 3398.4375
  },
  "model_outputs": 0,
  "fusion_evidence": 0,
  "sound_transcripts": 0,
  "deep_signal_matches": 1,
  "frequency_detections": 12,
  "activity_segments": 1,
  "bird_detections": 1,
  "uav_detections": 1,
  "semantic_labels": [
    "bird_likely",
    "bird_likely",
    "spectral_embedding",
    "bird_likely",
    "uav_rotor_likely"
  ],
  "diagnostics": null
}
```

This is the exact bug. A detector-only response may contain frequency peaks, activity segments, energy, centroid, rotor-harmonic candidates, and other signal evidence. It must not emit semantic labels, `identification_summary`, `classified`, `bird_microsoft`, `uav_rotor_likely`, `spectral_embedding`, or `mindex_sine_v1` model claims unless a registered model/prototype/fusion evidence chain exists. If no model is loaded, return `model_status: "model_unavailable"` and no semantic meaning.

## First Backend Fix: Stop Fake Semantic Output

Before training or adding any model, Cursor must make the current backend honest.

Search production MINDEX paths:

```powershell
rg -n "bird_likely|uav_rotor_likely|avian_or_insect_band|spectral_embedding|Gemini|GoogleGenAI|mockAcousticBlobs|generateWavBuffer|synthetic|metadata-derived|filename-derived|heuristic fallback|fake label|demo label" mindex_api mindex_etl tests
```

Required behavior when no real model is loaded:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
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

DSP arrays may be non-empty if they were computed from real audio:

- `frequency_detections`
- `activity_segments`
- energy windows
- FFT peaks
- centroid/rolloff/RMS/ZCR features
- impulse/rotor/sweep candidates

But those are signal evidence, not semantic meaning. They cannot produce `identification_summary`, `sound_transcripts`, or semantic `deep_signal_matches` without model or prototype proof.

## Required Backend Architecture

Build SINE as a real acoustic analysis stack in MINDEX FastAPI/Python.

Recommended modules:

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

## Audio Decode And Library Identity

SINE analysis must use registered `library.blob` UUIDs. A path-only NAS row can be playable, but it cannot be considered analyzable.

Required behavior:

- `GET /api/mindex/library/blobs?category=acoustic&limit=...` returns UUID-backed acoustic rows.
- `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=...` returns registered ESC-50 rows with UUIDs.
- Rows include at least one stable UUID field: `id`, `blob_id`, `uuid`, `analysis_id`, or `remote_id`.
- Rows include `relative_path`, `source_id`, `duration_sec`, `sample_rate_hz`, `channels`, `size_bytes`, `license`, and a streamable URL or stream-resolvable path.
- Encoded filesystem IDs can exist as `file_id` for streaming only.
- `.wav.manifest.json` and other manifest sidecars must not appear as playable audio files.
- Search must cover file name, relative path, source/dataset ids, sensor type, acoustic environment, tags, human labels, model labels, and class families.

Decoder requirements:

- Resolve blob ID from `library.blob`.
- Validate category is acoustic.
- Resolve file path under NAS root only.
- Reject path traversal.
- Decode WAV, FLAC, MP3, and future containers with `soundfile`, `librosa`, or `ffmpeg` fallback.
- Preserve original sample rate, channels, duration, file hash, and byte diagnostics.
- Normalize waveform to float32.
- Downmix or preserve channels intentionally, never accidentally.
- Resample only for model input after preserving original diagnostics.

## Deterministic DSP Layer

Build deterministic features from real samples. These are scientific signal evidence, not final meaning by themselves.

Required feature families:

- waveform envelope
- STFT
- linear spectrogram
- log-mel spectrogram
- optional PCEN
- MFCC
- chroma
- RMS energy
- zero crossing rate
- spectral centroid
- spectral bandwidth
- spectral rolloff
- spectral contrast
- tonnetz/harmonic features where useful
- FFT peak detection
- activity segmentation
- impulse candidates
- sweep/chirp candidates
- harmonic/rotor candidates
- low-frequency ground/seismic candidates
- underwater propeller/cavitation candidates

Persist or return detector events with:

- detector name
- event type
- start/end seconds
- confidence or score
- numeric value and unit where applicable
- feature metadata
- analysis run ID
- blob ID

## High-Definition Visualisation

`GET /api/mindex/sine/blobs/{id}/visualisation` must derive arrays from real audio bytes.

Accept and honor:

- `start_sec`
- `end_sec`
- `windowed`
- `waveform_points`
- `max_waveform_points`
- `spectrogram_rows`
- `max_spectrogram_rows`
- `spectrogram_columns`
- `max_spectrogram_columns`
- `n_fft`
- `hop_length`
- `window`
- `scale`
- `f_min`
- `f_max`
- `include_envelope`
- `include_rms`
- `include_power_db`
- `quality`

Return:

- waveform points
- spectrogram matrix
- time axis
- frequency axis
- power dB values
- sample rate
- channels
- duration
- FFT/window settings
- clamp/downsample diagnostics if limits were applied

Do not return generated filler matrices. If the file is too large, require a bounded window or queue the heavy work.

## Model Registry

The backend must expose real model provenance. Detectors alone do not make SINE AI-ready.

Required endpoint:

`GET /api/mindex/sine/models`

Model rows must include:

- `model_id`
- `model_name`
- `model_version`
- `domain`
- `target_domains`
- `class_families`
- `framework`
- `runtime`
- `artifact_uri`
- `artifact_sha256`
- `label_map_uri`
- `label_map_sha256`
- `training_dataset`
- `training_manifest_uri`
- `metrics_uri`
- `confusion_matrix_uri`
- `embedding_dim`
- `window_sec`
- `sample_rate`
- `status`
- `loaded`
- `device`
- `backend_commit`
- `last_loaded_at`
- `last_successful_inference_at`
- `load_error` if failed

Never mark a model loaded or live if:

- artifact file is missing
- checksum validation failed
- label map is missing
- runtime failed to load
- only detector heuristics are available

## P0 Model

First proof model:

`sine-esc50-resnetish-v1`

Purpose:

- Prove real model training/export/loading/inference on known ingested acoustic data.
- Establish the model registry, provenance, and evidence contract.
- Give the frontend at least one real short-clip run that can reach `Scientific classifier ready`.

Training data:

- ESC-50 acoustic files already ingested into MINDEX.
- Use registered library rows and manifests.
- Do not infer labels from filenames unless the registered dataset manifest maps them.

Architecture:

- PyTorch log-mel CNN/ResNetish style model.
- Fixed 5-second windows for ESC-50.
- Padding/cropping for short/long clips.
- Penultimate-layer embedding for prototype matching.
- Export to TorchScript or ONNX.

Required artifact layout:

```text
/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/
  model.pt or model.onnx
  labels.json
  training_config.json
  metrics.json
  confusion_matrix.json
  manifest.json
  artifact.sha256
  label_map.sha256
```

Required metrics:

- accuracy
- precision
- recall
- F1
- per-class metrics
- confusion matrix
- training/validation split method
- training dataset counts
- model checksum
- label map checksum

## P1/P2 Model Roadmap

After the P0 model proves the stack:

- CRNN or GRU temporal model for repeated/evolving sounds.
- Audio Spectrogram Transformer, BEATs, PANNs/CNN14, CLAP, or equivalent embedding model for broader semantic audio.
- Contrastive 512D embedding space for prototype and nearest-neighbor matching.
- Domain heads for water, air, and ground.
- Specialized branches for marine bioacoustics, terrestrial animals, insects, propellers, UAVs, helicopters, airplanes, vessel engines, underwater cavitation, thunder/lightning, explosions, impacts, ground/seismic, soil/underground sounds, mechanical/device sounds, and unknown/out-of-domain patterns.

Do not collapse SINE into only bird and rotor detection. Those are small subcategories, not the product.

## Prototype And Fingerprint Search

SINE needs a real prototype catalog for matching known sound signatures.

Required endpoint:

`GET /api/mindex/sine/prototypes`

Required prototype fields:

- `prototype_id`
- `label`
- `category`
- `domain`
- `source_dataset`
- `source_blob_id`
- `start_sec`
- `end_sec`
- `model_id`
- `embedding_dim`
- `embedding_sha256`
- `status`

Per-run `deep_signal_matches` must include:

- stable prototype identity
- score, confidence, similarity, distance, or cosine distance
- source dataset
- model ID
- embedding dimension
- vector or embedding checksum
- segment start/end

A label plus score is not enough. Prototype matching should use cosine similarity or equivalent nearest-neighbor search over stored embeddings. Use pgvector if available; otherwise use a managed float array with deterministic similarity search for P0.

## Evidence Fusion

Fusion evidence combines:

- model output
- prototype match
- deterministic detector events
- OOD score
- temporal smoothing/hysteresis

Fusion rows must include:

- `id`
- `analysis_run_id`
- `blob_id`
- `kind`
- `label`
- `event_family`
- `start_sec`
- `end_sec`
- `score`
- `model_output_id` when relevant
- `prototype_match_id` when relevant
- `detector_event_ids`
- explanation JSON

Do not call detector-only rows semantic fusion unless they are explicitly marked non-semantic. Semantic fusion must link to model or prototype evidence.

## Sound Transcripts

Sound transcripts are chronological descriptions of actual detected acoustic events. They are not speech transcription and not LLM story generation.

Required transcript fields:

- `id`
- `analysis_run_id`
- `blob_id`
- `start_sec`
- `end_sec`
- `label`
- `description`
- `sound_source`
- `confidence`
- `frequency_range`
- `model_output_ids`
- `fusion_evidence_ids`
- `prototype_ids`

Transcript rules:

- No transcript row without evidence links.
- No Gemini/LLM prose in P0.
- P0 transcript text can be deterministic templates from evidence.
- Descriptions should explain physical acoustic mechanics: frequency sweep, impulse, harmonic series, low-frequency rumble, rotor harmonics, broadband crackle, cavitation pulses, animal vocalization band, seismic tremor band, etc.

## Human Correction And Learning Loop

Morgan explicitly wants to correct wrong identifications and have those corrections remembered for future training.

Example:

- model predicts `UAV`
- human says `lightning`
- backend stores both
- row is marked contested
- item enters review/training queue
- future model training can evaluate whether the human or model was right

Required behavior:

- Human labels never overwrite model outputs.
- Model predictions are immutable historical evidence.
- Human corrections are separate evidence.
- Disagreements become contested review items.
- Review queue can be queried for training-eligible examples.
- Region-level human tags preserve selected start/end seconds and scope measurements.
- Human tags include source/user/reviewer metadata without exposing credentials.

Required endpoints may use existing Cursor-added routes or new SINE routes:

- `POST /api/mindex/library/blobs/{id}/human-identification`
- `GET /api/mindex/library/blobs/{id}/human-identifications`
- `POST /api/mindex/sine/blobs/{id}/human-identification`
- `GET /api/mindex/sine/training/human-tags`

The Website already sends selected-region context, measurements, scope settings, and training review hints. Persist those fields as JSON if schema columns are not ready, but do not drop them.

## Request Contract From Website

The Website now sends an evidence contract on analyze and classify.

Query params include:

- `require_real_audio=true`
- `require_model_evidence=true`
- `allow_detector_only=true`
- `semantic_fallback=false`
- `llm_fallback=false`
- `prototype_matching=true`
- `sound_transcripts=evidence_backed_only`

Request body includes:

```json
{
  "evidence_contract": {
    "require_real_audio_decode": true,
    "require_model_provenance_for_semantic_labels": true,
    "require_registered_model_for_identification_summary": true,
    "require_evidence_links_for_sound_transcripts": true,
    "allow_detector_only_response": true,
    "allow_llm_semantic_fallback": false,
    "allow_filename_semantic_fallback": false,
    "allow_metadata_semantic_fallback": false,
    "allow_mock_or_synthetic_outputs": false,
    "expected_missing_model_status": "model_unavailable"
  },
  "sine_request": {
    "target_domains": ["water", "air", "ground"],
    "prototype_matching": true,
    "ood_scoring": true,
    "human_review_required": true,
    "model_provenance_required": true
  }
}
```

Cursor must preserve and honor these contracts. If a requested class family is not implemented yet, return an honest unsupported or missing-model state. Do not fake a label.

## Required Response Shape

`POST /api/mindex/sine/blobs/{id}/analyze` should return a unified payload:

```json
{
  "analysis_run_id": "uuid",
  "blob_id": "uuid",
  "status": "complete",
  "model_status": "model_ready",
  "identification_summary": {
    "top_label": "rain",
    "category": "weather",
    "type": "environmental_sound",
    "confidence": 0.91,
    "ood_score": 0.08,
    "evidence_ids": ["uuid"]
  },
  "activity_segments": [
    {
      "id": "uuid",
      "start_sec": 0,
      "end_sec": 5,
      "confidence": 0.86,
      "detector": "energy_segmenter"
    }
  ],
  "frequency_detections": [
    {
      "id": "uuid",
      "start_sec": 0.4,
      "end_sec": 1.2,
      "freq_hz": 780,
      "confidence": 0.74,
      "detector": "fft_peak"
    }
  ],
  "model_outputs": [
    {
      "id": "uuid",
      "model_id": "sine-esc50-resnetish-v1",
      "model_version": "v1",
      "framework": "pytorch",
      "runtime": "torchscript",
      "artifact_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/model.pt",
      "artifact_sha256": "sha256...",
      "label_map_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/labels.json",
      "label_map_sha256": "sha256...",
      "training_dataset": "ESC-50",
      "start_sec": 0,
      "end_sec": 5,
      "top_labels": [
        {
          "label": "rain",
          "score": 0.91,
          "category": "weather"
        }
      ],
      "ood_score": 0.08,
      "latency_ms": 42
    }
  ],
  "deep_signal_matches": [
    {
      "prototype_id": "esc50-rain-prototype-001",
      "label": "rain",
      "score": 0.88,
      "distance": 0.12,
      "source": "ESC-50",
      "model_id": "sine-esc50-resnetish-v1",
      "embedding_dim": 512,
      "embedding_sha256": "sha256...",
      "segment_start": 0,
      "segment_end": 5
    }
  ],
  "fusion_evidence": [
    {
      "id": "uuid",
      "kind": "model_prototype_dsp_fusion",
      "label": "rain",
      "event_family": "weather",
      "start_sec": 0,
      "end_sec": 5,
      "score": 0.9,
      "model_output_id": "uuid",
      "prototype_match_id": "uuid",
      "detector_event_ids": ["uuid"]
    }
  ],
  "sound_transcripts": [
    {
      "id": "uuid",
      "start_sec": 0,
      "end_sec": 5,
      "label": "Rainfall or droplet impact",
      "description": "Broadband short impulses and steady high-frequency texture consistent with rain or water droplets.",
      "sound_source": "environmental weather",
      "confidence": 0.9,
      "frequency_range": "500 Hz - 8000 Hz",
      "model_output_ids": ["uuid"],
      "fusion_evidence_ids": ["uuid"],
      "prototype_ids": ["esc50-rain-prototype-001"]
    }
  ],
  "diagnostics": {
    "audio_decoded": true,
    "sample_rate_in": 16000,
    "channels": 1,
    "duration_sec": 5,
    "window_sec": 5,
    "feature_pipeline": "log_mel_stft_dsp",
    "semantic_fallback_used": false,
    "latency_ms": 120
  }
}
```

If no model is loaded, the same endpoint should return detector evidence plus `model_status: "model_unavailable"` and no semantic rows.

## Long Files And Jobs

MBARI and hydrophone files can be large. Do not synchronously classify an entire huge file.

Required behavior:

- Support `start_sec` and `end_sec`.
- Support 5-second, 10-second, and 30-second analysis windows.
- Support queued jobs for heavy runs.
- Persist `analysis_run_id` and `job_id`.
- Polling must return the matching blob/window/job, not the latest unrelated whole-file result.
- Return honest progress states: `queued`, `running`, `complete`, `failed`, `model_unavailable`.

## Data Domains And Class Families

SINE is not just birds and rotors.

Required taxonomy direction:

- water
- air
- ground
- marine mammals
- fish and underwater biological activity
- terrestrial animals
- birds
- insects
- amphibians
- reptiles if acoustic data exists
- human-made mechanical sounds
- UAVs and quadcopters
- helicopters and airplanes
- propellers in air
- propellers and cavitation in water
- vessel engines
- explosions and impacts
- thunder and lightning
- earthquake/seismic/soil/underground sounds
- weather and wind
- device, motor, actuator, servo, pump, fan, and lab equipment sounds
- unknown and out-of-domain

For unimplemented families, return `unsupported` or `model_unavailable`. Do not fake classifications.

## External Acoustic Code Guidance

Use the companion audit for exact repo findings:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Implementation guidance:

- Use `daisukelab/sound-clf-pytorch` as the strongest P0 PyTorch/log-mel/ResNetish pattern.
- Use `ksanjeevan/crnn-audio-classification` as the P1 temporal CRNN/GRU pattern.
- Use `IBM/MAX-Audio-Classifier` for clean model wrapper/API/top-k/windowing design, but modernize away from old TensorFlow/MAX.
- Use `daisukelab/ml-sound-classifier` for rolling buffers, long-file splitting, prediction smoothing, mixup, class balancing, and domain configs.
- Use `GorillaBus/urban-audio-classifier` for fold-aware evaluation, confusion matrices, and log-mel/MFCC comparison.
- Use `imfing/audio-classification` for engineered DSP baseline features.
- Use the OVH marine notebook for marine/hydrophone 30-second windows and marine feature sets.
- Use `braydenoneal/neural-audio-classification` for TorchScript save/load pattern only.
- Use `ilge/gmtk-audio-classification` for temporal smoothing/hysteresis concepts only.

Do not cargo-copy old runtimes or no-license code into production. Reimplement useful ideas in MINDEX style after license review.

## Local AI Studio Prototype Rule

Local prototype:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Use only safe product/UI ideas:

- chronological sound transcripts
- model architecture explorer vocabulary
- prototype matching concept
- high-contrast hydrophone lab aesthetic
- combined waveform/spectrogram canvas layout
- explicit detector lane grouping
- a visible model stack explorer, but only when tied to evidence

Do not use:

- Gemini classifier
- prompt-generated detections
- mock acoustic blobs
- generated WAVs
- metadata-derived labels
- synthetic waveform/spectrogram matrices
- `SINEStatus` claims such as "ready", "FP16", "CUDA", "CRNN-ResNet", or "calibrated" unless they come from a registered `sine.model_artifact` row and a live model load check
- `server.ts` deterministic DSP fallback labels such as species names, UAV names, whale names, explosion names, or prototype matches unless they are created by a registered model/prototype/fusion run

Concrete prototype audit:

- `src/data/acousticData.ts` is all mock catalog data. It is useful only as a taxonomy sketch for air/water/source fields.
- `server.ts` synthesizes WAV bytes with `generateWavBuffer()`. That must never be used in MINDEX production analysis.
- `server.ts` builds synthetic waveform and spectrogram matrices from blob IDs. Backend visualisation must instead decode real NAS bytes.
- `performAcousticAnalysis()` prompts Gemini with metadata and asks it to invent classifier payloads. This is explicitly disallowed for SINE production.
- `generateDspHeuristicPayload()` returns semantic labels from metadata/IDs. This is the exact anti-pattern the backend must remove.
- `src/components/AcousticPlayer.tsx` has useful canvas interaction vocabulary, but its analysis trust model is too weak for production.
- `src/components\ModelExplorer.tsx` is useful as an architecture communication pattern, but every block in production must be marked `pending`, `observed`, or `evidence` based on actual backend evidence.

The production backend must decode real audio and run real signal/model code.

## High-Definition Scope And Oscilloscope Contract

SINE's current waveform/spectrogram feels too low fidelity. Cursor must make the backend provide enough real samples/features for the frontend to render a lab-grade oscilloscope/spectrogram, not a small decorative preview.

Website frontend references to reuse conceptually:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\oscilloscope.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\stft-spectrogram.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\spectrum-analyzer.tsx`

The backend visualisation endpoint must return real decoded arrays with enough resolution for those controls:

- `waveform.samples` or envelope points: default at least 8192 points for ordinary clips, with bounded downsampling metadata for large files.
- `spectrogram.power_db`: default at least 256 frequency bins x 1024 time frames for ordinary clips, with explicit clamp/downsample metadata for large files.
- explicit `fft_size`, `hop_length`, `window_function`, `sample_rate_hz`, `frequency_min_hz`, `frequency_max_hz`, `db_floor`, `db_ceiling`, `colormap_hint`, and `normalization`.
- optional multi-channel waveform/spectrogram arrays for hydrophones, stereo microphones, or device arrays.
- peak rows with frequency, magnitude, time, prominence, and detector source.
- range-request/window support: `start_sec`, `end_sec`, `max_waveform_points`, `max_time_frames`, `max_frequency_bins`.

The frontend should be able to offer oscilloscope-like controls using this real backend payload:

- time scale / zoom window
- frequency range
- amplitude gain and vertical offset
- dB floor/ceiling
- grid on/off
- peaks on/off
- overlay on/off
- waveform/spectrogram/waterfall modes
- cursor readout
- loop region start/end
- reverse playback flag for UI playback only
- marker/region persistence through existing wave annotation routes

Acceptance for this section:

- No backend visualisation payload may be generated from filename, ID, species label, source label, or metadata.
- If a requested clip/window is too large, return honest `visualisation_status: "queued"` or `visualisation_status: "clamped"` with details.
- If browser fallback is denser than MINDEX backend output, backend visualisation is not complete.

## Database Tables Needed

Use or create a `sine` schema. Minimum tables:

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

The detailed suggested columns are in:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

## Tests Cursor Must Add

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
```

Required acceptance tests:

1. Fake path purge:
   - No production analyze/classify path emits fake/Gemini/mock/filename labels.

2. Missing model negative:
   - No model loaded returns `model_status: "model_unavailable"`, no `identification_summary`, no semantic `deep_signal_matches`, no `fusion_evidence`, no `sound_transcripts`.

3. Real audio decode:
   - Selected ESC-50 and MBARI blobs decode from NAS bytes and report sample rate/channels/duration.

4. High-definition visualisation:
   - 8192 waveform points and 256 x 1024 spectrogram request returns real bounded arrays or honest clamp metadata.

5. ESC-50 P0 model:
   - Short ESC-50 clip returns real `model_outputs[]` with model artifact/checksum/label map/runtime proof.

6. Prototype catalog:
   - `/api/mindex/sine/prototypes` returns real prototype rows with model/vector/source proof.

7. Per-run prototype match:
   - Analysis returns `deep_signal_matches[]` with prototype ID and distance/similarity proof.

8. Fusion and transcript:
   - `fusion_evidence[]` links to model/prototype IDs.
   - `sound_transcripts[]` links to evidence IDs.

9. Long MBARI window:
   - 30-second window completes or queues without whole-file timeout.

10. Polling correctness:
   - `GET /analysis?job_id=...&start_sec=...&end_sec=...` returns the submitted run/window.

11. Human correction:
   - Model label and human label persist side-by-side and contested examples enter review queue.

12. Website smoke:
   - `http://localhost:3010/sensing/sine` can show real model evidence for a real run.
   - `http://localhost:3010/natureos/mindex` -> Library -> Acoustic uses the same evidence.

## Website Acceptance Gate

The Website now rejects incomplete semantics.

A backend run fails if:

- `status: complete` but `model_status` is missing.
- `identification_summary` exists without model/prototype/fusion/transcript evidence.
- `model_outputs` lack model identity, runtime, artifact/checksum, label map, or training provenance.
- `deep_signal_matches` lack prototype identity, source/model/vector proof, and score/distance.
- `fusion_evidence` lacks model/prototype links.
- `sound_transcripts` lack evidence IDs.
- mock, generated, Gemini, metadata-derived, or filename-derived markers are present.

The Website readiness tier should become `Scientific classifier ready` only when:

- real audio loaded
- high-definition scope loaded
- registered model runtime live
- per-run model output present
- prototype/fingerprint match present
- fusion evidence present
- evidence-backed transcript present
- semantic contract clean

June 6 frontend scope-provenance update:

- The shared SINE player now exposes `data-sine-scope-source` and `data-sine-scope-source-label`.
- Possible values are `none`, `mindex-backend`, `analysis-payload`, `browser-real-audio`, and `unavailable`.
- `browser-real-audio` is acceptable as a temporary frontend fallback because it decodes the real audio stream in the browser.
- P0 backend visualisation acceptance should eventually show `mindex-backend` with high-definition waveform and spectrogram counts.
- If MINDEX returns weak preview data and the browser replaces it with a denser real-audio scope, that proves the frontend can visualize the file, but it does not prove backend visualisation is complete.

June 6 frontend architecture-explorer update:

- The shared SINE player now exposes the safe AI Studio model-explorer concept as evidence-bound DOM hooks.
- `data-sine-architecture-observed` / `data-sine-architecture-total` count architecture blocks that are at least observed from real visualisation, registry, prototype, detector, fusion, or transcript fields.
- `data-sine-architecture-evidence` counts blocks with per-run evidence, not just registered/planned model rows.
- `data-sine-recipe-evidence` / `data-sine-recipe-total` count P0 backend recipe stages proven by the selected run.
- `data-sine-model-targets-covered` / `data-sine-model-targets-total` count registered model target coverage.
- `data-sine-classifier-scope-covered` / `data-sine-classifier-scope-total` count requested sound-family coverage across water, air, and ground.
- `data-sine-selected-architecture` and `data-sine-selected-architecture-state` expose the currently inspected architecture block in the player.
- Cursor should use these hooks as frontend acceptance evidence after model deployment. Planned or requested rows are useful context, but only evidence rows should be treated as real acoustic intelligence.

June 6 frontend visualisation-contract update:

- The shared SINE player now requests both legacy and explicit P0 names:
  - `max_waveform_points=8192`
  - `max_time_frames=1024`
  - `max_frequency_bins=256`
  - `fft_size=2048`
  - `hop_length=128`
  - `window_function=hann`
  - `frequency_min_hz=0`
  - `frequency_max_hz=<source Nyquist clamp>`
  - `db_floor=-96`
  - `db_ceiling=0`
  - `include_peaks=true`
- The player also still sends legacy aliases such as `spectrogram_columns`, `spectrogram_rows`, `n_fft`, `f_min`, and `f_max` so older routes keep working during rollout.
- New DOM hooks expose backend visualisation proof:
  - `data-sine-visualisation-status`
  - `data-sine-scope-fft-size`
  - `data-sine-scope-hop-length`
  - `data-sine-scope-window-function`
  - `data-sine-scope-frequency-min-hz`
  - `data-sine-scope-frequency-max-hz`
  - `data-sine-scope-db-floor`
  - `data-sine-scope-db-ceiling`
  - `data-sine-scope-backend-peaks`
  - `data-sine-scope-backend-clamped`
- Acceptance still requires `data-sine-scope-source=mindex-backend` for backend visualisation. Browser-decoded scope is real file evidence, but it is a fallback until MINDEX returns oscilloscope-grade arrays.

## Completion Report Required From Cursor

Cursor must return all of this:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- files changed
- model artifact path
- model artifact SHA256
- label map path
- label map SHA256
- framework/runtime/device
- training dataset counts
- metrics path
- confusion matrix summary
- `GET /api/mindex/sine/status` summary
- `GET /api/mindex/sine/models` summary
- missing-model negative response summary
- short ESC-50 positive model response summary
- MBARI/hydrophone 30-second window response or queued job proof
- prototype catalog response summary
- per-run prototype match proof
- human correction round-trip proof
- Website `3010` smoke result
- known limits
- next model families needed

Do not call backend complete until this report exists and the Website evidence gate passes for at least one real short clip.

## Paste-Ready Cursor Prompt

```text
You are Cursor working in:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex

Morgan QA-tested SINE audio and confirmed that Run SINE analysis is not actually doing real acoustic AI analysis. Treat the current backend as an incomplete detector shell. HTTP 200 is not proof.

Read this master handoff first:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md

Then read:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md
D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md

Acoustic only. Do not touch chemistry, DNA, PubChem, DWSIM, Cantera, or unrelated MINDEX tabs.

First fix:
- stop the current analyze/classify endpoints from emitting semantic labels without real evidence
- if no model artifact is loaded, return model_status: model_unavailable
- keep detector/DSP rows only when derived from real audio
- do not return identification_summary, semantic deep_signal_matches, fusion_evidence, or sound_transcripts without model/prototype/fusion evidence

Then build P0 real SINE:
1. Resolve UUID-backed library.blob acoustic files.
2. Decode real NAS audio bytes.
3. Generate real high-definition waveform and spectrogram arrays.
4. Compute deterministic DSP features.
5. Add model registry tables and model status endpoints.
6. Train or load sine-esc50-resnetish-v1 in PyTorch, TorchScript, or ONNX.
7. Register artifact, checksum, label map, training config, metrics, and confusion matrix.
8. Run real windowed inference.
9. Persist analysis_run, detector_event, model_output, prototype_match, fusion_evidence, and sound_transcript rows.
10. Build prototype/fingerprint search with real embedding/vector proof.
11. Generate evidence-linked chronological sound transcripts only from model/prototype/fusion evidence.
12. Store human corrections beside model predictions and queue contested examples for training review.

Hard no:
- no mock labels
- no Gemini or LLM classifier
- no filename-derived or source-metadata-derived labels
- no generated waveform/spectrogram data
- no synthetic detector rows
- no fake sound_transcripts
- no bird/rotor-only taxonomy

Required proof:
- missing-model negative test returns model_unavailable and no semantic rows
- short ESC-50 clip returns model_outputs with model ID, runtime, artifact checksum, label map checksum, top labels, window bounds, and latency
- 30-second MBARI/hydrophone window completes or queues without whole-file timeout
- prototype catalog and per-run prototype matches have stable identity and vector proof
- human correction model=UAV, human=lightning stores both and marks contested
- Website on localhost:3010 can show Scientific classifier ready for one real short run

Return a completion report with commit hash, VM deploy status, migrations, model artifact/checksum, label map/checksum, metrics, exact API response summaries, tests run, known limits, and next model families.
```
