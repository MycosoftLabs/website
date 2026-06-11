import { NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import {
  buildMindexLibraryCatalog,
  encodeLibraryBlobId,
  mindexLibraryCategories,
  type MindexLibraryBlob,
  type MindexLibraryCatalog,
  type MindexLibraryCategoryId,
  type MindexLibraryCategorySummary,
  type MindexLibraryStorageStatus,
  type MindexSineStatus,
} from "@/lib/mindex/library-files"

export const dynamic = "force-dynamic"

type MindexLibraryBackendRow = Record<string, unknown>

type MindexLibraryBackendResponse = {
  items?: unknown[]
  blobs?: unknown[]
  rows?: unknown[]
  total?: unknown
  total_files?: unknown
  total_bytes?: unknown
  categories?: unknown[]
  limit?: unknown
  offset?: unknown
}

const CATEGORY_IDS = new Set<MindexLibraryCategoryId>(mindexLibraryCategories().map((category) => category.id))
const SAMPLE_RATE_BY_CATEGORY: Record<MindexLibraryCategoryId, number> = {
  acoustic: 16_000,
  spectral: 2_048,
  bioelectric: 512,
  chemical: 12,
  thermal: 24,
  tactile: 96,
}
const BACKEND_LIBRARY_PAGE_LIMIT = 200
const BACKEND_LIBRARY_VISIBLE_LIMIT = 1000

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "yes", "y", "ok"].includes(normalized)) return true
    if (["false", "0", "no", "n"].includes(normalized)) return false
  }
  if (typeof value === "number" && Number.isFinite(value)) return value !== 0
  return undefined
}

function asSamples(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
}

