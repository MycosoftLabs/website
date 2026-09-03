import {
  INVESTIGATION_MODES,
  OPERATOR_ROLES,
  THREAT_TIME_WINDOWS,
  type FreshnessState,
  type InvestigationMode,
  type OperatorRole,
  type ThreatAssessmentContext,
  type ThreatTimeWindow,
} from "./contracts"

export const DEFAULT_THREAT_CONTEXT: ThreatAssessmentContext = {
  missionId: "runtime-unscoped",
  missionLabel: "Mission not selected · development environment",
  missionAreaId: "runtime-unscoped",
  missionAreaLabel: "Area not selected · development environment",
  timeWindow: "24h",
  mode: "live",
  role: "viewer",
  operatorId: "local.operator",
  selectedAssessmentId: null,
  selectedObjectId: null,
  selectedEvidenceId: null,
  selectedSourceId: null,
  classification: "UNCLASSIFIED",
}

const MODE_SET = new Set<InvestigationMode>(INVESTIGATION_MODES)
const WINDOW_SET = new Set<ThreatTimeWindow>(THREAT_TIME_WINDOWS)
const ROLE_SET = new Set<OperatorRole>(OPERATOR_ROLES)

const SANITIZED_SCENARIO_CONTEXT = {
  missionId: "scenario:mission-harbor-glass",
  missionLabel: "SANITIZED · Harbor Glass exercise",
  missionAreaId: "scenario:area-harbor-glass",
  missionAreaLabel: "SANITIZED · Estuary / upland interface",
} as const

const DESTINATIONS = {
  situationalAwareness: "/fusarium/situational-awareness",
  dataFusion: "/fusarium/data-fusion",
  oeiNarrative: "/fusarium/oei",
  // The current catalog has no dedicated response-coordination application.
  // This is a read-only context handoff into the existing coordination seam.
  environmentalResponseCoordination: "/fusarium/command-control",
} as const

export type ThreatHandoffDestination = keyof typeof DESTINATIONS

function normalizedMode(params: Pick<URLSearchParams, "get">): InvestigationMode {
  const raw = params.get("dataMode") ?? params.get("mode")
  if (raw === "system") return "live"
  if (raw === "demo") return "simulated"
  return raw && MODE_SET.has(raw as InvestigationMode) ? (raw as InvestigationMode) : "live"
}

export function parseThreatAssessmentContext(
  params: Pick<URLSearchParams, "get">,
): ThreatAssessmentContext {
  const rawMissionId = params.get("missionId")?.trim() || DEFAULT_THREAT_CONTEXT.missionId
  const rawMissionAreaId = params.get("missionAreaId")?.trim() || DEFAULT_THREAT_CONTEXT.missionAreaId
  const timeWindow = params.get("timeWindow") as ThreatTimeWindow | null
  const displayRole = params.get("displayRole") as OperatorRole | null
  const mode = normalizedMode(params)
  const simulated = mode === "simulated"
  const selected = (name: string): string | null => {
    const value = params.get(name)?.trim() || null
    return simulated && value && !value.startsWith("scenario:") ? null : value
  }

  return {
    ...DEFAULT_THREAT_CONTEXT,
    missionId: simulated ? SANITIZED_SCENARIO_CONTEXT.missionId : rawMissionId,
    missionLabel:
      (simulated
        ? SANITIZED_SCENARIO_CONTEXT.missionLabel
        : params.get("missionLabel")?.trim()) ||
      (rawMissionId === DEFAULT_THREAT_CONTEXT.missionId
        ? DEFAULT_THREAT_CONTEXT.missionLabel
        : rawMissionId),
    missionAreaId: simulated ? SANITIZED_SCENARIO_CONTEXT.missionAreaId : rawMissionAreaId,
    missionAreaLabel:
      (simulated
        ? SANITIZED_SCENARIO_CONTEXT.missionAreaLabel
        : params.get("missionAreaLabel")?.trim()) ||
      (rawMissionAreaId === DEFAULT_THREAT_CONTEXT.missionAreaId
        ? DEFAULT_THREAT_CONTEXT.missionAreaLabel
        : rawMissionAreaId),
    timeWindow: timeWindow && WINDOW_SET.has(timeWindow) ? timeWindow : "24h",
    mode,
    // Identity is not navigation context. These local display defaults never
    // derive protected-request authority from a crafted URL.
    role: displayRole && ROLE_SET.has(displayRole) ? displayRole : DEFAULT_THREAT_CONTEXT.role,
    operatorId: DEFAULT_THREAT_CONTEXT.operatorId,
    selectedAssessmentId: selected("assessmentId"),
    selectedObjectId: selected("objectId"),
    selectedEvidenceId: selected("evidenceId"),
    selectedSourceId: selected("sourceId"),
  }
}

function canonicalNavigationContext(context: ThreatAssessmentContext): ThreatAssessmentContext {
  if (context.mode !== "simulated") return context
  return {
    ...context,
    ...SANITIZED_SCENARIO_CONTEXT,
    selectedAssessmentId: context.selectedAssessmentId?.startsWith("scenario:")
      ? context.selectedAssessmentId
      : null,
    selectedObjectId: context.selectedObjectId?.startsWith("scenario:")
      ? context.selectedObjectId
      : null,
    selectedEvidenceId: context.selectedEvidenceId?.startsWith("scenario:")
      ? context.selectedEvidenceId
      : null,
    selectedSourceId: context.selectedSourceId?.startsWith("scenario:")
      ? context.selectedSourceId
      : null,
  }
}

export function threatContextParams(
  context: ThreatAssessmentContext,
  freshness?: FreshnessState | null,
): URLSearchParams {
  const navigation = canonicalNavigationContext(context)
  const params = new URLSearchParams({
    missionId: navigation.missionId,
    missionLabel: navigation.missionLabel,
    missionAreaId: navigation.missionAreaId,
    missionAreaLabel: navigation.missionAreaLabel,
    timeWindow: navigation.timeWindow,
    dataMode: navigation.mode,
    displayRole: navigation.role,
    sourceApplication: "threat-assessment",
    classification: "UNCLASSIFIED",
  })
  if (navigation.selectedAssessmentId) params.set("assessmentId", navigation.selectedAssessmentId)
  if (navigation.selectedObjectId) params.set("objectId", navigation.selectedObjectId)
  if (navigation.selectedEvidenceId) params.set("evidenceId", navigation.selectedEvidenceId)
  if (navigation.selectedSourceId) params.set("sourceId", navigation.selectedSourceId)
  if (freshness) params.set("freshness", freshness)
  return params
}

export function buildThreatAssessmentSelfLink(
  context: ThreatAssessmentContext,
  freshness?: FreshnessState | null,
): string {
  return `/fusarium/threat-assessment?${threatContextParams(context, freshness).toString()}`
}

export function buildThreatAssessmentHandoffLink(
  destination: ThreatHandoffDestination,
  context: ThreatAssessmentContext,
  freshness?: FreshnessState | null,
): string {
  const params = threatContextParams(context, freshness)
  if (destination === "environmentalResponseCoordination") {
    params.set("handoffIntent", "environmental-response-coordination")
    params.set("handoffCapability", "read-only-context")
  }
  return `${DESTINATIONS[destination]}?${params.toString()}`
}

