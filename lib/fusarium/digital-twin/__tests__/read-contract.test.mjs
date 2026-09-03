import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const source = await readFile(new URL("../read-contract.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const contract = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)
const singleFlightSource = await readFile(new URL("../single-flight.ts", import.meta.url), "utf8")
const singleFlightCompiled = ts.transpileModule(singleFlightSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const singleFlight = await import(`data:text/javascript;base64,${Buffer.from(singleFlightCompiled).toString("base64")}`)
const route = await readFile(
  new URL("../../../../app/api/natureos/devices/twin/route.ts", import.meta.url),
  "utf8",
)

async function loadRouteWithDeps(deps) {
  const dependencyKey = "__fusariumDigitalTwinRouteTestDeps"
  const executableSource = route
    .replace(
      'import { type NextRequest, NextResponse } from "next/server"',
      `const { NextResponse, requireOwner, digitalTwinReadFromSensingAggregate, singleFlightByKey } = globalThis.${dependencyKey}`,
    )
    .replace('import { requireOwner } from "@/lib/auth/api-auth"', "")
    .replace('import { digitalTwinReadFromSensingAggregate } from "@/lib/fusarium/digital-twin/read-contract"', "")
    .replace('import { singleFlightByKey } from "@/lib/fusarium/digital-twin/single-flight"', "")
  const executableCompiled = ts.transpileModule(executableSource, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  globalThis[dependencyKey] = deps
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(executableCompiled).toString("base64")}#${Date.now()}`)
  } finally {
    delete globalThis[dependencyKey]
  }
}

function aggregate(overrides = {}) {
  return {
    state: "available",
    selectedDeviceIds: ["mushroom-1"],
    sampleSeries: [{
      deviceId: "mushroom-1",
      sensorId: "bme688-a:temperature",
      modality: "thermal",
      unit: "°C",
      timestamps: ["2026-09-01T20:00:00Z", "2026-09-01T20:00:05Z"],
      values: [21.2, 21.7],
      state: "available",
      provenance: {
        sourceId: "/api/mycobrain/devices",
        evidenceId: "sample-2",
        observedAt: "2026-09-01T20:00:05Z",
        receivedAt: "2026-09-01T20:00:06Z",
        mode: "LIVE",
      },
    }],
    ...overrides,
  }
}

test("emits a display contract only for exact timestamped unit-bearing device evidence", () => {
  const result = contract.digitalTwinReadFromSensingAggregate(aggregate(), "mushroom-1")
  assert.equal(result.device_id, "mushroom-1")
  assert.equal(result.sensor_readings.temperature, 21.7)
  assert.equal(result.sensor_readings.timestamp, "2026-09-01T20:00:05.000Z")
  assert.equal(result.current_state, null)
  assert.deepEqual(result.contract.source_ids, ["/api/mycobrain/devices"])
})

test("rejects identity mismatch, missing time or provenance, and incompatible units", () => {
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ selectedDeviceIds: ["other"] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], deviceId: "other" }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], timestamps: ["today"], values: [21] }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], provenance: {} }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], unit: "°F" }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], provenance: { ...aggregate().sampleSeries[0].provenance, mode: "REPLAY" } }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], provenance: { ...aggregate().sampleSeries[0].provenance, observedAt: "2026-09-01T20:00:04Z" } }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], provenance: { ...aggregate().sampleSeries[0].provenance, receivedAt: "2026-09-01T20:00:04Z" } }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], timestamps: ["2026-09-01T20:00:05"], values: [21], provenance: { ...aggregate().sampleSeries[0].provenance, observedAt: "2026-09-01T20:00:05" } }] }), "mushroom-1"), null)
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate({ sampleSeries: [{ ...aggregate().sampleSeries[0], timestamps: ["2026-02-31T20:00:05Z"], values: [21], provenance: { ...aggregate().sampleSeries[0].provenance, observedAt: "2026-02-31T20:00:05Z" } }] }), "mushroom-1"), null)
})

test("derives available or stale state only from accepted Digital Twin series", () => {
  const staleAccepted = { ...aggregate().sampleSeries[0], state: "stale" }
  const unsupportedAvailable = { ...aggregate().sampleSeries[0], sensorId: "unsupported:wind", unit: "m/s", state: "available" }
  const result = contract.digitalTwinReadFromSensingAggregate(aggregate({ state: "available", sampleSeries: [staleAccepted, unsupportedAvailable] }), "mushroom-1")
  assert.equal(result.contract.state, "stale")
  assert.equal(contract.digitalTwinReadFromSensingAggregate(aggregate(), "mushroom-1").contract.state, "available")
})

test("the route owner-gates before its bounded aggregate read and never returns raw upstream bodies", () => {
  const ownerGate = route.indexOf("const auth = await requireOwner()")
  const aggregateRead = route.indexOf("await fetch(aggregateUrl")
  assert.ok(ownerGate >= 0 && aggregateRead > ownerGate)
  assert.match(route, /\/api\/fusarium\/sensing-telemetry/)
  assert.match(route, /digitalTwinReadFromSensingAggregate/)
  assert.match(route, /singleFlightByKey/)
  assert.match(route, /Cache-Control.*no-store/s)
  assert.doesNotMatch(route, /NATUREOS_API_BASE_URL|MAS_API_URL|await response\.text\(/)
})

test("POST rejects unauthorized malformed and oversized bodies before parsing or aggregate work", async () => {
  const authErrors = [
    { status: 401, kind: "authentication_required" },
    { status: 403, kind: "owner_required" },
  ]
  let authCalls = 0
  let bodyReads = 0
  let downstreamCalls = 0
  const forbiddenDownstream = () => {
    downstreamCalls += 1
    throw new Error("unauthorized POST reached downstream work")
  }
  const routeModule = await loadRouteWithDeps({
    NextResponse: { json: forbiddenDownstream },
    requireOwner: async () => ({ error: authErrors[authCalls++] }),
    digitalTwinReadFromSensingAggregate: forbiddenDownstream,
    singleFlightByKey: forbiddenDownstream,
  })
  const requests = [
    {
      url: "http://127.0.0.1:8012/api/natureos/devices/twin",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => {
        bodyReads += 1
        throw new SyntaxError("malformed JSON fixture")
      },
    },
    {
      url: "http://127.0.0.1:8012/api/natureos/devices/twin",
      headers: new Headers({
        "content-type": "application/json",
        "content-length": String(1024 * 1024 * 1024),
      }),
      json: async () => {
        bodyReads += 1
        throw new Error("oversized body fixture must not be consumed")
      },
    },
  ]

  for (const [index, request] of requests.entries()) {
    assert.equal(await routeModule.POST(request), authErrors[index])
  }
  assert.equal(authCalls, 2)
  assert.equal(bodyReads, 0)
  assert.equal(downstreamCalls, 0)
})

test("concurrent polling for one exact device reuses one in-flight aggregate read", async () => {
  const inFlight = new Map()
  let calls = 0
  let release
  const deferred = new Promise((resolve) => { release = resolve })
  const task = async () => { calls += 1; await deferred; return { state: "available" } }
  const first = singleFlight.singleFlightByKey(inFlight, "origin|device", task)
  const second = singleFlight.singleFlightByKey(inFlight, "origin|device", task)
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.equal(first, second)
  release()
  await Promise.all([first, second])
  await singleFlight.singleFlightByKey(inFlight, "origin|device", async () => { calls += 1; return { state: "available" } })
  assert.equal(calls, 2)
})
