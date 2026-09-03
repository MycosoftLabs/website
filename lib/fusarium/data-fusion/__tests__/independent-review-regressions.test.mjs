import assert from "node:assert/strict"
// Regression coverage for independent review findings.
import test, { after } from "node:test"

import { cleanupCompiledModules, loadDataFusionModules } from "./transpile-harness.mjs"

after(cleanupCompiledModules)

const { deepLinks, scenario, provider } = await loadDataFusionModules()
const {
  DEFAULT_FUSION_CONTEXT,
  buildFusionLink,
  parseFusionContext,
  restoreOperationalScopeAfterSimulation,
} = deepLinks
const { applyScenarioDisposition, buildSanitizedFusionScenario } = scenario
const { buildOperationalSnapshot, v1FusionProvider } = provider

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

function page(items = [], nextCursor = null) {
  return {
    items,
    page: { limit: 200, nextCursor, hasMore: nextCursor !== null },
  }
}

function validEmptyOutcomes() {
  return {
    readiness: outcome("/api/fusarium/v1/readiness", readinessBody()),
    contexts: outcome("/api/fusarium/v1/contexts", page()),
    fusionRuns: outcome("/api/fusarium/v1/fusion-runs", page()),
    narratives: outcome("/api/fusarium/v1/narrative-versions", page()),
    ...Object.fromEntries(
      COLLECTIONS.map((name) => [name, outcome(`/api/fusarium/v1/${name}`, page())]),
    ),
  }
}

function sourceRecord(id, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    label: `Source ${id}`,
    sourceType: "test sensor",
    endpointRef: `/sources/${id}`,
    state: "live",
    configured: true,
    verified: true,
    live: true,
    observedAt: RECEIVED_AT,
    receivedAt: RECEIVED_AT,
    lastSuccessAt: RECEIVED_AT,
    staleAfterSeconds: 300,
    recordCount: 1,
    dataMode: "live",
    synthetic: false,
    reason: "Regression fixture source record.",
    revision: 1,
    ...overrides,
  }
}

function observationRecord(id, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    missionAreaId: "area-review",
    sourceId: "source-review",
    sourceRecordId: `record-${id}`,
    sourceDeviceId: null,
    domain: "water",
    objectIds: [],
    evidenceIds: [],
    observedAt: "2026-09-01T19:45:00.000Z",
    receivedAt: "2026-09-01T19:45:05.000Z",
    payload: { summary: `Observation ${id}` },
    dataMode: "live",
    synthetic: false,
    revision: 1,
    ...overrides,
  }
}

function coverageRecord(sourceId, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id: `coverage-${sourceId}`,
    namespace: "operational",
    missionId: "mission-review",
    missionAreaId: "area-review",
    sourceId,
    domain: "water",
    timeRange: {
      start: "2026-09-01T19:00:00.000Z",
      end: RECEIVED_AT,
    },
    state: "unavailable",
    gaps: ["No live sample was observed."],
    sourceState: "configured",
    freshness: {
      observedAt: null,
      receivedAt: RECEIVED_AT,
      state: "unknown",
      basis: "unavailable",
      staleAfterSeconds: 300,
    },
    dataMode: "unavailable",
    synthetic: false,
    revision: 1,
    ...overrides,
  }
}

function relationshipRecord(id, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    fromObjectId: "object-a",
    toObjectId: "object-b",
    relationshipType: "hydrologic_association",
    label: "Pairwise hydrologic association",
    confidence: { score: 0.7, basis: "Explicit v1 relationship record." },
    evidenceIds: ["evidence-a"],
    dataMode: "live",
    synthetic: false,
    revision: 1,
    ...overrides,
  }
}

function objectRecord(id = "object-review", overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    missionAreaId: "area-review",
    objectType: "change",
    domain: "water",
    name: "Reviewed water change",
    summary: "Object explicitly scoped to the selected area.",
    temporalBounds: {
      start: "2026-09-01T19:30:00.000Z",
      end: "2026-09-01T19:50:00.000Z",
    },
    status: "watch",
    relationshipIds: [],
    changes: [],
    trend: "steady",
    missionConsequence: null,
    confidence: { score: 0.7, label: "moderate", basis: "Reviewed object fixture." },
    freshness: {
      observedAt: "2026-09-01T19:50:00.000Z",
      receivedAt: "2026-09-01T19:50:05.000Z",
      staleAfterSeconds: 300,
      state: "fresh",
      basis: "source_timestamp",
    },
    sourceIds: ["source-review"],
    evidenceIds: ["evidence-review"],
    provenanceRef: "/api/fusarium/v1/evidence/evidence-review",
    dataMode: "live",
    synthetic: false,
    revision: 1,
    ...overrides,
  }
}

function evidenceRecord(id = "evidence-review") {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    missionAreaId: "area-review",
    objectIds: ["object-review"],
    sourceId: "source-review",
    title: "Reviewed evidence",
    summary: "Evidence explicitly scoped to the selected area.",
    sourceRef: "/sources/source-review/records/record-review",
    lineage: {
      sourceRecordIds: ["record-review"],
      parentEvidenceIds: [],
      transformations: [],
    },
    observedAt: "2026-09-01T19:49:00.000Z",
    receivedAt: "2026-09-01T19:49:05.000Z",
    confidence: { score: 0.7, label: "moderate", basis: "Reviewed evidence fixture." },
    confidenceBasis: "Reviewed evidence fixture.",
    integrityState: "verified",
    verificationState: "verified",
    integrityRef: "sha256:reviewed",
    dataMode: "live",
    synthetic: false,
    revision: 1,
  }
}

