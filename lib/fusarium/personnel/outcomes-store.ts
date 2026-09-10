import { randomUUID } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import type { InferenceRecord, SurveyRecord, TelemetryRecord } from "./types"

export interface MeasurementStore {
  schema_version: "1.1.0"
  surveys: SurveyRecord[]
  telemetry: TelemetryRecord[]
  inferences: InferenceRecord[]
}

const EMPTY_STORE: MeasurementStore = {
  schema_version: "1.1.0",
  surveys: [],
  telemetry: [],
  inferences: [],
}

function storePath() {
  return path.join(process.cwd(), "data", "fusarium-personnel", "measurement-store.json")
}

export async function readMeasurementStore(): Promise<MeasurementStore> {
  try {
    const raw = await readFile(storePath(), "utf8")
    const parsed = JSON.parse(raw) as MeasurementStore
    return {
      schema_version: "1.1.0",
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
      telemetry: Array.isArray(parsed.telemetry) ? parsed.telemetry : [],
      inferences: Array.isArray(parsed.inferences) ? parsed.inferences : [],
    }
  } catch {
    return { ...EMPTY_STORE, surveys: [], telemetry: [], inferences: [] }
  }
}

async function writeMeasurementStore(store: MeasurementStore): Promise<void> {
  const dest = storePath()
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, `${JSON.stringify(store, null, 2)}\n`, "utf8")
}

export async function appendSurvey(record: Omit<SurveyRecord, "id" | "submitted_at" | "source_class">): Promise<SurveyRecord> {
  const store = await readMeasurementStore()
  const row: SurveyRecord = {
    ...record,
    id: randomUUID(),
    submitted_at: new Date().toISOString(),
    source_class: "survey",
  }
  store.surveys.push(row)
  await writeMeasurementStore(store)
  return row
}

export async function appendTelemetry(record: Omit<TelemetryRecord, "id" | "recorded_at" | "source_class">): Promise<TelemetryRecord> {
  const store = await readMeasurementStore()
  const row: TelemetryRecord = {
    ...record,
    id: randomUUID(),
    recorded_at: new Date().toISOString(),
    source_class: "telemetry",
  }
  store.telemetry.push(row)
  await writeMeasurementStore(store)
  return row
}

export async function appendInference(record: Omit<InferenceRecord, "id" | "created_at" | "source_class" | "fatality_reduction_claimed">): Promise<InferenceRecord> {
  const store = await readMeasurementStore()
  const row: InferenceRecord = {
    ...record,
    id: randomUUID(),
    created_at: new Date().toISOString(),
    source_class: "inferred",
    fatality_reduction_claimed: false,
  }
  store.inferences.push(row)
  await writeMeasurementStore(store)
  return row
}
