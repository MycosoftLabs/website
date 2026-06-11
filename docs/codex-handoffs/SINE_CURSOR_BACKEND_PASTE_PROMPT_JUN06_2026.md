# SINE Cursor Backend Paste Prompt - Real Acoustic AI

Date: June 6, 2026

Use this as the single paste-ready prompt for Cursor in:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`

Do not stage or commit Website changes unless Morgan explicitly says to. This task is backend-first in MINDEX. Keep the Website frontend as an evidence gate, not a place to hide weak backend results.

## Latest QA Instruction From Morgan

Morgan manually QA-tested the SINE audio flow and confirmed the central failure: `Run SINE analysis` is not actually doing real analysis. It returns detector-shaped data and labels, but it is not yet running real acoustic intelligence that can identify what is inside an audio file.

Cursor must treat this as a backend rebuild, not a UI polish task. The required backend must decode real NAS audio, extract real DSP features, run actual PyTorch/TorchScript/ONNX model inference, support conventional neural-network baselines such as CNN, CRNN, GRU/RNN, and ResNetish/VGGish-style audio models, support transformer or foundation acoustic embeddings when packaged as verified local artifacts, perform prototype/fingerprint matching, detect real acoustic patterns, classify and label events, produce evidence-linked sound transcripts, and persist human corrections for future training review.

If no verified model artifact is registered, checksum-validated, and loaded, the correct answer is `model_unavailable`, `unknown`, `out_of_domain`, or queued analysis. Do not return a confident semantic label from a bird detector, rotor detector, filename, source metadata, Gemini, MYCA, or any generated/fake data.

## Prompt For Cursor

Morgan QA-tested SINE and confirmed that `Run SINE analysis` is not doing real acoustic AI. Treat the current MINDEX SINE backend as a detector shell that can return HTTP 200 and detector-shaped rows, but not as a real classifier.

Your first job is not to make the UI look better and not to defend the current labels. Your first job is to make the backend honest. A detector-only analysis can show raw signal evidence, but it must not claim acoustic meaning.

Read these files first:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_FINAL_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REQUIREMENTS_TRACEABILITY_MATRIX_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_BACKEND_CURSOR_FULL_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

Then run this source audit before changing anything:

```powershell
rg -n "bird_likely|uav_rotor|spectral_embedding|mindex_sine_v1|GoogleGenAI|GEMINI|mockAcousticBlobs|generateWavBuffer|identification_summary|sound_transcripts|fusion_evidence|model_status" mindex_api tests sine-acoustic-classifier
```

Expected problem only if Cursor is looking at an older checkout before the June 6 honesty/registry/evidence patches:

- `mindex_api/services/sine_acoustic/event_views.py` promotes detector rows into `identification_summary`.
- `event_views.py` hard-codes `model: "mindex_sine_v1"` and `status: "classified"`.
- `mindex_api/services/sine_acoustic/bird.py` emits `bird_likely`.
- `mindex_api/services/sine_acoustic/uav.py` emits `uav_rotor_likely` / `uav_rotor_possible`.
- `mindex_api/services/sine_acoustic/deep_signal.py` emits `spectral_embedding` without a real embedding model, vector checksum, prototype ID, or nearest-neighbor proof.
- older `tests/test_acoustic_event_views.py` revisions expected the bad `bird_likely` behavior.
- The AI Studio prototype under `sine-acoustic-classifier` uses Gemini, mocks, generated WAVs, generated visualisation, and metadata/fallback semantic claims. Do not copy that backend behavior.

Latest local MINDEX inspection:

- `mindex_api/services/sine_acoustic/event_views.py` is now shaped to keep detector-only output honest.
- `mindex_api/services/sine_acoustic/model_runtime.py` inspects model registry/runtime/artifact readiness, but explicitly does not classify audio.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now provides the local TorchScript/ONNX runtime seam Cursor should wire into persistence after registering a real artifact.
- `mindex_api/services/sine_acoustic/analysis_runner.py` now provides the local persistence runner seam: select loaded acoustic models, decode real blob audio, call the runtime interface, and write proven outputs into `sine.model_output`; it returns honest blockers when no model/runtime/artifact is available.
- `mindex_api/services/sine_acoustic/evidence_builder.py` now provides the local post-model evidence seam: after a proven `sine.model_output` row exists, it writes `sine.fusion_evidence` and evidence-linked `sine.sound_transcript` rows. It does not write anything for detector-only or unproven model output.
- `mindex_api/services/sine_acoustic/prototype_search.py` now provides the local prototype search seam: when a real model runtime returns an embedding vector and `sine.prototype.metadata` contains prototype vectors, it computes cosine similarity and writes proven `sine.prototype_match` rows with vector/prototype checksums.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now preserves multi-output model results. TorchScript/ONNX exports may return direct logits, `[logits, embedding]`, `(logits, embedding)`, or dict outputs like `{logits, embedding}`; successful inference returns `embedding`, `embedding_sha256`, and `embedding_dim`.
- `mindex_api/services/sine_acoustic/inference_runtime.py` now also returns initial open-set metrics: `confidence_margin`, `entropy`, `normalized_entropy`, `ood_score`, `ood_status`, `ood_threshold`, and `min_confidence`.
- `mindex_api/services/sine_acoustic/event_views.py` now refuses to promote low-confidence or OOD candidate model outputs into `identification_summary`.
- The shared Website SINE player now mirrors that rule: OOD/review model rows stay visible as `Open-set review` evidence, but only non-OOD provenance-backed model rows count as accepted model identity. QA can read `data-sine-proven-model-outputs`, `data-sine-confirmed-model-outputs`, and `data-sine-open-set-review-outputs`.
- `mindex_api/services/sine_acoustic/features.py` now provides the semantic-free feature/window input layer Cursor should wire into inference first: bounded windows, fixed-length padding/cropping, NumPy STFT, mel filterbank, log-mel spectrograms, `[1, 1, n_mels, frames]` tensors, and `feature_sha256`.
- `mindex_api/services/sine_acoustic/classifier.py` and `pipeline.py` now map `request_contract.visualisation_quality` into `visualisation_sonic`, so analyze/classify can return oscilloscope-density waveform/spectrogram data when the Website asks for it.
- `mindex_api/services/sine_acoustic/persisted_evidence.py` can read persisted `sine.model_output`, `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript` rows.
- `mindex_api/services/sine_acoustic/request_contract.py` parses the Website evidence-contract request.
- `mindex_api/routers/sine_acoustic.py` has `/sine/models`, `/sine/models/{model_id}`, and `/sine/prototypes`.
- The schema exists or is planned through `migrations/20260606_sine_model_registry_jun06_2026.sql` and `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`.
- This is good scaffolding. It is not real SINE AI until the analyze path runs a real model and writes real model/prototype/fusion/transcript evidence. The Library classify path is deliberately a detector/latest-evidence view and must not claim that it ran fresh model inference.

Codex continuation recheck:

```powershell
python -m pytest -p no:cacheprovider tests\test_sine_real_ai_e2e_verifier.py tests\test_sine_prototype_catalog_builder_script.py tests\test_sine_model_artifact_runtime_smoke_script.py tests\test_sine_library_classify_contract.py tests\test_sine_model_artifact_package_verifier.py tests\test_sine_esc50_training_artifact_script.py tests\test_sine_inference_runtime.py tests\test_sine_prototype_search.py tests\test_sine_classifier_visualisation_contract.py tests\test_sine_evidence_builder.py tests\test_sine_analysis_runner.py tests\test_sine_feature_extraction.py tests\test_acoustic_event_views.py tests\test_sine_model_runtime.py tests\test_sine_registry_contract.py tests\test_sine_request_contract.py tests\test_sine_evidence_migration_contract.py tests\test_sine_acoustic_pipeline.py
```

Result:

```text
72 passed, 1 skipped, 5 warnings
```

This proves the current local scaffolding, Library classify contract, stricter artifact package verifier, feature tensor input layer, mocked-execution inference runtime contract with embeddings, initial OOD/open-set metrics, model-output persistence runner contract, model-backed fusion/transcript writer, prototype vector-search seam, and analyze-path visualisation quality contract are internally coherent. It does not prove real AI. Cursor still has to install/verify Torch or ONNX Runtime, register a real model artifact, produce real embeddings/model outputs from that artifact, populate prototype vectors, calibrate OOD thresholds with validation data, and deploy/verify on VM 189.

The package verifier is now stricter than the earlier draft: labels must be unique, the confusion matrix must be square with integer rows matching the label count, train/validation record counts must be positive and internally consistent, and `feature_params` must include the inference-critical fields `n_fft`, `hop_length`, `n_mels`, `max_frames`, and `window_sec`.

Website/frontend contract probes from June 6:

- `GET http://localhost:3010/api/mindex/sine/status` returns `status: ok`, `acoustic_blobs: 2180`, `detectors_registered: 7`, and the detector list, but no model registry or model load truth.
- `GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&q=esc&limit=3` returns 2,000 ESC-50 files and UUID-backed rows, including `283c3d46-5196-447e-b9ee-474b3251421e`, `a742bbd6-383d-4a7f-8945-e3c7d55c1982`, and `6a8492b5-0796-43b3-be42-1ccd753f5d12`.
- `GET http://localhost:3010/api/mindex/sine/models` is now wired in the Website BFF and must be satisfied by MINDEX `/api/mindex/sine/models`.
- `GET http://localhost:3010/api/mindex/sine/models/{model_id}` is now wired in the Website BFF and must be satisfied by MINDEX `/api/mindex/sine/models/{model_id}`.
- `GET http://localhost:3010/api/mindex/sine/prototypes` is now wired in the Website BFF and must be satisfied by MINDEX `/api/mindex/sine/prototypes`.
- Fresh Browser QA on `http://localhost:3010/sensing/sine/player` after the frontend retry patch loaded registry-backed rows with `data-sine-selected-analysis-id=6a8492b5-0796-43b3-be42-1ccd753f5d12`, `data-sine-registry-backed-rows=true`, `data-sine-total-files=2180`, and a real browser-decoded scope of `8192` waveform points plus `256 x 1024` spectrogram cells.
- Rerunning the frontend evidence check against that blob returned `data-sine-analysis-status=complete`, `data-sine-analysis-run-id=19cc95dd-51cf-4fb0-93c8-66fa7e22d04e`, but the Website correctly kept unproven semantic evidence out of confirmed model identity. The current shared player shows `data-sine-readiness-label=Instrument ready / AI pending` when the real audio and high-density scope are ready but no loaded model/prototype/fusion/transcript proof exists.
- Fresh Browser QA on `http://localhost:3010/natureos/mindex` after local dev login and selecting `Library` mounted the compact shared SINE player with `data-sine-player-mode=compact`, `data-sine-catalog-status=ready`, `data-sine-total-files=2180`, `data-sine-loaded-files=80`, `data-sine-registry-backed-rows=true`, `data-sine-selected-analysis-id=6a8492b5-0796-43b3-be42-1ccd753f5d12`, `data-sine-storage-label=NAS 7346.7 GB free`, and `data-sine-readiness-label=Library signal ready`.
- The embedded MINDEX player still showed `AI models not loaded`, `data-sine-contract-label=No analysis payload`, `data-sine-model-runtime-live=false`, `data-sine-model-evidence-present=false`, `data-sine-evidence-ready=1`, and `data-sine-evidence-total=8`. This is expected until Cursor deploys real model registry, prototype catalog, model outputs, fusion evidence, and evidence-backed transcripts.
- This proves the current backend can decode/visualize/run detector shell work, but still does not return real registered model/prototype/fusion/transcript evidence.

