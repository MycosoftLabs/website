import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

async function loadTsModule(relativePath) {
  const url = new URL(relativePath, import.meta.url)
  const source = await readFile(url, "utf8")
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`)
}

const contracts = await loadTsModule("../contracts.ts")

const valid = {
  schema: "mycosoft.sine.replay.v1",
  evidenceId: "acoustic-001",
  observedAt: "2026-09-01T12:00:00Z",
  deviceId: "hyphae-1",
  sensorId: "mic-1",
  sampleRateHz: 4,
  unit: "Pa",
  samples: [0, 0.5, -0.5, 0],
  provenance: { sourceId: "operator-file", notes: "bench capture" },
}

test("validates bounded replay evidence and builds timestamped samples", () => {
  const result = contracts.validateSineReplayEvidence(valid)
  assert.equal(result.ok, true)
  const samples = contracts.sineReplaySamples(result.value)
  assert.equal(samples.length, 4)
  assert.equal(samples[1].timestamp - samples[0].timestamp, 250)
  assert.equal(contracts.sineReplayProvenance(result.value).mode, "REPLAY")
})

test("rejects invalid provenance, non-finite values, and oversized arrays", () => {
  const invalid = contracts.validateSineReplayEvidence({ ...valid, provenance: {}, samples: [0, Number.NaN] })
  assert.equal(invalid.ok, false)
  assert.match(invalid.issues.join(" "), /sourceId/)
  assert.match(invalid.issues.join(" "), /finite/)
  const oversized = contracts.validateSineReplayEvidence({ ...valid, samples: Array.from({ length: 16_385 }, () => 0) })
  assert.equal(oversized.ok, false)
  assert.match(oversized.issues.join(" "), /16384/)
})
