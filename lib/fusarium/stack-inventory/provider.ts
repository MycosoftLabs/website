import {
  STACK_INVENTORY_SCHEMA_VERSION,
  deriveFreshnessSignal,
  signal,
  unknownSignals,
  type InventoryEvidence,
  type InventoryItem,
  type InventorySignals,
  type InventoryState,
  type SnapshotCondition,
  type StackCategory,
  type StackInventorySnapshot,
  type StackPollEvent,
  type TopologyEdge,
} from "./contracts"

export const STACK_ENDPOINTS = {
  operator: "/api/fusarium/operator/state",
  contract: "/api/fusarium/v1",
  health: "/api/fusarium/v1/health",
  readiness: "/api/fusarium/v1/readiness",
} as const

type StackEndpoint = (typeof STACK_ENDPOINTS)[keyof typeof STACK_ENDPOINTS]

interface ResponseLike {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export type StackFetch = (
  input: string,
  init?: { cache?: RequestCache; signal?: AbortSignal },
) => Promise<ResponseLike>

export interface FetchOutcome {
  endpoint: StackEndpoint
  ok: boolean
  status: number | null
  receivedAt: string
  payload: unknown
  error: string | null
}

interface OperatorState {
  classification: string
  authMode: string
  devices: Array<Record<string, unknown>>
  deviceCount: number | null
  nlmBridge: boolean | null
  modelDeployed: boolean | null
  adapters: Record<string, Record<string, unknown>>
  honestGaps: string[]
}

type ConnectorState =
  | "unconfigured"
  | "configured"
  | "verified"
  | "live"
  | "degraded"
  | "unauthorized"
  | "unreachable"
  | "stale"

type ComponentDataMode = "live" | "recorded" | "replay" | "simulated" | "unavailable" | "degraded"

interface ComponentReadiness {
  id: string
  state: ConnectorState
  configured: boolean
  verified: boolean
  required: boolean
  checkedAt: string
  lastSuccessAt: string | null
  dataMode: ComponentDataMode
  detail: string
}

interface MigrationReadiness {
  state: ConnectorState
  currentVersion: number
  targetVersion: number
  pending: number[]
  checkedAt: string
}

interface ReadinessState {
  schemaRef: string
  classification: string
  status: "ready" | "degraded" | "not_ready"
  service: string
  version: string
  checkedAt: string
  bindExposure: ComponentReadiness
  identity: ComponentReadiness
  storage: ComponentReadiness
  backup: ComponentReadiness
  migrations: MigrationReadiness
  sourceReachability: ComponentReadiness[]
  connectorAuthorization: ComponentReadiness[]
  staging: ComponentReadiness
  identityMode: string
  developmentIdentity: boolean
  demoEnabled: boolean
}

interface ContractRoot {
  schemaRef: string
  service: string
  version: string
  classification: string
  operationalNamespace: string
  demoPath: string
  identityMode: string
  identityVerified: boolean
  persistence: string
  activityTransport: string
  productionAccredited: boolean
}

interface HealthState {
  schemaRef: string
  classification: string
  status: string
  service: string
  version: string
  checkedAt: string
}

interface InventoryDefinition {
  id: string
  category: StackCategory
  name: string
  required: boolean
  lifecycle: string
  apiMaturity: string
  endpointRef: string | null
  authorizationScope: string
  simulatedBoundary: string
  secretRefs?: string[]
  dependencies: string[]
  downstream: string[]
  evidence: InventoryEvidence[]
}

const buildEvidence = (
  label: string,
  ref: string,
  href: string | null = null,
): InventoryEvidence => ({ label, ref, href })

const DEFINITIONS: InventoryDefinition[] = [
  {
    id: "node:twins-host-8012",
    category: "node",
    name: "Twins host · 8012",
    required: true,
    lifecycle: "local development",
    apiMaturity: "Next.js host · implemented",
    endpointRef: "http://127.0.0.1:8012",
    authorizationScope: "Local browser session; no accredited identity boundary.",
    simulatedBoundary: "Hosts operational and simulated views; mode remains explicit per record.",
    dependencies: [],
    downstream: ["Stack Inventory", "Situational Awareness", "Data Fusion", "Overview"],
    evidence: [buildEvidence("Current UI origin", "local-http://127.0.0.1:8012")],
  },
  {
    id: "runtime:bind",
    category: "node",
    name: "Fusarium runtime · 8011",
    required: true,
    lifecycle: "local development",
    apiMaturity: "HTTP runtime · implemented",
    endpointRef: "http://127.0.0.1:8011",
    authorizationScope: "UNCLASSIFIED commercial development only.",
    simulatedBoundary: "Runtime routes must label demo records; no operational accreditation.",
    dependencies: ["node:twins-host-8012"],
    downstream: ["service:operator-state", "service:intelligence-v1"],
    evidence: [
      buildEvidence(
        "Runtime boundary",
        "source://services/runtime/FUSARIUM_INTELLIGENCE_V1.md#local-boundary",
      ),
    ],
  },
  {
    id: "service:operator-state",
    category: "service",
    name: "Operator state API",
    required: true,
    lifecycle: "implemented",
    apiMaturity: "legacy read-only contract",
    endpointRef: STACK_ENDPOINTS.operator,
    authorizationScope: "Commercial UNCLASSIFIED status; no accredited identity assertion.",
    simulatedBoundary: "Reports explicit gaps; does not fabricate connector or model data.",
    dependencies: ["runtime:bind"],
    downstream: ["sensor:runtime-registry", "model:nlm", "adapter:launchpad"],
    evidence: [
      buildEvidence("Operator state response", STACK_ENDPOINTS.operator, STACK_ENDPOINTS.operator),
      buildEvidence(
        "Route implementation",
        "source://services/runtime/fusarium_runtime/routers/fusarium.py#operator-state",
      ),
    ],
  },
  {
    id: "service:intelligence-v1",
    category: "service",
    name: "Environmental Intelligence API v1",
    required: true,
    lifecycle: "implemented in source",
    apiMaturity: "v1 contract",
    endpointRef: STACK_ENDPOINTS.contract,
    authorizationScope: "Discovery is open locally; data routes require unverified development headers.",
    simulatedBoundary: "Operational and demo namespaces are contractually separated.",
    dependencies: ["runtime:bind", "schema:intelligence-v1"],
    downstream: ["service:intelligence-health", "service:intelligence-readiness"],
    evidence: [
      buildEvidence("v1 discovery", STACK_ENDPOINTS.contract, STACK_ENDPOINTS.contract),
      buildEvidence(
        "Contract source",
        "source://services/runtime/fusarium_runtime/routers/intelligence.py#contract-root",
      ),
    ],
  },
  {
    id: "service:intelligence-health",
    category: "service",
    name: "Intelligence health probe",
    required: true,
    lifecycle: "implemented in source",
    apiMaturity: "v1 health contract",
    endpointRef: STACK_ENDPOINTS.health,
    authorizationScope: "Local read-only health metadata.",
    simulatedBoundary: "Health is process status, not mission-data truth.",
    dependencies: ["service:intelligence-v1"],
    downstream: ["Stack Inventory", "Overview"],
    evidence: [buildEvidence("v1 health", STACK_ENDPOINTS.health, STACK_ENDPOINTS.health)],
  },
  {
    id: "service:intelligence-readiness",
    category: "service",
    name: "Intelligence readiness report",
    required: true,
    lifecycle: "implemented in source",
    apiMaturity: "v1 readiness contract",
    endpointRef: STACK_ENDPOINTS.readiness,
    authorizationScope: "Local read-only readiness metadata.",
    simulatedBoundary: "Configured is kept separate from verified and live.",
    dependencies: ["service:intelligence-v1", "storage:sqlite", "identity:operator"],
    downstream: ["Stack Inventory", "Overview", "Situational Awareness"],
    evidence: [buildEvidence("v1 readiness", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  },
  {
    id: "identity:operator",
    category: "service",
    name: "Operator identity seam",
    required: true,
    lifecycle: "development seam",
    apiMaturity: "role-aware headers · unverified",
    endpointRef: null,
    authorizationScope: "development_header_unverified; viewer/operator/analyst/admin metadata only.",
    simulatedBoundary: "No CAC, PIV, IL4, or production assurance.",
    dependencies: ["service:intelligence-v1"],
    downstream: ["All protected v1 data routes"],
    evidence: [
      buildEvidence(
        "Identity policy",
        "source://services/runtime/FUSARIUM_INTELLIGENCE_V1.md#development-identity",
      ),
    ],
  },
  {
    id: "storage:sqlite",
    category: "service",
    name: "SQLite / WAL repository",
    required: true,
    lifecycle: "implemented locally",
    apiMaturity: "durable local repository",
    endpointRef: null,
    authorizationScope: "Local process storage; operational record boundary is not approved.",
    simulatedBoundary: "Operational and demo namespaces cannot mix.",
    dependencies: ["schema:migrations"],
    downstream: ["Mission context", "Activity", "Handoffs", "Layouts"],
    evidence: [
      buildEvidence(
        "Repository implementation",
        "source://services/runtime/fusarium_runtime/intelligence/repository.py#sqlite",
      ),
    ],
  },
  {
    id: "storage:backup",
    category: "service",
    name: "Backup and recovery",
    required: false,
    lifecycle: "not configured",
    apiMaturity: "no service",
    endpointRef: null,
    authorizationScope: "No backup operator or retention authority is configured.",
    simulatedBoundary: "Not applicable.",
    dependencies: ["storage:sqlite"],
    downstream: ["Operational continuity"],
    evidence: [buildEvidence("Readiness contract", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  },
  {
    id: "schema:intelligence-v1",
    category: "schema",
    name: "fusarium-intelligence/v1",
    required: true,
    lifecycle: "implemented in source",
    apiMaturity: "versioned JSON contract",
    endpointRef: STACK_ENDPOINTS.contract,
    authorizationScope: "UNCLASSIFIED typed resources only.",
    simulatedBoundary: "Demo records require namespace=demo, dataMode=simulated, synthetic=true.",
    dependencies: ["service:intelligence-v1"],
    downstream: ["All v1 clients"],
    evidence: [
      buildEvidence(
        "Contract models",
        "source://services/runtime/fusarium_runtime/intelligence/contracts.py",
      ),
    ],
  },
  {
    id: "schema:migrations",
    category: "schema",
    name: "SQLite migration set",
    required: true,
    lifecycle: "implemented in source",
    apiMaturity: "versioned migration contract",
    endpointRef: STACK_ENDPOINTS.readiness,
    authorizationScope: "Local repository initialization.",
    simulatedBoundary: "Shared by separated operational/demo namespaces.",
    dependencies: ["schema:intelligence-v1"],
    downstream: ["storage:sqlite"],
    evidence: [buildEvidence("Migration readiness", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  },
  {
    id: "sensor:runtime-registry",
    category: "sensor",
    name: "Runtime sensor/device registry",
    required: false,
    lifecycle: "implemented · current contents runtime-derived",
    apiMaturity: "operator-state projection",
    endpointRef: STACK_ENDPOINTS.operator,
    authorizationScope: "Commercial UNCLASSIFIED records only.",
    simulatedBoundary: "No sensor is generated when the registry is empty.",
    dependencies: ["service:operator-state"],
    downstream: ["provider:local-runtime", "Situational Awareness", "Data Fusion"],
    evidence: [buildEvidence("Operator device registry", `${STACK_ENDPOINTS.operator}#natureos.devices`, STACK_ENDPOINTS.operator)],
  },
  {
    id: "provider:local-runtime",
    category: "source",
    name: "Local runtime binding",
    required: false,
    lifecycle: "implemented read-only provider",
    apiMaturity: "v1 provider boundary",
    endpointRef: "/api/fusarium/v1/bindings/local/sources",
    authorizationScope: "Local records only; no upstream call.",
    simulatedBoundary: "Never seeds operational data; explicit gaps when empty.",
    dependencies: ["sensor:runtime-registry", "service:intelligence-v1"],
    downstream: ["Situational Awareness", "Data Fusion", "Overview"],
    evidence: [
      buildEvidence(
        "Provider contract",
        "source://services/runtime/FUSARIUM_INTELLIGENCE_V1.md#provider-boundaries",
      ),
    ],
  },
  {
    id: "source:demo-fixture",
    category: "source",
    name: "Sanitized Alpha-7 fixture",
    required: false,
    lifecycle: "implemented · opt-in",
    apiMaturity: "read-only demo contract",
    endpointRef: "/api/fusarium/v1/demo",
    authorizationScope: "Local demonstration only.",
    simulatedBoundary: "Always namespace=demo, dataMode=simulated, synthetic=true.",
    dependencies: ["schema:intelligence-v1"],
    downstream: ["Explicit demo-mode UI only"],
    evidence: [
      buildEvidence(
        "Demo boundary",
        "source://services/runtime/FUSARIUM_INTELLIGENCE_V1.md#contract-conventions",
      ),
    ],
  },
  {
    id: "model:nlm",
    category: "model",
    name: "Nature Language Model",
    required: false,
    lifecycle: "bridge present · model absent",
    apiMaturity: "operator-state flag",
    endpointRef: `${STACK_ENDPOINTS.operator}#nlm`,
    authorizationScope: "No deployed model or inference authorization.",
    simulatedBoundary: "No output is generated while the model is absent.",
    dependencies: ["service:operator-state"],
    downstream: ["Data Fusion", "OEI Narrative"],
    evidence: [buildEvidence("NLM state", `${STACK_ENDPOINTS.operator}#nlm`, STACK_ENDPOINTS.operator)],
  },
  {
    id: "environment:staging",
    category: "node",
    name: "Staging / deployment boundary",
    required: false,
    lifecycle: "not configured",
    apiMaturity: "no deployment target",
    endpointRef: null,
    authorizationScope: "No staging guest, deploy, DNS, TLS, or metrics authority.",
    simulatedBoundary: "Local development only.",
    dependencies: ["node:twins-host-8012", "runtime:bind"],
    downstream: ["Production readiness"],
    evidence: [buildEvidence("Readiness contract", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  },
  ...[
    ["source:mindex", "MINDEX", ["MINDEX_INTERNAL_TOKEN", "MINDEX_API_KEY"]],
    ["source:mas", "MAS", []],
    ["source:natureos-core", "NatureOS Core", []],
    ["source:earth2", "Earth-2", []],
  ].map(([id, name, secretRefs]) => ({
    id: id as string,
    category: "source" as const,
    name: name as string,
    required: false,
    lifecycle: "disabled / unverified",
    apiMaturity: "connector seam only",
    endpointRef: null,
    authorizationScope: "No authorized operational access.",
    simulatedBoundary: "No fallback or invented data.",
    secretRefs: secretRefs as string[],
    dependencies: ["service:intelligence-v1", "identity:operator"],
    downstream: ["Situational Awareness", "Data Fusion", "Overview"],
    evidence: [buildEvidence("Source readiness", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  })),
  ...[
    ["connector:mindex", "MINDEX adapter", ["MINDEX_INTERNAL_TOKEN", "MINDEX_API_KEY"]],
    ["connector:lattice", "Anduril Lattice", ["LATTICE_TOKEN"]],
    ["connector:palantir", "Palantir Foundry", ["PALANTIR_TOKEN"]],
    ["connector:platform-one", "Platform One", []],
    ["connector:jadc2", "JADC2", []],
  ].map(([id, name, secretRefs]) => ({
    id: id as string,
    category: "adapter" as const,
    name: name as string,
    required: false,
    lifecycle: "disabled / unverified",
    apiMaturity: "external adapter seam",
    endpointRef: null,
    authorizationScope: "No authorized connector access; the adapter must not be called.",
    simulatedBoundary: "No fallback or fabricated partner data.",
    secretRefs: secretRefs as string[],
    dependencies: ["service:intelligence-v1", "identity:operator"],
    downstream: ["Data Fusion", "Command & Control"],
    evidence: [buildEvidence("Connector authorization", STACK_ENDPOINTS.readiness, STACK_ENDPOINTS.readiness)],
  })),
  {
    id: "adapter:launchpad",
    category: "adapter",
    name: "Commercial Launchpad seam",
    required: false,
    lifecycle: "seam only",
    apiMaturity: "commercial boundary declaration",
    endpointRef: `${STACK_ENDPOINTS.operator}#adapters.launchpad`,
    authorizationScope: "Commercial workspace only; no operational-intelligence ingest.",
    simulatedBoundary: "Tenant, billing, and evidence data remain outside the runtime.",
    dependencies: ["service:operator-state"],
    downstream: ["No operational downstream"],
    evidence: [buildEvidence("Launchpad seam", `${STACK_ENDPOINTS.operator}#adapters.launchpad`, STACK_ENDPOINTS.operator)],
  },
]

const TOPOLOGY: TopologyEdge[] = [
  { from: "node:twins-host-8012", to: "runtime:bind", relation: "same-origin rewrite" },
  { from: "runtime:bind", to: "service:operator-state", relation: "serves" },
  { from: "runtime:bind", to: "service:intelligence-v1", relation: "serves when process is current" },
  { from: "service:intelligence-v1", to: "schema:intelligence-v1", relation: "implements" },
  { from: "service:intelligence-v1", to: "service:intelligence-health", relation: "exposes" },
  { from: "service:intelligence-v1", to: "service:intelligence-readiness", relation: "exposes" },
  { from: "schema:migrations", to: "storage:sqlite", relation: "gates" },
  { from: "storage:sqlite", to: "storage:backup", relation: "requires continuity" },
  { from: "service:operator-state", to: "sensor:runtime-registry", relation: "projects" },
  { from: "sensor:runtime-registry", to: "provider:local-runtime", relation: "normalizes" },
  { from: "provider:local-runtime", to: "Situational Awareness", relation: "downstream" },
  { from: "provider:local-runtime", to: "Data Fusion", relation: "downstream" },
  { from: "service:intelligence-readiness", to: "Overview", relation: "readiness evidence" },
  { from: "identity:operator", to: "service:intelligence-v1", relation: "gates protected data routes" },
  ...["source:mindex", "source:mas", "source:natureos-core", "source:earth2"].map((to) => ({
    from: "service:intelligence-readiness",
    to,
    relation: "reports source posture",
  })),
  ...["connector:mindex", "connector:lattice", "connector:palantir", "connector:platform-one", "connector:jadc2"].map((to) => ({
    from: "service:intelligence-readiness",
    to,
    relation: "reports authorization posture",
  })),
]

function baselineItem(definition: InventoryDefinition): InventoryItem {
  const signals = unknownSignals()
  let state: InventoryState = "unknown"
  let configured: boolean | null = null
  let verified: boolean | null = null
  let summary = "No live observation has been received for this component."
  let version: string | null = null

  if (
    definition.id === "node:twins-host-8012" ||
    definition.id === "service:intelligence-v1" ||
    definition.id === "service:intelligence-health" ||
    definition.id === "service:intelligence-readiness" ||
    definition.id === "storage:sqlite" ||
    definition.id === "schema:intelligence-v1" ||
    definition.id === "schema:migrations" ||
    definition.id === "provider:local-runtime"
  ) {
    state = "configured"
    configured = true
    verified = false
    summary = "Implemented in the current source tree; live verification is pending."
  }

  if (definition.id === "runtime:bind") {
    state = "degraded"
    configured = true
    verified = false
    summary =
      "The discovered 8011 process may be bound to 0.0.0.0; host-firewall reachability and TLS remain unverified."
  }

  if (definition.id === "identity:operator") {
    state = "degraded"
    configured = true
    verified = false
    summary = "Role-aware development headers exist, but identity is explicitly unverified."
    signals.identity = signal("unverified", "Unverified", definition.authorizationScope)
  }

  if (definition.id === "storage:backup" || definition.id === "environment:staging") {
    state = "unavailable"
    configured = false
    verified = false
    summary = "No implementation or verified target is configured."
    signals.data = signal("unavailable", "Unavailable", summary)
  }

  if (definition.id === "model:nlm") {
    state = "unavailable"
    configured = false
    verified = false
    summary = "The bridge is declared, but no trained or deployed model is available."
    signals.data = signal("unavailable", "Unavailable", summary)
  }

  if (definition.id === "source:demo-fixture") {
    state = "simulated"
    configured = true
    verified = true
    summary = "A fixed sanitized fixture exists but is not loaded by Stack Inventory."
    signals.endpoint = signal("not_probed", "Not probed", "The demo endpoint is not called by this workspace.")
    signals.identity = signal("not_applicable", "Not applicable", "This is a local read-only fixture.")
    signals.schema = signal("declared", "Declared", definition.simulatedBoundary)
    signals.permission = signal("not_applicable", "Not applicable", "No connector permission is involved.")
    signals.exchange = signal("not_attempted", "Not attempted", "The fixture was not requested.")
    signals.freshness = signal("not_applicable", "Fixed fixture", "Fixture timestamps are deterministic.")
    signals.data = signal("simulated", "Simulated", definition.simulatedBoundary)
  }

  if (definition.id.startsWith("source:") && definition.id !== "source:demo-fixture") {
    state = "unavailable"
    configured = false
    verified = false
    summary = "The source remains disabled and unverified; no reachability call was made."
    signals.endpoint = signal("not_probed", "Not probed", "Stack Inventory never calls external sources.")
    signals.permission = signal("not_probed", "Not probed", definition.authorizationScope)
    signals.data = signal("unavailable", "Unavailable", "No authorized source data is present.")
  }

  if (definition.id.startsWith("connector:")) {
    state = "unavailable"
    configured = false
    verified = false
    summary = "The adapter is disabled and unverified; no connector call was made."
    signals.endpoint = signal("not_probed", "Not probed", "External connector calls are forbidden in this workspace.")
    signals.permission = signal("not_probed", "Not probed", definition.authorizationScope)
    signals.data = signal("unavailable", "Unavailable", "No connector data is present.")
  }

  if (definition.id === "adapter:launchpad") {
    state = "unavailable"
    configured = true
    verified = true
    summary = "The commercial boundary is declared; operational ingest is disabled."
    signals.permission = signal("denied", "Boundary denied", definition.authorizationScope)
    signals.data = signal("unavailable", "Outside boundary", definition.simulatedBoundary)
  }

  return {
    ...definition,
    summary,
    state,
    configured,
    verified,
    version,
    secretRefs: definition.secretRefs ?? [],
    credentialExpiry:
      (definition.secretRefs?.length ?? 0) > 0 ? "not_reported" : "not_applicable",
    lastHeartbeatAt: null,
    lastExchangeAt: null,
    queueDepth: null,
    backlogCount: null,
    recordCount: null,
    signals,
  }
}

type ItemPatch = Partial<Omit<InventoryItem, "signals">> & {
  signals?: Partial<InventorySignals>
}

function patchItem(items: Map<string, InventoryItem>, id: string, patch: ItemPatch): void {
  const current = items.get(id)
  if (!current) return
  items.set(id, {
    ...current,
    ...patch,
    signals: {
      ...current.signals,
      ...(patch.signals ?? {}),
    },
  })
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a string`)
  return value
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`)
  return value
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a number`)
  return value
}

function requiredInteger(value: unknown, label: string): number {
  const number = requiredNumber(value, label)
  if (!Number.isInteger(number)) throw new Error(`${label} must be an integer`)
  return number
}

function requiredTimestamp(value: unknown, label: string): string {
  const timestamp = requiredString(value, label)
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error(`${label} must be an ISO timestamp`)
  return timestamp
}

function parseOperatorState(value: unknown): OperatorState {
  const root = record(value, "operator state")
  const natureos = record(root.natureos, "operator state natureos")
  const devices = natureos.devices
  if (!Array.isArray(devices) || devices.some((device) => !device || typeof device !== "object" || Array.isArray(device))) {
    throw new Error("operator state devices must be an array of objects")
  }
  const nlm = record(root.nlm, "operator state nlm")
  const adaptersRaw = record(root.adapters, "operator state adapters")
  const adapters: Record<string, Record<string, unknown>> = {}
  for (const [key, adapter] of Object.entries(adaptersRaw)) adapters[key] = record(adapter, `adapter ${key}`)
  const gaps = root.honest_gaps
  if (!Array.isArray(gaps) || gaps.some((gap) => typeof gap !== "string")) {
    throw new Error("operator state honest_gaps must be an array of strings")
  }
  const count = natureos.device_count
  if (count !== null && count !== undefined && (typeof count !== "number" || !Number.isFinite(count))) {
    throw new Error("operator state device_count must be numeric")
  }
  const classification = requiredString(root.classification, "operator classification")
  if (classification !== "UNCLASSIFIED") {
    throw new Error("operator classification must remain UNCLASSIFIED")
  }
  return {
    classification,
    authMode: requiredString(root.auth_mode, "operator auth_mode"),
    devices: devices as Array<Record<string, unknown>>,
    deviceCount: typeof count === "number" ? count : null,
    nlmBridge: typeof nlm.bridge === "boolean" ? nlm.bridge : null,
    modelDeployed: typeof nlm.model_deployed === "boolean" ? nlm.model_deployed : null,
    adapters,
    honestGaps: gaps.map((gap) => gap.trim()).filter(Boolean),
  }
}

function parseContractRoot(value: unknown): ContractRoot {
  const root = record(value, "v1 contract root")
  const schemaRef = requiredString(root.schemaRef, "schemaRef")
  if (schemaRef !== "fusarium-intelligence/v1") throw new Error("schemaRef is incompatible")
  const classification = requiredString(root.classification, "classification")
  if (classification !== "UNCLASSIFIED") {
    throw new Error("v1 classification must remain UNCLASSIFIED")
  }
  const service = requiredString(root.service, "service")
  if (service !== "fusarium-intelligence") throw new Error("v1 service name is incompatible")
  const operationalNamespace = requiredString(root.operationalNamespace, "operationalNamespace")
  if (operationalNamespace !== "operational") throw new Error("operationalNamespace is incompatible")
  const demoPath = requiredString(root.demoPath, "demoPath")
  if (demoPath !== "/api/fusarium/v1/demo") throw new Error("demoPath is incompatible")
  const persistence = requiredString(root.persistence, "persistence")
  if (persistence !== "local-sqlite-wal") throw new Error("persistence contract is incompatible")
  const activityTransport = requiredString(root.activityTransport, "activityTransport")
  if (activityTransport !== "bounded-polling") throw new Error("activity transport is incompatible")
  const productionAccredited = requiredBoolean(root.productionAccredited, "productionAccredited")
  if (productionAccredited) throw new Error("production accreditation cannot be asserted by this local contract")
  return {
    schemaRef,
    service,
    version: requiredString(root.version, "version"),
    classification,
    operationalNamespace,
    demoPath,
    identityMode: requiredString(root.identityMode, "identityMode"),
    identityVerified: requiredBoolean(root.identityVerified, "identityVerified"),
    persistence,
    activityTransport,
    productionAccredited,
  }
}

function parseHealth(value: unknown): HealthState {
  const root = record(value, "v1 health")
  const schemaRef = requiredString(root.schemaRef, "health schemaRef")
  if (schemaRef !== "fusarium-intelligence/v1") throw new Error("health schemaRef is incompatible")
  const classification = requiredString(root.classification, "health classification")
  if (classification !== "UNCLASSIFIED") throw new Error("health classification must remain UNCLASSIFIED")
  const status = requiredString(root.status, "health status")
  if (status !== "healthy") throw new Error("health status is invalid")
  const service = requiredString(root.service, "health service")
  if (service !== "fusarium-intelligence") throw new Error("health service name is incompatible")
  return {
    schemaRef,
    classification,
    status,
    service,
    version: requiredString(root.version, "health version"),
    checkedAt: requiredTimestamp(root.checkedAt, "health checkedAt"),
  }
}

const CONNECTOR_STATES = new Set<ConnectorState>([
  "unconfigured",
  "configured",
  "verified",
  "live",
  "degraded",
  "unauthorized",
  "unreachable",
  "stale",
])
const COMPONENT_DATA_MODES = new Set<ComponentDataMode>([
  "live",
  "recorded",
  "replay",
  "simulated",
  "unavailable",
  "degraded",
])
const SOURCE_COMPONENT_IDS = new Set([
  "provider:local-runtime",
  "source:mindex",
  "source:mas",
  "source:natureos-core",
  "source:earth2",
])
const CONNECTOR_COMPONENT_IDS = new Set([
  "connector:mindex",
  "connector:lattice",
  "connector:palantir",
  "connector:platform-one",
  "connector:jadc2",
])

function parseComponent(value: unknown, label: string): ComponentReadiness {
  const component = record(value, label)
  const state = requiredString(component.state, `${label} state`) as ConnectorState
  if (!CONNECTOR_STATES.has(state)) throw new Error(`${label} state is invalid`)
  const classification = requiredString(component.classification, `${label} classification`)
  if (classification !== "UNCLASSIFIED") throw new Error(`${label} classification must remain UNCLASSIFIED`)
  const dataMode = requiredString(component.dataMode, `${label} dataMode`) as ComponentDataMode
  if (!COMPONENT_DATA_MODES.has(dataMode)) throw new Error(`${label} dataMode is invalid`)
  const configured = requiredBoolean(component.configured, `${label} configured`)
  const verified = requiredBoolean(component.verified, `${label} verified`)
  if (verified && !configured) throw new Error(`${label} cannot be verified while unconfigured`)
  return {
    id: requiredString(component.id, `${label} id`),
    state,
    configured,
    verified,
    required: requiredBoolean(component.required, `${label} required`),
    checkedAt: requiredTimestamp(component.checkedAt, `${label} checkedAt`),
    lastSuccessAt: component.lastSuccessAt == null
      ? null
      : requiredTimestamp(component.lastSuccessAt, `${label} lastSuccessAt`),
    dataMode,
    detail: requiredString(component.detail, `${label} detail`),
  }
}

function parseReadiness(value: unknown): ReadinessState {
  const root = record(value, "v1 readiness")
  const schemaRef = requiredString(root.schemaRef, "readiness schemaRef")
  if (schemaRef !== "fusarium-intelligence/v1") throw new Error("readiness schemaRef is incompatible")
  const classification = requiredString(root.classification, "readiness classification")
  if (classification !== "UNCLASSIFIED") throw new Error("readiness classification must remain UNCLASSIFIED")
  const status = requiredString(root.status, "readiness status") as ReadinessState["status"]
  if (!["ready", "degraded", "not_ready"].includes(status)) throw new Error("readiness status is invalid")
  const service = requiredString(root.service, "readiness service")
  if (service !== "fusarium-intelligence") throw new Error("readiness service name is incompatible")
  const migrationsRaw = record(root.migrations, "readiness migrations")
  const migrationState = requiredString(migrationsRaw.state, "migration state") as ConnectorState
  if (!CONNECTOR_STATES.has(migrationState)) throw new Error("migration state is invalid")
  const pending = migrationsRaw.pending
  if (!Array.isArray(pending) || pending.some((value) => typeof value !== "number" || !Number.isInteger(value))) {
    throw new Error("pending migrations must be integers")
  }
  const currentVersion = requiredInteger(migrationsRaw.currentVersion, "migration currentVersion")
  const targetVersion = requiredInteger(migrationsRaw.targetVersion, "migration targetVersion")
  if (currentVersion > targetVersion) throw new Error("migration currentVersion cannot exceed targetVersion")
  if (pending.some((version) => version <= currentVersion || version > targetVersion)) {
    throw new Error("pending migrations fall outside the declared version range")
  }
  if (pending.some((version, index) => index > 0 && pending[index - 1] >= version)) {
    throw new Error("pending migrations must be sorted and unique")
  }
  const sources = root.sourceReachability
  const connectors = root.connectorAuthorization
  if (!Array.isArray(sources) || !Array.isArray(connectors)) {
    throw new Error("readiness source and connector arrays are required")
  }
  const bindExposure = parseComponent(root.bindExposure, "bind exposure")
  const identity = parseComponent(root.identity, "identity")
  const storage = parseComponent(root.storage, "storage")
  const backup = parseComponent(root.backup, "backup")
  const staging = parseComponent(root.staging, "staging")
  if (bindExposure.id !== "runtime:bind") throw new Error("bind exposure id is invalid")
  if (identity.id !== "identity:operator") throw new Error("identity component id is invalid")
  if (storage.id !== "storage:sqlite") throw new Error("storage component id is invalid")
  if (backup.id !== "storage:backup") throw new Error("backup component id is invalid")
  if (staging.id !== "environment:staging") throw new Error("staging component id is invalid")
  const sourceReachability = sources.map((item, index) => parseComponent(item, `source ${index}`))
  const connectorAuthorization = connectors.map((item, index) => parseComponent(item, `connector ${index}`))
  if (sourceReachability.some((component) => !SOURCE_COMPONENT_IDS.has(component.id))) {
    throw new Error("readiness contains an unknown source component id")
  }
  if (connectorAuthorization.some((component) => !CONNECTOR_COMPONENT_IDS.has(component.id))) {
    throw new Error("readiness contains an unknown connector component id")
  }
  const componentIds = [bindExposure, identity, storage, backup, staging, ...sourceReachability, ...connectorAuthorization].map((component) => component.id)
  if (new Set(componentIds).size !== componentIds.length) throw new Error("readiness component ids must be unique")
  return {
    schemaRef,
    classification,
    status,
    service,
    version: requiredString(root.version, "readiness version"),
    checkedAt: requiredTimestamp(root.checkedAt, "readiness checkedAt"),
    bindExposure,
    identity,
    storage,
    backup,
    migrations: {
      state: migrationState,
      currentVersion,
      targetVersion,
      pending: pending as number[],
      checkedAt: requiredTimestamp(migrationsRaw.checkedAt, "migration checkedAt"),
    },
    sourceReachability,
    connectorAuthorization,
    staging,
    identityMode: requiredString(root.identityMode, "readiness identityMode"),
    developmentIdentity: requiredBoolean(root.developmentIdentity, "readiness developmentIdentity"),
    demoEnabled: requiredBoolean(root.demoEnabled, "readiness demoEnabled"),
  }
}

async function readJson(
  fetcher: StackFetch,
  endpoint: StackEndpoint,
  signalValue: AbortSignal | undefined,
  now: () => Date,
): Promise<FetchOutcome> {
  try {
    const response = await fetcher(endpoint, { cache: "no-store", signal: signalValue })
    if (!response.ok) {
      let payload: unknown = null
      let detail: string | null = null
      try {
        payload = await response.json()
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const root = payload as Record<string, unknown>
          const nested = root.detail && typeof root.detail === "object" && !Array.isArray(root.detail)
            ? root.detail as Record<string, unknown>
            : root.error && typeof root.error === "object" && !Array.isArray(root.error)
              ? root.error as Record<string, unknown>
              : null
          const code = nested && typeof nested.error === "string"
            ? nested.error
            : nested && typeof nested.code === "string"
              ? nested.code
              : null
          if (code && /^[a-zA-Z0-9_.:-]{1,96}$/.test(code)) detail = code
        }
      } catch {
        // A non-JSON error body still preserves the HTTP reachability observation.
      }
      return {
        endpoint,
        ok: false,
        status: response.status,
        receivedAt: now().toISOString(),
        payload,
        error: `HTTP ${response.status}${detail ? ` · ${detail}` : ""}`,
      }
    }
    const receivedAt = now().toISOString()
    try {
      return {
        endpoint,
        ok: true,
        status: response.status,
        receivedAt,
        payload: await response.json(),
        error: null,
      }
    } catch (error) {
      return {
        endpoint,
        ok: true,
        status: response.status,
        receivedAt,
        payload: null,
        error: `Response body was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  } catch (error) {
    return {
      endpoint,
      ok: false,
      status: null,
      receivedAt: now().toISOString(),
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function failureState(outcome: FetchOutcome): InventoryState {
  if (outcome.status === 401 || outcome.status === 403) return "unauthorized"
  if (outcome.status === null || outcome.status >= 500) return "unavailable"
  return "degraded"
}

function failureSignals(outcome: FetchOutcome): Partial<InventorySignals> {
  const endpointResponded = outcome.status !== null
  const identityRejected = outcome.status === 401
  const permissionDenied = outcome.status === 403
  return {
    endpoint: signal(
      endpointResponded ? "reachable" : "unreachable",
      endpointResponded ? `HTTP ${outcome.status} responded` : "Unreachable",
      outcome.error ?? "The request did not complete.",
      outcome.receivedAt,
    ),
    schema: signal("unknown", "Unknown", "No successful response body was validated."),
    identity: signal(
      identityRejected ? "unverified" : "unknown",
      identityRejected ? "Identity rejected" : "Not established",
      identityRejected ? "HTTP 401 indicates missing or rejected identity; permission was not evaluated." : "The response does not establish identity.",
      outcome.receivedAt,
    ),
    permission: signal(
      permissionDenied ? "denied" : identityRejected ? "not_probed" : "unknown",
      permissionDenied ? "Denied" : identityRejected ? "Not evaluated" : "Not established",
      permissionDenied ? "HTTP 403 denied the requested scope." : identityRejected ? "Identity failed before permission could be evaluated." : "The response does not establish an authorization result.",
      outcome.receivedAt,
    ),
    exchange: signal("no_exchange", "No successful exchange", outcome.error ?? "The request failed.", outcome.receivedAt),
    freshness: signal("unknown", "Unknown", "No verified exchange timestamp is available."),
    data: signal("unavailable", "Unavailable", "No valid payload was accepted."),
  }
}

function connectorToInventoryState(state: ConnectorState): InventoryState {
  if (state === "live") return "live"
  if (state === "verified") return "verified"
  if (state === "configured") return "configured"
  if (state === "degraded") return "degraded"
  if (state === "unauthorized") return "unauthorized"
  if (state === "stale") return "stale"
  if (state === "unreachable" || state === "unconfigured") return "unavailable"
  return "unknown"
}

function componentSignals(component: ComponentReadiness, nowMs: number): Partial<InventorySignals> {
  const external = component.id.startsWith("source:") || component.id.startsWith("connector:")
  const dataBearing = component.id.startsWith("source:") || component.id.startsWith("provider:")
  const identityComponent = component.id.startsWith("identity:")
  const storageComponent = component.id.startsWith("storage:")
  return {
    endpoint: signal("not_probed", "Not probed", "Readiness reports component posture; it is not an endpoint reachability probe.", component.checkedAt),
    identity: identityComponent
      ? signal(component.verified ? "verified" : "unverified", component.verified ? "Verified" : "Unverified", component.detail, component.checkedAt)
      : external
        ? signal("unverified", "Unverified", "No external identity assertion was requested or received.", component.checkedAt)
        : signal("not_applicable", "Not applicable", "This component does not establish operator or external identity."),
    schema: storageComponent
      ? signal(component.verified ? "compatible" : "declared", component.verified ? "Compatible" : "Declared", component.detail, component.checkedAt)
      : external || dataBearing
        ? signal("declared", "Declared only", "No component payload was requested for schema validation.", component.checkedAt)
        : signal("not_applicable", "Not applicable", "No component payload schema was evaluated."),
    permission: signal(
      external ? "not_probed" : "not_applicable",
      external && component.state === "unauthorized" ? "Unconfigured · not probed" : external ? "Not probed" : "Not applicable",
      external ? `${component.detail} No external authorization request was made.` : "No component-specific permission decision was requested.",
      component.checkedAt,
    ),
    exchange: component.lastSuccessAt
      ? signal("historical_success", "Historical success reported", "The readiness contract supplied lastSuccessAt; Stack Inventory did not call the component.", component.lastSuccessAt)
      : signal("not_attempted", "Not attempted", "Stack Inventory made no component request and no historical success is reported."),
    freshness: dataBearing
      ? deriveFreshnessSignal(component.lastSuccessAt, nowMs)
      : signal("not_applicable", "Not applicable", "No source-data timestamp is available for this component."),
    data: component.dataMode === "simulated"
      ? signal("simulated", "Simulated", component.detail, component.lastSuccessAt)
      : dataBearing || external
        ? signal("unknown", "Not established", `Readiness reports dataMode=${component.dataMode}, but provides no record count or source observation timestamp.`)
        : signal("not_applicable", "Not applicable", "This readiness row does not establish mission-data presence."),
  }
}

function inferredCategory(id: string): StackCategory {
  const prefix = id.split(":", 1)[0]
  if (prefix === "sensor" || prefix === "source" || prefix === "service" || prefix === "schema" || prefix === "model" || prefix === "node") {
    return prefix
  }
  if (prefix === "connector" || prefix === "adapter") return "adapter"
  if (prefix === "provider") return "source"
  if (prefix === "runtime" || prefix === "environment") return "node"
  return "service"
}

function ensureComponentItem(items: Map<string, InventoryItem>, component: ComponentReadiness): string {
  if (items.has(component.id)) return component.id
  const reportedId = `reported:${component.id}`
  if (items.has(reportedId)) return reportedId
  const readableName = component.id
    .split(":")
    .map((part) => part.replaceAll("-", " "))
    .join(" · ")
  items.set(reportedId, baselineItem({
    id: reportedId,
    category: inferredCategory(component.id),
    name: readableName,
    required: false,
    lifecycle: "reported by readiness",
    apiMaturity: "runtime-reported component",
    endpointRef: null,
    authorizationScope: "Runtime-reported component; no authorization scope beyond the readiness declaration is known.",
    simulatedBoundary: "The readiness dataMode field is authoritative for this row.",
    dependencies: ["service:intelligence-readiness"],
    downstream: [],
    evidence: [buildEvidence("Runtime readiness component", `${STACK_ENDPOINTS.readiness}#${component.id}`, STACK_ENDPOINTS.readiness)],
  }))
  return reportedId
}

function applyComponent(items: Map<string, InventoryItem>, component: ComponentReadiness, nowMs: number): void {
  const id = ensureComponentItem(items, component)
  const freshness = deriveFreshnessSignal(component.lastSuccessAt, nowMs)
  const baseState = connectorToInventoryState(component.state)
  const dataBearing = component.id.startsWith("source:") || component.id.startsWith("provider:")
  const state: InventoryState = ["unavailable", "unauthorized", "degraded"].includes(baseState)
    ? baseState
    : component.dataMode === "simulated"
      ? "simulated"
      : dataBearing && freshness.state === "stale"
        ? "stale"
        : dataBearing && component.lastSuccessAt && freshness.state === "unknown"
          ? "unknown"
          : baseState
  patchItem(items, id, {
    state,
    summary: component.detail,
    configured: component.configured,
    verified: component.verified,
    lastHeartbeatAt: component.checkedAt,
    lastExchangeAt: component.lastSuccessAt,
    recordCount: null,
    signals: componentSignals(component, nowMs),
  })
}

function pollEvent(outcome: FetchOutcome, state: InventoryState): StackPollEvent {
  return {
    id: `${outcome.endpoint}:${outcome.status ?? "network"}`,
    at: outcome.receivedAt,
    state,
    summary: outcome.ok
      ? outcome.error
        ? `${outcome.endpoint} returned HTTP success, but its body was not valid JSON.`
        : `${outcome.endpoint} returned a response available for schema validation.`
      : `${outcome.endpoint} did not produce a successful exchange (${outcome.error ?? "unknown error"}).`,
    evidenceRef: outcome.endpoint,
  }
}

function buildSnapshot(
  outcomes: FetchOutcome[],
  now: Date,
): StackInventorySnapshot {
  const nowMs = now.getTime()
  const items = new Map(DEFINITIONS.map((definition) => [definition.id, baselineItem(definition)]))
  const outcomeByEndpoint = new Map(outcomes.map((outcome) => [outcome.endpoint, outcome]))
  const events: StackPollEvent[] = []
  let classification = "UNCLASSIFIED"
  let authMode = "commercial_unclassified"
  let honestGaps: string[] = []

  patchItem(items, "node:twins-host-8012", {
    state: "live",
    summary: "The current Stack Inventory page is served from the loopback-only twins host.",
    configured: true,
    verified: true,
    lastHeartbeatAt: now.toISOString(),
    signals: {
      endpoint: signal("reachable", "Reachable", "The current page was served from 127.0.0.1:8012.", now.toISOString()),
      identity: signal("unverified", "Unverified", "The browser session has no accredited identity assertion."),
      schema: signal("not_applicable", "Not applicable", "This node row is not a JSON contract."),
      permission: signal("not_applicable", "Not applicable", "No separate permission probe is required for the current page."),
      exchange: signal("response_received", "Page served", "The current page load is the local response evidence; no correlation acknowledgement is asserted.", now.toISOString()),
      freshness: signal("fresh", "Current session", "The page is active in this browser session.", now.toISOString()),
      data: signal("not_applicable", "Not applicable", "This row describes a host node."),
    },
  })

  const operatorOutcome = outcomeByEndpoint.get(STACK_ENDPOINTS.operator)
  if (operatorOutcome) {
    if (operatorOutcome.ok) {
      try {
        const operator = parseOperatorState(operatorOutcome.payload)
        classification = operator.classification
        authMode = operator.authMode
        honestGaps = operator.honestGaps
        patchItem(items, "service:operator-state", {
          state: "live",
          summary: "The local operator-state contract answered with a valid UNCLASSIFIED status payload.",
          configured: true,
          verified: true,
          version: "unversioned",
          lastHeartbeatAt: operatorOutcome.receivedAt,
          lastExchangeAt: operatorOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "HTTP 200 received through the same-origin rewrite.", operatorOutcome.receivedAt),
            identity: signal("unverified", "Unverified", `Runtime auth mode: ${operator.authMode}.`, operatorOutcome.receivedAt),
            schema: signal("compatible", "Compatible", "Required operator-state fields passed runtime validation.", operatorOutcome.receivedAt),
            permission: signal("not_applicable", "Local status route", "No accredited identity or external permission was asserted.", operatorOutcome.receivedAt),
            exchange: signal("response_received", "Response received", "A valid operator-state payload was received; no request-id echo was verified.", operatorOutcome.receivedAt),
            freshness: deriveFreshnessSignal(operatorOutcome.receivedAt, nowMs),
            data: signal("present", "Status present", "Control-plane status is present; this is not mission-data coverage.", operatorOutcome.receivedAt),
          },
        })
        patchItem(items, "runtime:bind", {
          state: "degraded",
          configured: true,
          verified: false,
          lastHeartbeatAt: operatorOutcome.receivedAt,
          lastExchangeAt: operatorOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable via 8012", "The 8012 rewrite received an operator-state response from 8011.", operatorOutcome.receivedAt),
            identity: signal("unverified", "Unverified", "Host-firewall reachability and accredited identity remain unverified."),
            schema: signal("not_applicable", "Not applicable", "The node delegates schema checks to its services."),
            permission: signal("not_applicable", "Not applicable", "This is a local transport observation."),
            exchange: signal("response_received", "Response received", "A proxied response was received; no correlation acknowledgement was verified.", operatorOutcome.receivedAt),
            freshness: deriveFreshnessSignal(operatorOutcome.receivedAt, nowMs),
            data: signal("not_applicable", "Not applicable", "This row describes runtime exposure."),
          },
        })

        const deviceCount = operator.devices.length
        patchItem(items, "sensor:runtime-registry", {
          state: deviceCount > 0 ? "configured" : "empty",
          summary:
            deviceCount > 0
              ? `The operator state contains ${deviceCount} device record(s); device identity remains unverified.`
              : "The registry answered successfully with no device records. Empty does not mean sensor coverage is clear.",
          configured: true,
          verified: false,
          recordCount: deviceCount,
          lastHeartbeatAt: operatorOutcome.receivedAt,
          lastExchangeAt: operatorOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "The registry projection arrived inside operator state.", operatorOutcome.receivedAt),
            identity: signal("unverified", "Unverified", "No device attestation contract is present.", operatorOutcome.receivedAt),
            schema: signal("compatible", "Envelope compatible", "The device array passed envelope validation; per-device attestation is not defined.", operatorOutcome.receivedAt),
            permission: signal("not_applicable", "Local status route", "No external permission probe was made.", operatorOutcome.receivedAt),
            exchange: signal("response_received", "Response received", "The registry projection was received inside operator state; device acknowledgement is not implied.", operatorOutcome.receivedAt),
            freshness: signal("unknown", "Unknown", "Operator-state receipt time does not establish sensor-data age."),
            data: signal(
              deviceCount > 0 ? "present" : "empty",
              deviceCount > 0 ? "Records present" : "Empty",
              deviceCount > 0 ? "Device records are present without attestation." : "No device records were returned.",
              operatorOutcome.receivedAt,
            ),
          },
        })
        patchItem(items, "provider:local-runtime", {
          state: deviceCount > 0 ? "configured" : "empty",
          summary:
            deviceCount > 0
              ? "The local read-only provider has device records available for normalization."
              : "The local read-only provider is implemented, but its current device source is empty.",
          configured: true,
          verified: false,
          recordCount: deviceCount,
          lastHeartbeatAt: operatorOutcome.receivedAt,
          signals: {
            endpoint: signal("not_probed", "Not directly probed", "Stack Inventory uses operator state and does not call the binding endpoint."),
            schema: signal("declared", "Declared", "The v1 provider contract exists in source."),
            data: signal(deviceCount > 0 ? "present" : "empty", deviceCount > 0 ? "Records present" : "Empty", "Derived only from the operator-state registry."),
          },
        })
        patchItem(items, "model:nlm", {
          state: operator.modelDeployed ? "configured" : "unavailable",
          summary: operator.modelDeployed
            ? "The runtime reports a deployed model, but version and evaluation evidence are not exposed."
            : "The runtime bridge is present, but no trained or deployed model is available.",
          configured: operator.nlmBridge,
          verified: false,
          lastHeartbeatAt: operatorOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "State reported", "The model flag arrived through operator state.", operatorOutcome.receivedAt),
            identity: signal("unverified", "Unverified", "No model identity or artifact digest is reported."),
            schema: signal("compatible", "Flag compatible", "The boolean model_deployed field passed validation.", operatorOutcome.receivedAt),
            permission: signal("not_probed", "Not probed", "No inference endpoint was called."),
            exchange: signal("not_attempted", "Not attempted", "Stack Inventory does not call a model."),
            freshness: deriveFreshnessSignal(operatorOutcome.receivedAt, nowMs),
            data: signal(operator.modelDeployed ? "unknown" : "unavailable", operator.modelDeployed ? "Unknown" : "Unavailable", "No model artifact or evaluation record is exposed."),
          },
        })

        for (const [adapterKey, itemId] of [
          ["lattice", "connector:lattice"],
          ["palantir", "connector:palantir"],
          ["launchpad", "adapter:launchpad"],
        ] as const) {
          const adapter = operator.adapters[adapterKey]
          if (!adapter) continue
          const configured = typeof adapter.configured === "boolean" ? adapter.configured : adapterKey === "launchpad"
          const note = typeof adapter.note === "string" ? adapter.note : "The runtime returned adapter metadata."
          patchItem(items, itemId, {
            state: adapterKey === "launchpad" ? "unavailable" : configured ? "configured" : "unavailable",
            summary: note,
            configured,
            verified: adapterKey === "launchpad",
            lastHeartbeatAt: operatorOutcome.receivedAt,
            signals: {
              endpoint: signal("not_probed", "Not probed", "Only inert adapter metadata was read; the connector was not called.", operatorOutcome.receivedAt),
              identity: signal("unverified", "Unverified", "No external identity assertion is available.", operatorOutcome.receivedAt),
              schema: signal("compatible", "Metadata compatible", "The adapter metadata object was accepted.", operatorOutcome.receivedAt),
              permission: signal("not_probed", "Not probed", "No authorized external connector call was attempted.", operatorOutcome.receivedAt),
              exchange: signal("not_attempted", "Not attempted", "The adapter was not called.", operatorOutcome.receivedAt),
              freshness: signal("unknown", "Unknown", "Adapter metadata receipt time does not establish connector-data age."),
              data: signal("unavailable", "Unavailable", "No external connector data was requested or received."),
            },
          })
        }
      } catch (error) {
        patchItem(items, "service:operator-state", {
          state: "degraded",
          summary: error instanceof Error ? error.message : String(error),
          configured: true,
          verified: false,
          signals: {
            endpoint: signal("reachable", "Reachable", "HTTP success was received.", operatorOutcome.receivedAt),
            schema: signal("incompatible", "Incompatible", error instanceof Error ? error.message : String(error), operatorOutcome.receivedAt),
            exchange: signal("no_exchange", "Rejected", "The payload failed runtime validation.", operatorOutcome.receivedAt),
            data: signal("unknown", "Unknown", "Invalid payload data was not accepted."),
          },
        })
      }
    } else {
      patchItem(items, "service:operator-state", {
        state: failureState(operatorOutcome),
        summary: operatorOutcome.error ?? "The operator-state request failed.",
        configured: true,
        verified: false,
        signals: failureSignals(operatorOutcome),
      })
    }
    events.push(pollEvent(operatorOutcome, items.get("service:operator-state")?.state ?? "unknown"))
  }

  const contractOutcome = outcomeByEndpoint.get(STACK_ENDPOINTS.contract)
  if (contractOutcome) {
    if (contractOutcome.ok) {
      try {
        const contract = parseContractRoot(contractOutcome.payload)
        classification = contract.classification
        authMode = contract.identityMode
        patchItem(items, "service:intelligence-v1", {
          state: "live",
          summary: "The versioned discovery contract answered and passed schema validation.",
          configured: true,
          verified: true,
          version: contract.version,
          lastHeartbeatAt: contractOutcome.receivedAt,
          lastExchangeAt: contractOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "The v1 discovery endpoint returned HTTP success.", contractOutcome.receivedAt),
            identity: signal(contract.identityVerified ? "verified" : "unverified", contract.identityVerified ? "Verified" : "Unverified", `Identity mode: ${contract.identityMode}.`, contractOutcome.receivedAt),
            schema: signal("compatible", "Compatible", `Schema ${contract.schemaRef} passed validation.`, contractOutcome.receivedAt),
            permission: signal("not_applicable", "Discovery route", "No protected data route was probed.", contractOutcome.receivedAt),
            exchange: signal("response_received", "Response received", "A valid discovery payload was received; no request-id echo was verified.", contractOutcome.receivedAt),
            freshness: deriveFreshnessSignal(contractOutcome.receivedAt, nowMs),
            data: signal("present", "Contract metadata present", "This is discovery metadata, not operational data.", contractOutcome.receivedAt),
          },
        })
        patchItem(items, "schema:intelligence-v1", {
          state: "verified",
          summary: `${contract.schemaRef} was returned by the live discovery endpoint.`,
          configured: true,
          verified: true,
          version: contract.version,
          lastHeartbeatAt: contractOutcome.receivedAt,
          lastExchangeAt: contractOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "The discovery endpoint returned the schema identifier.", contractOutcome.receivedAt),
            schema: signal("compatible", "Compatible", `Validated ${contract.schemaRef}.`, contractOutcome.receivedAt),
            exchange: signal("response_received", "Response received", "A validated contract payload was received; no correlation acknowledgement was verified.", contractOutcome.receivedAt),
            freshness: deriveFreshnessSignal(contractOutcome.receivedAt, nowMs),
            data: signal("present", "Metadata present", "Schema metadata is present.", contractOutcome.receivedAt),
          },
        })
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        patchItem(items, "service:intelligence-v1", {
          state: "degraded",
          summary: detail,
          configured: true,
          verified: false,
          signals: {
            endpoint: signal("reachable", "Reachable", "HTTP success was received.", contractOutcome.receivedAt),
            schema: signal("incompatible", "Incompatible", detail, contractOutcome.receivedAt),
            exchange: signal("no_exchange", "Rejected", "The payload failed runtime validation.", contractOutcome.receivedAt),
            data: signal("unknown", "Unknown", "Invalid discovery data was not accepted."),
          },
        })
      }
    } else {
      patchItem(items, "service:intelligence-v1", {
        state: failureState(contractOutcome),
        summary: `The v1 contract is implemented in source, but the current runtime returned ${contractOutcome.error ?? "no response"}.`,
        configured: true,
        verified: false,
        signals: failureSignals(contractOutcome),
      })
    }
    events.push(pollEvent(contractOutcome, items.get("service:intelligence-v1")?.state ?? "unknown"))
  }

  const healthOutcome = outcomeByEndpoint.get(STACK_ENDPOINTS.health)
  if (healthOutcome) {
    if (healthOutcome.ok) {
      try {
        const health = parseHealth(healthOutcome.payload)
        patchItem(items, "service:intelligence-health", {
          state: health.status === "healthy" ? "live" : "degraded",
          summary: `${health.service} ${health.version} reported ${health.status}.`,
          configured: true,
          verified: true,
          version: health.version,
          lastHeartbeatAt: health.checkedAt,
          lastExchangeAt: healthOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "The health endpoint returned HTTP success.", healthOutcome.receivedAt),
            identity: signal("not_applicable", "Not applicable", "Health metadata does not establish operator identity."),
            schema: signal("compatible", "Compatible", `Schema ${health.schemaRef} passed validation.`, healthOutcome.receivedAt),
            permission: signal("not_applicable", "Health route", "No protected route was probed."),
            exchange: signal("response_received", "Response received", "A valid health response was received; no request-id echo was verified.", healthOutcome.receivedAt),
            freshness: deriveFreshnessSignal(health.checkedAt, nowMs),
            data: signal("present", "Health metadata present", "Process health is present; mission data is not implied.", health.checkedAt),
          },
        })
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        patchItem(items, "service:intelligence-health", {
          state: "degraded",
          summary: detail,
          configured: true,
          verified: false,
          signals: {
            endpoint: signal("reachable", "Reachable", "HTTP success was received.", healthOutcome.receivedAt),
            schema: signal("incompatible", "Incompatible", detail, healthOutcome.receivedAt),
            exchange: signal("no_exchange", "Rejected", "The payload failed validation.", healthOutcome.receivedAt),
          },
        })
      }
    } else {
      patchItem(items, "service:intelligence-health", {
        state: failureState(healthOutcome),
        summary: `The health contract is implemented in source, but the current runtime returned ${healthOutcome.error ?? "no response"}.`,
        configured: true,
        verified: false,
        signals: failureSignals(healthOutcome),
      })
    }
    events.push(pollEvent(healthOutcome, items.get("service:intelligence-health")?.state ?? "unknown"))
  }

  const readinessOutcome = outcomeByEndpoint.get(STACK_ENDPOINTS.readiness)
  if (readinessOutcome) {
    if (readinessOutcome.ok) {
      try {
        const readiness = parseReadiness(readinessOutcome.payload)
        authMode = readiness.identityMode
        patchItem(items, "service:intelligence-readiness", {
          state: readiness.status === "ready" ? "live" : "degraded",
          summary: `${readiness.service} ${readiness.version} reports ${readiness.status.replace("_", " ")}.`,
          configured: true,
          verified: true,
          version: readiness.version,
          lastHeartbeatAt: readiness.checkedAt,
          lastExchangeAt: readinessOutcome.receivedAt,
          signals: {
            endpoint: signal("reachable", "Reachable", "The readiness endpoint returned HTTP success.", readinessOutcome.receivedAt),
            identity: signal(readiness.identity.verified ? "verified" : "unverified", readiness.identity.verified ? "Verified" : readiness.developmentIdentity ? "Development only" : "Unverified", `Identity mode: ${readiness.identityMode}.`, readiness.checkedAt),
            schema: signal("compatible", "Compatible", "The readiness response passed validation.", readinessOutcome.receivedAt),
            permission: signal("not_applicable", "Readiness route", "No protected data route was probed."),
            exchange: signal("response_received", "Response received", "A valid readiness payload was received; no request-id echo was verified.", readinessOutcome.receivedAt),
            freshness: deriveFreshnessSignal(readiness.checkedAt, nowMs),
            data: signal("present", "Readiness metadata present", "This reports component posture, not mission data.", readiness.checkedAt),
          },
        })
        for (const component of [
          readiness.bindExposure,
          readiness.identity,
          readiness.storage,
          readiness.backup,
          readiness.staging,
          ...readiness.sourceReachability,
          ...readiness.connectorAuthorization,
        ]) {
          applyComponent(items, component, nowMs)
        }
        patchItem(items, "schema:migrations", {
          state: connectorToInventoryState(readiness.migrations.state),
          summary:
            readiness.migrations.pending.length > 0
              ? `Migration ${readiness.migrations.currentVersion} of ${readiness.migrations.targetVersion}; pending versions are declared.`
              : `Migration version ${readiness.migrations.currentVersion} matches target ${readiness.migrations.targetVersion}.`,
          configured: true,
          verified: readiness.migrations.state === "verified",
          version: `${readiness.migrations.currentVersion}/${readiness.migrations.targetVersion}`,
          backlogCount: readiness.migrations.pending.length,
          lastHeartbeatAt: readiness.migrations.checkedAt,
          signals: {
            endpoint: signal("reachable", "Reported", "Migration state arrived inside the readiness response.", readiness.migrations.checkedAt),
            identity: signal("not_applicable", "Not applicable", "Migration state is local process metadata."),
            schema: signal(readiness.migrations.state === "verified" ? "compatible" : "declared", readiness.migrations.state === "verified" ? "Compatible" : "Declared", "Current and target migration versions were validated.", readiness.migrations.checkedAt),
            permission: signal("not_applicable", "Not applicable", "No separate permission probe was made."),
            exchange: signal("response_received", "Reported in readiness", "Migration readiness arrived inside the validated local response.", readiness.migrations.checkedAt),
            freshness: deriveFreshnessSignal(readiness.migrations.checkedAt, nowMs),
            data: signal("present", "Metadata present", "Migration metadata is present.", readiness.migrations.checkedAt),
          },
        })
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        patchItem(items, "service:intelligence-readiness", {
          state: "degraded",
          summary: detail,
          configured: true,
          verified: false,
          signals: {
            endpoint: signal("reachable", "Reachable", "HTTP success was received.", readinessOutcome.receivedAt),
            schema: signal("incompatible", "Incompatible", detail, readinessOutcome.receivedAt),
            exchange: signal("no_exchange", "Rejected", "The payload failed validation.", readinessOutcome.receivedAt),
          },
        })
      }
    } else {
      patchItem(items, "service:intelligence-readiness", {
        state: failureState(readinessOutcome),
        summary: `The readiness contract is implemented in source, but the current runtime returned ${readinessOutcome.error ?? "no response"}.`,
        configured: true,
        verified: false,
        signals: failureSignals(readinessOutcome),
      })
    }
    events.push(pollEvent(readinessOutcome, items.get("service:intelligence-readiness")?.state ?? "unknown"))
  }

  const inventory = [...items.values()]
  const required = inventory.filter((item) => item.required)
  const operatorLive = items.get("service:operator-state")?.state === "live"
  let condition: SnapshotCondition
  if (required.some((item) => item.state === "unauthorized")) condition = "unauthorized"
  else if (required.some((item) => item.state === "stale")) condition = "stale"
  else if (required.some((item) => ["degraded", "unavailable", "unknown"].includes(item.state))) {
    condition = operatorLive ? "degraded" : "unavailable"
  } else if (required.every((item) => item.state === "live" || item.state === "verified")) condition = "live"
  else condition = "unknown"

  return {
    schemaVersion: STACK_INVENTORY_SCHEMA_VERSION,
    condition,
    generatedAt: now.toISOString(),
    classification,
    authMode,
    inventory,
    topology: TOPOLOGY,
    honestGaps,
    pollEvents: events,
  }
}

