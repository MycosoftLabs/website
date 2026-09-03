/**
 * Security boundary for FCI HTTP writes.
 *
 * These parsers deliberately return new, allowlisted objects instead of passing
 * caller-controlled JSON through to MINDEX or MAS. Device and sample identities
 * are exact values: this layer never supplies an "unknown" device, a timestamp,
 * a coordinate, or a stimulation default on the caller's behalf.
 */

export const FCI_MAX_JSON_BYTES = 128 * 1024

export type FciValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

type JsonRecord = Record<string, unknown>

export interface FciRequestBodyReader {
  readonly url: string
  readonly headers: { get(name: string): string | null }
  readonly body?: ReadableStream<Uint8Array> | null
  text?(): Promise<string>
}

export interface FciDeviceRegistration {
  device_id: string
  device_serial?: string
  device_name?: string
  probe_type: string
  electrode_materials: string[]
  firmware_version?: string
  location?: {
    latitude: number
    longitude: number
    altitude_m?: number
  }
  sample_rate_hz: number
  channels_count: number
}

export interface FciTelemetrySubmission {
  device_id: string
  timestamp: string
  channels: Array<{
    channel_id: string
    amplitude_uv: number
    rms_uv?: number
    mean_uv?: number
    std_uv?: number
    dominant_freq_hz?: number
    spectral_centroid_hz?: number
    total_power?: number
    band_powers?: Partial<Record<"ultra_low" | "low" | "mid" | "high", number>>
    snr_db?: number
    quality_score?: number
  }>
  pattern?: {
    name: string
    category: string
    confidence: number
  }
  environment?: {
    temperature_c?: number
    humidity_pct?: number
    pressure_hpa?: number
    voc_index?: number
    co2_ppm?: number
    light_lux?: number
  }
  spike_count: number
  spike_rate_hz: number
  envelope_id?: string
}

export interface FciPatternSubmission {
  device_id: string
  channel_id?: string
  pattern_name: string
  pattern_category: string
  start_time: string
  confidence_score: number
  confidence_level: "low" | "moderate" | "high"
  amplitude_uv?: number
  dominant_freq_hz?: number
  spike_count?: number
  spike_rate_hz?: number
  feature_scores: Record<string, number>
  phase: string
  environment?: FciTelemetrySubmission["environment"]
  interpretation_meaning?: string
  interpretation_implications: string[]
  interpretation_actions: string[]
}

export interface FciNoteSubmission {
  deviceId: string
  notes: string
  timestamp: string
}

export interface FciStimulationSubmission {
  device_id: string
  waveform: "pulse" | "sine" | "square" | "triangle"
  frequency: number
  amplitude: number
  duration: number
  channel: number
}

function pass<T>(value: T): FciValidationResult<T> {
  return { ok: true, value }
}

function fail<T>(error: string): FciValidationResult<T> {
  return { ok: false, error }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function exactKeys(
  value: JsonRecord,
  allowed: readonly string[],
  required: readonly string[] = [],
): string | null {
  const allowedSet = new Set(allowed)
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key))
  if (unexpected) return `unexpected field: ${unexpected}`
  const missing = required.find((key) => !(key in value))
  return missing ? `${missing} is required` : null
}

function exactText(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp,
): FciValidationResult<string> {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    return fail(`${field} must be a string between 1 and ${maxLength} characters`)
  }
  if (value !== value.trim()) return fail(`${field} must not contain leading or trailing whitespace`)
  if (/[\u0000-\u001f\u007f]/.test(value)) return fail(`${field} contains unsupported control characters`)
  if (pattern && !pattern.test(value)) return fail(`${field} has an invalid format`)
  return pass(value)
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateFciIdentifier(value: unknown, field = "device_id", maxLength = 128) {
  return exactText(value, field, maxLength, IDENTIFIER)
}

export function validateFciTimestamp(value: unknown, field = "timestamp"): FciValidationResult<string> {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return fail(`${field} must be an exact UTC timestamp with millisecond precision`)
  }
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    return fail(`${field} must be a valid UTC timestamp`)
  }
  return pass(value)
}

function finiteNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): FciValidationResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return fail(`${field} must be a finite number between ${min} and ${max}`)
  }
  return pass(value)
}

