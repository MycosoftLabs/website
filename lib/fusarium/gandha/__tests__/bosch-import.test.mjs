import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(here, "..")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-bosch-import-"))
const contractsSource = readFileSync(join(sourceDir, "contracts.ts"), "utf8")
const importerSource = readFileSync(join(sourceDir, "bosch-import.ts"), "utf8")
writeFileSync(join(compiledDir, "contracts.mjs"), ts.transpileModule(contractsSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
writeFileSync(join(compiledDir, "bosch-import.mjs"), ts.transpileModule(importerSource.replace('from "./contracts"', 'from "./contracts.mjs"'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const importer = await import(pathToFileURL(join(compiledDir, "bosch-import.mjs")).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const rawColumns = ["sensor_index", "sensor_id", "timestamp_since_poweron", "real_time_clock", "temperature", "pressure", "relative_humidity", "resistance_gassensor", "heater_profile_step_index", "scanning_enabled", "scanning_cycle_index", "label_tag", "error_code"].map((key, index) => ({ key, colId: index + 1 }))
function rawFile() {
  const dataBlock = Array.from({ length: 10 }, (_, step) => [0, 10, step * 140, 1788292800 + step, 24 + step / 10, 1012, 45, 1000 - step * 20, step, true, 1, 0, 0])
  return { configHeader: { dateCreated_ISO: "2026-09-01T20:00:00Z", appVersion: "3.2.0", boardType: "board_8" }, configBody: { heaterProfiles: [{ id: "heater_1", timeBase: 140, temperatureTimeVectors: Array.from({ length: 10 }, (_, step) => [100 + step * 20, 1]) }], dutyCycleProfiles: [{ id: "duty_1" }], sensorConfigurations: [{ sensorIndex: 0, heaterProfile: "heater_1", dutyCycleProfile: "duty_1" }] }, rawDataHeader: { seedPowerOnOff: "session-1", dateCreated_ISO: "2026-09-01T20:00:00Z", firmwareVersion: "3.1.3", boardId: "board-1" }, rawDataBody: { dataColumns: rawColumns, dataBlock } }
}

test("imports complete Bosch raw heater cycles without inventing labels", () => {
  const result = importer.importGandhaDataset(rawFile(), "capture.bmerawdata")
  assert.equal(result.ok, true)
  assert.equal(result.value.samples.length, 1)
  assert.equal(Object.keys(result.value.samples[0].channels).length, 10)
  assert.equal(result.value.samples[0].label, null)
  assert.equal(result.value.sourceCompatibility.format, "bosch-bmerawdata")
  assert.deepEqual(result.value.sourceCompatibility.heaterProfileIds, ["heater_1"])
})

test("drops error-marked and incomplete Bosch raw cycles rather than padding them", () => {
  const value = rawFile()
  value.rawDataBody.dataBlock[3][12] = 2
  const result = importer.importGandhaDataset(value, "capture.bmerawdata")
  assert.equal(result.ok, false)
  assert.match(result.issues.join(" "), /No complete/)
})

test("imports a documented Bosch specimen cycle and preserves its operator label", () => {
  const dataColumns = ["data_point_id", "resistance_gassensor", "temperature", "pressure", "relative_humidity", "timestamp_since_poweron", "real_time_clock", "error_code", "cycle_step_index", "cycle_id"].map((key) => ({ key }))
  const specimenDataPoints = Array.from({ length: 10 }, (_, step) => [100 + step, 900 - step * 20, 25, 1011, 42, step * 140, 1788292800 + step, 0, step, 4352])
  const file = {
    meta: { appVersion: "3.2.0", exportedAt: "2026-09-01T20:10:00Z" },
    data: {
      specimenData: { id: 2, uuid: "specimen-2", label: "agaricon vapor", createdAt: "2026-09-01T20:05:00Z" },
      measurementSession: { boardId: "board-2", firmwareVersion: "3.1.3" },
      boardType: { name: "board_8" },
      heaterProfiles: [{ id: 6 }],
      dutyCycleProfiles: [{ id: 1 }],
      sensors: [{ id: 17, index: 0 }],
      cycles: [{ id: 4352, sensorId: 17, dropped: false }],
      dataColumns,
      specimenDataPoints,
    },
  }
  const result = importer.importGandhaDataset(file, "agaricon_2.bmespecimen")
  assert.equal(result.ok, true)
  assert.equal(result.value.samples[0].label, "agaricon vapor")
  assert.equal(result.value.samples[0].channels.gas_resistance_step_9, 720)
  assert.equal(result.value.sourceCompatibility.format, "bosch-bmespecimen")
})

test("rejects unknown files and has no connector or random-data seam", () => {
  assert.equal(importer.importGandhaDataset({ hello: "world" }, "unknown.json").ok, false)
  assert.doesNotMatch(importerSource, /Math\.random\s*\(/)
  assert.doesNotMatch(importerSource, /\bfetch\s*\(/)
  assert.doesNotMatch(importerSource, /process\.env/)
})