function reviewRecord(id = "review-fusion-run", overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    kind: "environmental_judgment",
    state: "accepted",
    objectIds: ["object-review"],
    evidenceIds: ["evidence-review"],
    requestedBy: "operator-requester",
    assignedTo: "operator-reviewer",
    judgment: "Accepted for the selected mission area.",
    decidedBy: "operator-reviewer",
    decidedAt: "2026-09-01T19:44:00.000Z",
    dataMode: "live",
    synthetic: false,
    revision: 2,
    createdAt: "2026-09-01T19:35:00.000Z",
    updatedAt: "2026-09-01T19:44:00.000Z",
    ...overrides,
  }
}

function narrativeRecord(id = "narrative-version-review", overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    globalId: "22345678-1234-4234-8234-123456789abc",
    namespace: "operational",
    missionId: "mission-review",
    schemaRef: "fusarium-narrative-version-record/v1",
    narrativeId: "narrative-review",
    parentVersionId: null,
    ordinal: 1,
    stage: "approved_package",
    title: "Reviewed mission narrative",
    executiveSummary: "An immutable reviewed narrative tied to scoped evidence.",
    body: "Reviewed narrative body.",
    claims: [{
      id: "claim-review",
      text: "The reviewed object is in watch status.",
      objectIds: ["object-review"],
      evidenceIds: ["evidence-review"],
      confidence: { score: 0.7, label: "moderate", basis: "Reviewed narrative claim." },
      uncertainty: "One source family remains sparse.",
      caveats: ["Do not generalize beyond the selected area."],
      competingExplanations: [],
      changedSincePrevious: null,
      authoringBasis: "source_summary",
    }],
    caveats: [{
      id: "caveat-review",
      text: "Area-scoped conclusion only.",
      claimIds: ["claim-review"],
      evidenceIds: ["evidence-review"],
    }],
    authoredBy: "narrative-author",
    reviewId: "review-narrative",
    reviewRevision: 2,
    reviewedBy: "operator-reviewer",
    approvedBy: "operator-reviewer",
    immutable: true,
    dataMode: "live",
    synthetic: false,
    sourceTime: "2026-09-01T19:50:00.000Z",
    eventTime: "2026-09-01T19:55:00.000Z",
    receivedAt: "2026-09-01T19:55:02.000Z",
    revision: 1,
    createdAt: "2026-09-01T19:50:00.000Z",
    updatedAt: "2026-09-01T19:55:00.000Z",
    ...overrides,
  }
}

function missionContextRecord(id = "context-review", overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    namespace: "operational",
    missionId: "mission-review",
    missionAreaId: "area-review",
    missionAreaLabel: "Area review",
    timeRange: {
      start: "2026-09-01T19:00:00.000Z",
      end: "2026-09-01T20:00:00.000Z",
    },
    timeWindow: "24h",
    dataMode: "live",
    selectedObjectId: null,
    selectedEvidenceId: null,
    selectedSourceId: null,
    sourceApplication: "data-fusion",
    operatorId: "local.operator",
    operatorRole: "analyst",
    revision: 1,
    createdAt: "2026-09-01T19:00:00.000Z",
    updatedAt: RECEIVED_AT,
    ...overrides,
  }
}

function fusionRunRecord(id = "fusion-run-review", overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    globalId: "12345678-1234-4234-8234-123456789abc",
    namespace: "operational",
    missionId: "mission-review",
    schemaRef: "fusarium-fusion-run-record/v1",
    contextId: "context-review",
    state: "complete",
    timeRange: {
      start: "2026-09-01T19:30:00.000Z",
      end: "2026-09-01T19:40:00.000Z",
    },
    startedAt: "2026-09-01T19:30:00.000Z",
    completedAt: "2026-09-01T19:40:00.000Z",
    inputNodeIds: ["node-source"],
    outputNodeIds: ["node-product"],
    modelName: "Reviewed fusion model",
    modelVersion: "2.1",
    modelRefs: ["model-reviewed-2-1"],
    lineageNodes: [
      {
        id: "node-source",
        kind: "observation",
        label: "Bound source observation",
        sourceId: "source-review",
        artifactRef: "observation-review",
        sourceTime: "2026-09-01T19:30:00.000Z",
        eventTime: "2026-09-01T19:30:00.000Z",
        receivedAt: "2026-09-01T19:30:05.000Z",
      },
      {
        id: "node-product",
        kind: "environmental_object",
        label: "Bound fusion product",
        sourceId: null,
        artifactRef: "object-review",
        sourceTime: null,
        eventTime: "2026-09-01T19:40:00.000Z",
        receivedAt: "2026-09-01T19:40:01.000Z",
      },
    ],
    lineageEdges: [
      {
        id: "edge-source-product",
        upstreamNodeId: "node-source",
        downstreamNodeId: "node-product",
        relation: "derived_from",
        confidence: { score: 0.74, label: "moderate", basis: "Reviewed fixture edge." },
      },
    ],
    steps: [
      {
        id: "step-correlate",
        sequence: 1,
        name: "Correlate explicit inputs",
        state: "complete",
        detail: "Completed workflow step.",
        inputNodeIds: ["node-source"],
        outputNodeIds: ["node-product"],
        startedAt: "2026-09-01T19:31:00.000Z",
        completedAt: "2026-09-01T19:39:00.000Z",
        durationMs: 480000,
      },
    ],
    contributions: [
      {
        id: "contribution-source-review",
        sourceId: "source-review",
        modality: "chemical",
        summary: "Explicit source contribution.",
        inputNodeIds: ["node-source"],
        evidenceIds: ["evidence-review"],
        contributionScore: 0.63,
        confidence: { score: 0.7, label: "moderate", basis: "Reviewed contribution." },
      },
    ],
    conflicts: [
      {
        id: "conflict-review",
        fieldPath: "measurement.value",
        summary: "Two source values differ.",
        nodeIds: ["node-source", "node-product"],
        evidenceIds: ["evidence-review"],
        state: "acknowledged",
        resolution: null,
        confidence: { score: 0.6, label: "moderate", basis: "Reviewed conflict." },
      },
    ],
    inputCount: 1,
    outputCount: 1,
    confidence: 0.74,
    uncertainty: "One input family remains sparse.",
    reviewState: "accepted",
    reviewId: "review-fusion-run",
    reviewRevision: 2,
    reviewedBy: "operator-reviewer",
    reason: "Run completed against explicitly scoped records.",
    summary: "Reviewed operational fusion run",
    dataMode: "live",
    synthetic: false,
    sourceTime: "2026-09-01T19:30:00.000Z",
    eventTime: "2026-09-01T19:40:00.000Z",
    receivedAt: "2026-09-01T19:40:02.000Z",
    revision: 2,
    createdAt: "2026-09-01T19:30:00.000Z",
    updatedAt: "2026-09-01T19:45:00.000Z",
    ...overrides,
  }
}

