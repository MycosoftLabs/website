import assert from "node:assert/strict"
import test, { after } from "node:test"

import { cleanupCompiledModules, loadDataFusionModules } from "./transpile-harness.mjs"

after(cleanupCompiledModules)

const { deepLinks, scenario, provider } = await loadDataFusionModules()
const { DEFAULT_FUSION_CONTEXT } = deepLinks
const { applyScenarioDisposition, buildSanitizedFusionScenario } = scenario
const { buildOperationalSnapshot, buildReplaySnapshot } = provider

const RECEIVED_AT = "2026-09-01T20:00:00.000Z"
const COLLECTIONS = [
  "sources",
  "coverage",
  "observations",
  "objects",
  "relationships",
  "evidence",
  "reviews",
  "activity",
]

function outcome(endpoint, payload, options = {}) {
  const status = options.status ?? 200
  const ok = options.ok ?? (status >= 200 && status < 300)
  return {
    endpoint,
    ok,
    status,
    receivedAt: RECEIVED_AT,
    payload,
    error: options.error ?? (ok ? null : `HTTP ${status}`),
    schemaValid: options.schemaValid ?? (ok ? true : null),
  }
}

function page(items = []) {
  return {
    items,
    page: { limit: 200, nextCursor: null, hasMore: false },
  }
}

function readinessComponent(id, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    state: "verified",
    configured: true,
    verified: true,
    required: true,
    checkedAt: RECEIVED_AT,
    lastSuccessAt: RECEIVED_AT,
    dataMode: "live",
    detail: "Validated readiness fixture.",
    ...overrides,
  }
}

function validReadiness(overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    schemaRef: "fusarium-intelligence/v1",
    status: "ready",
    service: "fusarium-intelligence",
    version: "1.0.0",
    checkedAt: RECEIVED_AT,
    bindExposure: readinessComponent("runtime:bind", { state: "configured", verified: false }),
    identity: readinessComponent("identity:operator", {
      state: "configured",
      verified: false,
      dataMode: "unavailable",
    }),
    storage: readinessComponent("storage:sqlite"),
    backup: readinessComponent("storage:backup", {
      state: "unconfigured",
      configured: false,
      verified: false,
      required: false,
      lastSuccessAt: null,
      dataMode: "unavailable",
    }),
    migrations: {
      state: "verified",
      currentVersion: 7,
      targetVersion: 7,
      pending: [],
      checkedAt: RECEIVED_AT,
    },
    sourceReachability: [],
    connectorAuthorization: [],
    staging: readinessComponent("environment:staging", {
      state: "unconfigured",
      configured: false,
      verified: false,
      required: false,
      lastSuccessAt: null,
      dataMode: "unavailable",
    }),
    identityMode: "development_header_unverified",
    developmentIdentity: true,
    demoEnabled: true,
    ...overrides,
  }
}

function validEmptyOutcomes() {
  return {
    readiness: outcome("/api/fusarium/v1/readiness", validReadiness()),
    contexts: outcome("/api/fusarium/v1/contexts", page()),
    fusionRuns: outcome("/api/fusarium/v1/fusion-runs", page()),
    narratives: outcome("/api/fusarium/v1/narrative-versions", page()),
    ...Object.fromEntries(
      COLLECTIONS.map((name) => [name, outcome(`/api/fusarium/v1/${name}`, page())]),
    ),
  }
}

function coverageRecord(sourceId, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id: `coverage-${sourceId}`,
    namespace: "operational",
    missionId: "runtime-unscoped",
    missionAreaId: "runtime-unscoped",
    sourceId,
    domain: "water",
    timeRange: {
      start: "2026-08-31T20:00:00.000Z",
      end: RECEIVED_AT,
    },
    state: "empty",
    gaps: [],
    sourceState: "live",
    freshness: {
      observedAt: RECEIVED_AT,
      receivedAt: RECEIVED_AT,
      state: "fresh",
      basis: "source_timestamp",
      staleAfterSeconds: 300,
    },
    dataMode: "live",
    synthetic: false,
    revision: 1,
    ...overrides,
  }
}

function failedOutcomes(status) {
  return {
    readiness: outcome("/api/fusarium/v1/readiness", null, { status }),
    contexts: outcome("/api/fusarium/v1/contexts", null, { status }),
    fusionRuns: outcome("/api/fusarium/v1/fusion-runs", null, { status }),
    narratives: outcome("/api/fusarium/v1/narrative-versions", null, { status }),
    ...Object.fromEntries(
      COLLECTIONS.map((name) => [
        name,
        outcome(`/api/fusarium/v1/${name}`, null, { status }),
      ]),
    ),
  }
}

