import test, { after } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const sourceDir = fileURLToPath(new URL("..", import.meta.url))
const compiledDir = mkdtempSync(join(tmpdir(), "fusarium-stack-tests-"))
for (const name of ["contracts", "provider"]) {
  const source = readFileSync(join(sourceDir, `${name}.ts`), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace('from "./contracts"', 'from "./contracts.mjs"')
  writeFileSync(join(compiledDir, `${name}.mjs`), output)
}

after(() => rmSync(compiledDir, { recursive: true, force: true }))

const contracts = await import(pathToFileURL(join(compiledDir, "contracts.mjs")))
const provider = await import(pathToFileURL(join(compiledDir, "provider.mjs")))

const NOW = "2026-09-01T20:00:00.000Z"

const outcome = (endpoint, payload, status = 200, receivedAt = NOW) => ({
  endpoint,
  ok: status >= 200 && status < 300,
  status,
  receivedAt,
  payload,
  error: status >= 200 && status < 300 ? null : `HTTP ${status}`,
})

const networkFailure = (endpoint) => ({
  endpoint,
  ok: false,
  status: null,
  receivedAt: NOW,
  payload: null,
  error: "network unavailable",
})

const component = (id, overrides = {}) => ({
  classification: "UNCLASSIFIED",
  id,
  state: "configured",
  configured: true,
  verified: false,
  required: false,
  checkedAt: NOW,
  lastSuccessAt: null,
  dataMode: "unavailable",
  detail: "Configuration metadata is present; no component call was made.",
  ...overrides,
})

const readinessPayload = (overrides = {}) => ({
  classification: "UNCLASSIFIED",
  schemaRef: "fusarium-intelligence/v1",
  status: "degraded",
  service: "fusarium-intelligence",
  version: "1.0.0",
  checkedAt: NOW,
  bindExposure: component("runtime:bind", { required: true, state: "degraded", dataMode: "live" }),
  identity: component("identity:operator", { required: true }),
  storage: component("storage:sqlite", {
    required: true,
    state: "live",
    verified: true,
    lastSuccessAt: NOW,
    dataMode: "live",
  }),
  backup: component("storage:backup", { state: "unconfigured", configured: false }),
  migrations: {
    state: "verified",
    currentVersion: 2,
    targetVersion: 2,
    pending: [],
    checkedAt: NOW,
  },
  sourceReachability: [],
  connectorAuthorization: [],
  staging: component("environment:staging", { state: "unconfigured", configured: false }),
  identityMode: "development_header_unverified",
  developmentIdentity: true,
  demoEnabled: true,
  ...overrides,
})

const operatorPayload = (devices = []) => ({
  classification: "UNCLASSIFIED",
  auth_mode: "commercial_unclassified",
  natureos: { devices, events: [], device_count: devices.length },
  fusion: null,
  il: { tracks: [], correlations: [] },
  nlm: { bridge: true, model_deployed: false },
  insight_gate: { promoted_count: 0, conclusions: [], writes_back_to_natureos: false },
  partner_mesh: [],
  adapters: {
    lattice: { configured: false, note: "Lattice is unconfigured." },
    palantir: { configured: false, note: "Palantir is unconfigured." },
    launchpad: { commercial_only: true, isolated: true, note: "Commercial seam only." },
  },
  honest_gaps: ["No accredited identity provider is configured."],
})

const contractPayload = {
  schemaRef: "fusarium-intelligence/v1",
  service: "fusarium-intelligence",
  version: "1.0.0",
  classification: "UNCLASSIFIED",
  operationalNamespace: "operational",
  demoPath: "/api/fusarium/v1/demo",
  identityMode: "development_header_unverified",
  identityVerified: false,
  persistence: "local-sqlite-wal",
  activityTransport: "bounded-polling",
  productionAccredited: false,
}

const healthPayload = {
  classification: "UNCLASSIFIED",
  schemaRef: "fusarium-intelligence/v1",
  status: "healthy",
  service: "fusarium-intelligence",
  version: "1.0.0",
  checkedAt: NOW,
}

const item = (snapshot, id) => {
  const found = snapshot.inventory.find((entry) => entry.id === id)
  assert.ok(found, `missing inventory item ${id}`)
  return found
}

test("loading snapshot exposes no invented counts", () => {
  const snapshot = provider.createLoadingSnapshot(new Date(NOW))
  assert.equal(snapshot.condition, "loading")
  assert.ok(snapshot.inventory.every((entry) => entry.state === "loading"))
  assert.ok(snapshot.inventory.every((entry) => entry.recordCount === null))
  assert.ok(snapshot.inventory.every((entry) => entry.queueDepth === null))
})

test("validated empty device registry preserves an explicit numeric zero", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.operator, operatorPayload([])),
  ])
  const registry = item(snapshot, "sensor:runtime-registry")
  assert.equal(registry.state, "empty")
  assert.equal(registry.recordCount, 0)
  assert.equal(registry.signals.data.state, "empty")
  assert.equal(item(snapshot, "model:nlm").recordCount, null)
})