This is the right frontend behavior: the Website is not hiding missing backend model/prototype/fusion/transcript evidence. Cursor must make the MINDEX routes return real registered model artifacts, real prototype rows, real model outputs, real fusion rows, and real transcripts.

Website release gate Cursor should run after backend changes:

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
node scripts\sine-release-gate.mjs --base=http://localhost:3010 --timeout=90000
```

Current expected result before real backend AI is implemented:

```text
Status: frontend_ready_backend_pending
Checks: 45 pass, 5 warn, 0 fail
```

This gate now runs the no-fake frontend guard, AI Studio merge audit, external audio repo audit, API/backend contract smoke, and rendered shared-player smoke. It should only move toward `ready` when MINDEX returns high-definition backend visualisation, loaded model runtime proof, prototype rows, and evidence-backed classification/transcript payloads.

Morgan's latest QA direction is explicit: the current SINE backend is not doing real AI. Cursor must build actual PyTorch/TorchScript/ONNX/transformer-backed acoustic inference, prototype matching, evidence fusion, sound transcripts, and human correction persistence. A detector-only response is useful signal evidence, but it is not a classification. The canonical full backend build prompt is now in:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_FINAL_HANDOFF_JUN06_2026.md`

Codex local MINDEX patch status:

- Codex applied the first honesty patch locally in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`.
- Files changed locally:
  - `mindex_api/services/sine_acoustic/event_views.py`
  - `mindex_api/routers/sine_acoustic.py`
  - `mindex_api/routers/library.py`
  - `tests/test_acoustic_event_views.py`
- Local behavior now returns detector-only/model-unavailable fields instead of promoting detector labels into `identification_summary`.
- Codex also patched the local MINDEX visualisation path to honor oscilloscope-density requests and added a NumPy STFT fallback when SciPy is absent.
- Local visualisation smoke returned `8192` waveform points, `256 x 1024` spectrogram cells, `48` peak rows, `fft_size: 2048`, `hop_length: 128`, and `dsp_backend: numpy.rfft`.
- Codex added local model/prototype registry endpoints and migration:
  - `GET /api/mindex/sine/models`
  - `GET /api/mindex/sine/models/{model_id}`
  - `GET /api/mindex/sine/prototypes`
  - `migrations/20260606_sine_model_registry_jun06_2026.sql`
- These endpoints return honest `model_registry_unavailable` / `prototype_catalog_unavailable` and `model_status: model_unavailable` until the registry tables and real artifacts exist.
- `/api/mindex/sine/status` now includes local model truth fields: `model_status`, `model_ready`, `registered_models`, and `loaded_models`.
- Codex added a local SINE request-contract parser and wired it into:
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/mindex/library/blobs/{id}/classify`
  - `GET /api/mindex/sine/blobs/{id}/analysis`
