# SINE Real AI Backend Cursor Prompt

Date: June 6, 2026

Use this prompt for Cursor in the MINDEX backend repo:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Read the master handoff first:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md`

Also read the consolidated full handoff. This is the cleanest single document to give Cursor for the real backend rebuild:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_BACKEND_CURSOR_FULL_HANDOFF_JUN06_2026.md`

Then read the original detailed handoff:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`

Then read the external audio-code audit:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Then use the acceptance matrix as the pass/fail checklist:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`

Then use the P0 implementation blueprint as the concrete file/module/schema build plan:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

Then read the MINDEX-local current-code audit before editing production code:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

## Prompt

Morgan QA-tested SINE audio and confirmed that `Run SINE analysis` is not doing real acoustic intelligence. Treat the current analyze/classify backend as a shell that can return detector-shaped JSON, not as a completed classifier.

Before editing, re-run this current-source audit in the MINDEX repo and make sure the results are reflected in your fixes:

```powershell
rg -n "bird_likely|uav_rotor|spectral_embedding|mindex_sine_v1|GoogleGenAI|GEMINI|mockAcousticBlobs|generateWavBuffer|identification_summary" mindex_api tests sine-acoustic-classifier
```

Expected current failure:

- `event_views.py` promotes detector rows into `identification_summary`.
- `bird.py` and `uav.py` emit semantic-looking labels from heuristics.
- `deep_signal.py` emits a small spectral profile as `spectral_embedding`.
- `tests/test_acoustic_event_views.py` currently expects the bad `bird_likely` promotion.
- the AI Studio prototype uses Gemini, mocks, generated WAVs, synthetic visualisation, and metadata/fallback semantic claims.

Build the real MINDEX SINE acoustic backend. This is acoustic-only. Do not work on chemistry, DNA, or unrelated MINDEX tabs.

The required backend work is actual AI and signal-intelligence work, not UI polish and not a JSON reshaping task. Build the system that can listen to real NAS-backed audio and classify what is inside it using:

- deterministic DSP and pattern detection from decoded samples
- PyTorch training or loading
- deployed PyTorch, TorchScript, or ONNX Runtime inference
- a P0 CNN/ResNetish environmental classifier
- P1 CRNN/GRU temporal modeling for repeated or evolving events
- P1/P2 transformer-class acoustic embeddings or semantic models when artifact/runtime/licensing are clear
- embedding and prototype/fingerprint retrieval with stable IDs and vector checksums
- evidence fusion and evidence-linked sound transcripts
- human-correction persistence for active learning and contested labels

The output must identify and label real acoustic content: animal sounds, insects, marine life, vessels, propellers, UAVs, aircraft, machinery, explosions, impacts, lightning, weather, earthquake/seismic/ground sounds, unknown/OOD, and other water/air/ground classes. If no real model/prototype/fusion evidence exists, the answer is `model_unavailable` or `unknown`, not a fake semantic guess.

Do not treat the current backend as done because it returns 200, draws detector lanes, or produces labels such as `bird_likely`, `uav_rotor_likely`, or `spectral_embedding`. Morgan's latest QA verdict is that those outputs are not real AI classification. The Website now intentionally renders those as unverified backend rows when the evidence contract fails.

This is operationally important for Navy-facing acoustic work and the Psathyrella buoy path. Do not optimize for a pretty demo. Optimize for auditability, unknown/OOD honesty, bounded hydrophone windows, real model evidence, and human-correction loops that can improve training later.

Normalize the AI Studio and ChatGPT prototype route names into the real MINDEX API. Do not create a separate toy `/api/classify` service unless it forwards to MINDEX's production routes:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/prototypes`

The safe AI Studio ideas are UI ideas only: combined waveform/spectrogram playhead, transcript panel, chronological event table, model/prototype explorer vocabulary, and cyan/black hydrophone styling. Reject its backend behavior: Gemini, generated WAVs, mock catalog, synthetic visualisation, metadata prompts, and unproven `SINE-Embed-v1` claims.

