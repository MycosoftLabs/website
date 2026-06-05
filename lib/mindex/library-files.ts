import { createHash } from "node:crypto"
import type { Dirent } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"

export type MindexLibraryCategoryId = "spectral" | "acoustic" | "bioelectric" | "chemical" | "thermal" | "tactile"

export interface MindexLibraryCategorySummary {
  id: MindexLibraryCategoryId
  label: string
  description: string
  count: number
  bytes: number
}

export interface MindexLibraryBlob {
  id: string
  name: string
  title?: string
  filename?: string
  description?: string
  relative_path: string
  category: MindexLibraryCategoryId
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
  source_id?: string
  source_name?: string
  source_url?: string
  origin_dataset_id?: string
  label_primary?: string
  label_secondary?: string
  acoustic_environment?: string
  nlm_subsystem?: string
  nlm_priority?: number | null
  fold_id?: string | number | null
  training_split?: string
  locale?: string
  capture_time_utc?: string
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
  identification_summary?: unknown
  deep_signal_matches?: unknown[]
  frequency_detections?: unknown[]
  activity_segments?: unknown[]
  bird_detections?: unknown[]
  uav_detections?: unknown[]
  nps_detections?: unknown[]
  wave_annotations?: unknown[]
  human_identifications?: unknown[]
  latest_human_identification?: unknown
}

export interface MindexLibraryStorageStatus {
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

export interface MindexSineStatus {
  status?: string
  product?: string
  url?: string
  acoustic_blobs?: number | null
  library_sources?: number | null
  detectors_registered?: number | null
  default_detectors?: string[]
}

export interface MindexLibraryCatalog {
  root_status: "mounted" | "missing"
  root_label: string
  categories: MindexLibraryCategorySummary[]
  blobs: MindexLibraryBlob[]
  total_files: number
  total_bytes: number
  storage?: MindexLibraryStorageStatus
  sine?: MindexSineStatus
  message?: string
}

const LIBRARY_CATEGORIES: Array<Omit<MindexLibraryCategorySummary, "count" | "bytes">> = [
  {
    id: "spectral",
    label: "Spectral",
    description: "LiDAR, radar, radiation, Geiger, hyperspectral, and field spectrum captures.",
  },
  {
    id: "acoustic",
    label: "Acoustic",
    description: "Hydrophone, transducer, microphone, ultrasonic, and environmental audio recordings.",
  },
  {
    id: "bioelectric",
    label: "Bioelectric",
    description: "Fungal compute, magnetic, radio, Wi-Fi, Bluetooth, and electrical signal captures.",
  },
  {
    id: "chemical",
    label: "Chemical",
    description: "VOC, VSC, BME688, BME690, humidity, moisture, and compound fingerprint blobs.",
  },
  {
    id: "thermal",
    label: "Thermal",
    description: "Infrared frames, temperature series, heat maps, and thermal profiles.",
  },
  {
    id: "tactile",
    label: "Tactile",
    description: "Pressure, strain, vibration, movement, and contact sensor recordings.",
  },
]

const CATEGORY_IDS = new Set<MindexLibraryCategoryId>(LIBRARY_CATEGORIES.map((category) => category.id))

const TEXT_EXTENSIONS = new Set([
  ".csv",
  ".json",
  ".jsonl",
  ".ndjson",
  ".txt",
  ".tsv",
  ".log",
  ".dat",
  ".npy",
])

const AUDIO_EXTENSIONS = new Set([".wav", ".wave", ".mp3", ".flac", ".ogg", ".oga", ".m4a", ".aac", ".webm"])

const CATEGORY_EXTENSION_HINTS: Record<MindexLibraryCategoryId, Set<string>> = {
  acoustic: AUDIO_EXTENSIONS,
  spectral: new Set([".las", ".laz", ".tif", ".tiff", ".h5", ".hdf5", ".nc", ".netcdf", ".csv", ".json"]),
  bioelectric: new Set([".csv", ".json", ".jsonl", ".ndjson", ".txt", ".dat", ".bin", ".h5", ".hdf5"]),
  chemical: new Set([".csv", ".json", ".jsonl", ".ndjson", ".txt", ".mol", ".sdf", ".smi", ".inchi"]),
  thermal: new Set([".csv", ".json", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".mp4"]),
  tactile: new Set([".csv", ".json", ".jsonl", ".ndjson", ".txt", ".dat", ".bin"]),
}

const SAMPLE_RATE_BY_CATEGORY: Record<MindexLibraryCategoryId, number> = {
  acoustic: 44_100,
  spectral: 2_048,
  bioelectric: 512,
  chemical: 12,
  thermal: 24,
  tactile: 96,
}

const DEFAULT_MAX_FILES = 750
const DEFAULT_MAX_DEPTH = 8

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>()
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    if (!seen.has(value)) seen.add(value)
  }
  return Array.from(seen)
}