- The local analyze/classify payload now preserves Website fields under `request_contract`, including:
  - `evidence_contract`
  - `sine_request`
  - `requested_outputs`
  - `target_domains`
  - `sound_targets`
  - `requires_registered_model`
  - `allows_detector_only`
- `diagnostics.request_contract` is also returned so every run has an audit trail for why semantic labels were withheld.
- Codex added a local SINE runtime-inspection scaffold:
  - `mindex_api/services/sine_acoustic/model_runtime.py`
  - `inspect_sine_model_runtime(...)`
  - `runtime_backend_status()`
  - `artifact_path_from_uri(...)`
- `/api/mindex/sine/status`, `/sine/blobs/{id}/analyze`, and `/library/blobs/{id}/classify` now include `model_context` / runtime fields that explain:
  - whether the model registry exists
  - whether any model row is loaded
  - whether Torch or ONNX Runtime are installed
  - whether a prototype catalog exists
  - why inference is still blocked
- This is still not a deployed classifier. It has runtime and persistence seams, but without installed Torch/ONNX Runtime and a registered checksum-verified artifact it must not return semantic labels.
- Earlier focused SINE tests passed locally with `12 passed, 1 skipped` before the persistence patch.
- Codex added a local SINE evidence persistence contract:
  - `migrations/20260606_sine_analysis_evidence_jun06_2026.sql`
  - `mindex_api/services/sine_acoustic/persisted_evidence.py`
  - optional response wiring in `mindex_api/routers/sine_acoustic.py`
  - optional response wiring in `mindex_api/routers/library.py`
