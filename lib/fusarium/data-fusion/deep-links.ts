import type {
  FusionContext,
  FusionLineageNode,
  FusionMode,
  FusionTimeWindow,
  OperatorRole,
} from "./contracts"

export const DEFAULT_FUSION_CONTEXT: FusionContext = {
  contextId: null,
  missionId: "runtime-unscoped",
  missionAreaId: "runtime-unscoped",
  missionAreaLabel: "Area not configured · development environment",
  timeWindow: "24h",
  timeRange: null,
  mode: "live",
  operatorRole: "analyst",
  selectedNodeId: null,
  selectedObjectId: null,
  selectedEvidenceId: null,
  selectedSourceId: null,
  classification: "UNCLASSIFIED",
}

const WINDOWS = new Set<FusionTimeWindow>(["6h", "24h", "72h"])
const MODES = new Set<FusionMode>(["live", "replay", "forecast", "simulated"])
const ROLES = new Set<OperatorRole>(["viewer", "operator", "analyst", "admin"])

const APP_ROUTES = {
  dataFusion: "/fusarium/data-fusion",
  overview: "/fusarium",
  situationalAwareness: "/fusarium/situational-awareness",
  oeiNarrative: "/fusarium/oei",
  threatAssessment: "/fusarium/threat-assessment",
  stackInventory: "/fusarium/stack",
} as const

export type FusionAppRoute = keyof typeof APP_ROUTES

export type FusionOperationalScope = Pick<
  FusionContext,
  "contextId" | "missionId" | "missionAreaId" | "missionAreaLabel"
>

const SIMULATION_SCOPE = {
  contextId: "sim-context-alpha-7",
  missionId: "demo-mission-alpha-7",
  missionAreaId: "demo-area-alpha-7",
  missionAreaLabel: "Sanitized Alpha-7 exercise area",
} as const

function containsSimulationScope(context: FusionContext): boolean {
  return context.contextId === SIMULATION_SCOPE.contextId
    || context.missionId === SIMULATION_SCOPE.missionId
    || context.missionAreaId === SIMULATION_SCOPE.missionAreaId
    || context.missionAreaLabel === SIMULATION_SCOPE.missionAreaLabel
}

/** Fail closed if a demo-owned identifier is supplied in an operational mode. */
export function isolateSimulationScopeFromOperational(context: FusionContext): FusionContext {
  if (context.mode === "simulated" || !containsSimulationScope(context)) return context
  return {
    ...context,
    contextId: DEFAULT_FUSION_CONTEXT.contextId,
    missionId: DEFAULT_FUSION_CONTEXT.missionId,
    missionAreaId: DEFAULT_FUSION_CONTEXT.missionAreaId,
    missionAreaLabel: DEFAULT_FUSION_CONTEXT.missionAreaLabel,
    selectedNodeId: null,
    selectedObjectId: null,
    selectedEvidenceId: null,
    selectedSourceId: null,
  }
}

/**
 * A sanitized scenario owns demo-only scope identifiers. When an operator
 * leaves that mode, those identifiers must never leak into a LIVE/REPLAY or
 * FORECAST request. Restore the last operational scope, including the honest
 * runtime-unscoped default used by a direct scenario deep link.
 */
export function restoreOperationalScopeAfterSimulation(
  next: FusionContext,
  lastOperationalScope: FusionOperationalScope,
): FusionContext {
  if (next.mode === "simulated" || !containsSimulationScope(next)) return next
  return {
    ...next,
    ...lastOperationalScope,
    selectedNodeId: null,
    selectedObjectId: null,
    selectedEvidenceId: null,
    selectedSourceId: null,
  }
}

function parseMode(searchParams: Pick<URLSearchParams, "get">): FusionMode {
  const explicit = searchParams.get("mode")?.toLowerCase() as FusionMode | undefined
  if (explicit && MODES.has(explicit)) return explicit
  const commandMode = searchParams.get("ccMode")?.toLowerCase()
  if (commandMode === "simulated") return "simulated"
  if (commandMode === "replay" || commandMode === "recorded") return "replay"
  if (commandMode === "forecast") return "forecast"
  if (commandMode === "live") return "live"
  const legacy = searchParams.get("dataMode")?.toLowerCase()
  if (legacy === "demo" || legacy === "simulated") return "simulated"
  if (legacy === "replay") return "replay"
  if (legacy === "forecast") return "forecast"
  return "live"
}

