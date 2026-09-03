export const THERMAL_SEQUENCE_SCHEMA = "mycosoft.thermal.sequence.v1" as const
export const THERMAL_MAX_WIDTH = 512
export const THERMAL_MAX_HEIGHT = 512
export const THERMAL_MAX_PIXELS = THERMAL_MAX_WIDTH * THERMAL_MAX_HEIGHT
export const THERMAL_MAX_FRAMES = 2_000
export const THERMAL_MIN_C = -80
export const THERMAL_MAX_C = 400
export const THERMAL_UNIT = "°C" as const

export type ThermalObservationState = "live" | "stale" | "replay" | "unavailable"

export interface ThermalFrame {
  frameId: string
  observedAt: string
  width: number
  height: number
  temperaturesC: number[]
  emissivity: number | null
  ambientC: number | null
}

export interface ThermalSequence {
  schema: typeof THERMAL_SEQUENCE_SCHEMA
  sequenceId: string
  sensorFamily: string
  deviceId: string | null
  calibrated: boolean
  frames: ThermalFrame[]
  provenance: { source: "file_import" | "local_capture"; notes: string | null }
}

export interface ThermalFrameSummary {
  frameId: string
  observedAt: string
  minimumC: number
  maximumC: number
  averageC: number
  rangeC: number
  hottestPixel: number
  coldestPixel: number
}

export interface ThermalSequenceSummary {
  frameCount: number
  durationMs: number
  medianIntervalMs: number | null
  minimumC: number
  maximumC: number
  meanC: number
  calibrated: boolean
}

export type ThermalValidation =
  | { ok: true; value: ThermalSequence; issues: [] }
  | { ok: false; value: null; issues: string[] }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function timestamp(value: unknown): string | null {
  const candidate = text(value)
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null
}

function parseFrame(value: unknown, index: number, issues: string[]): ThermalFrame | null {
  const path = `frames[${index}]`
  if (!record(value)) { issues.push(`${path} must be an object.`); return null }
  const frameId = text(value.frameId)
  const observedAt = timestamp(value.observedAt)
  const width = finite(value.width)
  const height = finite(value.height)
  if (!frameId) issues.push(`${path}.frameId is required.`)
  if (!observedAt) issues.push(`${path}.observedAt must be an ISO-compatible timestamp.`)
  if (!width || !Number.isInteger(width) || width < 1) issues.push(`${path}.width must be a positive integer.`)
  if (width && width > THERMAL_MAX_WIDTH) issues.push(`${path}.width exceeds the ${THERMAL_MAX_WIDTH} accepted bound.`)
  if (!height || !Number.isInteger(height) || height < 1) issues.push(`${path}.height must be a positive integer.`)
  if (height && height > THERMAL_MAX_HEIGHT) issues.push(`${path}.height exceeds the ${THERMAL_MAX_HEIGHT} accepted bound.`)
  const pixelCount = width && height ? width * height : 0
  if (pixelCount > THERMAL_MAX_PIXELS) issues.push(`${path} exceeds the ${THERMAL_MAX_PIXELS}-pixel frame limit.`)
  const values = Array.isArray(value.temperaturesC) ? value.temperaturesC : null
  if (!values) issues.push(`${path}.temperaturesC must be an array.`)
  else if (values.length !== pixelCount) issues.push(`${path}.temperaturesC length must equal width × height.`)
  const temperaturesC: number[] = []
  for (const [pixel, item] of (values ?? []).entries()) {
    const parsed = finite(item)
    if (parsed === null) {
      issues.push(`${path}.temperaturesC[${pixel}] must be finite.`)
      continue
    }
    if (parsed < THERMAL_MIN_C || parsed > THERMAL_MAX_C) {
      issues.push(`${path}.temperaturesC[${pixel}] must be between ${THERMAL_MIN_C} and ${THERMAL_MAX_C} ${THERMAL_UNIT}.`)
      continue
    }
    temperaturesC.push(parsed)
  }
  const emissivity = value.emissivity === null || value.emissivity === undefined ? null : finite(value.emissivity)
  const ambientC = value.ambientC === null || value.ambientC === undefined ? null : finite(value.ambientC)
  if (value.emissivity !== null && value.emissivity !== undefined && (emissivity === null || emissivity <= 0 || emissivity > 1)) {
    issues.push(`${path}.emissivity must be greater than 0 and at most 1.`)
  }
  if (value.ambientC !== null && value.ambientC !== undefined && ambientC === null) issues.push(`${path}.ambientC must be finite or null.`)
  if (!frameId || !observedAt || !width || !height || !values || values.length !== pixelCount || temperaturesC.length !== pixelCount) return null
  return { frameId, observedAt, width, height, temperaturesC, emissivity, ambientC }
}

