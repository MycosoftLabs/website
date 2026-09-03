import type { DeviceSensorSampleSeries } from "@/lib/fusarium/sensing-visuals/contracts"

export const SENSING_TELEMETRY_SCHEMA = "fusarium-sensing-telemetry/v1" as const
export const SENSING_TELEMETRY_MAX_DEVICES = 10
export const SENSING_TELEMETRY_MAX_POINTS = 512
// Only identifiers explicitly joined by field-deployments.ts are authorized to
// bind Psathyrella telemetry. Service host aliases and display-only fleet names
// are not physical-device identity evidence.
export const PSATHYRELLA_DEVICE_ALIASES = ["psathyrella-buoy-com4", "mycobrain-COM4", "mycobrain-COM3"] as const
export const PSATHYRELLA_PASSIVE_SOURCES = ["/api/psathyrella/bme", "/api/psathyrella/telemetry"] as const

type SensorModality = DeviceSensorSampleSeries["modality"]

export interface PassiveReadResult {
  sourceRef: string
  state: "available" | "empty" | "unavailable" | "error"
  receivedAt: string
  payload: unknown
  message: string
}

export interface SensingTelemetrySourceRun {
  sourceRef: string
  state: PassiveReadResult["state"] | "withheld"
  acceptedPointCount: number
  rejectedPointCount: number
  message: string
}

export interface SensingTelemetryResult {
  schema: typeof SENSING_TELEMETRY_SCHEMA
  state: "available" | "stale" | "unbound" | "error"
  evaluatedAt: string
  selectedDeviceIds: string[]
  sampleSeries: DeviceSensorSampleSeries[]
  sourceRuns: SensingTelemetrySourceRun[]
  message: string
}

export type PassiveSameOriginReader = (sourceRef: string) => Promise<PassiveReadResult>

/**
 * Identity evidence is supplied by the route from the canonical field-deployment
 * registry. Aliases are exact identifiers for the same physical deployment, not
 * fuzzy name matches. readDeviceIds names the canonical IDs used by device APIs.
 */
export interface SensingTelemetryIdentityOptions {
  aliasesBySelected?: Readonly<Record<string, readonly string[]>>
  readDeviceIds?: readonly string[]
  /** Exact selected-device IDs authorized for an active sensor/status read. */
  liveReadDeviceIds?: readonly string[]
}

interface AcceptedPoint {
  selectedDeviceId: string
  sourceDeviceId: string
  sensorId: string
  modality: SensorModality
  metric: string
  unit: string
  value: number
  observedAt: string
  receivedAt: string
  sourceRef: string
  evidenceId: string
}

const METRICS: Record<string, { modality: SensorModality; unit: string }> = {
  temperature: { modality: "thermal", unit: "°C" }, temperature_c: { modality: "thermal", unit: "°C" }, temp_c: { modality: "thermal", unit: "°C" },
  humidity: { modality: "gas-voc", unit: "%RH" }, humidity_pct: { modality: "gas-voc", unit: "%RH" },
  pressure: { modality: "gas-voc", unit: "hPa" }, pressure_hpa: { modality: "gas-voc", unit: "hPa" },
  gas_resistance: { modality: "gas-voc", unit: "Ω" }, gas_resistance_ohm: { modality: "gas-voc", unit: "Ω" }, gas_ohm: { modality: "gas-voc", unit: "Ω" },
  iaq: { modality: "gas-voc", unit: "IAQ index" }, eco2: { modality: "gas-voc", unit: "ppm" }, eco2_ppm: { modality: "gas-voc", unit: "ppm" },
  co2eq: { modality: "gas-voc", unit: "ppm" }, co2_equivalent: { modality: "gas-voc", unit: "ppm" },
  bvoc: { modality: "gas-voc", unit: "ppm" }, bvoc_ppm: { modality: "gas-voc", unit: "ppm" }, voc: { modality: "gas-voc", unit: "ppm" }, voc_equivalent: { modality: "gas-voc", unit: "ppm" },
  pm1: { modality: "particulate", unit: "µg/m³" }, pm1_0: { modality: "particulate", unit: "µg/m³" }, pm2_5: { modality: "particulate", unit: "µg/m³" }, pm10: { modality: "particulate", unit: "µg/m³" },
  radiation: { modality: "radiation", unit: "µSv/h" }, radiation_usv_h: { modality: "radiation", unit: "µSv/h" },
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function iso(value: unknown): string | null {
  const candidate = text(value)
  const match = candidate?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/)
  if (!candidate || !match) return null
  const [, year, month, day, hour, minute, second, fraction = "0", zone] = match
  const [y, mo, d, h, mi, s] = [year, month, day, hour, minute, second].map(Number)
  const ms = Number(fraction.padEnd(3, "0"))
  const wallClock = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms))
  if (wallClock.getUTCFullYear() !== y || wallClock.getUTCMonth() !== mo - 1 || wallClock.getUTCDate() !== d || wallClock.getUTCHours() !== h || wallClock.getUTCMinutes() !== mi || wallClock.getUTCSeconds() !== s || wallClock.getUTCMilliseconds() !== ms) return null
  if (zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number)
    if (zoneHour > 23 || zoneMinute > 59) return null
  }
  const parsed = Date.parse(candidate)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