export function parseFusionContext(searchParams: Pick<URLSearchParams, "get">): FusionContext {
  const contextId = searchParams.get("contextId")?.trim()
  const missionId = searchParams.get("missionId")?.trim()
  const missionAreaId = searchParams.get("missionAreaId")?.trim()
  const window = searchParams.get("timeWindow") as FusionTimeWindow | null
  const sourceApplication = searchParams.get("sourceApplication")?.trim().toLowerCase()
  const role = (
    searchParams.get("operatorRole") ||
    searchParams.get("role") ||
    (sourceApplication === "threat-assessment" ? searchParams.get("displayRole") : null)
  ) as OperatorRole | null
  const objectType = searchParams.get("objectType")?.trim().toLowerCase()
  const objectId = searchParams.get("objectId")?.trim() || null
  const objectTypeSupported = ["environmental-object", "environmental_object", "object", "environmental-change", "environmental_change", "change"].includes(objectType || "")
  const selectedObjectId = objectId && (
    objectTypeSupported ||
    (!objectType && sourceApplication === "threat-assessment")
  ) ? objectId : null
  const requestedStart = searchParams.get("start")
  const requestedEnd = searchParams.get("end")
  const timeRange = requestedStart !== null || requestedEnd !== null
    ? { start: requestedStart?.trim() || "", end: requestedEnd?.trim() || "" }
    : null

  return isolateSimulationScopeFromOperational({
    ...DEFAULT_FUSION_CONTEXT,
    contextId: contextId || null,
    missionId: missionId || DEFAULT_FUSION_CONTEXT.missionId,
    missionAreaId: missionAreaId || DEFAULT_FUSION_CONTEXT.missionAreaId,
    missionAreaLabel:
      searchParams.get("missionAreaLabel")?.trim() ||
      (missionAreaId && missionAreaId !== DEFAULT_FUSION_CONTEXT.missionAreaId
        ? missionAreaId
        : DEFAULT_FUSION_CONTEXT.missionAreaLabel),
    timeWindow: window && WINDOWS.has(window) ? window : DEFAULT_FUSION_CONTEXT.timeWindow,
    timeRange,
    mode: parseMode(searchParams),
    operatorRole: role && ROLES.has(role) ? role : DEFAULT_FUSION_CONTEXT.operatorRole,
    selectedNodeId: searchParams.get("nodeId")?.trim() || null,
    selectedObjectId,
    selectedEvidenceId: searchParams.get("evidenceId")?.trim() || null,
    selectedSourceId: searchParams.get("sourceId")?.trim() || null,
  })
}

function addSelection(params: URLSearchParams, context: FusionContext) {
  if (context.selectedNodeId) params.set("nodeId", context.selectedNodeId)
  if (context.selectedObjectId) {
    params.set("objectType", "environmental-object")
    params.set("objectId", context.selectedObjectId)
  }
  if (context.selectedEvidenceId) params.set("evidenceId", context.selectedEvidenceId)
  if (context.selectedSourceId) params.set("sourceId", context.selectedSourceId)
}

export function fusionContextParams(context: FusionContext): URLSearchParams {
  const params = new URLSearchParams({
    missionId: context.missionId,
    missionAreaId: context.missionAreaId,
    missionAreaLabel: context.missionAreaLabel,
    timeWindow: context.timeWindow,
    mode: context.mode,
    dataMode:
      context.mode === "simulated"
        ? "demo"
        : context.mode === "replay"
          ? "replay"
          : context.mode === "forecast"
            ? "forecast"
            : "system",
    operatorRole: context.operatorRole,
    role: context.operatorRole,
    classification: "UNCLASSIFIED",
  })
  if (context.contextId) params.set("contextId", context.contextId)
  if (context.timeRange) {
    params.set("start", context.timeRange.start)
    params.set("end", context.timeRange.end)
  }
  addSelection(params, context)
  return params
}

export function buildFusionLink(route: FusionAppRoute, context: FusionContext): string {
  return `${APP_ROUTES[route]}?${fusionContextParams(context).toString()}`
}

export function contextForSelectedNode(
  context: FusionContext,
  node: FusionLineageNode | null,
): FusionContext {
  if (!node) {
    return {
      ...context,
      selectedNodeId: null,
      selectedObjectId: null,
      selectedEvidenceId: null,
      selectedSourceId: null,
    }
  }
  return {
    ...context,
    selectedNodeId: node.id,
    selectedObjectId: node.objectIds[0] ?? null,
    selectedEvidenceId: node.evidenceIds[0] ?? null,
    selectedSourceId: node.sourceIds[0] ?? null,
  }
}

export function timeRangeForContext(context: FusionContext, nowMs: number): { start: string; end: string } | null {
  if (context.timeRange) {
    const start = Date.parse(context.timeRange.start)
    const end = Date.parse(context.timeRange.end)
    const hasOffsets = /(?:Z|[+-]\d{2}:\d{2})$/i.test(context.timeRange.start) && /(?:Z|[+-]\d{2}:\d{2})$/i.test(context.timeRange.end)
    if (!hasOffsets || !Number.isFinite(start) || !Number.isFinite(end) || start > end) return null
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
  }
  const hours: Record<FusionTimeWindow, number> = { "6h": 6, "24h": 24, "72h": 72 }
  return {
    start: new Date(nowMs - hours[context.timeWindow] * 60 * 60 * 1000).toISOString(),
    end: new Date(nowMs).toISOString(),
  }
}
