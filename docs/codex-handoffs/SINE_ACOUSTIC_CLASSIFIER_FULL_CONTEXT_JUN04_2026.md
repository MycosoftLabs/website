# SINE Acoustic Classifier Full Context

Date: June 4, 2026

Owner split:

- Website frontend: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website`
- MINDEX backend: `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex`
- Live local QA surface: `http://localhost:3010/sensing/sine/player`
- MINDEX VM/API: `192.168.0.189:8000`
- NAS acoustic library: `/mnt/nas/mindex/Library/acoustic` on the MINDEX VM, SMB at `\\192.168.0.105`

Hard rules:

- Do not use mock audio.
- Do not show fake waveform or fake spectrogram data.
- Do not fabricate detector rows, prototype matches, transcripts, or diagnostics.
- Do not expose raw NAS paths, tokens, passwords, or local credential values in UI.
- Do not overwrite model predictions with human corrections. Store both.
- Do not stage, commit, deploy, or restart shared dev servers unless Morgan explicitly approves.

## Current Frontend State

Main file:

- `components/sensing/sine-acoustic-player.tsx`

Current behavior:

- Loads real MINDEX acoustic library rows through `3010`.
- Starts on short ESC-50 clips when possible so playback and analysis are testable.
- Can switch to broader MBARI library slices.
- Streams real WAV files through the Website BFF.
- Shows selected file details, source, acoustic context, duration, sample rate, size, and license when provided.
- Runs SINE analysis through MINDEX routes.
- Displays grouped detector results returned by backend.
- Supports human identification corrections and wave annotation UI.
- Uses an oscilloscope-style canvas with waveform, spectrogram, grid, bands, peaks, lanes, markers, region selection, zoom, loop, speed, reverse, and rotary scope controls.
- Current scope controls are a compact two-row amp/oscilloscope strip with ten hardware-style knobs.
- The waveform renderer is prepared for upgraded backend envelope output:
  - current compatible field: `waveform.amplitudes`
  - future high-definition fields: `waveform.min`, `waveform.max`, `waveform.rms`
  - if envelope arrays arrive, the canvas draws true min/max per time bucket; if not, it falls back to amplitudes.

Known frontend limits:

- The player cannot make SINE scientifically real by itself. It needs stronger backend visualisation, model heads, embeddings, transcripts, prototype matching, and persistence.
- Current backend visualisation returns a low-resolution decimated waveform and a downsampled spectrogram. The frontend can render it better, but the source data is still too thin.
- Browser automation cannot prove audible playback reliably because media activation is gesture-sensitive; terminal and browser metadata checks showed real WAV decode, but manual listening remains the true sound-output acceptance test.
- Project TypeScript still has unrelated CREP errors outside SINE, so `tsc` is not a clean global gate until those are fixed.

## Google AI Studio Prototype Intake

Prototype path:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Useful parts:

- Types in `src/types.ts` define a good response shape:
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
- `src/components/AcousticPlayer.tsx` has useful interaction ideas:
  - integrated spectrogram/waveform/playhead canvas
  - transcript rows that scrub playback
  - detector lane timelines
  - prototype match panel
- `src/components/ModelExplorer.tsx` is useful as architecture language:
  - Layer 1 deterministic DSP
  - Layer 2 deep embedding
  - Layer 3 semantic / taxonomic heads

Reject / do not merge:

- `src/data/acousticData.ts` is mock data.
- `server.ts` generates synthetic WAVs and synthetic spectrogram/classification responses.
- The prototype only models `air` and `water`; SINE also needs `ground`.
- Gemini-generated descriptions are not a substitute for real detector output. If MYCA/Gemini is used later, it should explain real analysis results, not invent detections.

## ChatGPT Research Prompt Requirements

The SINE stack is not speech transcription. It is physical sound-event transcription.

Required meaning of `sound_transcripts`:

- Chronological windows tied to acoustic events.
- Descriptions should explain physical acoustic mechanics:
  - frequency sweeps
  - impulse shock fronts
  - rotor blade-pass harmonics
  - cavitation bands
  - insect pulse trains
  - animal calls
  - ground tremor bands
