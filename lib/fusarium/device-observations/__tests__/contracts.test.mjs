import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const contractsSource = readFileSync(join(here, "..", "contracts.ts"), "utf8")
const registrySource = readFileSync(join(here, "..", "registry.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-device-observations-"))

function compile(name, source) {
  const path = join(compiledDir, `${name}.mjs`)
  writeFileSync(path, ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText)
  return path
}

const contractsPath = compile("contracts", contractsSource)
const registryPath = compile("registry", registrySource.replace('from "./contracts"', 'from "./contracts.mjs"'))
const contracts = await import(pathToFileURL(contractsPath).href)
const registry = await import(pathToFileURL(registryPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const EVALUATED_AT = "2026-09-01T12:00:00.000Z"

function parseScope(query) {
  const result = contracts.parseDeviceObservationScope(new URLSearchParams(query))
  assert.equal(result.ok, true, result.issues.join(" "))
  assert.ok(result.scope)
  return result.scope
}

function makeDescriptor({
  adapterId = "thermal-passive-v1",
  modality = "thermal",
  sourceRef = "/api/test/thermal-observations",
  freshnessMaximumAgeMs = 60_000,
} = {}) {
  return {
    adapterId,
    modality,
    sourceRef,
    readOnly: true,
    provenDeviceIdentity: true,
    identityEvidence: "Each record carries an exact registry device_id field.",
    provenRecordProvenance: true,
    provenanceEvidence: "Each record carries a stable source record ID and source timestamps.",
    freshnessMaximumAgeMs,
    classification: "UNCLASSIFIED",
  }
}

function makeCandidate(descriptor, {
  deviceId = "device-a",
  sourceRecordId = "record-1",
  missionId = null,
  locationId = null,
  environmentId = null,
  observedAt = "2026-09-01T11:59:30.000Z",
  receivedAt = "2026-09-01T11:59:31.000Z",
  classification = "UNCLASSIFIED",
} = {}) {
  return {
    identity: {
      deviceId,
      registryId: deviceId,
      hardwareSerial: null,
      identityEvidence: "record.device_id",
    },
    modality: descriptor.modality,
    context: { missionId, locationId, environmentId },
    observedAt,
    receivedAt,
    measurements: [{ name: "temperature", value: 24.5, unit: "degC" }],
    provenance: {
      adapterId: descriptor.adapterId,
      sourceRef: descriptor.sourceRef,
      sourceRecordId,
      sourceRevision: "fixture-v1",
      deviceIdentityField: "device_id",
      observedAtField: "observed_at",
      receivedAtField: "received_at",
    },
    confidence: { value: null, basis: "The source did not report calibrated confidence." },
    uncertainty: { value: null, unit: null, basis: "The source did not report measurement uncertainty." },
    classification,
  }
}

function makeAdapter({
  descriptor = makeDescriptor(),
  state = "available",
  candidates,
  message = "Deterministic passive fixture result.",
} = {}) {
  return {
    descriptor,
    async read(scope) {
      return {
        state,
        scope: contracts.deviceObservationScopeEcho(scope),
        checkedAt: EVALUATED_AT,
        classification: "UNCLASSIFIED",
        observations: candidates ?? (state === "available" ? [makeCandidate(descriptor)] : []),
        message,
      }
    },
  }
}

test("validates and deduplicates one or multiple device IDs with optional context", () => {
  const params = new URLSearchParams()
  params.append("deviceId", "device-a")
  params.append("deviceId", "device-b")
  params.append("deviceId", "device-a")
  params.append("modality", "camera")
  params.append("modality", "thermal")
  params.set("missionId", "mission-7")
  params.set("locationId", "site.north")
  params.set("environmentId", "env/estuary")
  const parsed = contracts.parseDeviceObservationScope(params)

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.scope.deviceIds, ["device-a", "device-b"])
  assert.deepEqual(parsed.scope.modalities, ["camera", "thermal"])
  assert.deepEqual(parsed.scope.context, {
    missionId: "mission-7",
    locationId: "site.north",
    environmentId: "env/estuary",
  })
  assert.equal(parsed.scope.classification, "UNCLASSIFIED")

  const invalid = new URLSearchParams("deviceId=bad+id&modality=unknown&classification=CUI")
  const rejected = contracts.parseDeviceObservationScope(invalid)
  assert.equal(rejected.ok, false)
  assert.equal(rejected.scope, null)
  assert.match(rejected.issues.join(" "), /deviceId/)
  assert.match(rejected.issues.join(" "), /Unsupported modality/)
  assert.match(rejected.issues.join(" "), /Only UNCLASSIFIED/)
})

test("context without a device stays honestly unbound", async () => {
  const scope = parseScope("missionId=mission-7&locationId=site-a&modality=thermal")
  const result = await registry.queryDeviceObservations(scope, { evaluatedAt: EVALUATED_AT })
  assert.equal(contracts.deviceObservationScopeIsBound(scope), false)
  assert.equal(result.state, "unbound")
  assert.deepEqual(result.observations, [])
  assert.match(result.message, /context do not acquire devices/i)
})

test("deduplicates stable source records without inventing a new identifier", async () => {
  const scope = parseScope("deviceId=device-a&modality=thermal")
  const descriptor = makeDescriptor()
  const record = makeCandidate(descriptor)
  const adapter = makeAdapter({ descriptor, candidates: [record, { ...record }] })
  const result = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [adapter],
  })

  assert.equal(result.state, "available")
  assert.equal(result.observations.length, 1)
  assert.equal(result.observations[0].observationId, "thermal-passive-v1:record-1")
  assert.deepEqual(result.observations[0].units, { temperature: "degC" })
  assert.equal(result.duplicateObservationCount, 1)
})

