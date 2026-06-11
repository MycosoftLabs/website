# SINE Real System Upgrade Plan

Date: June 5, 2026

Latest continuation: June 6, 2026

Purpose: make SINE scientifically useful as the acoustic intelligence layer for MINDEX Library, the Psathyrella buoy, and Mycosoft sensing workflows. This is the clean end-to-end plan. The current deeper backend implementation handoff for Cursor is in `SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`, the paste-ready Cursor prompt is in `SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`, the pass/fail acceptance matrix is in `SINE_REAL_AI_BACKEND_ACCEPTANCE_MATRIX_JUN06_2026.md`, the file-level P0 implementation blueprint is in `SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`, the external acoustic-code audit is in `SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`, and the strict objective audit is in `SINE_OBJECTIVE_COMPLETION_AUDIT_JUN06_2026.md`.

June 6 QA update: Morgan tested `Run SINE analysis` and confirmed it is still not real acoustic intelligence. The immediate backend priority is to remove or gate unsupported semantic labels before adding deeper model code. The correct no-model state is `model_unavailable` with real DSP/detector evidence only, not semantic labels or transcript prose.

Latest Codex probe on `localhost:3010`: a short real ESC-50 file accepted the evidence-contract analyze request and returned HTTP 200 with 12 frequency detections and one activity segment, but still returned `identification_summary.top_label: bird_likely`, no `model_status`, zero `model_outputs`, zero `fusion_evidence`, zero `sound_transcripts`, and one unproven `deep_signal_matches` row. Treat that as the canonical current failure until Cursor proves otherwise.

Website enforcement update: the SINE player now marks this class of payload as a contract failure. It rejects missing `model_status` on completed analyses, unproven model-like rows, unproven semantic fusion rows, unlinked transcript prose, and unproven deep-signal/prototype rows. Browser QA confirmed `/sensing/sine` loads real files and audio but shows `MINDEX contract failed` / `Semantic contract violation` for the current backend response.

## Current Truth

SINE is not real acoustic intelligence yet.

What is real now:

- MINDEX stores real acoustic files on NAS-backed Library storage.
- The Website can stream real acoustic files.
- The shared SINE player exists in three surfaces:
  - `/sensing/sine`
  - `/sensing/sine/player`
  - `/natureos/mindex` -> Library -> Acoustic
- The shared player has a much stronger oscilloscope-style inspection surface:
  - waveform
  - spectrogram
  - spectrum view
  - waterfall view
  - frequency range controls
  - calibrated time/div and Hz/div controls
  - gain/height/contrast/opacity controls
  - channel-style waveform layer controls for envelope, trace, and peak
  - trigger level, trigger edge, and trigger mode
  - event lanes
  - selection, loop, reverse, zoom, markers
  - saved wave annotations
  - human correction tags
  - browser short-file FFT fallback from the real audio stream
  - phosphor-style persistence toggle
  - model registry proof panel for real backend model rows
  - label-map, domain-head, class-family, metrics, dataset, artifact, checksum, runtime, and device provenance when MINDEX returns it
  - transport state sync between the custom controls and the actual browser audio element

What is not real yet:

- `Run SINE analysis` does not yet prove real AI classification.
- The backend can return detector-looking JSON, but it does not yet prove PyTorch/TorchScript/ONNX model inference.
- The backend does not yet return trustworthy `model_outputs`, `fusion_evidence`, persisted model checksums, or evidence-backed `sound_transcripts`.
- The current system cannot yet claim it knows what a sound means.
- Any backend response that returns `bird_likely`, `UAV`, `rotor`, `whale`, animal, vehicle, explosion, lightning, earthquake, or other semantic meaning without model/prototype/fusion proof is a failed contract, even if the HTTP response is 200.

## June 6 Frontend/Backend Boundary

Frontend state as of the latest Codex pass:

- The shared SINE player remains one component across `/sensing/sine`, `/sensing/sine/player`, and MINDEX Library -> Acoustic.
- The useful Google AI Studio frontend concepts have been merged into that shared player without importing the mock/Gemini backend:
  - live transcript narrator, but only for evidence-backed transcript windows
  - model architecture map, but as pending/observed/evidence states
  - prototype catalog and model registry panels, but only from real MINDEX endpoints
  - high-contrast hydrophone/oscilloscope visual language
  - chronological transcript and detector-lane organization
