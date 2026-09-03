import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-thermal-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const thermal = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const sequence = () => ({ schema: "mycosoft.thermal.sequence.v1", sequenceId: "thermal-1", sensorFamily: "radiometric-array", deviceId: "sensor-1", calibrated: true, provenance: { source: "file_import", notes: "bench capture" }, frames: [{ frameId: "a", observedAt: "2026-09-01T20:00:00Z", width: 2, height: 2, temperaturesC: [10, 20, 30, 40], emissivity: .95, ambientC: 22 }, { frameId: "b", observedAt: "2026-09-01T20:00:01Z", width: 2, height: 2, temperaturesC: [11, 18, 35, 42], emissivity: .95, ambientC: 22 }] })

test("validates and summarizes a calibrated radiometric sequence", () => { const parsed = thermal.validateThermalSequence(sequence()); assert.equal(parsed.ok, true); assert.deepEqual(thermal.summarizeThermalFrame(parsed.value.frames[0]), { frameId: "a", observedAt: "2026-09-01T20:00:00Z", minimumC: 10, maximumC: 40, averageC: 25, rangeC: 30, hottestPixel: 3, coldestPixel: 0 }) })
test("computes frame differences without generating values", () => { const parsed = thermal.validateThermalSequence(sequence()); assert.equal(parsed.ok, true); assert.deepEqual(thermal.thermalDifference(parsed.value.frames[1], parsed.value.frames[0]), [1, -2, 5, 2]) })
test("summarizes sequence timing and produces supplied-data temperature trends", () => { const parsed = thermal.validateThermalSequence(sequence()); assert.equal(parsed.ok, true); assert.deepEqual(thermal.summarizeThermalSequence(parsed.value), { frameCount: 2, durationMs: 1000, medianIntervalMs: 1000, minimumC: 10, maximumC: 42, meanC: 25.75, calibrated: true }); assert.deepEqual(thermal.thermalTrend(parsed.value), [{ frameId: "a", observedAt: "2026-09-01T20:00:00Z", minimumC: 10, averageC: 25, maximumC: 40 }, { frameId: "b", observedAt: "2026-09-01T20:00:01Z", minimumC: 11, averageC: 26.5, maximumC: 42 }]) })
test("rejects malformed dimensions and non-finite temperatures", () => { const value = sequence(); value.frames[0].temperaturesC = [10, Number.NaN]; const parsed = thermal.validateThermalSequence(value); assert.equal(parsed.ok, false); assert.match(parsed.issues.join(" "), /length must equal|finite/) })
test("contract has no connector, credential, or random-data seam", () => { assert.doesNotMatch(source, /Math\.random\s*\(/); assert.doesNotMatch(source, /\bfetch\s*\(/); assert.doesNotMatch(source, /process\.env/) })

function frame(overrides = {}) {
  return { frameId: "bound", observedAt: "2026-09-02T18:00:00Z", width: 2, height: 2, temperaturesC: [10, 20, 30, 40], emissivity: .95, ambientC: 22, ...overrides }
}

test("accepts the maximum width and height and rejects the first out-of-bound sizes", () => {
  const maxWidth = { ...sequence(), frames: [frame({ width: 512, height: 1, temperaturesC: Array.from({ length: 512 }, () => 21) })] }
  const maxHeight = { ...sequence(), frames: [frame({ width: 1, height: 512, temperaturesC: Array.from({ length: 512 }, () => 21) })] }
  assert.equal(thermal.validateThermalSequence(maxWidth).ok, true)
  assert.equal(thermal.validateThermalSequence(maxHeight).ok, true)
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ width: 513, height: 1, temperaturesC: Array.from({ length: 513 }, () => 21) })] }).ok, false)
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ width: 1, height: 513, temperaturesC: Array.from({ length: 513 }, () => 21) })] }).ok, false)
})

test("rejects out-of-range temperatures, reversed times, and invalid observation times", () => {
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ temperaturesC: [-80, 400, 21, 22] })] }).ok, true)
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ temperaturesC: [-80.01, 20, 30, 40] })] }).ok, false)
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ temperaturesC: [10, 20, 30, 400.01] })] }).ok, false)
  const reversed = sequence()
  reversed.frames[1].observedAt = "2026-09-01T19:59:59Z"
  assert.equal(thermal.validateThermalSequence(reversed).ok, false)
  assert.equal(thermal.validateThermalSequence({ ...sequence(), frames: [frame({ observedAt: "not-a-time" })] }).ok, false)
})

test("live, stale, replay, and unavailable thermal states stay distinct", () => {
  assert.equal(thermal.classifyThermalObservationState({ provenanceSource: "local_capture", observedAt: "2026-09-02T18:00:00.000Z", evaluatedAt: "2026-09-02T18:01:00.000Z" }), "live")
  assert.equal(thermal.classifyThermalObservationState({ provenanceSource: "local_capture", observedAt: "2026-09-02T17:00:00.000Z", evaluatedAt: "2026-09-02T18:01:00.000Z" }), "stale")
  assert.equal(thermal.classifyThermalObservationState({ provenanceSource: "file_import", observedAt: "2026-09-02T18:00:00.000Z", evaluatedAt: "2026-09-02T18:01:00.000Z" }), "replay")
  assert.equal(thermal.classifyThermalObservationState({ provenanceSource: null, observedAt: null, evaluatedAt: "2026-09-02T18:01:00.000Z" }), "unavailable")
})