function installFetch(t, responder) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const raw = typeof input === "string" ? input : input.url
    const url = new URL(raw, "http://local")
    const result = await responder(url, init)
    const status = result.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        return result.body
      },
    }
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
}

function readinessComponent(id, overrides = {}) {
  return {
    classification: "UNCLASSIFIED",
    id,
    state: "live",
    configured: true,
    verified: true,
    required: true,
    checkedAt: RECEIVED_AT,
    lastSuccessAt: RECEIVED_AT,
    dataMode: "live",
    detail: `Readiness fixture for ${id}.`,
    ...overrides,
  }
}

function readinessBody(status = "ready") {
  const development = status === "degraded"
  const notReady = status === "not_ready"
  return {
    classification: "UNCLASSIFIED",
    schemaRef: "fusarium-intelligence/v1",
    status,
    service: "fusarium-intelligence",
    version: "1.0.0",
    checkedAt: RECEIVED_AT,
    bindExposure: readinessComponent("runtime:bind", development ? {
      state: "configured",
      verified: false,
    } : {}),
    identity: readinessComponent("identity:operator", development ? {
      state: "configured",
      verified: false,
      dataMode: "unavailable",
    } : {}),
    storage: readinessComponent("storage:sqlite", notReady ? {
      state: "unreachable",
      verified: false,
      lastSuccessAt: null,
      dataMode: "unavailable",
    } : {}),
    backup: readinessComponent("storage:backup", {
      state: "unconfigured",
      configured: false,
      verified: false,
      required: false,
      lastSuccessAt: null,
      dataMode: "unavailable",
    }),
    migrations: {
      state: notReady ? "degraded" : "verified",
      currentVersion: notReady ? 6 : 7,
      targetVersion: 7,
      pending: notReady ? [7] : [],
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
    identityMode: development ? "development_header_unverified" : "verified_identity",
    developmentIdentity: development,
    demoEnabled: true,
  }
}

function activityRecord(id, sequence, occurredAt) {
  return {
    classification: "UNCLASSIFIED",
    id,
    sequence,
    namespace: "operational",
    missionId: "mission-review",
    missionContextId: "context-review",
    actorId: "local.operator",
    actorRole: "analyst",
    occurredAt,
    sourceTime: occurredAt,
    eventTime: occurredAt,
    receivedAt: occurredAt,
    actionType: "observation_recorded",
    objectIds: [],
    evidenceIds: [],
    beforeState: null,
    afterState: null,
    judgment: null,
    auditMetadata: {},
    idempotencyKey: null,
    dataMode: "recorded",
    appendOnly: true,
  }
}

test("malformed page children fail closed and degrade instead of creating available nodes", async (t) => {
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    return { body: page([{}]) }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    missionId: "mission-review",
    missionAreaId: "area-review",
  })

  assert.equal(snapshot.condition, "degraded")
  assert.ok(snapshot.nodes.every((node) => node.state === "unavailable"))
  assert.equal(snapshot.correlations, null)
  assert.deepEqual(snapshot.timeline, [])
  assert.equal(
    snapshot.nodes.some((node) =>
      ["observation-0", "object-0", "source-without-id"].includes(node.id) &&
      node.state === "available"),
    false,
  )
})

test("a configured-only source is not reported reachable and cannot assert data presence", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.sources = outcome(
    "/api/fusarium/v1/sources",
    page([
      sourceRecord("configured-only", {
        state: "configured",
        configured: true,
        verified: false,
        live: false,
        lastSuccessAt: null,
        recordCount: 4,
        dataMode: "unavailable",
      }),
    ]),
  )
  outcomes.coverage = outcome(
    "/api/fusarium/v1/coverage",
    page([coverageRecord("configured-only")]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )
  const truth = snapshot.sourceTruth.find((item) => item.id === "configured-only")
  const node = snapshot.nodes.find((item) => item.id === "source:configured-only")

  assert.ok(truth)
  assert.equal(truth.endpointReachability, "unknown")
  assert.equal(truth.dataPresence, "unknown")
  assert.ok(node)
  assert.equal(node.state, "unavailable")
})