- The player rejects AI Studio/Gemini/mock/synthetic/prototype-only payloads as confirmed meaning.
- The player can show real model registry rows from `GET /api/mindex/sine/models`.
- The player now expects model registry fields for scientific audit:
  - model artifact path/checksum
  - label map path/checksum
  - label count
  - domain heads
  - target domains
  - class families
  - training dataset
  - metrics/confusion-matrix path
  - framework/runtime/device/loaded state
- Registered model architecture can show as `observed`; actual clip meaning only becomes `evidence` when a selected recording returns real per-run `model_outputs`, `fusion_evidence`, prototype matches, or evidence-backed transcripts.
- Long files are sent as bounded analysis windows instead of whole-file synchronous jobs.
- The custom transport now syncs play/pause state with the real browser audio element, but browser media QA still needs to be run when `localhost:3010` is available.
- The Website BFF enforces the same SINE evidence contract on standalone analysis and MINDEX Library classification calls, even if a caller forgets to send it:
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/natureos/mindex/library/classify?id={id}`
- That BFF contract adds no-fake/no-LLM/no-metadata-fallback query flags plus a JSON `evidence_contract` body. Cursor should treat those fields as backend requirements, not optional hints.

Backend state:

- Cursor/MINDEX still owns the real classifier.
- The backend must not call the current SINE backend complete until `Run SINE analysis` returns real model evidence or an honest `model_unavailable` response.
- Website/frontend validation can prove that UI gates work, but only MINDEX backend tests can prove the real acoustic AI exists.
- Cursor should treat `SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md` as the concrete build recipe after reading this plan. It names the required MINDEX services, training jobs, migration, schema, endpoint behavior, model artifact layout, and completion proof.

## Non-Negotiable Rule

The frontend must never hide backend gaps by inventing labels. A confirmed SINE meaning requires real evidence:

- decoded audio window
- deterministic DSP event and feature data
- model output from a registered model artifact
- optional prototype/embedding match
- fusion evidence linking the result to sources
- persisted run/model/transcript rows

LLMs, Gemini, MYCA, or any narrator layer can explain verified evidence later, but they must not be the primary detector or the source of truth.

## Inputs Already Reviewed

Local AI Studio prototype:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`
- Useful:
  - model-stack vocabulary
  - `sound_transcripts` response shape
  - high-density SINE UI direction
  - architecture explorer concepts
- Rejected for production:
  - mock acoustic blobs
  - generated WAVs
  - generated visualisation data
  - Gemini primary classification
  - filename/metadata heuristic labels

Additional June 5 audit result:

- The prototype server's catalog routes are mock arrays, stream routes synthesize WAV bytes, visualisation routes synthesize waveform/spectrogram matrices from blob IDs, and analysis routes can ask Gemini to fabricate classifier JSON from metadata.
- The Website now includes an analysis provenance gate. If a backend payload contains AI Studio/Gemini/mock/synthetic/heuristic markers, the UI marks it `Prototype evidence quarantined` and will not treat it as confirmed model meaning.
- Empty `model_outputs` or `fusion_evidence` keys are not enough. The frontend requires non-empty model/fusion/prototype evidence or evidence-backed transcripts.

ChatGPT system spec:

- `C:\Users\Owner1\.codex\attachments\f8dd2ed4-3ae7-4257-9c39-8b3bcbdb3c60\pasted-text.txt`
- Key requirements:
  - chronological sound transcripts
  - real audio decoder
  - deterministic DSP priors
  - 512D embedding space
  - prototype retrieval
  - physical acoustic descriptions
  - diagnostics for latency, sample rate, channels

Baseline code audit:

- The June 6 handoff encodes the repo audit. Temporary local clone folders were not kept as durable project artifacts.
- Durable audit detail is in `SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`.
- Important references:
  - `sound-clf-pytorch` for PyTorch log-mel, ResNetish/VGGish, split-long-file datasets, mixup, augmentation
  - `crnn-audio-classification` for CNN/RNN/GRU temporal modeling
  - `MAX-Audio-Classifier` for serving shape, top-N label/probability output, AudioSet/VGGish concepts
  - `imfing/audio-classification` for MFCC/chroma/mel/spectral contrast/tonnetz diagnostic features
  - `braydenoneal/neural-audio-classification` for spectrogram-image and TorchScript baseline concepts
  - `microsoft/acoustic-bird-detection` for small-data animal detector workflow
  - `Acoustic-UAV-Identification` for rotor/UAV CNN/CRNN and late-fusion concepts
  - `nationalparkservice/acoustic_discovery` for detector probability timelines and long-recording workflows
  - OVH marine notebook/examples for marine mammal feature/training workflow
  - Auditok and Arduino Audio Tools for segmentation and frequency-detection concepts

