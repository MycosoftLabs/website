export const STACK_INVENTORY_SCHEMA_VERSION = 1
export const STACK_STALE_AFTER_MS = 45_000

export type StackCategory =
  | "sensor"
  | "source"
  | "service"
  | "schema"
  | "model"
  | "node"
  | "adapter"

export type InventoryState =
  | "loading"
  | "live"
  | "verified"
  | "configured"
  | "empty"
  | "unknown"
  | "stale"
  | "degraded"
  | "unauthorized"
  | "unavailable"
  | "simulated"

export type SnapshotCondition =
  | "loading"
  | "live"
  | "degraded"
  | "unauthorized"
  | "unavailable"
  | "stale"
  | "empty"
  | "simulated"
  | "unknown"

export type SignalState =
  | "reachable"
  | "unreachable"
  | "verified"
  | "unverified"
  | "compatible"
  | "incompatible"
  | "declared"
  | "allowed"
  | "denied"
  | "acknowledged"
  | "response_received"
  | "historical_success"
  | "not_attempted"
  | "no_exchange"
  | "fresh"
  | "stale"
  | "present"
  | "empty"
  | "unavailable"
  | "simulated"
  | "unknown"
  | "not_probed"
  | "not_applicable"

export type EndpointSignalState = Extract<SignalState, "reachable" | "unreachable" | "unknown" | "not_probed" | "not_applicable">
export type IdentitySignalState = Extract<SignalState, "verified" | "unverified" | "unknown" | "not_applicable">
export type SchemaSignalState = Extract<SignalState, "compatible" | "incompatible" | "declared" | "unknown" | "not_applicable">
export type PermissionSignalState = Extract<SignalState, "allowed" | "denied" | "unknown" | "not_probed" | "not_applicable">
export type ExchangeSignalState = Extract<SignalState, "acknowledged" | "response_received" | "historical_success" | "not_attempted" | "no_exchange" | "unknown" | "not_applicable">
export type FreshnessSignalState = Extract<SignalState, "fresh" | "stale" | "unknown" | "not_applicable">
export type DataSignalState = Extract<SignalState, "present" | "empty" | "unavailable" | "simulated" | "unknown" | "not_applicable">

export interface InventorySignal<State extends SignalState = SignalState> {
  state: State
  label: string
  detail: string
  observedAt: string | null
}

export interface InventorySignals {
  endpoint: InventorySignal<EndpointSignalState>
  identity: InventorySignal<IdentitySignalState>
  schema: InventorySignal<SchemaSignalState>
  permission: InventorySignal<PermissionSignalState>
  exchange: InventorySignal<ExchangeSignalState>
  freshness: InventorySignal<FreshnessSignalState>
  data: InventorySignal<DataSignalState>
}

export interface InventoryEvidence {
  label: string
  ref: string
  href: string | null
}

export interface InventoryItem {
  id: string
  category: StackCategory
  name: string
  summary: string
  state: InventoryState
  required: boolean
  configured: boolean | null
  verified: boolean | null
  lifecycle: string
  version: string | null
  apiMaturity: string
  endpointRef: string | null
  authorizationScope: string
  simulatedBoundary: string
  secretRefs: string[]
  credentialExpiry: "not_applicable" | "not_reported" | "unknown"
  lastHeartbeatAt: string | null
  lastExchangeAt: string | null
  queueDepth: number | null
  backlogCount: number | null
  recordCount: number | null
  dependencies: string[]
  downstream: string[]
  evidence: InventoryEvidence[]
  signals: InventorySignals
}

export interface TopologyEdge {
  from: string
  to: string
  relation: string
}

export interface StackPollEvent {
  id: string
  at: string
  state: InventoryState
  summary: string
  evidenceRef: string
}

export interface StackInventorySnapshot {
  schemaVersion: number
  condition: SnapshotCondition
  generatedAt: string
  classification: string
  authMode: string
  inventory: InventoryItem[]
  topology: TopologyEdge[]
  honestGaps: string[]
  pollEvents: StackPollEvent[]
}

export type StackCategoryFilter = "all" | StackCategory
export type StackStateFilter = "all" | InventoryState

export interface StackInventoryFilters {
  query: string
  category: StackCategoryFilter
  state: StackStateFilter
}

export const STACK_CONTEXT_KEYS = [
  "missionAreaId",
  "missionAreaLabel",
  "timeWindow",
  "dataMode",
  "objectId",
  "evidenceId",
  "sourceId",
  "view",
] as const

export type StackHandoffTarget = "overview" | "situational-awareness" | "data-fusion"

export function signal<State extends SignalState>(
  state: State,
  label: string,
  detail: string,
  observedAt: string | null = null,
): InventorySignal<State> {
  return { state, label, detail, observedAt }
}

export function unknownSignals(reason = "No verified observation is available."): InventorySignals {
  return {
    endpoint: signal("unknown", "Unknown", reason),
    identity: signal("unverified", "Unverified", "No accredited identity assertion is available."),
    schema: signal("unknown", "Unknown", "No compatible response schema has been verified."),
    permission: signal("not_probed", "Not probed", "No permission probe was made."),
    exchange: signal("no_exchange", "No exchange", "No successful exchange is recorded."),
    freshness: signal("unknown", "Unknown", "No authoritative observation timestamp is available."),
    data: signal("unknown", "Unknown", "Data presence has not been established."),
  }
}

