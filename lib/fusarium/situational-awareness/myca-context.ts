import type { FormSpacePresentation, SituationalContext, SituationalView } from "./contracts"
import {
  buildSituationalHandoffLink,
  buildSituationalSelfLink,
  DEFAULT_SITUATIONAL_CONTEXT,
} from "./deep-links"
import { formSpaceModelById } from "./form-space"

export const MYCA_SITUATIONAL_CONTEXT_SCHEMA = "fusarium-sa-myca-context/v1" as const
export const MYCA_SITUATIONAL_PROPOSAL_SCHEMA = "fusarium-sa-myca-proposal/v1" as const

export const MYCA_ALLOWED_ACTIONS = [
  "navigate_view",
  "select_object",
  "select_evidence",
  "select_model",
  "open_analysis",
  "request_analysis",
] as const

export type MycaAllowedAction = (typeof MYCA_ALLOWED_ACTIONS)[number]

export const MYCA_ANALYSIS_TYPES = [
  "summarize_evidence",
  "compare_models",
  "identify_coverage_gaps",
  "trace_provenance",
] as const

export type MycaAnalysisType = (typeof MYCA_ANALYSIS_TYPES)[number]

export interface MycaSituationalContext {
  schema: typeof MYCA_SITUATIONAL_CONTEXT_SCHEMA
  classification: "UNCLASSIFIED"
  generatedAt: string
  mission: {
    areaId: string
    areaLabel: string
    timeWindow: SituationalContext["timeWindow"]
    dataMode: SituationalContext["dataMode"]
  }
  selection: {
    modelId: string
    objectId: string | null
    evidenceId: string | null
    sourceId: string | null
    view: SituationalView
    formSpacePresentation: FormSpacePresentation
  }
  allowedActions: readonly MycaAllowedAction[]
  prohibitedActions: string[]
  authority: {
    execution: "none"
    reviewRequired: true
    auditPersistence: "response_only"
  }
}

export interface MycaProposal {
  schema: typeof MYCA_SITUATIONAL_PROPOSAL_SCHEMA
  action: MycaAllowedAction
  rationale: string
  externalEffects: false
  targetId?: string
  view?: SituationalView
  formSpacePresentation?: FormSpacePresentation
  analysisType?: MycaAnalysisType
  analysisQuestion?: string
}

export interface MycaProposalDecision {
  accepted: boolean
  state: "accepted_for_human_review" | "rejected"
  reasons: string[]
  proposal: MycaProposal | null
  preview: string | null
  href: string | null
  executionPerformed: false
  persistence: "none"
}

const VIEWS = new Set<SituationalView>(["map", "earth", "list", "timeline"])
const PRESENTATIONS = new Set<FormSpacePresentation>(["model", "compare", "interaction"])
const ACTIONS = new Set<MycaAllowedAction>(MYCA_ALLOWED_ACTIONS)
const ANALYSES = new Set<MycaAnalysisType>(MYCA_ANALYSIS_TYPES)
const ANALYSIS_ROUTES = new Set(["threatAssessment", "dataFusion", "oeiNarrative", "earthSimulator", "nlmTraining"])
const BASE_PROPOSAL_FIELDS = ["schema", "action", "rationale", "externalEffects"] as const
const ACTION_PROPOSAL_FIELDS: Record<MycaAllowedAction, readonly string[]> = {
  navigate_view: ["view", "formSpacePresentation"],
  select_object: ["targetId"],
  select_evidence: ["targetId"],
  select_model: ["targetId", "formSpacePresentation"],
  open_analysis: ["targetId"],
  request_analysis: ["analysisType", "analysisQuestion"],
}
const UNCLASSIFIED = "UNCLASSIFIED" as const
const INVALID_CLASSIFICATION_REASON = "Context classification must be omitted or exactly UNCLASSIFIED."

function text(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : ""
}

function hasAcceptedClassification(candidate: unknown): boolean {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return true
  const record = candidate as Record<string, unknown>
  return !Object.prototype.hasOwnProperty.call(record, "classification") || record.classification === UNCLASSIFIED
}