function integer(
  value: unknown,
  field: string,
  min: number,
  max: number,
): FciValidationResult<number> {
  const result = finiteNumber(value, field, min, max)
  if (!result.ok) return result
  return Number.isInteger(result.value) ? result : fail(`${field} must be an integer`)
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp,
): FciValidationResult<string | undefined> {
  if (value === undefined) return pass(undefined)
  return exactText(value, field, maxLength, pattern)
}

function optionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): FciValidationResult<number | undefined> {
  if (value === undefined) return pass(undefined)
  return finiteNumber(value, field, min, max)
}

function optionalInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
): FciValidationResult<number | undefined> {
  if (value === undefined) return pass(undefined)
  return integer(value, field, min, max)
}

function stringList(value: unknown, field: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) {
    return fail<string[]>(`${field} must be an array with at most ${maxItems} entries`)
  }
  const output: string[] = []
  for (let index = 0; index < value.length; index += 1) {
    const item = exactText(value[index], `${field}[${index}]`, maxLength)
    if (!item.ok) return item
    output.push(item.value)
  }
  return pass(output)
}

export function requireFciSameOrigin(request: Pick<FciRequestBodyReader, "url" | "headers">) {
  const origin = request.headers.get("origin")
  if (!origin) return fail<true>("trusted same-origin request required")
  try {
    const parsedOrigin = new URL(origin)
    if (origin !== parsedOrigin.origin || parsedOrigin.origin !== new URL(request.url).origin) {
      return fail<true>("trusted same-origin request required")
    }
  } catch {
    return fail<true>("trusted same-origin request required")
  }
  return pass(true)
}

export async function readFciJson(
  request: FciRequestBodyReader,
  maxBytes = FCI_MAX_JSON_BYTES,
): Promise<FciValidationResult<unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType !== "application/json") return fail("content-type must be application/json")

  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    const declared = Number(contentLength)
    if (!Number.isSafeInteger(declared) || declared < 0 || declared > maxBytes) {
      return fail(`request body must not exceed ${maxBytes} bytes`)
    }
  }

  try {
    if (request.body) {
      const reader = request.body.getReader()
      const decoder = new TextDecoder("utf-8", { fatal: true })
      const chunks: string[] = []
      let bytesRead = 0
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          bytesRead += chunk.value.byteLength
          if (bytesRead > maxBytes) {
            await reader.cancel().catch(() => undefined)
            return fail(`request body must not exceed ${maxBytes} bytes`)
          }
          chunks.push(decoder.decode(chunk.value, { stream: true }))
        }
        chunks.push(decoder.decode())
        return pass(JSON.parse(chunks.join("")) as unknown)
      } finally {
        reader.releaseLock()
      }
    }

    if (typeof request.text !== "function") return fail("request body must contain valid JSON")
    const raw = await request.text()
    if (raw.length > maxBytes) return fail(`request body must not exceed ${maxBytes} bytes`)
    return pass(JSON.parse(raw) as unknown)
  } catch {
    return fail("request body must contain valid JSON")
  }
}

function validateEnvironment(value: unknown): FciValidationResult<FciTelemetrySubmission["environment"]> {
  if (value === undefined) return pass(undefined)
  if (!isRecord(value)) return fail("environment must be an object")
  const keyError = exactKeys(value, ["temperature_c", "humidity_pct", "pressure_hpa", "voc_index", "co2_ppm", "light_lux"])
  if (keyError) return fail(`environment ${keyError}`)

  const temperature = optionalNumber(value.temperature_c, "environment.temperature_c", -100, 200)
  if (!temperature.ok) return temperature
  const humidity = optionalNumber(value.humidity_pct, "environment.humidity_pct", 0, 100)
  if (!humidity.ok) return humidity
  const pressure = optionalNumber(value.pressure_hpa, "environment.pressure_hpa", 0, 2_000)
  if (!pressure.ok) return pressure
  const voc = optionalInteger(value.voc_index, "environment.voc_index", 0, 500)
  if (!voc.ok) return voc
  const co2 = optionalInteger(value.co2_ppm, "environment.co2_ppm", 0, 1_000_000)
  if (!co2.ok) return co2
  const light = optionalNumber(value.light_lux, "environment.light_lux", 0, 1_000_000_000)
  if (!light.ok) return light

  return pass({
    ...(temperature.value === undefined ? {} : { temperature_c: temperature.value }),
    ...(humidity.value === undefined ? {} : { humidity_pct: humidity.value }),
    ...(pressure.value === undefined ? {} : { pressure_hpa: pressure.value }),
    ...(voc.value === undefined ? {} : { voc_index: voc.value }),
    ...(co2.value === undefined ? {} : { co2_ppm: co2.value }),
    ...(light.value === undefined ? {} : { light_lux: light.value }),
  })
}

