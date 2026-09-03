import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-threat-tests-"))
for (const name of ["contracts", "deep-links", "scenario", "provider"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText.replace(/from "\.\/(contracts|scenario)"/g, 'from "./$1.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const contracts = await import(pathToFileURL(join(compiledDir, "contracts.mjs")))
const links = await import(pathToFileURL(join(compiledDir, "deep-links.mjs")))
const scenario = await import(pathToFileURL(join(compiledDir, "scenario.mjs")))
const providerModule = await import(pathToFileURL(join(compiledDir, "provider.mjs")))

const rootPayload = {
  schemaRef: "fusarium-intelligence/v1",
  service: "fusarium-intelligence",
  version: "1.0.0",
  classification: "UNCLASSIFIED",
  identityMode: "development_header_unverified",
  identityVerified: false,
}

const readinessPayload = {
  schemaRef: "fusarium-intelligence/v1",
  classification: "UNCLASSIFIED",
  status: "ready",
  identity: { configured: true, verified: false },
}

const page = (items = []) => ({
  items,
  page: { nextCursor: null, hasMore: false, limit: 500 },
})

const response = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  })

const context = {
  ...links.DEFAULT_THREAT_CONTEXT,
  missionId: "mission.alpha",
  missionLabel: "Mission Alpha",
  missionAreaId: "area.alpha",
  missionAreaLabel: "Area Alpha",
  timeWindow: "72h",
  role: "viewer",
}

function routeFetcher(overrides = {}) {
  const calls = []
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input), "http://local")
    calls.push({ path: url.pathname, search: url.search, init })
    if (url.pathname === "/api/fusarium/v1") {
      const rootOverride = overrides[url.pathname]
      return rootOverride ? response(rootOverride.payload, rootOverride.status ?? 200) : response(rootPayload)
    }
    if (url.pathname === "/api/fusarium/v1/readiness") {
      const readinessOverride = overrides[url.pathname]
      return readinessOverride
        ? response(readinessOverride.payload, readinessOverride.status ?? 200)
        : response(readinessPayload)
    }
    const override = overrides[url.pathname]
    return override ? response(override.payload, override.status ?? 200) : response(page())
  }
  return { fetcher, calls }
}

test("deep links round-trip the full mission and synchronized selection context", () => {
  const selected = {
    ...context,
    mode: "replay",
    selectedAssessmentId: "assessment.object-alpha",
    selectedObjectId: "object.alpha",
    selectedEvidenceId: "evidence.alpha",
    selectedSourceId: "source.alpha",
  }
  const self = new URL(links.buildThreatAssessmentSelfLink(selected, "stale"), "http://local")
  assert.equal(self.pathname, "/fusarium/threat-assessment")
  assert.equal(self.searchParams.get("missionId"), "mission.alpha")
  assert.equal(self.searchParams.get("missionAreaId"), "area.alpha")
  assert.equal(self.searchParams.get("timeWindow"), "72h")
  assert.equal(self.searchParams.get("dataMode"), "replay")
  assert.equal(self.searchParams.get("assessmentId"), "assessment.object-alpha")
  assert.equal(self.searchParams.get("objectId"), "object.alpha")
  assert.equal(self.searchParams.get("evidenceId"), "evidence.alpha")
  assert.equal(self.searchParams.get("sourceId"), "source.alpha")
  assert.equal(self.searchParams.get("role"), null)
  assert.equal(self.searchParams.get("operatorId"), null)
  assert.equal(self.searchParams.get("displayRole"), "viewer")
  assert.equal(self.searchParams.get("freshness"), "stale")
  assert.equal(self.searchParams.get("classification"), "UNCLASSIFIED")
  assert.equal(self.searchParams.get("identityMode"), null)
  assert.deepEqual(links.parseThreatAssessmentContext(self.searchParams), selected)

  const destinations = {
    situationalAwareness: "/fusarium/situational-awareness",
    dataFusion: "/fusarium/data-fusion",
    oeiNarrative: "/fusarium/oei",
    environmentalResponseCoordination: "/fusarium/command-control",
  }
  for (const [destination, pathname] of Object.entries(destinations)) {
    const handoff = new URL(links.buildThreatAssessmentHandoffLink(destination, selected, "stale"), "http://local")
    assert.equal(handoff.pathname, pathname)
    assert.equal(handoff.searchParams.get("objectId"), "object.alpha")
    assert.equal(handoff.searchParams.get("evidenceId"), "evidence.alpha")
  }
})

