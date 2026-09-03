import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(here, "..")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-sensing-foundation-"))

function compile(name) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const path = join(compiledDir, `${name}.mjs`)
  writeFileSync(path, output)
  return { source, path }
}

const compiledContracts = compile("contracts")
const compiledMatrix = compile("reuse-matrix")
const contracts = await import(pathToFileURL(compiledContracts.path).href)
const matrix = await import(pathToFileURL(compiledMatrix.path).href)

after(() => rmSync(compiledDir, { recursive: true, force: true }))

test("unbound is distinct from a completed empty read", () => {
  const unbound = contracts.unboundSensingRead("spores", "No approved spore adapter is bound.")
  const empty = contracts.emptySensingRead({
    sourceId: "spores",
    provider: "mindex.observations",
    endpointRef: "/api/natureos/aerosol/spores",
    completedAt: "2026-09-01T20:00:00.000Z",
    upstreamStatus: 200,
    reason: "The successful query returned no source observations in the requested window.",
  })

  assert.equal(unbound.schema, "fusarium-sensing-read/v1")
  assert.equal(unbound.classification, "UNCLASSIFIED")
  assert.equal(unbound.state, "unbound")
  assert.equal(unbound.bound, false)
  assert.equal(unbound.dataPresence, "unknown")
  assert.equal(unbound.query.attempted, false)
  assert.equal(unbound.freshness.state, "unavailable")
  assert.deepEqual(unbound.records, [])

  assert.equal(empty.classification, "UNCLASSIFIED")
  assert.equal(empty.state, "empty")
  assert.equal(empty.bound, true)
  assert.equal(empty.dataPresence, "empty")
  assert.equal(empty.query.completed, true)
  assert.equal(empty.query.upstreamStatus, 200)
  assert.equal(empty.provenance.synthetic, false)
  assert.deepEqual(empty.records, [])
})

test("empty cannot be asserted from a failed upstream read", () => {
  assert.throws(
    () => contracts.emptySensingRead({
      sourceId: "air-quality",
      provider: "airnow",
      endpointRef: "/api/crep/airnow/current",
      completedAt: "2026-09-01T20:00:00.000Z",
      upstreamStatus: 503,
      reason: "No records.",
    }),
    /successful 2xx read/,
  )
})

test("measured zero is evidence while a missing value remains null", () => {
  const zero = contracts.measuredNumber("particle_count", 0, "#/cm3")
  const missing = contracts.missingMeasurement("particle_count", "#/cm3", "The particle counter is not reporting.")

  assert.equal(contracts.measurementIsMeasuredZero(zero), true)
  assert.equal(zero.present, true)
  assert.equal(zero.value, 0)
  assert.equal(missing.present, false)
  assert.equal(missing.value, null)
  assert.equal(contracts.measurementIsMeasuredZero(missing), false)
})

test("confidence is nullable, bounded, and never supplied by default", () => {
  assert.equal(contracts.unknownSensingConfidence().value, null)
  assert.equal(contracts.sensingConfidence(0, "calibrated detector output").value, 0)
  assert.equal(contracts.sensingConfidence(1, "calibrated detector output").value, 1)
  assert.throws(() => contracts.sensingConfidence(-0.01, "invalid"), /between 0 and 1/)
  assert.throws(() => contracts.sensingConfidence(1.01, "invalid"), /between 0 and 1/)
})

test("an available record carries provenance, freshness, classification, and record confidence", () => {
  const record = {
    id: "airnow-obs-1",
    sourceId: "air-quality",
    classification: "UNCLASSIFIED",
    observedAt: "2026-09-01T19:55:00.000Z",
    location: {
      latitude: 32.64,
      longitude: -117.08,
      altitudeM: null,
      coordinateReferenceSystem: "EPSG:4326",
    },
    measurements: [contracts.measuredNumber("pm2_5", 0, "ug/m3")],
    confidence: contracts.sensingConfidence(0.9, "provider QA flag", "airnow-qa-v1"),
    provenance: {
      provider: "airnow",
      endpointRef: "/api/crep/airnow/current",
      sourceRecordId: "airnow-source-1",
      observedAt: "2026-09-01T19:55:00.000Z",
      receivedAt: "2026-09-01T20:00:00.000Z",
      transformRefs: ["airnow-normalize/v1"],
      licenseRef: "provider-terms",
      synthetic: false,
    },
  }
  const collection = contracts.availableSensingRead({
    sourceId: "air-quality",
    records: [record],
    completedAt: "2026-09-01T20:00:00.000Z",
    evaluatedAt: "2026-09-01T20:05:00.000Z",
    maxAgeMs: 15 * 60 * 1000,
  })

  assert.equal(collection.state, "available")
  assert.equal(collection.freshness.state, "fresh")
  assert.equal(collection.dataPresence, "present")
  assert.equal(collection.count, 1)
  assert.equal(collection.records[0].classification, "UNCLASSIFIED")
  assert.equal(collection.records[0].provenance.synthetic, false)
  assert.equal(collection.records[0].confidence.value, 0.9)
  assert.equal(collection.confidence.value, null)
})