- New planned tables:
  - `sine.model_output`
  - `sine.prototype_match`
  - `sine.fusion_evidence`
  - `sine.sound_transcript`
- These tables are empty by design. No fake evidence rows are inserted.
- `GET /api/mindex/sine/blobs/{id}/analysis` and Library blob detail can now surface persisted model/prototype/fusion/transcript rows when Cursor's real inference runner starts writing them.
- `build_library_classification_payload(...)` now creates `identification_summary` only from proven model outputs, prototype matches, fusion rows, or evidence-linked transcripts; detector-only remains detector-only.
- If persisted model/prototype/fusion/transcript evidence exists, stale saved `model_unavailable` context no longer overrides the real evidence status.
- `POST /api/mindex/library/blobs/{id}/classify` now declares `model_inference_run: false`, adds `diagnostics.new_model_inference_run: false`, points to `/api/mindex/sine/blobs/{id}/analyze` as the real model execution route, and can attach latest persisted model/prototype/fusion/transcript evidence if a prior analysis exists.
- Codex added a local model-output persistence runner:
  - `mindex_api/services/sine_acoustic/analysis_runner.py`
  - `POST /api/mindex/sine/blobs/{id}/analyze` now calls it after detector events.
  - The runner decodes real blob audio, calls the registered-model runtime seam, writes proven outputs into `sine.model_output`, and returns honest blockers when no model/runtime/artifact is available.
