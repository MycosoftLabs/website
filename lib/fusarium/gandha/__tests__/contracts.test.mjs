import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-gandha-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const gandha = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

function dataset() {
  return {
    schema: "mycosoft.gandha.dataset.v1",
    datasetId: "bench-run-01",
    createdAt: "2026-09-01T20:00:00.000Z",
    sensor: { family: "BME688", deviceId: "bench-1", firmwareVersion: "1.0" },
    channelUnits: { gas_resistance: "ohm", voc_index: "index" },
    samples: [
      {
        sampleId: "sample-1",
        observedAt: "2026-09-01T20:00:01.000Z",
        channels: { gas_resistance: 1200, voc_index: 8 },
        label: null,
        temperatureC: 22,
        humidityPct: 44,
        pressureHpa: 1012,
      },
    ],
    provenance: { source: "file_import", notes: "Controlled bench capture." },
  }
}

test("validates a versioned, finite, provenance-bearing sensor dataset", () => {
  const result = gandha.validateGandhaDataset(dataset())
  assert.equal(result.ok, true)
  assert.equal(result.value.samples.length, 1)
  assert.equal(result.value.samples[0].channels.gas_resistance, 1200)
  assert.equal(gandha.summarizeGandhaDataset(result.value).unlabeledCount, 1)
})

test("rejects fabricated-looking malformed rows instead of coercing values", () => {
  const invalid = dataset()
  invalid.samples[0].channels.voc_index = Number.NaN
  invalid.samples[0].humidityPct = 140
  const result = gandha.validateGandhaDataset(invalid)
  assert.equal(result.ok, false)
  assert.match(result.issues.join(" "), /finite/)
  assert.match(result.issues.join(" "), /between 0 and 100/)
})

test("stages labels locally while training remains gated without a provider", () => {
  const parsed = gandha.validateGandhaDataset(dataset())
  assert.equal(parsed.ok, true)
  const labeled = gandha.stageGandhaLabel(parsed.value, "sample-1", "clean substrate")
  assert.equal(labeled.ok, true)
  assert.equal(labeled.value.samples[0].label, "clean substrate")
  assert.deepEqual(gandha.trainingReadiness(labeled.value, false), {
    canSubmit: false,
    reasons: ["Bind an approved training provider."],
  })
  assert.equal(gandha.unboundTrainingJob(labeled.value.datasetId).jobId, null)
})

test("withholds inference without verified model provenance", () => {
  assert.equal(gandha.parseInferenceEvidence({ prediction: "smoke", confidence: 0.9 }).state, "error")
  const verified = gandha.parseInferenceEvidence({
    prediction: "clean substrate",
    confidence: 0.91,
    inferredAt: "2026-09-01T20:01:00.000Z",
    model: {
      modelId: "gandha-bench",
      version: "1",
      algorithm: "random-forest",
      trainedAt: "2026-09-01T19:00:00.000Z",
      datasetId: "bench-run-01",
      featureContract: "mycosoft.gandha.features.v1",
      artifactSha256: "a".repeat(64),
      registryVerified: true,
    },
  })
  assert.equal(verified.state, "verified")
  assert.equal(verified.confidence, 0.91)
})

test("contract source has no generated data, connector, or credential seam", () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/)
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /process\.env/)
})

test("trains a deterministic local centroid model from labeled real samples", () => {
  const value = dataset()
  value.samples = [
    { ...value.samples[0], sampleId: "clean-1", channels: { gas_resistance: 1200, voc_index: 8 }, label: "clean" },
    { ...value.samples[0], sampleId: "clean-2", channels: { gas_resistance: 1250, voc_index: 9 }, label: "clean" },
    { ...value.samples[0], sampleId: "smoke-1", channels: { gas_resistance: 500, voc_index: 80 }, label: "smoke" },
    { ...value.samples[0], sampleId: "smoke-2", channels: { gas_resistance: 540, voc_index: 76 }, label: "smoke" },
    { ...value.samples[0], sampleId: "unknown-1", channels: { gas_resistance: 520, voc_index: 78 }, label: null },
  ]
  const parsed = gandha.validateGandhaDataset(value)
  assert.equal(parsed.ok, true)
  assert.deepEqual(gandha.localModelReadiness(parsed.value), { canTrain: true, reasons: [] })
  const trained = gandha.trainLocalCentroidModel(parsed.value, "2026-09-01T20:02:00Z")
  assert.equal(trained.ok, true)
  assert.equal(trained.value.provenance.localOnly, true)
  assert.equal(trained.value.provenance.registryVerified, false)
  const prediction = gandha.predictWithLocalCentroid(trained.value, parsed.value.samples[4])
  assert.equal(prediction.ok, true)
  assert.equal(prediction.value.label, "smoke")
  assert.equal(prediction.value.seenDuringTraining, false)
  assert.ok(prediction.value.relativeSeparation > 0)
})

test("local model readiness requires class replication and consistent channels", () => {
  const parsed = gandha.validateGandhaDataset(dataset())
  assert.equal(parsed.ok, true)
  const readiness = gandha.localModelReadiness({ ...parsed.value, samples: [{ ...parsed.value.samples[0], label: "clean" }] })
  assert.equal(readiness.canTrain, false)
  assert.match(readiness.reasons.join(" "), /four samples|two distinct labels|two labeled samples per class/)
})

test("missing GANDHA channels stay missing and operational states stay separate", () => {
  assert.deepEqual(gandha.gandhaChannelPresence({ gas_resistance: 12 }, "voc_index"), { state: "missing", value: null })
  assert.deepEqual(gandha.gandhaChannelPresence({ voc_index: 8 }, "voc_index"), { state: "measured", value: 8 })
  assert.equal(gandha.classifyGandhaOperationalState({ training: true }), "training")
  assert.equal(gandha.classifyGandhaOperationalState({ exportedConfig: true }), "exported_config")
  assert.equal(gandha.classifyGandhaOperationalState({ deviceDeployed: true }), "device_deployment")
  assert.equal(gandha.classifyGandhaOperationalState({ liveInference: true, verifiedModel: true, deviceDeployed: true }), "live_inference")
  assert.equal(gandha.classifyGandhaOperationalState({}), "unbound")
})