test("stale observations remain present but are never labeled fresh", () => {
  const record = {
    id: "spore-1",
    sourceId: "spores",
    classification: "UNCLASSIFIED",
    observedAt: "2026-09-01T10:00:00.000Z",
    location: null,
    measurements: [contracts.measuredNumber("spore_count", 4, "count")],
    confidence: contracts.unknownSensingConfidence(),
    provenance: {
      provider: "sporebase",
      endpointRef: "/api/devices/sporebase/telemetry",
      sourceRecordId: "sample-1",
      observedAt: "2026-09-01T10:00:00.000Z",
      receivedAt: "2026-09-01T10:01:00.000Z",
      transformRefs: [],
      licenseRef: null,
      synthetic: false,
    },
  }
  const collection = contracts.availableSensingRead({
    sourceId: "spores",
    records: [record],
    completedAt: "2026-09-01T20:00:00.000Z",
    evaluatedAt: "2026-09-01T20:00:00.000Z",
    maxAgeMs: 60 * 60 * 1000,
  })

  assert.equal(collection.state, "stale")
  assert.equal(collection.freshness.state, "stale")
  assert.equal(collection.dataPresence, "present")
})

test("the reuse matrix covers every requested source and binds none by assertion", () => {
  assert.equal(matrix.SENSING_REUSE_MATRIX_SCHEMA, "fusarium-sensing-reuse-matrix/v1")
  assert.deepEqual(
    matrix.SENSING_REUSE_MATRIX.map((row) => row.sourceId),
    [...contracts.SENSING_SOURCE_IDS],
  )
  for (const row of matrix.SENSING_REUSE_MATRIX) {
    assert.equal(row.approvedForTrustedRead, false, row.sourceId)
    assert.equal(row.axes.configured, "not_probed", row.sourceId)
    assert.equal(row.axes.reachable, "not_probed", row.sourceId)
    assert.equal(row.axes.authorized, "not_probed", row.sourceId)
    assert.equal(row.axes.dataPresent, "unknown", row.sourceId)
    assert.equal(matrix.trustedReadIsBound(row.sourceId), false)
    for (const candidate of row.readCandidates) {
      assert.equal(candidate.method, "GET")
      assert.match(candidate.path, /^\/api\//)
    }
  }
})

test("known fabricated and side-effecting legacy routes stay quarantined", () => {
  const quarantined = matrix.SENSING_REUSE_MATRIX.flatMap((row) => row.quarantined)
  const byPath = new Map(quarantined.map((entry) => [entry.path, entry.reason]))
  assert.match(byPath.get("/api/spores/detections"), /Math\.random/)
  assert.match(byPath.get("/api/oei/openaq"), /random/)
  assert.match(byPath.get("/api/mycobrain/[port]/telemetry"), /side effects|POST/)
  assert.match(byPath.get("/api/mindex/smells"), /hardcoded/)
  assert.match(byPath.get("/api/crep/oyster/emit"), /static/)
})

test("foundation source is pure and contains no connector or credential seam", () => {
  for (const source of [compiledContracts.source, compiledMatrix.source]) {
    assert.doesNotMatch(source, /\bfetch\s*\(/)
    assert.doesNotMatch(source, /process\.env/)
    assert.doesNotMatch(source, /https?:\/\//)
    assert.doesNotMatch(source, /MINDEX_API_KEY\s*=/)
    assert.doesNotMatch(source, /AIRNOW_API_KEY\s*=/)
    assert.doesNotMatch(source, /Math\.random\s*\(/)
  }
})
