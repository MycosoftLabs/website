# SINE Real AI Cursor Prompt

Date: June 5, 2026

Paste this into Cursor for the MINDEX backend pass. Use the full context docs after this prompt:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN05_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_SYSTEM_UPGRADE_PLAN_JUN05_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_PLAYER_SHARED_SURFACES_HANDOFF_JUN05_2026.md`

## Prompt

You are Cursor working in `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`.

Build the first real SINE acoustic classifier backend. The current `Run SINE analysis` path is not real enough. It may return detector-shaped JSON, but Morgan QA confirmed it does not perform trustworthy AI classification, pattern recognition, or evidence-backed sound transcription.

This pass is acoustic only. Ignore chemistry and unrelated MINDEX tabs.

Hard rules:

- Do not fabricate labels.
- Do not use Gemini, an LLM, filename rules, source metadata, or mock catalog rows as the classifier.
- Do not use the local AI Studio `sine-acoustic-classifier/server.ts` as backend implementation. It is a UI/schema reference only.
- Do not return `sound_transcripts`, `model_outputs`, or `fusion_evidence` unless they are backed by real decoded audio, real DSP, and/or real model/prototype evidence.
- If a semantic model is missing, return `model_unavailable`, empty model evidence arrays, and honest detector/DSP output.
- Human corrections must be stored beside model predictions, not overwrite them.

P0 deliverable:

1. Decode real NAS-backed `library.blob` acoustic files from `/mnt/nas/mindex/Library/acoustic`.
2. Produce authoritative high-definition `GET /api/mindex/sine/blobs/{id}/visualisation` data:
   - real waveform envelope arrays: `times`, `amplitudes`, `min`, `max`, `rms`
   - real spectrogram: `power_db`, `frequencies`, `times`
   - `duration_sec`, `sample_rate_hz`, window start/end, `n_fft`, `hop_length`, window type, scale/PCEN/log metadata
   - honor frontend query params such as `max_waveform_points=8192`, `max_spectrogram_columns=1024`, `max_spectrogram_rows=256`, `n_fft=2048`, `hop_length=128`, `quality=oscilloscope`
3. Implement deterministic DSP from samples:
   - STFT/log-mel, FFT peaks, centroid, bandwidth, rolloff, RMS, zero-crossing rate, activity segments, harmonic/rotor/impulse priors
4. Add one real model runtime:
   - PyTorch eager, TorchScript, or ONNX Runtime
   - registered model artifact path under NAS models, checksum, version, label map, framework/runtime, backend commit
5. Add one real first model head:
   - preferred: ESC-50/environmental classifier because ESC-50 files are already on NAS and short clips are easy to test
   - a modest baseline is acceptable, but it must really train/load/infer from audio windows
6. Return evidence-backed API fields:
   - `model_outputs[]` with `model_id`, `model_name`, `model_version`, `framework`, `runtime`, `artifact_uri`, `model_checksum`, `backend_commit`, `job_id`, `inference_id`, `device`, `input_sample_rate_hz`, `window_samples`, `embedding_dim`, `start_sec`, `end_sec`, `top_labels`, `latency_ms`, `ood_score`
   - `fusion_evidence[]` linking the decision to model outputs, DSP events, and prototype matches
   - `sound_transcripts[]` only when every row has start/end window bounds and evidence IDs
7. Persist the run:
   - `sine.analysis_run`
   - `sine.detector_event`
   - `sine.model_output`
   - `sine.fusion_evidence`
   - `sine.sound_transcript`
   - model registry / model artifact metadata
8. Integrate human labels:
   - use `library.acoustic_human_identification`
   - preserve model label and human label side by side
   - mark contested examples such as model `UAV` vs human `lightning`
   - queue contested rows for prototype/model review and later training

Use these references as implementation guidance, not copy-paste cargo:

- `daisukelab/sound-clf-pytorch`: strongest P0 PyTorch log-mel / ResNetish baseline.
- `IBM/MAX-Audio-Classifier`: model-serving/top-N response and AudioSet-style ontology reference; modernize away from old TensorFlow.
- `ksanjeevan/crnn-audio-classification`: CRNN temporal model ideas for whales, insects, rotors, repeated impacts, and seismic pulses.
- `pcasabianca/Acoustic-UAV-Identification`: UAV/rotor harmonic and CNN/CRNN branch.
- `microsoft/acoustic-bird-detection`, `auditok`, `nationalparkservice/acoustic_discovery`, `deep-signal`, and the other audited repos in the full handoff.
- The local AI Studio prototype only for schema/UI ideas: `sound_transcripts`, model explorer vocabulary, and live transcript narrator behavior. Reject its mock/Gemini/synthetic backend.

Acceptance tests:

- `rg -n "Gemini|GoogleGenAI|mockAcousticBlobs|generateWavBuffer|synthetic|metadata-derived|filename-derived|heuristic fallback" mindex_api mindex_etl tests` has no reachable production classifier paths.
- Short ESC-50 WAV analysis returns real `model_outputs` and clears the Website's `Model evidence pending` state.
- Missing model artifact returns `model_unavailable`, not a fake label.
- A bounded MBARI/hydrophone window returns high-definition visualisation without trying to synchronously analyze a huge full file.
- Human correction save/read round trip works and does not overwrite model output.
- API smoke from Website BFF on 3010 succeeds:
  - `GET /api/mindex/sine/status`
  - `GET /api/mindex/sine/blobs/{id}/visualisation`
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/mindex/library/blobs/{id}/classify`

Completion report required:

- commit hash
- deployed VM state
- migrations applied
- model artifact path and checksum
- test commands and outputs
- one successful ESC-50 result with real model provenance
- one missing-model / no-fake-label negative test
- known limits for whales, UAV, lightning, ground/seismic, insects, and MBARI large-window analysis

Do not call this complete until the frontend can show real model evidence from MINDEX instead of detector-only output.