export function validateFciDeviceRegistration(value: unknown): FciValidationResult<FciDeviceRegistration> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(
    value,
    ["device_id", "device_serial", "device_name", "probe_type", "electrode_materials", "firmware_version", "location", "sample_rate_hz", "channels_count"],
    ["device_id", "probe_type", "electrode_materials", "sample_rate_hz", "channels_count"],
  )
  if (keyError) return fail(keyError)

  const deviceId = validateFciIdentifier(value.device_id)
  if (!deviceId.ok) return deviceId
  const serial = optionalText(value.device_serial, "device_serial", 128, IDENTIFIER)
  if (!serial.ok) return serial
  const name = optionalText(value.device_name, "device_name", 160)
  if (!name.ok) return name
  const probe = validateFciIdentifier(value.probe_type, "probe_type", 64)
  if (!probe.ok) return probe
  const materials = stringList(value.electrode_materials, "electrode_materials", 16, 64)
  if (!materials.ok) return materials
  const firmware = optionalText(value.firmware_version, "firmware_version", 64, IDENTIFIER)
  if (!firmware.ok) return firmware
  const sampleRate = integer(value.sample_rate_hz, "sample_rate_hz", 1, 100_000)
  if (!sampleRate.ok) return sampleRate
  const channelsCount = integer(value.channels_count, "channels_count", 1, 256)
  if (!channelsCount.ok) return channelsCount

  let location: FciDeviceRegistration["location"]
  if (value.location !== undefined) {
    if (!isRecord(value.location)) return fail("location must be an object")
    const locationKeys = exactKeys(value.location, ["latitude", "longitude", "altitude_m"], ["latitude", "longitude"])
    if (locationKeys) return fail(`location ${locationKeys}`)
    const latitude = finiteNumber(value.location.latitude, "location.latitude", -90, 90)
    if (!latitude.ok) return latitude
    const longitude = finiteNumber(value.location.longitude, "location.longitude", -180, 180)
    if (!longitude.ok) return longitude
    if (latitude.value === 0 && longitude.value === 0) {
      return fail("location cannot be null-island (0,0); invented coordinates are not location evidence")
    }
    const altitude = optionalNumber(value.location.altitude_m, "location.altitude_m", -12_000, 100_000)
    if (!altitude.ok) return altitude
    location = {
      latitude: latitude.value,
      longitude: longitude.value,
      ...(altitude.value === undefined ? {} : { altitude_m: altitude.value }),
    }
  }

  return pass({
    device_id: deviceId.value,
    ...(serial.value === undefined ? {} : { device_serial: serial.value }),
    ...(name.value === undefined ? {} : { device_name: name.value }),
    probe_type: probe.value,
    electrode_materials: materials.value,
    ...(firmware.value === undefined ? {} : { firmware_version: firmware.value }),
    ...(location ? { location } : {}),
    sample_rate_hz: sampleRate.value,
    channels_count: channelsCount.value,
  })
}

