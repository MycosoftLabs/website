import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-cc-tests-"))
for (const name of ["contracts", "deep-links", "scenario", "provider"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from "\.\/(contracts|scenario)"/g, 'from "./$1.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const { buildCommandLink, parseCommandContext } = await import(pathToFileURL(join(compiledDir, "deep-links.mjs")))
const { createCommandControlProvider } = await import(pathToFileURL(join(compiledDir, "provider.mjs")))

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const baseContext = parseCommandContext(new URLSearchParams(), Date.parse("2026-09-01T12:00:00Z"))

test("default role is a non-authoritative viewer hint", () => {
  assert.equal(baseContext.operatorRole, "viewer")
})

test("deep links preserve mission, area, time, mode, selection, role, and UNCLASSIFIED boundary", () => {
  const context = {
    ...baseContext,
    missionId: "mission.alpha",
    contextId: "context.alpha",
    missionAreaId: "area.alpha",
    missionAreaLabel: "Area Alpha",
    timeWindow: "72h",
    mode: "forecast",
    selectedObjectId: "object.alpha",
    selectedEvidenceId: "evidence.alpha",
    selectedSourceId: "source.alpha",
    selectedDeviceId: "psathyrella",
    operatorRole: "viewer",
  }
  const link = new URL(buildCommandLink("situationalAwareness", context), "http://local")
  assert.equal(link.pathname, "/fusarium/situational-awareness")
  assert.equal(link.searchParams.get("missionId"), "mission.alpha")
  assert.equal(link.searchParams.get("contextId"), "context.alpha")
  assert.equal(link.searchParams.get("missionAreaLabel"), "Area Alpha")
  assert.equal(link.searchParams.get("ccMode"), "forecast")
  assert.equal(link.searchParams.get("dataMode"), "system")
  assert.equal(link.searchParams.get("objectId"), "object.alpha")
  assert.equal(link.searchParams.get("evidenceId"), "evidence.alpha")
  assert.equal(link.searchParams.get("sourceId"), "source.alpha")
  assert.equal(link.searchParams.get("deviceId"), "psathyrella")
  assert.equal(link.searchParams.get("operatorRole"), "viewer")
  assert.equal(link.searchParams.get("classification"), "UNCLASSIFIED")
  assert.equal(parseCommandContext(link.searchParams).mode, "forecast")
})

test("HTTP 503 not_bound is reachable but contract-unavailable, never empty or live", async () => {
  const calls = []
  const provider = createCommandControlProvider(async (url) => {
    calls.push(String(url))
    return json({ detail: { error: { code: "not_bound", message: "route not bound" } } }, 503)
  })
  const snapshot = await provider.load(baseContext)
  const root = snapshot.truth.find((item) => item.id === "contract-root")
  assert.equal(snapshot.condition, "unavailable")
  assert.equal(snapshot.contract, null)
  assert.equal(root.transport, "reachable")
  assert.equal(root.httpStatus, 503)
  assert.equal(root.schema, "invalid")
  assert.equal(root.recordCount, null)
  assert.deepEqual(snapshot.objects, [])
  assert.deepEqual(snapshot.evidence, [])
  assert.deepEqual(snapshot.reviews, [])
  assert.ok(calls.every((url) => url.startsWith("/api/fusarium/v1")))
})

test("sanitized scenario stays wholly simulated even when the backend demo endpoint is unavailable", async () => {
  const provider = createCommandControlProvider(async () => json({ detail: "not_bound" }, 503))
  const snapshot = await provider.load({ ...baseContext, mode: "simulated" })
  assert.equal(snapshot.condition, "simulated")
  assert.ok(snapshot.objects.length > 0)
  assert.ok(snapshot.objects.every((item) => item.synthetic && item.namespace === "demo" && item.dataMode === "simulated"))
  assert.ok(snapshot.evidence.every((item) => item.synthetic && item.namespace === "demo"))
  assert.ok(snapshot.reviews.every((item) => item.synthetic && item.namespace === "demo"))
  assert.ok(snapshot.sources.every((item) => item.synthetic && item.live === false))
  assert.equal(snapshot.packagePreview.externalRelease, "DISABLED")
  assert.ok(snapshot.recipients.filter((item) => item.kind === "external-disabled").every((item) => item.readiness === "blocked"))
  assert.equal(snapshot.truth.find((item) => item.id === "demo")?.schema, "invalid")
})

test("a validated but record-empty v1 surface stays explicitly empty", async () => {
  const root = {
    schemaRef: "fusarium-intelligence/v1",
    service: "fusarium-intelligence",
    version: "1.0.0",
    classification: "UNCLASSIFIED",
    identityMode: "development_header_unverified",
    identityVerified: false,
    persistence: "local-sqlite-wal",
    activityTransport: "bounded-polling",
    productionAccredited: false,
  }
  const component = {
    id: "storage:sqlite",
    state: "live",
    configured: true,
    verified: true,
    required: true,
    checkedAt: "2026-09-01T12:00:00Z",
    lastSuccessAt: "2026-09-01T12:00:00Z",
    dataMode: "live",
    detail: "local test",
    classification: "UNCLASSIFIED",
  }
  const readiness = {
    schemaRef: "fusarium-intelligence/v1",
    status: "degraded",
    service: "fusarium-intelligence",
    version: "1.0.0",
    checkedAt: "2026-09-01T12:00:00Z",
    bindExposure: component,
    identity: { ...component, id: "identity:operator", verified: false },
    storage: component,
    backup: { ...component, id: "storage:backup", configured: false, verified: false },
    migrations: { state: "verified", currentVersion: 1, targetVersion: 1, pending: [], checkedAt: "2026-09-01T12:00:00Z" },
    sourceReachability: [],
    connectorAuthorization: [],
    staging: { ...component, id: "environment:staging", configured: false, verified: false },
    identityMode: "development_header_unverified",
    developmentIdentity: true,
    demoEnabled: true,
    classification: "UNCLASSIFIED",
  }
  const provider = createCommandControlProvider(async (url) => {
    const target = String(url)
    if (target === "/api/fusarium/v1") return json(root)
    if (target.endsWith("/readiness")) return json(readiness)
    if (target.endsWith("/connectors")) return json([])
    return json({ items: [], page: { nextCursor: null, hasMore: false, limit: 100 } })
  })
  const snapshot = await provider.load(baseContext)
  assert.equal(snapshot.condition, "empty")
  assert.match(snapshot.note, /no mission context/i)
  assert.equal(snapshot.truth.find((item) => item.id === "missions")?.recordCount, 0)
  assert.equal(snapshot.packagePreview.messageReadiness, "unavailable")
  assert.equal(snapshot.recipients.find((item) => item.kind === "local-review")?.readiness, "blocked")
  assert.equal(snapshot.policyGates.find((item) => item.id === "authorization")?.result, "hold")
})

test("forged client role and identity cannot authorize review or activity writes", async () => {
  const calls = []
  const review = {
    id: "review.alpha",
    namespace: "operational",
    missionId: "mission.alpha",
    kind: "evidence",
    state: "in_review",
    objectIds: ["object.alpha"],
    evidenceIds: ["evidence.alpha"],
    requestedBy: "operator.alpha",
    assignedTo: "analyst.alpha",
    judgment: null,
    dataMode: "live",
    synthetic: false,
    revision: 1,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T11:00:00Z",
    classification: "UNCLASSIFIED",
  }
  const provider = createCommandControlProvider(async (url, init) => {
    calls.push({ url: String(url), method: init?.method, body: init?.body })
    return json({ error: "a fail-closed provider must never call this fetcher" }, 500)
  })
  const forgedContext = parseCommandContext(
    new URLSearchParams("operatorRole=admin&operatorId=forged.client&ccMode=live"),
    Date.parse("2026-09-01T12:00:00Z"),
  )
  assert.equal(forgedContext.operatorRole, "admin")
  await assert.rejects(
    provider.decideReview(
      { ...forgedContext, missionId: "mission.alpha", contextId: "context.alpha" },
      review,
      {
        reviewId: review.id,
        expectedRevision: 1,
        missionId: "mission.alpha",
        missionContextId: "context.alpha",
        objectIds: review.objectIds,
        evidenceIds: review.evidenceIds,
        previousState: "in_review",
        decision: "accepted",
        judgment: "Human judgment",
      },
    ),
    /AUTHORIZATION FAIL: server-verified identity and scoped review authorization are unavailable/,
  )
  assert.deepEqual(calls, [])
})