test("withholds records outside the exact device and context scope", async () => {
  const scope = parseScope("deviceId=device-a&missionId=mission-a&locationId=site-a&modality=thermal")
  const descriptor = makeDescriptor()
  const candidates = [
    makeCandidate(descriptor, { sourceRecordId: "match", missionId: "mission-a", locationId: "site-a" }),
    makeCandidate(descriptor, { deviceId: "device-b", sourceRecordId: "other-device", missionId: "mission-a", locationId: "site-a" }),
    makeCandidate(descriptor, { sourceRecordId: "other-mission", missionId: "mission-b", locationId: "site-a" }),
  ]
  const result = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor, candidates })],
  })

  assert.equal(result.state, "available")
  assert.deepEqual(result.observations.map((item) => item.provenance.sourceRecordId), ["match"])
  assert.equal(result.withheldOutOfScopeCount, 2)
})

test("computes stale state from an injected evaluation time and adapter threshold", async () => {
  const scope = parseScope("deviceId=device-a&modality=thermal")
  const descriptor = makeDescriptor({ freshnessMaximumAgeMs: 60_000 })
  const candidate = makeCandidate(descriptor, {
    observedAt: "2026-09-01T11:57:00.000Z",
    receivedAt: "2026-09-01T11:57:02.000Z",
  })
  const result = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor, candidates: [candidate] })],
  })

  assert.equal(result.state, "stale")
  assert.equal(result.observations[0].state, "stale")
  assert.deepEqual(result.observations[0].freshness, {
    state: "stale",
    evaluatedAt: EVALUATED_AT,
    ageMs: 180_000,
    maximumAgeMs: 60_000,
  })
})

test("fails closed on observation or adapter classification outside UNCLASSIFIED", async () => {
  const scope = parseScope("deviceId=device-a&modality=thermal")
  const descriptor = makeDescriptor()
  const classifiedCandidate = makeCandidate(descriptor, { classification: "CUI" })
  const candidateResult = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor, candidates: [classifiedCandidate] })],
  })
  assert.equal(candidateResult.state, "error")
  assert.equal(candidateResult.rejectedInvalidCount, 1)
  assert.deepEqual(candidateResult.observations, [])

  const classifiedDescriptor = { ...descriptor, classification: "CUI" }
  const adapterResult = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor: classifiedDescriptor })],
  })
  assert.equal(adapterResult.state, "unbound")
  assert.match(adapterResult.registryIssues.join(" "), /classification/)
})

test("keeps unbound, verified empty, available, stale, and error distinct", async () => {
  const scope = parseScope("deviceId=device-a&modality=thermal")
  const descriptor = makeDescriptor()
  const unbound = await registry.queryDeviceObservations(scope, { evaluatedAt: EVALUATED_AT })
  const empty = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor, state: "verified-empty", message: "Exact scope completed with no records." })],
  })
  const failed = await registry.queryDeviceObservations(scope, {
    evaluatedAt: EVALUATED_AT,
    adapters: [makeAdapter({ descriptor, state: "error", message: "Source unavailable." })],
  })

  assert.equal(unbound.state, "unbound")
  assert.equal(empty.state, "verified-empty")
  assert.equal(failed.state, "error")
  assert.equal(empty.adapterRuns[0].state, "verified-empty")
  assert.match(failed.message, /No device absence is inferred/)
})

test("default registry is empty and Psathyrella-specific sources stay excluded", () => {
  assert.deepEqual(registry.REGISTERED_DEVICE_OBSERVATION_ADAPTERS, [])
  const readiness = registry.deviceObservationAdapterReadiness()
  assert.deepEqual(readiness.map((item) => item.modality), contracts.DEVICE_OBSERVATION_MODALITIES)
  assert.ok(readiness.every((item) => item.state === "unbound" && item.registeredAdapterIds.length === 0))
  assert.ok(readiness.every((item) => item.requiredEvidence.length > 0))
  const psathyrella = registry.DEVICE_OBSERVATION_SOURCE_AUDIT.find((entry) => entry.sourceRef === "/api/psathyrella/*")
  assert.equal(psathyrella.disposition, "excluded")
})