function isUuidLike(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

async function fetchBackendJson<T = Record<string, unknown>>(path: string, timeoutMs: number): Promise<T | null> {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  try {
    const response = await fetchMindexWithAuthRetry(`${base}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      return null
    }
    return (await response.json()) as T
  } catch {
    return null
  }
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
}

function acousticEventArray(value: unknown): Record<string, unknown>[] {
  return asObjectArray(value).map((event) => {
    const normalized: Record<string, unknown> = { ...event }
    const start = asNumber(event.start_seconds) ?? asNumber(event.start_sec)
    const end = asNumber(event.end_seconds) ?? asNumber(event.end_sec)
    const peak = asNumber(event.peak_seconds) ?? asNumber(event.peak_sec)
    const frequency = asNumber(event.frequency_hz) ?? asNumber(event.freq_hz)
    const confidence = asNumber(event.confidence) ?? asNumber(event.score)

    if (start !== null) normalized.start_seconds = start
    if (end !== null) normalized.end_seconds = end
    if (peak !== null) normalized.peak_seconds = peak
    if (frequency !== null) normalized.frequency_hz = frequency
    if (confidence !== null) normalized.confidence = confidence
    if (!asString(normalized.label)) {
      normalized.label =
        asString(event.species) ||
        asString(event.class_name) ||
        asString(event.source_type) ||
        asString(event.detector_id) ||
        asString(event.kind)
    }
    return normalized
  })
}

function normalizeCategory(value: unknown, fallback: string | null): MindexLibraryCategoryId {
  const raw = (asString(value) || fallback || "acoustic").toLowerCase()
  if (["audio", "sound", "hydrophone", "microphone"].includes(raw)) return "acoustic"
  if (["gas", "voc", "vsc", "particle", "particulate", "smell"].includes(raw)) return "chemical"
  if (["fci", "electrical", "electrode", "radio", "magnetic"].includes(raw)) return "bioelectric"
  if (["infrared", "ir", "temperature", "heat"].includes(raw)) return "thermal"
  if (["pressure", "motion", "movement", "vibration", "force"].includes(raw)) return "tactile"
  if (["lidar", "radar", "radiation", "hyperspectral", "multispectral"].includes(raw)) return "spectral"
  return CATEGORY_IDS.has(raw as MindexLibraryCategoryId) ? (raw as MindexLibraryCategoryId) : "acoustic"
}

function basename(value: string): string {
  const normalized = value.replace(/\\/g, "/")
  return normalized.split("/").filter(Boolean).pop() || normalized || "mindex-library-blob"
}

function extensionFromName(value: string): string {
  const name = basename(value)
  const dot = name.lastIndexOf(".")
  return dot >= 0 ? name.slice(dot).toLowerCase() : ""
}

function mimeFromExtension(extension: string, category: MindexLibraryCategoryId): string {
  if (extension === ".wav" || extension === ".wave") return "audio/wav"
  if (extension === ".mp3") return "audio/mpeg"
  if (extension === ".flac") return "audio/flac"
  if (extension === ".ogg" || extension === ".oga") return "audio/ogg"
  if (extension === ".m4a" || extension === ".aac") return "audio/aac"
  if (extension === ".webm") return "video/webm"
  if (extension === ".mp4") return "video/mp4"
  if (extension === ".png") return "image/png"
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg"
  if (extension === ".gif") return "image/gif"
  if (extension === ".svg") return "image/svg+xml"
  if (extension === ".csv") return "text/csv"
  if (extension === ".json" || extension === ".jsonl" || extension === ".ndjson") return "application/json"
  return "application/octet-stream"
}

function isAcousticManifestSidecar(row: Pick<MindexLibraryBlob, "category" | "relative_path" | "filename" | "name">): boolean {
  const text = [row.relative_path, row.filename, row.name].filter(Boolean).join(" ").toLowerCase()
  return row.category === "acoustic" && (text.includes(".manifest.json") || text.includes(".wav.json"))
}

function mapBackendBlob(row: MindexLibraryBackendRow, fallbackCategory: string | null): MindexLibraryBlob {
  const category = normalizeCategory(row.category, fallbackCategory)
  const filename = asString(row.filename) || basename(asString(row.rel_path) || asString(row.relative_path) || asString(row.path))
  const title = asString(row.title)
  const id =
    asString(row.id) ||
    asString(row.blob_id) ||
    asString(row.content_hash) ||
    asString(row.checksum) ||
    asString(row.rel_path) ||
    asString(row.relative_path)
  const analysisIdCandidates = [
    asString(row.analysis_id),
    asString(row.blob_id),
    asString(row.uuid),
    asString(row.database_id),
    asString(row.remote_id),
    asString(row.id),
  ]
  const analysisId = analysisIdCandidates.find(isUuidLike)
  const relPath =
    asString(row.relative_path) ||
    asString(row.rel_path) ||
    asString(row.path) ||
    asString(row.nas_path) ||
    `${category}/${asString(row.origin_dataset_id) || asString(row.source_id) || "mindex"}/${filename || id || "blob"}`
  const name = title || asString(row.name) || filename || basename(relPath)
  const extension = extensionFromName(name || relPath) || extensionFromName(relPath)
  const mimeType = asString(row.mime_type) || asString(row.content_type) || mimeFromExtension(extension, category)
  const sizeBytes = asNumber(row.size_bytes) ?? asNumber(row.bytes) ?? 0
  const sampleRate = asNumber(row.sample_rate_hz) ?? asNumber(row.sample_rate) ?? SAMPLE_RATE_BY_CATEGORY[category]
  const sourceId = asString(row.source_id) || asString(row.dataset) || asString(row.provider)
  const sourceName = asString(row.source_name)
  const originDatasetId = asString(row.origin_dataset_id)
  const labelPrimary = asString(row.label_primary)
  const labelSecondary = asString(row.label_secondary)

  const deepSignalMatches = acousticEventArray(row.deep_signal_matches)
  const frequencyDetections = acousticEventArray(row.frequency_detections)
  const activitySegments = acousticEventArray(row.activity_segments)
  const birdDetections = acousticEventArray(row.bird_detections)
  const uavDetections = acousticEventArray(row.uav_detections)
  const npsDetections = acousticEventArray(row.nps_detections)

  return {
    id: id || relPath,
    analysis_id: analysisId || undefined,
    remote_id: analysisId || id || relPath,
    file_id: encodeLibraryBlobId(relPath),
    name,
    title: title || undefined,
    filename: filename || undefined,
    description: asString(row.description) || undefined,
    relative_path: relPath,
    category,
    sensor_type: asString(row.sensor_type) || asString(row.modality) || category,
    recording_group: asString(row.recording_group) || sourceName || originDatasetId || sourceId || "mindex",
    extension,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    modified_at: asString(row.modified_at) || asString(row.updated_at) || asString(row.created_at),
    checksum: asString(row.checksum) || asString(row.content_hash) || asString(row.sha256),
    stream_url: `/api/natureos/mindex/library/file?id=${encodeURIComponent(encodeLibraryBlobId(relPath))}&remote_id=${encodeURIComponent(id || relPath)}`,
    preview_samples: asSamples(row.preview_samples),
    preview_source: "metadata",
    sample_rate_hz: sampleRate,
    source_id: sourceId || undefined,
    source_name: sourceName || undefined,
    source_url: asString(row.source_url) || undefined,
    origin_dataset_id: originDatasetId || undefined,
    label_primary: labelPrimary || undefined,
    label_secondary: labelSecondary || undefined,
    acoustic_environment: asString(row.acoustic_environment) || undefined,
    nlm_subsystem: asString(row.nlm_subsystem) || undefined,
    nlm_priority: asNumber(row.nlm_priority),
    fold_id: asString(row.fold_id) || asNumber(row.fold_id),
    training_split: asString(row.training_split) || undefined,
    locale: asString(row.locale) || undefined,
    capture_time_utc: asString(row.capture_time_utc) || undefined,
    duration_sec: asNumber(row.duration_sec) ?? asNumber(row.duration_seconds),
    channels: asNumber(row.channels),
    format: asString(row.format) || undefined,
    codec: asString(row.codec) || undefined,
    playback_class: asString(row.playback_class) || undefined,
    license: asString(row.license) || undefined,
    needs_transcode: Boolean(row.needs_transcode),
    unsupported_codec: Boolean(row.unsupported_codec),
    analysis_engine: asString(row.analysis_engine) || asString(row.engine) || undefined,
    identification_status: asString(row.identification_status) || asString(row.deep_signal_status) || undefined,
    identification_summary: row.identification_summary ?? row.deep_signal_summary,
    deep_signal_matches: deepSignalMatches.length ? deepSignalMatches : undefined,
    frequency_detections: frequencyDetections.length ? frequencyDetections : undefined,
    activity_segments: activitySegments.length ? activitySegments : undefined,
    bird_detections: birdDetections.length ? birdDetections : undefined,
    uav_detections: uavDetections.length ? uavDetections : undefined,
    nps_detections: npsDetections.length ? npsDetections : undefined,
    wave_annotations: asObjectArray(row.wave_annotations),
    human_identifications: asObjectArray(row.human_identifications),
    latest_human_identification: row.latest_human_identification,
  }
}

function uniqueLibraryBlobs(rows: MindexLibraryBlob[]): MindexLibraryBlob[] {
  const seen = new Set<string>()
  const uniqueRows: MindexLibraryBlob[] = []

  for (const row of rows) {
    const key =
      row.id ||
      row.checksum ||
      row.relative_path ||
      [row.filename, row.source_id, row.modified_at].filter(Boolean).join("|")

    if (seen.has(key)) continue
    seen.add(key)
    uniqueRows.push(row)
  }

  return uniqueRows
}

function mapBackendStorage(data: Record<string, unknown> | null): MindexLibraryStorageStatus | undefined {
  if (!data) return undefined
  return {
    available: asBoolean(data.available),
    remote_nas: asBoolean(data.remote_nas),
    mount_point: asString(data.mount_point) || undefined,
    library_acoustic: asString(data.library_acoustic) || undefined,
    policy: asString(data.policy) || undefined,
    total_gb: asNumber(data.total_gb),
    used_gb: asNumber(data.used_gb),
    free_gb: asNumber(data.free_gb),
    error: asString(data.error) || undefined,
  }
}

function mapSineStatus(data: Record<string, unknown> | null): MindexSineStatus | undefined {
  if (!data) return undefined
  const detectorIds = Array.isArray(data.default_detectors)
    ? data.default_detectors.map((item) => asString(item)).filter(Boolean)
    : []
  return {
    status: asString(data.status) || undefined,
    product: asString(data.product) || undefined,
    url: asString(data.url) || undefined,
    acoustic_blobs: asNumber(data.acoustic_blobs),
    library_sources: asNumber(data.library_sources),
    detectors_registered: asNumber(data.detectors_registered),
    default_detectors: detectorIds,
  }
}

function categoriesFromBackendCatalog(data: Record<string, unknown> | null): unknown[] {
  const raw = data?.categories
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== "object") return []
  return Object.entries(raw as Record<string, unknown>).map(([id, count]) => ({
    id,
    category: id,
    count,
  }))
}

function mapBackendCategories(
  rows: MindexLibraryBlob[],
  activeCategory: string | null,
  backendTotal: number,
  backendCategories: unknown[],
): MindexLibraryCategorySummary[] {
  const categories = mindexLibraryCategories()
  const byCategory = new Map<MindexLibraryCategoryId, MindexLibraryCategorySummary>(
    categories.map((category) => [category.id, category]),
  )

  for (const rawCategory of backendCategories) {
    if (!rawCategory || typeof rawCategory !== "object") continue
    const category = rawCategory as Record<string, unknown>
    const id = normalizeCategory(category.id ?? category.category, activeCategory)
    const summary = byCategory.get(id)
    if (!summary) continue
    summary.count = asNumber(category.count) ?? summary.count
    summary.bytes = asNumber(category.bytes) ?? asNumber(category.size_bytes) ?? summary.bytes
  }

  for (const blob of rows) {
    const summary = byCategory.get(blob.category)
    if (!summary) continue
    summary.count += 1
    summary.bytes += blob.size_bytes
  }

  const activeId = activeCategory && CATEGORY_IDS.has(activeCategory as MindexLibraryCategoryId)
    ? (activeCategory as MindexLibraryCategoryId)
    : null
  const activeSummary = activeId ? byCategory.get(activeId) : null
  if (activeSummary && backendTotal > 0) {
    activeSummary.count = backendTotal
  }

  return categories
}

async function fetchBackendLibraryCatalog(options: {
  category: string | null
  query: string | null
  limit?: number
  offset?: number
}): Promise<MindexLibraryCatalog | null> {
  const params = new URLSearchParams()
  if (options.category) params.set("category", options.category)
  if (options.query) params.set("q", options.query)
  const requestedOffset = Math.max(options.offset ?? 0, 0)
  const requestedLimit = Math.min(
    Math.max(options.limit ?? BACKEND_LIBRARY_PAGE_LIMIT, 1),
    BACKEND_LIBRARY_VISIBLE_LIMIT,
  )
  const firstPageLimit = Math.min(requestedLimit, BACKEND_LIBRARY_PAGE_LIMIT)
  params.set("limit", String(firstPageLimit))
  params.set("offset", String(requestedOffset))

  const [storageData, sineData, catalogData, data] = await Promise.all([
    fetchBackendJson<Record<string, unknown>>("/api/mindex/library/storage", 15_000),
    fetchBackendJson<Record<string, unknown>>("/api/mindex/sine/status", 15_000),
    fetchBackendJson<Record<string, unknown>>("/api/mindex/library/catalog?limit=20", 15_000),
    fetchBackendJson<MindexLibraryBackendResponse>(`/api/mindex/library/blobs?${params.toString()}`, 35_000),
  ])
  const storage = mapBackendStorage(storageData)
  const sine = mapSineStatus(sineData)
  if (!data) {
    if (storage?.remote_nas || storage?.available || sine?.acoustic_blobs) {
      const categories = mapBackendCategories([], options.category, sine?.acoustic_blobs ?? 0, categoriesFromBackendCatalog(catalogData))
      return {
        root_status: storage?.remote_nas || storage?.available || sine?.acoustic_blobs ? "mounted" : "missing",
        root_label: "MINDEX Library NAS",
        categories,
        blobs: [],
        total_files: sine?.acoustic_blobs ?? 0,
        total_bytes: 0,
        storage,
        sine,
        message: "MINDEX Library storage is connected; waiting for the file registry response.",
      }
    }
    return null
  }

  const rawRows = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.blobs)
      ? data.blobs
      : Array.isArray(data.rows)
        ? data.rows
        : []
  const firstPageTotal = asNumber(data.total) ?? asNumber(data.total_files) ?? rawRows.length
  const rowsToLoad = Math.min(requestedLimit, Math.max(0, firstPageTotal - requestedOffset))
  const allRawRows = [...rawRows]
  for (let loaded = rawRows.length; loaded < rowsToLoad; loaded += BACKEND_LIBRARY_PAGE_LIMIT) {
    const pageParams = new URLSearchParams(params)
    pageParams.set("limit", String(Math.min(BACKEND_LIBRARY_PAGE_LIMIT, rowsToLoad - loaded)))
    pageParams.set("offset", String(requestedOffset + loaded))
    const page = await fetchBackendJson<MindexLibraryBackendResponse>(`/api/mindex/library/blobs?${pageParams.toString()}`, 35_000)
    const pageRows = Array.isArray(page?.items)
      ? page.items
      : Array.isArray(page?.blobs)
        ? page.blobs
        : Array.isArray(page?.rows)
          ? page.rows
          : []
    if (!pageRows.length) break
    allRawRows.push(...pageRows)
  }

  const rows = uniqueLibraryBlobs(allRawRows
    .filter((row): row is MindexLibraryBackendRow => Boolean(row) && typeof row === "object")
    .map((row) => mapBackendBlob(row, options.category))
    .filter((row) => !isAcousticManifestSidecar(row)))
  const filteredRows = options.query?.trim()
    ? rows.filter((row) => {
        const haystack =
          `${row.name} ${row.relative_path} ${row.sensor_type} ${row.recording_group} ${row.source_id ?? ""} ${row.format ?? ""} ${row.codec ?? ""} ${row.license ?? ""}`.toLowerCase()
        return haystack.includes(options.query!.trim().toLowerCase())
      })
    : rows

  const totalFiles = firstPageTotal || filteredRows.length
  const visibleBytes = filteredRows.reduce((total, row) => total + row.size_bytes, 0)
  const totalBytes = asNumber(data.total_bytes) ?? visibleBytes

  if (!filteredRows.length && totalFiles === 0 && !storage?.remote_nas && !storage?.available) return null

  return {
    root_status: storage?.remote_nas || storage?.available || totalFiles > 0 ? "mounted" : "missing",
    root_label: storage?.remote_nas ? "MINDEX Library NAS" : "MINDEX Library storage",
    categories: mapBackendCategories(
      filteredRows,
      options.category,
      totalFiles,
      Array.isArray(data.categories) && data.categories.length ? data.categories : categoriesFromBackendCatalog(catalogData),
    ),
    blobs: filteredRows,
    total_files: totalFiles,
    total_bytes: totalBytes,
    storage,
    sine,
    message: storage?.remote_nas
      ? "MINDEX Library is backed by the NAS."
      : "MINDEX Library registry is connected.",
  }
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")
  const query = request.nextUrl.searchParams.get("q")
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "")
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined
  const offsetParam = Number(request.nextUrl.searchParams.get("offset") ?? "")
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : undefined

  try {
    const backendCatalog = await fetchBackendLibraryCatalog({ category, query, limit, offset })
    if (backendCatalog) {
      const backendTotal = backendCatalog.total_files ?? 0
      if (!offset && backendTotal > 0 && backendCatalog.blobs.length === 0) {
        const fallbackCatalog = await buildMindexLibraryCatalog({ category, query, limit })
        if (fallbackCatalog.blobs.length) return NextResponse.json(fallbackCatalog)
      }
      return NextResponse.json(backendCatalog)
    }

    const catalog = await buildMindexLibraryCatalog({ category, query, limit })
    return NextResponse.json(catalog)
  } catch (error) {
    console.error("[mindex-library] catalog failed", error)
    return NextResponse.json({
      root_status: "missing",
      root_label: "MINDEX Library storage",
      categories: mindexLibraryCategories(),
      blobs: [],
      total_files: 0,
      total_bytes: 0,
      message: "MINDEX Library storage is unavailable for this request.",
    })
  }
}
