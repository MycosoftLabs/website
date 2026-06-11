# SINE Real AI Backend Cursor Handoff

Date: June 5, 2026

Owner split:

- Website frontend: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
- MINDEX backend: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`
- MINDEX VM/API: `192.168.0.189:8000`
- NAS acoustic library on VM: `/mnt/nas/mindex/Library/acoustic`
- SMB NAS from Windows: `\\192.168.0.105`
- Local QA surfaces:
  - `http://localhost:3010/sensing/sine`
  - `http://localhost:3010/sensing/sine/player`
  - `http://localhost:3010/natureos/mindex` -> Library -> Acoustic

## Objective

Morgan QA-tested the current SINE player and confirmed the important failure: `Run SINE analysis` is not doing real identification. It may return structured detector-looking JSON, but it is not yet a real AI/PyTorch/neural/conventional pattern-recognition classifier that can explain what is inside acoustic files, identify the sound source, label windows, and learn from human corrections.

Cursor needs to build the real MINDEX backend for SINE acoustic intelligence:

- Real audio decoding from NAS-backed `library.blob` rows.
- Real high-resolution waveform/spectrogram generation.
- Real deterministic DSP features and event windows.
- Real PyTorch/TorchScript/ONNX model inference.
- Real transformer/CNN/CRNN or pretrained embedding heads where appropriate.
- Real prototype/fingerprint retrieval against stored embeddings.
- Real `sound_transcripts` from evidence-backed acoustic windows.
- Real persistence of runs, detector events, transcripts, embeddings, diagnostics, model versions, and human corrections.
- No mock audio, no synthetic classifications, no filename-only guesses, no Gemini-only classifier.

This is acoustic-only. Ignore chemistry, DNA computing, PubChem, DWSIM, Cantera, and unrelated MINDEX tabs for this pass.

## Fresh QA Verdict For Cursor

Treat the current SINE backend as incomplete. Morgan tested real audio in the player and confirmed that the current `Run SINE analysis` path does not behave like a real classifier. It may return a response object and detector lanes, but that is not enough.

Cursor's next MINDEX backend pass is successful only when the API can prove:

- It decoded the selected real NAS audio file.
- It extracted real DSP features from real samples.
- It ran a registered PyTorch/TorchScript/ONNX model artifact or an explicitly reported missing-model path.
- It persisted `analysis_run`, detector events, model outputs, fusion evidence, and transcripts.
- It returned `model_outputs`, `fusion_evidence`, and/or evidence-backed `sound_transcripts` so the Website can stop showing `Model evidence pending`.

If a model is not loaded, the backend must say `model_unavailable`. It must not fill `identification_summary`, transcript prose, or detector lanes with guessed semantic labels.

## Immediate Morgan QA Finding

The current browser experience can load real NAS-backed acoustic files, but `Run SINE analysis` does not yet prove real classification. The next backend pass must treat the existing analysis response as a shell, not as done work.

What Morgan needs the backend to do now:

- Identify what the sound actually is, not just return detector lane JSON.
- Segment the recording into meaningful windows.
- Label each window with evidence-backed physical sound events.
- Detect patterns from waveform, spectrum, activity, harmonics, impulses, and embeddings.
- Use real neural inference and conventional DSP together.
- Support PyTorch/CNN/CRNN/transformer model families.
- Return natural `sound_transcripts` only from real DSP/model/prototype evidence.
- Persist human corrections as training/review data when the model is wrong.
- Distinguish model hypotheses from human-tagged truth and contested labels.

Examples the backend must support:

- model says `UAV`, human says `lightning`: store both, mark contested, queue for prototype/training review.
- a hydrophone file contains propeller/cavitation/whale/click/impulse events: return separate windows with evidence.
- a ground/seismic/soil recording contains low-frequency impulse patterns: classify under `ground`, not `air`.
- a bird detector is only one animal-life detector, not the whole sound intelligence stack.

## P0 Backend Deliverable Cursor Must Produce

Cursor should treat this as the immediate completion contract for the next MINDEX backend pass. The goal is not to make the UI look better. The goal is to make `Run SINE analysis` scientifically real and auditable.

Minimum P0 deliverables:

- One real model runtime path in production MINDEX:
  - PyTorch eager, TorchScript, or ONNX Runtime.
  - The loaded model must come from a registered model artifact, not from a hard-coded branch, filename rule, or LLM prompt.
  - The runtime must emit top-N probabilities/logits for a real decoded audio window.
- One first real acoustic model head:
  - Preferred P0: ESC-50/environmental classifier because the NAS already contains ESC-50 WAVs and the frontend can test short clips quickly.
  - It may be a modest baseline model for P0, but it must be trained/loaded/inferred for real and registered with checksum/version/label map.
- One real DSP window feature pipeline:
  - Decode the actual selected NAS WAV.
  - Compute deterministic features from samples: STFT/log-mel, RMS, FFT peaks, centroid, rolloff, bandwidth, ZCR, MFCC or equivalent.
  - Return detector events only when they are derived from those features.
- One honest evidence fusion output:
  - `model_outputs` must include model name/version/window bounds/top labels/confidence.
  - `fusion_evidence` must link summary decisions to model outputs, DSP events, and/or prototype matches.
  - `sound_transcripts` must only appear when each transcript row has evidence IDs and window bounds.
- One persistence path:
  - `sine.analysis_run`
  - `sine.detector_event`
  - `sine.model_output`
  - `sine.fusion_evidence`
  - `sine.sound_transcript`
  - model registry rows or equivalent production tables
- One completion report:
  - exact commit hash
  - migrations applied
  - model artifact path
  - model checksum
  - status endpoint proof
  - one ESC-50 analysis response proof
  - one negative/fake-path test proof
  - known limits

The first P0 model does not need to solve whales, UAV, lightning, ground, insects, and MBARI perfectly in one pass. It does need to prove that the backend can run a real model on real audio and return auditable evidence without pretending.

## Hard Rules

- Do not fabricate labels.
- Do not return mock detector rows in production endpoints.
- Do not use the AI Studio mock server as implementation.
- Do not use an LLM as the primary classifier.
- Do not overwrite model predictions with human corrections. Store both and compare them.
- Do not expose raw NAS paths, tokens, credentials, or local secret values in API responses or UI.
- Do not route SINE through MAS for inference. Website BFF should call MINDEX 189 directly for Library/SINE.
- Do not make the frontend invent detector rows to hide backend gaps.

LLM/MYCA/Gemini may later explain verified analysis results, but they must not invent detections. Any natural-language transcript must be backed by specific DSP/model/prototype evidence.

## Current Backend State

Known live pieces from prior Cursor work:

- `library.manifest` and `library.blob` exist.
- Acoustic files exist on NAS, including ESC-50 and MBARI Pacific Sound.
- `GET /api/mindex/library/blobs?category=acoustic` returns real rows.
- `GET /api/mindex/library/blobs/{id}/stream` streams real WAV files.
- `GET /api/mindex/sine/status` returns service status.
- `GET /api/mindex/sine/blobs/{id}/visualisation` exists.
- `POST /api/mindex/sine/blobs/{id}/analyze` exists.
- `POST /api/mindex/library/blobs/{id}/classify` exists.
- Human identification and wave annotation tables/routes were added:
  - `library.acoustic_wave_annotation`
  - `library.acoustic_human_identification`

Current failure:

- The analysis payload is not sufficient proof of a real classifier.
- Detector groups are too shallow and too narrow.
- Results can look plausible without proving they came from model inference.
- `sound_transcripts` are not a first-class evidence-backed output.
- Deep-signal matching is not yet a real embedding/prototype retrieval system.
- Large MBARI/hydrophone files need chunked/windowed analysis rather than synchronous full-file attempts.

June 5 frontend/backend evidence:

- Codex updated the SINE player to request high-detail visualisation with explicit query params:
  - `max_waveform_points=8192`
  - `waveform_points=8192`
  - `waveform_buckets=8192`
  - `max_spectrogram_columns=1024`
  - `max_spectrogram_rows=256`
  - `n_fft=2048`
  - `hop_length=128`
  - `window=hann`
  - `include_envelope=true`
  - `include_rms=true`
  - `include_power_db=true`
  - `quality=oscilloscope`
- Codex also changed the SINE scope canvas to use a responsive high-DPI backing buffer instead of a fixed `2400px` backing width. The frontend is ready to draw more detailed data when MINDEX returns it.
- Probe through the 3010 BFF still returned only:
  - `800` waveform points
  - `64 x 44` spectrogram cells
  - `duration_sec=5.0`
  - `sample_rate_hz=16000`
- Example probe:

```powershell
$id='a742bbd6-383d-4a7f-8945-e3c7d55c1982'
$params='start_sec=0&end_sec=5&max_waveform_points=8192&waveform_points=8192&waveform_buckets=8192&max_spectrogram_columns=1024&spectrogram_columns=1024&max_spectrogram_rows=256&spectrogram_rows=256&n_fft=2048&hop_length=128&window=hann&scale=linear&f_min=0&f_max=8000&include_envelope=true&include_rms=true&include_power_db=true&quality=oscilloscope'
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/blobs/$id/visualisation?$params"
```

This proves the frontend can ask for oscilloscope-grade data, but the backend still clamps or ignores the high-definition request. Cursor must implement real configurable visualisation resolution instead of returning the old 800-point / 64x44 payload.

June 5 frontend truthfulness guard:

- Codex removed the frontend fallback that converted raw detector rows into "sound transcript" prose.
- The UI now renders the `Live sound transcript narrator` only when MINDEX returns real `sound_transcripts`.
- `frequency_detections`, `activity_segments`, bird/UAV/NPS/deep-signal rows, and other detector outputs still render as detector lanes and event timeline data.
- Those detector rows are not enough to explain what the sound means.
- Cursor must return evidence-backed `sound_transcripts` from the backend classifier/transcript pipeline. The Website will no longer fake this from detector rows.

June 5 model-evidence frontend readiness:

- Codex prepared the shared SINE player to parse and display `model_outputs`.
- Codex prepared the shared SINE player to parse and display `fusion_evidence`.
- Codex prepared the scope canvas to draw a `MODEL WINDOWS` overlay when `model_outputs` include `start_sec` and `end_sec`.
- Codex prepared transcript rows to display explicit evidence badges from `evidence_ids`, `fusion_evidence_ids`, `model_output_ids`, `detector_event_ids`, `prototype_ids`, and `evidence_summary`.
- Codex upgraded the prototype matches panel to display `deep_signal_matches` plus any `fusion_evidence` rows with prototype IDs or prototype-kind metadata.
- Codex added a model/human review card that displays aligned, contested, or awaiting-model state from the latest saved human identification and current model label.
- Codex added a visible run gate that reads `status`/`state`, `job_id`/`analysis_job_id`/`queue_id`, model-output status, file size, and model evidence to distinguish short-file, detector-only, model-unavailable, queued/running, model-ready, and long-file windowed-job states.
- The new `Model evidence` panel in the SINE stack stays in a pending state until MINDEX returns those fields.
- The SINE architecture panel now exposes the AI Studio target stack as pending/evidence stages:
  - decoded waveform
  - `SINEFrontendV1` log-mel/PCEN/MFCC features
  - ResNetish/VGGish/CNN spectrogram trunk
  - CRNN/GRU temporal sequence block
  - attention pooling
  - 512D projection/prototype retrieval
  - semantic heads
  - evidence fusion