- Each transcript window must align with a real analysis event or window, not just a generated sentence.

Required architecture:

- Audio decoder: WAV, FLAC, MP3 and future formats.
- Deterministic DSP pipeline: STFT, FFT peaks, energy/activity segments, zero-crossing, RMS, centroid, bandwidth, rolloff, spectral contrast, MFCC where useful.
- Deep embedding layer: one or more explicit model versions, not filename guesses.
- Prototype retrieval: cosine or inner-product similarity against stored prototypes/fingerprints.
- Transcript narrator: deterministic synthesis from event windows plus optional MYCA explanation layer.

## External Repository Survey

Local survey root:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos`

### IBM/MAX-Audio-Classifier

Repo:

- `https://github.com/IBM/MAX-Audio-Classifier`

What it gives SINE:

- Production-style model serving contract.
- AudioSet ontology with 527 classes.
- VGGish embeddings plus PCA/quantization.
- Multi-attention classifier output.
- Top-N label/probability response shape.
- 10-second clip window behavior with start-time parameter.

Implementation notes:

- `api/predict.py` validates WAV uploads and returns label/probability predictions.
- `core/model.py` generates VGGish embeddings, post-processes them, reshapes to `1 x 10 x 128`, and classifies.
- `core/vggish_input.py` converts waveform to log-mel examples.

How to incorporate:

- Use as SINE's general AudioSet head or as a model adapter.
- Do not blindly port TensorFlow 1 code. Prefer ONNX/Torch equivalent or containerized adapter.
- Map AudioSet labels into SINE `event_family` and `event_type`.

### daisukelab/ml-sound-classifier

Repo:

- `https://github.com/daisukelab/ml-sound-classifier`

What it gives SINE:

- Live/edge inference patterns.
- Lightweight MobileNetV2 and AlexNet-style classifiers.
- FSDKaggle prebuilt model examples.
- Rolling prediction smoothing via geometric mean ensembles.
- Real-time audio capture chunking concepts useful for Psathyrella buoy/Jetson devices.

Implementation notes:

- `common.py` handles read/pad/trim audio, log-mel conversion, samplewise normalization, long-file splitting, and prediction smoothing.
- `sound_models.py` defines MobileNetV2 and AlexNet-like models.
- `premitive_file_predictor.py` loads a frozen graph and predicts split file segments.

How to incorporate:

- Use its chunking/smoothing pattern for live buoy streams and edge device inference.
- Use samplewise normalization and segment splitting as a baseline for device-recorded files.
- Do not use old TensorFlow 1 graph loading as the final architecture unless wrapped as a compatibility adapter.

### daisukelab/sound-clf-pytorch

Repo:

- `https://github.com/daisukelab/sound-clf-pytorch`

What it gives SINE:

- PyTorch log-mel training pipeline.
- Flexible input-size models using adaptive pooling.
- ResNetish/VGGish patterns.
- A realistic config for 5-second, 44.1 kHz clips with 64 mel bins.

Implementation notes:

- `config.yaml` uses `clip_length: 5.0`, `sample_rate: 44100`, `hop_length: 441`, `n_fft: 1024`, `n_mels: 64`.
- `src/models.py` provides ResNetish and VGGish-style architectures.
- Notebook uses PyTorch Lightning and log-mel spectrogram tensors.

How to incorporate:

- Use as the preferred training/inference family for new SINE model heads.
- Export trained heads to ONNX or TorchScript for MINDEX runtime.
- Use adaptive pooling for variable-length recordings.

### ksanjeevan/crnn-audio-classification

Repo:

- `https://github.com/ksanjeevan/crnn-audio-classification`

What it gives SINE:

- CRNN architecture for variable-length audio.
- GPU spectrogram computation.
- Sequence handling with packed LSTM.
- White noise, crop, and time-stretch augmentation.

Implementation notes:

- `net/audio.py` defines `MelspectrogramStretch`, random time stretch, and spectrogram whitening.
- `net/model.py` defines `AudioCRNN`, `AudioCNN`, and `AudioRNN`.
- `eval/infer.py` draws predicted spectrogram images.

How to incorporate:

- Use for long or variable-duration acoustic event sequences.
- Use sequence modeling for whale songs, rotor progressions, repeated impulses, and insect pulse trains.
- Avoid making this the only head; it should be one model family inside SINE.

### imfing/audio-classification

Repo:

- `https://github.com/imfing/audio-classification`

What it gives SINE:

- Classic interpretable acoustic feature baseline.
- MFCC, chroma, mel, spectral contrast, tonnetz.
- SVM/MLP/CNN examples.

Implementation notes:

- `feat_extract.py` extracts a 193-dimensional feature vector.
- `cnn.py` trains a simple Conv1D classifier over extracted features.

How to incorporate:

- Use as deterministic diagnostics and baseline feature extraction.
- Store these features in analysis diagnostics for review and model debugging.
- Useful for "why did the model think this?" explanations.

### GorillaBus/urban-audio-classifier

Repo:

- `https://github.com/GorillaBus/urban-audio-classifier`

What it gives SINE:

- UrbanSound8K taxonomy workflow.
- MFCC vs log-mel CNN comparison.
- Padding, normalization, class confusion analysis.
- Augmentation with speed shift, pitch shift, and noise.

Implementation notes:

- `include/helpers.py` contains MFCC/log-mel helper functions.
- Notebooks define CNN training and evaluation over UrbanSound8K.

License note:

- Repo license is LGPL-3. Treat direct code reuse carefully. Concepts are fine; copying code into proprietary work needs review.

How to incorporate:

- Use as taxonomy/preprocessing reference for terrestrial air-sound event families.
- Do not copy LGPL code into MINDEX without license review.

### ilge/gmtk-audio-classification

Repo:

- `https://github.com/ilge/gmtk-audio-classification`

What it gives SINE:

- HMM/Gaussian-mixture temporal smoothing for live audio events.
- AFTE filterbank feature concepts.
- False-positive reduction by favoring lasting features instead of one-frame spikes.

Implementation notes:

- Windows checkout failed because the repo contains paths invalid on Windows, but `git show`/`git ls-tree` inspection works.
- README describes 48 kHz audio, 1/3 second windows, 15 fps extraction, 8 filterbank channels, envelope extraction, 64-point FFT, and feature ranking via t-test/entropy/KL divergence.

How to incorporate:

- Use as temporal post-processing for detector events.
- Add per-detector persistence/smoothing thresholds so a single transient does not become a confident label.

### OVH marine sound classification notebook

Repo:

- `https://github.com/ovh/ai-training-examples/blob/main/notebooks/audio/audio-classification/notebook-marine-sound-classification.ipynb`

What it gives SINE:

- Marine mammal classification workflow.
- Watkins-style marine species taxonomy examples.
- Feature extraction over 30-second marine mammal clips.

Implementation notes:

- Extracts chroma, RMS, spectral centroid, spectral bandwidth, rolloff, zero-crossing rate, harmony/perceptr, tempo, and MFCCs.
- Trains dense network over 45 marine mammal classes.

How to incorporate:

- Use as a starter for marine mammal/vessel-water model heads.
- Pair with MBARI/Watkins data and MINDEX prototype bank.

### Audio-Classification-Deep-Learning

Repo:

- `https://github.com/abishek-as/Audio-Classification-Deep-Learning`

What it gives SINE:

- Keras ANN/CNN1D/CNN2D examples over MFCC features.
- UrbanSound8K model artifacts and Django wrapper pattern.

Implementation notes:

- `assets/Predict.py` extracts 128 MFCCs, averages over time, then predicts with ANN/CNN1D/CNN2D.

How to incorporate:

- Treat as baseline reference only. It is not enough for production SINE.

### braydenoneal/neural-audio-classification

Repo:

- `https://github.com/braydenoneal/neural-audio-classification`

