/**
 * Truthful, non-prescriptive context contract for environmental-monitoring
 * coverage planning. This module never scores, ranks, or recommends sites.
 */

export const WEATHER_CONTEXT_STALE_AFTER_MS = 2 * 60 * 60 * 1000
export const WEATHER_CONTEXT_HALF_SPAN_DEG = 0.5

export const COVERAGE_PLANNING_UNBOUND = {
  access: "No audited contract supplies road or vehicle access, land permission, site security, maintenance reachability, or confirmed power and network service.",
  deviceCoverage: "No deployed SporeBase or validated terrain-aware sampling or network footprint is available. The nominal product coverage string is not a coverage analysis.",
  soilMoisture: "No qualified soil-moisture contract is bound. Humidity and precipitation must not be relabeled as soil moisture.",
} as const

export interface MonitoringCandidateCoordinates {
  latitude: number
  longitude: number
}

export interface MonitoringWeatherObservation {
  coordinates: [number, number]
  distanceKm: number
  source: string
  stationId: string | null
  stationName: string | null
  observedAt: string
  temperatureC: number | null
  humidityPct: number | null
  pressureHpa: number | null
  windSpeedMs: number | null
  windDirection: number | null
  precipitationMm: number | null
  cloudCoverPct: number | null
  conditions: string | null
}

export interface MonitoringWeatherContext {
  state: "available" | "stale" | "empty" | "unbound"
  reason: string
  candidate: MonitoringCandidateCoordinates
  observations: MonitoringWeatherObservation[]
  nearestObservation: MonitoringWeatherObservation | null
  nearestWindObservation: MonitoringWeatherObservation | null
  nearestHumidityObservation: MonitoringWeatherObservation | null
  evaluatedAt: string
  provenance: {
    endpoint: "/api/crep/environment/weather"
    source: string | null
    upstream: string | null
    retrievedAt: string | null
    bbox: { west: number; south: number; east: number; north: number } | null
  }
  accessState: "unbound"
  deviceCoverageState: "unbound"
  soilMoistureState: "unbound"
  decisionState: "not-computed"
}

export type CandidateCoordinateResult =
  | { ok: true; value: MonitoringCandidateCoordinates }
  | { ok: false; reason: string }

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text || null
}

export function parseMonitoringCandidateCoordinates(
  latitudeInput: string | number,
  longitudeInput: string | number,
): CandidateCoordinateResult {
  if (String(latitudeInput).trim() === "" || String(longitudeInput).trim() === "") {
    return { ok: false, reason: "Enter both latitude and longitude; no candidate location is assumed." }
  }
  const latitude = Number(latitudeInput)
  const longitude = Number(longitudeInput)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: "Candidate coordinates must be finite numbers." }
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { ok: false, reason: "Latitude must be -90 to 90 and longitude must be -180 to 180." }
  }
  return { ok: true, value: { latitude, longitude } }
}

export function buildMonitoringWeatherBbox(
  candidate: MonitoringCandidateCoordinates,
  halfSpanDeg = WEATHER_CONTEXT_HALF_SPAN_DEG,
) {
  const span = Number.isFinite(halfSpanDeg) ? Math.max(0.01, Math.min(10, halfSpanDeg)) : WEATHER_CONTEXT_HALF_SPAN_DEG
  return {
    west: Math.max(-179.9, candidate.longitude - span),
    south: Math.max(-89.9, candidate.latitude - span),
    east: Math.min(179.9, candidate.longitude + span),
    north: Math.min(89.9, candidate.latitude + span),
  }
}

