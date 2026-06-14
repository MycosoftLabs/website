# SINE Cursor Backend Full Functional Handoff

Date: June 8, 2026

Owner handoff: Codex -> Cursor

Repos:

- Website: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
- MINDEX: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Do not stage or commit anything unless Morgan explicitly says to.

Do not include raw secrets in docs, logs, commits, prompts, or coordination notes. Use secret names, env var names, or local credential file paths only.

## One Sentence Objective

Make SINE a real acoustic classifier and acoustic intelligence workbench, not a detector-shaped UI: real NAS audio in, real DSP and model inference, real prototype/fingerprint matching, real evidence rows, real transcripts, human corrections stored separately, and no fake semantic identity when the backend has not proven it.

## Current User Finding

Morgan QA-tested SINE and found the important truth: `Run SINE analysis` is not actually doing real AI classification yet. The current system can stream files, draw waveform/spectrogram UI, run detector-shell work, and return HTTP 200 responses, but it does not yet prove learned acoustic meaning from a registered model artifact.

Cursor should treat this as a backend completion task. Do not defend detector-only labels as real classification.

## Current Frontend State

The Website frontend now has one shared SINE acoustic player component used in multiple places:

- `http://localhost:3010/sensing/sine`
- `http://localhost:3010/sensing/sine/player`
- `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

Important frontend files:

- `components/sensing/sine-acoustic-player.tsx`
- `components/mindex/tabs/library-tab.tsx`
- `app/sensing/[slug]/page.tsx`
- `app/sensing/sine/player/page.tsx`
- `components/natureos/mindex-dashboard.tsx`
- `lib/mindex/sine-contract.ts`
- `app/api/natureos/mindex/library/route.ts`
- `app/api/natureos/mindex/library/classify/route.ts`
- `app/api/mindex/sine/status/route.ts`
- `app/api/mindex/sine/blobs/[id]/analyze/route.ts`
- `app/api/mindex/sine/blobs/[id]/analysis/route.ts`
- `app/api/mindex/sine/blobs/[id]/visualisation/route.ts`
- `app/api/mindex/sine/models/...`
- `app/api/mindex/sine/prototypes/...`
- `app/api/natureos/mindex/sine/training/human-tags/route.ts`

What the frontend now does:

- Shows real acoustic library rows from MINDEX/NAS, not mock rows.
- Uses UUID-backed rows where possible so files can be analyzed, not only played.
- Auto-selects an analysis-ready acoustic clip instead of opening a giant MBARI file first.
- Keeps large files from auto-running expensive visualisation/analysis work.
- Shows a high-density browser-real-audio waveform/spectrogram when backend visualisation is weak or stale.
- Has an oscilloscope-style SINE interface: waveform, spectrogram, overlay, peak lanes, grids, zoom, range, transport controls, and compact instrument panels.
- Supports water, air, and ground contexts. Ground is required for underground, seismic, soil, and surface-ground recordings.
- Exposes broad target categories beyond birds/rotors: marine mammals, terrestrial animals, insects, human/mechanical sounds, propellers, UAVs, helicopters, airplanes, explosions, lightning/thunder, seismic/earthquake, ground vibration, hydrophone events, and unknown/open-set review.
- Supports human correction of identification. The user can say "the model said UAV, but I know this is lightning" and that must be saved as human-tagged evidence, not silently overwrite the model.
- Keeps MYCA/NLM language out of the raw evidence contract unless the backend has real evidence.
- Does not claim "AI ready" unless model runtime and model-backed evidence exist.
- Uses data attributes for QA, including loaded-file counts, selected-record mode, model runtime live status, model evidence status, scope density, and sound-target coverage.

What the frontend intentionally does not do:

- It does not generate semantic labels from file names.
- It does not use Gemini/LLM text as classification truth.
- It does not invent transcripts.
- It does not treat detector-only events as identified sound sources.
- It does not hide missing backend model/prototype/fusion/transcript evidence.

## Current Backend/VM State Reported By Cursor

Cursor previously reported:

- MINDEX VM 189 is reachable when healthy.
- NAS acoustic library ingest exists.
- `library.blob` contains acoustic blobs.
- ESC-50 ingest was completed as normalized 16 kHz WAV files.
- MBARI ingest was started or partially populated.
- Live BFF/API checks have shown acoustic library rows and SINE status.
- Wave annotations and human identifications were added to MINDEX backend and verified through 3010 BFF.

Cursor should verify current truth before making claims. Do not rely on stale counts.

Minimum current checks:

```powershell
curl.exe -H "X-Internal-Token: <token-from-local-env>" http://192.168.0.189:8000/api/mindex/health
curl.exe -H "X-Internal-Token: <token-from-local-env>" "http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=5"
curl.exe -H "X-Internal-Token: <token-from-local-env>" http://192.168.0.189:8000/api/mindex/sine/status
curl.exe -H "X-Internal-Token: <token-from-local-env>" http://192.168.0.189:8000/api/mindex/sine/models
curl.exe -H "X-Internal-Token: <token-from-local-env>" http://192.168.0.189:8000/api/mindex/sine/prototypes
```

## Codex Local MINDEX Work Cursor Must Preserve/Deploy

Codex added or hardened local MINDEX scaffolding for a real backend. Cursor must review and deploy the useful parts to VM 189. This is still not complete real AI until a verified model artifact exists and live E2E proof passes.

Local MINDEX files of interest:

- `mindex_api/services/sine_acoustic/event_views.py`
- `mindex_api/services/sine_acoustic/visualisation.py`
- `mindex_api/services/sine_acoustic/request_contract.py`
- `mindex_api/services/sine_acoustic/model_runtime.py`
- `mindex_api/services/sine_acoustic/inference_runtime.py`
- `mindex_api/services/sine_acoustic/features.py`
- `mindex_api/services/sine_acoustic/analysis_runner.py`
- `mindex_api/services/sine_acoustic/prototype_search.py`
- `mindex_api/services/sine_acoustic/evidence_builder.py`
- `mindex_api/services/sine_acoustic/persisted_evidence.py`
- `mindex_api/services/sine_acoustic/classifier.py`
- `mindex_api/services/sine_acoustic/pipeline.py`
- `mindex_api/routers/sine_acoustic.py`
- `mindex_api/routers/library.py`
- `migrations/20260606_sine_model_registry_jun06_2026.sql`
- `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`

Local MINDEX scripts of interest:

- `scripts/train_sine_esc50_p0.py`
- `scripts/verify_sine_model_artifact_package.py`
- `scripts/smoke_sine_model_artifact_inference.py`
- `scripts/build_sine_prototype_catalog.py`
- `scripts/verify_sine_real_ai_e2e.py`

Local MINDEX tests of interest:

- `tests/test_sine_real_ai_e2e_verifier.py`
- `tests/test_sine_prototype_catalog_builder_script.py`
- `tests/test_sine_model_artifact_runtime_smoke_script.py`
- `tests/test_sine_model_artifact_package_verifier.py`
- `tests/test_sine_library_classify_contract.py`
- `tests/test_sine_inference_runtime.py`
- `tests/test_sine_prototype_search.py`
- `tests/test_sine_classifier_visualisation_contract.py`
- `tests/test_sine_evidence_builder.py`
- `tests/test_sine_analysis_runner.py`
- `tests/test_sine_feature_extraction.py`
- `tests/test_acoustic_event_views.py`
- `tests/test_sine_model_runtime.py`
- `tests/test_sine_registry_contract.py`
- `tests/test_sine_request_contract.py`
- `tests/test_sine_evidence_migration_contract.py`
- `tests/test_sine_acoustic_pipeline.py`

Latest focused local MINDEX verifier result:

```text
72 passed, 1 skipped, 5 warnings
```

Command used:

```powershell
python -m pytest -p no:cacheprovider tests\test_sine_real_ai_e2e_verifier.py tests\test_sine_prototype_catalog_builder_script.py tests\test_sine_model_artifact_runtime_smoke_script.py tests\test_sine_library_classify_contract.py tests\test_sine_model_artifact_package_verifier.py tests\test_sine_esc50_training_artifact_script.py tests\test_sine_inference_runtime.py tests\test_sine_prototype_search.py tests\test_sine_classifier_visualisation_contract.py tests\test_sine_evidence_builder.py tests\test_sine_analysis_runner.py tests\test_sine_feature_extraction.py tests\test_acoustic_event_views.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_request_contract.py tests\test_sine_evidence_migration_contract.py tests\test_sine_acoustic_pipeline.py
```

The usual Windows pytest temp cleanup permission warning appeared after success. It was not a test failure.

## Honesty Contract

When no verified model artifact is registered, checksum-validated, and runtime-loaded, SINE must return honest output:

```json
{
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
  "prototype_matches": [],
  "deep_signal_matches": [],
  "fusion_evidence": [],
  "sound_transcripts": []
}
```

Detector rows may still appear as signal evidence:

- frequency peaks
- activity segments
- raw bird-detector evidence
- raw rotor harmonics evidence
- NPS-style profile match evidence
- deep-signal feature evidence
- waveform/spectrogram/visualisation evidence

But detector rows are not semantic identity. `bird_likely`, `uav_rotor_likely`, or `spectral_embedding` must not become top labels unless backed by registered model output, prototype/fingerprint match, fusion evidence, or evidence-linked transcript rows.

## Required Backend Response Contract

### `POST /api/mindex/sine/blobs/{id}/analyze`

This is the real model execution route.

It must:

- Resolve the `library.blob` row by UUID.
- Decode the real NAS audio.
- Window the audio into bounded segments.
- Extract deterministic DSP features.
- Create feature checksums per window.
- Load a registered model artifact only after checksum validation.
- Run TorchScript, ONNX Runtime, or other approved local model runtime.
- Return model outputs with:
  - `analysis_run_id`
  - `model_id`
  - `model_version`
  - `artifact_sha256`
  - `label_map_sha256`
  - `window_start_sec`
  - `window_end_sec`
  - `label`
  - `confidence`
  - `confidence_margin`
  - `entropy`
  - `normalized_entropy`
  - `ood_score`
  - `ood_status`
  - `feature_sha256`
  - `embedding_sha256`
  - `embedding_dim`
- Persist model outputs into `sine.model_output`.
- Run prototype/fingerprint search if embeddings exist.
- Persist prototype matches into `sine.prototype_match`.
- Fuse model, prototype, and detector evidence.
- Persist evidence into `sine.fusion_evidence`.
- Generate evidence-linked chronological sound transcripts.
- Persist transcripts into `sine.sound_transcript`.
- Return high-definition `visualisation_sonic` if requested.

It must not:

- Use filename labels as semantic truth.
- Use source metadata as semantic truth.
- Use Gemini or any LLM to decide acoustic identity.
- Return confident semantic identity from detector-only evidence.
- Return a fake `mindex_sine_v1` model.
- Mark a model loaded without runtime proof.

### `POST /api/mindex/library/blobs/{id}/classify`

This route may remain a Library classification/evidence view, but it must be honest:

- It may attach latest saved model/prototype/fusion/transcript evidence for the blob.
- It may show detector evidence.
- It should point users to `/sine/blobs/{id}/analyze` for a new model run unless Cursor explicitly makes classify call the same analyze runner.
- It must declare whether a new model inference was run.
- It must not claim fresh AI classification if it only read latest evidence.

### `GET /api/mindex/sine/models`

Must return the model registry truth:

- registered models
- loaded models
- runtime backend
- artifact URI
- artifact checksum
- label-map checksum
- metrics URI/checksum
- loaded state
- loaded verification timestamp

No rows is acceptable only as `model_unavailable`; it is not a functional classifier.

### `GET /api/mindex/sine/prototypes`

Must return prototype/fingerprint catalog truth:

- prototype IDs
- model IDs
- labels
- domains
- source dataset/provenance
- vector/prototype checksum metadata
- row counts

No rows is acceptable only as `prototype_catalog_unavailable`; it is not a functional classifier.

### `GET /api/mindex/sine/blobs/{id}/visualisation`

Must honor frontend oscilloscope-density requests:

- `max_waveform_points` / `waveform_points`
- `max_time_frames` / `spec_time_bins`
- `max_frequency_bins` / `spec_freq_bins`
- `fft_size` / `n_fft`
- `hop_length`
- `window_function`
- dB floor/ceiling
- peak extraction
- `ignore_saved_visualisation=true`

The current live backend has been observed returning low-res visualisation around `800` waveform points and `64 x 44` spectrogram cells. That is not enough for the current SINE player. The backend must support at least browser-requested high-density output such as `8192` waveform points and `256 x 1024` spectrogram cells for short clips, with bounded downsampling for long clips.

## Required Database Evidence

Cursor must make these tables real and populated by actual analysis:

- `sine.model_artifact`
- `sine.prototype`
- `sine.model_output`
- `sine.prototype_match`
- `sine.fusion_evidence`
- `sine.sound_transcript`
- `library.acoustic_wave_annotation`
- `library.acoustic_human_identification`

Human identification corrections must be stored separately from model output. If the human says "lightning" and the model says "UAV", store both:

- model claim
- human claim
- who/when tagged
- confidence or certainty if provided
- reason/comment
- source segment or region
- training-review status
- conflict/review flag

Do not overwrite model evidence with human evidence. The future training pipeline needs both.

## P0 Model Plan

P0 should be an honest learned model, even if modest:

- Train on real ESC-50 WAV files already in the NAS/MINDEX Library.
- Use real ESC-50 `meta/esc50.csv` labels or verified manifest labels.
- Use log-mel features.
- Use fixed windows, likely 5 seconds for ESC-50.
- Use a small CNN/ResNetish/VGGish-style model.
- Export TorchScript or ONNX.
- Include a penultimate embedding vector for prototype matching.
- Calibrate open-set/unknown thresholds with validation data.

Do not use unlabeled MBARI files as positive semantic labels. MBARI can be used for hydrophone smoke, unsupervised embeddings, or manually verified prototype labels, but not as claimed semantic truth without labels.

## Required Artifact Package

The model package must live under NAS, for example:

```text
/mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/
```

Required files:

```text
model.torchscript.pt or model.onnx
labels.json
metrics.json
confusion_matrix.json
training_manifest.json
model_registry_row.json
register_model_artifact.sql
```

The package verifier is strict. It rejects:

- missing package files
- checksum mismatches
- duplicate labels
- label/metric/manifest disagreement
- non-square confusion matrices
- non-integer confusion matrix values
- train/validation record counts missing or non-positive
- validation totals that do not match the confusion matrix
- incomplete `feature_params`
- malformed registration SQL
- `loaded=true` before runtime proof

Required `feature_params`:

- `n_fft`
- `hop_length`
- `n_mels`
- `max_frames`
- `window_sec`

## Cursor Execution Commands

Run the P0 artifact builder:

```powershell
python scripts\train_sine_esc50_p0.py `
  --audio-root /mnt/nas/mindex/Library/acoustic/esc50 `
  --metadata-csv /mnt/nas/mindex/Library/acoustic/esc50/meta/esc50.csv `
  --output-root /mnt/nas/mindex/models/acoustic `
  --epochs 12 `
  --batch-size 32
```