- Codex added a local post-model evidence writer:
  - `mindex_api/services/sine_acoustic/evidence_builder.py`
  - After `sine.model_output` is proven, it writes `sine.fusion_evidence` and evidence-linked `sine.sound_transcript`.
  - It writes nothing for detector-only or unproven model rows.
- Codex added a local prototype vector-search seam:
  - `mindex_api/services/sine_acoustic/prototype_search.py`
  - If the real model returns an embedding and `sine.prototype.metadata` has prototype vectors, it writes cosine-scored `sine.prototype_match` rows with vector/prototype checksums.
  - It writes nothing when the embedding vector or prototype vectors are missing.
- Codex updated the inference runtime for multi-output models:
  - `mindex_api/services/sine_acoustic/inference_runtime.py`
  - TorchScript/ONNX outputs can include both logits and embeddings.
  - Successful inference now returns `embedding`, `embedding_sha256`, and `embedding_dim`.
- Codex connected the Website visualisation contract into analyze/classify:
  - `mindex_api/services/sine_acoustic/classifier.py`
  - `mindex_api/services/sine_acoustic/pipeline.py`
  - `request_contract.visualisation_quality` now controls `visualisation_sonic` density/settings in analysis responses.
- Historical progressive checkpoints passed locally: `15 passed, 1 skipped`, `28 passed, 1 skipped`, `33 passed, 1 skipped`, `39 passed, 1 skipped`, `42 passed, 1 skipped`, `44 passed, 1 skipped`, and `46 passed, 1 skipped`.
- Latest focused SINE contract suite after the real-AI E2E verifier, stricter artifact verifier, runtime smoke guard, prototype catalog builder, and Library classify contract passed locally with `72 passed, 1 skipped, 5 warnings`. The extra E2E checks distinguish prototype catalog rows from scored prototype matches and require analysis evidence to cross-link back to loaded model/prototype registry rows. The artifact verifier now rejects duplicate labels, malformed confusion matrices, missing train/validation totals, inconsistent validation counts, and incomplete feature-parameter metadata before registration.
- Current full MINDEX tests passed locally with `124 passed, 3 skipped`.
- `python -m compileall mindex_api\routers\sine_acoustic.py mindex_api\routers\library.py mindex_api\services\sine_acoustic` passed locally.
- `git diff --check` on touched SINE backend and Website contract files returned no whitespace errors; Git only warned about line-ending normalization.
- This local MINDEX patch was not deployed to VM 189 by Codex in this pass. Cursor should review, deploy, and then re-test through `localhost:3010`.

## Immediate First Patch

Review and keep Codex's local honesty patch before training or adding any new model. If Cursor starts from a checkout that still has the old behavior, fix the false semantic path first.

