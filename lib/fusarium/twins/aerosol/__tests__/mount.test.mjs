import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  clampFieldImageLatitude,
  hasRetainedMapFieldObjects,
  MAX_MERCATOR_LATITUDE,
} from "../../../../crep/fields/maplibre-field-lifecycle.ts"
import {
  createFieldPlaybackState,
  DYNAMIC_FIELD_STALE_AFTER_MS,
  isDynamicFieldManifestStale,
  transitionFieldPlayback,
} from "../../../../crep/fields/field-playback.ts"
import {
  classifyMonitoringWeatherContext,
  COVERAGE_PLANNING_UNBOUND,
  parseMonitoringCandidateCoordinates,
} from "../../../aerosol/environmental-coverage-planning.ts"

const here = dirname(fileURLToPath(import.meta.url))
const libDir = join(here, "..")
const hostRoot = join(libDir, "..", "..", "..", "..")
const twinRoot = join(hostRoot, "..", "..", "apps", "twins", "aerosol")
const natureosSource = "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\CODE\\WEBSITE\\website"
const fusariumPage = join(hostRoot, "app", "fusarium", "(dashboard)", "aerosol", "page.tsx")
const mountAdapter = join(hostRoot, "components", "fusarium", "twins", "aerosol", "aerosol-mount.tsx")
const mapWorkbench = join(hostRoot, "components", "fusarium", "aerosol", "aerosol-map-workbench.tsx")
const sharedEarthView = join(hostRoot, "components", "fusarium", "aerosol", "aerosol-shared-earth-view.tsx")
const arraylakeHook = join(hostRoot, "components", "fusarium", "aerosol", "use-arraylake-fields.ts")
const sharedArraylakeHook = join(hostRoot, "components", "crep", "fields", "use-arraylake-fields.ts")
const arraylakeControls = join(hostRoot, "components", "crep", "fields", "arraylake-field-catalog-controls.tsx")
const particulateLayer = join(hostRoot, "components", "fusarium", "aerosol", "aerosol-particulate-layer.tsx")
const coveragePlanningPanel = join(hostRoot, "components", "fusarium", "aerosol", "environmental-coverage-planning-panel.tsx")
const fieldRasterLayer = join(hostRoot, "components", "crep", "layers", "field-raster-layer.tsx")
const fieldLifecycle = join(hostRoot, "lib", "crep", "fields", "maplibre-field-lifecycle.ts")
const fieldPlayback = join(hostRoot, "lib", "crep", "fields", "field-playback.ts")
const coveragePlanningContract = join(hostRoot, "lib", "fusarium", "aerosol", "environmental-coverage-planning.ts")
const sharedEarthContracts = join(hostRoot, "lib", "fusarium", "aerosol", "shared-earth-contracts.ts")
const aerosolContracts = join(hostRoot, "lib", "fusarium", "aerosol", "contracts.ts")
const sharedEarthHook = join(hostRoot, "components", "fusarium", "aerosol", "use-aerosol-shared-earth.ts")
const natureosPage = join(hostRoot, "app", "natureos", "aerosol", "page.tsx")
const slugWorkspace = join(hostRoot, "app", "fusarium", "(dashboard)", "[slug]", "page.tsx")
const earthSimulatorPage = join(hostRoot, "app", "fusarium", "(dashboard)", "earth-simulator", "page.tsx")
const crepDashboardClient = join(hostRoot, "app", "dashboard", "crep", "CREPDashboardClient.tsx")

