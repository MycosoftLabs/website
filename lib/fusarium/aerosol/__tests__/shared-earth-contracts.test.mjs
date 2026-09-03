import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(here, "..", "shared-earth-contracts.ts")
const source = readFileSync(sourcePath, "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-aerosol-shared-"))
const compiledPath = join(compiledDir, "shared-earth-contracts.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
const shared = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const checkedAt = "2026-09-01T20:30:00.000Z"

function mindex(features, upstream = "mindex") {
  return {
    type: "FeatureCollection",
    features,
    meta: { source: "mindex.test", upstream, timestamp: checkedAt },
  }
}

test("maps Aerosol controls onto the exact shared CREP layer ids", () => {
  assert.deepEqual(
    shared.sharedCrepLayerIdsForAerosolLayers(["sporebase", "fungal-occurrence", "nasa-firms-fire", "wind", "air-quality"]),
    ["sporebase", "fungi", "mindexFirms", "mindexAirQuality", "liveAqi"],
  )
  assert.deepEqual(shared.sharedCrepLayerIdsForAerosolLayers(["smoke", "particulate"]), [])
})

test("MINDEX outage fails closed instead of becoming verified empty", () => {
  const result = shared.classifyMindexFeatureCollection({
    layerId: "nasa-firms-fire",
    source: "mindex-firms",
    payload: mindex([], "unavailable"),
    checkedAt,
    freshnessMs: 12 * 60 * 60 * 1000,
    observedProperties: ["detectedAt"],
  })
  assert.equal(result.state, "unbound")
  assert.match(result.reason, /No empty or all-clear conclusion/)
})

test("successful MINDEX empty remains explicit and a stale record stays stale", () => {
  const empty = shared.classifyMindexFeatureCollection({
    layerId: "air-quality",
    source: "mindex-air-quality",
    payload: mindex([]),
    checkedAt,
    freshnessMs: 2 * 60 * 60 * 1000,
    observedProperties: ["measuredAt"],
  })
  assert.equal(empty.state, "empty")

  const stale = shared.classifyMindexFeatureCollection({
    layerId: "nasa-firms-fire",
    source: "mindex-firms",
    payload: mindex([{ properties: { detectedAt: "2026-08-31T00:00:00.000Z" } }]),
    checkedAt,
    freshnessMs: 12 * 60 * 60 * 1000,
    observedProperties: ["detectedAt"],
  })
  assert.equal(stale.state, "stale")
  assert.equal(stale.count, 1)
})

test("particulate status accepts only explicit PM or dust observations", () => {
  const payload = mindex([
    { properties: { summary: "O3 45 ppb", measuredAt: checkedAt } },
    { properties: { summary: "PM2.5 8 ug/m3 · PM10 12 ug/m3", measuredAt: checkedAt } },
  ])
  const result = shared.classifyMindexFeatureCollection({
    layerId: "particulate",
    source: "mindex-air-quality",
    payload,
    checkedAt,
    freshnessMs: 2 * 60 * 60 * 1000,
    observedProperties: ["measuredAt"],
    featureFilter: shared.isParticulateFeature,
  })
  assert.equal(result.state, "available")
  assert.equal(result.count, 1)
})

test("SporeBase, lab, and Earth-2 outage bodies remain unbound", () => {
  const sporebase = shared.classifySporeBase({ devices: [], note: "MAS unreachable; no device data." }, checkedAt)
  const lab = shared.classifySporeBaseLab({ samples: [], note: "MAS unreachable; no sample data." }, checkedAt)
  const modeled = shared.classifyEarth2Spore({ zones: [], source: "none", available: false }, checkedAt)
  const wind = shared.classifyEarth2Wind({ u: [], v: [], source: "none", available: false }, checkedAt)
  assert.equal(sporebase.state, "unbound")
  assert.equal(lab.state, "unbound")
  assert.equal(modeled.layerId, "modeled-spore-dispersal")
  assert.equal(modeled.state, "unbound")
  assert.equal(wind.state, "unbound")
})

test("only delayed, provenance-bearing 15-minute SporeBase tape identifications qualify", () => {
  const pending = shared.classifySporeBaseLab({ samples: [{
    status: "analyzing",
    start_time: "2026-08-01T00:00:00Z",
    end_time: "2026-08-01T00:15:00Z",
    reported_at: "2026-09-01T18:00:00Z",
    lab_id: "lab-01",
    analysis_type: "sequencing",
    identifications: [{ taxon: "unreviewed draft" }],
  }] }, checkedAt)
  assert.equal(pending.state, "unbound")

  const qualified = shared.classifySporeBaseLab({
    samples: [{
      status: "results_ready",
      start_time: "2026-08-01T00:00:00Z",
      end_time: "2026-08-01T00:15:00Z",
      reported_at: "2026-09-01T18:00:00Z",
      lab_id: "lab-01",
      analysis_type: "sequencing",
      identifications: [
        { taxon: "Fusarium oxysporum" },
        { scientific_name: "Cladosporium cladosporioides" },
      ],
    }],
  }, checkedAt)
  assert.equal(qualified.state, "available")
  assert.equal(qualified.count, 2)
  assert.match(qualified.reason, /backfilled.*15-minute intervals/i)
})

test("fungal occurrence stays separate from modeled dispersal and requires source-preserving coordinates", () => {
  const occurrence = shared.classifyFungalOccurrence({
    observations: [{
      scientificName: "Fusarium oxysporum",
      latitude: 32.7,
      longitude: -117.1,
      timestamp: "2026-08-31T18:00:00Z",
      source: "iNaturalist",
    }],
    meta: { sources: { mindex: 1, iNaturalist: 0, gbif: 0 }, dataSource: "mindex_primary", cached: false },
  }, checkedAt)
  assert.equal(occurrence.layerId, "fungal-occurrence")
  assert.equal(occurrence.state, "available")
  assert.match(occurrence.reason, /does not imply airborne spore concentration/)

  const unbound = shared.classifyFungalOccurrence({ observations: [], meta: { dataSource: "mindex_empty_requires_ingest" } }, checkedAt)
  assert.equal(unbound.state, "unbound")
})

test("modeled spore zones require a named run and timestamped meteorology driver", () => {
  const withheld = shared.classifyEarth2Spore({ zones: [{ id: "zone-1" }], source: "mas" }, checkedAt)
  assert.equal(withheld.state, "unbound")
  assert.match(withheld.reason, /wind\/meteorology driver/)

  const qualified = shared.classifyEarth2Spore({
    zones: [{ id: "zone-1" }],
    source: "mas",
    model: "earth2-spore-dispersal",
    run_id: "run-001",
    meteorology: { source: "earth2-wind", valid_at: "2026-09-01T20:00:00Z" },
  }, checkedAt)
  assert.equal(qualified.state, "available")
  assert.match(qualified.reason, /not direct detections/)
})

test("AirNow missing configuration is unbound and smoke renderer is quarantined", () => {
  assert.equal(shared.classifyAirNow({ error: "AIRNOW_API_KEY not configured" }, checkedAt).state, "unbound")
  const smoke = shared.loadingSharedEarthStatuses(checkedAt).find((item) => item.layerId === "smoke")
  assert.equal(smoke.state, "unbound")
  assert.match(smoke.reason, /stochastic plume defaults/)
  assert.doesNotMatch(source, /Math\.random\s*\(/)
})