export function normalizeMycaSituationalContext(candidate: unknown): SituationalContext {
  if (!hasAcceptedClassification(candidate)) {
    throw new Error(INVALID_CLASSIFICATION_REASON)
  }
  const record = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {}
  const view = VIEWS.has(record.view as SituationalView)
    ? record.view as SituationalView
    : DEFAULT_SITUATIONAL_CONTEXT.view
  const presentation = PRESENTATIONS.has(record.formSpacePresentation as FormSpacePresentation)
    ? record.formSpacePresentation as FormSpacePresentation
    : DEFAULT_SITUATIONAL_CONTEXT.formSpacePresentation
  const timeWindow = ["6h", "24h", "72h"].includes(String(record.timeWindow))
    ? record.timeWindow as SituationalContext["timeWindow"]
    : DEFAULT_SITUATIONAL_CONTEXT.timeWindow
  const dataMode = ["system", "demo"].includes(String(record.dataMode))
    ? record.dataMode as SituationalContext["dataMode"]
    : DEFAULT_SITUATIONAL_CONTEXT.dataMode
  const selectedModelCandidate = text(record.selectedModelId, 120)
  const selectedModelId = selectedModelCandidate && formSpaceModelById(selectedModelCandidate)
    ? selectedModelCandidate
    : DEFAULT_SITUATIONAL_CONTEXT.selectedModelId

  return {
    ...DEFAULT_SITUATIONAL_CONTEXT,
    missionAreaId: text(record.missionAreaId, 80) || DEFAULT_SITUATIONAL_CONTEXT.missionAreaId,
    missionAreaLabel: text(record.missionAreaLabel, 120) || DEFAULT_SITUATIONAL_CONTEXT.missionAreaLabel,
    timeWindow,
    dataMode,
    view,
    selectedModelId,
    formSpacePresentation: presentation,
    selectedObjectId: text(record.selectedObjectId, 160) || null,
    selectedEvidenceId: text(record.selectedEvidenceId, 160) || null,
    sourceId: text(record.sourceId, 160) || null,
    classification: UNCLASSIFIED,
  }
}

export function buildMycaSituationalContext(
  candidate: unknown,
  generatedAt = new Date().toISOString(),
): MycaSituationalContext {
  const context = normalizeMycaSituationalContext(candidate)
  return {
    schema: MYCA_SITUATIONAL_CONTEXT_SCHEMA,
    classification: "UNCLASSIFIED",
    generatedAt,
    mission: {
      areaId: context.missionAreaId,
      areaLabel: context.missionAreaLabel,
      timeWindow: context.timeWindow,
      dataMode: context.dataMode,
    },
    selection: {
      modelId: context.selectedModelId,
      objectId: context.selectedObjectId,
      evidenceId: context.selectedEvidenceId,
      sourceId: context.sourceId,
      view: context.view,
      formSpacePresentation: context.formSpacePresentation,
    },
    allowedActions: MYCA_ALLOWED_ACTIONS,
    prohibitedActions: [
      "device command or actuation",
      "mission release or external send",
      "classification change",
      "credential or protected-system access",
      "unrestricted URL or browser control",
      "self-approval or automatic navigation",
    ],
    authority: {
      execution: "none",
      reviewRequired: true,
      auditPersistence: "response_only",
    },
  }
}

function reject(...reasons: string[]): MycaProposalDecision {
  return {
    accepted: false,
    state: "rejected",
    reasons,
    proposal: null,
    preview: null,
    href: null,
    executionPerformed: false,
    persistence: "none",
  }
}

function accepted(
  proposal: MycaProposal,
  preview: string,
  href: string | null,
): MycaProposalDecision {
  return {
    accepted: true,
    state: "accepted_for_human_review",
    reasons: ["The proposal is allowlisted and has no execution authority. A human must review and click any resulting link."],
    proposal,
    preview,
    href,
    executionPerformed: false,
    persistence: "none",
  }
}