export function deriveFreshnessSignal(
  observedAt: string | null,
  nowMs: number,
  staleAfterMs = STACK_STALE_AFTER_MS,
): InventorySignal<FreshnessSignalState> {
  if (!observedAt) {
    return signal("unknown", "Unknown", "No authoritative observation timestamp is available.")
  }
  const observedMs = Date.parse(observedAt)
  if (!Number.isFinite(observedMs)) {
    return signal("unknown", "Unknown", "The reported observation timestamp is invalid.")
  }
  if (observedMs - nowMs > 5_000) {
    return signal("unknown", "Unknown", "The reported observation timestamp is ahead of the local clock.")
  }
  const ageMs = Math.max(0, nowMs - observedMs)
  if (ageMs > staleAfterMs) {
    return signal(
      "stale",
      "Stale",
      `The last verified observation is older than the ${Math.round(staleAfterMs / 1000)} second UI threshold.`,
      observedAt,
    )
  }
  return signal(
    "fresh",
    "Fresh",
    `The last verified observation is within the ${Math.round(staleAfterMs / 1000)} second UI threshold.`,
    observedAt,
  )
}

export function filterInventory(
  inventory: InventoryItem[],
  filters: StackInventoryFilters,
): InventoryItem[] {
  const query = filters.query.trim().toLocaleLowerCase()
  return inventory.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false
    if (filters.state !== "all" && item.state !== filters.state) return false
    if (!query) return true
    const haystack = [
      item.id,
      item.name,
      item.summary,
      item.category,
      item.state,
      item.lifecycle,
      item.version ?? "",
      item.apiMaturity,
      item.endpointRef ?? "",
      item.authorizationScope,
      item.simulatedBoundary,
      ...item.secretRefs,
      ...item.dependencies,
      ...item.downstream,
      ...item.evidence.flatMap((entry) => [entry.label, entry.ref]),
    ]
      .join(" ")
      .toLocaleLowerCase()
    return haystack.includes(query)
  })
}

export function buildStackHandoffLink(
  target: StackHandoffTarget,
  current: URLSearchParams,
  selectedId: string | null,
): string {
  const path =
    target === "overview"
      ? "/fusarium"
      : target === "situational-awareness"
        ? "/fusarium/situational-awareness"
        : "/fusarium/data-fusion"
  const next = new URLSearchParams()
  for (const key of STACK_CONTEXT_KEYS) {
    const value = current.get(key)
    if (value) next.set(key, value)
  }
  next.set("classification", "UNCLASSIFIED")
  next.set("from", "stack-inventory")
  if (selectedId) next.set("sourceId", selectedId)
  const query = next.toString()
  return query ? `${path}?${query}` : path
}

export function nextInventorySelection(
  items: InventoryItem[],
  currentId: string | null,
  key: "ArrowDown" | "ArrowUp" | "Home" | "End" | "Escape",
): string | null {
  if (key === "Escape" || items.length === 0) return null
  if (key === "Home") return items[0].id
  if (key === "End") return items[items.length - 1].id
  const currentIndex = items.findIndex((item) => item.id === currentId)
  if (currentIndex < 0) return key === "ArrowUp" ? items[items.length - 1].id : items[0].id
  if (key === "ArrowDown") return items[Math.min(items.length - 1, currentIndex + 1)].id
  return items[Math.max(0, currentIndex - 1)].id
}

function signalKey(signals: InventorySignals): string[] {
  return Object.values(signals).flatMap((entry) => [entry.state, entry.label, entry.detail])
}

/**
 * Stable item IDs remain the React keys, while material evidence timestamps are
 * included so a successful heartbeat cannot leave stale timestamps on screen.
 */
export function semanticSnapshotKey(snapshot: StackInventorySnapshot): string {
  return JSON.stringify({
    condition: snapshot.condition,
    classification: snapshot.classification,
    authMode: snapshot.authMode,
    gaps: snapshot.honestGaps,
    inventory: snapshot.inventory.map((item) => [
      item.id,
      item.state,
      item.summary,
      item.required,
      item.configured,
      item.verified,
      item.lifecycle,
      item.version,
      item.apiMaturity,
      item.credentialExpiry,
      item.lastHeartbeatAt,
      item.lastExchangeAt,
      item.queueDepth,
      item.backlogCount,
      item.recordCount,
      item.evidence.map((entry) => [entry.label, entry.ref]),
      ...signalKey(item.signals),
      ...Object.values(item.signals).map((entry) => entry.observedAt),
    ]),
  })
}

export function snapshotChanges(
  previous: StackInventorySnapshot,
  next: StackInventorySnapshot,
): Array<{ itemId: string; summary: string; state: InventoryState }> {
  const before = new Map(previous.inventory.map((item) => [item.id, item]))
  const after = new Set(next.inventory.map((item) => item.id))
  const changes: Array<{ itemId: string; summary: string; state: InventoryState }> = []
  for (const item of next.inventory) {
    const prior = before.get(item.id)
    if (!prior) {
      changes.push({ itemId: item.id, summary: `${item.name} entered the inventory as ${item.state}.`, state: item.state })
      continue
    }
    if (prior.state !== item.state) {
      changes.push({
        itemId: item.id,
        summary: `${item.name} changed from ${prior.state} to ${item.state}.`,
        state: item.state,
      })
    }
  }
  for (const item of previous.inventory) {
    if (after.has(item.id)) continue
    changes.push({
      itemId: item.id,
      summary: `${item.name} is absent from the newly accepted inventory; its current state is unknown.`,
      state: "unknown",
    })
  }
  return changes
}
