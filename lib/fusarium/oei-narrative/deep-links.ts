import {
  OEI_MODES,
  OEI_ROLES,
  OEI_TIME_WINDOWS,
  type OeiContext,
  type OeiMode,
  type OeiRole,
  type OeiTimeWindow,
} from "./contracts"

export const DEFAULT_OEI_CONTEXT: OeiContext = {
  missionId: "runtime-unscoped",
  missionLabel: "Mission not selected",
  contextId: null,
  missionAreaId: "runtime-unscoped",
  missionAreaLabel: "Area not configured · development environment",
  timeWindow: "24h",
  mode: "live",
  selectedObjectId: null,
  selectedEvidenceId: null,
  selectedSourceId: null,
  role: "viewer",
  operatorId: "operator.oei-local",
  classification: "UNCLASSIFIED",
}

const APP_ROUTES = {
  oeiNarrative: "/fusarium/oei",
  overview: "/fusarium",
  situationalAwareness: "/fusarium/situational-awareness",
  threatAssessment: "/fusarium/threat-assessment",
  dataFusion: "/fusarium/data-fusion",
  commandControl: "/fusarium/command-control",
  stackInventory: "/fusarium/stack",
} as const

export type OeiAppRoute = keyof typeof APP_ROUTES

function enumValue<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback
}

function modeFromParams(searchParams: Pick<URLSearchParams, "get">): OeiMode {
  const direct = searchParams.get("mode")
  if (direct && OEI_MODES.includes(direct as OeiMode)) return direct as OeiMode
  const shared = searchParams.get("dataMode")
  if (shared === "demo" || shared === "simulated") return "simulated"
  if (shared === "replay") return "replay"
  if (shared === "forecast") return "forecast"
  return "live"
}

export function parseOeiContext(searchParams: Pick<URLSearchParams, "get">): OeiContext {
  const missionId = searchParams.get("missionId")?.trim() || DEFAULT_OEI_CONTEXT.missionId
  const missionAreaId = searchParams.get("missionAreaId")?.trim() || DEFAULT_OEI_CONTEXT.missionAreaId
  return {
    ...DEFAULT_OEI_CONTEXT,
    missionId,
    missionLabel:
      searchParams.get("missionLabel")?.trim() ||
      (missionId === DEFAULT_OEI_CONTEXT.missionId ? DEFAULT_OEI_CONTEXT.missionLabel : missionId),
    contextId: searchParams.get("contextId")?.trim() || null,
    missionAreaId,
    missionAreaLabel:
      searchParams.get("missionAreaLabel")?.trim() ||
      (missionAreaId === DEFAULT_OEI_CONTEXT.missionAreaId
        ? DEFAULT_OEI_CONTEXT.missionAreaLabel
        : missionAreaId),
    timeWindow: enumValue<OeiTimeWindow>(searchParams.get("timeWindow"), OEI_TIME_WINDOWS, "24h"),
    mode: modeFromParams(searchParams),
    selectedObjectId: searchParams.get("objectId")?.trim() || null,
    selectedEvidenceId: searchParams.get("evidenceId")?.trim() || null,
    selectedSourceId: searchParams.get("sourceId")?.trim() || null,
    role: enumValue<OeiRole>(searchParams.get("role"), OEI_ROLES, "viewer"),
    operatorId: searchParams.get("operatorId")?.trim() || DEFAULT_OEI_CONTEXT.operatorId,
    classification: "UNCLASSIFIED",
  }
}

function contextParams(context: OeiContext): URLSearchParams {
  const params = new URLSearchParams({
    missionId: context.missionId,
    missionLabel: context.missionLabel,
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
    role: context.role,
    operatorId: context.operatorId,
    classification: "UNCLASSIFIED",
  })
  if (context.contextId) params.set("contextId", context.contextId)
  if (context.selectedObjectId) {
    params.set("objectType", "environmental-object")
    params.set("objectId", context.selectedObjectId)
  }
  if (context.selectedEvidenceId) params.set("evidenceId", context.selectedEvidenceId)
  if (context.selectedSourceId) params.set("sourceId", context.selectedSourceId)
  return params
}

export function buildOeiSelfLink(context: OeiContext): string {
  return `${APP_ROUTES.oeiNarrative}?${contextParams(context).toString()}`
}

export function buildOeiHandoffLink(
  route: Exclude<OeiAppRoute, "oeiNarrative">,
  context: OeiContext,
): string {
  return `${APP_ROUTES[route]}?${contextParams(context).toString()}`
}

export function withOeiSelection(
  context: OeiContext,
  selection: { objectId?: string | null; evidenceId?: string | null; sourceId?: string | null },
): OeiContext {
  return {
    ...context,
    selectedObjectId: selection.objectId === undefined ? context.selectedObjectId : selection.objectId,
    selectedEvidenceId: selection.evidenceId === undefined ? context.selectedEvidenceId : selection.evidenceId,
    selectedSourceId: selection.sourceId === undefined ? context.selectedSourceId : selection.sourceId,
  }
}