What it gives SINE:

- Spectrogram-image conversion concept.
- TorchScript save/load path.

Implementation notes:

- `src/spectrogram.py` uses high-density mel spectrogram images.
- `src/neural_network.py` trains an image CNN over spectrograms.
- `src/predict.py` loads TorchScript and predicts a spectrogram image.

How to incorporate:

- Useful as a simple educational spectrogram-CNN reference.
- Not production enough for SINE by itself.

## Supabase / Vector Guidance

Supabase current docs confirm:

- Enable the Postgres extension as `vector`.
- Store embeddings with explicit dimensions such as `extensions.vector(512)`.
- Use the same embedding model for all comparisons; comparing embeddings from different models is meaningless.
- Use SQL/RPC functions for similarity search because PostgREST does not directly support pgvector operators well.
- Use cosine distance `<=>` as the safe default; use inner product `<#>` only when vectors are normalized.
- Put metadata filters inside the similarity SQL function rather than chaining filters after `rpc()`.

SINE application:

- MINDEX Postgres can own the canonical prototype bank.
- Supabase/MicoForge can mirror inventory or training/task status if needed, but the SINE audio prototypes should be queryable from MINDEX first.
- If Supabase is used for MYCA memory/training review, use pgvector/RPC patterns and do not expose service-role keys client-side.

Recommended prototype table shape:

```sql
CREATE TABLE IF NOT EXISTS sine.acoustic_prototype (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  acoustic_domain text NOT NULL,
  event_family text NOT NULL,
  event_type text NOT NULL,
  source_dataset text NULL,
  source_blob_id uuid NULL,
  segment_start_sec numeric NULL,
  segment_end_sec numeric NULL,
  embedding_model text NOT NULL,
  embedding_dim integer NOT NULL,
  embedding extensions.vector(512) NOT NULL,
  feature_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  license text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Create an RPC/function for matching prototypes by embedding, threshold, count, and metadata filters.

## Normalized SINE Event Taxonomy

Every detector event should include:

```json
{
  "detector_id": "frequency_fft",
  "label": "Rotor harmonic",
  "confidence": 0.91,
  "start_sec": 1.23,
  "end_sec": 2.34,
  "frequency_hz": 240,
  "frequency_min_hz": 180,
  "frequency_max_hz": 520,
  "acoustic_domain": "air",
  "event_family": "air_propeller",
  "event_type": "uav_rotor_harmonic",
  "method": "uav_rotor_harmonic_v1",
  "model_version": "sine-uav-v0.1"
}
```

Domains:

- `air`
- `water`
- `ground`
- `unknown`

Families:

- `animal_life`
- `insect`
- `air_propeller`
- `water_propeller`
- `impulse`
- `ground_seismic`
- `weather`
- `mechanical`
- `activity`
- `frequency`
- `prototype_match`
- `unknown`

Examples:

- Birds are part of `animal_life`, not the whole animal stack.
- UAVs are part of `air_propeller`, not the whole machine stack.
- Lightning/thunder/explosions belong under `impulse` and/or `weather`.
- Earthquakes, tremors, geophone and soil vibration belong under `ground_seismic`.
- Vessel thrusters, cavitation, boat propellers, submarine mechanical hum belong under `water_propeller`.

## Backend Work Cursor Must Do

### 1. Upgrade visualisation data

Current file:

- `mindex_api/services/sine_acoustic/visualisation.py`

Current problem:

- `waveform_points=800` decimates raw samples.
- Spectrogram is downsampled to 64 rows and 128 columns.
- Long files block or timeout.

Required replacement:

- Return waveform envelope, not only decimated samples:
  - `times`
  - `min`
  - `max`
  - `rms`
  - optional compatibility `amplitudes`
- Support query params:
  - `start_sec`
  - `end_sec`
  - `frequency_min_hz`
  - `frequency_max_hz`
  - `max_waveform_points`
  - `max_spectrogram_columns`
  - `waveform_mode=envelope`
- Return spectrogram metadata:
  - `sample_rate_hz`
  - `n_fft`
  - `hop_length`
  - `window`
  - `power_min_db`
  - `power_max_db`
  - `time_resolution_sec`
  - `frequency_resolution_hz`
- Cache per blob/window so repeat UI requests do not decode huge NAS files again.

### 2. Make classifier multi-head and real

Current file:

- `mindex_api/services/sine_acoustic/pipeline.py`

Required heads:

- Deterministic DSP:
  - FFT peak frequencies
  - spectral centroid/bandwidth/rolloff
  - RMS/zero-crossing/activity
  - MFCC/chroma/contrast/tonnetz diagnostics
- Activity:
  - auditok activity windows
- General sound:
  - AudioSet/VGGish or modern equivalent
- Marine:
  - marine mammal/vessel/cavitation head
- Animal:
  - bird adapter plus broader animal calls
- Insect:
  - pulse/stridulation family
- Propeller:
  - separate air and water propeller heads
- Impulse:
  - lightning/thunder/explosion/gunshot/shockwave head
- Ground:
  - geophone/seismic/soil/surface vibration head
- Deep signal:
  - embedding/fingerprint extraction and prototype search
- Transcript:
  - chronological sound-event windows

### 3. Add model registry

Create backend registry with:

- `detector_id`
- `label`
- `description`
- `acoustic_domain`
- `event_families`
- `model_type`
- `model_version`
- `weights_path`
- `input_sample_rate`
- `window_sec`
- `hop_sec`
- `status`
- `license`
- `source_repo`
- `runtime`

Weights should live under NAS, for example:

- `/mnt/nas/mindex/models/acoustic/...`

### 4. Add prototype / fingerprint bank

Create persistent tables for:

- prototype vectors
- per-blob embeddings
- per-segment embeddings
- detector events
- sound transcripts
- analysis diagnostics
- human identifications
- wave annotations

Prototype matching must not be based on filename text. It must compare extracted features/embeddings against stored prototypes.

### 5. Preserve human correction workflow

Human identification tables already exist on backend per Cursor's latest work. Confirm they are included in:

- `GET /api/mindex/library/blobs/{id}`
- `GET /api/mindex/library/blobs/{id}/human-identifications`
- training/review exports

Required behavior:

- Model says `UAV`, human says `lightning`: store both.
- Mark as contested.
- Queue for later active-learning review.
- Do not blindly treat human labels as ground truth.

### 6. Improve long-file analysis

Long MBARI files must not block UI.

Required behavior:

- Short files can analyze synchronously.
- Long files should return `202` with job ID.
- Analysis jobs should process windows.
- The UI can request current visible window visualization and analysis.
- Cache ready windows.
- Add `GET /api/mindex/sine/jobs/{id}`.

## Required Backend API Contract

```http
GET /api/mindex/library/blobs?category=acoustic&limit=100&cursor=...&q=...
GET /api/mindex/library/blobs/{id}
GET /api/mindex/library/blobs/{id}/stream
GET /api/mindex/library/blobs/{id}/wave-annotations
POST /api/mindex/library/blobs/{id}/wave-annotation
GET /api/mindex/library/blobs/{id}/human-identifications
POST /api/mindex/library/blobs/{id}/human-identification
POST /api/mindex/library/blobs/{id}/classify
GET /api/mindex/sine/status
GET /api/mindex/sine/detectors
GET /api/mindex/sine/blobs/{id}/visualisation
GET /api/mindex/sine/blobs/{id}/analysis
POST /api/mindex/sine/blobs/{id}/analyze
GET /api/mindex/sine/jobs/{id}
GET /api/mindex/sine/prototypes/search
POST /api/mindex/sine/training/export-human-tags
```

Analyze/classify response must include:

```json
{
  "ok": true,
  "blob_id": "uuid",
  "identification_summary": {
    "top_label": "Thunder / lightning impulse",
    "category": "weather",
    "type": "lightning_thunder_impulse",
    "confidence": 0.84,
    "ood_score": 0.12
  },
  "events": [],
  "frequency_detections": [],
  "activity_segments": [],
  "animal_detections": [],
  "insect_detections": [],
  "air_propeller_detections": [],
  "water_propeller_detections": [],
  "impulse_detections": [],
  "ground_seismic_detections": [],
  "bird_detections": [],
  "uav_detections": [],
  "nps_detections": [],
  "deep_signal_matches": [],
  "sound_transcripts": [],
  "diagnostics": {
    "latency_ms": 0,
    "sample_rate_in": 16000,
    "channels": 1,
    "duration_sec": 5,
    "window_count": 1,
    "decode_format": "pcm_s16le",
    "detector_versions": {}
  }
}
```

## Frontend Work Still Needed

Current frontend should be kept scoped to:

- `components/sensing/sine-acoustic-player.tsx`
- MINDEX/SINE BFF routes only

Jun 4 current frontend update:

- The SINE player now accepts broad backend detector groups for animals, insects, air propellers, water propellers, vessels, impulses, weather/lightning, ground/seismic, mechanical, geophysical, and unknown patterns.
- It keeps raw detector IDs but groups detector lanes by normalized event family where available.
- It canonicalizes legacy backend categories for compatibility:
  - bird -> animal_life
  - uav/rotor -> air_propeller
  - frequency/fft_peak -> frequency_peak
  - activity -> activity_segment
  - nps/deep_signal -> prototype_match
- This frontend canonicalization is a bridge only. Backend should still return explicit `acoustic_domain`, `event_family`, and `event_type` on every event.
- Verified on `localhost:3010` with a real ESC-50 analysis: 17 events rendered as Frequency peaks, Prototype matches, Animal life, Activity segments, and Air propellers rather than raw Bird/UAV groups.
- The SINE canvas now uses percentile-based dB color scaling and real spectrogram-derived peak/centroid traces for a cleaner oscilloscope-like view.
- Current backend visualisation is still low resolution for scientific inspection: one verified short ESC-50 file returned about 800 waveform samples and a 64 x 44 spectrogram matrix.
- Backend must add high-resolution windowed waveform/spectrogram output. The frontend cannot invent missing acoustic detail.

Next frontend work:

1. Keep improving the high-definition canvas once backend returns higher-resolution windows.
2. Show backend window/chunk analysis state for long files.
3. Add prototype search UI once real prototype endpoint exists.
4. Add "find similar sounds" action.
5. Add compare mode for two recordings.
6. Show prior saved wave annotations and human identifications from `GET /library/blobs/{id}`.
7. Keep the two-row oscilloscope knob bank intact.

## Test Plan

Terminal:

```powershell
Invoke-RestMethod "http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/status"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/detectors"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/blobs/{id}/visualisation"
Invoke-RestMethod -Method Post "http://localhost:3010/api/mindex/sine/blobs/{id}/analyze"
```

Browser:

1. Open `http://localhost:3010/sensing/sine/player`.
2. Confirm files load.
3. Select short ESC-50 file.
4. Confirm native audio metadata shows duration.
5. Manually play audio.
6. Confirm waveform and spectrogram render.
7. Run full SINE analysis.
8. Confirm detector lanes populate from real response.
9. Confirm prototype matches populate only when backend returns real matches.
10. Confirm sound transcript populates only when backend returns real transcript windows.
11. Add wave marker and save.
12. Add human correction and save.
13. Reload selected file and confirm saved annotations/corrections come back.
14. Select long MBARI file and confirm UI uses windowed/queued behavior, not frozen loading.

