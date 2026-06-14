"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  AudioLines,
  Beaker,
  Bluetooth,
  ChevronLeft,
  ChevronRight,
  Database,
  Disc3,
  Download,
  Fingerprint,
  FolderTree,
  Gauge,
  Hand,
  HardDrive,
  Hash,
  Mic,
  Radio,
  Radar,
  RefreshCw,
  ScanLine,
  Search,
  Thermometer,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Oscilloscope } from "@/components/fungi-compute/oscilloscope"
import { SpectrumAnalyzer } from "@/components/fungi-compute/spectrum-analyzer"
import { SineAcousticPlayer } from "@/components/sensing/sine-acoustic-player"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SignalBuffer } from "@/lib/fungi-compute"
import type { MindexFieldDeviceSummary } from "./mindex-dashboard-types"

type LibraryCategoryId = string

type LibraryCategorySummary = {
  id: LibraryCategoryId
  label: string
  description: string
  count: number
  bytes: number
}

type LibraryBlob = {
  id: string
  analysis_id?: string | null
  remote_id?: string | null
  file_id?: string | null
  blob_id?: string | null
  uuid?: string | null
  name: string
  title?: string
  filename?: string
  description?: string
  relative_path: string
  category: LibraryCategoryId
  sensor_type: string
  recording_group: string
  extension: string
  mime_type: string
  size_bytes: number
  modified_at: string
  checksum: string
  stream_url: string
  preview_samples: number[]
  preview_source: "numeric_file" | "file_bytes" | "metadata"
  sample_rate_hz: number
  preview_channels?: LibraryPreviewChannel[]
  actuator_channels?: LibraryPreviewChannel[]
  acoustic_environment?: "water" | "air" | "unknown" | string
  acoustic_events?: AcousticEvent[]
  pattern_matches?: AcousticPatternMatch[]
  sine_matches?: AcousticPatternMatch[]
  chemical_fingerprints?: ChemicalFingerprint[]
  spectral_features?: SpectralFeature[]
  source_id?: string
  duration_sec?: number | null
  channels?: number | null
  format?: string
  codec?: string
  playback_class?: string
  license?: string
  needs_transcode?: boolean
  unsupported_codec?: boolean
  analysis_engine?: string
  identification_status?: string
  identification_summary?: AudioIdentificationSummary
  deep_signal_matches?: AcousticPatternMatch[]
  frequency_detections?: AcousticPatternMatch[]
  activity_segments?: AcousticEvent[]
  bird_detections?: AcousticPatternMatch[]
  uav_detections?: AcousticPatternMatch[]
  nps_detections?: AcousticPatternMatch[]
  source_name?: string
  source_url?: string
  origin_dataset_id?: string
  label_primary?: string
  label_secondary?: string
  nlm_subsystem?: string
  nlm_priority?: number | null
  fold_id?: string | number | null
  training_split?: string
  locale?: string
  capture_time_utc?: string
}

type AudioIdentificationSummary = {
  top_label?: string
  label?: string
  class_name?: string
  category?: string
  confidence?: number
  engine?: string
  model?: string
  status?: string
}

type ChemicalFingerprint = {
  id?: string
  label?: string
  class_name?: string
  source?: string
  sensor_model?: string
  confidence?: number
}

type SpectralFeature = {
  id?: string
  label?: string
  kind?: string
  band?: string
  value?: number
  unit?: string
  confidence?: number
}

type AcousticEvent = {
  id?: string
  detector_id?: string
  label?: string
  kind?: string
  start_seconds?: number
  start_sec?: number
  end_seconds?: number
  end_sec?: number
  peak_seconds?: number
  peak_sec?: number
  frequency_hz?: number
  freq_hz?: number
  amplitude?: number
  confidence?: number
  score?: number
  method?: string
  model_version?: string
}

type AcousticPatternMatch = AcousticEvent & {
  species?: string
  source_type?: string
  environment?: "water" | "air" | "unknown" | string
  category?: string
  class_name?: string
  engine?: string
  model?: string
  transcript?: string
  speaker?: string
  emotion?: string
  language?: string
  anomaly_score?: number
  background_noise_db?: number
}

type LibraryPreviewChannel = {
  id?: string
  name?: string
  label?: string
  kind?: string
  unit?: string
  axis?: string
  actuator_type?: string
  samples?: number[]
  sample_rate_hz?: number
}

type LibraryCatalog = {
  root_status: "mounted" | "missing"
  root_label: string
  categories: LibraryCategorySummary[]
  blobs: LibraryBlob[]
  total_files: number
  total_bytes: number
  storage?: {
    available?: boolean
    remote_nas?: boolean
    mount_point?: string
    library_acoustic?: string
    policy?: string
    total_gb?: number | null
    used_gb?: number | null
    free_gb?: number | null
    error?: string
  }
  sine?: {
    status?: string
    product?: string
    url?: string
    acoustic_blobs?: number | null
    library_sources?: number | null
    detectors_registered?: number | null
    default_detectors?: string[]
  }
  message?: string
}

type CategoryUi = {
  id: LibraryCategoryId
  label: string
  description: string
  icon: LucideIcon
  color: "amber" | "cyan" | "emerald" | "lime" | "purple" | "rose"
  sensors: string[]
  formats: string[]
}

type CategoryView = CategoryUi & {
  summary: LibraryCategorySummary
}

type TemperatureUnit = "fahrenheit" | "celsius" | "kelvin"

const CATEGORY_UI: CategoryUi[] = [
  {
    id: "spectral",
    label: "Spectral",
    description: "LiDAR, radar, radiation, Geiger, multispectral, and hyperspectral captures.",
    icon: ScanLine,
    color: "cyan",
    sensors: ["LiDAR", "radar", "Geiger", "radiation", "hyperspectral", "multispectral"],
    formats: ["LAS", "LAZ", "NetCDF", "HDF5", "TIFF", "CSV", "JSON"],
  },
  {
    id: "acoustic",
    label: "Acoustic",
    description: "Hydrophone, transducer, microphone, contact, and ultrasonic recordings.",
    icon: AudioLines,
    color: "emerald",
    sensors: ["hydrophone", "transducer", "microphone", "contact", "ultrasonic"],
    formats: ["WAV", "FLAC", "MP3", "OGG", "M4A", "AAC"],
  },
  {
    id: "bioelectric",
    label: "Bioelectric",
    description: "Fungal compute, electrode, magnetic, radio, Wi-Fi, and Bluetooth signals.",
    icon: Zap,
    color: "purple",
    sensors: ["FCI", "electrodes", "magnetic", "radio", "Wi-Fi", "Bluetooth"],
    formats: ["CSV", "JSON", "HDF5", "BIN", "DAT", "TXT"],
  },
  {
    id: "chemical",
    label: "Chemical",
    description: "VOC, VSC, humidity, moisture, gas resistance, and smell fingerprint blobs.",
    icon: Beaker,
    color: "lime",
    sensors: ["VOC", "VSC", "BME688", "BME690", "humidity", "moisture"],
    formats: ["CSV", "JSON", "SDF", "MOL", "SMI", "TXT"],
  },
  {
    id: "thermal",
    label: "Thermal",
    description: "Infrared frames, temperature series, heat maps, and thermal profiles.",
    icon: Thermometer,
    color: "rose",
    sensors: ["infrared", "thermal camera", "thermistor", "temperature", "BME temperature"],
    formats: ["PNG", "JPEG", "TIFF", "MP4", "CSV", "JSON"],
  },
  {
    id: "tactile",
    label: "Tactile",
    description: "Pressure, strain, vibration, movement, contact, and force recordings.",
    icon: Hand,
    color: "amber",
    sensors: ["pressure", "strain", "accelerometer", "touch", "movement", "vibration"],
    formats: ["CSV", "JSON", "BIN", "DAT", "TXT"],
  },
]

const CATEGORY_BY_ID = new Map(CATEGORY_UI.map((category) => [category.id, category]))
const CATEGORY_COLORS: CategoryUi["color"][] = ["cyan", "emerald", "purple", "lime", "rose", "amber"]
const KNOWN_CATEGORY_IDS = new Set(CATEGORY_UI.map((category) => category.id))

function labelFromCategoryId(id: string) {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function colorFromCategoryId(id: string): CategoryUi["color"] {
  const hash = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0)
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length] ?? "amber"
}

function dynamicCategoryFromSummary(summary: LibraryCategorySummary): CategoryUi {
  return {
    id: summary.id,
    label: summary.label || labelFromCategoryId(summary.id),
    description: summary.description || "Files and recordings from MINDEX Library storage.",
    icon: Database,
    color: colorFromCategoryId(summary.id),
    sensors: [],
    formats: [],
  }
}

const EMPTY_CATALOG: LibraryCatalog = {
  root_status: "missing",
  root_label: "MINDEX Library storage",
  categories: CATEGORY_UI.map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    count: 0,
    bytes: 0,
  })),
  blobs: [],
  total_files: 0,
  total_bytes: 0,
  message: "MINDEX Library storage has not returned files yet.",
}

const MAX_AUDIO_PREVIEW_BYTES = 25 * 1024 * 1024
const AUDIO_PREVIEW_POINTS = 512
const FILE_BROWSER_PAGE_SIZE = 8

type DecodedAudioPreview = {
  blobId: string
  samples: number[]
  sampleRate: number
  durationSec: number
  frequencyDetections: AcousticPatternMatch[]
  activitySegments: AcousticEvent[]
}

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

function isAudioBlob(blob: LibraryBlob | null) {
  if (!blob) return false
  const extension = blob.extension.toLowerCase()
  const mimeType = blob.mime_type.toLowerCase()
  return mimeType.startsWith("audio/") || ["wav", "mp3", "flac", "ogg", "m4a", "aac"].some((ext) => extension.includes(ext))
}

function downsampleAudioChannel(channel: Float32Array, targetLength = AUDIO_PREVIEW_POINTS) {
  if (!channel.length) return []

  const bucketSize = Math.max(1, Math.floor(channel.length / targetLength))
  const samples: number[] = []
  for (let index = 0; index < channel.length && samples.length < targetLength; index += bucketSize) {
    const end = Math.min(channel.length, index + bucketSize)
    let total = 0
    for (let sampleIndex = index; sampleIndex < end; sampleIndex += 1) {
      total += channel[sampleIndex] ?? 0
    }
    samples.push(total / Math.max(1, end - index))
  }

  const peak = Math.max(...samples.map((sample) => Math.abs(sample)), 0)
  if (!peak) return samples
  return samples.map((sample) => sample / peak)
}

function rmsForFrame(channel: Float32Array, start: number, end: number) {
  let total = 0
  let count = 0
  for (let index = start; index < end; index += 1) {
    const sample = channel[index] ?? 0
    total += sample * sample
    count += 1
  }
  return count ? Math.sqrt(total / count) : 0
}

function estimateZeroCrossingFrequency(frame: Float32Array, sampleRate: number) {
  let crossings = 0
  let previous = frame[0] ?? 0
  for (let index = 1; index < frame.length; index += 1) {
    const current = frame[index] ?? 0
    if ((previous >= 0 && current < 0) || (previous < 0 && current >= 0)) crossings += 1
    previous = current
  }
  const duration = frame.length / Math.max(1, sampleRate)
  return duration > 0 ? crossings / (2 * duration) : 0
}

function estimateAutocorrelationFrequency(frame: Float32Array, sampleRate: number, minHz = 45, maxHz = 5000) {
  if (frame.length < 256) return 0
  const lagMin = Math.max(2, Math.floor(sampleRate / maxHz))
  const lagMax = Math.min(frame.length - 2, Math.ceil(sampleRate / minHz))
  let bestLag = 0
  let bestScore = 0
  let energy = 0
  for (let index = 0; index < frame.length; index += 1) {
    const sample = frame[index] ?? 0
    energy += sample * sample
  }
  if (!energy) return 0

  const lagStep = lagMax > 1200 ? 2 : 1
  for (let lag = lagMin; lag <= lagMax; lag += lagStep) {
    let score = 0
    for (let index = 0; index < frame.length - lag; index += 1) {
      score += (frame[index] ?? 0) * (frame[index + lag] ?? 0)
    }
    const normalized = score / energy
    if (normalized > bestScore) {
      bestScore = normalized
      bestLag = lag
    }
  }

  if (!bestLag || bestScore < 0.08) return 0
  return sampleRate / bestLag
}