const PAYLOAD_FILES = [
  ["app/natureos/aerosol/page.tsx", "d830b4e5ad2652c1d55900763509c1d5c2273deaab95c9c4d846e63632ee1e1d"],
  ["components/natureos/apps/aerosol/aerosol-dashboard.tsx", "e5d211b4a31899319ae55d466ad451b68ddd53c340a72500ca54ad7eead935be"],
  ["components/ui/badge.tsx", "1889f8e8d355e002e8e34d8d009b2accd4898aa890047cbead95ef83c53c3120"],
  ["components/ui/button.tsx", "6eabffde44eb5f55314b219046110037dcf0f828bba2a2a4b484ca0ceb83997e"],
  ["components/ui/card.tsx", "62e0a73f63e74fb82a4ff455e9072d3b4862e2d7e229ef51a842b6e3c8861b0d"],
  ["lib/utils.ts", "7ff92063f6489f30a95e1963948aa830decc9757e733195eab72ce7928f436d3"],
  ["lib/services/species-mapping.ts", "7246445c4c11d9d73320094b265bb438d378163880908da3fecbd87e36649c93"],
  ["lib/utils/index.ts", "5c9da9a7d08961a3358b01dbb27f84d6d6f653f09a9b27c5dcb19b5793151043"],
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

test("Aerosol Fusarium route and adapter exist", () => {
  assert.equal(existsSync(fusariumPage), true)
  assert.equal(existsSync(mountAdapter), true)
  assert.equal(existsSync(mapWorkbench), true)
  assert.equal(existsSync(sharedEarthView), true)
  assert.equal(existsSync(arraylakeHook), true)
  assert.equal(existsSync(sharedArraylakeHook), true)
  assert.equal(existsSync(arraylakeControls), true)
  assert.equal(existsSync(particulateLayer), true)
  assert.equal(existsSync(coveragePlanningPanel), true)
  assert.equal(existsSync(fieldRasterLayer), true)
  assert.equal(existsSync(fieldLifecycle), true)
  assert.equal(existsSync(fieldPlayback), true)
  assert.equal(existsSync(coveragePlanningContract), true)
  assert.equal(existsSync(sharedEarthContracts), true)
  assert.equal(existsSync(aerosolContracts), true)
  assert.equal(existsSync(sharedEarthHook), true)
  assert.equal(existsSync(natureosPage), true)
})

test("Fusarium page mounts the local map workbench and not the slug workspace", () => {
  const page = readFileSync(fusariumPage, "utf8")
  const adapter = readFileSync(mountAdapter, "utf8")
  const workbench = readFileSync(mapWorkbench, "utf8")
  assert.match(page, /FusariumAerosolMount/)
  assert.doesNotMatch(page, /FusariumWorkspace/)
  assert.match(adapter, /AerosolMapWorkbench/)
  assert.match(adapter, /CrepResourceHints/)
  assert.doesNotMatch(adapter, /from "@\/app\/natureos\/aerosol\/page"/)
  assert.match(workbench, /react-map-gl\/maplibre/)
  assert.match(workbench, /\/data\/geo\/ne_110m_land\.geojson/)
  assert.match(workbench, /Back to Fusarium/)
  const sharedView = readFileSync(sharedEarthView, "utf8")
  assert.match(sharedView, /CREPDashboardLoader/)
  assert.match(sharedView, /SporeDispersalLayer/)
  assert.match(sharedView, /modeled-spore-dispersal/)
  assert.match(sharedView, /WindVectorLayer/)
  assert.match(sharedView, /FieldRasterLayer/)
  assert.match(sharedView, /FieldWindLayer/)
  assert.match(sharedView, /fieldLayerList/)
  assert.match(sharedView, /MindexEnvPointsLayer/)
  assert.match(sharedView, /AerosolParticulateLayer/)
  assert.match(sharedView, /enabledFieldLayerIds/)
  assert.match(sharedView, /enabledFieldLayers\.map/)
  assert.match(sharedView, /enabledLayerIds=\{sharedLayerIds\}/)
  assert.doesNotMatch(sharedView, /enabledLayerIds=\{enabledCrepLayerIds\}/)
  assert.doesNotMatch(sharedView, /\[\.\.\.sharedLayerIds,\s*\.\.\.enabledFieldLayerIds\]/)
  assert.match(sharedView, /Map projection/)
  assert.match(sharedView, /Globe projection/)
  assert.doesNotMatch(sharedView, /SmokeLayer|FireLayer/)
  const particulate = readFileSync(particulateLayer, "utf8")
  assert.match(particulate, /\/api\/crep\/environment\/air-quality/)
  assert.match(particulate, /isParticulateFeature/)
  assert.doesNotMatch(particulate, /Math\.random\s*\(/)
  assert.doesNotMatch(workbench, /Math\.random\s*\(/)
  assert.doesNotMatch(workbench, /\bfetch\s*\(/)
  assert.doesNotMatch(workbench, /https?:\/\//)
  assert.match(workbench, /Earthmover \/ Arraylake/)
  assert.match(workbench, /aerosol-arraylake-field-list/)
  assert.match(workbench, /enabledFieldLayerIds/)
  assert.match(workbench, /AEROSOL_LAYER_GROUPS/)
  assert.match(workbench, /SporeBase live telemetry is environmental\/device data, not species identification/)
  const contracts = readFileSync(aerosolContracts, "utf8")
  assert.match(contracts, /SPOREBASE_TAPE_DAYS = 30/)
  assert.match(contracts, /SPOREBASE_INTERVAL_MINUTES = 15/)
  assert.match(contracts, /"sporebase-lab"/)
  assert.match(contracts, /"fungal-occurrence"/)
  assert.match(contracts, /"modeled-spore-dispersal"/)
  assert.doesNotMatch(contracts, /id: "spores"/)
  const sharedHook = readFileSync(sharedEarthHook, "utf8")
  assert.match(sharedHook, /\/api\/devices\/sporebase\/samples\?limit=2000/)
  assert.match(sharedHook, /\/api\/crep\/fungal\?quick=true&source=mindex-only&kingdom=Fungi&limit=2000/)
  assert.doesNotMatch(sharedHook, /source=(?:inat|all)/)
  const arraylake = readFileSync(arraylakeHook, "utf8")
  const sharedArraylake = readFileSync(sharedArraylakeHook, "utf8")
  assert.match(arraylake, /export \* from "@\/components\/crep\/fields\/use-arraylake-fields"/)
  assert.match(sharedArraylake, /\/api\/crep\/field\/_catalog/)
  assert.match(sharedArraylake, /\/api\/crep\/field\/\$\{option\.dataset\.id\}\/\$\{option\.variable\.key\}/)
  assert.match(sharedArraylake, /DYNAMIC_FIELD_STALE_AFTER_MS/)
  assert.doesNotMatch(sharedArraylake, /Math\.random\s*\(/)
  assert.doesNotMatch(sharedArraylake, /https?:\/\//)
  assert.match(readFileSync(join(libDir, "manifest.ts"), "utf8"), /AEROSOL_FUSARIUM_ROUTE = "\/fusarium\/aerosol"/)
})

test("Aerosol owns Arraylake renderer lifecycle on its discovered CREP map", () => {
  const sharedView = readFileSync(sharedEarthView, "utf8")
  assert.match(sharedView, /const ARRAYLAKE_FIELD_LAYERS = fieldLayerList\(\)/)
  assert.match(sharedView, /const selected = new Set\(enabledFieldLayerIds\)/)
  assert.match(sharedView, /map=\{map\}/)
  assert.match(sharedView, /dataset=\{dataset\.id\}/)
  assert.match(sharedView, /variable=\{variable\.key\}/)
  assert.match(sharedView, /minZoom=\{dataset\.minZoom \?\? 0\}/)
  assert.doesNotMatch(sharedView, /enabledLayerIds=\{[^}]*enabledFieldLayerIds[^}]*\}/)
})

test("Arraylake raster fields recover only after MapLibre retains the full real frame stack", () => {
  const raster = readFileSync(fieldRasterLayer, "utf8")
  const lifecycle = readFileSync(fieldLifecycle, "utf8")
  assert.match(raster, /hasRetainedFieldObjects/)
  assert.match(raster, /hasRetainedMapFieldObjects/)
  assert.match(raster, /built = hasRetainedFieldObjects\(\)/)
  assert.match(lifecycle, /layerIds\.length === expectedCount/)
  assert.match(lifecycle, /sourceIds\.length === expectedCount/)
  assert.match(raster, /m\.on\("style\.load", onStyleLoad\)/)
  assert.match(raster, /m\.off\("style\.load", onStyleLoad\)/)
  assert.match(raster, /retryAttempts >= 20/)
  assert.match(lifecycle, /MAX_MERCATOR_LATITUDE = 85\.051129/)
  assert.match(raster, /clampFieldImageLatitude\(n\)/)
  assert.match(raster, /clampFieldImageLatitude\(s\)/)
  assert.doesNotMatch(raster, /built = true/)
})

test("MapLibre field lifecycle clamps polar image bounds and rejects partial stacks", () => {
  assert.equal(clampFieldImageLatitude(90), MAX_MERCATOR_LATITUDE)
  assert.equal(clampFieldImageLatitude(-90), -MAX_MERCATOR_LATITUDE)
  assert.equal(clampFieldImageLatitude(42.25), 42.25)

  const layers = new Set(["field-lyr-0", "field-lyr-1"])
  const sources = new Set(["field-src-0"])
  const map = {
    getLayer: (id) => layers.has(id),
    getSource: (id) => sources.has(id),
  }
  assert.equal(hasRetainedMapFieldObjects(map, [...layers], ["field-src-0", "field-src-1"], 2), false)
  sources.add("field-src-1")
  assert.equal(hasRetainedMapFieldObjects(map, [...layers], [...sources], 2), true)
  assert.equal(hasRetainedMapFieldObjects({ getLayer: () => { throw new Error("style settling") }, getSource: () => true }, ["field-lyr-0"], ["field-src-0"], 1), false)
})

test("Arraylake playback advances, pauses, scrubs, and survives style reload deterministically", () => {
  let state = createFieldPlaybackState(0, true)
  state = transitionFieldPlayback(state, { type: "manifest", frameCount: 12 })
  state = transitionFieldPlayback(state, { type: "retained" })
  assert.deepEqual(state, { frameIndex: 0, frameCount: 12, playing: true, retained: true })

  state = transitionFieldPlayback(state, { type: "advance" })
  assert.equal(state.frameIndex, 1)
  state = transitionFieldPlayback(state, { type: "pause" })
  const paused = transitionFieldPlayback(state, { type: "advance" })
  assert.equal(paused, state)
  assert.equal(paused.frameIndex, 1)

  state = transitionFieldPlayback(state, { type: "scrub", index: 8 })
  assert.equal(state.frameIndex, 8)
  assert.equal(state.playing, false)
  state = transitionFieldPlayback(state, { type: "step", delta: 5 })
  assert.equal(state.frameIndex, 1)

  state = transitionFieldPlayback(state, { type: "play" })
  state = transitionFieldPlayback(state, { type: "style-reset" })
  assert.equal(state.frameIndex, 1)
  assert.equal(state.playing, true)
  assert.equal(state.retained, false)
  assert.equal(transitionFieldPlayback(state, { type: "advance" }), state)
  state = transitionFieldPlayback(state, { type: "retained" })
  state = transitionFieldPlayback(state, { type: "advance" })
  assert.equal(state.frameIndex, 2)

  state = transitionFieldPlayback(state, { type: "cleanup" })
  assert.equal(state.retained, false)
  assert.equal(state.playing, false)
})

test("historical dynamic manifests remain stale while static fields do not", () => {
  const evaluatedAt = Date.parse("2026-09-01T12:00:00Z")
  assert.equal(DYNAMIC_FIELD_STALE_AFTER_MS, 48 * 60 * 60 * 1000)
  assert.equal(isDynamicFieldManifestStale("2025-12-31T23:00:00Z", false, evaluatedAt), true)
  assert.equal(isDynamicFieldManifestStale("2026-09-01T11:00:00Z", false, evaluatedAt), false)
  assert.equal(isDynamicFieldManifestStale("2025-12-31T23:00:00Z", true, evaluatedAt), false)
  assert.equal(isDynamicFieldManifestStale(null, false, evaluatedAt), true)
})

test("Aerosol playback UI reports retained frame time and explicit stale history", () => {
  const workbench = readFileSync(mapWorkbench, "utf8")
  const sharedView = readFileSync(sharedEarthView, "utf8")
  const raster = readFileSync(fieldRasterLayer, "utf8")
  assert.match(workbench, /aerosol-arraylake-field-playback/)
  assert.match(workbench, /Animating retained map frame/)
  assert.match(workbench, /Pause Arraylake playback/)
  assert.match(workbench, /Previous Arraylake frame/)
  assert.match(workbench, /Next Arraylake frame/)
  assert.match(workbench, /Scrub Arraylake field frames/)
  assert.match(workbench, /stale · historical/)
  assert.match(workbench, /this animation is not live/)
  assert.match(sharedView, /onPlaybackStateChange/)
  assert.match(raster, /visibleLayerId: playback\.retained/)
  assert.match(raster, /transitionFieldPlayback\(playback, \{ type: "advance" \}\)/)
  assert.match(raster, /transitionFieldPlayback\(playback, \{ type: "cleanup" \}\)/)
})

test("Fusarium Earth Simulator exposes the shared Arraylake catalog and host renderer lifecycle", () => {
  const earthPage = readFileSync(earthSimulatorPage, "utf8")
  const crep = readFileSync(crepDashboardClient, "utf8")
  const controls = readFileSync(arraylakeControls, "utf8")
  assert.match(earthPage, /@\/app\/dashboard\/crep\/CREPDashboardLoader/)
  assert.match(crep, /ArraylakeFieldCatalogControls/)
  assert.match(crep, /enabledLayerIds=\{layers\.filter\(\(layer\) => layer\.enabled && layer\.id\.startsWith\("crep-field-"\)\)/)
  assert.match(crep, /FIELD_REGISTRY\.flatMap/)
  assert.match(crep, /<FieldRasterLayer/)
  assert.match(crep, /<FieldWindLayer/)
  assert.match(controls, /earth-arraylake-field-catalog/)
  assert.match(controls, /useArraylakeFields\(true, enabledLayerIds\)/)
  assert.match(controls, /Same host registry, manifest route, and renderer lifecycle as Aerosol/)
  assert.match(controls, /Historical frames remain labeled stale/)
})

test("environmental coverage planning validates candidates and fails access and coverage closed", () => {
  assert.deepEqual(parseMonitoringCandidateCoordinates("32.5", "-117.1"), {
    ok: true,
    value: { latitude: 32.5, longitude: -117.1 },
  })
  assert.equal(parseMonitoringCandidateCoordinates("", "-117").ok, false)
  assert.equal(parseMonitoringCandidateCoordinates("95", "-117").ok, false)
  assert.match(COVERAGE_PLANNING_UNBOUND.access, /No audited contract/)
  assert.match(COVERAGE_PLANNING_UNBOUND.deviceCoverage, /No deployed SporeBase/)
  assert.match(COVERAGE_PLANNING_UNBOUND.soilMoisture, /No qualified soil-moisture contract/)

  const candidate = { latitude: 32.5, longitude: -117.1 }
  const payload = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Point", coordinates: [-117.11, 32.51] },
      properties: {
        source: "mindex",
        stationId: "station-1",
        stationName: "Qualified station",
        humidityPct: 64,
        windSpeedMs: 3.2,
        windDirection: 250,
        temperatureC: 21,
        precipitationMm: 0,
        observedAt: "2026-09-01T11:30:00Z",
      },
    }],
    meta: {
      source: "mindex.atmos.weather_observations",
      upstream: "mindex",
      timestamp: "2026-09-01T11:35:00Z",
      bbox: { west: -117.6, south: 32, east: -116.6, north: 33 },
    },
  }
  const available = classifyMonitoringWeatherContext(payload, candidate, "2026-09-01T12:00:00Z")
  assert.equal(available.state, "available")
  assert.equal(available.nearestWindObservation?.windSpeedMs, 3.2)
  assert.equal(available.nearestHumidityObservation?.humidityPct, 64)
  assert.equal(available.accessState, "unbound")
  assert.equal(available.deviceCoverageState, "unbound")
  assert.equal(available.soilMoistureState, "unbound")
  assert.equal(available.decisionState, "not-computed")

  const stale = classifyMonitoringWeatherContext(payload, candidate, "2026-09-02T12:00:00Z")
  assert.equal(stale.state, "stale")
  const unavailable = classifyMonitoringWeatherContext({ ...payload, meta: { ...payload.meta, upstream: "unavailable" } }, candidate, "2026-09-01T12:00:00Z")
  assert.equal(unavailable.state, "unbound")
  const empty = classifyMonitoringWeatherContext({ ...payload, features: [] }, candidate, "2026-09-01T12:00:00Z")
  assert.equal(empty.state, "empty")
})

test("coverage-planning surface is operator-supplied, provenance-visible, and non-prescriptive", () => {
  const panel = readFileSync(coveragePlanningPanel, "utf8")
  assert.match(panel, /No candidate coordinate has been supplied/)
  assert.match(panel, /Load verified context/)
  assert.match(panel, /\/api\/crep\/environment\/weather\?bbox=/)
  assert.match(panel, /no score · no recommendation/)
  assert.match(panel, /Access/)
  assert.match(panel, /Device coverage/)
  assert.match(panel, /Soil moisture/)
  assert.match(panel, /Weather provenance/)
  assert.match(panel, /query boundary, not a sampling or network footprint/)
  assert.doesNotMatch(panel, /Math\.random\s*\(/)
})

test("eight payload files stay byte-identical across source, twin, and host", () => {
  assert.equal(PAYLOAD_FILES.length, 8)
  for (const [rel, expected] of PAYLOAD_FILES) {
    const sourceHash = sha256(join(natureosSource, rel))
    const twinHash = sha256(join(twinRoot, rel))
    const hostHash = sha256(join(hostRoot, rel))
    assert.equal(sourceHash, expected, `source drifted ${rel}`)
    assert.equal(twinHash, expected, `twin drifted ${rel}`)
    assert.equal(hostHash, expected, `host drifted ${rel}`)
  }
})

test("slug workspace was not rewritten by this mount", () => {
  assert.match(readFileSync(slugWorkspace, "utf8"), /FusariumWorkspace/)
})
