# SINE Real AI Backend Handoff For Cursor

Date: June 6, 2026

Prepared by: Codex

Target repo: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Frontend repo reference: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`

Companion external code audit:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Master handoff:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md`

P0 backend implementation blueprint:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

Backend VM: `192.168.0.189:8000`

NAS acoustic library on VM: `/mnt/nas/mindex/Library/acoustic`

Windows NAS reference: `\\192.168.0.105`

Website QA surfaces:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

## Executive Summary

Morgan QA-tested SINE audio and confirmed that `Run SINE analysis` is not performing real acoustic intelligence yet. The frontend can load real NAS audio and can render detector-shaped output, but the backend does not yet prove that it is running real AI, PyTorch, neural networks, transformers, prototype matching, or evidence-backed pattern recognition.

Cursor needs to build the real MINDEX SINE backend so the system can identify what audio files mean, what sound sources are inside them, which time windows contain which events, how confident the system is, and how human corrections are stored for later model training.

## Immediate Cursor Directive

Start with backend honesty before adding more model code. The current failure mode is worse than an empty result because it can make the UI look like it understands audio when it does not. Cursor should make this the first PR or first deploy slice:

1. Find the reachable MINDEX classify/analyze path that returns semantic labels such as `bird_likely`, `UAV`, `rotor`, `whale`, or any transcript-like text without real model/prototype/fusion evidence.
2. Delete, quarantine, or feature-gate that behavior so production endpoints cannot emit semantic `identification_summary`, semantic `deep_signal_matches`, `fusion_evidence`, or `sound_transcripts` unless those rows link to real decoded audio, a registered model artifact, a real model output, a prototype/vector match, or an evidence-fusion row.
3. If no model artifact is loaded, return `model_status: "model_unavailable"`, keep semantic arrays empty, and return only non-semantic detector/DSP rows with clear provenance.
4. Add tests that intentionally disable the model runtime and prove no semantic label leaks out.
5. Only after that negative test passes, build the PyTorch/TorchScript/ONNX model path, prototype catalog, evidence fusion, transcript generation, and human-correction training queue.

The first Cursor success condition is not "the button returns 200." The first success condition is: the current backend stops pretending to classify audio. The second success condition is: a real short ESC-50 recording produces persisted model evidence from a registered model artifact.

Cursor should also read the focused acceptance matrix before coding:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`

That matrix is the pass/fail gate. A 200 response is not enough.

Cursor should use the P0 implementation blueprint as the file-level build plan after reading this handoff and the acceptance matrix. It specifies the recommended MINDEX modules, migration, tables, service responsibilities, endpoint behavior, model artifact layout, training/export path, prototype search path, and completion report.

This handoff is acoustic-only. Ignore chemistry, DNA, PubChem, DWSIM, Cantera, and unrelated MINDEX tabs for this pass.

Cursor should read the companion external audit before implementing. It contains repo-by-repo findings from the acoustic classifier code Morgan asked Codex to inspect, including which ideas should be reimplemented in MINDEX and which old runtimes should not be copied.

## Latest Morgan QA Finding

Morgan manually QA-tested SINE with real acoustic clips and confirmed the current `Run SINE analysis` button is not doing real acoustic intelligence. Treat this as a backend failure, not a frontend misunderstanding.

Current observed backend behavior:

- `POST /api/mindex/sine/blobs/{uuid}/analyze` can return HTTP 200 and detector-shaped rows.
- It can emit semantic-looking labels such as `bird_likely`, `uav_rotor_likely`, `avian_or_insect_band`, or `spectral_embedding`.
- It does not prove a loaded PyTorch, TorchScript, ONNX, transformer, CRNN, ResNetish, AST, embedding, prototype, or fusion model.
- `/api/mindex/sine/models` is still unavailable/empty from the Website perspective.
- The result can include no `model_status`, no `model_outputs`, no `fusion_evidence`, no evidence-backed `sound_transcripts`, and only shallow `deep_signal_features`.

Cursor must therefore implement the real AI backend, not keep extending the detector shell. The endpoint may keep deterministic DSP detector rows, but semantic meaning must come from registered model/prototype/fusion evidence or return `model_status: "model_unavailable"`.

## Latest Frontend / Library Contract Issue

Codex also found a separate Library identity problem while testing `localhost:3010`:

- Some `/api/natureos/mindex/library?category=acoustic&q=esc...` responses fall back to local NAS path rows.
- Those rows have encoded file ids such as `YWNvdXN0aWMvZXNjNTAv...`, not MINDEX `library.blob` UUIDs.
- Path-only rows can stream/play from NAS, but they cannot be analyzed, annotated, human-tagged, or added to the training review queue because MINDEX analysis routes require the real acoustic blob UUID.
- Manifest files such as `.wav.manifest.json` must not appear as playable acoustic recordings.

Website mitigation added by Codex:

- The shared SINE player now separates `selectedId` from `selectedAnalysisId`.
- `selectedId` can be a file/stream id.
- `selectedAnalysisId` must be a UUID from `analysis_id`, `blob_id`, `uuid`, `remote_id`, `stream_url.remote_id`, or `id`.
- The player will only call analyze, saved analysis, wave annotations, or human-identification routes when `selectedAnalysisId` exists.
- Path-only files can still play and build browser waveform/spectrogram scope, but the player will show that the recording needs a MINDEX record link before backend analysis can run.
- New QA hook: `data-sine-selected-analysis-id`.

Cursor/backend requirement:

- `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=...` must return real registered ESC-50 rows with stable UUIDs, not force the Website to discover files from the NAS fallback.
- Every selectable SINE acoustic file returned by MINDEX should include at least one UUID field the Website can preserve: `id`, `blob_id`, `uuid`, `analysis_id`, or `remote_id`.
- Each row should include `relative_path`, `stream_url` or stream-resolvable path, `source_id`, `duration_sec`, `sample_rate_hz`, `channels`, `size_bytes`, `license`, and `playback_class: "audio"`.
- JSON manifests should be represented as metadata beside the audio blob, not as selectable audio files.
- Search must cover `source_id`, `origin_dataset_id`, `relative_path`, filename, tags/labels, acoustic environment, sensor type, and human/model labels so `esc`, `esc50`, `lion`, `hydrophone`, `mbari`, `lightning`, etc. resolve to registered blobs.

## QA Verdict From Morgan

Morgan tested the player with real audio and determined that `Run SINE analysis` is not doing real acoustic understanding. Treat this as a failed backend readiness test, not a frontend misunderstanding.

The backend must be considered incomplete until it can prove:

- a real audio file was decoded from NAS-backed `library.blob` storage
- real waveform/spectrogram/DSP features were computed from samples
- a real PyTorch, TorchScript, ONNX, or equivalent neural model was loaded
- inference ran over bounded audio windows
- model outputs include artifact/version/checksum/provenance
- time-bounded labels are persisted and linked to evidence
- human corrections are stored beside model predictions for active learning
- the website receives evidence-backed model rows instead of detector-shaped placeholder JSON

The button can return 200 and still be wrong. A successful endpoint response is not enough. The response has to contain real model evidence or an honest `model_unavailable` state.

## June 6 Website Validation Snapshot

Codex rechecked the Website SINE frontend on `3010` after writing this handoff.

Validated:

- `http://localhost:3010/sensing/sine` returned 200.
- `http://localhost:3010/sensing/sine/player` returned 200.
- `http://localhost:3010/api/mindex/sine/status` returned `status: ok` and `acoustic_blobs: 2180`.
- `http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5` returned five real acoustic rows and total file count `2180`.
- `http://localhost:3010/api/mindex/sine/models` returned an honest empty registry response because MINDEX does not expose real model rows yet: `status: model_registry_unavailable`, `upstream_status: 404`.
- Browser smoke on `/sensing/sine` showed the shared SINE workbench, real NAS-backed file rows, the `Ground` signal filter, an audio element pointing at a real library file stream, and no Next.js error overlay.

This validation proves the frontend can sit in front of the real backend once Cursor ships it. It does **not** prove that the current backend is doing real AI classification. The missing model registry is the current backend truth.

June 6 browser recheck after the Website model-registry adapter:

- `http://localhost:3010/sensing/sine` returned 200 without Codex restarting the shared dev server.
- `http://localhost:3010/api/mindex/sine/status` returned 200 with `status: ok`, `acoustic_blobs: 2180`, and seven registered detectors.
- `http://localhost:3010/api/mindex/sine/models` returned 200 with `status: model_registry_unavailable`, `models: []`, and `upstream_status: 404`.
- Browser smoke showed the acoustic Library loaded real rows: `2,180 files`, `36 shown from 36 loaded`, and a real ESC-50 WAV stream with audio `readyState: 4`.
- The visible scope reported `Browser scope loaded 8,192 waveform points and 256 x 1024 spectrogram cells from the real audio stream`.
- The UI remained honest: detector/model-missing state was visible, and no real model runtime was claimed.

June 6 header-readiness update:

- The Website SINE header now separates `Detectors` from `AI models`.
- A reachable detector endpoint still shows detectors as active, but the `AI models` card remains `not loaded` unless MINDEX returns real trained model/runtime/artifact evidence.
- Cursor should use this as a quick visual acceptance check: after real model deployment, the Website header should move from `AI models: not loaded` to `AI models: live` only because `/api/mindex/sine/status` or `/api/mindex/sine/models` returns actual model provenance.

June 6 analyze request contract update:

- The Website now sends a JSON request body on every SINE analyze run, including short clips.
- The Website also appends query params that declare the evidence contract:
  - `require_real_audio=true`
  - `require_model_evidence=true`
  - `allow_detector_only=true`
  - `semantic_fallback=false`
  - `llm_fallback=false`
  - `prototype_matching=true`
  - `sound_transcripts=evidence_backed_only`
- The JSON body includes an `evidence_contract` object. Cursor should honor it exactly:
  - `require_real_audio_decode: true`
  - `require_model_provenance_for_semantic_labels: true`
  - `require_registered_model_for_identification_summary: true`
  - `require_evidence_links_for_sound_transcripts: true`
  - `allow_detector_only_response: true`
  - `allow_llm_semantic_fallback: false`
  - `allow_filename_semantic_fallback: false`
  - `allow_metadata_semantic_fallback: false`
  - `allow_mock_or_synthetic_outputs: false`
  - `expected_missing_model_status: "model_unavailable"`
- If MINDEX has no loaded trained model, the correct response is still useful DSP/detector evidence plus `model_status: model_unavailable`, empty `model_outputs`, empty semantic `sound_transcripts`, and no fake semantic `identification_summary`.
- June 6 BFF enforcement update: Codex also made the Website BFF inject this same evidence contract for both `POST /api/mindex/sine/blobs/{id}/analyze` and `POST /api/natureos/mindex/library/classify?id={id}`. Cursor should expect the contract even when the frontend caller does not manually provide it.
- Codex smoke-tested the current backend through the Website BFF with this contract against real short ESC-50 blobs. The backend accepted the request but still returned `identification_summary.top_label = bird_likely` with zero `model_outputs`, zero `fusion_evidence`, zero `sound_transcripts`, no `model_status`, and one unproven `deep_signal_matches` row.
- The Website now flags that shape as `Semantic contract violation`.
- Cursor must fix this backend behavior: if there is no real model/prototype evidence, return `model_status: model_unavailable`, keep semantic labels empty, and do not send label-shaped deep-signal rows as proof.

June 6 strict Website rejection update:

- Codex tightened the SINE player again after a fresh `localhost:3010` POST analyze probe reproduced the failure.
- Current failing response signature:
  - HTTP 200
  - `status: complete`
  - `identification_summary.top_label: bird_likely`
  - missing `model_status`
  - `model_outputs: []`
  - `fusion_evidence: []`
  - `sound_transcripts: []`
  - one unproven `deep_signal_matches` row
  - detector/DSP rows present: 12 frequency detections and one activity segment
- The Website now treats **all** of the following as contract failures:
  - completed analysis without `model_status`
  - semantic `identification_summary` without real semantic evidence
  - model-like prediction rows without model identity, runtime, artifact/checksum, label-map, or training provenance
  - semantic `fusion_evidence` rows not linked to model output or prototype evidence
  - transcript prose without `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`
  - `deep_signal_matches` / prototype-like labels without stable prototype identity, source/model/vector proof, and score/distance
- Browser verification on `/sensing/sine` now loads real files and audio, but visibly shows `MINDEX contract failed` / `Semantic contract violation` until Cursor fixes the backend.

June 6 proxy hardening update:

- The Website SINE BFF now URL-encodes blob IDs on `GET /api/mindex/sine/blobs/{id}/analysis` and `GET /api/mindex/sine/blobs/{id}/visualisation`.
- The Website SINE BFF now adds explicit timeout/error JSON for analysis, visualisation, model registry, and prototype registry requests instead of letting upstream outages become brittle frontend route failures.
- This does not make SINE real. It only means the frontend will keep showing honest states such as `analysis_unavailable`, `visualisation_unavailable`, `model_registry_unavailable`, and `prototype_catalog_unavailable` while Cursor builds the real MINDEX services.
- Cursor should preserve this behavior by returning structured JSON with stable statuses for queued/running/missing-model/error states.

June 6 MINDEX Library semantic-gate update:

- The MINDEX Library acoustic embed now refuses to promote a `classification.identification_summary` into the selected file unless the classify payload also contains real semantic evidence:
  - `model_outputs`
  - `fusion_evidence`
  - provenance-backed `deep_signal_matches`
  - evidence-linked `sound_transcripts`
- Detector-only classify responses can still populate raw detector arrays, but the Library card now says confirmed meaning still needs model/prototype/transcript evidence.
- Cursor should expect the Website to treat bare `identification_summary` responses as incomplete, even if the upstream classify call returns HTTP 200.

June 6 evidence checklist update:

- The Website SINE stack panel now includes a readiness checklist that Cursor can use as a visual acceptance gate.
- Checklist items:
  - Real Library audio
  - High-definition scope
  - Registered model runtime
  - Per-run model output
  - Prototype/fingerprint match
  - Fusion evidence
  - Evidence-backed transcript
  - Semantic contract clean
- Backend work is not acceptable until the model/prototype/fusion/transcript rows move from missing to ready for at least one real short ESC-50 run, and long-file MBARI windows return either queued state or honest missing-model state without fake semantics.

June 6 readiness tier update:

- The Website now summarizes checklist state into one readiness tier:
  - `MINDEX contract failed`: semantic output came back without required proof, or mock/Gemini/synthetic markers were found.
  - `Instrument ready / AI pending`: real file and high-definition scope are ready, but trained model runtime is missing.
  - `Library signal ready`: a real acoustic file is selected, but scope/model evidence is not ready yet.
  - `Scientific classifier ready`: model runtime, per-run model output, prototype/fingerprint evidence, fusion evidence, transcript evidence, and clean semantic contract are all present.
- Cursor should treat `Scientific classifier ready` on a real ESC-50 run as the frontend acceptance target for P0.
- `Instrument ready / AI pending` proves the Website and Library plumbing, not backend AI completion.
- `MINDEX contract failed` means the backend is returning semantic labels without required evidence and must be corrected before deployment is called real.

## Current Product Truth

Working pieces:

- The NAS-backed acoustic library exists.
- `library.blob` contains real acoustic rows.
- The website can list SINE/acoustic files.
- Audio streams can play when the BFF and backend are reachable.
- Wave annotations and human identification routes were added by Cursor.
- The frontend has been upgraded to show real model evidence when MINDEX returns it.
- The frontend now polls `GET /api/mindex/sine/blobs/{id}/analysis` when `POST /analyze` or the latest analysis returns queued/running/pending status.
- The Website BFF now forwards high-definition `visualisation` query params to MINDEX instead of dropping them.
- The Website SINE player now sends bounded windowed analysis requests for long recordings instead of disabling `Run SINE analysis`.
- The Website SINE player now sends an explicit no-fallback evidence contract with every analyze request.

The critical failure:

- The current `POST /api/mindex/sine/blobs/{id}/analyze` response is not enough.
- It can look like analysis while still being detector-only, shallow heuristic, or non-evidence-backed.
- `Run SINE analysis` must not be called done until it runs real model inference or honestly reports `model_unavailable`.
- Queued/running state is acceptable for long jobs only if MINDEX provides a stable job/status and later returns real persisted model evidence.
- Returning `identification_summary` without `model_outputs`, `fusion_evidence`, prototype/deep-signal matches, or evidence-backed `sound_transcripts` is now considered a Website-visible contract violation.