interface DeviceIdentityScope {
  selectedDeviceIds: readonly string[]
  aliasesBySelected: Readonly<Record<string, readonly string[]>>
}

function buildIdentityScope(
  selectedDeviceIds: readonly string[],
  aliasesBySelected: SensingTelemetryIdentityOptions["aliasesBySelected"],
): DeviceIdentityScope {
  const selected = new Set(selectedDeviceIds)
  const aliasOwners = new Map<string, Set<string>>()
  for (const selectedDeviceId of selectedDeviceIds) {
    for (const alias of aliasesBySelected?.[selectedDeviceId] ?? []) {
      if (!alias || alias === selectedDeviceId || selected.has(alias)) continue
      const owners = aliasOwners.get(alias) ?? new Set<string>()
      owners.add(selectedDeviceId)
      aliasOwners.set(alias, owners)
    }
  }
  const unambiguous: Record<string, readonly string[]> = {}
  for (const selectedDeviceId of selectedDeviceIds) {
    unambiguous[selectedDeviceId] = (aliasesBySelected?.[selectedDeviceId] ?? [])
      .filter((alias) => aliasOwners.get(alias)?.size === 1)
  }
  return { selectedDeviceIds, aliasesBySelected: unambiguous }
}

function exactDeviceMatch(record: Record<string, unknown>, scope: DeviceIdentityScope): { selected: string; source: string } | null {
  const ids = [record.device_id, record.deviceId, record.id, record.registry_id, record.registryId]
    .map(text).filter((value): value is string => Boolean(value))
  for (const selected of scope.selectedDeviceIds) if (ids.includes(selected)) return { selected, source: selected }
  for (const selected of scope.selectedDeviceIds) {
    const source = (scope.aliasesBySelected[selected] ?? []).find((alias) => ids.includes(alias))
    if (source) return { selected, source }
  }
  return null
}

/**
 * Telemetry wrappers may name the requested registry device on the outside
 * while preserving the physical board identity as source_device_id inside the
 * sample. When that physical identity is present it is authoritative: reject a
 * mismatch instead of falling back to the wrapper's requested ID.
 */
function exactTelemetryDeviceMatch(
  record: Record<string, unknown>,
  scope: DeviceIdentityScope,
  fallback: { selected: string; source: string } | null = null,
): { selected: string; source: string } | null {
  const physicalSourceId = text(record.source_device_id) ?? text(record.sourceDeviceId)
  if (physicalSourceId) return exactDeviceMatch({ device_id: physicalSourceId }, scope)
  return exactDeviceMatch(record, scope) ?? fallback
}

function pointFromMetric(args: {
  selectedDeviceId: string; sourceDeviceId: string; sensorId: string; metric: string; value: unknown;
  unit?: unknown; observedAt: unknown; receivedAt: unknown; sourceRef: string; evidenceId: string; modality?: SensorModality;
}): AcceptedPoint | null {
  const value = finite(args.value)
  const observedAt = iso(args.observedAt)
  const receivedAt = iso(args.receivedAt)
  const known = METRICS[args.metric.toLowerCase()]
  const unit = text(args.unit) ?? known?.unit ?? null
  const modality = args.modality ?? known?.modality
  if (value === null || !observedAt || !receivedAt || !unit || !modality || !args.sensorId || Date.parse(receivedAt) < Date.parse(observedAt)) return null
  return { ...args, value, observedAt, receivedAt, unit, modality }
}

