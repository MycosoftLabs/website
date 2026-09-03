import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-aerosol-"))
const compiledPath = join(compiledDir, "contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const aerosol = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const evaluatedAt = "2026-09-01T20:30:00.000Z"

function record(overrides = {}) {
  return {
    recordId: "lab-tape-001",
    layerId: "sporebase-lab",
    classification: "UNCLASSIFIED",
    title: "Lab-identified tape interval",
    category: "delayed_lab_identification",
    observedAt: "2026-08-01T20:05:00.000Z",
    interval: {
      startAt: "2026-08-01T20:00:00.000Z",
      endAt: "2026-08-01T20:15:00.000Z",
      index: 96,
      intervalMinutes: 15,
    },
    reportedAt: "2026-09-01T20:20:00.000Z",
    coordinates: [-117.1611, 32.7157],
    altitudeM: 24,
    measurements: {
      taxon: { value: "Fusarium oxysporum", unit: null, quality: "reported" },
      concentration: { value: 18, unit: "spores/m3", quality: "measured" },
    },
    confidence: 0.91,
    provenance: {
      provider: "qualified-laboratory",
      sourceRef: "file:validated-sporebase-lab-results.geojson",
      sourceRecordId: "lab-result-001",
      receivedAt: "2026-09-01T20:21:00.000Z",
      licenseRef: null,
      transformRefs: [],
      synthetic: false,
    },
    ...overrides,
  }
}

function dataset() {
  return {
    schema: "mycosoft.aerosol.evidence.v2",
    datasetId: "sporebase-lab-results-2026-09-01",
    classification: "UNCLASSIFIED",
    createdAt: evaluatedAt,
    readOnly: true,
    synthetic: false,
    layers: [
      {
        layerId: "sporebase-lab",
        state: "available",
        provider: "qualified-laboratory",
        sourceRef: "file:validated-sporebase-lab-results.geojson",
        completedAt: evaluatedAt,
        upstreamStatus: null,
        reason: null,
        recordIds: ["lab-tape-001"],
        synthetic: false,
      },
      {
        layerId: "air-quality",
        state: "empty",
        provider: "qualified-air-reader",
        sourceRef: "/api/fusarium/aerosol/air-quality",
        completedAt: evaluatedAt,
        upstreamStatus: 200,
        reason: "The completed bounded query returned no station records.",
        recordIds: [],
        synthetic: false,
      },
    ],
    records: [record()],
  }
}

test("accepts a provenance-bearing evidence package and preserves verified empty separately", () => {
  const result = aerosol.validateAerosolEvidence(dataset(), evaluatedAt)
  assert.equal(result.ok, true)
  assert.equal(result.value.records.length, 1)
  const runtimes = aerosol.aerosolLayerRuntimes(result.value)
  assert.equal(runtimes.find((item) => item.layerId === "sporebase-lab").state, "available")
  assert.equal(runtimes.find((item) => item.layerId === "air-quality").state, "empty")
  assert.equal(runtimes.find((item) => item.layerId === "smoke").state, "unbound")
  assert.match(runtimes.find((item) => item.layerId === "smoke").reason, /not bound/)
})

test("imports strict point GeoJSON and derives stale state from supplied timestamps", () => {
  const input = {
    type: "FeatureCollection",
    name: "operator-sporebase-lab-results",
    classification: "UNCLASSIFIED",
    features: [
      {
        type: "Feature",
        id: "lab-tape-001",
        geometry: { type: "Point", coordinates: [-117.1611, 32.7157] },
        properties: record({
          recordId: undefined,
          observedAt: "2026-08-01T20:05:00.000Z",
          coordinates: undefined,
        }),
      },
    ],
  }
  const result = aerosol.validateAerosolEvidence(input, evaluatedAt)
  assert.equal(result.ok, true)
  assert.equal(result.value.datasetId, "operator-sporebase-lab-results")
  assert.equal(result.value.layers[0].state, "available")
  assert.equal(result.value.records[0].coordinates[0], -117.1611)
})

test("rejects synthetic records, invalid coordinates, external source URLs, and fake empty claims", () => {
  const invalid = dataset()
  invalid.records[0].coordinates = [400, 95]
  invalid.records[0].provenance.synthetic = true
  invalid.records[0].provenance.sourceRef = "https://example.invalid/records/1"
  invalid.layers[1].upstreamStatus = 503
  const result = aerosol.validateAerosolEvidence(invalid, evaluatedAt)
  assert.equal(result.ok, false)
  assert.match(result.issues.join(" "), /longitude/)
  assert.match(result.issues.join(" "), /synthetic must be false/)
  assert.match(result.issues.join(" "), /same-origin API, file, or URN/)
  assert.match(result.issues.join(" "), /empty requires a successful 2xx/)
})

test("zero-feature GeoJSON is not treated as evidence that the atmosphere is clear", () => {
  const result = aerosol.validateAerosolEvidence({
    type: "FeatureCollection",
    classification: "UNCLASSIFIED",
    features: [],
  }, evaluatedAt)
  assert.equal(result.ok, false)
  assert.match(result.issues.join(" "), /not evidence of atmospheric absence/)
})

test("filters records without changing provenance and creates map points only from accepted records", () => {
  const parsed = aerosol.validateAerosolEvidence(dataset(), evaluatedAt)
  assert.equal(parsed.ok, true)
  const visible = aerosol.filterAerosolRecords(parsed.value.records, {
    enabledLayers: ["sporebase-lab"],
    earliestObservedAt: "2026-08-01T20:00:00.000Z",
    query: "taxon",
  })
  assert.equal(visible.length, 1)
  const geojson = aerosol.aerosolRecordsToGeoJson(visible)
  assert.equal(geojson.features.length, 1)
  assert.equal(geojson.features[0].properties.layerId, "sporebase-lab")
  assert.equal(visible[0].provenance.sourceRecordId, "lab-result-001")
})

test("SporeBase live telemetry cannot carry a species identity and lab results require indexed delayed provenance", () => {
  assert.equal(aerosol.SPOREBASE_TAPE_DAYS, 30)
  assert.equal(aerosol.SPOREBASE_INTERVAL_MINUTES, 15)
  assert.equal(aerosol.SPOREBASE_INTERVALS_PER_TAPE, 2880)

  const liveIdentity = dataset()
  liveIdentity.layers[0].layerId = "sporebase"
  liveIdentity.records[0].layerId = "sporebase"
  liveIdentity.records[0].title = "Live species identification"
  liveIdentity.records[0].interval = null
  liveIdentity.records[0].reportedAt = null
  assert.equal(aerosol.validateAerosolEvidence(liveIdentity, evaluatedAt).ok, false)

  const earlyReport = dataset()
  earlyReport.records[0].reportedAt = "2026-08-01T20:10:00.000Z"
  const earlyResult = aerosol.validateAerosolEvidence(earlyReport, evaluatedAt)
  assert.equal(earlyResult.ok, false)
  assert.match(earlyResult.issues.join(" "), /cannot precede the physical tape interval/)
})

test("contract remains pure and contains no generated or connector data seam", () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/)
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /process\.env/)
  assert.doesNotMatch(source, /https?:\/\//)
})