Cursor should treat the current analysis code as a shell to upgrade, not as a completed classifier.

## Non-Negotiable Rules

- No mock data in production SINE endpoints.
- No fake classifications.
- No filename-derived labels.
- No source-metadata-derived labels.
- No Gemini, LLM, MYCA, or prompt-only classifier as the primary detection engine.
- No synthetic detector rows to make the UI look full.
- No natural-language `sound_transcripts` unless they are backed by real audio evidence.
- No overwriting model predictions with human labels.
- No raw tokens, passwords, or secret values in API responses, docs, logs, or status payloads.
- No raw NAS absolute path leakage to the public website unless it is an internal-only admin field.

LLMs and MYCA can later explain confirmed analysis. They must not invent the detections.

## What "Real SINE Analysis" Means

For a selected `library.blob` acoustic file, the backend must prove the following:

1. It resolved the real DB row and physical NAS file.
2. It decoded the real audio bytes.
3. It normalized and windowed the real samples.
4. It computed deterministic DSP features from the samples.
5. It ran at least one registered neural model or returned an honest missing-model state.
6. It optionally ran prototype/fingerprint retrieval against stored embeddings.
7. It fused model evidence, DSP evidence, and prototype evidence.
8. It created time-bounded events and transcripts with evidence links.
9. It persisted the entire run for later review, replay, evaluation, and training.
10. It exposed enough provenance for the frontend to show why the model said what it said.

A 200 response with only `frequency_detections`, `activity_segments`, or a bare `identification_summary` is not real SINE analysis.

## Required API Contract

Keep and upgrade these existing endpoints:

- `GET /api/mindex/sine/status`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `GET /api/mindex/library/blobs/{id}`

Add or complete these endpoints:

- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/prototypes`
- `GET /api/mindex/sine/models/{model_id}`
- `POST /api/mindex/sine/models/register`
- `POST /api/mindex/sine/prototypes/build`
- `GET /api/mindex/sine/analysis-runs/{run_id}`
- `GET /api/mindex/sine/analysis-runs/{run_id}/events`
- `GET /api/mindex/sine/analysis-runs/{run_id}/transcripts`
- `POST /api/mindex/sine/human-identifications`
- `GET /api/mindex/sine/human-identifications?blob_id=...`
- `GET /api/mindex/sine/training/review-queue`
- `POST /api/mindex/sine/training/review-queue/{id}/resolve`

Existing website BFF routes should continue proxying to MINDEX 189. Do not move SINE inference through MAS.

## Website Model Registry Contract

Codex updated the shared SINE player on June 6 so it can recognize several truthful model-registry shapes from MINDEX. Cursor can use the exact fields below without needing another frontend pass:

- model identity: `model_id`, `active_model_id`, `model_name`, `name`, `registry_id`
- model collections: `models`, `registered_models`, `model_registry`, `loaded_models`
- readiness: `model_ready`, `model_loaded`, `is_loaded`, `loaded`, `ready`, or `status: model_ready`
- runtime proof: `framework`, `inference_framework`, `runtime`, `inference_runtime`, `runtime_name`, `engine`
- artifact proof: `artifact_uri`, `artifact_path`, `artifact`, `model_path`, `checkpoint_path`
- checksum proof: `model_checksum`, `artifact_sha256`, `checksum`, `sha256`
- deployment proof: `device`, `inference_device`, `backend_commit`, `git_commit`, `git_sha`, `last_inference_at`, `last_successful_inference_at`
- count proof: `models_loaded`, `loaded_models`, `model_count`, `total_models`, `loaded_count`

The frontend will only display `Model runtime live` when the backend proves both readiness and provenance. A status string alone is not enough. Do not set loaded/ready/live if the artifact is missing, checksum validation failed, the runtime did not load, or the service only has deterministic detectors.

## Website Prototype Catalog Contract

Codex added a Website BFF and UI readout for Cursor's real prototype/fingerprint catalog:

- Website BFF: `GET /api/mindex/sine/prototypes`
- MINDEX upstream: `GET /api/mindex/sine/prototypes`
- Missing upstream behavior: if MINDEX returns 404, Website returns a 200 JSON state with `status: prototype_catalog_unavailable`, `prototypes: []`, and an explanatory message.

Cursor can return prototype rows under any of these collection keys:

- `prototypes`
- `prototype_catalog`
- `catalog`
- `items`
- `rows`

The Website will display these fields when present:

- identity: `id`, `prototype_id`, `registry_id`, `embedding_id`
- label: `label`, `name`, `prototype_label`, `class_name`, `event_type`, `category`
- domain/category: `domain`, `acoustic_domain`, `environment`, `category`, `event_family`, `type`
- source: `source`, `source_id`, `source_name`, `dataset`
- model link: `model_id`, `embedding_model_id`, `embedding_model`, `model`
- vector proof: `embedding_dim`, `embedding_dimension`, `vector_dim`, `dimensions`, `vector_checksum`, `embedding_checksum`, `checksum`, `sha256`
- corpus size/license: `prototype_count`, `count`, `examples`, `example_count`, `license`
- timestamps: `updated_at`, `created_at`, `last_built_at`

The frontend treats prototype registry rows as readiness evidence for the 512D/prototype layer, but it still does not treat them as a classification for a selected recording. Confirmed recording meaning still requires per-run proven `model_outputs`, model/prototype-backed `fusion_evidence`, provenance-backed `deep_signal_matches`, or evidence-backed `sound_transcripts`.

June 6 strict prototype/deep-signal gate:

- `deep_signal_matches` no longer count as semantic evidence merely because the array exists.
- Each per-run prototype/deep-signal row must include:
  - a score, confidence, similarity, distance, cosine distance, or OOD distance
  - a stable prototype identity such as `prototype_id`, `prototype_match_id`, `matched_prototype_id`, `nearest_prototype_id`, `catalog_id`, `registry_id`, `embedding_id`, or vector checksum
  - source/model/vector proof such as `source`, `dataset`, `corpus`, `model_id`, `embedding_model_id`, `embedding_model`, `embedding_dim`, `vector_dim`, `vector_checksum`, `embedding_checksum`, or `sha256`
- Rows containing mock/synthetic/generated/placeholder/plausible/Gemini/AI-Studio/metadata-derived/filename-derived/heuristic-fallback markers are quarantined and cannot count as classifier evidence.
- Global prototype catalog rows can make the architecture layer show `observed`, but they do not make the selected recording's `Prototype / fingerprint match` checklist row ready.
- The selected recording checklist only marks `Prototype / fingerprint match` ready when this run returns a proven per-run prototype/deep-signal match.
- `fusion_evidence` only counts as semantic evidence when it links to a model output or prototype identity and has a semantic label plus score/weight. Detector-only fusion rows may remain visible for debugging but do not confirm meaning.
- `sound_transcripts` only count as evidence-backed when they include `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`.

## Required Analyze Response Shape

`POST /api/mindex/sine/blobs/{id}/analyze` should return a payload shaped like this when a real run completes:

```json
{
  "status": "complete",
  "analysis_run_id": "uuid",
  "blob_id": "uuid",
  "job_id": "uuid-or-null",
  "model_status": "model_ready",
  "identification_summary": {
    "top_label": "thunder_lightning",
    "category": "weather_impulse",
    "type": "lightning",
    "confidence": 0.91,
    "ood_score": 0.14,
    "evidence_ids": ["model-output-id", "detector-event-id", "fusion-id"]
  },
  "activity_segments": [
    {
      "id": "detector-event-id",
      "start_sec": 1.2,
      "end_sec": 2.8,
      "confidence": 0.86,
      "feature_source": "rms_energy_segmenter"
    }
  ],
  "frequency_detections": [
    {
      "id": "detector-event-id",
      "start_sec": 1.2,
      "end_sec": 2.8,
      "freq_hz": 340.0,
      "confidence": 0.74,
      "feature_source": "stft_peak_tracker"
    }
  ],
  "model_outputs": [
    {
      "id": "model-output-id",
      "model_id": "sine-esc50-resnetish-v1",
      "model_name": "SINE ESC-50 Environmental Head",
      "model_version": "2026.06.06",
      "framework": "pytorch",
      "runtime": "torchscript",
      "artifact_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/model.ts",
      "model_checksum": "sha256...",
      "backend_commit": "git-sha",
      "job_id": "analysis-job-id",
      "inference_id": "window-inference-id",
      "device": "cpu",
      "input_sample_rate_hz": 32000,
      "window_samples": 128000,
      "embedding_dim": 512,
      "start_sec": 0.0,
      "end_sec": 4.0,
      "latency_ms": 41.2,
      "ood_score": 0.14,
      "top_labels": [
        {
          "label": "thunder_lightning",
          "score": 0.91,
          "category": "weather_impulse"
        }
      ],
      "feature_params": {
        "frontend": "SINEFrontendV1",
        "n_fft": 1024,
        "hop_length": 320,
        "n_mels": 128,
        "pcen": true
      }
    }
  ],
  "deep_signal_matches": [
    {
      "id": "prototype-match-id",
      "label": "lightning_impulse_proto",
      "score": 0.88,
      "prototype_id": "prototype-id",
      "source": "MINDEX acoustic prototype catalog",
      "segment_start": 1.2,
      "segment_end": 2.8,
      "embedding_model_id": "sine-embed-v1"
    }
  ],
  "fusion_evidence": [
    {
      "id": "fusion-id",
      "label": "lightning",
      "confidence": 0.89,
      "start_sec": 1.2,
      "end_sec": 2.8,
      "model_output_ids": ["model-output-id"],
      "detector_event_ids": ["detector-event-id"],
      "prototype_ids": ["prototype-id"],
      "reason": "Impulse energy, broad-band spectral burst, and prototype similarity support lightning over UAV rotor."
    }
  ],
  "sound_transcripts": [
    {
      "id": "transcript-id",
      "start_sec": 1.2,
      "end_sec": 2.8,
      "label": "Lightning impulse",
      "description": "Short high-energy broadband impulse with rapid decay and no sustained rotor harmonic series.",
      "sound_source": "Lightning or thunder impulse",
      "confidence": 0.89,
      "frequency_range": "80 Hz - 9000 Hz",
      "evidence_ids": ["fusion-id", "model-output-id", "detector-event-id"]
    }
  ],
  "diagnostics": {
    "latency_ms": 320,
    "sample_rate_in": 44100,
    "sample_rate_model": 32000,
    "channels": 1,
    "duration_sec": 5.0,
    "windows_analyzed": 2,
    "decode_backend": "soundfile",
    "device": "cpu"
  }
}
```

If no model is available, return this kind of honest response:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "model_outputs": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "identification_summary": null,
  "activity_segments": [],
  "frequency_detections": [],
  "diagnostics": {
    "reason": "No registered acoustic model artifact is loaded."
  }
}
```