- Attention and semantic-head rows will only flip from pending when backend `model_outputs`, `fusion_evidence`, or related evidence text proves those stages ran.
- Cursor can now return real model output rows and fusion evidence without waiting for another frontend schema pass.
- Cursor should include model window bounds (`start_sec`, `end_sec`) on each `model_outputs` row whenever inference is windowed, because the frontend now visualizes those windows directly on the waveform/spectrogram timeline.
- Cursor should include explicit evidence linkage fields on each `sound_transcripts` row. At minimum, each transcript should identify the supporting model output, fusion evidence, detector event, or prototype row using IDs. The Website will display those links as evidence badges and will not infer them by filename or label similarity.
- Cursor can return prototype neighbors through `deep_signal_matches` or through `fusion_evidence` rows with `prototype_id`, `kind`, `label`, `score`, `model`, and `detail`. The Website now combines those into the prototype-neighbor audit panel.
- Cursor should continue to store human tags beside model predictions, not over them. When `disputes_model` is true or the human/model labels differ, the backend should mark/queue the example for active-learning and prototype/model review; the Website now makes that contested state visible.
- Cursor should return queued/running long-file analysis state with stable fields such as `status`, `job_id` or `analysis_job_id`, and a clear `model_unavailable` state when models are not loaded. The Website now displays those states in the `SINE run gate` panel and does not invent queue state.
- Codex also guarded the top `Identification` card. If MINDEX returns only detector rows or a bare `identification_summary`, the UI shows `Model evidence pending` instead of treating the label as confirmed.
- For the UI to show a confirmed identification, MINDEX must return at least one real `model_outputs` row, `fusion_evidence` row, or evidence-backed `sound_transcripts` window.

June 5 frontend evidence payload contract:

- Codex added an oscilloscope-style cursor and region measurement layer to the shared SINE player.
- The frontend now derives the following only from real waveform/spectrogram data returned by MINDEX or decoded from the actual audio stream:
  - cursor time
  - cursor frequency
  - cursor sample index
  - cursor waveform amplitude
  - cursor interpolated spectrogram dB power
  - selected-region centroid frequency
  - selected-region average/min/max dB
  - selected-region dB span
  - selected-region strongest acoustic band
  - selected-region top spectral peaks
  - selected-region time-frequency cell count
- When `POST /api/natureos/mindex/library/wave-annotation` is called, the Website may include:

```json
{
  "region_measurements": {
    "centroid_hz": 1234.5,
    "avg_db": -42.1,
    "min_db": -85.0,
    "max_db": -18.2,
    "db_span": 66.8,
    "cell_count": 12000,
    "strongest_band": {
      "label": "Marine mammal low-mid",
      "min_hz": 20,
      "max_hz": 1000,
      "avg_db": -38.5,
      "share": 0.72
    },
    "top_peaks": [
      {
        "rank": 1,
        "frequency_hz": 340.0,
        "avg_db": -21.4,
        "relative_db": 0.0,
        "band_label": "Marine mammal low-mid"
      }
    ]
  }
}
```

- Cursor must preserve this object in `library.acoustic_wave_annotation` or a related JSONB column without dropping it.
- Cursor should expose saved `region_measurements` back through:
  - `GET /api/mindex/library/blobs/{id}`
  - `GET /api/mindex/library/blobs/{id}/wave-annotations`
  - any future `GET /api/mindex/sine/training/human-tags` export where the human tag or marker references the selected wave region.
- These measurements are not model predictions. They are review evidence attached to a human-selected region. Do not use them as ground truth labels by themselves.
- They should be available to the active-learning queue so a contested example can include both model evidence and human-selected physical measurements.

June 5 latest frontend proof:

- `http://localhost:3010/sensing/sine?codex_sine_backend_handoff=1780709001` mounted the shared SINE player.
- Real ESC-50 WAV rows loaded from MINDEX through the 3010 BFF.
- `Run SINE analysis` rendered, but the UI stayed in `Model evidence pending` state because MINDEX does not yet return real `model_outputs`, `fusion_evidence`, or evidence-backed `sound_transcripts`.
- A bounded visualisation call for `1-115545-A-48.wav` returned HTTP `200` when requesting `end_sec=5` and `f_max=8000`.
- The backend still returned only `800` waveform points and `64 x 44` spectrogram cells despite the frontend requesting `8192` waveform points and `1024 x 256` spectrogram detail.
- Cursor must treat this as backend work still pending: high-definition waveform/spectrogram generation and real model inference are not done.

June 5 deploy-prep frontend update:

- Codex added a real-audio browser scope fallback for short WAV clips.
- If the MINDEX visualisation endpoint is unavailable or returns low-detail scope data for a small recording, the frontend can fetch the real `stream_url`, decode it in the browser, and build:
  - `8192` waveform envelope points.
  - `256 x 1024` spectrogram cells.
  - A `2048`-sample Hann-window FFT per frame, sampled into visible frequency rows.
- This fallback is only a short-file visual inspection path. It is not classification, not a model, not a transcript generator, and not a replacement for backend jobs.
- Compact embedded SINE now starts on short clips too, so `/natureos/mindex` -> Library opens playable ESC-50 files instead of immediately selecting large MBARI recordings.
- The three shared Website surfaces now mount the same component:
  - `/sensing/sine`
  - `/sensing/sine/player`
  - `/natureos/mindex` -> Library -> Acoustic/SINE embed
- Latest browser proof:
  - Public SINE loaded real ESC-50 files, selected a real WAV stream, and rendered browser scope from the real audio stream.
  - Standalone SINE loaded real ESC-50 files and rendered the same architecture/evidence state.
  - MINDEX Library compact embed loaded real ESC-50 rows, selected a small `430.7 KB` WAV, and rendered the browser scope fallback.
- Backend obligation remains unchanged:
  - MINDEX must still serve authoritative high-definition visualisation for short and long files.
  - MINDEX must still run real PyTorch/TorchScript/ONNX/CNN/CRNN/transformer inference.
  - MINDEX must still return real `model_outputs`, `fusion_evidence`, and evidence-backed `sound_transcripts`.
  - Browser scope fallback must not be used as proof that the backend classifier is complete.

June 5 spectrum/oscilloscope frontend readiness:

- Codex added a `Spectrum` visual mode to the shared SINE player.
- Codex added an `Oscilloscope green` spectrogram palette.
- The visible-window measurement panel now derives centroid, average power, dB range, band shares, and visible spectral peaks from the currently loaded spectrogram only.
- These measurements are real signal inspection helpers, but they are not classifier labels.
- Cursor should return richer authoritative backend visualisation and DSP fields so these controls can operate on server-grade data for short clips and large MBARI/hydrophone windows.
- Cursor must still build model inference, embeddings, fusion evidence, and sound transcripts. Frontend spectral peaks must not be treated as a replacement for SINE classification.

June 5 final frontend validation for Cursor:

- `GET http://localhost:3010/api/mindex/sine/status` returned `status: ok`, `product: SINE`, `acoustic_blobs: 2180`, and `detectors_registered: 7`.
- Public `/sensing/sine` mounted the shared SINE player in `embedded` mode, loaded real ESC-50 WAV rows, selected a real 5-second WAV, and rendered the scope/peak UI.
- Standalone `/sensing/sine/player` mounted the shared SINE player in `standalone` mode, loaded real ESC-50 WAV rows, selected a real 5-second WAV, and rendered the scope/peak UI.
- MINDEX `/natureos/mindex` -> Library mounted the shared SINE player in `compact` mode, loaded real ESC-50 WAV rows, selected a real 5-second WAV, and rendered the scope/peak UI.
- In all checked surfaces, the UI treated current detector output as pending model evidence unless the backend returned real `model_outputs`, `fusion_evidence`, or evidence-backed `sound_transcripts`.
- Therefore Cursor can focus on the backend classifier/data-plane work; the shared frontend is ready to show the new fields when they are real.

## ChatGPT / AI Studio Spec, Adapted To MINDEX

Morgan also supplied a system specification for "SINE Spectral Intelligence Network." Treat that prompt as the target behavior, but adapt it to the existing MINDEX routes. Do not create a separate production toy service at `/api/classify` unless it is only an internal alias.

Primary MINDEX routes that must satisfy the spec:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `GET /api/mindex/library/blobs/{id}`

Spec intent:

- SINE produces chronologically detailed sound transcripts.
- These are not speech transcripts.
- A sound transcript maps time windows to physical activities and sources:
  - whale vocalization sweeps
  - dolphin/odontocete click trains
  - bird and insect calls
  - UAV/aircraft blade-pass harmonics
  - vessel propellers and cavitation
  - submarine/engine hums
  - thunder/lightning and impulse shock events
  - ground/seismic/soil low-frequency pulses
- The classifier must combine deterministic DSP priors with a neural embedding space and prototype retrieval.

Required five backend modules from the supplied spec:

1. Audio frame decoder
   - Decode WAV, FLAC, MP3, OGG/Opus, AAC/M4A where feasible.
   - Normalize to mono/multichannel float32.
   - Preserve original sample rate, channel count, codec, duration, and source file metadata.
2. Deterministic DSP pipeline
   - STFT, FFT peaks, zero crossing, RMS/activity, spectral centroid/bandwidth/rolloff, onset/impulse, harmonic/rotor features, and Auditok-style energy segmentation.
3. Deep representational embedding space
   - Produce high-dimensional neural embeddings, target `512D` normalized vectors when using the SINE-Embed family.
   - Use PyTorch/TorchScript/ONNX or a maintained model runtime.
4. Taxonomic/prototype retrieval head
   - Query MINDEX prototype embeddings by cosine similarity.
   - Return prototype labels, source, segment bounds, score/distance, and OOD score.
5. Live sound transcript narrator
   - Build chronological `sound_transcripts` from evidence.
   - Descriptions must be physical and acoustic: frequency sweeps, impulse shocks, blade-pass harmonics, cavitation, calls, clicks, hums, rumbles.
   - Transcript rows must link back to detector/model/prototype evidence.

Minimum expected response shape:

```json
{
  "identification_summary": {
    "top_label": "unknown or evidence-backed label",
    "category": "air|water|ground|animal_life|vessel|weather|mechanical|unknown",
    "confidence": 0.0,
    "ood_score": 0.0,
    "status": "model_loaded|model_unavailable|unknown"
  },
  "activity_segments": [],
  "frequency_detections": [],
  "deep_signal_matches": [],
  "model_outputs": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "latency_ms": 0,
    "sample_rate_in": 16000,
    "channels": 1,
    "models_loaded": [],
    "detectors_ran": []
  }
}
```

If real model evidence is unavailable, return empty `model_outputs`, empty `fusion_evidence`, empty `sound_transcripts`, and `status: "model_unavailable"` or `status: "unknown"`. Do not fill those fields with guessed prose.

### Evidence Contract For Confirmed Meaning

Every confirmed sound-meaning result must be traceable. A user-facing phrase like `lightning`, `UAV rotor`, `humpback vocalization`, `dolphin click train`, `vessel propeller`, `insect chorus`, or `ground impulse` is only allowed when at least one of these evidence paths exists:

- Neural evidence:
  - `model_outputs[].model_name`
  - `model_outputs[].model_version`
  - `model_outputs[].window_start_sec`
  - `model_outputs[].window_end_sec`
  - `model_outputs[].top_labels[]`
  - `model_outputs[].model_checksum` or a registry row reachable from the model version