test("operational snapshots distinguish unavailable, valid empty, unauthorized, and invalid schema", () => {
  const unavailable = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    failedOutcomes(503),
    RECEIVED_AT,
  )
  assert.equal(unavailable.condition, "unavailable")
  assert.equal(unavailable.sourceTruth[0].endpointReachability, "degraded")
  assert.equal(unavailable.sourceTruth[0].dataPresence, "unknown")
  assert.match(unavailable.note, /No values were estimated/i)

  const empty = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    validEmptyOutcomes(),
    RECEIVED_AT,
  )
  assert.equal(empty.condition, "empty")
  assert.equal(empty.sourceTruth[0].endpointReachability, "reachable")
  assert.equal(empty.sourceTruth[0].schemaValidity, "valid")
  assert.equal(empty.sourceTruth[0].recordCount, 0)
  assert.equal(empty.sourceTruth[0].dataPresence, "empty")
  assert.match(empty.note, /does not mean the environment was measured and clear/i)

  const unauthorized = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    failedOutcomes(401),
    RECEIVED_AT,
  )
  assert.equal(unauthorized.condition, "unauthorized")
  assert.equal(unauthorized.sourceTruth[0].endpointReachability, "unauthorized")
  assert.equal(unauthorized.sourceTruth[0].identityVerification, "rejected")

  const schemaInvalidOutcomes = validEmptyOutcomes()
  schemaInvalidOutcomes.sources = outcome(
    "/api/fusarium/v1/sources",
    { unexpected: true },
    {
      schemaValid: false,
      error: "HTTP 200: response schema did not match the expected v1 envelope.",
    },
  )
  const schemaInvalid = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    schemaInvalidOutcomes,
    RECEIVED_AT,
  )
  assert.equal(schemaInvalid.condition, "degraded")
  assert.equal(schemaInvalid.sourceTruth[0].endpointReachability, "reachable")
  assert.equal(schemaInvalid.sourceTruth[0].schemaValidity, "invalid")
  assert.equal(schemaInvalid.sourceTruth[0].dataPresence, "unknown")
})

test("a validly empty fusion-run resource keeps run, model, contribution, and conflict states explicit", () => {
  const snapshot = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    validEmptyOutcomes(),
    RECEIVED_AT,
  )
  const fusionRun = snapshot.nodes.find((node) => node.stage === "fusion_run")

  assert.ok(fusionRun)
  assert.equal(fusionRun.id, "gap-fusion-run")
  assert.equal(fusionRun.state, "unavailable")
  assert.equal(fusionRun.synthetic, false)
  assert.equal(snapshot.model.state, "unavailable")
  assert.equal(snapshot.model.name, null)
  assert.equal(snapshot.model.version, null)
  assert.equal(snapshot.model.synthetic, false)
  assert.deepEqual(snapshot.runs, [])
  assert.deepEqual(snapshot.contributions, [])
  assert.deepEqual(snapshot.conflicts, [])
  assert.ok(snapshot.gaps.some((gap) => /fusion-run capability is bound.*no run.*scoped/i.test(gap)))
})

test("operational zero-count sources stay empty while measured absence is scenario-only", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.sources = outcome(
    "/api/fusarium/v1/sources",
    page([
      {
        classification: "UNCLASSIFIED",
        id: "source-zero",
        namespace: "operational",
        label: "Completed source query",
        sourceType: "sensor",
        state: "live",
        configured: true,
        verified: true,
        live: true,
        endpointRef: "/api/fusarium/v1/sources/source-zero",
        observedAt: RECEIVED_AT,
        receivedAt: RECEIVED_AT,
        lastSuccessAt: RECEIVED_AT,
        staleAfterSeconds: 300,
        recordCount: 0,
        dataMode: "live",
        synthetic: false,
        reason: "The collection returned no records.",
        revision: 1,
      },
    ]),
  )
  outcomes.coverage = outcome(
    "/api/fusarium/v1/coverage",
    page([coverageRecord("source-zero")]),
  )

  const operational = buildOperationalSnapshot(
    DEFAULT_FUSION_CONTEXT,
    outcomes,
    RECEIVED_AT,
  )
  assert.equal(operational.sourceTruth[0].dataPresence, "empty")
  assert.ok(operational.sourceTruth.every((source) => source.dataPresence !== "measured_absence"))

  const simulated = buildSanitizedFusionScenario(DEFAULT_FUSION_CONTEXT)
  const measuredAbsence = simulated.sourceTruth.filter(
    (source) => source.dataPresence === "measured_absence",
  )
  assert.equal(measuredAbsence.length, 1)
  assert.equal(measuredAbsence[0].id, "sim-source-mechanical-07")
  assert.equal(measuredAbsence[0].synthetic, true)
})

test("the sanitized scenario marks every operational-looking artifact synthetic", () => {
  const snapshot = buildSanitizedFusionScenario(DEFAULT_FUSION_CONTEXT)
  const artifactCollections = [
    snapshot.sourceTruth,
    snapshot.coverage,
    snapshot.nodes,
    snapshot.edges,
    snapshot.correlations,
    snapshot.conflicts,
    snapshot.lateMissing,
    snapshot.contributions,
    snapshot.runs,
    snapshot.timeline,
  ]

  assert.equal(snapshot.condition, "simulated")
  assert.equal(snapshot.context.mode, "simulated")
  assert.equal(snapshot.identityMode, "simulated")
  assert.equal(snapshot.model.synthetic, true)
  assert.equal(snapshot.model.state, "simulated")
  assert.ok(artifactCollections.every((items) => Array.isArray(items) && items.length > 0))
  assert.ok(artifactCollections.flat().every((artifact) => artifact.synthetic === true))
  assert.ok(snapshot.nodes.every((node) => node.dataMode === "simulated"))
  assert.deepEqual(
    snapshot.coverage.map((item) => item.modality),
    ["spectral", "acoustic", "bioelectric", "thermal", "chemical", "mechanical"],
  )
  assert.match(snapshot.note, /does not augment, replace, or imply operational environmental state/i)
})

