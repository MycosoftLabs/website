import test, { after } from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "..", "local-review-tools.ts"), "utf8")
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-local-review-"))
const compiledPath = join(compiledDir, "local-review-tools.mjs")
writeFileSync(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText)
const tools = await import(pathToFileURL(compiledPath).href)
after(() => rmSync(compiledDir, { recursive: true, force: true }))

const provenance = { sourceId: "operator-file", sourceRef: "local:test", receivedAt: "2026-09-01T20:10:00Z" }

test("JSON import rejects duplicate members before last-value-wins parsing", () => {
  assert.throws(() => tools.parseLocalReviewJson('{"classification":"CUI","classification":"UNCLASSIFIED"}'), /Duplicate JSON member/)
  assert.deepEqual(tools.parseLocalReviewJson('{"classification":"UNCLASSIFIED","nested":{"id":"one"}}'), { classification: "UNCLASSIFIED", nested: { id: "one" } })
})

test("coverage planner reports only explicit domain gaps", async () => {
  const result = await tools.runLocalReview("coverage", { schemaVersion: "fusarium-environmental-coverage-source/v1", classification: "UNCLASSIFIED", provenance, areas: [{ areaId: "a", label: "Area A", requiredDomains: ["weather", "soil"], observations: [{ observationId: "o1", domain: "weather", observedAt: "2026-09-01T20:00:00Z", sourceId: "wx" }] }] })
  assert.equal(result.state, "partial"); assert.deepEqual(result.output.areas[0].missingDomains, ["soil"]); assert.match(result.summary, /explicitly required/)
})

test("field detector preserves mixed mode and computes only unit-compatible deltas", async () => {
  const result = await tools.runLocalReview("field-diff", { schemaVersion: "fusarium-field-change-source/v1", classification: "UNCLASSIFIED", provenance, left: { mode: "OBSERVED", validAt: "2026-09-01T20:00:00Z", fields: [{ fieldId: "temperature", unit: "C", value: 20 }] }, right: { mode: "FORECAST", validAt: "2026-09-01T21:00:00Z", issuedAt: "2026-09-01T19:00:00Z", modelId: "model-1", fields: [{ fieldId: "temperature", unit: "C", value: 23 }] } })
  assert.equal(result.state, "partial"); assert.equal(result.output.changes[0].delta, 3); assert.match(result.findings.map((item) => item.message).join(" "), /Modes differ/)
})

test("field detector rejects duplicate identifiers instead of silently replacing evidence", async () => {
  const duplicate = [{ fieldId: "temperature", unit: "C", value: 20 }, { fieldId: "temperature", unit: "C", value: 99 }]
  const result = await tools.runLocalReview("field-diff", { schemaVersion: "fusarium-field-change-source/v1", classification: "UNCLASSIFIED", provenance, left: { mode: "OBSERVED", validAt: "2026-09-01T20:00:00Z", fields: duplicate }, right: { mode: "OBSERVED", validAt: "2026-09-01T20:00:00Z", fields: [{ fieldId: "temperature", unit: "C", value: 21 }] } })
  assert.equal(result.state, "error")
  assert.equal(result.output, null)
  assert.match(result.findings.map((item) => item.message).join(" "), /unique within a plane/)
})

test("sensor triage separates stale, calibration, clock, power, and authorization evidence", async () => {
  const result = await tools.runLocalReview("sensor-health", { schemaVersion: "fusarium-sensor-health-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:10:00Z", devices: [{ deviceId: "d1", observedAt: "2026-09-01T20:00:00Z", freshnessThresholdSec: 60, calibrationState: "due", clockDriftMs: 200, maxClockDriftMs: 50, sourceAuthorized: null, power: { state: "unknown" } }] })
  assert.equal(result.state, "partial"); assert.deepEqual(result.output.devices[0].triage, ["stale", "calibration-due", "clock-drift-exceeded", "source-authorization-unknown"])
})

