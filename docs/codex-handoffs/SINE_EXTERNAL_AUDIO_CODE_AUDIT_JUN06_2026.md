# SINE External Audio Code Audit

Date: June 6, 2026

Prepared by: Codex

Purpose: implementation-grade audit of the external acoustic classifier repos Morgan asked Codex/Cursor to read for the real SINE backend. This is acoustic-only.

Local audit workspace:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos`

Important: these repos were cloned/read for backend design guidance only. Do not vendor them into the Website repo. Review licenses before copying code into MINDEX. Prefer reimplementing the relevant architecture/pipeline patterns in the MINDEX code style.

Repeatable local audit command from the Website repo:

```powershell
node scripts/sine-external-repo-audit.mjs
```

Latest result:

```text
Status: ready
Repos: 9 pass, 1 warn, 0 fail
```

The one warning is `ilge/gmtk-audio-classification`, because historical filenames can fail Windows checkout. Treat GMTK as a git-object/design reference unless the checkout is repaired.

## Audit Provenance

These are the local checkouts Codex inspected for SINE backend design. Use the exact commit hashes below for reproducibility. Re-check licenses before copying any code; no-license rows should be treated as design references only unless legal review clears reuse.

| Repo | Remote | Branch | Commit | Root license file |
|---|---|---|---|---|
| `imfing-audio-classification` | `https://github.com/imfing/audio-classification.git` | `master` | `a036ccc34fad52c62dbaa4f01b5a4d6705439a42` | none found |
| `Audio-Classification-Deep-Learning` | `https://github.com/abishek-as/Audio-Classification-Deep-Learning.git` | `main` | `d5b7d65431000922b17b6a7924f153d96cf07de0` | none found |
| `crnn-audio-classification` | `https://github.com/ksanjeevan/crnn-audio-classification.git` | `master` | `f09449b87ed61d28b82931c7055d033a7b69160b` | `LICENSE` |
| `gmtk-audio-classification` | `https://github.com/ilge/gmtk-audio-classification.git` | `master` | `636341e225da2e71a6ba6e25b1e20ef480a8f8f4` | none found |
| `MAX-Audio-Classifier` | `https://github.com/IBM/MAX-Audio-Classifier.git` | `master` | `3c308abcb04e1523e668ebaf76ca55898cd97d28` | `LICENSE` |
| `ml-sound-classifier` | `https://github.com/daisukelab/ml-sound-classifier.git` | `master` | `fdee30de02d33948a301e3d56b2b890f04810158` | `LICENSE` |
| `neural-audio-classification` | `https://github.com/braydenoneal/neural-audio-classification.git` | `master` | `7fdc7919897be512970183e1ef5a60804da889db` | `LICENSE.txt` |
| `sound-clf-pytorch` | `https://github.com/daisukelab/sound-clf-pytorch.git` | `master` | `85105ca51f4d5d378fb337dd1e21cde0396df756` | none found |
| `urban-audio-classifier` | `https://github.com/GorillaBus/urban-audio-classifier.git` | `master` | `c38ed0066f1850f7b6b3b9f7d4777d83a910a7e1` | `LICENSE` |

The OVH marine notebook is a web path inside `https://github.com/ovh/ai-training-examples/blob/main/notebooks/audio/audio-classification/notebook-marine-sound-classification.ipynb`; use it as a dataset/windowing reference, not as a vendored dependency.

## Bottom Line

The strongest path for real SINE is not one repo copied wholesale. It is a composed MINDEX backend:

1. Audio decode/windowing from real `library.blob` NAS files.
2. Deterministic DSP feature layer: waveform, STFT, log-mel, PCEN, MFCC, centroid, rolloff, bandwidth, RMS, ZCR, spectral contrast, harmonic/tonnetz, activity, impulse, rotor, sweep, and low-frequency ground candidates.
3. P0 PyTorch model: log-mel ResNetish/CNN style environmental classifier trained on real ESC-50 plus verified MINDEX/NAS training files.
4. Long-file inference: split hydrophone/MBARI files into bounded windows, aggregate per-window model outputs, persist window coordinates.
5. P1 temporal model: CRNN/GRU or transformer for repeated/evolving patterns like animals, insects, rotors, thunder/lightning, vessel/propeller, and ground/seismic events.
6. Prototype retrieval: embeddings and cosine similarity against stored, labeled acoustic prototypes.
7. Evidence fusion and sound transcripts: only produce semantic `sound_transcripts` from linked model/DSP/prototype evidence.
8. Human correction loop: human labels persist beside model predictions and contested items enter training review.

