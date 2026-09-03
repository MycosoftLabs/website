import {
  createOverviewRecord,
  type ConnectorPayload,
  type OverviewCardPayload,
  type OverviewCondition,
  type OverviewContext,
  type OverviewRecord,
  type OverviewSnapshot,
  type OverviewStatusState,
} from "@/lib/fusarium/overview/contracts"
import { applySanitizedScenario, createLoadingSnapshot } from "@/lib/fusarium/overview/scenario"

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface SourceSuccess<T> {
  ok: true
  data: T
  statusCode: number
}

interface SourceFailure {
  ok: false
  condition: "error" | "unauthorized"
  statusCode: number | null
  message: string
}

type SourceOutcome<T> = SourceSuccess<T> | SourceFailure

interface OperatorStateResponse {
  classification?: string
  auth_mode?: string
  nlm?: { bridge?: boolean; model_deployed?: boolean }
}

interface MonitoringHealthResponse {
  status?: string
  classification?: string
  authMode?: string
  services?: Record<string, string>
}

interface DeviceRecord {
  id?: string
  name?: string
  status?: string
  domain?: string
  type?: string
  deviceType?: string
}

interface AdapterStatusResponse {
  lattice?: AdapterState
  palantir?: AdapterState
}

interface AdapterState {
  adapter?: string
  configured?: boolean
  endpoint_set?: boolean
  token_set?: boolean
  classification?: string
  invented_dataset?: boolean
  note?: string
}

interface ModalityCatalogResponse {
  kind?: string
  items?: { silo_id?: string; name?: string }[]
}

export interface OverviewProvider {
  load(context: OverviewContext, signal?: AbortSignal): Promise<OverviewSnapshot>
}