test("sensor triage flags future observations instead of clamping them to healthy age zero", async () => {
  const result = await tools.runLocalReview("sensor-health", { schemaVersion: "fusarium-sensor-health-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:10:00Z", devices: [{ deviceId: "future", observedAt: "2026-09-01T20:11:00Z", freshnessThresholdSec: 60, calibrationState: "verified", clockDriftMs: 0, maxClockDriftMs: 50, sourceAuthorized: true, power: { state: "external" } }] })
  assert.equal(result.state, "partial")
  assert.equal(result.output.devices[0].ageSec, -60)
  assert.deepEqual(result.output.devices[0].triage, ["observation-in-future"])
})

test("network posture accepts only explicitly approved inventory and never scans", async () => {
  const result = await tools.runLocalReview("network-posture", { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:00Z", inventoryScope: "lab-declared-assets", assets: [{ assetId: "host-1", approved: true, services: [{ port: 443, protocol: "tcp", exposure: "public", purpose: "declared web" }], certificates: [{ subject: "host-1", expiresAt: "2026-08-01T00:00:00Z" }] }] })
  assert.equal(result.state, "partial"); assert.match(result.output.assets[0].declaredPosture.join(" "), /declared-public-service/); assert.match(result.output.assets[0].declaredPosture.join(" "), /expired-certificate/)
  const rejected = await tools.runLocalReview("network-posture", { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:00Z", inventoryScope: "x", assets: [{ assetId: "unknown", approved: false, services: [], certificates: [] }] }); assert.equal(rejected.state, "error")
})

test("network-posture certificate times normalize before deterministic output hashing", async () => {
  const base = { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:00Z", inventoryScope: "approved", assets: [{ assetId: "host", approved: true, services: [{ port: 443, protocol: "tcp", purpose: "declared", exposure: "lan" }], certificates: [{ subject: "host", expiresAt: "2026-10-01T20:00:00Z" }] }] }
  const zulu = await tools.runLocalReview("network-posture", base)
  const offset = await tools.runLocalReview("network-posture", { ...base, assets: [{ ...base.assets[0], certificates: [{ subject: "host", expiresAt: "2026-10-01T13:00:00-07:00" }] }] })
  assert.deepEqual(offset.output, zulu.output)
  assert.equal(offset.canonicalHash, zulu.canonicalHash)
})

test("incident timeline orders supplied events without attribution", async () => {
  const result = await tools.runLocalReview("incident-timeline", { schemaVersion: "fusarium-incident-timeline-source/v1", classification: "UNCLASSIFIED", provenance, incidentId: "i1", events: [{ eventId: "later", observedAt: "2026-09-01T20:01:00Z", recordedAt: "2026-09-01T20:02:00Z", eventType: "system", severity: "advisory", sourceId: "s", summary: "Later supplied event", sequence: 99 }, { eventId: "first", observedAt: "2026-09-01T20:00:00Z", recordedAt: "2026-09-01T20:00:30Z", eventType: "environment", severity: "info", sourceId: "s", summary: "First supplied event", sequence: 77 }] })
  assert.equal(result.state, "valid"); assert.deepEqual(result.output.events.map((event) => event.eventId), ["first", "later"]); assert.equal(result.output.events[0].reportingDelayMs, 30_000); assert.deepEqual(result.output.events.map((event) => event.sequence), [1, 2])
})

test("schema-valid operator JSON is never labeled verified evidence", async () => {
  const result = await tools.runLocalReview("incident-timeline", { schemaVersion: "fusarium-incident-timeline-source/v1", classification: "UNCLASSIFIED", provenance, incidentId: "claim-only", events: [{ eventId: "supplied", observedAt: "2026-09-01T20:00:00Z", recordedAt: "2026-09-01T20:00:01Z", eventType: "operator-claim", severity: "info", sourceId: "unverified-input", summary: "Syntactically valid only" }] })
  assert.equal(result.state, "valid")
  assert.notEqual(result.state, "verified")
})

test("timestamps require an explicit zone and normalize equivalent offsets deterministically", async () => {
  const base = { schemaVersion: "fusarium-incident-timeline-source/v1", classification: "UNCLASSIFIED", incidentId: "timezone", events: [{ eventId: "event", observedAt: "2026-09-01T20:00:00Z", recordedAt: "2026-09-01T20:00:01Z", eventType: "test", severity: "info", sourceId: "source", summary: "Equivalent instant" }] }
  const noZone = await tools.runLocalReview("incident-timeline", { ...base, provenance: { ...provenance, receivedAt: "2026-09-01T20:10:00" } })
  assert.equal(noZone.state, "error")
  assert.match(noZone.findings.map((item) => item.message).join(" "), /explicit UTC offset/)
  const zulu = await tools.runLocalReview("incident-timeline", { ...base, provenance })
  const offset = await tools.runLocalReview("incident-timeline", {
    ...base,
    provenance: { ...provenance, receivedAt: "2026-09-01T13:10:00-07:00" },
    events: [{ ...base.events[0], observedAt: "2026-09-01T13:00:00-07:00", recordedAt: "2026-09-01T13:00:01-07:00" }],
  })
  assert.deepEqual(offset.output, zulu.output)
  assert.equal(offset.canonicalHash, zulu.canonicalHash)
})

test("canonical key ordering is locale-independent for mixed-case and non-ASCII input", async () => {
  const common = { schemaVersion: "fusarium-incident-timeline-source/v1", classification: "UNCLASSIFIED", provenance, incidentId: "keys" }
  const event = { eventId: "event", observedAt: "2026-09-01T20:00:00Z", recordedAt: "2026-09-01T20:00:01Z", eventType: "test", severity: "info", sourceId: "source", summary: "Stable keys", z: 1, A: 2, ä: 3 }
  const left = await tools.runLocalReview("incident-timeline", { ...common, events: [event] })
  const right = await tools.runLocalReview("incident-timeline", { ...common, events: [{ ä: 3, A: 2, z: 1, summary: "Stable keys", sourceId: "source", severity: "info", eventType: "test", recordedAt: "2026-09-01T20:00:01Z", observedAt: "2026-09-01T20:00:00Z", eventId: "event" }] })
  assert.equal(left.canonicalHash, right.canonicalHash)
})

test("every local review rejects oversized primary record arrays instead of silently truncating", async () => {
  const many = Array.from({ length: tools.LOCAL_REVIEW_MAX_RECORDS + 1 }, () => ({}))
  const cases = [
    ["coverage", { schemaVersion: "fusarium-environmental-coverage-source/v1", classification: "UNCLASSIFIED", provenance, areas: many }],
    ["field-diff", { schemaVersion: "fusarium-field-change-source/v1", classification: "UNCLASSIFIED", provenance, left: { mode: "OBSERVED", validAt: "2026-09-01T20:00:00Z", fields: many }, right: { mode: "OBSERVED", validAt: "2026-09-01T20:00:00Z", fields: [] } }],
    ["sensor-health", { schemaVersion: "fusarium-sensor-health-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:00Z", devices: many }],
    ["network-posture", { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:00Z", inventoryScope: "approved", assets: many }],
    ["incident-timeline", { schemaVersion: "fusarium-incident-timeline-source/v1", classification: "UNCLASSIFIED", provenance, incidentId: "i1", events: many }],
  ]
  for (const [kind, input] of cases) {
    const result = await tools.runLocalReview(kind, input)
    assert.equal(result.state, "error", kind)
    assert.equal(result.output, null, kind)
    assert.match(result.findings.map((item) => item.message).join(" "), /no truncated review is produced/, kind)
  }
})

test("coverage review rejects oversized nested observations across areas without iterating them all", async () => {
  const observations = Array.from({ length: tools.LOCAL_REVIEW_MAX_RECORDS + 1 }, (_, index) => ({ observationId: `o-${index}`, domain: "weather", observedAt: "2026-09-01T20:00:00Z", sourceId: "wx" }))
  const result = await tools.runLocalReview("coverage", { schemaVersion: "fusarium-environmental-coverage-source/v1", classification: "UNCLASSIFIED", provenance, areas: [{ areaId: "a", label: "Area", requiredDomains: ["weather"], observations }] })
  assert.equal(result.state, "error")
  assert.equal(result.output, null)
  assert.match(result.findings.map((item) => item.message).join(" "), /nested observation records/)
})

test("stable record identifiers must be globally unique within each review", async () => {
  const coverage = await tools.runLocalReview("coverage", { schemaVersion: "fusarium-environmental-coverage-source/v1", classification: "UNCLASSIFIED", provenance, areas: [
    { areaId: "same", label: "A", requiredDomains: ["weather"], observations: [{ observationId: "obs", domain: "weather", observedAt: "2026-09-01T20:00:00Z", sourceId: "wx" }] },
    { areaId: "same", label: "B", requiredDomains: ["weather"], observations: [{ observationId: "obs", domain: "weather", observedAt: "2026-09-01T20:00:00Z", sourceId: "wx" }] },
  ] })
  assert.equal(coverage.state, "error")
  const sensor = { deviceId: "same", observedAt: "2026-09-01T20:00:00Z", freshnessThresholdSec: 60, calibrationState: "verified", clockDriftMs: 0, maxClockDriftMs: 50, sourceAuthorized: true, power: { state: "external" } }
  assert.equal((await tools.runLocalReview("sensor-health", { schemaVersion: "fusarium-sensor-health-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:10Z", devices: [sensor, sensor] })).state, "error")
  const asset = { assetId: "same", approved: true, services: [], certificates: [] }
  assert.equal((await tools.runLocalReview("network-posture", { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:10Z", inventoryScope: "approved", assets: [asset, asset] })).state, "error")
})

test("network posture enforces one aggregate nested-record budget", async () => {
  const services = Array.from({ length: tools.LOCAL_REVIEW_MAX_RECORDS }, (_, index) => ({ port: (index % 60000) + 1, protocol: "tcp", purpose: `declared-${index}`, exposure: "lan" }))
  const result = await tools.runLocalReview("network-posture", { schemaVersion: "fusarium-network-posture-source/v1", classification: "UNCLASSIFIED", provenance, asOf: "2026-09-01T20:00:10Z", inventoryScope: "approved", assets: [
    { assetId: "a", approved: true, services, certificates: [] },
    { assetId: "b", approved: true, services: [{ port: 443, protocol: "tcp", purpose: "overflow", exposure: "lan" }], certificates: [] },
  ] })
  assert.equal(result.state, "error")
  assert.match(result.findings.map((item) => item.message).join(" "), /nested service and certificate records/)
})

test("commercial host rejects non-UNCLASSIFIED input", async () => { const result = await tools.runLocalReview("coverage", { schemaVersion: "fusarium-environmental-coverage-source/v1", classification: "CUI", provenance, areas: [] }); assert.equal(result.state, "error"); assert.equal(result.output, null) })
test("local review tools have dedicated routes and truthful available catalog entries", () => { const appRoot = join(here, "..", "..", "..", "..", "app", "fusarium", "(dashboard)", "tools"); const catalog = readFileSync(join(here, "..", "catalog.ts"), "utf8"); for (const route of ["field-coverage", "field-diff", "sensor-health", "network-posture", "incident-timeline", "retrosynthesis"]) { assert.equal(existsSync(join(appRoot, route, "page.tsx")), true, route); assert.match(catalog, new RegExp(`href: "/fusarium/tools/${route}", availability: "available"`)) } })
test("implementation contains no connector, credential, command, scan, or random-data seam", () => { assert.doesNotMatch(source, /\bfetch\s*\(/); assert.doesNotMatch(source, /Math\.random\s*\(/); assert.doesNotMatch(source, /process\.env/); assert.doesNotMatch(source, /child_process|WebSocket|serial|ssh/i) })