test("degraded and unavailable record data modes are preserved as non-operational", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.observations = outcome(
    "/api/fusarium/v1/observations",
    page([
      observationRecord("observation-degraded", { dataMode: "degraded" }),
      observationRecord("observation-unavailable", { dataMode: "unavailable" }),
    ]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )
  const degraded = snapshot.nodes.find((node) => node.id === "observation:observation-degraded")
  const unavailable = snapshot.nodes.find((node) => node.id === "observation:observation-unavailable")

  assert.ok(degraded)
  assert.equal(degraded.dataMode, "degraded")
  assert.equal(degraded.state, "partial")
  assert.ok(unavailable)
  assert.equal(unavailable.dataMode, "unavailable")
  assert.equal(unavailable.state, "unavailable")
})

test("unavailable source mode overrides live flags, counts, and top-level readiness", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.sources = outcome(
    "/api/fusarium/v1/sources",
    page([sourceRecord("source-mode-unavailable", {
      state: "live",
      live: true,
      recordCount: 4,
      dataMode: "unavailable",
    })]),
  )
  outcomes.coverage = outcome(
    "/api/fusarium/v1/coverage",
    page([coverageRecord("source-mode-unavailable")]),
  )

  const snapshot = buildOperationalSnapshot(
    { ...DEFAULT_FUSION_CONTEXT, missionId: "mission-review", missionAreaId: "area-review" },
    outcomes,
    RECEIVED_AT,
  )
  const truth = snapshot.sourceTruth.find((item) => item.id === "source-mode-unavailable")
  const node = snapshot.nodes.find((item) => item.id === "source:source-mode-unavailable")

  assert.equal(snapshot.condition, "unavailable")
  assert.equal(truth?.endpointReachability, "unknown")
  assert.equal(truth?.freshness, "unknown")
  assert.equal(truth?.dataPresence, "unknown")
  assert.equal(node?.state, "unavailable")
  assert.equal(node?.dataMode, "unavailable")
})

test("pairwise environmental relationships are not promoted into fusion correlation groups", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.relationships = outcome(
    "/api/fusarium/v1/relationships",
    page([relationshipRecord("relationship-1")]),
  )

  const snapshot = buildOperationalSnapshot(DEFAULT_FUSION_CONTEXT, outcomes, RECEIVED_AT)

  assert.equal(snapshot.correlations, null)
  assert.ok(snapshot.gaps.some((gap) => /relationships are not promoted into correlation groups/i.test(gap)))
})

test("scenario accept, reject, and reset keep the candidate Status fact consistent", () => {
  const initial = buildSanitizedFusionScenario(DEFAULT_FUSION_CONTEXT)
  const statusOf = (snapshot) =>
    snapshot.nodes
      .find((node) => node.id === "sim-change-drainage-response")
      ?.facts.find((fact) => fact.label === "Status")?.value ?? ""

  const accepted = applyScenarioDisposition(initial, "accepted")
  assert.match(statusOf(accepted), /accepted/i)
  assert.doesNotMatch(statusOf(accepted), /not accepted/i)

  const rejected = applyScenarioDisposition(initial, "rejected")
  assert.match(statusOf(rejected), /rejected/i)

  const reset = applyScenarioDisposition(rejected, "pending")
  assert.match(statusOf(reset), /pending|candidate.*not accepted/i)
  assert.doesNotMatch(statusOf(reset), /rejected/i)
})

test("deep links emit both role spellings and a compatible legacy dataMode", () => {
  const expectedModes = {
    live: "system",
    replay: "replay",
    simulated: "demo",
  }

  for (const [mode, dataMode] of Object.entries(expectedModes)) {
    const context = {
      ...DEFAULT_FUSION_CONTEXT,
      mode,
      operatorRole: "analyst",
    }
    const url = new URL(buildFusionLink("oeiNarrative", context), "http://local")
    assert.equal(url.searchParams.get("operatorRole"), "analyst")
    assert.equal(url.searchParams.get("role"), "analyst")
    assert.equal(url.searchParams.get("dataMode"), dataMode)
  }
})

test("live provider applies the selected area and sends the bounded time window", async (t) => {
  const requested = []
  // Keep the fixture inside the requested rolling window regardless of when
  // this regression suite is run. A fixed September timestamp made this test
  // expire as wall-clock time advanced even though the provider was correct.
  const observedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  installFetch(t, (url) => {
    requested.push(url)
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) {
      return { body: page([missionContextRecord("context-selected", { missionAreaId: "area-selected" })]) }
    }
    if (url.pathname.endsWith("/observations")) {
      return {
        body: page([
          observationRecord("observation-in-area", { missionAreaId: "area-selected", observedAt }),
          observationRecord("observation-other-area", { missionAreaId: "area-other", observedAt }),
        ]),
      }
    }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    missionId: "mission-review",
    missionAreaId: "area-selected",
    timeWindow: "6h",
    mode: "live",
  })

  const observationIds = snapshot.nodes
    .filter((node) => node.stage === "observation" && node.state !== "unavailable")
    .map((node) => node.id)
  assert.deepEqual(observationIds, ["observation:observation-in-area"])

  for (const collection of ["observations", "evidence", "activity"]) {
    const url = requested.find((item) => item.pathname.endsWith(`/${collection}`))
    assert.ok(url, `${collection} request was issued`)
    assert.equal(url.searchParams.get("missionId"), "mission-review")
    const start = Date.parse(url.searchParams.get("start"))
    const end = Date.parse(url.searchParams.get("end"))
    assert.equal(end - start, 6 * 60 * 60 * 1000)
  }
  const coverageUrl = requested.find((item) => item.pathname.endsWith("/coverage"))
  assert.ok(coverageUrl, "coverage request was issued")
  assert.equal(coverageUrl.searchParams.get("missionId"), "mission-review")
  assert.equal(coverageUrl.searchParams.has("start"), false)
  assert.equal(coverageUrl.searchParams.has("end"), false)
})

