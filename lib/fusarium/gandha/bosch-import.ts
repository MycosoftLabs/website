import {
  GANDHA_DATASET_SCHEMA,
  validateGandhaDataset,
  type GandhaDataset,
  type GandhaSourceCompatibility,
  type GandhaValidationResult,
} from "./contracts"

type Row = Record<string, unknown>

function record(value: unknown): value is Row { return typeof value === "object" && value !== null && !Array.isArray(value) }
function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null }
function finite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter(record) : [] }
function epochSeconds(value: unknown): string | null {
  const parsed = finite(value)
  if (parsed === null || parsed <= 0) return null
  const date = new Date(parsed * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
function timestamp(value: unknown): string | null {
  const candidate = text(value)
  return candidate && !Number.isNaN(Date.parse(candidate)) ? new Date(candidate).toISOString() : null
}
function mean(values: number[]): number | null { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null }
function idList(value: unknown): string[] { return rows(value).map((item) => text(item.id) ?? (finite(item.id) === null ? null : String(finite(item.id)))).filter((item): item is string => item !== null) }

function columnMap(value: unknown): Map<string, number> {
  const map = new Map<string, number>()
  if (!Array.isArray(value)) return map
  value.forEach((entry, index) => { if (record(entry) && text(entry.key)) map.set(text(entry.key)!, index) })
  return map
}

function valueAt(row: unknown[], columns: Map<string, number>, key: string): unknown {
  const index = columns.get(key)
  return index === undefined ? undefined : row[index]
}

interface CycleAccumulator {
  sensorIndex: string
  cycleIndex: string
  observedAt: string | null
  gasByStep: Map<number, number>
  temperatures: number[]
  humidity: number[]
  pressure: number[]
  label: string | null
}

function makeCompatibility(input: Partial<GandhaSourceCompatibility> & Pick<GandhaSourceCompatibility, "format">): GandhaSourceCompatibility {
  return {
    vendor: "Bosch Sensortec",
    format: input.format,
    sourceFileName: input.sourceFileName ?? null,
    appVersion: input.appVersion ?? null,
    boardType: input.boardType ?? null,
    boardId: input.boardId ?? null,
    firmwareVersion: input.firmwareVersion ?? null,
    heaterProfileIds: input.heaterProfileIds ?? [],
    dutyCycleProfileIds: input.dutyCycleProfileIds ?? [],
    skippedErrorRows: input.skippedErrorRows ?? 0,
    droppedIncompleteCycles: input.droppedIncompleteCycles ?? 0,
  }
}

function finalizeCycles(args: {
  cycles: CycleAccumulator[]
  datasetId: string
  createdAt: string
  deviceId: string | null
  sensorFamily: string
  compatibility: GandhaSourceCompatibility
  expectedSteps: (sensorIndex: string) => number
}): GandhaValidationResult<GandhaDataset> {
  let droppedIncompleteCycles = 0
  const complete = args.cycles.filter((cycle) => {
    const expected = args.expectedSteps(cycle.sensorIndex)
    const steps = [...cycle.gasByStep.keys()].sort((left, right) => left - right)
    const valid = cycle.observedAt !== null && steps.length === expected && steps.every((step, index) => step === index)
    if (!valid) droppedIncompleteCycles += 1
    return valid
  })
  if (!complete.length) return { ok: false, value: null, issues: ["No complete, timestamped Bosch scanning cycles were available after error and completeness checks."] }
  const maximumStep = Math.max(...complete.flatMap((cycle) => [...cycle.gasByStep.keys()]))
  const channelUnits = Object.fromEntries(Array.from({ length: maximumStep + 1 }, (_, step) => [`gas_resistance_step_${step}`, "Ohms"]))
  const dataset: GandhaDataset = {
    schema: GANDHA_DATASET_SCHEMA,
    datasetId: args.datasetId,
    createdAt: args.createdAt,
    sensor: { family: args.sensorFamily, deviceId: args.deviceId, firmwareVersion: args.compatibility.firmwareVersion },
    channelUnits,
    samples: complete.map((cycle) => ({
      sampleId: `bosch-${cycle.sensorIndex}-${cycle.cycleIndex}`,
      observedAt: cycle.observedAt!,
      channels: Object.fromEntries([...cycle.gasByStep.entries()].sort(([left], [right]) => left - right).map(([step, value]) => [`gas_resistance_step_${step}`, value])),
      label: cycle.label,
      temperatureC: mean(cycle.temperatures),
      humidityPct: mean(cycle.humidity),
      pressureHpa: mean(cycle.pressure),
    })),
    provenance: {
      source: "file_import",
      notes: `Imported from Bosch ${args.compatibility.format}; ${args.compatibility.skippedErrorRows} error-marked rows and ${droppedIncompleteCycles} incomplete cycles were excluded.`,
    },
    sourceCompatibility: { ...args.compatibility, droppedIncompleteCycles },
  }
  return validateGandhaDataset(dataset)
}

function parseRaw(input: Row, sourceFileName: string | null): GandhaValidationResult<GandhaDataset> {
  const configHeader = record(input.configHeader) ? input.configHeader : null
  const configBody = record(input.configBody) ? input.configBody : null
  const rawHeader = record(input.rawDataHeader) ? input.rawDataHeader : null
  const rawBody = record(input.rawDataBody) ? input.rawDataBody : null
  if (!configHeader || !configBody || !rawHeader || !rawBody) return { ok: false, value: null, issues: ["Bosch raw data requires configHeader, configBody, rawDataHeader, and rawDataBody."] }
  const columns = columnMap(rawBody.dataColumns)
  const required = ["sensor_index", "real_time_clock", "temperature", "pressure", "relative_humidity", "resistance_gassensor", "heater_profile_step_index", "scanning_cycle_index", "error_code"]
  const missing = required.filter((key) => !columns.has(key))
  if (missing.length) return { ok: false, value: null, issues: [`Bosch raw data is missing columns: ${missing.join(", ")}.`] }

  const configurations = rows(configBody.sensorConfigurations)
  const heaterProfiles = rows(configBody.heaterProfiles)
  const expectedBySensor = new Map<string, number>()
  for (const configuration of configurations) {
    const sensorIndex = finite(configuration.sensorIndex)
    const profileId = text(configuration.heaterProfile)
    const profile = heaterProfiles.find((item) => text(item.id) === profileId)
    const vectors = profile && Array.isArray(profile.temperatureTimeVectors) ? profile.temperatureTimeVectors : null
    if (sensorIndex !== null && vectors?.length) expectedBySensor.set(String(sensorIndex), vectors.length)
  }

  const cycleMap = new Map<string, CycleAccumulator>()
  let skippedErrorRows = 0
  for (const rawRow of Array.isArray(rawBody.dataBlock) ? rawBody.dataBlock : []) {
    if (!Array.isArray(rawRow)) continue
    const errorCode = finite(valueAt(rawRow, columns, "error_code"))
    if (errorCode !== 0) { skippedErrorRows += 1; continue }
    const sensor = finite(valueAt(rawRow, columns, "sensor_index"))
    const cycle = finite(valueAt(rawRow, columns, "scanning_cycle_index"))
    const step = finite(valueAt(rawRow, columns, "heater_profile_step_index"))
    const gas = finite(valueAt(rawRow, columns, "resistance_gassensor"))
    if (sensor === null || cycle === null || step === null || gas === null || !Number.isInteger(step) || step < 0) continue
    const key = `${sensor}:${cycle}`
    const accumulator: CycleAccumulator = cycleMap.get(key) ?? { sensorIndex: String(sensor), cycleIndex: String(cycle), observedAt: null, gasByStep: new Map(), temperatures: [], humidity: [], pressure: [], label: null }
    accumulator.observedAt ??= epochSeconds(valueAt(rawRow, columns, "real_time_clock"))
    accumulator.gasByStep.set(step, gas)
    const temperature = finite(valueAt(rawRow, columns, "temperature")); if (temperature !== null) accumulator.temperatures.push(temperature)
    const humidity = finite(valueAt(rawRow, columns, "relative_humidity")); if (humidity !== null) accumulator.humidity.push(humidity)
    const pressure = finite(valueAt(rawRow, columns, "pressure")); if (pressure !== null) accumulator.pressure.push(pressure)
    cycleMap.set(key, accumulator)
  }

  const compatibility = makeCompatibility({
    format: "bosch-bmerawdata",
    sourceFileName,
    appVersion: text(configHeader.appVersion),
    boardType: text(configHeader.boardType),
    boardId: text(rawHeader.boardId),
    firmwareVersion: text(rawHeader.firmwareVersion),
    heaterProfileIds: idList(configBody.heaterProfiles),
    dutyCycleProfileIds: idList(configBody.dutyCycleProfiles),
    skippedErrorRows,
  })
  const createdAt = timestamp(rawHeader.dateCreated_ISO) ?? timestamp(configHeader.dateCreated_ISO)
  if (!createdAt) return { ok: false, value: null, issues: ["Bosch raw data has no valid creation timestamp."] }
  return finalizeCycles({ cycles: [...cycleMap.values()], datasetId: `bosch-raw-${text(rawHeader.seedPowerOnOff) ?? text(rawHeader.boardId) ?? "session"}`, createdAt, deviceId: text(rawHeader.boardId), sensorFamily: "Bosch BME68x", compatibility, expectedSteps: (sensor) => expectedBySensor.get(sensor) ?? 10 })
}

function parseSpecimen(input: Row, sourceFileName: string | null): GandhaValidationResult<GandhaDataset> {
  const meta = record(input.meta) ? input.meta : null
  const data = record(input.data) ? input.data : null
  if (!meta || !data) return { ok: false, value: null, issues: ["Bosch specimen data requires meta and data objects."] }
  const columns = columnMap(data.dataColumns)
  const required = ["resistance_gassensor", "temperature", "pressure", "relative_humidity", "real_time_clock", "error_code", "cycle_step_index", "cycle_id"]
  const missing = required.filter((key) => !columns.has(key))
  if (missing.length) return { ok: false, value: null, issues: [`Bosch specimen data is missing columns: ${missing.join(", ")}.`] }
  const specimen = Array.isArray(data.specimenData) ? rows(data.specimenData)[0] : (record(data.specimenData) ? data.specimenData : null)
  const labelValue = specimen?.label
  const label = text(labelValue) ?? (record(labelValue) ? text(labelValue.name) : null)
  const cycleDefinitions = rows(data.cycles)
  const sensors = rows(data.sensors)
  const cycleById = new Map(cycleDefinitions.map((cycle) => [String(finite(cycle.id) ?? text(cycle.id)), cycle]))
  const sensorById = new Map(sensors.map((sensor) => [String(finite(sensor.id) ?? text(sensor.id)), sensor]))
  const cycleMap = new Map<string, CycleAccumulator>()
  let skippedErrorRows = 0
  for (const specimenRow of Array.isArray(data.specimenDataPoints) ? data.specimenDataPoints : []) {
    if (!Array.isArray(specimenRow)) continue
    const errorCode = finite(valueAt(specimenRow, columns, "error_code"))
    if (errorCode !== 0) { skippedErrorRows += 1; continue }
    const cycleIdValue = finite(valueAt(specimenRow, columns, "cycle_id"))
    const step = finite(valueAt(specimenRow, columns, "cycle_step_index"))
    const gas = finite(valueAt(specimenRow, columns, "resistance_gassensor"))
    if (cycleIdValue === null || step === null || gas === null || !Number.isInteger(step) || step < 0) continue
    const cycleId = String(cycleIdValue)
    const definition = cycleById.get(cycleId)
    if (definition?.dropped === true) continue
    const sensor = definition ? sensorById.get(String(finite(definition.sensorId) ?? text(definition.sensorId))) : null
    const sensorIndex = String(finite(sensor?.index) ?? text(sensor?.index) ?? "unknown")
    const key = `${sensorIndex}:${cycleId}`
    const accumulator: CycleAccumulator = cycleMap.get(key) ?? { sensorIndex, cycleIndex: cycleId, observedAt: null, gasByStep: new Map(), temperatures: [], humidity: [], pressure: [], label }
    accumulator.observedAt ??= epochSeconds(valueAt(specimenRow, columns, "real_time_clock"))
    accumulator.gasByStep.set(step, gas)
    const temperature = finite(valueAt(specimenRow, columns, "temperature")); if (temperature !== null) accumulator.temperatures.push(temperature)
    const humidity = finite(valueAt(specimenRow, columns, "relative_humidity")); if (humidity !== null) accumulator.humidity.push(humidity)
    const pressure = finite(valueAt(specimenRow, columns, "pressure")); if (pressure !== null) accumulator.pressure.push(pressure)
    cycleMap.set(key, accumulator)
  }
  const boardType = rows(data.boardType)[0] ?? (record(data.boardType) ? data.boardType : null)
  const session = rows(data.measurementSession)[0] ?? (record(data.measurementSession) ? data.measurementSession : null)
  const compatibility = makeCompatibility({ format: "bosch-bmespecimen", sourceFileName, appVersion: text(meta.appVersion), boardType: text(boardType?.name) ?? text(boardType?.type), boardId: text(session?.boardId), firmwareVersion: text(session?.firmwareVersion), heaterProfileIds: idList(data.heaterProfiles), dutyCycleProfileIds: idList(data.dutyCycleProfiles), skippedErrorRows })
  const createdAt = timestamp(meta.exportedAt) ?? timestamp(specimen?.createdAt)
  if (!createdAt) return { ok: false, value: null, issues: ["Bosch specimen data has no valid export or creation timestamp."] }
  const specimenId = text(specimen?.uuid) ?? (finite(specimen?.id) === null ? null : String(finite(specimen?.id))) ?? "specimen"
  return finalizeCycles({ cycles: [...cycleMap.values()], datasetId: `bosch-specimen-${specimenId}`, createdAt, deviceId: text(session?.boardId), sensorFamily: "Bosch BME68x", compatibility, expectedSteps: () => 10 })
}

export function importGandhaDataset(input: unknown, sourceFileName: string | null = null): GandhaValidationResult<GandhaDataset> {
  if (!record(input)) return { ok: false, value: null, issues: ["Dataset root must be an object."] }
  if (input.schema === GANDHA_DATASET_SCHEMA) return validateGandhaDataset(input)
  if (record(input.rawDataBody) || record(input.rawDataHeader)) return parseRaw(input, sourceFileName)
  if (record(input.meta) && record(input.data)) return parseSpecimen(input, sourceFileName)
  return { ok: false, value: null, issues: ["Unsupported dataset. Use GANDHA JSON, Bosch .bmerawdata, or Bosch .bmespecimen JSON."] }
}