export function mindexLibraryCategories(): MindexLibraryCategorySummary[] {
  return LIBRARY_CATEGORIES.map((category) => ({
    ...category,
    count: 0,
    bytes: 0,
  }))
}

export function encodeLibraryBlobId(relativePath: string): string {
  return Buffer.from(relativePath, "utf8").toString("base64url")
}

export function decodeLibraryBlobId(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8")
}

export function getLibraryCandidateRoots(): string[] {
  const configured = uniqueStrings([
    process.env.MINDEX_LIBRARY_ROOT,
    process.env.MINDEX_NAS_LIBRARY_ROOT,
    process.env.NAS_LIBRARY_ROOT,
    process.env.MINDEX_NAS_MOUNT ? path.join(process.env.MINDEX_NAS_MOUNT, "Library") : undefined,
    process.env.NAS_MOUNT_PATH ? path.join(process.env.NAS_MOUNT_PATH, "Library") : undefined,
    process.env.MINDEX_NAS_MOUNT ? path.join(process.env.MINDEX_NAS_MOUNT, "library") : undefined,
    process.env.NAS_MOUNT_PATH ? path.join(process.env.NAS_MOUNT_PATH, "library") : undefined,
  ])

  const localFallbacks = uniqueStrings([
    "/mnt/nas/mindex/Library",
    "/mnt/nas/mindex/library",
    "\\\\192.168.0.105\\mycosoft.com\\mindex\\Library",
    "\\\\192.168.0.105\\mycosoft.com\\mindex\\library",
    "\\\\192.168.0.105\\MINDEX\\Library",
    "\\\\192.168.0.105\\mindex\\Library",
    "\\\\192.168.0.105\\shared-drives\\MINDEX\\Library",
    "\\\\192.168.0.105\\Shared Drives\\MINDEX\\Library",
    "\\\\192.168.0.105\\drive\\shared-drives\\MINDEX\\Library",
    "\\\\192.168.0.105\\Drive\\shared-drives\\MINDEX\\Library",
    "D:\\MINDEX\\Library",
    "D:\\Mindex\\Library",
    "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\DATA\\MINDEX\\Library",
    "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\var\\mindex\\library",
    path.join(process.cwd(), "var", "mindex", "library"),
  ])

  return uniqueStrings([...configured, ...localFallbacks])
}

async function directoryExists(candidate: string): Promise<boolean> {
  try {
    const stat = await fs.stat(candidate)
    return stat.isDirectory()
  } catch {
    return false
  }
}

export async function findMindexLibraryRoot(): Promise<string | null> {
  for (const candidate of getLibraryCandidateRoots()) {
    if (await directoryExists(candidate)) return path.resolve(candidate)
  }
  return null
}

export async function resolveLibraryBlobPath(root: string, id: string): Promise<{ absolutePath: string; relativePath: string }> {
  const relativePath = decodeLibraryBlobId(id)
  const normalizedRelative = relativePath.replace(/[\\/]+/g, path.sep)
  const absolutePath = path.resolve(root, normalizedRelative)
  const resolvedRoot = path.resolve(root)

  if (absolutePath !== resolvedRoot && !absolutePath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Requested file is outside the MINDEX Library root.")
  }

  const stat = await fs.stat(absolutePath)
  if (!stat.isFile()) {
    throw new Error("Requested library blob is not a file.")
  }

  return { absolutePath, relativePath: relativePath.replace(/\\/g, "/") }
}

function inferMimeType(extension: string): string {
  const ext = extension.toLowerCase()
  if (ext === ".wav" || ext === ".wave") return "audio/wav"
  if (ext === ".mp3") return "audio/mpeg"
  if (ext === ".flac") return "audio/flac"
  if (ext === ".ogg" || ext === ".oga") return "audio/ogg"
  if (ext === ".m4a" || ext === ".aac") return "audio/aac"
  if (ext === ".webm") return "video/webm"
  if (ext === ".mp4") return "video/mp4"
  if (ext === ".mov") return "video/quicktime"
  if (ext === ".png") return "image/png"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".gif") return "image/gif"
  if (ext === ".webp") return "image/webp"
  if (ext === ".svg") return "image/svg+xml"
  if (ext === ".csv") return "text/csv"
  if (ext === ".tsv") return "text/tab-separated-values"
  if (ext === ".json" || ext === ".jsonl" || ext === ".ndjson") return "application/json"
  if (TEXT_EXTENSIONS.has(ext)) return "text/plain"
  return "application/octet-stream"
}

