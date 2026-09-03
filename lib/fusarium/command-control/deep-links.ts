import {
  COMMAND_MODES,
  type CommandContext,
  type CommandMode,
  type OperatorRole,
  type TimeWindow,
} from "./contracts"

const TIME_WINDOWS = new Set<TimeWindow>(["6h", "24h", "72h"])
const MODES = new Set<CommandMode>(COMMAND_MODES)
const ROLES = new Set<OperatorRole>(["viewer", "operator", "analyst", "admin"])

export const COMMAND_APP_ROUTES = {
  overview: "/fusarium",
  situationalAwareness: "/fusarium/situational-awareness",
  threatAssessment: "/fusarium/threat-assessment",
  dataFusion: "/fusarium/data-fusion",
  commandControl: "/fusarium/command-control",
  earthSimulator: "/fusarium/earth-simulator",
  oeiNarrative: "/fusarium/oei",
  stackInventory: "/fusarium/stack",
} as const

export type CommandAppRoute = keyof typeof COMMAND_APP_ROUTES

function clean(value: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function rangeFor(window: TimeWindow, endMs: number): { start: string; end: string } {
  const hours = window === "6h" ? 6 : window === "72h" ? 72 : 24
  return {
    start: new Date(endMs - hours * 60 * 60 * 1000).toISOString(),
    end: new Date(endMs).toISOString(),
  }
}

function validRange(start: string | null, end: string | null): { start: string; end: string } | null {
  if (!start || !end) return null
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) return null
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() }
}

export function parseCommandContext(
  searchParams: Pick<URLSearchParams, "get">,
  nowMs = Date.now(),
): CommandContext {
  const timeWindowValue = clean(searchParams.get("timeWindow")) as TimeWindow | null
  const timeWindow = timeWindowValue && TIME_WINDOWS.has(timeWindowValue) ? timeWindowValue : "24h"
  const explicitMode = clean(searchParams.get("ccMode")) ?? clean(searchParams.get("dataMode"))
  const mappedMode = explicitMode === "demo" || explicitMode === "simulated"
    ? "simulated"
    : explicitMode === "recorded" || explicitMode === "replay"
      ? "replay"
      : explicitMode === "forecast"
        ? "forecast"
        : "live"
  const mode = MODES.has(mappedMode) ? mappedMode : "live"
  const operatorRoleValue = clean(searchParams.get("operatorRole")) as OperatorRole | null
  const calculated = rangeFor(timeWindow, nowMs)
  const range = validRange(clean(searchParams.get("start")), clean(searchParams.get("end"))) ?? calculated
  const missionAreaId = clean(searchParams.get("missionAreaId")) ?? "runtime-unscoped"

  return {
    missionId: clean(searchParams.get("missionId")),
    contextId: clean(searchParams.get("contextId")),
    missionAreaId,
    missionAreaLabel:
      clean(searchParams.get("missionAreaLabel")) ??
      (missionAreaId === "runtime-unscoped"
        ? "Area not configured · development environment"
        : missionAreaId),
    timeWindow,
    timeRange: range,
    mode,
    selectedObjectId: clean(searchParams.get("objectId")),
    selectedEvidenceId: clean(searchParams.get("evidenceId")),
    selectedSourceId: clean(searchParams.get("sourceId")),
    selectedDeviceId: clean(searchParams.get("deviceId")),
    operatorId: clean(searchParams.get("operatorId")) ?? "local.operator",
    operatorRole:
      operatorRoleValue && ROLES.has(operatorRoleValue) ? operatorRoleValue : "viewer",
    classification: "UNCLASSIFIED",
  }
}

export function commandContextParams(context: CommandContext): URLSearchParams {
  const legacyMode = context.mode === "simulated" ? "demo" : context.mode === "live" ? "system" : "system"
  const params = new URLSearchParams({
    missionAreaId: context.missionAreaId,
    missionAreaLabel: context.missionAreaLabel,
    timeWindow: context.timeWindow,
    dataMode: legacyMode,
    ccMode: context.mode,
    start: context.timeRange.start,
    end: context.timeRange.end,
    operatorRole: context.operatorRole,
    classification: "UNCLASSIFIED",
  })
  if (context.missionId) params.set("missionId", context.missionId)
  if (context.contextId) params.set("contextId", context.contextId)
  if (context.selectedObjectId) {
    params.set("objectType", "environmental-object")
    params.set("objectId", context.selectedObjectId)
  }
  if (context.selectedEvidenceId) params.set("evidenceId", context.selectedEvidenceId)
  if (context.selectedSourceId) params.set("sourceId", context.selectedSourceId)
  if (context.selectedDeviceId) params.set("deviceId", context.selectedDeviceId)
  return params
}

export function buildCommandLink(route: CommandAppRoute, context: CommandContext): string {
  return `${COMMAND_APP_ROUTES[route]}?${commandContextParams(context).toString()}`
}