export function validateFciTelemetrySubmission(value: unknown): FciValidationResult<FciTelemetrySubmission> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(
    value,
    ["device_id", "timestamp", "channels", "pattern", "environment", "spike_count", "spike_rate_hz", "envelope_id"],
    ["device_id", "timestamp", "channels", "spike_count", "spike_rate_hz"],
  )
  if (keyError) return fail(keyError)

  const deviceId = validateFciIdentifier(value.device_id)
  if (!deviceId.ok) return deviceId
  const timestamp = validateFciTimestamp(value.timestamp)
  if (!timestamp.ok) return timestamp
  if (!Array.isArray(value.channels) || value.channels.length < 1 || value.channels.length > 256) {
    return fail("channels must contain between 1 and 256 channel records")
  }

  const channels: FciTelemetrySubmission["channels"] = []
  const channelIds = new Set<string>()
  for (let index = 0; index < value.channels.length; index += 1) {
    const channel = value.channels[index]
    if (!isRecord(channel)) return fail(`channels[${index}] must be an object`)
    const channelKeys = exactKeys(
      channel,
      ["channel_id", "amplitude_uv", "rms_uv", "mean_uv", "std_uv", "dominant_freq_hz", "spectral_centroid_hz", "total_power", "band_powers", "snr_db", "quality_score"],
      ["channel_id", "amplitude_uv"],
    )
    if (channelKeys) return fail(`channels[${index}] ${channelKeys}`)
    const channelId = validateFciIdentifier(channel.channel_id, `channels[${index}].channel_id`, 128)
    if (!channelId.ok) return channelId
    if (channelIds.has(channelId.value)) return fail(`channels[${index}].channel_id must be unique`)
    channelIds.add(channelId.value)
    const amplitude = finiteNumber(channel.amplitude_uv, `channels[${index}].amplitude_uv`, -1_000_000, 1_000_000)
    if (!amplitude.ok) return amplitude
    const rms = optionalNumber(channel.rms_uv, `channels[${index}].rms_uv`, 0, 1_000_000)
    if (!rms.ok) return rms
    const mean = optionalNumber(channel.mean_uv, `channels[${index}].mean_uv`, -1_000_000, 1_000_000)
    if (!mean.ok) return mean
    const std = optionalNumber(channel.std_uv, `channels[${index}].std_uv`, 0, 1_000_000)
    if (!std.ok) return std
    const dominant = optionalNumber(channel.dominant_freq_hz, `channels[${index}].dominant_freq_hz`, 0, 100_000)
    if (!dominant.ok) return dominant
    const centroid = optionalNumber(channel.spectral_centroid_hz, `channels[${index}].spectral_centroid_hz`, 0, 100_000)
    if (!centroid.ok) return centroid
    const power = optionalNumber(channel.total_power, `channels[${index}].total_power`, 0, 1_000_000_000_000)
    if (!power.ok) return power
    const snr = optionalNumber(channel.snr_db, `channels[${index}].snr_db`, -300, 300)
    if (!snr.ok) return snr
    const quality = optionalNumber(channel.quality_score, `channels[${index}].quality_score`, 0, 1)
    if (!quality.ok) return quality

    let bandPowers: FciTelemetrySubmission["channels"][number]["band_powers"]
    if (channel.band_powers !== undefined) {
      if (!isRecord(channel.band_powers)) return fail(`channels[${index}].band_powers must be an object`)
      const bandKeys = exactKeys(channel.band_powers, ["ultra_low", "low", "mid", "high"])
      if (bandKeys) return fail(`channels[${index}].band_powers ${bandKeys}`)
      bandPowers = {}
      for (const key of ["ultra_low", "low", "mid", "high"] as const) {
        const band = optionalNumber(channel.band_powers[key], `channels[${index}].band_powers.${key}`, 0, 1_000_000_000_000)
        if (!band.ok) return band
        if (band.value !== undefined) bandPowers[key] = band.value
      }
    }

    channels.push({
      channel_id: channelId.value,
      amplitude_uv: amplitude.value,
      ...(rms.value === undefined ? {} : { rms_uv: rms.value }),
      ...(mean.value === undefined ? {} : { mean_uv: mean.value }),
      ...(std.value === undefined ? {} : { std_uv: std.value }),
      ...(dominant.value === undefined ? {} : { dominant_freq_hz: dominant.value }),
      ...(centroid.value === undefined ? {} : { spectral_centroid_hz: centroid.value }),
      ...(power.value === undefined ? {} : { total_power: power.value }),
      ...(bandPowers ? { band_powers: bandPowers } : {}),
      ...(snr.value === undefined ? {} : { snr_db: snr.value }),
      ...(quality.value === undefined ? {} : { quality_score: quality.value }),
    })
  }

  let pattern: FciTelemetrySubmission["pattern"]
  if (value.pattern !== undefined) {
    if (!isRecord(value.pattern)) return fail("pattern must be an object")
    const patternKeys = exactKeys(value.pattern, ["name", "category", "confidence"], ["name", "category", "confidence"])
    if (patternKeys) return fail(`pattern ${patternKeys}`)
    const name = validateFciIdentifier(value.pattern.name, "pattern.name", 128)
    if (!name.ok) return name
    const category = validateFciIdentifier(value.pattern.category, "pattern.category", 128)
    if (!category.ok) return category
    const confidence = finiteNumber(value.pattern.confidence, "pattern.confidence", 0, 1)
    if (!confidence.ok) return confidence
    pattern = { name: name.value, category: category.value, confidence: confidence.value }
  }

  const environment = validateEnvironment(value.environment)
  if (!environment.ok) return environment
  const spikeCount = integer(value.spike_count, "spike_count", 0, 10_000_000)
  if (!spikeCount.ok) return spikeCount
  const spikeRate = finiteNumber(value.spike_rate_hz, "spike_rate_hz", 0, 100_000)
  if (!spikeRate.ok) return spikeRate
  const envelope = value.envelope_id === undefined
    ? pass<string | undefined>(undefined)
    : exactText(value.envelope_id, "envelope_id", 36, UUID)
  if (!envelope.ok) return envelope

  return pass({
    device_id: deviceId.value,
    timestamp: timestamp.value,
    channels,
    ...(pattern ? { pattern } : {}),
    ...(environment.value ? { environment: environment.value } : {}),
    spike_count: spikeCount.value,
    spike_rate_hz: spikeRate.value,
    ...(envelope.value === undefined ? {} : { envelope_id: envelope.value }),
  })
}

