"use client"

import {
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Activity,
  AudioLines,
  BarChart3,
  Bug,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Cpu,
  Database,
  Download,
  Eye,
  FileAudio,
  Fingerprint,
  Gauge,
  Grid3X3,
  HardDrive,
  Layers,
  ListFilter,
  Pause,
  PawPrint,
  Plane,
  Play,
  Radar,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShipWheel,
  Sparkles,
  Tag,
  Target,
  Timer,
  Waves,
  Zap,
  X,
} from "lucide-react"
import {
  SINE_CLASS_FAMILIES,
  SINE_DEFAULT_ANALYSIS_WINDOW_SEC,
  SINE_EVIDENCE_CONTRACT,
  SINE_MODEL_FAMILY_TARGETS,
  SINE_REQUEST_CONTRACT,
  SINE_SOUND_TARGETS,
  SINE_TARGET_DOMAINS,
  SINE_VISUALISATION_QUALITY,
} from "@/lib/mindex/sine-contract"

interface BlobItem {
  id: string
  analysis_id?: string | null
  remote_id?: string | null
  file_id?: string | null
  blob_id?: string | null
  uuid?: string | null
  name?: string | null
  title?: string | null
  description?: string | null
  label_primary?: string | null
  label_secondary?: string | null
  acoustic_environment?: string | null
  source_id?: string | null
  source_name?: string | null
  source_url?: string | null
  filename?: string | null
  relative_path?: string | null
  stream_url?: string | null
  size_bytes?: number | null
  sample_rate_hz?: number | null
  channels?: number | null
  mime_type?: string | null
  codec?: string | null
  license?: string | null
  duration_sec?: number | null
  recording_group?: string | null
  sensor_type?: string | null
  modified_at?: string | null
  wave_annotations?: unknown[] | null
  human_identifications?: unknown[] | null
  latest_human_identification?: unknown
}

interface DetectionEvent {
  detector_id: string
  label: string
  confidence?: number | null
  start_sec?: number | null
  end_sec?: number | null
  peak_sec?: number | null
  frequency_hz?: number | null
  frequency_min_hz?: number | null
  frequency_max_hz?: number | null
  category?: string | null
  acoustic_domain?: string | null
  event_family?: string | null
  event_type?: string | null
  engine?: string | null
  method?: string | null
  model?: string | null
  model_version?: string | null
  metadata?: Record<string, unknown> | null
}

interface SoundTranscript {
  start_sec: number
  end_sec: number
  label: string
  description?: string | null
  sound_source?: string | null
  confidence?: number | null
  frequency_range?: string | null
  transcript_source?: "backend" | "detector"
  detector_id?: string | null
  event_family?: string | null
  method?: string | null
  evidence_ids?: string[]
  fusion_evidence_ids?: string[]
  model_output_ids?: string[]
  detector_event_ids?: string[]
  prototype_ids?: string[]
  evidence_summary?: string | null
}

interface DeepSignalMatch {
  label: string
  score?: number | null
  source?: string | null
  segment_start?: number | null
  segment_end?: number | null
  category?: string | null
  prototype_id?: string | null
  embedding_id?: string | null
  model?: string | null
  model_id?: string | null
  embedding_dim?: number | null
  vector_checksum?: string | null
  distance?: number | null
  evidence_proven?: boolean
}

interface PrototypeNeighbor {
  id: string
  label: string
  score?: number | null
  source?: string | null
  segment_start?: number | null
  segment_end?: number | null
  category?: string | null
  prototype_id?: string | null
  embedding_id?: string | null
  model?: string | null
  model_id?: string | null
  embedding_dim?: number | null
  vector_checksum?: string | null
  distance?: number | null
  detail?: string | null
  evidence_kind: "deep_signal" | "fusion"
  evidence_proven: boolean
}

interface ModelOutputLabel {
  label: string
  score?: number | null
  category?: string | null
}

interface SineModelOutput {
  id?: string | null
  model_id?: string | null
  model_name?: string | null
  model_version?: string | null
  framework?: string | null
  runtime?: string | null
  status?: string | null
  artifact_uri?: string | null
  model_checksum?: string | null
  label_map_uri?: string | null
  label_map_checksum?: string | null
  label_count?: number | null
  domain_heads: string[]
  target_domains: string[]
  class_families: string[]
  metrics_uri?: string | null
  training_dataset?: string | null
  input_sample_rate_hz?: number | null
  window_samples?: number | null
  embedding_dim?: number | null
  device?: string | null
  backend_commit?: string | null
  job_id?: string | null
  inference_id?: string | null
  start_sec?: number | null
  end_sec?: number | null
  ood_score?: number | null
  ood_status?: string | null
  ood_threshold?: number | null
  min_confidence?: number | null
  confidence_margin?: number | null
  entropy?: number | null
  normalized_entropy?: number | null
  latency_ms?: number | null
  top_labels: ModelOutputLabel[]
  feature_params?: Record<string, unknown> | null
}

interface FusionEvidence {
  id?: string | null
  kind: string
  label?: string | null
  event_family?: string | null
  event_type?: string | null
  model?: string | null
  weight?: number | null
  score?: number | null
  event_id?: string | null
  prototype_id?: string | null
  model_id?: string | null
  model_output_id?: string | null
  detector_event_id?: string | null
  vector_checksum?: string | null
  detail?: string | null
}

interface Visualisation {
  visualisation_status?: string
  status?: string
  duration_sec?: number
  sample_rate_hz?: number
  channels?: number
  fft_size?: number
  n_fft?: number
  hop_length?: number
  window_function?: string
  window?: string
  frequency_min_hz?: number
  frequency_max_hz?: number
  db_floor?: number
  db_ceiling?: number
  normalization?: string
  colormap_hint?: string
  clamp?: Record<string, unknown>
  peaks?: {
    time_sec?: number
    frequency_hz?: number
    magnitude_db?: number
    prominence?: number
    source?: string | null
  }[]
  waveform?: {
    times?: number[]
    amplitudes?: number[]
    min?: number[]
    max?: number[]
    rms?: number[]
  }
  spectrogram?: {
    times?: number[]
    frequencies?: number[]
    power_db?: number[][]
  }
}

interface IdentificationSummary {
  top_label?: string | null
  label?: string | null
  category?: string | null
  type?: string | null
  confidence?: number | null
  ood_score?: number | null
  ood_status?: string | null
  status?: string | null
  engine?: string | null
  model?: string | null
  dominant_frequency_hz?: number | null
  detector_counts?: Record<string, number>
  detector_status?: Record<string, string>
}

type AnalysisPayload = Record<string, unknown> & {
  status?: string
  model_status?: string
  summary?: Record<string, unknown>
  events?: unknown[]
  detector_events?: unknown[]
  visualisation?: Visualisation
  classification?: Record<string, unknown>
  identification_summary?: IdentificationSummary
  model_context?: Record<string, unknown>
  frequency_detections?: unknown[]
  activity_segments?: unknown[]
  animal_detections?: unknown[]
  insect_detections?: unknown[]
  air_propeller_detections?: unknown[]
  water_propeller_detections?: unknown[]
  vessel_detections?: unknown[]
  impulse_detections?: unknown[]
  weather_detections?: unknown[]
  ground_seismic_detections?: unknown[]
  mechanical_detections?: unknown[]
  geophysical_detections?: unknown[]
  unknown_pattern_detections?: unknown[]
  bird_detections?: unknown[]
  uav_detections?: unknown[]
  nps_detections?: unknown[]
  deep_signal_matches?: unknown[]
  model_outputs?: unknown[]
  fusion_evidence?: unknown[]
  sound_transcripts?: unknown[]
  diagnostics?: Record<string, unknown>
}

interface LibraryCategory {
  id: string
  label: string
  count?: number
  bytes?: number
}

interface LibraryCatalogResponse {
  blobs?: BlobItem[]
  items?: BlobItem[]
  categories?: LibraryCategory[]
  total_files?: number
  total?: number
  total_bytes?: number
  root_status?: string
  message?: string
  storage?: {
    available?: boolean
    remote_nas?: boolean
    mount_point?: string
    library_acoustic?: string
    total_gb?: number
    used_gb?: number
    free_gb?: number
  }
  sine?: {
    status?: string
    acoustic_blobs?: number
    detectors_registered?: number
    default_detectors?: string[]
  }
}

type SineStatusPayload = Record<string, unknown> & {
  ok?: boolean
  status?: string
  state?: string
  service_status?: string
  model_status?: string
  model_ready?: boolean
  model_loaded?: boolean
  models_loaded?: number
  registered_models?: number
  loaded_models?: number
  runtime_backends?: Record<string, unknown>
  runtime_supported?: boolean
  inference_ready?: boolean
  prototype_catalog_ready?: boolean
  blocking_reasons?: unknown
  detectors?: unknown
  default_detectors?: unknown
  registered_detectors?: unknown
  detector_status?: unknown
  models?: unknown
  model?: unknown
  active_model?: unknown
  model_registry?: unknown
  model_id?: string | null
  model_name?: string | null
  model_version?: string | null
  framework?: string | null
  runtime?: string | null
  artifact_uri?: string | null
  artifact_path?: string | null
  model_checksum?: string | null
  checksum?: string | null
  device?: string | null
  backend_commit?: string | null
  last_successful_inference_at?: string | null
  last_inference_at?: string | null
}

type SineModelsPayload = Record<string, unknown> & {
  models?: unknown
  items?: unknown
  rows?: unknown
  registered_models?: unknown
  active_model?: unknown
  model?: unknown
}

interface SinePrototypeCatalogEntry {
  id: string
  label: string
  domain?: string | null
  category?: string | null
  source?: string | null
  model_id?: string | null
  embedding_dim?: number | null
  vector_checksum?: string | null
  prototype_count?: number | null
  license?: string | null
  updated_at?: string | null
}

type SinePrototypesPayload = Record<string, unknown> & {
  prototypes?: unknown
  items?: unknown
  rows?: unknown
  prototype_catalog?: unknown
  catalog?: unknown
}

type SineTrainingTagsPayload = Record<string, unknown> & {
  human_identifications?: unknown
  human_tags?: unknown
  training_tags?: unknown
  items?: unknown
  rows?: unknown
  total?: unknown
  total_count?: unknown
  count?: unknown
}

type EnvironmentFilter = "all" | "water" | "air" | "ground" | "short"
type FileReadinessFilter = "all" | "analysis-ready" | "playback-only"
type EventFamilyFilter = "all" | "frequency" | "activity" | "animal" | "propeller" | "impulse" | "ground" | "mechanical" | "pattern"
type VisualMode = "overlay" | "spectrogram" | "waveform" | "spectrum" | "waterfall"
type SpectrogramPalette = "marine" | "oscilloscope" | "plasma" | "thermal"
type TriggerEdge = "rising" | "falling" | "both"
type TriggerMode = "auto" | "single" | "normal"
type ScopeSource = "none" | "mindex-backend" | "analysis-payload" | "browser-real-audio" | "unavailable"

type HumanIdMessage = {
  kind: "success" | "error"
  text: string
}

type WaveAnnotationMessage = HumanIdMessage

interface WaveMarker {
  id: string
  time_sec: number
  label: string
  saved?: boolean
}

interface WaveAnnotationRecord {
  id?: string | null
  selection?: {
    start_sec?: number | null
    end_sec?: number | null
    loop_enabled?: boolean | null
    reverse_enabled?: boolean | null
    playback_rate?: number | null
  } | null
  zoom?: {
    start_sec?: number | null
    end_sec?: number | null
  } | null
  markers?: WaveMarker[]
  loop_enabled?: boolean | null
  reverse_enabled?: boolean | null
  playback_rate?: number | null
  scope?: Record<string, unknown> | null
  created_at?: string | null
}

interface HumanIdentificationRecord {
  id?: string | null
  human_label?: string | null
  human_category?: string | null
  human_confidence?: number | null
  human_notes?: string | null
  disputes_model?: boolean | null
  model_top_label?: string | null
  model_confidence?: number | null
  review_status?: string | null
  event_context?: Record<string, unknown> | null
  file_context?: Record<string, unknown> | null
  created_at?: string | null
}

interface ScopeOptions {
  visualMode: VisualMode
  showGrid: boolean
  showPeakMarkers: boolean
  showEventLanes: boolean
  showBandGuides: boolean
  showPersistence: boolean
  showWaveformEnvelope: boolean
  showWaveformTrace: boolean
  showWaveformPeak: boolean
  palette: SpectrogramPalette
  waveformGain: number
  waveformHeight: number
  spectrogramContrast: number
  spectrogramOpacity: number
  frequencyMinHz: number
  frequencyMaxHz: number
  triggerLevel: number
  triggerEdge: TriggerEdge
  triggerMode: TriggerMode
  laneRows: number
}

interface ScopeBandMeasurement {
  label: string
  minHz: number
  maxHz: number
  avgDb: number | null
  share: number
}

interface ScopeSpectralPeak {
  rank: number
  frequencyHz: number
  avgDb: number
  relativeDb: number
  bandLabel: string
}

interface ScopeMeasurementSummary {
  hasData: boolean
  avgDb: number | null
  minDb: number | null
  maxDb: number | null
  centroidHz: number | null
  cellCount: number
  bands: ScopeBandMeasurement[]
  peaks: ScopeSpectralPeak[]
}

interface AcousticFingerprintRow extends ScopeBandMeasurement {
  normalized: number
  peakCount: number
}

interface AnalysisWindow {
  start: number
  end: number
  source: string
  truncated: boolean
}

const CATALOG_LIMIT = 36
const INITIAL_VISIBLE_COUNT = 36
const EMBEDDED_CATALOG_LIMIT = 36
const COMPACT_CATALOG_LIMIT = 80
const IMMEDIATE_ANALYSIS_MAX_BYTES = 25 * 1024 * 1024
const SHORT_CLIP_QUERY = "esc"
const CATALOG_REQUEST_TIMEOUT_MS = 75_000
const VISUALISATION_REQUEST_TIMEOUT_MS = 60_000
const SINE_STATUS_REQUEST_TIMEOUT_MS = 20_000
const VISUALISATION_WINDOW_MAX_SEC = SINE_DEFAULT_ANALYSIS_WINDOW_SEC
const VISUALISATION_WAVEFORM_POINTS = SINE_VISUALISATION_QUALITY.max_waveform_points
const VISUALISATION_SPECTROGRAM_COLUMNS = SINE_VISUALISATION_QUALITY.max_time_frames
const VISUALISATION_SPECTROGRAM_ROWS = SINE_VISUALISATION_QUALITY.max_frequency_bins
const VISUALISATION_N_FFT = SINE_VISUALISATION_QUALITY.fft_size
const VISUALISATION_HOP_LENGTH = SINE_VISUALISATION_QUALITY.hop_length
const ANALYSIS_POLL_INTERVAL_MS = 3_500
const ANALYSIS_POLL_MAX_ATTEMPTS = 30
const ANALYSIS_WINDOW_MAX_SEC = SINE_DEFAULT_ANALYSIS_WINDOW_SEC
const CLIENT_SCOPE_WAVEFORM_POINTS = 8192
const CLIENT_SCOPE_SPECTROGRAM_COLUMNS = 1024
const CLIENT_SCOPE_SPECTROGRAM_ROWS = 256
const TIME_DIVISION_PRESETS = [
  { label: "10 ms", value: 0.01 },
  { label: "100 ms", value: 0.1 },
  { label: "1 s", value: 1 },
  { label: "5 s", value: 5 },
  { label: "10 s", value: 10 },
  { label: "1 min", value: 60 },
]
const FREQUENCY_DIVISION_PRESETS = [
  { label: "25 Hz", value: 25 },
  { label: "100 Hz", value: 100 },
  { label: "500 Hz", value: 500 },
  { label: "1 kHz", value: 1000 },
  { label: "2 kHz", value: 2000 },
  { label: "5 kHz", value: 5000 },
]
const CLIENT_SCOPE_FFT_SIZE = 2048
const CLIENT_SCOPE_MAX_SECONDS = SINE_DEFAULT_ANALYSIS_WINDOW_SEC

const acousticBandGuides = [
  { label: "Ground / seismic", minHz: 0, maxHz: 20, color: "rgba(168, 85, 247, 0.18)" },
  { label: "Rumble / engines", minHz: 20, maxHz: 200, color: "rgba(14, 165, 233, 0.16)" },
  { label: "Calls / voice band", minHz: 200, maxHz: 1000, color: "rgba(34, 197, 94, 0.14)" },
  { label: "Animal / machine detail", minHz: 1000, maxHz: 8000, color: "rgba(251, 191, 36, 0.12)" },
  { label: "High insect / ultrasonic edge", minHz: 8000, maxHz: 24000, color: "rgba(244, 114, 182, 0.12)" },
]

function drawAcousticReferenceStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  frequencyMinHz: number,
  frequencyMaxHz: number,
) {
  const frequencySpanHz = Math.max(1, frequencyMaxHz - frequencyMinHz)
  const stripHeight = 18
  ctx.save()
  ctx.fillStyle = "rgba(2, 6, 23, 0.72)"
  ctx.fillRect(x, y, width, stripHeight)
  ctx.strokeStyle = "rgba(103, 232, 249, 0.22)"
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, stripHeight - 1)

  acousticBandGuides.forEach((band) => {
    const start = Math.max(frequencyMinHz, band.minHz)
    const end = Math.min(frequencyMaxHz, band.maxHz)
    if (end <= start) return
    const bandX = x + ((start - frequencyMinHz) / frequencySpanHz) * width
    const bandWidth = Math.max(1, ((end - start) / frequencySpanHz) * width)
    ctx.fillStyle = band.color.replace(/0\.\d+\)/, "0.28)")
    ctx.fillRect(bandX, y + 2, bandWidth, stripHeight - 4)
    if (bandWidth > 72) {
      ctx.fillStyle = "rgba(226, 232, 240, 0.74)"
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "left"
      ctx.fillText(band.label, bandX + 5, y + 12)
    }
  })

  ctx.fillStyle = "rgba(103, 232, 249, 0.82)"
  ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.textAlign = "left"
  ctx.fillText(formatHz(frequencyMinHz), x + 5, y + stripHeight - 4)
  ctx.textAlign = "right"
  ctx.fillText(formatHz(frequencyMaxHz), x + width - 5, y + stripHeight - 4)
  ctx.restore()
}

const sineArchitectureBlueprint = [
  {
    id: "decode",
    layer: "L1 physics DSP",
    label: "Decoder",
    tensor: "audio -> mono float32",
    detail: "Sample rate, channels, and visible waveform window.",
  },
  {
    id: "frontend",
    layer: "L1 physics DSP",
    label: "SINEFrontendV1",
    tensor: "log-mel + PCEN + MFCC deltas",
    detail: "Physics features and adaptive spectrogram channels.",
  },
  {
    id: "trunk",
    layer: "L2 deep embed",
    label: "ResNetish trunk",
    tensor: "2D spectrogram texture maps",
    detail: "Convolutional sound texture recognition.",
  },
  {
    id: "temporal",
    layer: "L2 deep embed",
    label: "CRNN / GRU",
    tensor: "ordered event sequence",
    detail: "Tracks whales, insects, rotor cycles, impulses, and ground pulses.",
  },
  {
    id: "attention",
    layer: "L2 deep embed",
    label: "Attention pooling",
    tensor: "time weights -> pooled vector",
    detail: "Concentrates model attention on active acoustic windows instead of background noise.",
  },
  {
    id: "projection",
    layer: "L2 deep embed",
    label: "512D projection",
    tensor: "normalized acoustic embedding",
    detail: "Prototype matching and out-of-domain distance.",
  },
  {
    id: "heads",
    layer: "L3 semantic heads",
    label: "Semantic heads",
    tensor: "domain logits + OOD score",
    detail: "Environmental, marine, animal, rotor, impulse, and ground heads feed model labels.",
  },
  {
    id: "fusion",
    layer: "L3 semantic heads",
    label: "Evidence fusion",
    tensor: "label + transcript windows",
    detail: "Combines model, detector, prototype, and human review evidence.",
  },
]

const SINE_CLASS_FAMILY_GROUPS = [
  {
    label: "Animal voices",
    families: ["marine_bioacoustics", "terrestrial_bioacoustics", "insect_bioacoustics"],
    examples: "whales, dolphins, birds, mammals, insects",
  },
  {
    label: "Propulsion",
    families: ["air_propeller", "water_propeller", "vessel_engine"],
    examples: "UAVs, aircraft, boats, submerged props",
  },
  {
    label: "Impulse events",
    families: ["weather_lightning", "impulse_explosion"],
    examples: "lightning, blasts, pressure spikes",
  },
  {
    label: "Ground motion",
    families: ["ground_seismic", "geophysical"],
    examples: "soil sound, quakes, surface vibration",
  },
  {
    label: "Machines",
    families: ["mechanical"],
    examples: "motors, actuators, industrial hum",
  },
  {
    label: "Unknown / OOD",
    families: ["unknown_pattern"],
    examples: "novel sounds and contested labels",
  },
]

const SINE_SOUND_TARGET_GROUPS = [
  {
    label: "Marine life",
    domain: "water",
    targets: ["whale_vocalization", "dolphin_clicks_whistles", "fish_chorus", "hydrophone_biologic_unknown"],
    examples: "whales, dolphins, fish choruses, unknown hydrophone biologics",
  },
  {
    label: "Air and land animals",
    domain: "air",
    targets: ["bird_call_song", "mammal_call", "amphibian_call", "insect_stridulation"],
    examples: "birds, mammals, frogs, insects",
  },
  {
    label: "Soil bioacoustics",
    domain: "ground",
    targets: ["soil_bioacoustics"],
    examples: "soil movement, root zone sound, underground living activity",
  },
  {
    label: "Air propulsion",
    domain: "air",
    targets: ["uav_quadcopter_rotor", "helicopter_rotor", "fixed_wing_aircraft", "air_drone_propeller"],
    examples: "quadcopters, helicopters, aircraft, drone props",
  },
  {
    label: "Water propulsion",
    domain: "water",
    targets: ["boat_propeller", "submerged_propeller", "vessel_engine_hum", "submarine_mechanical_hum", "sonar_ping"],
    examples: "boats, cavitation, vessels, submarine hums, sonar",
  },
  {
    label: "Machines and actuators",
    domain: "air",
    targets: ["machinery_motor", "actuator_servo_stepper"],
    examples: "motors, servos, steppers, robot actuators",
  },
  {
    label: "Impulse and weather",
    domain: "air",
    targets: ["explosion_impulse", "gunshot_or_blast", "impact_pressure_spike", "lightning_thunder", "rain_wind_weather", "water_pressure_impulse"],
    examples: "explosions, blasts, impacts, lightning, rain, pressure pulses",
  },
  {
    label: "Ground and seismic",
    domain: "ground",
    targets: ["earthquake_seismic", "ground_surface_vibration", "underground_soil_motion"],
    examples: "earthquakes, surface vibration, underground motion",
  },
  {
    label: "Unknown and review",
    domain: "all",
    targets: ["unknown_out_of_domain", "human_contested_label"],
    examples: "out-of-domain sounds and human-contested labels",
  },
]

const SINE_MODEL_TARGET_GROUPS = [
  { label: "DSP", targets: ["deterministic_dsp"] },
  { label: "CNN", targets: ["log_mel_resnetish"] },
  { label: "Temporal", targets: ["crnn_gru_temporal"] },
  { label: "Transformer", targets: ["audio_spectrogram_transformer"] },
  { label: "Embedding", targets: ["contrastive_embedding", "prototype_cosine_retrieval"] },
  { label: "Fusion", targets: ["evidence_fusion", "sound_transcript_windows"] },
]

const SINE_BACKEND_BUILD_RECIPE = [
  {
    id: "l1_dsp",
    label: "L1 deterministic DSP",
    objective: "Decode real NAS audio into canonical analysis windows.",
    fieldUse: "Makes Psathyrella buoy, hydrophone, and field recordings inspectable before any model claims meaning.",
    proves: ["container decode", "STFT / PCEN / log-mel", "centroid, ZCR, RMS envelope"],
    references: ["Fungi Compute oscilloscope", "Arduino frequency detection", "auditok activity"],
    endpoints: "visualisation + detector events",
    architectureIds: ["decode", "frontend"],
    modelTargets: ["DSP"],
  },
  {
    id: "l2_embedding",
    label: "L2 acoustic embedding",
    objective: "Turn sound windows into a comparable neural embedding.",
    fieldUse: "Gives whales, insects, rotors, lightning, and seismic events a reusable acoustic fingerprint.",
    proves: ["CNN / ResNetish or AST trunk", "CRNN / GRU timing", "attention pooling", "512D projection"],
    references: ["sound-clf-pytorch", "CRNN audio classification", "MAX Audio embedding flow"],
    endpoints: "model outputs + embedding provenance",
    architectureIds: ["trunk", "temporal", "attention", "projection"],
    modelTargets: ["CNN", "Temporal", "Transformer", "Embedding"],
  },
  {
    id: "l3_semantic_heads",
    label: "L3 sound meaning heads",
    objective: "Separate water, air, and ground events into animal, machine, impulse, seismic, and unknown families.",
    fieldUse: "Turns model evidence into domain labels without shrinking SINE to only birds and UAVs.",
    proves: ["domain heads", "OOD score", "label-map checksum", "training metrics"],
    references: ["ESC-50 P0", "UrbanSound-style metrics", "OVH marine windows"],
    endpoints: "model outputs with top labels",
    architectureIds: ["heads"],
    modelTargets: ["CNN", "Temporal", "Transformer"],
  },
  {
    id: "prototype_retrieval",
    label: "Prototype retrieval",
    objective: "Compare embeddings to known acoustic fingerprints before claiming meaning.",
    fieldUse: "Lets rare field sounds match a verified prototype bank instead of forcing closed-set guesses.",
    proves: ["prototype catalog", "cosine neighbors", "vector checksum", "source/license"],
    references: ["NPS acoustic discovery", "deep-signal concept", "512D MINDEX prototype bank"],
    endpoints: "prototype matches + deep signal matches",
    architectureIds: ["projection"],
    modelTargets: ["Embedding"],
  },
  {
    id: "evidence_fusion",
    label: "Evidence fusion + transcript",
    objective: "Merge DSP, model, prototypes, and human review into chronological sound transcript windows.",
    fieldUse: "Builds the traceable sound story MYCA can explain, while preserving contested human corrections.",
    proves: ["fusion evidence", "sound transcripts", "window evidence IDs", "human tag queue"],
    references: ["human correction tables", "sound transcript evidence IDs", "MYCA evidence-only readout"],
    endpoints: "fusion evidence + sound transcripts",
    architectureIds: ["fusion"],
    modelTargets: ["Fusion"],
  },
]

const humanCategoryOptions = [
  ["weather", "Weather / impulse"],
  ["marine_bioacoustics", "Marine life"],
  ["terrestrial_bioacoustics", "Terrestrial life"],
  ["insect_bioacoustics", "Insects"],
  ["vessel", "Vessel / propeller"],
  ["water_propeller", "Water propeller"],
  ["air_propeller", "Air propeller"],
  ["uav", "UAV / aircraft"],
  ["impulse_explosion", "Explosion / impulse"],
  ["weather_lightning", "Lightning / thunder"],
  ["seismic_ground", "Ground / seismic"],
  ["mechanical", "Mechanical"],
  ["geophysical", "Geophysical"],
  ["unknown", "Other / unknown"],
]

const eventFamilyOptions: [EventFamilyFilter, string][] = [
  ["all", "All events"],
  ["frequency", "Frequency"],
  ["activity", "Activity"],
  ["animal", "Animal"],
  ["propeller", "Propellers"],
  ["impulse", "Impulse"],
  ["ground", "Ground"],
  ["mechanical", "Mechanical"],
  ["pattern", "Pattern"],
]

const eventFamilyTerms: Record<Exclude<EventFamilyFilter, "all">, string[]> = {
  frequency: ["frequency", "fft", "peak", "hz", "centroid"],
  activity: ["activity", "segment", "auditok", "active"],
  animal: ["bird", "animal", "whale", "dolphin", "seal", "bat", "frog", "insect", "bioacoustic", "bioacoustics"],
  propeller: ["uav", "drone", "rotor", "propeller", "vessel", "boat", "ship", "submarine", "thruster", "aircraft", "helicopter"],
  impulse: ["explosion", "blast", "detonation", "impulse", "shock", "gunshot", "lightning", "thunder", "pressure wave"],
  ground: ["ground", "soil", "seismic", "earthquake", "geophone", "underground", "tremor", "surface vibration"],
  mechanical: ["mechanical", "engine", "motor", "servo", "actuator", "bearing", "pump", "industrial", "machine", "generator"],
  pattern: ["pattern", "prototype", "embedding", "deep signal", "deep_signal", "match", "nps"],
}

const detectorLabels: Record<string, string> = {
  frequency_fft: "Frequency",
  activity_auditok: "Activity",
  bird_microsoft: "Animal / bird",
  uav_rotor: "Air rotor",
  animal_life: "Animal life",
  insect: "Insects",
  air_propeller: "Air propellers",
  water_propeller: "Water propellers",
  vessel_engine: "Vessel engines",
  impulse_explosion: "Impulse / explosions",
  weather_lightning: "Weather / lightning",
  ground_seismic: "Ground / seismic",
  mechanical: "Mechanical",
  geophysical: "Geophysical",
  unknown_pattern: "Unknown pattern",
  nps_discovery_match: "NPS",
  deep_signal_features: "Deep Signal",
  visualisation_sonic: "Visual",
}

const detectorColors: Record<string, string> = {
  frequency_fft: "#22d3ee",
  activity_auditok: "#34d399",
  bird_microsoft: "#fbbf24",
  uav_rotor: "#fb7185",
  animal_life: "#fbbf24",
  insect: "#bef264",
  air_propeller: "#fb7185",
  water_propeller: "#38bdf8",
  vessel_engine: "#22d3ee",
  impulse_explosion: "#f97316",
  weather_lightning: "#facc15",
  ground_seismic: "#a78bfa",
  mechanical: "#94a3b8",
  geophysical: "#c084fc",
  unknown_pattern: "#e5e7eb",
  nps_discovery_match: "#a78bfa",
  deep_signal_features: "#60a5fa",
  sine: "#e5e7eb",
}

const normalizedFamilyLabels: Record<string, string> = {
  frequency_peak: "Frequency peaks",
  activity_segment: "Activity segments",
  animal_life: "Animal life",
  insect: "Insects",
  air_propeller: "Air propellers",
  water_propeller: "Water propellers",
  vessel_engine: "Vessel engines",
  impulse_explosion: "Impulse / explosions",
  weather_lightning: "Weather / lightning",
  ground_seismic: "Ground / seismic",
  earthquake_seismic: "Ground / seismic",
  mechanical: "Mechanical",
  geophysical: "Geophysical",
  prototype_match: "Prototype matches",
  unknown_pattern: "Unknown pattern",
}

const normalizedFamilyColors: Record<string, string> = {
  frequency_peak: "#22d3ee",
  activity_segment: "#34d399",
  animal_life: "#fbbf24",
  insect: "#bef264",
  air_propeller: "#fb7185",
  water_propeller: "#38bdf8",
  vessel_engine: "#22d3ee",
  impulse_explosion: "#f97316",
  weather_lightning: "#facc15",
  ground_seismic: "#a78bfa",
  earthquake_seismic: "#a78bfa",
  mechanical: "#94a3b8",
  geophysical: "#c084fc",
  prototype_match: "#60a5fa",
  unknown_pattern: "#e5e7eb",
}

const detectorFamilyFallbacks: Record<string, string> = {
  frequency_fft: "frequency_peak",
  activity_auditok: "activity_segment",
  bird_microsoft: "animal_life",
  uav_rotor: "air_propeller",
  nps_discovery_match: "prototype_match",
  deep_signal_features: "prototype_match",
  visualisation_sonic: "frequency_peak",
}

const groupedEventSources: { key: string; detector: string; family: string }[] = [
  { key: "frequency_detections", detector: "frequency_fft", family: "frequency_peak" },
  { key: "activity_segments", detector: "activity_auditok", family: "activity_segment" },
  { key: "animal_detections", detector: "animal_life", family: "animal_life" },
  { key: "insect_detections", detector: "insect", family: "insect" },
  { key: "air_propeller_detections", detector: "air_propeller", family: "air_propeller" },
  { key: "water_propeller_detections", detector: "water_propeller", family: "water_propeller" },
  { key: "vessel_detections", detector: "vessel_engine", family: "vessel_engine" },
  { key: "impulse_detections", detector: "impulse_explosion", family: "impulse_explosion" },
  { key: "weather_detections", detector: "weather_lightning", family: "weather_lightning" },
  { key: "ground_seismic_detections", detector: "ground_seismic", family: "ground_seismic" },
  { key: "mechanical_detections", detector: "mechanical", family: "mechanical" },
  { key: "geophysical_detections", detector: "geophysical", family: "geophysical" },
  { key: "unknown_pattern_detections", detector: "unknown_pattern", family: "unknown_pattern" },
  { key: "bird_detections", detector: "bird_microsoft", family: "animal_life" },
  { key: "uav_detections", detector: "uav_rotor", family: "air_propeller" },
  { key: "nps_detections", detector: "nps_discovery_match", family: "prototype_match" },
  { key: "deep_signal_matches", detector: "deep_signal_features", family: "prototype_match" },
]

const detectorLayerMeta = {
  physics: {
    label: "L1 Physics DSP",
    description: "FFT peaks, activity gates, waveform and spectrogram extraction.",
  },
  representation: {
    label: "L2 Deep / prototype",
    description: "Embeddings, profile matching, and prototype similarity.",
  },
  semantic: {
    label: "L3 Semantic heads",
    description: "Animal, vehicle, impulse, weather, and domain-specific labels.",
  },
  other: {
    label: "Other detectors",
    description: "Registered detectors outside the current SINE layer map.",
  },
} as const

type DetectorLayer = keyof typeof detectorLayerMeta

const detectorLayerOrder: DetectorLayer[] = ["physics", "representation", "semantic", "other"]

function finiteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(numeric) ? numeric : null
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function collectProvenanceStrings(value: unknown, accumulator: string[] = [], depth = 0): string[] {
  if (accumulator.length >= 240 || depth > 5 || value == null) return accumulator
  if (typeof value === "string") {
    if (value.trim()) accumulator.push(value.trim().toLowerCase())
    return accumulator
  }
  if (typeof value !== "object") return accumulator
  if (Array.isArray(value)) {
    value.slice(0, 80).forEach((item) => collectProvenanceStrings(item, accumulator, depth + 1))
    return accumulator
  }
  Object.values(value as Record<string, unknown>)
    .slice(0, 120)
    .forEach((item) => {
      collectProvenanceStrings(item, accumulator, depth + 1)
    })
  return accumulator
}

const weakEvidenceTerms = [
  "mock",
  "synthetic",
  "synthesized",
  "generated",
  "placeholder",
  "plausible",
  "filename-derived",
  "file name-derived",
  "metadata-derived",
  "gemini",
  "googlegenai",
  "ai studio",
  "aistudio",
  "heuristic fallback",
]

const openSetReviewStatuses = new Set([
  "low_confidence",
  "low confidence",
  "out_of_domain",
  "out of domain",
  "out_of_domain_candidate",
  "out of domain candidate",
  "ood",
  "ood_candidate",
  "unknown",
  "unknown_pattern",
  "review",
  "needs_review",
  "queued_review",
])

function rowContainsWeakEvidenceMarker(row: Record<string, unknown>) {
  const text = collectProvenanceStrings(row).join(" ")
  return weakEvidenceTerms.some((term) => text.includes(term))
}

function normalizedOpenSetStatus(value: unknown) {
  const status = stringValue(value)?.toLowerCase().trim()
  return status ? status.replace(/[-\s]+/g, "_") : ""
}

function rowHasOpenSetReviewStatus(row: Record<string, unknown>) {
  const statusCandidates = [
    row.ood_status,
    row.open_set_status,
    row.out_of_domain_status,
    row.identification_status,
    row.status,
    row.state,
    row.review_status,
  ]
  return statusCandidates.some((value) => {
    const normalized = normalizedOpenSetStatus(value)
    return Boolean(normalized && (openSetReviewStatuses.has(normalized) || openSetReviewStatuses.has(normalized.replace(/_/g, " "))))
  })
}

function rowHasOpenSetMetricFailure(row: Record<string, unknown>) {
  const oodScore = finiteNumber(row.ood_score ?? row.out_of_domain_score)
  const oodThreshold = finiteNumber(row.ood_threshold ?? row.out_of_domain_threshold)
  const confidence = finiteNumber(row.confidence ?? row.score ?? row.probability)
  const minConfidence = finiteNumber(row.min_confidence ?? row.minimum_confidence)
  return Boolean(
    (oodScore != null && oodThreshold != null && oodScore >= oodThreshold) ||
      (confidence != null && minConfidence != null && confidence < minConfidence),
  )
}

function modelOutputRowIsOpenSetReview(row: Record<string, unknown>) {
  return rowHasOpenSetReviewStatus(row) || rowHasOpenSetMetricFailure(row)
}

function rowHasPrototypeIdentity(row: Record<string, unknown>) {
  return Boolean(
    stringValue(
      row.prototype_id ??
        row.prototypeId ??
        row.prototype_match_id ??
        row.prototype_embedding_id ??
        row.matched_prototype_id ??
        row.nearest_prototype_id ??
        row.catalog_id ??
        row.registry_id ??
        row.prototype_key ??
        row.fingerprint_id ??
        row.signature_id ??
        row.embedding_id ??
        row.vector_id ??
        row.centroid_id,
    ) ||
      stringValue(
        row.vector_checksum ??
          row.vector_sha256 ??
          row.embedding_checksum ??
          row.embedding_sha256 ??
          row.centroid_sha256 ??
          row.prototype_sha256 ??
          row.prototype_checksum ??
          row.fingerprint_sha256 ??
          row.fingerprint_checksum ??
          row.sha256 ??
          row.checksum,
      ),
  )
}

function rowHasScoreOrDistance(row: Record<string, unknown>) {
  return (
    finiteNumber(row.score ?? row.confidence ?? row.similarity ?? row.probability ?? row.weight) != null ||
    finiteNumber(row.distance ?? row.embedding_distance ?? row.cosine_distance ?? row.ood_score) != null
  )
}

function rowHasSemanticClaim(row: Record<string, unknown>) {
  return Boolean(
    stringValue(
      row.top_label ??
        row.label ??
        row.class_label ??
        row.class_name ??
        row.predicted_label ??
        row.event_type ??
        row.event_family ??
        row.category ??
        row.type ??
        row.sound_source ??
        row.description,
    ),
  )
}

function deepSignalRowHasProvenance(row: Record<string, unknown>) {
  if (rowContainsWeakEvidenceMarker(row)) return false
  const source = stringValue(row.source ?? row.source_name ?? row.source_dataset ?? row.dataset ?? row.training_dataset ?? row.corpus ?? row.archive)
  const model = stringValue(row.model_id ?? row.embedding_model_id ?? row.embedding_model ?? row.model_name ?? row.model ?? row.engine ?? row.runtime)
  const embeddingDim = finiteNumber(row.embedding_dim ?? row.embedding_dimension ?? row.vector_dim ?? row.dimensions)
  const checksum = stringValue(
    row.vector_checksum ??
      row.vector_sha256 ??
      row.embedding_checksum ??
      row.embedding_sha256 ??
      row.centroid_sha256 ??
      row.prototype_sha256 ??
      row.prototype_checksum ??
      row.fingerprint_sha256 ??
      row.fingerprint_checksum ??
      row.sha256 ??
      row.checksum,
  )
  const hasSourceOrModelProof = Boolean(source || model || checksum || embeddingDim)
  return rowHasScoreOrDistance(row) && rowHasPrototypeIdentity(row) && hasSourceOrModelProof
}

function fusionEvidenceRowHasModelOrPrototypeProof(row: Record<string, unknown>) {
  if (rowContainsWeakEvidenceMarker(row)) return false
  const modelProof = Boolean(stringValue(row.model_id ?? row.model_output_id ?? row.model ?? row.model_name ?? row.model_version))
  const prototypeProof = rowHasPrototypeIdentity(row)
  const semanticLabel = Boolean(stringValue(row.label ?? row.event_type ?? row.event_family ?? row.category ?? row.type))
  return semanticLabel && rowHasScoreOrDistance(row) && (modelProof || prototypeProof)
}

function modelOutputRowHasProvenance(row: Record<string, unknown>) {
  if (rowContainsWeakEvidenceMarker(row)) return false
  const topLabels = normalizeModelOutputLabels(row.top_labels ?? row.labels ?? row.predictions ?? row)
  const identity = stringValue(row.model_id ?? row.registry_id ?? row.artifact_id ?? row.checkpoint_id ?? row.runtime_id ?? row.model_name ?? row.model ?? row.name)
  const runtimeProof = Boolean(
    stringValue(
      row.framework ??
        row.inference_framework ??
        row.runtime ??
        row.runtime_name ??
        row.inference_runtime ??
        row.inference_engine ??
        row.artifact_uri ??
        row.artifact_url ??
        row.model_uri ??
        row.artifact_path ??
        row.model_path ??
        row.checkpoint_uri ??
        row.checkpoint_url ??
        row.checkpoint_path ??
        row.export_uri ??
        row.export_path ??
        row.model_checksum ??
        row.artifact_checksum ??
        row.checkpoint_checksum ??
        row.checksum ??
        row.sha256 ??
        row.artifact_sha256 ??
        row.model_artifact_sha256 ??
        row.checkpoint_sha256 ??
        row.label_map_uri ??
        row.label_map_url ??
        row.label_map_path ??
        row.label_map_sha256 ??
        row.label_map_checksum ??
        row.training_dataset ??
        row.training_corpus ??
        row.training_run_id ??
        row.metrics_uri ??
        row.metrics_path ??
        row.dataset,
    ) ||
      finiteNumber(row.label_count ?? row.labels_count ?? row.num_labels ?? row.class_count) != null,
  )
  return Boolean(identity && runtimeProof && topLabels.length)
}

function modelOutputRowHasSemanticClaim(row: Record<string, unknown>) {
  const topLabels = normalizeModelOutputLabels(row.top_labels ?? row.labels ?? row.predictions ?? row)
  return Boolean(topLabels.length || rowHasSemanticClaim(row))
}

function soundTranscriptRowHasEvidenceLinks(row: Record<string, unknown>) {
  if (rowContainsWeakEvidenceMarker(row)) return false
  const modelIds = combinedStringList(
    row.model_output_ids,
    row.model_output_id,
    row.model_outputs,
    row.output_ids,
    row.output_id,
    row.inference_ids,
    row.inference_id,
    row.prediction_ids,
    row.prediction_id,
    row.supporting_model_output_ids,
    row.supporting_model_outputs,
  )
  const fusionIds = combinedStringList(
    row.fusion_evidence_ids,
    row.fusion_evidence_id,
    row.fusion_ids,
    row.fusion_id,
    row.evidence_links,
    row.supporting_fusion_evidence_ids,
    row.supporting_fusion_evidence,
  )
  const prototypeIds = combinedStringList(
    row.prototype_ids,
    row.prototype_id,
    row.prototype_match_ids,
    row.prototype_match_id,
    row.prototype_matches,
    row.fingerprint_ids,
    row.fingerprint_id,
    row.embedding_ids,
    row.embedding_id,
    row.supporting_prototype_ids,
    row.supporting_prototypes,
  )
  return Boolean(modelIds.length || fusionIds.length || prototypeIds.length)
}

function modelOutputHasProvenance(output: SineModelOutput) {
  const status = output.status?.toLowerCase().trim() ?? ""
  if (["unavailable", "model_unavailable", "pending", "not_loaded", "skipped"].includes(status)) return false
  if (!output.top_labels.length) return false
  const identity = Boolean(output.model_id || output.model_name || output.model_version)
  const runtimeProof = Boolean(
    output.framework ||
      output.runtime ||
      output.artifact_uri ||
      output.model_checksum ||
      output.label_map_uri ||
      output.label_map_checksum ||
      output.label_count ||
      output.training_dataset ||
      output.backend_commit,
  )
  return identity && runtimeProof
}

function modelOutputIsOpenSetReview(output: SineModelOutput) {
  const normalizedStatus = normalizedOpenSetStatus(output.ood_status ?? output.status)
  const statusReview = Boolean(
    normalizedStatus && (openSetReviewStatuses.has(normalizedStatus) || openSetReviewStatuses.has(normalizedStatus.replace(/_/g, " "))),
  )
  const scoreReview = Boolean(output.ood_score != null && output.ood_threshold != null && output.ood_score >= output.ood_threshold)
  const confidenceReview = Boolean(
    output.top_labels[0]?.score != null && output.min_confidence != null && output.top_labels[0].score < output.min_confidence,
  )
  return statusReview || scoreReview || confidenceReview
}

function fusionEvidenceHasModelOrPrototypeProof(row: FusionEvidence) {
  const modelProof = Boolean(row.model_id || row.model_output_id || row.model)
  const prototypeProof = Boolean(row.prototype_id || row.vector_checksum)
  const semanticLabel = Boolean(row.label || row.event_type || row.event_family)
  return semanticLabel && (row.score != null || row.weight != null) && (modelProof || prototypeProof)
}

function transcriptHasModelOrPrototypeEvidence(transcript: SoundTranscript) {
  return Boolean(transcript.model_output_ids?.length || transcript.fusion_evidence_ids?.length || transcript.prototype_ids?.length)
}

function extractSineModelContext(...sources: unknown[]) {
  const contextSources: Record<string, unknown>[] = []
  sources.forEach((source) => {
    const record = recordValue(source)
    if (!record) return
    const explicit = recordValue(record.model_context ?? record.modelContext ?? record.runtime_context ?? record.runtimeContext)
    if (explicit) contextSources.push(explicit)
    contextSources.push(record)
    const diagnostics = recordValue(record.diagnostics)
    if (diagnostics) {
      const diagnosticContext = recordValue(diagnostics.model_context ?? diagnostics.modelContext)
      if (diagnosticContext) contextSources.push(diagnosticContext)
      contextSources.push(diagnostics)
    }
    const summary = recordValue(record.summary)
    if (summary) {
      const summaryContext = recordValue(summary.model_context ?? summary.modelContext)
      if (summaryContext) contextSources.push(summaryContext)
      contextSources.push(summary)
    }
  })

  const firstString = (...keys: string[]) => {
    for (const row of contextSources) {
      for (const key of keys) {
        const value = stringValue(row[key])
        if (value) return value
      }
    }
    return null
  }
  const firstBoolean = (...keys: string[]) => {
    for (const row of contextSources) {
      for (const key of keys) {
        const value = booleanValue(row[key])
        if (value != null) return value
      }
    }
    return null
  }
  const firstNumber = (...keys: string[]) => {
    for (const row of contextSources) {
      for (const key of keys) {
        const value = finiteNumber(row[key])
        if (value != null) return value
      }
    }
    return null
  }
  const firstRecord = (...keys: string[]) => {
    for (const row of contextSources) {
      for (const key of keys) {
        const value = recordValue(row[key])
        if (value) return value
      }
    }
    return null
  }
  const blockingReasons = Array.from(
    new Set(
      contextSources
        .flatMap((row) => textListValue(row.blocking_reasons ?? row.blockers ?? row.blockingReasons ?? row.reasons))
        .filter(Boolean),
    ),
  )
  const runtimeBackends = firstRecord("runtime_backends", "runtimeBackends", "backends", "optional_backends") ?? {}
  const modelStatus = firstString("model_status", "modelStatus", "status", "model_state", "modelState")
  const modelReady = firstBoolean("model_ready", "modelReady", "model_loaded", "modelLoaded", "ready", "loaded")
  const runtimeSupported = firstBoolean("runtime_supported", "runtimeSupported")
  const inferenceReady = firstBoolean("inference_ready", "inferenceReady")
  const registryReady = firstBoolean("model_registry_ready", "modelRegistryReady", "registry_ready", "registryReady")
  const prototypeReady = firstBoolean("prototype_catalog_ready", "prototypeCatalogReady", "prototype_ready", "prototypeReady")
  const registeredModels = firstNumber("registered_models", "registeredModels", "model_count", "total_models", "total")
  const loadedModels = firstNumber("loaded_models", "loadedModels", "models_loaded", "loaded_count")

  const hasContext =
    Boolean(modelStatus) ||
    modelReady != null ||
    runtimeSupported != null ||
    inferenceReady != null ||
    registryReady != null ||
    prototypeReady != null ||
    registeredModels != null ||
    loadedModels != null ||
    blockingReasons.length > 0 ||
    Object.keys(runtimeBackends).length > 0

  return hasContext
    ? {
        modelStatus,
        modelReady,
        runtimeSupported,
        inferenceReady,
        registryReady,
        prototypeReady,
        registeredModels,
        loadedModels,
        runtimeBackends,
        blockingReasons,
      }
    : null
}

function analysisProvenanceIssue(payload: AnalysisPayload | null) {
  if (!payload) {
    return {
      status: "pending" as const,
      label: "No analysis payload",
      detail: "Run SINE on a real acoustic file to inspect backend evidence provenance.",
      markers: [] as string[],
    }
  }

  const text = collectProvenanceStrings(payload).join(" ")
  const suspiciousTerms = [
    "gemini",
    "googlegenai",
    "ai studio",
    "aistudio",
    "mock",
    "mockacousticblobs",
    "synthetic",
    "synthesized",
    "generated wav",
    "generated wave",
    "generatewavbuffer",
    "programmatic wav",
    "mathematical wav",
    "customized wave content",
    "filename-derived",
    "file name-derived",
    "metadata-derived",
    "metadata for a recording",
    "construct highly realistic",
    "please construct",
    "realistic detection events",
    "fabricated",
    "plausible events",
    "server-side gemini classifier",
    "dsp heuristic fallback",
    "heuristic fallback",
  ]
  const markers = suspiciousTerms.filter((term) => text.includes(term))
  if (markers.length) {
    return {
      status: "quarantined" as const,
      label: "Prototype evidence quarantined",
      detail: `Payload contains ${markers.slice(0, 3).join(", ")}. It can stay visible as raw output, but it cannot confirm sound meaning.`,
      markers,
    }
  }

  const record = objectValue(payload)
  const identificationRecord = objectValue(record?.identification_summary)
  const identificationLabel = stringValue(identificationRecord?.top_label ?? identificationRecord?.label)
  const modelOutputRows = recordArrayFromPayload(record?.model_outputs, ["model_outputs", "outputs", "models", "items", "rows"])
  const fusionRows = recordArrayFromPayload(record?.fusion_evidence, ["fusion_evidence", "evidence", "items", "rows"])
  const transcriptRows = recordArrayFromPayload(record?.sound_transcripts, ["sound_transcripts", "transcripts", "items", "rows"])
  const deepSignalRows = recordArrayFromPayload(record, [
    "deep_signal_matches",
    "prototype_matches",
    "prototype_neighbors",
    "fingerprint_matches",
    "matches",
    "items",
    "rows",
  ])
  const openSetModelOutputRows = modelOutputRows.filter((row) => modelOutputRowHasProvenance(row) && modelOutputRowIsOpenSetReview(row))
  const hasModelOutputs = modelOutputRows.some((row) => modelOutputRowHasProvenance(row) && !modelOutputRowIsOpenSetReview(row))
  const hasFusionEvidence = fusionRows.some(fusionEvidenceRowHasModelOrPrototypeProof)
  const hasSoundTranscripts = transcriptRows.some(soundTranscriptRowHasEvidenceLinks)
  const hasDeepSignalMatches = deepSignalRows.some(deepSignalRowHasProvenance)
  const hasSemanticEvidence = hasModelOutputs || hasFusionEvidence || hasSoundTranscripts || hasDeepSignalMatches
  const modelStatus = stringValue(
    record?.model_status ??
      record?.model_state ??
      objectValue(record?.summary)?.model_status ??
      objectValue(record?.summary)?.model_state ??
      objectValue(record?.diagnostics)?.model_status,
  )
  const analysisStatus = stringValue(record?.status ?? record?.state ?? record?.analysis_status)
  const responseComplete = Boolean(analysisStatus && ["complete", "completed", "success", "succeeded"].some((term) => analysisStatus.toLowerCase().includes(term)))
  const unprovenModelOutputs = modelOutputRows.filter((row) => modelOutputRowHasSemanticClaim(row) && !modelOutputRowHasProvenance(row))
  const unprovenFusionRows = fusionRows.filter((row) => rowHasSemanticClaim(row) && rowHasScoreOrDistance(row) && !fusionEvidenceRowHasModelOrPrototypeProof(row))
  const unprovenTranscriptRows = transcriptRows.filter((row) => rowHasSemanticClaim(row) && !soundTranscriptRowHasEvidenceLinks(row))
  const unprovenDeepSignalRows = deepSignalRows.filter((row) => rowHasSemanticClaim(row) && rowHasScoreOrDistance(row) && !deepSignalRowHasProvenance(row))

  if (identificationLabel && !hasSemanticEvidence) {
    return {
      status: "contract_violation" as const,
      label: "Semantic contract violation",
      detail: "Backend returned an identification summary without proven model outputs, model/prototype fusion evidence, provenance-backed prototype matches, or evidence-linked transcripts.",
      markers: [identificationLabel],
    }
  }

  if (!hasSemanticEvidence && unprovenModelOutputs.length) {
    return {
      status: "contract_violation" as const,
      label: "Semantic contract violation",
      detail: "Backend returned model-like prediction rows, but they lack model identity, runtime, artifact, checksum, label-map, or training provenance.",
      markers: unprovenModelOutputs.slice(0, 3).map((row) => stringValue(row.label ?? row.top_label ?? row.model_id) || "unproven model output"),
    }
  }

  if (!hasSemanticEvidence && unprovenFusionRows.length) {
    return {
      status: "contract_violation" as const,
      label: "Semantic contract violation",
      detail: "Backend returned semantic fusion rows that are not linked to model output or prototype evidence.",
      markers: unprovenFusionRows.slice(0, 3).map((row) => stringValue(row.label ?? row.event_type ?? row.event_family) || "unproven fusion row"),
    }
  }

  if (!hasSemanticEvidence && unprovenTranscriptRows.length) {
    return {
      status: "contract_violation" as const,
      label: "Semantic contract violation",
      detail: "Backend returned transcript prose without model, fusion, or prototype evidence links.",
      markers: unprovenTranscriptRows.slice(0, 3).map((row) => stringValue(row.label ?? row.description ?? row.sound_source) || "unlinked transcript"),
    }
  }

  if (!hasSemanticEvidence && unprovenDeepSignalRows.length) {
    return {
      status: "contract_violation" as const,
      label: "Semantic contract violation",
      detail: "Backend returned deep-signal/prototype-like labels without stable prototype identity, source/model/vector proof, and score/distance evidence.",
      markers: unprovenDeepSignalRows.slice(0, 3).map((row) => stringValue(row.label ?? row.category ?? row.source) || "unproven deep-signal row"),
    }
  }

  if (responseComplete && !modelStatus && !hasSemanticEvidence) {
    return {
      status: "contract_violation" as const,
      label: "Missing model status",
      detail: "Backend marked analysis complete but did not say whether model evidence is ready or unavailable. Expected `model_status: model_unavailable` when no model artifact is loaded.",
      markers: ["model_status missing"],
    }
  }

  const evidenceMarkers = [
    hasModelOutputs ? "model outputs" : null,
    hasFusionEvidence ? "fusion evidence" : null,
    hasSoundTranscripts ? "sound transcripts" : null,
    hasDeepSignalMatches ? "proven prototype matches" : null,
    openSetModelOutputRows.length ? "open-set review output" : null,
    stringValue(record?.analysis_run_id) || stringValue(record?.run_id) ? "analysis run" : null,
    text.includes("torch") || text.includes("pytorch") ? "pytorch" : null,
    text.includes("onnx") ? "onnx" : null,
    text.includes("prototype") ? "prototype" : null,
    text.includes("checksum") || text.includes("sha256") ? "checksum" : null,
  ].filter((term): term is string => Boolean(term))
  if (evidenceMarkers.length) {
    return {
      status: "evidence" as const,
      label: "Evidence provenance present",
      detail: "Payload exposes model, fusion, run, registry, or prototype evidence fields for audit.",
      markers: evidenceMarkers,
    }
  }

  return {
    status: "detector_only" as const,
    label: "Detector-only payload",
    detail: "No mock markers found, but no model/prototype/fusion provenance was returned either.",
    markers: [] as string[],
  }
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(normalized)) return true
    if (["false", "0", "no", "n"].includes(normalized)) return false
  }
  if (typeof value === "number" && Number.isFinite(value)) return value !== 0
  return null
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function roundToStep(value: number, min: number, step: number) {
  if (!Number.isFinite(step) || step <= 0) return value
  const decimals = Math.min(6, Math.max(0, (String(step).split(".")[1] ?? "").length))
  const rounded = min + Math.round((value - min) / step) * step
  return Number(rounded.toFixed(decimals))
}

function numericValue(value: string, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function buildVisualisationParams(blob: BlobItem | null) {
  const duration = Math.max(0, finiteNumber(blob?.duration_sec) ?? 0)
  const sampleRate = Math.max(0, finiteNumber(blob?.sample_rate_hz) ?? 0)
  const sizeBytes = Math.max(0, finiteNumber(blob?.size_bytes) ?? 0)
  const looksLikeShortClip = Boolean(sizeBytes && sizeBytes <= IMMEDIATE_ANALYSIS_MAX_BYTES)
  const frequencyMax = sampleRate ? Math.min(24_000, Math.max(100, Math.floor(sampleRate / 2))) : 8_000
  const fallbackWindowSec = looksLikeShortClip ? 5 : VISUALISATION_WINDOW_MAX_SEC
  const endSec = duration ? Math.min(duration, VISUALISATION_WINDOW_MAX_SEC) : fallbackWindowSec
  const params = new URLSearchParams({
    start_sec: "0",
    end_sec: String(endSec),
    max_waveform_points: String(VISUALISATION_WAVEFORM_POINTS),
    waveform_points: String(VISUALISATION_WAVEFORM_POINTS),
    waveform_buckets: String(VISUALISATION_WAVEFORM_POINTS),
    max_time_frames: String(VISUALISATION_SPECTROGRAM_COLUMNS),
    time_frames: String(VISUALISATION_SPECTROGRAM_COLUMNS),
    spectrogram_time_frames: String(VISUALISATION_SPECTROGRAM_COLUMNS),
    max_spectrogram_columns: String(VISUALISATION_SPECTROGRAM_COLUMNS),
    spectrogram_columns: String(VISUALISATION_SPECTROGRAM_COLUMNS),
    max_frequency_bins: String(VISUALISATION_SPECTROGRAM_ROWS),
    frequency_bins: String(VISUALISATION_SPECTROGRAM_ROWS),
    max_spectrogram_rows: String(VISUALISATION_SPECTROGRAM_ROWS),
    spectrogram_rows: String(VISUALISATION_SPECTROGRAM_ROWS),
    fft_size: String(VISUALISATION_N_FFT),
    n_fft: String(VISUALISATION_N_FFT),
    hop_length: String(VISUALISATION_HOP_LENGTH),
    window_function: "hann",
    window: "hann",
    scale: "linear",
    frequency_min_hz: "0",
    frequency_max_hz: String(frequencyMax),
    f_min: "0",
    f_max: String(frequencyMax),
    db_floor: "-96",
    db_ceiling: "0",
    include_peaks: "true",
    include_envelope: "true",
    include_rms: "true",
    include_power_db: "true",
    quality: "oscilloscope",
  })
  return params
}

function waveformSampleCount(vis: Visualisation | null) {
  const waveform = vis?.waveform
  return Math.max(
    waveform?.times?.length ?? 0,
    waveform?.amplitudes?.length ?? 0,
    waveform?.min?.length ?? 0,
    waveform?.max?.length ?? 0,
    waveform?.rms?.length ?? 0,
  )
}

function visualisationQualityScore(vis: Visualisation | null) {
  if (!vis) return 0
  const waveformPoints = waveformSampleCount(vis)
  const spectrogramRows = vis.spectrogram?.power_db?.length ?? 0
  const spectrogramCols = vis.spectrogram?.power_db?.[0]?.length ?? 0
  const metadataPoints = [
    vis.fft_size,
    vis.n_fft,
    vis.hop_length,
    vis.window_function,
    vis.window,
    vis.frequency_min_hz,
    vis.frequency_max_hz,
    vis.db_floor,
    vis.db_ceiling,
    vis.normalization,
  ].filter((value) => value != null && value !== "").length
  return waveformPoints + spectrogramRows * spectrogramCols + metadataPoints * 100
}

function visualisationIsHighDefinition(vis: Visualisation | null) {
  if (!vis) return false
  const waveformPoints = waveformSampleCount(vis)
  const spectrogramRows = vis.spectrogram?.power_db?.length ?? 0
  const spectrogramCols = vis.spectrogram?.power_db?.[0]?.length ?? 0
  return (
    waveformPoints >= VISUALISATION_WAVEFORM_POINTS &&
    spectrogramRows >= VISUALISATION_SPECTROGRAM_ROWS &&
    spectrogramCols >= VISUALISATION_SPECTROGRAM_COLUMNS
  )
}

function scopeSourceLabel(source: ScopeSource) {
  switch (source) {
    case "mindex-backend":
      return "MINDEX decoded scope"
    case "analysis-payload":
      return "analysis scope"
    case "browser-real-audio":
      return "real audio scope"
    case "unavailable":
      return "scope unavailable"
    default:
      return "scope pending"
  }
}

function analysisIsQueuedOrRunningStatus(status: string | null | undefined) {
  const normalizedStatus = (status || "").toLowerCase()
  return ["queued", "queue", "pending", "scheduled", "accepted", "running", "processing", "in_progress", "working"].some((term) =>
    normalizedStatus.includes(term),
  )
}

function shouldBuildClientScope(vis: Visualisation | null, blob: BlobItem | null) {
  const sizeBytes = Math.max(0, finiteNumber(blob?.size_bytes) ?? 0)
  if (!sizeBytes || sizeBytes > IMMEDIATE_ANALYSIS_MAX_BYTES) return false
  const spectrogramRows = vis?.spectrogram?.power_db?.length ?? 0
  const spectrogramCols = vis?.spectrogram?.power_db?.[0]?.length ?? 0
  return (
    waveformSampleCount(vis) < VISUALISATION_WAVEFORM_POINTS ||
    spectrogramRows < VISUALISATION_SPECTROGRAM_ROWS ||
    spectrogramCols < VISUALISATION_SPECTROGRAM_COLUMNS
  )
}

function downmixAudioBuffer(buffer: AudioBuffer, maxSeconds: number) {
  const sampleRate = buffer.sampleRate
  const maxFrames = Math.max(1, Math.min(buffer.length, Math.floor(sampleRate * maxSeconds)))
  const samples = new Float32Array(maxFrames)
  const channels = Math.max(1, buffer.numberOfChannels)
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < maxFrames; index += 1) {
      samples[index] += data[index] / channels
    }
  }
  return samples
}

function buildClientWaveform(samples: Float32Array, sampleRate: number) {
  const bucketCount = Math.min(CLIENT_SCOPE_WAVEFORM_POINTS, Math.max(1, samples.length))
  const times: number[] = []
  const amplitudes: number[] = []
  const min: number[] = []
  const max: number[] = []
  const rms: number[] = []
  const duration = samples.length / sampleRate

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor((bucket / bucketCount) * samples.length)
    const end = Math.max(start + 1, Math.floor(((bucket + 1) / bucketCount) * samples.length))
    let low = Infinity
    let high = -Infinity
    let sumSquares = 0
    for (let index = start; index < end; index += 1) {
      const value = samples[index] ?? 0
      if (value < low) low = value
      if (value > high) high = value
      sumSquares += value * value
    }
    const count = Math.max(1, end - start)
    const rootMeanSquare = Math.sqrt(sumSquares / count)
    times.push(((start + end) / 2 / samples.length) * duration)
    min.push(Number.isFinite(low) ? low : 0)
    max.push(Number.isFinite(high) ? high : 0)
    rms.push(rootMeanSquare)
    amplitudes.push(Math.max(Math.abs(Number.isFinite(low) ? low : 0), Math.abs(Number.isFinite(high) ? high : 0), rootMeanSquare))
  }

  return { times, amplitudes, min, max, rms }
}

function buildBitReverseTable(size: number) {
  const table = new Uint32Array(size)
  const bits = Math.round(Math.log2(size))
  for (let index = 0; index < size; index += 1) {
    let value = index
    let reversed = 0
    for (let bit = 0; bit < bits; bit += 1) {
      reversed = (reversed << 1) | (value & 1)
      value >>= 1
    }
    table[index] = reversed
  }
  return table
}

function buildHannWindow(size: number) {
  const window = new Float32Array(size)
  for (let index = 0; index < size; index += 1) {
    window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1))
  }
  return window
}

function fftPowerBins(samples: Float32Array, start: number, fftSize: number, window: Float32Array, bitReverse: Uint32Array) {
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)
  for (let index = 0; index < fftSize; index += 1) {
    const target = bitReverse[index]
    real[target] = (samples[start + index] ?? 0) * window[index]
  }

  for (let size = 2; size <= fftSize; size <<= 1) {
    const halfSize = size >> 1
    const phaseStep = (-2 * Math.PI) / size
    for (let offset = 0; offset < fftSize; offset += size) {
      for (let step = 0; step < halfSize; step += 1) {
        const angle = phaseStep * step
        const wr = Math.cos(angle)
        const wi = Math.sin(angle)
        const evenIndex = offset + step
        const oddIndex = evenIndex + halfSize
        const oddReal = real[oddIndex] * wr - imag[oddIndex] * wi
        const oddImag = real[oddIndex] * wi + imag[oddIndex] * wr
        const evenReal = real[evenIndex]
        const evenImag = imag[evenIndex]
        real[evenIndex] = evenReal + oddReal
        imag[evenIndex] = evenImag + oddImag
        real[oddIndex] = evenReal - oddReal
        imag[oddIndex] = evenImag - oddImag
      }
    }
  }

  const binCount = fftSize / 2 + 1
  const power = new Float32Array(binCount)
  for (let index = 0; index < binCount; index += 1) {
    const magnitude = Math.sqrt(real[index] * real[index] + imag[index] * imag[index]) / Math.max(1, fftSize / 2)
    power[index] = Math.max(-120, Math.min(0, 20 * Math.log10(magnitude + 1e-8)))
  }
  return power
}

function sampleFftBin(power: Float32Array, binFloat: number) {
  const low = Math.max(0, Math.min(power.length - 1, Math.floor(binFloat)))
  const high = Math.max(0, Math.min(power.length - 1, low + 1))
  const t = clampNumber(binFloat - low, 0, 1)
  return power[low] * (1 - t) + power[high] * t
}

function buildClientSpectrogram(samples: Float32Array, sampleRate: number) {
  const fftSize = Math.min(CLIENT_SCOPE_FFT_SIZE, 2 ** Math.floor(Math.log2(Math.max(32, samples.length))))
  const usableSamples = Math.max(fftSize, samples.length)
  const maxStart = Math.max(0, samples.length - fftSize)
  const columnCount = Math.max(1, Math.min(CLIENT_SCOPE_SPECTROGRAM_COLUMNS, maxStart + 1))
  const rowCount = Math.max(1, Math.min(CLIENT_SCOPE_SPECTROGRAM_ROWS, fftSize / 2 + 1))
  const nyquist = sampleRate / 2
  const duration = samples.length / sampleRate
  const times = Array.from({ length: columnCount }, (_, index) =>
    columnCount === 1 ? 0 : (index / (columnCount - 1)) * duration,
  )
  const frequencies = Array.from({ length: rowCount }, (_, index) =>
    rowCount === 1 ? 0 : (index / (rowCount - 1)) * nyquist,
  )
  const power_db = Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => -120))
  const window = buildHannWindow(fftSize)
  const bitReverse = buildBitReverseTable(fftSize)
  const maxBin = fftSize / 2

  for (let col = 0; col < columnCount; col += 1) {
    const start = columnCount === 1 ? 0 : Math.floor((col / (columnCount - 1)) * maxStart)
    const powerBins = fftPowerBins(samples, start, fftSize, window, bitReverse)
    for (let row = 0; row < rowCount; row += 1) {
      const binFloat = rowCount === 1 ? 0 : (row / (rowCount - 1)) * maxBin
      power_db[row][col] = sampleFftBin(powerBins, binFloat)
    }
  }

  return {
    spectrogram: { times, frequencies, power_db },
    fftSize,
    effectiveHopLength: columnCount === 1 ? 0 : Math.max(1, Math.round(maxStart / (columnCount - 1))),
    frequencyMinHz: 0,
    frequencyMaxHz: nyquist,
    dbFloor: -120,
    dbCeiling: 0,
  }
}

async function buildClientAudioVisualisation(streamUrl: string, blob: BlobItem | null): Promise<Visualisation> {
  if (typeof window === "undefined") {
    throw new Error("Audio scope decoding is only available in the browser.")
  }
  const contextWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  const AudioContextCtor = window.AudioContext || contextWindow.webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error("Web Audio decoding is not available in this browser.")
  }

  const duration = Math.max(0, finiteNumber(blob?.duration_sec) ?? 0)
  const maxSeconds = duration ? Math.min(duration, CLIENT_SCOPE_MAX_SECONDS) : 5
  const response = await fetch(streamUrl, { cache: "force-cache" })
  if (!response.ok) throw new Error(`Audio stream failed (${response.status})`)
  const arrayBuffer = await response.arrayBuffer()
  const context = new AudioContextCtor()
  try {
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0))
    const samples = downmixAudioBuffer(buffer, maxSeconds)
    const scope = buildClientSpectrogram(samples, buffer.sampleRate)
    const originalDurationSec = buffer.duration || duration || samples.length / buffer.sampleRate
    const clamp =
      originalDurationSec > samples.length / buffer.sampleRate
        ? {
            source: "browser-real-audio",
            original_duration_sec: originalDurationSec,
            rendered_duration_sec: samples.length / buffer.sampleRate,
            max_seconds: maxSeconds,
          }
        : undefined
    return {
      visualisation_status: "ready",
      status: "ready",
      duration_sec: samples.length / buffer.sampleRate,
      sample_rate_hz: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      fft_size: scope.fftSize,
      n_fft: scope.fftSize,
      hop_length: scope.effectiveHopLength,
      window_function: "hann",
      window: "hann",
      frequency_min_hz: scope.frequencyMinHz,
      frequency_max_hz: scope.frequencyMaxHz,
      db_floor: scope.dbFloor,
      db_ceiling: scope.dbCeiling,
      normalization: "browser-real-audio-downmix-stft-dbfs",
      colormap_hint: "oscilloscope",
      clamp,
      waveform: buildClientWaveform(samples, buffer.sampleRate),
      spectrogram: scope.spectrogram,
    }
  } finally {
    if (typeof context.close === "function") {
      void context.close()
    }
  }
}

function seekMediaElement(audio: HTMLMediaElement, time: number) {
  const nextTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const seekableAudio = audio as HTMLMediaElement & { fastSeek?: (time: number) => void }
  if (typeof seekableAudio.fastSeek === "function") {
    try {
      seekableAudio.fastSeek(nextTime)
      return true
    } catch {
      // Some browser/media combinations expose fastSeek but reject it until metadata is ready.
    }
  }
  try {
    audio.currentTime = nextTime
    return true
  } catch {
    return false
  }
}

function playbackErrorStatus(event: unknown) {
  if (!(event instanceof Error)) return "Playback could not start."
  const message = event.message || ""
  if (/user didn't interact|notallowed|permission|gesture/i.test(message)) {
    return "Playback needs one click on the built-in audio bar in this browser. After that, the SINE transport can follow."
  }
  if (/not supported|decode|media|source|network/i.test(message)) {
    return "This audio stream could not be decoded by the browser."
  }
  return message
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function stringListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => {
            if (typeof item === "string") return item.trim()
            const record = objectValue(item)
            return stringValue(
              record?.id ??
                record?.evidence_id ??
                record?.fusion_evidence_id ??
                record?.model_output_id ??
                record?.output_id ??
                record?.inference_id ??
                record?.prediction_id ??
                record?.detector_event_id ??
                record?.event_id ??
                record?.prototype_id ??
                record?.prototype_match_id ??
                record?.fingerprint_id ??
                record?.embedding_id,
            )
          })
          .filter((item): item is string => Boolean(item)),
      ),
    )
  }
  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    )
  }
  const record = objectValue(value)
  if (!record) return []
  return stringListValue([
    record.id,
    record.evidence_id,
    record.fusion_evidence_id,
    record.model_output_id,
    record.output_id,
    record.inference_id,
    record.prediction_id,
    record.detector_event_id,
    record.event_id,
    record.prototype_id,
    record.prototype_match_id,
    record.fingerprint_id,
    record.embedding_id,
  ])
}

function combinedStringList(...values: unknown[]) {
  return Array.from(new Set(values.flatMap((value) => stringListValue(value))))
}

function textListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => {
            if (typeof item === "string") return item.trim()
            const record = objectValue(item)
            return stringValue(record?.id ?? record?.name ?? record?.label ?? record?.domain ?? record?.category ?? record?.type ?? record?.detector_id ?? record?.key)
          })
          .filter((item): item is string => Boolean(item)),
      ),
    )
  }
  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    )
  }
  const record = objectValue(value)
  if (!record) return []
  return Object.keys(record).filter(Boolean)
}

function recordValue(value: unknown): Record<string, unknown> | null {
  const direct = objectValue(value)
  if (direct) return direct
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null
  try {
    return objectValue(JSON.parse(trimmed))
  } catch {
    return null
  }
}

function canonicalEventFamily(value: unknown, detector: string, fallback?: string | null) {
  const raw = stringValue(value)?.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  const detectorFallback = detectorFamilyFallbacks[detector]
  const candidate = raw || fallback || detectorFallback || null
  if (!candidate) return null
  if (["frequency", "fft", "fft_peak", "peak", "frequency_fft", "frequency_peak"].includes(candidate)) return "frequency_peak"
  if (["activity", "segment", "activity_segment", "activity_auditok", "acoustic_activity"].includes(candidate)) return "activity_segment"
  if (
    [
      "bird",
      "birds",
      "animal",
      "animals",
      "animal_life",
      "marine_bioacoustics",
      "terrestrial_bioacoustics",
      "bioacoustic",
      "bioacoustics",
      "whale",
      "dolphin",
      "mammal",
      "frog",
      "bat",
    ].includes(candidate)
  ) {
    return "animal_life"
  }
  if (["insect", "insects", "stridulation", "cricket", "cicada", "katydid"].includes(candidate)) return "insect"
  if (["uav", "drone", "rotor", "air_rotor", "air_propeller", "aircraft", "helicopter", "quadrotor"].includes(candidate)) {
    return "air_propeller"
  }
  if (["water_propeller", "underwater_propeller", "marine_propeller", "thruster"].includes(candidate)) return "water_propeller"
  if (["vessel", "boat", "ship", "vessel_engine", "marine_engine", "submarine", "cavitation"].includes(candidate)) return "vessel_engine"
  if (["impulse", "explosion", "blast", "detonation", "gunshot", "sonic_boom", "impulse_explosion"].includes(candidate)) {
    return "impulse_explosion"
  }
  if (["weather", "lightning", "thunder", "weather_lightning", "thunderclap"].includes(candidate)) return "weather_lightning"
  if (["ground", "soil", "seismic", "earthquake", "earthquake_seismic", "ground_seismic", "geophone", "tremor"].includes(candidate)) {
    return "ground_seismic"
  }
  if (["mechanical", "engine", "motor", "servo", "actuator", "machine", "industrial"].includes(candidate)) return "mechanical"
  if (["geophysical", "landslide", "volcanic"].includes(candidate)) return "geophysical"
  if (["pattern", "prototype", "prototype_match", "deep_signal", "deep_signal_features", "nps", "nps_discovery_match"].includes(candidate)) {
    return "prototype_match"
  }
  if (["unknown", "unknown_pattern", "other"].includes(candidate)) return "unknown_pattern"
  return candidate
}

function recordArrayFromPayload(payload: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
  }
  const record = objectValue(payload)
  if (!record) return []
  for (const key of keys) {
    const candidate = record[key]
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    }
    const candidateRecord = objectValue(candidate)
    if (candidateRecord) return [candidateRecord]
  }
  const nested = objectValue(record.data)
  if (nested) return recordArrayFromPayload(nested, keys)
  if (record.id || record.selection || record.markers || record.human_label || record.human_category) return [record]
  return []
}

function normalizeWaveMarker(value: unknown, fallbackIndex: number): WaveMarker | null {
  const record = objectValue(value)
  if (!record) return null
  const time = finiteNumber(record.time_sec) ?? finiteNumber(record.time_seconds) ?? finiteNumber(record.t)
  if (time == null) return null
  return {
    id: stringValue(record.id) || `saved-marker-${fallbackIndex}-${time}`,
    time_sec: time,
    label: stringValue(record.label) || stringValue(record.name) || `Marker ${fallbackIndex + 1}`,
    saved: true,
  }
}

function normalizeWaveAnnotations(payload: unknown): WaveAnnotationRecord[] {
  return recordArrayFromPayload(payload, ["wave_annotations", "wave_annotation", "annotation", "annotations", "item", "row", "items", "rows"]).map((row, index) => {
    const selection = objectValue(row.selection)
    const zoom = objectValue(row.zoom)
    const markers = Array.isArray(row.markers)
      ? row.markers
          .map((marker, markerIndex) => normalizeWaveMarker(marker, markerIndex))
          .filter((marker): marker is WaveMarker => Boolean(marker))
      : []
    return {
      id: stringValue(row.id),
      selection: selection
        ? {
            start_sec: finiteNumber(selection.start_sec) ?? finiteNumber(selection.start_seconds),
            end_sec: finiteNumber(selection.end_sec) ?? finiteNumber(selection.end_seconds),
            loop_enabled: booleanValue(selection.loop_enabled),
            reverse_enabled: booleanValue(selection.reverse_enabled),
            playback_rate: finiteNumber(selection.playback_rate),
          }
        : null,
      zoom: zoom
        ? {
            start_sec: finiteNumber(zoom.start_sec) ?? finiteNumber(zoom.start_seconds),
            end_sec: finiteNumber(zoom.end_sec) ?? finiteNumber(zoom.end_seconds),
          }
        : null,
      markers,
      loop_enabled: booleanValue(row.loop_enabled),
      reverse_enabled: booleanValue(row.reverse_enabled),
      playback_rate: finiteNumber(row.playback_rate),
      scope:
        objectValue(row.scope) ||
        (() => {
          const context = objectValue(row.file_context)
          return context && typeof context.scope === "object" && context.scope && !Array.isArray(context.scope)
            ? (context.scope as Record<string, unknown>)
            : null
        })(),
      created_at: stringValue(row.created_at),
    }
  })
}

function normalizeHumanIdentifications(payload: unknown): HumanIdentificationRecord[] {
  return recordArrayFromPayload(payload, [
    "human_identifications",
    "latest_human_identification",
    "human_identification",
    "human_tags",
    "training_tags",
    "identification",
    "identifications",
    "item",
    "row",
    "items",
    "rows",
  ]).map((row) => ({
    id: stringValue(row.id),
    human_label: stringValue(row.human_label) || stringValue(row.label),
    human_category: stringValue(row.human_category) || stringValue(row.category),
    human_confidence: finiteNumber(row.human_confidence) ?? finiteNumber(row.confidence),
    human_notes: stringValue(row.human_notes) || stringValue(row.notes),
    disputes_model: booleanValue(row.disputes_model),
    model_top_label: stringValue(row.model_top_label),
    model_confidence: finiteNumber(row.model_confidence),
    review_status: stringValue(row.review_status),
    event_context: objectValue(row.event_context),
    file_context: objectValue(row.file_context),
    created_at: stringValue(row.created_at),
  }))
}

function newestRecord<T extends { created_at?: string | null }>(records: T[]): T | null {
  if (!records.length) return null
  return [...records].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0
    return rightTime - leftTime
  })[0] || null
}

function formatDuration(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "duration pending"
  const seconds = Math.max(0, value ?? 0)
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000)
  if (mins) return `${mins}m ${secs.toString().padStart(2, "0")}s`
  if (seconds < 10 && ms) return `${secs}.${Math.floor(ms / 100)}s`
  return `${secs}s`
}

function formatBytes(value?: number | null) {
  if (!Number.isFinite(value ?? NaN) || !value) return "size pending"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let amount = value
  let unit = 0
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024
    unit += 1
  }
  return `${amount.toFixed(unit ? 1 : 0)} ${units[unit]}`
}

function formatHz(value?: number | null) {
  if (!Number.isFinite(value ?? NaN) || value == null) return "-"
  if (value >= 1000) return `${(value / 1000).toFixed(2)} kHz`
  return `${value.toFixed(value >= 100 ? 0 : 1)} Hz`
}

function resolveScopeFrequencyRange(vis: Visualisation | null, options: ScopeOptions) {
  const frequencies = vis?.spectrogram?.frequencies?.filter((value) => Number.isFinite(value)) ?? []
  const dataMinHz = frequencies.length ? Math.min(...frequencies) : 0
  const dataMaxHz = frequencies.length ? Math.max(...frequencies) : Math.max(1, options.frequencyMaxHz)
  const requestedMinHz = Math.min(options.frequencyMinHz, options.frequencyMaxHz - 1)
  const frequencyMinHz = clampNumber(requestedMinHz, dataMinHz, Math.max(dataMinHz, dataMaxHz - 1))
  const frequencyMaxHz = clampNumber(options.frequencyMaxHz, frequencyMinHz + 1, Math.max(frequencyMinHz + 1, dataMaxHz))

  return {
    frequencyMinHz,
    frequencyMaxHz,
    frequencySpanHz: Math.max(1, frequencyMaxHz - frequencyMinHz),
  }
}

function waveformAmplitudeAtTime(vis: Visualisation | null, timeSec: number, durationSec: number) {
  const waveform = vis?.waveform
  const amps = waveform?.amplitudes ?? waveform?.rms
  if (!amps?.length) return null
  const times = waveform?.times
  if (times?.length === amps.length) {
    let nearestIndex = 0
    let nearestDistance = Infinity
    times.forEach((time, index) => {
      const distance = Math.abs(time - timeSec)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })
    if (waveform?.min?.length === amps.length && waveform?.max?.length === amps.length) {
      const minAmp = waveform.min[nearestIndex] ?? amps[nearestIndex] ?? 0
      const maxAmp = waveform.max[nearestIndex] ?? amps[nearestIndex] ?? 0
      return Math.max(-1, Math.min(1, Math.abs(maxAmp) >= Math.abs(minAmp) ? maxAmp : minAmp))
    }
    return Math.max(-1, Math.min(1, amps[nearestIndex] ?? 0))
  }

  const duration = Math.max(durationSec || vis?.duration_sec || 0, 0.001)
  const index = Math.max(0, Math.min(amps.length - 1, Math.round((timeSec / duration) * (amps.length - 1))))
  if (waveform?.min?.length === amps.length && waveform?.max?.length === amps.length) {
    const minAmp = waveform.min[index] ?? amps[index] ?? 0
    const maxAmp = waveform.max[index] ?? amps[index] ?? 0
    return Math.max(-1, Math.min(1, Math.abs(maxAmp) >= Math.abs(minAmp) ? maxAmp : minAmp))
  }
  return Math.max(-1, Math.min(1, amps[index] ?? 0))
}

function spectrogramPowerAtTimeFrequency(
  vis: Visualisation | null,
  timeSec: number,
  frequencyHz: number | null,
  durationSec: number,
) {
  if (frequencyHz == null || !Number.isFinite(frequencyHz)) return null
  const power = vis?.spectrogram?.power_db
  const rows = power?.length ?? 0
  const cols = power?.[0]?.length ?? 0
  if (!power || rows <= 0 || cols <= 0) return null

  const frequencies = vis?.spectrogram?.frequencies
  const times = vis?.spectrogram?.times
  const duration = Math.max(durationSec || vis?.duration_sec || 0, 0.001)
  const finiteFrequencies = frequencies?.filter((value) => Number.isFinite(value)) ?? []
  const frequencyMax = finiteFrequencies.length ? Math.max(...finiteFrequencies) : Math.max(1, frequencyHz)
  const row =
    frequencies?.length === rows
      ? axisSample(frequencies, frequencyHz, rows - 1, frequencyHz / Math.max(1, frequencyMax))
      : axisSample(undefined, frequencyHz, rows - 1, frequencyHz / Math.max(1, frequencyMax))
  const col = axisSample(times, timeSec, cols - 1, timeSec / duration)
  const value = bilinearPowerAt(power, row, col, NaN)
  return Number.isFinite(value) ? value : null
}

function dbToLinear(db: number) {
  return Math.pow(10, db / 10)
}

function linearToDb(power: number) {
  return power > 0 ? 10 * Math.log10(power) : null
}

function formatDb(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? `${(value ?? 0).toFixed(1)} dB` : "-"
}

function computeScopeMeasurements(
  vis: Visualisation | null,
  options: ScopeOptions,
  viewStart: number,
  viewEnd: number,
  durationSec: number,
): ScopeMeasurementSummary {
  const emptyBands = acousticBandGuides.map((band) => ({
    label: band.label,
    minHz: band.minHz,
    maxHz: band.maxHz,
    avgDb: null,
    share: 0,
  }))
  const power = vis?.spectrogram?.power_db
  if (!power?.length || !power[0]?.length) {
    return { hasData: false, avgDb: null, minDb: null, maxDb: null, centroidHz: null, cellCount: 0, bands: emptyBands, peaks: [] }
  }

  const rows = power.length
  const cols = power[0].length
  const frequencies = vis?.spectrogram?.frequencies
  const times = vis?.spectrogram?.times
  const { frequencyMinHz, frequencyMaxHz } = resolveScopeFrequencyRange(vis, options)
  const windowStart = Math.max(0, Math.min(viewStart, viewEnd))
  const windowEnd = Math.max(windowStart, Math.max(viewStart, viewEnd))
  const duration = Math.max(durationSec || vis?.duration_sec || 0, 0.001)

  let linearTotal = 0
  let weightedFrequencyTotal = 0
  let minDb = Infinity
  let maxDb = -Infinity
  let cellCount = 0
  const bandTotals = acousticBandGuides.map(() => ({ power: 0, cells: 0 }))
  const rowTotals = Array.from({ length: rows }, () => ({ frequency: 0, power: 0, cells: 0 }))

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const frequency = frequencies?.[rowIndex] ?? (rowIndex / Math.max(1, rows - 1)) * frequencyMaxHz
    if (!Number.isFinite(frequency) || frequency < frequencyMinHz || frequency > frequencyMaxHz) continue
    const row = power[rowIndex]
    rowTotals[rowIndex].frequency = frequency
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const time = times?.[colIndex] ?? (colIndex / Math.max(1, cols - 1)) * duration
      if (!Number.isFinite(time) || time < windowStart || time > windowEnd) continue
      const value = row[colIndex]
      if (!Number.isFinite(value)) continue
      const linear = dbToLinear(value)
      linearTotal += linear
      weightedFrequencyTotal += linear * frequency
      minDb = Math.min(minDb, value)
      maxDb = Math.max(maxDb, value)
      cellCount += 1
      rowTotals[rowIndex].power += linear
      rowTotals[rowIndex].cells += 1
      acousticBandGuides.forEach((band, bandIndex) => {
        if (frequency >= band.minHz && frequency <= band.maxHz) {
          bandTotals[bandIndex].power += linear
          bandTotals[bandIndex].cells += 1
        }
      })
    }
  }

  if (!cellCount || linearTotal <= 0) {
    return { hasData: false, avgDb: null, minDb: null, maxDb: null, centroidHz: null, cellCount: 0, bands: emptyBands, peaks: [] }
  }

  const averagedRows = rowTotals
    .map((row) => {
      if (!row.cells || row.power <= 0 || !Number.isFinite(row.frequency)) return null
      return {
        frequencyHz: row.frequency,
        avgDb: linearToDb(row.power / row.cells),
      }
    })
    .filter((row): row is { frequencyHz: number; avgDb: number } => Boolean(row?.avgDb != null))
    .sort((left, right) => left.frequencyHz - right.frequencyHz)
  const localMaxima = averagedRows.filter((row, index, rowsByFrequency) => {
    const previous = rowsByFrequency[index - 1]
    const next = rowsByFrequency[index + 1]
    return (!previous || row.avgDb >= previous.avgDb) && (!next || row.avgDb >= next.avgDb)
  })
  const sortedPeakCandidates = (localMaxima.length ? localMaxima : averagedRows)
    .slice()
    .sort((left, right) => right.avgDb - left.avgDb)
  const peakSeparationHz = Math.max(1, (frequencyMaxHz - frequencyMinHz) / 64)
  const selectedPeaks: { frequencyHz: number; avgDb: number }[] = []
  sortedPeakCandidates.forEach((candidate) => {
    if (selectedPeaks.length >= 8) return
    if (selectedPeaks.some((peak) => Math.abs(peak.frequencyHz - candidate.frequencyHz) < peakSeparationHz)) return
    selectedPeaks.push(candidate)
  })
  const strongestPeakDb = selectedPeaks[0]?.avgDb ?? 0
  const peaks = selectedPeaks.map((peak, index) => {
    const band = acousticBandGuides.find((guide) => peak.frequencyHz >= guide.minHz && peak.frequencyHz <= guide.maxHz)
    return {
      rank: index + 1,
      frequencyHz: peak.frequencyHz,
      avgDb: peak.avgDb,
      relativeDb: peak.avgDb - strongestPeakDb,
      bandLabel: band?.label ?? "Unbanded",
    }
  })

  return {
    hasData: true,
    avgDb: linearToDb(linearTotal / cellCount),
    minDb,
    maxDb,
    centroidHz: weightedFrequencyTotal / linearTotal,
    cellCount,
    bands: acousticBandGuides.map((band, index) => {
      const bandPower = bandTotals[index].power
      const bandCells = bandTotals[index].cells
      return {
        label: band.label,
        minHz: band.minHz,
        maxHz: band.maxHz,
        avgDb: bandCells ? linearToDb(bandPower / bandCells) : null,
        share: linearTotal > 0 ? bandPower / linearTotal : 0,
      }
    }),
    peaks,
  }
}

function formatPercent(value?: number | null) {
  if (!Number.isFinite(value ?? NaN) || value == null) return "-"
  return `${Math.max(0, Math.min(100, value * 100)).toFixed(value > 0.995 ? 1 : 0)}%`
}

function cleanLabel(value?: string | null) {
  if (!value) return ""
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function comparisonKey(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim()
}

function blobTitle(blob: BlobItem) {
  return blob.title || blob.name || blob.filename || blob.relative_path || blob.id
}

function blobSearchText(blob: BlobItem) {
  return [
    blob.id,
    blob.name,
    blob.title,
    blob.filename,
    blob.relative_path,
    blob.label_primary,
    blob.label_secondary,
    blob.acoustic_environment,
    blob.source_id,
    blob.source_name,
    blob.recording_group,
    blob.sensor_type,
    blob.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function uniqueBlobs(rows: BlobItem[]) {
  const seen = new Set<string>()
  const unique: BlobItem[] = []

  rows.forEach((row) => {
    const key =
      row.id ||
      row.relative_path ||
      row.filename ||
      [row.source_id, row.recording_group, row.title, row.size_bytes].filter(Boolean).join("|")
    if (!key || seen.has(key)) return
    seen.add(key)
    unique.push(row)
  })

  return unique
}

function blobPathText(blob: BlobItem) {
  return [blob.name, blob.filename, blob.relative_path, blob.stream_url].filter(Boolean).join(" ").toLowerCase()
}

function isUuidLike(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

function streamRemoteId(blob: BlobItem): string | null {
  if (!blob.stream_url) return null
  try {
    const url = new URL(blob.stream_url, "http://mindex.local")
    return url.searchParams.get("remote_id")
  } catch {
    return null
  }
}

function blobAnalysisId(blob: BlobItem | null): string | null {
  if (!blob) return null
  const candidates = [
    blob.analysis_id,
    blob.blob_id,
    blob.uuid,
    blob.remote_id,
    streamRemoteId(blob),
    blob.id,
  ]
  return candidates.find(isUuidLike) ?? null
}

function isPlayableAcousticBlob(blob: BlobItem) {
  const mime = (blob.mime_type || "").toLowerCase()
  const path = blobPathText(blob)
  if (mime.startsWith("audio/")) return true
  if (mime.startsWith("video/")) return true
  return /\.(wav|wave|mp3|flac|ogg|oga|opus|m4a|aac|aif|aiff|webm|mp4)(\?|$|\s)/i.test(path)
}

function playableBlobs(rows: BlobItem[]) {
  return uniqueBlobs(rows).filter(isPlayableAcousticBlob)
}

function inferEnvironment(blob: BlobItem): "water" | "air" | "ground" | "unknown" {
  const text = [blob.acoustic_environment, blob.sensor_type, blob.source_id, blob.recording_group, blob.relative_path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (text.includes("hydrophone") || text.includes("mbari") || text.includes("water") || text.includes("marine")) {
    return "water"
  }
  if (
    text.includes("ground") ||
    text.includes("soil") ||
    text.includes("underground") ||
    text.includes("seismic") ||
    text.includes("geophone") ||
    text.includes("surface")
  ) {
    return "ground"
  }
  if (text.includes("microphone") || text.includes("esc50") || text.includes("air") || text.includes("terrestrial")) {
    return "air"
  }
  return "unknown"
}

function preferredInitialBlob(rows: BlobItem[]) {
  const eligible = rows.filter((row) => (row.size_bytes ?? Number.MAX_SAFE_INTEGER) <= IMMEDIATE_ANALYSIS_MAX_BYTES)
  const pool = eligible.length ? eligible : rows
  return [...pool].sort((left, right) => {
    const leftSize = Number.isFinite(left.size_bytes ?? NaN) ? left.size_bytes ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
    const rightSize = Number.isFinite(right.size_bytes ?? NaN) ? right.size_bytes ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
    return leftSize - rightSize
  })[0]
}

function normalizeEvent(event: unknown, detectorFallback: string, familyFallback?: string): DetectionEvent | null {
  if (!event || typeof event !== "object") return null
  const record = event as Record<string, unknown>
  const metadata = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : null
  const detector = stringValue(record.detector_id) || detectorFallback
  const rawFamily =
    record.event_family ??
    record.family ??
    record.category ??
    record.type ??
    metadata?.event_family ??
    familyFallback ??
    detectorFamilyFallbacks[detector]
  const normalizedFamily = canonicalEventFamily(rawFamily, detector, familyFallback)
  const label =
    stringValue(record.label) ||
    stringValue(record.event_type) ||
    stringValue(record.class_name) ||
    stringValue(record.species) ||
    stringValue(record.drone_class) ||
    stringValue(record.profile_code) ||
    detector

  return {
    detector_id: detector,
    label,
    confidence: finiteNumber(record.confidence ?? record.score),
    start_sec: finiteNumber(record.start_sec ?? record.start_seconds ?? record.segment_start),
    end_sec: finiteNumber(record.end_sec ?? record.end_seconds ?? record.segment_end),
    peak_sec: finiteNumber(record.peak_sec ?? record.peak_seconds),
    frequency_hz: finiteNumber(record.frequency_hz ?? record.freq_hz ?? record.peak_frequency_hz),
    frequency_min_hz: finiteNumber(record.frequency_min_hz ?? record.min_frequency_hz ?? record.low_hz),
    frequency_max_hz: finiteNumber(record.frequency_max_hz ?? record.max_frequency_hz ?? record.high_hz),
    category: stringValue(record.category ?? record.type ?? normalizedFamily),
    acoustic_domain: stringValue(record.acoustic_domain ?? record.domain ?? record.environment ?? metadata?.acoustic_domain),
    event_family: normalizedFamily,
    event_type: stringValue(record.event_type ?? record.type ?? record.class_name ?? metadata?.event_type),
    engine: stringValue(record.engine),
    method: stringValue(record.method ?? metadata?.method),
    model: stringValue(record.model),
    model_version: stringValue(record.model_version ?? record.detector_version ?? metadata?.model_version),
    metadata,
  }
}

function groupedEventsFromAnalysis(data: AnalysisPayload): DetectionEvent[] {
  const groupedPairs = groupedEventSources.map((source) => ({
    ...source,
    value: data[source.key] as unknown[] | undefined,
  }))

  const hasGrouped = groupedPairs.some((source) => Array.isArray(source.value) && source.value.length > 0)
  const sourceEvents = hasGrouped
    ? groupedPairs.flatMap((source) =>
        Array.isArray(source.value) ? source.value.map((event) => normalizeEvent(event, source.detector, source.family)) : [],
      )
    : Array.isArray(data.events) || Array.isArray(data.detector_events)
      ? (Array.isArray(data.events) ? data.events : data.detector_events ?? []).map((event) => normalizeEvent(event, "sine"))
      : []

  const seen = new Set<string>()
  return sourceEvents
    .filter((event): event is DetectionEvent => Boolean(event))
    .filter((event) => {
      const key = [
        event.detector_id,
        event.label,
        event.event_family,
        event.event_type,
        event.start_sec?.toFixed(3),
        event.end_sec?.toFixed(3),
        event.frequency_hz?.toFixed(2),
      ].join("|")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => (left.start_sec ?? 0) - (right.start_sec ?? 0) || (right.confidence ?? 0) - (left.confidence ?? 0))
}

function deriveIdentificationSummaryFromAnalysis(data: AnalysisPayload): IdentificationSummary | undefined {
  const events = groupedEventsFromAnalysis(data)
  const detectorCounts = events.reduce<Record<string, number>>((counts, event) => {
    const key = event.event_family || event.detector_id || "event"
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  const sortedByConfidence = [...events].sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
  const dominantFrequency =
    sortedByConfidence.find((event) => event.frequency_hz != null)?.frequency_hz ??
    null

  const modelOutputs = normalizeModelOutputs(data.model_outputs).filter(modelOutputHasProvenance)
  const topModel = modelOutputs
    .flatMap((output) =>
      output.top_labels.map((label) => ({
        label,
        output,
      })),
    )
    .sort((left, right) => (right.label.score ?? 0) - (left.label.score ?? 0))[0]

  if (topModel) {
    return {
      top_label: topModel.label.label,
      label: topModel.label.label,
      category: topModel.label.category ?? topModel.output.class_families[0] ?? topModel.output.target_domains[0] ?? null,
      type: topModel.output.model_name ?? topModel.output.model_id ?? null,
      confidence: topModel.label.score ?? null,
      ood_score: topModel.output.ood_score ?? null,
      status: topModel.output.status || "model_evidence",
      engine: topModel.output.runtime || topModel.output.framework || null,
      model: topModel.output.model_id || topModel.output.model_name || topModel.output.model_version || null,
      dominant_frequency_hz: dominantFrequency,
      detector_counts: Object.keys(detectorCounts).length ? detectorCounts : undefined,
    }
  }

  const fusion = normalizeFusionEvidence(data.fusion_evidence)
    .filter(fusionEvidenceHasModelOrPrototypeProof)
    .sort((left, right) => (right.score ?? right.weight ?? 0) - (left.score ?? left.weight ?? 0))[0]
  if (fusion?.label || fusion?.event_type || fusion?.event_family) {
    const label = fusion.label || fusion.event_type || fusion.event_family || "fusion evidence"
    return {
      top_label: label,
      label,
      category: fusion.event_family ?? null,
      type: fusion.event_type ?? fusion.kind ?? null,
      confidence: fusion.score ?? fusion.weight ?? null,
      status: "fusion_evidence",
      engine: fusion.kind,
      model: fusion.model_id || fusion.model || null,
      dominant_frequency_hz: dominantFrequency,
      detector_counts: Object.keys(detectorCounts).length ? detectorCounts : undefined,
    }
  }

  const prototype = normalizeDeepSignalMatches(data.deep_signal_matches)
    .filter((match) => match.evidence_proven)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0]
  if (prototype?.label) {
    return {
      top_label: prototype.label,
      label: prototype.label,
      category: prototype.category ?? null,
      type: "prototype_match",
      confidence: prototype.score ?? null,
      status: "prototype_evidence",
      engine: prototype.model || prototype.model_id || null,
      model: prototype.model_id || prototype.model || null,
      dominant_frequency_hz: dominantFrequency,
      detector_counts: Object.keys(detectorCounts).length ? detectorCounts : undefined,
    }
  }

  const transcript = normalizeTranscripts(data.sound_transcripts)
    .filter(transcriptHasModelOrPrototypeEvidence)
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))[0]
  if (transcript?.label) {
    return {
      top_label: transcript.label,
      label: transcript.label,
      category: transcript.event_family ?? null,
      type: transcript.sound_source ?? transcript.detector_id ?? null,
      confidence: transcript.confidence ?? null,
      status: "transcript_evidence",
      engine: transcript.method ?? null,
      model: transcript.method ?? null,
      dominant_frequency_hz: dominantFrequency,
      detector_counts: Object.keys(detectorCounts).length ? detectorCounts : undefined,
    }
  }

  return undefined
}

function normalizeTranscripts(value: unknown): SoundTranscript[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): SoundTranscript | null => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const start = finiteNumber(record.start_sec ?? record.start_seconds)
      const end = finiteNumber(record.end_sec ?? record.end_seconds)
      const label = stringValue(record.label)
      if (start == null || end == null || !label) return null
      return {
        start_sec: start,
        end_sec: end,
        label,
        description: stringValue(record.description),
        sound_source: stringValue(record.sound_source),
        confidence: finiteNumber(record.confidence),
        frequency_range: stringValue(record.frequency_range),
        transcript_source: "backend",
        detector_id: stringValue(record.detector_id),
        event_family: stringValue(record.event_family ?? record.category),
        method: stringValue(record.method ?? record.model ?? record.engine),
        evidence_ids: combinedStringList(record.evidence_ids, record.evidence_id, record.evidence, record.evidence_links),
        fusion_evidence_ids: combinedStringList(
          record.fusion_evidence_ids,
          record.fusion_evidence_id,
          record.fusion_ids,
          record.fusion_id,
          record.evidence_links,
          record.supporting_fusion_evidence_ids,
          record.supporting_fusion_evidence,
        ),
        model_output_ids: combinedStringList(
          record.model_output_ids,
          record.model_output_id,
          record.model_outputs,
          record.output_ids,
          record.output_id,
          record.inference_ids,
          record.inference_id,
          record.prediction_ids,
          record.prediction_id,
          record.supporting_model_output_ids,
          record.supporting_model_outputs,
        ),
        detector_event_ids: combinedStringList(
          record.detector_event_ids,
          record.detector_event_id,
          record.event_ids,
          record.event_id,
          record.detection_event_ids,
          record.detection_event_id,
          record.supporting_detector_event_ids,
        ),
        prototype_ids: combinedStringList(
          record.prototype_ids,
          record.prototype_id,
          record.prototype_match_ids,
          record.prototype_match_id,
          record.prototype_matches,
          record.fingerprint_ids,
          record.fingerprint_id,
          record.embedding_ids,
          record.embedding_id,
          record.supporting_prototype_ids,
          record.supporting_prototypes,
        ),
        evidence_summary: stringValue(record.evidence_summary ?? record.evidence_detail ?? record.evidence_description),
      }
    })
    .filter((item): item is SoundTranscript => Boolean(item))
    .sort((left, right) => left.start_sec - right.start_sec)
}

function normalizeDeepSignalMatches(value: unknown): DeepSignalMatch[] {
  return recordArrayFromPayload(value, ["deep_signal_matches", "prototype_matches", "prototype_neighbors", "fingerprint_matches", "matches", "items", "rows"])
    .map((item): DeepSignalMatch | null => {
      const record = objectValue(item)
      if (!record) return null
      const label =
        stringValue(record.label) ||
        stringValue(record.sound_source) ||
        stringValue(record.prototype_label) ||
        stringValue(record.class_name) ||
        stringValue(record.event_type)
      if (!label) return null

      return {
        label,
        score: finiteNumber(record.score ?? record.confidence ?? record.similarity),
        source: stringValue(record.source ?? record.source_name ?? record.dataset),
        segment_start: finiteNumber(record.segment_start ?? record.start_sec ?? record.start_seconds),
        segment_end: finiteNumber(record.segment_end ?? record.end_sec ?? record.end_seconds),
        category: stringValue(record.category ?? record.event_family ?? record.type),
      prototype_id: stringValue(
        record.prototype_id ??
          record.prototype ??
          record.prototype_key ??
          record.prototype_match_id ??
          record.matched_prototype_id ??
          record.nearest_prototype_id ??
          record.fingerprint_id ??
          record.signature_id ??
          record.embedding_id,
      ),
      embedding_id: stringValue(record.embedding_id ?? record.vector_id ?? record.centroid_id ?? record.fingerprint_id ?? record.signature_id),
      model: stringValue(record.model ?? record.model_name ?? record.model_version ?? record.embedding_model_version ?? record.embedding_model ?? record.engine ?? record.runtime),
      model_id: stringValue(record.model_id ?? record.embedding_model_id ?? record.embedding_model ?? record.model_id ?? record.model),
      embedding_dim: finiteNumber(record.embedding_dim ?? record.embedding_dimension ?? record.vector_dim ?? record.dimensions),
      vector_checksum: stringValue(
        record.vector_checksum ??
          record.vector_sha256 ??
          record.embedding_checksum ??
          record.embedding_sha256 ??
          record.centroid_sha256 ??
          record.prototype_sha256 ??
          record.prototype_checksum ??
          record.fingerprint_sha256 ??
          record.fingerprint_checksum ??
          record.sha256 ??
          record.checksum,
      ),
      distance: finiteNumber(record.distance ?? record.embedding_distance ?? record.cosine_distance ?? record.neighbor_distance),
        evidence_proven: deepSignalRowHasProvenance(record),
      }
    })
    .filter((item): item is DeepSignalMatch => Boolean(item))
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
}

function normalizeModelOutputLabels(value: unknown): ModelOutputLabel[] {
  const rows = Array.isArray(value) ? value : objectValue(value) ? [value] : []
  return rows
    .map((item): ModelOutputLabel | null => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const label =
        stringValue(record.label) ||
        stringValue(record.top_label) ||
        stringValue(record.class_name) ||
        stringValue(record.class) ||
        stringValue(record.event_type) ||
        stringValue(record.type)
      if (!label) return null
      return {
        label,
        score: finiteNumber(record.score ?? record.confidence ?? record.probability ?? record.value),
        category: stringValue(record.category ?? record.event_family ?? record.type),
      }
    })
    .filter((item): item is ModelOutputLabel => Boolean(item))
}

function normalizeModelOutputs(value: unknown): SineModelOutput[] {
  return recordArrayFromPayload(value, ["model_outputs", "outputs", "models", "items", "rows", "model", "active_model", "model_registry"]).map((row, index) => {
    const topLabelRows = normalizeModelOutputLabels(row.top_labels)
    const labelRows = topLabelRows.length ? topLabelRows : normalizeModelOutputLabels(row.labels)
    const explicitLabels = labelRows.length ? labelRows : normalizeModelOutputLabels(row.predictions)
    const fallbackLabels = normalizeModelOutputLabels(row)
    const topLabels = explicitLabels.length ? explicitLabels : fallbackLabels
    const labelMapRecord = recordValue(row.label_map ?? row.labels_map ?? row.class_map ?? row.label_map_json)
    const labelCount =
      finiteNumber(row.label_count ?? row.labels_count ?? row.num_labels ?? row.classes_count ?? row.class_count) ??
      (labelMapRecord ? Object.keys(labelMapRecord).length : topLabels.length || null)
    return {
      id: stringValue(row.id) || stringValue(row.model_output_id) || `model-output-${index}`,
      model_id: stringValue(row.model_id ?? row.active_model_id ?? row.registry_model_id ?? row.registry_id ?? row.artifact_id ?? row.checkpoint_id ?? row.runtime_id),
      model_name: stringValue(row.model_name ?? row.model ?? row.name ?? row.engine),
      model_version: stringValue(row.model_version ?? row.version ?? row.detector_version),
      framework: stringValue(row.framework ?? row.inference_framework ?? row.backend_framework),
      runtime: stringValue(row.runtime ?? row.runtime_name ?? row.inference_runtime ?? row.inference_runtime_name ?? row.inference_engine ?? row.engine),
      status: stringValue(row.status ?? row.state),
      artifact_uri: stringValue(row.artifact_uri ?? row.artifact_url ?? row.model_uri ?? row.artifact_path ?? row.model_path ?? row.checkpoint_uri ?? row.checkpoint_url ?? row.checkpoint_path ?? row.export_uri ?? row.export_path),
      model_checksum: stringValue(row.model_checksum ?? row.artifact_checksum ?? row.checkpoint_checksum ?? row.checksum ?? row.sha256 ?? row.artifact_sha256 ?? row.model_artifact_sha256 ?? row.checkpoint_sha256),
      label_map_uri: stringValue(row.label_map_uri ?? row.label_map_url ?? row.label_map_path ?? row.labelmap_uri ?? row.labelmap_path ?? row.labels_uri ?? row.labels_path ?? row.classes_uri ?? row.classes_path),
      label_map_checksum: stringValue(row.label_map_checksum ?? row.labelmap_checksum ?? row.label_map_sha256 ?? row.labelmap_sha256 ?? row.labels_sha256 ?? row.classes_sha256),
      label_count: labelCount,
      domain_heads: textListValue(row.domain_heads ?? row.heads ?? row.output_heads ?? row.classification_heads),
      target_domains: textListValue(row.target_domains ?? row.domains ?? row.domain_coverage ?? row.environments),
      class_families: textListValue(row.class_families ?? row.event_families ?? row.categories ?? row.label_families),
      metrics_uri: stringValue(row.metrics_uri ?? row.metrics_path ?? row.eval_report_uri ?? row.eval_report_path ?? row.confusion_matrix_uri ?? row.confusion_matrix_path),
      training_dataset: stringValue(row.training_dataset ?? row.dataset ?? row.dataset_id ?? row.training_corpus ?? row.training_run_id ?? row.source_dataset),
      input_sample_rate_hz: finiteNumber(row.input_sample_rate_hz ?? row.sample_rate_hz ?? row.sample_rate),
      window_samples: finiteNumber(row.window_samples ?? row.num_samples ?? row.samples),
      embedding_dim: finiteNumber(row.embedding_dim ?? row.embedding_dimension ?? row.vector_dim),
      device: stringValue(row.device ?? row.inference_device ?? row.accelerator),
      backend_commit: stringValue(row.backend_commit ?? row.git_commit ?? row.git_sha ?? row.service_commit),
      job_id: stringValue(row.job_id ?? row.analysis_job_id ?? row.run_id),
      inference_id: stringValue(row.inference_id ?? row.prediction_id),
      start_sec: finiteNumber(row.start_sec ?? row.start_seconds),
      end_sec: finiteNumber(row.end_sec ?? row.end_seconds),
      ood_score: finiteNumber(row.ood_score ?? row.out_of_domain_score),
      ood_status: stringValue(row.ood_status ?? row.open_set_status ?? row.out_of_domain_status),
      ood_threshold: finiteNumber(row.ood_threshold ?? row.out_of_domain_threshold),
      min_confidence: finiteNumber(row.min_confidence ?? row.minimum_confidence),
      confidence_margin: finiteNumber(row.confidence_margin ?? row.margin ?? row.top_margin),
      entropy: finiteNumber(row.entropy),
      normalized_entropy: finiteNumber(row.normalized_entropy ?? row.entropy_normalized),
      latency_ms: finiteNumber(row.latency_ms ?? row.runtime_ms ?? row.elapsed_ms),
      top_labels: topLabels,
      feature_params: objectValue(row.feature_params ?? row.params ?? row.metadata),
    }
  })
}

function sineModelMergeKey(output: SineModelOutput) {
  return [
    output.model_id,
    output.id,
    output.model_name,
    output.model_version,
    output.artifact_uri,
    output.model_checksum,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase()
}

function sineModelLookupId(output: SineModelOutput | null | undefined) {
  const candidate = output?.model_id || output?.id || ""
  if (!candidate || /^model-output-\d+$/i.test(candidate)) return ""
  return candidate
}

function normalizeFusionEvidence(value: unknown): FusionEvidence[] {
  return recordArrayFromPayload(value, ["fusion_evidence", "evidence", "items", "rows"]).map((row, index) => ({
    id: stringValue(row.id) || stringValue(row.evidence_id) || `fusion-evidence-${index}`,
    kind: stringValue(row.kind ?? row.source ?? row.type) || "evidence",
    label:
      stringValue(row.label) ||
      stringValue(row.detector_label) ||
      stringValue(row.prototype_label) ||
      stringValue(row.event_type),
    event_family: stringValue(row.event_family ?? row.family ?? row.category),
    event_type: stringValue(row.event_type ?? row.type),
    model: stringValue(row.model ?? row.model_name ?? row.model_version ?? row.detector),
    weight: finiteNumber(row.weight ?? row.fusion_weight),
    score: finiteNumber(row.score ?? row.confidence ?? row.similarity),
    event_id: stringValue(row.event_id ?? row.detector_event_id ?? row.model_output_id),
    prototype_id: stringValue(row.prototype_id ?? row.prototype_match_id),
    model_id: stringValue(row.model_id ?? row.active_model_id ?? row.registry_id ?? row.artifact_id),
    model_output_id: stringValue(row.model_output_id ?? row.output_id ?? row.inference_id),
    detector_event_id: stringValue(row.detector_event_id),
    vector_checksum: stringValue(row.vector_checksum ?? row.vector_sha256 ?? row.embedding_checksum ?? row.embedding_sha256 ?? row.sha256 ?? row.checksum),
    detail: stringValue(row.detail ?? row.description ?? row.reason),
  }))
}

function normalizePrototypeCatalog(value: unknown): SinePrototypeCatalogEntry[] {
  return recordArrayFromPayload(value, ["prototypes", "prototype_catalog", "catalog", "items", "rows"]).map((row, index) => {
    const label =
      stringValue(row.label) ||
      stringValue(row.name) ||
      stringValue(row.prototype_label) ||
      stringValue(row.class_name) ||
      stringValue(row.event_type) ||
      stringValue(row.category)
    const id =
      stringValue(row.id) ||
      stringValue(row.prototype_id) ||
      stringValue(row.registry_id) ||
      stringValue(row.embedding_id) ||
      (label ? `prototype-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : `prototype-${index}`)
    return {
      id,
      label: label || id,
      domain: stringValue(row.domain ?? row.acoustic_domain ?? row.environment),
      category: stringValue(row.category ?? row.event_family ?? row.type),
      source: stringValue(row.source ?? row.source_id ?? row.source_name ?? row.source_dataset ?? row.dataset ?? row.training_dataset),
      model_id: stringValue(row.model_id ?? row.embedding_model_id ?? row.embedding_model ?? row.model_name ?? row.model),
      embedding_dim: finiteNumber(row.embedding_dim ?? row.embedding_dimension ?? row.vector_dim ?? row.dimensions),
      vector_checksum: stringValue(
        row.vector_checksum ??
          row.vector_sha256 ??
          row.embedding_checksum ??
          row.embedding_sha256 ??
          row.prototype_sha256 ??
          row.prototype_checksum ??
          row.fingerprint_sha256 ??
          row.fingerprint_checksum ??
          row.checksum ??
          row.sha256,
      ),
      prototype_count: finiteNumber(row.prototype_count ?? row.count ?? row.examples ?? row.example_count),
      license: stringValue(row.license),
      updated_at: stringValue(row.updated_at ?? row.created_at ?? row.last_built_at),
    }
  })
}

function transcriptEvidenceBadges(
  transcript: SoundTranscript,
  fusionRows: FusionEvidence[],
  modelOutputs: SineModelOutput[],
) {
  const badges = new Set<string>()
  const evidenceIds = new Set([...(transcript.evidence_ids ?? []), ...(transcript.fusion_evidence_ids ?? [])])
  const modelOutputIds = new Set(transcript.model_output_ids ?? [])
  const detectorEventIds = new Set(transcript.detector_event_ids ?? [])
  const prototypeIds = new Set(transcript.prototype_ids ?? [])

  if (transcript.evidence_summary) badges.add(transcript.evidence_summary)
  if (transcript.method) badges.add(cleanLabel(transcript.method))
  if (transcript.detector_id) badges.add(cleanLabel(transcript.detector_id))
  if (transcript.event_family) badges.add(cleanLabel(transcript.event_family))

  fusionRows.forEach((row) => {
    const id = row.id || ""
    const eventId = row.event_id || ""
    const prototypeId = row.prototype_id || ""
    const matches =
      evidenceIds.has(id) ||
      detectorEventIds.has(eventId) ||
      modelOutputIds.has(eventId) ||
      prototypeIds.has(prototypeId)
    if (!matches) return
    const label = cleanLabel(row.label || row.event_type || row.event_family || row.kind)
    const score = row.score != null ? ` ${formatPercent(row.score)}` : row.weight != null ? ` w ${row.weight.toFixed(2)}` : ""
    badges.add(`${label}${score}`)
  })

  modelOutputs.forEach((output) => {
    const id = output.id || ""
    if (!modelOutputIds.has(id)) return
    const modelName = [output.model_name, output.model_version].filter(Boolean).join(" ") || output.framework || "model"
    const top = output.top_labels[0]
    badges.add(`${cleanLabel(modelName)}${top?.score != null ? ` ${formatPercent(top.score)}` : ""}`)
  })

  return Array.from(badges).slice(0, 8)
}

function buildPrototypeNeighbors(
  matches: DeepSignalMatch[],
  fusionRows: FusionEvidence[],
): PrototypeNeighbor[] {
  const rows: PrototypeNeighbor[] = [
    ...matches
      .filter((match) => match.evidence_proven)
      .map((match, index) => ({
        id: `deep-${match.prototype_id || match.vector_checksum || match.label}-${match.segment_start ?? "x"}-${index}`,
        label: match.label,
        score: match.score,
        source: match.source,
        segment_start: match.segment_start,
        segment_end: match.segment_end,
        category: match.category,
        prototype_id: match.prototype_id,
        model: match.model,
        model_id: match.model_id,
        embedding_dim: match.embedding_dim,
        vector_checksum: match.vector_checksum,
        distance: match.distance,
        detail: null,
        evidence_kind: "deep_signal" as const,
        evidence_proven: true,
      })),
    ...fusionRows
      .filter((row) => row.prototype_id && fusionEvidenceHasModelOrPrototypeProof(row))
      .map((row, index) => ({
        id: `fusion-${row.id || row.prototype_id || row.vector_checksum || index}`,
        label: row.label || row.event_type || row.event_family || row.prototype_id || "prototype evidence",
        score: row.score ?? row.weight,
        source: row.kind,
        segment_start: null,
        segment_end: null,
        category: row.event_family || row.event_type,
        prototype_id: row.prototype_id,
        model: row.model,
        model_id: row.model_id,
        embedding_dim: null,
        vector_checksum: row.vector_checksum,
        distance: null,
        detail: row.detail,
        evidence_kind: "fusion" as const,
        evidence_proven: true,
      })),
  ]
  const seen = new Set<string>()
  return rows
    .filter((row) => {
      const key = [row.evidence_kind, row.prototype_id, row.label, row.segment_start, row.segment_end, row.model].join("|")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => (right.score ?? -1) - (left.score ?? -1))
}

function normalizeDiagnostics(value: unknown): [string, string][] {
  if (!value || typeof value !== "object") return []
  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]): [string, string] | null => {
      if (rawValue == null) return null
      if (typeof rawValue === "number") {
        const formatted =
          key.toLowerCase().includes("latency")
            ? `${rawValue.toFixed(rawValue >= 100 ? 0 : 1)} ms`
            : Number.isInteger(rawValue)
              ? rawValue.toLocaleString()
              : rawValue.toFixed(3)
        return [cleanLabel(key), formatted]
      }
      if (typeof rawValue === "string" || typeof rawValue === "boolean") return [cleanLabel(key), String(rawValue)]
      return [cleanLabel(key), JSON.stringify(rawValue)]
    })
    .filter((row): row is [string, string] => Boolean(row))
    .slice(0, 8)
}

function normalizeNumberMap(value: unknown): Record<string, number> | undefined {
  const record = recordValue(value)
  if (!record) return undefined
  const rows = Object.entries(record)
    .map(([key, rawValue]): [string, number] | null => {
      const numeric = finiteNumber(rawValue)
      return numeric == null ? null : [key, numeric]
    })
    .filter((row): row is [string, number] => Boolean(row))
  return rows.length ? Object.fromEntries(rows) : undefined
}

function normalizeStringMap(value: unknown): Record<string, string> | undefined {
  const record = recordValue(value)
  if (!record) return undefined
  const rows = Object.entries(record)
    .map(([key, rawValue]): [string, string] | null => {
      const text = stringValue(rawValue) || (rawValue == null ? null : String(rawValue))
      return text ? [key, text] : null
    })
    .filter((row): row is [string, string] => Boolean(row))
  return rows.length ? Object.fromEntries(rows) : undefined
}

function normalizeIdentificationSummary(value: unknown): IdentificationSummary | undefined {
  const record = recordValue(value)
  if (!record) return undefined

  const topLabel =
    stringValue(record.top_label) ||
    stringValue(record.label) ||
    stringValue(record.sound_source) ||
    stringValue(record.class_name) ||
    stringValue(record.class) ||
    stringValue(record.event_type) ||
    stringValue(record.type) ||
    stringValue(record.category)
  const confidence = finiteNumber(record.confidence ?? record.score ?? record.probability)
  const dominantFrequency = finiteNumber(
    record.dominant_frequency_hz ??
      record.dominant_freq_hz ??
      record.peak_frequency_hz ??
      record.frequency_hz,
  )
  const detectorCounts = normalizeNumberMap(record.detector_counts)
  const detectorStatus = normalizeStringMap(record.detector_status)
  const status = stringValue(record.status ?? record.identification_status)
  const engine = stringValue(record.engine ?? record.analysis_engine ?? record.detector)
  const model = stringValue(record.model ?? record.model_version ?? record.detector_version)

  if (!topLabel && confidence == null && dominantFrequency == null && !detectorCounts && !detectorStatus && !status && !engine && !model) {
    return undefined
  }

  return {
    top_label: topLabel,
    label: stringValue(record.label) || topLabel,
    category: stringValue(record.category),
    type: stringValue(record.type ?? record.event_type),
    confidence,
    ood_score: finiteNumber(record.ood_score ?? record.out_of_domain_score),
    ood_status: stringValue(record.ood_status ?? record.open_set_status ?? record.out_of_domain_status),
    status,
    engine,
    model,
    dominant_frequency_hz: dominantFrequency,
    detector_counts: detectorCounts,
    detector_status: detectorStatus,
  }
}

function normalizeAnalysisPayload(payload: AnalysisPayload): AnalysisPayload {
  const classification = recordValue(payload.classification) ?? {}
  const identificationSummary =
    normalizeIdentificationSummary(payload.identification_summary) ||
    normalizeIdentificationSummary(classification.identification_summary) ||
    normalizeIdentificationSummary(payload.summary) ||
    normalizeIdentificationSummary(classification.summary)

  const normalized: AnalysisPayload = {
    ...classification,
    ...payload,
    frequency_detections: payload.frequency_detections || (classification.frequency_detections as unknown[] | undefined),
    activity_segments: payload.activity_segments || (classification.activity_segments as unknown[] | undefined),
    bird_detections: payload.bird_detections || (classification.bird_detections as unknown[] | undefined),
    uav_detections: payload.uav_detections || (classification.uav_detections as unknown[] | undefined),
    animal_detections: payload.animal_detections || (classification.animal_detections as unknown[] | undefined),
    insect_detections: payload.insect_detections || (classification.insect_detections as unknown[] | undefined),
    air_propeller_detections:
      payload.air_propeller_detections || (classification.air_propeller_detections as unknown[] | undefined),
    water_propeller_detections:
      payload.water_propeller_detections || (classification.water_propeller_detections as unknown[] | undefined),
    vessel_detections: payload.vessel_detections || (classification.vessel_detections as unknown[] | undefined),
    impulse_detections: payload.impulse_detections || (classification.impulse_detections as unknown[] | undefined),
    weather_detections: payload.weather_detections || (classification.weather_detections as unknown[] | undefined),
    ground_seismic_detections:
      payload.ground_seismic_detections || (classification.ground_seismic_detections as unknown[] | undefined),
    mechanical_detections: payload.mechanical_detections || (classification.mechanical_detections as unknown[] | undefined),
    geophysical_detections: payload.geophysical_detections || (classification.geophysical_detections as unknown[] | undefined),
    unknown_pattern_detections:
      payload.unknown_pattern_detections || (classification.unknown_pattern_detections as unknown[] | undefined),
    nps_detections: payload.nps_detections || (classification.nps_detections as unknown[] | undefined),
    deep_signal_matches: payload.deep_signal_matches || (classification.deep_signal_matches as unknown[] | undefined),
    model_outputs: payload.model_outputs || (classification.model_outputs as unknown[] | undefined),
    fusion_evidence: payload.fusion_evidence || (classification.fusion_evidence as unknown[] | undefined),
    sound_transcripts: payload.sound_transcripts || (classification.sound_transcripts as unknown[] | undefined),
    events: payload.events || payload.detector_events || (classification.events as unknown[] | undefined),
    detector_events:
      payload.detector_events || payload.events || (classification.detector_events as unknown[] | undefined),
    visualisation: payload.visualisation || (classification.visualisation as Visualisation | undefined),
    diagnostics: payload.diagnostics || (classification.diagnostics as Record<string, unknown> | undefined),
    model_context:
      payload.model_context ||
      (classification.model_context as Record<string, unknown> | undefined) ||
      (recordValue(payload.diagnostics)?.model_context as Record<string, unknown> | undefined) ||
      (recordValue(classification.diagnostics)?.model_context as Record<string, unknown> | undefined),
  }

  const derivedSummary = deriveIdentificationSummaryFromAnalysis(normalized)
  const finalSummary =
    identificationSummary?.top_label || identificationSummary?.label
      ? identificationSummary
      : derivedSummary
        ? {
            ...derivedSummary,
            ...identificationSummary,
            top_label: identificationSummary?.top_label || derivedSummary.top_label,
            label: identificationSummary?.label || derivedSummary.label,
            confidence: identificationSummary?.confidence ?? derivedSummary.confidence,
            dominant_frequency_hz: identificationSummary?.dominant_frequency_hz ?? derivedSummary.dominant_frequency_hz,
            detector_counts: identificationSummary?.detector_counts ?? derivedSummary.detector_counts,
            detector_status: identificationSummary?.detector_status ?? derivedSummary.detector_status,
          }
        : identificationSummary

  return {
    ...normalized,
    identification_summary: finalSummary,
  }
}

function eventTimeLabel(event: DetectionEvent) {
  if (event.start_sec == null || event.end_sec == null) return "-"
  return `${event.start_sec.toFixed(2)}-${event.end_sec.toFixed(2)}s`
}

function eventStableKey(event: DetectionEvent) {
  return [
    event.detector_id,
    event.label,
    event.start_sec?.toFixed(4) ?? "",
    event.end_sec?.toFixed(4) ?? "",
    event.peak_sec?.toFixed(4) ?? "",
    event.frequency_hz?.toFixed(2) ?? "",
  ].join("|")
}

function eventAnchorTime(event: DetectionEvent) {
  return event.peak_sec ?? event.start_sec ?? event.end_sec ?? null
}

function eventReviewSnapshot(event: DetectionEvent | null) {
  if (!event) return null
  return {
    detector_event_key: eventStableKey(event),
    detector_id: event.detector_id,
    detector_label: detectorLabel(event.detector_id),
    label: event.label,
    confidence: event.confidence ?? null,
    start_sec: event.start_sec ?? null,
    end_sec: event.end_sec ?? null,
    peak_sec: event.peak_sec ?? null,
    anchor_sec: eventAnchorTime(event),
    frequency_hz: event.frequency_hz ?? null,
    frequency_min_hz: event.frequency_min_hz ?? null,
    frequency_max_hz: event.frequency_max_hz ?? null,
    category: event.category ?? null,
    acoustic_domain: event.acoustic_domain ?? null,
    event_family: event.event_family ?? null,
    event_type: event.event_type ?? null,
    method: event.method ?? null,
    model: event.model ?? event.model_version ?? event.engine ?? null,
    metadata: event.metadata ?? null,
  }
}

function detectorLabel(detector: string) {
  return normalizedFamilyLabels[detector] || detectorLabels[detector] || cleanLabel(detector)
}

function eventColor(event: DetectionEvent) {
  return normalizedFamilyColors[event.event_family ?? ""] || detectorColors[event.detector_id] || detectorColors.sine
}

function eventGroupKey(event: DetectionEvent) {
  return event.event_family || detectorFamilyFallbacks[event.detector_id] || event.detector_id
}

function eventGroupLabel(key: string) {
  return normalizedFamilyLabels[key] || detectorLabel(key)
}

function eventGroupColor(key: string) {
  return normalizedFamilyColors[key] || detectorColors[key] || detectorColors.sine
}

function detectorLayer(detector: string): DetectorLayer {
  const family = canonicalEventFamily(detectorFamilyFallbacks[detector] || detector, detector)
  if (["frequency_fft", "activity_auditok", "visualisation_sonic"].includes(detector)) return "physics"
  if (["deep_signal_features", "nps_discovery_match"].includes(detector) || family === "prototype_match") return "representation"
  if (
    [
      "animal_life",
      "insect",
      "air_propeller",
      "water_propeller",
      "vessel_engine",
      "impulse_explosion",
      "weather_lightning",
      "ground_seismic",
      "mechanical",
      "geophysical",
      "unknown_pattern",
    ].includes(family || "")
  ) {
    return "semantic"
  }
  return "other"
}

function acousticEventText(event: DetectionEvent) {
  const metadataText = event.metadata ? JSON.stringify(event.metadata) : ""
  return [
    event.detector_id,
    event.label,
    event.category,
    event.acoustic_domain,
    event.event_family,
    event.event_type,
    event.engine,
    event.method,
    event.model,
    event.model_version,
    metadataText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function eventMatchesTerms(event: DetectionEvent, terms: string[]) {
  const text = acousticEventText(event)
  return terms.some((term) => text.includes(term))
}

function colorRamp(norm: number, palette: SpectrogramPalette = "marine"): [number, number, number] {
  const v = Math.max(0, Math.min(1, norm))
  if (palette === "oscilloscope") {
    if (v < 0.28) {
      const t = v / 0.28
      return [Math.floor(2 + t * 6), Math.floor(18 + t * 72), Math.floor(9 + t * 18)]
    }
    if (v < 0.72) {
      const t = (v - 0.28) / 0.44
      return [Math.floor(8 + t * 34), Math.floor(90 + t * 150), Math.floor(27 + t * 58)]
    }
    const t = (v - 0.72) / 0.28
    return [Math.floor(42 + t * 190), Math.floor(240 + t * 15), Math.floor(85 + t * 95)]
  }
  if (palette === "plasma") {
    if (v < 0.35) {
      const t = v / 0.35
      return [Math.floor(13 + t * 70), Math.floor(8 + t * 20), Math.floor(135 + t * 65)]
    }
    if (v < 0.72) {
      const t = (v - 0.35) / 0.37
      return [Math.floor(83 + t * 150), Math.floor(28 + t * 70), Math.floor(200 - t * 110)]
    }
    const t = (v - 0.72) / 0.28
    return [Math.floor(233 + t * 22), Math.floor(98 + t * 150), Math.floor(90 - t * 60)]
  }
  if (palette === "thermal") {
    if (v < 0.22) {
      const t = v / 0.22
      return [Math.floor(5 + t * 45), Math.floor(8 + t * 10), Math.floor(18 + t * 70)]
    }
    if (v < 0.62) {
      const t = (v - 0.22) / 0.4
      return [Math.floor(50 + t * 170), Math.floor(18 + t * 65), Math.floor(88 - t * 60)]
    }
    const t = (v - 0.62) / 0.38
    return [Math.floor(220 + t * 35), Math.floor(83 + t * 145), Math.floor(28 + t * 200)]
  }
  if (v < 0.25) {
    const t = v / 0.25
    return [Math.floor(5 + t * 20), Math.floor(10 + t * 30), Math.floor(28 + t * 90)]
  }
  if (v < 0.58) {
    const t = (v - 0.25) / 0.33
    return [Math.floor(25 - t * 20), Math.floor(40 + t * 120), Math.floor(118 + t * 90)]
  }
  if (v < 0.82) {
    const t = (v - 0.58) / 0.24
    return [Math.floor(5 + t * 150), Math.floor(160 + t * 75), Math.floor(208 - t * 150)]
  }
  const t = (v - 0.82) / 0.18
  return [Math.floor(155 + t * 100), Math.floor(235 - t * 40), Math.floor(58 - t * 25)]
}

function axisSample(axis: number[] | undefined, target: number, maxIndex: number, fallbackRatio: number) {
  if (!axis?.length || maxIndex <= 0) {
    const position = clampNumber(fallbackRatio, 0, 1) * Math.max(0, maxIndex)
    const lower = Math.floor(position)
    const upper = Math.min(maxIndex, lower + 1)
    return { lower, upper, fraction: position - lower }
  }

  const cappedIndex = Math.min(maxIndex, axis.length - 1)
  const first = axis[0]
  const last = axis[cappedIndex]
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    const position = clampNumber(fallbackRatio, 0, 1) * Math.max(0, maxIndex)
    const lower = Math.floor(position)
    const upper = Math.min(maxIndex, lower + 1)
    return { lower, upper, fraction: position - lower }
  }

  const ascending = last >= first
  const min = ascending ? first : last
  const max = ascending ? last : first
  const clampedTarget = clampNumber(target, min, max)
  let low = 0
  let high = cappedIndex

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const value = axis[mid]
    if ((ascending && value < clampedTarget) || (!ascending && value > clampedTarget)) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const upper = Math.max(0, Math.min(cappedIndex, low))
  const lower = Math.max(0, Math.min(cappedIndex, upper - 1))
  const lowerValue = axis[lower]
  const upperValue = axis[upper]
  const span = upperValue - lowerValue
  const fraction = span === 0 ? 0 : clampNumber((clampedTarget - lowerValue) / span, 0, 1)

  return { lower, upper, fraction }
}

function finitePowerAt(power: number[][], row: number, col: number, fallback: number) {
  const value = power[row]?.[col]
  return Number.isFinite(value) ? value : fallback
}

function bilinearPowerAt(
  power: number[][],
  row: ReturnType<typeof axisSample>,
  col: ReturnType<typeof axisSample>,
  fallback: number,
) {
  const v00 = finitePowerAt(power, row.lower, col.lower, fallback)
  const v01 = finitePowerAt(power, row.lower, col.upper, v00)
  const v10 = finitePowerAt(power, row.upper, col.lower, v00)
  const v11 = finitePowerAt(power, row.upper, col.upper, v10)
  const top = v00 + (v01 - v00) * col.fraction
  const bottom = v10 + (v11 - v10) * col.fraction
  return top + (bottom - top) * row.fraction
}

function percentile(sortedValues: number[], ratio: number) {
  if (!sortedValues.length) return null
  const index = Math.max(0, Math.min(sortedValues.length - 1, Math.floor((sortedValues.length - 1) * ratio)))
  return sortedValues[index]
}

function computePowerScale(power: number[][], rowIndexes: number[]) {
  const values: number[] = []
  rowIndexes.forEach((rowIndex) => {
    power[rowIndex]?.forEach((value) => {
      if (Number.isFinite(value)) values.push(value)
    })
  })
  if (!values.length) {
    return { colorMin: -120, colorMax: -35, labelMin: -120, labelMax: -35 }
  }
  values.sort((left, right) => left - right)
  const labelMin = values[0]
  const labelMax = values[values.length - 1]
  let colorMin = percentile(values, 0.04) ?? labelMin
  let colorMax = percentile(values, 0.985) ?? labelMax
  if (colorMax - colorMin < 8) {
    const center = (colorMax + colorMin) / 2
    colorMin = center - 4
    colorMax = center + 4
  }
  return { colorMin, colorMax, labelMin, labelMax }
}

function modelOutputCanvasLabel(output: SineModelOutput) {
  const topLabel = output.top_labels[0]
  const label = topLabel?.label || output.status || output.model_name || "model output"
  const score =
    topLabel?.score != null && Number.isFinite(topLabel.score)
      ? topLabel.score <= 1
        ? ` ${Math.round(topLabel.score * 100)}%`
        : ` ${topLabel.score.toFixed(2)}`
      : ""
  return `${label}${score}`
}

function drawPhosphorSpot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: [number, number, number],
  alpha: number,
) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`)
  glow.addColorStop(0.38, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha * 0.28})`)
  glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`)
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawSineCanvas(
  canvas: HTMLCanvasElement,
  vis: Visualisation | null,
  events: DetectionEvent[],
  transcripts: SoundTranscript[],
  modelOutputs: SineModelOutput[],
  durationSec: number,
  currentTime: number,
  hoverTime: number | null,
  hoverFrequencyHz: number | null,
  hoverAmplitude: number | null,
  hoverPowerDb: number | null,
  selectionStart: number | null,
  selectionEnd: number | null,
  markers: WaveMarker[],
  zoomStart: number | null,
  zoomEnd: number | null,
  options: ScopeOptions,
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.imageSmoothingEnabled = false

  const width = canvas.width
  const height = canvas.height
  const plotTop = 20
  const laneRows = Math.round(clampNumber(options.laneRows, 2, 8))
  const laneTop = Math.floor(height * (options.showEventLanes ? 0.76 : 0.84))
  const navigatorHeight = 22
  const navigatorBottom = height - 6
  const navigatorTop = navigatorBottom - navigatorHeight
  const plotHeight = laneTop - plotTop - 12
  const laneHeight = Math.max(24, navigatorTop - laneTop - 6)
  const duration = Math.max(durationSec || vis?.duration_sec || 0, 0.001)
  const sampleRate = finiteNumber(vis?.sample_rate_hz) ?? 0
  const viewStart = zoomStart != null && zoomEnd != null ? Math.max(0, Math.min(duration, Math.min(zoomStart, zoomEnd))) : 0
  const viewEnd = zoomStart != null && zoomEnd != null ? Math.max(viewStart + 0.001, Math.min(duration, Math.max(zoomStart, zoomEnd))) : duration
  const viewSpan = Math.max(0.001, viewEnd - viewStart)
  const timeToX = (time: number) => ((time - viewStart) / viewSpan) * width
  const xToTime = (x: number) => viewStart + (x / width) * viewSpan
  const timeToWaterfallY = (time: number) => plotTop + ((time - viewStart) / viewSpan) * plotHeight
  const { frequencyMinHz, frequencyMaxHz, frequencySpanHz } = resolveScopeFrequencyRange(vis, options)
  const waterfallMode = options.visualMode === "waterfall"
  const frequencyToWaterfallX = (frequencyHz: number) => {
    const norm = clampNumber((frequencyHz - frequencyMinHz) / frequencySpanHz, 0, 1)
    return norm * width
  }
  const frequencyToY = (frequencyHz: number) => {
    const norm = clampNumber((frequencyHz - frequencyMinHz) / frequencySpanHz, 0, 1)
    return plotTop + (1 - norm) * plotHeight
  }

  ctx.fillStyle = "#05070c"
  ctx.fillRect(0, 0, width, height)

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.06)")
  gradient.addColorStop(0.55, "rgba(14, 165, 233, 0.02)")
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.38)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.strokeStyle = "rgba(103, 232, 249, 0.18)"
  ctx.lineWidth = 1.4
  ctx.strokeRect(0.5, plotTop - 0.5, width - 1, plotHeight + 1)
  ctx.strokeStyle = "rgba(15, 23, 42, 0.92)"
  ctx.lineWidth = 2
  ctx.strokeRect(2.5, plotTop + 1.5, width - 5, plotHeight - 3)
  ctx.restore()

  if (options.showGrid) {
    const majorTimeDivisions = 10
    const minorPerDivision = 5
    const verticalDivisions = 8

    ctx.save()
    ctx.strokeStyle = "rgba(34, 211, 238, 0.045)"
    ctx.lineWidth = 0.7
    for (let i = 0; i <= majorTimeDivisions * minorPerDivision; i += 1) {
      const x = Math.round((i / (majorTimeDivisions * minorPerDivision)) * width) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, laneTop - 4)
      ctx.stroke()
    }
    for (let i = 0; i <= verticalDivisions * minorPerDivision; i += 1) {
      const y = Math.round(plotTop + (i / (verticalDivisions * minorPerDivision)) * plotHeight) + 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()

    for (let i = 0; i <= 50; i += 1) {
      const x = (i / 50) * width
      ctx.strokeStyle = i % 5 === 0 ? "rgba(34, 211, 238, 0.18)" : "rgba(34, 211, 238, 0.07)"
      ctx.lineWidth = i % 5 === 0 ? 1.2 : 0.7
      ctx.beginPath()
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, laneTop - 4)
      ctx.stroke()
    }
    for (let i = 0; i <= 24; i += 1) {
      const y = plotTop + (i / 24) * plotHeight
      ctx.strokeStyle = i % 4 === 0 ? "rgba(34, 211, 238, 0.18)" : "rgba(34, 211, 238, 0.065)"
      ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.7
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.strokeStyle = "rgba(103, 232, 249, 0.28)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, plotTop + plotHeight * 0.52)
    ctx.lineTo(width, plotTop + plotHeight * 0.52)
    ctx.stroke()

    ctx.save()
    ctx.fillStyle = "rgba(103, 232, 249, 0.62)"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${(viewSpan / 10).toFixed(viewSpan / 10 >= 1 ? 2 : 3)}s/div`, 12, plotTop + 16)
    ctx.fillText(`${formatHz(frequencySpanHz / 8)}/div`, 12, plotTop + 31)
    ctx.textAlign = "right"
    ctx.fillText("SINE scope", width - 12, plotTop + 16)
    if (sampleRate > 0) {
      ctx.fillText(`${sampleRate.toLocaleString()} Hz source`, width - 12, plotTop + 31)
    }
    ctx.restore()
  }

  if (options.showBandGuides && options.visualMode !== "waterfall") {
    drawAcousticReferenceStrip(ctx, 12, plotTop + 38, Math.max(1, width - 24), frequencyMinHz, frequencyMaxHz)
  }

  const power = vis?.spectrogram?.power_db
  if (options.visualMode === "spectrum" && power?.length && power[0]?.length) {
    const frequencies = vis?.spectrogram?.frequencies
    const spectrogramTimes = vis?.spectrogram?.times
    const cols = power[0].length
    const rowInfos = power
      .map((row, index) => {
        const frequency =
          frequencies?.length === power.length
            ? frequencies[index]
            : frequencyMinHz + (index / Math.max(1, power.length - 1)) * frequencySpanHz
        return { row, index, frequency }
      })
      .filter(
        (item): item is { row: number[]; index: number; frequency: number } =>
          Number.isFinite(item.frequency) && item.frequency >= frequencyMinHz && item.frequency <= frequencyMaxHz,
      )
    const columnIndexes = Array.from({ length: cols }, (_, index) => index).filter((colIndex) => {
      const time = spectrogramTimes?.[colIndex] ?? (colIndex / Math.max(1, cols - 1)) * duration
      return Number.isFinite(time) && time >= viewStart && time <= viewEnd
    })
    const safeColumnIndexes = columnIndexes.length ? columnIndexes : Array.from({ length: cols }, (_, index) => index)
    const bars = rowInfos
      .map((item) => {
        let linearTotal = 0
        let count = 0
        safeColumnIndexes.forEach((colIndex) => {
          const value = item.row[colIndex]
          if (!Number.isFinite(value)) return
          linearTotal += dbToLinear(value)
          count += 1
        })
        const avgDb = count ? linearToDb(linearTotal / count) : null
        return avgDb == null ? null : { frequency: item.frequency, avgDb, rowIndex: item.index }
      })
      .filter((item): item is { frequency: number; avgDb: number; rowIndex: number } => Boolean(item))
      .sort((left, right) => left.frequency - right.frequency)

    if (bars.length) {
      const sortedDb = bars.map((bar) => bar.avgDb).sort((left, right) => left - right)
      let colorMin = percentile(sortedDb, 0.04) ?? sortedDb[0]
      let colorMax = percentile(sortedDb, 0.985) ?? sortedDb[sortedDb.length - 1]
      if (colorMax - colorMin < 8) {
        const center = (colorMin + colorMax) / 2
        colorMin = center - 4
        colorMax = center + 4
      }
      const span = colorMax - colorMin || 1
      const axisBottom = laneTop - 24
      const barAreaHeight = Math.max(1, axisBottom - plotTop)

      if (options.showBandGuides) {
        acousticBandGuides.forEach((band) => {
          const start = Math.max(frequencyMinHz, band.minHz)
          const end = Math.min(frequencyMaxHz, band.maxHz)
          if (end <= start) return
          const x = ((start - frequencyMinHz) / frequencySpanHz) * width
          const w = Math.max(1, ((end - start) / frequencySpanHz) * width)
          ctx.fillStyle = band.color
          ctx.fillRect(x, plotTop, w, barAreaHeight)
          if (w > 54) {
            ctx.save()
            ctx.translate(x + 8, plotTop + 14)
            ctx.fillStyle = "rgba(226, 232, 240, 0.68)"
            ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
            ctx.textAlign = "left"
            ctx.fillText(band.label, 0, 0)
            ctx.restore()
          }
        })
      }

      ctx.strokeStyle = "rgba(103, 232, 249, 0.32)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, axisBottom)
      ctx.lineTo(width, axisBottom)
      ctx.stroke()

      const maxBarWidth = Math.max(2, width / Math.max(48, bars.length))
      bars.forEach((bar) => {
        const xCenter = ((bar.frequency - frequencyMinHz) / frequencySpanHz) * width
        const normalized = clampNumber((bar.avgDb - colorMin) / span, 0, 1)
        const barHeight = Math.max(1, normalized * barAreaHeight)
        const [r, g, b] = colorRamp(normalized, options.palette)
        const x = Math.max(0, Math.min(width - 1, xCenter - maxBarWidth / 2))
        const y = axisBottom - barHeight
        const gradient = ctx.createLinearGradient(0, y, 0, axisBottom)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.18)`)
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, Math.max(1, maxBarWidth - 1), barHeight)
      })

      if (options.showPeakMarkers) {
        bars
          .slice()
          .sort((left, right) => right.avgDb - left.avgDb)
          .slice(0, 6)
          .forEach((bar, index) => {
            const normalized = clampNumber((bar.avgDb - colorMin) / span, 0, 1)
            const x = ((bar.frequency - frequencyMinHz) / frequencySpanHz) * width
            const y = axisBottom - Math.max(1, normalized * barAreaHeight)
            ctx.strokeStyle = index === 0 ? "rgba(251, 191, 36, 0.98)" : "rgba(103, 232, 249, 0.72)"
            ctx.lineWidth = index === 0 ? 2 : 1.2
            ctx.beginPath()
            ctx.moveTo(x, y - 10)
            ctx.lineTo(x, axisBottom)
            ctx.stroke()
            ctx.fillStyle = index === 0 ? "rgba(254, 243, 199, 0.96)" : "rgba(224, 242, 254, 0.86)"
            ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
            ctx.textAlign = "center"
            ctx.fillText(formatHz(bar.frequency), Math.max(34, Math.min(width - 34, x)), Math.max(plotTop + 12, y - 14))
          })
      }

      ctx.fillStyle = "rgba(226, 232, 240, 0.82)"
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "left"
      ctx.fillText(`${colorMin.toFixed(0)} to ${colorMax.toFixed(0)} dB`, 12, laneTop - 8)
      ctx.textAlign = "right"
      ctx.fillText("Frequency spectrum / visible window", width - 12, laneTop - 8)

      for (let tick = 0; tick <= 8; tick += 1) {
        const frequency = frequencyMinHz + (tick / 8) * frequencySpanHz
        const x = (tick / 8) * width
        ctx.strokeStyle = "rgba(103, 232, 249, 0.16)"
        ctx.beginPath()
        ctx.moveTo(x, axisBottom)
        ctx.lineTo(x, axisBottom + 6)
        ctx.stroke()
        ctx.fillStyle = "rgba(148, 163, 184, 0.82)"
        ctx.textAlign = tick === 0 ? "left" : tick === 8 ? "right" : "center"
        ctx.fillText(formatHz(frequency), x, Math.min(laneTop - 3, axisBottom + 17))
      }
    } else {
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)"
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.fillText("Spectrum view needs finite frequency rows in the selected window.", 20, plotTop + plotHeight / 2)
    }
  } else if (options.visualMode === "spectrum") {
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)"
    ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.fillText("Spectrum view needs a waveform-derived spectrogram from MINDEX or the browser scope.", 20, plotTop + plotHeight / 2)
  }

  if (options.visualMode === "waterfall" && power?.length && power[0]?.length) {
    const frequencies = vis?.spectrogram?.frequencies
    const visibleRowIndexes =
      frequencies?.length === power.length
        ? frequencies
            .map((frequency, index) => ({ frequency, index }))
            .filter((item) => Number.isFinite(item.frequency) && item.frequency >= frequencyMinHz && item.frequency <= frequencyMaxHz)
            .map((item) => item.index)
        : power.map((_, index) => index)
    const rowIndexes = visibleRowIndexes.length ? visibleRowIndexes : power.map((_, index) => index)
    const powerScale = computePowerScale(power, rowIndexes)
    const cols = power[0].length
    const span = powerScale.colorMax - powerScale.colorMin || 1
    const spectrogramTimes = vis?.spectrogram?.times
    const image = ctx.createImageData(width, plotHeight)

    for (let y = 0; y < plotHeight; y += 1) {
      const targetTime = viewStart + (y / Math.max(1, plotHeight - 1)) * viewSpan
      const col = axisSample(spectrogramTimes, targetTime, cols - 1, targetTime / duration)
      for (let x = 0; x < width; x += 1) {
        const targetFrequency = frequencyMinHz + (x / Math.max(1, width - 1)) * frequencySpanHz
        const row =
          frequencies?.length === power.length
            ? axisSample(frequencies, targetFrequency, power.length - 1, (targetFrequency - frequencyMinHz) / frequencySpanHz)
            : axisSample(undefined, targetFrequency, power.length - 1, (targetFrequency - frequencyMinHz) / frequencySpanHz)
        const powerValue = bilinearPowerAt(power, row, col, powerScale.colorMin)
        const norm = clampNumber(((powerValue - powerScale.colorMin) / span - 0.5) * options.spectrogramContrast + 0.5, 0, 1)
        const [r, g, b] = colorRamp(norm, options.palette)
        const index = (y * width + x) * 4
        image.data[index] = r
        image.data[index + 1] = g
        image.data[index + 2] = b
        image.data[index + 3] = Math.round(255 * clampNumber(options.spectrogramOpacity, 0.18, 1))
      }
    }
    ctx.putImageData(image, 0, plotTop)

    ctx.save()
    ctx.fillStyle = "rgba(2, 6, 23, 0.1)"
    for (let y = plotTop; y < laneTop - 4; y += 2) {
      ctx.fillRect(0, y, width, 1)
    }
    ctx.globalCompositeOperation = "screen"
    const waterfallGlow = ctx.createRadialGradient(width * 0.5, plotTop + plotHeight * 0.45, 0, width * 0.5, plotTop + plotHeight * 0.45, Math.max(width, plotHeight) * 0.62)
    waterfallGlow.addColorStop(0, "rgba(34, 211, 238, 0.07)")
    waterfallGlow.addColorStop(0.48, "rgba(34, 197, 94, 0.03)")
    waterfallGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = waterfallGlow
    ctx.fillRect(0, plotTop, width, plotHeight)
    ctx.restore()

    if (options.showBandGuides) {
      acousticBandGuides.forEach((band) => {
        const start = Math.max(frequencyMinHz, band.minHz)
        const end = Math.min(frequencyMaxHz, band.maxHz)
        if (end <= start) return
        const x = frequencyToWaterfallX(start)
        const w = Math.max(1, frequencyToWaterfallX(end) - x)
        ctx.fillStyle = band.color
        ctx.fillRect(x, plotTop, w, plotHeight)
        if (w > 54) {
          ctx.save()
          ctx.translate(x + 8, plotTop + 16)
          ctx.fillStyle = "rgba(226, 232, 240, 0.72)"
          ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
          ctx.textAlign = "left"
          ctx.fillText(band.label, 0, 0)
          ctx.restore()
        }
      })
    }

    ctx.save()
    ctx.fillStyle = "rgba(2, 6, 23, 0.7)"
    ctx.fillRect(10, plotTop + 8, 250, 25)
    ctx.strokeStyle = "rgba(103, 232, 249, 0.28)"
    ctx.strokeRect(10.5, plotTop + 8.5, 249, 24)
    ctx.fillStyle = "rgba(224, 242, 254, 0.9)"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText("WATERFALL / frequency x time", 20, plotTop + 24)
    ctx.restore()

    const legendWidth = 120
    const legendHeight = 8
    const legendX = Math.max(14, width - legendWidth - 14)
    const legendY = laneTop - 22
    for (let x = 0; x < legendWidth; x += 1) {
      const [r, g, b] = colorRamp(x / Math.max(1, legendWidth - 1), options.palette)
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(legendX + x, legendY, 1, legendHeight)
    }
    ctx.strokeStyle = "rgba(226, 232, 240, 0.35)"
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight)
    ctx.fillStyle = "rgba(226, 232, 240, 0.78)"
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${powerScale.labelMin.toFixed(0)} dB`, legendX, legendY - 4)
    ctx.textAlign = "right"
    ctx.fillText(`${powerScale.labelMax.toFixed(0)} dB`, legendX + legendWidth, legendY - 4)

    if (options.showPeakMarkers && cols > 1 && rowIndexes.length) {
      const tracePoints = Array.from({ length: cols })
        .map((_, colIndex) => {
          let peakRow = rowIndexes[0]
          let peakPower = -Infinity
          rowIndexes.forEach((rowIndex) => {
            const rawPower = finitePowerAt(power, rowIndex, colIndex, powerScale.colorMin)
            if (rawPower > peakPower) {
              peakPower = rawPower
              peakRow = rowIndex
            }
          })
          const peakFrequency =
            frequencies?.length === power.length
              ? frequencies[peakRow]
              : frequencyMinHz + (peakRow / Math.max(1, power.length - 1)) * frequencySpanHz
          const time = spectrogramTimes?.[colIndex] ?? (colIndex / Math.max(1, cols - 1)) * duration
          return {
            time,
            peakFrequency,
            strength: clampNumber((peakPower - powerScale.colorMin) / span, 0, 1),
          }
        })
        .filter((point) => point.time >= viewStart && point.time <= viewEnd && Number.isFinite(point.peakFrequency))
        .filter((point) => point.strength > 0.72)
        .filter((_, index, list) => index % Math.max(1, Math.ceil(list.length / 100)) === 0)
        .slice(0, 100)

      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      tracePoints.forEach((point) => {
        drawPhosphorSpot(
          ctx,
          frequencyToWaterfallX(point.peakFrequency),
          timeToWaterfallY(point.time),
          4 + point.strength * 11,
          [251, 191, 36],
          0.14 + point.strength * 0.18,
        )
      })
      ctx.restore()
    }
  } else if (options.visualMode !== "waveform" && options.visualMode !== "spectrum" && power?.length && power[0]?.length) {
    const frequencies = vis?.spectrogram?.frequencies
    const visibleRowIndexes =
      frequencies?.length === power.length
        ? frequencies
            .map((frequency, index) => ({ frequency, index }))
            .filter((item) => Number.isFinite(item.frequency) && item.frequency >= frequencyMinHz && item.frequency <= frequencyMaxHz)
            .map((item) => item.index)
        : power.map((_, index) => index)
    const rowIndexes = visibleRowIndexes.length ? visibleRowIndexes : power.map((_, index) => index)
    const powerScale = computePowerScale(power, rowIndexes)
    const cols = power[0].length
    const span = powerScale.colorMax - powerScale.colorMin || 1
    const spectrogramTimes = vis?.spectrogram?.times
    const image = ctx.createImageData(width, plotHeight)
    for (let y = 0; y < plotHeight; y += 1) {
      const targetFrequency = frequencyMinHz + (1 - y / Math.max(1, plotHeight - 1)) * frequencySpanHz
      const row = frequencies?.length === power.length
        ? axisSample(frequencies, targetFrequency, power.length - 1, (targetFrequency - frequencyMinHz) / frequencySpanHz)
        : axisSample(undefined, targetFrequency, power.length - 1, (targetFrequency - frequencyMinHz) / frequencySpanHz)
      for (let x = 0; x < width; x += 1) {
        const targetTime = xToTime(x)
        const col = axisSample(spectrogramTimes, targetTime, cols - 1, targetTime / duration)
        const powerValue = bilinearPowerAt(power, row, col, powerScale.colorMin)
        const norm = clampNumber(((powerValue - powerScale.colorMin) / span - 0.5) * options.spectrogramContrast + 0.5, 0, 1)
        const [r, g, b] = colorRamp(norm, options.palette)
        const index = (y * width + x) * 4
        image.data[index] = r
        image.data[index + 1] = g
        image.data[index + 2] = b
        image.data[index + 3] = Math.round(255 * clampNumber(options.spectrogramOpacity, 0.18, 1))
      }
    }
    ctx.putImageData(image, 0, plotTop)

    ctx.save()
    ctx.fillStyle = "rgba(2, 6, 23, 0.11)"
    for (let y = plotTop; y < laneTop - 4; y += 2) {
      ctx.fillRect(0, y, width, 1)
    }
    ctx.globalCompositeOperation = "screen"
    const scopeGlow = ctx.createRadialGradient(width * 0.5, plotTop + plotHeight * 0.45, 0, width * 0.5, plotTop + plotHeight * 0.45, Math.max(width, plotHeight) * 0.62)
    scopeGlow.addColorStop(0, "rgba(34, 211, 238, 0.08)")
    scopeGlow.addColorStop(0.45, "rgba(34, 197, 94, 0.035)")
    scopeGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = scopeGlow
    ctx.fillRect(0, plotTop, width, plotHeight)
    ctx.restore()

    if (options.showBandGuides) {
      acousticBandGuides.forEach((band) => {
        const start = Math.max(frequencyMinHz, band.minHz)
        const end = Math.min(frequencyMaxHz, band.maxHz)
        if (end <= start) return
        const yTop = frequencyToY(end)
        const yBottom = frequencyToY(start)
        const bandHeight = Math.max(1, yBottom - yTop)
        ctx.fillStyle = band.color
        ctx.fillRect(0, yTop, width, bandHeight)
        if (bandHeight > 24) {
          ctx.fillStyle = "rgba(226, 232, 240, 0.72)"
          ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
          ctx.textAlign = "left"
          ctx.fillText(band.label, 12, yTop + 14)
        }
      })
    }

    const legendWidth = 120
    const legendHeight = 8
    const legendX = 14
    const legendY = laneTop - 22
    for (let x = 0; x < legendWidth; x += 1) {
      const [r, g, b] = colorRamp(x / Math.max(1, legendWidth - 1), options.palette)
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(legendX + x, legendY, 1, legendHeight)
    }
    ctx.strokeStyle = "rgba(226, 232, 240, 0.35)"
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight)
    ctx.fillStyle = "rgba(226, 232, 240, 0.78)"
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${powerScale.labelMin.toFixed(0)} dB`, legendX, legendY - 4)
    ctx.textAlign = "right"
    ctx.fillText(`${powerScale.labelMax.toFixed(0)} dB`, legendX + legendWidth, legendY - 4)

    if (options.showPeakMarkers && cols > 1 && rowIndexes.length) {
      const tracePoints = Array.from({ length: cols })
        .map((_, colIndex) => {
          let peakRow = rowIndexes[0]
          let peakPower = -Infinity
          let weightedFrequency = 0
          let weightTotal = 0
          rowIndexes.forEach((rowIndex) => {
            const rawPower = finitePowerAt(power, rowIndex, colIndex, powerScale.colorMin)
            const normalizedPower = clampNumber((rawPower - powerScale.colorMin) / span, 0, 1)
            const frequency =
              frequencies?.length === power.length
                ? frequencies[rowIndex]
                : frequencyMinHz + (rowIndex / Math.max(1, power.length - 1)) * frequencySpanHz
            if (rawPower > peakPower) {
              peakPower = rawPower
              peakRow = rowIndex
            }
            const weight = normalizedPower * normalizedPower
            if (Number.isFinite(frequency) && weight > 0.001) {
              weightedFrequency += frequency * weight
              weightTotal += weight
            }
          })
          const peakFrequency =
            frequencies?.length === power.length
              ? frequencies[peakRow]
              : frequencyMinHz + (peakRow / Math.max(1, power.length - 1)) * frequencySpanHz
          const time = spectrogramTimes?.[colIndex] ?? (colIndex / Math.max(1, cols - 1)) * duration
          return {
            time,
            peakFrequency,
            centroidFrequency: weightTotal > 0 ? weightedFrequency / weightTotal : null,
            strength: clampNumber((peakPower - powerScale.colorMin) / span, 0, 1),
          }
        })
        .filter((point) => point.time >= viewStart && point.time <= viewEnd && Number.isFinite(point.peakFrequency))

      const drawTrace = (key: "peakFrequency" | "centroidFrequency", color: string, widthPx: number) => {
        ctx.beginPath()
        let started = false
        tracePoints.forEach((point) => {
          const frequency = point[key]
          if (frequency == null || point.strength < 0.16) return
          const x = timeToX(point.time)
          const y = frequencyToY(frequency)
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else {
            ctx.lineTo(x, y)
          }
        })
        if (!started) return
        ctx.strokeStyle = color
        ctx.lineWidth = widthPx
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.shadowColor = color
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      drawTrace("centroidFrequency", "rgba(103, 232, 249, 0.64)", 1.35)
      drawTrace("peakFrequency", "rgba(251, 191, 36, 0.78)", 1.8)

      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      const brightPoints = tracePoints
        .filter((point) => point.strength > 0.72)
        .filter((_, index, list) => index % Math.max(1, Math.ceil(list.length / 120)) === 0)
        .slice(0, 120)
      brightPoints.forEach((point) => {
        const x = timeToX(point.time)
        const y = frequencyToY(point.peakFrequency)
        drawPhosphorSpot(ctx, x, y, 4 + point.strength * 12, [251, 191, 36], 0.16 + point.strength * 0.18)
        if (point.centroidFrequency != null) {
          drawPhosphorSpot(ctx, x, frequencyToY(point.centroidFrequency), 3 + point.strength * 8, [103, 232, 249], 0.12 + point.strength * 0.14)
        }
      })
      ctx.restore()
    }
  } else if (options.visualMode !== "waveform" && options.visualMode !== "spectrum") {
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)"
    ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.fillText("Select a short analyzed recording to draw waveform and spectrogram layers.", 20, plotTop + plotHeight / 2)
  }

  const waveform = vis?.waveform
  const amps = waveform?.amplitudes
  const envelopeMin = waveform?.min
  const envelopeMax = waveform?.max
  const envelopeRms = waveform?.rms
  const times = waveform?.times
  const waveformPointCount = Math.max(
    amps?.length ?? 0,
    envelopeMin?.length ?? 0,
    envelopeMax?.length ?? 0,
    envelopeRms?.length ?? 0,
  )
  if (options.visualMode !== "spectrogram" && options.visualMode !== "spectrum" && options.visualMode !== "waterfall" && waveformPointCount > 0) {
    ctx.save()
    const mid = plotTop + plotHeight * 0.52
    const ampScale = plotHeight * 0.34 * clampNumber(options.waveformHeight, 0.2, 1.6)
    const hasEnvelope = Boolean(
      envelopeMin?.length === waveformPointCount && envelopeMax?.length === waveformPointCount,
    )
    const buckets = Array.from({ length: width }, () => ({
      min: Infinity,
      max: -Infinity,
      sum: 0,
      count: 0,
    }))

    Array.from({ length: waveformPointCount }).forEach((_, index) => {
      const time = times?.[index] ?? (index / Math.max(1, waveformPointCount - 1)) * duration
      if (time < viewStart || time > viewEnd) return
      const bucketIndex = Math.max(0, Math.min(width - 1, Math.floor(timeToX(time))))
      const rawMin = hasEnvelope ? (envelopeMin?.[index] ?? 0) : (amps?.[index] ?? envelopeRms?.[index] ?? 0)
      const rawMax = hasEnvelope ? (envelopeMax?.[index] ?? 0) : (amps?.[index] ?? envelopeRms?.[index] ?? 0)
      const rawAvg = amps?.[index] ?? envelopeRms?.[index] ?? (rawMin + rawMax) / 2
      const ampMin = Math.max(-1, Math.min(1, rawMin * options.waveformGain))
      const ampMax = Math.max(-1, Math.min(1, rawMax * options.waveformGain))
      const ampAverage = Math.max(-1, Math.min(1, rawAvg * options.waveformGain))
      const bucket = buckets[bucketIndex]
      bucket.min = Math.min(bucket.min, ampMin)
      bucket.max = Math.max(bucket.max, ampMax)
      bucket.sum += ampAverage
      bucket.count += 1
    })

    const activeBuckets = buckets
      .map((bucket, x) => ({ ...bucket, x }))
      .filter((bucket) => bucket.count > 0)

    if (activeBuckets.length) {
      const showEnvelopeLayer = options.showWaveformEnvelope && hasEnvelope
      const showTraceLayer = options.showWaveformTrace
      const showPeakLayer = options.showWaveformPeak
      const envelopeGradient = ctx.createLinearGradient(0, plotTop, 0, laneTop)
      envelopeGradient.addColorStop(0, "rgba(103, 232, 249, 0.08)")
      envelopeGradient.addColorStop(0.5, "rgba(34, 211, 238, 0.24)")
      envelopeGradient.addColorStop(1, "rgba(14, 165, 233, 0.08)")

      if (showEnvelopeLayer) {
        ctx.fillStyle = envelopeGradient
        activeBuckets.forEach((bucket) => {
          const yMax = mid - bucket.max * ampScale
          const yMin = mid - bucket.min * ampScale
          const height = Math.max(1, Math.abs(yMin - yMax))
          ctx.globalAlpha = bucket.count > 1 ? 0.9 : 0.46
          ctx.fillRect(bucket.x + 0.5, Math.min(yMax, yMin), 1, height)
        })
        ctx.globalAlpha = 1
      }

      if (showTraceLayer) {
        ctx.beginPath()
        let traceStarted = false
        activeBuckets.forEach((bucket) => {
          const average = bucket.sum / Math.max(1, bucket.count)
          const y = mid - average * ampScale
          if (!traceStarted) {
            ctx.moveTo(bucket.x, y)
            traceStarted = true
          } else {
            ctx.lineTo(bucket.x, y)
          }
        })
        ctx.save()
        ctx.strokeStyle = "rgba(34, 211, 238, 0.28)"
        ctx.lineWidth = 5.5
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.shadowColor = "rgba(34, 211, 238, 0.48)"
        ctx.shadowBlur = 16
        ctx.stroke()
        ctx.restore()

        ctx.beginPath()
        traceStarted = false
        activeBuckets.forEach((bucket) => {
          const average = bucket.sum / Math.max(1, bucket.count)
          const y = mid - average * ampScale
          if (!traceStarted) {
            ctx.moveTo(bucket.x, y)
            traceStarted = true
          } else {
            ctx.lineTo(bucket.x, y)
          }
        })
        ctx.strokeStyle = "rgba(224, 242, 254, 0.96)"
        ctx.lineWidth = 2.2
        ctx.shadowColor = "rgba(34, 211, 238, 0.72)"
        ctx.shadowBlur = 9
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      if (showPeakLayer) {
        ctx.beginPath()
        activeBuckets.forEach((bucket, index) => {
          const peak = Math.abs(bucket.max) >= Math.abs(bucket.min) ? bucket.max : bucket.min
          const y = mid - peak * ampScale
          if (index === 0) ctx.moveTo(bucket.x, y)
          else ctx.lineTo(bucket.x, y)
        })
        ctx.strokeStyle = "rgba(251, 191, 36, 0.42)"
        ctx.lineWidth = 1.15
        ctx.stroke()
      }

      if (showEnvelopeLayer) {
        ctx.beginPath()
        activeBuckets.forEach((bucket, index) => {
          const y = mid - bucket.max * ampScale
          if (index === 0) ctx.moveTo(bucket.x, y)
          else ctx.lineTo(bucket.x, y)
        })
        for (let index = activeBuckets.length - 1; index >= 0; index -= 1) {
          const bucket = activeBuckets[index]
          ctx.lineTo(bucket.x, mid - bucket.min * ampScale)
        }
        ctx.closePath()
        ctx.strokeStyle = "rgba(34, 211, 238, 0.5)"
        ctx.lineWidth = 1
        ctx.stroke()
      }

      const triggerLevel = clampNumber(options.triggerLevel, -1, 1)
      const triggerY = mid - triggerLevel * ampScale
      ctx.save()
      ctx.setLineDash([6, 5])
      ctx.strokeStyle = "rgba(244, 114, 182, 0.74)"
      ctx.lineWidth = 1.35
      ctx.beginPath()
      ctx.moveTo(0, triggerY)
      ctx.lineTo(width, triggerY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(255, 228, 230, 0.94)"
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "right"
      ctx.fillText(
        `trigger ${triggerLevel >= 0 ? "+" : ""}${triggerLevel.toFixed(2)} / ${options.triggerEdge} / ${options.triggerMode}`,
        width - 12,
        Math.max(plotTop + 12, triggerY - 7),
      )

      let previousAverage: number | null = null
      let triggerCount = 0
      const triggerLimit = options.triggerMode === "single" ? 1 : 80
      activeBuckets.forEach((bucket) => {
        const average = bucket.sum / Math.max(1, bucket.count)
        const rising = previousAverage != null && previousAverage < triggerLevel && average >= triggerLevel
        const falling = previousAverage != null && previousAverage > triggerLevel && average <= triggerLevel
        const matchesEdge =
          options.triggerEdge === "both"
            ? rising || falling
            : options.triggerEdge === "rising"
              ? rising
              : falling
        previousAverage = average
        if (!matchesEdge || triggerCount >= triggerLimit) return
        triggerCount += 1
        ctx.fillStyle = rising ? "rgba(251, 113, 133, 0.95)" : "rgba(96, 165, 250, 0.95)"
        ctx.beginPath()
        ctx.moveTo(bucket.x, triggerY - 7)
        ctx.lineTo(bucket.x + 6, triggerY)
        ctx.lineTo(bucket.x, triggerY + 7)
        ctx.lineTo(bucket.x - 6, triggerY)
        ctx.closePath()
        ctx.fill()
      })
      if (options.triggerMode !== "auto") {
        ctx.fillStyle = triggerCount ? "rgba(187, 247, 208, 0.92)" : "rgba(252, 211, 77, 0.9)"
        ctx.textAlign = "left"
        ctx.fillText(
          triggerCount
            ? options.triggerMode === "single"
              ? "single trigger locked"
              : `${triggerCount} trigger crossing${triggerCount === 1 ? "" : "s"}`
            : "trigger armed / no crossing",
          12,
          Math.min(laneTop - 8, Math.max(plotTop + 18, triggerY + 16)),
        )
      }
      ctx.restore()
    }

    ctx.strokeStyle = "rgba(226, 232, 240, 0.18)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, mid)
    ctx.lineTo(width, mid)
    ctx.stroke()
    const amplitudeTicks = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]
    ctx.save()
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    amplitudeTicks.forEach((tick) => {
      const y = mid - tick * ampScale
      if (y < plotTop + 4 || y > laneTop - 8) return
      const isMajor = tick === -1 || tick === -0.5 || tick === 0 || tick === 0.5 || tick === 1
      ctx.strokeStyle = isMajor ? "rgba(226, 232, 240, 0.24)" : "rgba(226, 232, 240, 0.12)"
      ctx.lineWidth = isMajor ? 1 : 0.7
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(isMajor ? 42 : 24, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(width - (isMajor ? 42 : 24), y)
      ctx.lineTo(width, y)
      ctx.stroke()
      if (!isMajor) return
      const label = tick === 0 ? "0.00" : `${tick > 0 ? "+" : ""}${tick.toFixed(2)}`
      ctx.fillStyle = tick === 0 ? "rgba(226, 232, 240, 0.78)" : "rgba(226, 232, 240, 0.66)"
      ctx.fillText(label, 8, Math.max(plotTop + 12, Math.min(laneTop - 8, y - 4)))
      ctx.textAlign = "right"
      ctx.fillText(label, width - 8, Math.max(plotTop + 12, Math.min(laneTop - 8, y - 4)))
      ctx.textAlign = "left"
    })
    ctx.fillStyle = "rgba(103, 232, 249, 0.58)"
    ctx.textAlign = "left"
    ctx.fillText(`${(0.25 / Math.max(0.001, options.waveformGain)).toFixed(3)} norm/div`, 12, laneTop - 12)
    ctx.textAlign = "right"
    ctx.fillText(`${waveformPointCount.toLocaleString()} waveform points`, width - 12, laneTop - 12)
    ctx.restore()
    ctx.restore()
  }

  const laneEvents = events
    .filter((event) => event.start_sec != null && event.end_sec != null)
    .filter((event) => (event.end_sec ?? 0) >= viewStart && (event.start_sec ?? 0) <= viewEnd)
    .slice(0, 80)
  if (options.showEventLanes) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)"
    ctx.fillRect(0, laneTop, width, laneHeight)
    ctx.fillStyle = "rgba(226, 232, 240, 0.86)"
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.fillText("DETECTION LANES", 12, laneTop + 16)

    laneEvents.forEach((event, index) => {
      const start = Math.max(0, Math.min(duration, event.start_sec ?? 0))
      const end = Math.max(start + 0.04, Math.min(duration, event.end_sec ?? start + 0.04))
      const x = timeToX(start)
      const w = Math.max(3, ((end - start) / viewSpan) * width)
      const lane = index % laneRows
      const laneGap = Math.max(10, Math.min(18, (laneHeight - 28) / Math.max(1, laneRows)))
      const y = laneTop + 26 + lane * laneGap
      ctx.fillStyle = eventColor(event)
      ctx.globalAlpha = 0.72
      ctx.fillRect(x, y, w, Math.max(6, Math.min(10, laneGap - 3)))
      ctx.globalAlpha = 1
    })
  } else {
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)"
    ctx.fillRect(0, laneTop, width, laneHeight)
  }

  const modelWindows = modelOutputs
    .filter((output) => output.start_sec != null && output.end_sec != null)
    .filter((output) => (output.end_sec ?? 0) >= viewStart && (output.start_sec ?? 0) <= viewEnd)
    .slice(0, 24)
  if (modelWindows.length) {
    const modelLaneTop = Math.max(plotTop + 8, laneTop - 58)
    const modelLaneHeight = Math.min(42, Math.max(22, laneTop - modelLaneTop - 8))
    ctx.save()
    ctx.fillStyle = "rgba(168, 85, 247, 0.08)"
    ctx.fillRect(0, modelLaneTop - 4, width, modelLaneHeight + 10)
    ctx.strokeStyle = "rgba(216, 180, 254, 0.28)"
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, modelLaneTop - 4.5, width - 1, modelLaneHeight + 10)
    ctx.fillStyle = "rgba(233, 213, 255, 0.88)"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText("MODEL WINDOWS", 12, modelLaneTop + 11)
    modelWindows.forEach((output, index) => {
      const start = Math.max(0, Math.min(duration, output.start_sec ?? 0))
      const end = Math.max(start + 0.04, Math.min(duration, output.end_sec ?? start + 0.04))
      const x = waterfallMode ? 132 : timeToX(start)
      const w = waterfallMode ? Math.max(56, width - 144) : Math.max(4, ((end - start) / viewSpan) * width)
      const y = waterfallMode
        ? clampNumber(timeToWaterfallY((start + end) / 2) - 5, plotTop + 18, laneTop - 22)
        : modelLaneTop + 16 + (index % 2) * 15
      const topLabel = output.top_labels[0]
      const confidence = clampNumber(topLabel?.score ?? 0.62, 0.18, 1)
      ctx.fillStyle = `rgba(168, 85, 247, ${0.18 + confidence * 0.32})`
      ctx.fillRect(x, y, w, 10)
      ctx.strokeStyle = "rgba(233, 213, 255, 0.72)"
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), 9)
      if (w > 70) {
        ctx.fillStyle = "rgba(250, 245, 255, 0.94)"
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
        ctx.textAlign = "left"
        ctx.fillText(modelOutputCanvasLabel(output), x + 5, y + 8)
      }
    })
    ctx.restore()
  }

  if (options.showPeakMarkers) {
    events
      .filter((event) => event.frequency_hz != null && event.start_sec != null)
      .filter((event) => (event.start_sec ?? 0) >= viewStart && (event.start_sec ?? 0) <= viewEnd)
      .filter((event) => (event.frequency_hz ?? 0) >= frequencyMinHz && (event.frequency_hz ?? 0) <= frequencyMaxHz)
      .slice(0, 12)
      .forEach((event, index) => {
        const eventTime = event.peak_sec ?? event.start_sec ?? 0
        const eventFrequency = event.frequency_hz ?? frequencyMinHz
        const x = waterfallMode ? frequencyToWaterfallX(eventFrequency) : timeToX(eventTime)
        const y = waterfallMode
          ? timeToWaterfallY(eventTime)
          : Number.isFinite(event.frequency_hz ?? NaN)
            ? frequencyToY(eventFrequency)
            : plotTop + 12 + (index % 4) * 18
        ctx.strokeStyle = "rgba(251, 191, 36, 0.75)"
        ctx.lineWidth = 1
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        if (waterfallMode) {
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
        } else {
          ctx.moveTo(x, plotTop)
          ctx.lineTo(x, laneTop - 4)
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "rgba(251, 191, 36, 0.95)"
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(waterfallMode ? x - 8 : x - 5, waterfallMode ? y + 5 : y + 8)
        ctx.lineTo(waterfallMode ? x + 8 : x + 5, waterfallMode ? y + 5 : y + 8)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = "rgba(255, 251, 235, 0.92)"
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
        ctx.textAlign = "left"
        ctx.fillText(formatHz(event.frequency_hz), Math.min(width - 76, x + 7), y + 9)
      })
  }

  transcripts.forEach((entry) => {
    if (entry.start_sec < viewStart || entry.start_sec > viewEnd) return
    const x = timeToX(entry.start_sec)
    const y = timeToWaterfallY(entry.start_sec)
    ctx.strokeStyle = "rgba(251, 191, 36, 0.65)"
    ctx.lineWidth = 1
    ctx.beginPath()
    if (waterfallMode) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    } else {
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, laneTop - 6)
    }
    ctx.stroke()
  })

  if (selectionStart != null && selectionEnd != null) {
    const start = Math.max(viewStart, Math.min(viewEnd, Math.min(selectionStart, selectionEnd)))
    const end = Math.max(viewStart, Math.min(viewEnd, Math.max(selectionStart, selectionEnd)))
    const x = timeToX(start)
    const w = Math.max(2, timeToX(end) - x)
    const y = timeToWaterfallY(start)
    const h = Math.max(2, timeToWaterfallY(end) - y)
    ctx.fillStyle = "rgba(244, 114, 182, 0.24)"
    ctx.fillRect(waterfallMode ? 0 : x, waterfallMode ? y : plotTop, waterfallMode ? width : w, waterfallMode ? h : laneTop - plotTop)
    ctx.fillStyle = "rgba(244, 114, 182, 0.12)"
    ctx.fillRect(x, laneTop, w, laneHeight)
    ctx.strokeStyle = "rgba(251, 113, 133, 0.95)"
    ctx.lineWidth = 2
    ctx.beginPath()
    if (waterfallMode) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.moveTo(0, y + h)
      ctx.lineTo(width, y + h)
    } else {
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, navigatorTop - 2)
      ctx.moveTo(x + w, plotTop)
      ctx.lineTo(x + w, navigatorTop - 2)
    }
    ctx.stroke()
    ctx.fillStyle = "rgba(255, 228, 230, 0.95)"
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${formatDuration(start)}-${formatDuration(end)}`, waterfallMode ? 12 : x + 6, waterfallMode ? Math.max(plotTop + 18, y + 16) : plotTop + 18)
  } else if (selectionStart != null) {
    const x = timeToX(selectionStart)
    const y = timeToWaterfallY(selectionStart)
    ctx.strokeStyle = "rgba(251, 113, 133, 0.95)"
    ctx.lineWidth = 2
    ctx.beginPath()
    if (waterfallMode) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    } else {
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, navigatorTop - 2)
    }
    ctx.stroke()
  }

  markers
    .filter((marker) => marker.time_sec >= viewStart && marker.time_sec <= viewEnd)
    .forEach((marker) => {
      const x = timeToX(marker.time_sec)
      const y = timeToWaterfallY(marker.time_sec)
      ctx.strokeStyle = marker.saved ? "rgba(52, 211, 153, 0.95)" : "rgba(251, 191, 36, 0.95)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (waterfallMode) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      } else {
        ctx.moveTo(x, plotTop)
        ctx.lineTo(x, navigatorTop - 2)
      }
      ctx.stroke()
      ctx.fillStyle = marker.saved ? "rgba(52, 211, 153, 0.92)" : "rgba(251, 191, 36, 0.92)"
      ctx.beginPath()
      if (waterfallMode) {
        ctx.moveTo(2, y)
        ctx.lineTo(12, y - 7)
        ctx.lineTo(22, y)
      } else {
        ctx.moveTo(x, plotTop + 2)
        ctx.lineTo(x + 8, plotTop + 12)
        ctx.lineTo(x, plotTop + 22)
      }
      ctx.closePath()
      ctx.fill()
    })

  ctx.save()
  ctx.fillStyle = "rgba(2, 6, 23, 0.92)"
  ctx.fillRect(0, navigatorTop, width, navigatorHeight)
  ctx.strokeStyle = "rgba(103, 232, 249, 0.22)"
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, navigatorTop + 0.5, width - 1, navigatorHeight - 1)
  if (waveformPointCount > 0) {
    const navMid = navigatorTop + navigatorHeight / 2
    const navScale = navigatorHeight * 0.42
    const navBuckets = Array.from({ length: width }, () => ({ min: Infinity, max: -Infinity, count: 0 }))
    Array.from({ length: waveformPointCount }).forEach((_, index) => {
      const time = times?.[index] ?? (index / Math.max(1, waveformPointCount - 1)) * duration
      const x = Math.max(0, Math.min(width - 1, Math.floor((time / duration) * width)))
      const rawMin = envelopeMin?.[index] ?? amps?.[index] ?? envelopeRms?.[index] ?? 0
      const rawMax = envelopeMax?.[index] ?? amps?.[index] ?? envelopeRms?.[index] ?? 0
      const bucket = navBuckets[x]
      bucket.min = Math.min(bucket.min, clampNumber(rawMin * options.waveformGain, -1, 1))
      bucket.max = Math.max(bucket.max, clampNumber(rawMax * options.waveformGain, -1, 1))
      bucket.count += 1
    })
    ctx.strokeStyle = "rgba(34, 211, 238, 0.34)"
    ctx.lineWidth = 1
    navBuckets.forEach((bucket, x) => {
      if (!bucket.count) return
      const yMin = navMid - bucket.max * navScale
      const yMax = navMid - bucket.min * navScale
      ctx.beginPath()
      ctx.moveTo(x + 0.5, yMin)
      ctx.lineTo(x + 0.5, yMax)
      ctx.stroke()
    })
  }
  const navWindowX = (viewStart / duration) * width
  const navWindowW = Math.max(2, (viewSpan / duration) * width)
  ctx.fillStyle = "rgba(34, 211, 238, 0.12)"
  ctx.fillRect(navWindowX, navigatorTop + 1, navWindowW, navigatorHeight - 2)
  ctx.strokeStyle = "rgba(103, 232, 249, 0.84)"
  ctx.lineWidth = 1.5
  ctx.strokeRect(navWindowX + 0.5, navigatorTop + 1.5, navWindowW, navigatorHeight - 3)
  if (selectionStart != null && selectionEnd != null) {
    const navSelectionStart = (Math.min(selectionStart, selectionEnd) / duration) * width
    const navSelectionW = Math.max(2, (Math.abs(selectionEnd - selectionStart) / duration) * width)
    ctx.fillStyle = "rgba(244, 114, 182, 0.28)"
    ctx.fillRect(navSelectionStart, navigatorTop + 3, navSelectionW, navigatorHeight - 6)
    ctx.strokeStyle = "rgba(251, 113, 133, 0.86)"
    ctx.strokeRect(navSelectionStart + 0.5, navigatorTop + 3.5, navSelectionW, navigatorHeight - 7)
  }
  const navPlayheadX = Math.max(0, Math.min(width, (currentTime / duration) * width))
  ctx.strokeStyle = "rgba(248, 250, 252, 0.86)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(navPlayheadX, navigatorTop)
  ctx.lineTo(navPlayheadX, navigatorBottom)
  ctx.stroke()
  ctx.fillStyle = "rgba(226, 232, 240, 0.76)"
  ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.textAlign = "left"
  ctx.fillText("overview", 8, navigatorTop + 10)
  ctx.restore()

  if (options.showPersistence) {
    const trailCount = Math.max(8, Math.min(28, Math.floor(width / 90)))
    const trailSpan = Math.max(0.08, Math.min(viewSpan * 0.22, 3))
    ctx.save()
    for (let index = trailCount; index >= 1; index -= 1) {
      const ratio = index / trailCount
      const trailTime = currentTime - ratio * trailSpan
      if (trailTime < viewStart || trailTime > viewEnd) continue
      const x = Math.max(0, Math.min(width, timeToX(trailTime)))
      const y = Math.max(plotTop, Math.min(laneTop - 4, timeToWaterfallY(trailTime)))
      const alpha = 0.04 + (1 - ratio) * 0.18
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`
      ctx.lineWidth = 1 + (1 - ratio) * 1.4
      ctx.beginPath()
      if (waterfallMode) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      } else {
        ctx.moveTo(x, plotTop)
        ctx.lineTo(x, navigatorBottom)
      }
      ctx.stroke()
      ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.7})`
      if (waterfallMode) {
        ctx.fillRect(0, Math.max(plotTop, y - 1), width, 2)
      } else {
        ctx.fillRect(Math.max(0, x - 1), plotTop, 2, Math.max(0, laneTop - plotTop))
      }
    }
    ctx.fillStyle = "rgba(103, 232, 249, 0.58)"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "right"
    ctx.fillText("phosphor persistence", width - 12, navigatorTop - 8)
    ctx.restore()
  }

  const playheadX = Math.max(0, Math.min(width, timeToX(currentTime)))
  const playheadY = Math.max(plotTop, Math.min(laneTop - 4, timeToWaterfallY(currentTime)))
  ctx.strokeStyle = "#f8fafc"
  ctx.lineWidth = 2
  ctx.beginPath()
  if (waterfallMode) {
    ctx.moveTo(0, playheadY)
    ctx.lineTo(width, playheadY)
  } else {
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
  }
  ctx.stroke()
  ctx.fillStyle = "#f8fafc"
  ctx.beginPath()
  ctx.arc(waterfallMode ? width - 12 : playheadX, waterfallMode ? playheadY : 12, 4, 0, Math.PI * 2)
  ctx.fill()

  if (hoverTime != null) {
    const hoverX = Math.max(0, Math.min(width, waterfallMode && hoverFrequencyHz != null ? frequencyToWaterfallX(hoverFrequencyHz) : timeToX(hoverTime)))
    const hoverY = Math.max(plotTop, Math.min(laneTop - 4, waterfallMode ? timeToWaterfallY(hoverTime) : hoverFrequencyHz != null ? frequencyToY(hoverFrequencyHz) : plotTop + 32))
    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(hoverX, 0)
    ctx.lineTo(hoverX, height)
    ctx.stroke()
    ctx.setLineDash([])

    if (hoverFrequencyHz != null) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)"
      ctx.lineWidth = 1
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.moveTo(0, hoverY)
      ctx.lineTo(width, hoverY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const frequencyLabel = hoverFrequencyHz != null ? ` / ${formatHz(hoverFrequencyHz)}` : ""
    const powerLabel = hoverPowerDb != null ? ` / ${hoverPowerDb.toFixed(1)} dB` : ""
    const sampleLabel = sampleRate ? ` / #${Math.max(0, Math.round(hoverTime * sampleRate)).toLocaleString()}` : ""
    const amplitudeLabel = hoverAmplitude != null ? ` / ${hoverAmplitude >= 0 ? "+" : ""}${hoverAmplitude.toFixed(3)}` : ""
    const readout = `${formatDuration(hoverTime)}${frequencyLabel}${powerLabel}${sampleLabel}${amplitudeLabel}`
    const tooltipWidth = Math.min(width - 12, Math.max(228, Math.min(430, 84 + readout.length * 6)))
    const tooltipX = Math.max(4, Math.min(width - tooltipWidth - 4, hoverX + 8))
    const tooltipY = Math.max(plotTop + 4, Math.min(laneTop - 32, hoverY - 18))
    ctx.fillStyle = "rgba(15, 23, 42, 0.86)"
    ctx.fillRect(tooltipX, tooltipY, tooltipWidth, 24)
    ctx.strokeStyle = "rgba(251, 191, 36, 0.42)"
    ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, 24)
    ctx.fillStyle = "rgba(254, 243, 199, 0.96)"
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(readout, tooltipX + 8, tooltipY + 16)
  }

  ctx.fillStyle = "rgba(226, 232, 240, 0.82)"
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.textAlign = "left"
  ctx.fillText(waterfallMode ? formatHz(frequencyMinHz) : formatDuration(viewStart), 8, height - 6)
  ctx.textAlign = "right"
  ctx.fillText(waterfallMode ? formatHz(frequencyMaxHz) : formatDuration(viewEnd), width - 8, height - 6)

  ctx.save()
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.fillStyle = "rgba(103, 232, 249, 0.82)"
  ctx.strokeStyle = "rgba(103, 232, 249, 0.22)"
  ctx.lineWidth = 1
  ctx.textAlign = "right"
  for (let tick = 0; tick <= 5; tick += 1) {
    const frequency = frequencyMinHz + (frequencySpanHz * tick) / 5
    const y = waterfallMode ? plotTop + plotHeight - (plotHeight * tick) / 5 : frequencyToY(frequency)
    const x = frequencyToWaterfallX(frequency)
    ctx.beginPath()
    if (waterfallMode) {
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, plotTop + 38)
    } else {
      ctx.moveTo(width - 42, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()
    if (waterfallMode) {
      ctx.textAlign = tick === 0 ? "left" : tick === 5 ? "right" : "center"
      ctx.fillText(formatHz(frequency), Math.max(8, Math.min(width - 8, x)), plotTop + 52)
      ctx.textAlign = "right"
    } else {
      ctx.fillText(formatHz(frequency), width - 8, Math.max(plotTop + 10, Math.min(laneTop - 8, y - 3)))
    }
  }

  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(226, 232, 240, 0.68)"
  ctx.strokeStyle = "rgba(226, 232, 240, 0.16)"
  for (let tick = 1; tick < 10; tick += 1) {
    const time = viewStart + (viewSpan * tick) / 10
    const x = timeToX(time)
    const y = timeToWaterfallY(time)
    ctx.beginPath()
    if (waterfallMode) {
      ctx.moveTo(0, y)
      ctx.lineTo(42, y)
    } else {
      ctx.moveTo(x, laneTop - 16)
      ctx.lineTo(x, laneTop - 4)
    }
    ctx.stroke()
    if (tick % 2 === 0) {
      if (waterfallMode) {
        ctx.textAlign = "left"
        ctx.fillText(formatDuration(time), 8, Math.max(plotTop + 12, Math.min(laneTop - 8, y - 4)))
        ctx.textAlign = "center"
      } else {
        ctx.fillText(formatDuration(time), x, laneTop - 20)
      }
    }
  }
  ctx.restore()
}

type SineAcousticPlayerProps = {
  embedded?: boolean
  compact?: boolean
}

export function SineAcousticPlayer({ embedded = false, compact = false }: SineAcousticPlayerProps) {
  const catalogPageLimit = compact ? COMPACT_CATALOG_LIMIT : embedded ? EMBEDDED_CATALOG_LIMIT : CATALOG_LIMIT
  const initialVisibleCount = compact ? 18 : INITIAL_VISIBLE_COUNT
  const startsOnShortClips = true
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("loading")
  const [query, setQuery] = useState(startsOnShortClips ? SHORT_CLIP_QUERY : "")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>(startsOnShortClips ? "short" : "all")
  const [fileReadinessFilter, setFileReadinessFilter] = useState<FileReadinessFilter>("all")
  const [visibleLimit, setVisibleLimit] = useState(initialVisibleCount)
  const [catalogRetryCount, setCatalogRetryCount] = useState(0)
  const [catalogLoadingSince, setCatalogLoadingSince] = useState<number | null>(null)
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false)
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [storageLabel, setStorageLabel] = useState("checking storage")
  const [detectorList, setDetectorList] = useState<string[]>([])
  const [sineStatusPayload, setSineStatusPayload] = useState<SineStatusPayload | null>(null)
  const [sineStatusLoading, setSineStatusLoading] = useState(false)
  const [sineStatusError, setSineStatusError] = useState<string | null>(null)
  const [sineModelsPayload, setSineModelsPayload] = useState<SineModelsPayload | null>(null)
  const [sineModelsLoading, setSineModelsLoading] = useState(false)
  const [sineModelsError, setSineModelsError] = useState<string | null>(null)
  const [sineModelDetailPayload, setSineModelDetailPayload] = useState<SineModelsPayload | null>(null)
  const [sineModelDetailLoading, setSineModelDetailLoading] = useState(false)
  const [sineModelDetailError, setSineModelDetailError] = useState<string | null>(null)
  const [sinePrototypesPayload, setSinePrototypesPayload] = useState<SinePrototypesPayload | null>(null)
  const [sinePrototypesLoading, setSinePrototypesLoading] = useState(false)
  const [sinePrototypesError, setSinePrototypesError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [events, setEvents] = useState<DetectionEvent[]>([])
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<SoundTranscript[]>([])
  const [vis, setVis] = useState<Visualisation | null>(null)
  const [scopeSource, setScopeSource] = useState<ScopeSource>("none")
  const [error, setError] = useState<string | null>(null)
  const [playbackStatus, setPlaybackStatus] = useState("No file selected")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisPolling, setAnalysisPolling] = useState(false)
  const [analysisRequestWindow, setAnalysisRequestWindow] = useState<AnalysisWindow | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverFrequencyHz, setHoverFrequencyHz] = useState<number | null>(null)
  const [hoverAmplitude, setHoverAmplitude] = useState<number | null>(null)
  const [hoverPowerDb, setHoverPowerDb] = useState<number | null>(null)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [zoomStart, setZoomStart] = useState<number | null>(null)
  const [zoomEnd, setZoomEnd] = useState<number | null>(null)
  const [loopSelection, setLoopSelection] = useState(false)
  const [reversePlayback, setReversePlayback] = useState(false)
  const [playbackRate, setPlaybackRate] = useState("1")
  const [markers, setMarkers] = useState<WaveMarker[]>([])
  const [markerLabel, setMarkerLabel] = useState("")
  const [savingWaveAnnotation, setSavingWaveAnnotation] = useState(false)
  const [waveAnnotationMessage, setWaveAnnotationMessage] = useState<WaveAnnotationMessage | null>(null)
  const [visualMode, setVisualMode] = useState<VisualMode>("overlay")
  const [spectrogramPalette, setSpectrogramPalette] = useState<SpectrogramPalette>("marine")
  const [selectedArchitectureId, setSelectedArchitectureId] = useState("frontend")
  const [waveformGain, setWaveformGain] = useState("1")
  const [waveformHeight, setWaveformHeight] = useState("1")
  const [spectrogramContrast, setSpectrogramContrast] = useState("1.2")
  const [spectrogramOpacity, setSpectrogramOpacity] = useState("0.82")
  const [frequencyMinHz, setFrequencyMinHz] = useState("0")
  const [frequencyMaxHz, setFrequencyMaxHz] = useState("8000")
  const [triggerLevel, setTriggerLevel] = useState("0")
  const [triggerEdge, setTriggerEdge] = useState<TriggerEdge>("rising")
  const [triggerMode, setTriggerMode] = useState<TriggerMode>("auto")
  const [timeMagnification, setTimeMagnification] = useState("1")
  const [scopeCanvasHeight, setScopeCanvasHeight] = useState("320")
  const [scopeCanvasCssWidth, setScopeCanvasCssWidth] = useState(1200)
  const [scopeCanvasDpr, setScopeCanvasDpr] = useState(2)
  const [laneRows, setLaneRows] = useState("4")
  const [volumeLevel, setVolumeLevel] = useState("1")
  const [showAnalyzerGrid, setShowAnalyzerGrid] = useState(true)
  const [showPeakMarkers, setShowPeakMarkers] = useState(true)
  const [showEventLanes, setShowEventLanes] = useState(true)
  const [showBandGuides, setShowBandGuides] = useState(true)
  const [showScopePersistence, setShowScopePersistence] = useState(false)
  const [showWaveformEnvelope, setShowWaveformEnvelope] = useState(true)
  const [showWaveformTrace, setShowWaveformTrace] = useState(true)
  const [showWaveformPeak, setShowWaveformPeak] = useState(true)
  const [collapsedDetectors, setCollapsedDetectors] = useState<Set<string>>(() => new Set())
  const [humanLabel, setHumanLabel] = useState("")
  const [humanCategory, setHumanCategory] = useState("unknown")
  const [humanConfidence, setHumanConfidence] = useState("0.9")
  const [humanNotes, setHumanNotes] = useState("")
  const [humanDisputesModel, setHumanDisputesModel] = useState(true)
  const [savingHumanId, setSavingHumanId] = useState(false)
  const [humanIdMessage, setHumanIdMessage] = useState<HumanIdMessage | null>(null)
  const [savedWaveAnnotations, setSavedWaveAnnotations] = useState<WaveAnnotationRecord[]>([])
  const [savedHumanIdentifications, setSavedHumanIdentifications] = useState<HumanIdentificationRecord[]>([])
  const [trainingHumanTags, setTrainingHumanTags] = useState<HumanIdentificationRecord[]>([])
  const [trainingHumanTagsTotal, setTrainingHumanTagsTotal] = useState<number | null>(null)
  const [trainingHumanTagsLoading, setTrainingHumanTagsLoading] = useState(false)
  const [trainingHumanTagsError, setTrainingHumanTagsError] = useState<string | null>(null)
  const [eventQuery, setEventQuery] = useState("")
  const [eventFamilyFilter, setEventFamilyFilter] = useState<EventFamilyFilter>("all")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasShellRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const libraryScrollRef = useRef<HTMLDivElement>(null)
  const reverseContextRef = useRef<AudioContext | null>(null)
  const reverseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const reverseFrameRef = useRef(0)
  const reverseStopRequestedRef = useRef(false)
  const transportPressRef = useRef(0)
  const analysisPollCountRef = useRef(0)
  const analysisRunIdRef = useRef<string | null>(null)
  const analysisJobIdRef = useRef<string | null>(null)
  const requestRef = useRef(0)
  const visualisationRequestRef = useRef(0)
  const initializedRef = useRef(false)
  const catalogBootstrappedRef = useRef(false)
  const lastCatalogSearchRef = useRef<string | null>(null)
  const scopeQualityRef = useRef(0)

  const selected = blobs.find((blob) => blob.id === selectedId) ?? null
  const selectedAnalysisId = blobAnalysisId(selected)
  const selectedRecordMode = selected ? (selectedAnalysisId ? "analysis-ready" : "playback-only") : "none"
  const selectedRecordModeLabel =
    selectedRecordMode === "analysis-ready" ? "analysis-ready" : selectedRecordMode === "playback-only" ? "playback-only" : "no file"
  const selectedNeedsShortPath = Boolean(selected?.size_bytes && selected.size_bytes > IMMEDIATE_ANALYSIS_MAX_BYTES)
  const selectedStreamSource =
    selected && selectedId
      ? selected.stream_url || `/api/mindex/sine/library/blobs/${encodeURIComponent(selectedId)}/stream`
      : ""
  const latestHumanIdentification = useMemo(
    () => newestRecord(savedHumanIdentifications),
    [savedHumanIdentifications],
  )

  useEffect(() => {
    scopeQualityRef.current = visualisationQualityScore(vis)
  }, [vis])
  const latestWaveAnnotation = useMemo(
    () => newestRecord(savedWaveAnnotations),
    [savedWaveAnnotations],
  )

  useEffect(() => {
    const shell = canvasShellRef.current
    if (!shell) return

    let frame = 0
    const updateDimensions = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const rect = shell.getBoundingClientRect()
        const nextWidth = Math.round(rect.width)
        if (nextWidth > 0) {
          setScopeCanvasCssWidth((current) => (current === nextWidth ? current : nextWidth))
        }
        const nextDpr = clampNumber(window.devicePixelRatio || 1, 1, 3)
        setScopeCanvasDpr((current) => (Math.abs(current - nextDpr) < 0.01 ? current : nextDpr))
      })
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(shell)
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  const canvasHeightPx = Math.round(clampNumber(numericValue(scopeCanvasHeight, 320), 240, 680))
  const canvasBackingWidth = Math.round(clampNumber(scopeCanvasCssWidth * scopeCanvasDpr, 960, 4096))
  const canvasBackingHeight = Math.round(clampNumber(canvasHeightPx * scopeCanvasDpr, 480, 2048))
  const scopeFrequencyMin = Math.max(0, numericValue(frequencyMinHz, 0))
  const scopeFrequencyMax = Math.max(scopeFrequencyMin + 1, numericValue(frequencyMaxHz, 8000))

  const activeDuration = duration || vis?.duration_sec || selected?.duration_sec || 0
  const activeSampleRate = finiteNumber(vis?.sample_rate_hz) ?? finiteNumber(selected?.sample_rate_hz) ?? 0
  const currentSampleIndex = activeSampleRate ? Math.max(0, Math.round(currentTime * activeSampleRate)) : null
  const hoverSampleIndex = activeSampleRate && hoverTime != null ? Math.max(0, Math.round(hoverTime * activeSampleRate)) : null
  const selectedRegion = useMemo(() => {
    if (selectionStart == null || selectionEnd == null) return null
    const start = Math.max(0, Math.min(activeDuration || 0, Math.min(selectionStart, selectionEnd)))
    const end = Math.max(start, Math.min(activeDuration || 0, Math.max(selectionStart, selectionEnd)))
    return end > start ? { start, end } : null
  }, [activeDuration, selectionEnd, selectionStart])
  const selectedRegionMetrics = useMemo(() => {
    if (!selectedRegion) return null
    const lengthSec = Math.max(0, selectedRegion.end - selectedRegion.start)
    const startSample = activeSampleRate ? Math.max(0, Math.round(selectedRegion.start * activeSampleRate)) : null
    const endSample = activeSampleRate ? Math.max(0, Math.round(selectedRegion.end * activeSampleRate)) : null
    const sampleCount = startSample != null && endSample != null ? Math.max(0, endSample - startSample) : null
    return { lengthSec, startSample, endSample, sampleCount }
  }, [activeSampleRate, selectedRegion])
  const zoomRegion = useMemo(() => {
    if (zoomStart == null || zoomEnd == null) return null
    const start = Math.max(0, Math.min(activeDuration || 0, Math.min(zoomStart, zoomEnd)))
    const end = Math.max(start, Math.min(activeDuration || 0, Math.max(zoomStart, zoomEnd)))
    return end > start ? { start, end } : null
  }, [activeDuration, zoomEnd, zoomStart])
  const timeMagnificationFactor = clampNumber(numericValue(timeMagnification, 1), 1, 32)
  const baseVisibleStart = zoomRegion?.start ?? 0
  const baseVisibleEnd = zoomRegion?.end ?? activeDuration
  const baseVisibleSpan = Math.max(0.001, baseVisibleEnd - baseVisibleStart)
  const visibleSpan = Math.max(0.001, baseVisibleSpan / timeMagnificationFactor)
  const focusTime =
    currentTime >= baseVisibleStart && currentTime <= baseVisibleEnd
      ? currentTime
      : baseVisibleStart + baseVisibleSpan / 2
  const visibleStart = Math.max(baseVisibleStart, Math.min(baseVisibleEnd - visibleSpan, focusTime - visibleSpan / 2))
  const visibleEnd = Math.min(baseVisibleEnd, visibleStart + visibleSpan)

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>()
    blobs.forEach((blob) => {
      const source = blob.source_id || blob.recording_group || "unknown"
      counts.set(source, (counts.get(source) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  }, [blobs])

  const filteredBlobs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return blobs.filter((blob) => {
      const source = blob.source_id || blob.recording_group || "unknown"
      if (sourceFilter !== "all" && source !== sourceFilter) return false
      if (environmentFilter === "short" && (blob.size_bytes ?? Number.MAX_SAFE_INTEGER) > IMMEDIATE_ANALYSIS_MAX_BYTES) {
        return false
      }
      if (environmentFilter === "water" && inferEnvironment(blob) !== "water") return false
      if (environmentFilter === "air" && inferEnvironment(blob) !== "air") return false
      if (environmentFilter === "ground" && inferEnvironment(blob) !== "ground") return false
      if (fileReadinessFilter === "analysis-ready" && !blobAnalysisId(blob)) return false
      if (fileReadinessFilter === "playback-only" && blobAnalysisId(blob)) return false
      if (normalized && !blobSearchText(blob).includes(normalized)) return false
      return true
    })
  }, [blobs, environmentFilter, fileReadinessFilter, query, sourceFilter])

  const visibleBlobs = filteredBlobs.slice(0, visibleLimit)
  const analysisReadyBlobCount = useMemo(() => blobs.filter((blob) => Boolean(blobAnalysisId(blob))).length, [blobs])
  const playbackOnlyBlobCount = Math.max(0, blobs.length - analysisReadyBlobCount)
  const visibleBlobGroups = useMemo(() => {
    const groups = new Map<string, BlobItem[]>()
    visibleBlobs.forEach((blob) => {
      const source = blob.source_id || blob.recording_group || "unknown source"
      const environment = cleanLabel(inferEnvironment(blob))
      const key = `${source} / ${environment}`
      const current = groups.get(key) ?? []
      current.push(blob)
      groups.set(key, current)
    })
    return Array.from(groups.entries())
  }, [visibleBlobs])
  const canRevealMoreBlobs = filteredBlobs.length > visibleLimit
  const hasMoreCatalogRows = totalFiles > blobs.length
  const revealMoreBlobs = useCallback(() => {
    setVisibleLimit((value) => Math.min(filteredBlobs.length, value + initialVisibleCount))
  }, [filteredBlobs.length, initialVisibleCount])

  useEffect(() => {
    if (!blobs.length) return
    if (!filteredBlobs.length) {
      if (selectedId) setSelectedId(null)
      return
    }
    if (!selectedId || !filteredBlobs.some((blob) => blob.id === selectedId)) {
      setSelectedId(filteredBlobs[0].id)
    }
  }, [blobs.length, filteredBlobs, selectedId])

  const summary = analysis?.identification_summary ?? null
  const modelTopLabel = summary?.top_label || summary?.label || null
  const humanModelReview = useMemo(() => {
    const humanLabelValue = latestHumanIdentification?.human_label || null
    const modelLabelValue = latestHumanIdentification?.model_top_label || modelTopLabel || null
    const humanKey = comparisonKey(humanLabelValue)
    const modelKey = comparisonKey(modelLabelValue)
    const hasHuman = Boolean(humanKey)
    const hasModel = Boolean(modelKey)
    const labelsDiffer = hasHuman && hasModel && humanKey !== modelKey
    const contested = Boolean(latestHumanIdentification?.disputes_model || labelsDiffer)

    return {
      hasHuman,
      hasModel,
      contested,
      labelsDiffer,
      humanLabel: humanLabelValue,
      modelLabel: modelLabelValue,
      status: contested ? "contested" : hasHuman && hasModel ? "aligned" : hasHuman ? "awaiting model" : "no human tag",
    }
  }, [latestHumanIdentification, modelTopLabel])
  const displayTranscripts = transcripts
  const transcriptMode = transcripts.length ? "backend" : "pending"
  const activeTranscript = displayTranscripts.find((entry) => currentTime >= entry.start_sec && currentTime <= entry.end_sec)
  const deepSignalMatches = useMemo(() => normalizeDeepSignalMatches(analysis?.deep_signal_matches), [analysis?.deep_signal_matches])
  const diagnosticRows = useMemo(() => normalizeDiagnostics(analysis?.diagnostics), [analysis?.diagnostics])
  const analysisModelContext = useMemo(
    () => extractSineModelContext(analysis, analysis?.classification, analysis?.diagnostics, analysis?.summary),
    [analysis],
  )
  const scopeOptions = useMemo<ScopeOptions>(() => ({
    visualMode,
    showGrid: showAnalyzerGrid,
    showPeakMarkers,
    showEventLanes,
    showBandGuides,
    showPersistence: showScopePersistence,
    showWaveformEnvelope,
    showWaveformTrace,
    showWaveformPeak,
    palette: spectrogramPalette,
    waveformGain: clampNumber(numericValue(waveformGain, 1), 0.25, 8),
    waveformHeight: clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6),
    spectrogramContrast: clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4),
    spectrogramOpacity: clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1),
    frequencyMinHz: Math.max(0, numericValue(frequencyMinHz, 0)),
    frequencyMaxHz: Math.max(1, numericValue(frequencyMaxHz, 8000)),
    triggerLevel: clampNumber(numericValue(triggerLevel, 0), -1, 1),
    triggerEdge,
    triggerMode,
    laneRows: clampNumber(numericValue(laneRows, 4), 2, 8),
  }), [
    frequencyMaxHz,
    frequencyMinHz,
    laneRows,
    showAnalyzerGrid,
    showBandGuides,
    showEventLanes,
    showPeakMarkers,
    showScopePersistence,
    showWaveformEnvelope,
    showWaveformPeak,
    showWaveformTrace,
    spectrogramContrast,
    spectrogramOpacity,
    spectrogramPalette,
    triggerEdge,
    triggerLevel,
    triggerMode,
    visualMode,
    waveformGain,
    waveformHeight,
  ])
  const scopeStats = useMemo(() => {
    const frequencyEvents = events
      .map((event) => event.frequency_hz)
      .filter((value): value is number => Number.isFinite(value ?? NaN))
      .sort((left, right) => right - left)
    const { frequencyMinHz, frequencyMaxHz, frequencySpanHz } = resolveScopeFrequencyRange(vis, scopeOptions)
    const powerRows = vis?.spectrogram?.power_db ?? []
    let minPower = Infinity
    let maxPower = -Infinity
    powerRows.forEach((row) => {
      row.forEach((value) => {
        if (Number.isFinite(value)) {
          minPower = Math.min(minPower, value)
          maxPower = Math.max(maxPower, value)
        }
      })
    })
    return {
      dominantFrequency: summary?.dominant_frequency_hz ?? frequencyEvents[0] ?? null,
      visibleFrequencyRange: `${formatHz(frequencyMinHz)}-${formatHz(frequencyMaxHz)}`,
      dynamicRange: Number.isFinite(minPower) && Number.isFinite(maxPower) ? `${minPower.toFixed(0)} to ${maxPower.toFixed(0)} dB` : "power pending",
      frequencyPeakCount: frequencyEvents.length,
      timePerDivision: (visibleEnd - visibleStart) / 10,
      frequencyPerDivision: frequencySpanHz / 8,
      amplitudePerDivision: 0.25 / Math.max(0.001, scopeOptions.waveformGain),
    }
  }, [events, scopeOptions, summary?.dominant_frequency_hz, vis, visibleEnd, visibleStart])
  const scopeMeasurements = useMemo(
    () => computeScopeMeasurements(vis, scopeOptions, visibleStart, visibleEnd, activeDuration),
    [activeDuration, scopeOptions, vis, visibleEnd, visibleStart],
  )
  const analysisWindow = useMemo(() => {
    if (!activeDuration) return null
    const clampWindow = (startValue: number, endValue: number, source: string) => {
      const start = clampNumber(Math.min(startValue, endValue), 0, Math.max(0, activeDuration - 0.001))
      const desiredEnd = clampNumber(Math.max(startValue, endValue), start + 0.001, activeDuration)
      const end = Math.min(desiredEnd, start + ANALYSIS_WINDOW_MAX_SEC, activeDuration)
      return {
        start,
        end,
        source,
        truncated: desiredEnd - start > ANALYSIS_WINDOW_MAX_SEC + 0.001,
      }
    }

    if (selectedRegion) return clampWindow(selectedRegion.start, selectedRegion.end, "selection")
    if (zoomRegion) return clampWindow(zoomRegion.start, zoomRegion.end, "zoom")
    if (visibleEnd > visibleStart) return clampWindow(visibleStart, visibleEnd, "visible scope")
    const centeredStart = clampNumber(currentTime - ANALYSIS_WINDOW_MAX_SEC / 2, 0, Math.max(0, activeDuration - ANALYSIS_WINDOW_MAX_SEC))
    return clampWindow(centeredStart, centeredStart + ANALYSIS_WINDOW_MAX_SEC, "playhead")
  }, [activeDuration, currentTime, selectedRegion, visibleEnd, visibleStart, zoomRegion])
  const strongestScopeBand = useMemo(
    () => [...scopeMeasurements.bands].sort((left, right) => right.share - left.share)[0] ?? null,
    [scopeMeasurements.bands],
  )
  const spectralFingerprintRows = useMemo<AcousticFingerprintRow[]>(() => {
    const maxShare = Math.max(0.001, ...scopeMeasurements.bands.map((band) => clampNumber(band.share, 0, 1)))
    return scopeMeasurements.bands.map((band) => {
      const peakCount = scopeMeasurements.peaks.filter(
        (peak) => peak.frequencyHz >= band.minHz && peak.frequencyHz <= band.maxHz,
      ).length
      return {
        ...band,
        normalized: clampNumber(band.share / maxShare, 0, 1),
        peakCount,
      }
    })
  }, [scopeMeasurements.bands, scopeMeasurements.peaks])
  const spectralFingerprintReady = useMemo(
    () => scopeMeasurements.hasData && spectralFingerprintRows.some((row) => row.share > 0 || row.peakCount > 0),
    [scopeMeasurements.hasData, spectralFingerprintRows],
  )
  const spectralFingerprintDominant = useMemo(
    () => spectralFingerprintRows.slice().sort((left, right) => right.share - left.share || right.peakCount - left.peakCount)[0] ?? null,
    [spectralFingerprintRows],
  )
  const spectralFingerprintCode = useMemo(() => {
    if (!spectralFingerprintReady) return "pending"
    return spectralFingerprintRows
      .map((row) => {
        const prefix = row.label
          .split(/\s+|\/+/)
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase())
          .join("")
          .slice(0, 3)
        return `${prefix || "B"}${Math.round(clampNumber(row.share, 0, 1) * 100)
          .toString()
          .padStart(2, "0")}`
      })
      .join("-")
  }, [spectralFingerprintReady, spectralFingerprintRows])
  const selectedRegionMeasurements = useMemo(
    () =>
      selectedRegion
        ? computeScopeMeasurements(vis, scopeOptions, selectedRegion.start, selectedRegion.end, activeDuration)
        : null,
    [activeDuration, scopeOptions, selectedRegion, vis],
  )
  const strongestSelectedRegionBand = useMemo(
    () => [...(selectedRegionMeasurements?.bands ?? [])].sort((left, right) => right.share - left.share)[0] ?? null,
    [selectedRegionMeasurements?.bands],
  )
  const selectedRegionDbSpan =
    selectedRegionMeasurements?.hasData && selectedRegionMeasurements.minDb != null && selectedRegionMeasurements.maxDb != null
      ? selectedRegionMeasurements.maxDb - selectedRegionMeasurements.minDb
      : null
  const scopeMeasurementRack = useMemo(() => {
    const dbSpan =
      scopeMeasurements.hasData && scopeMeasurements.minDb != null && scopeMeasurements.maxDb != null
        ? scopeMeasurements.maxDb - scopeMeasurements.minDb
        : null
    return [
      {
        icon: <Gauge className="h-3.5 w-3.5" />,
        label: "Centroid",
        value: formatHz(scopeMeasurements.centroidHz),
        detail: "power-weighted window",
      },
      {
        icon: <Activity className="h-3.5 w-3.5" />,
        label: "Avg power",
        value: formatDb(scopeMeasurements.avgDb),
        detail: scopeMeasurements.hasData ? "visible spectrogram" : "pending data",
      },
      {
        icon: <Zap className="h-3.5 w-3.5" />,
        label: "dB span",
        value: dbSpan != null ? `${dbSpan.toFixed(1)} dB` : "-",
        detail: scopeMeasurements.hasData ? `${formatDb(scopeMeasurements.minDb)} to ${formatDb(scopeMeasurements.maxDb)}` : "window pending",
      },
      {
        icon: <Target className="h-3.5 w-3.5" />,
        label: "Active band",
        value: strongestScopeBand?.share ? strongestScopeBand.label : "-",
        detail: strongestScopeBand?.share ? `${Math.round(clampNumber(strongestScopeBand.share, 0, 1) * 100)}% of window power` : "no band power",
      },
      {
        icon: <Grid3X3 className="h-3.5 w-3.5" />,
        label: "Cells",
        value: scopeMeasurements.cellCount ? scopeMeasurements.cellCount.toLocaleString() : "-",
        detail: "time-frequency samples",
      },
      {
        icon: <AudioLines className="h-3.5 w-3.5" />,
        label: "Top peak",
        value: formatHz(scopeMeasurements.peaks[0]?.frequencyHz),
        detail: scopeMeasurements.peaks[0] ? `${formatDb(scopeMeasurements.peaks[0].avgDb)} / ${scopeMeasurements.peaks[0].bandLabel}` : "peak pending",
      },
      {
        icon: <Timer className="h-3.5 w-3.5" />,
        label: "Window",
        value: `${formatDuration(visibleStart)}-${formatDuration(visibleEnd)}`,
        detail: scopeStats.visibleFrequencyRange,
      },
    ]
  }, [scopeMeasurements, scopeStats.visibleFrequencyRange, strongestScopeBand, visibleEnd, visibleStart])
  const detectorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    events.forEach((event) => {
      const key = eventGroupKey(event)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  }, [events])
  const filteredEvents = useMemo(() => {
    const normalized = eventQuery.trim().toLowerCase()
    return events.filter((event) => {
      if (eventFamilyFilter !== "all" && !eventMatchesTerms(event, eventFamilyTerms[eventFamilyFilter])) return false
      if (normalized && !acousticEventText(event).includes(normalized)) return false
      return true
    })
  }, [eventFamilyFilter, eventQuery, events])
  const detectorGroups = useMemo(() => {
    const groups = new Map<string, DetectionEvent[]>()
    filteredEvents.forEach((event) => {
      const groupKey = eventGroupKey(event)
      const current = groups.get(groupKey) ?? []
      current.push(event)
      groups.set(groupKey, current)
    })
    return Array.from(groups.entries()).sort((left, right) => right[1].length - left[1].length)
  }, [filteredEvents])
  const selectedDetectorEvent = useMemo(
    () => events.find((event) => eventStableKey(event) === selectedEventKey) ?? null,
    [events, selectedEventKey],
  )
  const activeDetectorEvent = useMemo(() => {
    const currentEvents = events
      .filter((event) => event.start_sec != null && event.end_sec != null)
      .filter((event) => currentTime >= (event.start_sec ?? 0) && currentTime <= (event.end_sec ?? 0))
      .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
    if (currentEvents[0]) return currentEvents[0]

    const nearby = events
      .map((event) => {
        const anchor = eventAnchorTime(event)
        return anchor == null ? null : { event, distance: Math.abs(anchor - currentTime) }
      })
      .filter((item): item is { event: DetectionEvent; distance: number } => Boolean(item))
      .sort((left, right) => left.distance - right.distance)
    return nearby[0]?.distance != null && nearby[0].distance <= 0.25 ? nearby[0].event : null
  }, [currentTime, events])
  const inspectedDetectorEvent = selectedDetectorEvent ?? activeDetectorEvent
  const liveReadout = useMemo(() => {
    if (activeTranscript) {
      return {
        badge: "Live sound transcript",
        title: activeTranscript.label,
        detail:
          activeTranscript.description ||
          activeTranscript.sound_source ||
          "Backend returned an evidence-backed transcript window for this time range.",
        meta: [
          `${activeTranscript.start_sec.toFixed(2)}-${activeTranscript.end_sec.toFixed(2)}s`,
          activeTranscript.frequency_range,
          activeTranscript.sound_source,
          activeTranscript.confidence != null ? formatPercent(activeTranscript.confidence) : null,
        ].filter((value): value is string => Boolean(value)),
        tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      }
    }

    if (activeDetectorEvent) {
      return {
        badge: "Raw detector focus",
        title: cleanLabel(activeDetectorEvent.label),
        detail: "Detector window under the playhead. This is not a confirmed sound meaning until model evidence backs it.",
        meta: [
          detectorLabel(activeDetectorEvent.detector_id),
          eventTimeLabel(activeDetectorEvent),
          formatHz(activeDetectorEvent.frequency_hz),
          activeDetectorEvent.confidence != null ? formatPercent(activeDetectorEvent.confidence) : null,
        ].filter((value): value is string => Boolean(value)),
        tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
      }
    }

    if (analysis) {
      return {
        badge: "Model evidence pending",
        title: "No confirmed meaning at the current playhead",
        detail: "Use the scope, trigger, spectrum, and detector lanes while MINDEX builds real model outputs and transcripts.",
        meta: [`${events.length} detector events`, `${displayTranscripts.length} transcript windows`, formatDuration(currentTime)],
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }

    return {
      badge: "Playback readout",
      title: "Run a detector pass for raw evidence lanes",
      detail: "Confirmed meaning appears only when MINDEX returns model outputs, fusion evidence, or evidence-backed transcripts.",
      meta: [formatDuration(currentTime), selected ? cleanLabel(inferEnvironment(selected)) : null].filter((value): value is string => Boolean(value)),
      tone: "border-white/10 bg-white/[0.04] text-slate-300",
    }
  }, [activeDetectorEvent, activeTranscript, analysis, currentTime, displayTranscripts.length, events.length, selected])
  const inspectedEventMetadataRows = useMemo(
    () => normalizeDiagnostics(inspectedDetectorEvent?.metadata ?? {}),
    [inspectedDetectorEvent],
  )
  const signalStackRows = useMemo(() => {
    const countByTerms = (terms: string[]) => events.filter((event) => eventMatchesTerms(event, terms)).length
    const countByDetector = (detector: string) => events.filter((event) => event.detector_id === detector || eventGroupKey(event) === detector).length
    const countByFamily = (families: string[], terms: string[]) =>
      events.filter((event) => families.includes(eventGroupKey(event)) || eventMatchesTerms(event, terms)).length
    return [
      {
        icon: <PawPrint className="h-4 w-4" />,
        label: "Animal life",
        value: `${countByFamily(["animal_life"], [
          "bird",
          "animal",
          "bioacoustic",
          "bioacoustics",
          "whale",
          "dolphin",
          "seal",
          "porpoise",
          "fish",
          "mammal",
          "animal",
          "fauna",
          "marine life",
          "terrestrial",
          "frog",
          "bat",
          "coyote",
          "dog",
          "cat",
          "deer",
        ])} events`,
      },
      {
        icon: <Bug className="h-4 w-4" />,
        label: "Insects",
        value: `${countByFamily(["insect"], ["insect", "cricket", "cicada", "katydid", "bee", "mosquito", "bug", "beetle", "moth", "fly", "grasshopper", "stridulation"])} events`,
      },
      {
        icon: <Plane className="h-4 w-4" />,
        label: "Air propellers",
        value: `${countByFamily(["air_propeller"], ["uav", "drone", "quad", "quadcopter", "helicopter", "aircraft", "airplane", "plane", "jet", "air propeller", "air prop", "rotor", "blade pass"])} events`,
      },
      {
        icon: <ShipWheel className="h-4 w-4" />,
        label: "Water propellers",
        value: `${countByFamily(["water_propeller", "vessel_engine"], ["vessel", "boat", "ship", "submarine", "cavitation", "marine engine", "water propeller", "underwater propeller", "water prop", "thruster", "hydrophone propeller"])} events`,
      },
      {
        icon: <Zap className="h-4 w-4" />,
        label: "Impulse / explosions",
        value: `${countByFamily(["impulse_explosion", "weather_lightning"], ["explosion", "blast", "detonation", "impulse", "shock", "gunshot", "bang", "sonic boom", "lightning", "thunder", "thunderclap", "pressure wave"])} events`,
      },
      {
        icon: <Waves className="h-4 w-4" />,
        label: "Ground / seismic",
        value: `${countByFamily(["ground_seismic", "earthquake_seismic", "geophysical"], ["earthquake", "seismic", "geophone", "ground", "soil", "underground", "subsurface", "buried", "tremor", "landslide", "surface vibration"])} events`,
      },
      {
        icon: <Gauge className="h-4 w-4" />,
        label: "Mechanical",
        value: `${countByFamily(["mechanical"], ["mechanical", "engine", "motor", "servo", "actuator", "bearing", "pump", "industrial", "machine", "generator"])} events`,
      },
      {
        icon: <Activity className="h-4 w-4" />,
        label: "Activity",
        value: `${countByDetector("activity_auditok")} segments`,
      },
      {
        icon: <AudioLines className="h-4 w-4" />,
        label: "Frequency",
        value: `${countByDetector("frequency_fft")} peaks`,
      },
      {
        icon: <Radar className="h-4 w-4" />,
        label: "Pattern rows",
        value: `${countByDetector("deep_signal_features")} rows`,
      },
    ]
  }, [events])
  const analysisRunId = useMemo(() => {
    if (!analysis) return null
    const candidate = analysis.analysis_run_id || analysis.run_id || analysis.id
    return typeof candidate === "string" && candidate.trim() ? candidate : null
  }, [analysis])
  const analysisJobId = useMemo(() => {
    if (!analysis) return null
    const job = objectValue(analysis.job)
    return stringValue(analysis.job_id || analysis.analysis_job_id || analysis.queue_id || job?.id)
  }, [analysis])
  const analysisStatus = useMemo(() => {
    if (!analysis) return null
    const job = objectValue(analysis.job)
    const summaryRecord = objectValue(analysis.summary)
    const identificationRecord = objectValue(analysis.identification_summary)
    return stringValue(
      analysis.status ||
        analysis.state ||
        analysis.analysis_status ||
        analysis.model_status ||
        summaryRecord?.status ||
        summaryRecord?.state ||
        summaryRecord?.model_status ||
        summaryRecord?.model_state ||
        identificationRecord?.status ||
        identificationRecord?.model_status ||
        job?.status ||
        job?.state ||
      job?.model_status,
    )
  }, [analysis])
  useEffect(() => {
    analysisRunIdRef.current = analysisRunId
  }, [analysisRunId])
  useEffect(() => {
    analysisJobIdRef.current = analysisJobId
  }, [analysisJobId])
  const modelOutputs = useMemo(
    () => normalizeModelOutputs(analysis?.model_outputs),
    [analysis?.model_outputs],
  )
  const registeredModelSummaryOutputs = useMemo(
    () => normalizeModelOutputs(sineModelsPayload),
    [sineModelsPayload],
  )
  const registeredModelDetailOutputs = useMemo(
    () => normalizeModelOutputs(sineModelDetailPayload),
    [sineModelDetailPayload],
  )
  const registeredModelOutputs = useMemo(() => {
    if (!registeredModelDetailOutputs.length) return registeredModelSummaryOutputs
    const detailKeys = new Set(registeredModelDetailOutputs.map(sineModelMergeKey).filter(Boolean))
    return [
      ...registeredModelDetailOutputs,
      ...registeredModelSummaryOutputs.filter((output) => !detailKeys.has(sineModelMergeKey(output))),
    ]
  }, [registeredModelDetailOutputs, registeredModelSummaryOutputs])
  const leadingModelDetailId = useMemo(
    () => sineModelLookupId(registeredModelSummaryOutputs[0] ?? null),
    [registeredModelSummaryOutputs],
  )
  const registeredPrototypeCatalog = useMemo(
    () => normalizePrototypeCatalog(sinePrototypesPayload),
    [sinePrototypesPayload],
  )
  const registeredPrototypeDomains = useMemo(
    () =>
      Array.from(
        new Set(
          registeredPrototypeCatalog
            .flatMap((prototype) => [prototype.domain, prototype.category])
            .map((item) => (item ? cleanLabel(item) : ""))
            .filter(Boolean),
        ),
      ).slice(0, 12),
    [registeredPrototypeCatalog],
  )
  const registeredDomainCoverage = useMemo(
    () =>
      Array.from(
        new Set(
          registeredModelOutputs
            .flatMap((output) => [...output.domain_heads, ...output.target_domains, ...output.class_families])
            .map((item) => cleanLabel(item))
            .filter(Boolean),
        ),
      ).slice(0, 18),
    [registeredModelOutputs],
  )
  const fusionEvidenceRows = useMemo(
    () => normalizeFusionEvidence(analysis?.fusion_evidence),
    [analysis?.fusion_evidence],
  )
  const provenFusionEvidenceRows = useMemo(
    () => fusionEvidenceRows.filter(fusionEvidenceHasModelOrPrototypeProof),
    [fusionEvidenceRows],
  )
  const analysisProvenance = useMemo(() => analysisProvenanceIssue(analysis), [analysis])
  const analysisContractFailed = analysisProvenance.status === "contract_violation" || analysisProvenance.status === "quarantined"
  const isUnverifiedPrototypeEvent = useCallback(
    (event: DetectionEvent) => analysisContractFailed && eventGroupKey(event) === "prototype_match",
    [analysisContractFailed],
  )
  const eventGroupDisplayLabel = useCallback(
    (key: string) => (analysisContractFailed && key === "prototype_match" ? "Unverified backend matches" : eventGroupLabel(key)),
    [analysisContractFailed],
  )
  const detectorDisplayLabel = useCallback(
    (detector: string) =>
      analysisContractFailed && detectorFamilyFallbacks[detector] === "prototype_match"
        ? "Unverified backend row"
        : detectorLabel(detector),
    [analysisContractFailed],
  )
  const eventDisplayLabel = useCallback(
    (event: DetectionEvent) => (isUnverifiedPrototypeEvent(event) ? "Unverified backend row" : cleanLabel(event.label)),
    [isUnverifiedPrototypeEvent],
  )
  const eventDisplayDetail = useCallback(
    (event: DetectionEvent) => {
      if (isUnverifiedPrototypeEvent(event)) {
        return [event.method || event.engine || event.model || event.detector_id, "evidence missing"]
          .filter(Boolean)
          .map(cleanLabel)
          .join(" / ")
      }
      return [event.acoustic_domain, event.event_type || event.category].filter(Boolean).map(cleanLabel).join(" / ") || detectorLabel(event.detector_id)
    },
    [isUnverifiedPrototypeEvent],
  )
  const prototypeNeighbors = useMemo(
    () => buildPrototypeNeighbors(deepSignalMatches, fusionEvidenceRows),
    [deepSignalMatches, fusionEvidenceRows],
  )
  const evidenceBackedTranscripts = useMemo(
    () => displayTranscripts.filter(transcriptHasModelOrPrototypeEvidence),
    [displayTranscripts],
  )
  const provenModelOutputs = useMemo(
    () =>
      modelOutputs.filter((output) => {
        if (analysisProvenance.status === "quarantined") return false
        return modelOutputHasProvenance(output)
      }),
    [analysisProvenance.status, modelOutputs],
  )
  const openSetReviewModelOutputs = useMemo(
    () => provenModelOutputs.filter(modelOutputIsOpenSetReview),
    [provenModelOutputs],
  )
  const confirmedModelOutputs = useMemo(
    () => provenModelOutputs.filter((output) => !modelOutputIsOpenSetReview(output)),
    [provenModelOutputs],
  )
  const hasConfirmedModelEvidence =
    analysisProvenance.status !== "quarantined" &&
    (confirmedModelOutputs.length > 0 || provenFusionEvidenceRows.length > 0 || prototypeNeighbors.length > 0 || evidenceBackedTranscripts.length > 0)
  const identificationLabel =
    hasConfirmedModelEvidence && modelTopLabel ? cleanLabel(modelTopLabel) : analysis ? "Model evidence pending" : "No identification yet"
  const identificationConfidence = hasConfirmedModelEvidence ? formatPercent(summary?.confidence) : "pending"
  const runGate = useMemo(() => {
    const normalizedStatus = (analysisStatus || "").toLowerCase()
    const queued = ["queued", "queue", "pending", "scheduled", "accepted"].some((term) => normalizedStatus.includes(term))
    const running = ["running", "processing", "in_progress", "working"].some((term) => normalizedStatus.includes(term))
    const modelUnavailable =
      normalizedStatus.includes("model_unavailable") ||
      normalizedStatus.includes("model unavailable") ||
      modelOutputs.some((output) => ["unavailable", "model_unavailable", "not_loaded"].includes((output.status || "").toLowerCase()))
    const modelRegistryMissing = !registeredModelOutputs.length && Boolean(sineModelsError)

    if (!selected) {
      return {
        mode: "No file selected",
        detail: "Select a real acoustic Library file before running SINE.",
        buttonLabel: "Select file",
        buttonTitle: "Select a recording first.",
        disabled: true,
        tone: "border-white/10 bg-white/[0.04] text-slate-300",
      }
    }
    if (!selectedAnalysisId) {
      return {
        mode: "Registry link missing",
        detail: "This recording can play from storage, but SINE evidence checks need the matching MINDEX acoustic record.",
        buttonLabel: "Record link needed",
        buttonTitle: "The Library returned a path-only file row. MINDEX must return the database blob UUID before SINE can analyze and save this recording.",
        disabled: true,
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }
    if (analysisProvenance.status === "quarantined") {
      return {
        mode: "Prototype output quarantined",
        detail: analysisProvenance.detail,
        buttonLabel: "Rerun evidence check",
        buttonTitle: "Backend returned prototype/mock/Gemini/synthetic markers; rerun after Cursor replaces the backend classifier.",
        disabled: analyzing,
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      }
    }
    if (analysisProvenance.status === "contract_violation") {
      return {
        mode: "Semantic contract violation",
        detail: analysisProvenance.detail,
        buttonLabel: "Rerun evidence check",
        buttonTitle: "Backend returned a semantic label without required model/prototype/fusion evidence. Cursor must replace this backend behavior.",
        disabled: analyzing,
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      }
    }
    if (queued || running) {
      return {
        mode: running ? "Analysis running" : "Analysis queued",
        detail: analysisJobId
          ? `Backend job ${analysisJobId}${analysisPolling ? " is being checked for fresh results." : "."}`
          : `Backend returned queued/running state without a job id${analysisPolling ? "; checking for fresh results." : "."}`,
        buttonLabel: analysisPolling ? "Checking job..." : running ? "Evidence check running" : "Evidence check queued",
        buttonTitle: "Backend returned a queued or running evidence-check state; the player checks the latest saved run.",
        disabled: true,
        tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
      }
    }
    if (selectedNeedsShortPath) {
      const windowLabel = analysisWindow
        ? `${formatDuration(analysisWindow.start)}-${formatDuration(analysisWindow.end)}`
        : "bounded window"
      return {
        mode: "Windowed evidence check",
        detail: `This long recording will send the ${analysisWindow?.source ?? "current"} window (${windowLabel}) to MINDEX. Backend may queue it if model inference is not immediate.`,
        buttonLabel: "Run windowed SINE",
        buttonTitle: "Runs a bounded selected, zoomed, visible, or playhead window instead of the entire long recording.",
        disabled: analyzing || !analysisWindow,
        tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
      }
    }
    if (modelUnavailable) {
      return {
        mode: "Model unavailable",
        detail: "MINDEX reported unavailable model evidence. Detector lanes may still be useful, but confirmed SINE meaning is not ready.",
        buttonLabel: "Rerun evidence check",
        buttonTitle: "Runs deterministic detector/visualisation evidence, but backend model evidence is unavailable.",
        disabled: analyzing,
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      }
    }
    if (modelRegistryMissing) {
      return {
        mode: "AI model not loaded",
        detail: "The acoustic library is reachable, but MINDEX has not exposed a trained SINE model registry yet. This run can check signal evidence, not confirmed sound meaning.",
        buttonLabel: "Run evidence check",
        buttonTitle: "Runs the current SINE signal evidence check. Confirmed identification requires registered model outputs, prototype matches, fusion evidence, or transcripts.",
        disabled: analyzing,
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }
    if (openSetReviewModelOutputs.length) {
      const statusLabel = openSetReviewModelOutputs[0]?.ood_status
        ? cleanLabel(openSetReviewModelOutputs[0].ood_status)
        : "review required"
      return {
        mode: "Open-set review",
        detail: `${openSetReviewModelOutputs.length} model output row${openSetReviewModelOutputs.length === 1 ? "" : "s"} returned as ${statusLabel}. SINE will keep the evidence, but it will not treat this as confirmed sound meaning.`,
        buttonLabel: "Rerun evidence check",
        buttonTitle: "The model produced review/OOD output. Human tags and future prototype training can use it, but it is not a confirmed identification.",
        disabled: analyzing,
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }
    if (hasConfirmedModelEvidence) {
      return {
        mode: "Model evidence ready",
        detail: "Backend returned model, fusion, prototype, or transcript evidence.",
        buttonLabel: "Rerun model-backed check",
        buttonTitle: "Runs SINE again against this short recording and replaces the visible evidence response.",
        disabled: analyzing,
        tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      }
    }
    if (analysis) {
      return {
        mode: "Detector-only result",
        detail: "The backend returned raw detector output without trained model evidence or sound transcript windows.",
        buttonLabel: "Rerun evidence check",
        buttonTitle: "Runs the current MINDEX detector evidence check. Confirmed meaning requires model outputs, fusion evidence, or sound transcripts.",
        disabled: analyzing,
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }
    return {
      mode: "Short-file pass",
      detail: "Ready to ask SINE for signal evidence and any available model proof on this short recording.",
      buttonLabel: "Run evidence check",
      buttonTitle: "Runs the current MINDEX detector pass. Confirmed meaning appears only when MINDEX returns model outputs, fusion evidence, or sound transcripts.",
      disabled: analyzing,
      tone: "border-white/10 bg-white/[0.04] text-slate-300",
    }
  }, [analysis, analysisJobId, analysisPolling, analysisProvenance.detail, analysisProvenance.status, analysisStatus, analysisWindow, analyzing, hasConfirmedModelEvidence, modelOutputs, openSetReviewModelOutputs, registeredModelOutputs.length, selected, selectedAnalysisId, selectedNeedsShortPath, sineModelsError])
  const analysisButtonLabel = analyzing ? "Analyzing..." : runGate.buttonLabel
  const analysisButtonTitle = runGate.buttonTitle
  const sineStatusSummary = useMemo(() => {
    const payload: Record<string, unknown> = sineStatusPayload ? recordValue(sineStatusPayload) ?? sineStatusPayload : {}
    const registryPayload: Record<string, unknown> = sineModelsPayload ? recordValue(sineModelsPayload) ?? sineModelsPayload : {}
    const statusModels = recordArrayFromPayload(payload, ["models", "items", "rows", "registered_models", "model_registry", "loaded_models"])
    const registryModels = recordArrayFromPayload(registryPayload, ["models", "items", "rows", "registered_models", "model_registry", "loaded_models"])
    const models = [...statusModels, ...registryModels]
    const activeModel: Record<string, unknown> =
      recordValue(payload.active_model) ||
      recordValue(payload.model) ||
      recordValue(payload.model_registry) ||
      recordValue(registryPayload.active_model) ||
      recordValue(registryPayload.model) ||
      models[0] ||
      {}
    const modelContext = extractSineModelContext(payload, registryPayload, activeModel, analysisModelContext)
    const detectors = textListValue(payload.detectors ?? payload.default_detectors ?? payload.registered_detectors)
    const detectorStatus = normalizeStringMap(payload.detector_status) ?? {}
    const statusText =
      stringValue(
        modelContext?.modelStatus ??
          payload.status ??
          payload.state ??
          payload.service_status ??
          payload.model_status ??
          registryPayload.status ??
          registryPayload.state ??
          activeModel.status ??
          activeModel.state,
      ) || (sineStatusLoading || sineModelsLoading ? "loading" : sineStatusError || sineModelsError ? "unavailable" : "not checked")
    const modelName =
      stringValue(
        payload.model_name ??
          payload.model_id ??
          payload.active_model_id ??
          registryPayload.model_name ??
          registryPayload.model_id ??
          registryPayload.active_model_id ??
          activeModel.model_name ??
          activeModel.name ??
          activeModel.id ??
          activeModel.model_id ??
          activeModel.registry_id,
      ) || stringValue(payload.model_version ?? registryPayload.model_version ?? activeModel.model_version ?? activeModel.version)
    const modelVersion = stringValue(payload.model_version ?? payload.version ?? registryPayload.model_version ?? registryPayload.version ?? activeModel.model_version ?? activeModel.version)
    const framework = stringValue(payload.framework ?? payload.inference_framework ?? registryPayload.framework ?? registryPayload.inference_framework ?? activeModel.framework ?? activeModel.inference_framework)
    const runtime = stringValue(payload.runtime ?? payload.inference_runtime ?? payload.runtime_name ?? payload.engine ?? registryPayload.runtime ?? registryPayload.inference_runtime ?? registryPayload.runtime_name ?? registryPayload.engine ?? activeModel.runtime ?? activeModel.inference_runtime ?? activeModel.runtime_name ?? activeModel.engine)
    const artifact = stringValue(
      payload.artifact_uri ??
        payload.artifact_path ??
        payload.artifact ??
        payload.model_path ??
        payload.checkpoint_path ??
        registryPayload.artifact_uri ??
        registryPayload.artifact_path ??
        registryPayload.artifact ??
        registryPayload.model_path ??
        registryPayload.checkpoint_path ??
        activeModel.artifact_uri ??
        activeModel.artifact_path ??
        activeModel.artifact ??
        activeModel.model_path ??
        activeModel.checkpoint_path,
    )
    const checksum = stringValue(
      payload.model_checksum ??
        payload.artifact_sha256 ??
        payload.checksum ??
        payload.sha256 ??
        registryPayload.model_checksum ??
        registryPayload.artifact_sha256 ??
        registryPayload.checksum ??
        registryPayload.sha256 ??
        activeModel.model_checksum ??
        activeModel.artifact_sha256 ??
        activeModel.checksum ??
        activeModel.sha256,
    )
    const device = stringValue(payload.device ?? payload.inference_device ?? registryPayload.device ?? registryPayload.inference_device ?? activeModel.device ?? activeModel.inference_device)
    const backendCommit = stringValue(payload.backend_commit ?? payload.git_commit ?? payload.git_sha ?? registryPayload.backend_commit ?? registryPayload.git_commit ?? registryPayload.git_sha ?? activeModel.backend_commit ?? activeModel.git_commit ?? activeModel.git_sha)
    const lastInference = stringValue(
      payload.last_successful_inference_at ??
        payload.last_inference_at ??
        payload.last_inference_started_at ??
        registryPayload.last_successful_inference_at ??
        registryPayload.last_inference_at ??
        registryPayload.last_inference_started_at ??
        activeModel.last_successful_inference_at ??
        activeModel.last_inference_at ??
        activeModel.last_inference_started_at,
    )
    const modelReadyFlag = booleanValue(
      modelContext?.modelReady ??
        payload.model_ready ??
        payload.model_loaded ??
        registryPayload.model_ready ??
        registryPayload.model_loaded ??
        activeModel.model_ready ??
        activeModel.model_loaded ??
        activeModel.is_loaded ??
        activeModel.ready ??
        activeModel.loaded,
    )
    const loadedModelCount = finiteNumber(
      modelContext?.loadedModels ??
        payload.models_loaded ??
        payload.loaded_models ??
        payload.model_count ??
        payload.total_models ??
        payload.loaded_count ??
        registryPayload.models_loaded ??
        registryPayload.loaded_models ??
        registryPayload.model_count ??
        registryPayload.total_models ??
        registryPayload.loaded_count ??
        registryPayload.total,
    )
    const registeredModelCount = finiteNumber(
      modelContext?.registeredModels ??
        payload.registered_models ??
        payload.model_count ??
        payload.total_models ??
        registryPayload.registered_models ??
        registryPayload.model_count ??
        registryPayload.total_models ??
        registryPayload.total,
    )
    const runtimeBackends = recordValue(modelContext?.runtimeBackends) ?? {}
    const runtimeBackendChips = Object.entries(runtimeBackends)
      .map(([key, value]) => `${cleanLabel(key)} ${booleanValue(value) === true ? "ready" : booleanValue(value) === false ? "missing" : String(value)}`)
      .slice(0, 4)
    const blockingReasons = modelContext?.blockingReasons ?? []
    const runtimeSupported = modelContext?.runtimeSupported === true
    const inferenceReady = modelContext?.inferenceReady === true
    const registryReady = modelContext?.registryReady === true || (registeredModelCount ?? 0) > 0
    const prototypeReady = modelContext?.prototypeReady === true
    const hasModelProof = Boolean(modelName && (framework || runtime || artifact || checksum || loadedModelCount))
    const statusLower = statusText.toLowerCase()
    const saysReady =
      statusLower.includes("model_ready") ||
      statusLower.includes("model ready") ||
      statusLower.includes("loaded") ||
      statusLower.includes("live")
    const saysUnavailable =
      statusLower.includes("unavailable") ||
      statusLower.includes("not_loaded") ||
      statusLower.includes("not loaded") ||
      statusLower.includes("missing")
    const detectorReady = detectors.length > 0 || Object.keys(detectorStatus).length > 0
    const modelRuntimeLive = inferenceReady && (modelReadyFlag === true || saysReady) && hasModelProof && !saysUnavailable
    const chips = [
      statusText ? cleanLabel(statusText) : null,
      modelName ? cleanLabel([modelName, modelVersion].filter(Boolean).join(" ")) : null,
      [framework, runtime].filter(Boolean).join(" / ") || null,
      registeredModelCount != null ? `${registeredModelCount} registered` : null,
      loadedModelCount != null ? `${loadedModelCount} loaded` : null,
      runtimeBackendChips.length ? runtimeBackendChips.join(" / ") : null,
      runtimeSupported ? "runtime supported" : null,
      inferenceReady ? "inference ready" : null,
      prototypeReady ? "prototype catalog" : null,
      device ? cleanLabel(device) : null,
      artifact ? `artifact ${artifact.split(/[\\/]/).pop() || artifact}` : null,
      checksum ? `sha ${checksum.slice(0, 10)}` : null,
      sineModelDetailLoading ? "artifact detail checking" : null,
      sineModelDetailError ? `artifact detail ${cleanLabel(sineModelDetailError)}` : null,
      backendCommit ? `commit ${backendCommit.slice(0, 10)}` : null,
      lastInference ? `last ${lastInference}` : null,
      ...blockingReasons.slice(0, 4).map((reason) => `blocked ${cleanLabel(reason)}`),
    ].filter((item): item is string => Boolean(item))

    if ((sineStatusLoading || sineModelsLoading || sineModelDetailLoading) && !sineStatusPayload && !sineModelsPayload) {
      return {
        badge: "checking",
        label: "Checking SINE service",
        detail: "Reading the real MINDEX SINE status endpoint.",
        tone: "border-cyan-300/20 bg-cyan-300/8 text-cyan-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (sineStatusError && !sineModelsPayload) {
      return {
        badge: "status down",
        label: "SINE status unavailable",
        detail: sineStatusError,
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (blockingReasons.length) {
      return {
        badge: "model blocked",
        label: "Model runtime blocked",
        detail: blockingReasons
          .slice(0, 3)
          .map(cleanLabel)
          .join(" / "),
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (modelRuntimeLive) {
      return {
        badge: "model live",
        label: "Model runtime live",
        detail: `${[framework, runtime].filter(Boolean).join(" / ") || "model runtime"}${artifact || checksum ? " with artifact provenance" : ""}.`,
        tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: true,
      }
    }
    if (registryReady && !inferenceReady) {
      return {
        badge: "model pending",
        label: "Model registry pending inference",
        detail: runtimeSupported
          ? "Registry/runtime context exists, but no verified inference output is ready yet."
          : "Model registry exists, but runtime dependencies or artifact verification are not proven.",
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (modelReadyFlag === false || saysUnavailable) {
      return {
        badge: "model missing",
        label: "Model unavailable",
        detail: "MINDEX status is reachable, but no loaded model artifact is proven yet.",
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (detectorReady) {
      return {
        badge: "detectors",
        label: "Detector service reachable",
        detail: "MINDEX reports detector availability, but not a proven trained model runtime.",
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    if (sineStatusPayload || sineModelsPayload) {
      return {
        badge: "reachable",
        label: "SINE status reachable",
        detail: "SINE endpoint responded, but did not include detector or model runtime evidence.",
        tone: "border-white/10 bg-white/[0.04] text-slate-300",
        detectors,
        detectorStatus,
        chips,
        modelRuntimeLive: false,
      }
    }
    return {
      badge: "status pending",
      label: "SINE status pending",
      detail: "SINE status has not returned yet.",
      tone: "border-white/10 bg-white/[0.04] text-slate-300",
      detectors,
      detectorStatus,
      chips,
      modelRuntimeLive: false,
    }
  }, [
    analysisModelContext,
    sineModelDetailError,
    sineModelDetailLoading,
    sineModelsError,
    sineModelsLoading,
    sineModelsPayload,
    sineStatusError,
    sineStatusLoading,
    sineStatusPayload,
  ])
  const detectorStatusEntries = useMemo(() => {
    const statuses = { ...sineStatusSummary.detectorStatus, ...(summary?.detector_status ?? {}) }
    const statusEntries = Object.entries(statuses).map(([detector, state]) => ({
      detector,
      label: eventGroupDisplayLabel(canonicalEventFamily(detector, detector) || detector),
      state: String(state || "reported"),
    }))
    const existing = new Set(statusEntries.map((entry) => entry.detector))
    const listEntries = Array.from(new Set([...sineStatusSummary.detectors, ...detectorList]))
      .filter((detector) => !existing.has(detector))
      .map((detector) => ({
        detector,
        label: detectorLabel(detector),
        state: analysis ? "ready" : "registered",
    }))
    return [...statusEntries, ...listEntries].slice(0, 14)
  }, [analysis, detectorList, eventGroupDisplayLabel, sineStatusSummary.detectorStatus, sineStatusSummary.detectors, summary?.detector_status])
  const detectorStackRows = useMemo(() => {
    const statuses = { ...sineStatusSummary.detectorStatus, ...(summary?.detector_status ?? {}) }
    const detectors = new Set<string>([
      ...sineStatusSummary.detectors,
      ...detectorList,
      ...Object.keys(statuses),
      ...events.map((event) => event.detector_id).filter(Boolean),
    ])
    return Array.from(detectors)
      .map((detector) => {
        const relatedEvents = events.filter((event) => event.detector_id === detector)
        const observedMethods = Array.from(
          new Set(
            relatedEvents
              .map((event) => event.method || event.engine || event.model || event.model_version || stringValue(event.metadata?.method))
              .filter((value): value is string => Boolean(value)),
          ),
        )
        const state = stringValue(statuses[detector]) || (relatedEvents.length ? "observed" : analysis ? "registered" : "ready")
        return {
          detector,
          label: detectorDisplayLabel(detector),
          layer: detectorLayer(detector),
          state,
          eventCount: relatedEvents.length,
          method: observedMethods[0] || "method pending",
        }
      })
      .sort((left, right) => {
        const layerDelta = detectorLayerOrder.indexOf(left.layer) - detectorLayerOrder.indexOf(right.layer)
        return layerDelta || right.eventCount - left.eventCount || left.label.localeCompare(right.label)
      })
  }, [analysis, detectorDisplayLabel, detectorList, events, sineStatusSummary.detectorStatus, sineStatusSummary.detectors, summary?.detector_status])

  const evidenceChecklist = useMemo(() => {
    const waveformPoints = waveformSampleCount(vis)
    const spectrogramRows = vis?.spectrogram?.power_db?.length ?? 0
    const spectrogramCols = vis?.spectrogram?.power_db?.[0]?.length ?? 0
    const realFileReady = Boolean(selected?.stream_url || selected?.relative_path || selected?.id)
    const realVisualisationReady = waveformPoints >= 2048 && spectrogramRows >= 96 && spectrogramCols >= 256
    const modelRuntimeReady = sineStatusSummary.modelRuntimeLive
    const perRunModelEvidence = provenModelOutputs.length > 0
    const acceptedModelIdentity = confirmedModelOutputs.length > 0
    const prototypeEvidence = prototypeNeighbors.length > 0
    const fusionEvidenceReady = provenFusionEvidenceRows.length > 0
    const transcriptEvidenceReady = evidenceBackedTranscripts.length > 0
    const semanticContractClean = analysis ? analysisProvenance.status !== "contract_violation" && analysisProvenance.status !== "quarantined" : false
    const missingModelStatus =
      analysisStatus?.toLowerCase().includes("model_unavailable") ||
      modelOutputs.some((output) => ["unavailable", "model_unavailable", "not_loaded"].includes((output.status || "").toLowerCase()))

    return [
      {
        label: "Real Library audio",
        ready: realFileReady,
        detail: realFileReady ? "NAS-backed acoustic file selected." : "Select a real MINDEX acoustic file.",
      },
      {
        label: "High-definition scope",
        ready: realVisualisationReady,
        detail: realVisualisationReady
          ? `${waveformPoints.toLocaleString()} waveform points / ${spectrogramRows} x ${spectrogramCols} spectrogram.`
          : "Needs real waveform and spectrogram arrays from MINDEX or browser decode.",
      },
      {
        label: "Registered model runtime",
        ready: modelRuntimeReady,
        detail: modelRuntimeReady ? "Model registry proves runtime/artifact readiness." : "No trained model artifact is proven loaded.",
      },
      {
        label: "Per-run model output",
        ready: perRunModelEvidence,
        detail: perRunModelEvidence
          ? `${provenModelOutputs.length} proven model output row(s); ${openSetReviewModelOutputs.length} held for OOD/open-set review.`
          : "Current run did not return model_outputs with top labels.",
      },
      {
        label: "Accepted model identity",
        ready: acceptedModelIdentity,
        detail: acceptedModelIdentity
          ? `${confirmedModelOutputs.length} model output row(s) passed the open-set guard.`
          : openSetReviewModelOutputs.length
            ? "Model output exists, but it is low-confidence or out-of-domain and must stay in review."
            : "No model output has passed confidence/OOD thresholds for identity.",
      },
      {
        label: "Prototype / fingerprint match",
        ready: prototypeEvidence,
        detail: prototypeEvidence
          ? `${prototypeNeighbors.length} proven per-run prototype or neighbor row(s).`
          : registeredPrototypeCatalog.length
            ? `${registeredPrototypeCatalog.length} registered prototype row(s), but this recording did not return a proven match.`
            : "No prototype catalog or proven per-run deep-signal match returned.",
      },
      {
        label: "Fusion evidence",
        ready: fusionEvidenceReady,
        detail: fusionEvidenceReady ? `${provenFusionEvidenceRows.length} model/prototype fusion row(s) returned.` : "No model/prototype fusion evidence returned.",
      },
      {
        label: "Evidence-backed transcript",
        ready: transcriptEvidenceReady,
        detail: transcriptEvidenceReady
          ? `${evidenceBackedTranscripts.length} transcript window(s) with model/fusion/prototype IDs.`
          : "No sound transcript window with model, fusion, or prototype evidence links returned.",
      },
      {
        label: "Semantic contract clean",
        ready: semanticContractClean,
        detail: semanticContractClean
          ? "No semantic contract violation detected in the loaded analysis."
          : missingModelStatus
            ? "Backend honestly reported model unavailable."
            : "Backend must avoid semantic labels without model/prototype/fusion evidence.",
      },
    ]
  }, [
    analysis,
    analysisProvenance.status,
    analysisStatus,
    confirmedModelOutputs.length,
    evidenceBackedTranscripts.length,
    modelOutputs,
    openSetReviewModelOutputs.length,
    provenFusionEvidenceRows.length,
    provenModelOutputs.length,
    prototypeNeighbors.length,
    registeredPrototypeCatalog.length,
    selected?.id,
    selected?.relative_path,
    selected?.stream_url,
    sineStatusSummary.modelRuntimeLive,
    vis,
  ])
  const sineReadiness = useMemo(() => {
    const readyCount = evidenceChecklist.filter((item) => item.ready).length
    const itemReady = (label: string) => evidenceChecklist.find((item) => item.label === label)?.ready === true
    const realAudioReady = itemReady("Real Library audio")
    const scopeReady = itemReady("High-definition scope")
    const modelRuntimeReady = itemReady("Registered model runtime")
    const modelOutputReady = itemReady("Accepted model identity")
    const prototypeReady = itemReady("Prototype / fingerprint match")
    const fusionReady = itemReady("Fusion evidence")
    const transcriptReady = itemReady("Evidence-backed transcript")
    const semanticClean = itemReady("Semantic contract clean")

    if ((analysisProvenance.status === "contract_violation" || analysisProvenance.status === "quarantined") && realAudioReady && scopeReady && !modelRuntimeReady) {
      return {
        label: "Instrument ready / AI pending",
        badge: `${readyCount}/${evidenceChecklist.length}`,
        detail: "The recording and oscilloscope view are real; unverified classifier output is held until trained model evidence is loaded.",
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }

    if (analysisProvenance.status === "contract_violation" || analysisProvenance.status === "quarantined") {
      return {
        label: "Evidence held for review",
        badge: `${readyCount}/${evidenceChecklist.length}`,
        detail: "The signal can still be inspected, but the current response cannot be treated as acoustic meaning.",
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      }
    }

    if (modelRuntimeReady && modelOutputReady && prototypeReady && fusionReady && transcriptReady && semanticClean) {
      return {
        label: "Scientific classifier ready",
        badge: `${readyCount}/${evidenceChecklist.length}`,
        detail: "Model, prototype, fusion, and transcript evidence are present for this run.",
        tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      }
    }

    if (realAudioReady && scopeReady && !modelRuntimeReady) {
      return {
        label: "Instrument ready / AI pending",
        badge: `${readyCount}/${evidenceChecklist.length}`,
        detail: "The recording and oscilloscope view are real; trained model evidence is still missing.",
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      }
    }

    if (realAudioReady) {
      return {
        label: "Library signal ready",
        badge: `${readyCount}/${evidenceChecklist.length}`,
      detail: "A real acoustic file is selected. Run an evidence check or wait for visualisation to inspect evidence.",
        tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
      }
    }

    return {
      label: "Awaiting acoustic file",
      badge: `${readyCount}/${evidenceChecklist.length}`,
      detail: "Select a real MINDEX acoustic file before judging SINE readiness.",
      tone: "border-white/10 bg-white/[0.04] text-slate-300",
    }
  }, [analysisProvenance.status, evidenceChecklist])

  const stackMetricRows = useMemo(() => {
    const diagnostics = analysis?.diagnostics ?? {}
    const diagnosticNumber = (...keys: string[]) => {
      for (const key of keys) {
        const value = finiteNumber(diagnostics[key])
        if (value != null) return value
      }
      return null
    }
    const diagnosticText = (...keys: string[]) => {
      for (const key of keys) {
        const value = stringValue(diagnostics[key])
        if (value) return value
      }
      return null
    }
    const waveform = vis?.waveform
    const waveformPoints = Math.max(
      waveform?.times?.length ?? 0,
      waveform?.amplitudes?.length ?? 0,
      waveform?.min?.length ?? 0,
      waveform?.max?.length ?? 0,
      waveform?.rms?.length ?? 0,
    )
    const spectrogramRows = vis?.spectrogram?.power_db?.length ?? 0
    const spectrogramCols = vis?.spectrogram?.power_db?.[0]?.length ?? 0
    const leadingModelOutput = modelOutputs[0] ?? null
    const leadingModelLabel = leadingModelOutput?.top_labels[0] ?? null
    const leadingRegisteredModel = registeredModelOutputs[0] ?? null
    const modelOutputName = [leadingModelOutput?.model_name, leadingModelOutput?.model_version].filter(Boolean).join(" ")
    const modelVersion =
      modelOutputName ||
      [leadingRegisteredModel?.model_name || leadingRegisteredModel?.model_id, leadingRegisteredModel?.model_version].filter(Boolean).join(" ") ||
      stringValue(analysis?.model_version) ||
      stringValue(analysis?.frontend_version) ||
      summary?.model ||
      summary?.engine ||
      diagnosticText("model_version", "detector_version", "engine")
    const latencyMs = diagnosticNumber("latency_ms", "runtime_ms", "elapsed_ms")
    const sampleRate =
      diagnosticNumber("sample_rate_in", "sample_rate_hz", "sample_rate_model") ||
      vis?.sample_rate_hz ||
      selected?.sample_rate_hz ||
      null
    const channels = diagnosticNumber("channels") || selected?.channels || null
    const runtimeBlockers = analysisModelContext?.blockingReasons ?? []
    const runtimeBackendSummary = Object.entries(recordValue(analysisModelContext?.runtimeBackends) ?? {})
      .map(([key, value]) => `${cleanLabel(key)} ${booleanValue(value) === true ? "ready" : booleanValue(value) === false ? "missing" : String(value)}`)
      .join(" / ")
    return [
      {
        icon: <Shield className="h-4 w-4" />,
        label: "Evidence gate",
        value: cleanLabel(analysisProvenance.label),
        detail: analysisProvenance.status === "quarantined" ? "not trusted as meaning" : analysisProvenance.detail,
      },
      {
        icon: <Activity className="h-4 w-4" />,
        label: "SINE service",
        value: sineStatusSummary.label,
        detail: sineStatusSummary.detail,
      },
      {
        icon: <Cpu className="h-4 w-4" />,
        label: "Runtime blockers",
        value: runtimeBlockers.length ? `${runtimeBlockers.length} blocker${runtimeBlockers.length === 1 ? "" : "s"}` : analysisModelContext?.inferenceReady ? "clear" : "pending",
        detail: runtimeBlockers.length
          ? runtimeBlockers.slice(0, 2).map(cleanLabel).join(" / ")
          : runtimeBackendSummary || "waiting for model context",
      },
      {
        icon: <Cpu className="h-4 w-4" />,
        label: "Model evidence",
        value: modelOutputs.length
          ? `${modelOutputs.length} model output${modelOutputs.length === 1 ? "" : "s"}`
          : registeredModelOutputs.length
            ? `${registeredModelOutputs.length} registered`
            : modelVersion || "model pending",
        detail: leadingModelLabel
          ? `${cleanLabel(leadingModelLabel.label)} ${formatPercent(leadingModelLabel.score)}`
          : leadingRegisteredModel
            ? registeredDomainCoverage.length
              ? `${registeredDomainCoverage.slice(0, 3).join(", ")}${registeredDomainCoverage.length > 3 ? ` +${registeredDomainCoverage.length - 3}` : ""}`
              : [leadingRegisteredModel.framework, leadingRegisteredModel.runtime].filter(Boolean).join(" / ") || "registered model"
            : analysis
              ? "no trained output yet"
              : "waiting for run",
      },
      {
        icon: <Sparkles className="h-4 w-4" />,
        label: "Fusion evidence",
        value: provenFusionEvidenceRows.length ? `${provenFusionEvidenceRows.length} proven` : fusionEvidenceRows.length ? `${fusionEvidenceRows.length} raw` : "pending",
        detail: provenFusionEvidenceRows[0]?.kind ? cleanLabel(provenFusionEvidenceRows[0].kind) : "model/prototype evidence map",
      },
      {
        icon: <Radar className="h-4 w-4" />,
        label: "Prototype catalog",
        value: registeredPrototypeCatalog.length
          ? `${registeredPrototypeCatalog.length} prototype${registeredPrototypeCatalog.length === 1 ? "" : "s"}`
          : "catalog pending",
        detail: registeredPrototypeDomains.length
          ? registeredPrototypeDomains.slice(0, 3).join(", ")
          : sinePrototypesError || "embedding registry",
      },
      {
        icon: <Database className="h-4 w-4" />,
        label: "Run",
        value: analysisRunId ? analysisRunId.slice(0, 8) : analysis ? "complete" : "not run",
        detail: latencyMs != null ? `${latencyMs.toFixed(latencyMs >= 100 ? 0 : 1)} ms` : `${events.length} events`,
      },
      {
        icon: <AudioLines className="h-4 w-4" />,
        label: "Decoded audio",
        value: sampleRate ? `${sampleRate.toLocaleString()} Hz` : "sample rate pending",
        detail: channels ? `${channels} channel${channels === 1 ? "" : "s"}` : "channels pending",
      },
      {
        icon: <Waves className="h-4 w-4" />,
        label: "Waveform",
        value: waveformPoints ? `${waveformPoints.toLocaleString()} points` : "pending",
        detail: waveform?.min?.length && waveform?.max?.length ? "envelope ready" : "amplitude trace",
      },
      {
        icon: <BarChart3 className="h-4 w-4" />,
        label: "Spectrogram",
        value: spectrogramRows && spectrogramCols ? `${spectrogramRows} x ${spectrogramCols}` : "pending",
        detail: scopeStats.dynamicRange,
      },
      {
        icon: <Gauge className="h-4 w-4" />,
        label: "Detector families",
        value: `${detectorCounts.length} groups`,
        detail: `${detectorStatusEntries.length || detectorList.length || 0} registered`,
      },
    ]
  }, [
    analysis,
    analysisRunId,
    analysisModelContext,
    analysisProvenance.detail,
    analysisProvenance.label,
    analysisProvenance.status,
    detectorCounts.length,
    detectorList.length,
    detectorStatusEntries.length,
    events.length,
    fusionEvidenceRows.length,
    modelOutputs,
    provenFusionEvidenceRows,
    registeredModelOutputs,
    registeredDomainCoverage,
    registeredPrototypeCatalog.length,
    registeredPrototypeDomains,
    scopeStats.dynamicRange,
    selected?.channels,
    selected?.sample_rate_hz,
    sinePrototypesError,
    sineStatusSummary.detail,
    sineStatusSummary.label,
    summary?.engine,
    summary?.model,
    vis?.sample_rate_hz,
    vis?.spectrogram?.power_db,
    vis?.waveform,
  ])

  const classifierCoverageText = useMemo(() => {
    return [
      ...registeredDomainCoverage,
      ...registeredPrototypeDomains,
      ...confirmedModelOutputs.flatMap((output) => [
        output.model_id,
        output.model_name,
        output.model_version,
        output.framework,
        output.runtime,
        ...output.domain_heads,
        ...output.target_domains,
        ...output.class_families,
        ...output.top_labels.map((label) => label.label),
      ]),
      ...registeredModelOutputs.flatMap((output) => [
        output.model_id,
        output.model_name,
        output.model_version,
        output.framework,
        output.runtime,
        ...output.domain_heads,
        ...output.target_domains,
        ...output.class_families,
      ]),
      ...prototypeNeighbors.flatMap((match) => [match.label, match.source, match.category, match.model_id, match.prototype_id]),
      ...registeredPrototypeCatalog.flatMap((prototype) => [prototype.label, prototype.domain, prototype.category, prototype.source, prototype.model_id]),
      ...provenFusionEvidenceRows.flatMap((row) => [row.kind, row.label, row.event_type, row.event_family, row.model, row.detail]),
      ...evidenceBackedTranscripts.flatMap((entry) => [entry.label, entry.sound_source, entry.frequency_range]),
    ]
      .filter(Boolean)
      .map((value) => cleanLabel(value).toLowerCase())
      .join(" ")
  }, [
    confirmedModelOutputs,
    evidenceBackedTranscripts,
    provenFusionEvidenceRows,
    prototypeNeighbors,
    registeredDomainCoverage,
    registeredModelOutputs,
    registeredPrototypeCatalog,
    registeredPrototypeDomains,
  ])

  const classifierScopeRows = useMemo(() => {
    return SINE_CLASS_FAMILY_GROUPS.map((group) => {
      const covered = group.families.some((family) => {
        const cleanFamily = cleanLabel(family).toLowerCase()
        return classifierCoverageText.includes(family) || classifierCoverageText.includes(cleanFamily)
      })
      return { ...group, covered }
    })
  }, [classifierCoverageText])

  const soundTargetCoverageRows = useMemo(() => {
    return SINE_SOUND_TARGET_GROUPS.map((group) => {
      const coveredTargets = group.targets.filter((target) => {
        const cleanTarget = cleanLabel(target).toLowerCase()
        return classifierCoverageText.includes(target) || classifierCoverageText.includes(cleanTarget)
      })
      return {
        ...group,
        covered: coveredTargets.length > 0,
        coveredTargets,
        pendingTargets: group.targets.filter((target) => !coveredTargets.includes(target)),
      }
    })
  }, [classifierCoverageText])

  const modelTargetRows = useMemo(() => {
    const modelText = registeredModelOutputs
      .flatMap((output) => [
        output.model_id,
        output.model_name,
        output.model_version,
        output.framework,
        output.runtime,
        stringValue(output.feature_params),
        output.metrics_uri,
        ...output.domain_heads,
        ...output.target_domains,
        ...output.class_families,
      ])
      .filter(Boolean)
      .map((value) => cleanLabel(value).toLowerCase())
      .join(" ")

    return SINE_MODEL_TARGET_GROUPS.map((group) => ({
      ...group,
      covered: group.targets.some((target) => {
        const cleanTarget = cleanLabel(target).toLowerCase()
        return modelText.includes(target) || modelText.includes(cleanTarget)
      }),
    }))
  }, [registeredModelOutputs])

  const architectureRows = useMemo(() => {
    const evidenceText = [
      ...modelOutputs.flatMap((output) => [
        output.model_id,
        output.model_name,
        output.model_version,
        output.framework,
        output.runtime,
        output.status,
        output.artifact_uri,
        output.model_checksum,
        output.label_map_uri,
        output.label_map_checksum,
        output.metrics_uri,
        output.training_dataset,
        output.device,
        output.backend_commit,
        ...output.domain_heads,
        ...output.target_domains,
        ...output.class_families,
        ...output.top_labels.map((label) => label.label),
      ]),
      ...registeredModelOutputs.flatMap((output) => [
        output.model_id,
        output.model_name,
        output.model_version,
        output.framework,
        output.runtime,
        output.status,
        output.artifact_uri,
        output.model_checksum,
        output.label_map_uri,
        output.label_map_checksum,
        output.metrics_uri,
        output.training_dataset,
        output.device,
        output.backend_commit,
        ...output.domain_heads,
        ...output.target_domains,
        ...output.class_families,
      ]),
      ...provenFusionEvidenceRows.flatMap((row) => [row.kind, row.label, row.model, row.event_type, row.event_family, row.detail]),
      ...prototypeNeighbors.flatMap((match) => [match.label, match.source, match.model, match.model_id, match.prototype_id, match.vector_checksum]),
      ...registeredPrototypeCatalog.flatMap((prototype) => [prototype.label, prototype.domain, prototype.category, prototype.source, prototype.model_id, prototype.vector_checksum]),
      ...events.flatMap((event) => [event.detector_id, event.method, event.model, event.engine, event.event_type, event.event_family]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    const hasDecodedAudio = Boolean(vis?.sample_rate_hz || selected?.sample_rate_hz || activeDuration || vis?.waveform)
    const hasFeatureWindow = Boolean(vis?.spectrogram?.power_db?.length || scopeMeasurements.hasData)
    const hasRegisteredModel = registeredModelOutputs.length > 0
    const hasModelOutput = confirmedModelOutputs.length > 0
    const hasFusionOutput = Boolean(provenFusionEvidenceRows.length || evidenceBackedTranscripts.length)
    const hasRegisteredEmbedding = registeredModelOutputs.some((output) => Boolean(output.embedding_dim || output.feature_params))
    const hasRegisteredHeads = Boolean(
      registeredDomainCoverage.length ||
        registeredModelOutputs.some((output) => output.label_count || output.top_labels.length || output.domain_heads.length || output.target_domains.length || output.class_families.length),
    )
    const hasRegisteredPrototypeCatalog = registeredPrototypeCatalog.length > 0
    const hasPrototypeOutput = prototypeNeighbors.length > 0
    const hasTemporalOutput =
      (hasModelOutput || hasRegisteredModel) &&
      (evidenceText.includes("crnn") ||
        evidenceText.includes("gru") ||
        evidenceText.includes("lstm") ||
        evidenceText.includes("temporal") ||
        evidenceText.includes("sequence"))
    const hasAttentionOutput =
      (hasModelOutput || hasRegisteredModel) &&
      (evidenceText.includes("attention") ||
        evidenceText.includes("attn") ||
        evidenceText.includes("pooling") ||
        evidenceText.includes("weighted"))
    const hasConvOutput =
      (hasModelOutput || hasRegisteredModel) &&
      (evidenceText.includes("resnet") ||
        evidenceText.includes("vgg") ||
        evidenceText.includes("cnn") ||
        evidenceText.includes("pann") ||
        evidenceText.includes("ast") ||
        evidenceText.includes("beats"))

    const stateFor = (id: string) => {
      if (id === "decode") return hasDecodedAudio ? "observed" : "pending"
      if (id === "frontend") return hasFeatureWindow ? "observed" : "pending"
      if (id === "trunk") return hasConvOutput ? (hasModelOutput ? "evidence" : "observed") : "pending"
      if (id === "temporal") return hasTemporalOutput ? (hasModelOutput ? "evidence" : "observed") : "pending"
      if (id === "attention") return hasAttentionOutput ? (hasModelOutput ? "evidence" : "observed") : "pending"
      if (id === "projection") return hasPrototypeOutput ? "evidence" : hasRegisteredEmbedding || hasRegisteredPrototypeCatalog ? "observed" : "pending"
      if (id === "heads") return hasModelOutput ? "evidence" : hasRegisteredHeads ? "observed" : "pending"
      if (id === "fusion") return hasFusionOutput ? "evidence" : "pending"
      return "pending"
    }

    return sineArchitectureBlueprint.map((row) => ({
      ...row,
      state: stateFor(row.id),
    }))
  }, [
    activeDuration,
    confirmedModelOutputs.length,
    evidenceBackedTranscripts.length,
    events,
    provenFusionEvidenceRows,
    prototypeNeighbors,
    modelOutputs,
    registeredModelOutputs,
    registeredDomainCoverage,
    registeredPrototypeCatalog,
    scopeMeasurements.hasData,
    selected?.sample_rate_hz,
    vis?.sample_rate_hz,
    vis?.spectrogram?.power_db?.length,
    vis?.waveform,
  ])
  const selectedArchitectureRow = useMemo(
    () => architectureRows.find((row) => row.id === selectedArchitectureId) ?? architectureRows[0] ?? null,
    [architectureRows, selectedArchitectureId],
  )

  const backendBuildRecipeRows = useMemo(() => {
    const architectureState = new Map(architectureRows.map((row) => [row.id, row.state]))
    const targetState = new Map(modelTargetRows.map((row) => [row.label, row.covered]))
    const hasHumanReview = Boolean(latestHumanIdentification?.human_label || trainingHumanTags.length)

    return SINE_BACKEND_BUILD_RECIPE.map((recipe) => {
      const observedArchitecture = recipe.architectureIds.filter((id) => {
        const state = architectureState.get(id)
        return state === "observed" || state === "evidence"
      }).length
      const evidenceArchitecture = recipe.architectureIds.filter((id) => architectureState.get(id) === "evidence").length
      const coveredTargets = recipe.modelTargets.filter((target) => targetState.get(target)).length
      let state: "evidence" | "observed" | "pending" = "pending"

      if (recipe.id === "l1_dsp") {
        state = events.length || scopeMeasurements.hasData ? "evidence" : observedArchitecture === recipe.architectureIds.length ? "observed" : "pending"
      } else if (recipe.id === "l2_embedding") {
        state = confirmedModelOutputs.length ? "evidence" : registeredModelOutputs.length || coveredTargets ? "observed" : "pending"
      } else if (recipe.id === "l3_semantic_heads") {
        state = confirmedModelOutputs.some((output) => output.top_labels.length) ? "evidence" : registeredModelOutputs.some((output) => output.label_count || output.top_labels.length || output.domain_heads.length || output.class_families.length) ? "observed" : "pending"
      } else if (recipe.id === "prototype_retrieval") {
        state = prototypeNeighbors.length ? "evidence" : registeredPrototypeCatalog.length || coveredTargets ? "observed" : "pending"
      } else if (recipe.id === "evidence_fusion") {
        state = provenFusionEvidenceRows.length || evidenceBackedTranscripts.length ? "evidence" : hasHumanReview || coveredTargets ? "observed" : "pending"
      }

      return {
        ...recipe,
        state,
        observedArchitecture,
        evidenceArchitecture,
        coveredTargets,
      }
    })
  }, [
    architectureRows,
    confirmedModelOutputs,
    events.length,
    evidenceBackedTranscripts.length,
    latestHumanIdentification?.human_label,
    modelTargetRows,
    provenFusionEvidenceRows.length,
    prototypeNeighbors.length,
    registeredModelOutputs,
    registeredPrototypeCatalog.length,
    scopeMeasurements.hasData,
    trainingHumanTags.length,
  ])

  const applyAnalysis = useCallback((payload: AnalysisPayload | null) => {
    if (!payload) {
      setAnalysis(null)
      setEvents([])
      setTranscripts([])
      setSelectedEventKey(null)
      scopeQualityRef.current = 0
      return
    }
    const normalized = normalizeAnalysisPayload(payload)
    setAnalysis(normalized)
    setEvents(groupedEventsFromAnalysis(normalized))
    setTranscripts(normalizeTranscripts(normalized.sound_transcripts))
    setSelectedEventKey(null)
    if (normalized.visualisation && visualisationIsHighDefinition(normalized.visualisation)) {
      const incomingQuality = visualisationQualityScore(normalized.visualisation)
      if (incomingQuality >= scopeQualityRef.current) {
        scopeQualityRef.current = incomingQuality
        setVis(normalized.visualisation)
        setScopeSource("analysis-payload")
      }
    }
    if (finiteNumber(normalized.visualisation?.duration_sec) != null) {
      setDuration(normalized.visualisation?.duration_sec ?? 0)
    }
  }, [])

  const loadSineStatus = useCallback(async () => {
    setSineStatusLoading(true)
    setSineStatusError(null)
    try {
      const res = await fetch("/api/mindex/sine/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(SINE_STATUS_REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        setSineStatusPayload(null)
        setSineStatusError(`SINE status unavailable (${res.status})`)
        return
      }
      const payload = (await res.json()) as SineStatusPayload
      setSineStatusPayload(payload)
      const detectors = textListValue(payload.detectors ?? payload.default_detectors ?? payload.registered_detectors)
      if (detectors.length) {
        setDetectorList((current) => (current.length ? current : detectors))
      }
    } catch (event) {
      setSineStatusPayload(null)
      setSineStatusError(event instanceof Error ? event.message : "SINE status request did not complete")
    } finally {
      setSineStatusLoading(false)
    }
  }, [])

  const loadSineModels = useCallback(async () => {
    setSineModelsLoading(true)
    setSineModelsError(null)
    try {
      const res = await fetch("/api/mindex/sine/models", {
        cache: "no-store",
        signal: AbortSignal.timeout(SINE_STATUS_REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        setSineModelsPayload(null)
        setSineModelsError(`SINE model registry unavailable (${res.status})`)
        return
      }
      const payload = (await res.json()) as SineModelsPayload
      setSineModelsPayload(payload)
      const payloadRecord = recordValue(payload) ?? payload
      if (booleanValue(payloadRecord.ok) === false) {
        setSineModelsError(stringValue(payloadRecord.message) || stringValue(payloadRecord.status) || "SINE model registry returned no registered models.")
      }
    } catch (event) {
      setSineModelsPayload(null)
      setSineModelsError(event instanceof Error ? event.message : "SINE model registry request did not complete")
    } finally {
      setSineModelsLoading(false)
    }
  }, [])

  const loadSineModelDetail = useCallback(async (modelId: string) => {
    if (!modelId) {
      setSineModelDetailPayload(null)
      setSineModelDetailError(null)
      return
    }

    setSineModelDetailLoading(true)
    setSineModelDetailError(null)
    try {
      const res = await fetch(`/api/mindex/sine/models/${encodeURIComponent(modelId)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(SINE_STATUS_REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        setSineModelDetailPayload(null)
        setSineModelDetailError(`SINE model artifact unavailable (${res.status})`)
        return
      }
      const payload = (await res.json()) as SineModelsPayload
      setSineModelDetailPayload(payload)
      const payloadRecord = recordValue(payload) ?? payload
      if (booleanValue(payloadRecord.ok) === false) {
        setSineModelDetailError(stringValue(payloadRecord.message) || stringValue(payloadRecord.status) || "SINE model artifact returned no detail.")
      }
    } catch (event) {
      setSineModelDetailPayload(null)
      setSineModelDetailError(event instanceof Error ? event.message : "SINE model artifact request did not complete")
    } finally {
      setSineModelDetailLoading(false)
    }
  }, [])

  const loadSinePrototypes = useCallback(async () => {
    setSinePrototypesLoading(true)
    setSinePrototypesError(null)
    try {
      const res = await fetch("/api/mindex/sine/prototypes", {
        cache: "no-store",
        signal: AbortSignal.timeout(SINE_STATUS_REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        setSinePrototypesPayload(null)
        setSinePrototypesError(`SINE prototype catalog unavailable (${res.status})`)
        return
      }
      const payload = (await res.json()) as SinePrototypesPayload
      setSinePrototypesPayload(payload)
      const payloadRecord = recordValue(payload) ?? payload
      if (booleanValue(payloadRecord.ok) === false) {
        setSinePrototypesError(stringValue(payloadRecord.message) || stringValue(payloadRecord.status) || "SINE prototype catalog returned no registered prototypes.")
      }
    } catch (event) {
      setSinePrototypesPayload(null)
      setSinePrototypesError(event instanceof Error ? event.message : "SINE prototype catalog request did not complete")
    } finally {
      setSinePrototypesLoading(false)
    }
  }, [])

  const loadTrainingHumanTags = useCallback(async () => {
    setTrainingHumanTagsLoading(true)
    setTrainingHumanTagsError(null)
    try {
      const res = await fetch("/api/natureos/mindex/sine/training/human-tags?limit=25&training_eligible_only=true", {
        cache: "no-store",
        signal: AbortSignal.timeout(SINE_STATUS_REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) {
        setTrainingHumanTags([])
        setTrainingHumanTagsTotal(null)
        setTrainingHumanTagsError(`Training review queue unavailable (${res.status})`)
        return
      }

      const payload = (await res.json()) as SineTrainingTagsPayload
      const payloadRecord = recordValue(payload) ?? payload
      const rows = normalizeHumanIdentifications(payload)
      setTrainingHumanTags(rows)
      setTrainingHumanTagsTotal(
        finiteNumber(payloadRecord.total) ??
          finiteNumber(payloadRecord.total_count) ??
          finiteNumber(payloadRecord.count) ??
          rows.length,
      )
      if (booleanValue(payloadRecord.ok) === false) {
        setTrainingHumanTagsError(
          stringValue(payloadRecord.message) || stringValue(payloadRecord.status) || "Training review queue is not exposed by MINDEX yet.",
        )
      }
    } catch (event) {
      setTrainingHumanTags([])
      setTrainingHumanTagsTotal(null)
      setTrainingHumanTagsError(event instanceof Error ? event.message : "Training review queue request did not complete")
    } finally {
      setTrainingHumanTagsLoading(false)
    }
  }, [])

  const loadBlobs = useCallback(async (searchQuery = "") => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    const normalizedQuery = searchQuery.trim()
    lastCatalogSearchRef.current = normalizedQuery
    setError(null)
    setMessage(null)
    setStatus("loading")
    setCatalogLoadingSince(Date.now())
    setVisibleLimit(initialVisibleCount)
    setCatalogLoadingMore(false)

    try {
      const params = new URLSearchParams({ category: "acoustic", limit: String(catalogPageLimit), offset: "0" })
      if (normalizedQuery) params.set("q", normalizedQuery)
      const res = await fetch(`/api/natureos/mindex/library?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MS),
      })
      if (requestId !== requestRef.current) return
      if (!res.ok) {
        setError(`Acoustic library unavailable (${res.status})`)
        setStatus("error")
        setCatalogLoadingSince(null)
        return
      }

      let data = (await res.json()) as LibraryCatalogResponse
      if (requestId !== requestRef.current) return
      let rows = playableBlobs(Array.isArray(data.blobs) ? data.blobs : Array.isArray(data.items) ? data.items : [])

      const hasRegisteredAudio = Boolean(data.sine?.acoustic_blobs || data.total_files || data.total)
      const allowStartupFallback = !initializedRef.current || !normalizedQuery || normalizedQuery.toLowerCase() === SHORT_CLIP_QUERY
      if (!rows.length && hasRegisteredAudio && allowStartupFallback) {
        const fallbackQueries = Array.from(
          new Set([
            SHORT_CLIP_QUERY,
            normalizedQuery.toLowerCase() === SHORT_CLIP_QUERY ? "" : normalizedQuery,
            "",
          ]),
        )

        for (const fallbackQuery of fallbackQueries) {
          const fallbackParams = new URLSearchParams({ category: "acoustic", limit: String(catalogPageLimit), offset: "0" })
          if (fallbackQuery) fallbackParams.set("q", fallbackQuery)
          const fallbackRes = await fetch(`/api/natureos/mindex/library?${fallbackParams.toString()}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MS),
          })
          if (requestId !== requestRef.current) return
          if (!fallbackRes.ok) continue
          const fallbackData = (await fallbackRes.json()) as LibraryCatalogResponse
          const fallbackRows = playableBlobs(
            Array.isArray(fallbackData.blobs) ? fallbackData.blobs : Array.isArray(fallbackData.items) ? fallbackData.items : [],
          )
          if (!fallbackRows.length) continue
          data = {
            ...data,
            ...fallbackData,
            total_files: data.total_files ?? fallbackData.total_files,
            total: data.total ?? fallbackData.total,
            total_bytes: data.total_bytes ?? fallbackData.total_bytes,
            message: fallbackData.message || data.message,
            storage: data.storage ?? fallbackData.storage,
            sine: data.sine ?? fallbackData.sine,
          }
          rows = fallbackRows
          break
        }
      }

      setBlobs(rows)
      if (rows.length) setCatalogRetryCount(0)
      setTotalFiles(data.sine?.acoustic_blobs ?? data.total_files ?? data.total ?? rows.length)
      setTotalBytes(data.total_bytes ?? rows.reduce((sum, row) => sum + (row.size_bytes ?? 0), 0))
      setDetectorList((current) => (data.sine?.default_detectors?.length ? data.sine.default_detectors : current))
      setStorageLabel(
        data.storage?.remote_nas
          ? `NAS ${data.storage.free_gb?.toFixed(1) ?? "?"} GB free`
          : data.storage?.available
            ? "storage mounted"
            : "storage status pending",
      )
      setMessage(data.message ?? null)
      setStatus(rows.length ? "ready" : data.root_status === "mounted" ? "waiting" : "empty")
      setCatalogLoadingSince(null)

      const preferredBlob = preferredInitialBlob(rows)
      if (preferredBlob?.id) {
        setSelectedId((current) => (current && rows.some((row) => row.id === current) ? current : preferredBlob.id))
      } else {
        setSelectedId(null)
      }
      initializedRef.current = true
    } catch (event) {
      if (requestId === requestRef.current) {
        setBlobs([])
        setSelectedId(null)
        setError(event instanceof Error ? event.message : "Library request did not complete")
        setStatus("error")
        setCatalogLoadingSince(null)
      }
    }
  }, [catalogPageLimit, initialVisibleCount])

  const loadMoreBlobs = useCallback(async () => {
    if (catalogLoadingMore || status === "loading" || !hasMoreCatalogRows) return

    const requestId = requestRef.current
    const normalizedQuery = query.trim()
    const offset = blobs.length
    setCatalogLoadingMore(true)

    try {
      const params = new URLSearchParams({
        category: "acoustic",
        limit: String(catalogPageLimit),
        offset: String(offset),
      })
      if (normalizedQuery) params.set("q", normalizedQuery)
      const res = await fetch(`/api/natureos/mindex/library?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(CATALOG_REQUEST_TIMEOUT_MS),
      })
      if (requestId !== requestRef.current) return
      if (!res.ok) {
        setMessage(`More acoustic files unavailable (${res.status})`)
        return
      }

      const data = (await res.json()) as LibraryCatalogResponse
      if (requestId !== requestRef.current) return
      const rows = playableBlobs(Array.isArray(data.blobs) ? data.blobs : Array.isArray(data.items) ? data.items : [])
      if (!rows.length) {
        setTotalFiles(blobs.length)
        return
      }

      setBlobs((current) => uniqueBlobs([...current, ...rows]))
      setTotalFiles(data.sine?.acoustic_blobs ?? data.total_files ?? data.total ?? Math.max(totalFiles, offset + rows.length))
      setTotalBytes(data.total_bytes ?? totalBytes)
      setDetectorList((current) => (data.sine?.default_detectors?.length ? data.sine.default_detectors : current))
      setMessage(data.message ?? null)
      setVisibleLimit((value) => value + initialVisibleCount)
    } catch (event) {
      if (requestId === requestRef.current) {
        setMessage(event instanceof Error ? event.message : "More acoustic files did not load.")
      }
    } finally {
      if (requestId === requestRef.current) setCatalogLoadingMore(false)
    }
  }, [blobs.length, catalogLoadingMore, catalogPageLimit, hasMoreCatalogRows, initialVisibleCount, query, status, totalBytes, totalFiles])

  const handleLibraryScroll = useCallback(() => {
    const node = libraryScrollRef.current
    if (!node) return
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight
    if (remaining > 280) return

    if (canRevealMoreBlobs) {
      revealMoreBlobs()
      return
    }

    if (hasMoreCatalogRows) void loadMoreBlobs()
  }, [canRevealMoreBlobs, hasMoreCatalogRows, loadMoreBlobs, revealMoreBlobs])

  const statusAcousticCatalogCount =
    finiteNumber(sineStatusPayload?.acoustic_blobs) ??
    finiteNumber(sineStatusPayload?.total_acoustic_blobs) ??
    finiteNumber(sineStatusPayload?.library_acoustic_blobs) ??
    0
  const knownAcousticCatalogCount = Math.max(totalFiles, statusAcousticCatalogCount)
  const hasRegistryBackedCatalogRows = blobs.some((blob) => Boolean(blobAnalysisId(blob)))

  useEffect(() => {
    void loadSineStatus()
    void loadSineModels()
    void loadSinePrototypes()
    void loadTrainingHumanTags()
    if (!catalogBootstrappedRef.current) {
      catalogBootstrappedRef.current = true
      void loadBlobs(query)
    }
  }, [loadBlobs, loadSineModels, loadSinePrototypes, loadSineStatus, loadTrainingHumanTags, query])

  useEffect(() => {
    if (!leadingModelDetailId) {
      setSineModelDetailPayload(null)
      setSineModelDetailError(null)
      return
    }
    void loadSineModelDetail(leadingModelDetailId)
  }, [leadingModelDetailId, loadSineModelDetail])

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (!catalogBootstrappedRef.current || lastCatalogSearchRef.current === normalizedQuery) return

    const debounceMs = initializedRef.current && query.trim() ? 350 : 0
    if (!debounceMs) {
      void loadBlobs(query)
      return
    }

    const timer = window.setTimeout(() => {
      void loadBlobs(query)
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [loadBlobs, query])

  useEffect(() => {
    const queryIsStartupShortSet = query.trim().toLowerCase() === SHORT_CLIP_QUERY || (!query.trim() && environmentFilter === "short")
    if (
      blobs.length ||
      status === "loading" ||
      knownAcousticCatalogCount <= 0 ||
      catalogRetryCount >= 3 ||
      !queryIsStartupShortSet
    ) {
      return
    }
    const timer = window.setTimeout(() => {
      setCatalogRetryCount((count) => count + 1)
      void loadBlobs(query.trim() || SHORT_CLIP_QUERY)
    }, 1600 + catalogRetryCount * 1200)

    return () => window.clearTimeout(timer)
  }, [blobs.length, catalogRetryCount, environmentFilter, knownAcousticCatalogCount, loadBlobs, query, status])

  useEffect(() => {
    const queryIsStartupShortSet = query.trim().toLowerCase() === SHORT_CLIP_QUERY || (!query.trim() && environmentFilter === "short")
    if (
      !blobs.length ||
      hasRegistryBackedCatalogRows ||
      status === "loading" ||
      knownAcousticCatalogCount <= blobs.length ||
      catalogRetryCount >= 3 ||
      !queryIsStartupShortSet
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setCatalogRetryCount((count) => count + 1)
      void loadBlobs(query.trim() || SHORT_CLIP_QUERY)
    }, 2200 + catalogRetryCount * 1200)

    return () => window.clearTimeout(timer)
  }, [
    blobs.length,
    catalogRetryCount,
    environmentFilter,
    hasRegistryBackedCatalogRows,
    knownAcousticCatalogCount,
    loadBlobs,
    query,
    status,
  ])

  useEffect(() => {
    const queryIsStartupShortSet = query.trim().toLowerCase() === SHORT_CLIP_QUERY || (!query.trim() && environmentFilter === "short")
    if (
      blobs.length ||
      status !== "loading" ||
      knownAcousticCatalogCount <= 0 ||
      catalogRetryCount >= 3 ||
      !queryIsStartupShortSet
    ) {
      return
    }

    const startedAt = catalogLoadingSince ?? Date.now()
    const staleAfterMs = 18_000 + catalogRetryCount * 4_000
    const waitMs = Math.max(0, staleAfterMs - (Date.now() - startedAt))
    const timer = window.setTimeout(() => {
      setCatalogRetryCount((count) => count + 1)
      void loadBlobs(query.trim() || SHORT_CLIP_QUERY)
    }, waitMs)

    return () => window.clearTimeout(timer)
  }, [blobs.length, catalogLoadingSince, catalogRetryCount, environmentFilter, knownAcousticCatalogCount, loadBlobs, query, status])

  useEffect(() => {
    const node = libraryScrollRef.current
    if (!node || status === "loading") return
    if (node.scrollHeight - node.clientHeight > 280) return

    if (canRevealMoreBlobs) {
      revealMoreBlobs()
      return
    }

    if (hasMoreCatalogRows) void loadMoreBlobs()
  }, [blobs.length, canRevealMoreBlobs, hasMoreCatalogRows, loadMoreBlobs, revealMoreBlobs, status, visibleLimit])

  const loadVisualisation = useCallback(async (id: string | null, blob: BlobItem | null = null) => {
    const visualisationRequestId = ++visualisationRequestRef.current
    const isCurrentVisualisationRequest = () => visualisationRequestId === visualisationRequestRef.current
    const streamId = id || blob?.id || ""
    const streamSource = blob?.stream_url || (streamId ? `/api/mindex/sine/library/blobs/${encodeURIComponent(streamId)}/stream` : "")
    if (!id) {
      if (shouldBuildClientScope(null, blob) && streamSource) {
        try {
          setMessage("This recording stream is playable; building scope from the real audio stream while MINDEX registry identity is missing.")
          const clientScope = await buildClientAudioVisualisation(streamSource, blob)
          if (!isCurrentVisualisationRequest()) return
          scopeQualityRef.current = visualisationQualityScore(clientScope)
          setVis(clientScope)
          setScopeSource("browser-real-audio")
          if (finiteNumber(clientScope.duration_sec) != null) setDuration(clientScope.duration_sec ?? 0)
          setMessage(
            `Browser scope loaded ${waveformSampleCount(clientScope).toLocaleString()} waveform points and ${clientScope.spectrogram?.power_db?.length ?? 0} x ${
              clientScope.spectrogram?.power_db?.[0]?.length ?? 0
            } spectrogram cells from the real audio stream.`,
          )
          return
        } catch (clientEvent) {
          if (!isCurrentVisualisationRequest()) return
          setVis(null)
          setScopeSource("unavailable")
          setMessage(clientEvent instanceof Error ? `Browser audio scope failed: ${clientEvent.message}` : "Browser audio scope did not complete.")
          return
        }
      }
      setVis(null)
      setScopeSource("none")
      setMessage("This recording is playable, but it is not connected to a MINDEX database record yet.")
      return
    }
    try {
      const params = buildVisualisationParams(blob)
      const res = await fetch(`/api/mindex/sine/blobs/${encodeURIComponent(id)}/visualisation?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(VISUALISATION_REQUEST_TIMEOUT_MS),
      })
      if (!isCurrentVisualisationRequest()) return
      if (!res.ok) {
        if (shouldBuildClientScope(null, blob)) {
          try {
            setMessage(`MINDEX scope unavailable (${res.status}); building scope from the real audio stream...`)
            const clientScope = await buildClientAudioVisualisation(streamSource, blob)
            if (!isCurrentVisualisationRequest()) return
            scopeQualityRef.current = visualisationQualityScore(clientScope)
            setVis(clientScope)
            setScopeSource("browser-real-audio")
            if (finiteNumber(clientScope.duration_sec) != null) setDuration(clientScope.duration_sec ?? 0)
            setMessage(
              `Browser scope loaded ${waveformSampleCount(clientScope).toLocaleString()} waveform points and ${clientScope.spectrogram?.power_db?.length ?? 0} x ${
                clientScope.spectrogram?.power_db?.[0]?.length ?? 0
              } spectrogram cells from the real audio stream.`,
            )
            return
          } catch (clientEvent) {
            if (!isCurrentVisualisationRequest()) return
            setVis(null)
            setScopeSource("unavailable")
            setMessage(
              clientEvent instanceof Error
                ? `Scope visualisation unavailable (${res.status}); browser audio scope failed: ${clientEvent.message}`
                : `Scope visualisation unavailable (${res.status}).`,
            )
            return
          }
        }
        setVis(null)
        setScopeSource("unavailable")
        setMessage(`Scope visualisation unavailable (${res.status}).`)
        return
      }
      const data = (await res.json()) as Visualisation
      if (!isCurrentVisualisationRequest()) return
      const waveformCount = Math.max(
        data.waveform?.times?.length ?? 0,
        data.waveform?.amplitudes?.length ?? 0,
        data.waveform?.min?.length ?? 0,
        data.waveform?.max?.length ?? 0,
        data.waveform?.rms?.length ?? 0,
      )
      const spectrogramRows = data.spectrogram?.power_db?.length ?? 0
      const spectrogramCols = data.spectrogram?.power_db?.[0]?.length ?? 0
      if (shouldBuildClientScope(data, blob) && streamSource) {
        try {
          setMessage(
            `MINDEX scope returned ${waveformCount.toLocaleString()} waveform points and ${spectrogramRows} x ${spectrogramCols} spectrogram cells; building a denser scope from the real audio stream...`,
          )
          const clientScope = await buildClientAudioVisualisation(streamSource, blob)
          if (!isCurrentVisualisationRequest()) return
          scopeQualityRef.current = visualisationQualityScore(clientScope)
          setVis(clientScope)
          setScopeSource("browser-real-audio")
          if (finiteNumber(clientScope.duration_sec) != null) setDuration(clientScope.duration_sec ?? 0)
          setMessage(
            `Browser scope loaded ${waveformSampleCount(clientScope).toLocaleString()} waveform points and ${clientScope.spectrogram?.power_db?.length ?? 0} x ${
              clientScope.spectrogram?.power_db?.[0]?.length ?? 0
            } spectrogram cells from the real audio stream.`,
          )
          return
        } catch (clientEvent) {
          if (!isCurrentVisualisationRequest()) return
          scopeQualityRef.current = visualisationQualityScore(data)
          setVis(data)
          setScopeSource("mindex-backend")
          if (finiteNumber(data.duration_sec) != null) setDuration(data.duration_sec ?? 0)
          setMessage(
            clientEvent instanceof Error
              ? `Scope loaded ${waveformCount.toLocaleString()} waveform points and ${spectrogramRows} x ${spectrogramCols} spectrogram cells. Browser audio scope failed: ${clientEvent.message}`
              : `Scope loaded ${waveformCount.toLocaleString()} waveform points and ${spectrogramRows} x ${spectrogramCols} spectrogram cells.`,
          )
          return
        }
      }
      scopeQualityRef.current = visualisationQualityScore(data)
      setVis(data)
      setScopeSource("mindex-backend")
      if (finiteNumber(data.duration_sec) != null) setDuration(data.duration_sec ?? 0)
      setMessage(
        waveformCount || spectrogramRows
          ? `Scope loaded ${waveformCount.toLocaleString()} waveform points and ${spectrogramRows} x ${spectrogramCols} spectrogram cells.`
          : "Scope visualisation loaded, but the backend returned no waveform or spectrogram samples.",
      )
    } catch (event) {
      if (!isCurrentVisualisationRequest()) return
      if (shouldBuildClientScope(null, blob)) {
        try {
          setMessage("MINDEX scope did not complete; building scope from the real audio stream...")
          const clientScope = await buildClientAudioVisualisation(streamSource, blob)
          if (!isCurrentVisualisationRequest()) return
          scopeQualityRef.current = visualisationQualityScore(clientScope)
          setVis(clientScope)
          setScopeSource("browser-real-audio")
          if (finiteNumber(clientScope.duration_sec) != null) setDuration(clientScope.duration_sec ?? 0)
          setMessage(
            `Browser scope loaded ${waveformSampleCount(clientScope).toLocaleString()} waveform points and ${clientScope.spectrogram?.power_db?.length ?? 0} x ${
              clientScope.spectrogram?.power_db?.[0]?.length ?? 0
            } spectrogram cells from the real audio stream.`,
          )
          return
        } catch (clientEvent) {
          if (!isCurrentVisualisationRequest()) return
          setVis(null)
          setScopeSource("unavailable")
          setMessage(
            clientEvent instanceof Error
              ? `Scope visualisation failed: ${clientEvent.message}`
              : event instanceof Error
                ? `Scope visualisation failed: ${event.message}`
                : "Scope visualisation did not complete.",
          )
          return
        }
      }
      setVis(null)
      setScopeSource("unavailable")
      setMessage(event instanceof Error ? `Scope visualisation failed: ${event.message}` : "Scope visualisation did not complete.")
    }
  }, [])

  const loadAnalysis = useCallback(async (id: string, windowRequest?: AnalysisWindow | null, includeCurrentRun = true) => {
    try {
      const params = new URLSearchParams()
      if (windowRequest) {
        params.set("start_sec", String(windowRequest.start))
        params.set("end_sec", String(windowRequest.end))
        params.set("windowed", "true")
        params.set("window_source", windowRequest.source)
      }
      if (includeCurrentRun) {
        const currentJobId = analysisJobIdRef.current
        const currentRunId = analysisRunIdRef.current
        if (currentJobId) params.set("job_id", currentJobId)
        if (currentRunId) params.set("analysis_run_id", currentRunId)
      }
      const res = await fetch(`/api/mindex/sine/blobs/${encodeURIComponent(id)}/analysis${params.size ? `?${params.toString()}` : ""}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      if (!res.ok) {
        applyAnalysis(null)
        return
      }
      const data = (await res.json()) as AnalysisPayload
      applyAnalysis(data)
    } catch {
      applyAnalysis(null)
    }
  }, [applyAnalysis])

  useEffect(() => {
    if (!selectedAnalysisId || !analysisIsQueuedOrRunningStatus(analysisStatus)) {
      analysisPollCountRef.current = 0
      setAnalysisPolling(false)
      return
    }

    if (analysisPollCountRef.current >= ANALYSIS_POLL_MAX_ATTEMPTS) {
      setAnalysisPolling(false)
      setMessage((current) =>
        current ||
        "SINE evidence check is still queued or running. Refresh the latest run when the backend job completes.",
      )
      return
    }

    setAnalysisPolling(true)
    const nextAttempt = analysisPollCountRef.current + 1
    const timer = window.setTimeout(() => {
      analysisPollCountRef.current = nextAttempt
      void loadAnalysis(selectedAnalysisId, analysisRequestWindow)
    }, ANALYSIS_POLL_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [analysis, analysisRequestWindow, analysisStatus, loadAnalysis, selectedAnalysisId])

  const hydrateWaveAnnotations = useCallback((records: WaveAnnotationRecord[]) => {
    setSavedWaveAnnotations(records)
    const latest = newestRecord(records)
    if (!latest) {
      setMarkers([])
      return
    }

    if (latest.selection?.start_sec != null && latest.selection?.end_sec != null) {
      setSelectionStart(latest.selection.start_sec)
      setSelectionEnd(latest.selection.end_sec)
      setLoopSelection(Boolean(latest.selection.loop_enabled ?? latest.loop_enabled))
      setReversePlayback(Boolean(latest.selection.reverse_enabled ?? latest.reverse_enabled))
      const rate = latest.selection.playback_rate ?? latest.playback_rate
      if (rate && Number.isFinite(rate)) setPlaybackRate(String(rate))
    }

    if (latest.zoom?.start_sec != null && latest.zoom?.end_sec != null) {
      setZoomStart(latest.zoom.start_sec)
      setZoomEnd(latest.zoom.end_sec)
    }

    const scope = latest.scope
    if (scope && typeof scope === "object") {
      const mode = stringValue(scope.visual_mode)
      if (mode === "overlay" || mode === "spectrogram" || mode === "waveform" || mode === "spectrum" || mode === "waterfall") {
        setVisualMode(mode)
      }
      const timeMag = finiteNumber(scope.time_magnification)
      if (timeMag != null) setTimeMagnification(String(timeMag))
      const fMin = finiteNumber(scope.frequency_min_hz)
      if (fMin != null) setFrequencyMinHz(String(fMin))
      const fMax = finiteNumber(scope.frequency_max_hz)
      if (fMax != null) setFrequencyMaxHz(String(fMax))
      const trigger = finiteNumber(scope.trigger_level)
      if (trigger != null) setTriggerLevel(String(trigger))
      const edge = stringValue(scope.trigger_edge)
      if (edge === "rising" || edge === "falling" || edge === "both") setTriggerEdge(edge)
      const triggerModeValue = stringValue(scope.trigger_mode)
      if (triggerModeValue === "auto" || triggerModeValue === "single" || triggerModeValue === "normal") {
        setTriggerMode(triggerModeValue)
      }
      const wGain = finiteNumber(scope.waveform_gain)
      if (wGain != null) setWaveformGain(String(wGain))
      const wHeight = finiteNumber(scope.waveform_height)
      if (wHeight != null) setWaveformHeight(String(wHeight))
      if (typeof scope.waveform_envelope_enabled === "boolean") setShowWaveformEnvelope(scope.waveform_envelope_enabled)
      if (typeof scope.waveform_trace_enabled === "boolean") setShowWaveformTrace(scope.waveform_trace_enabled)
      if (typeof scope.waveform_peak_enabled === "boolean") setShowWaveformPeak(scope.waveform_peak_enabled)
      const palette = stringValue(scope.spectrogram_palette)
      const paletteAliases: Record<string, SpectrogramPalette> = {
        cyan: "marine",
        marine: "marine",
        green: "oscilloscope",
        scope: "oscilloscope",
        oscilloscope: "oscilloscope",
        ember: "thermal",
        thermal: "thermal",
        violet: "plasma",
        plasma: "plasma",
        mono: "marine",
      }
      const resolvedPalette = palette ? paletteAliases[palette] : null
      if (resolvedPalette) {
        setSpectrogramPalette(resolvedPalette)
      }
      const contrast = finiteNumber(scope.spectrogram_contrast)
      if (contrast != null) setSpectrogramContrast(String(contrast))
      const opacity = finiteNumber(scope.spectrogram_opacity)
      if (opacity != null) setSpectrogramOpacity(String(opacity))
      const scopeHeight = finiteNumber(scope.scope_height_px)
      if (scopeHeight != null) setScopeCanvasHeight(String(scopeHeight))
      const lanes = finiteNumber(scope.lane_rows)
      if (lanes != null) setLaneRows(String(lanes))
      if (typeof scope.grid_enabled === "boolean") setShowAnalyzerGrid(scope.grid_enabled)
      if (typeof scope.band_guides_enabled === "boolean") setShowBandGuides(scope.band_guides_enabled)
      if (typeof scope.peaks_enabled === "boolean") setShowPeakMarkers(scope.peaks_enabled)
      if (typeof scope.lanes_enabled === "boolean") setShowEventLanes(scope.lanes_enabled)
      if (typeof scope.persistence_enabled === "boolean") setShowScopePersistence(scope.persistence_enabled)
    }

    setMarkers(latest.markers?.length ? latest.markers : [])
  }, [])

  const loadWaveAnnotations = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/natureos/mindex/library/wave-annotation?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      if (!res.ok) return
      const data = await res.json()
      hydrateWaveAnnotations(normalizeWaveAnnotations(data))
    } catch {
      // Saved notes are additive context; playback should keep working if this read fails.
    }
  }, [hydrateWaveAnnotations])

  const loadHumanIdentifications = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/natureos/mindex/library/human-identification?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      if (!res.ok) return
      const data = await res.json()
      setSavedHumanIdentifications(normalizeHumanIdentifications(data))
    } catch {
      // Review context is useful but should not block the player.
    }
  }, [])

  const syncAudioTransportState = useCallback((audio: HTMLMediaElement, fallbackStatus?: string) => {
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : duration
    if (Number.isFinite(nextDuration)) setDuration(nextDuration)
    setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0)
    const playing = !audio.paused && !audio.ended && audio.readyState > HTMLMediaElement.HAVE_CURRENT_DATA
    setIsPlaying(playing)
    if (fallbackStatus) {
      setPlaybackStatus(fallbackStatus)
      return
    }
    if (audio.error) {
      setPlaybackStatus("Audio stream could not be opened for this file.")
    } else if (playing) {
      setPlaybackStatus("Playing")
    } else if (audio.ended) {
      setPlaybackStatus("Finished")
    } else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setPlaybackStatus(audio.currentTime > 0 ? "Paused" : `Ready to play (${formatDuration(nextDuration)})`)
    }
  }, [duration])

  useEffect(() => {
    if (!selectedId) return
    setError(null)
    setCurrentTime(0)
    setDuration(selected?.duration_sec ?? 0)
    setIsPlaying(false)
    setHoverTime(null)
    setHoverFrequencyHz(null)
    setHoverAmplitude(null)
    setHoverPowerDb(null)
    setSelectionStart(null)
    setSelectionEnd(null)
    setZoomStart(null)
    setZoomEnd(null)
    analysisPollCountRef.current = 0
    setAnalysisPolling(false)
    setAnalysisRequestWindow(null)
    setLoopSelection(false)
    setReversePlayback(false)
    setPlaybackRate("1")
    setMarkers([])
    setSavedWaveAnnotations([])
    setSavedHumanIdentifications([])
    setMarkerLabel("")
    setWaveAnnotationMessage(null)
    scopeQualityRef.current = 0
    setVis(null)
    setScopeSource("none")
    applyAnalysis(null)
    setHumanLabel("")
    setHumanCategory("unknown")
    setHumanConfidence("0.9")
    setHumanNotes("")
    setHumanDisputesModel(true)
    setHumanIdMessage(null)

    hydrateWaveAnnotations(normalizeWaveAnnotations(selected?.wave_annotations))
    setSavedHumanIdentifications([
      ...normalizeHumanIdentifications(selected?.human_identifications),
      ...normalizeHumanIdentifications(selected?.latest_human_identification),
    ])

    if (!selected?.size_bytes || selected.size_bytes <= IMMEDIATE_ANALYSIS_MAX_BYTES) {
      void loadVisualisation(selectedAnalysisId, selected)
      if (selectedAnalysisId) {
        void loadAnalysis(selectedAnalysisId, null, false)
      }
    }
    if (selectedAnalysisId) {
      void loadWaveAnnotations(selectedAnalysisId)
      void loadHumanIdentifications(selectedAnalysisId)
    }

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      setIsPlaying(false)
      setCurrentTime(0)
      audio.src = selectedStreamSource
      audio.preload = selectedNeedsShortPath ? "metadata" : "metadata"
      audio.load()
      setPlaybackStatus(
        selectedNeedsShortPath
          ? `Ready to stream a long recording (${formatBytes(selected?.size_bytes)}).`
          : "Loading audio metadata...",
      )
    }
  }, [
    applyAnalysis,
    hydrateWaveAnnotations,
    loadAnalysis,
    loadHumanIdentifications,
    loadVisualisation,
    loadWaveAnnotations,
    selected,
    selected?.duration_sec,
    selected?.human_identifications,
    selected?.latest_human_identification,
    selected?.size_bytes,
    selected?.wave_annotations,
    selectedAnalysisId,
    selectedId,
    selectedNeedsShortPath,
    selectedStreamSource,
  ])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = Number(playbackRate) || 1
    audio.volume = clampNumber(numericValue(volumeLevel, 1), 0, 1)

    const setReady = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : duration
      syncAudioTransportState(audio, `Ready to play (${formatDuration(nextDuration)})`)
    }
    const setLoading = () => setPlaybackStatus("Loading audio...")
    const setWaiting = () => setPlaybackStatus("Buffering audio...")
    const setPlaying = () => syncAudioTransportState(audio, "Playing")
    const setPaused = () => syncAudioTransportState(audio, audio.ended ? "Finished" : audio.currentTime > 0 ? "Paused" : "Ready to play")
    const setAudioError = () => {
      setIsPlaying(false)
      setPlaybackStatus("Audio stream could not be opened for this file.")
    }
    const setTime = () => {
      if (selectedRegion && !reversePlayback && audio.currentTime >= selectedRegion.end - 0.025) {
        if (loopSelection) {
          seekMediaElement(audio, selectedRegion.start)
        } else {
          audio.pause()
          seekMediaElement(audio, selectedRegion.end)
          setCurrentTime(selectedRegion.end)
          setPlaybackStatus("Selection finished")
          return
        }
      }
      setCurrentTime(audio.currentTime || 0)
    }

    audio.addEventListener("loadstart", setLoading)
    audio.addEventListener("loadedmetadata", setReady)
    audio.addEventListener("canplay", setReady)
    audio.addEventListener("waiting", setWaiting)
    audio.addEventListener("playing", setPlaying)
    audio.addEventListener("pause", setPaused)
    audio.addEventListener("ended", setPaused)
    audio.addEventListener("error", setAudioError)
    audio.addEventListener("timeupdate", setTime)

    if (audio.error) {
      setAudioError()
    } else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setReady()
    } else if (selectedStreamSource) {
      setLoading()
    }

    return () => {
      audio.removeEventListener("loadstart", setLoading)
      audio.removeEventListener("loadedmetadata", setReady)
      audio.removeEventListener("canplay", setReady)
      audio.removeEventListener("waiting", setWaiting)
      audio.removeEventListener("playing", setPlaying)
      audio.removeEventListener("pause", setPaused)
      audio.removeEventListener("ended", setPaused)
      audio.removeEventListener("error", setAudioError)
      audio.removeEventListener("timeupdate", setTime)
    }
  }, [duration, loopSelection, playbackRate, reversePlayback, selectedRegion, selectedStreamSource, syncAudioTransportState, volumeLevel])

  useEffect(() => {
    if (canvasRef.current) {
      drawSineCanvas(
        canvasRef.current,
        vis,
        events,
        displayTranscripts,
        modelOutputs,
        activeDuration,
        currentTime,
        hoverTime,
        hoverFrequencyHz,
        hoverAmplitude,
        hoverPowerDb,
        selectionStart,
        selectionEnd,
        markers,
        visibleStart,
        visibleEnd,
        scopeOptions,
      )
    }
  }, [activeDuration, canvasBackingHeight, canvasBackingWidth, currentTime, displayTranscripts, events, hoverAmplitude, hoverFrequencyHz, hoverPowerDb, hoverTime, markers, modelOutputs, scopeOptions, selectionEnd, selectionStart, vis, visibleEnd, visibleStart])

  const handleSearchInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCatalogRetryCount(0)
    setQuery(event.currentTarget.value)
    setSourceFilter("all")
  }, [])

  const clearSearch = useCallback(() => {
    setCatalogRetryCount(0)
    setQuery("")
    setSourceFilter("all")
    setEnvironmentFilter("all")
    setFileReadinessFilter("all")
  }, [])

  const findShortClips = useCallback(() => {
    setCatalogRetryCount(0)
    setQuery(SHORT_CLIP_QUERY)
    setSourceFilter("all")
    setEnvironmentFilter("short")
    setFileReadinessFilter("all")
  }, [])

  const findRegistrationGaps = useCallback(() => {
    setCatalogRetryCount(0)
    setQuery("")
    setSourceFilter("all")
    setEnvironmentFilter("all")
    setFileReadinessFilter("playback-only")
    void loadBlobs("")
  }, [loadBlobs])

  const stopReversePlayback = useCallback(() => {
    reverseStopRequestedRef.current = true
    if (reverseFrameRef.current) {
      window.cancelAnimationFrame(reverseFrameRef.current)
      reverseFrameRef.current = 0
    }
    const source = reverseSourceRef.current
    reverseSourceRef.current = null
    try {
      source?.stop()
    } catch {
      // Source may already be stopped by the browser.
    }
    source?.disconnect()
    setIsPlaying(false)
  }, [])

  const playReverseSelection = useCallback(async () => {
    if (!selectedRegion || !selectedStreamSource) {
      setPlaybackStatus("Select a wave region before reverse playback.")
      return
    }
    if (selectedNeedsShortPath) {
      setPlaybackStatus("Reverse playback is limited to short clips in this player.")
      return
    }

    stopReversePlayback()
    audioRef.current?.pause()
    setIsPlaying(true)
    setPlaybackStatus("Preparing reverse selection...")

    try {
      const context = reverseContextRef.current ?? new AudioContext()
      reverseContextRef.current = context
      if (context.state === "suspended") await context.resume()

      const res = await fetch(selectedStreamSource, { cache: "force-cache" })
      if (!res.ok) throw new Error(`Audio stream failed (${res.status})`)
      const arrayBuffer = await res.arrayBuffer()
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0))
      const sampleRate = buffer.sampleRate
      const startFrame = Math.max(0, Math.floor(selectedRegion.start * sampleRate))
      const endFrame = Math.min(buffer.length, Math.floor(selectedRegion.end * sampleRate))
      const frameCount = Math.max(1, endFrame - startFrame)
      const reversed = context.createBuffer(buffer.numberOfChannels, frameCount, sampleRate)

      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const source = buffer.getChannelData(channel)
        const target = reversed.getChannelData(channel)
        for (let index = 0; index < frameCount; index += 1) {
          target[index] = source[endFrame - index - 1] ?? 0
        }
      }

      const playOnce = () => {
        reverseStopRequestedRef.current = false
        const source = context.createBufferSource()
        const gain = context.createGain()
        source.buffer = reversed
        source.playbackRate.value = Number(playbackRate) || 1
        gain.gain.value = clampNumber(numericValue(volumeLevel, 1), 0, 1)
        source.connect(gain)
        gain.connect(context.destination)
        reverseSourceRef.current = source
        const startedAt = performance.now()
        const rate = Number(playbackRate) || 1
        const tick = () => {
          const elapsed = ((performance.now() - startedAt) / 1000) * rate
          const nextTime = Math.max(selectedRegion.start, selectedRegion.end - elapsed)
          setCurrentTime(nextTime)
          if (nextTime > selectedRegion.start && reverseSourceRef.current === source) {
            reverseFrameRef.current = window.requestAnimationFrame(tick)
          }
        }
        source.onended = () => {
          if (reverseSourceRef.current !== source) return
          if (reverseFrameRef.current) window.cancelAnimationFrame(reverseFrameRef.current)
          reverseFrameRef.current = 0
          if (!reverseStopRequestedRef.current && loopSelection && reversePlayback) {
            playOnce()
            return
          }
          reverseSourceRef.current = null
          setCurrentTime(selectedRegion.start)
          setIsPlaying(false)
          setPlaybackStatus(reverseStopRequestedRef.current ? "Paused" : "Reverse selection finished")
        }
        setCurrentTime(selectedRegion.end)
        setPlaybackStatus(`Playing reverse selection (${formatDuration(selectedRegion.start)}-${formatDuration(selectedRegion.end)})`)
        source.start()
        reverseFrameRef.current = window.requestAnimationFrame(tick)
      }

      playOnce()
    } catch (event) {
      setIsPlaying(false)
      setPlaybackStatus(event instanceof Error ? event.message : "Reverse playback could not start")
    }
  }, [
    loopSelection,
    playbackRate,
    reversePlayback,
    selectedNeedsShortPath,
    selectedRegion,
    selectedStreamSource,
    stopReversePlayback,
    volumeLevel,
  ])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !selectedStreamSource) {
      setPlaybackStatus("Select an audio file before playback.")
      return
    }
    if (typeof audio.play !== "function" || typeof audio.pause !== "function") {
      setPlaybackStatus("Audio playback is unavailable in this browser context.")
      return
    }
    try {
      if (reversePlayback) {
        if (isPlaying) {
          stopReversePlayback()
          setPlaybackStatus("Paused")
        } else {
          await playReverseSelection()
        }
        return
      }
      stopReversePlayback()
      if (audio.paused) {
        const assignedSource = audio.getAttribute("src") || ""
        const sourceAlreadyAssigned =
          assignedSource === selectedStreamSource ||
          audio.currentSrc === selectedStreamSource ||
          (Boolean(selectedStreamSource) && audio.currentSrc.endsWith(selectedStreamSource))
        if (!sourceAlreadyAssigned) {
          audio.src = selectedStreamSource
        }
        if (selectedRegion) {
          const current = Number.isFinite(audio.currentTime) ? audio.currentTime : selectedRegion.start
          const outsideRegion = current < selectedRegion.start || current >= selectedRegion.end - 0.025
          if (outsideRegion && !seekMediaElement(audio, selectedRegion.start)) {
            setPlaybackStatus("Playback seek is unavailable for this stream.")
            return
          }
        }
        audio.playbackRate = Number(playbackRate) || 1
        setPlaybackStatus(selectedRegion ? "Starting selected region..." : "Starting playback...")
        await audio.play()
        syncAudioTransportState(audio, "Playing")
      } else {
        audio.pause()
        syncAudioTransportState(audio, "Paused")
      }
    } catch (event) {
      setIsPlaying(false)
      setPlaybackStatus(playbackErrorStatus(event))
    }
  }, [isPlaying, playReverseSelection, playbackRate, reversePlayback, selectedRegion, selectedStreamSource, stopReversePlayback, syncAudioTransportState])

  const pressTransport = useCallback(() => {
    const now = performance.now()
    if (now - transportPressRef.current < 220) return
    transportPressRef.current = now
    void togglePlayback()
  }, [togglePlayback])

  const pressTransportOnPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      pressTransport()
    },
    [pressTransport],
  )

  const resetPlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    stopReversePlayback()
    const nextTime = selectedRegion?.start ?? visibleStart
    seekMediaElement(audio, nextTime)
    setCurrentTime(nextTime)
  }, [selectedRegion, stopReversePlayback, visibleStart])

  const scrubTo = useCallback((time: number) => {
    const audio = audioRef.current
    const nextTime = Math.max(0, Math.min(activeDuration || 0, time))
    stopReversePlayback()
    if (audio && Number.isFinite(nextTime)) seekMediaElement(audio, nextTime)
    setCurrentTime(nextTime)
  }, [activeDuration, stopReversePlayback])

  const inspectEvent = useCallback((event: DetectionEvent) => {
    setSelectedEventKey(eventStableKey(event))
    const anchor = eventAnchorTime(event)
    if (anchor != null) scrubTo(anchor)
  }, [scrubTo])

  const handleCanvasMove = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!activeDuration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const span = Math.max(0.001, visibleEnd - visibleStart)
    const xRatio = clampNumber((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    const yRatio = clampNumber((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
    const isWaterfall = scopeOptions.visualMode === "waterfall"
    const canvasHeight = event.currentTarget.height || 640
    const plotTop = 20
    const laneTop = Math.floor(canvasHeight * (scopeOptions.showEventLanes ? 0.76 : 0.84))
    const plotHeight = Math.max(1, laneTop - plotTop - 12)
    const pointerY = yRatio * canvasHeight
    const plotYRatio = clampNumber((pointerY - plotTop) / plotHeight, 0, 1)
    const nextHoverTime = visibleStart + (isWaterfall ? plotYRatio : xRatio) * span
    let nextFrequency: number | null = null

    if (pointerY >= plotTop && pointerY <= laneTop - 12) {
      const { frequencyMinHz, frequencySpanHz } = resolveScopeFrequencyRange(vis, scopeOptions)
      const frequencyNorm = isWaterfall ? xRatio : 1 - plotYRatio
      nextFrequency = frequencyMinHz + frequencyNorm * frequencySpanHz
    }

    setHoverTime(nextHoverTime)
    setHoverFrequencyHz(nextFrequency)
    setHoverAmplitude(waveformAmplitudeAtTime(vis, nextHoverTime, activeDuration))
    setHoverPowerDb(spectrogramPowerAtTimeFrequency(vis, nextHoverTime, nextFrequency, activeDuration))
  }, [activeDuration, scopeOptions, vis, visibleEnd, visibleStart])

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!activeDuration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const span = Math.max(0.001, visibleEnd - visibleStart)
    const isWaterfall = scopeOptions.visualMode === "waterfall"
    const canvasHeight = event.currentTarget.height || 640
    const plotTop = 20
    const laneTop = Math.floor(canvasHeight * (scopeOptions.showEventLanes ? 0.76 : 0.84))
    const plotHeight = Math.max(1, laneTop - plotTop - 12)
    const pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight
    const timeRatio = isWaterfall
      ? clampNumber((pointerY - plotTop) / plotHeight, 0, 1)
      : clampNumber((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    const time = visibleStart + timeRatio * span
    if (selectionStart != null && selectionEnd != null) {
      setSelectionStart(null)
      setSelectionEnd(null)
      setWaveAnnotationMessage(null)
      scrubTo(time)
      return
    }
    if (selectionStart == null) {
      setSelectionStart(time)
      setSelectionEnd(null)
      scrubTo(time)
      return
    }
    setSelectionEnd(time)
    scrubTo(Math.min(selectionStart, time))
  }, [activeDuration, scopeOptions.showEventLanes, scopeOptions.visualMode, scrubTo, selectionEnd, selectionStart, visibleEnd, visibleStart])

  const handleCanvasWheel = useCallback((event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!activeDuration) return
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const xRatio = clampNumber((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    const yRatio = clampNumber((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
    const isWaterfall = scopeOptions.visualMode === "waterfall"
    const currentSpan = Math.max(0.001, visibleEnd - visibleStart)

    if (event.altKey) {
      const { frequencyMinHz: currentMin, frequencyMaxHz: currentMax, frequencySpanHz: currentFrequencySpan } = resolveScopeFrequencyRange(vis, scopeOptions)
      const finiteFrequencies = vis?.spectrogram?.frequencies?.filter((value) => Number.isFinite(value)) ?? []
      const availableMax = finiteFrequencies.length ? Math.max(...finiteFrequencies) : Math.max(24000, currentMax)
      const center = currentMin + (isWaterfall ? xRatio : 1 - yRatio) * currentFrequencySpan
      const nextSpan = clampNumber(currentFrequencySpan * (event.deltaY > 0 ? 1.18 : 0.82), 50, Math.max(100, availableMax))
      const anchorRatio = isWaterfall ? xRatio : 1 - yRatio
      const nextMin = clampNumber(center - nextSpan * anchorRatio, 0, Math.max(0, availableMax - nextSpan))
      const nextMax = clampNumber(nextMin + nextSpan, Math.min(50, availableMax), availableMax)
      setFrequencyMinHz(String(Math.round(nextMin)))
      setFrequencyMaxHz(String(Math.round(nextMax)))
      return
    }

    if (event.shiftKey) {
      if (currentSpan >= activeDuration * 0.999) return
      const direction = event.deltaY === 0 ? Math.sign(event.deltaX) : Math.sign(event.deltaY)
      const delta = (direction || 1) * currentSpan * 0.18
      const nextStart = clampNumber(visibleStart + delta, 0, Math.max(0, activeDuration - currentSpan))
      setZoomStart(nextStart)
      setZoomEnd(nextStart + currentSpan)
      setTimeMagnification("1")
      return
    }

    const targetTime = visibleStart + (isWaterfall ? yRatio : xRatio) * currentSpan
    const nextSpan = clampNumber(currentSpan * (event.deltaY > 0 ? 1.22 : 0.78), 0.05, Math.max(0.05, activeDuration))
    if (nextSpan >= activeDuration * 0.985) {
      setZoomStart(null)
      setZoomEnd(null)
      setTimeMagnification("1")
      return
    }
    const timeAnchorRatio = isWaterfall ? yRatio : xRatio
    const nextStart = clampNumber(targetTime - nextSpan * timeAnchorRatio, 0, Math.max(0, activeDuration - nextSpan))
    setZoomStart(nextStart)
    setZoomEnd(nextStart + nextSpan)
    setTimeMagnification("1")
  }, [activeDuration, scopeOptions, vis, visibleEnd, visibleStart])

  const clearSelection = useCallback(() => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setZoomStart(null)
    setZoomEnd(null)
    setLoopSelection(false)
    setWaveAnnotationMessage(null)
  }, [])

  const exportScopeImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const safeName = (selected?.filename || selected?.id || "sine-scope").replace(/[^a-z0-9._-]+/gi, "_")
    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }

    const context = {
      exported_at: new Date().toISOString(),
      blob: selected
        ? {
            id: selected.id,
            filename: selected.filename,
            title: blobTitle(selected),
            source_id: selected.source_id,
            relative_path: selected.relative_path,
            size_bytes: selected.size_bytes,
            duration_sec: activeDuration || selected.duration_sec,
            sample_rate_hz: activeSampleRate || selected.sample_rate_hz,
            channels: selected.channels,
            environment: inferEnvironment(selected),
            license: selected.license,
          }
        : null,
      viewport: {
        visible_start_sec: visibleStart,
        visible_end_sec: visibleEnd,
        current_time_sec: currentTime,
        selected_region: selectedRegion,
        zoom_region: zoomRegion,
        analysis_window: analysisWindow,
      },
      scope: {
        ...scopeOptions,
        canvas_backing_width: canvas.width,
        canvas_backing_height: canvas.height,
        canvas_css_width: scopeCanvasCssWidth,
        canvas_height_px: canvasHeightPx,
        device_pixel_ratio: scopeCanvasDpr,
        stats: scopeStats,
        measurements: {
          centroid_hz: scopeMeasurements.centroidHz,
          avg_db: scopeMeasurements.avgDb,
          min_db: scopeMeasurements.minDb,
          max_db: scopeMeasurements.maxDb,
          cell_count: scopeMeasurements.cellCount,
          bands: scopeMeasurements.bands,
          peaks: scopeMeasurements.peaks,
        },
        selected_region_measurements: selectedRegionMeasurements
          ? {
              centroid_hz: selectedRegionMeasurements.centroidHz,
              avg_db: selectedRegionMeasurements.avgDb,
              min_db: selectedRegionMeasurements.minDb,
              max_db: selectedRegionMeasurements.maxDb,
              cell_count: selectedRegionMeasurements.cellCount,
              bands: selectedRegionMeasurements.bands,
              peaks: selectedRegionMeasurements.peaks,
            }
          : null,
      },
      sine: {
        readiness: {
          label: sineReadiness.label,
          badge: sineReadiness.badge,
          detail: sineReadiness.detail,
        },
        provenance: analysisProvenance,
        model_evidence_present: hasConfirmedModelEvidence,
        model_top_label: modelTopLabel,
        analysis_run_id: analysisRunId,
        analysis_status: analysisStatus,
        detector_event_count: events.length,
        transcript_count: transcripts.length,
        model_output_count: modelOutputs.length,
        fusion_evidence_count: fusionEvidenceRows.length,
        prototype_match_count: prototypeNeighbors.length,
      },
      classifier_contract: {
        target_domains: SINE_TARGET_DOMAINS,
        class_families: SINE_CLASS_FAMILIES,
        sound_targets: SINE_SOUND_TARGETS,
        model_family_targets: SINE_MODEL_FAMILY_TARGETS,
      },
    }

    downloadBlob(
      new Blob([JSON.stringify(context, null, 2)], { type: "application/json" }),
      `${safeName}-scope-context.json`,
    )
    canvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob(blob, `${safeName}-scope.png`)
    }, "image/png")
  }, [
    activeDuration,
    activeSampleRate,
    analysisProvenance,
    analysisRunId,
    analysisStatus,
    analysisWindow,
    canvasHeightPx,
    currentTime,
    events.length,
    fusionEvidenceRows.length,
    hasConfirmedModelEvidence,
    modelOutputs.length,
    modelTopLabel,
    prototypeNeighbors.length,
    scopeCanvasCssWidth,
    scopeCanvasDpr,
    scopeMeasurements,
    scopeOptions,
    scopeStats,
    selected,
    selectedRegion,
    selectedRegionMeasurements,
    sineReadiness.badge,
    sineReadiness.detail,
    sineReadiness.label,
    transcripts.length,
    visibleEnd,
    visibleStart,
    zoomRegion,
  ])

  const handleCanvasContextMenu = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    clearSelection()
  }, [clearSelection])

  const handleCanvasAuxClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1) clearSelection()
  }, [clearSelection])

  const zoomToSelection = useCallback(() => {
    if (!selectedRegion) return
    const padding = Math.max(0.05, (selectedRegion.end - selectedRegion.start) * 0.2)
    setZoomStart(Math.max(0, selectedRegion.start - padding))
    setZoomEnd(Math.min(activeDuration || selectedRegion.end, selectedRegion.end + padding))
  }, [activeDuration, selectedRegion])

  const resetZoom = useCallback(() => {
    setZoomStart(null)
    setZoomEnd(null)
  }, [])

  const setTimeDivision = useCallback((secondsPerDivision: number) => {
    if (!activeDuration || !Number.isFinite(secondsPerDivision)) return
    const targetSpan = clampNumber(secondsPerDivision * 10, 0.01, activeDuration)
    if (targetSpan >= activeDuration * 0.985) {
      setZoomStart(null)
      setZoomEnd(null)
      setTimeMagnification("1")
      return
    }
    const center = clampNumber(currentTime || visibleStart + (visibleEnd - visibleStart) / 2, 0, activeDuration)
    const start = clampNumber(center - targetSpan / 2, 0, Math.max(0, activeDuration - targetSpan))
    setZoomStart(start)
    setZoomEnd(start + targetSpan)
    setTimeMagnification("1")
  }, [activeDuration, currentTime, visibleEnd, visibleStart])

  const setFrequencyDivision = useCallback((hzPerDivision: number) => {
    if (!Number.isFinite(hzPerDivision)) return
    const finiteFrequencies = vis?.spectrogram?.frequencies?.filter((value) => Number.isFinite(value)) ?? []
    const availableMax = finiteFrequencies.length ? Math.max(...finiteFrequencies) : Math.max(24_000, scopeFrequencyMax)
    const availableMin = finiteFrequencies.length ? Math.max(0, Math.min(...finiteFrequencies)) : 0
    const targetSpan = clampNumber(hzPerDivision * 8, 1, Math.max(1, availableMax - availableMin))
    const center = clampNumber((scopeFrequencyMin + scopeFrequencyMax) / 2, availableMin, availableMax)
    const start = clampNumber(center - targetSpan / 2, availableMin, Math.max(availableMin, availableMax - targetSpan))
    setFrequencyMinHz(String(Math.round(start)))
    setFrequencyMaxHz(String(Math.round(start + targetSpan)))
  }, [scopeFrequencyMax, scopeFrequencyMin, vis?.spectrogram?.frequencies])

  const addMarker = useCallback(() => {
    if (!selectedId || !activeDuration) return
    const time = Math.max(0, Math.min(activeDuration, currentTime))
    const label = markerLabel.trim() || `Marker ${markers.length + 1}`
    setMarkers((current) => [
      ...current,
      {
        id: `local-${Date.now()}-${Math.round(time * 1000)}`,
        time_sec: time,
        label,
      },
    ])
    setMarkerLabel("")
    setWaveAnnotationMessage(null)
  }, [activeDuration, currentTime, markerLabel, markers.length, selectedId])

  const toggleDetectorGroup = useCallback((detector: string) => {
    setCollapsedDetectors((current) => {
      const next = new Set(current)
      if (next.has(detector)) {
        next.delete(detector)
      } else {
        next.add(detector)
      }
      return next
    })
  }, [])

  async function runAnalyze() {
    if (!selectedId) return
    if (!selectedAnalysisId) {
      setError("This recording is playable, but it is not connected to a MINDEX database record yet. SINE evidence checks need a registered acoustic record.")
      return
    }
    const windowRequest = selectedNeedsShortPath || selectedRegion ? analysisWindow : null
    const runMode = windowRequest
      ? selectedNeedsShortPath
        ? "windowed"
        : "selected_region"
      : "full_short_recording"
    setAnalyzing(true)
    setError(null)
    setAnalysisRequestWindow(windowRequest)
    try {
      const params = new URLSearchParams()
      params.set("require_real_audio", "true")
      params.set("require_model_evidence", "true")
      params.set("allow_detector_only", "true")
      params.set("semantic_fallback", "false")
      params.set("llm_fallback", "false")
      params.set("prototype_matching", "true")
      params.set("sound_transcripts", "evidence_backed_only")
      if (windowRequest) {
        params.set("start_sec", String(windowRequest.start))
        params.set("end_sec", String(windowRequest.end))
        params.set("windowed", "true")
        params.set("window_source", windowRequest.source)
      }
      const payload = {
        blob_id: selectedAnalysisId,
        file_id: selectedId,
        mode: runMode,
        start_sec: windowRequest?.start ?? null,
        end_sec: windowRequest?.end ?? null,
        window_source: windowRequest?.source ?? null,
        windowed: Boolean(windowRequest),
        truncated_to_sec: windowRequest?.truncated ? ANALYSIS_WINDOW_MAX_SEC : null,
        sine_request: SINE_REQUEST_CONTRACT,
        evidence_contract: SINE_EVIDENCE_CONTRACT,
        scope: {
          visual_mode: scopeOptions.visualMode,
          frequency_min_hz: scopeOptions.frequencyMinHz,
          frequency_max_hz: scopeOptions.frequencyMaxHz,
          trigger_level: scopeOptions.triggerLevel,
          trigger_edge: scopeOptions.triggerEdge,
          trigger_mode: scopeOptions.triggerMode,
          waveform_gain: scopeOptions.waveformGain,
          waveform_height: scopeOptions.waveformHeight,
          waveform_envelope_enabled: scopeOptions.showWaveformEnvelope,
          waveform_trace_enabled: scopeOptions.showWaveformTrace,
          waveform_peak_enabled: scopeOptions.showWaveformPeak,
          spectrogram_palette: scopeOptions.palette,
          spectrogram_contrast: scopeOptions.spectrogramContrast,
          spectrogram_opacity: scopeOptions.spectrogramOpacity,
          show_grid: scopeOptions.showGrid,
          show_band_guides: scopeOptions.showBandGuides,
          show_peak_markers: scopeOptions.showPeakMarkers,
          show_event_lanes: scopeOptions.showEventLanes,
          show_persistence: scopeOptions.showPersistence,
        },
        file_context: selected
          ? {
              id: selected.id,
              analysis_id: selectedAnalysisId,
              title: blobTitle(selected),
              source_id: selected.source_id,
              source_name: selected.source_name,
              relative_path: selected.relative_path,
              size_bytes: selected.size_bytes,
              duration_sec: activeDuration || selected.duration_sec,
              sample_rate_hz: selected.sample_rate_hz,
              acoustic_environment: selected.acoustic_environment || inferEnvironment(selected),
            }
          : null,
      }
      const res = await fetch(
        `/api/mindex/sine/blobs/${encodeURIComponent(selectedAnalysisId)}/analyze${params.size ? `?${params.toString()}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(120_000),
        },
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 220))
      }
      const data = (await res.json()) as AnalysisPayload
      applyAnalysis(data)
      if (analysisIsQueuedOrRunningStatus(stringValue(data.status || data.state || data.analysis_status))) {
        setMessage(
          windowRequest
            ? `Windowed SINE job submitted for ${formatDuration(windowRequest.start)}-${formatDuration(windowRequest.end)}.`
            : "SINE job submitted.",
        )
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveHumanIdentification() {
    if (!selectedId || !selected) return
    if (!selectedAnalysisId) {
      setHumanIdMessage({
        kind: "error",
        text: "This recording is playable, but it is not connected to a MINDEX database record yet.",
      })
      return
    }
    const label = humanLabel.trim()
    if (!label) {
      setHumanIdMessage({ kind: "error", text: "Add the sound name before saving the human tag." })
      return
    }

    setSavingHumanId(true)
    setHumanIdMessage(null)
    try {
      const reviewEvent = inspectedDetectorEvent
      const reviewEventSnapshot = eventReviewSnapshot(reviewEvent)
      const payload = {
        blob_id: selectedAnalysisId,
        file_id: selectedId,
        analysis_run_id: analysisRunId,
        human_label: label,
        human_category: humanCategory,
        human_confidence: Number(humanConfidence),
        human_notes: humanNotes.trim() || null,
        disputes_model: humanDisputesModel,
        model_top_label: modelTopLabel,
        model_confidence: summary?.confidence ?? null,
        model_summary: summary,
        current_time_sec: currentTime,
        selected_region: selectedRegion
          ? {
              start_sec: selectedRegion.start,
              end_sec: selectedRegion.end,
              loop_enabled: loopSelection,
              reverse_enabled: reversePlayback,
              playback_rate: Number(playbackRate) || 1,
            }
          : null,
        selected_region_measurements:
          selectedRegion && selectedRegionMeasurements?.hasData
            ? {
                centroid_hz: selectedRegionMeasurements.centroidHz,
                avg_db: selectedRegionMeasurements.avgDb,
                min_db: selectedRegionMeasurements.minDb,
                max_db: selectedRegionMeasurements.maxDb,
                db_span: selectedRegionDbSpan,
                cell_count: selectedRegionMeasurements.cellCount,
                strongest_band: strongestSelectedRegionBand
                  ? {
                      label: strongestSelectedRegionBand.label,
                      min_hz: strongestSelectedRegionBand.minHz,
                      max_hz: strongestSelectedRegionBand.maxHz,
                      avg_db: strongestSelectedRegionBand.avgDb,
                      share: strongestSelectedRegionBand.share,
                    }
                  : null,
                top_peaks: selectedRegionMeasurements.peaks.slice(0, 6).map((peak) => ({
                  rank: peak.rank,
                  frequency_hz: peak.frequencyHz,
                  avg_db: peak.avgDb,
                  relative_db: peak.relativeDb,
                  band_label: peak.bandLabel,
                })),
              }
            : null,
        scope_context: {
          visual_mode: visualMode,
          time_magnification: timeMagnificationFactor,
          frequency_min_hz: Math.max(0, numericValue(frequencyMinHz, 0)),
          frequency_max_hz: Math.max(1, numericValue(frequencyMaxHz, 8000)),
          trigger_level: clampNumber(numericValue(triggerLevel, 0), -1, 1),
          trigger_edge: triggerEdge,
          trigger_mode: triggerMode,
          waveform_gain: clampNumber(numericValue(waveformGain, 1), 0.25, 8),
          waveform_height: clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6),
          waveform_envelope_enabled: showWaveformEnvelope,
          waveform_trace_enabled: showWaveformTrace,
          waveform_peak_enabled: showWaveformPeak,
          spectrogram_palette: spectrogramPalette,
          spectrogram_contrast: clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4),
          spectrogram_opacity: clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1),
          grid_enabled: showAnalyzerGrid,
          band_guides_enabled: showBandGuides,
          peaks_enabled: showPeakMarkers,
          lanes_enabled: showEventLanes,
          persistence_enabled: showScopePersistence,
        },
        training_review: {
          eligible: true,
          source: "sine_human_identification",
          review_state: humanDisputesModel ? "contested" : "human_tagged",
          model_evidence_present: hasConfirmedModelEvidence,
          selected_region_present: Boolean(selectedRegion),
          detector_event_present: Boolean(reviewEventSnapshot),
        },
        event_context: reviewEventSnapshot
          ? {
              current_time_sec: currentTime,
              detector_event: reviewEventSnapshot,
              selected_region: selectedRegion
                ? {
                    start_sec: selectedRegion.start,
                    end_sec: selectedRegion.end,
                  }
                : null,
            }
          : {
              current_time_sec: currentTime,
              selected_region: selectedRegion
                ? {
                    start_sec: selectedRegion.start,
                    end_sec: selectedRegion.end,
                  }
                : null,
            },
        detector_event_key: reviewEventSnapshot?.detector_event_key ?? null,
        detector_event: reviewEventSnapshot,
        file_context: {
          id: selected.id,
          analysis_id: selectedAnalysisId,
          title: blobTitle(selected),
          source_id: selected.source_id,
          source_name: selected.source_name,
          relative_path: selected.relative_path,
          size_bytes: selected.size_bytes,
          duration_sec: activeDuration || selected.duration_sec,
          sample_rate_hz: selected.sample_rate_hz,
          acoustic_environment: selected.acoustic_environment || inferEnvironment(selected),
          detector_event: reviewEventSnapshot,
        },
      }

      const res = await fetch("/api/natureos/mindex/library/human-identification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      const text = await res.text()
      let data: Record<string, unknown> | null = null
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : null
      } catch {
        data = null
      }

      if (!res.ok) {
        const reason = typeof data?.error === "string" ? data.error : text.slice(0, 180)
        throw new Error(reason || `Save failed (${res.status})`)
      }

      const savedRecords = normalizeHumanIdentifications(data)
      if (savedRecords.length) {
        setSavedHumanIdentifications((current) => {
          const existing = new Set(current.map((item) => item.id).filter(Boolean))
          return [...savedRecords.filter((item) => !item.id || !existing.has(item.id)), ...current]
        })
      }
      setHumanIdMessage({
        kind: "success",
        text: reviewEventSnapshot
          ? "Human-tagged identification saved with the selected detector event."
          : "Human-tagged identification saved for this recording.",
      })
      void loadTrainingHumanTags()
    } catch (event) {
      setHumanIdMessage({
        kind: "error",
        text: event instanceof Error ? event.message : "Human tag could not be saved.",
      })
    } finally {
      setSavingHumanId(false)
    }
  }

  async function saveWaveAnnotations() {
    if (!selectedId || !selected) return
    if (!selectedAnalysisId) {
      setWaveAnnotationMessage({
        kind: "error",
        text: "This recording is playable, but it is not connected to a MINDEX database record yet.",
      })
      return
    }
    if (!selectedRegion && markers.length === 0) {
      setWaveAnnotationMessage({ kind: "error", text: "Select a region or add a marker before saving." })
      return
    }

    setSavingWaveAnnotation(true)
    setWaveAnnotationMessage(null)
    try {
      const payload = {
        blob_id: selectedAnalysisId,
        file_id: selectedId,
        analysis_run_id: analysisRunId,
        selection: selectedRegion
          ? {
              start_sec: selectedRegion.start,
              end_sec: selectedRegion.end,
              loop_enabled: loopSelection,
              reverse_enabled: reversePlayback,
              playback_rate: Number(playbackRate) || 1,
              volume: clampNumber(numericValue(volumeLevel, 1), 0, 1),
            }
          : null,
        zoom: zoomRegion ? { start_sec: zoomRegion.start, end_sec: zoomRegion.end } : null,
        region_measurements:
          selectedRegion && selectedRegionMeasurements?.hasData
            ? {
                centroid_hz: selectedRegionMeasurements.centroidHz,
                avg_db: selectedRegionMeasurements.avgDb,
                min_db: selectedRegionMeasurements.minDb,
                max_db: selectedRegionMeasurements.maxDb,
                db_span: selectedRegionDbSpan,
                cell_count: selectedRegionMeasurements.cellCount,
                strongest_band: strongestSelectedRegionBand
                  ? {
                      label: strongestSelectedRegionBand.label,
                      min_hz: strongestSelectedRegionBand.minHz,
                      max_hz: strongestSelectedRegionBand.maxHz,
                      avg_db: strongestSelectedRegionBand.avgDb,
                      share: strongestSelectedRegionBand.share,
                    }
                  : null,
                top_peaks: selectedRegionMeasurements.peaks.slice(0, 6).map((peak) => ({
                  rank: peak.rank,
                  frequency_hz: peak.frequencyHz,
                  avg_db: peak.avgDb,
                  relative_db: peak.relativeDb,
                  band_label: peak.bandLabel,
                })),
              }
            : null,
        scope: {
          visual_mode: visualMode,
          time_magnification: timeMagnificationFactor,
          frequency_min_hz: Math.max(0, numericValue(frequencyMinHz, 0)),
          frequency_max_hz: Math.max(1, numericValue(frequencyMaxHz, 8000)),
          trigger_level: clampNumber(numericValue(triggerLevel, 0), -1, 1),
          trigger_edge: triggerEdge,
          trigger_mode: triggerMode,
          waveform_gain: clampNumber(numericValue(waveformGain, 1), 0.25, 8),
          waveform_height: clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6),
          waveform_envelope_enabled: showWaveformEnvelope,
          waveform_trace_enabled: showWaveformTrace,
          waveform_peak_enabled: showWaveformPeak,
          spectrogram_palette: spectrogramPalette,
          spectrogram_contrast: clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4),
          spectrogram_opacity: clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1),
          scope_height_px: Math.round(clampNumber(numericValue(scopeCanvasHeight, 320), 240, 680)),
          lane_rows: Math.round(clampNumber(numericValue(laneRows, 4), 2, 8)),
          grid_enabled: showAnalyzerGrid,
          band_guides_enabled: showBandGuides,
          peaks_enabled: showPeakMarkers,
          lanes_enabled: showEventLanes,
          persistence_enabled: showScopePersistence,
        },
        markers: markers.map((marker) => ({
          id: marker.id,
          time_sec: marker.time_sec,
          label: marker.label,
        })),
        file_context: {
          id: selected.id,
          title: blobTitle(selected),
          source_id: selected.source_id,
          source_name: selected.source_name,
          relative_path: selected.relative_path,
          size_bytes: selected.size_bytes,
          duration_sec: activeDuration || selected.duration_sec,
          sample_rate_hz: selected.sample_rate_hz,
          acoustic_environment: selected.acoustic_environment || inferEnvironment(selected),
        },
      }

      const res = await fetch("/api/natureos/mindex/library/wave-annotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      const text = await res.text()
      let data: Record<string, unknown> | null = null
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : null
      } catch {
        data = null
      }
      if (!res.ok) {
        if (res.status === 404 || res.status === 502) {
          throw new Error("Wave notes could not be saved yet.")
        }
        const reason = typeof data?.error === "string" ? data.error : text.slice(0, 180)
        throw new Error(reason || `Save failed (${res.status})`)
      }

      const savedRecords = normalizeWaveAnnotations(data)
      if (savedRecords.length) {
        setSavedWaveAnnotations((current) => {
          const existing = new Set(current.map((item) => item.id).filter(Boolean))
          return [...savedRecords.filter((item) => !item.id || !existing.has(item.id)), ...current]
        })
      }
      setMarkers((current) => current.map((marker) => ({ ...marker, saved: true })))
      setWaveAnnotationMessage({ kind: "success", text: "Wave region and markers saved for this recording." })
    } catch (event) {
      setWaveAnnotationMessage({
        kind: "error",
        text: event instanceof Error ? event.message : "Wave annotations could not be saved.",
      })
    } finally {
      setSavingWaveAnnotation(false)
    }
  }

  const shellClassName = compact
    ? "h-[680px] max-h-[680px] overflow-hidden bg-transparent text-slate-100"
    : embedded
      ? "h-[920px] max-h-[920px] overflow-hidden bg-transparent text-slate-100"
      : "h-[calc(100vh-56px)] overflow-hidden bg-[#05070c] text-slate-100"
  const innerClassName = compact
    ? "relative flex h-full min-h-0 flex-col gap-2 p-2"
    : embedded
      ? "relative flex h-full min-h-0 flex-col gap-3 p-3"
      : "relative flex h-full min-h-0 flex-col gap-4 p-4 md:p-6"
  const headerClassName = compact
    ? "rounded-lg border border-cyan-400/20 bg-black/45 p-2 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl"
    : "rounded-lg border border-cyan-400/20 bg-black/45 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl"
  const gridClassName = compact
    ? "grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]"
    : "grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]"
  const headingClassName = compact ? "mt-1 text-lg font-semibold text-white md:text-xl" : "mt-2 text-2xl font-semibold text-white md:text-4xl"
  const descriptionClassName = compact
    ? "mt-1 line-clamp-2 max-w-4xl text-xs leading-5 text-slate-400"
    : "mt-2 max-w-4xl text-sm leading-6 text-slate-400"
  const playerMode = compact ? "compact" : embedded ? "embedded" : "standalone"
  const readinessKey = sineReadiness.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const scopeWaveformPoints = waveformSampleCount(vis)
  const scopeSpectrogramRows = vis?.spectrogram?.power_db?.length ?? 0
  const scopeSpectrogramCols = vis?.spectrogram?.power_db?.[0]?.length ?? 0
  const scopeVisualisationStatus = stringValue(vis?.visualisation_status) || stringValue(vis?.status) || (vis ? "ready" : "none")
  const scopeFftSize = finiteNumber(vis?.fft_size) ?? finiteNumber(vis?.n_fft)
  const scopeHopLength = finiteNumber(vis?.hop_length)
  const scopeWindowFunction = stringValue(vis?.window_function) || stringValue(vis?.window)
  const scopeFrequencyMinHz = finiteNumber(vis?.frequency_min_hz)
  const scopeFrequencyMaxHz = finiteNumber(vis?.frequency_max_hz)
  const scopeDbFloor = finiteNumber(vis?.db_floor)
  const scopeDbCeiling = finiteNumber(vis?.db_ceiling)
  const scopeDurationSec = finiteNumber(vis?.duration_sec)
  const scopeSampleRateHz = finiteNumber(vis?.sample_rate_hz)
  const scopeChannels = finiteNumber(vis?.channels)
  const scopeNormalization = stringValue(vis?.normalization)
  const scopeColormapHint = stringValue(vis?.colormap_hint)
  const scopeBackendPeakCount = Array.isArray(vis?.peaks) ? vis.peaks.length : 0
  const scopeBackendClamped = Boolean(vis?.clamp)
  const selectedTitle = selected ? blobTitle(selected) : ""
  const selectedRelativePath = selected?.relative_path || ""
  const selectedSource = selected?.source_name || selected?.source_id || selected?.recording_group || ""
  const selectedMime = selected?.mime_type || ""
  const selectedEnvironment = selected ? inferEnvironment(selected) : ""
  const architectureObservedCount = architectureRows.filter((row) => row.state !== "pending").length
  const architectureEvidenceCount = architectureRows.filter((row) => row.state === "evidence").length
  const recipeEvidenceCount = backendBuildRecipeRows.filter((row) => row.state === "evidence").length
  const modelTargetsCoveredCount = modelTargetRows.filter((row) => row.covered).length
  const classifierScopeCoveredCount = classifierScopeRows.filter((row) => row.covered).length
  const soundTargetGroupsCoveredCount = soundTargetCoverageRows.filter((row) => row.covered).length
  const soundTargetsCoveredCount = soundTargetCoverageRows.reduce((sum, row) => sum + row.coveredTargets.length, 0)
  const evidenceReadyCount = evidenceChecklist.filter((item) => item.ready).length
  const evidenceTotalCount = evidenceChecklist.length
  const fullAcousticCatalogCount = knownAcousticCatalogCount > 0 ? knownAcousticCatalogCount : undefined
  const hasActiveCatalogFilter = Boolean(query.trim()) || sourceFilter !== "all" || environmentFilter !== "all"
  const libraryPillValue =
    hasActiveCatalogFilter && fullAcousticCatalogCount != null && fullAcousticCatalogCount > totalFiles
      ? `${totalFiles.toLocaleString()} filtered`
      : `${totalFiles.toLocaleString()} files`
  const libraryPillDetail =
    hasActiveCatalogFilter && fullAcousticCatalogCount != null && fullAcousticCatalogCount > totalFiles
      ? `${fullAcousticCatalogCount.toLocaleString()} total files`
      : undefined
  const modelPillValue = sineStatusSummary.modelRuntimeLive
    ? "live"
    : registeredModelOutputs.length
      ? `${registeredModelOutputs.length.toLocaleString()} registered`
      : sineModelsLoading || sineStatusLoading
        ? "checking"
        : "not loaded"
  const modelPillDetail = sineStatusSummary.modelRuntimeLive
    ? sineStatusSummary.detail
    : registeredModelOutputs.length
      ? "Registered rows exist, but runtime readiness is not proven yet."
      : "Detector endpoint is reachable, but no trained model artifact is proven yet."
  const catalogIsLoading = status === "loading"
  const libraryCountText =
    catalogIsLoading && blobs.length === 0
      ? "Loading MINDEX acoustic catalog"
      : `${filteredBlobs.length.toLocaleString()} shown from ${blobs.length.toLocaleString()} loaded`
  const libraryStatusText = catalogIsLoading ? "loading catalog" : status
  const catalogLatencyText =
    catalogIsLoading && blobs.length === 0
      ? "MINDEX is reading the NAS-backed acoustic library. The first page can take about 20 seconds while storage rows and registry records settle."
      : null

  return (
    <div
      className={shellClassName}
      data-sine-player="true"
      data-sine-player-mode={playerMode}
      data-sine-contract-status={analysisProvenance.status}
      data-sine-contract-label={analysisProvenance.label}
      data-sine-readiness={readinessKey}
      data-sine-readiness-label={sineReadiness.label}
      data-sine-evidence-ready={evidenceReadyCount}
      data-sine-evidence-total={evidenceTotalCount}
      data-sine-model-runtime-live={sineStatusSummary.modelRuntimeLive ? "true" : "false"}
      data-sine-model-evidence-present={hasConfirmedModelEvidence ? "true" : "false"}
      data-sine-proven-model-outputs={provenModelOutputs.length}
      data-sine-confirmed-model-outputs={confirmedModelOutputs.length}
      data-sine-open-set-review-outputs={openSetReviewModelOutputs.length}
      data-sine-catalog-status={status}
      data-sine-catalog-retries={catalogRetryCount}
      data-sine-catalog-loading-since={catalogLoadingSince ?? ""}
      data-sine-known-acoustic-files={knownAcousticCatalogCount}
      data-sine-registry-backed-rows={hasRegistryBackedCatalogRows ? "true" : "false"}
      data-sine-storage-label={storageLabel}
      data-sine-loaded-files={blobs.length}
      data-sine-analysis-ready-files={analysisReadyBlobCount}
      data-sine-playback-only-files={playbackOnlyBlobCount}
      data-sine-file-readiness-filter={fileReadinessFilter}
      data-sine-filtered-files={filteredBlobs.length}
      data-sine-total-files={totalFiles}
      data-sine-selected-id={selectedId ?? ""}
      data-sine-selected-analysis-id={selectedAnalysisId ?? ""}
      data-sine-selected-record-mode={selectedRecordMode}
      data-sine-selected-name={selectedTitle}
      data-sine-selected-path={selectedRelativePath}
      data-sine-selected-source={selectedSource}
      data-sine-selected-mime={selectedMime}
      data-sine-selected-environment={selectedEnvironment}
      data-sine-selected-size-bytes={selected?.size_bytes ?? ""}
      data-sine-selected-sample-rate-hz={selected?.sample_rate_hz ?? ""}
      data-sine-selected-duration-sec={selected?.duration_sec ?? ""}
      data-sine-playback-status={playbackStatus}
      data-sine-playback-playing={isPlaying ? "true" : "false"}
      data-sine-playback-current-time={currentTime}
      data-sine-playback-duration={activeDuration}
      data-sine-analysis-status={analysisStatus ?? ""}
      data-sine-analysis-run-id={analysisRunId ?? ""}
      data-sine-scope-source={scopeSource}
      data-sine-scope-source-label={scopeSourceLabel(scopeSource)}
      data-sine-visualisation-status={scopeVisualisationStatus}
      data-sine-scope-duration-sec={scopeDurationSec ?? ""}
      data-sine-scope-sample-rate-hz={scopeSampleRateHz ?? ""}
      data-sine-scope-channels={scopeChannels ?? ""}
      data-sine-scope-waveform-points={scopeWaveformPoints}
      data-sine-scope-spectrogram-rows={scopeSpectrogramRows}
      data-sine-scope-spectrogram-cols={scopeSpectrogramCols}
      data-sine-scope-fft-size={scopeFftSize ?? ""}
      data-sine-scope-hop-length={scopeHopLength ?? ""}
      data-sine-scope-window-function={scopeWindowFunction ?? ""}
      data-sine-scope-frequency-min-hz={scopeFrequencyMinHz ?? ""}
      data-sine-scope-frequency-max-hz={scopeFrequencyMaxHz ?? ""}
      data-sine-scope-db-floor={scopeDbFloor ?? ""}
      data-sine-scope-db-ceiling={scopeDbCeiling ?? ""}
      data-sine-scope-normalization={scopeNormalization ?? ""}
      data-sine-scope-colormap-hint={scopeColormapHint ?? ""}
      data-sine-scope-backend-peaks={scopeBackendPeakCount}
      data-sine-scope-backend-clamped={scopeBackendClamped ? "true" : "false"}
      data-sine-architecture-observed={architectureObservedCount}
      data-sine-architecture-evidence={architectureEvidenceCount}
      data-sine-architecture-total={architectureRows.length}
      data-sine-selected-architecture={selectedArchitectureRow?.id ?? ""}
      data-sine-selected-architecture-state={selectedArchitectureRow?.state ?? ""}
      data-sine-recipe-evidence={recipeEvidenceCount}
      data-sine-recipe-total={backendBuildRecipeRows.length}
      data-sine-model-targets-covered={modelTargetsCoveredCount}
      data-sine-model-targets-total={modelTargetRows.length}
      data-sine-classifier-scope-covered={classifierScopeCoveredCount}
      data-sine-classifier-scope-total={classifierScopeRows.length}
      data-sine-sound-targets={SINE_SOUND_TARGETS.length}
      data-sine-sound-targets-covered={soundTargetsCoveredCount}
      data-sine-sound-target-groups-covered={soundTargetGroupsCoveredCount}
      data-sine-sound-target-groups-total={soundTargetCoverageRows.length}
    >
      {!embedded ? (
        <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] [background-size:64px_64px]" />
      ) : null}
      <div className={innerClassName}>
        <header className={headerClassName}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                <Radar className="h-4 w-4" />
                SINE Spectral Intelligence
              </p>
              <h1 className={headingClassName}>
                Acoustic Analysis Workbench
              </h1>
              <p className={descriptionClassName}>
                Browse real MINDEX acoustic files, stream the recording, inspect waveform and spectrogram layers, run evidence checks, and review model-proof gates before any sound meaning is trusted.
              </p>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
              <StatusPill icon={<HardDrive className="h-4 w-4" />} label="Storage" value={storageLabel} />
              <StatusPill icon={<Database className="h-4 w-4" />} label="Library" value={libraryPillValue} detail={libraryPillDetail} />
              <StatusPill icon={<Gauge className="h-4 w-4" />} label="Detectors" value={`${detectorList.length || 0} active`} />
              <StatusPill icon={<Cpu className="h-4 w-4" />} label="AI models" value={modelPillValue} detail={modelPillDetail} />
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        <div data-sine-player-grid="true" className={gridClassName}>
          <aside data-sine-library-panel="true" className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-400/20 bg-black/45 shadow-[0_0_30px_rgba(15,23,42,0.8)] backdrop-blur-xl">
            <div className="border-b border-cyan-400/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Acoustic files</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {libraryCountText}
                  </p>
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                  {libraryStatusText}
                </span>
              </div>

              {blobs.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-200">Analysis ready</p>
                    <p className="mt-1 font-mono text-sm text-emerald-50">{analysisReadyBlobCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200">Playback only</p>
                    <p className="mt-1 font-mono text-sm text-amber-50">{playbackOnlyBlobCount.toLocaleString()}</p>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3">
                <Search className="h-4 w-4 text-cyan-300" />
                <input
                  value={query}
                  onChange={handleSearchInput}
                  placeholder="Search source, file, sensor, label"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear acoustic search"
                    title="Clear acoustic search"
                    onClick={clearSearch}
                    className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={findShortClips}
                  className="min-h-[38px] rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:border-emerald-200/60"
                >
                  Short clips
                </button>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="min-h-[38px] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-300/40"
                >
                  All loaded
                </button>
                <button
                  type="button"
                  onClick={findRegistrationGaps}
                  className="min-h-[38px] rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-200/60"
                >
                  Registration gaps
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <FilterRow
                  label="Signal"
                  options={[
                    ["all", "All"],
                    ["water", "Water"],
                    ["air", "Air"],
                    ["ground", "Ground"],
                    ["short", "Short"],
                  ]}
                  value={environmentFilter}
                  onChange={(value) => setEnvironmentFilter(value as EnvironmentFilter)}
                />
                <FilterRow
                  label="File"
                  options={[
                    ["all", "All"],
                    ["analysis-ready", "Analysis ready"],
                    ["playback-only", "Playback only"],
                  ]}
                  value={fileReadinessFilter}
                  onChange={(value) => setFileReadinessFilter(value as FileReadinessFilter)}
                />
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <ListFilter className="h-3.5 w-3.5" />
                    Source
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterButton active={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>
                      All
                    </FilterButton>
                    {sourceCounts.slice(0, 6).map(([source, count]) => (
                      <FilterButton key={source} active={sourceFilter === source} onClick={() => setSourceFilter(source)}>
                        {source} <span className="text-slate-500">{count}</span>
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </div>

              {catalogLatencyText ? (
                <p className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2 text-xs leading-5 text-cyan-100/85">
                  {catalogLatencyText}
                </p>
              ) : null}
              {message ? <p className="mt-3 text-xs leading-5 text-slate-500">{message}</p> : null}
            </div>

            <div
              ref={libraryScrollRef}
              data-sine-library-scroll="true"
              onScroll={handleLibraryScroll}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {visibleBlobGroups.map(([group, rows]) => (
                <div key={group} className="border-b border-cyan-400/10">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-black/80 px-4 py-2 backdrop-blur-xl">
                    <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      {group}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-400">
                      {rows.length}
                    </span>
                  </div>
                  {rows.map((blob, index) => {
                    const environment = inferEnvironment(blob)
                    const rowAnalysisId = blobAnalysisId(blob)
                    const rowRecordMode = rowAnalysisId ? "analysis-ready" : "playback-only"
                    const selectedRow = selectedId === blob.id
                    return (
                      <button
                        key={`${blob.id || blob.relative_path || blob.filename}-${group}-${index}`}
                        type="button"
                        onClick={() => setSelectedId(blob.id)}
                        className={`block w-full border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 ${
                          selectedRow ? "bg-cyan-300/10" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{blobTitle(blob)}</span>
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {[blob.sensor_type, environment, blob.codec || blob.mime_type].filter(Boolean).join(" / ")}
                            </span>
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">
                            {formatBytes(blob.size_bytes)}
                          </span>
                        </span>
                        <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono ${
                              rowAnalysisId
                                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                            }`}
                          >
                            {rowRecordMode}
                          </span>
                          <span>{formatDuration(blob.duration_sec)}</span>
                          {blob.sample_rate_hz ? <span>{blob.sample_rate_hz.toLocaleString()} Hz</span> : null}
                          {blob.license ? <span className="truncate">{blob.license}</span> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}

              {!visibleBlobs.length ? (
                <div className="p-4 text-sm leading-6 text-slate-500">
                  {status === "loading"
                    ? "Reading the MINDEX acoustic library from NAS-backed storage. Files will appear as soon as the first catalog page returns."
                    : status === "waiting"
                      ? "Storage is connected, but no acoustic file rows were returned."
                      : "No acoustic files match this filter."}
                </div>
              ) : null}

              <div aria-hidden="true" className="h-2" />
            </div>

            {canRevealMoreBlobs || hasMoreCatalogRows ? (
              <div className="border-t border-cyan-400/15 p-3">
                <button
                  type="button"
                  onClick={() => {
                    if (canRevealMoreBlobs) {
                      revealMoreBlobs()
                      return
                    }
                    void loadMoreBlobs()
                  }}
                  disabled={catalogLoadingMore}
                  className="min-h-[40px] w-full rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/60"
                >
                  {catalogLoadingMore
                    ? "Loading more..."
                    : canRevealMoreBlobs
                      ? `Load ${Math.min(initialVisibleCount, filteredBlobs.length - visibleLimit)} more`
                      : "Load more files"}
                </button>
              </div>
            ) : null}
          </aside>

          <main className="min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1 lg:flex lg:h-full lg:flex-col">
            <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 shadow-[0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-xl lg:shrink-0">
              {selected ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                          <FileAudio className="h-4 w-4" />
                          Selected recording
                        </p>
                        <h2 className="mt-2 truncate text-xl font-semibold text-white md:text-2xl">{blobTitle(selected)}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {[selected.source_id || selected.recording_group, selected.sensor_type, selected.relative_path]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        <InfoChip>{formatBytes(selected.size_bytes)}</InfoChip>
                        <InfoChip>{formatDuration(activeDuration || selected.duration_sec)}</InfoChip>
                        {selected.sample_rate_hz ? <InfoChip>{selected.sample_rate_hz.toLocaleString()} Hz</InfoChip> : null}
                        <InfoChip>{cleanLabel(inferEnvironment(selected))}</InfoChip>
                        <InfoChip>{selectedRecordModeLabel}</InfoChip>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-cyan-300/15 bg-black/35 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Native stream fallback</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-400">
                          real MINDEX/NAS audio
                        </span>
                      </div>
                      <audio
                        ref={audioRef}
                        data-sine-audio="true"
                        controls
                        preload="metadata"
                        src={selectedStreamSource || undefined}
                        className="h-10 w-full rounded-lg border border-white/10 bg-black/55 text-cyan-100"
                      />
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Use this browser-native control if the custom transport is blocked; it plays the same selected recording.
                      </p>
                      {!selectedAnalysisId ? (
                        <p className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                          This file can play now. It needs a registered MINDEX record before SINE analysis, saved wave markers, or human identification can attach to it.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <button
                        type="button"
                        onClick={pressTransport}
                        onPointerDown={pressTransportOnPointerDown}
                        disabled={!selectedStreamSource}
                        className="grid h-12 w-12 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.22)] transition hover:border-cyan-100 disabled:opacity-50"
                        aria-label={isPlaying ? "Pause recording" : "Play recording"}
                        title={isPlaying ? "Pause recording" : "Play recording"}
                      >
                        {isPlaying ? <Pause className="pointer-events-none h-5 w-5" /> : <Play className="pointer-events-none h-5 w-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={resetPlayback}
                        className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-cyan-300/40"
                        aria-label="Reset playback"
                        title="Reset playback"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <div className="min-w-[180px] flex-1">
                        <div className="flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
                          <span>
                            {formatDuration(currentTime)}
                            {currentSampleIndex != null ? ` / #${currentSampleIndex.toLocaleString()}` : ""}
                          </span>
                          <span>{formatDuration(activeDuration)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]"
                            style={{ width: `${activeDuration ? Math.min(100, (currentTime / activeDuration) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{playbackStatus}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void runAnalyze()}
                        disabled={runGate.disabled}
                        title={analysisButtonTitle}
                        className="min-h-[44px] rounded-lg border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {analysisButtonLabel}
                      </button>
                    </div>

                    <div className={`mt-3 rounded-lg border p-3 ${liveReadout.tone}`}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">{liveReadout.badge}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">{liveReadout.title}</p>
                          <p className="mt-1 text-xs leading-5 text-white/80">{liveReadout.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5 md:max-w-[45%] md:justify-end">
                          {liveReadout.meta.map((item) => (
                            <span key={item} className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={`mt-3 rounded-lg border p-3 ${runGate.tone}`}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">SINE run gate</p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">{runGate.mode}</p>
                          <p className="mt-1 text-xs leading-5 text-white/80">{runGate.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5 md:max-w-[45%] md:justify-end">
                          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                            {selectedNeedsShortPath ? "long file" : "short file"}
                          </span>
                          {analysisStatus ? (
                            <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                              {cleanLabel(analysisStatus)}
                            </span>
                          ) : null}
                          {analysisJobId ? (
                            <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                              job {analysisJobId.slice(0, 8)}
                            </span>
                          ) : null}
                          {analysisPolling ? (
                            <span className="rounded-full border border-cyan-200/30 bg-cyan-200/15 px-2 py-1 font-mono text-[10px] text-cyan-50">
                              polling
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {selectedNeedsShortPath ? (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100 md:flex-row md:items-center md:justify-between">
                        <span>
                          This long recording can be streamed. SINE evidence checks send the selected, zoomed, or visible window instead of the whole file.
                        </span>
                        <button
                          type="button"
                          onClick={() => selected && void loadVisualisation(selectedAnalysisId, selected)}
                          className="min-h-[38px] shrink-0 rounded-lg border border-amber-200/40 bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:border-amber-100"
                        >
                          Load first {VISUALISATION_WINDOW_MAX_SEC}s scope
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Identification</p>
                    <p className="mt-2 text-lg font-semibold text-white">{identificationLabel}</p>
                    {analysis && !hasConfirmedModelEvidence ? (
                      <p className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                        Detector output loaded, but no trained model evidence or sound-meaning transcript came back for this file yet.
                      </p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Metric label="Confidence" value={identificationConfidence} />
                      <Metric label="Dominant" value={formatHz(summary?.dominant_frequency_hz)} />
                      <Metric label="Events" value={events.length.toLocaleString()} />
                      <Metric label="Transcript" value={displayTranscripts.length ? `${displayTranscripts.length} windows` : "pending"} />
                    </div>
                    {activeTranscript ? (
                      <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Now</p>
                        <p className="mt-1 text-sm font-semibold text-white">{activeTranscript.label}</p>
                        {activeTranscript.description ? (
                          <p className="mt-1 text-xs leading-5 text-slate-300">{activeTranscript.description}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-500">Select an acoustic file when MINDEX returns Library rows.</div>
              )}
            </section>

            <section className="rounded-lg border border-cyan-400/20 bg-black/60 p-3 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl xl:shrink-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Waves className="h-4 w-4" />
                    Waveform / Spectrogram / Detection Timeline
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Canvas uses only the selected recording visualisation and saved detector events.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  {hoverTime != null ? (
                    <InfoChip>
                     cursor {formatDuration(hoverTime)}
                      {hoverFrequencyHz != null ? ` / ${formatHz(hoverFrequencyHz)}` : ""}
                      {hoverPowerDb != null ? ` / ${hoverPowerDb.toFixed(1)} dB` : ""}
                      {hoverSampleIndex != null ? ` / #${hoverSampleIndex.toLocaleString()}` : ""}
                      {hoverAmplitude != null ? ` / ${hoverAmplitude >= 0 ? "+" : ""}${hoverAmplitude.toFixed(3)}` : ""}
                    </InfoChip>
                  ) : null}
                  <InfoChip>{events.length} events</InfoChip>
                  <InfoChip>{displayTranscripts.length} transcript windows</InfoChip>
                </div>
              </div>
              <div className="mb-2 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                  <ScopeToggle
                    active={visualMode === "overlay"}
                    icon={<Waves className="h-3.5 w-3.5" />}
                    label="Overlay"
                    onClick={() => setVisualMode("overlay")}
                  />
                  <ScopeToggle
                    active={visualMode === "spectrogram"}
                    icon={<BarChart3 className="h-3.5 w-3.5" />}
                    label="Spectrogram"
                    onClick={() => setVisualMode("spectrogram")}
                  />
                  <ScopeToggle
                    active={visualMode === "waveform"}
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Waveform"
                    onClick={() => setVisualMode("waveform")}
                  />
                  <ScopeToggle
                    active={showWaveformEnvelope}
                    icon={<Waves className="h-3.5 w-3.5" />}
                    label="Env"
                    onClick={() => setShowWaveformEnvelope((value) => !value)}
                  />
                  <ScopeToggle
                    active={showWaveformTrace}
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Trace"
                    onClick={() => setShowWaveformTrace((value) => !value)}
                  />
                  <ScopeToggle
                    active={showWaveformPeak}
                    icon={<AudioLines className="h-3.5 w-3.5" />}
                    label="Peak"
                    onClick={() => setShowWaveformPeak((value) => !value)}
                  />
                  <ScopeToggle
                    active={visualMode === "spectrum"}
                    icon={<Gauge className="h-3.5 w-3.5" />}
                    label="Spectrum"
                    onClick={() => setVisualMode("spectrum")}
                  />
                  <ScopeToggle
                    active={visualMode === "waterfall"}
                    icon={<AudioLines className="h-3.5 w-3.5" />}
                    label="Waterfall"
                    onClick={() => setVisualMode("waterfall")}
                  />
                  <ScopeToggle
                    active={showAnalyzerGrid}
                    icon={<Grid3X3 className="h-3.5 w-3.5" />}
                    label="Grid"
                    onClick={() => setShowAnalyzerGrid((value) => !value)}
                  />
                  <ScopeToggle
                    active={showScopePersistence}
                    icon={<Layers className="h-3.5 w-3.5" />}
                    label="Persist"
                    onClick={() => setShowScopePersistence((value) => !value)}
                  />
                  <ScopeToggle
                    active={showBandGuides}
                    icon={<Radar className="h-3.5 w-3.5" />}
                    label="Bands"
                    onClick={() => setShowBandGuides((value) => !value)}
                  />
                  <ScopeToggle
                    active={showPeakMarkers}
                    icon={<Target className="h-3.5 w-3.5" />}
                    label="Peaks"
                    onClick={() => setShowPeakMarkers((value) => !value)}
                  />
                  <ScopeToggle
                    active={showEventLanes}
                    icon={<Crosshair className="h-3.5 w-3.5" />}
                    label="Lanes"
                    onClick={() => setShowEventLanes((value) => !value)}
                  />
                  <button
                    type="button"
                    onClick={exportScopeImage}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  </div>
                  <label className="inline-flex min-h-[32px] items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    <Eye className="h-3.5 w-3.5 text-cyan-300" />
                    Palette
                    <select
                      value={spectrogramPalette}
                      onChange={(event) => setSpectrogramPalette(event.currentTarget.value as SpectrogramPalette)}
                      className="h-7 rounded-md border border-white/10 bg-[#080b12] px-2 text-xs normal-case tracking-normal text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="marine">Marine cyan</option>
                      <option value="oscilloscope">Oscilloscope green</option>
                      <option value="plasma">Plasma</option>
                      <option value="thermal">Thermal</option>
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                  <InfoChip>dominant {formatHz(scopeStats.dominantFrequency)}</InfoChip>
                  <InfoChip>range {scopeStats.visibleFrequencyRange}</InfoChip>
                  <InfoChip>{scopeStats.timePerDivision.toFixed(scopeStats.timePerDivision >= 1 ? 1 : 2)}s/div</InfoChip>
                  <InfoChip>{formatHz(scopeStats.frequencyPerDivision)}/div</InfoChip>
                  <InfoChip>{scopeStats.amplitudePerDivision.toFixed(3)} amp/div</InfoChip>
                  <InfoChip>power {scopeStats.dynamicRange}</InfoChip>
                  <InfoChip>trigger {triggerMode} / {triggerEdge}</InfoChip>
                  <InfoChip>{scopeStats.frequencyPeakCount} FFT peaks</InfoChip>
                  <InfoChip>{scopeSourceLabel(scopeSource)}</InfoChip>
                  <InfoChip>viz {scopeVisualisationStatus}</InfoChip>
                  {scopeFftSize ? <InfoChip>FFT {scopeFftSize.toLocaleString()}</InfoChip> : null}
                  {scopeHopLength ? <InfoChip>hop {scopeHopLength.toLocaleString()}</InfoChip> : null}
                  {scopeWindowFunction ? <InfoChip>{scopeWindowFunction} window</InfoChip> : null}
                  {scopeBackendPeakCount ? <InfoChip>{scopeBackendPeakCount.toLocaleString()} backend peaks</InfoChip> : null}
                  {scopeBackendClamped ? <InfoChip>clamped</InfoChip> : null}
                  <InfoChip>{canvasBackingWidth.toLocaleString()} x {canvasBackingHeight.toLocaleString()} scope</InfoChip>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-cyan-300/10 bg-black/25 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <span className="text-cyan-300">Calibrated divisions</span>
                  <label className="inline-flex items-center gap-1.5">
                    Time/div
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value)
                        if (Number.isFinite(value)) setTimeDivision(value)
                        event.currentTarget.value = ""
                      }}
                      className="h-7 rounded-md border border-white/10 bg-[#080b12] px-2 text-xs normal-case tracking-normal text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="" disabled>
                        set
                      </option>
                      {TIME_DIVISION_PRESETS.map((preset) => (
                        <option key={preset.label} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    Hz/div
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value)
                        if (Number.isFinite(value)) setFrequencyDivision(value)
                        event.currentTarget.value = ""
                      }}
                      className="h-7 rounded-md border border-white/10 bg-[#080b12] px-2 text-xs normal-case tracking-normal text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="" disabled>
                        set
                      </option>
                      {FREQUENCY_DIVISION_PRESETS.map((preset) => (
                        <option key={preset.label} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomStart(null)
                      setZoomEnd(null)
                      setTimeMagnification("1")
                    }}
                    className="min-h-[28px] rounded-md border border-white/10 bg-white/[0.035] px-2 text-xs normal-case tracking-normal text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  >
                    Full time
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(21,27,38,0.92),rgba(4,8,16,0.98))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-1px_0_rgba(0,0,0,0.75),0_18px_35px_rgba(0,0,0,0.25)]">
                  <div
                    aria-label="Oscilloscope control bank"
                    className="grid grid-cols-2 gap-1.5 sm:grid-cols-6 sm:grid-rows-2"
                  >
                    <ScopeKnob
                      label="Time width"
                      value={timeMagnification}
                      min="1"
                      max="16"
                      step="0.25"
                      valueLabel={`${timeMagnificationFactor.toFixed(timeMagnificationFactor >= 10 ? 0 : 2)}x`}
                      onChange={setTimeMagnification}
                    />
                    <ScopeKnob
                      label="Frequency low"
                      value={frequencyMinHz}
                      min="0"
                      max="24000"
                      step="50"
                      valueLabel={formatHz(scopeFrequencyMin)}
                      onChange={setFrequencyMinHz}
                    />
                    <ScopeKnob
                      label="Frequency high"
                      value={frequencyMaxHz}
                      min="100"
                      max="24000"
                      step="50"
                      valueLabel={formatHz(scopeFrequencyMax)}
                      onChange={setFrequencyMaxHz}
                    />
                    <ScopeKnob
                      label="Wave gain"
                      value={waveformGain}
                      min="0.25"
                      max="8"
                      step="0.25"
                      valueLabel={`${clampNumber(numericValue(waveformGain, 1), 0.25, 8).toFixed(2)}x`}
                      onChange={setWaveformGain}
                    />
                    <ScopeKnob
                      label="Wave height"
                      value={waveformHeight}
                      min="0.2"
                      max="1.6"
                      step="0.05"
                      valueLabel={`${clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6).toFixed(2)}x`}
                      onChange={setWaveformHeight}
                    />
                    <ScopeKnob
                      label="Trigger"
                      value={triggerLevel}
                      min="-1"
                      max="1"
                      step="0.02"
                      valueLabel={`${clampNumber(numericValue(triggerLevel, 0), -1, 1) >= 0 ? "+" : ""}${clampNumber(numericValue(triggerLevel, 0), -1, 1).toFixed(2)}`}
                      onChange={setTriggerLevel}
                    />
                    <ScopeKnob
                      label="Spec contrast"
                      value={spectrogramContrast}
                      min="0.4"
                      max="4"
                      step="0.05"
                      valueLabel={`${clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4).toFixed(2)}x`}
                      onChange={setSpectrogramContrast}
                    />
                    <ScopeKnob
                      label="Spec opacity"
                      value={spectrogramOpacity}
                      min="0.18"
                      max="1"
                      step="0.01"
                      valueLabel={`${Math.round(clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1) * 100)}%`}
                      onChange={setSpectrogramOpacity}
                    />
                    <ScopeKnob
                      label="Scope height"
                      value={scopeCanvasHeight}
                      min="240"
                      max="680"
                      step="20"
                      valueLabel={`${canvasHeightPx}px`}
                      onChange={setScopeCanvasHeight}
                    />
                    <ScopeKnob
                      label="Volume"
                      value={volumeLevel}
                      min="0"
                      max="1"
                      step="0.01"
                      valueLabel={`${Math.round(clampNumber(numericValue(volumeLevel, 1), 0, 1) * 100)}%`}
                      onChange={setVolumeLevel}
                    />
                    <ScopeKnob
                      label="Lane rows"
                      value={laneRows}
                      min="2"
                      max="8"
                      step="1"
                      valueLabel={`${Math.round(clampNumber(numericValue(laneRows, 4), 2, 8))}`}
                      onChange={setLaneRows}
                    />
                    <div className="grid h-[42px] min-w-0 grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/30 px-1.5 py-1">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[7px] uppercase tracking-[0.08em] text-slate-500">Trig mode</span>
                          <span className="font-mono text-[8px] text-cyan-200">{triggerMode}</span>
                        </div>
                        <select
                          value={triggerMode}
                          onChange={(event) => setTriggerMode(event.currentTarget.value as TriggerMode)}
                          className="mt-1 h-5 w-full rounded border border-white/10 bg-[#080b12] px-1 text-[10px] text-white outline-none transition focus:border-cyan-300/60"
                        >
                          <option value="auto">Auto</option>
                          <option value="normal">Normal</option>
                          <option value="single">Single</option>
                        </select>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[7px] uppercase tracking-[0.08em] text-slate-500">Edge</span>
                          <span className="font-mono text-[8px] text-cyan-200">{triggerEdge}</span>
                        </div>
                        <select
                          value={triggerEdge}
                          onChange={(event) => setTriggerEdge(event.currentTarget.value as TriggerEdge)}
                          className="mt-1 h-5 w-full rounded border border-white/10 bg-[#080b12] px-1 text-[10px] text-white outline-none transition focus:border-cyan-300/60"
                        >
                          <option value="rising">Rising</option>
                          <option value="falling">Falling</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div ref={canvasShellRef} className="w-full">
                <canvas
                  ref={canvasRef}
                  width={canvasBackingWidth}
                  height={canvasBackingHeight}
                  style={{ height: `${canvasHeightPx}px` }}
                  className="w-full cursor-crosshair rounded-md border border-white/10 bg-black"
                  onMouseMove={handleCanvasMove}
                  onMouseLeave={() => {
                    setHoverTime(null)
                    setHoverFrequencyHz(null)
                    setHoverAmplitude(null)
                    setHoverPowerDb(null)
                  }}
                  onClick={handleCanvasClick}
                  onContextMenu={handleCanvasContextMenu}
                  onAuxClick={handleCanvasAuxClick}
                  onWheel={handleCanvasWheel}
                />
              </div>
              <div className="mt-3 grid gap-2 rounded-lg border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                {scopeMeasurementRack.map((item) => (
                  <div key={item.label} className="min-w-0 rounded-md border border-white/10 bg-black/30 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-cyan-300">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="mt-1 min-h-[32px] break-words font-mono text-[13px] font-semibold leading-4 text-white">{item.value}</div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{item.detail}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <InfoChip>
                      Region{" "}
                      {selectedRegion
                        ? `${formatDuration(selectedRegion.start)}-${formatDuration(selectedRegion.end)}`
                        : selectionStart != null
                          ? `${formatDuration(selectionStart)} -> click end`
                          : "click start / click end"}
                    </InfoChip>
                    <InfoChip>View {zoomRegion ? `${formatDuration(zoomRegion.start)}-${formatDuration(zoomRegion.end)}` : "full file"}</InfoChip>
                    <InfoChip>{markers.length} markers</InfoChip>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Left-click once for region start, left-click again for region end. Wheel zooms time around the cursor; Shift+wheel pans time; Alt+wheel adjusts the frequency window. A third left-click, right-click, or middle-click clears the region.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Metric
                      label="Region length"
                      value={selectedRegionMetrics ? formatDuration(selectedRegionMetrics.lengthSec) : "-"}
                    />
                    <Metric
                      label="Start sample"
                      value={selectedRegionMetrics?.startSample != null ? `#${selectedRegionMetrics.startSample.toLocaleString()}` : "-"}
                    />
                    <Metric
                      label="End sample"
                      value={selectedRegionMetrics?.endSample != null ? `#${selectedRegionMetrics.endSample.toLocaleString()}` : "-"}
                    />
                    <Metric
                      label="Samples"
                      value={selectedRegionMetrics?.sampleCount != null ? selectedRegionMetrics.sampleCount.toLocaleString() : "-"}
                    />
                  </div>
                  {selectedRegion ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <Metric
                        label="Region centroid"
                        value={formatHz(selectedRegionMeasurements?.centroidHz)}
                      />
                      <Metric
                        label="Region power"
                        value={formatDb(selectedRegionMeasurements?.avgDb)}
                      />
                      <Metric
                        label="Region peak"
                        value={formatHz(selectedRegionMeasurements?.peaks[0]?.frequencyHz)}
                      />
                      <Metric
                        label="Region band"
                        value={strongestSelectedRegionBand?.share ? strongestSelectedRegionBand.label : "-"}
                      />
                    </div>
                  ) : null}
                  {selectedRegion && selectedRegionMeasurements?.hasData ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">
                        {selectedRegionMeasurements.cellCount.toLocaleString()} time-frequency cells
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">
                        dB span {selectedRegionDbSpan != null ? selectedRegionDbSpan.toFixed(1) : "-"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">
                        strongest band{" "}
                        {strongestSelectedRegionBand?.share
                          ? `${strongestSelectedRegionBand.label} ${Math.round(clampNumber(strongestSelectedRegionBand.share, 0, 1) * 100)}%`
                          : "-"}
                      </span>
                    </div>
                  ) : selectedRegion ? (
                    <p className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                      Region spectral measurements need waveform-derived spectrogram data from MINDEX or the browser scope.
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">
                      trigger {clampNumber(numericValue(triggerLevel, 0), -1, 1) >= 0 ? "+" : ""}
                      {clampNumber(numericValue(triggerLevel, 0), -1, 1).toFixed(2)} / {triggerEdge}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1">
                      rate {playbackRate}x / {loopSelection ? "loop" : "one-shot"} / {reversePlayback ? "reverse" : "forward"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex min-h-[38px] items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={loopSelection}
                        onChange={(event) => setLoopSelection(event.currentTarget.checked)}
                        className="h-4 w-4 accent-cyan-300"
                      />
                      Loop
                    </label>
                    <label className="flex min-h-[38px] items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={reversePlayback}
                        onChange={(event) => {
                          stopReversePlayback()
                          setReversePlayback(event.currentTarget.checked)
                        }}
                        className="h-4 w-4 accent-pink-300"
                      />
                      Reverse
                    </label>
                    <select
                      value={playbackRate}
                      onChange={(event) => setPlaybackRate(event.currentTarget.value)}
                      className="min-h-[38px] rounded-lg border border-white/10 bg-[#080b12] px-3 text-xs text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="0.25">0.25x</option>
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1">1x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2x</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={zoomToSelection}
                      disabled={!selectedRegion}
                      className="min-h-[38px] rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-medium text-cyan-100 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Zoom region
                    </button>
                    <button
                      type="button"
                      onClick={resetZoom}
                      disabled={!zoomRegion}
                      className="min-h-[38px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Reset zoom
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={selectionStart == null && !zoomRegion}
                      className="min-h-[38px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-pink-300/40 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="flex gap-2">
                    <input
                      value={markerLabel}
                      onChange={(event) => setMarkerLabel(event.currentTarget.value)}
                      placeholder="Marker label, e.g. lightning strike"
                      className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                    <button
                      type="button"
                      onClick={addMarker}
                      disabled={!selectedId}
                      className="min-h-[40px] rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 text-xs font-semibold text-amber-100 transition hover:border-amber-200/60 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Add marker
                    </button>
                  </div>
                  {markers.length ? (
                    <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto pr-1">
                      {markers.map((marker) => {
                        const markerSample = activeSampleRate ? Math.max(0, Math.round(marker.time_sec * activeSampleRate)) : null

                        return (
                          <button
                            key={marker.id}
                            type="button"
                            onClick={() => scrubTo(marker.time_sec)}
                            className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-slate-300 transition hover:border-amber-300/50"
                          >
                            {marker.label} {formatDuration(marker.time_sec)}
                            {markerSample != null ? ` / #${markerSample.toLocaleString()}` : ""}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                  {latestWaveAnnotation ? (
                    <p className="mt-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                      Saved wave note loaded
                      {latestWaveAnnotation.selection?.start_sec != null && latestWaveAnnotation.selection?.end_sec != null
                        ? `: ${formatDuration(latestWaveAnnotation.selection.start_sec)}-${formatDuration(latestWaveAnnotation.selection.end_sec)}`
                        : ""}
                      {latestWaveAnnotation.markers?.length ? `, ${latestWaveAnnotation.markers.length} markers` : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => void saveWaveAnnotations()}
                    disabled={savingWaveAnnotation || !selectedAnalysisId || (!selectedRegion && markers.length === 0)}
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingWaveAnnotation ? "Saving..." : "Save wave notes"}
                  </button>
                  {waveAnnotationMessage ? (
                    <p
                      className={`mt-2 rounded-lg border p-2 text-xs leading-5 ${
                        waveAnnotationMessage.kind === "success"
                          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                          : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                      }`}
                    >
                      {waveAnnotationMessage.text}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:h-[760px] xl:shrink-0 xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
              <section className="flex min-h-[320px] flex-col rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:min-h-0 xl:overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                      <Activity className="h-4 w-4" />
                      Detector lanes
                    </p>
                    <p className="mt-1 text-sm text-slate-400">Grouped SINE detector evidence from the selected run.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectorCounts.map(([detector, count]) => (
                      <InfoChip key={detector}>
                        {eventGroupDisplayLabel(detector)} {count}
                      </InfoChip>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="flex min-h-[38px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
                      <Search className="h-4 w-4 shrink-0 text-cyan-300" />
                      <input
                        value={eventQuery}
                        onChange={(event) => setEventQuery(event.currentTarget.value)}
                        placeholder="Filter events by label, detector, method, frequency, metadata"
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      {eventQuery ? (
                        <button
                          type="button"
                          onClick={() => setEventQuery("")}
                          className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-100"
                          aria-label="Clear event filter"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </label>
                    <InfoChip>{filteredEvents.length} visible / {events.length} total</InfoChip>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {eventFamilyOptions.map(([value, label]) => (
                      <FilterButton key={value} active={eventFamilyFilter === value} onClick={() => setEventFamilyFilter(value)}>
                        {label}
                      </FilterButton>
                    ))}
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  {events.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-500">
                      No detector rows yet. Select a short clip and run an evidence check.
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-500">
                      No detector rows match this event filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectorGroups.map(([detector, group]) => {
                        const collapsed = collapsedDetectors.has(detector)
                        const detectorNames = Array.from(new Set(group.map((event) => detectorDisplayLabel(event.detector_id)))).join(" / ")
                        return (
                          <section key={detector} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                            <button
                              type="button"
                              onClick={() => toggleDetectorGroup(detector)}
                              className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-left transition hover:bg-white/[0.04]"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-black/35">
                                  {collapsed ? <ChevronRight className="h-4 w-4 text-cyan-200" /> : <ChevronDown className="h-4 w-4 text-cyan-200" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: eventGroupColor(detector) }} />
                                    {eventGroupDisplayLabel(detector)}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {group.length.toLocaleString()} {group.length === 1 ? "event" : "events"}
                                    {detectorNames ? ` / ${detectorNames}` : ""}
                                  </span>
                                </span>
                              </span>
                              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                                {collapsed ? "closed" : "open"}
                              </span>
                            </button>

                            {!collapsed ? (
                              <div className="max-h-72 overflow-auto">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                  <thead className="sticky top-0 bg-[#080b12] text-xs uppercase tracking-[0.14em] text-slate-500">
                                    <tr>
                                      <th className="p-3">Label</th>
                                      <th className="p-3">Confidence</th>
                                      <th className="p-3">Time</th>
                                      <th className="p-3">Frequency</th>
                                      <th className="p-3">Model / method</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.map((event, index) => {
                                      const key = eventStableKey(event)
                                      const selectedRow = inspectedDetectorEvent ? eventStableKey(inspectedDetectorEvent) === key : false
                                      return (
                                      <tr
                                        key={`${key}-${index}`}
                                        onClick={() => inspectEvent(event)}
                                        className={`cursor-pointer border-t border-white/10 transition hover:bg-cyan-300/8 ${
                                          selectedRow ? "bg-cyan-300/10" : ""
                                        }`}
                                      >
                                        <td className="p-3">
                                          <div className="font-medium text-white">{eventDisplayLabel(event)}</div>
                                          <div className="mt-1 text-[11px] text-slate-500">
                                            {eventDisplayDetail(event)}
                                          </div>
                                        </td>
                                        <td className="p-3">{formatPercent(event.confidence)}</td>
                                        <td className="p-3 font-mono text-xs">{eventTimeLabel(event)}</td>
                                        <td className="p-3 font-mono text-xs">
                                          {event.frequency_min_hz != null || event.frequency_max_hz != null
                                            ? `${formatHz(event.frequency_min_hz)}-${formatHz(event.frequency_max_hz)}`
                                            : formatHz(event.frequency_hz)}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">{event.model || event.model_version || event.engine || event.method || event.metadata?.method?.toString() || "-"}</td>
                                      </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                          </section>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto xl:pb-2 xl:pr-1">
                <section className="flex min-h-[180px] flex-col rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:max-h-[240px] xl:shrink-0 xl:overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                        <Sparkles className="h-4 w-4" />
                        Chronological acoustic script
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Evidence-backed sound windows from model, prototype, or fusion rows.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-100">
                      {transcriptMode === "backend" ? "Evidence backed" : "Awaiting evidence"}
                    </span>
                  </div>
                  <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1">
                    {displayTranscripts.length ? (
                      displayTranscripts.map((entry, index) => {
                        const evidenceBadges = transcriptEvidenceBadges(entry, fusionEvidenceRows, modelOutputs)

                        return (
                          <button
                            key={`${entry.start_sec}-${entry.end_sec}-${entry.label}-${index}`}
                            type="button"
                            onClick={() => scrubTo(entry.start_sec)}
                            className={`block w-full rounded-lg border p-3 text-left transition ${
                              currentTime >= entry.start_sec && currentTime <= entry.end_sec
                                ? "border-amber-300/55 bg-amber-300/12"
                                : "border-white/10 bg-white/[0.035] hover:border-cyan-300/40"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-medium text-white">{entry.label}</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {entry.start_sec.toFixed(2)}-{entry.end_sec.toFixed(2)}s
                              </span>
                            </span>
                            {entry.description ? <span className="mt-2 block text-xs leading-5 text-slate-400">{entry.description}</span> : null}
                            <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              {entry.sound_source ? <span>{entry.sound_source}</span> : null}
                              {entry.frequency_range ? <span>{entry.frequency_range}</span> : null}
                              {entry.confidence != null ? <span>{formatPercent(entry.confidence)}</span> : null}
                            </span>
                            {evidenceBadges.length ? (
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {evidenceBadges.map((badge) => (
                                  <span key={`${entry.start_sec}-${entry.label}-${badge}`} className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2 py-0.5 text-[10px] text-emerald-100">
                                    {badge}
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </button>
                        )
                      })
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-500">
                        No evidence-backed sound transcript has been returned for this recording yet. The event lanes can still show raw detections while SINE waits for verified model windows.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <AudioLines className="h-4 w-4" />
                    Signal stack
                  </p>
                  <div className="mt-3 grid gap-2">
                    {signalStackRows.map((row) => (
                      <StackRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                        <Cpu className="h-4 w-4" />
                        SINE stack
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Decoder, detector, and model-readiness state for this recording.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] text-cyan-100">
                      {analysis ? "run loaded" : sineStatusSummary.badge}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {stackMetricRows.map((row) => (
                      <div key={row.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          <span className="text-cyan-300">{row.icon}</span>
                          {row.label}
                        </div>
                        <p className="mt-2 truncate font-mono text-xs text-white">{row.value}</p>
                        <p className="mt-1 truncate text-[11px] text-slate-500">{row.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-3 rounded-lg border p-3 ${sineStatusSummary.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">Runtime status</p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">{sineStatusSummary.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/80">{sineStatusSummary.detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void loadSineStatus()
                          void loadSineModels()
                          void loadSinePrototypes()
                          if (leadingModelDetailId) void loadSineModelDetail(leadingModelDetailId)
                        }}
                        disabled={sineStatusLoading || sineModelsLoading || sineModelDetailLoading || sinePrototypesLoading}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-black/20 text-white/80 transition hover:border-cyan-200/50 disabled:opacity-50"
                        aria-label="Refresh SINE runtime status"
                        title="Refresh SINE runtime status"
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${sineStatusLoading || sineModelsLoading || sineModelDetailLoading || sinePrototypesLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {sineStatusSummary.chips.length ? (
                      <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto pr-1">
                        {sineStatusSummary.chips.slice(0, 10).map((chip) => (
                          <span key={chip} className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {detectorStatusEntries.length ? (
                    <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {detectorStatusEntries.map((entry) => {
                        const state = entry.state.toLowerCase()
                        const tone = state.includes("unavailable") || state.includes("failed")
                          ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                          : state.includes("pending") || state.includes("registered")
                            ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                            : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                        return (
                          <span key={`${entry.detector}-${entry.state}`} className={`rounded-full border px-2 py-1 text-[10px] ${tone}`}>
                            {entry.label} / {entry.state}
                          </span>
                        )
                      })}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                          <Target className="h-3.5 w-3.5" />
                          Classifier scope contract
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Sent with every SINE run so MINDEX can prove which acoustic worlds and model families are actually covered.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                        {classifierScopeRows.filter((row) => row.covered).length}/{classifierScopeRows.length}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {SINE_TARGET_DOMAINS.map((domain) => (
                        <span key={`target-domain-${domain}`} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">
                          {cleanLabel(domain)}
                        </span>
                      ))}
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-slate-300">
                        {SINE_SOUND_TARGETS.length} specific sound targets
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Specific target coverage</p>
                          <p className="mt-1 text-[11px] leading-4 text-slate-400">
                            These rows stay pending until MINDEX returns model, prototype, fusion, or transcript evidence for the requested sound targets.
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                          {soundTargetsCoveredCount}/{SINE_SOUND_TARGETS.length}
                        </span>
                      </div>
                      <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {soundTargetCoverageRows.map((row) => {
                          const tone = row.covered
                            ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100"
                            : "border-amber-300/20 bg-amber-300/8 text-amber-100"
                          return (
                            <div key={row.label} className="rounded-md border border-white/10 bg-white/[0.025] p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-white">{row.label}</p>
                                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{cleanLabel(row.domain)}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] ${tone}`}>
                                  {row.covered ? `${row.coveredTargets.length}/${row.targets.length}` : "pending"}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] leading-4 text-slate-500">{row.examples}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(row.coveredTargets.length ? row.coveredTargets : row.targets).slice(0, 4).map((target) => (
                                  <span
                                    key={`${row.label}-${target}`}
                                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                                      row.coveredTargets.includes(target)
                                        ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100"
                                        : "border-white/10 bg-black/20 text-slate-400"
                                    }`}
                                  >
                                    {cleanLabel(target)}
                                  </span>
                                ))}
                                {row.targets.length > 4 ? (
                                  <span className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                                    +{row.targets.length - 4}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {classifierScopeRows.map((row) => (
                        <div key={row.label} className="rounded-md border border-white/10 bg-black/20 p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 text-xs font-medium text-white">{row.label}</span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] ${
                                row.covered
                                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                              }`}
                            >
                              {row.covered ? "covered" : "requested"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-slate-500">{row.examples}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Model targets</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {modelTargetRows.map((row) => (
                          <span
                            key={row.label}
                            className={`rounded-full border px-2 py-1 text-[10px] ${
                              row.covered
                                ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100"
                                : "border-white/10 bg-white/[0.035] text-slate-300"
                            }`}
                          >
                            {row.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                          <Cpu className="h-3.5 w-3.5" />
                          Real classifier recipe
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Required layers for real identification. Pending rows mean SINE must not claim sound meaning yet.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                        {backendBuildRecipeRows.filter((row) => row.state === "evidence").length}/{backendBuildRecipeRows.length}
                      </span>
                    </div>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {backendBuildRecipeRows.map((row) => {
                        const tone =
                          row.state === "evidence"
                            ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100"
                            : row.state === "observed"
                              ? "border-cyan-300/25 bg-cyan-300/8 text-cyan-100"
                              : "border-amber-300/20 bg-amber-300/8 text-amber-100"
                        const stateLabel = row.state === "evidence" ? "proven" : row.state === "observed" ? "observed" : "needed"
                        return (
                          <div key={row.id} className="rounded-md border border-white/10 bg-black/25 p-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">{row.label}</p>
                                <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{row.objective}</p>
                                <p className="mt-1 text-[11px] leading-4 text-cyan-100/80">{row.fieldUse}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${tone}`}>
                                {stateLabel}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {row.proves.map((item) => (
                                <span key={`${row.id}-${item}`} className="rounded border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[10px] text-slate-300">
                                  {item}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {row.references.map((item) => (
                                <span key={`${row.id}-ref-${item}`} className="rounded border border-cyan-300/15 bg-cyan-300/[0.045] px-2 py-0.5 text-[10px] text-cyan-100">
                                  {item}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                              <span className="min-w-0 truncate font-mono text-[10px] text-cyan-100">{row.endpoints}</span>
                              <span className="shrink-0 font-mono text-[10px] text-slate-500">
                                arch {row.observedArchitecture}/{row.architectureIds.length}
                                {row.coveredTargets ? ` / model ${row.coveredTargets}` : ""}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {analysis ? (
                    <div
                      className={`mt-4 rounded-lg border p-3 ${
                        analysisProvenance.status === "quarantined"
                          ? "border-rose-300/25 bg-rose-300/10"
                          : analysisProvenance.status === "contract_violation"
                            ? "border-rose-300/25 bg-rose-300/10"
                          : analysisProvenance.status === "evidence"
                            ? "border-emerald-300/20 bg-emerald-300/8"
                            : "border-amber-300/20 bg-amber-300/8"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{analysisProvenance.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{analysisProvenance.detail}</p>
                          {analysisProvenance.markers.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {analysisProvenance.markers.slice(0, 6).map((marker) => (
                                <span key={marker} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                                  {marker}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Evidence checklist</p>
                      <span className="font-mono text-[10px] text-slate-500">
                        {evidenceChecklist.filter((item) => item.ready).length}/{evidenceChecklist.length}
                      </span>
                    </div>
                    <div className={`mt-3 rounded-md border p-3 ${sineReadiness.tone}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{sineReadiness.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/80">{sineReadiness.detail}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">
                          {sineReadiness.badge}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-1.5">
                      {evidenceChecklist.map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-md border px-2.5 py-2 ${
                            item.ready
                              ? "border-emerald-300/20 bg-emerald-300/[0.055]"
                              : "border-amber-300/18 bg-amber-300/[0.045]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-xs font-medium text-white">{item.label}</span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                item.ready
                                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                              }`}
                            >
                              {item.ready ? "ready" : "missing"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-slate-400">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Model evidence</p>
                      <span className="font-mono text-[10px] text-slate-500">
                        {modelOutputs.length || fusionEvidenceRows.length || registeredModelOutputs.length
                          ? `${modelOutputs.length} outputs / ${fusionEvidenceRows.length} evidence / ${registeredModelOutputs.length} registered`
                          : "pending"}
                      </span>
                    </div>
                    {registeredModelOutputs.length ? (
                      <div className="mt-3 rounded-md border border-cyan-300/15 bg-cyan-300/[0.045] p-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-200">Registered models</p>
                          <span className="font-mono text-[10px] text-cyan-100">{registeredModelOutputs.length}</span>
                        </div>
                        <div className="mt-2 grid gap-1.5">
                          {registeredModelOutputs.slice(0, 3).map((model, index) => {
                            const modelName =
                              [model.model_name || model.model_id, model.model_version].filter(Boolean).join(" ") ||
                              model.framework ||
                              `model ${index + 1}`
                            const runtimeLabel = [model.framework, model.runtime].filter(Boolean).join(" / ")
                            const stateLabel = model.status || (model.artifact_uri || model.model_checksum ? "registered" : "reported")
                            const registryItems = [
                              ["Runtime", runtimeLabel],
                              ["Artifact", model.artifact_uri],
                              ["Checksum", model.model_checksum ? model.model_checksum.slice(0, 16) : null],
                              ["Label map", model.label_map_uri],
                              ["Labels", model.label_count != null ? model.label_count.toLocaleString() : null],
                              ["Metrics", model.metrics_uri],
                              ["Dataset", model.training_dataset],
                              ["Device", model.device],
                              ["Backend", model.backend_commit ? model.backend_commit.slice(0, 10) : null],
                            ].filter((item): item is [string, string] => Boolean(item[1]))
                            const modelCoverage = Array.from(
                              new Set([...model.domain_heads, ...model.target_domains, ...model.class_families].map((item) => cleanLabel(item)).filter(Boolean)),
                            )
                            return (
                              <div key={model.id || model.model_id || `${modelName}-${index}`} className="rounded border border-white/10 bg-black/25 p-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-mono text-[11px] text-white">{modelName}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                      {runtimeLabel || "runtime pending"}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-cyan-100">
                                    {cleanLabel(stateLabel)}
                                  </span>
                                </div>
                                {registryItems.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {registryItems.map(([label, value]) => (
                                      <span key={`${model.id || modelName}-${label}`} className="rounded border border-white/10 bg-black/25 px-2 py-0.5 font-mono text-[10px] text-slate-300" title={value}>
                                        {label}: {label === "Artifact" || label === "Label map" || label === "Metrics" ? value.split(/[\\/]/).pop() || value : value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {modelCoverage.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {modelCoverage.slice(0, 10).map((domain) => (
                                      <span key={`${model.id || modelName}-domain-${domain}`} className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-0.5 text-[10px] text-cyan-100">
                                        {domain}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                        {sineModelDetailLoading || sineModelDetailError ? (
                          <p className="mt-2 rounded border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] leading-4 text-slate-400">
                            {sineModelDetailLoading
                              ? "Reading artifact detail for the leading registered model..."
                              : `Model artifact detail pending: ${sineModelDetailError}`}
                          </p>
                        ) : null}
                        {registeredDomainCoverage.length ? (
                          <div className="mt-2 rounded border border-white/10 bg-black/20 p-2">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">Registered domain coverage</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {registeredDomainCoverage.map((domain) => (
                                <span key={`registry-domain-${domain}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : sineModelsError ? (
                      <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-2.5 text-xs leading-5 text-amber-100">
                        Model registry has not returned real rows yet: {sineModelsError}
                      </p>
                    ) : null}
                    {registeredPrototypeCatalog.length ? (
                      <div className="mt-3 rounded-md border border-sky-300/15 bg-sky-300/[0.045] p-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-sky-200">Prototype catalog</p>
                          <span className="font-mono text-[10px] text-sky-100">{registeredPrototypeCatalog.length}</span>
                        </div>
                        {registeredPrototypeDomains.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {registeredPrototypeDomains.map((domain) => (
                              <span key={`prototype-domain-${domain}`} className="rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-2 py-0.5 text-[10px] text-sky-100">
                                {domain}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-2 grid gap-1.5">
                          {registeredPrototypeCatalog.slice(0, 4).map((prototype) => (
                            <div key={prototype.id} className="rounded border border-white/10 bg-black/25 p-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-[11px] text-white">{cleanLabel(prototype.label)}</p>
                                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                    {[prototype.source, prototype.domain, prototype.category].filter(Boolean).map((value) => cleanLabel(value)).join(" / ") || "source pending"}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 font-mono text-[10px] text-sky-100">
                                  {prototype.embedding_dim ? `${prototype.embedding_dim}D` : prototype.prototype_count ? `${prototype.prototype_count} refs` : "prototype"}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {[
                                  prototype.model_id ? `model ${prototype.model_id}` : null,
                                  prototype.vector_checksum ? `sha ${prototype.vector_checksum.slice(0, 10)}` : null,
                                  prototype.license ? cleanLabel(prototype.license) : null,
                                ]
                                  .filter((item): item is string => Boolean(item))
                                  .map((item) => (
                                    <span key={`${prototype.id}-${item}`} className="rounded border border-white/10 bg-white/[0.035] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                                      {item}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : sinePrototypesError ? (
                      <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-2.5 text-xs leading-5 text-amber-100">
                        Prototype catalog has not returned real rows yet: {sinePrototypesError}
                      </p>
                    ) : null}
                    {modelOutputs.length || fusionEvidenceRows.length ? (
                      <div className="mt-3 grid gap-2">
                        {modelOutputs.slice(0, 4).map((output, index) => {
                          const top = output.top_labels[0]
                          const modelName = [output.model_name, output.model_version].filter(Boolean).join(" ") || output.framework || "model"
                          const runtimeLabel = [output.framework, output.runtime].filter(Boolean).join(" / ")
                          const openSetReview = modelOutputIsOpenSetReview(output)
                          const outputTone = openSetReview
                            ? "border-amber-300/25 bg-amber-300/10"
                            : "border-white/10 bg-black/25"
                          const scoreTone = openSetReview
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                            : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                          const windowLabel =
                            output.start_sec != null && output.end_sec != null
                              ? `${output.start_sec.toFixed(2)}-${output.end_sec.toFixed(2)}s`
                              : "full window"
                          const auditItems = [
                            ["Open set", output.ood_status ? cleanLabel(output.ood_status) : openSetReview ? "Review required" : null],
                            ["OOD score", output.ood_score != null ? formatPercent(output.ood_score) : null],
                            ["OOD threshold", output.ood_threshold != null ? formatPercent(output.ood_threshold) : null],
                            ["Min confidence", output.min_confidence != null ? formatPercent(output.min_confidence) : null],
                            ["Margin", output.confidence_margin != null ? output.confidence_margin.toFixed(3) : null],
                            ["Entropy", output.normalized_entropy != null ? output.normalized_entropy.toFixed(3) : output.entropy != null ? output.entropy.toFixed(3) : null],
                            ["Runtime", runtimeLabel],
                            ["Artifact", output.artifact_uri],
                            ["Checksum", output.model_checksum ? output.model_checksum.slice(0, 16) : null],
                            ["Label map", output.label_map_uri],
                            ["Labels", output.label_count != null ? output.label_count.toLocaleString() : null],
                            ["Metrics", output.metrics_uri],
                            ["Dataset", output.training_dataset],
                            ["Model ID", output.model_id],
                            ["Input", output.input_sample_rate_hz ? `${output.input_sample_rate_hz.toLocaleString()} Hz` : null],
                            ["Samples", output.window_samples ? output.window_samples.toLocaleString() : null],
                            ["Embedding", output.embedding_dim ? `${output.embedding_dim.toLocaleString()}D` : null],
                            ["Device", output.device],
                            ["Backend", output.backend_commit ? output.backend_commit.slice(0, 10) : null],
                            ["Job", output.job_id || output.inference_id],
                          ].filter((item): item is [string, string] => Boolean(item[1]))
                          return (
                            <div key={output.id || `${modelName}-${index}`} className={`rounded-md border p-2.5 ${outputTone}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-mono text-[11px] text-slate-200">{modelName}</p>
                                  <p className="mt-1 text-xs text-white">
                                    {top ? cleanLabel(top.label) : output.status ? cleanLabel(output.status) : "No label returned"}
                                  </p>
                                  {openSetReview ? (
                                    <p className="mt-1 text-[11px] leading-4 text-amber-100/85">
                                      Held for review. This model row does not confirm sound meaning.
                                    </p>
                                  ) : null}
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${scoreTone}`}>
                                  {top?.score != null ? formatPercent(top.score) : output.ood_score != null ? `OOD ${formatPercent(output.ood_score)}` : windowLabel}
                                </span>
                              </div>
                              {output.top_labels.length > 1 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {output.top_labels.slice(1, 4).map((label) => (
                                    <span key={`${output.id}-${label.label}`} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                                      {cleanLabel(label.label)} {formatPercent(label.score)}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {auditItems.length ? (
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                  {auditItems.slice(0, 10).map(([label, value]) => (
                                    <div key={`${output.id || index}-${label}`} className="min-w-0 rounded border border-white/5 bg-white/[0.03] px-2 py-1">
                                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
                                      <p className="mt-0.5 truncate font-mono text-[10px] text-cyan-100" title={value}>
                                        {label === "Artifact" || label === "Label map" || label === "Metrics" ? value.split(/[\\/]/).pop() || value : value}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {output.domain_heads.length || output.target_domains.length || output.class_families.length ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {Array.from(new Set([...output.domain_heads, ...output.target_domains, ...output.class_families].map((item) => cleanLabel(item)).filter(Boolean)))
                                    .slice(0, 10)
                                    .map((domain) => (
                                      <span key={`${output.id || modelName}-domain-${domain}`} className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-0.5 text-[10px] text-cyan-100">
                                        {domain}
                                      </span>
                                    ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                        {fusionEvidenceRows.slice(0, 5).map((row, index) => (
                          <div key={row.id || `${row.kind}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-200">
                                {cleanLabel(row.label || row.event_type || row.event_family || row.kind)}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                                {[row.kind, row.model, row.detail].filter(Boolean).map((value) => cleanLabel(value)).join(" / ")}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2 py-0.5 font-mono text-[10px] text-emerald-100">
                              {row.weight != null ? `w ${row.weight.toFixed(2)}` : row.score != null ? formatPercent(row.score) : "evidence"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-500">
                        No model outputs or fusion evidence returned yet. This panel will fill only when MINDEX returns real model evidence.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">SINE model architecture</p>
                      <span className="font-mono text-[10px] text-slate-500">
                        {architectureRows.filter((row) => row.state !== "pending").length} / {architectureRows.length}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                        {architectureRows.map((row, index) => {
                          const tone =
                            row.state === "evidence"
                              ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100"
                              : row.state === "observed"
                                ? "border-cyan-300/25 bg-cyan-300/8 text-cyan-100"
                                : "border-amber-300/20 bg-amber-300/8 text-amber-100"
                          const active = selectedArchitectureRow?.id === row.id
                          return (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => setSelectedArchitectureId(row.id)}
                              className={`rounded-md border p-2.5 text-left transition ${
                                active ? "border-cyan-200/55 bg-cyan-300/10 shadow-[0_0_20px_rgba(34,211,238,0.12)]" : "border-white/10 bg-black/25 hover:border-cyan-300/35"
                              }`}
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-cyan-100">
                                      {row.layer}
                                    </span>
                                    <span className="min-w-0 truncate text-xs font-semibold text-white">
                                      {index + 1}. {row.label}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block truncate font-mono text-[10px] text-cyan-200/80">{row.tensor}</span>
                                </span>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${tone}`}>
                                  {row.state}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      {selectedArchitectureRow ? (
                        <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[9px] uppercase tracking-[0.14em] text-cyan-200">Active block profile</p>
                              <p className="mt-1 truncate text-sm font-semibold text-white">{selectedArchitectureRow.label}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                selectedArchitectureRow.state === "evidence"
                                  ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100"
                                  : selectedArchitectureRow.state === "observed"
                                    ? "border-cyan-300/25 bg-cyan-300/8 text-cyan-100"
                                    : "border-amber-300/20 bg-amber-300/8 text-amber-100"
                              }`}
                            >
                              {selectedArchitectureRow.state}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <DetailRow label="Layer" value={selectedArchitectureRow.layer} />
                            <DetailRow label="Tensor" value={selectedArchitectureRow.tensor} />
                            <DetailRow label="Evidence source" value={selectedArchitectureRow.state === "evidence" ? "selected run" : selectedArchitectureRow.state === "observed" ? "file or registry" : "pending"} />
                          </div>
                          <p className="mt-3 rounded-md border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-300">
                            {selectedArchitectureRow.detail}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {SINE_BACKEND_BUILD_RECIPE.filter((recipe) => recipe.architectureIds.includes(selectedArchitectureRow.id)).map((recipe) => (
                              <span key={`${selectedArchitectureRow.id}-${recipe.id}`} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] text-slate-300">
                                {recipe.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {detectorStackRows.length ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">Detector layer map</p>
                        <span className="font-mono text-[10px] text-slate-500">{detectorStackRows.length} registered</span>
                      </div>
                      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                        {detectorLayerOrder.map((layer) => {
                          const rows = detectorStackRows.filter((row) => row.layer === layer)
                          if (!rows.length) return null
                          const meta = detectorLayerMeta[layer]
                          return (
                            <div key={layer} className="rounded-md border border-white/10 bg-black/25 p-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-white">{meta.label}</p>
                                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{meta.description}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 font-mono text-[10px] text-cyan-100">
                                  {rows.reduce((total, row) => total + row.eventCount, 0)} events
                                </span>
                              </div>
                              <div className="mt-2 space-y-1.5">
                                {rows.map((row) => {
                                  const state = row.state.toLowerCase()
                                  const tone = state.includes("ok") || state.includes("observed")
                                    ? "text-emerald-100 border-emerald-300/20 bg-emerald-300/8"
                                    : state.includes("failed") || state.includes("error")
                                      ? "text-rose-100 border-rose-300/25 bg-rose-300/10"
                                      : "text-amber-100 border-amber-300/20 bg-amber-300/8"
                                  return (
                                    <div key={`${layer}-${row.detector}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded border border-white/8 bg-white/[0.025] px-2 py-1.5">
                                      <div className="min-w-0">
                                        <p className="truncate font-mono text-[11px] text-slate-200">{row.detector}</p>
                                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{row.method}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] ${tone}`}>{row.state}</span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                                          {row.eventCount}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Target className="h-4 w-4" />
                    Event inspector
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {selectedDetectorEvent
                      ? "Selected detector event from the table."
                      : activeDetectorEvent
                        ? "Detector event nearest the current playhead."
                        : "Select a detector row or scrub into an event window."}
                  </p>
                  {inspectedDetectorEvent ? (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{eventDisplayLabel(inspectedDetectorEvent)}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[eventGroupDisplayLabel(eventGroupKey(inspectedDetectorEvent)), detectorDisplayLabel(inspectedDetectorEvent.detector_id)]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          </div>
                          <span
                            className="mt-1 h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: eventColor(inspectedDetectorEvent) }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Confidence" value={formatPercent(inspectedDetectorEvent.confidence)} />
                        <Metric label="Frequency" value={formatHz(inspectedDetectorEvent.frequency_hz)} />
                        <Metric label="Time" value={eventTimeLabel(inspectedDetectorEvent)} />
                        <Metric label="Anchor" value={formatDuration(eventAnchorTime(inspectedDetectorEvent))} />
                      </div>
                      <div className="grid gap-2 text-sm">
                        <DetailRow label="Domain" value={inspectedDetectorEvent.acoustic_domain ? cleanLabel(inspectedDetectorEvent.acoustic_domain) : "-"} />
                        <DetailRow label="Family" value={eventGroupDisplayLabel(eventGroupKey(inspectedDetectorEvent))} />
                        <DetailRow label="Type" value={isUnverifiedPrototypeEvent(inspectedDetectorEvent) ? "Evidence missing" : inspectedDetectorEvent.event_type ? cleanLabel(inspectedDetectorEvent.event_type) : inspectedDetectorEvent.category || "-"} />
                        <DetailRow label="Method" value={inspectedDetectorEvent.method || "-"} />
                        <DetailRow label="Model" value={inspectedDetectorEvent.model || inspectedDetectorEvent.model_version || inspectedDetectorEvent.engine || "-"} />
                      </div>
                      {inspectedEventMetadataRows.length ? (
                        <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-2">
                          {inspectedEventMetadataRows.slice(0, 6).map(([label, value]) => (
                            <DetailRow key={`${label}-${value}`} label={label} value={value} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-500">
                      No detector event selected.
                    </p>
                  )}
                </section>

                <section
                  className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0"
                  data-sine-fingerprint-ready={spectralFingerprintReady ? "true" : "false"}
                  data-sine-fingerprint-bands={spectralFingerprintRows.length}
                  data-sine-fingerprint-dominant={spectralFingerprintDominant?.label ?? ""}
                >
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Gauge className="h-4 w-4" />
                    Window measurements
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Measurements from the visible spectrogram window only.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric label="Centroid" value={formatHz(scopeMeasurements.centroidHz)} />
                    <Metric label="Average power" value={formatDb(scopeMeasurements.avgDb)} />
                    <Metric label="Range" value={scopeMeasurements.hasData ? `${formatDb(scopeMeasurements.minDb)} to ${formatDb(scopeMeasurements.maxDb)}` : "-"} />
                    <Metric label="Cells" value={scopeMeasurements.cellCount ? scopeMeasurements.cellCount.toLocaleString() : "-"} />
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Visible spectral peaks</p>
                      <span className="font-mono text-[10px] text-cyan-200">
                        {scopeMeasurements.peaks.length ? `${scopeMeasurements.peaks.length} peaks` : "pending"}
                      </span>
                    </div>
                    <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                      {scopeMeasurements.peaks.length ? (
                        scopeMeasurements.peaks.slice(0, 6).map((peak) => (
                          <div
                            key={`${peak.rank}-${peak.frequencyHz.toFixed(2)}`}
                            className="grid grid-cols-[2rem_minmax(4rem,1fr)_minmax(4rem,0.8fr)] items-center gap-2 rounded-md border border-cyan-300/10 bg-black/30 px-2 py-1.5 text-[11px]"
                          >
                            <span className="font-mono text-cyan-200">#{peak.rank}</span>
                            <span className="min-w-0 truncate font-mono text-white">{formatHz(peak.frequencyHz)}</span>
                            <span className="text-right font-mono text-slate-300">
                              {formatDb(peak.avgDb)}
                              {peak.rank > 1 ? ` / ${peak.relativeDb.toFixed(1)} dB` : ""}
                            </span>
                            <span className="col-span-3 min-w-0 truncate text-[10px] text-slate-500">{peak.bandLabel}</span>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-md border border-white/10 bg-black/25 px-2 py-2 text-xs text-slate-500">
                          No finite spectral peaks in this visible window yet.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                          <Fingerprint className="h-3.5 w-3.5" />
                          Acoustic fingerprint
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Visible-window band power and peak structure only. This is not a semantic classifier.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-cyan-300/20 bg-black/30 px-2 py-1 font-mono text-[10px] text-cyan-100">
                        {spectralFingerprintCode}
                      </span>
                    </div>
                    {spectralFingerprintReady ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/20 bg-black/40 shadow-[0_0_26px_rgba(34,211,238,0.12)]">
                          <div className="absolute inset-3 rounded-full border border-cyan-300/10" />
                          <div className="absolute inset-7 rounded-full border border-cyan-300/10" />
                          {spectralFingerprintRows.map((row, index) => {
                            const angle = (index / Math.max(1, spectralFingerprintRows.length)) * 360 - 90
                            return (
                              <span
                                key={`${row.label}-spoke`}
                                className="absolute left-1/2 top-1/2 h-1.5 origin-left rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.55)]"
                                style={{
                                  width: `${22 + row.normalized * 34}px`,
                                  opacity: 0.22 + row.normalized * 0.72,
                                  transform: `translateY(-50%) rotate(${angle}deg)`,
                                }}
                              />
                            )
                          })}
                          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/90 text-center font-mono text-[10px] leading-3 text-cyan-100">
                            {formatPercent(spectralFingerprintDominant?.share)}
                          </div>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
                              <span className="block uppercase tracking-[0.14em] text-slate-500">Dominant</span>
                              <span className="mt-1 block truncate text-slate-100">{spectralFingerprintDominant?.label ?? "-"}</span>
                            </div>
                            <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
                              <span className="block uppercase tracking-[0.14em] text-slate-500">Window</span>
                              <span className="mt-1 block font-mono text-slate-100">
                                {formatDuration(visibleStart)}-{formatDuration(visibleEnd)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {spectralFingerprintRows.map((row) => (
                              <div key={`${row.label}-fingerprint`} className="grid grid-cols-[minmax(6rem,1fr)_3.5rem_2.5rem] items-center gap-2 text-[11px]">
                                <span className="min-w-0 truncate text-slate-300">{row.label}</span>
                                <span className="text-right font-mono text-cyan-100">{formatPercent(row.share)}</span>
                                <span className="text-right font-mono text-slate-500">{row.peakCount} pk</span>
                                <span className="col-span-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <span
                                    className="block h-full rounded-full bg-cyan-300"
                                    style={{ width: `${Math.round(row.normalized * 100)}%` }}
                                  />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md border border-white/10 bg-black/25 px-2 py-2 text-xs text-slate-500">
                        Fingerprint waits for real visible spectrogram data.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {scopeMeasurements.bands.map((band) => (
                      <div key={band.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-slate-200">{band.label}</span>
                          <span className="shrink-0 font-mono text-slate-400">{formatDb(band.avgDb)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)]"
                            style={{ width: `${Math.round(clampNumber(band.share, 0, 1) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-500">
                          <span>{formatHz(band.minHz)}-{formatHz(band.maxHz)}</span>
                          <span>{Math.round(clampNumber(band.share, 0, 1) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="flex min-h-[190px] flex-col rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0 xl:overflow-hidden">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Radar className="h-4 w-4" />
                    {analysisContractFailed ? "Verified matches blocked" : "Prototype matches"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {analysisContractFailed
                      ? "Current backend rows are visible in detector lanes, but they are not accepted as prototype evidence until model/vector provenance is returned."
                      : "Embedding, prototype, or fusion-backed neighbors returned by SINE for this recording."}
                  </p>
                  <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1">
                    {prototypeNeighbors.length ? (
                      prototypeNeighbors.slice(0, 12).map((match, index) => (
                        <button
                          key={`${match.id}-${index}`}
                          type="button"
                          onClick={() => {
                            const start = match.segment_start
                            if (start != null) scrubTo(start)
                          }}
                          className="block w-full rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-cyan-300/40"
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-white">{cleanLabel(match.label)}</span>
                              <span className="mt-1 block truncate text-xs text-slate-500">
                                {[match.source, match.category, match.prototype_id, match.model_id || match.model, match.vector_checksum ? `sha ${match.vector_checksum.slice(0, 10)}` : null]
                                  .filter(Boolean)
                                  .map((value) => cleanLabel(value))
                                  .join(" / ") || "source pending"}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] text-cyan-100">
                              {formatPercent(match.score)}
                            </span>
                          </span>
                          <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>{match.evidence_kind === "fusion" ? "fusion evidence" : "embedding match"}</span>
                            {match.segment_start != null && match.segment_end != null ? (
                              <span>{match.segment_start.toFixed(2)}-{match.segment_end.toFixed(2)}s</span>
                            ) : null}
                            {match.distance != null ? <span>distance {match.distance.toFixed(3)}</span> : null}
                            {match.model ? <span>{match.model}</span> : null}
                            {match.embedding_dim ? <span>{match.embedding_dim}D</span> : null}
                            {match.detail ? <span>{cleanLabel(match.detail)}</span> : null}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-500">
                        No prototype matches returned for this recording yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Gauge className="h-4 w-4" />
                    Analysis diagnostics
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {diagnosticRows.length ? (
                      diagnosticRows.map(([label, value]) => <Metric key={label} label={label} value={value} />)
                    ) : (
                      <p className="col-span-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-500">
                        No analysis diagnostics returned for this recording yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Tag className="h-4 w-4" />
                    Human identification
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Correct the sound when you know the current result is wrong. The model result is kept beside your tag for later training review when model evidence exists.
                  </p>

                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Current SINE result</p>
                    <p className="mt-1 truncate text-sm font-medium text-white">
                      {hasConfirmedModelEvidence && modelTopLabel
                        ? cleanLabel(modelTopLabel)
                        : openSetReviewModelOutputs.length
                          ? "Open-set review"
                          : modelTopLabel
                            ? `${cleanLabel(modelTopLabel)} (unconfirmed)`
                            : "No model result yet"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {openSetReviewModelOutputs[0]?.ood_status
                        ? cleanLabel(openSetReviewModelOutputs[0].ood_status)
                        : hasConfirmedModelEvidence
                          ? formatPercent(summary?.confidence)
                          : "identity pending"}
                    </p>
                  </div>
                  {inspectedDetectorEvent ? (
                    <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/8 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-200">Review target</p>
                      <p className="mt-1 truncate text-sm font-medium text-white">{cleanLabel(inspectedDetectorEvent.label)}</p>
                      <p className="mt-1 text-xs leading-5 text-cyan-100/80">
                        {detectorLabel(inspectedDetectorEvent.detector_id)} / {eventTimeLabel(inspectedDetectorEvent)} / {formatHz(inspectedDetectorEvent.frequency_hz)}
                      </p>
                    </div>
                  ) : null}
                  {latestHumanIdentification?.human_label ? (
                    <div
                      className={`mt-3 rounded-lg border p-3 ${
                        humanModelReview.contested
                          ? "border-amber-300/30 bg-amber-300/10"
                          : humanModelReview.status === "aligned"
                            ? "border-emerald-300/25 bg-emerald-300/10"
                            : "border-cyan-300/20 bg-cyan-300/8"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-[10px] uppercase tracking-[0.14em] ${
                              humanModelReview.contested
                                ? "text-amber-200"
                                : humanModelReview.status === "aligned"
                                  ? "text-emerald-200"
                                  : "text-cyan-200"
                            }`}
                          >
                            Model / human review
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">
                            {humanModelReview.contested
                              ? "Model and human interpretation are preserved as a contested example for review."
                              : humanModelReview.status === "aligned"
                                ? "Human tag currently matches the model label."
                                : "Human tag is saved; model evidence is still pending for this recording."}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] ${
                            humanModelReview.contested
                              ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                              : humanModelReview.status === "aligned"
                                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                          }`}
                        >
                          {humanModelReview.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Metric
                          label="Model"
                          value={humanModelReview.modelLabel ? cleanLabel(humanModelReview.modelLabel) : "-"}
                        />
                        <Metric
                          label="Human"
                          value={humanModelReview.humanLabel ? cleanLabel(humanModelReview.humanLabel) : "-"}
                        />
                      </div>
                    </div>
                  ) : null}
                  {latestHumanIdentification?.human_label ? (
                    <div className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-200">Latest human tag</p>
                      <p className="mt-1 truncate text-sm font-medium text-white">{cleanLabel(latestHumanIdentification.human_label)}</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-100/85">
                        {latestHumanIdentification.human_category ? cleanLabel(latestHumanIdentification.human_category) : "Review sample"}
                        {latestHumanIdentification.human_confidence != null ? ` / ${formatPercent(latestHumanIdentification.human_confidence)}` : ""}
                        {latestHumanIdentification.disputes_model ? " / disputes model" : ""}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Training review queue</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">
                          {trainingHumanTagsError
                            ? trainingHumanTagsError
                            : trainingHumanTagsLoading
                              ? "Checking human-tagged review examples..."
                              : trainingHumanTags.length
                                ? `${trainingHumanTagsTotal ?? trainingHumanTags.length} human-tagged example${(trainingHumanTagsTotal ?? trainingHumanTags.length) === 1 ? "" : "s"} available for SINE review.`
                                : "No human-tagged training examples returned yet."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadTrainingHumanTags()}
                        className="shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/50"
                      >
                        Refresh
                      </button>
                    </div>
                    {trainingHumanTags.length ? (
                      <div className="mt-3 space-y-2">
                        {trainingHumanTags.slice(0, 3).map((item, index) => (
                          <div key={item.id || `${item.human_label || "tag"}-${index}`} className="rounded border border-white/10 bg-black/20 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium text-white">{cleanLabel(item.human_label || "human tag")}</p>
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] ${
                                  item.disputes_model
                                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                                    : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                }`}
                              >
                                {item.disputes_model ? "contested" : item.review_status || "tagged"}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {[
                                item.human_category ? cleanLabel(item.human_category) : null,
                                item.model_top_label ? `model ${cleanLabel(item.model_top_label)}` : "model pending",
                                item.created_at ? new Date(item.created_at).toLocaleString() : null,
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <input
                      value={humanLabel}
                      onChange={(event) => setHumanLabel(event.currentTarget.value)}
                      placeholder="Known sound, e.g. lightning"
                      className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={humanCategory}
                        onChange={(event) => setHumanCategory(event.currentTarget.value)}
                        className="min-h-[40px] rounded-lg border border-white/10 bg-[#080b12] px-3 text-xs text-white outline-none transition focus:border-cyan-300/60"
                      >
                        {humanCategoryOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={humanConfidence}
                        onChange={(event) => setHumanConfidence(event.currentTarget.value)}
                        className="min-h-[40px] rounded-lg border border-white/10 bg-[#080b12] px-3 text-xs text-white outline-none transition focus:border-cyan-300/60"
                      >
                        <option value="1">Certain</option>
                        <option value="0.9">Very sure</option>
                        <option value="0.7">Likely</option>
                        <option value="0.5">Needs review</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={humanDisputesModel}
                        onChange={(event) => setHumanDisputesModel(event.currentTarget.checked)}
                        className="h-4 w-4 accent-cyan-300"
                      />
                      This tag disagrees with the current SINE result.
                    </label>
                    <textarea
                      value={humanNotes}
                      onChange={(event) => setHumanNotes(event.currentTarget.value)}
                      placeholder="Optional notes: what you heard, where it happened, why this label is correct"
                      rows={3}
                      className="resize-none rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-5 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                    <button
                      type="button"
                      onClick={() => void saveHumanIdentification()}
                      disabled={savingHumanId || !selectedAnalysisId}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingHumanId ? "Saving..." : "Save human tag"}
                    </button>
                    {humanIdMessage ? (
                      <p
                        className={`rounded-lg border p-2 text-xs leading-5 ${
                          humanIdMessage.kind === "success"
                            ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                            : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {humanIdMessage.text}
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="flex min-h-[160px] flex-col rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0 xl:overflow-hidden">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Timer className="h-4 w-4" />
                    Recording details
                  </p>
                  {selected ? (
                    <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1 text-sm">
                      <DetailRow label="Path" value={selected.relative_path || "-"} />
                      <DetailRow label="Source" value={selected.source_id || selected.recording_group || "-"} />
                      <DetailRow label="Sensor" value={selected.sensor_type || "-"} />
                      <DetailRow label="MIME" value={selected.mime_type || "-"} />
                      <DetailRow label="License" value={selected.license || "-"} />
                      <DetailRow label="Bytes" value={formatBytes(selected.size_bytes)} />
                    </div>
                  ) : null}
                </section>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-medium text-white">{value}</p>
      {detail ? <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{detail}</p> : null}
    </div>
  )
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-slate-300">
      {children}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs text-cyan-100">{value}</p>
    </div>
  )
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[30px] rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-cyan-200/70 bg-cyan-300/18 text-cyan-50"
          : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/40 hover:text-cyan-100"
      }`}
    >
      {children}
    </button>
  )
}

function ScopeToggle({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-3 py-1 text-xs transition ${
        active
          ? "border-cyan-200/70 bg-cyan-300/18 text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.16)]"
          : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/40 hover:text-cyan-100"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ScopeKnob({
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  label: string
  value: string
  min: string
  max: string
  step: string
  valueLabel: string
  onChange: (value: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const minNumber = numericValue(min, 0)
  const maxNumber = Math.max(minNumber, numericValue(max, minNumber + 1))
  const stepNumber = Math.max(0.000001, numericValue(step, 1))
  const numeric = clampNumber(numericValue(value, minNumber), minNumber, maxNumber)
  const span = Math.max(0.000001, maxNumber - minNumber)
  const normalized = clampNumber((numeric - minNumber) / span, 0, 1)
  const rotation = -135 + normalized * 270

  const commitValue = useCallback(
    (nextValue: number) => {
      const stepped = roundToStep(clampNumber(nextValue, minNumber, maxNumber), minNumber, stepNumber)
      onChange(String(stepped))
    },
    [maxNumber, minNumber, onChange, stepNumber],
  )

  const commitFromPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      let angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI + 90
      if (angle > 180) angle -= 360
      const nextNormalized = (clampNumber(angle, -135, 135) + 135) / 270
      commitValue(minNumber + nextNormalized * span)
    },
    [commitValue, minNumber, span],
  )

  return (
    <div className="flex h-[42px] min-w-0 items-center gap-1 rounded-md border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(0,0,0,0.18))] px-1.5 py-1 text-[7px] uppercase tracking-[0.08em] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.55)]">
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={minNumber}
          aria-valuemax={maxNumber}
          aria-valuenow={numeric}
          aria-valuetext={valueLabel}
          onPointerDown={(event) => {
            setDragging(true)
            event.currentTarget.setPointerCapture(event.pointerId)
            commitFromPoint(event)
          }}
          onPointerMove={(event) => {
            if (dragging) commitFromPoint(event)
          }}
          onPointerUp={(event) => {
            setDragging(false)
            try {
              event.currentTarget.releasePointerCapture(event.pointerId)
            } catch {
              // The browser may release capture first if the pointer leaves the knob.
            }
          }}
          onPointerCancel={() => setDragging(false)}
          onWheel={(event) => {
            event.preventDefault()
            const direction = event.deltaY > 0 ? -1 : 1
            const multiplier = event.shiftKey ? 10 : 1
            commitValue(numeric + direction * stepNumber * multiplier)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault()
              commitValue(numeric + stepNumber)
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault()
              commitValue(numeric - stepNumber)
            }
            if (event.key === "Home") {
              event.preventDefault()
              commitValue(minNumber)
            }
            if (event.key === "End") {
              event.preventDefault()
              commitValue(maxNumber)
            }
          }}
          className={`relative grid h-6 w-6 shrink-0 cursor-grab place-items-center rounded-full border text-cyan-100 shadow-[inset_0_0_6px_rgba(255,255,255,0.06),0_0_7px_rgba(34,211,238,0.12)] outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-300/30 ${
            dragging ? "border-cyan-200 bg-cyan-300/18" : "border-cyan-300/30 bg-slate-950"
          }`}
          style={{
            background: `conic-gradient(from 225deg, rgba(34,211,238,0.72) 0deg, rgba(34,211,238,0.72) ${normalized * 270}deg, rgba(15,23,42,0.92) ${normalized * 270}deg, rgba(15,23,42,0.92) 270deg, rgba(255,255,255,0.08) 270deg)`,
          }}
        >
          <span className="absolute h-4 w-4 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.24),rgba(15,23,42,0.98)_64%)] shadow-[inset_0_0_6px_rgba(0,0,0,0.72)]" />
          <span
            className="absolute left-1/2 top-1/2 h-2 w-0.5 origin-bottom rounded-full bg-cyan-100 shadow-[0_0_5px_rgba(103,232,249,0.9)]"
            style={{
              transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
              transformOrigin: "50% 100%",
            }}
          />
          <span className="absolute bottom-1 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-cyan-200/80" />
        </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[7px] leading-[10px] text-slate-500">{label}</div>
        <div className="truncate font-mono text-[9px] normal-case leading-[11px] tracking-normal text-cyan-100">{valueLabel}</div>
        <div className="mt-0.5 flex items-center gap-0.5">
          {[0, 1, 2, 3, 4].map((tick) => (
            <span
              key={tick}
              className={`h-1 w-1 rounded-full ${
                tick <= Math.floor(normalized * 4.99) ? "bg-cyan-200 shadow-[0_0_5px_rgba(103,232,249,0.7)]" : "bg-white/12"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="grid shrink-0 gap-0.5">
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => commitValue(numeric + stepNumber)}
          className="grid h-3 w-3 place-items-center rounded border border-white/10 bg-white/[0.04] text-[7px] leading-none text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
        >
          +
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => commitValue(numeric - stepNumber)}
          className="grid h-3 w-3 place-items-center rounded border border-white/10 bg-white/[0.04] text-[7px] leading-none text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
        >
          -
        </button>
      </div>
    </div>
  )
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [string, string][]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        <ListFilter className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, optionLabel]) => (
          <FilterButton key={id} active={value === id} onClick={() => onChange(id)}>
            {optionLabel}
          </FilterButton>
        ))}
      </div>
    </div>
  )
}

function StackRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
      <span className="flex items-center gap-2 text-slate-300">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </span>
      <span className="font-mono text-xs text-slate-500">{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-sm text-slate-300">{value}</span>
    </div>
  )
}