export function evaluateMycaProposal(
  contextCandidate: unknown,
  proposalCandidate: unknown,
): MycaProposalDecision {
  if (!hasAcceptedClassification(contextCandidate)) {
    return reject(INVALID_CLASSIFICATION_REASON)
  }
  if (!proposalCandidate || typeof proposalCandidate !== "object" || Array.isArray(proposalCandidate)) {
    return reject("Proposal must be a JSON object.")
  }
  const raw = proposalCandidate as Record<string, unknown>
  if (raw.schema !== MYCA_SITUATIONAL_PROPOSAL_SCHEMA) {
    return reject(`Schema must be ${MYCA_SITUATIONAL_PROPOSAL_SCHEMA}.`)
  }
  if (raw.externalEffects !== false) {
    return reject("externalEffects must be explicitly false.")
  }
  for (const prohibited of ["deviceCommand", "missionRelease", "externalSend", "classificationChange", "externalUrl", "browserScript"]) {
    if (Object.prototype.hasOwnProperty.call(raw, prohibited)) {
      return reject(`${prohibited} is outside the MYCA Situational Awareness seam.`)
    }
  }

  const action = text(raw.action, 40) as MycaAllowedAction
  if (!ACTIONS.has(action)) return reject("Action is not allowlisted.")
  const allowedFields = new Set<string>([...BASE_PROPOSAL_FIELDS, ...ACTION_PROPOSAL_FIELDS[action]])
  const unexpectedFields = Object.keys(raw).filter((field) => !allowedFields.has(field))
  if (unexpectedFields.length) {
    return reject(`Unexpected proposal field(s): ${unexpectedFields.sort().join(", ")}.`)
  }
  const rationale = text(raw.rationale, 500)
  if (!rationale) return reject("A bounded rationale is required.")
  const targetId = text(raw.targetId, 160) || undefined
  const context = normalizeMycaSituationalContext(contextCandidate)
  const base: MycaProposal = {
    schema: MYCA_SITUATIONAL_PROPOSAL_SCHEMA,
    action,
    rationale,
    externalEffects: false,
  }

  if (action === "navigate_view") {
    if (!VIEWS.has(raw.view as SituationalView)) return reject("navigate_view requires an allowlisted view.")
    const view = raw.view as SituationalView
    const presentation = raw.formSpacePresentation === undefined
      ? context.formSpacePresentation
      : raw.formSpacePresentation as FormSpacePresentation
    if (!PRESENTATIONS.has(presentation)) return reject("formSpacePresentation is not allowlisted.")
    const proposal = { ...base, view, formSpacePresentation: presentation }
    return accepted(
      proposal,
      `Review navigation to the ${view} synchronized-picture view with the ${presentation} Form Space presentation.`,
      buildSituationalSelfLink({ ...context, view, formSpacePresentation: presentation }),
    )
  }

  if (action === "select_object" || action === "select_evidence") {
    if (!targetId) return reject(`${action} requires a bounded targetId.`)
    const next = action === "select_object"
      ? { ...context, selectedObjectId: targetId }
      : { ...context, selectedEvidenceId: targetId }
    return accepted(
      { ...base, targetId },
      `Review ${action === "select_object" ? "object" : "evidence"} selection ${targetId}. The target remains display context only.`,
      buildSituationalSelfLink(next),
    )
  }

  if (action === "select_model") {
    if (!targetId || !formSpaceModelById(targetId)) return reject("select_model requires a cataloged model ID.")
    const presentation = raw.formSpacePresentation === undefined
      ? context.formSpacePresentation
      : raw.formSpacePresentation as FormSpacePresentation
    if (!PRESENTATIONS.has(presentation)) return reject("formSpacePresentation is not allowlisted.")
    return accepted(
      { ...base, targetId, formSpacePresentation: presentation },
      `Review model selection ${targetId}. Selection does not invoke inference or training.`,
      buildSituationalSelfLink({ ...context, selectedModelId: targetId, formSpacePresentation: presentation }),
    )
  }

  if (action === "open_analysis") {
    if (!targetId || !ANALYSIS_ROUTES.has(targetId)) return reject("open_analysis requires an allowlisted Fusarium route ID.")
    const href = targetId === "nlmTraining"
      ? `/fusarium/nlm-training?${new URL(buildSituationalSelfLink(context), "http://local").searchParams.toString()}`
      : buildSituationalHandoffLink(targetId as "threatAssessment" | "dataFusion" | "oeiNarrative" | "earthSimulator", context)
    return accepted({ ...base, targetId }, `Review context handoff to ${targetId}.`, href)
  }

  const analysisType = raw.analysisType as MycaAnalysisType
  if (!ANALYSES.has(analysisType)) return reject("request_analysis requires an allowlisted analysisType.")
  const analysisQuestion = text(raw.analysisQuestion, 500)
  const proposal: MycaProposal = {
    ...base,
    analysisType,
    ...(analysisQuestion ? { analysisQuestion } : {}),
  }
  return accepted(
    proposal,
    `Review-only analysis request: ${analysisType.replaceAll("_", " ")}. No model call or external action was executed.`,
    null,
  )
}
