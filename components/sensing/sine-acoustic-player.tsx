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
  Gauge,
  Grid3X3,
  HardDrive,
  ListFilter,
  Pause,
  PawPrint,
  Plane,
  Play,
  Radar,
  RotateCcw,
  Save,
  Search,
  ShipWheel,
  Sparkles,
  Tag,
  Target,
  Timer,
  Waves,
  Zap,
  X,
} from "lucide-react"

interface BlobItem {
  id: string
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
}

interface DeepSignalMatch {
  label: string
  score?: number | null
  source?: string | null
  segment_start?: number | null
  segment_end?: number | null
  category?: string | null
  prototype_id?: string | null
  model?: string | null
  distance?: number | null
}

interface Visualisation {
  duration_sec?: number
  sample_rate_hz?: number
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
  status?: string | null
  engine?: string | null
  model?: string | null
  dominant_frequency_hz?: number | null
  detector_counts?: Record<string, number>
  detector_status?: Record<string, string>
}

type AnalysisPayload = Record<string, unknown> & {
  status?: string
  summary?: Record<string, unknown>
  events?: unknown[]
  detector_events?: unknown[]
  visualisation?: Visualisation
  classification?: Record<string, unknown>
  identification_summary?: IdentificationSummary
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

type EnvironmentFilter = "all" | "water" | "air" | "ground" | "short"
type EventFamilyFilter = "all" | "frequency" | "activity" | "animal" | "propeller" | "impulse" | "ground" | "mechanical" | "pattern"
type VisualMode = "overlay" | "spectrogram" | "waveform"
type SpectrogramPalette = "marine" | "plasma" | "thermal"

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
  palette: SpectrogramPalette
  waveformGain: number
  waveformHeight: number
  spectrogramContrast: number
  spectrogramOpacity: number
  frequencyMinHz: number
  frequencyMaxHz: number
  laneRows: number
}

interface ScopeBandMeasurement {
  label: string
  minHz: number
  maxHz: number
  avgDb: number | null
  share: number
}

interface ScopeMeasurementSummary {
  hasData: boolean
  avgDb: number | null
  minDb: number | null
  maxDb: number | null
  centroidHz: number | null
  cellCount: number
  bands: ScopeBandMeasurement[]
}

const CATALOG_LIMIT = 100
const INITIAL_VISIBLE_COUNT = 80
const IMMEDIATE_ANALYSIS_MAX_BYTES = 25 * 1024 * 1024
const SHORT_CLIP_QUERY = "esc"

const acousticBandGuides = [
  { label: "Ground / seismic", minHz: 0, maxHz: 20, color: "rgba(168, 85, 247, 0.18)" },
  { label: "Rumble / engines", minHz: 20, maxHz: 200, color: "rgba(14, 165, 233, 0.16)" },
  { label: "Calls / voice band", minHz: 200, maxHz: 1000, color: "rgba(34, 197, 94, 0.14)" },
  { label: "Animal / machine detail", minHz: 1000, maxHz: 8000, color: "rgba(251, 191, 36, 0.12)" },
  { label: "High insect / ultrasonic edge", minHz: 8000, maxHz: 24000, color: "rgba(244, 114, 182, 0.12)" },
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

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
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
    return { hasData: false, avgDb: null, minDb: null, maxDb: null, centroidHz: null, cellCount: 0, bands: emptyBands }
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

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const frequency = frequencies?.[rowIndex] ?? (rowIndex / Math.max(1, rows - 1)) * frequencyMaxHz
    if (!Number.isFinite(frequency) || frequency < frequencyMinHz || frequency > frequencyMaxHz) continue
    const row = power[rowIndex]
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
      acousticBandGuides.forEach((band, bandIndex) => {
        if (frequency >= band.minHz && frequency <= band.maxHz) {
          bandTotals[bandIndex].power += linear
          bandTotals[bandIndex].cells += 1
        }
      })
    }
  }

  if (!cellCount || linearTotal <= 0) {
    return { hasData: false, avgDb: null, minDb: null, maxDb: null, centroidHz: null, cellCount: 0, bands: emptyBands }
  }

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
  if (!events.length) return undefined

  const sortedByConfidence = [...events].sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
  const representative =
    events.find((event) => event.detector_id === "deep_signal_features" && event.label) ||
    events.find((event) => event.event_family === "prototype_match" && event.label) ||
    sortedByConfidence.find((event) => event.event_family !== "frequency_peak" && event.label) ||
    sortedByConfidence.find((event) => event.label)

  if (!representative?.label) return undefined

  const detectorCounts = events.reduce<Record<string, number>>((counts, event) => {
    const key = event.event_family || event.detector_id || "event"
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  const dominantFrequency =
    representative.frequency_hz ??
    sortedByConfidence.find((event) => event.frequency_hz != null)?.frequency_hz ??
    null

  return {
    top_label: representative.label,
    label: representative.label,
    category: representative.event_family || representative.category || null,
    type: representative.event_type || representative.category || null,
    confidence: representative.confidence ?? null,
    engine: representative.engine || representative.detector_id || null,
    model: representative.model || representative.model_version || null,
    dominant_frequency_hz: dominantFrequency,
    detector_counts: detectorCounts,
  }
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
      }
    })
    .filter((item): item is SoundTranscript => Boolean(item))
    .sort((left, right) => left.start_sec - right.start_sec)
}

function eventFrequencyRangeLabel(event: DetectionEvent) {
  if (event.frequency_min_hz != null || event.frequency_max_hz != null) {
    return `${formatHz(event.frequency_min_hz)}-${formatHz(event.frequency_max_hz)}`
  }
  if (event.frequency_hz != null) return formatHz(event.frequency_hz)
  return null
}

function transcriptWindowFromEvent(event: DetectionEvent): SoundTranscript | null {
  const anchor = eventAnchorTime(event)
  let start = event.start_sec ?? null
  let end = event.end_sec ?? null

  if (start == null && end == null && anchor != null) {
    start = Math.max(0, anchor - 0.25)
    end = anchor + 0.25
  } else if (start == null && end != null) {
    start = Math.max(0, end - 0.5)
  } else if (end == null && start != null) {
    end = start + 0.5
  }

  if (start == null || end == null) return null
  if (end < start) [start, end] = [end, start]
  if (end === start) end = start + 0.25

  const familyKey = eventGroupKey(event)
  const familyLabel = eventGroupLabel(familyKey)
  const detector = detectorLabel(event.detector_id)
  const method = cleanLabel(event.method || event.model || event.model_version || event.engine || "")
  const frequency = eventFrequencyRangeLabel(event)
  const label = cleanLabel(event.label) || familyLabel || detector || "Signal window"
  const details = [
    familyLabel,
    detector && detector !== familyLabel ? detector : null,
    method || null,
    frequency ? `Frequency ${frequency}` : null,
  ].filter(Boolean)

  return {
    start_sec: start,
    end_sec: end,
    label,
    description: details.length ? details.join(" / ") : "Real SINE signal window.",
    sound_source: familyLabel,
    confidence: event.confidence ?? null,
    frequency_range: frequency,
    transcript_source: "detector",
    detector_id: event.detector_id,
    event_family: familyKey,
    method: method || null,
  }
}