function metricPoints(
  readings: Record<string, unknown>, identity: { selected: string; source: string }, sensorId: string,
  observedAt: unknown, receivedAt: unknown, sourceRef: string, evidencePrefix: string,
): { accepted: AcceptedPoint[]; rejected: number } {
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const [metric, value] of Object.entries(readings)) {
    if (!METRICS[metric.toLowerCase()] || value === null || value === undefined) continue
    const point = pointFromMetric({ selectedDeviceId: identity.selected, sourceDeviceId: identity.source, sensorId, metric, value, observedAt, receivedAt, sourceRef, evidenceId: `${evidencePrefix}:${metric}` })
    if (point) accepted.push(point); else rejected += 1
  }
  return { accepted, rejected }
}

function canonicalBmeReadings(row: Record<string, unknown>) {
  return {
    temperature: row.temperature ?? row.temp_c ?? row.temperature_c ?? row.tC ?? row.temperature_c_comp ?? row.ambient_temperature_c,
    humidity: row.humidity ?? row.humidity_pct ?? row.rh ?? row.humidity_pct_comp ?? row.ambient_humidity_pct,
    pressure: row.pressure ?? row.pressure_hpa ?? row.p_hPa,
    gas_resistance: row.gas_resistance ?? row.gas_resistance_ohm ?? row.gas_ohm ?? row.gas ?? row.gas_resistance_ohm_comp,
    iaq: row.iaq,
    co2_equivalent: row.co2_equivalent ?? row.co2Equivalent ?? row.co2eq ?? row.eco2 ?? row.eco2_ppm,
    voc_equivalent: row.voc_equivalent ?? row.vocEquivalent ?? row.voc ?? row.bvoc ?? row.bvoc_ppm,
  }
}

interface BmeMetricGroup {
  sensorId: string
  readings: Record<string, unknown>
  observedAt: unknown
}

const DIRECT_BME_KEYS = ["bme1", "bme2", "bme688_1", "bme688_2"] as const

function exactBmeSensorId(fallback: string, row: Record<string, unknown>): string {
  const explicit = text(row.sensor_id) ?? text(row.sensor_slot) ?? text(row.peripheral_uid)
  if (explicit) return explicit
  const address = text(row.address) ?? text(row.i2c_address)
  return address ? `${fallback}@${address}` : fallback
}

/** Normalize only explicit BME containers already returned by an existing passive read. */
function bmeMetricGroups(container: Record<string, unknown>, fallbackObservedAt: unknown): BmeMetricGroup[] {
  const groups: BmeMetricGroup[] = []
  const containerObservedAt = container.observed_at ?? container.captured_at ?? container.timestamp ?? container.last_update ?? fallbackObservedAt
  const bme688 = object(container.bme688) ? container.bme688 : null
  if (bme688) {
    for (const [slot, value] of Object.entries(bme688)) {
      if (!object(value)) continue
      groups.push({
        sensorId: exactBmeSensorId(`bme688-${slot}`, value),
        readings: canonicalBmeReadings(value),
        observedAt: value.observed_at ?? value.captured_at ?? value.timestamp ?? containerObservedAt,
      })
    }
  }
  for (const key of DIRECT_BME_KEYS) {
    const value = object(container[key]) ? container[key] as Record<string, unknown> : null
    if (!value) continue
    groups.push({
      sensorId: exactBmeSensorId(key, value),
      readings: canonicalBmeReadings(value),
      observedAt: value.observed_at ?? value.captured_at ?? value.timestamp ?? containerObservedAt,
    })
  }
  return groups
}

