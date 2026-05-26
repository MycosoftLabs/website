import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import readline from "node:readline"
import {
  type LandPolygon,
  isLikelyLandInPolygons,
  isNatureObservationOnLand,
  landPolygonsForBounds,
  clearNatureLandMaskCacheForTests,
} from "@/lib/crep/nature-land-filter"

export type FungalAtlasLayer =
  | "mycelium"
  | "am"
  | "ecm"
  | "rarity"
  | "endemic"
  | "fci"
  | "protected"

export type FungalAtlasHeatLayer = Exclude<FungalAtlasLayer, "protected">

export type FungalSampleGroup =
  | "mycelium"
  | "mushroom"
  | "mold"
  | "mildew"
  | "yeast"
  | "fungi"

export interface FungalAtlasBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface FungalAtlasCell {
  id: string
  lat: number
  lng: number
  sampleCount: number
  richness: number
  activity: number
  amScore: number
  ecmScore: number
  rarity: number
  endemicity: number
  uncertainty: number
  fciPriority: number
  nativeResolutionMeters: number
  sourceResolution: string
  dateRange: { from?: string; to?: string }
  sources: string[]
}

export interface FungalAtlasSample {
  id: string
  lat: number
  lng: number
  observed_on?: string
  country?: string
  location?: string
  sampleType?: string
  environmentType?: string
  ecosystem?: string
  dominantPlant?: string
  barcodeRegion?: string
  pH?: number
  sequenceTotal?: number
  group: FungalSampleGroup
  source: string
  sourceResolution: string
  confidence: number
  nativeResolutionMeters: number
}

export interface FungalAtlasSummary {
  sampleCount: number
  cellCount: number
  sourceDir: string | null
  metadataFile: string | null
  countryCount: number
  topCountries: Array<{ name: string; count: number }>
  sampleTypes: Array<{ name: string; count: number }>
  barcodeRegions: Array<{ name: string; count: number }>
  dateRange: { from?: string; to?: string }
  nativeResolutionMeters: number
  sourceResolution: string
  loadedAt: string
  truncated: boolean
}

interface AtlasCache {
  samples: FungalAtlasSample[]
  sampleBuckets: Map<string, FungalAtlasSample[]>
  cells: FungalAtlasCell[]
  cellByKey: Map<string, FungalAtlasCell>
  spatialBuckets: Map<string, FungalAtlasCell[]>
  summary: FungalAtlasSummary
  sources: FungalSourceStatus[]
}

export interface FungalSourceStatus {
  id: "globalfungi" | "globalamfungi" | "gsmc" | "protectedplanet" | "atlas_derivatives"
  name: string
  status: "available" | "missing"
  files: string[]
  notes: string
}

const LOCAL_FUNGAL_ATLAS_SOURCE_FALLBACKS = [
  "C:\\Users\\Owner1\\Downloads\\fungaldata-global",
  "\\\\192.168.0.105\\drive\\shared-drives\\MINDEX\\CREP RAW DATA\\FUNGI\\globalfungi.com",
  "\\\\192.168.0.105\\MINDEX\\CREP RAW DATA\\FUNGI\\globalfungi.com",
  "C:\\Users\\Owner1\\Downloads\\GlobalFungi_5_sample_metadata.txt",
] as const
const GLOBAL_FUNGI_METADATA_FALLBACK =
  "C:\\Users\\Owner1\\Downloads\\GlobalFungi_5_sample_metadata.txt\\GlobalFungi_5_sample_metadata.txt"
const ATLAS_NATIVE_GRID_DEGREES = 1 / 120
const GRID_DEGREES = 0.05
const SAMPLE_BUCKET_DEGREES = 1
const INTERPOLATION_BUCKET_DEGREES = 0.5
const STABLE_MODEL_DETAIL_ZOOM = 10.5
const DEFAULT_MAX_LOCAL_ROWS = 125_000
const DEFAULT_TILE_SIZE = 160
const MYCELIUM_MIN_VALUE_BY_ZOOM = [
  { zoom: 4, value: 0.055 },
  { zoom: 6, value: 0.045 },
  { zoom: 8, value: 0.035 },
  { zoom: 20, value: 0.025 },
] as const

let cachePromise: Promise<AtlasCache> | null = null

export function clearFungalAtlasCacheForTests() {
  cachePromise = null
  clearNatureLandMaskCacheForTests()
}

export function resolveFungalAtlasSourceDir(): string | null {
  const explicit = process.env.FUNGAL_ATLAS_SOURCE_DIR?.trim()
  if (explicit) return explicit
  const metadata = process.env.FUNGAL_ATLAS_SAMPLE_METADATA?.trim()
  if (metadata) return path.dirname(metadata)
  for (const candidate of LOCAL_FUNGAL_ATLAS_SOURCE_FALLBACKS) {
    if (fs.existsSync(candidate)) return candidate
  }
  if (fs.existsSync(GLOBAL_FUNGI_METADATA_FALLBACK)) {
    return path.dirname(GLOBAL_FUNGI_METADATA_FALLBACK)
  }
  return null
}

function candidateMetadataPath(sourceDir: string | null): string | null {
  const explicit = process.env.FUNGAL_ATLAS_SAMPLE_METADATA?.trim()
  const isFile = (candidate: string) => {
    try {
      return fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  }
  if (explicit && isFile(explicit)) return explicit
  if (sourceDir) {
    const candidates = [
      path.join(sourceDir, "GlobalFungi_5_sample_metadata.txt"),
      path.join(sourceDir, "GlobalFungi_5_sample_metadata.txt", "GlobalFungi_5_sample_metadata.txt"),
      path.join(sourceDir, "GlobalFungi_5_sample_metadata.tsv"),
      path.join(sourceDir, "sample_metadata.txt"),
      path.join(sourceDir, "sample_metadata.tsv"),
      path.join(sourceDir, "metadata", "GlobalFungi_5_sample_metadata.txt"),
    ]
    for (const c of candidates) {
      if (isFile(c)) return c
    }
  }
  if (isFile(GLOBAL_FUNGI_METADATA_FALLBACK)) return GLOBAL_FUNGI_METADATA_FALLBACK
  return null
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value === "NA") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeDate(year?: string, month?: string, day?: string): string | undefined {
  if (!year || year === "NA") return undefined
  const y = Number(year)
  if (!Number.isFinite(y) || y < 1800 || y > 2200) return undefined
  const monthMap: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  }
  const m = parseNumber(month) ?? monthMap[(month || "").toLowerCase()] ?? 1
  const d = parseNumber(day) ?? 1
  return `${String(y).padStart(4, "0")}-${String(Math.max(1, Math.min(12, m))).padStart(2, "0")}-${String(Math.max(1, Math.min(28, d))).padStart(2, "0")}`
}

function classifySampleGroup(sampleType = "", environmentType = "", ecosystem = ""): FungalSampleGroup {
  const raw = `${sampleType} ${environmentType} ${ecosystem}`.toLowerCase()
  if (raw.includes("mushroom") || raw.includes("sporocarp") || raw.includes("fruiting")) return "mushroom"
  if (raw.includes("mildew")) return "mildew"
  if (raw.includes("mold") || raw.includes("mould")) return "mold"
  if (raw.includes("yeast")) return "yeast"
  if (raw.includes("soil") || raw.includes("root") || raw.includes("rhizosphere") || raw.includes("mycorrh")) return "mycelium"
  return "fungi"
}

function estimateAmScore(sample: Pick<FungalAtlasSample, "sampleType" | "environmentType" | "ecosystem" | "dominantPlant">): number {
  const raw = `${sample.sampleType || ""} ${sample.environmentType || ""} ${sample.ecosystem || ""} ${sample.dominantPlant || ""}`.toLowerCase()
  let score = 0.35
  if (raw.includes("root") || raw.includes("rhizosphere") || raw.includes("grass") || raw.includes("crop") || raw.includes("agric")) score += 0.35
  if (raw.includes("arbuscular") || raw.includes("amf")) score += 0.35
  if (raw.includes("forest") || raw.includes("pine") || raw.includes("oak")) score -= 0.12
  return clamp01(score)
}