export function validateFciPatternSubmission(value: unknown): FciValidationResult<FciPatternSubmission> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(
    value,
    ["device_id", "channel_id", "pattern_name", "pattern_category", "start_time", "confidence_score", "confidence_level", "amplitude_uv", "dominant_freq_hz", "spike_count", "spike_rate_hz", "feature_scores", "phase", "environment", "interpretation_meaning", "interpretation_implications", "interpretation_actions"],
    ["device_id", "pattern_name", "pattern_category", "start_time", "confidence_score", "confidence_level", "feature_scores", "phase", "interpretation_implications", "interpretation_actions"],
  )
  if (keyError) return fail(keyError)

  const deviceId = validateFciIdentifier(value.device_id)
  if (!deviceId.ok) return deviceId
  const channelId = optionalText(value.channel_id, "channel_id", 128, IDENTIFIER)
  if (!channelId.ok) return channelId
  const patternName = validateFciIdentifier(value.pattern_name, "pattern_name", 128)
  if (!patternName.ok) return patternName
  const patternCategory = validateFciIdentifier(value.pattern_category, "pattern_category", 128)
  if (!patternCategory.ok) return patternCategory
  const startTime = validateFciTimestamp(value.start_time, "start_time")
  if (!startTime.ok) return startTime
  const confidence = finiteNumber(value.confidence_score, "confidence_score", 0, 1)
  if (!confidence.ok) return confidence
  const confidenceLevel = value.confidence_level
  if (!(["low", "moderate", "high"] as const).includes(confidenceLevel as "low" | "moderate" | "high")) {
    return fail("confidence_level must be low, moderate, or high")
  }
  const amplitude = optionalNumber(value.amplitude_uv, "amplitude_uv", -1_000_000, 1_000_000)
  if (!amplitude.ok) return amplitude
  const dominant = optionalNumber(value.dominant_freq_hz, "dominant_freq_hz", 0, 100_000)
  if (!dominant.ok) return dominant
  const spikeCount = optionalInteger(value.spike_count, "spike_count", 0, 10_000_000)
  if (!spikeCount.ok) return spikeCount
  const spikeRate = optionalNumber(value.spike_rate_hz, "spike_rate_hz", 0, 100_000)
  if (!spikeRate.ok) return spikeRate

  const featureScores: Record<string, number> = {}
  if (!isRecord(value.feature_scores) || Object.keys(value.feature_scores).length > 64) {
    return fail("feature_scores must be an object with at most 64 entries")
  }
  for (const [key, rawScore] of Object.entries(value.feature_scores)) {
    const validKey = exactText(key, "feature_scores key", 64, IDENTIFIER)
    if (!validKey.ok) return validKey
    if (["constructor", "prototype", "__proto__"].includes(key)) {
      return fail("feature_scores contains a reserved key")
    }
    const score = finiteNumber(rawScore, `feature_scores.${key}`, -1_000_000_000, 1_000_000_000)
    if (!score.ok) return score
    featureScores[key] = score.value
  }

  const phase = validateFciIdentifier(value.phase, "phase", 64)
  if (!phase.ok) return phase
  const environment = validateEnvironment(value.environment)
  if (!environment.ok) return environment
  const meaning = optionalText(value.interpretation_meaning, "interpretation_meaning", 2_000)
  if (!meaning.ok) return meaning
  const implications = stringList(value.interpretation_implications, "interpretation_implications", 32, 500)
  if (!implications.ok) return implications
  const actions = stringList(value.interpretation_actions, "interpretation_actions", 32, 500)
  if (!actions.ok) return actions

  return pass({
    device_id: deviceId.value,
    ...(channelId.value === undefined ? {} : { channel_id: channelId.value }),
    pattern_name: patternName.value,
    pattern_category: patternCategory.value,
    start_time: startTime.value,
    confidence_score: confidence.value,
    confidence_level: confidenceLevel as "low" | "moderate" | "high",
    ...(amplitude.value === undefined ? {} : { amplitude_uv: amplitude.value }),
    ...(dominant.value === undefined ? {} : { dominant_freq_hz: dominant.value }),
    ...(spikeCount.value === undefined ? {} : { spike_count: spikeCount.value }),
    ...(spikeRate.value === undefined ? {} : { spike_rate_hz: spikeRate.value }),
    feature_scores: featureScores,
    phase: phase.value,
    ...(environment.value ? { environment: environment.value } : {}),
    ...(meaning.value === undefined ? {} : { interpretation_meaning: meaning.value }),
    interpretation_implications: implications.value,
    interpretation_actions: actions.value,
  })
}