## Paste-Ready Cursor Prompt

```text
You are Cursor working on the MINDEX backend for the SINE acoustic classifier.

Read this full handoff first:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_ACOUSTIC_CLASSIFIER_FULL_CONTEXT_JUN04_2026.md

Goal:
Make SINE real. It must classify real MINDEX/NAS acoustic recordings using deterministic DSP plus model/prototype heads, not frontend guesses or fake Gemini output.

Hard rules:
- No mock audio.
- No fake waveform.
- No fake spectrogram.
- No fabricated detector result.
- No filename-based prototype matches.
- No fake diagnostics.
- No credentials, tokens, or raw NAS paths in API responses consumed by UI.
- Do not overwrite model predictions when a human correction is added.

Start with these backend files:
- mindex_api/services/sine_acoustic/visualisation.py
- mindex_api/services/sine_acoustic/pipeline.py
- mindex_api/services/sine_acoustic/classifier.py
- mindex_api/services/sine_acoustic/event_views.py
- mindex_api/routers/library.py
- mindex_api/routers/sine_acoustic.py

Immediate P0 backend work:
1. Replace decimated waveform visualization with min/max/RMS envelope output and maintain compatibility with existing amplitudes.
2. Add range/window query params to visualisation for long MBARI files:
   start_sec, end_sec, frequency_min_hz, frequency_max_hz, max_waveform_points, max_spectrogram_columns.
3. Add normalized fields to every detector event:
   acoustic_domain, event_family, event_type, method, model_version.
4. Return sound_transcripts from analyze/classify. These are chronological physical sound-event descriptions, not speech transcripts.
5. Return real diagnostics:
   latency_ms, sample_rate_in, channels, duration_sec, window_count, decode_format, detector_versions, cache/job state.
6. Build or stub with honest unavailable status a model registry for:
   AudioSet/VGGish general sound, CRNN/ResNetish log-mel, marine mammal/vessel, animal, insect, air propeller, water propeller, impulse/weather, ground/seismic, deep-signal embedding.
7. Add prototype/fingerprint persistence and real similarity matching. Use pgvector-style cosine/inner-product patterns with explicit model/version/dimension. Do not match prototypes from filename text.
8. Long files should return queued/windowed analysis instead of blocking the UI.
9. Ensure wave annotations and human identifications are returned by GET /api/mindex/library/blobs/{id}.

External code references already cloned locally by Codex:
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\MAX-Audio-Classifier
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\ml-sound-classifier
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\sound-clf-pytorch
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\crnn-audio-classification
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\imfing-audio-classification
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\urban-audio-classifier
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\gmtk-audio-classification
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\ovh-ai-training-examples
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\Audio-Classification-Deep-Learning
- D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos\neural-audio-classification

Preferred incorporation:
- IBM MAX: AudioSet/VGGish general sound adapter.
- sound-clf-pytorch: PyTorch ResNetish/VGGish training/inference family.
- ml-sound-classifier: live/edge chunking, samplewise normalization, prediction smoothing.
- crnn-audio-classification: CRNN temporal sequence head.
- imfing: deterministic feature diagnostics.
- urban-audio-classifier: terrestrial event taxonomy/preprocessing reference only; license review before direct code copy.
- gmtk: HMM/temporal smoothing concepts.
- OVH notebook: marine mammal feature extraction/taxonomy starter.

Acceptance tests from website host:
- GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=100 returns real rows.
- GET http://localhost:3010/api/mindex/sine/status returns detector/model registry status.
- GET http://localhost:3010/api/mindex/sine/blobs/{short_id}/visualisation returns waveform envelope and spectrogram arrays.
- POST http://localhost:3010/api/mindex/sine/blobs/{short_id}/analyze returns identification_summary, detector groups, deep_signal_matches, sound_transcripts, and diagnostics.
- GET http://localhost:3010/api/mindex/library/blobs/{short_id} returns latest wave annotations and human identifications after they are saved.
- Browser at http://localhost:3010/sensing/sine/player shows real file, plays real audio, renders real visualization, and populates lanes/transcripts/prototypes only from real backend data.
```

