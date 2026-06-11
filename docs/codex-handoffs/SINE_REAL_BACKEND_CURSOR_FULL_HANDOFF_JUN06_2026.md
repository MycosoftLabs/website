# SINE Real Backend Cursor Full Handoff

Date: June 6, 2026

Prepared by: Codex

Target backend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Website repo for frontend contract:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

Frontend merge audit:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_FRONTEND_MERGE_AUDIT_JUN06_2026.md`

MINDEX-local current-code audit:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

Primary local QA surfaces:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

MINDEX VM:

- API: `http://192.168.0.189:8000`
- NAS acoustic root on VM: `/mnt/nas/mindex/Library/acoustic`
- NAS models root recommendation: `/mnt/nas/mindex/models/acoustic`
- Windows NAS reference: `\\192.168.0.105`

Do not store raw secrets in docs. Use existing env file locations and env var names only.

## One Sentence Directive

Morgan QA-tested SINE and confirmed that `Run SINE analysis` is not doing real acoustic AI. Cursor must rebuild the MINDEX SINE backend so analysis uses real audio bytes, real PyTorch/TorchScript/ONNX model inference, real embeddings/prototypes, real evidence fusion, and evidence-linked sound transcripts.

## June 6 Continuation - Current Source Recheck

Codex rechecked the current Website, MINDEX, AI Studio prototype, and ChatGPT spec sources in this workspace before this handoff update. The important current truth is:

- The Website frontend now demands an evidence contract and can show real audio visualizations from browser-decoded WAV bytes, but this does not prove backend analysis.
- The MINDEX backend still contains detector-to-identity promotion:
  - `mindex_api/services/sine_acoustic/event_views.py` hard-codes `model: "mindex_sine_v1"` and promotes detector/deep-signal rows into `identification_summary`.
  - `mindex_api/services/sine_acoustic/bird.py` emits `bird_likely`.
  - `mindex_api/services/sine_acoustic/uav.py` emits `uav_rotor_likely` / `uav_rotor_possible`.
  - `mindex_api/services/sine_acoustic/deep_signal.py` emits `spectral_embedding`.
  - `tests/test_acoustic_event_views.py` still asserts that `bird_likely` becomes the top label.
- The AI Studio prototype at `MINDEX/mindex/sine-acoustic-classifier` is explicitly not production backend code:
  - `server.ts` imports `GoogleGenAI`, uses `GEMINI_API_KEY`, imports `mockAcousticBlobs`, generates WAV bytes with `generateWavBuffer()`, and generates semantic transcripts from metadata or deterministic fallback logic.
  - `README.md` requires a Gemini key.
  - `src/types.ts` defines a useful response shape, but it does not prove any backend model/runtime exists.
  - `src/components/AcousticPlayer.tsx` provides useful UI ideas: a combined canvas, playhead/hover scrubbing, transcript rows, and high-contrast hydrophone styling.