Backend completion must prove source use. For each baseline repo, Cursor must report either `implemented`, `deferred`, or `rejected`, with the MINDEX files/tests/endpoints that prove the decision. A vague "reviewed/incorporated" claim is not enough.

The reproducible external audit now includes remote URLs, branches, commit hashes, and root-license visibility for the cloned baseline repos. Cursor should keep no-license-found repos as design references unless code reuse is separately cleared.

## Target Architecture

SINE should become a layered evidence system.

1. Decoder layer
   - Input: `library.blob` file ID.
   - Decode actual NAS-backed WAV/FLAC/MP3/other supported files.
   - Produce mono float32 windows with sample rate, channels, duration, and source metadata.

2. Visualisation layer
   - Produce high-definition waveform envelopes and spectrograms for both short and long files.
   - Short clips may render immediately.
   - Large MBARI/hydrophone files must queue and stream/poll windowed results.

3. Deterministic DSP layer
   - FFT peaks.
   - RMS/activity windows.
   - zero crossing.
   - autocorrelation pitch.
   - centroid, bandwidth, rolloff.
   - onset/impulse detection.
   - harmonic ladder and blade-pass candidates.
   - low-frequency ground/seismic bands.

4. Learned model layer
   - P0: one real ESC-50/environmental PyTorch or ONNX head.
   - P1: CRNN/GRU temporal head for evolving sounds.
   - P1/P2: domain heads for marine, UAV/rotor, animal, insect, ground, weather, vessel, mechanical.
   - Later: AST/PANNs/BEATs/CLAP-style pretrained/foundation model heads where useful.

5. Embedding/prototype layer
   - Generate 512D or model-specific acoustic embeddings.
   - Store vector, model version, source, label, human verification status.
   - Search by cosine similarity.
   - Return `deep_signal_matches` only from actual embeddings/prototypes.

6. Fusion layer
   - Combine DSP events, model outputs, prototype matches, and human tags.
   - Preserve disagreement instead of overwriting results.
   - Return `fusion_evidence` rows with evidence IDs.

7. Sound transcript layer
   - Convert verified windows into chronological `sound_transcripts`.
   - Each transcript must cite evidence IDs.
   - Descriptions should explain physical acoustic mechanics:
     - frequency sweep
     - impulse
     - pressure pulse
     - rotor harmonic
     - cavitation
     - vocalization
     - insect stridulation
     - ground/seismic pulse

8. Human correction layer
   - Human can correct wrong identification.
   - Store human tag beside the model result.
   - Mark contested cases.
   - Use corrections for future training/prototype review.

## Domain Taxonomy

SINE must cover air, water, and ground.

Air:

- birds
- bats
- insects
- mammals
- weather
- aircraft
- UAVs
- helicopters
- propellers
- industrial/mechanical sounds
- explosions/impulses

Water:

- hydrophone recordings
- whales
- dolphins
- porpoises
- seals
- fish/invertebrate sound
- vessel engines
- propeller/cavitation
- underwater explosions
- sonar-like pings
- pressure pulses

Ground:

- geophone/seismic recordings
- soil/subsurface sound
- surface vibration
- earthquakes/tremors
- landslides
- buried infrastructure
- footsteps/machinery through ground
- low-frequency impulse trains

## Frontend State And Next Frontend Work

Current shared player should stay shared. Do not fork SINE UI into three separate implementations.

Surfaces:

- Public SINE page: `/sensing/sine`
- Standalone player: `/sensing/sine/player`
- MINDEX Library embedded player: `/natureos/mindex` -> Library -> Acoustic

Frontend should continue to:

- show real file rows only
- stream real files
- show real waveform/spectrogram/spectrum data
- show raw detector lanes only as raw detections
- show `Model evidence pending` until backend evidence exists
- show `sound_transcripts` only when backend returns them
- save wave annotations and human corrections
- attach measured selected-region evidence to wave annotations when waveform/spectrogram data exists
- draw backend `model_outputs` as model-window overlays when start/end windows are present
- show transcript evidence badges when backend `sound_transcripts` include explicit evidence IDs
- show prototype-neighbor audit rows from `deep_signal_matches` and prototype-linked `fusion_evidence`
- show model/human review state for aligned, contested, and awaiting-model human tags
- show the SINE human-tagged training review queue when MINDEX exposes it through `GET /api/mindex/sine/training/human-tags`
- show a run gate for short-file, detector-only, model-unavailable, queued/running, model-ready, and long-file windowed-job states
- send human correction payloads with selected-region timing, selected-region DSP measurements, current oscilloscope/spectrogram scope settings, and `training_review` metadata so backend review queues can learn from exact user-labeled signal windows

Next frontend upgrades after backend P0:

- Browser-verify the real backend fields on all three shared surfaces once Cursor returns model outputs, queued jobs, and transcript evidence.
- Tighten copy/layout based on live payload shape if Cursor changes names, but do not weaken the evidence gates.

## Backend P0

Cursor must make one real model path work end-to-end.

P0 completion means:

- one real model artifact is loaded from a registered model path
- checksum and label map are registered
- one real ESC-50 or environmental audio head returns top-N probabilities
- selected NAS audio is decoded, windowed, featurized, and inferred
- `sine.analysis_run`, `sine.model_output`, and `sine.fusion_evidence` rows are persisted
- frontend leaves pending state because real `model_outputs` exist

P0 does not need to solve every acoustic class. It must prove the system can run real model inference on real audio without pretending.

## Backend P1

Cursor expands from proof to useful acoustic intelligence:

- queued long-file analysis for MBARI/hydrophone clips
- high-definition server-side waveform/spectrogram for large files
- CRNN/GRU temporal windows
- prototype embedding table
- activity/frequency/impulse/harmonic detectors
- marine, UAV/rotor, animal, ground/seismic branch outputs
- first evidence-backed `sound_transcripts`

## Backend P2

SINE becomes an operational learning system:

- domain-specific model registry
- model evaluation dashboard
- active learning queues from human corrections
- scheduled re-analysis when new models land
- prototype bank building jobs
- device-side feature ingest from Psathyrella buoy and future SINE devices
- ground/water/air sensor-specific calibration profiles
- MYCA explanation layer using verified evidence only

## Data And Storage

Primary source of truth:

- MINDEX Postgres
- MINDEX NAS Library files
- MINDEX model artifacts under NAS/model storage

Supabase boundary:

- Do not route raw SINE inference through Supabase for P0.
- If Supabase is used later, keep it to summary dashboards, workflow metadata, or external app syncs.
- Raw acoustic files, embeddings, analysis runs, and model registry should stay in MINDEX unless a later architecture decision explicitly moves them.

MAS/MYCA boundary:

- MAS/MYCA can read verified SINE results later.
- MAS/MYCA should not invent detections.
- MYCA can summarize, ask questions, and remember user interpretation only after the backend provides evidence-backed data.

## Acceptance Gates

Frontend gate:

- Shared player still renders in all three locations.
- File rows are real and not mock data.
- Native audio stream loads real WAV/FLAC/MP3 where browser codecs allow.
- Scope renders waveform/spectrogram/spectrum from actual audio or backend visualisation.
- UI does not claim model truth without `model_outputs` or `fusion_evidence`.

Backend gate:

- `GET /api/mindex/sine/status` reports loaded model artifact, checksum, label count, runtime, and detector state.
- `POST /api/mindex/sine/blobs/{id}/analyze` returns real model outputs for at least one short test clip.
- Long files queue instead of timing out.
- Missing models report `model_unavailable`, not fake labels.
- Human correction stores both model and human result.
- Wave annotations preserve selected-region measurement evidence and expose it back through blob details/training export.

Scientific gate:

- Every label has evidence.
- Every transcript row has window bounds.
- Every physical claim has a DSP/model/prototype basis.
- OOD/unknown states are allowed and preferred over false certainty.
- Model performance is measured with held-out data, not UI plausibility.

## Who Should Do What

Codex Website:

- Maintain the shared SINE frontend.
- Keep labels honest.
- Render new backend evidence fields when Cursor provides them.
- Verify all three surfaces on `3010`.