- Prototype evidence:
  - `deep_signal_matches[].prototype_id`
  - `deep_signal_matches[].embedding_id`
  - `deep_signal_matches[].score`
  - `deep_signal_matches[].source`
  - `deep_signal_matches[].segment_start`
  - `deep_signal_matches[].segment_end`
- DSP evidence:
  - detector event IDs
  - physical features such as frequency peaks, activity windows, impulse energy, harmonic ratios, spectral centroid/rolloff/bandwidth, low-frequency power, or rotor/propeller blade-pass estimates

`sound_transcripts[]` rows should carry an `evidence_ids` array or equivalent foreign-key/provenance field. If evidence is missing, return an honest detector lane and `unknown`/`model_unavailable`; do not promote the lane into a live transcript.

## Existing Frontend Contract Cursor Must Preserve

The website already expects and displays these fields:

- `identification_summary`
- `frequency_detections`
- `activity_segments`
- `bird_detections`
- `uav_detections`
- `nps_detections`
- `deep_signal_matches`
- `sound_transcripts`
- `diagnostics`
- `waveform`
- `spectrogram`
- `human_identifications`
- `wave_annotations`

The older narrow fields may remain for compatibility, but the real classifier must broaden beyond birds/UAVs:

- animal life
- insects
- birds as a subcategory, not the whole animal stack
- air propellers, helicopters, airplanes, UAVs, drone rotors
- water propellers, vessels, cavitation, submarine/engine hums
- weather sounds such as thunder and lightning
- explosions and impulsive shock events
- ground/seismic/soil/surface sounds
- mechanical/industrial sounds
- recurring unknown patterns

Required environment domains:

- `air`
- `water`
- `ground`

Ground includes underground, soil, seismic, geophone, surface vibration, and near-ground acoustic recordings.

## Do Not Use The AI Studio Mock Backend

Local prototype:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Useful:

- `src/types.ts` response schema.
- `src/components/AcousticPlayer.tsx` UI behavior and layout concepts.
- `src/components/ModelExplorer.tsx` model architecture language.

Reject for production:

- `src/data/acousticData.ts` is mock data.
- `server.ts` imports `mockAcousticBlobs`.
- `server.ts` generates WAV audio in code instead of reading NAS-backed files.
- `server.ts` generates waveform/spectrogram responses mathematically instead of decoding the real file.
- `server.ts` uses `GoogleGenAI` / Gemini as an analysis generator.
- `server.ts` falls back to `generateDspHeuristicPayload(blob)` and label-specific branches.
- `server.ts` can create plausible `sound_transcripts` from mock metadata and heuristics.
- The prototype is a good schema/design reference only.

Cursor should not copy synthetic analysis logic into MINDEX.

Specific prototype risk found by Codex:

- `server.ts` imports `mockAcousticBlobs` and serves catalog/detail rows from that mock array.
- `server.ts` creates stream responses with `generateWavBuffer(...)`, meaning the prototype can play audio without a NAS file.
- `server.ts` builds visualisation from generated math rather than decoded samples.
- `performAcousticAnalysis(...)` can ask Gemini to produce classifier JSON from blob metadata.
- `generateDspHeuristicPayload(...)` contains semantic branches such as humpback, canis, uav/phantom, robin, odontocete, ship/vessel/propeller, explosion/impulse, and a generic fallback.
- Those branches are useful as a list of event families to support, but they are disallowed as production classification logic.

June 5 follow-up audit:

- Codex re-read `server.ts` and confirmed the prototype is a self-contained demonstration server, not a production backend.
- The prototype's `GET /api/mindex/library/blobs` and `GET /api/natureos/mindex/library` routes return `mockAcousticBlobs`, not `library.blob` rows.
- The prototype's stream route returns generated WAV bytes from `generateWavBuffer(...)`, not NAS file bytes.
- The prototype's visualisation route returns generated waveform/spectrogram matrices derived from blob IDs such as `humpback`, `uav`, `container`, `explosion`, and other metadata clues.
- The prototype's classification route can use Gemini (`GoogleGenAI`) to generate `identification_summary`, detector arrays, prototype matches, and `sound_transcripts` from metadata alone.
- The prototype fallback path can also generate deterministic-looking `sound_transcripts` without decoding the real file.
- Cursor must not copy or route any of those production paths into MINDEX.
- If any production endpoint returns analysis fields containing `gemini`, `aistudio`, `mock`, `synthetic`, `generated wav`, `metadata-derived`, `filename-derived`, or `heuristic fallback` markers, the Website now quarantines the result and does not count it as confirmed model evidence.

Cursor acceptance test for this risk:

```powershell
rg -n "Gemini|GoogleGenAI|mockAcousticBlobs|generateWavBuffer|synthetic|heuristic fallback|metadata-derived|filename-derived" mindex_api mindex_etl tests
```

Production implementation may keep explicit test fixtures under `tests/fixtures`, but no production route should hit these patterns. If a term appears for a legitimate reason, the completion report must explain why it is not reachable from production endpoints.

Safe parts to port:

- Type schema names and UI response shape.
- The idea of chronological `sound_transcripts`.
- The `SINEFrontendV1` architecture language: log-mel/STFT + PCEN branch, convolution trunk, bidirectional GRU/CRNN temporal block, attention pooling, 512D projection.
- The model explorer concept, but only when populated with real runtime/model registry data.

## Local Frontend Signal-Tool References

The Website already has scientific signal visualizer patterns in Fungi Compute. These are reference points for UX/control behavior, not backend classifiers:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\oscilloscope.tsx`
  - Canvas grid, persistence, cursor, time scale, voltage scale, channel controls, and export behavior.
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\stft-spectrogram.tsx`
  - STFT-style spectrogram drawing, color maps, frequency range controls, band power, and time/frequency axis behavior.
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\spectrum-analyzer.tsx`
  - FFT spectrum, waterfall mode, peak markers, frequency bands, log scale, power/SNR readouts.

Use these local files as a style/interaction reference for SINE:

- oscilloscope-like grid, cursor, zoom, range, and persistence controls
- real canvas rendering from real signal buffers
- waveform/spectrogram/spectrum readouts with clear physical units
- no visual stubs and no generated/fake signals

Do not route SINE acoustic classification through Fungi Compute. Fungi Compute is bioelectric. SINE is acoustic. The shared lesson is the instrument UI standard and the insistence on real signal buffers.

## Source Audit And What Cursor Should Port

Codex cloned/read the acoustic baseline repos locally under these audit folders:

- Primary audit set: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-sine-repo-audit`
- Earlier website-local audit set: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos`

Cursor should inspect upstream repos again inside the MINDEX context, review licenses, and port concepts/code only where appropriate. Do not blindly vendor old TensorFlow projects or prototype notebooks into the production API.

### Source Audit Matrix

| Source | Files inspected locally | What to port into SINE | What not to ship as-is |
| --- | --- | --- | --- |
| `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier` | `server.ts`, `src/types.ts`, `src/components/AcousticPlayer.tsx`, `src/components/ModelExplorer.tsx`, `src/data/acousticData.ts` | UI/schema language, `sound_transcripts` response shape, model-stack vocabulary, model explorer concepts. | Do not deploy `server.ts`; it uses mock blobs, synthetic WAVs, generated visualisation, Gemini/heuristic labels, and metadata-based plausible events. |
| `https://github.com/dimastatz/deep-signal` | `README.md`, Spark/MediaRDD concept files, Python transcription examples | Future distributed NAS-scale batch/streaming architecture for MBARI and large soundscape corpora; use the idea of media RDD/DStream style processing for async jobs. | Do not treat it as the classifier. Current repo is early-stage and speech/transcription oriented, not a finished SINE acoustic identification backend. |
| `https://github.com/IBM/MAX-Audio-Classifier` | `api/predict.py`, `core/model.py`, class-label CSV | Model-serving pattern, AudioSet-style ontology, top-N label/probability response, VGGish/embedding service concepts. | Old TensorFlow 1/Keras stack should be modernized or replaced by PyTorch/ONNX/PANNs/AST/BEATs/CLAP. |
| `https://github.com/daisukelab/sound-clf-pytorch` | `src/models.py`, `src/libs.py`, `src/augmentations.py` | PyTorch/torchaudio log-mel pipeline, ResNetish/VGGish families, Lightning training loop, long-file split dataset, mixup/augmentation. This is the best first baseline for SINE trainable heads. | Do not copy config blindly; adapt sample rate/windowing to SINE model registry and NAS data. |
| `https://github.com/ksanjeevan/crnn-audio-classification` | `net/model.py`, `data/transforms.py` | CNN + RNN/GRU temporal modeling for variable-length sequences: whale song progressions, rotor harmonics, insects, impulse trains, long hydrophone windows. | Do not ship as a toy classifier without model registry, versioning, and persisted evidence. |
| `https://github.com/GorillaBus/urban-audio-classifier` | `README.md`, notebooks, helper files | UrbanSound/environmental workflow, MFCC vs log-mel comparison, augmentation, confusion/evaluation discipline. Useful for air/environmental heads. | Old notebook workflow is not a production API. |
| `https://github.com/abishek-as/Audio-Classification-Deep-Learning` | `README.md`, `assets/Predict.py`, saved `.h5` model references | Baseline comparison only: ANN, CNN1D, CNN2D over 128 MFCC means, UrbanSound8K labels, prediction-time comparison discipline. Useful as a sanity-check harness for simple environmental classes. | Do not ship the Django demo, `.h5` models, or mean-MFCC-only predictor as SINE production intelligence. Convert any useful comparison into PyTorch/ONNX tests. |
| `https://github.com/imfing/audio-classification` | `feat_extract.py`, `cnn.py` | Classic feature baseline: MFCC, chroma, mel, spectral contrast, tonnetz. Useful for diagnostics and explainability. | Do not rely on it as the high-end SINE model. |
| `https://github.com/daisukelab/ml-sound-classifier` | `common.py`, model/training helpers | Edge/live concepts: fixed-window preprocessing, long-file mel splitting with overlap, smoothing/ensembling, lightweight MobileNet/AlexNet options. | Do not route production through Raspberry Pi demo assumptions. |
| `https://github.com/ilge/gmtk-audio-classification` | README/Git metadata; Windows checkout failed on invalid old log paths | Classic temporal smoothing ideas: HMM/GMM, filterbank envelopes, feature ranking, online event classification. | Do not use as a direct Windows checkout dependency; review upstream on Linux or by sparse checkout if needed. |
| `https://github.com/braydenoneal/neural-audio-classification` | `src/spectrogram.py`, `src/neural_network.py`, `src/predict.py` | Spectrogram-image baseline: high-resolution mel image generation, PyTorch CNN training, TorchScript save path, and image-grid visualization concepts. Useful to test whether SINE visual windows can become model inputs. | Do not ship its 10-class toy image-folder classifier or `hop_length=1` defaults without performance review; fold the ideas into SINE feature extraction and model registry. |
| `https://github.com/microsoft/acoustic-bird-detection` | `README.md`, `preprocess.py`, notebook references | Bioacoustic small-data workflow: 2-second windows, positive/negative labels, mel filter-bank features, species detector training, human labeling workflow. Birds become one subcategory of `animal_life`. | Do not make "bird" the whole signal stack. Old TensorFlow/Biophony starter kit should be modernized or wrapped carefully. |
| `https://github.com/amsehili/auditok` | `README.rst` | Real activity segmentation using energy thresholds, event boundaries, leading/trailing silence, stream/file support. Use for `activity_segments` and pre-window detection. | Auditok is not a semantic classifier; it only finds where sound activity occurs. |
| `https://github.com/pcasabianca/Acoustic-UAV-Identification` | README, mel preprocess, CNN/CRNN training, late-fusion scripts, performance scripts | UAV/rotor branch: mel features, CNN/CRNN heads, pitch-shift augmentation, hard/soft late fusion, model confidence aggregation. Use for `air_propeller` and `uav` subcategories. | Old TensorFlow scripts and placeholder paths are not production. Convert concepts to SINE PyTorch/ONNX model registry. |
| `https://github.com/nationalparkservice/acoustic_discovery` | `README.md`, `nps_acoustic_discovery/feature.py`, `model.py`, `discover.py`, model configs | Sliding detection probabilities, Raven-style timeline outputs, species thresholds, MFCC + deltas, model config per species, chunked ffmpeg processing for long recordings. Excellent pattern for detector probability lanes. | Keras species models are useful references but must be license/review checked and registered if used. |
| `https://github.com/pschatzmann/arduino-audio-tools` and Simple Frequency Detection wiki | `examples/sandbox/streams-generator-freq/streams-generator-freq.ino`, `examples/tests/fft/fft-topn/fft-topn.ino` | Edge/device frequency detection concepts: zero crossing, autocorrelation, FFT top-N bins, RealFFT result arrays. Use to design device-side SINE telemetry and server-side frequency event schema. | Do not port C++ Arduino code directly into the Python API; mirror the algorithms with scipy/torch/numpy and keep device firmware separate. |
| OVH marine mammal audio examples | `ai-training-examples/jobs/audio/audio-classification/train-audio-classification.py`, Streamlit app, marine notebook | Marine/hydrophone feature workflow: librosa STFT, spectral rolloff, chroma, RMS, centroid, bandwidth, ZCR, MFCC, 30-second marine mammal examples, 45-class Watkins-style training path. | Old dense TensorFlow over aggregate features is a baseline only; SINE should prefer PyTorch CNN/CRNN/transformer windows for production. |