Verify the package before registration:

```powershell
python scripts\verify_sine_model_artifact_package.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/verification_report.json
```

Only after package verification passes, inspect metrics/confusion manually. Then apply `register_model_artifact.sql`.

Run runtime smoke before marking loaded:

```powershell
python scripts\smoke_sine_model_artifact_inference.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --wav-path /mnt/nas/mindex/Library/acoustic/esc50/<known-esc50-clip>.wav `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/runtime_smoke_report.json `
  --write-loaded-sql /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/mark_model_loaded.sql
```

Only apply `mark_model_loaded.sql` after inspecting the smoke report.

Build prototype catalog:

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

Apply prototype SQL only after inspecting the prototype report.

Run live E2E proof:

```powershell
python scripts\verify_sine_real_ai_e2e.py `
  --api-base http://192.168.0.189:8000 `
  --query esc `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/e2e_real_ai_report.json
```

This verifier is the completion gate. It must return `status: ready`.

## What Counts As Fully Functional

SINE is not fully functional until all of these are true:

- MINDEX 189 health is 200.
- Acoustic blobs return real UUID-backed rows.
- SINE status is 200.
- `/sine/models` returns at least one loaded checksum-backed model artifact.
- `/sine/prototypes` returns prototype/fingerprint rows.
- `/sine/blobs/{id}/analyze` runs on a real acoustic blob and writes:
  - `sine.model_output`
  - `sine.prototype_match`
  - `sine.fusion_evidence`
  - `sine.sound_transcript`