export function createLoadingSnapshot(now = new Date()): StackInventorySnapshot {
  return {
    schemaVersion: STACK_INVENTORY_SCHEMA_VERSION,
    condition: "loading",
    generatedAt: now.toISOString(),
    classification: "UNCLASSIFIED",
    authMode: "commercial_unclassified",
    inventory: DEFINITIONS.map((definition) => ({
      ...baselineItem(definition),
      state: "loading",
      summary: "Waiting for the local provider boundary.",
      lastHeartbeatAt: null,
      lastExchangeAt: null,
      signals: unknownSignals("Waiting for the first local poll."),
    })),
    topology: TOPOLOGY,
    honestGaps: [],
    pollEvents: [],
  }
}

export interface StackInventoryProvider {
  load: (signal?: AbortSignal) => Promise<StackInventorySnapshot>
}

export function createRuntimeStackInventoryProvider(
  fetcher: StackFetch = ((input, init) => fetch(input, init) as Promise<ResponseLike>),
  now: () => Date = () => new Date(),
): StackInventoryProvider {
  return {
    async load(signalValue?: AbortSignal) {
      const outcomes = await Promise.all(
        Object.values(STACK_ENDPOINTS).map((endpoint) =>
          readJson(fetcher, endpoint, signalValue, now),
        ),
      )
      return buildSnapshot(outcomes, now())
    },
  }
}

export function buildStackInventorySnapshotForTest(
  outcomes: FetchOutcome[],
  now = new Date("2026-09-01T20:00:00.000Z"),
): StackInventorySnapshot {
  return buildSnapshot(outcomes, now)
}
