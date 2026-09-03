import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseFciEvidenceImport } from "../evidence-import.mjs"
import {
  FUNGI_LIVE_SAMPLE_SCHEMA,
  isNlmAnalysisContractBound,
  resolveFungiEvidenceMode,
  resolveRequestedFungiDevice,
  validateFungiLiveEvidence,
} from "../evidence-mode.mjs"
import { parseNlmEngineStatus } from "../nlm-engine.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const hostRoot = join(here, "..", "..", "..", "..", "..")

test("accepts finite, labeled local evidence without inventing events", () => {
  const evidence = parseFciEvidenceImport({ deviceId: "bench-01", sampleRate: 10, channels: [{ channel: 2, samples: [1, 2, "bad", 3] }] })
  assert.equal(evidence.deviceId, "bench-01")
  assert.deepEqual(evidence.buffers[0].samples, [1, 2, 3])
  assert.deepEqual(evidence.events, [])
})

test("rejects evidence without usable channel samples", () => {
  assert.throws(() => parseFciEvidenceImport({ sampleRate: 10, channels: [{ samples: [] }] }), /No channel/)
})

test("normalizes the deployed completed NLM contract", () => {
  const status = parseNlmEngineStatus({ engine: { state: "available", health: "healthy", ready: true }, training: { state: "completed", progress: 100, epoch: 100 } })
  assert.equal(status.state, "verified")
  assert.equal(status.engine, "healthy")
  assert.equal(status.training, "completed")
})

test("does not promote a reachable but unready engine", () => {
  const status = parseNlmEngineStatus({ engine: { state: "available", health: "healthy", ready: false }, training: { state: "training", progress: 50 } })
  assert.equal(status.state, "unavailable")
  assert.equal(status.engine, "degraded")
})

test("MAS event 404 is unavailable rather than verified empty", () => {
  const route = readFileSync(join(hostRoot, "app", "api", "fci", "events", "route.ts"), "utf8")
  assert.match(route, /NextResponse\.json\(unavailableFciRead\(/)
  assert.match(route, /requireOwner/)
  assert.doesNotMatch(route, /\/api\/fci\/events\/correlate/)
  assert.doesNotMatch(route, /Return empty events list if endpoint doesn't exist/)
})

test("Fusarium surfaces GET-only NLM status without an inference call", () => {
  const card = readFileSync(join(hostRoot, "components", "fusarium", "fci", "nlm-engine-status.tsx"), "utf8")
  assert.match(card, /fetch\("\/api\/fusarium\/nlm\/status"/)
  assert.doesNotMatch(card, /method:\s*["']POST/)
})

const evaluationTime = "2026-09-02T12:00:10.000Z"
const observationTime = "2026-09-02T12:00:05.000Z"

function verifiedBuffer(overrides = {}) {
  return {
    schemaVersion: FUNGI_LIVE_SAMPLE_SCHEMA,
    deviceId: "fci-alpha",
    channel: 0,
    samples: [0.25, -0.5, 0.75],
    timestamps: [
      Date.parse(observationTime) - 200,
      Date.parse(observationTime) - 100,
      Date.parse(observationTime),
    ],
    sampleRate: 10,
    unit: "µV",
    observedAt: observationTime,
    provenance: {
      sourceRef: "mindex:fci/readings",
      sourceRecordId: "reading-alpha-001",
      receivedAt: "2026-09-02T12:00:06.000Z",
    },
    ...overrides,
  }
}

test("an open transport and registry identity do not become LIVE without samples", () => {
  const result = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [],
    evaluatedAt: evaluationTime,
  })
  assert.equal(result.state, "unavailable")
  assert.equal(resolveFungiEvidenceMode({ deviceId: "fci-alpha", liveEvidenceState: result.state }), "unavailable")
  assert.match(result.reasons.join(" "), /No provider-authored sample buffers/)
})

test("client-stamped hook buffers are withheld without schema, unit, observed time, and provenance", () => {
  const result = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [{
      deviceId: "fci-alpha",
      channel: 0,
      samples: [1, 2],
      timestamps: [Date.parse(observationTime) - 100, Date.parse(observationTime)],
      sampleRate: 10,
    }],
    evaluatedAt: evaluationTime,
  })
  assert.equal(result.state, "unavailable")
  assert.deepEqual(result.buffers, [])
  assert.match(result.reasons.join(" "), /schemaVersion/)
  assert.match(result.reasons.join(" "), /unit/)
  assert.match(result.reasons.join(" "), /provenance/)
})

test("only fresh provider-authored samples for the exact unique device become LIVE", () => {
  const result = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha", "fci-beta"],
    transportConnected: true,
    buffers: [verifiedBuffer()],
    evaluatedAt: evaluationTime,
  })
  assert.equal(result.state, "verified")
  assert.equal(result.mode, "live")
  assert.equal(result.unit, "µV")
  assert.equal(result.buffers.length, 1)
  assert.equal(resolveFungiEvidenceMode({ deviceId: "fci-alpha", liveEvidenceState: result.state }), "live")
})

