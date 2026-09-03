import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

const appBase = new URL("../../../../", import.meta.url)
const BLOB_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_BLOB_ID = "22222222-2222-4222-8222-222222222222"
const RUN_ID = "33333333-3333-4333-8333-333333333333"
const FILE_ID = "library:acoustic-file-1"

async function loadTsSource(url) {
  const source = await readFile(url, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}#${Math.random()}`)
}

const sineContract = await loadTsSource(new URL("lib/mindex/sine-contract.ts", appBase))
const boundarySource = await readFile(new URL("lib/fusarium/sine/server-boundary.ts", appBase), "utf8")
const boundaryDependencyKey = `__sineBoundaryContract_${Date.now()}`
const boundaryWithoutImport = boundarySource.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*"@\/lib\/mindex\/sine-contract"\s*/,
  `const { SINE_EVIDENCE_CONTRACT, SINE_EVIDENCE_QUERY_DEFAULTS, SINE_REQUEST_CONTRACT } = globalThis[${JSON.stringify(boundaryDependencyKey)}];\n`,
)
globalThis[boundaryDependencyKey] = sineContract
const boundaryCompiled = ts.transpileModule(boundaryWithoutImport, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const boundary = await import(`data:text/javascript;base64,${Buffer.from(boundaryCompiled).toString("base64")}`)
delete globalThis[boundaryDependencyKey]

const routeFiles = {
  analyze: "app/api/mindex/sine/blobs/[id]/analyze/route.ts",
  human: "app/api/natureos/mindex/library/human-identification/route.ts",
  wave: "app/api/natureos/mindex/library/wave-annotation/route.ts",
}
const routeSources = new Map(await Promise.all(Object.entries(routeFiles).map(async ([name, path]) => [
  name,
  await readFile(new URL(path, appBase), "utf8"),
])))

function validFileContext(overrides = {}) {
  return {
    id: FILE_ID,
    analysis_id: BLOB_ID,
    source_id: "field-recorder-catalog",
    source_name: "Exact field capture",
    device_id: "hydrophone-7",
    sensor_id: "channel-a",
    observed_at: "2026-09-02T18:00:00.000Z",
    duration_sec: 30,
    sample_rate_hz: 48_000,
    ...overrides,
  }
}

function validAnalysis(overrides = {}) {
  return {
    blob_id: BLOB_ID,
    file_id: FILE_ID,
    mode: "full_short_recording",
    start_sec: null,
    end_sec: null,
    window_source: null,
    windowed: false,
    truncated_to_sec: null,
    sine_request: { target_domains: ["water"], require_model_provenance: false },
    evidence_contract: { allow_llm_semantic_fallback: true, allow_mock_or_synthetic_outputs: true },
    scope: { visual_mode: "spectrogram", frequency_min_hz: 0, frequency_max_hz: 8_000 },
    file_context: validFileContext(),
    ...overrides,
  }
}

function validHuman(overrides = {}) {
  return {
    blob_id: BLOB_ID,
    file_id: FILE_ID,
    analysis_run_id: RUN_ID,
    human_label: "whale vocalization",
    human_category: "marine_bioacoustics",
    human_confidence: 0.9,
    human_notes: "Reviewed against the selected event.\nSecond line preserves the operator's note.\tVerified.",
    disputes_model: false,
    model_top_label: "whale_vocalization",
    model_confidence: 0.82,
    model_summary: {
      model_id: "sine-ast-1",
      model_version: "sha256:abc123",
      observed_at: "2026-09-02T18:00:00.000Z",
    },
    current_time_sec: 3.25,
    selected_region: { start_sec: 2, end_sec: 4 },
    selected_region_measurements: { centroid_hz: 420.5, top_peaks: [{ frequency_hz: 410 }] },
    scope_context: { visual_mode: "spectrogram" },
    training_review: { source: "sine_human_identification", model_evidence_present: true },
    event_context: { current_time_sec: 3.25 },
    detector_event_key: "detector:event-1",
    detector_event: { detector_id: "frequency_fft", start_sec: 2, end_sec: 4 },
    file_context: validFileContext(),
    ...overrides,
  }
}

function validWave(overrides = {}) {
  const fileContext = validFileContext()
  delete fileContext.analysis_id
  return {
    blob_id: BLOB_ID,
    file_id: FILE_ID,
    analysis_run_id: RUN_ID,
    selection: { start_sec: 2, end_sec: 4, loop_enabled: false, reverse_enabled: false, playback_rate: 1, volume: 0.8 },
    zoom: { start_sec: 1, end_sec: 5 },
    region_measurements: { centroid_hz: 420.5, top_peaks: [{ frequency_hz: 410 }] },
    scope: { visual_mode: "spectrogram", frequency_min_hz: 0, frequency_max_hz: 8_000 },
    markers: [{ id: "marker-1", time_sec: 3, label: "call onset" }],
    file_context: fileContext,
    ...overrides,
  }
}

function requestFor(body, { url = "http://127.0.0.1:8012/api/sine", origin = "http://127.0.0.1:8012", contentType = "application/json" } = {}) {
  const encoded = new TextEncoder().encode(typeof body === "string" ? body : JSON.stringify(body))
  let readers = 0
  let delivered = false
  return {
    request: {
      url,
      headers: new Headers({ origin, "content-type": contentType }),
      body: {
        getReader() {
          readers += 1
          return {
            async read() {
              if (delivered) return { done: true, value: undefined }
              delivered = true
              return { done: false, value: encoded }
            },
            async cancel() {},
            releaseLock() {},
          }
        },
      },
    },
    readers: () => readers,
  }
}

class MockNextResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status ?? 200
    this.headers = init.headers
  }

  static json(body, init = {}) {
    return { body, status: init.status ?? 200, headers: init.headers }
  }
}