When no real model artifact is registered, checksum-validated, and loaded, `POST /api/mindex/sine/blobs/{id}/analyze` and `POST /api/mindex/library/blobs/{id}/classify` must return:

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
    "audio_decoded": true,
    "model_status": "model_unavailable",
    "model_ready": false,
    "model_registry_ready": false,
    "prototype_catalog_ready": false,
    "request_contract": {
      "contract_version": "sine-evidence-v1",
      "status": "provided"
    },
    "semantic_fallback_used": false,
    "llm_fallback_used": false,
    "filename_fallback_used": false,
    "metadata_fallback_used": false,
    "synthetic_output_used": false
  }
}
```

Non-semantic detector rows may still be returned:

- `frequency_detections`
- `activity_segments`
- raw bird-band detector evidence
- raw rotor/harmonic detector evidence
- raw impulse/sweep/low-frequency detector evidence

But these rows must be labeled as detector evidence, not acoustic identity. They must not create `identification_summary`, transcript prose, model output, fusion evidence, or prototype matches.

Update tests so the old `bird_likely` promotion fails. If `tests/test_acoustic_event_views.py` still expects `top_label == "bird_likely"`, the patch is not done.

## Real SINE Backend Target

After the honesty patch, build the actual SINE acoustic classifier pipeline.

Required real-analysis chain:

1. Resolve a UUID-backed `library.blob` row to a real NAS-backed acoustic file.
2. Decode actual audio bytes from `/mnt/nas/mindex/Library/acoustic`, not generated audio.
3. Compute deterministic DSP features from real samples:
   - waveform/envelope
   - STFT/spectrogram/log-mel or PCEN
   - FFT peaks
   - RMS/activity
   - centroid, rolloff, bandwidth, ZCR
   - impulse, sweep, harmonic/rotor, low-frequency ground/seismic candidates
4. Add a model registry with artifact path, checksum, label map, training data, metrics, framework/runtime, device, and load status.
5. Load and run a real PyTorch, TorchScript, or ONNX Runtime model.
6. Persist and return `model_outputs[]` with model identity, artifact/checksum, label map, labels, scores, window bounds, and latency.
7. Add embeddings/prototype matching only when there is a real vector model and prototype catalog with stable IDs, vector checksums, source/license, score/distance, and OOD distance.
8. Add fusion rows linking detector events, model outputs, and prototype matches.
9. Generate `sound_transcripts[]` only when each transcript row links to model output, prototype, or fusion evidence IDs.
10. Store human corrections beside model predictions. A human correction must not overwrite the model result; disagreements become contested training-review rows.

## Required Endpoints

Use the existing MINDEX route family. Do not create a toy standalone `/api/classify` unless it forwards to these production routes:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/prototypes`

The Website already sends an evidence contract requiring real audio, real model/prototype evidence, detector-only honesty, no semantic fallback, no LLM fallback, and evidence-backed transcripts only. Honor those request fields; do not ignore them.

## Runtime Hook Cursor Must Implement

Codex left a runtime inspection hook, not a model runner:

```text
mindex_api/services/sine_acoustic/model_runtime.py
```

Cursor should extend this into a real inference path. Required behavior:

- Add a function such as `run_registered_models(samples, sample_rate, db, request_contract, model_context, windows)` or a dedicated `analysis_runner.py`.
- Query `sine.model_artifact` for loaded/ready artifacts.
- Resolve only local/NAS artifact paths. Do not fetch model files from arbitrary URLs during request-time analysis.
- Verify artifact SHA-256 and label-map SHA-256 before inference.
- Load PyTorch/TorchScript/ONNX Runtime models only after checksum verification.
- Window long files, defaulting to the Website contract's 30-second windows and 5-second overlap unless overridden.
- Return `model_outputs[]` with:
  - `id`
  - `model_id`
  - `model_name`
  - `model_version`
  - `framework`
  - `runtime`
  - `artifact_sha256`
  - `label_map_sha256`
  - `window_start_sec`
  - `window_end_sec`
  - `top_label`
  - `scores`
  - `confidence`
  - `confidence_margin`
  - `entropy`
  - `normalized_entropy`
  - `ood_score`
  - `ood_status`
  - `ood_threshold`
  - `min_confidence`
  - `latency_ms`
- Persist model outputs in a DB table, not only in response JSON.
- Use the new local migration table `sine.model_output` for that persistence.
- Use `sine.prototype_match`, `sine.fusion_evidence`, and `sine.sound_transcript` for downstream evidence. Do not store these only in `library.analysis_run.summary`.
- Only set `model_status: "model_ready"` after at least one model output is produced from decoded real audio with verified artifact provenance.
- Only create `identification_summary` from model/prototype/fusion evidence, never from detector rows alone.
- Never create `identification_summary` from a model output marked `low_confidence`, `out_of_domain`, or `out_of_domain_candidate`.
- Return the open-set metrics anyway. The Website will show those rows for human review and training triage, but it will not treat them as confirmed acoustic meaning.
- Only create `sound_transcripts[]` when each transcript row links to `model_output_ids`, `prototype_ids`, or `fusion_evidence_ids`.

## Oscilloscope Visualisation Requirement

