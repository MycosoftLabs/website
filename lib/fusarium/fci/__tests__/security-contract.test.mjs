import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const base = new URL("../../../../", import.meta.url)
const routePaths = ["stimulate", "devices", "telemetry", "patterns", "notes"]
const routeSources = new Map(await Promise.all(routePaths.map(async (name) => [
  name,
  await readFile(new URL(`app/api/fci/${name}/route.ts`, base), "utf8"),
])))

const validationSource = await readFile(new URL("lib/fusarium/fci/validation.ts", base), "utf8")
const validationCompiled = ts.transpileModule(validationSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const validation = await import(`data:text/javascript;base64,${Buffer.from(validationCompiled).toString("base64")}`)

async function loadRoute(name, deps) {
  const dependencyKey = `__fciSecurityRouteDeps_${name}_${Date.now()}_${Math.random()}`
  const withoutImports = routeSources.get(name).replace(/import[\s\S]*?from\s+"[^"]+"\s*/g, "")
  const injected = `const {
    NextResponse, requireOwner, readFciJson, requireFciSameOrigin,
    validateFciStimulationSubmission, validateFciDeviceRegistration,
    validateFciIdentifier, parseFciQueryInteger, parseFciQueryNumber,
    validateFciTelemetrySubmission, validateFciPatternSubmission,
    validateFciNoteSubmission, resolveMindexServerBaseUrl
  } = globalThis[${JSON.stringify(dependencyKey)}];\n${withoutImports}`
  const compiled = ts.transpileModule(injected, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  globalThis[dependencyKey] = deps
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Date.now()}-${Math.random()}`)
  } finally {
    delete globalThis[dependencyKey]
  }
}

function validStimulus(overrides = {}) {
  return {
    device_id: "hyphae-1",
    waveform: "sine",
    frequency: 1,
    amplitude: 0.5,
    duration: 1,
    channel: 0,
    ...overrides,
  }
}

function validDevice(overrides = {}) {
  return {
    device_id: "mycobrain-01",
    probe_type: "copper_steel_agar",
    electrode_materials: ["copper", "steel"],
    sample_rate_hz: 128,
    channels_count: 2,
    ...overrides,
  }
}

function validTelemetry(overrides = {}) {
  return {
    device_id: "hyphae-1",
    timestamp: "2026-09-02T18:00:00.000Z",
    channels: [{
      channel_id: "electrode-a",
      amplitude_uv: -14.5,
      dominant_freq_hz: 8.2,
      band_powers: { low: 4.1, high: 1.2 },
      quality_score: 0.94,
    }],
    spike_count: 2,
    spike_rate_hz: 0.2,
    ...overrides,
  }
}

function validPattern(overrides = {}) {
  return {
    device_id: "hyphae-1",
    channel_id: "electrode-a",
    pattern_name: "active_growth",
    pattern_category: "growth",
    start_time: "2026-09-02T18:00:00.000Z",
    confidence_score: 0.88,
    confidence_level: "high",
    feature_scores: { periodicity: 0.78 },
    phase: "onset",
    interpretation_implications: ["Review alongside the raw signal."],
    interpretation_actions: [],
    ...overrides,
  }
}

function streamBody(text, onRead = () => {}, chunkSize = Number.POSITIVE_INFINITY) {
  const bytes = new TextEncoder().encode(text)
  const chunks = []
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    chunks.push(bytes.slice(offset, Math.min(offset + chunkSize, bytes.byteLength)))
  }
  let index = 0
  let cancelled = false
  return {
    getReader() {
      return {
        async read() {
          if (cancelled || index >= chunks.length) return { done: true, value: undefined }
          const value = chunks[index]
          index += 1
          onRead()
          return { done: false, value }
        },
        async cancel() {
          cancelled = true
        },
        releaseLock() {},
      }
    },
  }
}

function requestFor(body, overrides = {}) {
  let reads = 0
  return {
    request: {
      url: "http://127.0.0.1:8012/api/fci/test",
      headers: new Headers({
        origin: "http://127.0.0.1:8012",
        "content-type": "application/json",
      }),
      body: streamBody(JSON.stringify(body), () => { reads += 1 }),
      ...overrides,
    },
    reads: () => reads,
  }
}

function routeDeps(requireOwner, responseCalls) {
  return {
    NextResponse: {
      json(body, init = {}) {
        responseCalls.push({ body, status: init.status ?? 200, headers: init.headers })
        return { body, status: init.status ?? 200, headers: init.headers }
      },
    },
    requireOwner,
    resolveMindexServerBaseUrl: () => "http://mindex.invalid",
    ...validation,
  }
}

test("every scoped FCI route owner-gates before request parsing or upstream work", () => {
  for (const [name, source] of routeSources) {
    const postStart = source.indexOf("export async function POST")
    assert.ok(postStart >= 0, `${name} must export POST`)
    const post = source.slice(postStart)
    const ownerGate = post.indexOf("const auth = await requireOwner()")
    const bodyRead = post.indexOf("await readFciJson(request)")
    const upstream = post.indexOf("await fetch(")
    assert.ok(ownerGate >= 0 && bodyRead > ownerGate, `${name} must authenticate before reading its body`)
    if (upstream >= 0) assert.ok(upstream > bodyRead, `${name} must validate before upstream work`)
    assert.match(post, /requireFciSameOrigin\(request\)/, `${name} must require same-origin POST`)
    assert.doesNotMatch(post, /request\.json\(/, `${name} bypasses the bounded body reader`)
    assert.doesNotMatch(source, /await response\.text\(/, `${name} exposes raw upstream error content`)
  }
})

test("anonymous and non-owner POST denial touch neither body nor upstream for all five routes", async () => {
  const originalFetch = globalThis.fetch
  let upstreamCalls = 0
  globalThis.fetch = async () => {
    upstreamCalls += 1
    throw new Error("anonymous request reached upstream")
  }
  try {
    for (const status of [401, 403]) {
      for (const name of routePaths) {
        const sentinel = { route: name, status }
        const responseCalls = []
        const module = await loadRoute(name, routeDeps(async () => ({ error: sentinel }), responseCalls))
        const fixture = requestFor({ malformed: true })
        assert.equal(await module.POST(fixture.request), sentinel)
        assert.equal(fixture.reads(), 0, `${name} read a denied body`)
        assert.equal(responseCalls.length, 0, `${name} built a downstream response before returning auth denial`)
      }
    }
    assert.equal(upstreamCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("bounded JSON reader enforces content type, declared size, actual size, and syntax", async () => {
  let reads = 0
  const make = (headers, text, chunkSize) => ({
    url: "http://127.0.0.1:8012/api/fci/test",
    headers: new Headers(headers),
    body: streamBody(text, () => { reads += 1 }, chunkSize),
  })
  assert.equal((await validation.readFciJson(make({}, "{}"))).ok, false)
  assert.equal((await validation.readFciJson(make({ "content-type": "application/json", "content-length": "999" }, "{}"), 10)).ok, false)
  assert.equal(reads, 0, "declared oversize body must not be read")
  assert.equal((await validation.readFciJson(make({ "content-type": "application/json" }, "x".repeat(20), 4), 10)).ok, false)
  assert.equal(reads, 3, "chunked oversize body must stop streaming as soon as the byte cap is crossed")
  assert.equal((await validation.readFciJson(make({ "content-type": "application/json" }, "{"), 10)).ok, false)
  assert.deepEqual(await validation.readFciJson(make({ "content-type": "application/json; charset=utf-8" }, "{\"ok\":true}"), 20), { ok: true, value: { ok: true } })
})

test("same-origin check rejects missing, opaque, malformed, and cross-origin requests", () => {
  const baseRequest = { url: "http://127.0.0.1:8012/api/fci/test" }
  for (const origin of [null, "null", "not a url", "https://example.invalid"]) {
    const result = validation.requireFciSameOrigin({
      ...baseRequest,
      headers: { get: () => origin },
    })
    assert.equal(result.ok, false)
  }
  assert.deepEqual(validation.requireFciSameOrigin({
    ...baseRequest,
    headers: { get: () => "http://127.0.0.1:8012" },
  }), { ok: true, value: true })
})

test("stimulation accepts only a complete finite bounded allowlist and remains disabled", async () => {
  assert.equal(validation.validateFciStimulationSubmission(validStimulus()).ok, true)
  for (const invalid of [
    validStimulus({ amplitude: -1 }),
    validStimulus({ amplitude: Number.NaN }),
    validStimulus({ amplitude: Number.POSITIVE_INFINITY }),
    validStimulus({ amplitude: 5.001 }),
    validStimulus({ frequency: 0 }),
    validStimulus({ frequency: 50.1 }),
    validStimulus({ duration: 0 }),
    validStimulus({ duration: 10.1 }),
    validStimulus({ channel: -1 }),
    validStimulus({ channel: 1.5 }),
    validStimulus({ waveform: "custom" }),
    { ...validStimulus(), extra: true },
  ]) assert.equal(validation.validateFciStimulationSubmission(invalid).ok, false)

  const originalFetch = globalThis.fetch
  let upstreamCalls = 0
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("disabled stimulation reached upstream") }
  try {
    const responseCalls = []
    const module = await loadRoute("stimulate", routeDeps(async () => ({ user: { isOwner: true } }), responseCalls))
    const fixture = requestFor(validStimulus())
    const response = await module.POST(fixture.request)
    assert.equal(response.status, 503)
    assert.equal(response.body.code, "FCI_STIMULATION_DISABLED")
    assert.equal(upstreamCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.doesNotMatch(routeSources.get("stimulate"), /MAS_API_URL|await fetch\(/)
})

test("device registration is exact, bounded, coordinate-safe, and strips no unknown fields", () => {
  const valid = validation.validateFciDeviceRegistration(validDevice({
    location: { latitude: 32.72, longitude: -117.16 },
  }))
  assert.equal(valid.ok, true)
  assert.equal(validation.validateFciDeviceRegistration(validDevice({ device_id: " mycobrain-01" })).ok, false)
  assert.equal(validation.validateFciDeviceRegistration(validDevice({ location: { latitude: 91, longitude: 0 } })).ok, false)
  assert.equal(validation.validateFciDeviceRegistration(validDevice({ location: { latitude: 0, longitude: 0 } })).ok, false)
  assert.equal(validation.validateFciDeviceRegistration({ ...validDevice(), admin: true }).ok, false)
  assert.equal(validation.validateFciDeviceRegistration(validDevice({ channels_count: 0 })).ok, false)
  for (const field of ["probe_type", "electrode_materials", "sample_rate_hz", "channels_count"]) {
    const missing = validDevice()
    delete missing[field]
    assert.equal(validation.validateFciDeviceRegistration(missing).ok, false, `${field} must not be invented`)
  }
})

test("telemetry requires exact identity and time plus finite bounded channel evidence", () => {
  assert.equal(validation.validateFciTelemetrySubmission(validTelemetry()).ok, true)
  for (const invalid of [
    { ...validTelemetry(), timestamp: undefined },
    validTelemetry({ timestamp: "2026-02-31T18:00:00.000Z" }),
    validTelemetry({ channels: [] }),
    validTelemetry({ channels: [validTelemetry().channels[0], validTelemetry().channels[0]] }),
    validTelemetry({ channels: [{ channel_id: "electrode-a", amplitude_uv: Number.NaN }] }),
    validTelemetry({ channels: [{ channel_id: "electrode-a", amplitude_uv: 1, quality_score: 1.1 }] }),
    validTelemetry({ environment: { humidity_pct: 101 } }),
    { ...validTelemetry(), spike_count: undefined },
    { ...validTelemetry(), spike_rate_hz: undefined },
    { ...validTelemetry(), unexpected: "passthrough" },
  ]) assert.equal(validation.validateFciTelemetrySubmission(invalid).ok, false)
})

test("pattern records require exact time, finite confidence, bounded arrays, and known fields", () => {
  assert.equal(validation.validateFciPatternSubmission(validPattern()).ok, true)
  for (const invalid of [
    validPattern({ start_time: "today" }),
    validPattern({ confidence_score: Number.NaN }),
    validPattern({ confidence_score: -0.01 }),
    validPattern({ confidence_level: "certain" }),
    { ...validPattern(), confidence_level: undefined },
    { ...validPattern(), feature_scores: undefined },
    { ...validPattern(), phase: undefined },
    { ...validPattern(), interpretation_implications: undefined },
    { ...validPattern(), interpretation_actions: undefined },
    validPattern({ interpretation_actions: Array.from({ length: 33 }, () => "review") }),
    { ...validPattern(), arbitrary: true },
  ]) assert.equal(validation.validateFciPatternSubmission(invalid).ok, false)
})

test("notes require an exact device and timestamp, enforce bounds, and never invent location", async () => {
  const validNote = {
    deviceId: "hyphae-1",
    notes: "Observed a repeatable low-frequency response.",
    timestamp: "2026-09-02T18:00:00.000Z",
  }
  assert.equal(validation.validateFciNoteSubmission(validNote).ok, true)
  for (const invalid of [
    { ...validNote, deviceId: "" },
    { ...validNote, deviceId: " hyphae-1" },
    { ...validNote, timestamp: "2026-09-02" },
    { ...validNote, timestamp: "2026-02-31T18:00:00.000Z" },
    { ...validNote, notes: "   " },
    { ...validNote, notes: "x".repeat(4_001) },
    { ...validNote, latitude: 0 },
  ]) assert.equal(validation.validateFciNoteSubmission(invalid).ok, false)

  const originalFetch = globalThis.fetch
  let capturedPayload
  globalThis.fetch = async (_url, init) => {
    capturedPayload = JSON.parse(init.body)
    return { ok: true, status: 200 }
  }
  try {
    const responseCalls = []
    const module = await loadRoute("notes", routeDeps(async () => ({ user: { isOwner: true } }), responseCalls))
    const response = await module.POST(requestFor(validNote).request)
    assert.equal(response.status, 200)
    assert.equal(capturedPayload.events[0].metadata.device_id, "hyphae-1")
    assert.equal(capturedPayload.events[0].timestamp, validNote.timestamp)
    assert.equal("location" in capturedPayload.events[0], false)
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.doesNotMatch(routeSources.get("notes"), /\blat\b|\blng\b|unknown-device|fci-lab-session/)
})

test("invalid authorized writes stop before upstream calls", async () => {
  const invalidBodies = {
    devices: { device_id: "bad id" },
    telemetry: validTelemetry({ channels: [] }),
    patterns: validPattern({ confidence_score: 2 }),
    notes: { deviceId: "hyphae-1", notes: "x", timestamp: "not-time" },
    stimulate: validStimulus({ duration: -1 }),
  }
  const originalFetch = globalThis.fetch
  let upstreamCalls = 0
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("invalid request reached upstream") }
  try {
    for (const name of routePaths) {
      const responseCalls = []
      const module = await loadRoute(name, routeDeps(async () => ({ user: { isOwner: true } }), responseCalls))
      const response = await module.POST(requestFor(invalidBodies[name]).request)
      assert.equal(response.status, 400, `${name} did not reject its invalid body`)
    }
    assert.equal(upstreamCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("cross-origin write denial happens before body parsing or upstream work", async () => {
  const originalFetch = globalThis.fetch
  let upstreamCalls = 0
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("cross-origin request reached upstream") }
  try {
    const responseCalls = []
    const module = await loadRoute("notes", routeDeps(async () => ({ user: { isOwner: true } }), responseCalls))
    const fixture = requestFor({ malformed: true })
    fixture.request.headers.set("origin", "https://example.invalid")
    const response = await module.POST(fixture.request)
    assert.equal(response.status, 403)
    assert.equal(fixture.reads(), 0)
    assert.equal(upstreamCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("operational GET routes are owner-gated before query parsing or upstream reads", () => {
  for (const name of ["devices", "telemetry", "patterns"]) {
    const source = routeSources.get(name)
    const getStart = source.indexOf("export async function GET")
    const postStart = source.indexOf("export async function POST")
    const get = source.slice(getStart, postStart)
    const ownerGate = get.indexOf("const auth = await requireOwner()")
    const queryRead = get.indexOf("new URL(request.url)")
    const upstream = get.indexOf("await fetch(")
    assert.ok(ownerGate >= 0 && queryRead > ownerGate && upstream > queryRead, `${name} GET boundary is out of order`)
  }
})
