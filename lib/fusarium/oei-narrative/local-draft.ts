import type {
  OeiClaim,
  OeiNarrativeSnapshot,
  OeiNarrativeVersion,
  OeiWorkflowStage,
} from "./contracts"

export const OEI_LOCAL_DRAFT_VERSION = 2
export const OEI_LOCAL_DRAFT_STORAGE_KEY = `fusarium.oei-narrative.local-draft.v${OEI_LOCAL_DRAFT_VERSION}`

export interface OeiLocalDraft {
  schemaVersion: typeof OEI_LOCAL_DRAFT_VERSION
  contextKey: string
  synthetic: boolean
  savedAt: string
  title: string
  executiveSummary: string
  stage: OeiWorkflowStage
  claims: OeiClaim[]
  versions: OeiNarrativeVersion[]
}

export function oeiDraftContextKey(snapshot: Pick<OeiNarrativeSnapshot, "context">): string {
  const { missionId, contextId, missionAreaId, timeWindow, mode } = snapshot.context
  return `${mode}:${missionId}:${contextId ?? "no-context"}:${missionAreaId}:${timeWindow}`
}

export function createOeiLocalDraft(snapshot: OeiNarrativeSnapshot, now = new Date().toISOString()): OeiLocalDraft {
  const latest = [...snapshot.versions].sort((left, right) => right.ordinal - left.ordinal)[0]
  return {
    schemaVersion: OEI_LOCAL_DRAFT_VERSION,
    contextKey: oeiDraftContextKey(snapshot),
    synthetic: snapshot.context.mode === "simulated",
    savedAt: now,
    title: latest?.title ?? "",
    executiveSummary: latest?.executiveSummary ?? "",
    stage: latest?.stage === "approved_package" ? "draft" : latest?.stage ?? "draft",
    claims: (latest?.claims ?? snapshot.claims).map((claim) => ({
      ...claim,
      objectIds: [...claim.objectIds],
      evidenceIds: [...claim.evidenceIds],
      caveats: [...claim.caveats],
      competingExplanations: [...claim.competingExplanations],
    })),
    versions: snapshot.versions
      .filter((version) => !version.immutable)
      .map((version) => ({ ...version, immutable: false })),
  }
}

function isClaim(value: unknown): value is OeiClaim {
  if (!value || typeof value !== "object") return false
  const claim = value as Partial<OeiClaim>
  const confidence = claim.confidence as Partial<OeiClaim["confidence"]> | undefined
  return (
    typeof claim.id === "string" &&
    typeof claim.text === "string" &&
    Array.isArray(claim.objectIds) &&
    claim.objectIds.every((item) => typeof item === "string") &&
    Array.isArray(claim.evidenceIds) &&
    claim.evidenceIds.every((item) => typeof item === "string") &&
    Boolean(confidence && typeof confidence === "object") &&
    (confidence?.score === null || (typeof confidence?.score === "number" && Number.isFinite(confidence.score))) &&
    ["high", "moderate", "low", "not_assessed"].includes(String(confidence?.label)) &&
    typeof confidence?.basis === "string" &&
    typeof claim.uncertainty === "string" &&
    Array.isArray(claim.caveats) &&
    claim.caveats.every((item) => typeof item === "string") &&
    Array.isArray(claim.competingExplanations) &&
    claim.competingExplanations.every((item) => typeof item === "string") &&
    typeof claim.changedSincePrevious === "boolean" &&
    ["source_summary", "operator_entered", "sanitized_fixture"].includes(String(claim.authoringBasis))
  )
}

function isStage(value: unknown): value is OeiWorkflowStage {
  return ["draft", "evidence_check", "human_review", "approved_package"].includes(String(value))
}

function isVersion(value: unknown): value is OeiNarrativeVersion {
  if (!value || typeof value !== "object") return false
  const version = value as Partial<OeiNarrativeVersion>
  return (
    typeof version.id === "string" &&
    typeof version.ordinal === "number" &&
    Number.isFinite(version.ordinal) &&
    typeof version.label === "string" &&
    typeof version.createdAt === "string" &&
    typeof version.createdBy === "string" &&
    isStage(version.stage) &&
    typeof version.title === "string" &&
    typeof version.executiveSummary === "string" &&
    Array.isArray(version.claims) &&
    version.claims.every(isClaim) &&
    version.immutable === false &&
    typeof version.synthetic === "boolean"
  )
}

export function parseOeiLocalDraft(serialized: string | null, contextKey: string): OeiLocalDraft | null {
  if (!serialized) return null
  try {
    const value = JSON.parse(serialized) as Partial<OeiLocalDraft>
    if (
      value.schemaVersion !== OEI_LOCAL_DRAFT_VERSION ||
      value.contextKey !== contextKey ||
      typeof value.synthetic !== "boolean" ||
      typeof value.savedAt !== "string" ||
      typeof value.title !== "string" ||
      typeof value.executiveSummary !== "string" ||
      !isStage(value.stage) ||
      !Array.isArray(value.claims) ||
      !value.claims.every(isClaim) ||
      !Array.isArray(value.versions) ||
      !value.versions.every(isVersion)
    ) {
      return null
    }
    return value as OeiLocalDraft
  } catch {
    return null
  }
}

export function serializeOeiLocalDraft(draft: OeiLocalDraft): string {
  return JSON.stringify(draft)
}

export function appendLocalVersion(
  draft: OeiLocalDraft,
  options: { now?: string; actor?: string } = {},
): OeiLocalDraft {
  const createdAt = options.now ?? new Date().toISOString()
  const nextOrdinal = Math.max(0, ...draft.versions.map((version) => version.ordinal)) + 1
  const version: OeiNarrativeVersion = {
    id: `local.version.${nextOrdinal}.${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    ordinal: nextOrdinal,
    label: `Browser-local version ${nextOrdinal}`,
    createdAt,
    createdBy: options.actor ?? "local browser draft",
    stage: draft.stage,
    title: draft.title,
    executiveSummary: draft.executiveSummary,
    claims: draft.claims.map((claim) => ({
      ...claim,
      objectIds: [...claim.objectIds],
      evidenceIds: [...claim.evidenceIds],
      caveats: [...claim.caveats],
      competingExplanations: [...claim.competingExplanations],
    })),
    immutable: false,
    synthetic: draft.synthetic,
  }
  return { ...draft, savedAt: createdAt, versions: [...draft.versions, version] }
}

export function updateLocalClaim(
  draft: OeiLocalDraft,
  claimId: string,
  changes: Partial<Pick<OeiClaim, "text" | "objectIds" | "evidenceIds" | "uncertainty" | "caveats" | "competingExplanations">>,
): OeiLocalDraft {
  return {
    ...draft,
    claims: draft.claims.map((claim) =>
      claim.id === claimId
        ? {
            ...claim,
            ...changes,
            authoringBasis: "operator_entered",
            changedSincePrevious: true,
          }
        : claim,
    ),
  }
}