function inferCategory(relativePath: string, extension: string): MindexLibraryCategoryId {
  const segments = relativePath
    .split("/")
    .map((segment) => segment.toLowerCase())
    .filter(Boolean)

  const firstSegment = segments[0] as MindexLibraryCategoryId | undefined
  if (firstSegment && CATEGORY_IDS.has(firstSegment)) return firstSegment

  const lowerPath = relativePath.toLowerCase()
  for (const category of LIBRARY_CATEGORIES) {
    if (lowerPath.includes(`/${category.id}/`) || lowerPath.startsWith(`${category.id}/`)) return category.id
  }

  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSION_HINTS) as Array<[MindexLibraryCategoryId, Set<string>]>) {
    if (extensions.has(extension.toLowerCase())) return category
  }

  return "bioelectric"
}

function inferSensorType(relativePath: string, category: MindexLibraryCategoryId): string {
  const segments = relativePath.split("/").filter(Boolean)
  const first = segments[0]?.toLowerCase()
  const second = segments[1]?.toLowerCase()

  if (first === category && second) return second
  if (first && first !== category) return first

  const lowerPath = relativePath.toLowerCase()
  const hints = [
    "hydrophone",
    "microphone",
    "transducer",
    "ultrasonic",
    "fci",
    "mycelium",
    "magnetic",
    "radio",
    "wifi",
    "bluetooth",
    "voc",
    "vsc",
    "bme688",
    "bme690",
    "infrared",
    "temperature",
    "pressure",
    "strain",
    "vibration",
    "lidar",
    "radar",
    "geiger",
    "radiation",
  ]
  return hints.find((hint) => lowerPath.includes(hint)) ?? "field-capture"
}

function inferRecordingGroup(relativePath: string, category: MindexLibraryCategoryId): string {
  const segments = relativePath.split("/").filter(Boolean)
  if (segments[0]?.toLowerCase() === category) {
    return segments.slice(2, -1).join("/") || segments[1] || "ungrouped"
  }
  return segments.slice(0, -1).join("/") || "ungrouped"
}

function normalizeSamples(values: number[], targetLength = 256): number[] {
  const finite = values.filter((value) => Number.isFinite(value))
  if (!finite.length) return []

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const spread = max - min || 1
  const normalized = finite.map((value) => ((value - min) / spread) * 2 - 1)

  if (normalized.length <= targetLength) return normalized

  const bucket = normalized.length / targetLength
  const downsampled: number[] = []
  for (let index = 0; index < targetLength; index += 1) {
    const start = Math.floor(index * bucket)
    const end = Math.max(start + 1, Math.floor((index + 1) * bucket))
    const slice = normalized.slice(start, end)
    downsampled.push(slice.reduce((total, value) => total + value, 0) / slice.length)
  }
  return downsampled
}

function numbersFromJson(value: unknown, collector: number[] = []): number[] {
  if (collector.length >= 2_000) return collector

  if (typeof value === "number" && Number.isFinite(value)) {
    collector.push(value)
    return collector
  }

  if (Array.isArray(value)) {
    for (const item of value) numbersFromJson(item, collector)
    return collector
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) numbersFromJson(nested, collector)
  }

  return collector
}

function numbersFromText(text: string): number[] {
  const matches = text.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
  if (!matches) return []
  return matches.slice(0, 2_000).map((value) => Number(value)).filter((value) => Number.isFinite(value))
}

async function previewFromNumericFile(absolutePath: string, extension: string): Promise<number[] | null> {
  if (!TEXT_EXTENSIONS.has(extension.toLowerCase())) return null

  const handle = await fs.open(absolutePath, "r")
  try {
    const buffer = Buffer.alloc(256 * 1024)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const text = buffer.subarray(0, bytesRead).toString("utf8")
    const numbers =
      extension === ".json"
        ? numbersFromJson(JSON.parse(text))
        : extension === ".jsonl" || extension === ".ndjson"
          ? text
              .split(/\r?\n/)
              .flatMap((line) => {
                const trimmed = line.trim()
                if (!trimmed) return []
                try {
                  return numbersFromJson(JSON.parse(trimmed))
                } catch {
                  return numbersFromText(trimmed)
                }
              })
          : numbersFromText(text)

    const samples = normalizeSamples(numbers)
    return samples.length ? samples : null
  } catch {
    return null
  } finally {
    await handle.close()
  }
}

