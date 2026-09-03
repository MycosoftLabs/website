export interface DigitalTwinSensorReadings {
  temperature?: number
  humidity?: number
  co2?: number
  light?: number
  ph?: number
  conductivity?: number
  timestamp: string
}

export interface DigitalTwinReadContract {
  device_id: string
  sensor_readings: DigitalTwinSensorReadings
  current_state: null
  contract: {
    state: "available" | "stale"
    evidence_series: number
    source_ids: string[]
  }
}

const ACCEPTED_METRICS = {
  temperature: { target: "temperature", units: new Set(["°C", "degC"]) },
  humidity: { target: "humidity", units: new Set(["%RH", "%"]) },
  co2: { target: "co2", units: new Set(["ppm"]) },
  eco2: { target: "co2", units: new Set(["ppm"]) },
  light: { target: "light", units: new Set(["lux"]) },
  ph: { target: "ph", units: new Set(["pH", "1"]) },
  conductivity: { target: "conductivity", units: new Set(["mS/cm"]) },
} as const

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function exactIso(value: unknown): string | null {
  if (typeof value !== "string") return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second, fraction = "0", zone] = match
  const [y, mo, d, h, mi, s] = [year, month, day, hour, minute, second].map(Number)
  const ms = Number(fraction.padEnd(3, "0"))
  const wallClock = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms))
  if (wallClock.getUTCFullYear() !== y || wallClock.getUTCMonth() !== mo - 1 || wallClock.getUTCDate() !== d || wallClock.getUTCHours() !== h || wallClock.getUTCMinutes() !== mi || wallClock.getUTCSeconds() !== s || wallClock.getUTCMilliseconds() !== ms) return null
  if (zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number)
    if (zoneHour > 23 || zoneMinute > 59) return null
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function metricName(sensorId: string): keyof typeof ACCEPTED_METRICS | null {
  const candidate = sensorId.split(":").at(-1)?.trim().toLowerCase() ?? ""
  return candidate in ACCEPTED_METRICS ? candidate as keyof typeof ACCEPTED_METRICS : null
}

/**
 * Converts only the hardened selected-device sensing aggregate into the small
 * legacy Digital Twin display contract. Reachability alone is never enough:
 * every accepted value must retain exact device identity, unit, observation
 * time, and provenance from an available or explicitly stale evidence series.
 */
export function digitalTwinReadFromSensingAggregate(
  payload: unknown,
  selectedDeviceId: string,
): DigitalTwinReadContract | null {
  const root = record(payload)
  if (!root || !selectedDeviceId) return null
  const selected = Array.isArray(root.selectedDeviceIds)
    ? root.selectedDeviceIds.filter((value): value is string => typeof value === "string")
    : []
  if (selected.length !== 1 || selected[0] !== selectedDeviceId) return null
  if (root.state !== "available" && root.state !== "stale") return null

  const candidates = Array.isArray(root.sampleSeries) ? root.sampleSeries : []
  const readings: Record<string, number> = {}
  const latestByTarget = new Map<string, number>()
  const sourceIds = new Set<string>()
  let latestObservedMs = -Infinity
  let acceptedSeries = 0
  let acceptedAvailableSeries = 0

  for (const raw of candidates) {
    const series = record(raw)
    if (!series || series.deviceId !== selectedDeviceId) continue
    if (series.state !== "available" && series.state !== "stale") continue
    if (typeof series.sensorId !== "string" || typeof series.unit !== "string") continue
    const metric = metricName(series.sensorId)
    if (!metric) continue
    const contract = ACCEPTED_METRICS[metric]
    if (!contract.units.has(series.unit as never)) continue
    if (!Array.isArray(series.timestamps) || !Array.isArray(series.values)) continue
    if (!series.timestamps.length || series.timestamps.length !== series.values.length) continue
    const observedAt = exactIso(series.timestamps.at(-1))
    const value = series.values.at(-1)
    if (!observedAt || typeof value !== "number" || !Number.isFinite(value)) continue
    const provenance = record(series.provenance)
    if (!provenance || typeof provenance.sourceId !== "string" || !provenance.sourceId.startsWith("/api/")) continue
    if (typeof provenance.evidenceId !== "string" || !provenance.evidenceId.trim()) continue
    if (provenance.mode !== "LIVE") continue
    const provenanceObservedAt = exactIso(provenance.observedAt)
    const receivedAt = exactIso(provenance.receivedAt)
    if (provenanceObservedAt !== observedAt || !receivedAt || Date.parse(receivedAt) < Date.parse(observedAt)) continue

    const observedMs = Date.parse(observedAt)
    const existingMs = latestByTarget.get(contract.target) ?? -Infinity
    if (observedMs >= existingMs) {
      readings[contract.target] = value
      latestByTarget.set(contract.target, observedMs)
    }
    latestObservedMs = Math.max(latestObservedMs, observedMs)
    sourceIds.add(provenance.sourceId)
    acceptedSeries += 1
    if (series.state === "available") acceptedAvailableSeries += 1
  }

  if (!acceptedSeries || !Number.isFinite(latestObservedMs)) return null
  return {
    device_id: selectedDeviceId,
    sensor_readings: {
      ...readings,
      timestamp: new Date(latestObservedMs).toISOString(),
    },
    // The selected-device sensing contract proves measurements, not a complete
    // synchronized biological twin. Keep twin state absent until a separate
    // typed state provider is bound and verified.
    current_state: null,
    contract: {
      state: acceptedAvailableSeries > 0 ? "available" : "stale",
      evidence_series: acceptedSeries,
      source_ids: [...sourceIds].sort(),
    },
  }
}