test("provider fail-closes an unknown mission-area pair instead of reporting valid empty", async (t) => {
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    missionId: "mission-review",
    missionAreaId: "area-not-visible",
  })

  assert.equal(snapshot.condition, "unavailable")
  assert.match(snapshot.note, /mission.*mission-area pair.*not.*visible/i)
})

test("provider resolves a unique inbound area to its mission and exact context", async (t) => {
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    missionAreaId: "area-review",
    missionAreaLabel: "Inbound area",
  })

  assert.equal(snapshot.context.missionId, "mission-review")
  assert.equal(snapshot.context.missionAreaId, "area-review")
  assert.equal(snapshot.context.contextId, "context-review")
  assert.equal(snapshot.context.missionAreaLabel, "Area review")
  assert.equal(snapshot.condition, "empty")
})

test("provider follows page cursors so later source records are not silently omitted", async (t) => {
  const sourceRequests = []
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    if (url.pathname.endsWith("/sources")) {
      sourceRequests.push(url)
      if (url.searchParams.get("cursor") === "sources-page-2") {
        return { body: page([sourceRecord("source-page-2")]) }
      }
      return { body: page([sourceRecord("source-page-1")], "sources-page-2") }
    }
    if (url.pathname.endsWith("/observations")) {
      return {
        body: page([
          observationRecord("observation-source-page-1", { sourceId: "source-page-1" }),
          observationRecord("observation-source-page-2", { sourceId: "source-page-2" }),
        ]),
      }
    }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    missionId: "mission-review",
    missionAreaId: "area-review",
  })

  assert.deepEqual(
    snapshot.sourceTruth.map((source) => source.id),
    ["source-page-1", "source-page-2"],
  )
  assert.equal(sourceRequests.length, 2)
  assert.equal(sourceRequests[1].searchParams.get("cursor"), "sources-page-2")
})

test("replay preserves the exact requested range and follows POST cursors", async (t) => {
  const replayRequests = []
  installFetch(t, (url, init) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/replay")) {
      const query = JSON.parse(init.body)
      replayRequests.push(query)
      const second = query.cursor === "replay-page-2"
      return {
        body: {
          classification: "UNCLASSIFIED",
          schemaRef: "fusarium-intelligence/v1",
          query,
          items: [second
            ? activityRecord("activity-replay-2", 2, "2026-08-01T05:20:00.000Z")
            : activityRecord("activity-replay-1", 1, "2026-08-01T05:10:00.000Z")],
          page: {
            limit: 200,
            nextCursor: second ? null : "replay-page-2",
            hasMore: !second,
          },
        },
      }
    }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    contextId: "context-review",
    missionId: "mission-review",
    missionAreaId: "area-review",
    mode: "replay",
    timeRange: {
      start: "2026-08-01T05:00:00.000Z",
      end: "2026-08-01T06:00:00.000Z",
    },
  })

  assert.equal(snapshot.condition, "replay")
  assert.equal(replayRequests.length, 2)
  assert.deepEqual(replayRequests.map((item) => item.cursor), [null, "replay-page-2"])
  assert.ok(replayRequests.every((item) => item.timeRange.start === "2026-08-01T05:00:00.000Z"))
  assert.ok(replayRequests.every((item) => item.timeRange.end === "2026-08-01T06:00:00.000Z"))
  assert.deepEqual(snapshot.timeline.map((item) => item.id), ["activity-replay-1", "activity-replay-2"])
  assert.equal(snapshot.context.missionAreaId, "area-review")
})