test("navigation identity cannot be elevated and simulation always canonicalizes its context", () => {
  const crafted = new URLSearchParams({
    missionId: "mission.operational",
    missionAreaId: "area.operational",
    dataMode: "simulated",
    role: "admin",
    operatorId: "crafted.operator",
    assessmentId: "assessment.operational",
    objectId: "object.operational",
  })
  const parsed = links.parseThreatAssessmentContext(crafted)
  assert.equal(parsed.role, "viewer")
  assert.equal(parsed.operatorId, "local.operator")
  assert.equal(parsed.missionId, "scenario:mission-harbor-glass")
  assert.equal(parsed.missionAreaId, "scenario:area-harbor-glass")
  assert.equal(parsed.selectedAssessmentId, null)
  assert.equal(parsed.selectedObjectId, null)
  const self = new URL(links.buildThreatAssessmentSelfLink(parsed), "http://local")
  assert.equal(self.searchParams.get("role"), null)
  assert.equal(self.searchParams.get("operatorId"), null)
})

test("confidence scores never create an unsupplied qualitative label", () => {
  assert.deepEqual(
    contracts.confidenceFromUnknown({ score: 0.99 }),
    {
      score: 0.99,
      label: "not_assessed",
      basis: "A score was supplied without a valid qualitative label; no label was inferred.",
    },
  )
})

test("sanitized scenario is fully isolated, synthetic, deterministic, and exercises all review stages", () => {
  const first = scenario.buildSanitizedThreatScenario({ ...context, mode: "simulated" })
  const second = scenario.buildSanitizedThreatScenario({ ...context, mode: "simulated" })
  assert.deepEqual(first, second)
  assert.equal(first.condition, "simulated")
  assert.equal(first.context.missionId.startsWith("scenario:"), true)
  assert.ok(first.assessments.length >= 4)
  assert.ok(first.assessments.every((item) => item.synthetic && item.dataMode === "simulated"))
  assert.ok(first.evidence.every((item) => item.synthetic && item.dataMode === "simulated"))
  assert.ok(first.relationships.every((item) => item.synthetic && item.dataMode === "simulated"))
  assert.ok(first.history.every((item) => item.synthetic && item.mode === "simulated"))
  assert.ok(first.sourceTruth.every((item) => item.synthetic))
  assert.deepEqual(
    new Set(first.assessments.map((item) => item.review.disposition)),
    new Set(contracts.REVIEW_DISPOSITIONS),
  )
  assert.ok(first.assessments.some((item) => item.changedSinceReview === true))
  assert.ok(first.assessments.some((item) => item.changedSinceReview === false))
  assert.ok(first.assessments.some((item) => item.changedSinceReview === null))
  assert.ok(first.assessments.some((item) => item.evidenceConflict === "detected"))
})

test("invalid v1 handshake stops before protected data collections", async () => {
  const calls = []
  const fetcher = async (input) => {
    const url = new URL(String(input), "http://local")
    calls.push(url.pathname)
    return response({ detail: { error: "not_bound", reason: "Versioned root is unavailable." } }, 503)
  }
  const provider = providerModule.createThreatAssessmentProvider(fetcher, () => Date.parse("2026-09-01T20:00:00Z"))
  const snapshot = await provider.load(context)
  assert.equal(snapshot.condition, "unavailable")
  assert.deepEqual(calls.sort(), ["/api/fusarium/v1", "/api/fusarium/v1/readiness"].sort())
  assert.equal(snapshot.assessments.length, 0)
  assert.equal(snapshot.sourceTruth.find((item) => item.id === "contract").reachability, "reached")
  assert.equal(snapshot.sourceTruth.find((item) => item.id === "objects").reachability, "not_attempted")
  assert.equal(snapshot.sourceTruth.find((item) => item.id === "objects").dataPresence, "unknown")
})

test("not-ready readiness stops before protected collections", async () => {
  const { fetcher, calls } = routeFetcher({
    "/api/fusarium/v1/readiness": {
      payload: { ...readinessPayload, status: "not_ready" },
    },
  })
  const provider = providerModule.createThreatAssessmentProvider(fetcher)
  const snapshot = await provider.load(context)
  assert.equal(snapshot.condition, "unavailable")
  assert.equal(calls.some((call) => call.path === "/api/fusarium/v1/objects"), false)
  assert.match(snapshot.gaps.join(" "), /readiness/i)
})