- Model outputs cross-link to a loaded model by `model_id`, `artifact_sha256`, and `label_map_sha256`.
- Prototype matches cross-link to registered prototype catalog IDs.
- Transcripts link back to evidence rows.
- OOD or weak clips become `unknown`, `low_confidence`, `out_of_domain`, or review, not confident fake labels.
- Human corrections save and appear in later blob detail/training review.
- Backend visualisation honors high-density oscilloscope requests.
- Website release gate no longer reports backend-pending model/prototype/visualisation blockers.

## Website Verification After Cursor Backend Work

After Cursor updates MINDEX and VM 189, Codex or Morgan should run:

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
node scripts\sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
```

Current expected status before real backend AI is complete:

```text
frontend_ready_backend_pending
```

The expected backend blockers before Cursor completes the backend are:

- backend visualisation is reachable but low-resolution
- no loaded model runtime proof
- no prototype rows

After Cursor completes the backend, the release gate should move to `ready` or `ready_with_warnings` with no model/prototype/evidence blockers.

## Relevant Existing Handoff Docs

Cursor should read these in order:

1. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_CURSOR_BACKEND_FULL_FUNCTIONAL_HANDOFF_JUN08_2026.md`
2. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md`
3. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`
4. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`
5. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REQUIREMENTS_TRACEABILITY_MATRIX_JUN06_2026.md`
6. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
7. `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_PHASE_ONE_DEPLOY_READINESS_JUN06_2026.md`