Use `SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md` as the P0 work plan. It names the recommended MINDEX services, ETL/training jobs, tests, migration, schema, endpoint behavior, model artifact layout, and completion report. Do not stop at this prompt if the blueprint has more specific implementation details.

Hard rules:

- no mock labels
- no Gemini, LLM, MYCA, filename-derived, or source-metadata-derived classifier
- no synthetic detector rows
- no fake `sound_transcripts`
- no semantic label unless backed by real decoded audio and evidence
- if no model is loaded, return `model_unavailable`
- human corrections must be stored beside model predictions, not overwrite them
- do not copy the local AI Studio `server.ts` behavior; its `GoogleGenAI`, `generateWavBuffer`, `mockAcousticBlobs`, synthetic visualisation, and metadata-derived semantic fallbacks are anti-patterns
- do not claim model runtime, quantization, calibration, CUDA/FP16, CRNN/ResNet, or SINE-Embed readiness unless a real `sine.model_artifact` is registered and the runtime load check passes

Immediate first fix:

The current backend can still return semantic-looking labels without real proof. Fix that before training anything. Start with these current files:

- `mindex_api/services/sine_acoustic/event_views.py`
- `mindex_api/services/sine_acoustic/pipeline.py`
- `mindex_api/services/sine_acoustic/deep_signal.py`
- `mindex_api/services/sine_acoustic/bird.py`
- `mindex_api/services/sine_acoustic/uav.py`
- `mindex_api/services/sine_acoustic/visualisation.py`
- `mindex_api/routers/sine_acoustic.py`
- `tests/test_acoustic_event_views.py`
- `tests/test_sine_acoustic_pipeline.py`

Search the production classify/analyze path for any code that emits labels such as `bird_likely`, `UAV`, `rotor`, `whale`, or transcript prose without model/prototype/fusion evidence. Remove or gate it. Add a negative test that runs with no model artifact loaded and proves the response is `model_status: model_unavailable`, no `identification_summary`, empty semantic `deep_signal_matches`, empty `fusion_evidence`, empty `sound_transcripts`, and `diagnostics.semantic_fallback_used: false`.

Use this minimum "real AI" checklist before any positive classifier claim:

1. A UUID `library.blob` row resolves to a real NAS file.
2. The requested file/window is decoded from actual audio bytes.
3. DSP features are computed from those bytes.
4. A registered model artifact exists and checksum validation passes.
5. The runtime actually loads the model.
6. Inference returns `model_outputs[]` with model ID, artifact/checksum, label map, score, window, and latency.
7. Prototype matches include prototype ID, embedding/vector proof, source/license, score or distance, and OOD distance when available.
8. Fusion rows link to model output or prototype IDs.
9. Transcript rows link to model output, fusion, or prototype IDs.
10. Human correction rows persist beside model outputs and mark disagreements as contested.

Morgan's latest manual QA verdict: `Run SINE analysis` is not real analysis yet. Do not defend the current backend because it returns HTTP 200. A detector-only response with labels like `bird_likely`, `uav_rotor_likely`, or `avian_or_insect_band` is still a failure unless it includes registered model/prototype/fusion evidence.

Also fix the Library blob identity contract. The Website found that some `q=esc` Library results fall back to NAS path-only rows with encoded ids such as `YWNvdXN0aWMv...`; those can play but cannot be analyzed or saved because SINE routes need a MINDEX `library.blob` UUID. `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=...` must return registered ESC-50 audio rows with UUIDs. Do not expose `.wav.manifest.json` as playable audio. Each selectable audio row must include a stable UUID via `id`, `blob_id`, `uuid`, `analysis_id`, or `remote_id`, plus path/stream metadata, duration/sample-rate/channels when known, source/license, and search fields.

Codex re-tested the current backend through `localhost:3010` with the Website evidence contract on a real short ESC-50 clip:

- blob UUID: `6a8492b5-0796-43b3-be42-1ccd753f5d12`
- file: `acoustic/esc50/1-100038-A-14.wav`
- SINE status: `acoustic_blobs: 2180`
- frontend startup: 36 ESC-50 rows loaded, audio stream decodes as 5 seconds / 48 kHz / mono

Current visualisation failure:

- high-resolution request asked for `max_waveform_points=8192`, `max_time_frames=1024`, `max_frequency_bins=256`, `fft_size=2048`, `hop_length=128`, `window_function=hann`, `include_peaks=true`, and `quality=oscilloscope`
- backend returned only 800 waveform points and a 64 x 44 spectrogram
- backend omitted `visualisation_status`, `channels`, `fft_size`, `hop_length`, `window_function`, frequency bounds, dB bounds, clamp metadata, and peak rows
- Website can now decode the real audio stream locally and build 8,192 waveform points plus 256 x 1,024 spectrogram cells, but that is a frontend fallback; MINDEX still needs to return the real oscilloscope-grade data

Current analysis failure:

- `POST /api/mindex/sine/blobs/6a8492b5-0796-43b3-be42-1ccd753f5d12/analyze` returned HTTP 200 and `status: complete`
- it returned `identification_summary.top_label: bird_likely`, `engine: bird_microsoft`, `model: mindex_sine_v1`, and `status: classified`
- it returned no `model_status`, zero `model_outputs`, zero `fusion_evidence`, zero `sound_transcripts`, one unproven `deep_signal_matches` row, 12 frequency detections, one activity segment, one bird detection, and one UAV detection
- semantic labels included `bird_likely`, `spectral_embedding`, and `uav_rotor_likely`

The Website now marks that as `MINDEX contract failed` / `Semantic contract violation`. This is correct. Fix the backend behavior first.

The Website will now reject all of these as failures:

- completed analysis without `model_status`
- semantic `identification_summary` without proven model/prototype/fusion/transcript evidence
- model-like prediction rows without model identity, runtime, artifact/checksum, label-map, or training provenance
- semantic `fusion_evidence` rows not linked to model output or prototype evidence
- transcript prose without `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`
- `deep_signal_matches` / prototype-like labels without stable prototype identity, source/model/vector proof, and score/distance

P0 backend requirements:

1. Decode real NAS-backed `library.blob` acoustic files from `/mnt/nas/mindex/Library/acoustic`.
2. Produce real high-resolution waveform and spectrogram data for the website.
   - The frontend is aiming for Fungi Compute/oscilloscope-grade rendering, not thumbnail preview data.
   - `GET /api/mindex/sine/blobs/{id}/visualisation?start_sec=0&end_sec=5&max_waveform_points=8192&max_time_frames=1024&max_frequency_bins=256` must return real decoded arrays plus FFT/hop/window/sample-rate/frequency/dB/clamp metadata and peak rows.
   - If the requested clip/window is too large, return `visualisation_status: queued` or `visualisation_status: clamped` with explicit metadata. Do not synthesize or ID-generate matrices.
3. Compute deterministic DSP features from real samples: STFT, log-mel/PCEN, FFT peaks, centroid, rolloff, RMS, ZCR, activity segments, impulse, harmonic, rotor, sweep, and ground/seismic low-frequency candidates.
4. Add a real PyTorch, TorchScript, or ONNX Runtime model path.
5. Train or load one real ESC-50/environmental classifier using NAS data as the first proof model.
6. Save model artifact, label map, training config, metrics, version, and checksum under NAS model storage.
7. Register the model in Postgres and expose honest status from `/api/mindex/sine/status` and real model rows from `GET /api/mindex/sine/models`.
   - Model rows must include artifact path/checksum, label map path/checksum, label count, domain heads, target domains, class families, training dataset, metrics/confusion-matrix path, framework/runtime, device, loaded state, and last inference metadata.
   - The Website will recognize model registry/status fields using these names:
     - model identity: `model_id`, `active_model_id`, `model_name`, `name`, `registry_id`
     - model collections: `models`, `registered_models`, `model_registry`, `loaded_models`
     - readiness: `model_ready`, `model_loaded`, `is_loaded`, `loaded`, `ready`, or `status: model_ready`
     - runtime proof: `framework`, `inference_framework`, `runtime`, `inference_runtime`, `runtime_name`, `engine`
     - artifact proof: `artifact_uri`, `artifact_path`, `artifact`, `model_path`, `checkpoint_path`
     - checksum proof: `model_checksum`, `artifact_sha256`, `checksum`, `sha256`
     - deployment proof: `device`, `inference_device`, `backend_commit`, `git_commit`, `git_sha`, `last_inference_at`, `last_successful_inference_at`
   - Do not set loaded/ready/live if the model artifact is missing, checksum validation failed, the runtime did not load, or the endpoint only has detector heuristics.