test("stale and future component timestamps remain distinguishable", () => {
  const stale = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.readiness, readinessPayload({
      sourceReachability: [component("provider:local-runtime", {
        state: "live",
        verified: true,
        dataMode: "live",
        lastSuccessAt: "2026-09-01T19:00:00.000Z",
      })],
    })),
  ])
  assert.equal(item(stale, "provider:local-runtime").state, "stale")
  assert.equal(item(stale, "provider:local-runtime").signals.freshness.state, "stale")

  const future = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.readiness, readinessPayload({
      sourceReachability: [component("provider:local-runtime", {
        state: "live",
        verified: true,
        dataMode: "live",
        lastSuccessAt: "2026-09-01T20:01:00.000Z",
      })],
    })),
  ])
  assert.equal(item(future, "provider:local-runtime").state, "unknown")
  assert.equal(item(future, "provider:local-runtime").signals.freshness.state, "unknown")
  assert.match(item(future, "provider:local-runtime").signals.freshness.detail, /ahead of the local clock/)
})

test("malformed successful payload keeps endpoint reachability separate from schema failure", async () => {
  const fakeFetch = async (endpoint) => {
    if (endpoint === provider.STACK_ENDPOINTS.operator) {
      return { ok: true, status: 200, json: async () => { throw new Error("bad json") } }
    }
    return { ok: false, status: 503, json: async () => ({ detail: { error: "not_bound" } }) }
  }
  const snapshot = await provider.createRuntimeStackInventoryProvider(fakeFetch, () => new Date(NOW)).load()
  const operator = item(snapshot, "service:operator-state")
  assert.equal(operator.state, "degraded")
  assert.equal(operator.signals.endpoint.state, "reachable")
  assert.equal(operator.signals.schema.state, "incompatible")
  assert.match(operator.summary, /must be an object/)
})

test("401 identity rejection and 403 permission denial are not conflated", () => {
  const identityRejected = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.contract, null, 401),
  ])
  const root401 = item(identityRejected, "service:intelligence-v1")
  assert.equal(root401.state, "unauthorized")
  assert.equal(root401.signals.identity.state, "unverified")
  assert.equal(root401.signals.permission.state, "not_probed")

  const permissionDenied = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.readiness, null, 403),
  ])
  const root403 = item(permissionDenied, "service:intelligence-readiness")
  assert.equal(root403.state, "unauthorized")
  assert.equal(root403.signals.permission.state, "denied")
  assert.equal(root403.signals.identity.state, "unknown")
})

test("HTTP 503 is service unavailable while the endpoint remains reachable", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.operator, operatorPayload([])),
    {
      ...outcome(provider.STACK_ENDPOINTS.contract, { detail: { error: "not_bound" } }, 503),
      error: "HTTP 503 · not_bound",
    },
  ])
  const contract = item(snapshot, "service:intelligence-v1")
  assert.equal(contract.state, "unavailable")
  assert.equal(contract.signals.endpoint.state, "reachable")
  assert.equal(contract.signals.exchange.state, "no_exchange")
  assert.equal(snapshot.condition, "degraded")
})

test("network failure is unreachable and does not fabricate data", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    networkFailure(provider.STACK_ENDPOINTS.health),
  ])
  const health = item(snapshot, "service:intelligence-health")
  assert.equal(health.state, "unavailable")
  assert.equal(health.signals.endpoint.state, "unreachable")
  assert.equal(health.signals.data.state, "unavailable")
})

test("simulated is emitted only from an explicit readiness data mode", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.readiness, readinessPayload({
      sourceReachability: [component("source:mindex", {
        state: "configured",
        dataMode: "simulated",
        detail: "Explicit sanitized simulation boundary.",
      })],
    })),
  ])
  const source = item(snapshot, "source:mindex")
  assert.equal(source.state, "simulated")
  assert.equal(source.signals.data.state, "simulated")
  assert.match(source.simulatedBoundary, /No fallback|invented data/)
})

