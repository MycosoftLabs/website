import type { AerosolLayerId, AerosolLayerState } from "./contracts"

export type SharedEarthSource =
  | "earth2-spore"
  | "sporebase"
  | "sporebase-lab"
  | "crep-fungal-occurrence"
  | "mindex-air-quality"
  | "mindex-firms"
  | "mindex-weather"
  | "earth2-wind"
  | "airnow"
  | "quarantined"

export interface SharedEarthLayerStatus {
  layerId: AerosolLayerId
  state: AerosolLayerState
  source: SharedEarthSource
  sourceLabel: string
  sourceRef: string
  count: number | null
  checkedAt: string | null
  observedAt: string | null
  cached: boolean
  reason: string
}

/**
 * Aerosol controls mapped onto the same CREP LayerConfig ids used by Earth
 * Simulator. Earth-2 spore and wind overlays are mounted with the existing
 * shared layer components because CREP currently exposes them through its
 * internal Earth-2 filter rather than LayerConfig ids.
 */
export const AEROSOL_TO_CREP_LAYER_IDS: Readonly<Record<AerosolLayerId, readonly string[]>> = {
  sporebase: ["sporebase"],
  "sporebase-lab": [],
  "fungal-occurrence": ["fungi"],
  "modeled-spore-dispersal": [],
  particulate: [],
  "nasa-firms-fire": ["mindexFirms"],
  smoke: [],
  wind: [],
  "air-quality": ["mindexAirQuality", "liveAqi"],
}

export function sharedCrepLayerIdsForAerosolLayers(layerIds: readonly AerosolLayerId[]): string[] {
  return [...new Set(layerIds.flatMap((layerId) => AEROSOL_TO_CREP_LAYER_IDS[layerId]))]
}

const SOURCE_LABELS: Record<SharedEarthSource, string> = {
  "earth2-spore": "Earth-2 / MAS modeled dispersal",
  sporebase: "SporeBase / MAS device & environmental telemetry",
  "sporebase-lab": "SporeBase delayed laboratory tape results",
  "crep-fungal-occurrence": "CREP / MINDEX fungal occurrence",
  "mindex-air-quality": "MINDEX atmos.air_quality",
  "mindex-firms": "MINDEX earth.wildfires / NASA FIRMS",
  "mindex-weather": "MINDEX atmos.weather_observations",
  "earth2-wind": "Earth-2 / MAS wind vectors",
  airnow: "AirNow monitor network",
  quarantined: "No qualified operational renderer",
}