The frontend will show `Model evidence pending` until model evidence, fusion evidence, or evidence-backed transcripts exist.

## Analysis Pipeline

### Layer 0 - Audio Frame Decoder

Implement a robust decoder that supports:

- WAV
- FLAC
- MP3 if ffmpeg is available
- mono and multi-channel files
- channel selection and channel averaging
- sample-rate conversion
- fixed-duration windows
- long-file chunking
- file hash or content hash verification

Preferred Python stack:

- `soundfile` for WAV/FLAC where possible
- `ffmpeg`/`ffprobe` for broad codec inspection and fallback decode
- `torchaudio` if installed and compatible
- `numpy` for sample arrays

Decoder output should include:

- original sample rate
- model sample rate
- channels
- duration
- window start/end
- peak normalization stats
- clipping count
- RMS/noise floor stats
- decode errors if any

### Layer 1 - Deterministic DSP

Compute real features from samples:

- STFT
- log-mel spectrogram
- PCEN where useful
- FFT peaks
- spectral centroid
- spectral bandwidth
- spectral rolloff
- spectral flatness
- RMS envelope
- zero-crossing rate
- MFCC baseline
- activity segments
- impulse events
- harmonic stacks
- rotor blade-pass candidates
- whale/animal vocal sweep candidates
- ground/seismic low-frequency impulse candidates

DSP rows are not semantic truth by themselves. They are evidence.

### Layer 2 - Neural Model Runtime

Add at least one production model runtime:

- PyTorch eager, TorchScript, or ONNX Runtime.
- The model must load from a registered artifact.
- The model must have a label map.
- The model must have a checksum.
- The model must have a version.
- Runtime status must say whether it is loaded or unavailable.

P0 model:

- Build or load a real ESC-50/environmental audio classifier.
- ESC-50 is already present in the acoustic NAS library and is best for fast proof.
- A modest model is acceptable if it is real, auditable, and tested.

P1/P2 model families:

- CNN/log-mel environmental classifier.
- CRNN/GRU temporal classifier for repeated or evolving sounds.
- Audio Spectrogram Transformer or equivalent transformer model for broader semantic audio.
- Contrastive embedding model for prototype search.
- Specialized branches for marine, air, ground, rotor, animal, insect, weather, explosion, and device/mechanical sounds.

Recommended modern model direction:

- Baseline CNN/ResNetish first for P0.
- Add CRNN for temporal event structure.
- Add transformer or pretrained embedding model for broad acoustic semantics.
- Add domain-specific heads as the dataset grows.

### Layer 2A - Concrete P0 Model Stack

Cursor should build a real, modest, auditable first model rather than waiting for the perfect classifier.

Required P0 backend modules or equivalents:

- `mindex_api/services/sine_acoustic/decoder.py`
- `mindex_api/services/sine_acoustic/features.py`
- `mindex_api/services/sine_acoustic/model_registry.py`
- `mindex_api/services/sine_acoustic/inference.py`
- `mindex_api/services/sine_acoustic/prototypes.py`
- `mindex_api/services/sine_acoustic/fusion.py`
- `mindex_api/services/sine_acoustic/transcripts.py`
- `mindex_api/services/sine_acoustic/jobs.py`
- `mindex_etl/jobs/train_sine_esc50_p0.py` or equivalent training/export script

Minimum real P0 path:

1. Train or load a PyTorch ESC-50 classifier from the real NAS ESC-50 clips.
2. Convert input audio to mono, fixed sample rate, bounded windows.
3. Compute log-mel or PCEN spectrogram tensors.
4. Run a real CNN/ResNetish model under `torch.no_grad()`.
5. Export or register the model as PyTorch eager, TorchScript, or ONNX.
6. Save artifact, label map, version, training config, metrics, and checksum under NAS model storage.
7. Register the model in the database.
8. Return and persist `model_outputs[]` with real logits/probabilities/top labels.

Acceptable P0 model quality:

- It does not need to be perfect.
- It does need to be real.
- It must report confidence/OOD honestly.
- It must expose confusion cases for later improvement.
- It must not pretend ESC-50 can identify every whale, UAV, lightning, or seismic event.

Preferred P0 model architecture:

- input: log-mel or PCEN spectrogram
- backbone: small CNN, ResNetish, EfficientNet-lite, or CRNN
- output: ESC-50/environmental labels plus top-k scores
- optional embedding: 128D-512D penultimate layer for prototype search

P1 model architecture targets:

- CRNN/GRU or Conformer-like temporal model for repeated patterns, rotor harmonics, insects, and animal vocal sequences
- Audio Spectrogram Transformer or equivalent transformer encoder for broader semantic classification
- domain-specific classifier heads for water, air, and ground
- contrastive or metric-learning embedding model for prototype/fingerprint retrieval

### Layer 2B - Neural And Conventional Pattern Detection Requirements

The backend should combine conventional signal processing with neural inference.

Conventional pattern detectors:

- onset and activity detection
- FFT peak tracking
- harmonic stack detection
- rotor blade-pass frequency detection
- impulse/burst detection
- broadband explosion/lightning/thunder signatures
- low-frequency ground/seismic rumble windows
- tonal sweep detection for animal and marine vocalizations
- repeated chirp/stridulation patterns for insects
- dynamic-time-warping or cross-correlation for known call/prototype motifs where useful

Neural model evidence:

- ESC-50/environmental classifier for P0
- bird/animal acoustic model branch after P0
- marine/hydrophone model branch after P0
- UAV/rotor/mechanical branch after P0
- ground/seismic/weather/impulse branch after P0
- transformer or pretrained embedding branch after P0 for broad semantic audio context