### Concrete Code Extraction Tasks For Cursor

The user specifically does not want another agent to merely cite these repos. Cursor should open the local audit clones and extract the useful implementation patterns into MINDEX modules, with tests proving the ported behavior.

Read source spec:

- `C:\Users\Owner1\.codex\attachments\f8dd2ed4-3ae7-4257-9c39-8b3bcbdb3c60\pasted-text.txt`
  - Key requirements from the ChatGPT system spec:
    - chronological `sound_transcripts`
    - audio frame decoder for WAV/FLAC/MP3
    - deterministic DSP priors: STFT, centroid, zero-crossing, Auditok-style activity windows
    - 512D deep embedding space
    - prototype retrieval with cosine similarity
    - descriptions based on physical acoustics: sweeps, impulses, blade-pass harmonics, pressure pulses, vocalizations
    - diagnostics: latency, sample rate, channels

Cursor must include a `SINE baseline source audit proof` section in its completion report. For every repo below, report one of:

- `implemented`: name the MINDEX file(s), test(s), and endpoint response fields that now use the extracted idea.
- `deferred`: name the exact reason, such as license uncertainty, old TensorFlow-only runtime, dependency risk, or P1/P2 scope.
- `rejected`: explain why it is unsafe or irrelevant for production SINE.

It is not acceptable to say only that a repo was "reviewed" or "incorporated." The completion report must map source code to MINDEX code and evidence.

Required source-to-implementation proof matrix:

| Baseline source | Cursor must prove |
| --- | --- |
| `sound-clf-pytorch` | `features.py` or training code uses real log-mel/ResNetish/VGGish-style feature/model concepts; tests show tensor shape and top-N model output on a real ESC-50 clip. |
| `MAX-Audio-Classifier` | `model_runtime.py` has a serving wrapper pattern with top-N labels/probabilities, model load status, label map, checksum, and no TensorFlow 1 session dependency. |
| `crnn-audio-classification` | CRNN/GRU temporal model path exists or is explicitly deferred; if implemented, response evidence proves a sequence/temporal window ran. |
| `Acoustic-UAV-Identification` | Rotor/UAV/propeller branch extracts mel/MFCC/rotor harmonic or late-fusion concepts; acceptance proof includes air propeller versus non-propeller negative test. |
| `GorillaBus/urban-audio-classifier` and `abishek-as/Audio-Classification-Deep-Learning` | Environmental/UrbanSound baseline concepts become comparison tests or confusion/evaluation harness, not production-only labels. |
| `imfing/audio-classification` | Classic feature diagnostics include MFCC/chroma/mel/spectral contrast/tonnetz or a documented subset in `diagnostics.features`. |
| `ml-sound-classifier` | Long-file splitting, smoothing, or edge/window logic influences the MBARI window job path; proof includes a long-file bounded-window check. |
| `gmtk-audio-classification` | HMM/filterbank/temporal smoothing ideas are either implemented for event continuity or explicitly deferred with a reason. |
| `braydenoneal/neural-audio-classification` | Spectrogram-image/TorchScript ideas are either used in feature rendering/model export proof or rejected for performance reasons. |
| OVH marine audio examples | Marine/hydrophone path references the audio job/notebook feature flow; proof includes MBARI/Watkins/NOAA-style window support or P1 deferral. |
| `acoustic-bird-detection` | Bird detector remains a subcategory under animal-life; proof includes a small-data species-window training/label workflow or deferral. |
| `auditok` | Activity segmentation produces real activity windows from sample energy, not metadata. |
| `arduino-audio-tools` frequency examples | Frequency detector mirrors zero-crossing/autocorrelation/FFT top-N ideas in Python/Numpy/Scipy/Torch and keeps firmware code separate. |
| `deep-signal` | Any use is limited to future distributed processing/embedding pipeline concepts; it must not be claimed as the classifier. |

Completion evidence must include at least:

- one `pytest` result covering feature extraction, runtime loading, transcript evidence, human correction, and large-window behavior;
- one real `curl`/HTTP proof from `192.168.0.189:8000` or the local MINDEX API container;
- one model artifact path and checksum under the approved acoustic model storage;
- one adversarial check proving filename/source metadata alone cannot produce a semantic label.

P0 code ports:

1. `mindex_api/services/sine_acoustic/features.py`
   - Start from `sound-clf-pytorch/src/libs.py` and `audio-classification/feat_extract.py`.
   - Implement real window feature extraction:
     - mono float32 samples
     - log-mel spectrogram
     - PCEN or equivalent adaptive normalization channel
     - MFCC, chroma, spectral contrast, tonnetz where useful for explainable diagnostics
     - per-window metadata: sample rate, FFT size, hop, start/end seconds, normalization profile
   - Output tensors must be stable enough for both model runtime and stored diagnostics.

2. `mindex_api/services/sine_acoustic/model_runtime.py`
   - Start from `MAX-Audio-Classifier/api/predict.py` and `MAX-Audio-Classifier/core/model.py`, but modernize the runtime.
   - Implement a FastAPI-friendly service wrapper that returns top-N labels/probabilities per window.
   - Do not port TensorFlow 1 sessions as production runtime.
   - Required supported runtimes:
     - PyTorch eager for local training smoke
     - TorchScript or ONNX Runtime for production inference
   - Required response evidence:
     - model artifact path
     - model checksum
     - label map checksum
     - feature parameters
     - model latency

3. `mindex_api/services/sine_acoustic/models/resnetish.py`
   - Use `sound-clf-pytorch/src/models.py` as the first concrete neural baseline.
   - Build a PyTorch ResNetish/VGGish-style spectrogram classifier for ESC-50 and environmental audio.
   - P0 target: load or train one real ESC-50/environmental head and return real `model_outputs`.
   - This is the first proof that SINE can run real neural inference on real NAS audio.

4. `mindex_api/services/sine_acoustic/models/crnn.py`
   - Use `crnn-audio-classification/net/model.py` and `Acoustic-UAV-Identification/2 - Model Training/CRNN_Trainer.py` as references.
   - Implement or register a CRNN/GRU temporal model path for long evolving acoustic events.
   - P1 target domains:
     - whale/dolphin/click/vocal sweep sequences
     - UAV/helicopter/air propeller cycles
     - water propeller/cavitation cycles
     - insect/cicada/stridulation sequences
     - ground/seismic repeated impulses

5. `mindex_api/services/sine_acoustic/activity.py`
   - Use Auditok as a real segmentation dependency or reproduce its energy-threshold semantics with scipy/numpy.
   - `activity_segments` must be actual acoustic activity bounds, not fixed windows.
   - Store noise floor, threshold, leading/trailing silence, and confidence.

6. `mindex_api/services/sine_acoustic/frequency.py`
   - Use Arduino Audio Tools frequency-detection concepts for device-side compatibility, but implement the server code in Python.
   - Required detectors:
     - FFT top-N peaks
     - zero crossing pitch estimate
     - autocorrelation pitch estimate
     - harmonic ladder / blade-pass candidate detection
     - low-frequency ground/seismic band extraction

7. `mindex_api/services/sine_acoustic/uav.py`
   - Use `Acoustic-UAV-Identification/1 - Preprocessing and Features Extraction/Mel_Preprocess_and_Feature_Extract.py`, `2 - Model Training/CNN_Trainer.py`, `2 - Model Training/CRNN_Trainer.py`, and late-fusion scripts as the pattern.
   - Convert the concept into SINE's PyTorch/ONNX registry.
   - Do not ship old placeholder paths or TensorFlow `.h5` assumptions.
   - Output must map into `air_propeller_detections` and `uav_detections` with rotor/propeller evidence.

8. `mindex_api/services/sine_acoustic/bioacoustics.py`
   - Use Microsoft acoustic-bird-detection for small-data animal detector workflow:
     - two-second positive/negative windows
     - human labels
     - feature extraction
     - lightweight classifier over pretrained/learned features
   - Birds are one subcategory of `animal_life`; do not limit SINE to birds.
   - Extend taxonomy to whale, dolphin, seal, bat, frog, insect, and other animal acoustic classes through labels/prototypes.

9. `mindex_api/services/sine_acoustic/nps_profile.py`
   - Use `nationalparkservice/acoustic_discovery` for detector probability lanes, chunked long-file processing, thresholds, and Raven-style timeline thinking.
   - Required output style:
     - detector probability over time
     - threshold crossings
     - per-species/profile config
     - timeline rows that the frontend can group/collapse

10. `mindex_api/services/sine_acoustic/marine.py`
    - Use OVH marine notebook/job only as feature/training reference.
    - Replace aggregate-only dense TensorFlow with SINE windowed PyTorch/ONNX models.
    - P1 model should support MBARI/Watkins/NOAA-style hydrophone windows and return marine mammal/vessel/impulse candidates.

11. `mindex_api/services/sine_acoustic/prototypes.py`
    - Build the 512D or model-specific prototype bank:
      - embedding vector
      - label
      - domain
      - source dataset
      - human verified flag
      - model/version
      - cosine similarity
    - Store embeddings and prototypes in Postgres with vector search where available.
    - `deep_signal_matches` must be generated from actual vectors, not hard-coded names.

12. `mindex_api/services/sine_acoustic/transcripts.py`
    - Implement the ChatGPT spec's `sound_transcripts` as evidence-backed rows.
    - Each transcript row must include:
      - start/end seconds
      - label
      - sound source
      - confidence
      - frequency range
      - evidence IDs for DSP events, model outputs, and/or prototype matches
      - a physical-acoustics description
    - Do not generate transcript prose from an LLM unless the LLM is only summarizing already verified evidence IDs.