const SOURCE_REFS: Record<SharedEarthSource, string> = {
  "earth2-spore": "/api/earth2/spore-dispersal",
  sporebase: "/api/devices/sporebase",
  "sporebase-lab": "/api/devices/sporebase/samples",
  "crep-fungal-occurrence": "/api/crep/fungal",
  "mindex-air-quality": "/api/crep/environment/air-quality",
  "mindex-firms": "/api/crep/environment/wildfires",
  "mindex-weather": "/api/crep/environment/weather",
  "earth2-wind": "/api/earth2/layers/wind",
  airnow: "/api/crep/airnow/bbox",
  quarantined: "none",
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function array(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function iso(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString()
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

const SPOREBASE_INTERVAL_MS = 15 * 60 * 1000

function firstIso(body: Record<string, unknown>, names: readonly string[]): string | null {
  for (const name of names) {
    const value = iso(body[name])
    if (value) return value
  }
  return null
}

function firstText(body: Record<string, unknown>, names: readonly string[]): string | null {
  for (const name of names) {
    const value = text(body[name])
    if (value) return value
  }
  return null
}

function sampleIdentifications(sample: Record<string, unknown>): unknown[] {
  for (const key of ["identifications", "detections", "taxa", "results"] as const) {
    const values = array(sample[key])
    if (values) return values
  }
  return firstText(sample, ["taxon", "species", "scientific_name", "scientificName"])
    ? [sample]
    : []
}

function qualifiedLabInterval(sampleValue: unknown): { count: number; endAt: string } | null {
  const sample = record(sampleValue)
  if (!sample) return null
  const sampleStatus = firstText(sample, ["status", "analysis_status", "analysisStatus"])?.toLowerCase()
  const startAt = firstIso(sample, ["start_time", "startAt", "interval_start", "intervalStartAt"])
  const endAt = firstIso(sample, ["end_time", "endAt", "interval_end", "intervalEndAt"])
  const reportedAt = firstIso(sample, ["reported_at", "reportedAt", "results_at", "resultsAt", "analyzed_at", "analyzedAt"])
  const labId = firstText(sample, ["lab_id", "labId"]) ?? firstText(record(sample.provenance) ?? {}, ["lab_id", "labId", "provider"])
  const analysis = firstText(sample, ["analysis_type", "analysisType", "method"]) ?? firstText(record(sample.provenance) ?? {}, ["analysis_type", "analysisType", "method"])
  const identifications = sampleIdentifications(sample).filter((value) => {
    const result = record(value)
    return result != null && firstText(result, ["taxon", "species", "scientific_name", "scientificName", "name"]) != null
  })
  if (!sampleStatus || !["results_ready", "completed", "complete", "archived"].includes(sampleStatus)) return null
  if (!startAt || !endAt || !reportedAt || !labId || !analysis || identifications.length === 0) return null
  if (Date.parse(endAt) - Date.parse(startAt) !== SPOREBASE_INTERVAL_MS) return null
  if (Date.parse(reportedAt) < Date.parse(endAt)) return null
  return { count: identifications.length, endAt }
}

function qualifiedFungalOccurrence(value: unknown): { observedAt: string | null } | null {
  const observation = record(value)
  if (!observation) return null
  const latitude = Number(observation.latitude ?? record(observation.location)?.lat)
  const longitude = Number(observation.longitude ?? record(observation.location)?.lng)
  const taxon = firstText(observation, ["scientificName", "scientific_name", "species", "taxon", "commonName"])
  const provider = firstText(observation, ["source", "provider"])
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null
  if (!taxon || !provider) return null
  return { observedAt: firstIso(observation, ["timestamp", "observedAt", "observed_at", "time_observed_at", "createdAt"]) }
}

function hasQualifiedMeteorology(body: Record<string, unknown>): boolean {
  const metadata = record(body.metadata)
  const meteorology = record(body.meteorology) ?? record(body.weather) ?? record(metadata?.meteorology) ?? record(metadata?.weather)
  const model = firstText(body, ["model", "model_id", "modelId"]) ?? firstText(metadata ?? {}, ["model", "model_id", "modelId"])
  const runId = firstText(body, ["run_id", "runId"]) ?? firstText(metadata ?? {}, ["run_id", "runId"])
  const driverSource = meteorology ? firstText(meteorology, ["source", "provider", "model"]) : null
  const driverTime = meteorology ? firstIso(meteorology, ["valid_at", "validAt", "run_at", "runAt", "observed_at", "observedAt"]) : null
  return Boolean(model && runId && driverSource && driverTime)
}

function newestObservedAt(features: readonly unknown[], propertyNames: readonly string[]): string | null {
  let newest: string | null = null
  for (const featureValue of features) {
    const feature = record(featureValue)
    const properties = record(feature?.properties)
    if (!properties) continue
    for (const propertyName of propertyNames) {
      const candidate = iso(properties[propertyName])
      if (candidate && (!newest || Date.parse(candidate) > Date.parse(newest))) newest = candidate
    }
  }
  return newest
}

function status(
  layerId: AerosolLayerId,
  source: SharedEarthSource,
  state: AerosolLayerState,
  checkedAt: string | null,
  options: Partial<Pick<SharedEarthLayerStatus, "count" | "observedAt" | "cached" | "reason">> = {},
): SharedEarthLayerStatus {
  return {
    layerId,
    state,
    source,
    sourceLabel: SOURCE_LABELS[source],
    sourceRef: SOURCE_REFS[source],
    count: options.count ?? null,
    checkedAt,
    observedAt: options.observedAt ?? null,
    cached: options.cached ?? false,
    reason: options.reason ?? "No verified source result is available.",
  }
}

export function loadingSharedEarthStatuses(checkedAt: string | null = null): SharedEarthLayerStatus[] {
  return [
    status("sporebase", "sporebase", "loading", checkedAt, {
      reason: "Checking physical SporeBase devices and live environmental telemetry. Live values cannot identify a species or taxon.",
    }),
    status("sporebase-lab", "sporebase-lab", "loading", checkedAt, {
      reason: "Checking delayed lab identifications backfilled to 15-minute intervals on a 30-day tape.",
    }),
    status("fungal-occurrence", "crep-fungal-occurrence", "loading", checkedAt, {
      reason: "Checking known fungal/taxon occurrence through the existing CREP and MINDEX source chain.",
    }),
    status("modeled-spore-dispersal", "earth2-spore", "loading", checkedAt, {
      reason: "Checking explicitly modeled spore dispersal and its wind/meteorology qualification.",
    }),
    status("particulate", "mindex-air-quality", "loading", checkedAt, { reason: "Checking MINDEX for explicit PM2.5, PM10, or dust readings." }),
    status("nasa-firms-fire", "mindex-firms", "loading", checkedAt, { reason: "Checking the shared MINDEX FIRMS contract." }),
    status("smoke", "quarantined", "unbound", checkedAt, {
      reason: "The current CREP smoke renderer injects stochastic plume defaults, so it is quarantined until a deterministic, provenance-bearing plume contract is available.",
    }),
    status("wind", "earth2-wind", "loading", checkedAt, { reason: "Checking shared Earth-2 vectors and MINDEX weather observations." }),
    status("air-quality", "mindex-air-quality", "loading", checkedAt, { reason: "Checking shared MINDEX and AirNow air-quality contracts." }),
  ]
}

export function failedSharedEarthStatus(
  layerId: AerosolLayerId,
  source: SharedEarthSource,
  checkedAt: string,
  reason: string,
): SharedEarthLayerStatus {
  return status(layerId, source, "error", checkedAt, { reason })
}

export function classifyMindexFeatureCollection(options: {
  layerId: AerosolLayerId
  source: Extract<SharedEarthSource, "mindex-air-quality" | "mindex-firms" | "mindex-weather">
  payload: unknown
  checkedAt: string
  freshnessMs: number
  observedProperties: readonly string[]
  featureFilter?: (feature: unknown) => boolean
}): SharedEarthLayerStatus {
  const body = record(options.payload)
  const meta = record(body?.meta)
  const features = array(body?.features)
  if (!body || !meta || !features) {
    return failedSharedEarthStatus(options.layerId, options.source, options.checkedAt, "The shared MINDEX response did not match its FeatureCollection contract.")
  }
  if (meta.upstream !== "mindex") {
    return status(options.layerId, options.source, "unbound", options.checkedAt, {
      count: 0,
      reason: "The view plane responded, but its MINDEX upstream was unavailable. No empty or all-clear conclusion is permitted.",
    })
  }
  const accepted = options.featureFilter ? features.filter(options.featureFilter) : features
  const observedAt = newestObservedAt(accepted, options.observedProperties)
  if (accepted.length === 0) {
    return status(options.layerId, options.source, "empty", options.checkedAt, {
      count: 0,
      reason: "The shared MINDEX read completed successfully and returned no qualifying records for this bounded read; this is not an environmental all-clear.",
    })
  }
  const stale = observedAt != null && Date.parse(options.checkedAt) - Date.parse(observedAt) > options.freshnessMs
  return status(options.layerId, options.source, stale ? "stale" : "available", options.checkedAt, {
    count: accepted.length,
    observedAt,
    reason: stale
      ? "The shared MINDEX source is bound, but its newest qualifying observation exceeds the layer freshness window."
      : observedAt
        ? "The shared MINDEX source is bound and returned provenance-bearing observations."
        : "The shared MINDEX source is bound and returned records, but observation freshness was not supplied.",
  })
}

export function isParticulateFeature(featureValue: unknown): boolean {
  const feature = record(featureValue)
  const properties = record(feature?.properties)
  const summary = typeof properties?.summary === "string" ? properties.summary : ""
  return /\b(?:PM2\.5|PM2_5|PM10|particulate|dust)\b/i.test(summary)
}

export function classifyAirNow(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  if (!body) return failedSharedEarthStatus("air-quality", "airnow", checkedAt, "The AirNow response was not an object.")
  if (typeof body.error === "string") {
    return status("air-quality", "airnow", "unbound", checkedAt, {
      count: 0,
      reason: body.error.includes("not configured")
        ? "AirNow is not bound because AIRNOW_API_KEY is not configured."
        : `AirNow did not complete a qualified read: ${body.error}`,
    })
  }
  const features = array(body.features)
  if (!features) return failedSharedEarthStatus("air-quality", "airnow", checkedAt, "The AirNow response did not match its FeatureCollection contract.")
  const observedAt = newestObservedAt(features, ["observed_at"])
  if (features.length === 0) {
    return status("air-quality", "airnow", "empty", checkedAt, {
      count: 0,
      reason: "The AirNow read completed successfully and returned no monitors in the bounded read; this is not an air-quality all-clear.",
    })
  }
  const stale = observedAt != null && Date.parse(checkedAt) - Date.parse(observedAt) > 2 * 60 * 60 * 1000
  return status("air-quality", "airnow", stale ? "stale" : "available", checkedAt, {
    count: features.length,
    observedAt,
    reason: stale ? "AirNow returned monitors, but their newest timestamp is outside the two-hour freshness window." : "AirNow returned current monitor observations.",
  })
}

export function classifyEarth2Spore(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  if (!body) return failedSharedEarthStatus("modeled-spore-dispersal", "earth2-spore", checkedAt, "The Earth-2 modeled-dispersal response was not an object.")
  const source = body.source
  if (body.available === false || source === "none") {
    return status("modeled-spore-dispersal", "earth2-spore", "unbound", checkedAt, {
      count: 0,
      reason: "Earth-2 modeled spore dispersal is not bound. No modeled zones are displayed and no absence is inferred.",
    })
  }
  const zones = array(body.zones)
  if (!zones) return failedSharedEarthStatus("modeled-spore-dispersal", "earth2-spore", checkedAt, "The Earth-2 response did not provide a modeled zones array.")
  if (!hasQualifiedMeteorology(body)) {
    return status("modeled-spore-dispersal", "earth2-spore", "unbound", checkedAt, {
      count: 0,
      reason: "The modeled response was withheld because it did not identify its model run and timestamped wind/meteorology driver.",
    })
  }
  return status("modeled-spore-dispersal", "earth2-spore", zones.length > 0 ? "available" : "empty", checkedAt, {
    count: zones.length,
    cached: body.cached === true,
    reason: zones.length > 0
      ? "Earth-2 returned explicitly modeled spore-dispersal zones with a named model run and timestamped meteorology driver. They are not direct detections."
      : "The qualified Earth-2 model read completed and returned no zones; this is not evidence that airborne spores are absent.",
  })
}

export function classifyEarth2Wind(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  if (!body) return failedSharedEarthStatus("wind", "earth2-wind", checkedAt, "The Earth-2 wind response was not an object.")
  if (body.available === false || body.source === "none") {
    return status("wind", "earth2-wind", "unbound", checkedAt, {
      count: 0,
      reason: "Earth-2 wind vectors are not bound. The operational view will not generate replacement vectors.",
    })
  }
  const u = array(body.u)
  const v = array(body.v)
  if (!u || !v) return failedSharedEarthStatus("wind", "earth2-wind", checkedAt, "The Earth-2 response did not provide vector arrays.")
  const vectorCount = u.reduce<number>((total, row) => total + (Array.isArray(row) ? row.length : 0), 0)
  return status("wind", "earth2-wind", vectorCount > 0 ? "available" : "empty", checkedAt, {
    count: vectorCount,
    cached: body.cached === true,
    reason: vectorCount > 0
      ? "Earth-2 returned a deterministic wind-vector grid for the bounded readiness read."
      : "The Earth-2 wind read completed with no vectors; no calm-wind inference is permitted.",
  })
}

export function classifySporeBase(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  if (!body) return failedSharedEarthStatus("sporebase", "sporebase", checkedAt, "The SporeBase response was not an object.")
  const devices = array(body.devices)
  if (!devices) return failedSharedEarthStatus("sporebase", "sporebase", checkedAt, "The SporeBase response did not provide a devices array.")
  if (typeof body.note === "string") {
    return status("sporebase", "sporebase", "unbound", checkedAt, {
      count: 0,
      reason: `${body.note} The proxy's empty array is not treated as a verified empty device network.`,
    })
  }
  return status("sporebase", "sporebase", devices.length > 0 ? "available" : "empty", checkedAt, {
    count: devices.length,
    reason: devices.length > 0
      ? "The shared MAS contract returned physical SporeBase devices. Live VOC, particulate, BME6xx environmental/gas, and device-health values remain telemetry, never species identification."
      : "The shared MAS read completed successfully with no deployed SporeBase devices. No live device or environmental telemetry is inferred.",
  })
}

export function classifySporeBaseLab(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  if (!body) return failedSharedEarthStatus("sporebase-lab", "sporebase-lab", checkedAt, "The SporeBase lab response was not an object.")
  const samples = array(body.samples)
  if (!samples) return failedSharedEarthStatus("sporebase-lab", "sporebase-lab", checkedAt, "The SporeBase lab response did not provide a samples array.")
  if (typeof body.note === "string" || body.available === false || body.source === "none") {
    return status("sporebase-lab", "sporebase-lab", "unbound", checkedAt, {
      count: 0,
      reason: `${text(body.note) ?? "The laboratory results source is unavailable."} No tape interval is treated as a negative detection.`,
    })
  }
  const qualified = samples.map(qualifiedLabInterval).filter((value): value is { count: number; endAt: string } => value != null)
  if (samples.length > 0 && qualified.length === 0) {
    return status("sporebase-lab", "sporebase-lab", "unbound", checkedAt, {
      count: 0,
      reason: "Sample tracking records exist, but none supplied a 15-minute interval, delayed report time, lab/method provenance, and taxon identification. They are withheld.",
    })
  }
  const identificationCount = qualified.reduce((total, item) => total + item.count, 0)
  const observedAt = qualified.reduce<string | null>((latest, item) => !latest || Date.parse(item.endAt) > Date.parse(latest) ? item.endAt : latest, null)
  return status("sporebase-lab", "sporebase-lab", identificationCount > 0 ? "available" : "empty", checkedAt, {
    count: identificationCount,
    observedAt,
    reason: identificationCount > 0
      ? "Delayed lab identifications are backfilled to qualified 15-minute intervals on the physical 30-day tape, with laboratory and analysis provenance."
      : "The laboratory read completed with no qualified tape identifications. This is not evidence that spores were absent from unprocessed or unreported intervals.",
  })
}

export function classifyFungalOccurrence(payload: unknown, checkedAt: string): SharedEarthLayerStatus {
  const body = record(payload)
  const meta = record(body?.meta)
  const observations = array(body?.observations)
  if (!body || !meta || !observations) {
    return failedSharedEarthStatus("fungal-occurrence", "crep-fungal-occurrence", checkedAt, "The CREP fungal occurrence response did not match its contract.")
  }
  const dataSource = text(meta.dataSource)
  if (dataSource === "error_fallback" || dataSource === "mindex_empty_requires_ingest" || typeof meta.error === "string") {
    return status("fungal-occurrence", "crep-fungal-occurrence", "unbound", checkedAt, {
      count: 0,
      reason: "CREP did not return a bound fungal occurrence source. An empty proxy body is not treated as an absence of fungi.",
    })
  }
  const qualified = observations.map(qualifiedFungalOccurrence).filter((value): value is { observedAt: string | null } => value != null)
  if (observations.length > 0 && qualified.length === 0) {
    return status("fungal-occurrence", "crep-fungal-occurrence", "unbound", checkedAt, {
      count: 0,
      reason: "Occurrence rows were withheld because they lacked a taxon, source, timestamp, or valid coordinates.",
    })
  }
  const observedAt = qualified.reduce<string | null>((latest, item) => item.observedAt && (!latest || Date.parse(item.observedAt) > Date.parse(latest)) ? item.observedAt : latest, null)
  return status("fungal-occurrence", "crep-fungal-occurrence", qualified.length > 0 ? "available" : "empty", checkedAt, {
    count: qualified.length,
    observedAt,
    cached: meta.cached === true,
    reason: qualified.length > 0
      ? "CREP returned source-preserving fungal/taxon occurrence observations. Occurrence does not imply airborne spore concentration or a SporeBase detection."
      : "The bound CREP occurrence read returned no qualifying fungal records for this read; this is not an environmental absence claim.",
  })
}

function stateRank(state: AerosolLayerState): number {
  return ({ available: 6, stale: 5, empty: 4, loading: 3, error: 2, unbound: 1 } as const)[state]
}

export function mergeSharedEarthStatuses(
  layerId: AerosolLayerId,
  candidates: readonly SharedEarthLayerStatus[],
  checkedAt: string,
): SharedEarthLayerStatus {
  if (candidates.length === 0) return failedSharedEarthStatus(layerId, "quarantined", checkedAt, "No shared-source candidates were supplied.")
  const sorted = [...candidates].sort((left, right) => stateRank(right.state) - stateRank(left.state))
  const best = sorted[0]
  const bound = candidates.filter((candidate) => ["available", "stale", "empty"].includes(candidate.state))
  const count = bound.some((candidate) => candidate.count == null)
    ? null
    : bound.reduce((total, candidate) => total + (candidate.count ?? 0), 0)
  return {
    ...best,
    layerId,
    count,
    checkedAt,
    reason: candidates.map((candidate) => `${candidate.sourceLabel}: ${candidate.reason}`).join(" "),
  }
}