## External Code/Concept References Already Folded Into The Plan

Use these as references, not as blind copy-paste production code:

- `dimastatz/deep-signal` for learned/embedding acoustic features.
- Arduino Audio Tools frequency detection reference for frequency/FFT lane behavior.
- `microsoft/acoustic-bird-detection` for bird detector/model reference.
- `amsehili/auditok` for acoustic activity detection.
- `pcasabianca/Acoustic-UAV-Identification` for UAV/rotor references.
- `nationalparkservice/acoustic_discovery` for acoustic discovery and annotation ideas.
- Sonic Visualiser / Edison references for waveform, spectrogram, loop region, markers, zoom, playback speed, and reverse/loop UI behavior.
- AI Studio SINE prototype only for UI concepts and response shape; do not copy Gemini/mock/generated backend behavior.

## Non-SINE Warning

The Website repo currently has many unrelated dirty files from Earth Simulator, CREP, search, and other lanes. Do not treat those as SINE work and do not revert them. Cursor backend work should happen in the MINDEX repo unless Morgan explicitly asks Cursor to edit Website.

## Paste-Ready Cursor Prompt

You are in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`.

Morgan QA-tested SINE and confirmed the current backend is not doing real AI classification. Your job is to make SINE fully functional on the backend.

First, read:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_CURSOR_BACKEND_FULL_FUNCTIONAL_HANDOFF_JUN08_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_CURSOR_BACKEND_PASTE_PROMPT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

Then implement and deploy the backend completion:

1. Preserve the honesty contract: detector-only output must not claim semantic identity.
2. Deploy the local Codex MINDEX SINE scaffolding if it is not already on VM 189.
3. Apply model registry and evidence migrations.
4. Train or package the first real ESC-50 model artifact from real NAS audio and real labels.
5. Run `verify_sine_model_artifact_package.py`.
6. Register the artifact only after package verification.
7. Run `smoke_sine_model_artifact_inference.py`.
8. Mark the model loaded only after runtime smoke.
9. Build and register prototype/fingerprint rows with `build_sine_prototype_catalog.py`.
10. Wire `/sine/blobs/{id}/analyze` to produce real `model_outputs`, `prototype_matches`, `fusion_evidence`, and `sound_transcripts`.
11. Make backend visualisation honor high-density oscilloscope requests.
12. Preserve human corrections as separate human-tagged training evidence.
13. Run `verify_sine_real_ai_e2e.py` against VM 189.
14. Do not call SINE complete until the live E2E verifier returns `status: ready` and Website release gate no longer reports backend model/prototype/evidence blockers.

No fake labels, no Gemini/LLM classification truth, no filename semantic labels, no model loaded flag without checksum/runtime proof.