function computeFrequencyDetections(channel: Float32Array, sampleRate: number, durationSec: number): AcousticPatternMatch[] {
  const frameSize = Math.min(Math.max(1024, Math.round(sampleRate * 0.055)), 4096)
  const hopSize = Math.max(frameSize, Math.floor(channel.length / 10))
  const detections: AcousticPatternMatch[] = []

  for (let start = 0; start + frameSize <= channel.length && detections.length < 10; start += hopSize) {
    const frame = channel.slice(start, start + frameSize)
    const autoFrequency = estimateAutocorrelationFrequency(frame, sampleRate)
    const zeroFrequency = estimateZeroCrossingFrequency(frame, sampleRate)
    const frequency = autoFrequency || zeroFrequency
    if (!Number.isFinite(frequency) || frequency < 25 || frequency > 22_000) continue
    const startSeconds = start / sampleRate
    const endSeconds = Math.min(durationSec, (start + frameSize) / sampleRate)
    const agreement = autoFrequency && zeroFrequency ? Math.max(0, 1 - Math.abs(autoFrequency - zeroFrequency) / Math.max(autoFrequency, zeroFrequency)) : 0.45
    detections.push({
      id: `freq-${start}`,
      label: "Dominant frequency",
      class_name: "Frequency peak",
      category: "frequency",
      source_type: "frequency",
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      peak_seconds: (startSeconds + endSeconds) / 2,
      frequency_hz: frequency,
      confidence: Math.max(0.25, Math.min(0.96, agreement)),
      engine: autoFrequency ? "autocorrelation + zero crossing" : "zero crossing",
    })
  }

  return detections
}

function computeActivitySegments(channel: Float32Array, sampleRate: number): AcousticEvent[] {
  const frameSize = Math.max(512, Math.round(sampleRate * 0.1))
  const frames: Array<{ index: number; start: number; end: number; rms: number }> = []
  for (let start = 0; start < channel.length; start += frameSize) {
    const end = Math.min(channel.length, start + frameSize)
    frames.push({ index: frames.length, start, end, rms: rmsForFrame(channel, start, end) })
  }
  if (!frames.length) return []

  const sortedRms = frames.map((frame) => frame.rms).sort((a, b) => a - b)
  const noiseFloor = sortedRms[Math.floor(sortedRms.length * 0.35)] ?? 0
  const meanRms = frames.reduce((total, frame) => total + frame.rms, 0) / frames.length
  const threshold = Math.max(noiseFloor * 2.2, meanRms * 1.18, 0.015)
  const segments: AcousticEvent[] = []
  let activeStart: number | null = null
  let peakRms = 0
  let peakFrame = 0

  frames.forEach((frame, frameIndex) => {
    const active = frame.rms >= threshold
    if (active && activeStart === null) {
      activeStart = frame.start
      peakRms = frame.rms
      peakFrame = frameIndex
    }
    if (active && frame.rms > peakRms) {
      peakRms = frame.rms
      peakFrame = frameIndex
    }
    const isLast = frameIndex === frames.length - 1
    if ((!active || isLast) && activeStart !== null) {
      const endFrame = active || isLast ? frame.end : frames[Math.max(0, frameIndex - 1)]?.end ?? frame.end
      const duration = (endFrame - activeStart) / sampleRate
      if (duration >= 0.18) {
        segments.push({
          id: `activity-${activeStart}`,
          label: "Acoustic activity",
          kind: "activity",
          start_seconds: activeStart / sampleRate,
          end_seconds: endFrame / sampleRate,
          peak_seconds: (frames[peakFrame]?.start ?? activeStart) / sampleRate,
          amplitude: peakRms,
          confidence: Math.max(0.25, Math.min(0.98, peakRms / Math.max(threshold, 0.001))),
        })
      }
      activeStart = null
      peakRms = 0
    }
  })

  return segments.slice(0, 16)
}


function colorClasses(color: CategoryUi["color"]) {
  const classes: Record<CategoryUi["color"], { border: string; text: string; bg: string; solid: string; line: string }> = {
    amber: {
      border: "border-amber-500/35",
      text: "text-amber-200",
      bg: "bg-amber-500/10",
      solid: "#f59e0b",
      line: "#fbbf24",
    },
    cyan: {
      border: "border-cyan-500/35",
      text: "text-cyan-200",
      bg: "bg-cyan-500/10",
      solid: "#06b6d4",
      line: "#67e8f9",
    },
    emerald: {
      border: "border-emerald-500/35",
      text: "text-emerald-200",
      bg: "bg-emerald-500/10",
      solid: "#10b981",
      line: "#6ee7b7",
    },
    lime: {
      border: "border-lime-500/35",
      text: "text-lime-200",
      bg: "bg-lime-500/10",
      solid: "#84cc16",
      line: "#bef264",
    },
    purple: {
      border: "border-purple-500/35",
      text: "text-purple-200",
      bg: "bg-purple-500/10",
      solid: "#a855f7",
      line: "#d8b4fe",
    },
    rose: {
      border: "border-rose-500/35",
      text: "text-rose-200",
      bg: "bg-rose-500/10",
      solid: "#f43f5e",
      line: "#fda4af",
    },
  }
  return classes[color]
}