P0 acceptance proof:

- Run one real short ESC-50 clip through the backend.
- Show raw decoded sample rate/channels/duration.
- Show feature tensor shape.
- Show model artifact path/checksum/label map.
- Show top-N probabilities from a real model.
- Show persisted `sine.analysis_run` and `sine.model_output` rows.
- Show the frontend leaving `Model evidence pending` behind because real `model_outputs` and `fusion_evidence` exist.

P1 acceptance proof:

- Run one MBARI/hydrophone clip in windowed/queued mode.
- Return at least activity windows, high-definition waveform/spectrogram data, deterministic frequency/impulse events, and either a marine prototype match or an explicit `model_unavailable` state.
- Do not timeout on large files; queue and poll.

### Model Families Cursor Should Implement Or Register

Cursor does not need every model family trained in one pass, but the backend architecture must support them cleanly:

- Deterministic DSP detectors: FFT peaks, zero crossing, autocorrelation pitch, RMS/activity, onset/impulse, harmonic/rotor, low-frequency ground/marine bands.
- SINEFrontendV1 feature extractor:
  - canonical mono float32 waveform windows
  - log-mel magnitude channel
  - PCEN/adaptive normalization channel
  - optional MFCC + delta + delta-delta branch for explainable NPS-style probability lanes
  - deterministic window metadata: `start_sec`, `end_sec`, sample rate, FFT size, hop length, and normalization profile
- CNN/ResNetish heads over log-mel or PCEN spectrograms for ESC-50/environmental and general sound events.
- CRNN/GRU/LSTM heads for time-evolving sounds such as whales, insects, rotors, repeated impacts, and seismic/ground pulses. The AI Studio `ModelExplorer` target is: ResNetish convolution trunk -> bidirectional GRU temporal block -> attention pooling -> 512D normalized projection.
- Transformer or pretrained foundation heads where available: AST, PANNs/CNN14, BEATs, HTS-AT, YAMNet-equivalent, CLAP/audio-text embeddings, or other maintained PyTorch/ONNX audio models.
- Prototype embedding retrieval: 512D or model-specific embeddings, cosine similarity, prototype labels, human-verified examples, and OOD score.
- Detector fusion: combine DSP evidence, neural head probabilities, prototype matches, and human-tag priors into an evidence record without hiding disagreement.

### Minimum "Real" Bar

For Cursor to call SINE analysis real:

- At least one PyTorch/TorchScript/ONNX model must be loaded from a registered model path.
- `sine.status` must report model name, version, checksum, label count, and loaded/unloaded state honestly.
- `POST /api/mindex/sine/blobs/{id}/analyze` must state exactly which DSP detectors and neural models ran.
- `identification_summary` must be derived from actual model/DSP/prototype outputs, not filename/source text.
- `sound_transcripts` must include evidence links to detector events, model outputs, and/or prototype matches.
- Missing models must return `model_unavailable` or `models_loaded: []`, not fake labels.

### Dataset/Domain Mapping

Use the existing NAS library and training sources to map real SINE domains:

- `air`: ESC-50, UrbanSound, AudioSet-like labels, birds, insects, wildlife, aircraft, helicopters, UAVs, weather.
- `water`: MBARI, Watkins/WHOI, NOAA/NCEI/PAD/NRS where licensed, hydrophones, vessels, cavitation, marine mammals, underwater impulses.
- `ground`: seismic/geophone/soil/surface recordings, low-frequency impulses, underground vibration, earthquake-adjacent signals.

All domains should share common windowing, feature extraction, model registry, analysis persistence, and human correction flows.

## Required Backend Architecture

Cursor should implement the SINE backend as a real service stack, not as one endpoint function. Suggested file layout in the MINDEX repo:

- `mindex_api/services/sine_acoustic/decoder.py`
- `mindex_api/services/sine_acoustic/windowing.py`
- `mindex_api/services/sine_acoustic/visualisation.py`
- `mindex_api/services/sine_acoustic/dsp.py`
- `mindex_api/services/sine_acoustic/activity.py`
- `mindex_api/services/sine_acoustic/frequency.py`
- `mindex_api/services/sine_acoustic/model_registry.py`
- `mindex_api/services/sine_acoustic/model_runtime.py`
- `mindex_api/services/sine_acoustic/features.py`
- `mindex_api/services/sine_acoustic/embedding.py`
- `mindex_api/services/sine_acoustic/prototypes.py`
- `mindex_api/services/sine_acoustic/fusion.py`
- `mindex_api/services/sine_acoustic/transcripts.py`
- `mindex_api/services/sine_acoustic/persistence.py`
- `mindex_api/services/sine_acoustic/jobs.py`
- `mindex_api/routers/sine.py`
- `mindex_api/routers/library.py`
- `mindex_etl/jobs/sine_analyze_library.py`
- `mindex_etl/jobs/sine_build_embeddings.py`
- `mindex_etl/jobs/sine_train_heads.py`
- `mindex_etl/jobs/sine_evaluate_models.py`

Suggested tests:

- `tests/test_sine_decoder_windowing.py`
- `tests/test_sine_visualisation_resolution.py`
- `tests/test_sine_dsp_events.py`
- `tests/test_sine_model_registry_runtime.py`
- `tests/test_sine_analyze_real_model.py`
- `tests/test_sine_prototype_matching.py`
- `tests/test_sine_sound_transcripts.py`
- `tests/test_sine_human_corrections.py`
- `tests/test_sine_large_file_queueing.py`

### 1. Decoder And Windowing Layer

Create a real decoder module, for example:

- `mindex_api/services/sine_acoustic/decoder.py`

Requirements:

- Resolve a `library.blob` row to a safe local NAS path.
- Validate blob category is acoustic.
- Decode WAV now and support FLAC, MP3, OGG/Opus, AAC/M4A, WebM/MP4 audio later.
- Use `soundfile` when possible and ffmpeg/audioread fallback when needed.
- Return:
  - samples
  - original sample rate
  - channels
  - codec/container
  - duration
  - content hash
  - decode warnings
- Normalize amplitude safely for feature extraction without altering stored audio.
- Support:
  - full short clip decode
  - windowed decode by `start_sec`, `end_sec`
  - overlapping fixed windows for long files
  - stream-safe large-file analysis for MBARI clips

Suggested model windows:

- short environmental clips: 5 seconds, 50 percent overlap
- AudioSet/PANNs/AST style: 5 to 10 seconds, model-specific
- hydrophone/marine: 5, 10, 30, and 60 second configurable windows
- ground/seismic: longer low-frequency windows where needed

### 2. High-Resolution Visualisation Layer

Upgrade:

- `GET /api/mindex/sine/blobs/{id}/visualisation`

Required query params:

- `start_sec`
- `end_sec`
- `max_waveform_points`
- `max_spectrogram_columns`
- `n_fft`
- `hop_length`
- `window`
- `scale=linear|mel|log`
- `f_min`
- `f_max`

Required response:

```json
{
  "ok": true,
  "blob_id": "uuid",
  "duration_sec": 5.0,
  "waveform": {
    "times": [0.0],
    "min": [-0.2],
    "max": [0.3],
    "rms": [0.11],
    "amplitudes": [0.05]
  },
  "spectrogram": {
    "times": [0.0],
    "frequencies": [20, 40, 80],
    "power_db": [[-80, -76, -70]]
  },
  "metadata": {
    "sample_rate_hz": 16000,
    "n_fft": 2048,
    "hop_length": 512,
    "scale": "linear",
    "window": "hann",
    "power_unit": "dbfs"
  }
}
```

Acceptance target:

- Short 5-second ESC-50 clips should return at least 4096 waveform buckets or enough min/max/rms buckets for smooth zoom.
- Short clips should return at least 128 frequency rows and 512 time columns when requested.
- Long files should support bounded windows without timing out.

### 3. Deterministic DSP Layer

Create/upgrade:

- `mindex_api/services/sine_acoustic/dsp.py`
- `mindex_api/services/sine_acoustic/events.py`

Required features:

- STFT
- FFT peak frequencies
- RMS/energy
- zero-crossing rate
- spectral centroid
- spectral bandwidth
- spectral rolloff
- spectral flatness
- spectral contrast
- MFCC
- chroma where useful
- onset/impulse detection
- activity segments using `auditok` or equivalent
- harmonic/percussive separation where useful
- envelope/filterbank features for rotor/propeller/impulse patterns
- confidence scores with clear formulas or calibration notes

Required event families:

- `frequency`
- `activity`
- `animal_life`
- `insect`
- `air_propeller`
- `water_propeller`
- `vessel`
- `weather`
- `impulse`
- `ground_seismic`
- `mechanical`
- `prototype_match`
- `unknown`

Legacy aliases:

- `bird_detections` can remain as a subcategory of `animal_life`.
- `uav_detections` can remain as a subcategory of `air_propeller`.
- `nps_detections` can remain as a profile-match view.

### 4. Learned Model Layer

Create a real model service, for example:

- `mindex_api/services/sine_acoustic/model_runtime.py`
- `mindex_api/services/sine_acoustic/model_registry.py`
- `mindex_api/services/sine_acoustic/embedding.py`

Required runtime:

- PyTorch as primary framework.
- Export supported via TorchScript and/or ONNX Runtime.
- Model files on NAS:
  - `/mnt/nas/mindex/models/acoustic/{model_family}/{version}/`
- Model registry rows in Postgres with:
  - model name
  - model family
  - version
  - checksum
  - framework
  - training datasets
  - sample rate
  - window size
  - label map
  - deployment status
  - created/deployed timestamps

Minimum model heads for Phase 1 real backend:

1. General acoustic ontology head
   - Preferred: PANNs, AST, BEATs, CLAP, YAMNet-equivalent, or AudioSet/VGGish adapter.
   - Purpose: broad top-N AudioSet-like events.

2. Environmental/ESC head
   - Train or use PyTorch baseline over ESC-50 plus current NAS training files.
   - Purpose: prove real model output on the current ESC-50 corpus.

3. Marine/hydrophone head
   - Use OVH marine notebook concepts plus MBARI/Watkins/NOAA sources.
   - Purpose: water domain labels, whales/dolphins/vessels/cavitation/underwater impulses.

4. Rotor/propeller head
   - Use UAV/rotor datasets when available and deterministic harmonic features.
   - Purpose: air and water propeller recognition, helicopter/airplane/UAV/vessel rotor signatures.

5. Ground/impulse/weather head
   - Start with deterministic features and available datasets.
   - Purpose: thunder/lightning/explosion/earthquake/seismic/soil/surface vibration categories.

If all heads cannot be trained in the first pass, the backend must explicitly report which model heads are loaded and which are unavailable. Do not fake a loaded model.

### 5. Prototype/Fingerprint Retrieval Layer

Create a real vector/prototype store:

- embeddings per blob/window
- embeddings per labeled prototype
- cosine or inner-product search
- optional pgvector if available

Suggested tables:

- `sine.embedding`
- `sine.prototype`
- `sine.prototype_match`

Prototype fields:

- `id`
- `label`
- `event_family`
- `event_type`
- `environment`
- `source_dataset`
- `source_blob_id`
- `start_sec`
- `end_sec`
- `model_name`
- `model_version`
- `embedding_dim`
- `embedding`
- `confidence`
- `human_verified`
- `created_at`