8. Run real inference over bounded audio windows.
9. Persist `sine.analysis_run`, `sine.detector_event`, `sine.model_output`, `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript`.
10. Return `model_outputs[]`, `fusion_evidence[]`, `deep_signal_matches[]`, and evidence-backed `sound_transcripts[]` only when real evidence exists.
11. Build a prototype/fingerprint retrieval path using embeddings and cosine similarity.
    - Expose real registered prototypes from `GET /api/mindex/sine/prototypes`; the Website already proxies and displays this endpoint.
    - Per-run `deep_signal_matches` must include a stable prototype identity, source/model/vector proof, and score/distance. A label plus score is not enough.
    - Prototype rows containing mock/synthetic/generated/placeholder/plausible/Gemini/AI-Studio/metadata-derived/filename-derived/heuristic-fallback markers are quarantined by the Website and will not count as classifier evidence.
    - Global prototype catalog rows only prove the catalog exists; they do not make a selected recording's `Prototype / fingerprint match` checklist row ready unless that run returns a proven match.
    - `fusion_evidence` only counts as semantic evidence when it links to a model output or prototype identity and has a semantic label plus score/weight.
    - `sound_transcripts` only count as evidence-backed when they include `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`.
12. Store human identifications, mark human/model disagreements as contested, and queue them for review/training.
13. Accept window/job query params on `GET /api/mindex/sine/blobs/{id}/analysis`: `start_sec`, `end_sec`, `windowed`, `window_source`, `job_id`, and `analysis_run_id`.
14. Accept and honor the Website analyze evidence contract on every `POST /api/mindex/sine/blobs/{id}/analyze` run, including short clips:
   - query params: `require_real_audio=true`, `require_model_evidence=true`, `allow_detector_only=true`, `semantic_fallback=false`, `llm_fallback=false`, `prototype_matching=true`, `sound_transcripts=evidence_backed_only`
   - JSON body field: `evidence_contract`
   - if no real model is loaded, return useful detector evidence plus `model_status: model_unavailable`, empty `model_outputs`, empty semantic `sound_transcripts`, and no fake `identification_summary`
   - never return semantic labels from LLM/Gemini prompts, filenames, source metadata, mock rows, or synthetic/generated audio
   - Codex smoke-tested the current backend and it still returned `identification_summary.top_label = bird_likely` with zero model outputs, zero fusion rows, zero transcripts, no `model_status`, and one unproven deep-signal row. The Website now flags that as `Semantic contract violation`. Fix this backend behavior first.
15. Add Navy/Psathyrella operational support:
   - Support MBARI/hydrophone/Psathyrella clips with bounded 30-second windows and overlapping long-file splitting.
   - Return explicit `start_sec`, `end_sec`, `window_index`, `overlap_sec`, job/progress metadata, and source device/blob provenance.
   - Treat buoy audio as a future streaming/rolling-buffer source, not only static uploaded WAV files.
   - Preserve `unknown` and `out_of_domain` as first-class outcomes.
   - Require one marine/hydrophone sample report and one missing-model/OOD negative report before claiming operational readiness.

Model direction:

- P0: small CNN/ResNetish ESC-50 environmental classifier.
- P1: CRNN/GRU temporal model for repeated sounds, animals, insects, rotors, and evolving acoustic events.
- P1/P2: Audio Spectrogram Transformer or equivalent transformer encoder for broader semantic audio.
- P1/P2: domain heads for water, air, ground, marine, animal, insect, weather/lightning, explosion/impact, UAV/rotor, mechanical/device, and unknown/OOD.

Source-code guidance:

Detailed repo-by-repo findings are in `SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`. Use that audit to decide what to reimplement in MINDEX, what to defer, and what not to copy.

- Use `daisukelab/sound-clf-pytorch` as the strongest P0 PyTorch pattern: ResNetish, log-mel datasets, fixed window length, long-file split windows, Torch training/export.
- Use `ksanjeevan/crnn-audio-classification` as the P1 temporal pattern: mel frontend, conv stack, packed LSTM/GRU, length-aware inference.
- Use `IBM/MAX-Audio-Classifier` for API/model-wrapper structure: decode/generate embeddings/classify/postprocess/top-k labels with `start_time`/window handling, but modernize away from old TensorFlow/MAX.
- Use `daisukelab/ml-sound-classifier` for streaming buffers, prediction smoothing, mixup/class balancing, and domain-specific app configs, but do not copy the old Keras/PB runtime.
- Use `GorillaBus/urban-audio-classifier` for UrbanSound-style fold-aware evaluation, log-mel/MFCC comparison, augmentation, precision/recall/F1 reporting.
- Use `ilge/gmtk-audio-classification` for modernized temporal smoothing/hysteresis ideas, not GMTK deployment.
- Use `imfing/audio-classification` for engineered DSP feature baselines: MFCC, chroma, mel, spectral contrast, tonnetz.
- Use the OVH marine notebook for the Watkins/WHOI marine mammal direction and 30-second marine window feature set.
- Use `braydenoneal/neural-audio-classification` only for TorchScript artifact/predict pattern and spectrogram sanity artifacts.
- Do not copy the local AI Studio `server.ts`; use only safe UI/schema ideas and reject Gemini/mock/generated/metadata-derived backend behavior.

Acceptance tests:

- Search production paths and prove there are no reachable fake/Gemini/mock/filename-derived classifiers.
- Search production paths and prove none of the AI Studio prototype anti-patterns are reachable: `GoogleGenAI`, `GEMINI_API_KEY`, `generateWavBuffer`, `mockAcousticBlobs`, metadata prompts, synthetic visualisation, or `generateDspHeuristicPayload`.
- Missing model artifact returns `model_unavailable`, empty model evidence arrays, and no fake semantic label.
- A short ESC-50 file returns real `model_outputs[]` with model ID, framework/runtime, version, checksum, label map, window bounds, top labels, and latency.
- A large MBARI/hydrophone file can analyze a bounded 30-second window without trying to synchronously classify the whole file.
- Queued/running analysis polling returns the same submitted blob/window/job result, not an unrelated latest whole-file run.
- High-definition visualisation returns real waveform and spectrogram arrays from audio bytes.
- Oscilloscope-grade visualisation includes real axes/FFT metadata, peak rows, and enough samples/frames for the Website to render lab-grade waveform/spectrogram/waterfall controls.
- Human correction test: model says `UAV`, human says `lightning`; both labels persist and the row enters a review/training queue.
- Website BFF on 3010 can read SINE status, visualisation, analyze, classify, and then the SINE player clears `Model evidence pending`.
- Website BFF on 3010 can read `GET /api/mindex/sine/models`; it returns real registered model provenance or an honest empty/missing state.

Completion report required:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path and checksum
- label map path
- runtime and device
- metrics and confusion matrix
- one real ESC-50 response summary
- one MBARI 30-second window response summary
- one missing-model negative test
- one human correction round trip
- known limits and next models needed

Do not call this complete until the frontend can show real model evidence from MINDEX instead of detector-only output.