function deriveSignalTranscripts(events: DetectionEvent[]): SoundTranscript[] {
  const seen = new Set<string>()
  return events
    .map(transcriptWindowFromEvent)
    .filter((entry): entry is SoundTranscript => Boolean(entry))
    .sort(
      (left, right) =>
        left.start_sec - right.start_sec ||
        (right.confidence ?? 0) - (left.confidence ?? 0) ||
        left.label.localeCompare(right.label),
    )
    .filter((entry) => {
      const key = [
        entry.start_sec.toFixed(3),
        entry.end_sec.toFixed(3),
        entry.label,
        entry.detector_id ?? "",
        entry.frequency_range ?? "",
      ].join("|")
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 64)
}

function normalizeDeepSignalMatches(value: unknown): DeepSignalMatch[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): DeepSignalMatch | null => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const label =
        stringValue(record.label) ||
        stringValue(record.sound_source) ||
        stringValue(record.prototype_label) ||
        stringValue(record.class_name)
      if (!label) return null

      return {
        label,
        score: finiteNumber(record.score ?? record.confidence ?? record.similarity),
        source: stringValue(record.source ?? record.source_name ?? record.dataset),
        segment_start: finiteNumber(record.segment_start ?? record.start_sec ?? record.start_seconds),
        segment_end: finiteNumber(record.segment_end ?? record.end_sec ?? record.end_seconds),
        category: stringValue(record.category ?? record.event_family ?? record.type),
        prototype_id: stringValue(record.prototype_id ?? record.prototype),
        model: stringValue(record.model ?? record.embedding_model_version ?? record.engine),
        distance: finiteNumber(record.distance ?? record.embedding_distance ?? record.cosine_distance),
      }
    })
    .filter((item): item is DeepSignalMatch => Boolean(item))
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
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
    sound_transcripts: payload.sound_transcripts || (classification.sound_transcripts as unknown[] | undefined),
    events: payload.events || payload.detector_events || (classification.events as unknown[] | undefined),
    detector_events:
      payload.detector_events || payload.events || (classification.detector_events as unknown[] | undefined),
    visualisation: payload.visualisation || (classification.visualisation as Visualisation | undefined),
    diagnostics: payload.diagnostics || (classification.diagnostics as Record<string, unknown> | undefined),
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