Rules:

- `deep_signal_matches` must come from real vector similarity.
- Do not infer matches from filename/source text.
- Include similarity score, prototype label, source, model version, and window bounds.

### 6. Evidence Fusion Layer

Create:

- `mindex_api/services/sine_acoustic/fusion.py`

The fusion layer must combine, but not flatten away, these evidence sources:

- deterministic DSP events
- activity segments
- model top-N probabilities
- model embeddings
- prototype matches
- known source metadata
- human identifications
- prior approved prototypes
- OOD/unknown scores

Rules:

- Human corrections can influence review/prototype suggestions, but must not silently overwrite current model output.
- If model and human disagree, return a contested state and preserve both.
- If all semantic models are missing, return DSP/activity output plus `model_unavailable`, not an invented semantic label.
- If a sound looks like nothing in the prototype bank, return `unknown` with OOD score, not the closest bad label.
- Confidence must include enough diagnostics to tell whether it came from DSP, model probability, prototype similarity, or fusion.

Suggested fusion output:

```json
{
  "model_outputs": [
    {
      "model_name": "sine_esc50_resnetish",
      "model_version": "2026.06.05",
      "window_id": "uuid",
      "start_sec": 0.0,
      "end_sec": 5.0,
      "top_labels": [
        {"label": "thunderstorm", "score": 0.82},
        {"label": "helicopter", "score": 0.09}
      ],
      "ood_score": 0.12
    }
  ],
  "fusion_evidence": [
    {
      "kind": "dsp",
      "event_family": "impulse",
      "event_id": "uuid",
      "weight": 0.31
    },
    {
      "kind": "model",
      "model_output_id": "uuid",
      "weight": 0.49
    },
    {
      "kind": "prototype_match",
      "prototype_match_id": "uuid",
      "weight": 0.2
    }
  ]
}
```

### 7. Sound Transcript Layer

`sound_transcripts` are physical sound-event transcripts, not speech transcription.

Create:

- `mindex_api/services/sine_acoustic/transcripts.py`

Each transcript row must align to one or more real detector/model/prototype events:

```json
{
  "start_sec": 0.0,
  "end_sec": 3.5,
  "label": "Low-frequency marine mammal vocalization",
  "description": "Descending tonal sweep with strong energy between 120 and 400 Hz, matched to marine vocalization prototypes.",
  "sound_source": "candidate humpback whale vocalization",
  "confidence": 0.84,
  "frequency_range": "120 Hz - 400 Hz",
  "event_family": "animal_life",
  "event_type": "marine_mammal_vocalization",
  "evidence": [
    {
      "kind": "model",
      "model": "sine_marine_crnn",
      "version": "2026.06.05",
      "score": 0.84
    },
    {
      "kind": "dsp",
      "feature": "spectral_centroid",
      "value": 322.1
    },
    {
      "kind": "prototype_match",
      "prototype_id": "uuid",
      "score": 0.79
    }
  ]
}
```

LLMs may only rewrite or explain transcripts from this evidence. They must not invent labels/events without evidence.

### 8. Human Correction And Active Learning Layer

Existing table:

- `library.acoustic_human_identification`

Required behavior:

- When a user corrects a label, store:
  - model top label
  - model confidence
  - full model summary
  - human label
  - human category/family/type
  - human confidence
  - notes/evidence
  - disputed/not disputed
  - playback time and selected region if present
  - analysis run ID
- Human tag must not overwrite `identification_summary`.
- Disagreements become training/review candidates.
- Later training should treat human tags as reviewed examples, not blind truth.

Add endpoints:

- `GET /api/mindex/sine/training/human-tags`
- `POST /api/mindex/sine/training/export-human-tags`
- `POST /api/mindex/sine/prototypes/from-human-identification`

Use case:

- Model says `UAV`.
- Morgan knows it is `lightning`.
- Store both, mark contested, queue for retraining/prototype review, and keep the model hypothesis available for audit.

## API Contract To Implement

Keep existing routes and upgrade their internals:

- `GET /api/mindex/sine/status`
- `GET /api/mindex/library/blobs?category=acoustic`
- `GET /api/mindex/library/blobs/{id}`
- `GET /api/mindex/library/blobs/{id}/stream`
- `GET /api/mindex/sine/blobs/{id}/visualisation`
- `GET /api/mindex/sine/blobs/{id}/analysis`
- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`

Add model/prototype/training routes:

- `GET /api/mindex/sine/models`
- `GET /api/mindex/sine/model-registry`
- `POST /api/mindex/sine/blobs/{id}/embed`
- `GET /api/mindex/sine/blobs/{id}/windows`
- `GET /api/mindex/sine/prototypes`
- `POST /api/mindex/sine/prototypes`
- `GET /api/mindex/sine/prototypes/search`
- `POST /api/mindex/sine/training/jobs`
- `GET /api/mindex/sine/training/jobs/{id}`
- `GET /api/mindex/sine/training/human-tags`

`POST /api/mindex/sine/blobs/{id}/analyze` response must include:

```json
{
  "ok": true,
  "analysis_run_id": "uuid",
  "blob_id": "uuid",
  "status": "complete",
  "identification_summary": {
    "top_label": "Thunder",
    "category": "weather",
    "type": "lightning_thunder_impulse",
    "event_family": "weather",
    "confidence": 0.86,
    "ood_score": 0.12,
    "evidence_count": 9,
    "model_version": "sine_general_panns_2026.06.05"
  },
  "activity_segments": [],
  "frequency_detections": [],
  "animal_detections": [],
  "insect_detections": [],
  "bird_detections": [],
  "air_propeller_detections": [],
  "uav_detections": [],
  "water_propeller_detections": [],
  "vessel_detections": [],
  "weather_detections": [],
  "impulse_detections": [],
  "ground_seismic_detections": [],
  "mechanical_detections": [],
  "nps_detections": [],
  "deep_signal_matches": [],
  "model_outputs": [],
  "fusion_evidence": [],
  "sound_transcripts": [],
  "diagnostics": {
    "latency_ms": 0,
    "sample_rate_in": 44100,
    "sample_rate_model": 32000,
    "channels": 1,
    "duration_sec": 5.0,
    "window_count": 1,
    "decode_format": "wav",
    "models_loaded": [],
    "model_versions": {},
    "feature_versions": {},
    "cache_hit": false,
    "queued": false
  }
}
```

For large files, return one of:

- complete result if processed in time
- queued job response with job ID
- partial window result with next cursor

Do not let 500 MB MBARI files block the API until the request times out.

## Database/Migration Requirements

Create a `sine` schema if not already present, or use the existing MINDEX convention if Cursor has already started one. Recommended tables:

```sql
CREATE SCHEMA IF NOT EXISTS sine;

CREATE TABLE IF NOT EXISTS sine.model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  model_family text NOT NULL,
  version text NOT NULL,
  framework text NOT NULL,
  model_path text NOT NULL,
  checksum text NOT NULL,
  sample_rate_hz integer NULL,
  window_sec numeric NULL,
  hop_sec numeric NULL,
  embedding_dim integer NULL,
  label_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  training_datasets jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  deployment_status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_name, version)
);

CREATE TABLE IF NOT EXISTS sine.analysis_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  requested_by text NULL,
  request_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  identification_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  error text NULL
);

CREATE TABLE IF NOT EXISTS sine.detector_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES sine.analysis_run(id) ON DELETE CASCADE,
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  event_family text NOT NULL,
  event_type text NULL,
  detector_name text NOT NULL,
  model_name text NULL,
  model_version text NULL,
  label text NULL,
  confidence numeric NULL,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  peak_sec numeric NULL,
  freq_hz numeric NULL,
  frequency_range jsonb NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.model_output (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES sine.analysis_run(id) ON DELETE CASCADE,
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  model_registry_id uuid NULL REFERENCES sine.model_registry(id) ON DELETE SET NULL,
  model_name text NOT NULL,
  model_version text NOT NULL,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  top_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ood_score numeric NULL,
  latency_ms integer NULL,
  feature_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.sound_transcript (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES sine.analysis_run(id) ON DELETE CASCADE,
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  sound_source text NULL,
  confidence numeric NULL,
  frequency_range text NULL,
  event_family text NULL,
  event_type text NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.embedding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  analysis_run_id uuid NULL REFERENCES sine.analysis_run(id) ON DELETE SET NULL,
  model_registry_id uuid NULL REFERENCES sine.model_registry(id) ON DELETE SET NULL,
  model_name text NOT NULL,
  model_version text NOT NULL,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  embedding_dim integer NOT NULL,
  embedding real[] NOT NULL,
  norm numeric NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.prototype (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  event_family text NOT NULL,
  event_type text NULL,
  environment text NULL,
  source_dataset text NULL,
  source_blob_id uuid NULL REFERENCES library.blob(id) ON DELETE SET NULL,
  source_human_identification_id uuid NULL REFERENCES library.acoustic_human_identification(id) ON DELETE SET NULL,
  start_sec numeric NULL,
  end_sec numeric NULL,
  model_name text NOT NULL,
  model_version text NOT NULL,
  embedding_dim integer NOT NULL,
  embedding real[] NOT NULL,
  human_verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.prototype_match (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES sine.analysis_run(id) ON DELETE CASCADE,
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  embedding_id uuid NULL REFERENCES sine.embedding(id) ON DELETE SET NULL,
  prototype_id uuid NOT NULL REFERENCES sine.prototype(id) ON DELETE CASCADE,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  score numeric NOT NULL,
  rank integer NOT NULL,
  model_name text NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sine.event_family_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_family text NOT NULL,
  event_type text NOT NULL,
  environment text NULL,
  display_label text NOT NULL,
  parent_family text NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_family, event_type, environment)
);

CREATE TABLE IF NOT EXISTS sine.visualisation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  start_sec numeric NOT NULL,
  end_sec numeric NOT NULL,
  params jsonb NOT NULL,
  waveform jsonb NOT NULL,
  spectrogram jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blob_id, start_sec, end_sec, params)
);

CREATE TABLE IF NOT EXISTS sine.training_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

If pgvector is available, use `vector(512)` or model-specific dimensions instead of `real[]` for embeddings and add vector indexes. If pgvector is not available, use normalized dot product in application code for the first pass and document it.

## ETL/Job Requirements

Add real batch jobs:

- `mindex_etl/jobs/sine_build_embeddings.py`
- `mindex_etl/jobs/sine_analyze_library.py`
- `mindex_etl/jobs/sine_train_heads.py`
- `mindex_etl/jobs/sine_evaluate_models.py`
- `mindex_etl/jobs/sine_ingest_training_labels.py`
- `mindex_etl/jobs/sine_export_training_set.py`

Initial batch:

- Process all current ESC-50 acoustic blobs.
- Process a bounded MBARI sample set with water-domain windows.
- Build embeddings and prototypes for known ESC-50 labels.
- Save model diagnostics and evaluation metrics.
- Register each run in Postgres.

Long-term:

- All new NAS files should be classified asynchronously after import.
- Device-originated recordings should be analyzable on return/sync.
- Jetson/offline edge files should backfill into NAS and then into SINE jobs.

## Status Endpoint Requirements

Upgrade `GET /api/mindex/sine/status` to report real readiness:

```json
{
  "ok": true,
  "status": "ok",
  "acoustic_blobs": 2180,
  "models": [
    {
      "model_name": "sine_esc50_resnetish",
      "version": "2026.06.05",
      "framework": "torchscript",
      "loaded": true,
      "checksum": "sha256:...",
      "label_count": 50
    }
  ],
  "detectors": [
    {
      "name": "frequency_fft",
      "version": "2026.06.05",
      "type": "dsp",
      "loaded": true
    }
  ],
  "queues": {
    "analysis_pending": 0,
    "embedding_pending": 0
  },
  "nas": {
    "mounted": true,
    "library_root_present": true
  }
}
```

If a model is missing, say missing. Do not show it as loaded.

## Implementation Plan For Cursor

### Pass 0 - Quarantine Fake Analysis Paths

1. Search the MINDEX SINE backend for mock, fallback, Gemini, synthetic, filename-derived, and metadata-derived classification paths.
2. Move demo/prototype logic behind explicit test-only fixtures or remove it from production endpoints.
3. Make `POST /api/mindex/sine/blobs/{id}/analyze` return an honest `model_unavailable`/`unknown` state if no real model is loaded.
4. Add tests proving that filenames/source IDs alone cannot create semantic labels.
5. Add diagnostics that list every detector/model that actually ran.

Acceptance:

- A WAV with no loaded semantic model can still return real waveform/DSP/activity events, but not a fake `Thunder`, `UAV`, `bird`, or `whale` label.
- Production endpoints do not call Gemini/LLM to invent classifications.
- The UI can show "analysis pending / model unavailable" without fake data.

### Pass 1 - Make Analysis Honest And Persistent

1. Add `sine` schema migrations.
2. Refactor existing `classify_acoustic_file()` so it creates a `sine.analysis_run`.
3. Ensure the response states exactly which detectors/models ran.
4. Remove or quarantine any synthetic/mock/fallback label generator from production endpoints.
5. Preserve existing BFF/frontend response fields.
6. Persist detector events, diagnostics, and transcripts.

Acceptance:

- Running analysis on one ESC-50 clip creates rows in `sine.analysis_run` and `sine.detector_event`.
- If no neural model is loaded, response says model unavailable and does not invent a neural label.

### Pass 2 - Real DSP And Visualisation

1. Implement decoder/windowing.
2. Implement high-resolution visualisation with window params.
3. Implement DSP features/events.
4. Cache visualisation for repeated browser zooms.

Acceptance:

- ESC-50 5-second file returns smooth waveform and spectrogram.
- MBARI long file supports `start_sec=0&end_sec=30` without full-file timeout.
- Frequency/activity/impulse events are explainable from actual features.

### Pass 3 - First Real PyTorch Model Head

1. Train or load a PyTorch ESC-50/environmental head.
2. Store the model on NAS under `/mnt/nas/mindex/models/acoustic/`.
3. Register it in `sine.model_registry`.
4. Run inference in `POST /api/mindex/sine/blobs/{id}/analyze`.
5. Return top-N labels, confidence, model version, and diagnostics.

Acceptance:

- ESC-50 files return labels from a real model, not source metadata.
- `identification_summary.model_version` matches `sine.model_registry`.
- Model output is persisted and auditable.

### Pass 4 - Embeddings And Prototype Matching

1. Add embedding generation.
2. Build prototypes from labeled ESC-50 rows and human-verified labels.
3. Implement cosine similarity search.
4. Populate `deep_signal_matches` from real vector matches.

Acceptance:

- `deep_signal_matches` includes prototype IDs/scores/source/model version.
- Changing the audio window changes the embedding/matches.
- Matches are not derived from filename/source labels.

### Pass 5 - Marine, Rotor, Ground, Weather, Animal Expansion

1. Add marine/hydrophone baseline using MBARI/Watkins/NOAA sample sets.
2. Add rotor/propeller harmonic detector and model head plan.
3. Add ground/seismic/impulse/weather detectors.
4. Add animal/insect categories beyond bird-only.
5. Add event-family mapping table.

Acceptance:

- SINE can classify or honestly mark unknown across `air`, `water`, and `ground`.
- Bird/UAV remain visible but are no longer the only semantic categories.
- Thunder/lightning vs UAV can be represented as a contested model/human example.

### Pass 6 - Human Corrections Become Active Learning

1. Tie `library.acoustic_human_identification` into SINE analysis runs.
2. Add training export endpoints.
3. Promote reviewed human labels into prototypes when approved.
4. Build evaluation sets from human-tagged contested examples.

Acceptance:

- Model says `UAV`, human says `lightning`, both remain stored.
- The sample appears in `GET /api/mindex/sine/training/human-tags`.
- The label can be promoted to a prototype without erasing the model output.

## Testing Checklist

Use real blob IDs from:

```bash
curl -H "X-Internal-Token: $MINDEX_INTERNAL_TOKEN" \
  "http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=20&q=esc"
```

### Backend Smoke

- `GET /api/mindex/health` -> 200.
- `GET /api/mindex/sine/status` -> 200 and lists real models/detectors.
- `GET /api/mindex/library/blobs?category=acoustic&q=esc&limit=5` -> real WAV rows, no `.manifest.json` sidecars.
- `GET /api/mindex/sine/blobs/{id}/visualisation` -> real waveform/spectrogram.
- `POST /api/mindex/sine/blobs/{id}/analyze` -> persisted analysis run.
- `GET /api/mindex/sine/blobs/{id}/analysis` -> same latest run.

### Real Analysis Proof

For an ESC-50 clip:

- returns a real model label and confidence
- returns model name/version/checksum in diagnostics
- stores `sine.analysis_run`
- stores `sine.detector_event`
- stores `sine.sound_transcript`
- returns frequency/activity events from actual DSP
- returns no mock or generated-only label
- changing the selected WAV changes the model logits and DSP features
- blank/silent WAV returns silence/unknown, not an ESC-50 label
- renaming the same audio file does not change the model result
- changing only source metadata does not change the model result

For a MBARI clip:

- analyze a bounded 30-second window
- returns water-domain diagnostics
- does not timeout
- returns either meaningful hydrophone events or honest unknown/OOD

For a human correction:

- post human tag
- latest blob details include the human tag
- model prediction remains unchanged
- `GET /api/mindex/sine/training/human-tags` includes the row

For a wave-region measurement:

- post a wave annotation with `selection` and `region_measurements`
- saved row preserves the full `region_measurements` object
- latest blob details include the saved annotation and its measurements
- `GET /api/mindex/library/blobs/{id}/wave-annotations` returns the same measurements
- if a human tag references the selected region, training/human-tag export includes those measurements as review evidence
- model predictions remain separate from these human-selected physical measurements

### Negative Tests

- Bad blob ID -> 404.
- Non-acoustic blob -> 400.
- Missing model file -> 503 or `model_unavailable`, not fake success.
- Large file without window -> queued job or explicit large-file response, not timeout.
- No NAS mount -> clear service error, no fake data.
- Production SINE backend grep has no reachable Gemini/LLM/mock/synthetic classification route.
- Production tests include a filename/source-metadata adversarial case.
- `sound_transcripts` stays empty unless evidence links exist.

### Cursor Completion Report Format

When Cursor finishes, send Codex/Morgan a report in this exact shape:

```text
SINE real backend P0 completion

Repo:
Commit:
VM deployed:
Migrations:
Model artifact path:
Model checksum:
Model framework:
Model label map:

Status endpoint proof:
- GET /api/mindex/sine/status -> ...

Real ESC-50 proof:
- blob id:
- file:
- model_outputs:
- fusion_evidence:
- sound_transcripts:
- database rows created:

Wave annotation measurement proof:
- blob id:
- POST payload included region_measurements:
- GET blob/latest annotation returned region_measurements:
- training/human-tags export included measurement evidence:

Fake-path removal proof:
- grep/test:
- filename/source adversarial test:
- missing model test:

SINE baseline source audit proof:
- sound-clf-pytorch:
- MAX-Audio-Classifier:
- crnn-audio-classification:
- Acoustic-UAV-Identification:
- GorillaBus/urban-audio-classifier:
- abishek-as/Audio-Classification-Deep-Learning:
- imfing/audio-classification:
- ml-sound-classifier:
- gmtk-audio-classification:
- braydenoneal/neural-audio-classification:
- OVH marine audio examples:
- acoustic-bird-detection:
- auditok:
- arduino-audio-tools frequency examples:
- deep-signal:

Known limits:
- ...

Next backend pass:
- ...
```

## Website Frontend Expectations After Backend Fix

The frontend should not need major structural changes if these backend fields are returned.

The SINE player will:

- display `identification_summary`
- group detector lanes by event family
- show `sound_transcripts`
- show high-res waveform/spectrogram
- show prototype matches
- display model diagnostics
- allow human corrections and wave notes

If Cursor changes API shapes, update this website handoff and tell Codex before touching frontend.

## Paste-Ready Cursor Prompt

Use this as the direct Cursor task:

```text
We need to make SINE real. Morgan QA-tested the SINE player and confirmed that "Run SINE analysis" is not actually doing real classification. Build the real MINDEX backend for SINE acoustic AI on VM 189.

Repo: D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex
API: 192.168.0.189:8000
NAS acoustic files: /mnt/nas/mindex/Library/acoustic
Website frontend/BFF already expects the existing SINE fields and should not invent fake detector rows.

Hard rules:
- No mock audio.
- No synthetic classifications.
- No filename-only guesses.
- No Gemini/LLM as primary classifier.
- Keep human corrections separate from model predictions.
- Store real runs/events/transcripts/diagnostics/model versions in Postgres.

Implement:
0. Quarantine/remove production mock paths: no Gemini-generated labels, no synthetic WAV classification, no filename/source-derived semantic guesses.
1. Real decoder/windowing for NAS acoustic blobs.
2. High-resolution waveform/spectrogram endpoint with window params.
3. Deterministic DSP features: STFT, FFT peaks, RMS, ZCR, centroid, rolloff, bandwidth, flatness, contrast, MFCC, activity, impulse, rotor/propeller, low-frequency ground/marine features.
4. PyTorch/TorchScript/ONNX model runtime with model registry on NAS under /mnt/nas/mindex/models/acoustic.
5. SINEFrontendV1 feature extractor: canonical waveform windows, log-mel channel, PCEN channel, optional MFCC + delta + delta-delta branch, and explicit start/end/sample-rate/FFT/hop metadata.
6. First real model head: ESC-50/environmental PyTorch classifier, persisted and registered.
7. SINE-Embed architecture target: ResNetish/VGGish convolution trunk, bidirectional GRU or CRNN temporal block, attention pooling, and 512D normalized projection embedding.
8. Modern model families where practical: PANNs/CNN14, AST, BEATs, HTS-AT, YAMNet-equivalent, CLAP/audio-text embeddings, CRNN/GRU temporal models, and ResNetish/VGGish-style spectrogram heads.
9. Embedding/prototype store and real cosine similarity for deep_signal_matches.
10. Evidence fusion that returns model_outputs and fusion_evidence without hiding disagreement.
11. Evidence-backed sound_transcripts that describe physical sound windows.
12. Broader taxonomy: animal_life, insect, air_propeller, water_propeller, vessel, weather, impulse, ground_seismic, mechanical, prototype_match, unknown. Bird and UAV are subcategories only.
13. Active-learning hooks from library.acoustic_human_identification. Human label never overwrites model label; contested examples go to training/prototype review.
14. Async/windowed behavior for huge MBARI files so analysis does not timeout.

Keep these existing endpoints and upgrade internals:
- GET /api/mindex/sine/status
- GET /api/mindex/sine/blobs/{id}/visualisation
- GET /api/mindex/sine/blobs/{id}/analysis
- POST /api/mindex/sine/blobs/{id}/analyze
- POST /api/mindex/library/blobs/{id}/classify

Add model/prototype/training endpoints and migrations from:
WEBSITE/website/docs/codex-handoffs/SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN05_2026.md

Baseline repos to inspect/incorporate:
- dimastatz/deep-signal for future NAS-scale batch/streaming concepts, not as the classifier.
- microsoft/acoustic-bird-detection for bioacoustic small-data species detector workflow.
- amsehili/auditok for real activity segmentation.
- pcasabianca/Acoustic-UAV-Identification for rotor/UAV CNN/CRNN and late-fusion concepts.
- nationalparkservice/acoustic_discovery for sliding-window species probabilities, thresholds, Raven-style detections, and chunked ffmpeg processing.
- pschatzmann/arduino-audio-tools frequency detection examples for edge/device FFT, zero-crossing, autocorrelation, and top-N frequency concepts.
- IBM/MAX-Audio-Classifier for AudioSet/VGGish serving ideas.
- daisukelab/sound-clf-pytorch for PyTorch log-mel/ResNetish heads.
- ksanjeevan/crnn-audio-classification for variable-length CRNN.
- GorillaBus/urban-audio-classifier for UrbanSound/MFCC/log-mel workflow.
- abishek-as/Audio-Classification-Deep-Learning for ANN/CNN1D/CNN2D MFCC comparison baselines only.
- braydenoneal/neural-audio-classification for spectrogram-image CNN/TorchScript baseline only.
- imfing/audio-classification for classic features/baselines.
- daisukelab/ml-sound-classifier for live/edge smoothing and chunking.
- ilge/gmtk-audio-classification for HMM/filterbank temporal detection.
- OVH marine mammal notebook for hydrophone/marine classification.

Acceptance:
- ESC-50 analyze returns a real model label, model version, persisted analysis_run and detector_events.
- Confirmed labels must include model_outputs, fusion_evidence, or evidence-backed sound_transcripts; bare identification_summary is not enough.
- MBARI 30-second window analyze works without timeout.
- deep_signal_matches come from real embeddings/prototypes.
- sound_transcripts align to real event windows.
- human correction "model says UAV, human says lightning" stores both and queues the sample for review/training.
- sine/status reports loaded models/checksums honestly.
```