test("degraded readiness and incomplete pagination cannot report ready or empty", async () => {
  const { fetcher } = routeFetcher({
    "/api/fusarium/v1/readiness": {
      payload: { ...readinessPayload, status: "degraded" },
    },
    "/api/fusarium/v1/objects": {
      payload: { items: [], page: { nextCursor: "next", hasMore: true, limit: 500 } },
    },
  })
  const provider = providerModule.createThreatAssessmentProvider(fetcher)
  const snapshot = await provider.load(context)
  assert.equal(snapshot.condition, "partial")
  const objects = snapshot.sourceTruth.find((item) => item.id === "objects")
  assert.equal(objects.coverage, "partial")
  assert.equal(objects.dataPresence, "unknown")
})

test("verified empty live collections remain collected-empty, never an environmental zero", async () => {
  const { fetcher, calls } = routeFetcher()
  const provider = providerModule.createThreatAssessmentProvider(fetcher, () => Date.parse("2026-09-01T20:00:00Z"))
  const snapshot = await provider.load(context)
  assert.equal(snapshot.condition, "empty")
  assert.equal(snapshot.assessments.length, 0)
  const objects = snapshot.sourceTruth.find((item) => item.id === "objects")
  assert.equal(objects.reachability, "reached")
  assert.equal(objects.identity, "development_header_unverified")
  assert.equal(objects.schema, "valid")
  assert.equal(objects.coverage, "collected_empty")
  assert.equal(objects.dataPresence, "empty")
  assert.equal(objects.recordCount, 0)
  assert.match(objects.note, /not a measured environmental zero/i)
  assert.ok(calls.some((call) => call.path === "/api/fusarium/v1/objects" && call.search.includes("missionId=mission.alpha")))
})