The frontend can currently decode real audio in the browser and render an 8,192-point waveform plus a 256 x 1,024 spectrogram, but MINDEX still returns low-resolution backend visualisation. Fix the backend visualisation endpoint.

For short ordinary clips, `GET /api/mindex/sine/blobs/{id}/visualisation` must honor:

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

Return real arrays plus:

- `visualisation_status`
- `duration_sec`
- `sample_rate_hz`
- `channels`
- `fft_size`
- `hop_length`
- `window_function`
- `frequency_min_hz`
- `frequency_max_hz`
- `db_floor`
- `db_ceiling`
- clamp/downsample metadata
- peak rows

Do not generate waveform or spectrogram matrices from filenames, metadata, or synthetic math.

## Model Direction

Use the external audio-code audit as design guidance, not wholesale vendoring.

P0:

- Train or load a first ESC-50 model artifact. Codex added `scripts/train_sine_esc50_p0.py` as the current P0 artifact-builder scaffold; it trains a small TorchScript CNN from real ESC-50 WAV files plus real labels and writes `model.torchscript.pt`, `labels.json`, `metrics.json`, `confusion_matrix.json`, `training_manifest.json`, `model_registry_row.json`, and `register_model_artifact.sql`.
- Verify the package before registration. Codex added `scripts/verify_sine_model_artifact_package.py`; it checks required files, artifact checksum, label-map checksum, labels, metrics, confusion matrix, manifest, generated SQL, target domains, class families, feature params, and confirms the package does not claim `loaded=true` before runtime proof.
- Runtime-smoke the package before marking it loaded. Codex added `scripts/smoke_sine_model_artifact_inference.py`; it verifies the package, decodes a real WAV, runs `run_registered_model_inference(...)`, refuses low-confidence/OOD smoke output by default, and only then writes guarded `mark_model_loaded.sql` that checks model ID plus artifact and label-map checksums.
- Build a prototype catalog from real embeddings. Codex added `scripts/build_sine_prototype_catalog.py`; it verifies the artifact package, runs the model on real labeled WAVs, averages valid embedding vectors per label, refuses OOD/low-confidence embeddings by default, and writes `sine.prototype` upsert SQL with vector/prototype checksums and no semantic fallback.
- Prove the live backend through API, not just files. Codex added `scripts/verify_sine_real_ai_e2e.py`; it calls `/sine/status`, `/sine/models`, `/sine/prototypes`, selects or accepts a UUID-backed acoustic blob, runs `/sine/blobs/{id}/analyze`, and fails unless the live response contains provenance-backed `model_outputs`, checksum-backed prototype catalog rows, scored `prototype_matches`, linked `fusion_evidence`, and evidence-linked `sound_transcripts`. The verifier also requires the analysis model output to match a loaded model registry row by `model_id`, `artifact_sha256`, and `label_map_sha256`, and requires per-run prototype matches to point at registered prototype catalog IDs.
- Use real ESC-50/NAS registered rows.
- Use PyTorch, TorchScript, or ONNX Runtime.
- Save artifact, label map, training config, metrics, confusion matrix, and checksums under `/mnt/nas/mindex/models/acoustic/{model_id}/`.
- Register the model in Postgres and return honest model status from `/api/mindex/sine/status` and `/api/mindex/sine/models`.

Example P0 artifact build:

```powershell
python scripts\train_sine_esc50_p0.py `
  --audio-root /mnt/nas/mindex/Library/acoustic/esc50 `
  --metadata-csv /mnt/nas/mindex/Library/acoustic/esc50/meta/esc50.csv `
  --output-root /mnt/nas/mindex/models/acoustic `
  --epochs 12 `
  --batch-size 32
```

If the metadata CSV is not present on NAS, place the real ESC-50 `meta/esc50.csv` there first or use manifest labels. Do not use filename target IDs for production semantic labels unless the labels are mapped back to the official ESC-50 metadata.

Example P0 artifact verification:

```powershell
python scripts\verify_sine_model_artifact_package.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/verification_report.json
```

Only after this verifier passes should Cursor inspect the metrics/confusion matrix, apply `register_model_artifact.sql`, perform a runtime-load/inference probe, and then mark the model loaded.

Example P0 runtime smoke:

```powershell
python scripts\smoke_sine_model_artifact_inference.py `
  --package-root /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1 `
  --wav-path /mnt/nas/mindex/Library/acoustic/esc50/<known-esc50-clip>.wav `
  --expected-model-id sine-esc50-cnn-p0-v1 `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/runtime_smoke_report.json `
  --write-loaded-sql /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/mark_model_loaded.sql
```