function distanceKm(candidate: MonitoringCandidateCoordinates, longitude: number, latitude: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const dLat = toRadians(latitude - candidate.latitude)
  const dLng = toRadians(longitude - candidate.longitude)
  const lat1 = toRadians(candidate.latitude)
  const lat2 = toRadians(latitude)
  const raw = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const a = Math.max(0, Math.min(1, raw))
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parseBbox(value: unknown) {
  const bbox = recordOrNull(value)
  if (!bbox) return null
  const west = finiteNumber(bbox.west)
  const south = finiteNumber(bbox.south)
  const east = finiteNumber(bbox.east)
  const north = finiteNumber(bbox.north)
  return west != null && south != null && east != null && north != null
    ? { west, south, east, north }
    : null
}

export function classifyMonitoringWeatherContext(
  payload: unknown,
  candidate: MonitoringCandidateCoordinates,
  evaluatedAt: string,
): MonitoringWeatherContext {
  const root = recordOrNull(payload)
  const meta = recordOrNull(root?.meta)
  const upstream = optionalText(meta?.upstream)
  const source = optionalText(meta?.source)
  const retrievedAt = optionalText(meta?.timestamp)
  const provenance = {
    endpoint: "/api/crep/environment/weather" as const,
    source,
    upstream,
    retrievedAt,
    bbox: parseBbox(meta?.bbox),
  }
  const base = {
    candidate,
    evaluatedAt,
    provenance,
    accessState: "unbound" as const,
    deviceCoverageState: "unbound" as const,
    soilMoistureState: "unbound" as const,
    decisionState: "not-computed" as const,
  }

  if (!root || upstream !== "mindex" || source !== "mindex.atmos.weather_observations") {
    return {
      ...base,
      state: "unbound",
      reason: "The qualified MINDEX weather-observation upstream is unavailable or its provenance contract is missing.",
      observations: [],
      nearestObservation: null,
      nearestWindObservation: null,
      nearestHumidityObservation: null,
    }
  }

  const features = Array.isArray(root.features) ? root.features : []
  const observations = features.flatMap((feature): MonitoringWeatherObservation[] => {
    const item = recordOrNull(feature)
    const geometry = recordOrNull(item?.geometry)
    const properties = recordOrNull(item?.properties)
    const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : []
    const longitude = finiteNumber(coordinates[0])
    const latitude = finiteNumber(coordinates[1])
    const observedAt = optionalText(properties?.observedAt)
    const sourceName = optionalText(properties?.source)
    if (geometry?.type !== "Point" || longitude == null || latitude == null || !observedAt || !sourceName) return []
    if (!Number.isFinite(Date.parse(observedAt))) return []

    const humidityRaw = finiteNumber(properties?.humidityPct)
    const humidityPct = humidityRaw != null && humidityRaw >= 0 && humidityRaw <= 100 ? humidityRaw : null
    const observation: MonitoringWeatherObservation = {
      coordinates: [longitude, latitude],
      distanceKm: distanceKm(candidate, longitude, latitude),
      source: sourceName,
      stationId: optionalText(properties?.stationId),
      stationName: optionalText(properties?.stationName),
      observedAt,
      temperatureC: finiteNumber(properties?.temperatureC),
      humidityPct,
      pressureHpa: finiteNumber(properties?.pressureHpa),
      windSpeedMs: finiteNumber(properties?.windSpeedMs),
      windDirection: finiteNumber(properties?.windDirection),
      precipitationMm: finiteNumber(properties?.precipitationMm),
      cloudCoverPct: finiteNumber(properties?.cloudCoverPct),
      conditions: optionalText(properties?.conditions),
    }
    const hasEnvironmentalMeasurement = [
      observation.temperatureC,
      observation.humidityPct,
      observation.pressureHpa,
      observation.windSpeedMs,
      observation.windDirection,
      observation.precipitationMm,
      observation.cloudCoverPct,
    ].some((value) => value != null)
    return hasEnvironmentalMeasurement ? [observation] : []
  }).sort((left, right) => left.distanceKm - right.distanceKm)

  if (observations.length === 0) {
    return {
      ...base,
      state: "empty",
      reason: "The qualified upstream responded, but no timestamped environmental observation was present in the candidate retrieval window.",
      observations,
      nearestObservation: null,
      nearestWindObservation: null,
      nearestHumidityObservation: null,
    }
  }

  const newestObservedMs = Math.max(...observations.map((observation) => Date.parse(observation.observedAt)))
  const evaluatedAtMs = Date.parse(evaluatedAt)
  const stale = !Number.isFinite(evaluatedAtMs) || evaluatedAtMs - newestObservedMs > WEATHER_CONTEXT_STALE_AFTER_MS
  return {
    ...base,
    state: stale ? "stale" : "available",
    reason: stale
      ? "Timestamped weather observations are available, but the newest qualified observation is older than two hours."
      : "Timestamped MINDEX weather observations are available for candidate context.",
    observations,
    nearestObservation: observations[0],
    nearestWindObservation: observations.find((observation) => observation.windSpeedMs != null || observation.windDirection != null) ?? null,
    nearestHumidityObservation: observations.find((observation) => observation.humidityPct != null) ?? null,
  }
}