function formatBytes(value: number | null | undefined) {
  const bytes = value ?? 0
  if (bytes < 1024) return `${bytes.toLocaleString()} B`
  const units = ["KB", "MB", "GB", "TB"]
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toLocaleString(undefined, { maximumFractionDigits: size >= 10 ? 1 : 2 })} ${units[unitIndex]}`
}

function formatGigabytes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown"
  return `${value.toLocaleString(undefined, { maximumFractionDigits: value >= 100 ? 0 : 1 })} GB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "unknown"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatSampleRate(value: number | null | undefined) {
  if (!value || value <= 0) return "rate unknown"
  if (value >= 1000) return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kHz`
  return `${value.toLocaleString()} Hz`
}

function formatDuration(value: number | null | undefined) {
  if (!value || value <= 0) return "duration unknown"
  if (value < 60) return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} sec`
  const minutes = Math.floor(value / 60)
  const seconds = Math.round(value % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function compactHash(value: string | null | undefined) {
  if (!value) return "no hash"
  return value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
}

function isUuidLike(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

function streamRemoteId(blob: LibraryBlob | null): string | null {
  if (!blob?.stream_url) return null
  try {
    const url = new URL(blob.stream_url, "http://mindex.local")
    return url.searchParams.get("remote_id")
  } catch {
    return null
  }
}

function blobAnalysisId(blob: LibraryBlob | null): string | null {
  if (!blob) return null
  return [
    blob.analysis_id,
    blob.blob_id,
    blob.uuid,
    blob.remote_id,
    streamRemoteId(blob),
    blob.id,
  ].find(isUuidLike) ?? null
}

function labelForFileSource(blob: LibraryBlob) {
  return blob.source_name || blob.origin_dataset_id || blob.source_id || blob.recording_group || blob.sensor_type || "library"
}

function labelForFileClass(blob: LibraryBlob) {
  return blob.label_primary || blob.label_secondary || blob.acoustic_environment || blob.sensor_type || blob.category
}

function fileSearchText(blob: LibraryBlob) {
  return [
    blob.name,
    blob.title,
    blob.filename,
    blob.description,
    blob.relative_path,
    blob.category,
    blob.sensor_type,
    blob.recording_group,
    blob.source_id,
    blob.source_name,
    blob.origin_dataset_id,
    blob.label_primary,
    blob.label_secondary,
    blob.acoustic_environment,
    blob.training_split,
    blob.locale,
    blob.extension,
    blob.mime_type,
    blob.format,
    blob.codec,
    blob.playback_class,
    blob.license,
    blob.checksum,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function libraryBlobUiKey(blob: LibraryBlob, index: number) {
  return [blob.id, blob.relative_path, blob.checksum, blob.filename, index].filter(Boolean).join("|")
}

function buildSignalBuffer(blob: LibraryBlob | null): SignalBuffer[] {
  if (!blob?.preview_samples?.length) return []

  const sampleRate = Math.max(1, blob.sample_rate_hz || 512)
  const base = Date.parse(blob.modified_at)
  const baseTime = Number.isFinite(base) ? base : Date.now()
  const gain = blob.category === "bioelectric" ? 350 : blob.category === "spectral" ? 180 : 100
  const samples = blob.preview_samples.map((sample) => sample * gain)
  const timestamps = samples.map((_, index) => baseTime + (index / sampleRate) * 1000)

  return [
    {
      deviceId: blob.recording_group || blob.sensor_type || "mindex-library",
      channel: 0,
      samples,
      timestamps,
      sampleRate,
    },
  ]
}

function chartDataFromSamples(blob: LibraryBlob | null, maxPoints = 96) {
  const samples = blob?.preview_samples ?? []
  if (!samples.length) return []

  const step = Math.max(1, Math.floor(samples.length / maxPoints))
  return samples
    .filter((_, index) => index % step === 0)
    .slice(0, maxPoints)
    .map((sample, index) => ({
      index,
      value: sample,
      scaled: Math.abs(sample),
    }))
}

function channelLabel(channel: LibraryPreviewChannel) {
  return channel.label || channel.name || channel.id || channel.kind || "channel"
}

function channelText(channel: LibraryPreviewChannel) {
  return [channel.kind, channel.axis, channel.actuator_type, channel.label, channel.name, channel.id].filter(Boolean).join(" ").toLowerCase()
}

function channelSamples(channel: LibraryPreviewChannel | undefined) {
  return Array.isArray(channel?.samples) ? channel.samples.filter((sample) => Number.isFinite(sample)) : []
}

function findChannel(channels: LibraryPreviewChannel[], keywords: string[]) {
  return channels.find((channel) => keywords.some((keyword) => channelText(channel).includes(keyword)))
}

function filterChannels(channels: LibraryPreviewChannel[], keywords: string[]) {
  return channels.filter((channel) => keywords.some((keyword) => channelText(channel).includes(keyword)))
}

function numericPreviewSamples(blob: LibraryBlob | null) {
  return blob?.preview_source === "numeric_file" ? blob.preview_samples ?? [] : []
}

function normalizeSample(value: number) {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0))
}

function sampledSeries(samples: number[], maxPoints = 96) {
  if (!samples.length) return []
  const step = Math.max(1, Math.floor(samples.length / maxPoints))
  return samples.filter((_, index) => index % step === 0).slice(0, maxPoints)
}

function multiChannelChartData(channels: { key: string; samples: number[] }[], maxPoints = 120) {
  const longest = Math.max(0, ...channels.map((channel) => channel.samples.length))
  if (!longest) return []
  const step = Math.max(1, Math.floor(longest / maxPoints))
  const rows = []
  for (let index = 0; index < longest; index += step) {
    const row: Record<string, number> = { index }
    for (const channel of channels) {
      row[channel.key] = normalizeSample(channel.samples[index % channel.samples.length] ?? 0)
    }
    rows.push(row)
  }
  return rows.slice(0, maxPoints)
}

function sourceTemperatureUnit(channel: LibraryPreviewChannel | undefined): TemperatureUnit {
  const unit = channel?.unit?.toLowerCase() ?? ""
  if (unit.includes("f")) return "fahrenheit"
  if (unit.includes("k")) return "kelvin"
  return "celsius"
}

function toCelsius(value: number, sourceUnit: TemperatureUnit) {
  if (sourceUnit === "fahrenheit") return (value - 32) * (5 / 9)
  if (sourceUnit === "kelvin") return value - 273.15
  return value
}

function fromCelsius(value: number, targetUnit: TemperatureUnit) {
  if (targetUnit === "fahrenheit") return value * (9 / 5) + 32
  if (targetUnit === "kelvin") return value + 273.15
  return value
}

function temperatureUnitLabel(unit: TemperatureUnit) {
  if (unit === "fahrenheit") return "°F"
  if (unit === "kelvin") return "K"
  return "°C"
}

function temperatureUnitName(unit: TemperatureUnit) {
  if (unit === "fahrenheit") return "Fahrenheit"
  if (unit === "kelvin") return "Kelvin"
  return "Celsius"
}

function formatTemperature(value: number | undefined, unit: TemperatureUnit) {
  if (!Number.isFinite(value)) return "n/a"
  return `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: unit === "kelvin" ? 2 : 1 })} ${temperatureUnitLabel(unit)}`
}

function temperatureStats(samples: number[], sourceUnit: TemperatureUnit, targetUnit: TemperatureUnit) {
  const values = samples.filter((sample) => Number.isFinite(sample)).map((sample) => fromCelsius(toCelsius(sample, sourceUnit), targetUnit))
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  return { min, max, mean }
}

function temperatureChartData(samples: number[], sourceUnit: TemperatureUnit, targetUnit: TemperatureUnit, maxPoints = 120) {
  const converted = samples.filter((sample) => Number.isFinite(sample)).map((sample) => fromCelsius(toCelsius(sample, sourceUnit), targetUnit))
  if (!converted.length) return []
  const step = Math.max(1, Math.floor(converted.length / maxPoints))
  return converted
    .filter((_, index) => index % step === 0)
    .slice(0, maxPoints)
    .map((temperature, index) => ({ index, temperature }))
}

type AcousticEnvironment = "water" | "air" | "ground"

function inferAcousticEnvironment(blob: LibraryBlob | null): AcousticEnvironment {
  const declared = blob?.acoustic_environment?.toLowerCase()
  if (declared === "water" || declared === "air" || declared === "ground") return declared

  const text = [blob?.relative_path, blob?.sensor_type, blob?.recording_group, blob?.name].filter(Boolean).join(" ").toLowerCase()
  if (["hydrophone", "underwater", "ocean", "marine", "reef", "river", "lake", "aquatic"].some((term) => text.includes(term))) {
    return "water"
  }
  if (["ground", "soil", "seismic", "earthquake", "geophone", "underground", "subsurface", "tremor"].some((term) => text.includes(term))) {
    return "ground"
  }
  return "air"
}

function secondsLabel(value: number | undefined) {
  if (!Number.isFinite(value)) return "time unknown"
  return `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}s`
}

function frequencyLabel(value: number | undefined) {
  if (!Number.isFinite(value)) return "frequency unknown"
  const frequency = value ?? 0
  if (frequency >= 1000) return `${(frequency / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kHz`
  return `${frequency.toLocaleString(undefined, { maximumFractionDigits: 0 })} Hz`
}

function confidenceLabel(value: number | undefined) {
  if (!Number.isFinite(value)) return "unscored"
  return `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function stringFromUnknown(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function objectFromUnknown(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function normalizeAcousticEvent(value: unknown, detectorFallback?: string): AcousticPatternMatch {
  const event = objectFromUnknown(value) ?? {}
  const start = numberFromUnknown(event.start_seconds) ?? numberFromUnknown(event.start_sec)
  const end = numberFromUnknown(event.end_seconds) ?? numberFromUnknown(event.end_sec)
  const peak = numberFromUnknown(event.peak_seconds) ?? numberFromUnknown(event.peak_sec)
  const frequency = numberFromUnknown(event.frequency_hz) ?? numberFromUnknown(event.freq_hz)
  const confidence = numberFromUnknown(event.confidence) ?? numberFromUnknown(event.score)
  const label =
    stringFromUnknown(event.label) ||
    stringFromUnknown(event.species) ||
    stringFromUnknown(event.class_name) ||
    stringFromUnknown(event.source_type) ||
    stringFromUnknown(event.detector_id) ||
    detectorFallback ||
    "Acoustic event"

  return {
    ...(event as AcousticPatternMatch),
    detector_id: stringFromUnknown(event.detector_id) || detectorFallback,
    label,
    start_seconds: start,
    end_seconds: end,
    peak_seconds: peak,
    frequency_hz: frequency,
    confidence,
  }
}

function normalizeAcousticArray(value: unknown, detectorFallback?: string): AcousticPatternMatch[] {
  return Array.isArray(value) ? value.map((item) => normalizeAcousticEvent(item, detectorFallback)) : []
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function objectArrayHasRows(value: unknown) {
  return unknownArray(value).some((item) => Boolean(objectFromUnknown(item)))
}

function deepSignalRowsHaveEvidence(value: unknown) {
  return unknownArray(value).some((item) => {
    const row = objectFromUnknown(item)
    if (!row) return false
    const hasScore = Number.isFinite(Number(row.score)) || Number.isFinite(Number(row.confidence)) || Number.isFinite(Number(row.distance))
    const hasPrototypeIdentity = Boolean(
      stringFromUnknown(row.prototype_id) ||
        stringFromUnknown(row.prototype_match_id) ||
        stringFromUnknown(row.matched_prototype_id) ||
        stringFromUnknown(row.nearest_prototype_id) ||
        stringFromUnknown(row.embedding_id) ||
        stringFromUnknown(row.vector_checksum) ||
        stringFromUnknown(row.embedding_checksum),
    )
    const hasModelProof = Boolean(stringFromUnknown(row.model_id) || stringFromUnknown(row.model) || Number.isFinite(Number(row.embedding_dim)))
    return hasScore && hasPrototypeIdentity && hasModelProof
  })
}

function transcriptRowsHaveEvidence(value: unknown) {
  return unknownArray(value).some((item) => {
    const row = objectFromUnknown(item)
    if (!row) return false
    return unknownArray(row.model_output_ids).length > 0 || unknownArray(row.fusion_evidence_ids).length > 0 || unknownArray(row.prototype_ids).length > 0
  })
}

function classificationPayloadHasSemanticEvidence(source: Record<string, unknown>) {
  return (
    objectArrayHasRows(source.model_outputs) ||
    objectArrayHasRows(source.fusion_evidence) ||
    deepSignalRowsHaveEvidence(source.deep_signal_matches) ||
    transcriptRowsHaveEvidence(source.sound_transcripts)
  )
}

function classificationPatchFromPayload(payload: unknown): Partial<LibraryBlob> {
  const root = objectFromUnknown(payload) ?? {}
  const source =
    objectFromUnknown(root.blob) ||
    objectFromUnknown(root.item) ||
    objectFromUnknown(root.classification) ||
    root
  const summary = source.identification_summary ?? source.summary
  const status = stringFromUnknown(source.identification_status) || stringFromUnknown(source.status)
  const hasSemanticEvidence = classificationPayloadHasSemanticEvidence(source)
  const patch: Partial<LibraryBlob> = {}

  if (status) patch.identification_status = status
  if (objectFromUnknown(summary) && hasSemanticEvidence) {
    patch.identification_summary = summary as AudioIdentificationSummary
  } else if (objectFromUnknown(summary) && !status) {
    patch.identification_status = "model_evidence_pending"
  }
  if (stringFromUnknown(source.analysis_engine) || stringFromUnknown(source.engine)) {
    patch.analysis_engine = stringFromUnknown(source.analysis_engine) || stringFromUnknown(source.engine)
  }

  const frequency = normalizeAcousticArray(source.frequency_detections, "frequency_fft")
  const activity = normalizeAcousticArray(source.activity_segments, "activity_auditok")
  const bird = normalizeAcousticArray(source.bird_detections, "bird_microsoft")
  const uav = normalizeAcousticArray(source.uav_detections, "uav_rotor")
  const nps = normalizeAcousticArray(source.nps_detections, "nps_discovery_match")
  const deepSignal = normalizeAcousticArray(source.deep_signal_matches, "deep_signal_features")
  const sine = normalizeAcousticArray(source.sine_matches, "sine")
  const events = normalizeAcousticArray(source.acoustic_events ?? source.events, "sine")

  if (Array.isArray(source.frequency_detections)) patch.frequency_detections = frequency
  if (Array.isArray(source.activity_segments)) patch.activity_segments = activity
  if (Array.isArray(source.bird_detections)) patch.bird_detections = bird
  if (Array.isArray(source.uav_detections)) patch.uav_detections = uav
  if (Array.isArray(source.nps_detections)) patch.nps_detections = nps
  if (Array.isArray(source.deep_signal_matches)) patch.deep_signal_matches = deepSignal
  if (Array.isArray(source.sine_matches)) patch.sine_matches = sine
  if (Array.isArray(source.acoustic_events) || Array.isArray(source.events)) patch.acoustic_events = events

  return patch
}

function acousticPatternLabel(pattern: AcousticPatternMatch | AcousticEvent) {
  const match = pattern as AcousticPatternMatch
  return pattern.label || match.species || match.class_name || match.source_type || pattern.kind || "Acoustic event"
}

function acousticPatternCategory(pattern: AcousticPatternMatch | AcousticEvent) {
  const match = pattern as AcousticPatternMatch
  const raw = match.category || match.source_type || match.kind || "signal"
  return raw.replace(/[_-]+/g, " ")
}

function acousticPatternDetail(pattern: AcousticPatternMatch | AcousticEvent) {
  const match = pattern as AcousticPatternMatch
  const details = [
    match.speaker ? `speaker ${match.speaker}` : null,
    match.emotion,
    match.language,
    match.transcript ? `"${match.transcript}"` : null,
    frequencyLabel(pattern.frequency_hz),
  ].filter(Boolean)
  return details.join(" / ")
}

function identificationSummaryLabel(summary: AudioIdentificationSummary | undefined) {
  return summary?.top_label || summary?.label || summary?.class_name || null
}

function identificationEngineLabel(blob: LibraryBlob | null, summary: AudioIdentificationSummary | undefined) {
  return summary?.engine || summary?.model || blob?.analysis_engine || null
}

function acousticPatternMatchesEnvironment(pattern: AcousticPatternMatch, environment: AcousticEnvironment) {
  const matchEnvironment = pattern.environment?.toLowerCase()
  return !matchEnvironment || matchEnvironment === "unknown" || matchEnvironment === environment
}

function detectAcousticSpikes(blob: LibraryBlob | null): AcousticEvent[] {
  const samples = blob?.preview_samples ?? []
  if (!samples.length) return []

  const sampleRate = Math.max(1, blob?.sample_rate_hz || 44100)
  const magnitudes = samples.map((sample) => Math.abs(sample))
  const mean = magnitudes.reduce((total, sample) => total + sample, 0) / magnitudes.length
  const max = Math.max(...magnitudes, 0)
  const threshold = Math.max(mean * 2.8, max * 0.62, 0.12)
  const events: AcousticEvent[] = []
  let lastIndex = -sampleRate * 0.12

  for (let index = 1; index < magnitudes.length - 1; index += 1) {
    const value = magnitudes[index] ?? 0
    if (value < threshold || value < (magnitudes[index - 1] ?? 0) || value < (magnitudes[index + 1] ?? 0)) continue
    if (index - lastIndex < sampleRate * 0.08) continue
    const peakSeconds = index / sampleRate
    events.push({
      id: `spike-${index}`,
      label: "Signal spike",
      kind: "spike",
      start_seconds: Math.max(0, peakSeconds - 0.035),
      end_seconds: peakSeconds + 0.035,
      peak_seconds: peakSeconds,
      amplitude: value,
      confidence: max > 0 ? value / max : undefined,
    })
    lastIndex = index
    if (events.length >= 12) break
  }

  return events
}

function eventMarkerData(blob: LibraryBlob | null, events: AcousticEvent[], maxPoints = 160) {
  const samples = blob?.preview_samples ?? []
  if (!samples.length) return []
  const sampleRate = Math.max(1, blob?.sample_rate_hz || 44100)
  const step = Math.max(1, Math.floor(samples.length / maxPoints))
  return samples
    .filter((_, index) => index % step === 0)
    .slice(0, maxPoints)
    .map((sample, pointIndex) => {
      const sourceIndex = pointIndex * step
      const time = sourceIndex / sampleRate
      const event = events.find((item) => {
        const start = item.start_seconds ?? item.peak_seconds ?? 0
        const end = item.end_seconds ?? item.peak_seconds ?? start
        return time >= start && time <= end
      })
      return {
        index: pointIndex,
        time,
        wave: normalizeSample(sample),
        magnitude: Math.abs(normalizeSample(sample)),
        event: event ? 1 : 0,
      }
    })
}

function SineVisualAnalysisStack({
  blob,
  matches,
  frequencyDetections,
  activitySegments,
}: {
  blob: LibraryBlob | null
  matches: AcousticPatternMatch[]
  frequencyDetections: AcousticPatternMatch[]
  activitySegments: AcousticEvent[]
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const samples = blob?.preview_samples ?? []
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    const width = canvas.width
    const height = canvas.height
    const rows = [
      { label: "waveform", y: 18, h: 76 },
      { label: "energy", y: 104, h: 112 },
      { label: "frequency", y: 226, h: 70 },
      { label: "detections", y: 306, h: 58 },
    ]

    context.clearRect(0, 0, width, height)
    context.fillStyle = "rgb(2, 6, 23)"
    context.fillRect(0, 0, width, height)

    for (const row of rows) {
      context.fillStyle = "rgba(15, 23, 42, 0.72)"
      context.fillRect(0, row.y, width, row.h)
      context.strokeStyle = "rgba(255,255,255,0.1)"
      context.strokeRect(0, row.y, width, row.h)
      context.fillStyle = "rgba(226,232,240,0.72)"
      context.font = "11px sans-serif"
      context.fillText(row.label.toUpperCase(), 10, row.y + 15)
    }

    if (!samples.length) {
      context.fillStyle = "rgba(148, 163, 184, 0.88)"
      context.font = "13px sans-serif"
      context.fillText("Select an acoustic file to render layered SINE evidence.", 18, height / 2)
      return
    }

    const sampleRate = Math.max(1, blob?.sample_rate_hz || 44100)
    const duration = Math.max(blob?.duration_sec || samples.length / sampleRate, 0.001)
    const waveRow = rows[0]
    context.strokeStyle = "rgba(248, 113, 113, 0.95)"
    context.lineWidth = 1.5
    context.beginPath()
    samples.forEach((sample, index) => {
      const x = (index / Math.max(1, samples.length - 1)) * width
      const y = waveRow.y + waveRow.h / 2 - normalizeSample(sample) * (waveRow.h * 0.42)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()

    const energyRow = rows[1]
    const bins = 46
    const columns = 150
    for (let x = 0; x < columns; x += 1) {
      const start = Math.floor((x / columns) * samples.length)
      const end = Math.max(start + 1, Math.floor(((x + 1) / columns) * samples.length))
      let energy = 0
      for (let index = start; index < end; index += 1) {
        const sample = normalizeSample(samples[index] ?? 0)
        energy += sample * sample
      }
      const rms = Math.sqrt(energy / Math.max(1, end - start))
      for (let y = 0; y < bins; y += 1) {
        const value = Math.max(0, Math.min(1, rms * 1.8 - y / bins + 0.08))
        const red = Math.floor(18 + value * 225)
        const green = Math.floor(55 + value * 190)
        const blue = Math.floor(90 + value * 130)
        context.fillStyle = `rgba(${red},${green},${blue},${0.18 + value * 0.72})`
        context.fillRect((x / columns) * width, energyRow.y + energyRow.h - ((y + 1) / bins) * energyRow.h, width / columns + 1, energyRow.h / bins + 1)
      }
    }

    const freqRow = rows[2]
    const maxFrequency = Math.max(1000, ...frequencyDetections.map((item) => item.frequency_hz ?? 0))
    context.strokeStyle = "rgba(34, 211, 238, 0.92)"
    context.lineWidth = 2
    context.beginPath()
    frequencyDetections.forEach((item, index) => {
      const t = item.peak_seconds ?? item.start_seconds ?? 0
      const x = (t / duration) * width
      const y = freqRow.y + freqRow.h - Math.min(1, (item.frequency_hz ?? 0) / maxFrequency) * (freqRow.h - 18) - 5
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
      context.fillStyle = "rgba(103, 232, 249, 0.9)"
      context.fillRect(x - 2, y - 2, 4, 4)
    })
    context.stroke()
    context.fillStyle = "rgba(226,232,240,0.7)"
    context.font = "11px sans-serif"
    const topFrequency = frequencyDetections[0]?.frequency_hz
    context.fillText(topFrequency ? frequencyLabel(topFrequency) : "no frequency peak detected", 88, freqRow.y + 15)

    const detectionRow = rows[3]
    const lanes = [
      { label: "activity", color: "rgba(16,185,129,0.82)", items: activitySegments },
      { label: "bird", color: "rgba(250,204,21,0.82)", items: matches.filter((item) => acousticPatternCategory(item).includes("bird") || item.category === "bird") },
      { label: "uav", color: "rgba(244,63,94,0.82)", items: matches.filter((item) => acousticPatternCategory(item).includes("uav") || acousticPatternCategory(item).includes("drone")) },
      { label: "nps", color: "rgba(59,130,246,0.82)", items: matches.filter((item) => acousticPatternCategory(item).includes("nps") || acousticPatternCategory(item).includes("park")) },
    ].filter((lane) => lane.items.length)
    if (!lanes.length) {
      context.fillStyle = "rgba(148,163,184,0.72)"
      context.font = "11px sans-serif"
      context.fillText("No saved detector intervals for this file", 88, detectionRow.y + 32)
    }
    lanes.forEach((lane, laneIndex) => {
      const y = detectionRow.y + 10 + laneIndex * 12
      context.fillStyle = "rgba(148,163,184,0.75)"
      context.font = "10px sans-serif"
      context.fillText(lane.label, 10, y + 8)
      context.fillStyle = lane.color
      lane.items.forEach((item) => {
        const start = item.start_seconds ?? item.peak_seconds ?? 0
        const end = item.end_seconds ?? item.peak_seconds ?? start + 0.12
        const x = Math.max(66, (start / duration) * width)
        const w = Math.max(3, ((end - start) / duration) * width)
        context.fillRect(x, y, w, 8)
      })
    })
  }, [activitySegments, blob, frequencyDetections, matches])

  return <canvas ref={canvasRef} width={900} height={380} className="h-[380px] w-full rounded-md border border-white/10 bg-black" />
}

function SineAcousticPanel({
  blob,
  color,
  onClassified,
}: {
  blob: LibraryBlob | null
  color: string
  onClassified?: (blobId: string, payload: unknown) => void
}) {
  const inferredEnvironment = inferAcousticEnvironment(blob)
  const [environment, setEnvironment] = useState<AcousticEnvironment>(inferredEnvironment)
  const [classifying, setClassifying] = useState(false)
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null)

  useEffect(() => {
    setEnvironment(inferredEnvironment)
  }, [blob?.id, inferredEnvironment])

  const extension = blob?.extension.toLowerCase() ?? ""
  const mimeType = blob?.mime_type.toLowerCase() ?? ""
  const isAudio = mimeType.startsWith("audio/") || ["wav", "mp3", "flac", "ogg", "m4a", "aac"].some((ext) => extension.includes(ext))
  const frequencyDetections = useMemo(() => blob?.frequency_detections ?? [], [blob?.frequency_detections])
  const activitySegments = useMemo(() => blob?.activity_segments ?? [], [blob?.activity_segments])
  const birdDetections = useMemo(() => blob?.bird_detections ?? [], [blob?.bird_detections])
  const uavDetections = useMemo(() => blob?.uav_detections ?? [], [blob?.uav_detections])
  const npsDetections = useMemo(() => blob?.nps_detections ?? [], [blob?.nps_detections])
  const rawSpikes = useMemo(() => detectAcousticSpikes(blob), [blob])
  const confirmedMatches = useMemo(() => {
    const matches = [
      ...(blob?.deep_signal_matches ?? []),
      ...(blob?.sine_matches ?? []),
      ...(blob?.pattern_matches ?? []),
      ...birdDetections,
      ...uavDetections,
      ...npsDetections,
    ]
    const seen = new Set<string>()
    return matches
      .filter((match) => acousticPatternMatchesEnvironment(match, environment))
      .filter((match) => {
        const key = [acousticPatternLabel(match), match.start_seconds, match.end_seconds, match.frequency_hz].join("|")
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 12)
  }, [birdDetections, blob, environment, npsDetections, uavDetections])
  const events = useMemo(
    () => [...confirmedMatches, ...frequencyDetections, ...activitySegments, ...(blob?.acoustic_events ?? []), ...rawSpikes].slice(0, 28),
    [activitySegments, blob?.acoustic_events, confirmedMatches, frequencyDetections, rawSpikes],
  )
  const waveformData = useMemo(() => eventMarkerData(blob, events), [blob, events])
  const identificationSummary = blob?.identification_summary
  const identificationLabel = identificationSummaryLabel(identificationSummary)
  const identificationEngine = identificationEngineLabel(blob, identificationSummary)
  const identificationConfidence = identificationSummary?.confidence
  const topFrequency = frequencyDetections[0]?.frequency_hz
  const analysisId = blobAnalysisId(blob)
  const detectorCounts = [
    { label: "frequency", count: frequencyDetections.length, detail: topFrequency ? frequencyLabel(topFrequency) : "peaks" },
    { label: "activity", count: activitySegments.length, detail: "regions" },
    { label: "bird", count: birdDetections.length, detail: "saved results" },
    { label: "uav", count: uavDetections.length, detail: "saved results" },
    { label: "nps", count: npsDetections.length, detail: "saved results" },
    { label: "spikes", count: rawSpikes.length, detail: "from waveform" },
  ]

  const runServerClassification = useCallback(async () => {
    if (!blob?.id) return
    if (!analysisId) {
      setClassifyMessage("This recording can play from storage, but it needs a MINDEX database record before SINE can run an evidence check.")
      return
    }
    setClassifying(true)
    setClassifyMessage(null)
    try {
      const response = await fetch(`/api/natureos/mindex/library/classify?id=${encodeURIComponent(analysisId)}`, {
        method: "POST",
        cache: "no-store",
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.detail === "string"
              ? payload.detail
              : `SINE evidence check returned HTTP ${response.status}`
        throw new Error(message)
      }
      onClassified?.(blob.id, payload)
      const patch = classificationPatchFromPayload(payload)
      setClassifyMessage(
        patch.identification_summary
          ? "SINE returned evidence-backed identification for this file."
          : "SINE returned detector output. Confirmed meaning still needs model, prototype, or transcript evidence.",
      )
    } catch (error) {
      setClassifyMessage(error instanceof Error ? error.message : "SINE evidence check could not run.")
    } finally {
      setClassifying(false)
    }
  }, [analysisId, blob?.id, onClassified])

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <AudioLines className="h-4 w-4 text-emerald-200" />
              SINE Audio Identification
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Real playback, waveform energy, frequency peaks, activity regions, and saved identification results for the selected recording.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <div className="flex rounded-md border border-white/10 bg-black/40 p-1">
              {(["water", "air", "ground"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setEnvironment(mode)}
                  className={`rounded px-3 py-2 text-sm font-medium transition ${
                    environment === mode ? "bg-emerald-400/20 text-emerald-100" : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {mode === "water" ? "Water" : mode === "air" ? "Air" : "Ground"}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!blob || !analysisId || classifying}
              title={analysisId ? "Run a SINE evidence check against the registered MINDEX acoustic record." : "This file needs a MINDEX database record before SINE can run an evidence check."}
              onClick={() => void runServerClassification()}
              className="min-h-[42px] border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15 disabled:opacity-45"
            >
              <AudioLines className={`mr-2 h-4 w-4 ${classifying ? "animate-pulse" : ""}`} />
              {classifying ? "Checking evidence" : "Run SINE evidence check"}
            </Button>
          </div>
        </div>

        {classifyMessage ? (
          <p className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${
            classifyMessage.includes("evidence-backed")
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-400/20 bg-amber-400/10 text-amber-100"
          }`}>
            {classifyMessage}
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            {blob && isAudio ? (
              <audio controls src={blob.stream_url} className="w-full" preload="metadata" />
            ) : (
              <div className="flex h-14 items-center justify-center rounded-md border border-white/10 bg-black text-sm text-gray-500">
                Select an acoustic file to enable SINE playback.
              </div>
            )}
            {blob && isAudio ? (
              <SineVisualAnalysisStack
                blob={blob}
                matches={confirmedMatches}
                frequencyDetections={frequencyDetections}
                activitySegments={activitySegments}
              />
            ) : null}
          </div>

          <div className="grid content-start gap-2">
            {identificationLabel ? (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.08em] text-emerald-200">Saved identification</p>
                    <p className="mt-1 truncate text-lg font-semibold text-white">{identificationLabel}</p>
                    {identificationEngine ? <p className="mt-1 truncate text-xs text-gray-400">{identificationEngine}</p> : null}
                  </div>
                  <span className="shrink-0 rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-emerald-100">
                    {confidenceLabel(identificationConfidence)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-black/35 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-gray-500">Saved identification</p>
                <p className="mt-2 text-sm leading-5 text-gray-300">
                  {blob ? "No saved identification result for this file." : "Select an acoustic file to view saved identification results."}
                </p>
              </div>
            )}
            <div className="rounded-md border border-white/10 bg-black/35 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Radar className="h-4 w-4 text-cyan-200" />
                Real detector data
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {detectorCounts.map((item) => (
                  <div key={item.label} className="rounded border border-white/10 bg-black/30 px-2 py-2">
                    <p className="truncate text-[11px] uppercase tracking-[0.08em] text-gray-500">{item.label}</p>
                    <p className="mt-1 font-mono text-base text-white">{item.count.toLocaleString()}</p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">saved IDs</p>
                <p className="mt-1 font-mono text-lg text-white">{confirmedMatches.length.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">events</p>
                <p className="mt-1 font-mono text-lg text-white">{events.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-md border border-white/10 bg-black/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Activity className="h-4 w-4 text-emerald-200" />
              Audio event timeline
            </p>
            <Badge variant="outline" className="border-white/15 text-gray-300">
              {events.length.toLocaleString()} events
            </Badge>
          </div>
          <div className="mt-3 h-[240px] rounded-md border border-white/10 bg-black p-3">
            {waveformData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={waveformData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={[-1, 1]} />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  <Area type="monotone" dataKey="magnitude" stroke="none" fill="#10b981" fillOpacity={0.16} name="energy" />
                  <Line type="monotone" dataKey="wave" stroke={color} dot={false} strokeWidth={2} name="wave" />
                  <Line type="stepAfter" dataKey="event" stroke="#fbbf24" dot={false} strokeWidth={2} name="event marker" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
                Select an acoustic file to inspect signal events and identification markers.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Mic className="h-4 w-4 text-emerald-200" />
              Identification results
            </p>
            <Badge variant="outline" className="border-white/15 text-gray-300">
              {environment}
            </Badge>
          </div>
          <div className="mt-3 max-h-[240px] space-y-2 overflow-auto pr-1">
            {confirmedMatches.map((match, index) => (
              <div key={`${acousticPatternLabel(match)}-${index}`} className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{acousticPatternLabel(match)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {secondsLabel(match.start_seconds ?? match.peak_seconds)} / {acousticPatternCategory(match)}
                    </p>
                    {acousticPatternDetail(match) ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-500">{acousticPatternDetail(match)}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-emerald-100">
                    {confidenceLabel(match.confidence)}
                  </span>
                </div>
              </div>
            ))}

            {!confirmedMatches.length ? (
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-8 text-center text-sm leading-6 text-gray-500">
                No identification results saved for this file yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {blob?.preview_samples?.length ? (
        <>
          <AnimatedWaveform blob={blob} color={color} />
          <SignalChart blob={blob} color={color} />
        </>
      ) : null}
    </div>
  )
}

function useLibraryCatalog(activeCategory: LibraryCategoryId, query: string) {
  const [catalog, setCatalog] = useState<LibraryCatalog>(EMPTY_CATALOG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ category: activeCategory, limit: "100" })
    const trimmed = query.trim()
    if (trimmed) params.set("q", trimmed)

    setLoading(true)
    setError(null)

    fetch(`/api/natureos/mindex/library?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as LibraryCatalog
        if (!response.ok) {
          throw new Error(data.message || "Library could not be loaded.")
        }
        setCatalog({
          ...EMPTY_CATALOG,
          ...data,
          categories: data.categories?.length ? data.categories : EMPTY_CATALOG.categories,
          blobs: Array.isArray(data.blobs) ? data.blobs : [],
        })
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        const message = requestError instanceof Error ? requestError.message : "Library could not be loaded."
        setError(message)
        setCatalog({ ...EMPTY_CATALOG, message })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [activeCategory, query, refreshNonce])

  return { catalog, loading, error, refresh }
}

function useDecodedAudioPreview(blob: LibraryBlob | null) {
  const [preview, setPreview] = useState<DecodedAudioPreview | null>(null)

  useEffect(() => {
    const shouldDecode =
      blob &&
      isAudioBlob(blob) &&
      (!blob.preview_samples?.length || blob.preview_source === "file_bytes") &&
      blob.size_bytes > 0 &&
      blob.size_bytes <= MAX_AUDIO_PREVIEW_BYTES

    if (!shouldDecode || !blob) {
      setPreview(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function decodeSelectedAudio() {
      let audioContext: AudioContext | null = null
      try {
        const AudioContextCtor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext
        if (!AudioContextCtor) return

        const response = await fetch(blob.stream_url, {
          cache: "force-cache",
          signal: controller.signal,
        })
        if (!response.ok) return

        const arrayBuffer = await response.arrayBuffer()
        audioContext = new AudioContextCtor()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const channel = audioBuffer.getChannelData(0)
        const samples = downsampleAudioChannel(channel)
        const durationSec = audioBuffer.duration
        const frequencyDetections = computeFrequencyDetections(channel, audioBuffer.sampleRate, durationSec)
        const activitySegments = computeActivitySegments(channel, audioBuffer.sampleRate)
        if (!cancelled && samples.length) {
          setPreview({
            blobId: blob.id,
            samples,
            sampleRate: audioBuffer.sampleRate,
            durationSec,
            frequencyDetections,
            activitySegments,
          })
        }
      } catch {
        if (!cancelled) setPreview(null)
      } finally {
        await audioContext?.close().catch(() => undefined)
      }
    }

    decodeSelectedAudio()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [blob])

  return preview
}

function AnimatedWaveform({ blob, color }: { blob: LibraryBlob | null; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const samples = blob?.preview_samples ?? []
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let frame = 0
    let animation = 0

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      context.clearRect(0, 0, width, height)
      context.fillStyle = "rgba(2, 6, 23, 0.92)"
      context.fillRect(0, 0, width, height)

      context.strokeStyle = "rgba(255, 255, 255, 0.08)"
      context.lineWidth = 1
      for (let index = 1; index < 6; index += 1) {
        const y = (height / 6) * index
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }

      if (!samples.length) {
        context.fillStyle = "rgba(148, 163, 184, 0.88)"
        context.font = "13px sans-serif"
        context.fillText("Select a file to inspect its signal.", 18, height / 2)
        return
      }

      const offset = frame % samples.length
      context.strokeStyle = color
      context.lineWidth = 2
      context.beginPath()
      for (let index = 0; index < width; index += 1) {
        const sampleIndex = Math.floor((index / width) * samples.length + offset) % samples.length
        const value = samples[sampleIndex] ?? 0
        const y = height / 2 - value * (height * 0.38)
        if (index === 0) context.moveTo(index, y)
        else context.lineTo(index, y)
      }
      context.stroke()

      context.fillStyle = color
      context.globalAlpha = 0.18
      context.fillRect((frame * 2) % width, 0, 2, height)
      context.globalAlpha = 1

      frame += 1
      animation = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animation)
  }, [blob, color])

  return <canvas ref={canvasRef} width={840} height={220} className="h-[220px] w-full rounded-md border border-white/10 bg-black" />
}

function ThermalHeatmap({ blob, samples: explicitSamples }: { blob: LibraryBlob | null; samples?: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const samples = explicitSamples ?? blob?.preview_samples ?? []
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    let frame = 0
    let animation = 0
    const cellsX = 24
    const cellsY = 14
    const min = samples.length ? Math.min(...samples) : 0
    const max = samples.length ? Math.max(...samples) : 1
    const span = Math.max(0.0001, max - min)

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      context.clearRect(0, 0, width, height)
      context.fillStyle = "rgba(2, 6, 23, 1)"
      context.fillRect(0, 0, width, height)

      if (!samples.length) {
        context.fillStyle = "rgba(148, 163, 184, 0.88)"
        context.font = "13px sans-serif"
        context.fillText("Select a thermal file to render the heat map.", 18, height / 2)
        return
      }

      for (let y = 0; y < cellsY; y += 1) {
        for (let x = 0; x < cellsX; x += 1) {
          const index = (x + y * cellsX + frame) % samples.length
          const value = Math.min(1, Math.max(0, ((samples[index] ?? min) - min) / span))
          const red = Math.floor(60 + value * 210)
          const green = Math.floor(18 + value * 92 + y * 3)
          const blue = Math.floor(65 + (1 - value) * 70)
          context.fillStyle = `rgb(${red}, ${green}, ${blue})`
          context.fillRect((x / cellsX) * width, (y / cellsY) * height, width / cellsX + 1, height / cellsY + 1)
        }
      }

      frame += 1
      animation = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animation)
  }, [blob, explicitSamples])

  return <canvas ref={canvasRef} width={840} height={260} className="h-[260px] w-full rounded-md border border-white/10 bg-black" />
}

function ThermalPlaybackPanel({
  blob,
  color,
  isImage,
  isVideo,
}: {
  blob: LibraryBlob | null
  color: string
  isImage: boolean
  isVideo: boolean
}) {
  const [unit, setUnit] = useState<TemperatureUnit>("fahrenheit")
  const channels = useMemo(() => blob?.preview_channels ?? [], [blob?.preview_channels])
  const temperatureChannels = useMemo(
    () =>
      filterChannels(channels, [
        "temperature",
        "temp",
        "thermal",
        "infrared",
        "ir",
        "bme",
        "bmi",
        "bmp",
        "thermistor",
        "thermocouple",
        "ds18b20",
        "mlx",
        "tmp",
      ]),
    [channels],
  )
  const infraredChannels = useMemo(() => filterChannels(channels, ["infrared", "ir", "thermal camera", "flir", "seek", "mlx", "heat"]), [channels])
  const sensorChannels = useMemo(
    () => filterChannels(channels, ["bme", "bmi", "bmp", "thermistor", "thermocouple", "temperature", "temp", "ds18b20", "mlx", "tmp"]),
    [channels],
  )
  const heatmapChannel = useMemo(
    () => findChannel(temperatureChannels, ["matrix", "grid", "heat", "thermal", "infrared", "ir"]) ?? temperatureChannels[0],
    [temperatureChannels],
  )
  const primaryTemperatureChannel = useMemo(
    () => findChannel(temperatureChannels, ["bme", "bmi", "bmp", "temperature", "temp", "thermistor", "thermocouple", "infrared", "ir"]) ?? temperatureChannels[0],
    [temperatureChannels],
  )
  const primarySamples = useMemo(() => channelSamples(primaryTemperatureChannel), [primaryTemperatureChannel])
  const heatmapSamples = useMemo(() => {
    const parsedSamples = channelSamples(heatmapChannel)
    if (parsedSamples.length) return parsedSamples
    return numericPreviewSamples(blob)
  }, [blob, heatmapChannel])
  const sourceUnit = sourceTemperatureUnit(primaryTemperatureChannel)
  const calibrated = primarySamples.length > 0
  const stats = useMemo(() => temperatureStats(primarySamples, sourceUnit, unit), [primarySamples, sourceUnit, unit])
  const temperatureData = useMemo(() => temperatureChartData(primarySamples, sourceUnit, unit), [primarySamples, sourceUnit, unit])
  const sensorLabels = ["BME temperature", "BMI temperature", "BMP temperature", "thermistor", "thermocouple", "infrared", "thermal camera"]

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Thermometer className="h-4 w-4 text-rose-200" />
              Thermal video and temperature player
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Infrared video, heat maps, and calibrated temperature playback across Fahrenheit, Celsius, and Kelvin.
            </p>
          </div>
          <div className="flex shrink-0 rounded-md border border-white/10 bg-black/40 p-1">
            {(["fahrenheit", "celsius", "kelvin"] as const).map((temperatureUnit) => (
              <button
                key={temperatureUnit}
                type="button"
                onClick={() => setUnit(temperatureUnit)}
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  unit === temperatureUnit ? "bg-rose-400/20 text-rose-100" : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {temperatureUnitLabel(temperatureUnit)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-3">
            {blob && isVideo ? <video controls src={blob.stream_url} className="max-h-[380px] w-full rounded-md border border-white/10" /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {blob && isImage ? <img src={blob.stream_url} alt={blob.name} className="max-h-[380px] w-full rounded-md border border-white/10 object-contain" /> : null}
            {!isVideo && !isImage ? (
              <div className="flex h-16 items-center justify-center rounded-md border border-white/10 bg-black text-center text-sm leading-6 text-gray-500">
                Select an infrared image, thermal video, or temperature file to enable visual playback.
              </div>
            ) : null}
            <ThermalHeatmap blob={blob} samples={heatmapSamples} />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">min</p>
                <p className="mt-1 font-mono text-sm text-white">{formatTemperature(stats?.min, unit)}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">mean</p>
                <p className="mt-1 font-mono text-sm text-white">{formatTemperature(stats?.mean, unit)}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">max</p>
                <p className="mt-1 font-mono text-sm text-white">{formatTemperature(stats?.max, unit)}</p>
              </div>
            </div>

            <section className="rounded-md border border-white/10 bg-black/35 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Gauge className="h-4 w-4 text-rose-200" />
                Temperature sensors
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sensorLabels.map((label) => (
                  <Badge key={label} variant="outline" className="border-rose-500/30 text-rose-100">
                    {label}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded border border-white/10 bg-black/35 px-2 py-2">
                  <p className="text-xs text-gray-500">temperature channels</p>
                  <p className="mt-1 font-mono text-sm text-white">{temperatureChannels.length.toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/35 px-2 py-2">
                  <p className="text-xs text-gray-500">infrared channels</p>
                  <p className="mt-1 font-mono text-sm text-white">{infraredChannels.length.toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/35 px-2 py-2">
                  <p className="text-xs text-gray-500">sensor channels</p>
                  <p className="mt-1 font-mono text-sm text-white">{sensorChannels.length.toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/35 px-2 py-2">
                  <p className="text-xs text-gray-500">display</p>
                  <p className="mt-1 text-sm text-white">{temperatureUnitName(unit)}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Activity className="h-4 w-4 text-rose-200" />
            Temperature trace
          </p>
          <Badge variant="outline" className="border-white/15 text-gray-300">
            {calibrated ? temperatureUnitName(unit) : "relative heat"}
          </Badge>
        </div>
        <div className="mt-3 h-[220px] rounded-md border border-white/10 bg-black p-3">
          {temperatureData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="index" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                  formatter={(value) => [formatTemperature(typeof value === "number" ? value : undefined, unit), "temperature"]}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line type="monotone" dataKey="temperature" stroke={color} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
              Select a calibrated temperature channel to show Fahrenheit, Celsius, or Kelvin traces.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function PressureField({ blob, samples: explicitSamples }: { blob: LibraryBlob | null; samples?: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const samples = explicitSamples ?? blob?.preview_samples ?? []
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    let frame = 0
    let animation = 0
    const points = Array.from({ length: 72 }, (_, index) => ({
      x: (index % 12) / 11,
      y: Math.floor(index / 12) / 5,
    }))

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      context.clearRect(0, 0, width, height)
      context.fillStyle = "rgba(2, 6, 23, 1)"
      context.fillRect(0, 0, width, height)

      if (!samples.length) {
        context.fillStyle = "rgba(148, 163, 184, 0.88)"
        context.font = "13px sans-serif"
        context.fillText("Select a tactile file to render the pressure field.", 18, height / 2)
        return
      }

      for (const [index, point] of points.entries()) {
        const value = Math.abs(samples[(index * 3 + frame) % samples.length] ?? 0)
        const radius = 7 + value * 28
        const x = 28 + point.x * (width - 56)
        const y = 28 + point.y * (height - 56)
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, `rgba(251, 191, 36, ${0.8 + value * 0.2})`)
        gradient.addColorStop(1, "rgba(251, 191, 36, 0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }

      frame += 1
      animation = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animation)
  }, [blob, explicitSamples])

  return <canvas ref={canvasRef} width={840} height={260} className="h-[260px] w-full rounded-md border border-white/10 bg-black" />
}

function TactilePlaybackPanel({ blob, color }: { blob: LibraryBlob | null; color: string }) {
  const previewChannels = useMemo(() => [...(blob?.preview_channels ?? []), ...(blob?.actuator_channels ?? [])], [blob])
  const pressureChannel = useMemo(
    () => findChannel(previewChannels, ["pressure", "touch", "force", "load", "tactile"]),
    [previewChannels],
  )
  const pressureSamples = useMemo(
    () => channelSamples(pressureChannel).length ? channelSamples(pressureChannel) : numericPreviewSamples(blob),
    [blob, pressureChannel],
  )
  const accelChannels = useMemo(() => filterChannels(previewChannels, ["accelerometer", "accel", "imu", "motion"]), [previewChannels])
  const actuatorChannels = useMemo(
    () => filterChannels(previewChannels, ["actuator", "motor", "servo", "stepper", "propeller", "leg", "joint", "arm"]),
    [previewChannels],
  )
  const vibrationChannel = useMemo(() => findChannel(previewChannels, ["vibration", "vibe", "oscillation"]), [previewChannels])
  const vibrationSamples = useMemo(() => channelSamples(vibrationChannel), [vibrationChannel])
  const movementData = useMemo(() => {
    const channels = accelChannels
      .map((channel, index) => ({
        key: channel.axis?.toLowerCase() || ["x", "y", "z"][index] || `axis_${index + 1}`,
        samples: channelSamples(channel),
      }))
      .filter((channel) => channel.samples.length)
      .slice(0, 4)
    return multiChannelChartData(channels)
  }, [accelChannels])
  const actuatorData = useMemo(() => {
    const channels = actuatorChannels
      .map((channel, index) => ({ key: `a${index + 1}`, samples: channelSamples(channel), label: channelLabel(channel), unit: channel.unit }))
      .filter((channel) => channel.samples.length)
      .slice(0, 8)
    return { channels, rows: multiChannelChartData(channels) }
  }, [actuatorChannels])
  const vibrationData = useMemo(() => {
    const samples = sampledSeries(vibrationSamples, 64)
    return samples.map((sample, index) => ({ index, value: Math.abs(normalizeSample(sample)) }))
  }, [vibrationSamples])
  const pressureData = useMemo(
    () => sampledSeries(pressureSamples, 80).map((sample, index) => ({ index, value: normalizeSample(sample), pressure: Math.abs(normalizeSample(sample)) * 100 })),
    [pressureSamples],
  )

  return (
    <div className="grid gap-3 2xl:grid-cols-2">
      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Hand className="h-4 w-4 text-amber-200" />
            Pressure and touch
          </p>
          <Badge variant="outline" className="border-white/15 text-gray-300">
            {pressureSamples.length.toLocaleString()} samples
          </Badge>
        </div>
        <div className="mt-3 space-y-3">
          <PressureField blob={blob} samples={pressureSamples} />
          {pressureData.length ? (
            <div className="h-[150px] rounded-md border border-white/10 bg-black p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pressureData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  <Line type="monotone" dataKey="pressure" stroke="#fbbf24" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Activity className="h-4 w-4 text-cyan-200" />
            Movement
          </p>
          <Badge variant="outline" className="border-white/15 text-gray-300">
            {accelChannels.length.toLocaleString()} axes
          </Badge>
        </div>
        <div className="mt-3 h-[240px] rounded-md border border-white/10 bg-black p-3">
          {movementData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="index" hide />
                <YAxis hide domain={[-1, 1]} />
                <Tooltip
                  contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line type="monotone" dataKey="x" stroke="#67e8f9" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="y" stroke="#a7f3d0" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="z" stroke="#fda4af" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="axis_4" stroke="#d8b4fe" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
              No accelerometer or motion channels found in the selected file.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Radio className="h-4 w-4 text-purple-200" />
            Vibration
          </p>
          <Badge variant="outline" className="border-white/15 text-gray-300">
            {vibrationSamples.length.toLocaleString()} samples
          </Badge>
        </div>
        <div className="mt-3 flex h-[220px] items-end gap-1 rounded-md border border-white/10 bg-black p-3">
          {vibrationData.length ? (
            vibrationData.map((sample) => (
              <div
                key={sample.index}
                className="min-w-0 flex-1 rounded-t bg-purple-300/80"
                style={{ height: `${Math.max(4, sample.value * 100)}%` }}
              />
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center text-sm leading-6 text-gray-500">
              No vibration channel found in the selected file.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Zap className="h-4 w-4 text-lime-200" />
            Actuators and motors
          </p>
          <Badge variant="outline" className="border-white/15 text-gray-300">
            {actuatorData.channels.length.toLocaleString()} channels
          </Badge>
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {actuatorData.channels.map((channel) => {
              const latest = Math.abs(normalizeSample(channel.samples[channel.samples.length - 1] ?? 0))
              return (
                <div key={channel.key} className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{channel.label}</p>
                    <span className="font-mono text-xs text-gray-400">{channel.unit || "signal"}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.max(3, latest * 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="h-[170px] rounded-md border border-white/10 bg-black p-3">
            {actuatorData.rows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={actuatorData.rows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide domain={[-1, 1]} />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  {actuatorData.channels.map((channel, index) => (
                    <Line
                      key={channel.key}
                      type="monotone"
                      dataKey={channel.key}
                      stroke={["#bef264", "#67e8f9", "#fbbf24", "#fda4af", "#d8b4fe", "#a7f3d0", "#fdba74", "#93c5fd"][index] ?? color}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
                No actuator, motor, servo, stepper, propeller, leg, joint, or arm channels found in the selected file.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function ChemicalPlaybackPanel({ blob, color }: { blob: LibraryBlob | null; color: string }) {
  const channels = useMemo(() => blob?.preview_channels ?? [], [blob?.preview_channels])
  const gasChannels = useMemo(
    () => filterChannels(channels, ["voc", "vsc", "gas", "bme688", "bme690", "humidity", "moisture", "temperature", "pressure"]),
    [channels],
  )
  const particleChannels = useMemo(() => filterChannels(channels, ["bmv080", "pm1", "pm2.5", "pm10", "particle", "particulate"]), [channels])
  const chemicalChartChannels = useMemo(
    () =>
      [...gasChannels, ...particleChannels]
        .map((channel, index) => ({
          key:
            channel.kind?.toLowerCase().replace(/[^a-z0-9]+/g, "_") ||
            channel.label?.toLowerCase().replace(/[^a-z0-9]+/g, "_") ||
            `c${index + 1}`,
          label: channelLabel(channel),
          samples: channelSamples(channel),
        }))
        .filter((channel) => channel.samples.length)
        .slice(0, 8),
    [gasChannels, particleChannels],
  )
  const chemicalData = useMemo(() => {
    return chemicalChartChannels.length ? multiChannelChartData(chemicalChartChannels) : []
  }, [chemicalChartChannels])
  const fingerprints = blob?.chemical_fingerprints ?? []
  const chemicalPalette = ["#bef264", "#67e8f9", "#fbbf24", "#fda4af", "#d8b4fe", "#a7f3d0", "#fdba74", "#93c5fd"]

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Beaker className="h-4 w-4 text-lime-200" />
              Bosch gas and particle playback
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              VOC, VSC, gas-resistance, humidity, moisture, temperature, and particulate blob analysis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["BME688", "BME690", "BMV080", "VOC", "VSC", "PM1", "PM2.5", "PM10"].map((label) => (
              <Badge key={label} variant="outline" className="border-lime-500/30 text-lime-100">
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="h-[300px] rounded-md border border-white/10 bg-black p-3">
            {chemicalData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chemicalData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                    labelStyle={{ color: "#e5e7eb" }}
                  />
                  {chemicalChartChannels.map((channel, index) => (
                    <Line
                      key={channel.key}
                      type="monotone"
                      dataKey={channel.key}
                      stroke={chemicalPalette[index] ?? color}
                      dot={false}
                      strokeWidth={2}
                      name={channel.label}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
                Select a parsed chemical blob to render real gas or particle channels.
              </div>
            )}
          </div>

          <div className="grid content-start gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">gas channels</p>
                <p className="mt-1 font-mono text-lg text-white">{gasChannels.length.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">particle channels</p>
                <p className="mt-1 font-mono text-lg text-white">{particleChannels.length.toLocaleString()}</p>
              </div>
            </div>

            <section className="rounded-md border border-white/10 bg-black/35 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Wind className="h-4 w-4 text-lime-200" />
                Fingerprints
              </p>
              <div className="mt-3 space-y-2">
                {fingerprints.map((fingerprint, index) => (
                  <div key={`${fingerprint.id ?? fingerprint.label ?? "fingerprint"}-${index}`} className="rounded-md border border-lime-400/20 bg-lime-400/10 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{fingerprint.label || fingerprint.class_name || "Chemical fingerprint"}</p>
                        <p className="mt-1 truncate text-xs text-gray-400">{fingerprint.sensor_model || fingerprint.source || "sensor profile"}</p>
                      </div>
                      <span className="shrink-0 rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-lime-100">
                        {confidenceLabel(fingerprint.confidence)}
                      </span>
                    </div>
                  </div>
                ))}

                {!fingerprints.length ? (
                  <div className="rounded-md border border-white/10 bg-black/35 px-3 py-6 text-center text-sm leading-6 text-gray-500">
                    No classified gas fingerprints in this file yet.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>

      <SignalChart blob={blob} color={color} />
    </div>
  )
}

function SpectralFieldCanvas({ blob, features }: { blob: LibraryBlob | null; features: SpectralFeature[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const samples = blob?.preview_samples ?? []
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    let frame = 0
    let animation = 0

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      context.clearRect(0, 0, width, height)
      context.fillStyle = "rgb(2, 6, 23)"
      context.fillRect(0, 0, width, height)

      if (!samples.length) {
        context.fillStyle = "rgba(148, 163, 184, 0.88)"
        context.font = "13px sans-serif"
        context.fillText("Select a spectral file to render color, radar, radio, or spatial data.", 18, height / 2)
        return
      }

      const cols = 34
      const rows = 18
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const index = (x * 5 + y * 17 + frame) % samples.length
          const value = Math.abs(normalizeSample(samples[index] ?? 0))
          const depth = Math.sin((x / cols) * Math.PI) * Math.cos((y / rows) * Math.PI)
          const red = Math.floor(30 + value * 210 + Math.max(0, depth) * 40)
          const green = Math.floor(50 + (1 - value) * 110 + y * 2)
          const blue = Math.floor(90 + value * 120 + x * 2)
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.42 + value * 0.48})`
          context.fillRect((x / cols) * width, (y / rows) * height, width / cols + 1, height / rows + 1)
        }
      }

      context.strokeStyle = "rgba(255,255,255,0.22)"
      context.lineWidth = 1
      for (let index = 0; index < Math.min(features.length || 5, 9); index += 1) {
        const radius = 24 + index * 18 + ((frame + index * 8) % 34)
        context.beginPath()
        context.arc(width * 0.72, height * 0.45, radius, 0, Math.PI * 2)
        context.stroke()
      }

      frame += 1
      animation = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animation)
  }, [blob, features])

  return <canvas ref={canvasRef} width={900} height={320} className="h-[320px] w-full rounded-md border border-white/10 bg-black" />
}

function SpectralPlaybackPanel({
  blob,
  color,
  isImage,
  isVideo,
}: {
  blob: LibraryBlob | null
  color: string
  isImage: boolean
  isVideo: boolean
}) {
  const channels = useMemo(() => blob?.preview_channels ?? [], [blob?.preview_channels])
  const spatialChannels = useMemo(() => filterChannels(channels, ["lidar", "radar", "depth", "point", "range", "distance"]), [channels])
  const radioChannels = useMemo(() => filterChannels(channels, ["wifi", "wi-fi", "bluetooth", "radio", "rf", "rssi", "ble"]), [channels])
  const radiationChannels = useMemo(() => filterChannels(channels, ["radiation", "geiger", "cpm", "sievert", "gamma"]), [channels])
  const infraredChannels = useMemo(() => filterChannels(channels, ["infrared", "ir", "thermal", "video", "camera", "color"]), [channels])
  const features = blob?.spectral_features ?? []
  const signatureData = useMemo(() => chartDataFromSamples(blob, 140), [blob])

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/10 bg-black/45 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <ScanLine className="h-4 w-4 text-cyan-200" />
              Spectral spatial player
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              LiDAR, radar, radiation, Wi-Fi, Bluetooth, video, color, infrared, radio, and electronic spectrum playback.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["3D color", "LiDAR", "Radar", "Radiation", "Wi-Fi", "Bluetooth", "Radio", "Infrared", "Video"].map((label) => (
              <Badge key={label} variant="outline" className="border-cyan-500/30 text-cyan-100">
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {blob && isImage ? <img src={blob.stream_url} alt={blob.name} className="max-h-[360px] w-full rounded-md border border-white/10 object-contain" /> : null}
            {blob && isVideo ? <video controls src={blob.stream_url} className="max-h-[360px] w-full rounded-md border border-white/10" /> : null}
            <SpectralFieldCanvas blob={blob} features={features} />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">spatial</p>
                <p className="mt-1 font-mono text-lg text-white">{spatialChannels.length.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">radio</p>
                <p className="mt-1 font-mono text-lg text-white">{radioChannels.length.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">radiation</p>
                <p className="mt-1 font-mono text-lg text-white">{radiationChannels.length.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
                <p className="text-xs text-gray-500">visual</p>
                <p className="mt-1 font-mono text-lg text-white">{infraredChannels.length.toLocaleString()}</p>
              </div>
            </div>

            <section className="rounded-md border border-white/10 bg-black/35 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Radar className="h-4 w-4 text-cyan-200" />
                Signatures
              </p>
              <div className="mt-3 space-y-2">
                {features.slice(0, 6).map((feature, index) => (
                  <div key={`${feature.id ?? feature.label ?? "feature"}-${index}`} className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{feature.label || feature.kind || "Spectral feature"}</p>
                        <p className="mt-1 truncate text-xs text-gray-400">{feature.band || [feature.value, feature.unit].filter(Boolean).join(" ") || "band unknown"}</p>
                      </div>
                      <span className="shrink-0 rounded border border-white/15 bg-black/35 px-2 py-1 text-xs text-cyan-100">
                        {confidenceLabel(feature.confidence)}
                      </span>
                    </div>
                  </div>
                ))}
                {!features.length ? (
                  <div className="rounded-md border border-white/10 bg-black/35 px-3 py-6 text-center text-sm leading-6 text-gray-500">
                    No classified spectral signatures in this file yet.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="h-[210px] rounded-md border border-white/10 bg-black p-3">
        {signatureData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={signatureData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="index" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Area type="monotone" dataKey="scaled" stroke="none" fill="#06b6d4" fillOpacity={0.18} name="energy" />
              <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} name="signature" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-500">
            Select a spectral file to inspect its signature trace.
          </div>
        )}
      </div>
    </div>
  )
}

function SignalChart({ blob, color }: { blob: LibraryBlob | null; color: string }) {
  const data = useMemo(() => chartDataFromSamples(blob), [blob])
  if (!data.length) return null

  return (
    <div className="h-[180px] rounded-md border border-white/10 bg-black p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="index" hide />
          <YAxis hide domain={[-1, 1]} />
          <Tooltip
            contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(255,255,255,0.16)", color: "white" }}
            labelStyle={{ color: "#e5e7eb" }}
          />
          <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function LibraryPlayer({
  blob,
  activeCategory,
  onClassified,
}: {
  blob: LibraryBlob | null
  activeCategory: CategoryUi
  onClassified?: (blobId: string, payload: unknown) => void
}) {
  const colors = colorClasses(activeCategory.color)
  const signalBuffer = useMemo(() => buildSignalBuffer(blob), [blob])
  const extension = blob?.extension.toLowerCase() ?? ""
  const mimeType = blob?.mime_type.toLowerCase() ?? ""
  const isAudio = mimeType.startsWith("audio/") || ["wav", "mp3", "flac", "ogg", "m4a", "aac"].some((ext) => extension.includes(ext))
  const isVideo = mimeType.startsWith("video/")
  const isImage = mimeType.startsWith("image/")
  const hasKnownRenderer = KNOWN_CATEGORY_IDS.has(activeCategory.id)

  return (
    <section className="min-h-[520px] rounded-md border border-white/10 bg-black/35 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-white">
            <Activity className={`h-4 w-4 ${colors.text}`} />
            Player
          </p>
          <p className="mt-1 truncate text-xs text-gray-500">{blob ? blob.relative_path : "No file selected"}</p>
        </div>
        {blob ? (
          <Button asChild size="sm" variant="outline" className="border-white/15 bg-black/30 text-gray-200 hover:bg-white/10">
            <a href={blob.stream_url} download={blob.name}>
              <Download className="mr-2 h-4 w-4" />
              Open
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {!blob ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-md border border-white/10 bg-black px-4 text-center text-sm leading-6 text-gray-500">
            Select a file from the {activeCategory.label.toLowerCase()} library to load real playback, evidence, metadata, and visualizations.
          </div>
        ) : (
          <>
            {activeCategory.id === "acoustic" ? (
              <>
                <SineAcousticPanel blob={blob} color={colors.line} onClassified={onClassified} />
              </>
            ) : null}

            {activeCategory.id === "bioelectric" ? (
              <>
                <Oscilloscope className="min-h-[420px] rounded-md border border-white/10" signalBuffer={signalBuffer} />
                <SpectrumAnalyzer className="min-h-[360px] rounded-md border border-white/10" signalBuffer={signalBuffer} />
              </>
            ) : null}

            {activeCategory.id === "spectral" ? (
              <>
                <SpectralPlaybackPanel blob={blob} color={colors.line} isImage={isImage} isVideo={isVideo} />
              </>
            ) : null}

            {activeCategory.id === "chemical" ? (
              <>
                <ChemicalPlaybackPanel blob={blob} color={colors.line} />
              </>
            ) : null}

            {activeCategory.id === "thermal" ? (
              <>
                <ThermalPlaybackPanel blob={blob} color={colors.line} isImage={isImage} isVideo={isVideo} />
              </>
            ) : null}

            {activeCategory.id === "tactile" ? (
              <>
                <TactilePlaybackPanel blob={blob} color={colors.line} />
              </>
            ) : null}

            {!hasKnownRenderer ? (
              <>
                {isAudio ? <audio controls src={blob.stream_url} className="w-full" preload="metadata" /> : null}
                {isVideo ? <video controls src={blob.stream_url} className="max-h-[360px] w-full rounded-md border border-white/10" /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {isImage ? <img src={blob.stream_url} alt={blob.name} className="max-h-[360px] w-full rounded-md border border-white/10 object-contain" /> : null}
                {!isAudio && !isVideo && !isImage && !blob.preview_samples?.length ? (
                  <div className="flex h-14 items-center justify-center rounded-md border border-white/10 bg-black text-sm text-gray-500">
                    Select a file to inspect its stream, preview samples, and metadata.
                  </div>
                ) : null}
                {blob.preview_samples?.length ? (
                  <>
                    <AnimatedWaveform blob={blob} color={colors.line} />
                    <SignalChart blob={blob} color={colors.line} />
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function MetadataPanel({ blob }: { blob: LibraryBlob | null }) {
  if (!blob) {
    return (
      <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <Fingerprint className="h-4 w-4 text-orange-300" />
          File details
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-500">Select a file to show source, format, playback, sensor, size, timing, and fingerprint details.</p>
      </section>
    )
  }

  const details = [
    ["source", labelForFileSource(blob)],
    ["dataset", blob.origin_dataset_id || "dataset unknown"],
    ["label", labelForFileClass(blob)],
    ["environment", blob.acoustic_environment || "environment unknown"],
    ["sensor", blob.sensor_type],
    ["category", blob.category],
    ["format", blob.format || blob.extension.replace(".", "").toUpperCase() || blob.mime_type],
    ["media", blob.playback_class || blob.mime_type],
    ["rate", formatSampleRate(blob.sample_rate_hz)],
    ["duration", formatDuration(blob.duration_sec)],
    ["channels", blob.channels ? blob.channels.toLocaleString() : "channels unknown"],
    ["size", formatBytes(blob.size_bytes)],
    ["modified", formatDate(blob.modified_at)],
    ["captured", blob.capture_time_utc ? formatDate(blob.capture_time_utc) : "capture time unknown"],
    ["split", blob.training_split || "split unknown"],
    ["fold", blob.fold_id !== null && blob.fold_id !== undefined ? String(blob.fold_id) : "fold unknown"],
    ["license", blob.license || "license unknown"],
    ["codec", blob.codec || "codec pending"],
  ]

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <Fingerprint className="h-4 w-4 text-orange-300" />
          File details
        </p>
        <Badge variant="outline" className={blob.unsupported_codec ? "border-rose-500/35 text-rose-200" : "border-emerald-500/30 text-emerald-200"}>
          {blob.unsupported_codec ? "needs format work" : blob.needs_transcode ? "transcode ready" : "playable"}
        </Badge>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-white">{blob.name}</p>
      {blob.description ? <p className="mt-1 text-xs leading-5 text-gray-400">{blob.description}</p> : null}
      <p className="mt-1 break-words text-xs leading-4 text-gray-500">{blob.relative_path}</p>
      <div className="mt-3 space-y-2">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[86px_minmax(0,1fr)] gap-2 rounded border border-white/10 bg-black/30 px-2 py-2 text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="min-w-0 truncate text-gray-200">{value}</span>
          </div>
        ))}
        <div className="rounded border border-white/10 bg-black/30 px-2 py-2 text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <Hash className="h-3 w-3" />
            fingerprint
          </span>
          <p className="mt-1 break-all font-mono text-[11px] leading-4 text-gray-300">{blob.checksum || blob.id}</p>
        </div>
      </div>
    </section>
  )
}

function FileListPanel({
  blobs,
  selectedBlob,
  setSelectedBlobId,
  loading,
  activeCategory,
  colors,
  rootStatus,
  message,
  totalFiles,
}: {
  blobs: LibraryBlob[]
  selectedBlob: LibraryBlob | null
  setSelectedBlobId: (id: string) => void
  loading: boolean
  activeCategory: CategoryUi
  colors: ReturnType<typeof colorClasses>
  rootStatus: LibraryCatalog["root_status"]
  message?: string
  totalFiles: number
}) {
  const [fileFilter, setFileFilter] = useState("")
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const groupedBlobs = useMemo(() => {
    const groups = new Map<string, LibraryBlob[]>()
    for (const blob of blobs) {
      const label = labelForFileSource(blob)
      groups.set(label, [...(groups.get(label) ?? []), blob])
    }
    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        bytes: items.reduce((total, blob) => total + blob.size_bytes, 0),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
  }, [blobs])

  useEffect(() => {
    if (!groupedBlobs.length) {
      if (activeGroup !== null) setActiveGroup(null)
      return
    }
    if (!activeGroup || !groupedBlobs.some((group) => group.label === activeGroup)) {
      setActiveGroup(groupedBlobs[0]?.label ?? null)
    }
  }, [activeGroup, groupedBlobs])

  useEffect(() => {
    setPage(0)
  }, [activeGroup, fileFilter, blobs])

  const activeGroupData = groupedBlobs.find((group) => group.label === activeGroup) ?? groupedBlobs[0] ?? null
  const trimmedFilter = fileFilter.trim().toLowerCase()
  const filteredFiles = useMemo(() => {
    const files = activeGroupData?.items ?? []
    if (!trimmedFilter) return files
    return files.filter((blob) => fileSearchText(blob).includes(trimmedFilter))
  }, [activeGroupData, trimmedFilter])
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FILE_BROWSER_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visibleFiles = filteredFiles.slice(
    safePage * FILE_BROWSER_PAGE_SIZE,
    safePage * FILE_BROWSER_PAGE_SIZE + FILE_BROWSER_PAGE_SIZE,
  )
  const rangeStart = filteredFiles.length ? safePage * FILE_BROWSER_PAGE_SIZE + 1 : 0
  const rangeEnd = Math.min(filteredFiles.length, (safePage + 1) * FILE_BROWSER_PAGE_SIZE)
  const hasFilter = trimmedFilter.length > 0
  const storageUnavailable = !loading && rootStatus !== "mounted" && !blobs.length
  const emptyMessage = storageUnavailable
    ? message || "MINDEX Library storage is unavailable for this request. Refresh when VM storage and deployment are back online."
    : hasFilter
      ? `No ${activeCategory.label.toLowerCase()} files match this filter.`
      : activeGroupData
        ? `No files loaded in ${activeGroupData.label}.`
        : `No ${activeCategory.label.toLowerCase()} files loaded from MINDEX Library storage.`

  useEffect(() => {
    if (!visibleFiles.length) return
    if (!selectedBlob || !visibleFiles.some((blob) => blob.id === selectedBlob.id)) {
      setSelectedBlobId(visibleFiles[0]?.id ?? "")
    }
  }, [selectedBlob, setSelectedBlobId, visibleFiles])

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <Database className="h-4 w-4 text-orange-300" />
          Files
        </p>
        <Badge variant="outline" className="border-white/15 text-gray-300">
          {loading
            ? "loading"
            : storageUnavailable
              ? "unavailable"
              : `${filteredFiles.length.toLocaleString()} / ${totalFiles.toLocaleString()}`}
        </Badge>
      </div>

      <div className="mt-3 space-y-3">
        <div className="rounded-md border border-white/10 bg-black/25 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-gray-500">
              <FolderTree className="h-3.5 w-3.5" />
              File groups
            </p>
            <span className="font-mono text-[11px] text-gray-500">{groupedBlobs.length.toLocaleString()}</span>
          </div>
          <div className="mt-2 grid gap-2">
            {groupedBlobs.slice(0, 8).map((group) => {
              const active = group.label === activeGroupData?.label
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => setActiveGroup(group.label)}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border px-2 py-2 text-left transition ${
                    active ? `${colors.border} ${colors.bg}` : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-white">{group.label}</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">{formatBytes(group.bytes)}</span>
                  </span>
                  <span className="shrink-0 rounded border border-white/10 bg-black/35 px-2 py-1 font-mono text-[11px] text-gray-300">
                    {group.items.length.toLocaleString()}
                  </span>
                </button>
              )
            })}
            {!loading && !groupedBlobs.length ? (
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-4 text-sm leading-6 text-gray-500">
                File groups will appear when MINDEX returns real library files.
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={fileFilter}
            onChange={(event) => setFileFilter(event.target.value)}
            placeholder="Filter visible files instantly"
            className="h-10 border-white/10 bg-black/40 pl-9 text-sm text-white"
          />
        </div>

        <div className="rounded-md border border-white/10 bg-black/25 p-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="min-w-0 truncate text-[11px] uppercase tracking-[0.08em] text-gray-500">
              {activeGroupData?.label ?? activeCategory.label}
            </p>
            <span className="shrink-0 font-mono text-[11px] text-gray-500">
              {rangeStart}-{rangeEnd} / {filteredFiles.length.toLocaleString()}
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {visibleFiles.map((blob, index) => {
              const active = blob.id === selectedBlob?.id
              const formatLabel = blob.format || blob.extension.replace(".", "").toUpperCase() || blob.playback_class || "file"
              return (
                <button
                  key={libraryBlobUiKey(blob, index)}
                  type="button"
                  onClick={() => setSelectedBlobId(blob.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    active ? `${colors.border} ${colors.bg}` : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{blob.name}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{blob.filename || blob.relative_path}</p>
                    </div>
                    <span className="shrink-0 rounded border border-white/10 bg-black/35 px-2 py-1 font-mono text-[11px] text-gray-300">
                      {formatBytes(blob.size_bytes)}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-gray-400">
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{labelForFileClass(blob)}</span>
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{blob.acoustic_environment || blob.sensor_type}</span>
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{formatLabel}</span>
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{formatSampleRate(blob.sample_rate_hz)}</span>
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{formatDuration(blob.duration_sec)}</span>
                    <span className="truncate rounded border border-white/10 bg-black/25 px-2 py-1">{blob.training_split || blob.locale || "cataloged"}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`${colors.border} ${colors.text} max-w-[150px] truncate`}>
                      {labelForFileSource(blob)}
                    </Badge>
                    <span className="shrink-0 font-mono text-[11px] text-gray-500">{compactHash(blob.checksum || blob.id)}</span>
                  </div>
                </button>
              )
            })}

            {!loading && !visibleFiles.length ? (
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-8 text-center text-sm leading-6 text-gray-500">
                {emptyMessage}
              </div>
            ) : null}
          </div>

          {filteredFiles.length > FILE_BROWSER_PAGE_SIZE ? (
            <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage <= 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="h-9 w-11 border-white/10 bg-black/30 text-gray-200 hover:bg-white/10 disabled:opacity-35"
                aria-label="Previous file page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-center font-mono text-xs text-gray-500">
                Page {(safePage + 1).toLocaleString()} / {totalPages.toLocaleString()}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                className="h-9 w-11 border-white/10 bg-black/30 text-gray-200 hover:bg-white/10 disabled:opacity-35"
                aria-label="Next file page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function LibrarySection({ fieldDevices: _fieldDevices }: { fieldDevices?: MindexFieldDeviceSummary | null }) {
  const [activeCategoryId, setActiveCategoryId] = useState<LibraryCategoryId>("acoustic")
  const [query, setQuery] = useState("")
  const [selectedBlobId, setSelectedBlobId] = useState<string | null>(null)
  const [classificationPatches, setClassificationPatches] = useState<Record<string, Partial<LibraryBlob>>>({})
  const { catalog, loading, error, refresh } = useLibraryCatalog(activeCategoryId, query)

  const categories = useMemo<CategoryView[]>(() => {
    const summaries = new Map(catalog.categories.map((category) => [category.id, category]))
    const knownCategories = CATEGORY_UI.map((category) => ({
      ...category,
      summary: summaries.get(category.id) ?? {
        id: category.id,
        label: category.label,
        description: category.description,
        count: 0,
        bytes: 0,
      },
    }))
    const dynamicCategories = catalog.categories
      .filter((category) => !CATEGORY_BY_ID.has(category.id))
      .map((summary) => ({
        ...dynamicCategoryFromSummary(summary),
        summary,
      }))

    return [...knownCategories, ...dynamicCategories]
  }, [catalog.categories])

  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ??
    CATEGORY_BY_ID.get(activeCategoryId) ??
    dynamicCategoryFromSummary({
      id: activeCategoryId,
      label: labelFromCategoryId(activeCategoryId),
      description: "Files and recordings from MINDEX Library storage.",
      count: 0,
      bytes: 0,
    })
  const ActiveIcon = activeCategory.icon
  const activeColors = colorClasses(activeCategory.color)
  const storageConnected = catalog.root_status === "mounted"
  const storage = catalog.storage
  const sine = catalog.sine
  const isSineCategory = activeCategory.id === "acoustic"

  useEffect(() => {
    if (!catalog.blobs.length) {
      setSelectedBlobId(null)
      return
    }

    if (!selectedBlobId || !catalog.blobs.some((blob) => blob.id === selectedBlobId)) {
      setSelectedBlobId(catalog.blobs[0]?.id ?? null)
    }
  }, [catalog.blobs, selectedBlobId])

  const rawSelectedBlob = useMemo(
    () => catalog.blobs.find((blob) => blob.id === selectedBlobId) ?? catalog.blobs[0] ?? null,
    [catalog.blobs, selectedBlobId],
  )
  const selectedBaseBlob = useMemo(() => {
    if (!rawSelectedBlob) return null
    const patch = classificationPatches[rawSelectedBlob.id]
    return patch ? { ...rawSelectedBlob, ...patch } : rawSelectedBlob
  }, [classificationPatches, rawSelectedBlob])
  const handleClassified = useCallback((blobId: string, payload: unknown) => {
    const patch = classificationPatchFromPayload(payload)
    setClassificationPatches((current) => ({
      ...current,
      [blobId]: {
        ...(current[blobId] ?? {}),
        ...patch,
      },
    }))
  }, [])
  const decodedAudioPreview = useDecodedAudioPreview(selectedBaseBlob)
  const selectedBlob = useMemo(() => {
    if (!selectedBaseBlob) return null
    if (!decodedAudioPreview || decodedAudioPreview.blobId !== selectedBaseBlob.id) return selectedBaseBlob
    return {
      ...selectedBaseBlob,
      preview_samples: decodedAudioPreview.samples,
      sample_rate_hz: decodedAudioPreview.sampleRate,
      duration_sec: selectedBaseBlob.duration_sec ?? decodedAudioPreview.durationSec,
      frequency_detections: selectedBaseBlob.frequency_detections?.length
        ? selectedBaseBlob.frequency_detections
        : decodedAudioPreview.frequencyDetections,
      activity_segments: selectedBaseBlob.activity_segments?.length
        ? selectedBaseBlob.activity_segments
        : decodedAudioPreview.activitySegments,
      preview_source: "metadata" as const,
    }
  }, [decodedAudioPreview, selectedBaseBlob])

  return (
    <div className="min-h-[calc(100dvh-168px)] overflow-hidden rounded-md border border-orange-500/25 bg-black/45 shadow-[0_0_40px_rgba(249,115,22,0.08)]">
      <div className="border-b border-white/10 bg-black/45 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Disc3 className="h-5 w-5 text-orange-300" />
              Library
            </h3>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-400">
              Live sensor recordings, files, fingerprints, and playback from MINDEX Library storage.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            {isSineCategory ? (
              <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Acoustic files, filters, and playback live inside SINE.
              </div>
            ) : (
              <div className="relative min-w-0 sm:w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search files, sensors, groups"
                  className="min-h-[44px] border-orange-500/30 bg-black/60 pl-10 text-white"
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={refresh}
              className="min-h-[44px] border-orange-500/30 bg-black/40 text-orange-100 hover:bg-orange-500/10"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[calc(100dvh-254px)] xl:grid-cols-[292px_minmax(0,1fr)_340px]">
        <aside className="border-b border-white/10 bg-black/30 xl:border-b-0 xl:border-r xl:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <FolderTree className="h-4 w-4 text-orange-300" />
              Categories
            </p>
            <Badge variant="outline" className="border-orange-500/35 text-orange-200">
              {catalog.total_files.toLocaleString()} files
            </Badge>
          </div>

          <div className="max-h-[310px] overflow-auto xl:max-h-none">
            {categories.map((category) => {
              const Icon = category.icon
              const colors = colorClasses(category.color)
              const active = category.id === activeCategory.id

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`grid w-full grid-cols-[26px_minmax(0,1fr)] gap-2 border-b border-white/10 px-3 py-3 text-left transition ${
                    active ? colors.bg : "hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className={`mt-1 h-4 w-4 ${active ? colors.text : "text-gray-500"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">{category.label}</p>
                      <span className="font-mono text-xs text-gray-400">{category.summary.count.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-500">
                      {category.sensors.length ? category.sensors.join(", ") : category.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">{formatBytes(category.summary.bytes)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {isSineCategory ? (
              <main className="h-[680px] min-h-0 min-w-0 overflow-hidden bg-black/20 xl:col-span-2">
                <SineAcousticPlayer embedded compact />
              </main>
        ) : (
          <>
        <main className="flex min-h-[680px] min-w-0 flex-col border-b border-white/10 bg-black/20 xl:border-b-0 xl:border-r xl:border-white/10">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <ActiveIcon className={`h-5 w-5 ${activeColors.text}`} />
                  {activeCategory.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-400">{activeCategory.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`${activeColors.border} ${activeColors.text}`}>
                  {catalog.blobs.length.toLocaleString()} shown
                </Badge>
                <Badge variant="outline" className="border-white/15 text-gray-300">
                  {formatBytes(catalog.total_bytes)}
                </Badge>
              </div>
            </div>
          </div>

          {error ? (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-1 flex-col p-4">
            <LibraryPlayer blob={selectedBlob} activeCategory={activeCategory} onClassified={handleClassified} />
          </div>
        </main>

        <aside className="flex min-h-[680px] flex-col bg-black/35">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Intake</h3>
            <p className="mt-1 text-sm leading-6 text-gray-400">Storage, files, selected-file context, and signal lanes.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <HardDrive className={`h-4 w-4 ${catalog.root_status === "mounted" ? "text-green-300" : "text-amber-300"}`} />
                Storage
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">status</p>
                  <p className="mt-1 text-sm font-medium text-white">{storageConnected ? (storage?.remote_nas ? "NAS connected" : "connected") : "not connected"}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">files</p>
                  <p className="mt-1 font-mono text-sm text-white">{catalog.total_files.toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">NAS free</p>
                  <p className="mt-1 font-mono text-sm text-white">{formatGigabytes(storage?.free_gb)}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">NAS total</p>
                  <p className="mt-1 font-mono text-sm text-white">{formatGigabytes(storage?.total_gb)}</p>
                </div>
              </div>
              {catalog.message ? (
                <p className={`mt-3 rounded border px-2 py-2 text-xs leading-5 ${
                  storageConnected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-amber-500/20 bg-amber-500/10 text-amber-100"
                }`}>
                  {catalog.message}
                </p>
              ) : null}
              {storage?.library_acoustic || storage?.mount_point ? (
                <p className="mt-2 break-all font-mono text-[11px] leading-4 text-gray-500">
                  {storage?.library_acoustic || storage?.mount_point}
                </p>
              ) : null}
            </section>

            <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <AudioLines className={`h-4 w-4 ${sine?.status === "ok" ? "text-emerald-300" : "text-gray-500"}`} />
                SINE
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">status</p>
                  <p className="mt-1 text-sm font-medium text-white">{sine?.status || "pending"}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">blobs</p>
                  <p className="mt-1 font-mono text-sm text-white">{(sine?.acoustic_blobs ?? catalog.total_files).toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">sources</p>
                  <p className="mt-1 font-mono text-sm text-white">{(sine?.library_sources ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="text-xs text-gray-500">detectors</p>
                  <p className="mt-1 font-mono text-sm text-white">{(sine?.detectors_registered ?? 0).toLocaleString()}</p>
                </div>
              </div>
              {sine?.default_detectors?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sine.default_detectors.slice(0, 6).map((detector) => (
                    <Badge key={detector} variant="outline" className="border-emerald-500/25 text-emerald-100">
                      {detector}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </section>

            <FileListPanel
              blobs={catalog.blobs}
              selectedBlob={selectedBlob}
              setSelectedBlobId={setSelectedBlobId}
              loading={loading}
              activeCategory={activeCategory}
              colors={activeColors}
              rootStatus={catalog.root_status}
              message={catalog.message}
              totalFiles={catalog.total_files}
            />

            <MetadataPanel blob={selectedBlob} />

            <section className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Radio className="h-4 w-4 text-purple-300" />
                Signal lanes
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-purple-500/30 text-purple-200">
                  <Bluetooth className="mr-1 h-3 w-3" />
                  Bluetooth
                </Badge>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                  <Radar className="mr-1 h-3 w-3" />
                  Radar
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-200">
                  <Mic className="mr-1 h-3 w-3" />
                  Audio
                </Badge>
                <Badge variant="outline" className="border-lime-500/30 text-lime-200">
                  <Wind className="mr-1 h-3 w-3" />
                  VOC
                </Badge>
                <Badge variant="outline" className="border-amber-500/30 text-amber-200">
                  <Gauge className="mr-1 h-3 w-3" />
                  pressure
                </Badge>
              </div>
            </section>
          </div>
        </aside>
          </>
        )}
      </div>
    </div>
  )
}