## Paste-Ready ChatGPT Planning Prompt

```text
You are designing the production SINE Spectral Intelligence Network acoustic classifier for Mycosoft MINDEX.

Read this context:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_ACOUSTIC_CLASSIFIER_FULL_CONTEXT_JUN04_2026.md

Design an acoustic-only SINE classifier plan. Do not include chemistry, DNA computing, PubChem, DWSIM, Cantera, or molecular tools.

The system must work with real NAS-backed MINDEX audio files, especially ESC-50 and MBARI hydrophone recordings, and must support the Psathyrella buoy device and future air/water/ground sensor recordings.

Deliver a plan with:
1. Model architecture:
   deterministic DSP layer, activity segmentation, general AudioSet head, marine head, animal/insect head, propeller head, impulse/weather head, ground/seismic head, deep-signal embedding/prototype head, transcript synthesis layer.
2. Data architecture:
   library blobs, analysis runs, detector events, wave annotations, human identification corrections, prototype bank, embeddings, diagnostics, model registry.
3. Endpoint contract:
   list, stream, visualisation, analyze, classify, prototype search, human correction, wave annotation, long-file job status.
4. Training plan:
   source datasets, licensing review, normalization, augmentation, active learning from human tags, prototype creation, evaluation metrics, false-positive review.
5. UX plan:
   oscilloscope-style high-def waveform/spectrogram, event lanes, sound transcript, prototype matches, human correction, region markers, loop/reverse/speed/zoom.
6. Deployment plan:
   MINDEX VM, NAS models folder, container dependencies, short-file synchronous analysis, long-file queued/windowed analysis, caching.
7. Acceptance tests:
   terminal and browser checks proving real audio, real visualisation, real detector results, real saved corrections, no fake data.

Hard rules:
- No fake detections.
- No mock audio.
- No synthetic waveform pretending to be real.
- No filename-based prototype match.
- No credentials in UI or returned JSON.
- Human corrections are stored beside model predictions and never erase model predictions.
```