test("a scoped fusion-run record supplies lineage, workflow, model, contribution, conflict, and review truth", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.contexts = outcome(
    "/api/fusarium/v1/contexts",
    page([missionContextRecord()]),
  )
  outcomes.sources = outcome("/api/fusarium/v1/sources", page([sourceRecord("source-review")]))
  outcomes.observations = outcome("/api/fusarium/v1/observations", page([observationRecord("observation-review")]))
  outcomes.objects = outcome("/api/fusarium/v1/objects", page([objectRecord()]))
  outcomes.evidence = outcome("/api/fusarium/v1/evidence", page([evidenceRecord()]))
  outcomes.reviews = outcome("/api/fusarium/v1/reviews", page([reviewRecord()]))
  outcomes.fusionRuns = outcome(
    "/api/fusarium/v1/fusion-runs",
    page([fusionRunRecord()]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )

  assert.equal(snapshot.runs.length, 1)
  assert.equal(snapshot.runs[0].id, "fusion-run-review")
  assert.equal(snapshot.runs[0].reviewState, "accepted")
  assert.equal(snapshot.model.state, "available")
  assert.equal(snapshot.model.name, "Reviewed fusion model")
  assert.equal(snapshot.model.version, "2.1")
  assert.equal(snapshot.model.schemaVersion, "fusarium-fusion-run-record/v1")
  assert.equal(snapshot.contributions?.[0].sourceId, "source-review")
  assert.equal(snapshot.contributions?.[0].contribution, 0.63)
  assert.equal(snapshot.conflicts?.[0].kind, "conflict")
  assert.match(snapshot.conflicts?.[0].detail ?? "", /acknowledged/i)
  assert.ok(snapshot.nodes.some((node) => node.id === "fusion-run:fusion-run-review" && node.stage === "fusion_run"))
  assert.ok(snapshot.nodes.some((node) => node.id === "run-step:fusion-run-review:step-correlate"))
  assert.ok(snapshot.edges.some((edge) => edge.id === "run-edge:fusion-run-review:edge-source-product"))
  assert.ok(snapshot.timeline.some((event) => event.id === "timeline:run:fusion-run-review"))
  assert.equal(snapshot.gaps.some((gap) => /fusion-run capability is bound.*no run/i.test(gap)), false)
})

test("an immutable scoped narrative version completes the explicit conclusion lineage", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.contexts = outcome("/api/fusarium/v1/contexts", page([missionContextRecord()]))
  outcomes.objects = outcome("/api/fusarium/v1/objects", page([objectRecord()]))
  outcomes.evidence = outcome("/api/fusarium/v1/evidence", page([evidenceRecord()]))
  outcomes.narratives = outcome("/api/fusarium/v1/narrative-versions", page([narrativeRecord()]))

  const snapshot = buildOperationalSnapshot(
    { ...DEFAULT_FUSION_CONTEXT, contextId: "context-review", missionId: "mission-review", missionAreaId: "area-review" },
    outcomes,
    RECEIVED_AT,
  )
  const narrative = snapshot.nodes.find((node) => node.id === "narrative:narrative-version-review")

  assert.ok(narrative)
  assert.equal(narrative.stage, "narrative")
  assert.equal(narrative.state, "accepted")
  assert.equal(narrative.disposition?.state, "accepted")
  assert.deepEqual(narrative.objectIds, ["object-review"])
  assert.deepEqual(narrative.evidenceIds, ["evidence-review"])
  assert.ok(snapshot.edges.some((edge) => edge.fromId === "object:object-review" && edge.toId === narrative.id))
  assert.equal(snapshot.gaps.some((gap) => /no narrative resource is bound/i.test(gap)), false)
})

test("fusion runs without an explicit selected-area context or artifact link fail closed", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.contexts = outcome(
    "/api/fusarium/v1/contexts",
    page([missionContextRecord("context-selected")]),
  )
  outcomes.fusionRuns = outcome(
    "/api/fusarium/v1/fusion-runs",
    page([fusionRunRecord("fusion-run-other-area", { contextId: "context-other-area" })]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )

  assert.deepEqual(snapshot.runs, [])
  assert.equal(snapshot.model.state, "unavailable")
  assert.deepEqual(snapshot.conflicts, [])
  assert.deepEqual(snapshot.contributions, [])
  assert.ok(snapshot.nodes.some((node) => node.id === "gap-fusion-run" && node.state === "unavailable"))
  assert.ok(snapshot.gaps.some((gap) => /no run.*scoped|none was explicitly linked/i.test(gap)))
})

test("fusion-run scope rejects foreign contexts and mixed-area typed references even with the selected context", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.contexts = outcome(
    "/api/fusarium/v1/contexts",
    page([missionContextRecord("context-review")]),
  )
  outcomes.objects = outcome(
    "/api/fusarium/v1/objects",
    page([
      objectRecord("object-review"),
      objectRecord("object-other-area", {
        missionAreaId: "area-other",
        evidenceIds: [],
        provenanceRef: null,
      }),
    ]),
  )

  const foreignContext = fusionRunRecord("fusion-run-foreign-context", {
    contextId: "context-other-area",
  })
  const contextlessMixed = fusionRunRecord("fusion-run-contextless-mixed", {
    contextId: null,
  })
  contextlessMixed.lineageNodes = contextlessMixed.lineageNodes.map((node, index) => ({
    ...node,
    artifactRef: index === 0 ? "object-other-area" : "object-review",
  }))
  const selectedContextMixed = fusionRunRecord("fusion-run-selected-context-mixed", {
    contextId: "context-review",
  })
  selectedContextMixed.lineageNodes = selectedContextMixed.lineageNodes.map((node, index) => ({
    ...node,
    artifactRef: index === 0 ? "observation-other-area" : "object-other-area",
  }))
  outcomes.fusionRuns = outcome(
    "/api/fusarium/v1/fusion-runs",
    page([foreignContext, contextlessMixed, selectedContextMixed]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      contextId: "context-review",
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )

  assert.deepEqual(snapshot.runs, [])
  assert.equal(snapshot.nodes.some((node) => node.id.startsWith("fusion-run:")), false)
  assert.equal(snapshot.nodes.some((node) => node.recordRef === "object-other-area"), false)
})