function parseMycoBrainDevices(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const payload = object(result.payload) ? result.payload : {}
  const devices = Array.isArray(payload.devices) ? payload.devices : []
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const raw of devices) {
    if (!object(raw)) continue
    if (result.sourceRef.startsWith("/api/mycobrain?") && raw.verified !== true) { rejected += 1; continue }
    const identity = exactDeviceMatch(raw, scope)
    if (!identity) continue
    const deviceInfo = object(raw.device_info) ? raw.device_info : null
    const nestedHeartbeat = deviceInfo ? deviceInfo["last_heartbeat"] : undefined
    const sensorData = object(raw.sensor_data) ? raw.sensor_data : null
    if (!sensorData) { rejected += 1; continue }
    const observedAt = result.sourceRef.startsWith("/api/mycobrain?")
      ? (raw.last_message_time ?? raw.timestamp ?? sensorData.last_update)
      : (raw.last_message_time ?? raw.last_seen ?? nestedHeartbeat ?? raw.timestamp ?? sensorData.last_update)
    for (const group of bmeMetricGroups(sensorData, observedAt)) {
      const points = metricPoints(group.readings, identity, group.sensorId, group.observedAt, result.receivedAt, result.sourceRef, `${identity.source}:${group.sensorId}:${group.observedAt}`)
      accepted.push(...points.accepted); rejected += points.rejected
    }
    for (const [sensorKey, sensorRaw] of Object.entries(sensorData)) {
      if (sensorKey === "bme688" || (DIRECT_BME_KEYS as readonly string[]).includes(sensorKey)) continue
      if (!object(sensorRaw)) continue
      const sensorId = text(sensorRaw.sensor_id) ?? text(sensorRaw.sensor_slot) ?? sensorKey
      const sensorObservedAt = sensorRaw.observed_at ?? sensorRaw.captured_at ?? sensorRaw.timestamp ?? sensorData.last_update ?? observedAt
      const points = metricPoints(sensorRaw, identity, sensorId, sensorObservedAt, result.receivedAt, result.sourceRef, `${identity.source}:${sensorId}:${sensorObservedAt}`)
      accepted.push(...points.accepted); rejected += points.rejected
    }
  }
  return { accepted, rejected }
}

function parseMycoBrainSensorCache(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const payload = object(result.payload) ? result.payload : {}
  const identity = exactDeviceMatch(payload, scope)
  const sensors = object(payload.sensors) ? payload.sensors : null
  if (!identity || !sensors) return { accepted: [] as AcceptedPoint[], rejected: result.state === "available" ? 1 : 0 }

  const observedAt = sensors.last_update ?? payload.timestamp
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  const bmeKeys = new Set<string>(["bme688", ...DIRECT_BME_KEYS])
  for (const group of bmeMetricGroups(sensors, observedAt)) {
    const points = metricPoints(group.readings, identity, group.sensorId, group.observedAt, result.receivedAt, result.sourceRef, `cache:${identity.source}:${group.sensorId}:${group.observedAt}`)
    accepted.push(...points.accepted); rejected += points.rejected
  }
  for (const [sensorKey, sensorRaw] of Object.entries(sensors)) {
    if (bmeKeys.has(sensorKey) || !object(sensorRaw)) continue
    const sensorId = text(sensorRaw.sensor_id) ?? text(sensorRaw.sensor_slot) ?? text(sensorRaw.peripheral_uid) ?? sensorKey
    const sensorObservedAt = sensorRaw.observed_at ?? sensorRaw.captured_at ?? sensorRaw.timestamp ?? sensors.last_update ?? observedAt
    const points = metricPoints(sensorRaw, identity, sensorId, sensorObservedAt, result.receivedAt, result.sourceRef, `cache:${identity.source}:${sensorId}:${sensorObservedAt}`)
    accepted.push(...points.accepted); rejected += points.rejected
  }
  if (!accepted.length && !rejected) rejected = 1
  return { accepted, rejected }
}

