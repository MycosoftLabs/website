#!/usr/bin/env node

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const args = parseArgs(process.argv.slice(2))
const jsonOutput = Boolean(args.json)
const root = process.cwd()
const repoRoot = resolve(root, args.root || ".codex-artifacts/sine-repos")

const repos = [
  {
    id: "urban_audio_classifier",
    name: "GorillaBus/urban-audio-classifier",
    dir: "urban-audio-classifier",
    files: ["README.md", "include/helpers.py", "LICENSE"],
    patterns: [
      { file: "include/helpers.py", label: "log-mel helper", pattern: /melspectrogram|get_mel_spectrogram|power_to_db/i },
      { file: "include/helpers.py", label: "MFCC helper", pattern: /mfcc|get_mfcc/i },
      { file: "include/helpers.py", label: "fixed-width padding", pattern: /add_padding|pad/i },
    ],
    sineUse: "normalized log-mel/MFCC features, feature-image padding, fold-aware metrics",
  },
  {
    id: "ibm_max_audio_classifier",
    name: "IBM/MAX-Audio-Classifier",
    dir: "MAX-Audio-Classifier",
    files: ["app.py", "api/predict.py", "api/metadata.py", "core/model.py", "core/vggish_input.py", "core/mel_features.py", "samples/class_labels_indices.csv", "LICENSE"],
    patterns: [
      { file: "api/predict.py", label: "predict endpoint", pattern: /def\s+predict|predict\(/i },
      { file: "api/metadata.py", label: "metadata endpoint", pattern: /metadata|model/i },
      { file: "core/model.py", label: "model wrapper", pattern: /class\s+ModelWrapper|predict/i },
      { file: "core/vggish_input.py", label: "log-mel examples", pattern: /waveform_to_examples|log_mel|mel/i },
    ],
    sineUse: "serving wrapper, metadata/status proof, start-time/windowed top-k labels",
  },
  {
    id: "abishek_audio_classification",
    name: "abishek-as/Audio-Classification-Deep-Learning",
    dir: "Audio-Classification-Deep-Learning",
    files: ["AudioClassification/functions.py", "AudioClassification/views.py", "assets/Predict.py"],
    patterns: [
      { file: "assets/Predict.py", label: "MFCC feature extraction", pattern: /mfcc|extract_feature/i },
      { file: "assets/Predict.py", label: "multi-head prediction baseline", pattern: /CNN1D|CNN2D|ANN|predict/i },
    ],
    sineUse: "engineered MFCC sanity baseline and multi-head comparison pattern",
  },
  {
    id: "ml_sound_classifier",
    name: "daisukelab/ml-sound-classifier",
    dir: "ml-sound-classifier",
    files: ["common.py", "sound_models.py", "realtime_predictor.py", "lib_train.py", "apps/urban-sound/config.py", "LICENSE"],
    patterns: [
      { file: "common.py", label: "log-mel conversion", pattern: /log_mel|melspectrogram|librosa/i },
      { file: "common.py", label: "long-data split", pattern: /split_long_data|audio_sample_to_X|split/i },
      { file: "realtime_predictor.py", label: "rolling realtime predictor", pattern: /realtime|buffer|predict/i },
      { file: "lib_train.py", label: "training metrics", pattern: /confusion|precision|recall|mixup|oversampling|undersampling/i },
    ],
    sineUse: "real-time buoy windowing, long-file split inference, aggregate predictions",
  },
  {
    id: "sound_clf_pytorch",
    name: "daisukelab/sound-clf-pytorch",
    dir: "sound-clf-pytorch",
    files: ["src/models.py", "src/libs.py", "src/augmentations.py", "for_evar/cnn14_decoupled.py"],
    patterns: [
      { file: "src/models.py", label: "PyTorch CNN model classes", pattern: /class\s+\w+.*nn\.Module|ResNet|VGG|AlexNet/i },
      { file: "src/libs.py", label: "dataset/windowing", pattern: /SplitAllDataset|Dataset|crop|pad/i },
      { file: "for_evar/cnn14_decoupled.py", label: "CNN14 embedding branch", pattern: /Cnn14|embedding|Logmel|Spectrogram/i },
    ],
    sineUse: "P0 PyTorch CNN/log-mel model, long-file window dataset, CNN14-style embeddings",
  },
  {
    id: "gmtk_audio_classification",
    name: "ilge/gmtk-audio-classification",
    dir: "gmtk-audio-classification",
    files: ["README.md", "alpha1/README.md", "models/FeatureDecoding_v5.xml"],
    patterns: [
      { file: "models/FeatureDecoding_v5.xml", label: "feature decoding graph", pattern: /Feature|Decode|audio|classification/i },
      { file: "README.md", label: "legacy probabilistic model context", pattern: /GMTK|audio|classification/i },
    ],
    sineUse: "legacy feature-decoding reference for explicit evidence graph design",
    optionalPartial: true,
    partialReason: "Windows checkout can fail on historical filenames; use as a git-object/design reference only.",
  },
  {
    id: "crnn_audio_classification",
    name: "ksanjeevan/crnn-audio-classification",
    dir: "crnn-audio-classification",
    files: ["net/model.py", "net/audio.py", "data/transforms.py", "train/trainer.py", "eval/infer.py", "LICENSE"],
    patterns: [
      { file: "net/model.py", label: "CRNN model", pattern: /GRU|LSTM|RNN|CRNN|Conv/i },
      { file: "net/audio.py", label: "spectrogram/audio helpers", pattern: /spectrogram|mel|audio|librosa/i },
      { file: "data/transforms.py", label: "augmentation/transforms", pattern: /transform|phase|stretch|spec/i },
    ],
    sineUse: "P1 temporal CRNN/GRU model for evolving signals, repeated calls, rotors, and seismic patterns",
  },
  {
    id: "imfing_audio_classification",
    name: "imfing/audio-classification",
    dir: "audio-classification-imfing",
    files: ["feat_extract.py", "svm.py", "nn.py", "cnn.py", "README.md"],
    patterns: [
      { file: "feat_extract.py", label: "engineered feature vector", pattern: /mfcc|chroma|mel|contrast|tonnetz/i },
      { file: "svm.py", label: "SVM baseline", pattern: /SVC|svm|fit|predict/i },
      { file: "cnn.py", label: "CNN baseline", pattern: /Conv|CNN|keras|model/i },
    ],
    sineUse: "MFCC/chroma/mel/contrast/tonnetz engineered baseline and SVM/NN sanity tests",
  },
  {
    id: "ovh_marine_notebook",
    name: "OVH marine sound classification notebook",
    dir: "ovh-marine-notebook",
    files: ["notebook-marine-sound-classification.ipynb"],
    patterns: [
      { file: "notebook-marine-sound-classification.ipynb", label: "marine audio workflow", pattern: /marine|sound|classification|audio/i },
    ],
    sineUse: "marine/hydrophone dataset and windowing reference",
  },
  {
    id: "neural_audio_classification",
    name: "braydenoneal/neural-audio-classification",
    dir: "neural-audio-classification",
    files: ["src/spectrogram.py", "src/neural_network.py", "src/predict.py", "LICENSE.txt"],
    patterns: [
      { file: "src/spectrogram.py", label: "spectrogram generation", pattern: /spectrogram|fft|matplotlib/i },
      { file: "src/neural_network.py", label: "neural classifier", pattern: /torch|nn\.Module|Conv|Linear/i },
      { file: "src/predict.py", label: "prediction flow", pattern: /predict|load|model/i },
    ],
    sineUse: "minimal spectrogram CNN and prediction/export pattern reference",
  },
]

function parseArgs(argv) {
  const parsed = {}
  for (const item of argv) {
    if (item.startsWith("--") && item.includes("=")) {
      const [key, ...rest] = item.slice(2).split("=")
      parsed[key] = rest.join("=")
    } else if (item.startsWith("--")) {
      parsed[item.slice(2)] = true
    }
  }
  return parsed
}

async function fileContains(path, pattern) {
  try {
    const text = await readFile(path, "utf8")
    return pattern.test(text)
  } catch {
    return false
  }
}

async function inspectRepo(repo) {
  const dir = join(repoRoot, repo.dir)
  const missingFiles = repo.files.filter((file) => !existsSync(join(dir, file)))
  const patternResults = []
  for (const check of repo.patterns) {
    const path = join(dir, check.file)
    patternResults.push({
      file: check.file,
      label: check.label,
      present: existsSync(path),
      matched: existsSync(path) ? await fileContains(path, check.pattern) : false,
    })
  }
  const missingPatterns = patternResults.filter((item) => !item.matched)
  return {
    id: repo.id,
    name: repo.name,
    dir,
    exists: existsSync(dir),
    missing_files: missingFiles,
    pattern_results: patternResults,
    missing_patterns: missingPatterns,
    sine_use: repo.sineUse,
    partial_reason: repo.partialReason,
    status:
      existsSync(dir) && missingFiles.length === 0 && missingPatterns.length === 0
        ? "pass"
        : repo.optionalPartial && existsSync(dir)
          ? "warn"
          : "fail",
  }
}

async function main() {
  const report = {
    started_at: new Date().toISOString(),
    repo_root: repoRoot,
    expected_repos: repos.length,
    summary: { pass: 0, warn: 0, fail: 0 },
    repos: [],
    status: "pending",
  }

  for (const repo of repos) {
    const result = await inspectRepo(repo)
    report.repos.push(result)
    report.summary[result.status] += 1
  }

  report.status = report.summary.fail > 0 ? "not_ready" : "ready"
  report.finished_at = new Date().toISOString()

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log("SINE external audio repo audit")
    console.log(`Root: ${report.repo_root}`)
    console.log(`Status: ${report.status}`)
    console.log(`Repos: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`)
    for (const repo of report.repos) {
      const icon = repo.status === "pass" ? "PASS" : repo.status === "warn" ? "WARN" : "FAIL"
      console.log("")
      console.log(`[${icon}] ${repo.name}`)
      console.log(`       ${repo.sine_use}`)
      if (repo.partial_reason) console.log(`       ${repo.partial_reason}`)
      if (repo.missing_files.length) console.log(`       Missing files: ${repo.missing_files.join(", ")}`)
      if (repo.missing_patterns.length) {
        console.log(`       Missing patterns: ${repo.missing_patterns.map((item) => `${item.file}:${item.label}`).join(", ")}`)
      }
    }
  }

  process.exitCode = report.status === "ready" ? 0 : 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