Cursor MINDEX:

- Build the real backend modules from the source audit.
- Implement migrations and model registry.
- Deploy to VM 189.
- Provide smoke proof and completion report.

Future ChatGPT/model planner:

- Use this plan plus the Cursor backend handoff to design model training strategy.
- Prioritize P0 ESC-50 proof, then hydrophone/marine and UAV/rotor domain heads.

## Immediate Next Action

Give Cursor:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`

Give any planning/model-design agent:

- this file
- `SINE_REAL_AI_CURSOR_PROMPT_JUN06_2026.md`
- the Cursor backend handoff above
- the source repo audit notes inside `SINE_REAL_AI_BACKEND_CURSOR_HANDOFF_JUN06_2026.md`

Do not let any agent claim SINE is real until the backend gates above are proven.

## June 5 Model Provenance Upgrade

Codex updated the shared SINE frontend to parse and render backend model provenance fields. This raises the completion bar: a label is not production-grade unless the backend can show which model artifact produced it and on what exact audio window.

The shared player now accepts these `model_outputs[]` fields:

- `model_id`
- `model_name`
- `model_version`
- `framework`
- `runtime`
- `artifact_uri`
- `model_checksum`
- `label_map_uri`
- `label_map_checksum`
- `label_count`
- `domain_heads`
- `target_domains`
- `class_families`
- `metrics_uri`
- `training_dataset`
- `backend_commit`
- `job_id`
- `inference_id`
- `device`
- `input_sample_rate_hz`
- `window_samples`
- `embedding_dim`
- `start_sec`
- `end_sec`
- `latency_ms`
- `ood_score`
- `top_labels[]`
- `feature_params`

This means backend P0 should no longer stop at `top_label + confidence`. Cursor must return artifact/runtime/checksum/window evidence so SINE can be audited for scientific, field, and contract use.

## June 5 Reference Source Audit

Codex shallow-cloned and inspected the requested baseline GitHub repos in a temporary audit folder. The durable record is now split between the Cursor backend handoff and `SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`, not the temp folder.

Strongest P0 implementation references:

- `daisukelab/sound-clf-pytorch`: PyTorch log-mel dataset, padding/cropping/splitting long files, ResNetish/VGGish-style models.
- `IBM/MAX-Audio-Classifier`: serving pattern, VGGish embeddings, top-N probability output, AudioSet-style ontology.
- `ksanjeevan/crnn-audio-classification`: CRNN/LSTM variable-length temporal audio inference.

Useful supporting references:

- `GorillaBus/urban-audio-classifier`: UrbanSound8K MFCC/log-mel workflow and augmentation notebooks.
- `abishek-as/Audio-Classification-Deep-Learning`: simple MFCC/ANN/CNN comparison baseline.
- `daisukelab/ml-sound-classifier`: live predictor and chunk/smoothing concepts.
- `imfing/audio-classification`: classic feature baseline.
- `braydenoneal/neural-audio-classification`: spectrogram-image CNN/TorchScript-style sanity checks.
- `ilge/gmtk-audio-classification`: optional historical HMM/filterbank temporal reference; Windows checkout was not clean, so Cursor should audit it on Linux if needed.

## June 5 Oscilloscope Visualisation Upgrade

Codex tightened the shared SINE player canvas so it behaves more like a scientific scope instead of a decorative preview.

- Real waveform traces now draw with a stronger phosphor-style trace and visible waveform point count.
- Real spectrogram matrices render with scanline texture, subtle glass/phosphor treatment, and brighter peak/centroid glow points.
- The scope frame exposes source sample rate when the backend returns `sample_rate_hz`.
- No fake waveform, fake labels, or synthetic detections were added.

System implication:

- MINDEX must treat waveform/spectrogram generation as a first-class backend service.
- Long recordings need windowed visualisation jobs so the player can inspect a 30-second or 60-second slice without downloading or decoding massive files in the browser.
- The real AI/classifier work still belongs in MINDEX: PyTorch/TorchScript/ONNX inference, embeddings, prototype matching, and evidence-backed sound transcripts.

## June 5 AI Studio Merge Audit

Codex re-read:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`
- `C:\Users\Owner1\.codex\attachments\f8dd2ed4-3ae7-4257-9c39-8b3bcbdb3c60\pasted-text.txt`