Do not apply `mark_model_loaded.sql` unless the runtime smoke status is `runtime_smoke_passed`. If the status is `runtime_smoke_ood_review`, pick a known in-domain validation clip or calibrate thresholds; do not mark the model loaded from an uncertain smoke.

Example P0 prototype catalog build:

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

Apply `register_prototypes.sql` only after inspecting the prototype report. Prototype rows must include `metadata.centroid` / `metadata.prototype_vector`, `vector_sha256`, `prototype_sha256`, `model_id`, and real source examples.

Final live API proof:

```powershell
python scripts\verify_sine_real_ai_e2e.py `
  --api-base http://192.168.0.189:8000 `
  --query esc `
  --write-report /mnt/nas/mindex/models/acoustic/sine-esc50-cnn-p0-v1/e2e_real_ai_report.json
```

This verifier is the completion gate. It must return `status: ready`; otherwise SINE is still backend-pending even if individual endpoints return 200. A pass now requires cross-linked proof: `/sine/models` loaded artifact -> per-run `model_outputs` -> `/sine/prototypes` catalog row -> per-run `prototype_matches` -> linked `fusion_evidence` -> evidence-linked `sound_transcripts`.

P1:

- CRNN/GRU temporal model for evolving and repeated patterns.
- Windowed MBARI/hydrophone and Psathyrella buoy analysis with overlapping 30-second windows.
- Prototype/fingerprint catalog using real embeddings and cosine or declared distance metrics.

P2:

- Transformer-class acoustic embeddings for broader water/air/ground classes when runtime, licensing, model artifacts, and evaluation are clear.

Do not claim `model_ready`, CUDA, FP16, calibration, CRNN, ResNet, transformer, or `SINE-Embed` readiness unless a real artifact is registered and runtime load/inference checks pass.

## Acoustic Classes Must Not Be Shrunk To Birds And Rotors

SINE must cover water, air, and ground as first-class domains. The frontend sends explicit `sound_targets`, including:

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

Each target needs model coverage, prototype coverage, detector-only evidence, or an honest missing/OOD state. A `bird` detector and a `rotor` detector are not the SINE classifier.

## Acceptance Tests

Add or update tests so these pass:

- Missing-model negative test returns `model_status: model_unavailable`, no `identification_summary`, no `model_outputs`, no `deep_signal_matches`, no `fusion_evidence`, no `sound_transcripts`, and no semantic fallback flags.
- Current fake labels such as `bird_likely`, `uav_rotor_likely`, and `spectral_embedding` cannot become semantic identity without model/prototype/fusion proof.
- High-definition visualisation decodes real audio bytes and returns oscilloscope metadata.
- UUID-backed ESC-50 file returns a real model output after a real P0 model is registered and loaded.
- Large MBARI/hydrophone file can analyze or queue a bounded 30-second window without synchronously classifying the entire file.
- Human correction test: model says `UAV`, human says `lightning`; both persist, disagreement is contested, and the item enters review/training queue.
- OOD/open-set test: an ambiguous, weak, or out-of-distribution clip returns `unknown`, `low_confidence`, `out_of_domain_candidate`, or queued review; it does not return a confident top semantic label.
- Website BFF on `localhost:3010` can read status, models, prototypes, visualisation, analyze, and classify. The SINE player should only move from `Instrument ready / AI pending` to classifier-ready when real model/prototype/fusion/transcript evidence exists.

## Completion Report Required

When done, report:

- MINDEX commit hash
- VM 189 deploy status
- migrations applied
- model artifact path and checksum
- label map path and checksum
- runtime and device
- metrics and confusion matrix path
- one real ESC-50 response summary
- one MBARI or hydrophone 30-second window response summary
- one missing-model negative response summary
- one human correction round trip

Do not call this complete because an endpoint returns 200. Completion requires real audio decode, real model/prototype evidence or honest missing-model behavior, persisted evidence, and frontend verification.
