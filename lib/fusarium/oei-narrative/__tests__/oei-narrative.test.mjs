import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-oei-tests-"))
for (const name of ["contracts", "deep-links", "scenario", "local-draft", "provider"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText.replace(
    /from "\.\/(contracts|scenario|deep-links|local-draft)"/g,
    'from "./$1.mjs"',
  )
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const contracts = await import(pathToFileURL(join(compiledDir, "contracts.mjs")))
const deepLinks = await import(pathToFileURL(join(compiledDir, "deep-links.mjs")))
const scenarioModule = await import(pathToFileURL(join(compiledDir, "scenario.mjs")))
const localDraftModule = await import(pathToFileURL(join(compiledDir, "local-draft.mjs")))
const providerModule = await import(pathToFileURL(join(compiledDir, "provider.mjs")))

const parsed = deepLinks.parseOeiContext(new URLSearchParams())
const scenario = scenarioModule.buildSanitizedNarrativeScenario({ ...parsed, mode: "simulated" })

test("deep links preserve mission, context, area, time, mode, selection, role context, and classification", () => {
  const context = {
    ...parsed,
    missionId: "mission.alpha",
    missionLabel: "Mission Alpha",
    contextId: "context.alpha",
    missionAreaId: "area.alpha",
    missionAreaLabel: "Area Alpha",
    timeWindow: "72h",
    mode: "replay",
    selectedObjectId: "object.alpha",
    selectedEvidenceId: "evidence.alpha",
    selectedSourceId: "source.alpha",
    role: "admin",
    operatorId: "operator.url-display-only",
  }
  const self = new URL(deepLinks.buildOeiSelfLink(context), "http://local")
  assert.equal(self.pathname, "/fusarium/oei")
  assert.equal(self.searchParams.get("missionId"), "mission.alpha")
  assert.equal(self.searchParams.get("contextId"), "context.alpha")
  assert.equal(self.searchParams.get("missionAreaId"), "area.alpha")
  assert.equal(self.searchParams.get("timeWindow"), "72h")
  assert.equal(self.searchParams.get("mode"), "replay")
  assert.equal(self.searchParams.get("dataMode"), "replay")
  assert.equal(self.searchParams.get("objectId"), "object.alpha")
  assert.equal(self.searchParams.get("evidenceId"), "evidence.alpha")
  assert.equal(self.searchParams.get("sourceId"), "source.alpha")
  assert.equal(self.searchParams.get("role"), "admin")
  assert.equal(self.searchParams.get("classification"), "UNCLASSIFIED")
  const handoff = new URL(deepLinks.buildOeiHandoffLink("situationalAwareness", context), "http://local")
  assert.equal(handoff.pathname, "/fusarium/situational-awareness")
  assert.equal(handoff.searchParams.get("contextId"), "context.alpha")
})

test("shared dataMode forecast remains forecast and is never normalized to live", () => {
  const sharedForecast = deepLinks.parseOeiContext(new URLSearchParams(
    "dataMode=forecast&missionId=mission.alpha&missionAreaId=area.alpha&timeWindow=72h",
  ))
  assert.equal(sharedForecast.mode, "forecast")
  const self = new URL(deepLinks.buildOeiSelfLink(sharedForecast), "http://local")
  assert.equal(self.searchParams.get("mode"), "forecast")
  assert.equal(self.searchParams.get("dataMode"), "forecast")
  const handoff = new URL(deepLinks.buildOeiHandoffLink("dataFusion", sharedForecast), "http://local")
  assert.equal(handoff.searchParams.get("mode"), "forecast")
  assert.equal(handoff.searchParams.get("dataMode"), "forecast")
})

test("unsupported or untraced claims remain blocked and source-linked claims retain caveats", () => {
  const supported = scenario.claims[0]
  const supportedAssessment = contracts.assessClaim(supported, scenario.evidence, scenario.objects)
  assert.equal(supportedAssessment.state, "caveated")
  assert.deepEqual(supportedAssessment.missingEvidenceIds, [])

  const unsupported = scenario.claims.find((claim) => claim.id.endsWith("biological-effect"))
  assert.ok(unsupported)
  const unsupportedAssessment = contracts.assessClaim(unsupported, scenario.evidence, scenario.objects)
  assert.equal(unsupportedAssessment.state, "blocked")
  assert.match(unsupportedAssessment.reasons.join(" "), /No evidence is linked/)

  const unrelated = {
    ...supported,
    id: "claim.unrelated",
    objectIds: ["demo.object.living-systems-gap"],
    evidenceIds: ["demo.evidence.water-01"],
  }
  const unrelatedAssessment = contracts.assessClaim(unrelated, scenario.evidence, scenario.objects)
  assert.equal(unrelatedAssessment.state, "blocked")
  assert.match(unrelatedAssessment.reasons.join(" "), /not traced/)

  const objectless = { ...supported, id: "claim.objectless", objectIds: [] }
  const objectlessAssessment = contracts.assessClaim(objectless, scenario.evidence, scenario.objects)
  assert.equal(objectlessAssessment.state, "blocked")
  assert.match(objectlessAssessment.reasons.join(" "), /No supporting environmental object/)
})

test("workflow cannot bypass evidence, human review, or missing durable publication", () => {
  const evidenceBlockers = contracts.workflowBlockers(
    "evidence_check",
    scenario.claims,
    scenario.evidence,
    scenario.objects,
    scenario.reviews,
    false,
  )
  assert.ok(evidenceBlockers.some((item) => item.includes("blocked")))
  const approvedBlockers = contracts.workflowBlockers(
    "approved_package",
    scenario.claims.slice(0, 2),
    scenario.evidence,
    scenario.objects,
    scenario.reviews,
    false,
  )
  assert.ok(approvedBlockers.some((item) => item.includes("accepted human")))
  assert.ok(approvedBlockers.some((item) => item.includes("publication persistence is unavailable")))

  const unrelatedReview = {
    ...scenario.reviews.find((item) => item.kind === "environmental_judgment"),
    id: "review.unrelated",
    state: "accepted",
    objectIds: [],
    evidenceIds: [],
  }
  const scopedReviewBlockers = contracts.workflowBlockers(
    "human_review",
    [scenario.claims[0]],
    scenario.evidence,
    scenario.objects,
    [unrelatedReview],
    false,
  )
  assert.ok(scopedReviewBlockers.some((item) => item.includes("covers every claim object and evidence")))
})

test("the sanitized scenario is isolated, visibly synthetic, and preview-only", () => {
  assert.equal(scenario.condition, "simulated")
  assert.equal(scenario.context.mode, "simulated")
  assert.equal(scenario.identityVerified, false)
  assert.equal(scenario.persistence, "sanitized_fixture")
  assert.ok(scenario.objects.every((item) => item.namespace === "demo" && item.synthetic && item.dataMode === "simulated"))
  assert.ok(scenario.relationships.every((item) => item.namespace === "demo" && item.synthetic))
  assert.ok(scenario.evidence.every((item) => item.namespace === "demo" && item.synthetic))
  assert.ok(scenario.reviews.every((item) => item.namespace === "demo" && item.synthetic))
  assert.ok(scenario.publicationHistory.every((item) => item.synthetic && item.releaseScope.includes("NO EXTERNAL DELIVERY")))
  assert.ok(scenario.sources.some((item) => item.transport === "not_applicable" && item.synthetic))
})

test("browser-local drafts are context-bound, mutable, and never publication history", () => {
  const draft = localDraftModule.createOeiLocalDraft(scenario, "2026-09-01T20:00:00.000Z")
  assert.equal(draft.contextKey, localDraftModule.oeiDraftContextKey(scenario))
  const versioned = localDraftModule.appendLocalVersion(draft, {
    now: "2026-09-01T20:05:00.000Z",
    actor: "browser local",
  })
  assert.equal(versioned.versions.at(-1).immutable, false)
  assert.equal(versioned.synthetic, true)
  assert.equal(versioned.versions.at(-1).synthetic, true)
  const serialized = localDraftModule.serializeOeiLocalDraft(versioned)
  assert.deepEqual(localDraftModule.parseOeiLocalDraft(serialized, draft.contextKey), versioned)
  assert.equal(localDraftModule.parseOeiLocalDraft(serialized, "live:another:context"), null)
  assert.equal(
    localDraftModule.parseOeiLocalDraft(JSON.stringify({ ...versioned, versions: [{ id: "malformed" }] }), draft.contextKey),
    null,
  )
  assert.equal(
    localDraftModule.parseOeiLocalDraft(
      JSON.stringify({ ...versioned, claims: [{ ...versioned.claims[0], authoringBasis: undefined }] }),
      draft.contextKey,
    ),
    null,
  )
  assert.equal(
    localDraftModule.parseOeiLocalDraft(
      JSON.stringify({ ...versioned, versions: [{ ...versioned.versions[0], immutable: true }] }),
      draft.contextKey,
    ),
    null,
  )
  const alternateContext = {
    context: { ...scenario.context, contextId: "demo.context.another", timeWindow: "72h" },
  }
  assert.notEqual(localDraftModule.oeiDraftContextKey(alternateContext), draft.contextKey)
  assert.equal(Object.hasOwn(versioned, "publicationHistory"), false)
})

const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const health = {
  schemaRef: "fusarium-intelligence/v1",
  status: "healthy",
  service: "Fusarium intelligence",
  version: "1",
  checkedAt: "2026-09-01T20:00:00.000Z",
  classification: "UNCLASSIFIED",
}

const readiness = {
  status: "ready",
  checkedAt: "2026-09-01T20:00:00.000Z",
  identityMode: "development_header_unverified",
  developmentIdentity: true,
  demoEnabled: true,
  identity: {
    state: "configured",
    configured: true,
    verified: false,
    detail: "Development header identity is unverified.",
  },
  classification: "UNCLASSIFIED",
}

const emptyPage = { items: [], page: { nextCursor: null, hasMore: false, limit: 100 } }

test("unavailable v1 never silently falls back to simulated or plausible operational content", async () => {
  const calls = []
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    calls.push(String(input))
    return response({ detail: { error: "not_bound" } }, 503)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({ ...parsed, mode: "live" })
  assert.equal(snapshot.condition, "degraded")
  assert.equal(snapshot.persistence, "unavailable")
  assert.equal(snapshot.objects.length, 0)
  assert.equal(snapshot.evidence.length, 0)
  assert.equal(snapshot.publicationHistory.length, 0)
  assert.equal(snapshot.identityVerified, false)
  assert.deepEqual(calls.sort(), ["/api/fusarium/v1/health", "/api/fusarium/v1/readiness"].sort())
  assert.ok(snapshot.sources.every((item) => item.transport === "reachable" && item.dataPresence === "unavailable"))
})

test("provider authorization headers are fixed to read-only viewer and ignore URL role/operator", async () => {
  const seen = []
  const provider = providerModule.createOeiNarrativeProvider(async (input, init) => {
    const headers = new Headers(init?.headers)
    seen.push({
      url: String(input),
      operator: headers.get("X-Operator-Id"),
      role: headers.get("X-Operator-Role"),
    })
    const url = String(input)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response(readiness)
    return response(emptyPage)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({
    ...parsed,
    mode: "live",
    role: "admin",
    operatorId: "operator.url-attacker",
  })
  assert.equal(snapshot.condition, "empty")
  assert.ok(seen.length >= 5)
  assert.ok(seen.every((item) => item.operator === providerModule.OEI_READ_IDENTITY.operatorId))
  assert.ok(seen.every((item) => item.role === "viewer"))
  assert.ok(seen.every((item) => item.operator !== "operator.url-attacker"))
})

test("non-ready runtime state blocks operational catalogs while simulated mode remains separately opt-in", async () => {
  const calls = []
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response({ ...readiness, status: "degraded" })
    throw new Error(`Unexpected operational request: ${url}`)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({ ...parsed, mode: "live" })
  assert.equal(snapshot.condition, "degraded")
  assert.match(snapshot.note, /readiness is degraded/)
  assert.deepEqual(calls.sort(), ["/api/fusarium/v1/health", "/api/fusarium/v1/readiness"].sort())
})

const operationalMission = {
  id: "mission.alpha",
  namespace: "operational",
  name: "Mission Alpha",
  description: "",
  status: "active",
  selectedContextId: null,
  revision: 1,
  createdAt: "2026-09-01T19:00:00.000Z",
  updatedAt: "2026-09-01T20:00:00.000Z",
  classification: "UNCLASSIFIED",
}

const operationalArea = {
  id: "area.alpha",
  namespace: "operational",
  name: "Area Alpha",
  description: "",
  bounds: null,
  revision: 1,
  createdAt: "2026-09-01T19:00:00.000Z",
  updatedAt: "2026-09-01T20:00:00.000Z",
  classification: "UNCLASSIFIED",
}

const operationalContext = {
  id: "context.alpha",
  namespace: "operational",
  missionId: operationalMission.id,
  missionAreaId: operationalArea.id,
  missionAreaLabel: operationalArea.name,
  timeRange: { start: "2026-08-31T20:00:00.000Z", end: "2026-09-01T20:00:00.000Z" },
  timeWindow: "24h",
  dataMode: "live",
  selectedObjectId: null,
  selectedEvidenceId: null,
  selectedSourceId: null,
  sourceApplication: "oei-narrative",
  operatorId: "operator.oei-reader",
  operatorRole: "viewer",
  revision: 1,
  createdAt: "2026-09-01T19:00:00.000Z",
  updatedAt: "2026-09-01T20:00:00.000Z",
  classification: "UNCLASSIFIED",
}

test("LIVE catalogs fail closed against demo missions, areas, and contexts", async () => {
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    const url = String(input)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response(readiness)
    if (url.startsWith("/api/fusarium/v1/missions?")) {
      return response({ items: [operationalMission, { ...operationalMission, id: "demo.mission", namespace: "demo" }], page: emptyPage.page })
    }
    if (url.startsWith("/api/fusarium/v1/mission-areas?")) {
      return response({ items: [operationalArea, { ...operationalArea, id: "demo.area", namespace: "demo" }], page: emptyPage.page })
    }
    if (url.startsWith("/api/fusarium/v1/contexts?")) {
      return response({ items: [operationalContext, { ...operationalContext, id: "demo.context", namespace: "demo", dataMode: "simulated" }], page: emptyPage.page })
    }
    return response(emptyPage)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({
    ...parsed,
    missionId: operationalMission.id,
    missionLabel: operationalMission.name,
    missionAreaId: operationalArea.id,
    missionAreaLabel: operationalArea.name,
    mode: "live",
  })
  assert.deepEqual(snapshot.availableMissions.map((item) => item.namespace), ["operational"])
  assert.deepEqual(snapshot.availableMissionAreas.map((item) => item.namespace), ["operational"])
  assert.deepEqual(snapshot.availableContexts.map((item) => item.namespace), ["operational"])
})

test("failed mission catalog stays unavailable rather than measured empty", async () => {
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    const url = String(input)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response(readiness)
    if (url.startsWith("/api/fusarium/v1/missions?")) return response({ detail: "catalog unavailable" }, 503)
    return response(emptyPage)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({ ...parsed, mode: "live" })
  assert.equal(snapshot.condition, "degraded")
  assert.match(snapshot.note, /record count is unknown, not empty/)
})

test("REPLAY withholds simulated activity and requires explicit data mode", async () => {
  const operationalActivity = {
    id: "activity.operational",
    sequence: 1,
    namespace: "operational",
    missionId: operationalMission.id,
    missionContextId: null,
    actorId: "operator.alpha",
    actorRole: "viewer",
    occurredAt: "2026-09-01T19:30:00.000Z",
    actionType: "evidence_viewed",
    objectIds: [],
    evidenceIds: [],
    beforeState: null,
    afterState: null,
    judgment: null,
    auditMetadata: {},
    dataMode: "replay",
    appendOnly: true,
    classification: "UNCLASSIFIED",
  }
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    const url = String(input)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response(readiness)
    if (url.startsWith("/api/fusarium/v1/missions?")) return response({ items: [operationalMission], page: emptyPage.page })
    if (url.endsWith("/replay")) {
      return response({
        items: [operationalActivity, { ...operationalActivity, id: "activity.demo", namespace: "demo", dataMode: "simulated" }],
        page: emptyPage.page,
      })
    }
    return response(emptyPage)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const snapshot = await provider.load({
    ...parsed,
    missionId: operationalMission.id,
    missionLabel: operationalMission.name,
    mode: "replay",
  })
  assert.deepEqual(snapshot.activity.map((item) => item.id), [operationalActivity.id])
  assert.ok(snapshot.activity.every((item) => item.namespace === "operational" && item.dataMode !== "simulated"))
})

test("forecast remains isolated and never requests current objects", async () => {
  const calls = []
  const provider = providerModule.createOeiNarrativeProvider(async (input) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith("/health")) return response(health)
    if (url.endsWith("/readiness")) return response(readiness)
    if (url.startsWith("/api/fusarium/v1/missions")) {
      return response({
        items: [operationalMission],
        page: emptyPage.page,
      })
    }
    return response(emptyPage)
  }, () => Date.parse("2026-09-01T20:00:00.000Z"))
  const sharedForecast = deepLinks.parseOeiContext(new URLSearchParams("dataMode=forecast"))
  const snapshot = await provider.load({
    ...sharedForecast,
    missionId: "mission.alpha",
    missionLabel: "Mission Alpha",
    mode: "forecast",
  })
  assert.equal(snapshot.condition, "forecast")
  assert.equal(snapshot.objects.length, 0)
  assert.ok(snapshot.note.includes("no forecast data mode"))
  assert.equal(calls.some((url) => url.includes("/objects")), false)
  assert.equal(calls.some((url) => url.includes("/evidence")), false)
})