function parseMindexSamples(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const sourceUrl = new URL(result.sourceRef, "http://same-origin.invalid")
  const sourceDeviceId = text(sourceUrl.searchParams.get("device_slug"))
  const identity = sourceDeviceId ? exactDeviceMatch({ device_id: sourceDeviceId }, scope) : null
  const rows = Array.isArray(result.payload) ? result.payload : []
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  if (!identity) return { accepted, rejected: rows.length }

  for (const raw of rows) {
    if (!object(raw)) { rejected += 1; continue }
    // MINDEX history is operational evidence only after upstream verification.
    // Unknown or explicitly unverified rows stay visible in the source-run
    // rejection count but never become a LIVE series.
    if (raw.verified !== true) { rejected += 1; continue }
    const explicitDeviceId = text(raw.device_slug) ?? text(raw.device_id) ?? text(raw.deviceId)
    if (explicitDeviceId && explicitDeviceId !== sourceDeviceId) { rejected += 1; continue }
    const rowIdentity = identity
    const streamKey = text(raw.stream_key)
    const observedAt = raw.recorded_at ?? raw.observed_at ?? raw.timestamp
    const receivedAt = raw.received_at ?? raw.ingested_at ?? result.receivedAt
    const recordId = text(raw.envelope_msg_id) ?? text(raw.id) ?? text(raw.record_id)
      ?? (streamKey && iso(observedAt) ? `${identity.source}:${streamKey}:${iso(observedAt)}` : null)
    if (!rowIdentity || !streamKey || !recordId) { rejected += 1; continue }

    const metric = streamKey.split(/[./:]/).filter(Boolean).at(-1)?.toLowerCase().replace(/-/g, "_") ?? ""
    const valueJson = object(raw.value_json) ? raw.value_json : null
    const numericValue = finite(raw.value_numeric) ?? finite(valueJson?.value)
    if (numericValue !== null) {
      const point = pointFromMetric({
        selectedDeviceId: rowIdentity.selected,
        sourceDeviceId: rowIdentity.source,
        sensorId: streamKey,
        metric,
        value: numericValue,
        unit: raw.value_unit ?? raw.unit ?? valueJson?.unit,
        observedAt,
        receivedAt,
        sourceRef: result.sourceRef,
        evidenceId: `mindex:verified:${recordId}`,
      })
      if (point) accepted.push(point); else rejected += 1
      continue
    }

    if (!valueJson) { rejected += 1; continue }
    const points = metricPoints(valueJson, rowIdentity, streamKey, observedAt, receivedAt, result.sourceRef, `mindex:verified:${recordId}`)
    accepted.push(...points.accepted); rejected += points.rejected
  }
  return { accepted, rejected }
}

function parseNetworkDevices(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const payload = object(result.payload) ? result.payload : {}
  const devices = Array.isArray(payload.devices) ? payload.devices : []
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const raw of devices) {
    if (!object(raw)) continue
    const identity = exactDeviceMatch(raw, scope)
    if (!identity) continue
    const extra = object(raw.extra) ? raw.extra : null
    const telemetry = object(raw.telemetry) ? raw.telemetry : object(extra?.latest_telemetry) ? extra.latest_telemetry as Record<string, unknown> : null
    if (!telemetry) continue
    const telemetryIdentity = exactTelemetryDeviceMatch(telemetry, scope, identity)
    if (!telemetryIdentity || telemetryIdentity.selected !== identity.selected) { rejected += 1; continue }
    const observedAt = telemetry.observed_at ?? telemetry.captured_at ?? telemetry.timestamp ?? raw.last_seen
    const groups = bmeMetricGroups(telemetry, observedAt)
    const explicitSensor = text(telemetry.sensor_id) ?? text(telemetry.sensor_slot)
    if (explicitSensor) groups.push({ sensorId: explicitSensor, readings: telemetry, observedAt })
    if (!groups.length) { rejected += 1; continue }
    for (const group of groups) {
      const points = metricPoints(group.readings, telemetryIdentity, group.sensorId, group.observedAt, result.receivedAt, result.sourceRef, `${telemetryIdentity.source}:${group.sensorId}:${group.observedAt}`)
      accepted.push(...points.accepted); rejected += points.rejected
    }
  }
  return { accepted, rejected }
}

