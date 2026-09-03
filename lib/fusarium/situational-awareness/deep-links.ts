import type {
  SituationalContext,
  SituationalDataMode,
  FormSpacePresentation,
  SituationalTimeWindow,
  SituationalView,
} from "./contracts"

export const DEFAULT_SITUATIONAL_CONTEXT: SituationalContext = {
  missionAreaId: "runtime-unscoped",
  missionAreaLabel: "Area not configured · development environment",
  timeWindow: "24h",
  dataMode: "system",
  view: "map",
  selectedModelId: "nlm-compatibility-status",
  formSpacePresentation: "model",
  selectedObjectId: null,
  selectedEvidenceId: null,
  sourceId: null,
  classification: "UNCLASSIFIED",
}

const TIME_WINDOWS = new Set<SituationalTimeWindow>(["6h", "24h", "72h"])
const DATA_MODES = new Set<SituationalDataMode>(["system", "demo"])
const VIEWS = new Set<SituationalView>(["map", "earth", "list", "timeline"])
const FORM_SPACE_PRESENTATIONS = new Set<FormSpacePresentation>(["model", "compare", "interaction"])
const UNCLASSIFIED = "UNCLASSIFIED" as const

function assertSingleUnclassifiedQuery(
  searchParams: Pick<URLSearchParams, "getAll">,
): void {
  const values = searchParams.getAll("classification")
  if (values.length === 0) return
  if (values.length !== 1 || values[0] !== UNCLASSIFIED) {
    throw new Error("classification must be omitted or supplied exactly once as UNCLASSIFIED.")
  }
}

function assertUnclassifiedContext(context: SituationalContext): void {
  if ((context as { classification?: unknown }).classification !== UNCLASSIFIED) {
    throw new Error("Context classification must be exactly UNCLASSIFIED.")
  }
}

function boundedContextValue(value: string | null, maxLength: number): string | null {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

const APP_ROUTES = {
  situationalAwareness: "/fusarium/situational-awareness",
  threatAssessment: "/fusarium/threat-assessment",
  dataFusion: "/fusarium/data-fusion",
  commandControl: "/fusarium/command-control",
  oeiNarrative: "/fusarium/oei",
  stackInventory: "/fusarium/stack",
  earthSimulator: "/fusarium/earth-simulator",
} as const

export type SituationalAppRoute = keyof typeof APP_ROUTES

export function parseSituationalContext(
  searchParams: Pick<URLSearchParams, "get" | "getAll">,
): SituationalContext {
  assertSingleUnclassifiedQuery(searchParams)
  const missionAreaId = boundedContextValue(searchParams.get("missionAreaId"), 80)
  const timeWindow = searchParams.get("timeWindow") as SituationalTimeWindow | null
  const dataMode = searchParams.get("dataMode") as SituationalDataMode | null
  const view = searchParams.get("view") as SituationalView | null
  const formSpacePresentation = searchParams.get("formSpacePresentation") as FormSpacePresentation | null

  return {
    ...DEFAULT_SITUATIONAL_CONTEXT,
    missionAreaId: missionAreaId || DEFAULT_SITUATIONAL_CONTEXT.missionAreaId,
    missionAreaLabel:
      boundedContextValue(searchParams.get("missionAreaLabel"), 120) ||
      (missionAreaId && missionAreaId !== DEFAULT_SITUATIONAL_CONTEXT.missionAreaId
        ? missionAreaId
        : DEFAULT_SITUATIONAL_CONTEXT.missionAreaLabel),
    timeWindow: timeWindow && TIME_WINDOWS.has(timeWindow) ? timeWindow : "24h",
    dataMode: dataMode && DATA_MODES.has(dataMode) ? dataMode : "system",
    view: view && VIEWS.has(view) ? view : "map",
    selectedModelId:
      boundedContextValue(searchParams.get("modelId"), 120) ||
      DEFAULT_SITUATIONAL_CONTEXT.selectedModelId,
    formSpacePresentation:
      formSpacePresentation && FORM_SPACE_PRESENTATIONS.has(formSpacePresentation)
        ? formSpacePresentation
        : DEFAULT_SITUATIONAL_CONTEXT.formSpacePresentation,
    selectedObjectId: boundedContextValue(searchParams.get("objectId"), 160),
    selectedEvidenceId: boundedContextValue(searchParams.get("evidenceId"), 160),
    sourceId: boundedContextValue(searchParams.get("sourceId"), 160),
  }
}

function contextParams(context: SituationalContext): URLSearchParams {
  assertUnclassifiedContext(context)
  const params = new URLSearchParams({
    missionAreaId: context.missionAreaId,
    missionAreaLabel: context.missionAreaLabel,
    timeWindow: context.timeWindow,
    dataMode: context.dataMode,
  })
  if (context.view !== "map") params.set("view", context.view)
  if (context.selectedModelId !== DEFAULT_SITUATIONAL_CONTEXT.selectedModelId) {
    params.set("modelId", context.selectedModelId)
  }
  if (context.formSpacePresentation !== DEFAULT_SITUATIONAL_CONTEXT.formSpacePresentation) {
    params.set("formSpacePresentation", context.formSpacePresentation)
  }
  if (context.selectedObjectId) {
    params.set("objectType", "environmental-object")
    params.set("objectId", context.selectedObjectId)
  }
  if (context.selectedEvidenceId) params.set("evidenceId", context.selectedEvidenceId)
  if (context.sourceId) params.set("sourceId", context.sourceId)
  params.set("classification", UNCLASSIFIED)
  return params
}

export function buildSituationalSelfLink(context: SituationalContext): string {
  return `${APP_ROUTES.situationalAwareness}?${contextParams(context).toString()}`
}

export function buildSituationalHandoffLink(
  route: Exclude<SituationalAppRoute, "situationalAwareness">,
  context: SituationalContext,
): string {
  return `${APP_ROUTES[route]}?${contextParams(context).toString()}`
}