## Repo Findings

### `GorillaBus/urban-audio-classifier`

Source: `https://github.com/GorillaBus/urban-audio-classifier`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\urban-audio-classifier`

Files inspected:

- `README.md`
- `include/helpers.py`
- notebooks listed in README: preprocessing, MFCC CNN, mel-spec CNN, augmentation, augmented preprocessing

Useful code patterns:

- `include/helpers.py` computes normalized log-mel and MFCC features with `librosa`.
- `get_mel_spectrogram()` loads audio, normalizes waveform, computes mel spectrogram, converts to dB, normalizes the feature image, and pads to a target width.
- `get_mfcc()` performs the analogous normalized MFCC path.
- `add_padding()` keeps fixed-width model inputs stable.
- Evaluation helpers include train/test metrics, per-class accuracy, confusion matrix, and normalized confusion matrix.
- README emphasizes UrbanSound8K's 10-fold validation structure, precision/recall/F1, and augmentation with pitch shift, time stretch, and noise.

Use in SINE:

- Reimplement the normalized log-mel/MFCC helpers in `mindex_api/services/sine_acoustic/features.py`.
- Use fold-aware evaluation reports for ESC-50 and UrbanSound style datasets.
- Store confusion matrix and per-class metrics in the model registry.
- Use augmentation ideas for training jobs, not for inference or fake production labels.

Do not copy as-is:

- Keras/TensorFlow notebook runtime.
- Notebook-only flow.
- Any label inference from file paths without a registered dataset manifest.

### `IBM/MAX-Audio-Classifier`

Source: `https://github.com/IBM/MAX-Audio-Classifier`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\MAX-Audio-Classifier`

Files inspected:

- `app.py`
- `api/predict.py`
- `api/metadata.py`
- `core/model.py`
- `core/vggish_input.py`
- `core/mel_features.py`
- `samples/class_labels_indices.csv`

Useful code patterns:

- Clean model-serving wrapper: `/predict`, `/metadata`, request parser, file upload, optional `start_time`, and top-k class output.
- `ModelWrapper` separates embedding generation, classifier preprocessing, model inference, and postprocessing.
- VGGish path converts waveform to log-mel examples, creates embeddings, PCA/postprocesses, and classifies against 527 AudioSet labels.
- `classifier_pre_process()` crops embeddings to a start timestamp, repeats short embeddings up to a 10-second tensor, clips long sequences, and converts embedding dtype for classifier input.
- `classifier_post_process()` maps top scores to label IDs and human labels.

Use in SINE:

- Mirror the clean separation:
  - `decoder.py`
  - `features.py`
  - `models.py`
  - `inference.py`
  - `postprocess.py`
  - `router.py`
- Keep `start_sec` and `end_sec` as first-class analyze parameters.
- Return top-k labels with IDs, scores, model ID/version, and window coordinates.
- Implement a metadata/status endpoint that proves model artifact, label map, checksum, runtime, and device.

Do not copy as-is:

- Old TensorFlow/MAX runtime.
- Fixed 527 AudioSet assumptions as the only SINE taxonomy.
- The old VGGish session code. Prefer PyTorch, TorchScript, ONNX Runtime, PANNs/CNN14, AST, BEATs, CLAP, or a modern exported equivalent.

### `abishek-as/Audio-Classification-Deep-Learning`