function drawSineCanvas(
  canvas: HTMLCanvasElement,
  vis: Visualisation | null,
  events: DetectionEvent[],
  transcripts: SoundTranscript[],
  durationSec: number,
  currentTime: number,
  hoverTime: number | null,
  hoverFrequencyHz: number | null,
  hoverAmplitude: number | null,
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
  const viewStart = zoomStart != null && zoomEnd != null ? Math.max(0, Math.min(duration, Math.min(zoomStart, zoomEnd))) : 0
  const viewEnd = zoomStart != null && zoomEnd != null ? Math.max(viewStart + 0.001, Math.min(duration, Math.max(zoomStart, zoomEnd))) : duration
  const viewSpan = Math.max(0.001, viewEnd - viewStart)
  const timeToX = (time: number) => ((time - viewStart) / viewSpan) * width
  const xToTime = (x: number) => viewStart + (x / width) * viewSpan
  const { frequencyMinHz, frequencyMaxHz, frequencySpanHz } = resolveScopeFrequencyRange(vis, options)
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
    ctx.restore()
  }

  const power = vis?.spectrogram?.power_db
  if (options.visualMode !== "waveform" && power?.length && power[0]?.length) {
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
    }
  } else if (options.visualMode !== "waveform") {
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
  if (options.visualMode !== "spectrogram" && waveformPointCount > 0) {
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
      const envelopeGradient = ctx.createLinearGradient(0, plotTop, 0, laneTop)
      envelopeGradient.addColorStop(0, "rgba(103, 232, 249, 0.08)")
      envelopeGradient.addColorStop(0.5, "rgba(34, 211, 238, 0.24)")
      envelopeGradient.addColorStop(1, "rgba(14, 165, 233, 0.08)")

      ctx.fillStyle = envelopeGradient
      activeBuckets.forEach((bucket) => {
        const yMax = mid - bucket.max * ampScale
        const yMin = mid - bucket.min * ampScale
        const height = Math.max(1, Math.abs(yMin - yMax))
        ctx.globalAlpha = bucket.count > 1 ? 0.9 : 0.46
        ctx.fillRect(bucket.x + 0.5, Math.min(yMax, yMin), 1, height)
      })
      ctx.globalAlpha = 1

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
      ctx.strokeStyle = "rgba(224, 242, 254, 0.96)"
      ctx.lineWidth = 2.2
      ctx.shadowColor = "rgba(34, 211, 238, 0.72)"
      ctx.shadowBlur = 9
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.beginPath()
      activeBuckets.forEach((bucket, index) => {
        const peak = Math.abs(bucket.max) >= Math.abs(bucket.min) ? bucket.max : bucket.min
        const y = mid - peak * ampScale
        if (index === 0) ctx.moveTo(bucket.x, y)
        else ctx.lineTo(bucket.x, y)
      })
      ctx.strokeStyle = "rgba(251, 191, 36, 0.34)"
      ctx.lineWidth = 1.15
      ctx.stroke()

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

    ctx.strokeStyle = "rgba(226, 232, 240, 0.18)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, mid)
    ctx.lineTo(width, mid)
    ctx.stroke()
    ctx.fillStyle = "rgba(226, 232, 240, 0.72)"
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText("+1.0", 8, Math.max(plotTop + 12, mid - ampScale + 4))
    ctx.fillText("0.0", 8, mid - 5)
    ctx.fillText("-1.0", 8, Math.min(laneTop - 10, mid + ampScale - 4))
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

  if (options.showPeakMarkers) {
    events
      .filter((event) => event.frequency_hz != null && event.start_sec != null)
      .filter((event) => (event.start_sec ?? 0) >= viewStart && (event.start_sec ?? 0) <= viewEnd)
      .filter((event) => (event.frequency_hz ?? 0) >= frequencyMinHz && (event.frequency_hz ?? 0) <= frequencyMaxHz)
      .slice(0, 12)
      .forEach((event, index) => {
        const x = timeToX(event.peak_sec ?? event.start_sec ?? 0)
        const y = Number.isFinite(event.frequency_hz ?? NaN) ? frequencyToY(event.frequency_hz ?? frequencyMinHz) : plotTop + 12 + (index % 4) * 18
        ctx.strokeStyle = "rgba(251, 191, 36, 0.75)"
        ctx.lineWidth = 1
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(x, plotTop)
        ctx.lineTo(x, laneTop - 4)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = "rgba(251, 191, 36, 0.95)"
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 5, y + 8)
        ctx.lineTo(x + 5, y + 8)
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
    ctx.strokeStyle = "rgba(251, 191, 36, 0.65)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, plotTop)
    ctx.lineTo(x, laneTop - 6)
    ctx.stroke()
  })

  if (selectionStart != null && selectionEnd != null) {
    const start = Math.max(viewStart, Math.min(viewEnd, Math.min(selectionStart, selectionEnd)))
    const end = Math.max(viewStart, Math.min(viewEnd, Math.max(selectionStart, selectionEnd)))
    const x = timeToX(start)
    const w = Math.max(2, timeToX(end) - x)
    ctx.fillStyle = "rgba(244, 114, 182, 0.24)"
    ctx.fillRect(x, plotTop, w, laneTop - plotTop)
    ctx.fillStyle = "rgba(244, 114, 182, 0.12)"
    ctx.fillRect(x, laneTop, w, laneHeight)
    ctx.strokeStyle = "rgba(251, 113, 133, 0.95)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, plotTop)
    ctx.lineTo(x, navigatorTop - 2)
    ctx.moveTo(x + w, plotTop)
    ctx.lineTo(x + w, navigatorTop - 2)
    ctx.stroke()
    ctx.fillStyle = "rgba(255, 228, 230, 0.95)"
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = "left"
    ctx.fillText(`${formatDuration(start)}-${formatDuration(end)}`, x + 6, plotTop + 18)
  } else if (selectionStart != null) {
    const x = timeToX(selectionStart)
    ctx.strokeStyle = "rgba(251, 113, 133, 0.95)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, plotTop)
    ctx.lineTo(x, navigatorTop - 2)
    ctx.stroke()
  }

  markers
    .filter((marker) => marker.time_sec >= viewStart && marker.time_sec <= viewEnd)
    .forEach((marker) => {
      const x = timeToX(marker.time_sec)
      ctx.strokeStyle = marker.saved ? "rgba(52, 211, 153, 0.95)" : "rgba(251, 191, 36, 0.95)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, navigatorTop - 2)
      ctx.stroke()
      ctx.fillStyle = marker.saved ? "rgba(52, 211, 153, 0.92)" : "rgba(251, 191, 36, 0.92)"
      ctx.beginPath()
      ctx.moveTo(x, plotTop + 2)
      ctx.lineTo(x + 8, plotTop + 12)
      ctx.lineTo(x, plotTop + 22)
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

  const playheadX = Math.max(0, Math.min(width, timeToX(currentTime)))
  ctx.strokeStyle = "#f8fafc"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(playheadX, 0)
  ctx.lineTo(playheadX, height)
  ctx.stroke()
  ctx.fillStyle = "#f8fafc"
  ctx.beginPath()
  ctx.arc(playheadX, 12, 4, 0, Math.PI * 2)
  ctx.fill()

  if (hoverTime != null) {
    const hoverX = Math.max(0, Math.min(width, timeToX(hoverTime)))
    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(hoverX, 0)
    ctx.lineTo(hoverX, height)
    ctx.stroke()
    ctx.setLineDash([])

    if (hoverFrequencyHz != null) {
      const hoverY = frequencyToY(hoverFrequencyHz)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)"
      ctx.lineWidth = 1
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.moveTo(0, hoverY)
      ctx.lineTo(width, hoverY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "rgba(15, 23, 42, 0.86)"
      ctx.fillRect(Math.max(4, Math.min(width - 142, hoverX + 8)), Math.max(plotTop + 4, hoverY - 18), 136, 23)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.42)"
      ctx.strokeRect(Math.max(4, Math.min(width - 142, hoverX + 8)), Math.max(plotTop + 4, hoverY - 18), 136, 23)
      ctx.fillStyle = "rgba(254, 243, 199, 0.96)"
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "left"
      const amplitudeLabel = hoverAmplitude != null ? ` / ${hoverAmplitude >= 0 ? "+" : ""}${hoverAmplitude.toFixed(3)}` : ""
      ctx.fillText(`${formatDuration(hoverTime)} / ${formatHz(hoverFrequencyHz)}${amplitudeLabel}`, Math.max(10, Math.min(width - 156, hoverX + 14)), Math.max(plotTop + 20, hoverY - 3))
    }
  }

  ctx.fillStyle = "rgba(226, 232, 240, 0.82)"
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.textAlign = "left"
  ctx.fillText(formatDuration(viewStart), 8, height - 6)
  ctx.textAlign = "right"
  ctx.fillText(formatDuration(viewEnd), width - 8, height - 6)

  ctx.save()
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
  ctx.fillStyle = "rgba(103, 232, 249, 0.82)"
  ctx.strokeStyle = "rgba(103, 232, 249, 0.22)"
  ctx.lineWidth = 1
  ctx.textAlign = "right"
  for (let tick = 0; tick <= 5; tick += 1) {
    const frequency = frequencyMinHz + (frequencySpanHz * tick) / 5
    const y = frequencyToY(frequency)
    ctx.beginPath()
    ctx.moveTo(width - 42, y)
    ctx.lineTo(width, y)
    ctx.stroke()
    ctx.fillText(formatHz(frequency), width - 8, Math.max(plotTop + 10, Math.min(laneTop - 8, y - 3)))
  }

  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(226, 232, 240, 0.68)"
  ctx.strokeStyle = "rgba(226, 232, 240, 0.16)"
  for (let tick = 1; tick < 10; tick += 1) {
    const time = viewStart + (viewSpan * tick) / 10
    const x = timeToX(time)
    ctx.beginPath()
    ctx.moveTo(x, laneTop - 16)
    ctx.lineTo(x, laneTop - 4)
    ctx.stroke()
    if (tick % 2 === 0) {
      ctx.fillText(formatDuration(time), x, laneTop - 20)
    }
  }
  ctx.restore()
}

type SineAcousticPlayerProps = {
  embedded?: boolean
}

export function SineAcousticPlayer({ embedded = false }: SineAcousticPlayerProps) {
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("loading")
  const [query, setQuery] = useState(SHORT_CLIP_QUERY)
  const [sourceFilter, setSourceFilter] = useState("all")
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>("short")
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_COUNT)
  const [catalogRetryCount, setCatalogRetryCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [storageLabel, setStorageLabel] = useState("checking storage")
  const [detectorList, setDetectorList] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [events, setEvents] = useState<DetectionEvent[]>([])
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<SoundTranscript[]>([])
  const [vis, setVis] = useState<Visualisation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playbackStatus, setPlaybackStatus] = useState("No file selected")
  const [analyzing, setAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverFrequencyHz, setHoverFrequencyHz] = useState<number | null>(null)
  const [hoverAmplitude, setHoverAmplitude] = useState<number | null>(null)
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
  const [waveformGain, setWaveformGain] = useState("1")
  const [waveformHeight, setWaveformHeight] = useState("1")
  const [spectrogramContrast, setSpectrogramContrast] = useState("1.2")
  const [spectrogramOpacity, setSpectrogramOpacity] = useState("0.82")
  const [frequencyMinHz, setFrequencyMinHz] = useState("0")
  const [frequencyMaxHz, setFrequencyMaxHz] = useState("8000")
  const [timeMagnification, setTimeMagnification] = useState("1")
  const [scopeCanvasHeight, setScopeCanvasHeight] = useState("320")
  const [laneRows, setLaneRows] = useState("4")
  const [volumeLevel, setVolumeLevel] = useState("1")
  const [showAnalyzerGrid, setShowAnalyzerGrid] = useState(true)
  const [showPeakMarkers, setShowPeakMarkers] = useState(true)
  const [showEventLanes, setShowEventLanes] = useState(true)
  const [showBandGuides, setShowBandGuides] = useState(true)
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
  const [eventQuery, setEventQuery] = useState("")
  const [eventFamilyFilter, setEventFamilyFilter] = useState<EventFamilyFilter>("all")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const reverseContextRef = useRef<AudioContext | null>(null)
  const reverseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const reverseFrameRef = useRef(0)
  const reverseStopRequestedRef = useRef(false)
  const transportPressRef = useRef(0)
  const transportButtonCleanupRef = useRef<(() => void) | null>(null)
  const requestRef = useRef(0)
  const initializedRef = useRef(false)

  const selected = blobs.find((blob) => blob.id === selectedId) ?? null
  const selectedNeedsShortPath = Boolean(selected?.size_bytes && selected.size_bytes > IMMEDIATE_ANALYSIS_MAX_BYTES)
  const selectedStreamSource =
    selected && selectedId
      ? selected.stream_url || `/api/mindex/sine/library/blobs/${encodeURIComponent(selectedId)}/stream`
      : ""
  const latestHumanIdentification = useMemo(
    () => newestRecord(savedHumanIdentifications),
    [savedHumanIdentifications],
  )
  const latestWaveAnnotation = useMemo(
    () => newestRecord(savedWaveAnnotations),
    [savedWaveAnnotations],
  )

  const activeDuration = duration || vis?.duration_sec || selected?.duration_sec || 0
  const selectedRegion = useMemo(() => {
    if (selectionStart == null || selectionEnd == null) return null
    const start = Math.max(0, Math.min(activeDuration || 0, Math.min(selectionStart, selectionEnd)))
    const end = Math.max(start, Math.min(activeDuration || 0, Math.max(selectionStart, selectionEnd)))
    return end > start ? { start, end } : null
  }, [activeDuration, selectionEnd, selectionStart])
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
      if (normalized && !blobSearchText(blob).includes(normalized)) return false
      return true
    })
  }, [blobs, environmentFilter, query, sourceFilter])

  const visibleBlobs = filteredBlobs.slice(0, visibleLimit)
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
  const summary = analysis?.identification_summary ?? null
  const modelTopLabel = summary?.top_label || summary?.label || null
  const detectorTranscripts = useMemo(() => deriveSignalTranscripts(events), [events])
  const displayTranscripts = transcripts.length ? transcripts : detectorTranscripts
  const transcriptMode = transcripts.length ? "backend" : detectorTranscripts.length ? "detector" : "pending"
  const activeTranscript = displayTranscripts.find((entry) => currentTime >= entry.start_sec && currentTime <= entry.end_sec)
  const deepSignalMatches = useMemo(() => normalizeDeepSignalMatches(analysis?.deep_signal_matches), [analysis?.deep_signal_matches])
  const diagnosticRows = useMemo(() => normalizeDiagnostics(analysis?.diagnostics), [analysis?.diagnostics])
  const scopeOptions = useMemo<ScopeOptions>(() => ({
    visualMode,
    showGrid: showAnalyzerGrid,
    showPeakMarkers,
    showEventLanes,
    showBandGuides,
    palette: spectrogramPalette,
    waveformGain: clampNumber(numericValue(waveformGain, 1), 0.25, 8),
    waveformHeight: clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6),
    spectrogramContrast: clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4),
    spectrogramOpacity: clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1),
    frequencyMinHz: Math.max(0, numericValue(frequencyMinHz, 0)),
    frequencyMaxHz: Math.max(1, numericValue(frequencyMaxHz, 8000)),
    laneRows: clampNumber(numericValue(laneRows, 4), 2, 8),
  }), [
    frequencyMaxHz,
    frequencyMinHz,
    laneRows,
    showAnalyzerGrid,
    showBandGuides,
    showEventLanes,
    showPeakMarkers,
    spectrogramContrast,
    spectrogramOpacity,
    spectrogramPalette,
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
    }
  }, [events, scopeOptions, summary?.dominant_frequency_hz, vis, visibleEnd, visibleStart])
  const scopeMeasurements = useMemo(
    () => computeScopeMeasurements(vis, scopeOptions, visibleStart, visibleEnd, activeDuration),
    [activeDuration, scopeOptions, vis, visibleEnd, visibleStart],
  )
  const strongestScopeBand = useMemo(
    () => [...scopeMeasurements.bands].sort((left, right) => right.share - left.share)[0] ?? null,
    [scopeMeasurements.bands],
  )
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
        label: "Pattern matches",
        value: `${countByDetector("deep_signal_features")} matches`,
      },
    ]
  }, [events])
  const analysisRunId = useMemo(() => {
    if (!analysis) return null
    const candidate = analysis.analysis_run_id || analysis.run_id || analysis.id
    return typeof candidate === "string" && candidate.trim() ? candidate : null
  }, [analysis])
  const detectorStatusEntries = useMemo(() => {
    const statuses = summary?.detector_status ?? {}
    const statusEntries = Object.entries(statuses).map(([detector, state]) => ({
      detector,
      label: eventGroupLabel(canonicalEventFamily(detector, detector) || detector),
      state: String(state || "reported"),
    }))
    const existing = new Set(statusEntries.map((entry) => entry.detector))
    const listEntries = detectorList
      .filter((detector) => !existing.has(detector))
      .map((detector) => ({
        detector,
        label: detectorLabel(detector),
        state: analysis ? "ready" : "registered",
    }))
    return [...statusEntries, ...listEntries].slice(0, 14)
  }, [analysis, detectorList, summary?.detector_status])
  const detectorStackRows = useMemo(() => {
    const statuses = summary?.detector_status ?? {}
    const detectors = new Set<string>([
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
          label: detectorLabel(detector),
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
  }, [analysis, detectorList, events, summary?.detector_status])
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
    const modelVersion =
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
    return [
      {
        icon: <Cpu className="h-4 w-4" />,
        label: "Classifier",
        value: modelVersion || "model pending",
        detail: analysis ? "analysis loaded" : "waiting for run",
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
    detectorCounts.length,
    detectorList.length,
    detectorStatusEntries.length,
    events.length,
    scopeStats.dynamicRange,
    selected?.channels,
    selected?.sample_rate_hz,
    summary?.engine,
    summary?.model,
    vis?.sample_rate_hz,
    vis?.spectrogram?.power_db,
    vis?.waveform,
  ])

  const applyAnalysis = useCallback((payload: AnalysisPayload | null) => {
    if (!payload) {
      setAnalysis(null)
      setEvents([])
      setTranscripts([])
      setSelectedEventKey(null)
      return
    }
    const normalized = normalizeAnalysisPayload(payload)
    setAnalysis(normalized)
    setEvents(groupedEventsFromAnalysis(normalized))
    setTranscripts(normalizeTranscripts(normalized.sound_transcripts))
    setSelectedEventKey(null)
    if (normalized.visualisation) setVis(normalized.visualisation)
    if (finiteNumber(normalized.visualisation?.duration_sec) != null) {
      setDuration(normalized.visualisation?.duration_sec ?? 0)
    }
  }, [])

  const loadBlobs = useCallback(async (searchQuery = "") => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    const normalizedQuery = searchQuery.trim()
    setError(null)
    setMessage(null)
    setStatus("loading")
    setVisibleLimit(INITIAL_VISIBLE_COUNT)

    try {
      const params = new URLSearchParams({ category: "acoustic", limit: String(CATALOG_LIMIT) })
      if (normalizedQuery) params.set("q", normalizedQuery)
      const res = await fetch(`/api/natureos/mindex/library?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      if (requestId !== requestRef.current) return
      if (!res.ok) {
        setError(`Acoustic library unavailable (${res.status})`)
        setStatus("error")
        return
      }

      let data = (await res.json()) as LibraryCatalogResponse
      if (requestId !== requestRef.current) return
      let rows = uniqueBlobs(Array.isArray(data.blobs) ? data.blobs : Array.isArray(data.items) ? data.items : [])

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
          const fallbackParams = new URLSearchParams({ category: "acoustic", limit: String(CATALOG_LIMIT) })
          if (fallbackQuery) fallbackParams.set("q", fallbackQuery)
          const fallbackRes = await fetch(`/api/natureos/mindex/library?${fallbackParams.toString()}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(45_000),
          })
          if (requestId !== requestRef.current) return
          if (!fallbackRes.ok) continue
          const fallbackData = (await fallbackRes.json()) as LibraryCatalogResponse
          const fallbackRows = uniqueBlobs(
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
      setDetectorList(data.sine?.default_detectors ?? [])
      setStorageLabel(
        data.storage?.remote_nas
          ? `NAS ${data.storage.free_gb?.toFixed(1) ?? "?"} GB free`
          : data.storage?.available
            ? "storage mounted"
            : "storage status pending",
      )
      setMessage(data.message ?? null)
      setStatus(rows.length ? "ready" : data.root_status === "mounted" ? "waiting" : "empty")

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
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBlobs(query)
    }, initializedRef.current && query.trim() ? 350 : 0)

    return () => window.clearTimeout(timer)
  }, [loadBlobs, query])

  useEffect(() => {
    if (blobs.length || status !== "waiting" || totalFiles <= 0 || catalogRetryCount >= 3) return
    const timer = window.setTimeout(() => {
      setCatalogRetryCount((count) => count + 1)
      void loadBlobs(query.trim() || SHORT_CLIP_QUERY)
    }, 1600 + catalogRetryCount * 1200)

    return () => window.clearTimeout(timer)
  }, [blobs.length, catalogRetryCount, loadBlobs, query, status, totalFiles])

  const loadVisualisation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mindex/sine/blobs/${encodeURIComponent(id)}/visualisation`, {
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      })
      if (!res.ok) {
        setVis(null)
        return
      }
      const data = (await res.json()) as Visualisation
      setVis(data)
      if (finiteNumber(data.duration_sec) != null) setDuration(data.duration_sec ?? 0)
    } catch {
      setVis(null)
    }
  }, [])

  const loadAnalysis = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mindex/sine/blobs/${encodeURIComponent(id)}/analysis`, {
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
      if (mode === "overlay" || mode === "spectrogram" || mode === "waveform") {
        setVisualMode(mode)
      }
      const timeMag = finiteNumber(scope.time_magnification)
      if (timeMag != null) setTimeMagnification(String(timeMag))
      const fMin = finiteNumber(scope.frequency_min_hz)
      if (fMin != null) setFrequencyMinHz(String(fMin))
      const fMax = finiteNumber(scope.frequency_max_hz)
      if (fMax != null) setFrequencyMaxHz(String(fMax))
      const wGain = finiteNumber(scope.waveform_gain)
      if (wGain != null) setWaveformGain(String(wGain))
      const wHeight = finiteNumber(scope.waveform_height)
      if (wHeight != null) setWaveformHeight(String(wHeight))
      const palette = stringValue(scope.spectrogram_palette)
      const paletteAliases: Record<string, SpectrogramPalette> = {
        cyan: "marine",
        marine: "marine",
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

  useEffect(() => {
    if (!selectedId) return
    setError(null)
    setCurrentTime(0)
    setDuration(selected?.duration_sec ?? 0)
    setIsPlaying(false)
    setHoverTime(null)
    setHoverFrequencyHz(null)
    setHoverAmplitude(null)
    setSelectionStart(null)
    setSelectionEnd(null)
    setZoomStart(null)
    setZoomEnd(null)
    setLoopSelection(false)
    setReversePlayback(false)
    setPlaybackRate("1")
    setMarkers([])
    setSavedWaveAnnotations([])
    setSavedHumanIdentifications([])
    setMarkerLabel("")
    setWaveAnnotationMessage(null)
    setVis(null)
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
      void loadVisualisation(selectedId)
      void loadAnalysis(selectedId)
    }
    void loadWaveAnnotations(selectedId)
    void loadHumanIdentifications(selectedId)

    const audio = audioRef.current
    if (audio) {
      audio.pause()
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
    selected?.duration_sec,
    selected?.human_identifications,
    selected?.latest_human_identification,
    selected?.size_bytes,
    selected?.wave_annotations,
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
      if (Number.isFinite(nextDuration)) setDuration(nextDuration)
      setPlaybackStatus(`Ready to play (${formatDuration(nextDuration)})`)
    }
    const setLoading = () => setPlaybackStatus("Loading audio...")
    const setWaiting = () => setPlaybackStatus("Buffering audio...")
    const setPlaying = () => {
      setIsPlaying(true)
      setPlaybackStatus("Playing")
    }
    const setPaused = () => {
      setIsPlaying(false)
      setPlaybackStatus(audio.ended ? "Finished" : audio.currentTime > 0 ? "Paused" : "Ready to play")
    }
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
  }, [duration, loopSelection, playbackRate, reversePlayback, selectedRegion, selectedStreamSource, volumeLevel])

  useEffect(() => {
    if (canvasRef.current) {
      drawSineCanvas(
        canvasRef.current,
        vis,
        events,
        displayTranscripts,
        activeDuration,
        currentTime,
        hoverTime,
        hoverFrequencyHz,
        hoverAmplitude,
        selectionStart,
        selectionEnd,
        markers,
        visibleStart,
        visibleEnd,
        scopeOptions,
      )
    }
  }, [activeDuration, currentTime, displayTranscripts, events, hoverAmplitude, hoverFrequencyHz, hoverTime, markers, scopeOptions, selectionEnd, selectionStart, vis, visibleEnd, visibleStart])

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
  }, [])

  const findShortClips = useCallback(() => {
    setCatalogRetryCount(0)
    setQuery(SHORT_CLIP_QUERY)
    setSourceFilter("all")
    setEnvironmentFilter("short")
  }, [])

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
      } else {
        audio.pause()
      }
    } catch (event) {
      setPlaybackStatus(event instanceof Error ? event.message : "Playback could not start")
    }
  }, [isPlaying, playReverseSelection, playbackRate, reversePlayback, selectedRegion, selectedStreamSource, stopReversePlayback])

  const pressTransport = useCallback(() => {
    const now = performance.now()
    if (now - transportPressRef.current < 220) return
    transportPressRef.current = now
    void togglePlayback()
  }, [togglePlayback])

  const bindTransportButton = useCallback((button: HTMLButtonElement | null) => {
    transportButtonCleanupRef.current?.()
    transportButtonCleanupRef.current = null
    if (!button) return
    const handleTransportDomClick = (event: MouseEvent) => {
      event.preventDefault()
      const audio = audioRef.current
      if (!audio || !selectedStreamSource) {
        setPlaybackStatus("Select an audio file before playback.")
        return
      }
      if (reversePlayback) {
        pressTransport()
        return
      }
      stopReversePlayback()
      if (!audio.paused) {
        audio.pause()
        return
      }
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
      audio.volume = clampNumber(numericValue(volumeLevel, 1), 0, 1)
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch((playbackError) => {
          setIsPlaying(false)
          setPlaybackStatus(playbackError instanceof Error ? playbackError.message : "Playback could not start")
        })
      }
    }
    button.addEventListener("click", handleTransportDomClick)
    button.dataset.sineTransportReady = "true"
    transportButtonCleanupRef.current = () => {
      button.removeEventListener("click", handleTransportDomClick)
      delete button.dataset.sineTransportReady
    }
  }, [playbackRate, pressTransport, reversePlayback, selectedRegion, selectedStreamSource, stopReversePlayback, volumeLevel])

  useEffect(() => {
    return () => transportButtonCleanupRef.current?.()
  }, [])

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
    const nextHoverTime = visibleStart + xRatio * span
    const canvasHeight = event.currentTarget.height || 640
    const plotTop = 20
    const laneTop = Math.floor(canvasHeight * (scopeOptions.showEventLanes ? 0.76 : 0.84))
    const plotHeight = Math.max(1, laneTop - plotTop - 12)
    const pointerY = yRatio * canvasHeight
    let nextFrequency: number | null = null

    if (pointerY >= plotTop && pointerY <= laneTop - 12) {
      const { frequencyMinHz, frequencySpanHz } = resolveScopeFrequencyRange(vis, scopeOptions)
      const frequencyNorm = 1 - clampNumber((pointerY - plotTop) / plotHeight, 0, 1)
      nextFrequency = frequencyMinHz + frequencyNorm * frequencySpanHz
    }

    setHoverTime(nextHoverTime)
    setHoverFrequencyHz(nextFrequency)
    setHoverAmplitude(waveformAmplitudeAtTime(vis, nextHoverTime, activeDuration))
  }, [activeDuration, scopeOptions, vis, visibleEnd, visibleStart])

  const handleCanvasClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!activeDuration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const span = Math.max(0.001, visibleEnd - visibleStart)
    const time = visibleStart + ((event.clientX - rect.left) / rect.width) * span
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
  }, [activeDuration, scrubTo, selectionEnd, selectionStart, visibleEnd, visibleStart])

  const handleCanvasWheel = useCallback((event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (!activeDuration) return
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const xRatio = clampNumber((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1)
    const yRatio = clampNumber((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
    const currentSpan = Math.max(0.001, visibleEnd - visibleStart)

    if (event.altKey) {
      const { frequencyMinHz: currentMin, frequencyMaxHz: currentMax, frequencySpanHz: currentFrequencySpan } = resolveScopeFrequencyRange(vis, scopeOptions)
      const finiteFrequencies = vis?.spectrogram?.frequencies?.filter((value) => Number.isFinite(value)) ?? []
      const availableMax = finiteFrequencies.length ? Math.max(...finiteFrequencies) : Math.max(24000, currentMax)
      const center = currentMin + (1 - yRatio) * currentFrequencySpan
      const nextSpan = clampNumber(currentFrequencySpan * (event.deltaY > 0 ? 1.18 : 0.82), 50, Math.max(100, availableMax))
      const nextMin = clampNumber(center - nextSpan * (1 - yRatio), 0, Math.max(0, availableMax - nextSpan))
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

    const targetTime = visibleStart + xRatio * currentSpan
    const nextSpan = clampNumber(currentSpan * (event.deltaY > 0 ? 1.22 : 0.78), 0.05, Math.max(0.05, activeDuration))
    if (nextSpan >= activeDuration * 0.985) {
      setZoomStart(null)
      setZoomEnd(null)
      setTimeMagnification("1")
      return
    }
    const nextStart = clampNumber(targetTime - nextSpan * xRatio, 0, Math.max(0, activeDuration - nextSpan))
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
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const safeName = (selected?.filename || selected?.id || "sine-scope").replace(/[^a-z0-9._-]+/gi, "_")
      link.href = url
      link.download = `${safeName}-scope.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [selected?.filename, selected?.id])

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
    if (selectedNeedsShortPath) {
      setError("Select a short recording for immediate full analysis. Long recordings can still be played and inspected.")
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch(`/api/mindex/sine/blobs/${encodeURIComponent(selectedId)}/analyze`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.slice(0, 220))
      }
      const data = (await res.json()) as AnalysisPayload
      applyAnalysis(data)
    } catch (event) {
      setError(event instanceof Error ? event.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveHumanIdentification() {
    if (!selectedId || !selected) return
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
        blob_id: selectedId,
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
        event_context: reviewEventSnapshot
          ? {
              current_time_sec: currentTime,
              detector_event: reviewEventSnapshot,
            }
          : {
              current_time_sec: currentTime,
            },
        detector_event_key: reviewEventSnapshot?.detector_event_key ?? null,
        detector_event: reviewEventSnapshot,
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
    if (!selectedRegion && markers.length === 0) {
      setWaveAnnotationMessage({ kind: "error", text: "Select a region or add a marker before saving." })
      return
    }

    setSavingWaveAnnotation(true)
    setWaveAnnotationMessage(null)
    try {
      const payload = {
        blob_id: selectedId,
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
        scope: {
          visual_mode: visualMode,
          time_magnification: timeMagnificationFactor,
          frequency_min_hz: Math.max(0, numericValue(frequencyMinHz, 0)),
          frequency_max_hz: Math.max(1, numericValue(frequencyMaxHz, 8000)),
          waveform_gain: clampNumber(numericValue(waveformGain, 1), 0.25, 8),
          waveform_height: clampNumber(numericValue(waveformHeight, 1), 0.2, 1.6),
          spectrogram_palette: spectrogramPalette,
          spectrogram_contrast: clampNumber(numericValue(spectrogramContrast, 1), 0.4, 4),
          spectrogram_opacity: clampNumber(numericValue(spectrogramOpacity, 0.82), 0.18, 1),
          scope_height_px: Math.round(clampNumber(numericValue(scopeCanvasHeight, 320), 240, 680)),
          lane_rows: Math.round(clampNumber(numericValue(laneRows, 4), 2, 8)),
          grid_enabled: showAnalyzerGrid,
          band_guides_enabled: showBandGuides,
          peaks_enabled: showPeakMarkers,
          lanes_enabled: showEventLanes,
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

  const canvasHeightPx = Math.round(clampNumber(numericValue(scopeCanvasHeight, 320), 240, 680))
  const canvasBackingHeight = Math.max(560, canvasHeightPx * 2)
  const scopeFrequencyMin = Math.max(0, numericValue(frequencyMinHz, 0))
  const scopeFrequencyMax = Math.max(scopeFrequencyMin + 1, numericValue(frequencyMaxHz, 8000))

  return (
    <div className={embedded ? "min-h-[820px] bg-transparent text-slate-100" : "min-h-[calc(100vh-56px)] bg-[#05070c] text-slate-100"}>
      {!embedded ? (
        <div className="pointer-events-none fixed inset-0 opacity-60 [background-image:linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] [background-size:64px_64px]" />
      ) : null}
      <div className={embedded ? "relative flex min-h-[820px] flex-col gap-3 p-3" : "relative flex min-h-[calc(100vh-56px)] flex-col gap-4 p-4 md:p-6"}>
        <header className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                <Radar className="h-4 w-4" />
                SINE Spectral Intelligence
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-4xl">
                Acoustic Classifier Workbench
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                Browse real MINDEX acoustic files, stream the recording, inspect waveform and spectrogram layers, run SINE analysis, and review detector lanes from the saved classifier response.
              </p>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-[420px]">
              <StatusPill icon={<HardDrive className="h-4 w-4" />} label="Storage" value={storageLabel} />
              <StatusPill icon={<Database className="h-4 w-4" />} label="Library" value={`${totalFiles.toLocaleString()} files`} />
              <StatusPill icon={<Gauge className="h-4 w-4" />} label="Detectors" value={`${detectorList.length || 0} active`} />
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-sm leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex min-h-0 max-h-[560px] flex-col overflow-hidden rounded-lg border border-cyan-400/20 bg-black/45 shadow-[0_0_30px_rgba(15,23,42,0.8)] backdrop-blur-xl lg:max-h-none">
            <div className="border-b border-cyan-400/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Acoustic files</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {filteredBlobs.length.toLocaleString()} shown from {blobs.length.toLocaleString()} loaded
                  </p>
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                  {status}
                </span>
              </div>

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

              <div className="mt-3 grid grid-cols-2 gap-2">
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

              {message ? <p className="mt-3 text-xs leading-5 text-slate-500">{message}</p> : null}
            </div>

            <div className="min-h-0 max-h-[300px] flex-1 overflow-y-auto lg:max-h-none">
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
                    ? "Loading acoustic files from MINDEX Library..."
                    : status === "waiting"
                      ? "Storage is connected, but no acoustic file rows were returned."
                      : "No acoustic files match this filter."}
                </div>
              ) : null}
            </div>

            {filteredBlobs.length > visibleLimit ? (
              <div className="border-t border-cyan-400/15 p-3">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((value) => value + INITIAL_VISIBLE_COUNT)}
                  className="min-h-[40px] w-full rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/60"
                >
                  Load {Math.min(INITIAL_VISIBLE_COUNT, filteredBlobs.length - visibleLimit)} more
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
                      </div>
                    </div>

                    <audio
                      ref={audioRef}
                      data-sine-audio="true"
                      controls
                      preload="metadata"
                      src={selectedStreamSource || undefined}
                      className="mt-4 h-10 w-full rounded-lg border border-white/10 bg-black/55 text-cyan-100"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <button
                        type="button"
                        ref={bindTransportButton}
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
                          <span>{formatDuration(currentTime)}</span>
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
                        disabled={analyzing || selectedNeedsShortPath}
                        className="min-h-[44px] rounded-lg border border-emerald-300/35 bg-emerald-300/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {analyzing ? "Analyzing..." : "Run SINE analysis"}
                      </button>
                    </div>

                    {selectedNeedsShortPath ? (
                      <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                        This long recording can be streamed and inspected. Full immediate analysis is limited to short clips in this player.
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Identification</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {summary?.top_label || summary?.label ? cleanLabel(summary.top_label || summary.label) : "No identification yet"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Metric label="Confidence" value={formatPercent(summary?.confidence)} />
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
                    active={showAnalyzerGrid}
                    icon={<Grid3X3 className="h-3.5 w-3.5" />}
                    label="Grid"
                    onClick={() => setShowAnalyzerGrid((value) => !value)}
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
                  <InfoChip>power {scopeStats.dynamicRange}</InfoChip>
                  <InfoChip>{scopeStats.frequencyPeakCount} FFT peaks</InfoChip>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(21,27,38,0.92),rgba(4,8,16,0.98))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-1px_0_rgba(0,0,0,0.75),0_18px_35px_rgba(0,0,0,0.25)]">
                  <div
                    aria-label="Oscilloscope control bank"
                    className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 sm:grid-rows-2"
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
                  </div>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={2400}
                height={canvasBackingHeight}
                style={{ height: `${canvasHeightPx}px` }}
                className="w-full cursor-crosshair rounded-md border border-white/10 bg-black"
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => {
                  setHoverTime(null)
                  setHoverFrequencyHz(null)
                  setHoverAmplitude(null)
                }}
                onClick={handleCanvasClick}
                onContextMenu={handleCanvasContextMenu}
                onAuxClick={handleCanvasAuxClick}
                onWheel={handleCanvasWheel}
              />
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
                      {markers.map((marker) => (
                        <button
                          key={marker.id}
                          type="button"
                          onClick={() => scrubTo(marker.time_sec)}
                          className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-slate-300 transition hover:border-amber-300/50"
                        >
                          {marker.label} {formatDuration(marker.time_sec)}
                        </button>
                      ))}
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
                    disabled={savingWaveAnnotation || (!selectedRegion && markers.length === 0)}
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
                    <p className="mt-1 text-sm text-slate-400">Grouped SINE detections from the selected analysis run.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectorCounts.map(([detector, count]) => (
                      <InfoChip key={detector}>
                        {eventGroupLabel(detector)} {count}
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
                      No detector rows yet. Select a short clip and run SINE analysis.
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-500">
                      No detector rows match this event filter.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectorGroups.map(([detector, group]) => {
                        const collapsed = collapsedDetectors.has(detector)
                        const detectorNames = Array.from(new Set(group.map((event) => detectorLabel(event.detector_id)))).join(" / ")
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
                                    {eventGroupLabel(detector)}
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
                                          <div className="font-medium text-white">{cleanLabel(event.label)}</div>
                                          <div className="mt-1 text-[11px] text-slate-500">
                                            {[event.acoustic_domain, event.event_type || event.category].filter(Boolean).map(cleanLabel).join(" / ") || detectorLabel(event.detector_id)}
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
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    <Sparkles className="h-4 w-4" />
                    Sound transcript
                  </p>
                  <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1">
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-100">
                      {transcriptMode === "backend"
                        ? "MINDEX transcript"
                        : transcriptMode === "detector"
                          ? "Real detector windows"
                          : "Waiting"}
                    </span>
                    {displayTranscripts.length ? (
                      displayTranscripts.map((entry, index) => (
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
                            {entry.transcript_source === "detector" ? <span>detector-derived</span> : null}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-500">
                        No signal windows are available for this recording yet. Run SINE analysis to populate detector windows.
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
                        Live classifier, decoder, and visualisation state for this recording.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] text-cyan-100">
                      {analysis ? "analyzed" : "ready"}
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
                            <p className="truncate text-sm font-semibold text-white">{cleanLabel(inspectedDetectorEvent.label)}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {[eventGroupLabel(eventGroupKey(inspectedDetectorEvent)), detectorLabel(inspectedDetectorEvent.detector_id)]
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
                        <DetailRow label="Family" value={eventGroupLabel(eventGroupKey(inspectedDetectorEvent))} />
                        <DetailRow label="Type" value={inspectedDetectorEvent.event_type ? cleanLabel(inspectedDetectorEvent.event_type) : inspectedDetectorEvent.category || "-"} />
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

                <section className="rounded-lg border border-cyan-400/20 bg-black/45 p-4 backdrop-blur-xl xl:shrink-0">
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
                    Prototype matches
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Embedding or pattern matches returned by SINE for this recording.
                  </p>
                  <div className="mt-3 min-h-0 space-y-2 overflow-y-auto pr-1">
                    {deepSignalMatches.length ? (
                      deepSignalMatches.slice(0, 12).map((match, index) => (
                        <button
                          key={`${match.prototype_id || match.label}-${match.segment_start ?? "x"}-${match.segment_end ?? "y"}-${index}`}
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
                                {[match.source, match.category, match.prototype_id].filter(Boolean).join(" / ") || "source pending"}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] text-cyan-100">
                              {formatPercent(match.score)}
                            </span>
                          </span>
                          <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            {match.segment_start != null && match.segment_end != null ? (
                              <span>{match.segment_start.toFixed(2)}-{match.segment_end.toFixed(2)}s</span>
                            ) : null}
                            {match.distance != null ? <span>distance {match.distance.toFixed(3)}</span> : null}
                            {match.model ? <span>{match.model}</span> : null}
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
                    Correct the sound when you know SINE is wrong. The model result is kept beside your tag for later training review.
                  </p>

                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Current SINE result</p>
                    <p className="mt-1 truncate text-sm font-medium text-white">
                      {modelTopLabel ? cleanLabel(modelTopLabel) : "No model result yet"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{formatPercent(summary?.confidence)}</p>
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
                      disabled={savingHumanId || !selectedId}
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

function StatusPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-medium text-white">{value}</p>
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