function parseDeviceTelemetry(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const payload = object(result.payload) ? result.payload : {}
  const identity = exactDeviceMatch(payload, scope)
  if (!identity) return { accepted: [] as AcceptedPoint[], rejected: 0 }
  const directTelemetry = object(payload.telemetry) ? payload.telemetry : null
  const directSourceIdentity = directTelemetry
    ? text(directTelemetry.source_device_id) ?? text(directTelemetry.sourceDeviceId)
      ?? text(directTelemetry.device_id) ?? text(directTelemetry.deviceId)
    : null
  const rows = Array.isArray(payload.telemetry) ? payload.telemetry : Array.isArray(payload.readings) ? payload.readings : directTelemetry ? [{
    ...directTelemetry,
    ...(directSourceIdentity ? {} : { device_id: identity.source }),
    observed_at: directTelemetry.observed_at ?? directTelemetry.captured_at ?? directTelemetry.timestamp ?? payload.last_seen,
    received_at: payload.received_at ?? result.receivedAt,
  }] : []
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const rowRaw of rows) {
    if (!object(rowRaw)) continue
    const rowIdentity = exactTelemetryDeviceMatch(rowRaw, scope, identity)
    if (!rowIdentity || rowIdentity.selected !== identity.selected) { rejected += 1; continue }
    const envelope = object(rowRaw.envelope) ? rowRaw.envelope : null
    const readings = object(rowRaw.payload) ? rowRaw.payload : envelope && object(envelope.payload) ? envelope.payload : rowRaw
    const sensorId = text(rowRaw.sensor_id) ?? text(rowRaw.sensorId) ?? text(readings.sensor_id) ?? text(readings.sensor_slot)
    const observedAt = rowRaw.observed_at ?? readings.observed_at ?? readings.timestamp ?? rowRaw.timestamp
    const receivedAt = rowRaw.received_at ?? result.receivedAt
    const recordId = text(rowRaw.id) ?? text(rowRaw.record_id) ?? text(envelope?.hash) ?? (sensorId && iso(observedAt) ? `${sensorId}:${iso(observedAt)}` : null)
    const groups = bmeMetricGroups(readings, observedAt)
    if (sensorId) groups.push({ sensorId, readings, observedAt })
    if (!groups.length || !recordId) { rejected += 1; continue }
    for (const group of groups) {
      const points = metricPoints(group.readings, rowIdentity, group.sensorId, group.observedAt, receivedAt, result.sourceRef, recordId)
      accepted.push(...points.accepted); rejected += points.rejected
    }
  }
  return { accepted, rejected }
}

function parseFci(result: PassiveReadResult, scope: DeviceIdentityScope) {
  const payload = result.payload
  const rows = Array.isArray(payload) ? payload : object(payload) && Array.isArray(payload.readings) ? payload.readings : []
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const raw of rows) {
    if (!object(raw)) continue
    const identity = exactDeviceMatch(raw, scope)
    const sensorId = text(raw.channel_id) ?? text(raw.electrode_id) ?? text(raw.sensor_id)
    const value = raw.raw_value ?? raw.value ?? raw.voltage_uv
    const unit = raw.unit ?? (raw.voltage_uv !== undefined ? "µV" : null)
    const observedAt = raw.observed_at ?? raw.timestamp
    const receivedAt = raw.received_at ?? result.receivedAt
    const recordId = text(raw.id) ?? text(raw.reading_id) ?? (sensorId && iso(observedAt) ? `${sensorId}:${iso(observedAt)}` : null)
    if (!identity || !sensorId || !recordId) { rejected += 1; continue }
    const point = pointFromMetric({ selectedDeviceId: identity.selected, sourceDeviceId: identity.source, sensorId, metric: "bioelectric", value, unit, observedAt, receivedAt, sourceRef: result.sourceRef, evidenceId: recordId, modality: "bioelectric" })
    if (point) accepted.push(point); else rejected += 1
  }
  return { accepted, rejected }
}

function psathyrellaSelection(selectedDeviceIds: readonly string[]): string | null {
  return selectedDeviceIds.find((deviceId) => (PSATHYRELLA_DEVICE_ALIASES as readonly string[]).includes(deviceId)) ?? null
}

function parsePsathyrellaBme(result: PassiveReadResult, selectedDeviceIds: readonly string[]) {
  const selected = psathyrellaSelection(selectedDeviceIds)
  const payload = object(result.payload) ? result.payload : null
  const sensors = payload && object(payload.sensors) ? payload.sensors : null
  const observedAt = payload?.timestamp
  if (!selected || !sensors || !iso(observedAt)) return { accepted: [] as AcceptedPoint[], rejected: payload && result.state === "available" ? 1 : 0 }
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const slot of ["bme688_1", "bme688_2"] as const) {
    const row = object(sensors[slot]) ? sensors[slot] as Record<string, unknown> : null
    if (!row || row.present === false) continue
    const address = text(row.address)
    const label = text(row.label)
    const sensorId = address ? `${slot}@${address}` : label ? `${slot}:${label}` : slot
    const points = metricPoints(canonicalBmeReadings(row), { selected, source: selected }, sensorId, observedAt, result.receivedAt, result.sourceRef, `${selected}:${sensorId}:${observedAt}`)
    accepted.push(...points.accepted); rejected += points.rejected
  }
  return { accepted, rejected }
}

