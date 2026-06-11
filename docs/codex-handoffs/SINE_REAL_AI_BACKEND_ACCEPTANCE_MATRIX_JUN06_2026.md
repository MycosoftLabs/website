# SINE Real AI Backend Acceptance Matrix - June 6 2026

This document is the hard acceptance gate for Cursor's MINDEX backend work on the SINE acoustic classifier.

Use this with:

- `docs/codex-handoffs/SINE_REAL_AI_BACKEND_CURSOR_MASTER_HANDOFF_JUN06_2026.md`
- `docs/codex-handoffs/SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`
- `docs/codex-handoffs/SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`
- `docs/codex-handoffs/SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
- `docs/codex-handoffs/SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

## Current Truth

The Website frontend can now load real NAS-backed acoustic files and render the shared SINE player in three places:

- `/sensing/sine/player`
- `/sensing/sine`
- `/natureos/mindex` -> Library -> Acoustic

The backend is still not real acoustic intelligence. A recent Website BFF test against a real ESC-50 clip returned:

- `status: complete`
- `identification_summary.top_label: bird_likely`
- `model_outputs: 0`
- `fusion_evidence: 0`
- `sound_transcripts: 0`
- `model_status: null/missing`
- one unproven `deep_signal_matches` row

The frontend now flags that as `MINDEX contract failed`. Cursor must fix the backend, not ask Codex to hide the failure.

Latest Website gate update:

The SINE player now also fails a backend response when any of these are true:

- analysis is marked complete but `model_status` is absent
- model-like prediction rows lack model identity, runtime, artifact/checksum, label-map, or training provenance
- semantic fusion rows are not linked to model output or prototype evidence
- transcript prose lacks `model_output_ids`, `fusion_evidence_ids`, or `prototype_ids`
- `deep_signal_matches` / prototype-like labels lack stable prototype identity, source/model/vector proof, and score/distance

A detector-only response is acceptable only if it is honest: it must say `model_status: model_unavailable` when no model artifact is loaded and keep semantic arrays empty.

Latest Library identity update:

- The Website now distinguishes stream/file ids from analysis ids.
- `data-sine-selected-id` may be a local stream/file id.
- `data-sine-selected-analysis-id` must be a UUID before analyze/classify/annotation routes are called.
- Path-only NAS rows are playable but are not accepted as analyzable SINE records.
- Cursor must make MINDEX return UUID-backed audio rows for all registered acoustic files, including ESC-50. Manifest JSON files must not appear as playable audio files.

## Hard No-Fake Rule

The following are not allowed in production SINE classify/analyze paths:

- Gemini or any LLM as the primary classifier.
- AI Studio generated WAVs.
- Generated, synthetic, or mathematically fabricated waveform/spectrogram data.
- Hard-coded `mockAcousticBlobs`.
- Filename-derived or source-metadata-derived semantic labels.
- Detector-only rows presented as acoustic meaning.
- Natural language `sound_transcripts` without model/fusion/prototype evidence links.
- `identification_summary` when there is no real model/prototype evidence.

The AI Studio prototype in `MINDEX/mindex/sine-acoustic-classifier` is reference-only. Its UI vocabulary can inform the product, but its backend paths are not acceptable production behavior.

## Frontend Evidence Gate

The Website only treats a SINE run as scientific classifier evidence when the selected recording has real per-run proof.

### `model_outputs`

Must include:

- model identity: `model_id`, `registry_id`, `model_name`, `model`, or `name`
- runtime/artifact proof: `framework`, `runtime`, `artifact_uri`, `artifact_path`, `model_checksum`, `sha256`, `label_map_uri`, `training_dataset`, or equivalent
- non-empty top labels with score/confidence

### `deep_signal_matches`

Must include all of:

- score/confidence/similarity or distance/cosine distance/OOD distance
- stable prototype identity: `prototype_id`, `prototype_match_id`, `matched_prototype_id`, `nearest_prototype_id`, `catalog_id`, `registry_id`, `embedding_id`, or vector checksum
- source/model/vector proof: `source`, `dataset`, `corpus`, `model_id`, `embedding_model_id`, `embedding_model`, `embedding_dim`, `vector_dim`, `vector_checksum`, `embedding_checksum`, or `sha256`

A label plus score is not enough.

### `fusion_evidence`

Must include:

- semantic label or event type
- score or weight
- link to a model output or prototype identity

Detector-only fusion rows can be visible for debugging but do not confirm meaning.

### `sound_transcripts`

Must include at least one evidence link:

- `model_output_ids`
- `fusion_evidence_ids`
- `prototype_ids`

Unlinked transcript prose is rejected as acoustic meaning.

## Required Negative Test

Run this before training or loading any model artifact, or with model loading intentionally disabled.

Endpoint:

```text
POST /api/mindex/sine/blobs/{esc50_blob_id}/analyze
```

Request contract:

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
  }
}
```

Required response when no model is loaded:

```json
{
  "status": "complete",
  "model_status": "model_unavailable",
  "identification_summary": null,
  "model_outputs": [],
  "fusion_evidence": [],
  "deep_signal_matches": [],
  "sound_transcripts": [],
  "frequency_detections": [],
  "activity_segments": [],
  "diagnostics": {
    "audio_decoded": true,
    "semantic_fallback_used": false
  }
}
```

DSP arrays may be non-empty. Semantic arrays must be empty.

Fail if any of these occur:

- `identification_summary.top_label` is present.
- `sound_transcripts` contains prose.
- `deep_signal_matches` has labels without prototype/vector proof.
- `model_status` is absent.
- response says `complete` but does not say whether model evidence exists.
- model-like output rows contain labels but no model/runtime/artifact/checksum/label-map/training provenance.
- semantic fusion rows are not linked to model output or prototype evidence.

## Required Positive Test

After P0 model deployment, run against a short ESC-50 clip.

Required response:

```json
{
  "status": "complete",
  "model_status": "model_ready",
  "analysis_run_id": "uuid",
  "blob_id": "uuid",
  "model_outputs": [
    {
      "id": "uuid",
      "model_id": "sine-esc50-resnetish-v1",
      "model_name": "SINE ESC-50 Environmental CNN",
      "model_version": "v1",
      "framework": "pytorch",
      "runtime": "torchscript-or-onnxruntime",
      "artifact_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/model.pt",
      "model_checksum": "sha256...",
      "label_map_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/labels.json",
      "label_map_checksum": "sha256...",
      "training_dataset": "ESC-50",
      "start_sec": 0,
      "end_sec": 5,
      "latency_ms": 0,
      "top_labels": [
        { "label": "rain", "score": 0.91, "category": "weather" }
      ]
    }
  ],
  "fusion_evidence": [
    {
      "id": "uuid",
      "kind": "model_dsp_fusion",
      "label": "rain",
      "event_family": "weather",
      "score": 0.9,
      "model_output_id": "uuid"
    }
  ],
  "sound_transcripts": [
    {
      "start_sec": 0,
      "end_sec": 5,
      "label": "Rain or water droplets",
      "description": "Broadband short impulses consistent with rainfall or droplet impact.",
      "confidence": 0.9,
      "model_output_ids": ["uuid"],
      "fusion_evidence_ids": ["uuid"]
    }
  ],
  "diagnostics": {
    "audio_decoded": true,
    "sample_rate_in": 16000,
    "channels": 1,
    "window_sec": 5,
    "feature_pipeline": "log_mel"
  }
}
```

Fail if:

- model artifact/checksum/label map proof is missing.
- transcript lacks evidence IDs.
- backend used Gemini/LLM/metadata/fallback semantics.
- model output is not persisted.

## Test Matrix

| Gate | Requirement | Proof Command Or Endpoint | Pass Evidence | Fail Evidence |
|---|---|---|---|---|
| 1 | Fake path purge | `rg -n "mockAcousticBlobs|GoogleGenAI|GEMINI|generateWavBuffer|metadata-derived|filename-derived|heuristic fallback" mindex_api mindex_etl tests` | No reachable production classify/analyze path uses those terms | Any production path can return semantic labels from those sources |
| 2 | NAS audio decode and identity | `GET /api/mindex/library/blobs?category=acoustic&limit=1`; `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=5`; stream selected blob | real UUID-backed blob ID, source, size, stream 200, decoded samples; ESC-50 rows have UUIDs | generated bytes, missing blob, path-only metadata, manifest JSON rows as audio |
| 3 | High-def visualisation | `GET /api/mindex/sine/blobs/{id}/visualisation?waveform_points=8192&spectrogram_rows=256&spectrogram_cols=1024` | waveform and spectrogram arrays from real bytes, sample rate/channels/duration | generated math matrices or metadata-only preview |
| 4 | Missing model honesty | `POST /api/mindex/sine/blobs/{id}/analyze` with evidence contract and model disabled | `model_status: model_unavailable`, empty semantic arrays | fake `identification_summary`, fake transcript, unproven deep-signal row |
| 5 | Model registry | `GET /api/mindex/sine/models` | real model rows with artifact/checksum/label map/runtime/device/status | status says loaded with no artifact/checksum |
| 6 | P0 ESC-50 model | run short ESC-50 analyze | `model_outputs[]` with model ID/version/artifact/checksum/top labels | detector-only output, missing provenance |
| 7 | Prototype catalog | `GET /api/mindex/sine/prototypes` | rows with source/model/vector proof and counts | label-only catalog |
| 8 | Per-run prototype match | run analyze on clip with known prototype | `deep_signal_matches[]` with prototype ID, model/vector proof, score/distance | label plus score only |
| 9 | Fusion and transcript evidence | inspect saved analysis run | fusion links model/prototype IDs; transcripts link evidence IDs | standalone prose transcript |
| 10 | Long MBARI window | run 30-second window with `start_sec`/`end_sec` | bounded run completes or queues with stable job ID | synchronous whole-file timeout |
| 11 | Polling correctness | `GET /api/mindex/sine/blobs/{id}/analysis?job_id=...&start_sec=...&end_sec=...` | returns the submitted blob/window/job result | returns unrelated latest whole-file run |
| 12 | Human correction | model says `UAV`, human says `lightning` | both labels persist; row enters review/training queue | human overwrites model or is lost |
| 13 | Request contract preservation | inspect saved run after Website analyze/classify | run records target domains `water, air, ground`, requested class families, model targets, prototype/OOD/human-review requirements | backend ignores the request, reduces it to bird/rotor only, or loses it before persistence |
| 14 | Frontend acceptance | open `http://localhost:3010/sensing/sine/player` | checklist reaches `Scientific classifier ready` for one real run | `MINDEX contract failed` or `Model evidence pending` |
| 15 | Scope provenance | inspect SINE player DOM hooks | `data-sine-scope-source=mindex-backend` for backend visualisation acceptance, or `browser-real-audio` for temporary real-audio frontend fallback | source missing, `unavailable`, or generated/filler scope data |
| 16 | Architecture explorer evidence | inspect SINE player DOM hooks | `data-sine-architecture-evidence`, `data-sine-selected-architecture-state`, `data-sine-recipe-evidence`, and model target coverage rise only from backend evidence | UI shows architecture as proven from planned/mock/Gemini metadata |
| 17 | AI Studio prototype quarantine | `rg -n "GoogleGenAI|GEMINI_API_KEY|generateWavBuffer|mockAcousticBlobs|SINE-Embed-v1\\.0\\.0 \\(Neural Active-Core\\)|metadata for a recording|construct highly realistic|generateDspHeuristicPayload" mindex_api mindex_etl tests` | no production analyze/classify/status/visualisation path imports or mirrors prototype fake behavior | Gemini metadata classifier, generated WAV bytes, synthetic spectrograms, or heuristic semantic labels reachable in production |
| 18 | Oscilloscope-grade payload | `GET /api/mindex/sine/blobs/{id}/visualisation?start_sec=0&end_sec=5&max_waveform_points=8192&max_time_frames=1024&max_frequency_bins=256` | real decoded arrays plus FFT/hop/window/sample-rate/dB/clamp metadata and peak rows | thumbnail-only preview, no axis metadata, synthetic ID-derived matrix, or browser fallback required for backend acceptance |

## Minimal P0 Implementation Order

The detailed file/module/schema version of this order is in:

`docs/codex-handoffs/SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

1. Remove or quarantine fake semantic paths.
2. Make missing-model behavior honest.
3. Add real audio decode and high-definition visualisation from actual file bytes.
4. Add model registry tables and model status endpoint.
5. Train/load `sine-esc50-resnetish-v1` using PyTorch/TorchScript or ONNX.
6. Persist model outputs with model artifact proof.
7. Add evidence-linked fusion rows and transcript rows.
8. Add prototype catalog rows and nearest-neighbor matches.
9. Add long-file windowing and job polling.
10. Add human correction review/training queue.

## Completion Report Required From Cursor

Cursor must return:

- MINDEX commit hash.
- VM 189 deploy status.
- migrations applied.
- exact model artifact path and checksum.
- label map path and checksum.
- runtime and device.
- metrics path and confusion matrix summary.
- one missing-model negative response.
- one real ESC-50 positive response.
- one 30-second MBARI window response or queued job proof.
- one prototype catalog response.
- one per-run prototype match response, or explicit `not implemented` if deferred.
- one human correction round trip.
- one Website `3010` smoke showing the SINE checklist state.

Do not call SINE real until this matrix passes.