export function validateThermalSequence(input: unknown): ThermalValidation {
  if (!record(input)) return { ok: false, value: null, issues: ["Sequence root must be an object."] }
  const issues: string[] = []
  if (input.schema !== THERMAL_SEQUENCE_SCHEMA) issues.push(`schema must equal ${THERMAL_SEQUENCE_SCHEMA}.`)
  const sequenceId = text(input.sequenceId)
  const sensorFamily = text(input.sensorFamily)
  if (!sequenceId) issues.push("sequenceId is required.")
  if (!sensorFamily) issues.push("sensorFamily is required.")
  if (typeof input.calibrated !== "boolean") issues.push("calibrated must be boolean.")
  const rows = Array.isArray(input.frames) ? input.frames : null
  if (!rows) issues.push("frames must be an array.")
  else if (rows.length === 0) issues.push("frames must contain at least one frame.")
  else if (rows.length > THERMAL_MAX_FRAMES) issues.push(`frames exceeds the ${THERMAL_MAX_FRAMES}-frame limit.`)
  const frames = (rows ?? []).map((row, index) => parseFrame(row, index, issues)).filter((row): row is ThermalFrame => row !== null)
  if (frames.some((frame) => frame.width !== frames[0]?.width || frame.height !== frames[0]?.height)) issues.push("All frames must have matching dimensions.")
  for (let index = 1; index < frames.length; index += 1) {
    if (Date.parse(frames[index].observedAt) < Date.parse(frames[index - 1].observedAt)) {
      issues.push("frames observation times must be non-decreasing; reversed time ranges are rejected.")
      break
    }
  }
  const provenanceInput = record(input.provenance) ? input.provenance : null
  const source = provenanceInput?.source
  if (source !== "file_import" && source !== "local_capture") issues.push("provenance.source must be file_import or local_capture.")
  const ids = new Set<string>()
  for (const frame of frames) { if (ids.has(frame.frameId)) issues.push(`Duplicate frameId: ${frame.frameId}.`); ids.add(frame.frameId) }
  if (issues.length || !sequenceId || !sensorFamily || typeof input.calibrated !== "boolean") {
    return { ok: false, value: null, issues: [...new Set(issues)].slice(0, 50) }
  }
  return { ok: true, value: { schema: THERMAL_SEQUENCE_SCHEMA, sequenceId, sensorFamily, deviceId: text(input.deviceId), calibrated: input.calibrated, frames, provenance: { source: source === "local_capture" ? "local_capture" : "file_import", notes: provenanceInput ? text(provenanceInput.notes) : null } }, issues: [] }
}

export function summarizeThermalFrame(frame: ThermalFrame): ThermalFrameSummary {
  let minimumC = Number.POSITIVE_INFINITY
  let maximumC = Number.NEGATIVE_INFINITY
  let total = 0
  let hottestPixel = 0
  let coldestPixel = 0
  frame.temperaturesC.forEach((value, index) => {
    total += value
    if (value < minimumC) { minimumC = value; coldestPixel = index }
    if (value > maximumC) { maximumC = value; hottestPixel = index }
  })
  return { frameId: frame.frameId, observedAt: frame.observedAt, minimumC, maximumC, averageC: total / frame.temperaturesC.length, rangeC: maximumC - minimumC, hottestPixel, coldestPixel }
}

export function thermalDifference(frame: ThermalFrame, baseline: ThermalFrame): number[] {
  if (frame.width !== baseline.width || frame.height !== baseline.height) throw new Error("Thermal frames must have matching dimensions.")
  return frame.temperaturesC.map((value, index) => value - baseline.temperaturesC[index])
}


export function summarizeThermalSequence(sequence: ThermalSequence): ThermalSequenceSummary {
  const summaries = sequence.frames.map(summarizeThermalFrame)
  const observedTimes = sequence.frames.map((frame) => Date.parse(frame.observedAt))
  const intervals = observedTimes.slice(1).map((time, index) => time - observedTimes[index]).sort((a, b) => a - b)
  const middle = Math.floor(intervals.length / 2)
  const medianIntervalMs = intervals.length === 0
    ? null
    : intervals.length % 2
      ? intervals[middle]
      : (intervals[middle - 1] + intervals[middle]) / 2
  const totalPixels = sequence.frames.reduce((count, frame) => count + frame.temperaturesC.length, 0)
  const totalTemperature = sequence.frames.reduce(
    (sum, frame) => sum + frame.temperaturesC.reduce((frameSum, value) => frameSum + value, 0),
    0,
  )
  return {
    frameCount: sequence.frames.length,
    durationMs: Math.max(0, observedTimes.at(-1)! - observedTimes[0]),
    medianIntervalMs,
    minimumC: Math.min(...summaries.map((summary) => summary.minimumC)),
    maximumC: Math.max(...summaries.map((summary) => summary.maximumC)),
    meanC: totalTemperature / totalPixels,
    calibrated: sequence.calibrated,
  }
}

export function classifyThermalObservationState(input: {
  provenanceSource: ThermalSequence["provenance"]["source"] | null
  observedAt: string | null
  evaluatedAt: string
  freshnessMs?: number
}): ThermalObservationState {
  if (!input.observedAt || Number.isNaN(Date.parse(input.observedAt))) return "unavailable"
  if (input.provenanceSource === "file_import") return "replay"
  const freshnessMs = input.freshnessMs ?? 5 * 60_000
  const age = Date.parse(input.evaluatedAt) - Date.parse(input.observedAt)
  if (!Number.isFinite(age)) return "unavailable"
  if (age > freshnessMs) return "stale"
  return "live"
}

export function thermalTrend(sequence: ThermalSequence) {
  return sequence.frames.map((frame) => {
    const summary = summarizeThermalFrame(frame)
    return {
      frameId: frame.frameId,
      observedAt: frame.observedAt,
      minimumC: summary.minimumC,
      averageC: summary.averageC,
      maximumC: summary.maximumC,
    }
  })
}