export function validateFciNoteSubmission(value: unknown): FciValidationResult<FciNoteSubmission> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(value, ["deviceId", "notes", "timestamp"], ["deviceId", "notes", "timestamp"])
  if (keyError) return fail(keyError)
  const deviceId = validateFciIdentifier(value.deviceId, "deviceId")
  if (!deviceId.ok) return deviceId
  const timestamp = validateFciTimestamp(value.timestamp)
  if (!timestamp.ok) return timestamp
  if (typeof value.notes !== "string" || value.notes.length < 1 || value.notes.length > 4_000) {
    return fail("notes must be a string between 1 and 4000 characters")
  }
  if (!value.notes.trim()) return fail("notes must contain non-whitespace text")
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value.notes)) {
    return fail("notes contains unsupported control characters")
  }
  return pass({ deviceId: deviceId.value, notes: value.notes, timestamp: timestamp.value })
}

export function validateFciStimulationSubmission(value: unknown): FciValidationResult<FciStimulationSubmission> {
  if (!isRecord(value)) return fail("request body must be an object")
  const keyError = exactKeys(
    value,
    ["device_id", "waveform", "frequency", "amplitude", "duration", "channel"],
    ["device_id", "waveform", "frequency", "amplitude", "duration", "channel"],
  )
  if (keyError) return fail(keyError)
  const deviceId = validateFciIdentifier(value.device_id)
  if (!deviceId.ok) return deviceId
  if (!(["pulse", "sine", "square", "triangle"] as const).includes(value.waveform as FciStimulationSubmission["waveform"])) {
    return fail("waveform must be pulse, sine, square, or triangle")
  }
  const frequency = finiteNumber(value.frequency, "frequency", 0.1, 50)
  if (!frequency.ok) return frequency
  const amplitude = finiteNumber(value.amplitude, "amplitude", 0.001, 5)
  if (!amplitude.ok) return amplitude
  const duration = finiteNumber(value.duration, "duration", 0.001, 10)
  if (!duration.ok) return duration
  const channel = integer(value.channel, "channel", 0, 255)
  if (!channel.ok) return channel
  return pass({
    device_id: deviceId.value,
    waveform: value.waveform as FciStimulationSubmission["waveform"],
    frequency: frequency.value,
    amplitude: amplitude.value,
    duration: duration.value,
    channel: channel.value,
  })
}

export function parseFciQueryInteger(raw: string | null, field: string, fallback: number, min: number, max: number) {
  if (raw === null) return pass(fallback)
  if (!/^\d+$/.test(raw)) return fail<number>(`${field} must be an integer between ${min} and ${max}`)
  return integer(Number(raw), field, min, max)
}

export function parseFciQueryNumber(raw: string | null, field: string, min: number, max: number) {
  if (raw === null || raw.length === 0) return pass<number | undefined>(undefined)
  const value = Number(raw)
  return finiteNumber(value, field, min, max)
}
