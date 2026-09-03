import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const base = new URL("../../../../", import.meta.url)
const routeFiles = {
  correlations: "app/api/fci/correlations/[deviceId]/route.ts",
  events: "app/api/fci/events/route.ts",
  fingerprint: "app/api/fci/fingerprint/[deviceId]/route.ts",
  gfst: "app/api/fci/gfst/route.ts",
  nlm: "app/api/fci/nlm/[deviceId]/route.ts",
  "ws-status": "app/api/fci/ws-status/route.ts",
}
const dynamicRoutes = new Set(["correlations", "fingerprint", "nlm"])
const routeSources = new Map(await Promise.all(Object.entries(routeFiles).map(async ([name, path]) => [
  name,
  await readFile(new URL(path, base), "utf8"),
])))

async function compileModule(path) {
  const source = await readFile(new URL(path, base), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Math.random()}`)
}

const validation = await compileModule("lib/fusarium/fci/validation.ts")
const readBoundary = await compileModule("lib/fusarium/fci/read-boundary.ts")

function responseApi() {
  return {
    json(body, init = {}) {
      return { body, status: init.status ?? 200, headers: init.headers ?? {} }
    },
  }
}

async function loadRoute(name, overrides = {}) {
  const dependencyKey = `__fciReadRouteDeps_${name}_${Date.now()}_${Math.random()}`
  const source = routeSources.get(name).replace(/import[\s\S]*?from\s+"[^"]+"\s*/g, "")
  const injected = `const {
    NextResponse, requireOwner, fetchFciUpstreamJson, unavailableFciRead,
    validateFciDeviceEvidence, validateFciEventLedger, validateFciGfstPatterns,
    validateFciQueryKeys, validateFciWsStatus, parseFciQueryInteger,
    parseFciQueryNumber, validateFciIdentifier, resolveMindexServerBaseUrl
  } = globalThis[${JSON.stringify(dependencyKey)}];\n${source}`
  const compiled = ts.transpileModule(injected, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  globalThis[dependencyKey] = {
    NextResponse: responseApi(),
    requireOwner: async () => ({ user: { isOwner: true } }),
    resolveMindexServerBaseUrl: () => "http://mindex.invalid",
    ...validation,
    ...readBoundary,
    ...overrides,
  }
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Math.random()}`)
  } finally {
    delete globalThis[dependencyKey]
  }
}

function request(path = "/api/fci/test") {
  return { url: `http://127.0.0.1:8012${path}` }
}

function routeArgs(name, path, deviceId = "hyphae-1") {
  const args = [request(path)]
  if (dynamicRoutes.has(name)) args.push({ params: Promise.resolve({ deviceId }) })
  return args
}

function correlationPayload(deviceId = "hyphae-1") {
  return {
    device_id: deviceId,
    total_count: 1,
    correlations: [{
      event_type: "weather",
      source: "mindex_event_registry",
      correlation_strength: 0.81,
      timestamp: "2026-09-02T18:00:00+00:00",
      description: "Observed temporal relationship.",
    }],
  }
}

function fingerprintPayload(deviceId = "hyphae-1") {
  return {
    device_id: deviceId,
    generated_at: "2026-09-02T18:00:00.000Z",
    fingerprint: { source: "mindex_fci_telemetry", sample_count: 42 },
  }
}

function nlmPayload(deviceId = "hyphae-1") {
  return {
    device_id: deviceId,
    timestamp: "2026-09-02T18:00:00.000Z",
    provenance: { sourceRef: "/api/fci/telemetry", sourceRecordId: "reading-42" },
    growth_phase: "active_growth",
    bioactivity_predictions: [],
    environmental_correlations: [],
    recommendations: [],
  }
}