test("full local contract validates source implementation without claiming production accreditation", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.operator, operatorPayload([])),
    outcome(provider.STACK_ENDPOINTS.contract, contractPayload),
    outcome(provider.STACK_ENDPOINTS.health, healthPayload),
    outcome(provider.STACK_ENDPOINTS.readiness, readinessPayload()),
  ])
  const contract = item(snapshot, "service:intelligence-v1")
  assert.equal(contract.state, "live")
  assert.equal(contract.version, "1.0.0")
  assert.equal(contract.signals.identity.state, "unverified")
  assert.match(contract.authorizationScope, /development headers/)
  assert.equal(item(snapshot, "schema:migrations").backlogCount, 0)
})

test("readiness component id collisions fail schema validation without overwriting operator truth", () => {
  const collision = readinessPayload({
    sourceReachability: [component("service:operator-state", { required: true, state: "live" })],
  })
  const snapshot = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.operator, operatorPayload([])),
    outcome(provider.STACK_ENDPOINTS.readiness, collision),
  ])
  assert.equal(item(snapshot, "service:operator-state").state, "live")
  assert.equal(item(snapshot, "service:intelligence-readiness").state, "degraded")
  assert.equal(item(snapshot, "service:intelligence-readiness").signals.schema.state, "incompatible")
})

test("filters, handoffs, keyboard navigation, and semantic evidence keys are stable", () => {
  const first = provider.buildStackInventorySnapshotForTest([
    outcome(provider.STACK_ENDPOINTS.operator, operatorPayload([])),
  ], new Date(NOW))
  const visible = contracts.filterInventory(first.inventory, { query: "SQLite / WAL repository", category: "all", state: "all" })
  assert.deepEqual(visible.map((entry) => entry.id), ["storage:sqlite"])
  assert.equal(contracts.nextInventorySelection(first.inventory, null, "ArrowDown"), first.inventory[0].id)
  assert.equal(contracts.nextInventorySelection(first.inventory, null, "ArrowUp"), first.inventory.at(-1).id)
  assert.equal(contracts.nextInventorySelection(first.inventory, first.inventory[0].id, "Escape"), null)

  const params = new URLSearchParams("missionAreaId=area-7&timeWindow=72h&dataMode=system&unsafe=drop")
  const link = new URL(contracts.buildStackHandoffLink("data-fusion", params, "source:mindex"), "http://local")
  assert.equal(link.pathname, "/fusarium/data-fusion")
  assert.equal(link.searchParams.get("missionAreaId"), "area-7")
  assert.equal(link.searchParams.get("sourceId"), "source:mindex")
  assert.equal(link.searchParams.get("classification"), "UNCLASSIFIED")
  assert.equal(link.searchParams.has("unsafe"), false)

  const later = structuredClone(first)
  later.inventory[0].lastHeartbeatAt = "2026-09-01T20:00:15.000Z"
  assert.notEqual(contracts.semanticSnapshotKey(first), contracts.semanticSnapshotKey(later))
})

test("runtime polling is limited to local read-only status contracts", async () => {
  const requests = []
  const controller = new AbortController()
  const fetcher = async (input, init) => {
    requests.push({ input, signal: init?.signal })
    return {
      ok: false,
      status: 503,
      json: async () => ({ detail: { error: "not_bound" } }),
    }
  }
  const runtime = provider.createRuntimeStackInventoryProvider(fetcher, () => new Date(NOW))

  await runtime.load(controller.signal)

  assert.deepEqual(requests.map(({ input }) => input), Object.values(provider.STACK_ENDPOINTS))
  assert.equal(requests.every(({ signal }) => signal === controller.signal), true)
  assert.equal(
    requests.some(({ input }) => /connectors|bindings\/local|classification\/authorization/.test(input)),
    false,
  )
})

test("secret metadata exposes references and expiry posture, never values", () => {
  const snapshot = provider.buildStackInventorySnapshotForTest([])
  const lattice = item(snapshot, "connector:lattice")
  assert.deepEqual(lattice.secretRefs, ["LATTICE_TOKEN"])
  assert.equal(lattice.credentialExpiry, "not_reported")
  assert.equal(JSON.stringify(lattice).includes("secret-value"), false)
})