Useful concepts merged into the Website SINE player:

- chronological sound-event transcripts
- transcript rows that scrub/play by time window
- detector lanes grouped by event family
- prototype-neighbor / 512D embedding audit surface
- three-layer architecture framing:
  - `L1 physics DSP`
  - `L2 deep embed`
  - `L3 semantic heads`
- high-contrast oscilloscope/spectrogram lab aesthetic

Rejected from production:

- AI Studio mock catalog
- generated WAV audio
- generated spectrogram imagery
- Gemini-generated classifier payloads
- metadata/filename-derived semantic labels

System conclusion:

- AI Studio is a visual/schema prototype, not the backend.
- The ChatGPT spec correctly defines the backend target: real decoder, deterministic DSP, 512D neural embeddings, prototype retrieval, and evidence-backed sound transcripts.
- Cursor must build the real backend in MINDEX; the Website is prepared to display it without pretending.

## June 5 Waterfall Visualisation Upgrade

The shared SINE player now includes a `Waterfall` scope mode. This mode uses real spectrogram data only and renders:

- frequency on X
- visible time on Y
- dB power as color
- detector/model/selection/playhead overlays adapted to waterfall coordinates

This helps SINE inspect hydrophone, buoy, rotor, impulse, and long environmental recordings in a more familiar signal-analysis layout. It is still visualization, not classification. Cursor still must provide authoritative high-resolution spectrogram payloads and real PyTorch/TorchScript/ONNX model evidence for SINE to be considered real.

## June 5 Phase One Deploy Readiness Matrix

Frontend ready for Phase One when validation passes:

- shared SINE player is one component reused by `/sensing/sine`, `/sensing/sine/player`, and the MINDEX Library acoustic embed
- file list comes from real MINDEX Library rows
- audio stream and waveform/spectrogram/waterfall views use real decoded audio or backend visualisation payloads
- no mock catalog, generated WAV, Gemini classifier, or metadata-derived semantic label is presented as real evidence
- human correction UI can save human tags and keep model evidence separate
- model evidence/provenance panels remain pending until MINDEX returns real `model_outputs`, `fusion_evidence`, prototype matches, or evidence-backed `sound_transcripts`

Not ready / backend-owned:

- real SINE classification
- trained PyTorch/TorchScript/ONNX model runtime
- production model status and calibration
- backend waveform/spectrogram/waterfall windows for long files
- persistent model output rows and active-learning queues
- audited sound meaning for whales, dolphins, insects, UAVs, vessel propellers, lightning, explosions, ground/seismic events, or unknown classes

Important rejection:

- The AI Studio `SINEStatus.tsx` and `LibraryTab.tsx` status/storage cards are not production-ready because they include simulated calibration and hard-coded fallback storage/database claims. The Website should only show those concepts when backed by real MINDEX status/catalog responses.

## June 5 Honest Runtime Status Upgrade

The shared SINE player now fetches the real MINDEX status endpoint:

- `GET /api/mindex/sine/status`

The UI shows status as operational evidence, not decoration:

- `checking` while the status endpoint is loading
- `status down` if the endpoint is unavailable
- `detectors` when detector readiness exists but no trained model artifact is proven
- `model missing` when the backend reports no loaded model
- `reachable` when the endpoint responds without detector/model evidence
- `model live` only when the backend proves a loaded model runtime with model identity and artifact/runtime/checksum-style provenance

This is the production-safe version of the AI Studio status concept. It does not simulate calibration, does not hard-code NAS/model readiness, and does not make SINE real by itself. Cursor must still build the actual model registry, runtime, and status fields.

## June 5 Fungi Compute Trigger Mode Upgrade

Codex inspected the Fungi Compute oscilloscope configuration and ported the missing trigger-mode concept into the shared SINE player.

SINE trigger controls now include:

- trigger level
- trigger edge: `rising`, `falling`, `both`
- trigger mode: `auto`, `normal`, `single`

The waveform scope uses those modes to distinguish continuous crossing display, armed/no-crossing state, and first-crossing lock. Saved wave annotations persist `scope.trigger_mode` so reviewers can restore the same inspection setup later.

This is signal-tool parity with Fungi Compute. It improves human inspection and future model-window review, but it is not a replacement for the backend classifier.