function routeDeps(requireOwner, fetchMindexWithAuthRetry) {
  return {
    NextResponse: MockNextResponse,
    requireOwner,
    env: { mindexApiBaseUrl: "http://mindex.invalid" },
    fetchMindexWithAuthRetry,
    resolveMindexServerBaseUrl: () => "http://mindex.invalid",
    ...boundary,
  }
}

async function loadRoute(name, deps) {
  const dependencyKey = `__sineRouteDeps_${name}_${Date.now()}_${Math.random()}`
  const withoutImports = routeSources.get(name).replace(/import[\s\S]*?from\s+"[^"]+"\s*/g, "")
  const injected = `const {
    NextResponse, requireOwner, env, fetchMindexWithAuthRetry, resolveMindexServerBaseUrl,
    buildSineAnalysisQuery, readSineJson, reconcileSineAnalysisRequest, requireSineSameOrigin,
    validateSineAnalysisSubmission, validateSineBlobId, readSineBlobQuery,
    validateSineHumanIdentification, validateSineWaveAnnotation
  } = globalThis[${JSON.stringify(dependencyKey)}];\n${withoutImports}`
  const compiled = ts.transpileModule(injected, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  globalThis[dependencyKey] = deps
  try {
    return await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Math.random()}`)
  } finally {
    delete globalThis[dependencyKey]
  }
}

function okUpstream(body = { ok: true }) {
  return {
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    body: null,
    text: async () => JSON.stringify(body),
  }
}

test("bounded reader rejects type, declared/streamed size, encoding, and malformed JSON", async () => {
  const missingType = requestFor({}, { contentType: "text/plain" })
  assert.equal((await boundary.readSineJson(missingType.request)).ok, false)
  assert.equal(missingType.readers(), 0)

  const declared = requestFor({ ok: true })
  declared.request.headers.set("content-length", "999")
  assert.equal((await boundary.readSineJson(declared.request, 20)).ok, false)
  assert.equal(declared.readers(), 0)

  const streamed = requestFor("x".repeat(40))
  assert.equal((await boundary.readSineJson(streamed.request, 20)).ok, false)
  assert.equal(streamed.readers(), 1)

  const compressed = requestFor({ ok: true })
  compressed.request.headers.set("content-encoding", "gzip")
  assert.equal((await boundary.readSineJson(compressed.request)).ok, false)
  assert.equal(compressed.readers(), 0)
  assert.equal((await boundary.readSineJson(requestFor("{").request)).ok, false)
})

test("same-origin boundary rejects missing, opaque, path-bearing, and cross-origin origins", () => {
  const request = { url: "http://127.0.0.1:8012/api/sine" }
  for (const origin of [null, "null", "not a url", "http://127.0.0.1:8012/path", "https://example.invalid"]) {
    assert.equal(boundary.requireSineSameOrigin({ ...request, headers: { get: () => origin } }).ok, false)
  }
  assert.equal(boundary.requireSineSameOrigin({
    ...request,
    headers: { get: () => "http://127.0.0.1:8012" },
  }).ok, true)
})

test("analysis query is allowlisted and the evidence truth policy cannot be weakened", () => {
  const result = boundary.buildSineAnalysisQuery("http://127.0.0.1/api?start_sec=2&end_sec=4&windowed=true&window_source=selected_region")
  assert.equal(result.ok, true)
  const output = new URLSearchParams(result.value)
  assert.equal(output.get("require_real_audio"), "true")
  assert.equal(output.get("semantic_fallback"), "false")
  assert.equal(output.get("llm_fallback"), "false")
  assert.equal(boundary.buildSineAnalysisQuery("http://127.0.0.1/api?llm_fallback=true").ok, false)
  assert.equal(boundary.buildSineAnalysisQuery("http://127.0.0.1/api?semantic_fallback=true").ok, false)
  assert.equal(boundary.buildSineAnalysisQuery("http://127.0.0.1/api?admin=true").ok, false)
  assert.equal(boundary.buildSineAnalysisQuery("http://127.0.0.1/api?start_sec=4&end_sec=2").ok, false)
})

test("analysis submission requires exact identity and replaces caller contract overrides", () => {
  const result = boundary.validateSineAnalysisSubmission(validAnalysis(), BLOB_ID)
  assert.equal(result.ok, true)
  assert.equal(result.value.blob_id, BLOB_ID)
  assert.equal(result.value.file_context.source_id, "field-recorder-catalog")
  assert.equal(result.value.file_context.device_id, "hydrophone-7")
  assert.equal(result.value.file_context.observed_at, "2026-09-02T18:00:00.000Z")
  assert.equal(result.value.evidence_contract.allow_llm_semantic_fallback, false)
  assert.equal(result.value.evidence_contract.allow_mock_or_synthetic_outputs, false)
  assert.equal(result.value.sine_request.require_model_provenance, true)
  assert.equal(boundary.validateSineAnalysisSubmission(validAnalysis({ blob_id: OTHER_BLOB_ID }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineAnalysisSubmission(validAnalysis({ extra: true }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineAnalysisSubmission(validAnalysis({ start_sec: 1, end_sec: null }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineAnalysisSubmission(validAnalysis({ mode: "windowed" }), BLOB_ID).ok, false)

  const windowed = boundary.validateSineAnalysisSubmission(validAnalysis({
    mode: "selected_region",
    start_sec: 2,
    end_sec: 4,
    window_source: "selected_region",
    windowed: true,
  }), BLOB_ID)
  assert.equal(windowed.ok, true)
  const query = boundary.buildSineAnalysisQuery(
    "http://127.0.0.1/api?start_sec=2&end_sec=4&windowed=true&window_source=selected_region",
  )
  assert.equal(query.ok, true)
  assert.equal(boundary.reconcileSineAnalysisRequest(query.value, windowed.value).ok, true)
  assert.equal(boundary.reconcileSineAnalysisRequest(query.value, validAnalysis()).ok, false)
})

test("human review preserves exact source, device, time, run, and model provenance", () => {
  const result = boundary.validateSineHumanIdentification(validHuman(), BLOB_ID)
  assert.equal(result.ok, true)
  assert.equal(result.value.human_notes, validHuman().human_notes)
  assert.equal(result.value.analysis_run_id, RUN_ID)
  assert.deepEqual(result.value.model_summary, validHuman().model_summary)
  assert.equal(result.value.file_context.source_id, "field-recorder-catalog")
  assert.equal(result.value.file_context.device_id, "hydrophone-7")
  assert.equal(result.value.file_context.observed_at, "2026-09-02T18:00:00.000Z")
  assert.equal(boundary.validateSineHumanIdentification(validHuman({ blob_id: OTHER_BLOB_ID }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineHumanIdentification(validHuman({ human_confidence: 2 }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineHumanIdentification(validHuman({ model_summary: { score: Number.NaN } }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineHumanIdentification({ ...validHuman(), created_by: "spoofed" }, BLOB_ID).ok, false)
})

test("wave annotation validates exact regions and marker time without clamping", () => {
  const result = boundary.validateSineWaveAnnotation(validWave(), BLOB_ID)
  assert.equal(result.ok, true)
  assert.deepEqual(result.value.markers, validWave().markers)
  assert.equal(result.value.file_context.source_id, "field-recorder-catalog")
  assert.equal(boundary.validateSineWaveAnnotation(validWave({ markers: [{ id: "m", time_sec: 31, label: "late" }] }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineWaveAnnotation(validWave({ selection: { start_sec: 4, end_sec: 2 } }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineWaveAnnotation(validWave({ selection: null, markers: [], scope: null }), BLOB_ID).ok, false)
  assert.equal(boundary.validateSineWaveAnnotation({ ...validWave(), created_by: "spoofed" }, BLOB_ID).ok, false)
})

test("all SINE handlers authenticate before input parsing or credentialed upstream work", () => {
  for (const [name, source] of routeSources) {
    for (const marker of ["export async function POST", ...(name === "analyze" ? [] : ["export async function GET"])]) {
      const start = source.indexOf(marker)
      const nextExport = source.indexOf("export async function", start + marker.length)
      const handler = source.slice(start, nextExport < 0 ? undefined : nextExport)
      const gate = handler.indexOf("await requireOwner()")
      const input = Math.min(...[handler.indexOf("readSineJson(request)"), handler.indexOf("readSineBlobQuery(request.url")].filter((index) => index >= 0))
      const upstream = handler.indexOf("fetchMindexWithAuthRetry(")
      assert.ok(gate >= 0, `${name} ${marker} lacks owner auth`)
      assert.ok(input > gate, `${name} ${marker} reads input before owner auth`)
      if (upstream >= 0) assert.ok(upstream > input, `${name} ${marker} reaches upstream before validation`)
    }
  }
})

test("anonymous POST denial reads no body and reaches no credentialed upstream", async () => {
  let upstreamCalls = 0
  const denial = { status: 401 }
  for (const name of routeSources.keys()) {
    const module = await loadRoute(name, routeDeps(async () => ({ error: denial }), async () => {
      upstreamCalls += 1
      throw new Error("anonymous request reached upstream")
    }))
    const fixture = requestFor(name === "analyze" ? validAnalysis() : name === "human" ? validHuman() : validWave())
    const response = name === "analyze"
      ? await module.POST(fixture.request, { params: Promise.resolve({ id: BLOB_ID }) })
      : await module.POST(fixture.request)
    assert.equal(response, denial)
    assert.equal(fixture.readers(), 0, `${name} read an anonymous body`)
  }
  assert.equal(upstreamCalls, 0)
})

test("cross-origin and malformed authorized writes stop before upstream", async () => {
  let upstreamCalls = 0
  const owner = async () => ({ user: { email: "owner@mycosoft.org", isOwner: true } })
  for (const name of routeSources.keys()) {
    const module = await loadRoute(name, routeDeps(owner, async () => {
      upstreamCalls += 1
      throw new Error("invalid request reached upstream")
    }))
    const payload = name === "analyze" ? validAnalysis() : name === "human" ? validHuman() : validWave()
    const crossOrigin = requestFor(payload, { origin: "https://example.invalid" })
    const denied = name === "analyze"
      ? await module.POST(crossOrigin.request, { params: Promise.resolve({ id: BLOB_ID }) })
      : await module.POST(crossOrigin.request)
    assert.equal(denied.status, 403)
    assert.equal(crossOrigin.readers(), 0)

    const malformed = requestFor("{")
    const rejected = name === "analyze"
      ? await module.POST(malformed.request, { params: Promise.resolve({ id: BLOB_ID }) })
      : await module.POST(malformed.request)
    assert.equal(rejected.status, 400)

    if (name === "analyze") {
      const mismatched = requestFor(validAnalysis(), {
        url: `http://127.0.0.1:8012/api/mindex/sine/blobs/${BLOB_ID}/analyze?start_sec=2&end_sec=4&windowed=true&window_source=selected_region`,
      })
      const mismatchResponse = await module.POST(mismatched.request, {
        params: Promise.resolve({ id: BLOB_ID }),
      })
      assert.equal(mismatchResponse.status, 400)
    }
  }
  assert.equal(upstreamCalls, 0)
})