test("live object projection preserves explicit fields and keeps unsupported fields unknown", async () => {
  const object = {
    id: "object.alpha",
    namespace: "operational",
    missionId: "mission.alpha",
    missionAreaId: "area.alpha",
    objectType: "change",
    domain: "water",
    name: "Observed water condition",
    summary: "A supplied environmental object.",
    temporalBounds: { start: "2026-09-01T18:00:00Z", end: "2026-09-01T19:30:00Z" },
    status: "material",
    relationshipIds: ["relationship.alpha"],
    changes: [
      {
        id: "change.alpha",
        field: "turbidity",
        direction: "rising",
        observedAt: "2026-09-01T19:20:00Z",
        evidenceIds: ["evidence.alpha"],
        classification: "UNCLASSIFIED",
      },
    ],
    trend: "rising",
    missionConsequence: "A supplied mission consequence.",
    confidence: { score: 0.72, label: "moderate", basis: "Supplied confidence basis." },
    freshness: {
      observedAt: "2026-09-01T19:30:00Z",
      receivedAt: "2026-09-01T19:31:00Z",
      staleAfterSeconds: 3600,
      state: "fresh",
      basis: "source_timestamp",
    },
    sourceIds: ["source.alpha"],
    evidenceIds: ["evidence.alpha"],
    provenanceRef: "provider://object.alpha",
    classification: "UNCLASSIFIED",
    dataMode: "live",
    synthetic: false,
    revision: 1,
  }
  const evidence = {
    id: "evidence.alpha",
    namespace: "operational",
    missionId: "mission.alpha",
    missionAreaId: "area.alpha",
    objectIds: ["object.alpha"],
    sourceId: "source.alpha",
    title: "Supplied evidence",
    summary: "Evidence summary.",
    sourceRef: "provider://evidence.alpha",
    lineage: { sourceRecordIds: ["source-record-alpha"], parentEvidenceIds: [], transformations: [] },
    observedAt: "2026-09-01T19:10:00Z",
    receivedAt: "2026-09-01T19:11:00Z",
    confidence: { score: 0.82, label: "high", basis: "Supplied evidence basis." },
    confidenceBasis: "Supplied evidence basis.",
    integrityState: "verified",
    verificationState: "verified",
    metadata: { conflictNote: "Explicit disagreement with a second method." },
    classification: "UNCLASSIFIED",
    dataMode: "live",
    synthetic: false,
    revision: 1,
  }
  const relationship = {
    id: "relationship.alpha",
    namespace: "operational",
    missionId: "mission.alpha",
    fromObjectId: "object.alpha",
    toObjectId: "object.bravo",
    relationshipType: "contributes_to",
    label: "Supplied causal relationship",
    confidence: { score: 0.6, label: "moderate", basis: "Supplied relationship basis." },
    evidenceIds: ["evidence.alpha"],
    classification: "UNCLASSIFIED",
    dataMode: "live",
    synthetic: false,
    revision: 1,
  }
  const review = {
    id: "review.alpha",
    namespace: "operational",
    missionId: "mission.alpha",
    kind: "environmental_judgment",
    state: "in_review",
    objectIds: ["object.alpha"],
    evidenceIds: ["evidence.alpha"],
    requestedBy: "local.operator",
    assignedTo: null,
    judgment: "Review judgment.",
    dataMode: "live",
    synthetic: false,
    revision: 1,
    createdAt: "2026-09-01T17:00:00Z",
    updatedAt: "2026-09-01T18:00:00Z",
    classification: "UNCLASSIFIED",
  }
  const activity = {
    id: "activity.alpha",
    sequence: 1,
    namespace: "operational",
    missionId: "mission.alpha",
    actorId: "local.operator",
    actorRole: "viewer",
    occurredAt: "2026-09-01T19:25:00Z",
    actionType: "object_selected",
    objectIds: ["object.alpha"],
    evidenceIds: ["evidence.alpha"],
    dataMode: "live",
    appendOnly: true,
    classification: "UNCLASSIFIED",
    synthetic: false,
  }
  const source = {
    id: "source.alpha",
    namespace: "operational",
    label: "Source Alpha",
    sourceType: "sensor",
    endpointRef: "provider://source.alpha",
    state: "live",
    configured: true,
    verified: true,
    live: true,
    observedAt: "2026-09-01T19:30:00Z",
    receivedAt: "2026-09-01T19:31:00Z",
    recordCount: 1,
    dataMode: "live",
    synthetic: false,
    reason: "Verified test source.",
    classification: "UNCLASSIFIED",
    revision: 1,
  }
  const crossAreaObject = {
    ...object,
    id: "object.cross-area",
    missionAreaId: "area.bravo",
    name: "Cross-area record",
    relationshipIds: [],
    evidenceIds: [],
  }
  const untypedObject = {
    ...object,
    id: "object.untyped",
    dataMode: undefined,
    relationshipIds: [],
    evidenceIds: [],
  }
  const { fetcher, calls } = routeFetcher({
    "/api/fusarium/v1/objects": { payload: page([object, crossAreaObject, untypedObject]) },
    "/api/fusarium/v1/evidence": { payload: page([evidence]) },
    "/api/fusarium/v1/relationships": { payload: page([relationship]) },
    "/api/fusarium/v1/reviews": { payload: page([review]) },
    "/api/fusarium/v1/activity": { payload: page([activity]) },
    "/api/fusarium/v1/sources": { payload: page([source]) },
  })
  const provider = providerModule.createThreatAssessmentProvider(fetcher, () => Date.parse("2026-09-01T20:00:00Z"))
  const snapshot = await provider.load({
    ...context,
    role: "admin",
    operatorId: "crafted.operator",
  })
  assert.equal(snapshot.condition, "ready")
  assert.equal(snapshot.assessments.length, 1)
  assert.equal(snapshot.assessments.some((item) => item.objectId === "object.cross-area"), false)
  assert.equal(snapshot.assessments.some((item) => item.objectId === "object.untyped"), false)
  const assessment = snapshot.assessments[0]
  assert.equal(assessment.objectId, "object.alpha")
  assert.equal(assessment.severity, "material")
  assert.equal(assessment.urgency, "not_assessed")
  assert.equal(assessment.forecastHorizon, null)
  assert.equal(assessment.changedSinceReview, true)
  assert.equal(assessment.evidenceConflict, "detected")
  assert.equal(assessment.evidenceCompleteness.state, "unknown")
  assert.equal(assessment.evidenceCompleteness.declared, 1)
  assert.equal(assessment.evidenceCompleteness.resolved, 1)
  assert.equal(assessment.review.disposition, "Human review")
  assert.equal(snapshot.relationships[0].explicitlyCausal, true)
  assert.equal(snapshot.history[0].id, "activity.alpha")
  const protectedCall = calls.find((call) => call.path === "/api/fusarium/v1/objects")
  assert.equal(protectedCall.init.headers["X-Operator-Role"], "viewer")
  assert.equal(protectedCall.init.headers["X-Operator-Id"], "threat-assessment.local-viewer")
})