Source: `https://github.com/abishek-as/Audio-Classification-Deep-Learning`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\Audio-Classification-Deep-Learning`

Files inspected:

- `AudioClassification/functions.py`
- `AudioClassification/views.py`
- `assets/Predict.py`
- `assets/Model1.h5`, `Model2.h5`, `Model3.h5` presence

Useful code patterns:

- Compares ANN, 1D CNN, and 2D CNN prediction heads over a common MFCC feature extractor.
- `extract_feature()` uses `librosa.load(..., res_type="kaiser_fast")`, then 128 MFCCs averaged across time.
- `CNN1D_print_prediction()` expands the MFCC vector along channel dimension.
- `CNN2D_print_prediction()` reshapes MFCC features into a small 2D feature map.
- Simple web wrapper demonstrates surfacing multiple model opinions in one UI.

Use in SINE:

- Use as a negative/contrast baseline: SINE can keep an engineered MFCC baseline for model comparison and regression tests.
- It is useful for proving that multiple heads can evaluate the same audio window.
- Use the "multiple heads returned side by side" idea in backend response, but with real provenance and modern runtime.

Do not copy as-is:

- H5 Keras models.
- Django app.
- Path-bound assets.
- Averages-only MFCC as the primary classifier for hydrophone/rotor/seismic work.

### `daisukelab/ml-sound-classifier`

Source: `https://github.com/daisukelab/ml-sound-classifier`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\ml-sound-classifier`

Files inspected:

- `common.py`
- `sound_models.py`
- `realtime_predictor.py`
- `lib_train.py`
- `apps/urban-sound/config.py`
- `apps/fsdkaggle2018/*`
- `apps/cnn-laser-machine-listener/*`

Useful code patterns:

- Real-time buffer loop: collect raw audio chunks, keep rolling buffer, convert to log-mel, split into model-sized windows, run predictions, then ensemble them.
- `common.py` defines audio read, trim, log-mel conversion, sample-wise normalization, long-data splitting, and geometric mean prediction aggregation.
- `audio_sample_to_X()` converts a raw wave into repeated model windows.
- `split_long_data()` splits long spectrograms with overlap.
- `lib_train.py` handles class balance, mixup, oversampling/undersampling, metrics, train/valid split, and confusion matrix.
- `sound_models.py` includes MobileNetV2 and AlexNet-style model definitions over spectrogram images.
- Domain-specific app configs show how one shared pipeline can support urban sound, FSDKaggle, and machine listener apps.

Use in SINE:

- Implement Psathyrella buoy streaming or near-real-time analysis around the rolling buffer concept.
- Implement long-file window aggregation for MBARI/hydrophone files.
- Store per-window predictions and an aggregate clip-level summary.
- Use mixup/class-balance ideas in training jobs.
- Support per-domain configs for water, air, ground, animal, rotor, impulse, and mechanical heads.

Do not copy as-is:

- Old Keras/PB graph runtime.
- PyAudio desktop capture as a direct production dependency.
- Any model output without artifact/checksum/provenance.

### `daisukelab/sound-clf-pytorch`

Source: `https://github.com/daisukelab/sound-clf-pytorch`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\sound-clf-pytorch`

Files inspected:

- `src/models.py`
- `src/libs.py`
- `src/augmentations.py`
- `for_evar/cnn14_decoupled.py`
- config files and advanced preprocessing scripts

Useful code patterns:

- Best P0 implementation reference in this batch.
- `src/models.py` includes ResNetish, VGGish, and AlexNet-style 1-channel spectrogram models.
- `src/libs.py` includes `LMSClfDataset`, fixed clip length handling, central padding, random cropping, `SplitAllDataset` for long-file split inference, and PyTorch Lightning training wrapper.
- `LMSClfLearner` supports train/val/test steps and optional mixup.
- `for_evar/cnn14_decoupled.py` defines a decoupled CNN14-style embedding network with torchlibrosa spectrogram/logmel frontend, convolution blocks, temporal pooling, and embedding output.
- `SplitAllDataset` is directly relevant to MBARI and other long hydrophone recordings.

Use in SINE:

- P0 model: create `sine-esc50-resnetish-v1` using log-mel input and a ResNetish/VGGish-style CNN.
- P0 inference: split all long files into windows and aggregate results.
- P0 embedding: expose penultimate layer embedding for prototype matching.
- P1: consider CNN14/PANNs-style embedding branch for environmental and marine acoustic prototypes.

Do not copy as-is:

- Notebook training flow.
- Any unreviewed external pretrained weights.
- Config names that are not registered in MINDEX model registry.

### `ilge/gmtk-audio-classification`

Source: `https://github.com/ilge/gmtk-audio-classification`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\gmtk-audio-classification`