## Related Docs

Use these as supporting context, but this file is the current backend action contract:

- `docs/codex-handoffs/SINE_ACOUSTIC_CLASSIFIER_FULL_CONTEXT_JUN04_2026.md`
- `docs/codex-handoffs/MINDEX_ACOUSTIC_CLASSIFIER_FRONTEND_PLAN_JUN04_2026.md`
- `docs/codex-handoffs/SINE_PLAYER_SHARED_SURFACES_HANDOFF_JUN05_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

## Codex Follow-Up - June 5 Model Provenance Contract

The Website shared SINE player now parses and displays model provenance fields when Cursor returns real model outputs. This is intentionally stricter than a confidence score. For Navy/Psathyrella buoy use, every confirmed model result must be auditable.

Cursor should include these fields on every `model_outputs[]` row where available:

```json
{
  "id": "uuid-or-stable-output-id",
  "model_id": "sine-esc50-resnetish-v1",
  "model_name": "SINE ESC-50 Environmental Head",
  "model_version": "2026.06.05",
  "framework": "pytorch",
  "runtime": "torchscript|onnxruntime|pytorch-eager",
  "artifact_uri": "/mnt/nas/mindex/models/acoustic/sine-esc50-resnetish-v1/model.pt",
  "model_checksum": "sha256...",
  "backend_commit": "git-sha",
  "job_id": "analysis-job-id",
  "inference_id": "per-window-inference-id",
  "device": "cuda:0|cpu|jetson",
  "input_sample_rate_hz": 32000,
  "window_samples": 128000,
  "embedding_dim": 512,
  "start_sec": 0.0,
  "end_sec": 4.0,
  "latency_ms": 18.4,
  "ood_score": 0.08,
  "top_labels": [
    { "label": "thunder_lightning", "score": 0.91, "category": "weather" }
  ],
  "feature_params": {
    "frontend": "SINEFrontendV1",
    "n_fft": 1024,
    "hop_length": 320,
    "n_mels": 128,
    "pcen": true
  }
}
```

The frontend now shows runtime, artifact basename, checksum prefix, model ID, input sample rate, window samples, embedding dimension, device, backend commit, and job/inference IDs in the `Model evidence` panel. If these fields are missing, the UI can still show a model row, but the completion report is not strong enough for production SINE.

Minimum backend acceptance after this pass:

- `model_outputs[]` rows include non-empty `model_name` or `model_id`.
- At least one of `artifact_uri`, `model_checksum`, or registered model metadata proves which artifact produced the result.
- `framework`/`runtime` says whether the inference came from PyTorch, TorchScript, ONNX Runtime, or another explicit runtime.
- `input_sample_rate_hz`, `start_sec`, and `end_sec` prove which real audio window was inferred.
- `embedding_dim` is present for any SINE-Embed/prototype result.
- `backend_commit` or equivalent service build ID is recorded for deploy traceability.

## Codex Follow-Up - June 5 Reference Repo Audit Notes

Codex shallow-cloned the requested baseline repos into a temporary audit folder and inspected the main implementation files that checked out successfully. Treat these notes as current-audit evidence, but do not depend on the temp folder as a durable artifact.

- `IBM/MAX-Audio-Classifier`
  - Inspected `api/predict.py` and `core/model.py`.
  - Useful for: request/response serving pattern, uploaded WAV validation, VGGish embedding generation, 527-class AudioSet-style top-N probability output, and classifier post-processing.
  - Do not copy as-is: old TensorFlow/session/HDF5 runtime; modernize into PyTorch/TorchScript/ONNX or use as a conceptual reference.
- `daisukelab/sound-clf-pytorch`
  - Inspected `src/libs.py`, `src/models.py`, and the training notebook.
  - Useful for: PyTorch/torchaudio log-mel dataset, padding/cropping/splitting long files, Lightning training loop, mixup, ResNetish/VGGish-style models.
  - This remains the strongest P0 baseline for a real ESC-50/environmental head.
- `ksanjeevan/crnn-audio-classification`
  - Inspected `net/model.py` and `eval/infer.py`.
  - Useful for: variable-length mel spectrogram handling, CRNN/LSTM temporal model, packed sequence length handling, and image/audio inference wrappers.
  - Use for time-evolving signals such as whales, insects, rotors, repeated impacts, and seismic pulses.
- `GorillaBus/urban-audio-classifier`
  - Inspected notebook/file inventory.
  - Useful for: UrbanSound8K workflow, MFCC/log-mel preprocessing, augmentation, and comparison notebooks.
  - Use as a sanity-check environmental classifier reference, not production architecture.
- `abishek-as/Audio-Classification-Deep-Learning`
  - Inspected `assets/Predict.py` and README content.
  - Useful for: simple MFCC extractor and ANN/CNN1D/CNN2D prediction comparison discipline.
  - Do not ship the Django demo or old `.h5` predictor as SINE production.
- `daisukelab/ml-sound-classifier`
  - Inspected file inventory including `sound_models.py`, `realtime_predictor.py`, `premitive_file_predictor.py`, and app training scripts.
  - Useful for: live/edge predictor concepts, chunking/smoothing, and MobileNet/AlexNet-style training flows.
- `imfing/audio-classification`
  - Inspected `cnn.py`, `nn.py`, `svm.py`, and `feat_extract.py` inventory.
  - Useful for: classic feature baseline and real-time microphone predictor comparison only.
- `braydenoneal/neural-audio-classification`
  - Inspected `src/spectrogram.py`, `src/neural_network.py`, `src/predict.py`, and `src/record.py` inventory.
  - Useful for: spectrogram-image CNN/TorchScript-style baseline and visual model-input sanity checks.
  - Review performance defaults before use; do not copy high-cost hop/window choices blindly.
- `ilge/gmtk-audio-classification`
  - Checkout on Windows failed because many files appeared as deleted in the working tree after clone; the repo appears to contain GMTK/HMM/filterbank temporal detection experiments and old shell/XML model assets.
  - Treat as optional historical HMM/filterbank reference only unless Cursor audits it directly on Linux.

Cursor should do its own Linux-side audit in the MINDEX repo before porting. The Website handoff now has enough specificity to reject fake backend outputs, but MINDEX owns the actual model code.

## Codex Follow-Up - June 5 Scope Visualisation Backend Requirements

The Website SINE player now renders a denser oscilloscope/spectrogram surface from the real `visualisation` payload. Cursor must treat visualisation data as part of the scientific product, not a decorative preview.

Minimum visualisation response requirements:

- `duration_sec`: full recording duration or analyzed window duration.
- `sample_rate_hz`: decoded source sample rate after any resampling.
- `window_start_sec` / `window_end_sec` or equivalent metadata for long-file windows.
- `waveform.times`: monotonic sample/envelope timestamps aligned to playback seconds.
- `waveform.amplitudes`: normalized waveform trace values.
- `waveform.min`, `waveform.max`, `waveform.rms`: preferred envelope arrays so the browser can draw dense long files without losing peaks.
- `spectrogram.power_db`: real STFT/log-mel/FFT power matrix, not metadata-derived imagery.
- `spectrogram.frequencies`: row frequencies in Hz.
- `spectrogram.times`: column times in seconds.
- Feature parameters used for visualisation: `n_fft`, `hop_length`, `window`, `n_mels` if mel-scaled, `db_ref`, and any PCEN/log-power transform.
- Saved wave annotation `scope` payloads may include `trigger_mode` with values `auto`, `normal`, or `single`; preserve it as reviewer state rather than treating it as model truth.

Acceptance:

- A short ESC-50 clip renders waveform and spectrogram without browser fallback.
- A 30-second MBARI window renders waveform and spectrogram without timing out.
- The frontend source sample-rate readout matches the backend decoded value.
- Spectrogram peak/centroid traces line up with `frequency_detections` and model windows.
- The backend never fabricates `spectrogram.power_db` from filename/source metadata. If the file cannot be decoded, return an honest error and no fake visualisation.

## Codex Follow-Up - June 5 Runtime Status Requirements

The AI Studio prototype contains a polished `SINEStatus.tsx`, but it simulates calibration and assumes model readiness from cosmetic fields. Do not copy that behavior into MINDEX.

Cursor must make SINE status real:

- `GET /api/mindex/sine/status` should distinguish detector-only readiness from trained-model readiness.
- Return real model artifacts registered on disk/NAS or in DB, including model id/name/version, framework/runtime, checksum, load status, device, input sample rate, and last successful inference timestamp.
- Return unavailable/partial status when PyTorch/TorchScript/ONNX models are missing or not loaded.
- Do not report `calibrated`, `locked`, `model_ready`, or similar states unless they are backed by persisted calibration/model health checks.
- Do not hard-code NAS capacity, database host, ingest completion, or detector inventory in the frontend. These must come from MINDEX storage/catalog/status endpoints.

Website expectation:

- The frontend is allowed to show a model/status panel only as an honest reflection of these fields.
- If the backend returns detector-only status, the player must keep semantic classification evidence pending.
