import type {
  OverviewContext,
  OverviewTimeWindow,
  OverviewViewMode,
} from "@/lib/fusarium/overview/contracts"

export const DEFAULT_OVERVIEW_CONTEXT: OverviewContext = {
  missionAreaId: "demo-area-alpha-7",
  missionAreaLabel: "Training Area ALPHA-7",
  timeWindow: "24h",
  dataMode: "system",
  operatorRole: "Environmental Duty Officer",
}

const TIME_WINDOWS = new Set<OverviewTimeWindow>(["6h", "24h", "72h"])
const DATA_MODES = new Set<OverviewViewMode>(["system", "demo"])

const APP_ROUTES = {
  overview: "/fusarium",
  situationalAwareness: "/fusarium/situational-awareness",
  threatAssessment: "/fusarium/threat-assessment",
  dataFusion: "/fusarium/data-fusion",
  commandControl: "/fusarium/command-control",
  oeiNarrative: "/fusarium/oei",
  stackInventory: "/fusarium/stack",
  earthSimulator: "/fusarium/earth-simulator",
} as const

export type OverviewAppRoute = keyof typeof APP_ROUTES

export interface DrilldownTarget {
  objectType?: string
  objectId?: string
}

export function parseOverviewContext(searchParams: Pick<URLSearchParams, "get">): OverviewContext {
  const missionAreaId = searchParams.get("missionAreaId")
  const timeWindow = searchParams.get("timeWindow") as OverviewTimeWindow | null
  const dataMode = searchParams.get("dataMode") as OverviewViewMode | null

  return {
    ...DEFAULT_OVERVIEW_CONTEXT,
    missionAreaId: missionAreaId?.trim() || DEFAULT_OVERVIEW_CONTEXT.missionAreaId,
    missionAreaLabel:
      missionAreaId && missionAreaId !== DEFAULT_OVERVIEW_CONTEXT.missionAreaId
        ? missionAreaId
        : DEFAULT_OVERVIEW_CONTEXT.missionAreaLabel,
    timeWindow: timeWindow && TIME_WINDOWS.has(timeWindow) ? timeWindow : "24h",
    dataMode: dataMode && DATA_MODES.has(dataMode) ? dataMode : "system",
  }
}

export function buildOverviewLink(
  route: OverviewAppRoute,
  context: OverviewContext,
  target: DrilldownTarget = {},
): string {
  const params = new URLSearchParams({
    missionAreaId: context.missionAreaId,
    timeWindow: context.timeWindow,
    dataMode: context.dataMode,
  })

  if (target.objectType) params.set("objectType", target.objectType)
  if (target.objectId) params.set("objectId", target.objectId)

  return `${APP_ROUTES[route]}?${params.toString()}`
}