Note: Windows checkout failed on old log filenames containing `:`, but Git objects were fetched and inspected via `git show`.

Files inspected:

- `README.md`
- `alpha1/README.md`
- `models/FeatureDecoding_v5.xml`
- tree names for decoding/training/swarmlet folders

Useful code patterns:

- Hidden Markov Model design for live audio event detection.
- Multi-state smoothing/hysteresis to reduce false positives from short clap-like ambient events.
- AFTE/gammatone filterbank features with 8 channels and center frequencies around 377, 524, 707, 934, 1217, 1568, 2000, and 2800 Hz.
- Feature frames around 15 fps with 1/3 second windows.
- Feature selection using Bhattacharyya distance, ROC, entropy, and t-test.
- Online WebSocket classification and smoothing pipeline.

Use in SINE:

- Implement temporal smoothing and hysteresis after detector/model outputs, especially for impulse, rotor, thunder/lightning, machinery, and animal call events.
- Add event-duration priors: do not accept one-frame blips as confirmed semantic events unless the detector family is intentionally impulsive.
- Use bandpass/envelope features for rotor/propeller and repeated pulse classes.

Do not copy as-is:

- GMTK runtime.
- Ptolemy/CapeCode XML runtime.
- Old HMM model files.
- Applause-specific labels as SINE classes.

### `ksanjeevan/crnn-audio-classification`

Source: `https://github.com/ksanjeevan/crnn-audio-classification`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\crnn-audio-classification`

Files inspected:

- `net/model.py`
- `net/audio.py`
- `data/transforms.py`
- `eval/infer.py`
- `crnn.cfg`
- `config.json`

Useful code patterns:

- `AudioCRNN` combines mel spectrogram frontend, convolutional layers, and recurrent layers.
- Uses length-aware flow: modifies lengths after conv/pooling, packs sequences with `pack_padded_sequence`, runs recurrent model, then pads output.
- Includes `AudioCNN` and `AudioRNN` variants.
- `MelspectrogramStretch` supports mel frontend and optional time stretch via phase vocoder.
- `SpecNormalization` supports dB and z-transform style normalization.
- `AudioTransforms` include channel processing, additive noise, random crop length, and duration modification.

Use in SINE:

- P1 temporal model for evolving signals: whale calls, dolphin clicks/whistles, insect rhythms, rotor harmonics, propeller cavitation, thunder rolls, tremors.
- Use length-aware window batches so long recordings do not become fake fixed-size clips.
- Store temporal model outputs as event windows, not just clip-level labels.

Do not copy as-is:

- Exact config parser/runtime without adapting to MINDEX.
- UrbanSound-only training assumptions.

### `imfing/audio-classification`

Source: `https://github.com/imfing/audio-classification`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\imfing-audio-classification`

Files inspected:

- `feat_extract.py`
- `cnn.py`
- `nn.py`
- `svm.py`

Useful code patterns:

- Engineered feature vector built from MFCC, chroma, mel, spectral contrast, and tonnetz.
- `feat_extract.py` returns a 193-dimensional hand-engineered feature vector.
- Includes SVM, dense NN, and 1D CNN baselines.
- Includes real-time predict entry in `cnn.py` that extracts features repeatedly from microphone input.

Use in SINE:

- Implement engineered DSP baseline features for deterministic evidence and model sanity checks.
- Use these features as `sine.detector_event` evidence and optional simple baseline model, not the main semantic classifier.
- Add feature-vector persistence for future model comparisons.

Do not copy as-is:

- Old Keras `predict_classes`.
- OGG-folder parsing and path-label assumptions.
- SVM as the only classifier.

### OVH marine sound classification notebook