async function readJson<T>(fetcher: Fetcher, url: string, signal?: AbortSignal): Promise<SourceOutcome<T>> {
  try {
    const response = await fetcher(url, { cache: "no-store", signal })
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        condition: "unauthorized",
        statusCode: response.status,
        message: `Access denied by the local provider (HTTP ${response.status}).`,
      }
    }
    if (!response.ok) {
      return {
        ok: false,
        condition: "error",
        statusCode: response.status,
        message: `Local provider returned HTTP ${response.status}.`,
      }
    }
    return { ok: true, data: (await response.json()) as T, statusCode: response.status }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    return {
      ok: false,
      condition: "error",
      statusCode: null,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function settled<T>(result: PromiseSettledResult<SourceOutcome<T>>): SourceOutcome<T> {
  if (result.status === "fulfilled") return result.value
  return {
    ok: false,
    condition: "error",
    statusCode: null,
    message: result.reason instanceof Error ? result.reason.message : String(result.reason),
  }
}

function failedRecord<T>(
  context: OverviewContext,
  now: string,
  recordId: string,
  surface: string,
  source: string,
  outcome: SourceFailure,
): OverviewRecord<T> {
  const providerAnswered = outcome.statusCode !== null
  return createOverviewRecord<T>({
    recordId,
    missionAreaId: context.missionAreaId,
    now,
    payload: null,
    state: outcome.condition === "unauthorized" ? "blocked" : providerAnswered ? "degraded" : "unreachable",
    condition: outcome.condition,
    source,
    surface,
    reason: outcome.message,
    observedAt: null,
    provenanceRef: `local-api://${source}`,
    lastError: outcome.message,
  })
}

function localRecord<T>(
  context: OverviewContext,
  now: string,
  options: {
    recordId: string
    surface: string
    source: string
    payload: T
    state: OverviewStatusState
    condition?: OverviewCondition
    reason: string
    staleAfterSeconds?: number
  },
): OverviewRecord<T> {
  return createOverviewRecord({
    ...options,
    missionAreaId: context.missionAreaId,
    now,
    condition: options.condition ?? "ready",
    dataMode: "live",
    sourceIds: [options.source],
    provenanceRef: `local-api://${options.source}`,
    confidence: {
      score: null,
      label: "not_assessed",
      basis: "Direct local service response; no machine inference score applies.",
    },
    observedAt: now,
    staleAfterSeconds: options.staleAfterSeconds ?? 45,
    demo: false,
  })
}

function normalizeDevices(
  context: OverviewContext,
  now: string,
  outcome: SourceOutcome<DeviceRecord[] | { items?: DeviceRecord[]; devices?: DeviceRecord[] }>,
): OverviewRecord<OverviewCardPayload>[] {
  if (!outcome.ok) {
    return [failedRecord(context, now, "device-registry-error", "Overview / Device and domain health", "api/Devices", outcome)]
  }

  const data = outcome.data
  const devices = Array.isArray(data) ? data : data.items ?? data.devices ?? []
  if (devices.length === 0) {
    return [
      createOverviewRecord({
        recordId: "device-registry-empty",
        missionAreaId: context.missionAreaId,
        now,
        payload: {
          kicker: "UNKNOWN · NOT MEASURED ZERO",
          title: "No registered device telemetry",
          summary: "The local device registry returned no device records, so fleet and domain readiness cannot be assessed.",
          nextStep: "Open Stack Inventory for the current registry boundary and readiness blockers.",
        },
        state: "unknown",
        condition: "empty",
        source: "api/Devices",
        surface: "Overview / Device and domain health",
        reason: "An empty registry is unknown readiness, not a measured fleet count of zero.",
        dataMode: "live",
        sourceIds: ["api/Devices"],
        provenanceRef: "local-api://api/Devices",
        observedAt: now,
        staleAfterSeconds: 45,
      }),
    ]
  }

  const assertedStatuses = devices
    .map((device) => String(device.status ?? "").trim().toLowerCase())
    .filter(Boolean)
  const reporting = assertedStatuses.filter((status) => status === "online").length
  const unknownStatuses = devices.length - assertedStatuses.length
  const onlineState =
    assertedStatuses.length === 0
      ? "online state UNKNOWN"
      : `${reporting} reporting online${unknownStatuses > 0 ? ` · ${unknownStatuses} status unknown` : ""}`
  return [
    localRecord(context, now, {
      recordId: "device-registry-live",
      surface: "Overview / Device and domain health",
      source: "api/Devices",
      payload: {
        kicker: "VERIFIED LOCAL REGISTRY",
        title: "Registered device records",
        value: `${devices.length} registered · ${onlineState}`,
        summary: "Counts reflect only records returned by the current local registry poll; they are not an operational fleet claim.",
        nextStep: "Open Stack Inventory for device-level state.",
      },
      state: assertedStatuses.length === 0 ? "unknown" : reporting === devices.length ? "live" : "degraded",
      condition: assertedStatuses.length === devices.length && reporting === devices.length ? "ready" : "partial",
      reason:
        assertedStatuses.length === 0
          ? "The registry returned records but asserted no device statuses; online readiness remains unknown."
          : "Derived only from device statuses asserted by the current local registry response.",
    }),
  ]
}

function normalizeModalities(
  context: OverviewContext,
  now: string,
  outcome: SourceOutcome<ModalityCatalogResponse>,
): OverviewRecord<OverviewCardPayload> {
  if (!outcome.ok) {
    return failedRecord(context, now, "modality-catalog-error", "Overview / Modality coverage", "api/fusarium/catalog/modalities", outcome)
  }

  const declared = Array.isArray(outcome.data.items) ? outcome.data.items.length : null
  return localRecord(context, now, {
    recordId: "modality-taxonomy",
    surface: "Overview / Modality coverage",
    source: "api/fusarium/catalog/modalities",
    payload: {
      kicker: "TAXONOMY ONLY",
      title: "Declared modality namespaces",
      value: declared === null ? "UNKNOWN" : `${declared} declared namespaces`,
      summary: "The runtime exposes names, but not live reporting, freshness, or source-level coverage. Coverage remains unknown.",
      nextStep: "Open Data Fusion for the taxonomy and missing telemetry contract.",
    },
    state: "artifact_only",
    condition: "partial",
    reason: "A catalog artifact exists; it is not evidence that any modality is reporting.",
    staleAfterSeconds: 300,
  })
}

function normalizeOperatorServices(
  context: OverviewContext,
  now: string,
  outcome: SourceOutcome<OperatorStateResponse>,
): OverviewRecord<OverviewCardPayload>[] {
  if (!outcome.ok) {
    return [failedRecord(context, now, "runtime-unreachable", "Overview / Core service health", "api/fusarium/operator/state", outcome)]
  }

  const nlm = outcome.data.nlm
  return [
    localRecord(context, now, {
      recordId: "fusarium-runtime",
      surface: "Overview / Core service health",
      source: "api/fusarium/operator/state",
      payload: {
        kicker: "VERIFIED LOCAL HEALTH",
        title: "FUSARIUM runtime",
        value: "AVAILABLE",
        summary: "The 8011 development process answered this poll. Role-aware development headers exist, but this is local process health—not an accredited trust boundary or live mission picture.",
        details: [
          { label: "Classification", value: "UNCLASSIFIED" },
          { label: "Access mode", value: String(outcome.data.auth_mode ?? "UNKNOWN") },
          { label: "Runtime bind", value: "0.0.0.0:8011 · LAN REACHABILITY UNVERIFIED" },
          { label: "Development host", value: "127.0.0.1:8012 · LOOPBACK ONLY" },
          { label: "Identity boundary", value: "DEVELOPMENT HEADER / UNVERIFIED" },
          { label: "Contract surface", value: "/api/fusarium/v1 · SOURCE IMPLEMENTED / ACTIVE BINDING UNVERIFIED" },
          { label: "Persistence", value: "LOCAL SQLITE/WAL · NO VERIFIED BACKUP" },
        ],
      },
      state: "live",
      reason: "HTTP success from the local operator-state endpoint; not evidence of a live operational picture.",
    }),
    localRecord(context, now, {
      recordId: "nlm-readiness",
      surface: "Overview / Core service health",
      source: "api/fusarium/operator/state#nlm",
      payload: {
        kicker: nlm?.bridge ? "BRIDGE ARTIFACT PRESENT" : "NOT IMPLEMENTED",
        title: "Nature Learning Model",
        value: nlm?.model_deployed ? "MODEL DEPLOYED" : "NO MODEL DEPLOYED",
        summary: nlm?.model_deployed
          ? "The runtime reports a deployed model; model identity and direct health still require verification."
          : "The runtime reports a bridge but no trained or deployed NLM service.",
        nextStep: "Treat NLM-derived outlook and conclusions as unavailable until a model artifact and health contract exist.",
      },
      state: nlm?.model_deployed ? "configured" : nlm?.bridge ? "artifact_only" : "not_implemented",
      condition: nlm?.model_deployed ? "partial" : "empty",
      reason: "Normalized from nlm.model_deployed; the former Overview nlm.deployed field was schema-drifted.",
    }),
  ]
}

function normalizeMonitoring(
  context: OverviewContext,
  now: string,
  outcome: SourceOutcome<MonitoringHealthResponse>,
): OverviewRecord<OverviewCardPayload>[] {
  if (!outcome.ok) {
    return [failedRecord(context, now, "monitoring-unreachable", "Overview / Core service health", "api/Monitoring/health", outcome)]
  }

  const entries = Object.entries(outcome.data.services ?? {})
  if (entries.length === 0) {
    return [
      localRecord(context, now, {
        recordId: "monitoring-partial",
        surface: "Overview / Core service health",
        source: "api/Monitoring/health",
        payload: {
          title: "Monitoring endpoint",
          value: String(outcome.data.status ?? "UNKNOWN").toUpperCase(),
          summary: "The endpoint responded without service-level records.",
        },
        state: "degraded",
        condition: "partial",
        reason: "Top-level health is present, but service-level evidence is absent.",
      }),
    ]
  }

  return entries.map(([service, serviceState]) => {
    const normalized = serviceState.toLowerCase()
    const state: OverviewStatusState = normalized === "up" ? "live" : normalized === "unavailable" ? "not_implemented" : "degraded"
    return localRecord(context, now, {
      recordId: `monitoring-${service}`,
      surface: "Overview / Core service health",
      source: `api/Monitoring/health#${service}`,
      payload: {
        kicker: "VERIFIED LOCAL HEALTH",
        title: service.replace(/([a-z])([A-Z])/g, "$1 $2"),
        value: serviceState.toUpperCase(),
        summary: "Direct state from the local monitoring endpoint; freshness is the current poll time.",
      },
      state,
      condition: normalized === "up" ? "ready" : normalized === "unavailable" ? "empty" : "partial",
      reason: `Monitoring reported ${serviceState}; no additional operational claim is inferred.`,
    })
  })
}

function connectorRecord(
  context: OverviewContext,
  now: string,
  id: "lattice" | "palantir",
  adapter: AdapterState | undefined,
): OverviewRecord<ConnectorPayload> {
  const declarationsPresent = adapter?.configured === true || adapter?.endpoint_set === true || adapter?.token_set === true
  const isLattice = id === "lattice"
  const title = isLattice ? "Anduril Lattice" : "Palantir"
  const readiness = "DISABLED / UNVERIFIED"
  const reason = declarationsPresent
    ? "Local configuration fields may be declared, but endpoint or token presence is not a connection. The adapter remains disabled and no authorized permission probe, schema pin, handshake, or acknowledged exchange was performed."
    : "Only a generic local adapter seam exists. The adapter is disabled; no vendor client, authorized environment, or live access is configured."

  return createOverviewRecord({
    recordId: `connector-${id}`,
    missionAreaId: context.missionAreaId,
    now,
    payload: {
      kicker: "NO EXTERNAL CALLS FROM OVERVIEW",
      title,
      readiness,
      environment: declarationsPresent ? "Declared locally; disabled" : "None",
      interfaceScope: isLattice
        ? "Entities API only; Tasks and manual-control APIs prohibited"
        : "Foundry / OSDK mapping not enrolled; no Gotham claim",
      protocol: "Generic HTTPS JSON seam; no vendor SDK client",
      authMode: adapter?.token_set ? "Bearer token presence declared; value never exposed" : "Not configured",
      permissionProbe: "Not run",
      lastHandshake: "Never verified",
      lastAcknowledgement: "None",
      ttlPolicy: "No exchange TTL; provenance policy not implemented",
      summary: adapter?.note ?? reason,
      nextStep: "Open Stack Inventory for adapter evidence and shared-platform blockers.",
      details: [
        { label: "Endpoint", value: adapter?.endpoint_set ? "DECLARED" : "NOT SET" },
        { label: "Schema/API version", value: "NOT PINNED" },
        { label: "Last error", value: "NONE RECORDED" },
      ],
    },
    state: "artifact_only",
    condition: declarationsPresent ? "partial" : "empty",
    source: `api/fusarium/adapters#${id}`,
    surface: "Overview / Connector health",
    reason,
    dataMode: "live",
    sourceIds: [`api/fusarium/adapters#${id}`],
    provenanceRef: `local-api://api/fusarium/adapters#${id}`,
    observedAt: now,
    staleAfterSeconds: 45,
  })
}

function plannedConnector(
  context: OverviewContext,
  now: string,
  id: string,
  title: string,
  interfaceScope: string,
): OverviewRecord<ConnectorPayload> {
  return createOverviewRecord({
    recordId: `connector-${id}`,
    missionAreaId: context.missionAreaId,
    now,
    payload: {
      kicker: "PLANNED · NO ADAPTER",
      title,
      readiness: "PLANNED",
      environment: "None",
      interfaceScope,
      protocol: "Not selected",
      authMode: "Not configured",
      permissionProbe: "Not available",
      lastHandshake: "Never",
      lastAcknowledgement: "None",
      ttlPolicy: "Not implemented",
      summary: "The product direction names this integration class, but the current runtime exposes no operational adapter.",
      nextStep: "Define an authorized test environment and vendor-neutral exchange contract in the shared-platform lane.",
    },
    state: "not_implemented",
    condition: "empty",
    source: "verified-platform-reconciliation",
    surface: "Overview / Connector health",
    reason: "Planned integration only; no connection or message exchange exists.",
    observedAt: now,
    provenanceRef: "build://fusarium/foundation/reconciliation-2026-09-01",
  })
}

function normalizeConnectors(
  context: OverviewContext,
  now: string,
  outcome: SourceOutcome<AdapterStatusResponse>,
): OverviewRecord<ConnectorPayload>[] {
  if (!outcome.ok) {
    return [
      failedRecord(context, now, "connectors-error", "Overview / Connector health", "api/fusarium/adapters", outcome),
      plannedConnector(context, now, "platform-one", "Platform One", "Deployment and DevSecOps target; not a data-feed connection"),
      plannedConnector(context, now, "c2", "External C2 / JADC2 gateways", "Vendor-neutral environmental exchange; sponsor interface required"),
    ]
  }

  return [
    connectorRecord(context, now, "lattice", outcome.data.lattice),
    connectorRecord(context, now, "palantir", outcome.data.palantir),
    plannedConnector(context, now, "platform-one", "Platform One", "Deployment and DevSecOps target; not a data-feed connection"),
    plannedConnector(context, now, "c2", "External C2 / JADC2 gateways", "Vendor-neutral environmental exchange; sponsor interface required"),
  ]
}

function pollingActivity(
  context: OverviewContext,
  now: string,
  operator: SourceOutcome<OperatorStateResponse>,
): OverviewRecord<OverviewCardPayload> {
  if (!operator.ok) {
    return failedRecord(context, now, "activity-runtime-poll-error", "Overview / Activity timeline", "api/fusarium/operator/state", operator)
  }
  return localRecord(context, now, {
    recordId: "activity-runtime-poll",
    surface: "Overview / Activity timeline",
    source: "api/fusarium/operator/state",
    payload: {
      kicker: "NOW · OVERVIEW",
      title: "Local runtime status refreshed",
      summary: "Overview received the current system-state envelope. No operational mission data or external messages were requested.",
      nextStep: "Inspect service and adapter readiness in Stack Inventory.",
    },
    state: "live",
    reason: "Client-side health poll completed successfully.",
  })
}

export function createOverviewProvider(fetcher: Fetcher = fetch): OverviewProvider {
  return {
    async load(context, signal) {
      const now = new Date().toISOString()
      const base = applySanitizedScenario(createLoadingSnapshot(context, now))

      const results = await Promise.allSettled([
        readJson<OperatorStateResponse>(fetcher, "/api/fusarium/operator/state", signal),
        readJson<MonitoringHealthResponse>(fetcher, "/api/Monitoring/health", signal),
        readJson<DeviceRecord[] | { items?: DeviceRecord[]; devices?: DeviceRecord[] }>(fetcher, "/api/Devices", signal),
        readJson<AdapterStatusResponse>(fetcher, "/api/fusarium/adapters", signal),
        readJson<ModalityCatalogResponse>(fetcher, "/api/fusarium/catalog/modalities", signal),
      ])

      const operator = settled(results[0])
      const monitoring = settled(results[1])
      const devices = settled(results[2])
      const adapters = settled(results[3])
      const modalities = settled(results[4])

      const deviceDomainHealth = normalizeDevices(context, now, devices)
      const liveModalityRecord = normalizeModalities(context, now, modalities)

      return {
        ...base,
        generatedAt: now,
        deviceDomainHealth,
        modalityCoverage:
          context.dataMode === "demo" ? [...base.modalityCoverage, liveModalityRecord] : [liveModalityRecord],
        provenanceHealth:
          context.dataMode === "demo"
            ? base.provenanceHealth
            : [
                createOverviewRecord({
                  recordId: "runtime-provenance-gap",
                  missionAreaId: context.missionAreaId,
                  now,
                  payload: {
                    kicker: "SCHEMA GAP",
                    title: "Mission provenance cannot be assessed",
                    summary: "Current runtime state has no source as-of, effective interval, or formal provenance reference.",
                    nextStep: "Use the Overview envelope as the frontend contract and add durable provenance in the shared platform.",
                  },
                  state: "artifact_only",
                  condition: "partial",
                  source: "api/fusarium/operator/state",
                  surface: "Overview / Provenance health",
                  reason: "The source response is reachable but lacks the fields required for evidence lineage.",
                  dataMode: "live",
                  sourceIds: ["api/fusarium/operator/state"],
                  provenanceRef: "local-api://api/fusarium/operator/state#schema-gap",
                  observedAt: now,
                  staleAfterSeconds: 45,
                }),
              ],
        coreServices: [
          ...normalizeOperatorServices(context, now, operator),
          ...normalizeMonitoring(context, now, monitoring),
        ],
        connectorHealth: normalizeConnectors(context, now, adapters),
        activity: [
          ...base.activity.filter((record) => record.status.condition !== "loading"),
          pollingActivity(context, now, operator),
        ],
      }
    },
  }
}