test("contextless fusion-run fallback cannot bootstrap scope from its own source, artifact kind, or review", () => {
  const snapshotFor = (run) => {
    const outcomes = validEmptyOutcomes()
    outcomes.contexts = outcome("/api/fusarium/v1/contexts", page([missionContextRecord()]))
    outcomes.sources = outcome(
      "/api/fusarium/v1/sources",
      page([
        sourceRecord("source-review"),
        sourceRecord("source-outside"),
      ]),
    )
    outcomes.observations = outcome(
      "/api/fusarium/v1/observations",
      page([observationRecord("observation-review")]),
    )
    outcomes.objects = outcome("/api/fusarium/v1/objects", page([objectRecord()]))
    outcomes.evidence = outcome("/api/fusarium/v1/evidence", page([evidenceRecord()]))
    outcomes.reviews = outcome("/api/fusarium/v1/reviews", page([reviewRecord()]))
    outcomes.fusionRuns = outcome("/api/fusarium/v1/fusion-runs", page([run]))
    return buildOperationalSnapshot(
      {
        ...DEFAULT_FUSION_CONTEXT,
        contextId: "context-review",
        missionId: "mission-review",
        missionAreaId: "area-review",
      },
      outcomes,
      RECEIVED_AT,
    )
  }

  const valid = fusionRunRecord("fusion-run-contextless-valid", { contextId: null })
  assert.deepEqual(snapshotFor(valid).runs?.map((run) => run.id), ["fusion-run-contextless-valid"])

  const unscopedLineageSource = fusionRunRecord("fusion-run-contextless-lineage-source", { contextId: null })
  unscopedLineageSource.lineageNodes = unscopedLineageSource.lineageNodes.map((node, index) => (
    index === 0 ? { ...node, sourceId: "source-outside" } : node
  ))

  const unscopedContributionSource = fusionRunRecord("fusion-run-contextless-contribution-source", { contextId: null })
  unscopedContributionSource.contributions = unscopedContributionSource.contributions.map((item) => ({
    ...item,
    sourceId: "source-outside",
  }))

  const wrongKind = fusionRunRecord("fusion-run-contextless-wrong-kind", { contextId: null })
  wrongKind.lineageNodes = wrongKind.lineageNodes.map((node, index) => (
    index === 0 ? { ...node, artifactRef: "object-review" } : node
  ))

  const unscopedReview = fusionRunRecord("fusion-run-contextless-review", {
    contextId: null,
    reviewId: "review-outside",
  })

  for (const [label, run] of [
    ["unscoped lineage sourceId", unscopedLineageSource],
    ["unscoped contribution sourceId", unscopedContributionSource],
    ["wrong-kind artifactRef", wrongKind],
    ["unscoped reviewId", unscopedReview],
  ]) {
    const snapshot = snapshotFor(run)
    assert.deepEqual(snapshot.runs, [], label)
    assert.equal(snapshot.nodes.some((node) => node.id === `fusion-run:${run.id}`), false, label)
  }
})

test("operational reads use a fixed least-privilege role header even when the display role is admin", async (t) => {
  const roleHeaders = []
  installFetch(t, (url, init) => {
    roleHeaders.push(new Headers(init?.headers).get("X-Operator-Role"))
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    contextId: "context-review",
    missionId: "mission-review",
    missionAreaId: "area-review",
    operatorRole: "admin",
  })

  assert.equal(snapshot.context.operatorRole, "admin")
  assert.ok(roleHeaders.length > 1)
  assert.ok(roleHeaders.every((role) => role === "viewer"))
})

test("direct canonical simulated entry restores an operational-unscoped scope on its first LIVE transition", () => {
  const simulated = parseFusionContext(new URLSearchParams({
    contextId: "sim-context-alpha-7",
    missionId: "demo-mission-alpha-7",
    missionAreaId: "demo-area-alpha-7",
    missionAreaLabel: "Sanitized Alpha-7 exercise area",
    mode: "simulated",
  }))
  const live = restoreOperationalScopeAfterSimulation(
    { ...simulated, mode: "live" },
    {
      contextId: DEFAULT_FUSION_CONTEXT.contextId,
      missionId: DEFAULT_FUSION_CONTEXT.missionId,
      missionAreaId: DEFAULT_FUSION_CONTEXT.missionAreaId,
      missionAreaLabel: DEFAULT_FUSION_CONTEXT.missionAreaLabel,
    },
  )

  assert.equal(live.mode, "live")
  assert.equal(live.contextId, null)
  assert.equal(live.missionId, "runtime-unscoped")
  assert.equal(live.missionAreaId, "runtime-unscoped")
  assert.equal(live.missionAreaLabel, DEFAULT_FUSION_CONTEXT.missionAreaLabel)
})

test("direct operational deep links cannot carry sanitized-scenario identifiers into provider reads", async (t) => {
  const parsed = parseFusionContext(new URLSearchParams({
    contextId: "sim-context-alpha-7",
    missionId: "demo-mission-alpha-7",
    missionAreaId: "demo-area-alpha-7",
    missionAreaLabel: "Sanitized Alpha-7 exercise area",
    evidenceId: "demo-evidence-alpha-7",
    mode: "live",
  }))
  assert.equal(parsed.contextId, null)
  assert.equal(parsed.missionId, DEFAULT_FUSION_CONTEXT.missionId)
  assert.equal(parsed.missionAreaId, DEFAULT_FUSION_CONTEXT.missionAreaId)
  assert.equal(parsed.selectedEvidenceId, null)

  const requests = []
  installFetch(t, (url) => {
    requests.push(url.toString())
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    return { body: page() }
  })
  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    contextId: "sim-context-alpha-7",
    missionId: "demo-mission-alpha-7",
    missionAreaId: "demo-area-alpha-7",
    mode: "live",
  })
  assert.equal(snapshot.context.missionId, DEFAULT_FUSION_CONTEXT.missionId)
  assert.ok(requests.every((request) => !/demo-mission-alpha-7|demo-area-alpha-7|sim-context-alpha-7/.test(request)))
})