test("all six operational FCI GET routes authenticate before parameters, queries, or upstream reads", async () => {
  let upstreamCalls = 0
  for (const [name, source] of routeSources) {
    const get = source.slice(source.indexOf("export async function GET"))
    const ownerGate = get.indexOf("const auth = await requireOwner()")
    const queryRead = get.indexOf("new URL(request.url)")
    const paramsRead = get.indexOf("await params")
    const upstreamRead = get.indexOf("await fetchFciUpstreamJson(")
    assert.ok(ownerGate >= 0, `${name} is missing the owner gate`)
    if (queryRead >= 0) assert.ok(queryRead > ownerGate, `${name} reads its query before authentication`)
    if (paramsRead >= 0) assert.ok(paramsRead > ownerGate, `${name} reads path parameters before authentication`)
    assert.ok(upstreamRead > ownerGate, `${name} reaches upstream before authentication`)
    assert.doesNotMatch(source, /await response\.text\(|next:\s*\{\s*revalidate/)

    const sentinel = { route: name, status: 401 }
    const module = await loadRoute(name, {
      requireOwner: async () => ({ error: sentinel }),
      fetchFciUpstreamJson: async () => { upstreamCalls += 1; throw new Error("denied read reached upstream") },
    })
    const deniedRequest = { get url() { throw new Error(`${name} read the denied request URL`) } }
    const args = [deniedRequest]
    if (dynamicRoutes.has(name)) args.push({ params: Promise.resolve({ deviceId: "hyphae-1" }) })
    assert.equal(await module.GET(...args), sentinel)
  }
  assert.equal(upstreamCalls, 0)
})

test("event GET never triggers upstream mutation and correlate only describes existing evidence", async () => {
  const source = routeSources.get("events")
  assert.doesNotMatch(source, /method:\s*"POST"|\/events\/correlate/)
  let calls = 0
  const payload = {
    events: [{
      id: "event-1",
      timestamp: "2026-09-02T18:00:00.000Z",
      source: "mas-fci",
      device_id: "hyphae-1",
    }],
  }
  const module = await loadRoute("events", {
    fetchFciUpstreamJson: async () => { calls += 1; return { ok: true, status: 200, payload } },
  })
  const response = await module.GET(request("/api/fci/events?device_id=hyphae-1&limit=50&correlate=true"))
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, payload)
  assert.equal(response.headers["X-FCI-Correlation-Mode"], "existing-evidence-only")
  assert.equal(calls, 1)
})

test("all read queries reject unknown and duplicate parameters before upstream work", async () => {
  assert.equal(readBoundary.validateFciQueryKeys(new URLSearchParams("limit=1&limit=2"), ["limit"]).ok, false)
  assert.equal(readBoundary.validateFciQueryKeys(new URLSearchParams("admin=true"), []).ok, false)

  for (const [name, path] of Object.entries({
    correlations: "/api/fci/correlations/hyphae-1?admin=true",
    events: "/api/fci/events?admin=true",
    fingerprint: "/api/fci/fingerprint/hyphae-1?admin=true",
    gfst: "/api/fci/gfst?admin=true",
    nlm: "/api/fci/nlm/hyphae-1?admin=true",
    "ws-status": "/api/fci/ws-status?admin=true",
  })) {
    let upstreamCalls = 0
    const module = await loadRoute(name, {
      fetchFciUpstreamJson: async () => { upstreamCalls += 1; throw new Error("invalid query reached upstream") },
    })
    const response = await module.GET(...routeArgs(name, path))
    assert.equal(response.status, 400, `${name} accepted an unknown query parameter`)
    assert.equal(upstreamCalls, 0, `${name} reached upstream for an invalid query`)
  }
})

test("dynamic routes reject invalid device identifiers before upstream work", async () => {
  for (const name of dynamicRoutes) {
    let upstreamCalls = 0
    const module = await loadRoute(name, {
      fetchFciUpstreamJson: async () => { upstreamCalls += 1; throw new Error("invalid identity reached upstream") },
    })
    const response = await module.GET(...routeArgs(name, `/api/fci/${name}/bad%20id`, "bad id"))
    assert.equal(response.status, 400)
    assert.equal(upstreamCalls, 0)
  }
})

test("device-bound evidence requires exact identity and source provenance", () => {
  assert.equal(readBoundary.validateFciDeviceEvidence(correlationPayload(), "hyphae-1", "correlations").ok, true)
  assert.equal(readBoundary.validateFciDeviceEvidence(fingerprintPayload(), "hyphae-1", "fingerprint").ok, true)
  assert.equal(readBoundary.validateFciDeviceEvidence(nlmPayload(), "hyphae-1", "nlm").ok, true)

  assert.equal(readBoundary.validateFciDeviceEvidence(correlationPayload("mushroom-1"), "hyphae-1", "correlations").ok, false)
  assert.equal(readBoundary.validateFciDeviceEvidence({ correlations: [] }, "hyphae-1", "correlations").ok, false)
  assert.equal(readBoundary.validateFciDeviceEvidence({ device_id: "hyphae-1", correlations: [], total_count: 0 }, "hyphae-1", "correlations").ok, false)
  assert.equal(readBoundary.validateFciDeviceEvidence({ device_id: "hyphae-1", correlations: [], total_count: 0, available: true, source: "mas" }, "hyphae-1", "correlations").ok, true)
  assert.equal(readBoundary.validateFciDeviceEvidence({ ...fingerprintPayload(), fingerprint: { sample_count: 42 } }, "hyphae-1", "fingerprint").ok, false)
  assert.equal(readBoundary.validateFciDeviceEvidence({ ...fingerprintPayload(), fingerprint: { source: "mindex_fci_telemetry", sample_count: 0 } }, "hyphae-1", "fingerprint").ok, false)
  assert.equal(readBoundary.validateFciDeviceEvidence({ ...nlmPayload(), provenance: undefined }, "hyphae-1", "nlm").ok, false)
})

test("event ledger enforces provenance, unique records, and filtered device identity", () => {
  const valid = {
    events: [{
      id: "event-1",
      timestamp: "2026-09-02T18:00:00.000Z",
      source: "mas-fci",
      device_id: "hyphae-1",
    }],
  }
  assert.equal(readBoundary.validateFciEventLedger(valid, "hyphae-1").ok, true)
  assert.equal(readBoundary.validateFciEventLedger({ events: [] }).ok, false)
  assert.equal(readBoundary.validateFciEventLedger({ events: [], available: true, source: "mas" }).ok, true)
  assert.equal(readBoundary.validateFciEventLedger({ events: [{ ...valid.events[0], source: undefined }] }, "hyphae-1").ok, false)
  assert.equal(readBoundary.validateFciEventLedger({ events: [{ ...valid.events[0], device_id: "mushroom-1" }] }, "hyphae-1").ok, false)
  assert.equal(readBoundary.validateFciEventLedger({ events: [valid.events[0], valid.events[0]] }).ok, false)
})

test("GFST accepts only a labeled provider catalog and contains no hardcoded fallback", () => {
  assert.doesNotMatch(routeSources.get("gfst"), /FALLBACK_GFST_PATTERNS|GFST Hypothesis|Olsson & Hansson/)
  const valid = [{ pattern_name: "baseline", category: "metabolic", description: "Provider record." }]
  assert.equal(readBoundary.validateFciGfstPatterns(valid).ok, true)
  assert.equal(readBoundary.validateFciGfstPatterns([{ pattern_name: "baseline", category: "metabolic" }]).ok, false)
})

test("websocket status never promotes missing or malformed upstream state to available", async () => {
  assert.deepEqual(readBoundary.validateFciWsStatus({
    active_devices: ["hyphae-1"],
    total_connections: 1,
    sdr_available: false,
  }), {
    ok: true,
    value: { active_devices: ["hyphae-1"], total_connections: 1, sdr_available: false },
  })
  assert.equal(readBoundary.validateFciWsStatus({ active_devices: [], total_connections: 0 }).ok, false)

  const module = await loadRoute("ws-status", {
    fetchFciUpstreamJson: async () => ({ ok: false, status: 503, available: false, error: "missing" }),
  })
  const response = await module.GET(request("/api/fci/ws-status"))
  assert.equal(response.status, 503)
  assert.equal(response.body.available, false)
  assert.equal(response.body.sdr_available, null)
  assert.equal(response.body.active_devices, null)
})

test("missing providers remain non-success across every FCI read route", async () => {
  for (const [name, path] of Object.entries({
    correlations: "/api/fci/correlations/hyphae-1",
    events: "/api/fci/events?limit=50",
    fingerprint: "/api/fci/fingerprint/hyphae-1",
    gfst: "/api/fci/gfst",
    nlm: "/api/fci/nlm/hyphae-1",
    "ws-status": "/api/fci/ws-status",
  })) {
    const module = await loadRoute(name, {
      fetchFciUpstreamJson: async () => ({
        ok: false,
        status: 503,
        available: false,
        error: "provider unavailable",
      }),
    })
    const response = await module.GET(...routeArgs(name, path))
    assert.equal(response.status, 503, `${name} masked a missing provider as success`)
    assert.equal(response.body.available, false)
    if (name === "gfst") assert.equal("patterns" in response.body, false)
  }
})

test("upstream reader maps missing providers to unavailable and rejects oversized JSON", async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response("{}", {
      status: 404,
      headers: { "content-type": "application/json" },
    })
    const missing = await readBoundary.fetchFciUpstreamJson({ url: "http://mas.invalid/missing" })
    assert.equal(missing.ok, false)
    assert.equal(missing.status, 503)

    globalThis.fetch = async () => new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(readBoundary.FCI_MAX_UPSTREAM_JSON_BYTES + 1),
      },
    })
    const oversized = await readBoundary.fetchFciUpstreamJson({ url: "http://mas.invalid/large" })
    assert.equal(oversized.ok, false)
    assert.equal(oversized.status, 502)

    const chunk = new Uint8Array(400_000)
    let chunkReads = 0
    let cancelled = false
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: {
        getReader() {
          return {
            async read() {
              chunkReads += 1
              return { done: false, value: chunk }
            },
            async cancel() { cancelled = true },
            releaseLock() {},
          }
        },
      },
    })
    const chunked = await readBoundary.fetchFciUpstreamJson({ url: "http://mas.invalid/chunked-large" })
    assert.equal(chunked.ok, false)
    assert.equal(chunked.status, 502)
    assert.equal(chunkReads, 3)
    assert.equal(cancelled, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("successful routes preserve provider shapes only after evidence validation", async () => {
  for (const [name, path, payload] of [
    ["correlations", "/api/fci/correlations/hyphae-1", correlationPayload()],
    ["fingerprint", "/api/fci/fingerprint/hyphae-1", fingerprintPayload()],
    ["nlm", "/api/fci/nlm/hyphae-1", nlmPayload()],
  ]) {
    const module = await loadRoute(name, {
      fetchFciUpstreamJson: async () => ({ ok: true, status: 200, payload }),
    })
    const response = await module.GET(...routeArgs(name, path))
    assert.equal(response.status, 200)
    assert.deepEqual(response.body, payload)
  }
})

test("dynamic routes fail closed when upstream evidence names the wrong device", async () => {
  for (const [name, path, payload] of [
    ["correlations", "/api/fci/correlations/hyphae-1", correlationPayload("mushroom-1")],
    ["fingerprint", "/api/fci/fingerprint/hyphae-1", fingerprintPayload("mushroom-1")],
    ["nlm", "/api/fci/nlm/hyphae-1", nlmPayload("mushroom-1")],
  ]) {
    const module = await loadRoute(name, {
      fetchFciUpstreamJson: async () => ({ ok: true, status: 200, payload }),
    })
    const response = await module.GET(...routeArgs(name, path))
    assert.equal(response.status, 502)
    assert.equal(response.body.available, false)
  }
})