Fusion rule:

- DSP can suggest "rotor-like harmonic series" or "broadband impulse".
- Neural models can suggest semantic categories.
- Prototype matching can suggest nearest known examples.
- The final label must cite those pieces through evidence IDs.
- If the evidence disagrees, return contested/low-confidence rather than forcing a clean answer.

### Layer 2C - Model Artifact And Training Data Contract

Model artifacts should live under NAS-backed MINDEX model storage, not inside the website repo.

Recommended storage layout:

```text
/mnt/nas/mindex/models/acoustic/
  sine-esc50-resnetish-v1/
    model.pt or model.ts or model.onnx
    labels.json
    train_config.json
    metrics.json
    checksum.sha256
    README.md
  sine-embed-v1/
    model.pt or model.onnx
    labels.json
    prototype_config.json
```

Training data records must connect back to MINDEX:

- source dataset
- license
- `library.blob` IDs
- split: train/validation/test
- preprocessing config
- sample rate
- channel behavior
- labels and ontology IDs
- excluded files and reasons
- model version produced from the data

Do not ship a model without a label map and a reproducible training/export note.

### Layer 2D - Evaluation Contract

Cursor must produce metrics before calling the model live.

Minimum metrics:

- validation accuracy
- macro F1
- per-class precision/recall where feasible
- confusion matrix
- top-1 and top-5 accuracy
- OOD behavior on unknown/MBARI windows
- latency per 5-second and 30-second window
- CPU memory behavior on VM 189

The completion report should include one example where the model is wrong or uncertain. SINE needs to learn from corrections; hiding bad cases is not acceptable.

### Layer 3 - Prototype And Fingerprint Retrieval

Build a real prototype catalog:

- Store 512D embeddings or chosen embedding dimension.
- Store prototype label, domain, source, license, and evidence file IDs.
- Use cosine similarity or nearest-neighbor search.
- Return top-k prototype matches for each window.
- Persist every match with model and vector metadata.

Prototype categories must include air, water, and ground. Do not limit the system to birds and rotors.

### Layer 4 - Evidence Fusion

Create a fusion service that decides what to show as the likely identity.

Fusion inputs:

- model outputs
- DSP events
- prototype matches
- source/channel context
- human correction history
- model calibration/OOD score

Fusion outputs:

- top label
- category
- confidence
- OOD score
- start/end time
- supporting evidence IDs
- disagreement flags

Do not claim high confidence if the model is out of distribution or if evidence conflicts.

### Layer 5 - Sound Transcript Narrator

Generate chronological sound transcripts only from evidence.

Transcripts should describe physical acoustic mechanics:

- frequency sweeps
- impulse bursts
- harmonic series
- rotor blade-pass patterns
- cavitation
- broadband noise
- vocalization calls
- insect stridulation
- seismic/ground pulses
- low-frequency rumble
- electrical/mechanical hum

Each transcript row must have:

- start/end time
- label
- sound source
- confidence
- frequency range
- evidence IDs

No evidence IDs means no transcript row.

## Required Sound Domains

The SINE backend must support these top-level acoustic domains:

- `water`
- `air`
- `ground`
- `unknown`

Within those domains, the model/prototype taxonomy must be able to represent:

- marine mammals
- fish and aquatic animal sounds
- birds
- insects
- land animals
- amphibians
- weather
- lightning/thunder
- earthquake and seismic events
- soil/underground acoustic events
- explosions
- gunshot/impact/impulse events
- boats and ship propellers
- cavitation
- submarine or industrial machinery hums
- UAV/quadcopters
- helicopters
- aircraft
- terrestrial vehicle motors
- pumps/fans/blowers
- Mycosoft device sounds
- hydrophone/transducer/microphone source types
- unknown/OOD sound

The UI may show short labels, but the backend should use a real ontology table rather than hard-coded strings.

## Human Correction And Active Learning

Morgan needs to correct the model when it is wrong. Example:

- model says `UAV`
- human knows it is `lightning`

The backend must:

- save the human label
- keep the model label
- mark the example as contested
- preserve confidence and evidence from both sides
- queue it for training/prototype review
- allow later model review to decide whether the human or model was wrong
- never silently overwrite the original model result

Required tables or equivalent:

- `library.acoustic_human_identification`
- `sine.human_review_queue`
- `sine.training_example`
- `sine.model_evaluation_case`

Human labels should store:

- blob ID
- optional analysis run ID
- optional window start/end
- human label
- human category
- notes
- confidence or certainty
- reviewer identity if available
- whether it disputes model output
- related model output ID
- created timestamp

## Database Schema Requirements

Add or complete a `sine` schema. Suggested tables:

- `sine.model_artifact`
- `sine.model_label_map`
- `sine.model_runtime_status`
- `sine.analysis_run`
- `sine.audio_window`
- `sine.detector_event`
- `sine.model_output`
- `sine.prototype`
- `sine.prototype_embedding`
- `sine.prototype_match`
- `sine.fusion_evidence`
- `sine.sound_transcript`
- `sine.human_review_queue`
- `sine.training_example`
- `sine.model_evaluation_case`

Minimum required indexes:

- `analysis_run(blob_id, created_at desc)`
- `detector_event(analysis_run_id, start_sec, end_sec)`
- `model_output(analysis_run_id, model_id, start_sec, end_sec)`
- `fusion_evidence(analysis_run_id, start_sec, end_sec)`
- `sound_transcript(analysis_run_id, start_sec, end_sec)`
- `human_review_queue(status, priority, created_at)`
- `prototype(domain, category, label)`

If vector search is available, use pgvector or equivalent for prototype embeddings. If not, implement bounded cosine search in Python for P0 and document the upgrade path.

## Status Endpoint Requirements

`GET /api/mindex/sine/status` must be honest.

Return:

- service status
- detector count and names
- loaded model count
- registered model count
- model IDs
- model versions
- framework/runtime
- artifact checksum
- load state
- device
- last successful inference
- prototype count
- review queue count
- recent error summaries

Do not return `model_ready`, `calibrated`, or `locked` unless the backend proves that state.

Example:

```json
{
  "product": "SINE",
  "status": "partial",
  "detectors_registered": 7,
  "models_registered": 1,
  "models_loaded": 1,
  "models": [
    {
      "model_id": "sine-esc50-resnetish-v1",
      "model_version": "2026.06.06",
      "framework": "pytorch",
      "runtime": "torchscript",
      "checksum": "sha256...",
      "loaded": true,
      "device": "cpu",
      "last_successful_inference_at": "2026-06-06T00:00:00Z"
    }
  ],
  "prototype_count": 320,
  "review_queue_count": 4
}
```

## Visualisation Requirements

The frontend now asks for oscilloscope-grade visualisation data.

`GET /api/mindex/sine/blobs/{id}/visualisation` must honor:

- `start_sec`
- `end_sec`
- `max_waveform_points`
- `waveform_points`
- `waveform_buckets`
- `max_spectrogram_columns`
- `spectrogram_columns`
- `max_spectrogram_rows`
- `spectrogram_rows`
- `n_fft`
- `hop_length`
- `window`
- `scale`
- `f_min`
- `f_max`
- `include_envelope`
- `include_rms`
- `include_power_db`
- `quality=oscilloscope`

Return:

- `duration_sec`
- `sample_rate_hz`
- `window_start_sec`
- `window_end_sec`
- `waveform.times`
- `waveform.amplitudes`
- `waveform.min`
- `waveform.max`
- `waveform.rms`
- `spectrogram.power_db`
- `spectrogram.frequencies`
- `spectrogram.times`
- `feature_params`

Current frontend probes requested high detail but the backend still returned only old low-resolution visualisation. Cursor must make the backend actually produce the requested resolution or return an honest bounded limit field explaining the clamp.

## Long File Handling

MBARI and hydrophone recordings can be large. Do not synchronously analyze entire huge files in one request.

Required behavior:

- Accept `start_sec`/`end_sec` for windowed analysis.
- Default long files to a bounded preview window.
- Queue longer jobs.
- Return `status: queued` or `status: running` with stable `job_id`.
- Let `GET /api/mindex/sine/blobs/{id}/analysis` return latest completed run or queued state.
- Persist partial window results.
- Do not block the website for huge files.

Frontend behavior already prepared:

- Website BFF now includes `GET /api/mindex/sine/models`, proxied to MINDEX `GET /api/mindex/sine/models`.
- The SINE player reads `/api/mindex/sine/status` and `/api/mindex/sine/models` on load.
- Runtime status can use model registry rows from either endpoint; a live model is only shown when model name plus framework/runtime/artifact/checksum/count proves real model provenance.
- The model evidence panel now renders registry proof fields when Cursor returns them:
  - `label_map_uri`
  - `label_map_checksum`
  - `label_count`
  - `domain_heads`
  - `target_domains`
  - `class_families`
  - `metrics_uri`
  - `training_dataset`
- Registered model rows can mark architecture layers as `observed`; per-clip model inference is still only marked as `evidence` when MINDEX returns real `model_outputs`, `fusion_evidence`, prototype matches, or evidence-backed transcripts.
- `POST /api/mindex/sine/blobs/{id}/analyze` is now called with query params and a JSON body when a window is chosen:
  - `start_sec`
  - `end_sec`
  - `windowed=true`
  - `window_source=selection|zoom|visible scope|playhead`
  - `mode=windowed` for long recordings or `mode=selected_region` for short selected regions
  - `scope` fields such as visual mode, frequency range, trigger level/edge/mode, waveform gain, and spectrogram contrast
  - basic file context for auditability
- `GET /api/mindex/sine/blobs/{id}/analysis` now forwards the submitted window and backend run identity during queued/running polling:
  - `start_sec`
  - `end_sec`
  - `windowed=true`
  - `window_source=selection|zoom|visible scope|playhead`
  - `job_id` when MINDEX returned one
  - `analysis_run_id` when MINDEX returned one
- For long recordings, the player chooses the window in this order: explicit selected region, zoom window, visible scope window, then a 60-second playhead window.
- The frontend caps the request window at 60 seconds and marks `truncated_to_sec` when the user-selected or zoomed window is longer.
- The frontend stores the exact submitted analysis window and reuses it while polling so MINDEX can return the intended persisted window result instead of unrelated latest whole-file analysis.
- When the latest analysis status contains `queued`, `pending`, `scheduled`, `accepted`, `running`, `processing`, `in_progress`, or `working`, the shared SINE player polls `GET /api/mindex/sine/blobs/{id}/analysis` every few seconds for a bounded number of attempts.
- The player shows a `polling` chip and keeps the run button disabled while MINDEX says the job is queued/running.
- The player does not fabricate completion. It waits for MINDEX to return persisted model outputs, fusion evidence, prototype matches, or evidence-backed transcripts.
- If the job remains queued/running too long, the player leaves the state honest and tells the user to refresh the latest analysis later.

## Source Repos To Inspect And Incorporate

Use these as implementation references. Do not cargo-copy old demos into production.

Detailed Codex audit:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Core SINE acoustic references:

- `https://github.com/dimastatz/deep-signal`
- `https://github.com/pschatzmann/arduino-audio-tools/wiki/Simple-Frequency-Detection`
- `https://github.com/microsoft/acoustic-bird-detection`
- `https://github.com/amsehili/auditok`
- `https://github.com/pcasabianca/Acoustic-UAV-Identification`
- `https://github.com/nationalparkservice/acoustic_discovery`

Additional neural/audio classifier references:

- `https://github.com/GorillaBus/urban-audio-classifier`
- `https://github.com/IBM/MAX-Audio-Classifier`
- `https://github.com/abishek-as/Audio-Classification-Deep-Learning`
- `https://github.com/daisukelab/ml-sound-classifier`
- `https://github.com/daisukelab/sound-clf-pytorch`
- `https://github.com/ilge/gmtk-audio-classification`
- `https://github.com/ksanjeevan/crnn-audio-classification`
- `https://github.com/imfing/audio-classification`
- `https://github.com/braydenoneal/neural-audio-classification`

Marine/mammal direction:

- Use the OVH marine mammal acoustic notebook and MBARI/NCEI source data as guidance for hydrophone/marine classification.

Required Cursor action:

- Audit each repo on Linux or in MINDEX.
- Record which code/concepts were used.
- Do not ship old unmaintained serving stacks directly.
- Prefer modern PyTorch/TorchScript/ONNX production paths.

## Codex Source Audit Notes For Cursor

Codex cloned or inspected the referenced repos into a temporary Website audit folder and extracted the implementation patterns below. Cursor should repeat or deepen this audit in the MINDEX repo before productionizing, but should not ignore these codebases.

Durable Codex audit source:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`

Temporary local clone workspace used during Codex audit:

Codex cloned/inspected the repos in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-temp\sine-audio-repo-audit` during this pass. Treat that temp folder as review scratch only. Cursor should repeat or deepen the audit inside MINDEX or on VM/Linux when implementing, and should review licenses before copying any external code.

Important: the `gmtk-audio-classification` checkout hit a Windows-invalid filename in an obsolete log path, but the Git object database was usable through `git show`. Audit it on Linux/VM if deeper work is needed.

### `GorillaBus/urban-audio-classifier`

Observed files:

- `README.md`
- `include/helpers.py`
- notebooks for MFCC, log-mel, augmentation, and evaluation

Useful patterns:

- UrbanSound8K fold-aware evaluation and metadata discipline.
- Log-mel spectrogram and MFCC comparison.
- Librosa audio normalization before feature generation.
- Padding/truncation for consistent feature width.
- Evaluation reporting with precision, recall, F1, and per-class accuracy.
- Data augmentation concepts: pitch shift, time stretch, noise.

Do not cargo-copy:

- Keras notebook workflow as production backend.
- Hard-coded UrbanSound-only taxonomy.

MINDEX use:

- Use as the environmental-sound evaluation baseline and fold/split discipline for P0 ESC-50/UrbanSound-style tests.
- Mirror the metrics/reporting ideas in `sine.model_evaluation_case` and `metrics.json`.

### `IBM/MAX-Audio-Classifier`

Observed files:

- `api/predict.py`
- `core/mel_features.py`
- `core/model.py`
- `core/vggish_input.py`
- `samples/class_labels_indices.csv`

Useful patterns:

- API request includes audio bytes, `start_time`, and optional label filter.
- Top-N response with `label_id`, `label`, and `probability`.
- VGGish-style embeddings and AudioSet label map.
- Model wrapper separates embedding generation, classifier preprocessing, model inference, and postprocessing.
- Standard fixed input handling: crop by timestamp, repeat/pad short embeddings, clamp/crop longer embeddings.

Do not cargo-copy:

- Old Flask/MAX framework.
- Old TensorFlow session graph runtime.
- Hidden in-memory model state without MINDEX artifact registry.

MINDEX use:

- Use the API shape and model wrapper separation.
- Modernize runtime to PyTorch/TorchScript/ONNX.
- Preserve `start_time`/window handling and top-k label output with model provenance.

### `abishek-as/Audio-Classification-Deep-Learning`

Observed files:

- `assets/Predict.py`
- `README.md`
- model comparison docs for ANN, CNN1D, CNN2D

Useful patterns:

- Simple MFCC extractor with mean aggregation.
- Comparison of ANN, 1D CNN, and 2D CNN shapes.
- Deployment proof that prediction latency and model quality should be compared, not assumed.

Do not cargo-copy:

- Django app.
- Keras `.h5` models.
- Hard-coded local `D:/UrbanSound8K` paths.
- LabelEncoder rebuilt from pickled data without registry/provenance.

MINDEX use:

- Keep as a negative/control baseline for simple MFCC-only model behavior.
- Use it to prove why SINE must store training config, label map, and artifact provenance.

### `daisukelab/ml-sound-classifier`

Observed files:

- `sound_models.py`
- `realtime_predictor.py`
- `lib_train.py`
- app configs/notebooks for UrbanSound, FSDKaggle, and laser-machine listener

Useful patterns:

- AlexNet/MobileNetV2-style classifiers over log-mel images.
- Real-time buffering with chunked audio, rolling log-mel conversion, and prediction ensembles.
- Geometric mean smoothing over recent predictions.
- Mixup, class balancing, precision/recall/F1/accuracy reporting.
- Multiple model heads for different application domains.

Do not cargo-copy:

- Old Keras/PB graph runtime.
- PyAudio desktop capture code as server backend.
- Hard-coded app configs.

MINDEX use:

- Use its streaming buffer and prediction-smoothing ideas for Psathyrella buoy/MQTT audio windows.
- Use mixup/class-balance ideas for training jobs.
- Use domain-specific config strategy for SINE branches: environmental, marine, rotor, ground/seismic, device sounds.

### `daisukelab/sound-clf-pytorch`

Observed files:

- `src/models.py`
- `src/libs.py`
- `src/augmentations.py`
- `advanced/create_wds_fsd50k.py`
- `for_evar/cnn14_decoupled.py`

Useful patterns:

- Strongest P0 implementation direction.
- PyTorch `ResNetish` model over single-channel audio spectrogram inputs.
- Log-mel spectrogram dataset class with fixed `unit_length`.
- Long-file split dataset that slices full spectrograms into fixed windows.
- Padding/center padding for short clips.
- Random crop for long clips.
- Augmentations over spectrogram tensors.
- PyTorch Lightning training wrapper with loss/accuracy logging.
- AdamW and class weights.

Do not cargo-copy:

- Notebook-only assumptions.
- CUDA-only device default.
- Old Lightning metric imports without checking current dependency versions.

MINDEX use:

- Make this the direct P0 template for `train_sine_esc50_p0.py`.
- Implement `SineLogMelDataset`, `SineWindowDataset`, and `SineResNetish`.
- Export TorchScript/ONNX and register artifact/checksum/label map in MINDEX.
- Use the split-window logic for MBARI and hydrophone files.

### `ilge/gmtk-audio-classification`

Observed files:

- `README.md`
- `alpha1/README.md`
- GMTK/HMM model files

Useful patterns:

- Real-time audio event detection uses temporal and frequency-domain signatures.
- AFTE/gammatone filterbank features with 8 channels.
- 1/3-second windows, roughly 15 fps event stream.
- Feature selection via Bhattacharyya distance, ROC, entropy, and t-test.
- HMM/GMM temporal smoothing and hysteresis to reduce false positives from short clinks/bangs.
- Duration priors for sustained events.

Do not cargo-copy:

- GMTK stack as production SINE backend.
- Old Java/WebSocket swarmlet tooling.
- Obsolete training artifacts.

MINDEX use:

- Implement modern temporal smoothing over detector/model events.
- Use hysteresis/duration constraints for rotor, applause-like, impulse, lightning/thunder, machinery, and acoustic activity lanes.
- Store smoothing parameters in model/runtime config.

### `ksanjeevan/crnn-audio-classification`

Observed files:

- `net/model.py`
- `data/transforms.py`
- `eval/infer.py`

Useful patterns:

- `AudioCRNN` combines mel spectrogram frontend, convolution stack, packed LSTM, and dense classification.
- Length-aware sequence handling avoids treating padded time as real evidence.
- Audio transforms include channel handling, additive noise, random crop, and duration modification.
- Inference code loads audio, applies transforms, predicts label/confidence, and can render a prediction heatmap.

Do not cargo-copy:

- Image-classification paths.
- Torchparse/config assumptions without simplification.

MINDEX use:

- Use as P1 temporal branch for whales, insects, rotors, repeated impacts, seismic pulses, machinery hum, and animal call sequences.
- Preserve length-aware window handling and event start/end mapping.

### `imfing/audio-classification`

Observed files:

- `feat_extract.py`
- `cnn.py`

Useful patterns:

- 193-dimensional hand-crafted feature vector:
  - MFCC
  - chroma
  - mel
  - spectral contrast
  - tonnetz
- Optional real-time microphone capture path.
- Simple Conv1D baseline over engineered features.

Do not cargo-copy:

- Keras 2017 runtime.
- Interactive prompts.
- Desktop microphone capture as server backend.

MINDEX use:

- Implement this style of engineered DSP vector as a `sine.detector_event`/baseline `sine.model_output` feature source.
- Use it as a fast CPU fallback feature vector, not final semantic truth.

### `ovh/ai-training-examples` marine notebook

Observed file:

- `notebook-marine-sound-classification.ipynb`

Useful patterns:

- Marine mammal classification over the Watkins/WHOI marine mammal data direction.
- 30-second window loading.
- Feature set:
  - chroma STFT
  - RMS
  - spectral centroid
  - spectral bandwidth
  - rolloff
  - zero-crossing rate
  - MFCC
  - harmony/perceptrual features
  - tempo
- Explicit label list for marine mammals.

Do not cargo-copy:

- Notebook/Keras dense model as production.
- CSV-only preprocessing as final architecture.

MINDEX use:

- Make a P1 marine/hydrophone branch using MBARI/NCEI/Watkins data.
- Use 30-second windowing and the feature list as deterministic marine DSP evidence.
- Modernize model runtime to PyTorch/ONNX.

### `braydenoneal/neural-audio-classification`

Observed files:

- `src/spectrogram.py`
- `src/neural_network.py`
- `src/predict.py`

Useful patterns:

- Converts WAVs to mel spectrogram image tensors.
- Uses PyTorch CNN.
- Saves model with TorchScript (`torch.jit.script(...).save(...)`).
- Provides a simple predict path that loads a TorchScript artifact.

Do not cargo-copy:

- Spectrogram-as-image folder hack as final SINE data model.
- Hard-coded `cuda`.
- Tiny image-classifier assumptions.

MINDEX use:

- Use TorchScript save/load pattern for model artifact deployment.
- Use visual spectrogram generation as a sanity/proof artifact only, not the main backend representation.

### Local AI Studio Prototype