Source: `https://github.com/ovh/ai-training-examples/blob/main/notebooks/audio/audio-classification/notebook-marine-sound-classification.ipynb`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\ovh-ai-training-examples\notebooks\audio\audio-classification\notebook-marine-sound-classification.ipynb`

Useful code patterns:

- Strong marine/hydrophone context for SINE's Navy and buoy needs.
- Uses Watkins Marine Mammal Sound Database style labels.
- Explores waveform, STFT, spectral rolloff, chroma, RMS, spectral centroid, spectral bandwidth, zero crossing rate, harmony/perceptr, tempo, and MFCC features.
- Builds 30-second marine mammal training rows.
- Defines 45 marine mammal classes.
- Trains a dense TensorFlow model over tabular features as an introductory baseline.

Use in SINE:

- Create `sine-marine-mammal-p0` dataset manifest using licensed/allowed marine audio.
- Use the 30-second marine window convention for hydrophone and buoy files.
- Use marine feature set as deterministic evidence and baseline features.
- Add a marine-specific head after the P0 environmental head.

Do not copy as-is:

- Dense tabular classifier as the final Navy-grade model.
- Any Kaggle/Watkins data without license review and manifest.

### `braydenoneal/neural-audio-classification`

Source: `https://github.com/braydenoneal/neural-audio-classification`

Local audit path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\.codex-artifacts\sine-repos\neural-audio-classification`

Files inspected:

- `src/spectrogram.py`
- `src/neural_network.py`
- `src/predict.py`
- `src/record.py`
- `README.md`

Useful code patterns:

- Simple PyTorch CNN over spectrogram images.
- Uses `torch.jit.script(model).save(...)`, which is useful as a TorchScript deployment pattern.
- `predict.py` loads TorchScript with `torch.jit.load`.
- `spectrogram.py` converts audio into high-resolution mel spectrogram images with `n_fft=2048`, `hop_length=1`, `n_mels=512`, and `win_length=1024`.

Use in SINE:

- Use TorchScript save/load pattern for model registry proof.
- Use spectrogram artifact generation as a QA/sanity artifact for small clips.
- Use as a minimal model/export example, not as a production classifier.

Do not copy as-is:

- Spoken-digit dataset assumptions.
- RGB image folder training flow.
- CUDA-only assumptions in `predict.py`.
- Extremely small `hop_length=1` for production large-file inference unless bounded for QA only.

## Local AI Studio Prototype Audit

Local path:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Files inspected:

- `server.ts`
- `src/data/acousticData.ts`
- `src/components/AcousticPlayer.tsx`
- `src/components/ModelExplorer.tsx`
- `src/components/LibraryTab.tsx`
- `src/components/SINEStatus.tsx`
- `src/types.ts`

Useful product/UI patterns:

- `AcousticPlayer.tsx` shows a combined waveform + spectrogram canvas with playhead, hover cursor, and basic scrub interaction.
- `ModelExplorer.tsx` has a good three-layer communication model: deterministic signal physics, deep embedding stack, and semantic heads.
- `LibraryTab.tsx` has a simple source/medium/search catalog pattern and auto-selects the shortest clip first.
- `types.ts` names the response fields SINE needs: `identification_summary`, detector arrays, `deep_signal_matches`, `sound_transcripts`, and `diagnostics`.

Production rejects:

- `src/data/acousticData.ts` is mock data. Do not import it, normalize it, or use it as a catalog truth source.
- `server.ts` imports `GoogleGenAI` and prompts Gemini to invent acoustic classifications from metadata. This is not SINE analysis.
- `server.ts` uses `generateWavBuffer()` to synthesize WAV files. MINDEX must stream and decode NAS-backed audio bytes.
- `server.ts` generates waveform/spectrogram matrices from file IDs and label assumptions. MINDEX visualisation must compute from decoded samples.
- `generateDspHeuristicPayload()` emits semantic labels such as whale, dog, UAV, explosion, and prototype matches from metadata. This is the current failure mode and must not survive in production.
- `SINEStatus.tsx` displays "ready", model version, engine, quantization, and calibration claims without model-registry evidence. Production status must come from `sine.model_artifact` and a live load check.

Use in SINE:

- Keep the UX vocabulary and endpoint shape.
- Replace every synthetic or LLM semantic output with evidence-backed DSP/model/prototype/fusion output.
- Use Gemini or MYCA only later as an interpreter over already-proven evidence, never as the primary classifier.

## Local Fungi Compute Visualisation Audit

Website paths inspected:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\oscilloscope.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\stft-spectrogram.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\spectrum-analyzer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\fungi-compute\signal-fingerprint.tsx`

