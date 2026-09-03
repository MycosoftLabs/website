import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-bluesight-evidence-"))
const compiled = join(compiledDir, "contracts.mjs")
writeFileSync(compiled, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const contract = await import(pathToFileURL(compiled).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

function record(modality, overrides = {}) {
  return {
    recordId: `${modality}-1`, modality,
    scope: { deviceId: "device-a", missionId: "mission-a", locationId: "site-a", environmentId: "forest-a" },
    observedAt: "2026-09-01T12:00:00.000Z", receivedAt: "2026-09-01T12:00:01.000Z",
    measurements: [{ name: modality === "camera" ? "frame_ref" : "range", value: modality === "camera" ? "sha256:fixture" : 12.4, unit: modality === "camera" ? "uri" : "m" }],
    provenance: { sourceRef: `file:${modality}`, sourceRecordId: `${modality}-source-1`, sourceRevision: "capture-v1", collectionId: "collection-a", deviceIdentityField: "device_id", observedAtField: "observed_at" },
    confidence: { value: null, basis: "Source did not report confidence." },
    uncertainty: { value: null, unit: null, basis: "Source did not report uncertainty." },
    classification: "UNCLASSIFIED",
    ...overrides,
  }
}

function dataset(records) {
  return { schema: "fusarium-bluesight-evidence/v1", mode: "REPLAY", datasetId: "dataset-a", title: "Local replay evidence", records }
}

test("accepts normalized camera, radar, lidar, and passive Wi-Fi replay records", () => {
  const result = contract.validateBlueSightEvidence(dataset(["camera", "radar", "lidar", "wifi"].map((modality) => record(modality))))
  assert.equal(result.ok, true)
  assert.equal(result.state, "available")
  assert.deepEqual(result.dataset.records.map((item) => item.modality), ["camera", "radar", "lidar", "wifi"])
  assert.equal(result.fusionFrames.length, 1)
  assert.deepEqual(result.fusionFrames[0].modalities, ["camera", "lidar", "radar", "wifi"])
  assert.match(result.fusionFrames[0].statement, /not an inferred track or detection/i)
})

test("does not fuse records when timestamp, scope, collection, or revision differs", () => {
  const records = [
    record("camera"),
    record("radar", { observedAt: "2026-09-01T12:00:00.001Z" }),
    record("lidar", { scope: { deviceId: "device-b", missionId: "mission-a", locationId: "site-a", environmentId: "forest-a" } }),
    record("wifi", { provenance: { ...record("wifi").provenance, collectionId: "collection-b" } }),
  ]
  const result = contract.validateBlueSightEvidence(dataset(records))
  assert.equal(result.ok, true)
  assert.deepEqual(result.fusionFrames, [])
})

test("rejects the entire import on missing units, timestamps, provenance, or non-UNCLASSIFIED data", () => {
  const invalid = record("radar", { receivedAt: "not-a-time", classification: "CUI", measurements: [{ name: "range", value: 2, unit: "" }], provenance: { sourceRef: "", sourceRecordId: "x", sourceRevision: "x", collectionId: "x", deviceIdentityField: "x", observedAtField: "x" } })
  const result = contract.validateBlueSightEvidence(dataset([record("camera"), invalid]))
  assert.equal(result.ok, false)
  assert.equal(result.dataset, null)
  assert.equal(result.state, "error")
  assert.match(result.message, /entire import was rejected/i)
  assert.ok(result.issues.some((issue) => /classification/.test(issue)))
})

test("keeps a valid empty replay distinct from an error", () => {
  const result = contract.validateBlueSightEvidence(dataset([]))
  assert.equal(result.ok, true)
  assert.equal(result.state, "verified-empty")
  assert.deepEqual(result.dataset.records, [])
})

test("deduplicates only identical device, modality, source, and source record identity", () => {
  const first = record("camera")
  const result = contract.validateBlueSightEvidence(dataset([first, { ...first, recordId: "camera-copy" }]))
  assert.equal(result.ok, true)
  assert.equal(result.duplicateRecordCount, 1)
  assert.equal(result.dataset.records.length, 1)
})

test("selection changes drop the previous device and source revision", () => {
  const accepted = contract.validateBlueSightEvidence(dataset([
    record("camera"),
    record("radar", { recordId: "radar-other", scope: { deviceId: "device-b", missionId: "mission-a", locationId: "site-a", environmentId: "forest-a" } }),
    record("lidar", { recordId: "lidar-old-rev", provenance: { ...record("lidar").provenance, sourceRevision: "capture-v0" } }),
  ]))
  assert.equal(accepted.ok, true)
  const isolated = contract.isolateBlueSightSelection(accepted.dataset, { deviceId: "device-a", sourceRevision: "capture-v1" })
  assert.deepEqual(isolated.records.map((item) => item.recordId), ["camera-1"])
  assert.equal(isolated.records.some((item) => item.scope.deviceId === "device-b"), false)
  assert.equal(isolated.records.some((item) => item.provenance.sourceRevision === "capture-v0"), false)
})

