# SINE Requirements Traceability Matrix - June 6 2026

Purpose: keep the SINE frontend, MINDEX backend, AI Studio prototype merge, ChatGPT spec, and external audio-code audit aligned around the real acoustic classifier objective. This document is acoustic-only.

## Scope

In scope:

- SINE acoustic player at `/sensing/sine`, `/sensing/sine/player`, and MINDEX Library -> Acoustic.
- Real NAS-backed acoustic files from MINDEX `library.blob`.
- High-definition waveform and spectrogram instrument UI.
- Deterministic DSP evidence, model runtime evidence, prototype matching, evidence fusion, sound transcripts, and human correction loops.
- Cursor backend work in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`.

Out of scope for this pass:

- Chemistry, GANDHA gas sensing, BlueSight visual sensing, Earth Simulator, DNA computing, PubChem, DWSIM, Cantera, and non-acoustic MINDEX tabs.

## Traceability Matrix

| Requirement | Current frontend evidence | Backend acceptance evidence still required |
| --- | --- | --- |
| Use real acoustic files, not mocks | Shared player loads MINDEX acoustic Library rows and streams NAS-backed audio. The no-fake guard rejects AI Studio mock/Gemini/generated-WAV paths. | MINDEX must return UUID-backed `library.blob` rows for all playable acoustic files; no playback-only rows for registered NAS files. |
| Merge useful AI Studio UI/schema concepts | `scripts/sine-aistudio-merge-audit.mjs` verifies chronological transcript UI, high-def scope UI, architecture/prototype panels, and human correction loop. | Do not deploy the AI Studio mock server. Backend must implement the schema with real model/prototype/fusion evidence. |
| Preserve ChatGPT backend spec | `scripts/sine-aistudio-merge-audit.mjs` verifies the pasted ChatGPT spec terms are present and carried into the Cursor prompt. | MINDEX must implement deterministic DSP, 512D embedding/prototype retrieval, Sound Transcripts, and diagnostics with real runtime evidence. |
| High-definition oscilloscope waveform/spectrogram | Browser-real-audio fallback renders 8192 waveform points and 256 x 1024 spectrogram cells. | Backend visualisation endpoint must honor `quality=oscilloscope`, `max_waveform_points=8192`, `max_frequency_bins=256`, `max_time_frames=1024`, `fft_size=2048`, `hop_length=128`, and `include_peaks=true`. |
| Analyze-path high-definition visualisation | Frontend sends `visualisation_quality` in the SINE evidence contract. | Current local MINDEX source now maps `request_contract.visualisation_quality` into `classify_acoustic_file(...)` / `run_full_analysis(...)` so `visualisation_sonic` can return oscilloscope density during analyze/classify, not only through the direct visualisation route. Cursor must deploy and verify this on VM 189. |
| Do not accept detector-only semantics | Shared player marks backend semantic labels as contract violations unless model/prototype/fusion/transcript proof exists. | Backend must return `model_unavailable`, `unknown`, or `out_of_domain` when no verified model/prototype evidence exists. |
| Real PyTorch/TorchScript/ONNX model runtime | Frontend exposes model registry readiness and keeps `AI models not loaded` visible when proof is absent. | MINDEX must load a checksum-verified model artifact, run inference on a real acoustic blob, persist `sine.model_output`, and expose model status through `/api/mindex/sine/models`. |
| Real inference runtime interface | Current local MINDEX source has `mindex_api/services/sine_acoustic/inference_runtime.py` with local artifact validation, artifact SHA-256 verification, label-map loading/checksum verification, TorchScript/ONNX dispatch, feature tensor generation, top-k label mapping, and explicit unavailable-runtime errors. | Cursor must install/verify Torch or ONNX Runtime in the MINDEX container, register a real model artifact, run this interface on a real blob, and persist the returned output to `sine.model_output`. |
| Model output persistence runner | Current local MINDEX source has `mindex_api/services/sine_acoustic/analysis_runner.py`; `/sine/blobs/{id}/analyze` can now attempt loaded registered models and write proven outputs into `sine.model_output` while returning honest blockers when no model/runtime/artifact is available. | Cursor must deploy/preserve this runner, install runtime deps, register a real artifact and label map, verify one real `sine.model_output` row from an ESC-50 blob, then add prototype matching, fusion evidence, and evidence-linked transcripts. |
| Model-backed fusion/transcript writer | Current local MINDEX source has `mindex_api/services/sine_acoustic/evidence_builder.py`; after a proven `sine.model_output` row exists, the runner can write `sine.fusion_evidence` and `sine.sound_transcript` rows that link to that model output. | Cursor must verify this on VM 189 with a real artifact-backed output, then add true prototype/vector matching and OOD handling. Fusion/transcripts must remain empty for detector-only or unproven model rows. |
| Prototype vector search seam | Current local MINDEX source has `mindex_api/services/sine_acoustic/prototype_search.py`; if a model runtime returns an embedding vector and `sine.prototype.metadata` contains stored vectors, it can persist cosine-scored `sine.prototype_match` rows with vector/prototype checksums. | Cursor must make the real registered model emit embeddings, populate `sine.prototype` from human-tagged/library examples, verify real prototype matches on VM 189, and add OOD thresholds/calibration. |
| Multi-output model embeddings | Current local `inference_runtime.py` supports direct logits, `[logits, embedding]`, `(logits, embedding)`, and dict outputs such as `{logits, embedding}`; successful inference now returns `embedding`, `embedding_sha256`, and `embedding_dim`. | Cursor's P0 TorchScript/ONNX export must return classification logits plus an embedding vector, then verify prototype search consumes that vector and persists `sine.prototype_match`. |
| Open-set / OOD model guard | Current local `inference_runtime.py` returns `confidence_margin`, `entropy`, `normalized_entropy`, `ood_score`, `ood_status`, `ood_threshold`, and `min_confidence`; current local `event_views.py` blocks low-confidence and OOD candidate model outputs from becoming `identification_summary`. | Cursor must calibrate these thresholds with validation data, persist the metrics on real `sine.model_output` rows, and prove ambiguous/OOD clips return unknown/OOD/queued review instead of confident semantic labels. |
| Frontend open-set evidence gate | Shared player now separates provenance-backed model rows from accepted model identity. Rows marked `low_confidence`, `out_of_domain`, `out_of_domain_candidate`, `unknown`, or review-like states remain visible as `Open-set review` evidence, but they do not satisfy semantic readiness or confirm sound meaning. The DOM exposes `data-sine-proven-model-outputs`, `data-sine-confirmed-model-outputs`, and `data-sine-open-set-review-outputs` for QA. `scripts/sine-phase-one-smoke.mjs` now applies the same rule in optional analysis probes: OOD/review model rows are counted as review evidence, not confirmed identity. | Cursor must return calibrated OOD fields on every real model row. A low-confidence/OOD row may be stored and reviewed, but it must not produce `identification_summary`, transcript identity, prototype/fusion acceptance, or a green ready state. |
| Real model feature/window input layer | Current local MINDEX source has `mindex_api/services/sine_acoustic/features.py` with deterministic audio windows, fixed-length padding/cropping, NumPy STFT, mel filterbank, log-mel spectrogram, feature tensor shape `[1, 1, n_mels, frames]`, and `feature_sha256`. | Cursor must wire `extract_sine_feature_tensor(...)` into the actual inference runner and persist feature/model/prototype provenance. |
| Conventional neural-network baselines | Cursor prompt maps requested repos to CNN, CRNN/GRU, ResNetish/VGGish, TorchScript, ONNX, and long-window inference work. | Backend tests must prove feature tensor shapes, model output rows, label-map checksum, top-k predictions, metrics, and confusion matrix for at least the P0 ESC-50 model. |
| Transformer/foundation embedding path | Frontend architecture panel represents embeddings as pending evidence, not as live truth. | Add AST, PaSST, BEATs, CLAP-style, or equivalent verified local artifact only when model files, checksums, and label/prototype metadata exist. |
| Prototype/fingerprint matching | Frontend requires prototype IDs, vector checksums, source/license, model ID, and score/distance before accepting deep-signal matches. | Persist `sine.prototype`, `sine.embedding`, and `sine.prototype_match`; compute cosine or explicit vector distances from real model embeddings. |
| Evidence fusion | Frontend requires fusion rows to link model outputs or prototype evidence. | Persist `sine.fusion_evidence` rows that link detector events, model outputs, prototype matches, confidence/OOD scores, and time windows. |
| Chronological Sound Transcripts | Frontend shows transcript windows only when linked to model, fusion, or prototype evidence IDs. | Backend must generate `sound_transcripts[]` only from evidence fusion, not filenames, dataset labels, LLMs, or detector-only rows. |
| Human correction training loop | Player lets a human correct a wrong identification while preserving model-vs-human separation. | Persist human tags as training-review evidence, mark contested examples, keep model history, and feed review rows into prototype/model retraining queues. |
| External audio code actually used | `SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md` maps each requested repo to a MINDEX implementation target. | Cursor must inspect local clones under `.codex-artifacts/sine-repos`, review licenses, and reimplement useful patterns in MINDEX style rather than ignoring them. |
| Navy/Psathyrella buoy usefulness | Frontend class scope includes air, water, ground, animal, insect, marine, rotor, explosive, seismic, and unknown/OOD target groups. | Backend must support long-file/windowed inference, hydrophone/field recording metadata, soil/ground/seismic categories, and open-set behavior suitable for buoy recordings. |
| Deployment readiness truth | `scripts/sine-release-gate.mjs` reports `frontend_ready_backend_pending`, not fake green. | Gate should move toward `ready` only after backend returns high-def visualisation, loaded model runtime proof, prototype rows, and evidence-backed classification/transcripts. |

## Required Verification Commands

Run from `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`:

```powershell
node scripts\sine-aistudio-merge-audit.mjs
node scripts\sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
node scripts\sine-phase-one-smoke.mjs --self-test
node scripts\sine-phase-one-smoke.mjs --base=http://localhost:3010 --run-analysis
```

Run from `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex` after backend changes:

```powershell
python -m pytest tests\test_sine_inference_runtime.py tests\test_sine_prototype_search.py tests\test_sine_classifier_visualisation_contract.py tests\test_sine_evidence_builder.py tests\test_sine_analysis_runner.py tests\test_sine_feature_extraction.py tests\test_acoustic_event_views.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_request_contract.py tests\test_sine_evidence_migration_contract.py tests\test_sine_acoustic_pipeline.py
```

Latest local Codex result after the OOD guard:

```text
46 passed, 1 skipped
```

Latest Website SINE gate on June 7:

```text
node scripts\sine-release-gate.mjs --base=http://localhost:3010
Status: frontend_ready_backend_pending
Checks: 43 pass, 7 warn, 0 fail
```

Cursor must add and pass the real-AI tests named in `SINE_REAL_AI_CLASSIFIER_BACKEND_CURSOR_PROMPT_JUN06_2026.md` before the backend can be called complete.

## Current Status

Frontend status: instrument surface and evidence gate are ready for backend integration.

Backend status: not complete. Current warnings are expected until MINDEX proves real model runtime, prototype catalog rows, high-definition backend visualisation, evidence fusion, and evidence-linked sound transcripts.