## Jun 4 Codex Update - MINDEX Library Category-App Architecture

Current Mycosoft sensing reference:

- `https://mycosoft.com/about`
- The About page describes Mycosoft sensing as data sensors plus Fungi Compute, hydrophones, radar, VOC sensing, particle counters, Geiger detection, Wi-Fi sense, vibration, temperature/humidity, acoustic, optical, thermal, mechanical channels, and FCI.
- It links the sensing software rails as `Fungi Compute + FCI`, `MINDEX`, `BlueSight`, `SINE`, and `GANDHA`.

Architecture decision:

- MINDEX Library is the shared NAS-backed catalog and memory layer.
- The Library tab must not collapse every sensing type into one generic preview.
- Each sensing family gets a complete app:
  - `SINE`: acoustic files only; hydrophone, transducer, microphone, contact, ultrasonic, air/water/ground recordings.
  - `BlueSight`: visual / optical / spectral / radar / LiDAR / radiation / Wi-Fi/Bluetooth sensing files.
  - `GANDHA`: gas, VOC, VSC, smell, chemical blob, Bosch BME688/BME690/BMV080-style files.
  - `Fungi Compute`: fungal bioelectric / FCI / mycelium signal files.
  - Future thermal and tactile apps should follow the same category-bound pattern.

Website state after Codex pass:

- `components/sensing/sine-acoustic-player.tsx` supports `embedded` mode.
- `components/mindex/tabs/library-tab.tsx` routes the `Acoustic` category to `<SineAcousticPlayer embedded />`.
- SINE still fetches only `category=acoustic`; it is not a generic all-file player.
- The old MINDEX Library right-side preview/details surface remains only for non-acoustic categories until their specialized apps are built.

Signal transcript state after Codex pass:

- If backend `sound_transcripts` exist, SINE renders those as `MINDEX transcript`.
- If backend transcripts are absent, SINE derives `Real detector windows` from actual detector events only.
- Derived windows are clearly marked `detector-derived`; no fake semantic labels are invented.

Backend/MAS implication:

- MAS/NLM can use MINDEX Library through the new MAS bridge on 188, but the website hot path should still use MINDEX 189/BFF for SINE.
- Human tags and wave annotations now matter for NLM training. Keep model predictions and human corrections side-by-side.
- Future app builds should expose category-specific library rows to MYCA/NLM without mixing categories.