- The ChatGPT spec attachment is useful as a schema and architecture brief. Normalize its generic `POST /api/classify` idea into the existing MINDEX routes:
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/mindex/library/blobs/{id}/classify`
  - `GET /api/mindex/sine/blobs/{id}/analysis`
  - `GET /api/mindex/sine/blobs/{id}/visualisation`
  - `GET /api/mindex/sine/models`
  - `GET /api/mindex/sine/prototypes`

The first backend task is still an honesty patch. A detector-only response can be useful signal evidence, but it must not call itself classified acoustic meaning.

## What Real AI Means For SINE

Cursor should treat "real SINE analysis" as a chain of independently auditable evidence, not a single label string.

Minimum real-analysis chain:

1. `library.blob` identity resolves to a UUID-backed acoustic file and actual NAS bytes.
2. Decoder loads the requested clip or bounded window from real audio bytes and records sample rate, channels, duration, codec, byte range, and decode errors.
3. DSP layer computes real numeric features from those samples:
   - waveform/envelope
   - STFT/spectrogram/log-mel or PCEN
   - FFT peaks
   - RMS/energy/activity
   - centroid/rolloff/bandwidth/ZCR
   - impulse, sweep, harmonic/rotor, and low-frequency ground candidates
4. Model registry proves which model artifacts exist:
   - model ID/version/name
   - framework and runtime
   - artifact path and checksum
   - label map path and checksum
   - training dataset manifest and metrics path
   - runtime device and last load/inference result
5. Inference runtime loads the artifact and returns model outputs over a declared window.
6. Embedding/prototype path returns a vector with declared dimension and checksum, then nearest prototypes with stable prototype IDs, source/license, model ID, score/distance, and OOD distance.
7. Fusion links DSP events, model outputs, prototypes, and human correction state into semantic evidence.
8. `sound_transcripts` are generated only from linked evidence IDs and exact time windows.
9. Human corrections persist beside model outputs. They never silently overwrite the model result; disagreements become contested training-review rows.

If any stage from 4 through 8 is missing, the backend must be honest:

```json
{
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
  "deep_signal_matches": [],
  "prototype_matches": [],
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

## AI Studio Merge Guidance

Merge only safe UI and product ideas from the AI Studio prototype:

- high-contrast cyan/black hydrophone visual language
- combined waveform/spectrogram playhead canvas
- live transcript panel, but only when transcripts are evidence-linked
- chronological event rows with click-to-seek behavior
- architecture/status panels that explain models only when the registry proves them
- model/prototype explorer concepts

Do not merge these backend behaviors:

- Gemini as classifier
- metadata prompt classifier
- mock catalog rows
- generated WAV streams
- synthetic waveform or spectrogram matrices
- hard-coded engine names like `SINE-Embed-v1` without model registry proof
- claims of `CRNN`, `ResNet`, `FP16`, `CUDA`, or calibration without a loaded artifact and verification output

## P0 Implementation Order For Cursor

Use this exact order so the product becomes more true at every step:

1. **Honesty patch**
   - Change `event_views.py` and tests so detector-only output returns `model_status: "model_unavailable"` or `"detector_only"`.
   - Remove fake `identification_summary`, fake `model: "mindex_sine_v1"`, semantic `deep_signal_matches`, and fake transcript/fusion rows when no model/prototype evidence exists.
   - Preserve non-semantic DSP detector rows.
2. **Visualisation patch**
   - Make `visualisation.py` decode real NAS audio bytes and honor oscilloscope params.
   - Return 8,192 waveform points and 256 x 1,024 spectrogram data for short clips unless the request asks for less.
   - Include FFT/hop/window/channel/frequency/dB/clamp/peak metadata.
3. **Model registry patch**
   - Add `sine.model_artifact`, `sine.label_map`, and model load/status endpoints.
   - Do not report `model_ready` until checksum validation and runtime load pass.
4. **P0 model patch**
   - Train or load `sine-esc50-resnetish-v1` on real ESC-50/NAS registered data.
   - Export TorchScript or ONNX.
   - Save artifact, label map, metrics, confusion matrix, and checksums under `/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/`.
5. **Inference runner patch**
   - Add windowed inference to `analysis_runner.py`.
   - Persist `analysis_run`, `model_output`, detector rows, and diagnostics.
6. **Prototype patch**
   - Add embeddings and prototype catalog with vector checksums.
   - Return `deep_signal_matches` only as real prototype/nearest-neighbor rows.
7. **Fusion/transcript patch**
   - Add fusion rows linking model/prototype/DSP IDs.
   - Add chronological transcripts only with evidence links.
8. **Human correction patch**
   - Persist human label, confidence, reason, analyst/user/source, model disagreement, and review status.
   - Add review/training queue state.
9. **Navy/Psathyrella operational patch**
   - Add bounded 30-second hydrophone/MBARI/Psathyrella window analysis.
   - Add overlapping long-file jobs, queue/polling, and OOD/unknown reporting.

Every patch should include tests that prove the new behavior and fail on the current fake path.

## Supabase / MAS / Website Boundary

This handoff is MINDEX-backend first. Do not route SINE classification through MAS and do not put acoustic classifier secrets in the Website frontend.

- Website BFF remains a proxy/evidence gate to MINDEX 189.
- MAS/MYCA can later read SINE evidence, human corrections, and training-review rows, but MYCA must not fabricate labels when MINDEX says unknown or model unavailable.
- Supabase-backed MycoForge/device inventory is not part of this acoustic classifier P0 unless a Cursor backend task explicitly needs to mirror SINE human-review data there. If Supabase is used later, enforce RLS, never expose service-role keys, and keep model artifacts on NAS/MINDEX storage, not public client storage.

## Latest QA Directive For Cursor

Morgan manually tested the player after the frontend and NAS/library work. The current `Run SINE analysis` path is still not real analysis. It may return rows, lanes, labels, and HTTP 200, but it does not prove that a real AI model listened to the file, understood patterns inside the audio, and produced labels from model-backed evidence.

Cursor should treat the current backend as an incomplete detector shell. The required rebuild must include actual acoustic intelligence:

- real audio decoding from NAS-backed `library.blob` files
- conventional signal processing and pattern detection from real samples
- PyTorch model training or loading
- deployed PyTorch, TorchScript, or ONNX Runtime inference
- CNN/ResNetish baseline classification for P0
- CRNN/GRU temporal modeling for repeated and evolving events
- transformer-class acoustic embedding or semantic model path for broader classes when licensing/runtime are clear
- 512D or otherwise declared embeddings with vector checksums
- prototype/fingerprint retrieval with stable prototype IDs and cosine or declared distance metrics
- fusion of DSP, model, prototype, and human-correction evidence
- chronological sound transcripts that describe what is inside the recording only when each transcript row links to evidence IDs

The backend must identify and classify what these files mean: animals, insects, marine life, vessels, propellers, UAVs, weather, lightning, explosions, impacts, seismic/ground signals, machinery, unknown/OOD, and other water/air/ground acoustic categories. A frontend lane called `bird` or `rotor` is not enough. SINE needs a real acoustic classifier and pattern-recognition system.

The Website now sends explicit granular `sound_targets` in the `sine_request`, in addition to broad domains and class families. MINDEX must persist these on the analysis run and use them to drive model heads, prototype families, OOD handling, and training-review labels:

```text
whale_vocalization
dolphin_clicks_whistles
fish_chorus
bird_call_song
mammal_call
amphibian_call
insect_stridulation
soil_bioacoustics
hydrophone_biologic_unknown
uav_quadcopter_rotor
helicopter_rotor
fixed_wing_aircraft
air_drone_propeller
boat_propeller
submerged_propeller
vessel_engine_hum
submarine_mechanical_hum
sonar_ping
machinery_motor
actuator_servo_stepper
explosion_impulse
gunshot_or_blast
impact_pressure_spike
lightning_thunder
rain_wind_weather
earthquake_seismic
ground_surface_vibration
underground_soil_motion
water_pressure_impulse
unknown_out_of_domain
human_contested_label
```

Do not treat this list as solved because a detector can emit one heuristic row. Each target needs either real model coverage, prototype/fingerprint coverage, or an honest missing/unknown/OOD state.

Cursor must make the backend honest before adding models. If no real model is loaded, `Run SINE analysis` must return `model_status: "model_unavailable"` and non-semantic DSP evidence only. It must not return fake `bird_likely`, `uav_rotor_likely`, `whale`, `lightning`, or transcript claims from heuristics, filenames, source metadata, Gemini, MYCA, or any LLM.

## Current Product Truth

The frontend and BFF can load real acoustic files from MINDEX/NAS. The current backend can return HTTP 200 and detector-looking rows, but it is not a real classifier yet.

Latest frontend verification after Codex's compact embed patch:

- `http://localhost:3010/sensing/sine/player` loads real ESC-50 acoustic rows, selects blob `6a8492b5-0796-43b3-be42-1ccd753f5d12`, streams the WAV, and builds a browser-real-audio 8,192-point waveform plus 256 x 1,024 spectrogram.
- `http://localhost:3010/sensing/sine` uses the same shared player and the same evidence gate.
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic now mounts the compact shared player and loads 80 real acoustic rows after local-dev auth, instead of a blank compact shell.
- The Website still marks the current MINDEX response as `MINDEX contract failed` / `Semantic contract violation` because MINDEX does not return real model/prototype/fusion/transcript evidence.

Website contract status as of this handoff:

- `POST /api/mindex/sine/blobs/{id}/analyze` and `POST /api/natureos/mindex/library/classify?id={id}` send an evidence contract and a `sine_request` requiring real audio, explicit `model_status`, model/prototype/fusion/transcript proof, no semantic fallback, no LLM fallback, water/air/ground target domains, and detector-only output only when clearly labeled.
- The `sine_request` now includes granular `sound_targets` so MINDEX cannot shrink the classifier to only bird/rotor lanes.
- `GET /api/mindex/sine/blobs/{id}/analysis` forwards the same evidence query flags so saved/current runs are read under the no-fallback contract.
- If MINDEX returns 404 for a blob with no saved run, the Website normalizes that to `status: analysis_not_found`, `model_status: not_run`, empty evidence arrays, and `upstream_status: 404`. This is a normal pre-run state, not proof of a classifier failure.
- `GET /api/mindex/sine/blobs/{id}/visualisation` now sends oscilloscope-grade defaults if the browser omits them: `max_waveform_points=8192`, `max_time_frames=1024`, `max_frequency_bins=256`, `fft_size=2048`, `hop_length=128`, `window_function=hann`, `include_waveform=true`, `include_spectrogram=true`, and `include_peaks=true`.
- The Website visualisation proxy also sends compatibility aliases for the current MINDEX code path: `waveform_points=8192`, `spec_time_bins=1024`, `spec_freq_bins=256`, `n_fft=2048`, `quality=oscilloscope`, and `ignore_saved_visualisation=true`.
- `GET /api/mindex/sine/models` and `GET /api/mindex/sine/prototypes` are already proxied by the Website and return structured unavailable states until MINDEX exposes real registry/catalog endpoints.
- If MINDEX is unreachable, the Website now reports structured unavailable states such as `sine_analysis_unavailable` / `model_unavailable`. It should never make up labels to fill the gap.

Current failed behavior includes:

- semantic labels such as `bird_likely`, `uav_rotor_likely`, `avian_or_insect_band`, or `spectral_embedding` without model evidence
- `identification_summary` claiming `classified` with no real model artifact loaded
- no required `model_status`
- zero `model_outputs`
- zero `fusion_evidence`
- zero evidence-linked `sound_transcripts`
- prototype/deep-signal rows without stable prototype identity, embedding proof, model proof, vector checksum, or source provenance

The website now intentionally marks this state as:

- `MINDEX contract failed`
- `Semantic contract violation`
- `Unverified backend matches`

Do not ask Codex to hide this. Fix MINDEX.

## Latest Concrete Failure Evidence

Codex re-tested through the Website BFF with a real ESC-50 audio blob.

Blob:

`6a8492b5-0796-43b3-be42-1ccd753f5d12`

File:

`acoustic/esc50/1-100038-A-14.wav`

Library proof:

- `GET /api/natureos/mindex/library?category=acoustic&limit=20` returns acoustic rows.
- SINE status reports about `2180` acoustic blobs.
- The browser can stream and decode the selected WAV.

Visualisation failure:

- frontend asked for 8,192 waveform points
- frontend asked for 1,024 time frames x 256 frequency bins
- frontend asked for `fft_size=2048`, `hop_length=128`, `window_function=hann`, dB floor/ceiling, and peaks
- frontend now also sends old MINDEX param aliases `waveform_points=8192`, `spec_time_bins=1024`, `spec_freq_bins=256`, and `ignore_saved_visualisation=true`
- backend returned only 800 waveform points and a 64 x 44 spectrogram
- backend omitted FFT, hop, window, channel, frequency bound, dB bound, clamp, and peak metadata

Analysis failure:

```json
{
  "status": 200,
  "payload_status": "complete",
  "model_status": null,
  "identification_summary": {
    "top_label": "bird_likely",
    "confidence": 1,
    "engine": "bird_microsoft",
    "model": "mindex_sine_v1",
    "status": "classified"
  },
  "model_outputs": 0,
  "fusion_evidence": 0,
  "sound_transcripts": 0,
  "deep_signal_matches": 1,
  "frequency_detections": 12,
  "activity_segments": 1,
  "bird_detections": 1,
  "uav_detections": 1
}
```

This is the exact backend bug. Detector evidence is allowed. Semantic meaning is not allowed unless backed by model/prototype/fusion evidence.

June 6 stricter-contract retest:

- Website sent `require_explicit_model_status`, model artifact/checksum requirements, prototype identity requirements, vector checksum requirements, fusion-link requirements, and transcript evidence-link requirements.
- Backend still returned `model_status: null`.
- Backend still returned `identification_summary.top_label: "bird_likely"` with `status: "classified"`.
- The returned `deep_signal_matches` row was still not a real prototype match. It had label `spectral_embedding`, model text `dimastatz/deep-signal`, and a 20-value numeric embedding inside metadata, but no `prototype_id`, no `embedding_id`, no `vector_checksum`, no registered model artifact, no label map, and no distance/source proof.
- `model_outputs`, `fusion_evidence`, and `sound_transcripts` did not contain usable evidence rows in the inspected response.

Cursor should treat this as a stronger confirmation that the backend is still detector/embedding-shell output, not a real classifier.

## Current MINDEX Source Code Audit - Fix These First

Codex inspected the current MINDEX backend source after Morgan's QA. These files are the immediate cause of the false "analysis complete / classified" state.

Target repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Continuation source recheck:

- Codex re-read the current MINDEX source after the latest Website compact-player fix.
- The fake semantic path is still present in source:
  - `event_views.py` still hard-codes `model: "mindex_sine_v1"` and promotes detector/deep-signal rows into top-level identity.
  - `pipeline.py` still runs only detector modules and `visualisation_sonic`.
  - `bird.py`, `uav.py`, and `deep_signal.py` still emit `bird_likely`, `uav_rotor_likely` / `uav_rotor_possible`, and `spectral_embedding`.
  - `tests/test_acoustic_event_views.py` still asserts that `bird_likely` becomes the top label.
- First backend patch must be the honesty patch: detector rows can remain, but detector-only runs must return `model_status: "model_unavailable"` or `model_status: "detector_only"` with no semantic `identification_summary`, no semantic `deep_signal_matches`, no `fusion_evidence`, and no `sound_transcripts`.

### 1. `mindex_api/services/sine_acoustic/event_views.py`

Current problem:

- `build_identification_summary()` picks top labels from `bird_detections`, `uav_detections`, `nps_detections`, and `deep_signal_matches`.
- It marks the payload as `status: "classified"` whenever candidates or frequency rows exist.
- It hard-codes `model: "mindex_sine_v1"` even when no model artifact exists and no model inference ran.
- `build_library_classification_payload()` always includes `identification_summary`, `identification_status`, `pattern_matches`, and `sine_matches`.

Required fix:

- Stop promoting detector events into semantic identification.
- Add a proof gate before any semantic `identification_summary` is returned.
- If no real model/prototype/fusion evidence exists, return `model_status: "model_unavailable"` or `model_status: "detector_only"` and omit `identification_summary`.
- Keep raw detector rows available as detector evidence, but label them as detector evidence only.
- Remove the fake `mindex_sine_v1` model string unless it comes from a real `sine.model_artifact` row and runtime load proof.

### 2. `mindex_api/services/sine_acoustic/pipeline.py`

Current problem:

- `run_full_analysis()` only dispatches detector modules:
  - `frequency_fft`
  - `activity_auditok`
  - `bird_microsoft`
  - `uav_rotor`
  - `nps_discovery_match`
  - `deep_signal_features`
  - `visualisation_sonic`
- It does not call a PyTorch, TorchScript, ONNX, transformer, embedding-prototype, or fusion runtime.
- It does not accept `start_sec`, `end_sec`, model requirements, target domains, class families, requested outputs, or an evidence contract.

Required fix:

- Split the detector shell from a real `analysis_runner.py`.
- Add explicit missing-model behavior.
- Add windowed audio decode support for `start_sec` and `end_sec`.
- Add a real model inference branch only when a registered model artifact is loaded and checksum-validated.
- Persist detector events separately from model outputs.

### 3. `mindex_api/services/sine_acoustic/deep_signal.py`

Current problem:

- `extract_pattern_embedding()` returns a 20-value mean spectral profile as a row labeled `spectral_embedding`.
- Metadata says `upstream: "dimastatz/deep-signal"`, but this is not a real DeepSignal neural embedding, not 512D, not model-backed, and not tied to a prototype catalog.
- The row is then treated by `event_views.py` as a `deep_signal_match`.

Required fix:

- Do not return `deep_signal_matches` unless the row is a real prototype/fingerprint match with:
  - `prototype_id`
  - `embedding_id`
  - `model_id`
  - `model_version`
  - `embedding_dim`
  - `vector_sha256` or `embedding_sha256`
  - `score` and/or `distance`
  - `source_dataset`
  - `start_sec` and `end_sec`
- Rename the current 20-band vector output to non-semantic DSP/debug evidence if it remains at all.

### 4. `mindex_api/services/sine_acoustic/bird.py` and `uav.py`

Current problem:

- `bird.py` uses heuristic scoring and emits labels like `bird_likely`.
- `uav.py` uses heuristic harmonic logic and emits labels like `uav_rotor_likely` or `uav_rotor_possible`.
- These can be useful detector lanes, but they are not model-backed classifications.

Required fix:

- Keep them only as detector evidence.
- Do not allow them to become top-level semantic identity or transcript content without model/prototype/fusion evidence.
- Add explicit metadata such as `evidence_kind: "detector"` and `semantic_role: "non_semantic_signal_evidence"`.

### 5. `mindex_api/services/sine_acoustic/visualisation.py`

Current problem:

- Defaults are `waveform_points=800`, `spec_time_bins=128`, and `spec_freq_bins=64`.
- The current test response returned a 64 x 44 spectrogram despite the Website requesting an oscilloscope-grade view.
- The output omits `visualisation_status`, `fft_size`, `hop_length`, `window_function`, channel metadata, frequency bounds, dB bounds, clamp metadata, and peak rows.

Required fix:

- Honor query params from `GET /api/mindex/sine/blobs/{id}/visualisation`.
- Support at least 8,192 waveform/envelope points and 1,024 x 256 spectrogram cells for ordinary short clips.
- Return explicit FFT/STFT metadata and channel/window metadata.
- Return `visualisation_status: "ready" | "clamped" | "queued" | "failed"`.
- Return `peaks[]` from real decoded audio.

### 6. `mindex_api/routers/sine_acoustic.py`

Current problem:

- `/status` returns detector counts and blob counts, but no real model registry/readiness truth.
- `POST /blobs/{id}/analyze` only accepts `detectors` as a query param.
- It ignores the Website evidence contract:
  - `require_real_audio`
  - `require_model_evidence`
  - `semantic_fallback=false`
  - `llm_fallback=false`
  - `prototype_matching=true`
  - `sound_transcripts=evidence_backed_only`
  - explicit `model_status`
  - requested outputs
- It stores rows in `library.analysis_run` and `library.detection_event`, but not in a real SINE model-output/prototype/fusion schema.
- `GET /blobs/{id}/analysis` returns only the latest whole-file run. It does not support `start_sec`, `end_sec`, `job_id`, or `analysis_run_id`.
- `GET /blobs/{id}/visualisation` ignores requested quality params and appears to reuse stale low-resolution saved visualisation when present. Codex verified that even with both old and new query names through the Website BFF, MINDEX still returned 800 waveform points and a 64 x 44 spectrogram.

Required fix:

- Add or update routes:
  - `GET /api/mindex/sine/models`
  - `GET /api/mindex/sine/models/{model_id}`
  - `GET /api/mindex/sine/prototypes`
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `GET /api/mindex/sine/blobs/{id}/analysis`
  - `GET /api/mindex/sine/blobs/{id}/visualisation`
- Accept JSON request bodies and query params for evidence contract, window bounds, target domains, class families, and requested outputs.
- Return model registry status from `/status`.
- Return honest `model_unavailable` when no model artifact is loaded.
- Support queued/windowed runs for large MBARI/hydrophone/Psathyrella files.

### 7. Current tests currently bless the bad behavior

Current problem:

- `tests/test_acoustic_event_views.py` has `test_build_identification_summary_picks_top_bird()` and asserts `top_label == "bird_likely"`.
- `tests/test_build_library_classification_payload_keys()` accepts `identification_summary.status` as `classified` or `pending`.
- `tests/test_sine_acoustic_pipeline.py` only proves detector and visualisation modules run.

Required fix:

- Rewrite these tests before or alongside backend changes.
- Add a negative test that runs with no registered model artifact and proves:
  - `model_status == "model_unavailable"`
  - no top-level semantic `identification_summary`
  - no semantic `deep_signal_matches`
  - empty `model_outputs`
  - empty `fusion_evidence`
  - empty `sound_transcripts`
  - detector rows can still be present as detector evidence
  - `semantic_fallback_used == false`
  - `llm_fallback_used == false`
  - `filename_fallback_used == false`
  - `metadata_fallback_used == false`

### Immediate Cursor Order Of Operations

1. Make the backend honest by gating/removing semantic outputs from detector-only runs.
2. Update tests so the old `bird_likely` top-label behavior fails.
3. Add the `sine` schema and model/prototype/fusion tables.
4. Add real audio window decoding and oscilloscope-grade visualisation.
5. Add model registry and missing-model route behavior.
6. Train/load one real ESC-50 P0 PyTorch/TorchScript/ONNX model and register artifact/checksum/label-map proof.
7. Add prototype search, evidence fusion, evidence-linked transcripts, and human correction review queue.
8. Verify through `localhost:3010` that a real short run clears the Website evidence gate.

## Absolute Non-Negotiables

- No mock labels.
- No generated/synthetic audio rows.
- No Gemini, LLM, MYCA, filename, path, metadata, or source-name classifier.
- No transcript prose unless each row links to real evidence IDs.
- No model readiness claims unless a model artifact is registered, checksum-validated, loaded, and used.
- No semantic `identification_summary` when no real model/prototype/fusion evidence exists.
- If a model is not available, return `model_status: "model_unavailable"` and useful non-semantic DSP evidence only.
- Human corrections must persist beside model predictions. They must not overwrite model output.
- Human/model disagreement must be marked contested and queued for review/training.
- Long files must use bounded windows or queued jobs, never a silent full-file timeout.

## Operational Stakes

This is not an ESC-50 demo. SINE is part of the Mycosoft acoustic intelligence stack for:

- SINE acoustic library and classifier
- hydrophone and marine sound work
- Navy-facing acoustic work
- Psathyrella buoy recordings and future rolling buffers
- water, air, and ground acoustic classification
- Nature Learning Model training/library workflows

For operational work, an honest `unknown`, `out_of_domain`, or `model_unavailable` result is better than a fake confident label.

## Required Sound Domains

Do not keep the classifier limited to birds and UAVs. SINE needs broad categories for water, air, and ground.

Water-domain families:

- marine life, including whales, dolphins, fish, seals, crustaceans, and bioacoustic calls
- vessel, propeller, cavitation, hull, engine, pump, and sonar-like signatures
- mechanical or infrastructure noise
- impulse, explosion, impact, pressure shock, and seismic water coupling
- weather, wave state, rain, thunder, lightning, and storm activity
- acoustic ping, comms, test tone, and instrument signal
- unknown and out-of-domain

Air-domain families:

- animal vocalization
- bird
- insect
- amphibian or other terrestrial bioacoustic signal
- UAV, quadcopter, drone, helicopter, propeller, and aircraft
- machinery, engine, fan, compressor, pump, or site activity
- explosion, impact, gunshot-like impulse, and other impulse events
- weather, wind, rain, thunder, and lightning
- human/site activity when appropriate
- unknown and out-of-domain

Ground-domain families:

- seismic or earthquake signal
- soil or underground acoustic activity
- surface vibration
- motor, actuator, servo, stepper, robot leg, propeller, or mechanical movement
- infrastructure rumble
- impact, impulse, digging, or drilling
- unknown and out-of-domain

## Required Backend Architecture

Implement the SINE backend as a layered pipeline. Each layer must be separately testable and persist useful evidence.

### Layer 0: Audio Frame Decoder

Must:

- resolve a real `library.blob` UUID
- read real NAS-backed audio bytes
- support WAV first, then FLAC/MP3/other codecs when safe
- decode channels, sample rate, duration, codec, byte size, content hash
- downmix or preserve channel data with explicit metadata
- resample to the model sample rate with a named method
- normalize amplitude to float32 without hiding clipping
- return clear errors for missing file, unsupported codec, corrupt audio, or NAS read failure

Recommended files:

```text
mindex_api/services/sine_acoustic/audio_decode.py
mindex_api/services/sine_acoustic/windows.py
mindex_api/services/sine_acoustic/errors.py
```

### Layer 1: Deterministic DSP Evidence

These are physical signal features, not semantic labels.

Must compute from real decoded samples:

- waveform envelope and per-channel waveform
- STFT
- log-mel
- PCEN or comparable robust normalization
- FFT peak frequencies
- centroid
- rolloff
- bandwidth
- RMS
- zero crossing rate
- spectral contrast
- MFCC baseline features
- activity/energy segments
- impulse/shock candidates
- harmonic/rotor candidates
- sweep/chirp candidates
- low-frequency ground/seismic candidates

Detector rows may say things like `peak_frequency`, `activity_segment`, `rotor_harmonic_candidate`, or `impulse_candidate`. They must not say `bird`, `whale`, `UAV`, `lightning`, or other semantic classes unless linked to model/prototype/fusion evidence.

Recommended files:

```text
mindex_api/services/sine_acoustic/dsp_features.py
mindex_api/services/sine_acoustic/detectors.py
mindex_api/services/sine_acoustic/visualisation.py
```

### Layer 2: Neural Runtime

Must support real model inference through one or more of:

- PyTorch eager for development/training
- TorchScript for deployed CPU/GPU inference
- ONNX Runtime for deployed CPU/GPU inference

Minimum model evidence per inference:

- `model_id`
- `model_name`
- `model_version`
- `framework`
- `runtime`
- `device`
- `artifact_uri`
- `artifact_sha256`
- `label_map_uri`
- `label_map_sha256`
- `training_dataset`
- `sample_rate_model`
- `window_start_sec`
- `window_end_sec`
- `latency_ms`
- `top_labels`
- `ood_score`
- `calibration_version` if confidence is calibrated

Recommended files:

```text
mindex_api/services/sine_acoustic/model_registry.py
mindex_api/services/sine_acoustic/inference_runtime.py
mindex_api/services/sine_acoustic/model_outputs.py
```

### Layer 2A: P0 Model

Build the first real proof model:

`sine-esc50-resnetish-v1`

Purpose:

- prove real training/loading/inference on the existing ESC-50 corpus
- produce real model outputs with artifact/checksum/label-map proof
- give the Website one selected clip that can clear the model-evidence gate

Recommended approach:

- train a small PyTorch CNN/ResNetish classifier on log-mel features
- use ESC-50 folds correctly
- export TorchScript or ONNX
- register the artifact in Postgres
- store artifact and metrics on NAS
- expose model status and inference proof through API

P0 is not enough for full SINE, but it is enough to prove the backend is real.

### Layer 2B: P1/P2 Models

After P0, add:

- CRNN/GRU temporal model for repeated/evolving events
- transformer or AST/BEATs/PANNs/CLAP-like embedding model for broader acoustic semantics
- domain heads for water, air, and ground
- OOD/unknown handling
- calibration and thresholding
- per-domain class-family registries

Do not claim any of these are live until an artifact is registered and runtime-validated.

### Layer 3: Embeddings And Prototype Retrieval

SINE must have a prototype/fingerprint path, not only closed-set classification.

Required:

- produce a 512D or explicitly declared embedding from a real model
- persist embedding vectors or vector checksums
- build a prototype catalog from labeled examples
- compare by cosine similarity or another declared distance
- return matches with stable prototype identity and evidence

Required `deep_signal_matches[]` fields:

```json
{
  "prototype_id": "uuid-or-stable-key",
  "embedding_id": "uuid-or-stable-key",
  "model_id": "sine-esc50-resnetish-v1",
  "model_version": "2026.06.06",
  "embedding_dim": 512,
  "embedding_sha256": "sha256...",
  "label": "human-readable label",
  "source": "dataset/source/prototype collection",
  "score": 0.91,
  "distance": 0.09,
  "segment_start": 0.0,
  "segment_end": 5.0,
  "evidence_id": "uuid"
}
```

A label plus score is not enough.

### Layer 4: Evidence Fusion

Fusion combines:

- deterministic detector events
- model outputs
- prototype matches
- human annotations when used as context

Fusion must output:

- which evidence rows supported the result
- score/weight per evidence type
- disagreement or low confidence state
- OOD/unknown result when needed

Do not generate fusion rows from prose, filenames, or UI assumptions.

### Layer 5: Sound Transcript Narrator

Sound transcripts are not speech transcription. They are chronological descriptions of physical acoustic events.

Each transcript row must include:

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
- `detector_event_ids`

Allowed example when evidence exists:

```json
{
  "start_sec": 3.5,
  "end_sec": 7.0,
  "label": "Complex modulated sweep",
  "description": "Rising harmonic sweep with strongest energy between 250 and 750 Hz.",
  "sound_source": "candidate marine vocalization",
  "confidence": 0.72,
  "frequency_range": "250 Hz - 750 Hz",
  "model_output_ids": ["..."],
  "fusion_evidence_ids": ["..."],
  "prototype_ids": ["..."],
  "detector_event_ids": ["..."]
}
```

If there is no evidence, return no transcript row.

## API Contracts

### `POST /api/mindex/sine/blobs/{id}/analyze`

Must accept:

- `require_real_audio=true`
- `require_model_evidence=true`
- `allow_detector_only=true`
- `semantic_fallback=false`
- `llm_fallback=false`
- `prototype_matching=true`
- `sound_transcripts=evidence_backed_only`
- optional `start_sec`
- optional `end_sec`
- optional `windowed=true`
- optional `window_sec=30`
- optional `overlap_sec`

Must return one of:

- `model_status: "model_ready"` with real evidence arrays
- `model_status: "model_unavailable"` with no semantic output
- `status: "queued"` for long jobs
- `status: "failed"` with actionable diagnostics

Missing-model response must look like:

```json
{
  "ok": true,
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_summary": null,
  "frequency_detections": [],
  "activity_segments": [],
  "detector_events": [],
  "model_outputs": [],
  "deep_signal_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "semantic_fallback_used": false,
    "real_audio_decoded": true
  }
}
```

### `GET /api/mindex/sine/blobs/{id}/analysis`

Must accept:

- `analysis_run_id`
- `job_id`
- `start_sec`
- `end_sec`
- `window_index`
- `window_source`

Must return the requested run/window, not an unrelated latest whole-file result.

If no run exists yet, return an honest no-run state rather than a semantic guess:

```json
{
  "status": "analysis_not_found",
  "model_status": "not_run",
  "detector_events": [],
  "model_outputs": [],
  "fusion_evidence": [],
  "deep_signal_matches": [],
  "sound_transcripts": []
}
```

### `GET /api/mindex/sine/blobs/{id}/visualisation`

Must honor for short clips:

- `max_waveform_points=8192`
- `max_time_frames=1024`
- `max_frequency_bins=256`
- `fft_size=2048`
- `hop_length=128`
- `window_function=hann`
- `include_peaks=true`
- `db_floor=-96`
- `db_ceiling=0`
- `quality=oscilloscope`

Must return:

- decoded waveform arrays
- spectrogram arrays
- time axis
- frequency axis
- FFT size
- hop length
- window function
- sample rate
- duration
- channels
- dB bounds
- normalization method
- peak rows
- `visualisation_status: "ready" | "clamped" | "queued" | "failed"`
- clamp/queue metadata when used

### `GET /api/mindex/sine/status`

Must include honest status:

- acoustic blob counts
- detector count
- model registry count
- loaded model count
- runtime/device
- last successful inference
- unavailable/missing model reasons
- backend commit
- feature flags for water/air/ground

Do not report model readiness from static config alone.

### `GET /api/mindex/sine/models`

Must return actual registered model artifacts or an honest empty state.

Required model row fields:

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
- `metrics_uri`
- `confusion_matrix_uri`
- `embedding_dim`
- `window_sec`
- `sample_rate`
- `n_mels`
- `status`
- `loaded`
- `device`
- `last_loaded_at`
- `last_inference_at`

### `GET /api/mindex/sine/prototypes`

Must return real prototype catalog rows or an honest empty state.

Required prototype row fields:

- `prototype_id`
- `label`
- `domain`
- `class_family`
- `source_dataset`
- `source_blob_id`
- `model_id`
- `embedding_dim`
- `embedding_sha256`
- `centroid_method`
- `sample_count`
- `created_at`

## Database Requirements

Add or update migrations for a `sine` schema.

Required tables:

```text
sine.model_artifact
sine.model_label_map
sine.analysis_run
sine.detector_event
sine.model_output
sine.embedding
sine.prototype
sine.prototype_match
sine.fusion_evidence
sine.sound_transcript
sine.human_identification
sine.training_review_queue
sine.analysis_job
```

If existing `library.acoustic_human_identification` and `library.acoustic_wave_annotation` tables already exist, keep them and bridge them to `sine.human_identification` or document the relationship clearly.

## Training And Model Artifact Layout

Recommended NAS layout:

```text
/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/
  model.pt
  model.onnx
  labels.json
  training_config.json
  metrics.json
  confusion_matrix.json
  confusion_matrix.png
  calibration.json
  feature_config.json
  README.md
```

Every artifact must have SHA256 recorded in DB.

Recommended training jobs:

```text
mindex_etl/jobs/train_sine_esc50_p0.py
mindex_etl/jobs/build_sine_prototypes_p0.py
mindex_etl/jobs/evaluate_sine_model.py
```

Recommended training modules:

```text
mindex_etl/sine/datasets.py
mindex_etl/sine/features.py
mindex_etl/sine/models.py
mindex_etl/sine/export.py
mindex_etl/sine/evaluate.py
```

P0 must at least train or load one real ESC-50 model. P1/P2 can add marine, SINE, buoy, and transformer models later.

## Human Correction And Active Learning

The SINE player now needs a backend loop where Morgan can correct an identification.

Example: model says `UAV`; Morgan knows it is `lightning`.

Required behavior:

- save human label with blob ID and optional selected time region
- save human confidence and notes
- preserve original model prediction
- mark disagreement as `contested`
- enqueue a row for training/prototype review
- expose latest human identification with each blob and analysis
- allow later models to learn from reviewed human corrections without blindly treating every human label as ground truth

Human labels are evidence for review and training. They are not automatic replacement predictions.

## Long Files, Hydrophones, And Buoy Streams

Required:

- default bounded window support, starting with 30 seconds
- overlapping long-file windows with explicit `window_index`, `start_sec`, `end_sec`, and `overlap_sec`
- queued jobs for long files
- polling by `job_id` and `analysis_run_id`
- no synchronous analysis of 500 MB files in one request
- support for future Psathyrella buoy rolling buffers

Required completion proof:

- one ESC-50 short clip response
- one MBARI or hydrophone 30-second window response or queue/poll result
- one missing-model/OOD negative response
- one human correction round trip

## Source Code Guidance

Use the audit document for exact repo findings:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Implementation direction:

- Use `daisukelab/sound-clf-pytorch` as the strongest P0 PyTorch/log-mel/ResNetish pattern.
- Use `ksanjeevan/crnn-audio-classification` as the P1 temporal CRNN/GRU pattern.
- Use `IBM/MAX-Audio-Classifier` for model-wrapper/API separation and top-k/window response structure, not old TensorFlow.
- Use `daisukelab/ml-sound-classifier` for rolling buffers, prediction smoothing, split spectrograms, and class balancing ideas, not old Keras runtime.
- Use `GorillaBus/urban-audio-classifier` for fold-aware evaluation and metrics discipline.
- Use `imfing/audio-classification` for engineered DSP feature baselines.
- Use the marine sound notebook direction for Watkins/WHOI/MBARI 30-second marine windows.
- Use transformer-class models such as AST/BEATs/PANNs/CLAP only when license, artifact, and runtime provenance are clear.

Do not copy the local AI Studio backend behavior. It contains mock data, generated audio, Gemini analysis, and synthetic/fallback outputs. Keep only safe schema/UI concepts:

- chronological sound transcripts
- high-contrast lab dashboard vocabulary
- waveform/spectrogram/playhead interaction
- layer model architecture vocabulary
- prototype bank concept

AI Studio schema corrections Cursor must apply:

- `acoustic_environment` must include `ground`, not only `air` and `water`.
- `DetectorStatus` must not be limited to birds and UAVs; it must reflect broad water/air/ground families or a registry-driven detector list.
- `DeepSignalMatch` must include prototype ID, embedding ID, model ID/version, embedding dimension, checksum, distance, source, and window bounds.
- `SoundTranscriptEntry` must include evidence IDs.
- `AcousticAnalysis` must include `model_status`, `model_outputs`, `fusion_evidence`, job/window metadata, evidence contract, and OOD/unknown state.
- `AcousticVisualisation` must include FFT/hop/window/channel/frequency/dB/clamp/peak metadata.

## Acceptance Tests

Cursor must add backend tests. Minimum tests:

```text
tests/test_sine_no_fake_semantics.py
tests/test_sine_audio_decode_visualisation.py
tests/test_sine_model_registry.py
tests/test_sine_missing_model_contract.py
tests/test_sine_esc50_model_output.py
tests/test_sine_prototype_contract.py
tests/test_sine_windowed_analysis.py
tests/test_sine_human_correction.py
tests/test_sine_status_models_endpoint.py
```

Required pass/fail checks:

1. Repository search proves no reachable Gemini/mock/generated/filename-derived classifier path.
2. Missing model returns `model_unavailable`, no `identification_summary`, empty `model_outputs`, empty semantic `deep_signal_matches`, empty `fusion_evidence`, empty `sound_transcripts`.
3. Short ESC-50 clip returns a real `model_outputs[]` row with model artifact/runtime/checksum/label-map proof.
4. High-definition visualisation returns real decoded arrays with 8,192 waveform points and 256 x 1,024 spectrogram for a short clip when requested.
5. Prototype match includes prototype ID, vector/model proof, score/distance, source, and window bounds.
6. Fusion evidence links to model output or prototype evidence.
7. Sound transcript links to evidence IDs.
8. Human correction persists beside model prediction and queues a contested review row.
9. MBARI/hydrophone long file supports a bounded 30-second window or returns a queued job.
10. Website BFF on 3010 clears `MINDEX contract failed` for one real short model-backed run.

## Website Frontend Contract Already Waiting

Codex has already made the Website stricter:

- it sends `require_real_audio`
- it sends `require_model_evidence`
- it sends `semantic_fallback=false`
- it sends `llm_fallback=false`
- it rejects completed semantic responses with missing evidence
- it displays weak backend rows as unverified instead of confirmed matches
- it falls back to browser-real-audio visualisation only when backend visualisation is weak
- it now sends an explicit evidence contract asking for `model_outputs`, `embeddings`, `prototype_matches`, `fusion_evidence`, `sound_transcripts`, and `diagnostics`
- it now asks for explicit `model_status`, model artifact/checksum proof, prototype identity, vector checksum proof, fusion links, evidence-linked transcripts, and long-audio window metadata
- it now recognizes backend proof aliases such as `model_uri`, `artifact_sha256`, `model_artifact_sha256`, `checkpoint_sha256`, `runtime_name`, `inference_framework`, `label_map_sha256`, `embedding_id`, and `vector_sha256`
- it now also recognizes future backend alias families without weakening the proof gate:
  - model output IDs: `model_output_id`, `output_id`, `inference_id`, `prediction_id`, `supporting_model_output_ids`
  - fusion IDs: `fusion_evidence_id`, `fusion_id`, `supporting_fusion_evidence_ids`
  - prototype/fingerprint IDs: `prototype_match_id`, `matched_prototype_id`, `nearest_prototype_id`, `prototype_key`, `fingerprint_id`, `signature_id`, `embedding_id`, `vector_id`, `centroid_id`
  - prototype/vector proof: `prototype_sha256`, `prototype_checksum`, `fingerprint_sha256`, `fingerprint_checksum`, `embedding_sha256`, `vector_sha256`
  - model artifact proof: `artifact_url`, `checkpoint_uri`, `checkpoint_url`, `checkpoint_checksum`, `training_corpus`, `training_run_id`, `metrics_uri`, `metrics_path`
  - transcript links: `model_outputs`, `output_ids`, `inference_ids`, `prediction_ids`, `prototype_matches`, `prototype_match_ids`, `fingerprint_ids`, `embedding_ids`, and `evidence_links` when they resolve to fusion/model/prototype evidence
- it proxies `GET /api/natureos/mindex/sine/training/human-tags` and now keeps a stable response shape even when MINDEX is not ready:
  - healthy shape: `items`, `total`, `limit`, `offset`
  - unavailable shape: `status: human_training_tags_unavailable`, `items: []`, `total: 0`, `limit`, `offset`, optional `upstream_status`
  - MINDEX should make this route return training/review rows from human identifications, including `blob_id`, `analysis_run_id`, `human_label`, `model_top_label`, `disputes_model`, `review_status`, `training_eligible`, selected-region context, scope measurements, file context, and created/updated timestamps

### June 6 Frontend Request Coverage Check

Cursor can rely on the Website to request the real SINE backend contract from every current SINE entry point. Codex verified these frontend request surfaces:

- Shared player direct run path: `components/sensing/sine-acoustic-player.tsx` posts `sine_request: SINE_REQUEST_CONTRACT` and `evidence_contract: SINE_EVIDENCE_CONTRACT` to `/api/mindex/sine/blobs/{id}/analyze`.
- Shared player scope export: `components/sensing/sine-acoustic-player.tsx` writes `classifier_contract.sound_targets`, `target_domains`, `class_families`, and `model_family_targets` into downloaded scope context JSON for audit/MYCA review.
- Analyze BFF: `app/api/mindex/sine/blobs/[id]/analyze/route.ts` merges `SINE_REQUEST_CONTRACT` into every POST body, even if an older caller omits fields.
- MINDEX Library classify BFF: `app/api/natureos/mindex/library/classify/route.ts` sends `SINE_REQUEST_CONTRACT` and `SINE_EVIDENCE_CONTRACT` to `/api/mindex/library/blobs/{id}/classify`.
- Contract source of truth: `lib/mindex/sine-contract.ts`.

That canonical request includes `sound_targets` for water, air, and ground acoustic meaning, not just broad families. MINDEX must read, persist, and honor `sine_request.sound_targets` on `library.analysis_run` or the new SINE run table. It should use those targets to choose model heads, prototype families, OOD handling, and training-review routing. If a requested target has no model/prototype coverage yet, return an honest missing/unknown/OOD state for that target instead of collapsing the answer to bird/rotor heuristics.

Do not weaken the frontend contract. Make MINDEX satisfy it.

## Cursor Implementation Phases

### Phase A: Make Current Backend Honest

- remove/gate fake semantic labels
- remove/gate unproven `bird_likely`, `uav_rotor_likely`, `spectral_embedding`
- add missing-model negative tests
- return `model_status: "model_unavailable"` when no model is loaded

### Phase B: Real Decode And Visualisation

- decode NAS WAVs
- return high-definition waveform/spectrogram with metadata
- add short-clip and large-window tests

### Phase C: Model Registry

- add DB tables
- register artifacts
- checksum validate
- expose status/models endpoints

### Phase D: P0 ESC-50 Model

- train or load `sine-esc50-resnetish-v1`
- export TorchScript or ONNX
- register artifact and metrics
- run real inference on selected blob

### Phase E: Prototype Retrieval

- produce embeddings
- build prototype catalog
- persist and return prototype matches with evidence

### Phase F: Fusion And Transcripts

- link model, prototype, and detector evidence
- generate transcript rows only from those links

### Phase G: Long Files And Buoy Windows

- implement 30-second window support
- queue large jobs
- support future rolling buffers

### Phase H: Human Correction Loop

- persist human tags
- mark contested rows
- enqueue training review

### Phase I: Website Acceptance

- verify through `localhost:3010`
- prove a real short run clears the Website evidence gate

## Completion Report Required From Cursor

Cursor must produce a completion doc with:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path
- model artifact SHA256
- label map path
- label map SHA256
- runtime and device
- model metrics
- confusion matrix path
- `GET /api/mindex/sine/models` response summary
- missing-model negative response summary
- ESC-50 positive response summary
- MBARI/hydrophone 30-second window response summary
- prototype catalog response summary
- human correction round-trip summary
- Website 3010 smoke result
- known limits and next models needed

Do not call this done until `Run SINE analysis` is real model-backed analysis or honestly reports that no model is available.

## Paste-Ready Cursor Prompt

Use this exact prompt in Cursor:

```text
Read this full handoff first:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_BACKEND_CURSOR_FULL_HANDOFF_JUN06_2026.md

Then implement the real MINDEX SINE backend in:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex

Morgan QA-tested SINE and confirmed that Run SINE analysis is not real acoustic AI. Treat the current backend as a detector shell, not a classifier. HTTP 200 is not a pass.

Before editing, run:

rg -n "bird_likely|uav_rotor|spectral_embedding|mindex_sine_v1|GoogleGenAI|GEMINI|mockAcousticBlobs|generateWavBuffer|identification_summary" mindex_api tests sine-acoustic-classifier

The current failure is expected: event_views.py promotes detector rows into identification_summary, tests still expect bird_likely, and the AI Studio prototype uses Gemini, mocks, generated WAVs, synthetic visualisation, and metadata/fallback semantic claims. Fix the MINDEX backend. Do not hide the failure in the Website.

Immediate P0:

1. Make the current backend honest. If no model artifact is loaded, return model_status: model_unavailable, no identification_summary, no semantic deep_signal_matches, no fusion_evidence, no sound_transcripts, and no fake bird/UAV/spectral labels.
2. Decode real NAS-backed library.blob audio bytes.
3. Return real high-definition waveform/spectrogram data with FFT/hop/window/frequency/dB/channel/peak metadata.
4. Add model registry tables and endpoints.
5. Train or load one real PyTorch/TorchScript/ONNX ESC-50 model as sine-esc50-resnetish-v1.
6. Persist model_outputs, embeddings, prototype_matches, fusion_evidence, and sound_transcripts with evidence IDs.
7. Add human correction persistence and contested training-review queue.
8. Add 30-second window handling for large hydrophone/MBARI/Psathyrella clips.
9. Verify through localhost:3010 that the Website no longer shows MINDEX contract failed for one real model-backed short clip.

Minimum real-analysis chain:

1. UUID library.blob row resolves to a real NAS file.
2. Requested file/window decodes from real audio bytes.
3. DSP features are computed from those bytes.
4. Registered model artifact exists, checksum validation passes, and runtime actually loads it.
5. Inference returns model_outputs with model ID, artifact/checksum, label map, scores, window, and latency.
6. Prototype matches include stable prototype IDs, embedding/vector proof, source/license, score or distance, and OOD distance when available.
7. Fusion rows link to model output or prototype IDs.
8. Transcript rows link to model output, fusion, or prototype IDs.
9. Human correction rows persist beside model outputs and mark disagreements as contested.

Hard rules:

- no mock labels
- no Gemini/LLM classifier
- no filename/path/source-metadata classifier
- no synthetic/generated audio rows
- no semantic label without model/prototype/fusion evidence
- no transcript prose without evidence IDs
- no model readiness claims without registered artifact and runtime proof
- do not copy AI Studio server.ts backend behavior; only reuse UI ideas like transcript lanes, combined canvas, model/prototype explorer vocabulary, and hydrophone styling

Return a completion doc with commit hash, migrations, artifact/checksum, model metrics, sample API responses, human correction round trip, VM 189 deploy status, and known limits.
```