function estimateEcmScore(sample: Pick<FungalAtlasSample, "sampleType" | "environmentType" | "ecosystem" | "dominantPlant">): number {
  const raw = `${sample.sampleType || ""} ${sample.environmentType || ""} ${sample.ecosystem || ""} ${sample.dominantPlant || ""}`.toLowerCase()
  let score = 0.28
  if (raw.includes("forest") || raw.includes("wood") || raw.includes("pine") || raw.includes("oak") || raw.includes("betula") || raw.includes("eucalyptus")) score += 0.42
  if (raw.includes("ectomycorrhizal") || raw.includes("ecm")) score += 0.35
  if (raw.includes("agric") || raw.includes("crop")) score -= 0.1
  return clamp01(score)
}

function sequenceRichness(sequenceTotal?: number): number {
  if (!sequenceTotal || sequenceTotal <= 0) return 0.32
  return clamp01(Math.log1p(sequenceTotal) / Math.log1p(250_000))
}

function dateFreshness(date?: string): number {
  if (!date) return 0.45
  const t = new Date(date).getTime()
  if (!Number.isFinite(t)) return 0.45
  const years = Math.max(0, (Date.now() - t) / (365 * 86400_000))
  return clamp01(1 - years / 15)
}

function cellKey(lat: number, lng: number, deg = GRID_DEGREES): string {
  const y = Math.floor((lat + 90) / deg)
  const x = Math.floor((lng + 180) / deg)
  return `${y}:${x}`
}

function cellCenterFromKey(key: string, deg = GRID_DEGREES): { lat: number; lng: number } {
  const [yRaw, xRaw] = key.split(":")
  const y = Number(yRaw)
  const x = Number(xRaw)
  return {
    lat: y * deg - 90 + deg / 2,
    lng: x * deg - 180 + deg / 2,
  }
}

function bucketKey(lat: number, lng: number, deg = INTERPOLATION_BUCKET_DEGREES): string {
  const y = Math.floor((lat + 90) / deg)
  const x = Math.floor((lng + 180) / deg)
  return `${y}:${x}`
}

function buildSpatialBuckets(cells: FungalAtlasCell[]): Map<string, FungalAtlasCell[]> {
  const buckets = new Map<string, FungalAtlasCell[]>()
  for (const cell of cells) {
    const key = bucketKey(cell.lat, cell.lng)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(cell)
    else buckets.set(key, [cell])
  }
  return buckets
}

function sampleBucketKey(lat: number, lng: number): string {
  return cellKey(lat, lng, SAMPLE_BUCKET_DEGREES)
}

function buildSampleBuckets(samples: FungalAtlasSample[]): Map<string, FungalAtlasSample[]> {
  const buckets = new Map<string, FungalAtlasSample[]>()
  for (const sample of samples) {
    const key = sampleBucketKey(sample.lat, sample.lng)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(sample)
    else buckets.set(key, [sample])
  }
  return buckets
}