function parsePsathyrellaTelemetry(result: PassiveReadResult, selectedDeviceIds: readonly string[]) {
  const selected = psathyrellaSelection(selectedDeviceIds)
  const root = object(result.payload) ? result.payload : null
  const telemetry = root && object(root.telemetry) ? root.telemetry : root
  const sourceDeviceId = telemetry ? text(telemetry.deviceId ?? telemetry.device_id) : null
  if (!selected || !telemetry || !sourceDeviceId || !(PSATHYRELLA_DEVICE_ALIASES as readonly string[]).includes(sourceDeviceId)) return { accepted: [] as AcceptedPoint[], rejected: root && result.state === "available" ? 1 : 0 }
  const observedAt = telemetry.timestamp ?? telemetry.observedAt ?? telemetry.observed_at ?? root?.timestamp
  if (!iso(observedAt) || !object(telemetry.bme)) return { accepted: [] as AcceptedPoint[], rejected: 1 }
  const accepted: AcceptedPoint[] = []
  let rejected = 0
  for (const slot of ["a", "b"] as const) {
    const row = object(telemetry.bme[slot]) ? telemetry.bme[slot] as Record<string, unknown> : null
    if (!row || row.present === false) continue
    const address = text(row.address)
    const label = text(row.label)
    const sensorId = address ? `bme-${slot}@${address}` : label ? `bme-${slot}:${label}` : `bme-${slot}`
    const points = metricPoints(canonicalBmeReadings(row), { selected, source: sourceDeviceId }, sensorId, observedAt, result.receivedAt, result.sourceRef, `${sourceDeviceId}:${sensorId}:${observedAt}`)
    accepted.push(...points.accepted); rejected += points.rejected
  }
  return { accepted, rejected }
}

function pointsToSeries(points: readonly AcceptedPoint[], evaluatedAt: string): DeviceSensorSampleSeries[] {
  const groups = new Map<string, AcceptedPoint[]>()
  for (const point of points) {
    const key = [point.selectedDeviceId, point.sensorId, point.modality, point.metric, point.unit, point.sourceRef].join("|")
    groups.set(key, [...(groups.get(key) ?? []), point])
  }
  return [...groups.values()].map((group): DeviceSensorSampleSeries => {
    const sorted = group.sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt)).slice(-SENSING_TELEMETRY_MAX_POINTS)
    const latest = sorted.at(-1)!
    const stale = Date.parse(evaluatedAt) - Date.parse(latest.observedAt) > 5 * 60_000
    return {
      deviceId: latest.selectedDeviceId,
      sensorId: `${latest.sensorId}:${latest.metric}`,
      modality: latest.modality,
      unit: latest.unit,
      timestamps: sorted.map((point) => point.observedAt),
      values: sorted.map((point) => point.value),
      provenance: { sourceId: latest.sourceRef, evidenceId: latest.evidenceId, observedAt: latest.observedAt, receivedAt: latest.receivedAt, mode: "LIVE" },
      state: stale ? "stale" : "available",
    }
  }).sort((left, right) => `${left.deviceId}|${left.sensorId}`.localeCompare(`${right.deviceId}|${right.sensorId}`))
}