test("mismatched, ambiguous, or stale device evidence fails closed", () => {
  const mismatch = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [verifiedBuffer({ deviceId: "fci-beta" })],
    evaluatedAt: evaluationTime,
  })
  assert.equal(mismatch.state, "unavailable")

  const ambiguous = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha", "fci-alpha"],
    transportConnected: true,
    buffers: [verifiedBuffer()],
    evaluatedAt: evaluationTime,
  })
  assert.equal(ambiguous.state, "unavailable")

  const stale = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T11:58:59.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [verifiedBuffer({
      observedAt: "2026-09-02T11:59:00.000Z",
      timestamps: [Date.parse("2026-09-02T11:59:00.000Z")],
      samples: [0.1],
      provenance: {
        sourceRef: "mindex:fci/readings",
        sourceRecordId: "reading-alpha-old",
        receivedAt: "2026-09-02T11:59:01.000Z",
      },
    })],
    evaluatedAt: evaluationTime,
  })
  assert.equal(stale.state, "stale")
  assert.equal(resolveFungiEvidenceMode({ deviceId: "fci-alpha", liveEvidenceState: stale.state }), "stale")
})

test("samples from a prior selected-device session cannot survive a device switch", () => {
  const priorSession = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:06.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [verifiedBuffer()],
    evaluatedAt: evaluationTime,
  })

  assert.equal(priorSession.state, "unavailable")
  assert.deepEqual(priorSession.buffers, [])
  assert.match(priorSession.reasons.join(" "), /predates the current selected-device session/)

  const mixedPriorSamples = validateFungiLiveEvidence({
    selectedDeviceId: "fci-alpha",
    selectionStartedAt: "2026-09-02T12:00:04.000Z",
    registeredDeviceIds: ["fci-alpha"],
    transportConnected: true,
    buffers: [verifiedBuffer({
      timestamps: [
        Date.parse("2026-09-02T12:00:03.000Z"),
        Date.parse("2026-09-02T12:00:04.500Z"),
        Date.parse(observationTime),
      ],
    })],
    evaluatedAt: evaluationTime,
  })

  assert.equal(mixedPriorSamples.state, "unavailable")
  assert.match(mixedPriorSamples.reasons.join(" "), /samples from before the current selected-device session/)
})

test("device query handoff requires one exact case-sensitive inventory identity", () => {
  const devices = [{ id: "fci-alpha" }, { id: "fci-beta" }]
  assert.deepEqual(resolveRequestedFungiDevice("fci-alpha", devices), { state: "matched", deviceId: "fci-alpha" })
  assert.deepEqual(resolveRequestedFungiDevice("FCI-ALPHA", devices), { state: "missing", deviceId: null })
  assert.deepEqual(resolveRequestedFungiDevice(null, devices), { state: "unbound", deviceId: null })
  assert.deepEqual(resolveRequestedFungiDevice("fci-alpha", [...devices, { id: "fci-alpha" }]), { state: "missing", deviceId: null })
})

test("device-bound NLM evidence requires exact identity, provenance, and freshness", () => {
  const record = {
    deviceId: "fci-alpha",
    timestamp: observationTime,
    provenance: { sourceRef: "mas:fci-analysis", sourceRecordId: "analysis-001" },
    growthPhase: "unknown",
    bioactivityPredictions: [],
    environmentalCorrelations: [],
    recommendations: [],
  }
  assert.equal(isNlmAnalysisContractBound(record, "fci-alpha", evaluationTime), true)
  assert.equal(isNlmAnalysisContractBound({ ...record, provenance: null }, "fci-alpha", evaluationTime), false)
  assert.equal(isNlmAnalysisContractBound({ ...record, deviceId: "fci-beta" }, "fci-alpha", evaluationTime), false)
  assert.equal(isNlmAnalysisContractBound({ ...record, timestamp: "2026-09-02T11:00:00.000Z" }, "fci-alpha", evaluationTime), false)
})

test("Fusarium Fungi Compute does not auto-select or expose device command controls", () => {
  const dashboard = readFileSync(join(hostRoot, "components", "fusarium", "twins", "fungi-compute", "truthful-dashboard.tsx"), "utf8")
  assert.match(dashboard, /useSearchParams/)
  assert.match(dashboard, /resolveRequestedFungiDevice/)
  assert.match(dashboard, /READ ONLY/)
  assert.doesNotMatch(dashboard, /devices\[0\]/)
  assert.doesNotMatch(dashboard, /<ControlPanel/)
  assert.doesNotMatch(dashboard, /<StimulationPanel/)
  assert.doesNotMatch(dashboard, /sendStimulation/)
})