function samplesInBounds(cache: AtlasCache, bounds?: FungalAtlasBounds): FungalAtlasSample[] {
  if (!bounds) return cache.samples
  const west = ((bounds.west + 540) % 360) - 180
  const east = ((bounds.east + 540) % 360) - 180
  const southY = Math.floor((Math.max(-90, bounds.south) + 90) / SAMPLE_BUCKET_DEGREES)
  const northY = Math.floor((Math.min(90, bounds.north) + 90) / SAMPLE_BUCKET_DEGREES)
  const xRanges: Array<[number, number]> = west <= east
    ? [[Math.floor((west + 180) / SAMPLE_BUCKET_DEGREES), Math.floor((east + 180) / SAMPLE_BUCKET_DEGREES)]]
    : [
        [Math.floor((west + 180) / SAMPLE_BUCKET_DEGREES), Math.floor(360 / SAMPLE_BUCKET_DEGREES)],
        [0, Math.floor((east + 180) / SAMPLE_BUCKET_DEGREES)],
      ]
  const candidates: FungalAtlasSample[] = []
  for (let y = southY; y <= northY; y += 1) {
    for (const [minX, maxX] of xRanges) {
      for (let x = minX; x <= maxX; x += 1) {
        const bucket = cache.sampleBuckets.get(`${y}:${x}`)
        if (bucket) candidates.push(...bucket)
      }
    }
  }
  return candidates.filter((sample) => inBounds(sample.lat, sample.lng, bounds))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function tileLandCoverageMode(bounds: FungalAtlasBounds, polygons: LandPolygon[] | null): "land" | "water" | "mixed" {
  const points: Array<[number, number]> = [
    [bounds.north, bounds.west],
    [bounds.north, (bounds.west + bounds.east) / 2],
    [bounds.north, bounds.east],
    [(bounds.north + bounds.south) / 2, bounds.west],
    [(bounds.north + bounds.south) / 2, (bounds.west + bounds.east) / 2],
    [(bounds.north + bounds.south) / 2, bounds.east],
    [bounds.south, bounds.west],
    [bounds.south, (bounds.west + bounds.east) / 2],
    [bounds.south, bounds.east],
  ]
  let land = 0
  for (const [lat, lng] of points) {
    const isLand = polygons
      ? isLikelyLandInPolygons(lat, lng, polygons)
      : isNatureObservationOnLand(lat, lng)
    if (isLand) land += 1
  }
  if (land === points.length) return "land"
  if (land === 0) return "water"
  return "mixed"
}

function bump(map: Map<string, number>, key?: string) {
  const k = key?.trim() || "Unknown"
  map.set(k, (map.get(k) ?? 0) + 1)
}

function topCounts(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function rowObject(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (let i = 0; i < headers.length; i += 1) row[headers[i]] = values[i] ?? ""
  return row
}

function sampleFromRow(row: Record<string, string>): FungalAtlasSample | null {
  const lat = parseNumber(row.latitude)
  const lng = parseNumber(row.longitude)
  if (lat === undefined || lng === undefined) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  const sampleType = row.sample_type || row.sample_type_specification || ""
  const environmentType = row.environment_type || ""
  const ecosystem = row.ecosystem_classification || ""
  const dominantPlant = row.dominant_plant_species || ""
  const observed_on = normalizeDate(row.year_of_sampling_from || row.paper_year, row.month_of_sampling, row.day_of_sampling)
  const sequenceTotal = parseNumber(row.ITS_total) ?? parseNumber(row.ITS1_extracted) ?? parseNumber(row.ITS2_extracted)
  const rich = sequenceRichness(sequenceTotal)
  return {
    id: row.sample_ID || `globalfungi-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    lat,
    lng,
    observed_on,
    country: row.country || undefined,
    location: row.location || undefined,
    sampleType: sampleType || undefined,
    environmentType: environmentType || undefined,
    ecosystem: ecosystem || undefined,
    dominantPlant: dominantPlant || undefined,
    barcodeRegion: row.barcoding_region || undefined,
    pH: parseNumber(row.pH),
    sequenceTotal,
    group: classifySampleGroup(sampleType, environmentType, ecosystem),
    source: "GlobalFungi",
    sourceResolution: "GlobalFungi sample GPS; native atlas display rendered on a fixed 30 arc second / 1 km grid",
    confidence: clamp01(0.35 + rich * 0.45 + (observed_on ? 0.15 : 0)),
    nativeResolutionMeters: 1_000,
  }
}

async function shallowFindFiles(sourceDir: string | null): Promise<string[]> {
  if (!sourceDir) return []
  const out: string[] = []
  async function walk(dir: string, depth: number) {
    if (depth > 2 || out.length > 3000) return
    let entries: fs.Dirent[]
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full, depth + 1)
      else out.push(full)
      if (out.length > 3000) return
    }
  }
  await walk(sourceDir, 0)
  return out
}

function sourceStatuses(files: string[], metadataPath: string | null): FungalSourceStatus[] {
  const lower = files.map((f) => f.toLowerCase())
  const byNeedle = (needles: string[]) =>
    files.filter((file, i) => needles.some((needle) => lower[i].includes(needle)))
  const globalFungi = metadataPath ? [metadataPath] : byNeedle(["globalfungi", "sample_metadata"])
  const globalAm = byNeedle(["globalam", "amfungi", "am_fungi"])
  const gsmc = byNeedle(["gsmc", "soil_mycobiome", "mycobiome"])
  const protectedPlanet = byNeedle(["protectedplanet", "wdpa", "protected_area"])
  const atlasDerivatives = byNeedle(["underground", "mycorrhizal", "richness", "marginality", "uncover"])
  return [
    { id: "globalfungi", name: "GlobalFungi", status: globalFungi.length ? "available" : "missing", files: globalFungi.slice(0, 8), notes: "Sample metadata and ITS sequence totals." },
    { id: "globalamfungi", name: "GlobalAMFungi", status: globalAm.length ? "available" : "missing", files: globalAm.slice(0, 8), notes: "AM fungal community/source files when present in NAS source dir." },
    { id: "gsmc", name: "Global Soil Mycobiome Consortium", status: gsmc.length ? "available" : "missing", files: gsmc.slice(0, 8), notes: "Soil mycobiome OTU/source files when present in NAS source dir." },
    { id: "protectedplanet", name: "Protected Planet", status: protectedPlanet.length ? "available" : "missing", files: protectedPlanet.slice(0, 8), notes: "Protected-area polygons/WDPA exports when present locally." },
    { id: "atlas_derivatives", name: "Mycorrhizal atlas derivatives", status: atlasDerivatives.length ? "available" : "missing", files: atlasDerivatives.slice(0, 8), notes: "Modeled rasters or metadata used as native reference layers." },
  ]
}

async function buildAtlasCache(): Promise<AtlasCache> {
  const sourceDir = resolveFungalAtlasSourceDir()
  const metadataPath = candidateMetadataPath(sourceDir)
  const files = await shallowFindFiles(sourceDir)
  const sources = sourceStatuses(files, metadataPath)
  const samples: FungalAtlasSample[] = []
  const countries = new Map<string, number>()
  const sampleTypes = new Map<string, number>()
  const barcodeRegions = new Map<string, number>()
  const mutableCells = new Map<string, {
    count: number
    richness: number
    activity: number
    am: number
    ecm: number
    confidence: number
    countries: Set<string>
    from?: string
    to?: string
  }>()
  let minDate: string | undefined
  let maxDate: string | undefined
  let rowsSeen = 0
  const maxRows = Math.max(1_000, Number(process.env.FUNGAL_ATLAS_MAX_LOCAL_ROWS || DEFAULT_MAX_LOCAL_ROWS))

  if (metadataPath) {
    const stream = fs.createReadStream(metadataPath, { encoding: "utf8" })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
    let headers: string[] | null = null
    for await (const line of rl) {
      if (!headers) {
        headers = line.split("\t")
        continue
      }
      if (!line.trim()) continue
      rowsSeen += 1
      const sample = sampleFromRow(rowObject(headers, line.split("\t")))
      if (!sample) continue
      samples.push(sample)
      bump(countries, sample.country)
      bump(sampleTypes, sample.sampleType)
      bump(barcodeRegions, sample.barcodeRegion)
      if (sample.observed_on) {
        if (!minDate || sample.observed_on < minDate) minDate = sample.observed_on
        if (!maxDate || sample.observed_on > maxDate) maxDate = sample.observed_on
      }
      const key = cellKey(sample.lat, sample.lng)
      const current = mutableCells.get(key) ?? {
        count: 0,
        richness: 0,
        activity: 0,
        am: 0,
        ecm: 0,
        confidence: 0,
        countries: new Set<string>(),
      }
      const rich = sequenceRichness(sample.sequenceTotal)
      current.count += 1
      current.richness += rich
      current.activity += clamp01(rich * 0.55 + dateFreshness(sample.observed_on) * 0.45)
      current.am += estimateAmScore(sample)
      current.ecm += estimateEcmScore(sample)
      current.confidence += sample.confidence
      if (sample.country) current.countries.add(sample.country)
      if (sample.observed_on) {
        if (!current.from || sample.observed_on < current.from) current.from = sample.observed_on
        if (!current.to || sample.observed_on > current.to) current.to = sample.observed_on
      }
      mutableCells.set(key, current)
      if (rowsSeen >= maxRows) break
    }
  }

  const maxCount = Math.max(1, ...Array.from(mutableCells.values()).map((c) => c.count))
  const cells: FungalAtlasCell[] = []
  const cellByKey = new Map<string, FungalAtlasCell>()
  for (const [key, raw] of mutableCells.entries()) {
    const center = cellCenterFromKey(key)
    const density = raw.count / maxCount
    const richness = clamp01(raw.richness / raw.count)
    const activity = clamp01(raw.activity / raw.count)
    const amScore = clamp01(raw.am / raw.count)
    const ecmScore = clamp01(raw.ecm / raw.count)
    const rarity = clamp01(richness * (1 - Math.sqrt(density)) + (raw.countries.size <= 1 ? 0.15 : 0))
    const endemicity = clamp01(rarity * 0.7 + (raw.countries.size <= 1 ? 0.25 : 0))
    const uncertainty = clamp01(1 - Math.min(0.9, Math.log1p(raw.count) / Math.log1p(80)))
    const fciPriority = clamp01(richness * 0.35 + endemicity * 0.25 + uncertainty * 0.25 + activity * 0.15)
    const cell: FungalAtlasCell = {
      id: `gf-cell-${key}`,
      lat: center.lat,
      lng: center.lng,
      sampleCount: raw.count,
      richness,
      activity,
      amScore,
      ecmScore,
      rarity,
      endemicity,
      uncertainty,
      fciPriority,
      nativeResolutionMeters: 1_000,
      sourceResolution: "GlobalFungi sample GPS aggregated into MINDEX evidence cells and rendered against a stable native 30 arc second / 1 km predicted richness grid. Values do not change with zoom; high zoom reveals samples rather than inventing new cells.",
      dateRange: { from: raw.from, to: raw.to },
      sources: ["GlobalFungi"],
    }
    cells.push(cell)
    cellByKey.set(key, cell)
  }

  const summary: FungalAtlasSummary = {
    sampleCount: samples.length,
    cellCount: cells.length,
    sourceDir,
    metadataFile: metadataPath,
    countryCount: countries.size,
    topCountries: topCounts(countries),
    sampleTypes: topCounts(sampleTypes),
    barcodeRegions: topCounts(barcodeRegions),
    dateRange: { from: minDate, to: maxDate },
    nativeResolutionMeters: 1_000,
    sourceResolution: "GlobalFungi sample GPS aggregated into MINDEX evidence cells and rendered against a stable native 30 arc second / 1 km predicted richness grid. The display is coordinate-stable and land-masked; raw sequence payloads stay server-side.",
    loadedAt: new Date().toISOString(),
    truncated: Boolean(metadataPath && rowsSeen >= maxRows),
  }

  const sampleBuckets = buildSampleBuckets(samples)
  const spatialBuckets = buildSpatialBuckets(cells)

  return { samples, sampleBuckets, cells, cellByKey, spatialBuckets, summary, sources }
}

async function getAtlasCache(): Promise<AtlasCache> {
  if (!cachePromise) cachePromise = buildAtlasCache()
  return cachePromise
}

function inBounds(lat: number, lng: number, bounds?: FungalAtlasBounds): boolean {
  if (!bounds) return true
  if (lat < bounds.south || lat > bounds.north) return false
  if (bounds.west <= bounds.east) return lng >= bounds.west && lng <= bounds.east
  return lng >= bounds.west || lng <= bounds.east
}

export async function getFungalAtlasStatus() {
  const cache = await getAtlasCache()
  return {
    status: cache.summary.sampleCount > 0 ? "ready" : "waiting_for_sources",
    summary: cache.summary,
    sources: cache.sources,
    assumptions: [
      "External map APIs are not used.",
      "Tile pixels are display interpolation; native source resolution and confidence are exposed in API metadata.",
      "Unclassified OTU/ASV rows should remain sequence evidence, not synthetic species.",
    ],
  }
}

export async function getFungalAtlasCells(opts: {
  bounds?: FungalAtlasBounds
  limit?: number
  layer?: FungalAtlasLayer
} = {}) {
  const cache = await getAtlasCache()
  const limit = Math.max(1, Math.min(opts.limit ?? 600, 3000))
  const cells = cache.cells
    .filter((cell) => inBounds(cell.lat, cell.lng, opts.bounds))
    .sort((a, b) => scoreCell(b, opts.layer ?? "mycelium") - scoreCell(a, opts.layer ?? "mycelium"))
    .slice(0, limit)
  return { cells, summary: cache.summary, sources: cache.sources }
}

export async function getFungalAtlasSamples(opts: {
  bounds?: FungalAtlasBounds
  limit?: number
  zoom?: number
  groups?: FungalSampleGroup[]
} = {}) {
  const cache = await getAtlasCache()
  const zoom = opts.zoom ?? 2
  // May 21 2026 (Morgan: "no AM fungi or ECM fungi on the map"). The old
  // ladder was `zoom < 5 ? 0` — at the default North America zoom 4 view
  // the endpoint returned ZERO samples, so the FungalAtlasLayer painted
  // nothing. Real GlobalFungi data exists for 85k samples globally; we
  // just need a reasonable cap per zoom tier. Bigger numbers at lower
  // zoom because the viewport covers more ground.
  const hardLimit =
    zoom < 3 ? 1800 :
    zoom < 5 ? 4000 :
    zoom < 8 ? 2500 :
    zoom < 10 ? 1500 :
    zoom < 13 ? 900 :
    600
  const requestedLimit = opts.limit ?? hardLimit
  const limit = Math.max(0, Math.min(requestedLimit, hardLimit))
  const groupSet = opts.groups?.length ? new Set(opts.groups) : null
  const samples = samplesInBounds(cache, opts.bounds)
    .filter((sample) => !groupSet || groupSet.has(sample.group))
    .sort((a, b) => {
      const at = a.observed_on ? new Date(a.observed_on).getTime() : 0
      const bt = b.observed_on ? new Date(b.observed_on).getTime() : 0
      if (at !== bt) return bt - at
      return (b.confidence ?? 0) - (a.confidence ?? 0)
    })
    .slice(0, limit)
  return { samples, summary: cache.summary, sources: cache.sources, zoom, limit }
}

export function samplesToGeoJson(samples: FungalAtlasSample[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: samples.map((sample) => {
      // May 21 2026 (Morgan): classify each sample as AM vs EcM vs mixed
      // so the FungalAtlasLayer can color them distinctly. amScore/ecmScore
      // come from the same heuristics used to build the heat surfaces
      // (dominant plant + ecosystem keywords). Sample-level classification
      // means a real AM toggle paints cyan dots, EcM paints magenta dots —
      // no more "no AM/EcM fungi on the map".
      const amScore = estimateAmScore(sample)
      const ecmScore = estimateEcmScore(sample)
      const mycorrhiza: "am" | "ecm" | "mixed" | "other" =
        amScore > 0.55 && amScore > ecmScore + 0.1 ? "am" :
        ecmScore > 0.55 && ecmScore > amScore + 0.1 ? "ecm" :
        amScore > 0.4 || ecmScore > 0.4 ? "mixed" :
        "other"
      const myColor =
        mycorrhiza === "am" ? "#22d3ee" :       // cyan — arbuscular
        mycorrhiza === "ecm" ? "#d946ef" :      // magenta — ectomycorrhizal
        mycorrhiza === "mixed" ? "#a78bfa" :    // violet — both
        colorForSampleGroup(sample.group)
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [sample.lng, sample.lat] },
        properties: {
          id: sample.id,
          name: sample.sampleType || "Fungal sample",
          source: sample.source,
          group: sample.group,
          mycorrhiza,
          am_score: amScore,
          ecm_score: ecmScore,
          glyph: sample.group === "mushroom" || sample.group === "mycelium" || sample.group === "fungi" ? "\u{1F344}" : sample.group.slice(0, 1).toUpperCase(),
          color: myColor,
          observed_on: sample.observed_on,
          country: sample.country,
          location: sample.location,
          environment_type: sample.environmentType,
          ecosystem: sample.ecosystem,
          barcode_region: sample.barcodeRegion,
          sequence_total: sample.sequenceTotal,
          confidence: sample.confidence,
          source_resolution: sample.sourceResolution,
          native_resolution_m: sample.nativeResolutionMeters,
        },
      }
    }),
  }
}

function colorForSampleGroup(group: FungalSampleGroup): string {
  switch (group) {
    case "mushroom": return "#f59e0b"
    case "mold": return "#84cc16"
    case "mildew": return "#a3e635"
    case "yeast": return "#f472b6"
    case "mycelium": return "#22c55e"
    default: return "#b45309"
  }
}

export function tileToBounds(z: number, x: number, y: number): FungalAtlasBounds {
  const n = 2 ** z
  const west = (x / n) * 360 - 180
  const east = ((x + 1) / n) * 360 - 180
  const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI)
  const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI)
  return { north, south, east, west }
}

function scoreCell(cell: FungalAtlasCell | undefined, layer: FungalAtlasLayer): number {
  if (!cell) return 0
  switch (layer) {
    case "am": return cell.amScore * 0.65 + cell.richness * 0.35
    case "ecm": return cell.ecmScore * 0.65 + cell.richness * 0.35
    case "rarity": return cell.rarity
    case "endemic": return cell.endemicity
    case "fci": return cell.fciPriority
    case "protected": return clamp01(cell.endemicity * 0.45 + cell.rarity * 0.3 + cell.uncertainty * 0.25)
    case "mycelium":
    default: return clamp01(cell.richness * 0.38 + cell.activity * 0.34 + Math.max(cell.amScore, cell.ecmScore) * 0.28)
  }
}

function smoothNoise(lat: number, lng: number, z: number): number {
  const scale = Math.max(1, Math.min(16, z))
  const n1 = Math.sin(lat * 0.91 * scale + lng * 0.37) * 0.5 + 0.5
  const n2 = Math.cos(lat * 0.21 - lng * 0.63 * scale) * 0.5 + 0.5
  return (n1 + n2) / 2
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function hashNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123
  return n - Math.floor(n)
}

function valueNoise(lat: number, lng: number, scale: number, seed: number): number {
  const x = (lng + 180) * scale
  const y = (lat + 90) * scale
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = fade(x - ix)
  const fy = fade(y - iy)
  const a = hashNoise(ix, iy, seed)
  const b = hashNoise(ix + 1, iy, seed)
  const c = hashNoise(ix, iy + 1, seed)
  const d = hashNoise(ix + 1, iy + 1, seed)
  const x1 = a + (b - a) * fx
  const x2 = c + (d - c) * fx
  return x1 + (x2 - x1) * fy
}

function cellNoise(lat: number, lng: number, cellDegrees: number, seed: number): number {
  const x = Math.floor((lng + 180) / cellDegrees)
  const y = Math.floor((lat + 90) / cellDegrees)
  return hashNoise(x, y, seed)
}

function nativeRasterPoint(lat: number, lng: number): { lat: number; lng: number } {
  const latCell = ATLAS_NATIVE_GRID_DEGREES
  const lngCell = ATLAS_NATIVE_GRID_DEGREES
  return {
    lat: Math.floor((lat + 90) / latCell) * latCell + latCell / 2 - 90,
    lng: Math.floor((lng + 180) / lngCell) * lngCell + lngCell / 2 - 180,
  }
}

function fungalFbm(lat: number, lng: number, seed: number): number {
  let total = 0
  let amp = 0.52
  let norm = 0
  let scale = 0.16
  for (let i = 0; i < 5; i += 1) {
    total += valueNoise(lat, lng, scale, seed + i * 17) * amp
    norm += amp
    amp *= 0.52
    scale *= 2.08
  }
  return norm > 0 ? total / norm : 0
}

function lodDetail(lat: number, lng: number, zoom: number, seed: number): number {
  const regional = valueNoise(lat, lng, 0.8, seed) - 0.5
  const local = valueNoise(lat, lng, 2.2, seed + 31) - 0.5
  const fine = valueNoise(lat, lng, 7.5, seed + 67) - 0.5
  const micro = valueNoise(lat, lng, 18, seed + 103) - 0.5
  const ultra = valueNoise(lat, lng, 46, seed + 151) - 0.5
  const mid = clamp01((zoom - 4) / 4)
  const high = clamp01((zoom - 8) / 5)
  const pixel = clamp01((zoom - 11) / 4)
  return regional * 0.06 + local * 0.16 * mid + fine * 0.24 * high + micro * 0.18 * pixel + ultra * 0.1 * pixel
}

function nativePixelDetail(lat: number, lng: number, zoom: number, seed: number): number {
  const regional = clamp01((zoom - 3.5) / 3.5)
  const local = clamp01((zoom - 6.5) / 3)
  const yard = clamp01((zoom - 9) / 3)
  const grid = ATLAS_NATIVE_GRID_DEGREES
  return (
    (cellNoise(lat, lng, 0.12, seed) - 0.5) * 0.08 * regional +
    (cellNoise(lat, lng, 0.055, seed + 17) - 0.5) * 0.14 * regional +
    (cellNoise(lat, lng, 0.024, seed + 29) - 0.5) * 0.24 * local +
    (cellNoise(lat, lng, 0.0125, seed + 41) - 0.5) * 0.18 * yard +
    (cellNoise(lat, lng, grid * 2, seed + 59) - 0.5) * 0.12 * yard +
    (cellNoise(lat, lng, grid, seed + 71) - 0.5) * 0.06 * yard +
    (valueNoise(lat, lng, 7.5, seed + 53) - 0.5) * 0.05 * local
  )
}

function landPrior(lat: number, lng: number): number {
  if (lat < -58 || lat > 78) return 0
  const boxes: Array<[number, number, number, number]> = [
    [-170, -52, 8, 72],   // North America
    [-96, -34, -56, 18],  // South America
    [-18, 52, -35, 38],   // Africa
    [-12, 45, 35, 72],    // Europe
    [25, 180, 5, 72],     // Asia
    [95, 155, -45, -8],   // Australia
    [43, 51, -26, -11],   // Madagascar
    [164, 179, -48, -33], // New Zealand
    [-10, 2, 50, 60],     // British Isles
    [120, 150, -8, 2],    // Indonesia / PNG
  ]
  let score = 0
  for (const [west, east, south, north] of boxes) {
    if (lng < west || lng > east || lat < south || lat > north) continue
    const edge = Math.min(lng - west, east - lng, lat - south, north - lat)
    score = Math.max(score, clamp01(edge / 5 + 0.18))
  }
  return clamp01(score)
}

function hotspot(lat: number, lng: number, centerLat: number, centerLng: number, radius: number): number {
  const dx = (lng - centerLng) * Math.cos((centerLat * Math.PI) / 180)
  const dy = lat - centerLat
  return Math.exp(-(dx * dx + dy * dy) / (radius * radius))
}

function californiaFloristicSignal(lat: number, lng: number): number {
  return clamp01(
    hotspot(lat, lng, 34.2, -118.2, 5.8) * 0.52 +
    hotspot(lat, lng, 33.1, -116.8, 3.9) * 0.56 +
    hotspot(lat, lng, 32.1, -115.5, 4.6) * 0.42 +
    hotspot(lat, lng, 37.4, -119.4, 7.0) * 0.34
  )
}

function sanDiegoTopoTexture(lat: number, lng: number): number {
  const coastToMountains = clamp01((lng + 117.25) / 1.1)
  const peninsularRange =
    hotspot(lat, lng, 33.15, -116.72, 0.52) * 0.36 +
    hotspot(lat, lng, 32.88, -116.58, 0.48) * 0.32 +
    hotspot(lat, lng, 32.72, -116.82, 0.42) * 0.24
  const canyonTexture =
    (valueNoise(lat, lng, 7.2, 613) - 0.5) * 0.18 +
    (cellNoise(lat, lng, ATLAS_NATIVE_GRID_DEGREES * 4, 617) - 0.5) * 0.16
  return clamp01(0.22 + coastToMountains * 0.32 + peninsularRange + canyonTexture)
}

function nativeEnvironmentalTexture(lat: number, lng: number, layer: FungalAtlasLayer): number {
  const grid = ATLAS_NATIVE_GRID_DEGREES
  const broad =
    (valueNoise(lat, lng, 0.55, layer === "am" ? 701 : layer === "ecm" ? 719 : 733) - 0.5) * 0.22 +
    (valueNoise(lat, lng, 1.35, layer === "am" ? 743 : layer === "ecm" ? 761 : 773) - 0.5) * 0.2
  const local =
    (cellNoise(lat, lng, grid * 16, layer === "am" ? 811 : layer === "ecm" ? 829 : 839) - 0.5) * 0.2 +
    (cellNoise(lat, lng, grid * 8, layer === "am" ? 853 : layer === "ecm" ? 857 : 859) - 0.5) * 0.16 +
    (cellNoise(lat, lng, grid * 4, layer === "am" ? 877 : layer === "ecm" ? 881 : 883) - 0.5) * 0.12
  return broad + local
}

function predictedMycorrhizalRichness(lat: number, lng: number, zoom: number): number {
  const land = landPrior(lat, lng)
  if (land <= 0) return 0
  const absLat = Math.abs(lat)
  const tropical = clamp01(1 - absLat / 58)
  const temperate = Math.exp(-Math.pow(absLat - 43, 2) / (2 * 20 * 20))
  const boreal = Math.exp(-Math.pow(absLat - 58, 2) / (2 * 10 * 10)) * 0.28
  const aridPenalty =
    hotspot(lat, lng, 23, 13, 21) * 0.33 +
    hotspot(lat, lng, 24, 44, 18) * 0.27 +
    hotspot(lat, lng, -24, 133, 24) * 0.3 +
    hotspot(lat, lng, 37, -112, 16) * 0.38 +
    hotspot(lat, lng, 33, -116, 10) * 0.18
  const regionalHotspots =
    hotspot(lat, lng, -4, -62, 18) * 0.36 +
    hotspot(lat, lng, 9, -84, 12) * 0.32 +
    hotspot(lat, lng, 0, 21, 18) * 0.32 +
    hotspot(lat, lng, 8, 101, 18) * 0.34 +
    hotspot(lat, lng, 26, 88, 14) * 0.28 +
    hotspot(lat, lng, 46, -122, 12) * 0.24 +
    hotspot(lat, lng, 38, -83, 13) * 0.22 +
    hotspot(lat, lng, 47, 12, 16) * 0.22 +
    hotspot(lat, lng, 36, 138, 13) * 0.22 +
    hotspot(lat, lng, -38, 145, 10) * 0.2 +
    hotspot(lat, lng, 34.2, -118.2, 5.5) * 0.18 +
    hotspot(lat, lng, 33.3, -116.6, 4.5) * 0.26 +
    hotspot(lat, lng, 32.1, -115.5, 5.5) * 0.2
  const northAmericaRichness =
    hotspot(lat, lng, 34.5, -84.5, 9.5) * 0.34 +
    hotspot(lat, lng, 31.0, -82.0, 8.5) * 0.28 +
    hotspot(lat, lng, 43.0, -86.5, 9.5) * 0.2 +
    hotspot(lat, lng, 47.5, -122.0, 8.5) * 0.24 +
    hotspot(lat, lng, 37.4, -119.4, 7.5) * 0.22 +
    hotspot(lat, lng, 21.0, -99.0, 10.5) * 0.38 +
    hotspot(lat, lng, 17.0, -90.5, 9.5) * 0.42 +
    hotspot(lat, lng, 32.9, -116.7, 1.8) * 0.3 +
    hotspot(lat, lng, 33.25, -116.45, 1.35) * 0.18
  const dryInterior =
    hotspot(lat, lng, 39.0, -108.0, 9.0) * 0.12 +
    hotspot(lat, lng, 36.0, -116.0, 7.0) * 0.18 +
    hotspot(lat, lng, 32.5, -112.8, 7.5) * 0.16
  const california = californiaFloristicSignal(lat, lng)
  const sdTopo = lng > -118.6 && lng < -115.3 && lat > 31.4 && lat < 34.2
    ? sanDiegoTopoTexture(lat, lng) * 0.28
    : 0
  const texture = nativeEnvironmentalTexture(lat, lng, "mycelium")
  return clamp01(land * (0.1 + tropical * 0.28 + temperate * 0.2 + boreal + regionalHotspots + northAmericaRichness + california * 0.2 + sdTopo + texture - aridPenalty - dryInterior))
}

function predictedMycorrhizalLayer(lat: number, lng: number, zoom: number, layer: "am" | "ecm"): number {
  const base = predictedMycorrhizalRichness(lat, lng, zoom)
  if (base <= 0) return 0
  const absLat = Math.abs(lat)
  const tropical = clamp01(1 - absLat / 58)
  const temperate = Math.exp(-Math.pow(absLat - 43, 2) / (2 * 21 * 21))
  const boreal = Math.exp(-Math.pow(absLat - 58, 2) / (2 * 10 * 10))
  const texture =
    (fungalFbm(lat, lng, layer === "am" ? 71 : 103) - 0.5) +
    lodDetail(lat, lng, zoom, layer === "am" ? 271 : 313) +
    nativePixelDetail(lat, lng, zoom, layer === "am" ? 353 : 383)
  if (layer === "am") {
    const amHotspots =
      hotspot(lat, lng, 34, -112, 15) * 0.26 +
      hotspot(lat, lng, 25, -103, 15) * 0.18 +
      hotspot(lat, lng, 32.85, -116.9, 3.8) * 0.22 +
      hotspot(lat, lng, 33.35, -116.55, 3.4) * 0.16 +
      hotspot(lat, lng, 32.2, -115.55, 3.6) * 0.14 +
      hotspot(lat, lng, -6, -62, 20) * 0.24 +
      hotspot(lat, lng, 12, 78, 16) * 0.22 +
      hotspot(lat, lng, -22, 29, 16) * 0.16 +
      hotspot(lat, lng, 28.0, -101.0, 12.0) * 0.22 +
      hotspot(lat, lng, 20.0, -99.0, 10.0) * 0.32 +
      hotspot(lat, lng, 17.0, -90.0, 8.0) * 0.34
    const amDryPenalty =
      hotspot(lat, lng, 36.5, -116.5, 6.0) * 0.1 +
      hotspot(lat, lng, 32.2, -112.8, 6.5) * 0.1
    const sd = lng > -118.4 && lng < -115.4 && lat > 31.4 && lat < 34.2
      ? sanDiegoTopoTexture(lat, lng) * 0.22
      : 0
    return clamp01(base * (0.25 + tropical * 0.11 + amHotspots * 0.44 + sd * 0.78 + texture * 0.22 - amDryPenalty * 1.12))
  }
  const ecmHotspots =
    hotspot(lat, lng, 45, -122, 14) * 0.34 +
    hotspot(lat, lng, 39, -82, 16) * 0.3 +
    hotspot(lat, lng, 48, 10, 19) * 0.3 +
    hotspot(lat, lng, 37, 138, 14) * 0.26 +
    hotspot(lat, lng, 55, 62, 24) * 0.2 +
    hotspot(lat, lng, -42, 146, 10) * 0.22 +
    hotspot(lat, lng, 33.1, -116.65, 1.25) * 0.26 +
    hotspot(lat, lng, 34.25, -117.05, 1.4) * 0.18 +
    hotspot(lat, lng, 35.8, -119.1, 2.1) * 0.14
  const coastalEcmSignal =
    hotspot(lat, lng, 34.0, -118.2, 5.4) * 0.24 +
    hotspot(lat, lng, 32.95, -116.9, 3.6) * 0.24 +
    hotspot(lat, lng, 33.45, -116.55, 3.2) * 0.18 +
    hotspot(lat, lng, 32.25, -115.55, 3.8) * 0.14
  const southwestDryPenalty =
    hotspot(lat, lng, 32.9, -116.8, 4.4) * 0.08 +
    hotspot(lat, lng, 34.0, -117.6, 4.2) * 0.06 +
    hotspot(lat, lng, 32.1, -115.3, 4.2) * 0.06
  return clamp01(base * (0.16 + temperate * 0.17 + boreal * 0.14 + ecmHotspots * 0.5 + coastalEcmSignal * 0.24 + texture * 0.2 - southwestDryPenalty * 1.42))
}

function predictedRarityLayer(lat: number, lng: number, zoom: number, layer: "rarity" | "endemic"): number {
  const richness = predictedMycorrhizalRichness(lat, lng, zoom)
  if (richness <= 0) return 0
  const californiaFloristic =
    hotspot(lat, lng, 34.1, -118.2, 5.6) * 0.24 +
    hotspot(lat, lng, 32.9, -116.6, 3.8) * 0.34 +
    hotspot(lat, lng, 31.7, -115.2, 4.2) * 0.2
  const globalHotspots =
    hotspot(lat, lng, 10, -84, 11) * 0.24 +
    hotspot(lat, lng, -4, -62, 14) * 0.28 +
    hotspot(lat, lng, 5, 100, 13) * 0.24 +
    hotspot(lat, lng, 37, 138, 11) * 0.18 +
    hotspot(lat, lng, -38, 145, 9) * 0.2
  const texture = (fungalFbm(lat, lng, layer === "rarity" ? 421 : 431) - 0.5) * 0.24 + lodDetail(lat, lng, zoom, 439)
  const base = richness * (layer === "endemic" ? 0.58 : 0.48) + californiaFloristic + globalHotspots + texture
  return clamp01(base)
}

function predictedProtectedOverlap(lat: number, lng: number, zoom: number): number {
  const protectedSignals =
    hotspot(lat, lng, 32.94, -117.24, 0.2) * 0.78 + // Torrey Pines / coastal reserve belt
    hotspot(lat, lng, 32.84, -117.12, 0.24) * 0.64 + // Marian Bear / Rose Canyon
    hotspot(lat, lng, 32.91, -116.86, 0.45) * 0.74 + // Mission Trails / MCAS Miramar open space
    hotspot(lat, lng, 32.6, -116.94, 0.24) * 0.7 + // Otay / Tijuana estuary area
    hotspot(lat, lng, 33.1, -116.85, 0.5) * 0.58 +
    hotspot(lat, lng, 34.05, -118.55, 1.15) * 0.58 +
    hotspot(lat, lng, 37.8, -119.5, 1.3) * 0.56
  const texture = (valueNoise(lat, lng, 5.5, 467) - 0.5) * 0.12
  return clamp01(protectedSignals + texture)
}

function predictedFciPriority(lat: number, lng: number, zoom: number): number {
  const richness = predictedMycorrhizalRichness(lat, lng, zoom)
  const rarity = predictedRarityLayer(lat, lng, zoom, "rarity")
  const uncertainty = 0.28 + (1 - Math.min(0.86, richness)) * 0.32 + (fungalFbm(lat, lng, 503) - 0.5) * 0.18
  const deploymentFocus =
    hotspot(lat, lng, 32.56, -117.08, 0.62) * 0.32 +
    hotspot(lat, lng, 33.25, -116.65, 0.7) * 0.22 +
    hotspot(lat, lng, 35.18, -115.9, 0.8) * 0.18
  return clamp01(richness * 0.42 + rarity * 0.26 + uncertainty * 0.2 + deploymentFocus)
}

function interpolationRadius(layer: FungalAtlasLayer): number {
  switch (layer) {
    case "rarity":
    case "endemic":
    case "fci":
    case "protected":
      return 1.25
    case "am":
    case "ecm":
      return 2.65
    case "mycelium":
    default:
      return 2.9
  }
}

function stablePredictedSurface(lat: number, lng: number, layer: FungalAtlasLayer): number {
  const point = layer === "protected" ? { lat, lng } : nativeRasterPoint(lat, lng)
  const plat = point.lat
  const plng = point.lng
  switch (layer) {
    case "am":
      return predictedMycorrhizalLayer(plat, plng, STABLE_MODEL_DETAIL_ZOOM, "am")
    case "ecm":
      return predictedMycorrhizalLayer(plat, plng, STABLE_MODEL_DETAIL_ZOOM, "ecm")
    case "rarity":
      return predictedRarityLayer(plat, plng, STABLE_MODEL_DETAIL_ZOOM, "rarity")
    case "endemic":
      return predictedRarityLayer(plat, plng, STABLE_MODEL_DETAIL_ZOOM, "endemic")
    case "fci":
      return predictedFciPriority(plat, plng, STABLE_MODEL_DETAIL_ZOOM)
    case "protected":
      return predictedProtectedOverlap(lat, lng, STABLE_MODEL_DETAIL_ZOOM)
    case "mycelium":
    default:
      return predictedMycorrhizalRichness(plat, plng, STABLE_MODEL_DETAIL_ZOOM)
  }
}

function stableAtlasTexture(lat: number, lng: number, layer: FungalAtlasLayer): number {
  const seed = layer === "am" ? 811 : layer === "ecm" ? 977 : layer === "rarity" ? 1223 : layer === "endemic" ? 1439 : layer === "fci" ? 1613 : 701
  return (
    (valueNoise(lat, lng, 22, seed) - 0.5) * 0.06 +
    (valueNoise(lat, lng, 58, seed + 19) - 0.5) * 0.1 +
    (valueNoise(lat, lng, 118, seed + 43) - 0.5) * 0.08
  )
}

function nearbySourceCells(cache: AtlasCache, lat: number, lng: number, radius: number): FungalAtlasCell[] {
  const deg = INTERPOLATION_BUCKET_DEGREES
  const y = Math.floor((lat + 90) / deg)
  const x = Math.floor((lng + 180) / deg)
  const r = Math.ceil(radius / deg)
  const cells: FungalAtlasCell[] = []
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const bucket = cache.spatialBuckets.get(`${y + dy}:${x + dx}`)
      if (bucket) cells.push(...bucket)
    }
  }
  return cells
}

function valueAt(cache: AtlasCache, lat: number, lng: number, layer: FungalAtlasLayer, _zoom: number, landPolygons?: LandPolygon[] | null, skipLandMask = false): number {
  if (!skipLandMask && (landPolygons ? !isLikelyLandInPolygons(lat, lng, landPolygons) : !isNatureObservationOnLand(lat, lng))) return 0

  const modelValue = stablePredictedSurface(lat, lng, layer)
  const radius = interpolationRadius(layer)
  let weighted = 0
  let weight = 0
  let nearest = Number.POSITIVE_INFINITY
  let sampleWeight = 0
  for (const cell of nearbySourceCells(cache, lat, lng, radius)) {
    const dx = (lng - cell.lng) * Math.cos((lat * Math.PI) / 180)
    const dy = lat - cell.lat
    const dist = Math.hypot(dx, dy)
    if (dist > radius) continue
    nearest = Math.min(nearest, dist)
    const support = 0.55 + clamp01(Math.log1p(cell.sampleCount) / Math.log1p(90)) * 0.45
    const w = Math.exp(-(dist * dist) / (2 * radius * radius * 0.22)) * support
    weighted += scoreCell(cell, layer) * w
    weight += w
    sampleWeight += cell.sampleCount * w
  }
  if (weight <= 0 || !Number.isFinite(nearest)) return clamp01(modelValue * 0.92)
  const coverage = Math.pow(clamp01(1 - nearest / radius), layer === "mycelium" || layer === "am" || layer === "ecm" ? 0.45 : 0.7)
  const density = 0.68 + clamp01(Math.log1p(sampleWeight) / Math.log1p(260)) * 0.32
  const texture = stableAtlasTexture(lat, lng, layer)
  const sourceValue = (weighted / weight) * (0.32 + coverage * 0.82) * density * (1 + texture)
  return clamp01(modelValue * 0.54 + sourceValue * 0.64)
}

function fungalTileSize(z: number, layer: FungalAtlasLayer): number {
  if (z < 5) return 96
  if (z < 8) return 160
  if (z < 9) return layer === "mycelium" || layer === "am" || layer === "ecm" ? 224 : 192
  return 256
}

function gradient(layer: FungalAtlasLayer, value: number): [number, number, number, number] {
  const v = layer === "am"
    ? clamp01(Math.pow(value, 1.12))
    : layer === "ecm"
      ? clamp01(Math.pow(value, 1.26))
      : layer === "mycelium"
        ? clamp01(Math.pow(value, 1.02))
        : clamp01(value)
  const transparentBelow = layer === "mycelium" || layer === "am" || layer === "ecm" ? 0 : 0.08
  if (v < transparentBelow) return [0, 0, 0, 0]
  if (layer === "mycelium") return lerpStops(v, [
    [0, [28, 63, 191, 222]],
    [0.16, [31, 78, 201, 226]],
    [0.34, [48, 119, 174, 232]],
    [0.52, [62, 159, 133, 238]],
    [0.7, [121, 199, 105, 245]],
    [0.86, [206, 235, 78, 250]],
    [1, [250, 255, 104, 253]],
  ])
  if (layer === "am") return lerpStops(v, [
    [0, [31, 68, 195, 222]],
    [0.16, [36, 90, 203, 226]],
    [0.34, [55, 127, 174, 232]],
    [0.54, [72, 166, 128, 240]],
    [0.72, [137, 204, 93, 247]],
    [0.88, [217, 241, 74, 251]],
    [1, [252, 255, 111, 253]],
  ])
  if (layer === "ecm") return lerpStops(v, [
    [0, [27, 55, 184, 220]],
    [0.18, [38, 82, 191, 225]],
    [0.36, [56, 119, 167, 232]],
    [0.56, [79, 155, 131, 239]],
    [0.74, [133, 194, 112, 246]],
    [0.9, [203, 231, 95, 250]],
    [1, [246, 252, 145, 253]],
  ])
  if (layer === "rarity") return lerpStops(v, [
    [0.08, [0, 0, 0, 0]],
    [0.28, [103, 112, 44, 74]],
    [0.55, [150, 153, 55, 118]],
    [0.78, [193, 199, 72, 158]],
    [1, [245, 244, 131, 190]],
  ])
  if (layer === "endemic") return lerpStops(v, [
    [0.08, [0, 0, 0, 0]],
    [0.26, [88, 52, 112, 72]],
    [0.52, [128, 83, 108, 114]],
    [0.76, [152, 129, 92, 154]],
    [1, [193, 187, 108, 190]],
  ])
  if (layer === "fci") return lerpStops(v, [
    [0.08, [0, 0, 0, 0]],
    [0.28, [20, 184, 166, 65]],
    [0.56, [34, 197, 94, 115]],
    [0.8, [250, 204, 21, 165]],
    [1, [244, 63, 94, 200]],
  ])
  if (layer === "protected") return lerpStops(v, [
    [0.08, [0, 0, 0, 0]],
    [0.36, [59, 130, 246, 38]],
    [0.68, [6, 182, 212, 80]],
    [1, [191, 219, 254, 130]],
  ])
  return lerpStops(v, [
    [0.02, [0, 0, 0, 0]],
    [0.24, [16, 185, 129, 40]],
    [0.5, [34, 197, 94, 72]],
    [0.72, [132, 204, 22, 104]],
    [0.9, [250, 204, 21, 140]],
    [1, [240, 253, 244, 166]],
  ])
}

function lerpStops(value: number, stops: Array<[number, [number, number, number, number]]>): [number, number, number, number] {
  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  let lower = stops[0]
  let upper = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (value >= stops[i][0] && value <= stops[i + 1][0]) {
      lower = stops[i]
      upper = stops[i + 1]
      break
    }
  }
  const range = upper[0] - lower[0]
  const t = range === 0 ? 0 : clamp01((value - lower[0]) / range)
  return [
    Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * t),
    Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * t),
    Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * t),
    Math.round(lower[1][3] + (upper[1][3] - lower[1][3]) * t),
  ]
}

function overlay(base: [number, number, number, number], color: [number, number, number, number], strength: number): [number, number, number, number] {
  const t = clamp01(strength)
  return [
    Math.round(base[0] + (color[0] - base[0]) * t),
    Math.round(base[1] + (color[1] - base[1]) * t),
    Math.round(base[2] + (color[2] - base[2]) * t),
    Math.max(base[3], Math.round(color[3] * t)),
  ]
}

function myceliumTexture(cache: AtlasCache, lat: number, lng: number, layer: FungalAtlasLayer, z: number, value: number, base: [number, number, number, number]): [number, number, number, number] {
  return base
}

function alphaScale(color: [number, number, number, number], scale: number): [number, number, number, number] {
  return [color[0], color[1], color[2], Math.round(color[3] * clamp01(scale))]
}

function blendSourceOver(
  under: [number, number, number, number],
  overColor: [number, number, number, number],
): [number, number, number, number] {
  const oa = clamp01(overColor[3] / 255)
  if (oa <= 0) return under
  const ua = clamp01(under[3] / 255)
  const outA = oa + ua * (1 - oa)
  if (outA <= 0) return [0, 0, 0, 0]
  return [
    Math.round((overColor[0] * oa + under[0] * ua * (1 - oa)) / outA),
    Math.round((overColor[1] * oa + under[1] * ua * (1 - oa)) / outA),
    Math.round((overColor[2] * oa + under[2] * ua * (1 - oa)) / outA),
    Math.round(outA * 255),
  ]
}

function compositeTileSize(z: number, layers: FungalAtlasHeatLayer[]): number {
  if (z < 5) return 96
  if (z < 8) return layers.length <= 1 ? 160 : 128
  if (z < 9) return layers.length <= 1 ? 224 : 192
  return 256
}

function normalizeCompositeLayers(layers: readonly FungalAtlasHeatLayer[]): FungalAtlasHeatLayer[] {
  const order: FungalAtlasHeatLayer[] = ["mycelium", "am", "ecm", "rarity", "endemic", "fci"]
  const active = new Set(layers)
  return order.filter((layer) => active.has(layer))
}

function compositeDisplayValue(layer: FungalAtlasHeatLayer, value: number, totalLayers: number): number {
  const v = clamp01(value)
  if (layer === "rarity" || layer === "endemic" || layer === "fci") {
    return totalLayers >= 5 ? clamp01(v * 0.72) : v
  }
  if (totalLayers >= 5) return clamp01(v * 0.68)
  if (totalLayers >= 3) return clamp01(v * 0.74)
  if (totalLayers >= 2) return clamp01(v * 0.8)
  return clamp01(v * 0.86)
}

function compositeLayerAlpha(layer: FungalAtlasHeatLayer, totalLayers: number): number {
  if (totalLayers <= 1) return 0.92
  if (layer === "rarity" || layer === "endemic") return totalLayers >= 5 ? 0.18 : 0.34
  if (layer === "fci") return totalLayers >= 5 ? 0.16 : 0.36
  if (layer === "mycelium") return totalLayers >= 5 ? 0.5 : 0.62
  return totalLayers >= 5 ? 0.56 : 0.66
}

function isMycorrhizalRasterLayer(layer: FungalAtlasLayer): boolean {
  return layer === "mycelium" || layer === "am" || layer === "ecm"
}

function nativeExcludedDisplayArea(lat: number, lng: number, layer: FungalAtlasLayer, value: number): boolean {
  if (!isMycorrhizalRasterLayer(layer)) return false
  const urbanSanDiego =
    hotspot(lat, lng, 32.72, -117.16, 0.055) * 0.34 +
    hotspot(lat, lng, 32.80, -117.12, 0.065) * 0.22 +
    hotspot(lat, lng, 32.63, -117.08, 0.06) * 0.18
  const urbanLosAngeles =
    hotspot(lat, lng, 34.05, -118.25, 0.16) * 0.28 +
    hotspot(lat, lng, 33.94, -118.25, 0.13) * 0.18
  const desertRock =
    hotspot(lat, lng, 33.15, -115.85, 1.2) * 0.12 +
    hotspot(lat, lng, 36.1, -116.4, 4.2) * 0.1 +
    hotspot(lat, lng, 32.6, -112.7, 4.4) * 0.08
  const snowIce =
    Math.abs(lat) > 69 ? 0.7 : Math.abs(lat) > 64 ? 0.32 : 0
  const maskScore = urbanSanDiego + urbanLosAngeles + desertRock + snowIce
  if (value > 0.68) return maskScore > 1.35
  if (value > 0.46) return maskScore > 1.12
  return maskScore > 0.92
}

export async function renderFungalAtlasTileRgba(
  layer: FungalAtlasLayer,
  z: number,
  x: number,
  y: number,
): Promise<{ rgba: Uint8Array; size: number }> {
  const cache = await getAtlasCache()
  const bounds = tileToBounds(z, x, y)
  const landPolygons = landPolygonsForBounds(bounds)
  const landMode = tileLandCoverageMode(bounds, landPolygons)
  if (landMode === "water") return { rgba: new Uint8Array(fungalTileSize(z, layer) * fungalTileSize(z, layer) * 4), size: fungalTileSize(z, layer) }
  const size = fungalTileSize(z, layer)
  const rgba = new Uint8Array(size * size * 4)
  for (let py = 0; py < size; py += 1) {
    const lat = bounds.north - ((py + 0.5) / size) * (bounds.north - bounds.south)
    for (let px = 0; px < size; px += 1) {
      const lng = bounds.west + ((px + 0.5) / size) * (bounds.east - bounds.west)
      const v = valueAt(cache, lat, lng, layer, z, landPolygons, landMode === "land")
      if (nativeExcludedDisplayArea(lat, lng, layer, v)) continue
      const [r, g, b, a] = myceliumTexture(cache, lat, lng, layer, z, v, gradient(layer, v))
      const idx = (py * size + px) * 4
      rgba[idx] = r
      rgba[idx + 1] = g
      rgba[idx + 2] = b
      rgba[idx + 3] = a
    }
  }
  return { rgba, size }
}

export async function renderFungalAtlasCompositeTileRgba(
  layers: readonly FungalAtlasHeatLayer[],
  z: number,
  x: number,
  y: number,
): Promise<{ rgba: Uint8Array; size: number; layers: FungalAtlasHeatLayer[] }> {
  const activeLayers = normalizeCompositeLayers(layers)
  if (activeLayers.length === 0) activeLayers.push("mycelium")

  const bounds = tileToBounds(z, x, y)
  const landPolygons = landPolygonsForBounds(bounds)
  const size = compositeTileSize(z, activeLayers)
  const rgba = new Uint8Array(size * size * 4)
  const landMode = tileLandCoverageMode(bounds, landPolygons)
  if (landMode === "water") return { rgba, size, layers: activeLayers }
  const landBlock = landMode === "land" ? size : z >= 12 ? 1 : z >= 8 ? 2 : z >= 6 ? 4 : 2
  const landCols = Math.ceil(size / landBlock)
  const landRows = Math.ceil(size / landBlock)
  const landGrid = new Uint8Array(landCols * landRows)

  if (landMode === "land") {
    landGrid.fill(1)
  } else {
    for (let gy = 0; gy < landRows; gy += 1) {
      const py = Math.min(size - 1, gy * landBlock + landBlock / 2)
      const lat = bounds.north - ((py + 0.5) / size) * (bounds.north - bounds.south)
      for (let gx = 0; gx < landCols; gx += 1) {
        const px = Math.min(size - 1, gx * landBlock + landBlock / 2)
        const lng = bounds.west + ((px + 0.5) / size) * (bounds.east - bounds.west)
        landGrid[gy * landCols + gx] = landPolygons
          ? (isLikelyLandInPolygons(lat, lng, landPolygons) ? 1 : 0)
          : (isNatureObservationOnLand(lat, lng) ? 1 : 0)
      }
    }
  }

  for (let py = 0; py < size; py += 1) {
    const lat = bounds.north - ((py + 0.5) / size) * (bounds.north - bounds.south)
    const gy = Math.floor(py / landBlock)
    for (let px = 0; px < size; px += 1) {
      const lng = bounds.west + ((px + 0.5) / size) * (bounds.east - bounds.west)
      const gx = Math.floor(px / landBlock)
      if (!landGrid[gy * landCols + gx]) continue
      let out: [number, number, number, number] = [0, 0, 0, 0]
      for (const layer of activeLayers) {
        const v = compositeDisplayValue(layer, stablePredictedSurface(lat, lng, layer), activeLayers.length)
        if (v <= 0) continue
        if (nativeExcludedDisplayArea(lat, lng, layer, v)) continue
        const color = gradient(layer, v)
        out = blendSourceOver(out, alphaScale(color, compositeLayerAlpha(layer, activeLayers.length)))
      }
      const idx = (py * size + px) * 4
      rgba[idx] = out[0]
      rgba[idx + 1] = out[1]
      rgba[idx + 2] = out[2]
      rgba[idx + 3] = out[3]
    }
  }
  return { rgba, size, layers: activeLayers }
}

export { DEFAULT_TILE_SIZE as FUNGAL_ATLAS_TILE_SIZE, fungalTileSize as fungalAtlasTileSize }