Useful frontend/visualisation patterns:

- ResizeObserver-driven canvas dimensions.
- Stable oscilloscope grid divisions.
- channel enable/gain/offset controls.
- time scale and voltage/frequency range controls.
- cursor and trigger overlays.
- persistence mode.
- STFT spectrogram with selectable colormap and range.
- FFT spectrum analyzer with bar/waterfall modes.
- peak markers with frequency labels.
- band overlays and scientific axis labels.
- signal-fingerprint view for eventual prototype embedding/fingerprint displays.

Backend requirements implied by these components:

- SINE visualisation must return high-resolution real arrays, not thumbnails.
- The backend must expose enough metadata to make axes honest: sample rate, FFT size, hop length, time bounds, frequency bounds, dB normalization, and downsampling/clamp policy.
- Peak/event overlays should be returned as explicit rows instead of inferred in the browser from labels.
- Multi-channel support should be planned because hydrophones, microphones, buoy arrays, and Psathyrella device packages may carry more than one channel.
- Windowed visualisation is required for long MBARI/hydrophone files; whole-file spectrogram generation should queue/cache instead of timing out.

## Backend Build Order For Cursor

### Pass 1 - Decoder and deterministic visualisation

- Decode WAV, FLAC, MP3, and future container types from NAS-backed `library.blob`.
- Normalize mono/stereo to float32.
- Return high-resolution waveform and spectrogram arrays with explicit sample rate, time axis, frequency axis, FFT settings, dB scale, clamp/downsample metadata, and peak rows.
- Persist a visualisation summary or cache for frequently opened clips.

### Pass 2 - DSP features and detector events

- Build `features.py` from the useful common pieces above:
  - log-mel
  - PCEN
  - MFCC
  - chroma
  - RMS
  - ZCR
  - centroid
  - bandwidth
  - rolloff
  - spectral contrast
  - tonnetz/harmonic features
  - impulse/energy/activity events
  - rotor/periodic harmonic candidates
  - low-frequency ground/seismic candidates
- Persist detector events with `feature_source`, window bounds, numeric values, and confidence.

### Pass 3 - P0 real model

- Build or train `sine-esc50-resnetish-v1` using PyTorch/TorchScript or ONNX.
- Use log-mel input, fixed clip windows, padding/cropping, and split-all inference for long files.
- Store artifact, label map, training config, metrics, confusion matrix, checksum, and backend commit.
- Register model in Postgres and expose it through `/api/mindex/sine/models`.

### Pass 4 - Long-file and buoy inference

- Analyze long MBARI/hydrophone/Psathyrella files in bounded windows.
- For streaming buoy audio, use a rolling buffer and overlap/step policy inspired by `ml-sound-classifier`.
- Return queued job status for heavy jobs, then return persisted model outputs for the exact submitted window.

### Pass 5 - Temporal and prototype intelligence

- Add CRNN/GRU or transformer model for evolving patterns.
- Add embeddings and prototype matching with cosine similarity.
- Add HMM/hysteresis-style smoothing for duration-sensitive events.
- Produce sound transcripts only when model/DSP/prototype evidence supports them.

### Pass 6 - Human correction and training review

- Save human tags at clip and region level.
- Persist model label and human label side by side.
- Mark disagreements as contested.
- Queue contested examples for training/prototype review.
- Never overwrite model evidence with human labels.

## Acceptance Additions From This Audit

Cursor should add these tests or equivalent:

- Feature extraction returns finite log-mel, MFCC, centroid, rolloff, RMS, ZCR, and spectral contrast from a known ESC-50 WAV.
- P0 model can run over a short ESC-50 file and returns `model_outputs[]` with artifact/checksum/model version.
- Long-file split inference returns multiple per-window model outputs and a clip-level aggregate.
- Missing model returns `model_unavailable`, empty `model_outputs[]`, and no semantic transcript.
- Human correction `model=UAV`, `human=lightning` persists both labels and creates a contested review item.
- `/api/mindex/sine/models` returns real rows when a model is loaded and honest empty/unavailable rows when none are loaded.
- No endpoint uses Gemini, filename labels, mock labels, or synthetic transcripts.