test("readiness requires its full schema and a valid degraded status degrades the snapshot", async (t) => {
  let readinessPayload = readinessBody("degraded")
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessPayload }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    if (url.pathname.endsWith("/sources")) return { body: page([sourceRecord("source-review")]) }
    if (url.pathname.endsWith("/observations")) return { body: page([observationRecord("observation-review")]) }
    return { body: page() }
  })
  const context = {
    ...DEFAULT_FUSION_CONTEXT,
    contextId: "context-review",
    missionId: "mission-review",
    missionAreaId: "area-review",
    timeRange: {
      start: "2026-09-01T19:00:00.000Z",
      end: RECEIVED_AT,
    },
  }

  const declaredDegraded = await v1FusionProvider.load(context)
  assert.equal(declaredDegraded.condition, "degraded")
  assert.equal(declaredDegraded.identityMode, "development_header_unverified")

  readinessPayload = readinessBody("not_ready")
  const declaredNotReady = await v1FusionProvider.load(context)
  assert.equal(declaredNotReady.condition, "degraded")
  assert.ok(declaredNotReady.gaps.some((gap) => /v1 readiness reports not ready/i.test(gap)))

  const invalidReadiness = readinessBody()
  readinessPayload = {
    ...invalidReadiness,
    storage: {
      ...invalidReadiness.storage,
      checkedAt: "not-a-timestamp",
    },
  }
  const malformedChild = await v1FusionProvider.load(context)
  assert.equal(malformedChild.condition, "degraded")
  assert.ok(malformedChild.gaps.some((gap) => /v1 readiness.*schema/i.test(gap)))

  const inconsistentReadiness = readinessBody()
  readinessPayload = {
    ...inconsistentReadiness,
    storage: {
      ...inconsistentReadiness.storage,
      configured: false,
      verified: true,
    },
  }
  const impossibleFlags = await v1FusionProvider.load(context)
  assert.equal(impossibleFlags.condition, "degraded")
  assert.ok(impossibleFlags.gaps.some((gap) => /v1 readiness.*schema/i.test(gap)))
})

test("narrative caveat evidence must remain inside the selected mission area", () => {
  const outcomes = validEmptyOutcomes()
  outcomes.contexts = outcome("/api/fusarium/v1/contexts", page([missionContextRecord()]))
  outcomes.objects = outcome("/api/fusarium/v1/objects", page([objectRecord()]))
  outcomes.evidence = outcome("/api/fusarium/v1/evidence", page([evidenceRecord()]))
  outcomes.narratives = outcome(
    "/api/fusarium/v1/narrative-versions",
    page([narrativeRecord("narrative-foreign-caveat", {
      caveats: [{
        id: "caveat-review",
        text: "This caveat depends on evidence from another area.",
        claimIds: ["claim-review"],
        evidenceIds: ["evidence-other-area"],
      }],
    })]),
  )

  const snapshot = buildOperationalSnapshot(
    {
      ...DEFAULT_FUSION_CONTEXT,
      contextId: "context-review",
      missionId: "mission-review",
      missionAreaId: "area-review",
    },
    outcomes,
    RECEIVED_AT,
  )

  assert.equal(snapshot.nodes.some((node) => node.id === "narrative:narrative-foreign-caveat"), false)
  assert.equal(snapshot.nodes.some((node) => node.evidenceIds.includes("evidence-other-area")), false)
  assert.ok(snapshot.gaps.some((gap) => /narrative-version capability.*no immutable version/i.test(gap)))
})

test("Threat handoffs may use a bare objectId, while explicit unsupported object types fail closed", () => {
  const threatBare = parseFusionContext(new URLSearchParams({
    sourceApplication: "threat-assessment",
    objectId: "object-from-threat",
  }))
  assert.equal(threatBare.selectedObjectId, "object-from-threat")

  const threatUnsupported = parseFusionContext(new URLSearchParams({
    sourceApplication: "threat-assessment",
    objectId: "assessment-from-threat",
    objectType: "threat-assessment",
  }))
  assert.equal(threatUnsupported.selectedObjectId, null)

  const untypedOtherSource = parseFusionContext(new URLSearchParams({
    sourceApplication: "overview",
    objectId: "untyped-overview-object",
  }))
  assert.equal(untypedOtherSource.selectedObjectId, null)
})

test("the selected context and mission-area label are canonicalized from the backend record", async (t) => {
  installFetch(t, (url) => {
    if (url.pathname.endsWith("/readiness")) return { body: readinessBody() }
    if (url.pathname.endsWith("/contexts")) return { body: page([missionContextRecord()]) }
    return { body: page() }
  })

  const snapshot = await v1FusionProvider.load({
    ...DEFAULT_FUSION_CONTEXT,
    contextId: null,
    missionId: "mission-review",
    missionAreaId: "area-review",
    missionAreaLabel: "Untrusted query label",
  })

  assert.equal(snapshot.context.contextId, "context-review")
  assert.equal(snapshot.context.missionId, "mission-review")
  assert.equal(snapshot.context.missionAreaId, "area-review")
  assert.equal(snapshot.context.missionAreaLabel, "Area review")
})