test("successful routes forward only validated payloads and authenticated authorship", async () => {
  const owner = async () => ({ user: { email: "owner@mycosoft.org", isOwner: true } })
  const calls = []
  const fetcher = async (url, init = {}) => {
    calls.push({ url, init })
    return okUpstream()
  }

  const analyze = await loadRoute("analyze", routeDeps(owner, fetcher))
  const analyzeRequest = requestFor(validAnalysis(), {
    url: `http://127.0.0.1:8012/api/mindex/sine/blobs/${BLOB_ID}/analyze?llm_fallback=false`,
  })
  assert.equal((await analyze.POST(analyzeRequest.request, { params: Promise.resolve({ id: BLOB_ID }) })).status, 200)
  const analysisBody = JSON.parse(calls.at(-1).init.body)
  assert.equal(analysisBody.evidence_contract.allow_llm_semantic_fallback, false)
  assert.match(calls.at(-1).url, /require_real_audio=true/)

  const human = await loadRoute("human", routeDeps(owner, fetcher))
  assert.equal((await human.POST(requestFor(validHuman()).request)).status, 200)
  const humanBody = JSON.parse(calls.at(-1).init.body)
  assert.equal(humanBody.created_by, "owner@mycosoft.org")
  assert.equal(humanBody.human_notes, validHuman().human_notes)
  assert.deepEqual(humanBody.model_summary, validHuman().model_summary)

  const wave = await loadRoute("wave", routeDeps(owner, fetcher))
  assert.equal((await wave.POST(requestFor(validWave()).request)).status, 200)
  const waveBody = JSON.parse(calls.at(-1).init.body)
  assert.equal(waveBody.created_by, "owner@mycosoft.org")
  assert.deepEqual(waveBody.markers, validWave().markers)
})

test("anonymous annotation reads reach neither query parsing nor MINDEX", async () => {
  let upstreamCalls = 0
  const denial = { status: 401 }
  for (const name of ["human", "wave"]) {
    const module = await loadRoute(name, routeDeps(async () => ({ error: denial }), async () => {
      upstreamCalls += 1
      throw new Error("anonymous GET reached upstream")
    }))
    const response = await module.GET({
      url: "not a valid URL",
      headers: new Headers(),
      body: null,
    })
    assert.equal(response, denial)
  }
  assert.equal(upstreamCalls, 0)
})