test("replay exposes append-only activity without reconstructing environmental or fusion state", () => {
  const context = { ...DEFAULT_FUSION_CONTEXT, mode: "replay" }
  const readiness = outcome("/api/fusarium/v1/readiness", {
    status: "ready",
    identityMode: "development_header_unverified",
  })
  const replay = outcome("/api/fusarium/v1/replay", {
    items: [
      {
        id: "activity-42",
        actionType: "observation_recorded",
        actorId: "local.operator",
        occurredAt: "2026-09-01T19:42:00.000Z",
        sequence: 42,
        objectIds: ["object-recorded-7"],
        evidenceIds: ["evidence-recorded-9"],
      },
    ],
    page: { limit: 200, nextCursor: null },
    query: { missionId: context.missionId },
  })

  const snapshot = buildReplaySnapshot(context, readiness, replay)
  const activityNodes = snapshot.nodes.filter((node) => node.id.startsWith("replay:"))
  const fusionRun = snapshot.nodes.find((node) => node.stage === "fusion_run")

  assert.equal(snapshot.condition, "replay")
  assert.equal(activityNodes.length, 1)
  assert.equal(activityNodes[0].stage, "observation")
  assert.equal(activityNodes[0].dataMode, "replay")
  assert.deepEqual(activityNodes[0].objectIds, ["object-recorded-7"])
  assert.deepEqual(activityNodes[0].evidenceIds, ["evidence-recorded-9"])
  assert.ok(fusionRun)
  assert.equal(fusionRun.state, "unavailable")
  assert.deepEqual(snapshot.edges, [])
  assert.equal(snapshot.runs, null)
  assert.equal(snapshot.model.state, "unavailable")
  assert.ok(snapshot.timeline.every((event) => event.state === "replay"))
  assert.ok(snapshot.timeline.every((event) => event.synthetic === false))
  assert.match(snapshot.note, /append-only activity.*not mixed/i)
})

test("scenario accept, reject, and reset dispositions remain local-only", () => {
  const initial = buildSanitizedFusionScenario(DEFAULT_FUSION_CONTEXT)
  const reviewNodeIds = new Set([
    "sim-change-drainage-response",
    "sim-assessment-drainage-review",
  ])

  const accepted = applyScenarioDisposition(initial, "accepted")
  const acceptedNodes = accepted.nodes.filter((node) => reviewNodeIds.has(node.id))
  assert.ok(acceptedNodes.every((node) => node.state === "accepted"))
  assert.ok(acceptedNodes.every((node) => node.disposition?.state === "accepted"))
  assert.ok(acceptedNodes.every((node) => node.disposition?.localOnly === true))
  assert.ok(accepted.runs.every((run) => run.reviewState === "accepted"))
  assert.equal(
    accepted.nodes.find((node) => node.id === "sim-narrative-drainage-draft")?.state,
    "available",
  )
  assert.match(
    accepted.timeline.find((event) => event.id === "sim-time-local-disposition")?.detail ?? "",
    /not persisted or transmitted/i,
  )

  const rejected = applyScenarioDisposition(initial, "rejected")
  const rejectedNodes = rejected.nodes.filter((node) => reviewNodeIds.has(node.id))
  assert.ok(rejectedNodes.every((node) => node.state === "rejected"))
  assert.ok(rejectedNodes.every((node) => node.disposition?.state === "rejected"))
  assert.ok(rejectedNodes.every((node) => node.disposition?.localOnly === true))
  assert.ok(rejected.runs.every((run) => run.reviewState === "rejected"))
  assert.equal(
    rejected.nodes.find((node) => node.id === "sim-narrative-drainage-draft")?.state,
    "rejected",
  )

  const reset = applyScenarioDisposition(rejected, "pending")
  const resetNodes = reset.nodes.filter((node) => reviewNodeIds.has(node.id))
  assert.ok(resetNodes.every((node) => node.state === "pending"))
  assert.ok(resetNodes.every((node) => node.disposition?.state === "pending"))
  assert.ok(resetNodes.every((node) => node.disposition?.localOnly === true))
  assert.ok(resetNodes.every((node) => node.disposition?.judgment === null))
  assert.ok(reset.runs.every((run) => run.reviewState === "pending"))
  assert.equal(
    reset.nodes.find((node) => node.id === "sim-narrative-drainage-draft")?.state,
    "pending",
  )
  assert.equal(
    reset.timeline.some((event) => event.id === "sim-time-local-disposition"),
    false,
  )

  assert.ok(initial.nodes.filter((node) => reviewNodeIds.has(node.id)).every((node) => node.state === "pending"))
})