export async function collectSameOriginSensingTelemetry(
  selectedDeviceIds: readonly string[], reader: PassiveSameOriginReader, evaluatedAt: string,
  identityOptions: SensingTelemetryIdentityOptions = {},
): Promise<SensingTelemetryResult> {
  const uniqueIds = [...new Set(selectedDeviceIds.filter(Boolean))].slice(0, SENSING_TELEMETRY_MAX_DEVICES)
  if (!uniqueIds.length) return { schema: SENSING_TELEMETRY_SCHEMA, state: "unbound", evaluatedAt, selectedDeviceIds: [], sampleSeries: [], sourceRuns: [], message: "No exact device selection was supplied." }

  const identityScope = buildIdentityScope(uniqueIds, identityOptions.aliasesBySelected)
  const readDeviceIds = [...new Set((identityOptions.readDeviceIds?.length ? identityOptions.readDeviceIds : uniqueIds).filter(Boolean))]
    .slice(0, SENSING_TELEMETRY_MAX_DEVICES)
  const liveReadDeviceIds = [...new Set((identityOptions.liveReadDeviceIds ?? []).filter(Boolean))]
    .slice(0, SENSING_TELEMETRY_MAX_DEVICES)
  const refs = [
    "/api/devices/network?include_offline=true",
    "/api/mycobrain/devices",
    ...readDeviceIds.flatMap((deviceId) => [
      `/api/devices/network/${encodeURIComponent(deviceId)}/telemetry`,
      `/api/mycobrain/${encodeURIComponent(deviceId)}/sensors?cache_only=1`,
      `/api/mindex/telemetry/samples?device_slug=${encodeURIComponent(deviceId)}&limit=256`,
      `/api/fci/telemetry?device_id=${encodeURIComponent(deviceId)}&limit=256&hours=24`,
    ]),
    ...liveReadDeviceIds.flatMap((deviceId) =>
      (PSATHYRELLA_DEVICE_ALIASES as readonly string[]).includes(deviceId)
        ? [`/api/mycobrain/${encodeURIComponent(deviceId)}/sensors?live_selected=1`]
        : [`/api/mycobrain?device_id=${encodeURIComponent(deviceId)}`]
    ),
    ...(psathyrellaSelection(uniqueIds) ? PSATHYRELLA_PASSIVE_SOURCES : []),
  ]
  const reads = await Promise.all(refs.map(async (sourceRef) => {
    try { return await reader(sourceRef) } catch { return { sourceRef, state: "error" as const, receivedAt: evaluatedAt, payload: null, message: "Passive same-origin read failed." } }
  }))
  const points: AcceptedPoint[] = []
  const sourceRuns: SensingTelemetrySourceRun[] = []
  for (const result of reads) {
    const parsed = result.sourceRef.startsWith("/api/devices/network?") ? parseNetworkDevices(result, identityScope)
      : result.sourceRef === "/api/mycobrain/devices" || result.sourceRef.startsWith("/api/mycobrain?") ? parseMycoBrainDevices(result, identityScope)
        : result.sourceRef.startsWith("/api/mycobrain/") ? parseMycoBrainSensorCache(result, identityScope)
          : result.sourceRef.startsWith("/api/mindex/telemetry/samples") ? parseMindexSamples(result, identityScope)
            : result.sourceRef === "/api/psathyrella/bme" ? parsePsathyrellaBme(result, uniqueIds)
              : result.sourceRef === "/api/psathyrella/telemetry" ? parsePsathyrellaTelemetry(result, uniqueIds)
                : result.sourceRef.startsWith("/api/fci/telemetry") ? parseFci(result, identityScope)
          : parseDeviceTelemetry(result, identityScope)
    points.push(...parsed.accepted)
    sourceRuns.push({ sourceRef: result.sourceRef, state: parsed.accepted.length ? "available" : result.state === "available" ? "withheld" : result.state, acceptedPointCount: parsed.accepted.length, rejectedPointCount: parsed.rejected, message: parsed.accepted.length ? "Exact identity, sensor, time, unit, and provenance checks passed." : result.state === "available" ? "Response was reachable but contained no record satisfying the strict telemetry contract." : result.message })
  }
  const sampleSeries = pointsToSeries(points, evaluatedAt)
  const state = sampleSeries.some((series) => series.state === "available") ? "available" : sampleSeries.length ? "stale" : sourceRuns.every((run) => run.state === "error") ? "error" : "unbound"
  return { schema: SENSING_TELEMETRY_SCHEMA, state, evaluatedAt, selectedDeviceIds: uniqueIds, sampleSeries, sourceRuns, message: sampleSeries.length ? `${sampleSeries.length} exact device sensor series passed the selected-device telemetry contract.` : "No exact telemetry stream matched the selected device. Sensor instruments remain unbound." }
}