test("forecast is an explicit unsupported state and never queries current collections", async () => {
  const { fetcher, calls } = routeFetcher()
  const provider = providerModule.createThreatAssessmentProvider(fetcher, () => Date.parse("2026-09-01T20:00:00Z"))
  const snapshot = await provider.load({ ...context, mode: "forecast" })
  assert.equal(snapshot.condition, "forecast")
  assert.equal(snapshot.assessments.length, 0)
  assert.equal(snapshot.sourceTruth.find((item) => item.id === "forecast").schema, "not_supported")
  assert.equal(calls.some((call) => call.path === "/api/fusarium/v1/objects"), false)
})

test("replay loads append-only history without mixing live objects", async () => {
  const replayItem = {
    id: "activity.replay",
    sequence: 7,
    namespace: "operational",
    missionId: "mission.alpha",
    actorId: "local.operator",
    actorRole: "viewer",
    occurredAt: "2026-09-01T18:00:00Z",
    actionType: "evidence_reviewed",
    objectIds: ["object.alpha"],
    evidenceIds: ["evidence.alpha"],
    dataMode: "replay",
    appendOnly: true,
    classification: "UNCLASSIFIED",
    synthetic: false,
  }
  const { fetcher, calls } = routeFetcher({
    "/api/fusarium/v1/replay": {
      payload: {
        schemaRef: "fusarium-intelligence/v1",
        classification: "UNCLASSIFIED",
        query: {},
        items: [replayItem],
        page: { nextCursor: null, hasMore: false, limit: 500 },
      },
    },
  })
  const provider = providerModule.createThreatAssessmentProvider(fetcher, () => Date.parse("2026-09-01T20:00:00Z"))
  const snapshot = await provider.load({ ...context, mode: "replay" })
  assert.equal(snapshot.condition, "replay")
  assert.equal(snapshot.assessments.length, 0)
  assert.equal(snapshot.history.length, 1)
  assert.equal(calls.some((call) => call.path === "/api/fusarium/v1/objects"), false)
  assert.equal(calls.find((call) => call.path === "/api/fusarium/v1/replay").init.method, "POST")
})

test("simulated mode performs no network request", async () => {
  let calls = 0
  const provider = providerModule.createThreatAssessmentProvider(async () => {
    calls += 1
    throw new Error("network must not be used")
  })
  const snapshot = await provider.load({ ...context, mode: "simulated" })
  assert.equal(snapshot.condition, "simulated")
  assert.equal(calls, 0)
})

test("owned implementation passes safety, selector, and responsive guardrails", () => {
  const componentDir = fileURLToPath(
    new URL("../../../../components/fusarium/threat-assessment", import.meta.url),
  )
  const ownedSources = [
    "contracts.ts",
    "deep-links.ts",
    "scenario.ts",
    "provider.ts",
  ].map((name) => readFileSync(join(sourceDir, name), "utf8"))
  const componentSource = readFileSync(join(componentDir, "threat-assessment-dashboard.tsx"), "utf8")
  const cssSource = readFileSync(join(componentDir, "threat-assessment.module.css"), "utf8")
  ownedSources.push(componentSource, cssSource)
  const joined = ownedSources.join("\n")
  assert.doesNotMatch(
    joined,
    /\b(?:weapons?|targeting|fires?|engagements?|effectors?|kill chains?|autonomous tasking|actuat(?:e|es|ed|ing|ion|or|ors))\b/i,
  )
  assert.doesNotMatch(joined, /\[IL4\]|TS\/SCI|\bCUI\b/)
  const referencedClasses = new Set(
    [...componentSource.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]),
  )
  const definedClasses = new Set(
    [...cssSource.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((match) => match[1]),
  )
  assert.deepEqual(
    [...referencedClasses].filter((name) => !definedClasses.has(name)),
    [],
  )
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(cssSource, /@media \(pointer: coarse\)/)
})
