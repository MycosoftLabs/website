export type VisualDataState = "ready" | "idle" | "unbound" | "unavailable" | "stale"

export interface VisualProvenance {
  sourceId: string
  observedAt?: string
  receivedAt?: string
  evidenceId?: string
  mode?: "LIVE" | "REPLAY" | "FORECAST" | "SIMULATED"
}

export interface ScalarSample {
  timestamp: string | number
  value: number
}

export interface ChannelSeries {
  id: string
  label: string
  unit: string
  color?: string
  samples: readonly ScalarSample[]
}

export interface HeatField {
  width: number
  height: number
  values: readonly number[]
  unit: string
  minimum?: number
  maximum?: number
}

export interface SpectrogramFrame {
  timestamp: string | number
  bins: readonly number[]
}

export interface TimelineEvent {
  id: string
  timestamp: string | number
  modality: "camera" | "radar" | "lidar" | "wifi" | string
  label: string
  confidence?: number
}

export interface DeviceSensorSampleSeries {
  deviceId: string
  sensorId: string
  modality: "camera" | "microphone" | "bioelectric" | "gas-voc" | "particulate" | "radiation" | "radar" | "lidar" | "wifi" | "thermal" | "mechanical"
  unit: string
  timestamps: readonly (string | number)[]
  values: readonly number[]
  channels?: readonly string[]
  width?: number
  height?: number
  provenance: VisualProvenance
  state: "available" | "stale" | "unavailable" | "unbound" | "error"
}

export function validateDeviceSensorSampleSeries(series: DeviceSensorSampleSeries): string[] {
  const issues: string[] = []
  if (!series.deviceId.trim()) issues.push("deviceId is required")
  if (!series.sensorId.trim()) issues.push("sensorId is required")
  if (!series.unit.trim()) issues.push("unit is required")
  if (!series.provenance.sourceId.trim()) issues.push("provenance sourceId is required")
  if (series.values.some((value) => !Number.isFinite(value))) issues.push("values must be finite")
  if (series.timestamps.some((value) => !Number.isFinite(new Date(value).getTime()))) issues.push("timestamps must be valid")
  if (series.width !== undefined || series.height !== undefined) {
    if (!Number.isInteger(series.width) || !Number.isInteger(series.height) || (series.width ?? 0) < 1 || (series.height ?? 0) < 1) issues.push("width and height must be positive integers")
  } else if (series.timestamps.length !== series.values.length) issues.push("timestamps and values must have equal length")
  return issues
}

export function finiteValues(values: readonly number[], limit = 4096): number[] {
  return values.slice(0, limit).filter(Number.isFinite)
}

export function finiteSamples(samples: readonly ScalarSample[], limit = 4096): ScalarSample[] {
  return samples.slice(-limit).filter((sample) => Number.isFinite(sample.value) && Number.isFinite(new Date(sample.timestamp).getTime()))
}

export function validateHeatField(field: HeatField): string[] {
  const issues: string[] = []
  if (!Number.isInteger(field.width) || !Number.isInteger(field.height) || field.width < 1 || field.height < 1) issues.push("width and height must be positive integers")
  if (field.values.length !== field.width * field.height) issues.push("values length must equal width times height")
  if (field.values.some((value) => !Number.isFinite(value))) issues.push("values must be finite")
  if (!field.unit.trim()) issues.push("unit is required")
  return issues
}