Observed files:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\server.ts`
- `src/components/AcousticPlayer.tsx`
- `src/components/ModelExplorer.tsx`
- `src/components/SINEStatus.tsx`
- `src/data/acousticData.ts`

Useful frontend ideas:

- Chronological `sound_transcripts`.
- Model explorer vocabulary.
- High-contrast hydrophone lab aesthetic.
- Transcript narrator and architecture panels.

Do not cargo-copy:

- Gemini classifier.
- Mock acoustic rows.
- Generated WAVs.
- Metadata-derived labels.
- Simulated status/calibration.
- Prompt phrases like `construct highly realistic detection events` or `metadata for a recording` that generate classifier-shaped output without decoding real samples.

MINDEX/Website use:

- Website may keep the useful UI concepts only when backed by real MINDEX data.
- Backend must ignore the Gemini/mock server implementation.
- Website now quarantines AI Studio-style markers such as generated/programmatic WAVs, metadata prompt text, and server-side Gemini classifier wording. Cursor should remove these paths entirely from production MINDEX, not merely rely on frontend quarantine.

## Recommended Implementation Plan

### Phase A - Make The Current Backend Honest

1. Search production SINE code for fake or heuristic semantic labels.
2. Remove any reachable mock/Gemini/synthetic/filename-derived classifier paths.
3. Make analysis return `model_unavailable` if no registered model exists.
4. Keep real DSP output, but label it as DSP evidence only.
5. Update tests so a missing model never returns a fake semantic classification.

### Phase B - Build Real Visualisation And DSP

1. Implement robust audio decoder.
2. Implement configurable waveform envelope and spectrogram generation.
3. Persist visualisation metadata or cache if needed.
4. Add deterministic DSP detector events.
5. Test short ESC-50 and a 30-second MBARI window.

### Phase C - Add First Real Model

1. Train or load a real ESC-50 environmental classifier.
2. Register the artifact under NAS model storage.
3. Store checksum, label map, and model version.
4. Run inference on real decoded windows.
5. Persist `model_output`.
6. Return `model_outputs[]` to the website.

### Phase D - Prototype Retrieval

1. Compute embeddings for known clips.
2. Store prototype vectors and labels.
3. Add cosine similarity search.
4. Return `deep_signal_matches`.
5. Persist prototype match evidence.

### Phase E - Evidence Fusion And Transcripts

1. Fuse DSP, model, and prototype evidence.
2. Generate transcript rows only when evidence exists.
3. Link every transcript to evidence IDs.
4. Store `fusion_evidence` and `sound_transcript`.

### Phase F - Human Correction Loop

1. Store human identifications at clip and window level.
2. Mark disagreements as contested.
3. Queue contested examples for review/training.
4. Return latest human and model state together.
5. Do not mutate historical model results.

June 6 Website payload update:

- The Website human-identification payload now includes `selected_region`, `selected_region_measurements`, `scope_context`, and `training_review`.
- `selected_region_measurements` includes centroid, dB range, strongest acoustic band, and top peak frequencies when the user has selected a waveform/spectrogram region.
- `scope_context` includes the oscilloscope/spectrogram controls that were active when the human tag was saved.
- `training_review` marks whether model evidence, selected region evidence, and detector-event evidence were present.
- Cursor should persist these fields or map them into the SINE training/review queue. Do not drop them as unknown JSON; they are the link between human labels and the exact sound window the human reviewed.
- The Website now also reads `GET /api/mindex/sine/training/human-tags` through `GET /api/natureos/mindex/sine/training/human-tags?training_eligible_only=true`. Return human-tagged review rows under `human_identifications`, `human_tags`, `training_tags`, `items`, or `rows`, plus `total`, `total_count`, or `count` when available.

### Phase G - Domain Expansion

After P0 proves real inference:

1. Marine bioacoustics and hydrophone events.
2. UAV/rotor/mechanical signatures.
3. Weather/lightning/explosion/impact.
4. Ground/seismic/soil recordings.
5. Insects, birds, animals, amphibians.
6. Device/mechanical/field sensor sounds.

## Acceptance Tests

Cursor must provide test proof for all of these before saying complete.

### No Fake Classifier Test

Run:

```powershell
rg -n "Gemini|GoogleGenAI|mockAcousticBlobs|generateWavBuffer|synthetic|metadata-derived|filename-derived|heuristic fallback|fake label|demo label" mindex_api mindex_etl tests
```

Acceptance:

- No reachable production classifier code depends on those paths.
- If references remain in docs/tests, Cursor explains why they are not production paths.

### Missing Model Negative Test

Temporarily unregister or hide the model artifact.

Expected:

- `POST /api/mindex/sine/blobs/{id}/analyze` returns `model_status: model_unavailable`.
- `model_outputs` is empty.
- `fusion_evidence` is empty or explicitly detector-only with no semantic conclusion.
- `sound_transcripts` is empty.
- No fake `identification_summary`.

### ESC-50 Real Model Test

Use a short ESC-50 blob.

Expected:

- Analysis decodes the real WAV.
- Analysis returns at least one `model_outputs[]` row.
- Row includes model ID, version, runtime, checksum or artifact proof, start/end, and top labels.
- The result is persisted in DB.
- Frontend no longer shows `Model evidence pending` for that run.

### High-Definition Visualisation Test

Call:

```powershell
$id='<small-acoustic-blob-id>'
$params='start_sec=0&end_sec=5&max_waveform_points=8192&waveform_points=8192&waveform_buckets=8192&max_spectrogram_columns=1024&spectrogram_columns=1024&max_spectrogram_rows=256&spectrogram_rows=256&n_fft=2048&hop_length=128&window=hann&scale=linear&f_min=0&f_max=8000&include_envelope=true&include_rms=true&include_power_db=true&quality=oscilloscope'
Invoke-RestMethod "http://192.168.0.189:8000/api/mindex/sine/blobs/$id/visualisation?$params"
```

Expected:

- More than 800 waveform points when requested and feasible.
- Meaningful spectrogram dimensions beyond the old tiny preview when requested and feasible.
- Real `power_db`, frequencies, and times.
- Honest clamp metadata if bounded.

### MBARI Window Test

Use a large MBARI/hydrophone file but request a 30-second window.

Expected:

- Windowed visualisation works.
- Windowed analysis either completes or queues.
- API does not time out trying to analyze the full huge file.
- Results are persisted by window.

### Human Correction Test

Scenario:

- Model predicts `UAV`.
- Human tags the event as `lightning`.

Expected:

- Human tag saves.
- Model output remains unchanged.
- The example is marked contested.
- It appears in review/training queue.
- Later GET returns both human and model labels.

### Website BFF Smoke

From the Website dev machine when 3010 is running:

```powershell
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/status"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/blobs/<id>/visualisation?start_sec=0&end_sec=5"
Invoke-RestMethod -Method Post "http://localhost:3010/api/mindex/sine/blobs/<id>/analyze"
Invoke-RestMethod -Method Post "http://localhost:3010/api/natureos/mindex/library/classify?id=<id>"
```

Expected:

- SINE status reports real loaded models or honest missing-model state.
- Visualisation returns real waveform/spectrogram arrays.
- Analyze returns real model evidence or honest missing-model state.
- Classify mirrors/uses the same real SINE backend evidence path.

## June 6 Website Request Contract Update

Codex hardened the Website side so SINE calls now carry an explicit `sine_request` contract in addition to the existing `evidence_contract`.

Affected Website routes/components:

- `components/sensing/sine-acoustic-player.tsx`
- `app/api/mindex/sine/blobs/[id]/analyze/route.ts`
- `app/api/natureos/mindex/library/classify/route.ts`

Every analysis/classify request now asks MINDEX for:

- target domains: `water`, `air`, `ground`
- class families: marine bioacoustics, terrestrial bioacoustics, insect bioacoustics, air propellers, water propellers, vessel engines, lightning/weather, impulse/explosion, ground/seismic, mechanical, geophysical, unknown/OOD patterns
- model targets: deterministic DSP, log-mel ResNetish/CNN, CRNN/GRU temporal sequence model, audio spectrogram transformer, contrastive embedding, prototype cosine retrieval, evidence fusion, chronological sound transcript windows
- prototype matching: required
- out-of-domain scoring: required
- human review/correction path: required
- model provenance: required

Cursor backend requirement:

- Preserve and honor this `sine_request` body.
- Return an honest unsupported or missing-model state for any family not implemented yet.
- Do not collapse these families back into generic `bird` or `rotor` only.
- Do not return semantic labels for these families unless model/prototype/fusion evidence exists.
- Persist the requested domains/families/model targets on the analysis run so future training can see what the operator asked SINE to identify.

## Completion Report Required From Cursor

Cursor must provide:

- MINDEX commit hash.
- VM deploy status.
- Migrations applied.
- New files changed.
- Model artifact path.
- Model checksum.
- Label map path.
- Runtime used: PyTorch, TorchScript, or ONNX Runtime.
- Device used: CPU, CUDA, Jetson, etc.
- Test commands run.
- One real ESC-50 response summary.
- One MBARI 30-second window response summary.
- One missing-model negative test.
- One human correction round trip.
- Known limits.
- Any model categories not ready yet.
- Exact next steps for P1 models.

## Paste-Ready Cursor Prompt

```text
You are Cursor working in D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex.

Morgan QA-tested SINE audio and confirmed that Run SINE analysis is not doing real classification. Treat the current analyze/classify backend as a detector-shaped shell, not a completed acoustic AI system.

Build the real SINE acoustic backend. Acoustic only. Do not touch chemistry or unrelated MINDEX tabs.

Read this master handoff first:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md

Then read this detailed handoff:
D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md

Hard rules:
- no mock labels
- no Gemini/LLM classifier
- no filename-derived or source-metadata-derived classifications
- no fake sound_transcripts
- no synthetic detector rows
- if no model is loaded, return model_unavailable and no semantic label
- human corrections must be stored beside model predictions, not overwrite them

P0 deliverables:
1. Make current analyze path honest.
2. Decode real NAS audio from library.blob.
3. Produce real high-resolution waveform/spectrogram visualisation.
4. Compute real deterministic DSP features from samples.
5. Add one real PyTorch/TorchScript/ONNX model runtime.
6. Add one real ESC-50/environmental model head with registered artifact, checksum, label map, and version.
7. Persist analysis_run, detector_event, model_output, prototype_match, fusion_evidence, and sound_transcript rows.
8. Return model_outputs, fusion_evidence, and evidence-backed sound_transcripts when real evidence exists.
9. Add prototype/fingerprint retrieval path for future 512D deep-signal matching.
10. Store human corrections and queue contested examples for review/training.

Required tests:
- no reachable fake/Gemini/mock classifier paths
- missing model returns model_unavailable and no fake semantic label
- short ESC-50 file returns real model_outputs with provenance
- MBARI 30-second window does not timeout
- human correction model UAV vs human lightning stores both and marks contested
- Website BFF on 3010 can read status, visualisation, analyze, and classify

Do not call this complete until the Website SINE player can show real model evidence from MINDEX instead of Model evidence pending.
```