async function previewFromFileBytes(absolutePath: string): Promise<{ samples: number[]; checksum: string }> {
  const handle = await fs.open(absolutePath, "r")
  try {
    const buffer = Buffer.alloc(64 * 1024)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    const bytes = buffer.subarray(0, bytesRead)
    const checksum = createHash("sha256").update(bytes).digest("hex")
    const windowSize = Math.max(1, Math.floor(bytes.length / 256))
    const samples: number[] = []

    for (let index = 0; index < bytes.length && samples.length < 256; index += windowSize) {
      const slice = bytes.subarray(index, Math.min(bytes.length, index + windowSize))
      const average = slice.reduce((total, byte) => total + byte, 0) / Math.max(1, slice.length)
      samples.push((average - 127.5) / 127.5)
    }

    return { samples, checksum }
  } finally {
    await handle.close()
  }
}

async function walkLibraryRoot(root: string, maxFiles: number, maxDepth: number): Promise<string[]> {
  const results: string[] = []

  async function walk(current: string, depth: number): Promise<void> {
    if (results.length >= maxFiles || depth > maxDepth) return

    let entries: Dirent[]
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (results.length >= maxFiles) break
      if (entry.name.startsWith(".") || entry.name === "__MACOSX") continue

      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath, depth + 1)
      } else if (entry.isFile()) {
        results.push(absolutePath)
      }
    }
  }

  await walk(root, 0)
  return results
}

export async function buildMindexLibraryCatalog(options?: {
  category?: string | null
  query?: string | null
  limit?: number
}): Promise<MindexLibraryCatalog> {
  const root = await findMindexLibraryRoot()
  const categoryFilter = options?.category && CATEGORY_IDS.has(options.category as MindexLibraryCategoryId)
    ? (options.category as MindexLibraryCategoryId)
    : null
  const query = options?.query?.trim().toLowerCase() ?? ""
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_MAX_FILES, 1), DEFAULT_MAX_FILES)
  const categories = mindexLibraryCategories()
  const byCategory = new Map<MindexLibraryCategoryId, MindexLibraryCategorySummary>(
    categories.map((category) => [category.id, category]),
  )

  if (!root) {
    return {
      root_status: "missing",
      root_label: "MINDEX Library storage",
      categories,
      blobs: [],
      total_files: 0,
      total_bytes: 0,
      message:
        "MINDEX Library storage is not connected for this app session. Files will appear here once the Library storage is connected.",
    }
  }

  const files = await walkLibraryRoot(root, limit, DEFAULT_MAX_DEPTH)
  const blobs: MindexLibraryBlob[] = []
  let totalBytes = 0

  for (const absolutePath of files) {
    const stat = await fs.stat(absolutePath)
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/")
    const extension = path.extname(absolutePath).toLowerCase()
    const category = inferCategory(relativePath, extension)
    const summary = byCategory.get(category)

    if (summary) {
      summary.count += 1
      summary.bytes += stat.size
    }
    totalBytes += stat.size

    if (categoryFilter && category !== categoryFilter) continue
    if (query && !relativePath.toLowerCase().includes(query) && !path.basename(absolutePath).toLowerCase().includes(query)) continue

    const numericSamples = await previewFromNumericFile(absolutePath, extension)
    const filePreview = await previewFromFileBytes(absolutePath)
    const samples = numericSamples?.length ? numericSamples : []
    const id = encodeLibraryBlobId(relativePath)

    blobs.push({
      id,
      name: path.basename(absolutePath),
      relative_path: relativePath,
      category,
      sensor_type: inferSensorType(relativePath, category),
      recording_group: inferRecordingGroup(relativePath, category),
      extension,
      mime_type: inferMimeType(extension),
      size_bytes: stat.size,
      modified_at: stat.mtime.toISOString(),
      checksum: filePreview.checksum,
      stream_url: `/api/natureos/mindex/library/file?id=${encodeURIComponent(id)}`,
      preview_samples: samples,
      preview_source: numericSamples?.length ? "numeric_file" : "metadata",
      sample_rate_hz: SAMPLE_RATE_BY_CATEGORY[category],
    })
  }

  blobs.sort((a, b) => Date.parse(b.modified_at) - Date.parse(a.modified_at))

  return {
    root_status: "mounted",
    root_label: "MINDEX Library storage",
    categories,
    blobs,
    total_files: files.length,
    total_bytes: totalBytes,
  }
}

export function getLibraryBlobMimeType(absolutePath: string): string {
  return inferMimeType(path.extname(absolutePath).toLowerCase())
}

export function isInlinePreviewMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("image/") ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json"
  )
}
