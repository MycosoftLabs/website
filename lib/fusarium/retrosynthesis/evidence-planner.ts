/**
 * Fusarium Retrosynthesis is an evidence-review surface, not a synthesis
 * engine. This contract deliberately accepts only non-operational concept
 * relationships and provenance. Reagents, quantities, conditions, protocols,
 * execution steps, and generated procedures are outside the schema.
 */

export const RETROSYNTHESIS_SCHEMA = "fusarium-retrosynthesis-evidence/v1" as const
export const RETROSYNTHESIS_MAX_BYTES = 128 * 1024
export const RETROSYNTHESIS_MAX_CONCEPTS = 64
export const RETROSYNTHESIS_MAX_RELATIONSHIPS = 96
export const RETROSYNTHESIS_MAX_EVIDENCE = 96

export type RetrosynthesisIssue = {
  path: string
  severity: "advisory" | "blocking"
  message: string
}

export type RetrosynthesisEvidence = {
  evidenceId: string
  sourceLabel: string
  sourceRef: string
  sourceRecordId: string | null
  recordedAt: string | null
  evidenceClass: "literature" | "database-record" | "lab-observation" | "operator-assertion"
  provenanceState: "complete" | "partial"
}

export type RetrosynthesisConcept = {
  conceptId: string
  label: string
  role: "target" | "precursor-candidate" | "intermediate-candidate" | "reference-only"
  evidenceIds: readonly string[]
}

export type RetrosynthesisRelationship = {
  relationshipId: string
  fromConceptId: string
  toConceptId: string
  claimType: "documented-precursor-relationship" | "reported-transformation-class" | "identity-equivalence" | "unknown"
  evidenceIds: readonly string[]
  evidenceState: "documented-input" | "partial-provenance" | "claim-only"
}

export type RetrosynthesisReview = {
  schemaVersion: "fusarium-retrosynthesis-review/v1"
  workspaceId: string
  reviewState: "documented-input" | "partial-input" | "empty-input"
  target: { targetId: string; label: string; identifiers: Readonly<Record<string, string>> }
  concepts: readonly RetrosynthesisConcept[]
  relationships: readonly RetrosynthesisRelationship[]
  evidence: readonly RetrosynthesisEvidence[]
  metrics: {
    conceptCount: number
    relationshipCount: number
    evidenceCount: number
    documentedRelationshipCount: number
    relationshipEvidenceCoveragePercent: number
    unusedEvidenceCount: number
  }
  gaps: readonly string[]
  findings: readonly RetrosynthesisIssue[]
  boundaries: {
    localOnly: true
    readOnly: true
    noExternalAccess: true
    noPersistence: true
    noExecution: true
    noProceduralOutput: true
    chemicalFeasibilityNotEvaluated: true
  }
}

export type RetrosynthesisReviewResult =
  | { ok: true; value: RetrosynthesisReview }
  | { ok: false; issues: readonly RetrosynthesisIssue[] }

type Row = Record<string, unknown>

const isObject = (value: unknown): value is Row => Boolean(value) && typeof value === "object" && !Array.isArray(value)
const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0
const cleanText = (value: unknown, max = 240) => {
  if (typeof value !== "string") return null
  const clean = value.trim()
  return clean && clean.length <= max && !/[\u0000-\u001f\u007f]/.test(clean) ? clean : null
}
const cleanId = (value: unknown) => {
  const clean = cleanText(value, 120)
  return clean && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(clean) ? clean : null
}
const cleanTime = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  const clean = cleanText(value, 64)
  if (!clean || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(clean)) return undefined
  const parsed = Date.parse(clean)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined
}

const OPERATIONAL_KEY = /^(?:procedure|protocol|step|steps|instruction|instructions|reagent|reagents|solvent|solvents|catalyst|catalysts|amount|amounts|quantity|quantities|concentration|concentrations|temperature|temperatures|pressure|pressures|duration|durations|condition|conditions|equipment|apparatus|yield|purification|workup|dose|dosing)$/i
const PROCEDURAL_TEXT = /\b(?:add|combine|mix|stir|heat|cool|reflux|dissolve|filter|distill|extract|wash|dry|quench|incubate|ferment|purify|synthesize|prepare)\b|\b\d+(?:\.\d+)?\s*(?:ml|µl|ul|mg|kg|mmol|mol|°c|celsius|bar|psi|minutes?|hours?)\b/i

function push(issues: RetrosynthesisIssue[], path: string, severity: RetrosynthesisIssue["severity"], message: string) {
  issues.push({ path, severity, message })
}

function inspectForbiddenFields(value: unknown, issues: RetrosynthesisIssue[], path = "$", depth = 0, seen = new WeakSet<object>()) {
  if (depth > 8) { push(issues, path, "blocking", "Input nesting exceeds the local review boundary."); return }
  if (!value || typeof value !== "object") return
  if (seen.has(value as object)) { push(issues, path, "blocking", "Cyclic input objects are not accepted."); return }
  seen.add(value as object)
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectForbiddenFields(entry, issues, `${path}[${index}]`, depth + 1, seen))
    return
  }
  for (const [key, entry] of Object.entries(value as Row)) {
    if (OPERATIONAL_KEY.test(key)) push(issues, `${path}.${key}`, "blocking", "Operational synthesis fields are prohibited; supply evidence relationships only.")
    inspectForbiddenFields(entry, issues, `${path}.${key}`, depth + 1, seen)
  }
}

function rejectUnknownKeys(row: Row, allowed: readonly string[], path: string, issues: RetrosynthesisIssue[]) {
  const allow = new Set(allowed)
  for (const key of Object.keys(row)) if (!allow.has(key)) push(issues, `${path}.${key}`, "blocking", "Field is outside the bounded evidence schema.")
}

function requiredText(value: unknown, path: string, issues: RetrosynthesisIssue[], max = 240) {
  const clean = cleanText(value, max)
  if (!clean) push(issues, path, "blocking", `A non-empty value of at most ${max} characters is required.`)
  return clean
}

function requiredId(value: unknown, path: string, issues: RetrosynthesisIssue[]) {
  const clean = cleanId(value)
  if (!clean) push(issues, path, "blocking", "A stable identifier using letters, numbers, dot, slash, colon, underscore, or dash is required.")
  return clean
}

function safeDisplayText(value: unknown, path: string, issues: RetrosynthesisIssue[], max = 240) {
  const clean = requiredText(value, path, issues, max)
  if (clean && PROCEDURAL_TEXT.test(clean)) {
    push(issues, path, "blocking", "Instruction-like or condition-bearing text is withheld from this non-procedural review surface.")
    return null
  }
  return clean
}

function sourceReference(value: unknown, path: string, issues: RetrosynthesisIssue[]) {
  const clean = requiredText(value, path, issues, 500)
  if (!clean) return null
  if (PROCEDURAL_TEXT.test(clean) || /\s/.test(clean) || !/^(?:https?:\/\/|urn:|file:|local:|nas:)/i.test(clean)) {
    push(issues, path, "blocking", "Source reference must be a bounded non-procedural URI-style reference; it is displayed as text and never opened.")
    return null
  }
  return clean
}

function boundedArray(value: unknown, path: string, maximum: number, issues: RetrosynthesisIssue[]) {
  if (!Array.isArray(value)) { push(issues, path, "blocking", "An array is required."); return [] as unknown[] }
  if (value.length > maximum) push(issues, path, "blocking", `At most ${maximum} records are accepted; no truncated review is produced.`)
  return value.slice(0, maximum)
}

function uniqueIds(ids: readonly string[], path: string, issues: RetrosynthesisIssue[]) {
  if (new Set(ids).size !== ids.length) push(issues, path, "blocking", "Referenced evidence identifiers must be unique within the record.")
}

function cyclePresent(concepts: readonly RetrosynthesisConcept[], relationships: readonly RetrosynthesisRelationship[]) {
  const outgoing = new Map(concepts.map((concept) => [concept.conceptId, [] as string[]]))
  for (const relationship of relationships) outgoing.get(relationship.fromConceptId)?.push(relationship.toConceptId)
  const visiting = new Set<string>(), visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const next of outgoing.get(id) ?? []) if (visit(next)) return true
    visiting.delete(id); visited.add(id); return false
  }
  return concepts.some((concept) => visit(concept.conceptId))
}

export function reviewRetrosynthesisEvidence(input: unknown): RetrosynthesisReviewResult {
  const issues: RetrosynthesisIssue[] = []
  inspectForbiddenFields(input, issues)
  if (!isObject(input)) return { ok: false, issues: [{ path: "$", severity: "blocking", message: "A JSON object is required." }] }
  rejectUnknownKeys(input, ["schemaVersion", "classification", "workspaceId", "target", "concepts", "relationships", "evidence"], "$", issues)
  if (input.schemaVersion !== RETROSYNTHESIS_SCHEMA) push(issues, "$.schemaVersion", "blocking", `Expected ${RETROSYNTHESIS_SCHEMA}.`)
  if (input.classification !== "UNCLASSIFIED") push(issues, "$.classification", "blocking", "Only UNCLASSIFIED input is accepted by this commercial local surface.")
  const workspaceId = requiredId(input.workspaceId, "$.workspaceId", issues)

  const targetRow = isObject(input.target) ? input.target : null
  if (!targetRow) push(issues, "$.target", "blocking", "A target evidence record is required.")
  if (targetRow) rejectUnknownKeys(targetRow, ["targetId", "label", "identifiers"], "$.target", issues)
  const targetId = requiredId(targetRow?.targetId, "$.target.targetId", issues)
  const targetLabel = safeDisplayText(targetRow?.label, "$.target.label", issues, 160)
  const identifiersRow = targetRow?.identifiers === undefined ? {} : isObject(targetRow.identifiers) ? targetRow.identifiers : null
  if (!identifiersRow) push(issues, "$.target.identifiers", "blocking", "Identifiers must be a flat string map when supplied.")
  const identifiers: Record<string, string> = {}
  if (identifiersRow) {
    if (Object.keys(identifiersRow).length > 12) push(issues, "$.target.identifiers", "blocking", "At most 12 target identifiers are accepted.")
    for (const [key, value] of Object.entries(identifiersRow).slice(0, 12)) {
      const identifierValue = cleanText(value, 300)
      if (!/^[A-Za-z][A-Za-z0-9._-]{0,39}$/.test(key) || !identifierValue || PROCEDURAL_TEXT.test(identifierValue)) push(issues, `$.target.identifiers.${key}`, "blocking", "Identifier keys and values must be bounded non-procedural strings.")
      else identifiers[key] = identifierValue
    }
  }

  const evidenceIds = new Set<string>()
  const evidence = boundedArray(input.evidence, "$.evidence", RETROSYNTHESIS_MAX_EVIDENCE, issues).flatMap((raw, index): RetrosynthesisEvidence[] => {
    const path = `$.evidence[${index}]`
    if (!isObject(raw)) { push(issues, path, "blocking", "Evidence must be an object."); return [] }
    rejectUnknownKeys(raw, ["evidenceId", "sourceLabel", "sourceRef", "sourceRecordId", "recordedAt", "evidenceClass"], path, issues)
    const evidenceId = requiredId(raw.evidenceId, `${path}.evidenceId`, issues)
    const sourceLabel = safeDisplayText(raw.sourceLabel, `${path}.sourceLabel`, issues, 160)
    const sourceRef = sourceReference(raw.sourceRef, `${path}.sourceRef`, issues)
    const sourceRecordId = raw.sourceRecordId === null || raw.sourceRecordId === undefined || raw.sourceRecordId === "" ? null : cleanId(raw.sourceRecordId)
    if (raw.sourceRecordId !== null && raw.sourceRecordId !== undefined && raw.sourceRecordId !== "" && !sourceRecordId) push(issues, `${path}.sourceRecordId`, "blocking", "Source record ID is invalid.")
    const recordedAt = cleanTime(raw.recordedAt)
    if (recordedAt === undefined) push(issues, `${path}.recordedAt`, "blocking", "Timestamp must include Z or an explicit UTC offset.")
    const evidenceClass = raw.evidenceClass
    if (!["literature", "database-record", "lab-observation", "operator-assertion"].includes(String(evidenceClass))) push(issues, `${path}.evidenceClass`, "blocking", "Evidence class is not recognized.")
    if (evidenceId && evidenceIds.has(evidenceId)) push(issues, `${path}.evidenceId`, "blocking", "Evidence identifiers must be unique.")
    if (evidenceId) evidenceIds.add(evidenceId)
    if (!evidenceId || !sourceLabel || !sourceRef || recordedAt === undefined || !["literature", "database-record", "lab-observation", "operator-assertion"].includes(String(evidenceClass))) return []
    return [{ evidenceId, sourceLabel, sourceRef, sourceRecordId, recordedAt, evidenceClass: evidenceClass as RetrosynthesisEvidence["evidenceClass"], provenanceState: sourceRecordId && recordedAt ? "complete" : "partial" }]
  }).sort((a, b) => compareText(a.evidenceId, b.evidenceId))

  const conceptIds = new Set<string>()
  const concepts = boundedArray(input.concepts, "$.concepts", RETROSYNTHESIS_MAX_CONCEPTS, issues).flatMap((raw, index): RetrosynthesisConcept[] => {
    const path = `$.concepts[${index}]`
    if (!isObject(raw)) { push(issues, path, "blocking", "Concept must be an object."); return [] }
    rejectUnknownKeys(raw, ["conceptId", "label", "role", "evidenceIds"], path, issues)
    const conceptId = requiredId(raw.conceptId, `${path}.conceptId`, issues)
    const label = safeDisplayText(raw.label, `${path}.label`, issues, 160)
    const role = raw.role
    if (!["target", "precursor-candidate", "intermediate-candidate", "reference-only"].includes(String(role))) push(issues, `${path}.role`, "blocking", "Concept role is not recognized.")
    const refs = Array.isArray(raw.evidenceIds) ? raw.evidenceIds.map(cleanId) : null
    if (!refs || refs.some((item) => !item)) push(issues, `${path}.evidenceIds`, "blocking", "Evidence references must be an array of stable identifiers.")
    const cleanRefs = (refs ?? []).filter((item): item is string => Boolean(item))
    uniqueIds(cleanRefs, `${path}.evidenceIds`, issues)
    if (conceptId && conceptIds.has(conceptId)) push(issues, `${path}.conceptId`, "blocking", "Concept identifiers must be unique.")
    if (conceptId) conceptIds.add(conceptId)
    if (!conceptId || !label || !["target", "precursor-candidate", "intermediate-candidate", "reference-only"].includes(String(role))) return []
    return [{ conceptId, label, role: role as RetrosynthesisConcept["role"], evidenceIds: cleanRefs }]
  }).sort((a, b) => compareText(a.conceptId, b.conceptId))

  const relationshipIds = new Set<string>()
  const relationships = boundedArray(input.relationships, "$.relationships", RETROSYNTHESIS_MAX_RELATIONSHIPS, issues).flatMap((raw, index): RetrosynthesisRelationship[] => {
    const path = `$.relationships[${index}]`
    if (!isObject(raw)) { push(issues, path, "blocking", "Relationship must be an object."); return [] }
    rejectUnknownKeys(raw, ["relationshipId", "fromConceptId", "toConceptId", "claimType", "evidenceIds"], path, issues)
    const relationshipId = requiredId(raw.relationshipId, `${path}.relationshipId`, issues)
    const fromConceptId = requiredId(raw.fromConceptId, `${path}.fromConceptId`, issues)
    const toConceptId = requiredId(raw.toConceptId, `${path}.toConceptId`, issues)
    const claimType = raw.claimType
    if (!["documented-precursor-relationship", "reported-transformation-class", "identity-equivalence", "unknown"].includes(String(claimType))) push(issues, `${path}.claimType`, "blocking", "Claim type is not recognized.")
    const refs = Array.isArray(raw.evidenceIds) ? raw.evidenceIds.map(cleanId) : null
    if (!refs || refs.some((item) => !item)) push(issues, `${path}.evidenceIds`, "blocking", "Evidence references must be an array of stable identifiers.")
    const cleanRefs = (refs ?? []).filter((item): item is string => Boolean(item))
    uniqueIds(cleanRefs, `${path}.evidenceIds`, issues)
    if (relationshipId && relationshipIds.has(relationshipId)) push(issues, `${path}.relationshipId`, "blocking", "Relationship identifiers must be unique.")
    if (relationshipId) relationshipIds.add(relationshipId)
    if (!relationshipId || !fromConceptId || !toConceptId || !["documented-precursor-relationship", "reported-transformation-class", "identity-equivalence", "unknown"].includes(String(claimType))) return []
    return [{ relationshipId, fromConceptId, toConceptId, claimType: claimType as RetrosynthesisRelationship["claimType"], evidenceIds: cleanRefs, evidenceState: "claim-only" }]
  }).sort((a, b) => compareText(a.relationshipId, b.relationshipId))

  for (const concept of concepts) for (const ref of concept.evidenceIds) if (!evidenceIds.has(ref)) push(issues, `$.concepts.${concept.conceptId}.evidenceIds`, "blocking", `Unknown evidence reference: ${ref}.`)
  for (const relationship of relationships) {
    if (!conceptIds.has(relationship.fromConceptId)) push(issues, `$.relationships.${relationship.relationshipId}.fromConceptId`, "blocking", "Source concept does not exist.")
    if (!conceptIds.has(relationship.toConceptId)) push(issues, `$.relationships.${relationship.relationshipId}.toConceptId`, "blocking", "Destination concept does not exist.")
    if (relationship.fromConceptId === relationship.toConceptId) push(issues, `$.relationships.${relationship.relationshipId}`, "blocking", "Self-referential relationships are not accepted.")
    for (const ref of relationship.evidenceIds) if (!evidenceIds.has(ref)) push(issues, `$.relationships.${relationship.relationshipId}.evidenceIds`, "blocking", `Unknown evidence reference: ${ref}.`)
  }
  if (targetId) {
    const targetConcept = concepts.find((concept) => concept.conceptId === targetId)
    if (!targetConcept) push(issues, "$.target.targetId", "blocking", "Target ID must identify one concept.")
    else if (targetConcept.role !== "target") push(issues, "$.target.targetId", "blocking", "Target concept must use the target role.")
    if (concepts.filter((concept) => concept.role === "target").length !== 1) push(issues, "$.concepts", "blocking", "Exactly one target concept is required.")
  }
  if (cyclePresent(concepts, relationships)) push(issues, "$.relationships", "advisory", "The supplied concept map contains a cycle; no route order is inferred.")

  if (issues.some((issue) => issue.severity === "blocking")) return { ok: false, issues }
  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]))
  const reviewedRelationships = relationships.map((relationship) => {
    const linked = relationship.evidenceIds.map((id) => evidenceById.get(id)).filter((item): item is RetrosynthesisEvidence => Boolean(item))
    const evidenceState = linked.length === 0 ? "claim-only" as const : linked.every((item) => item.provenanceState === "complete") ? "documented-input" as const : "partial-provenance" as const
    return { ...relationship, evidenceState }
  })
  const usedEvidence = new Set([...concepts.flatMap((concept) => concept.evidenceIds), ...reviewedRelationships.flatMap((relationship) => relationship.evidenceIds)])
  const documentedRelationshipCount = reviewedRelationships.filter((relationship) => relationship.evidenceState === "documented-input").length
  const gaps: string[] = []
  if (!concepts.length) gaps.push("No concepts were supplied.")
  if (!reviewedRelationships.length) gaps.push("No concept relationships were supplied.")
  if (reviewedRelationships.some((relationship) => relationship.evidenceState === "claim-only")) gaps.push("One or more relationship claims have no linked evidence record.")
  if (reviewedRelationships.some((relationship) => relationship.evidenceState === "partial-provenance")) gaps.push("One or more relationship claims rely on incomplete provenance.")
  if (evidence.some((item) => item.provenanceState === "partial")) gaps.push("One or more evidence records lack a source record ID or timestamp.")
  const unusedEvidenceCount = evidence.filter((item) => !usedEvidence.has(item.evidenceId)).length
  if (unusedEvidenceCount) gaps.push(`${unusedEvidenceCount} supplied evidence record${unusedEvidenceCount === 1 ? " is" : "s are"} not linked to a concept or relationship.`)
  const reviewState = concepts.length === 0 && reviewedRelationships.length === 0 && evidence.length === 0 ? "empty-input" as const : gaps.length || issues.length ? "partial-input" as const : "documented-input" as const

  return {
    ok: true,
    value: {
      schemaVersion: "fusarium-retrosynthesis-review/v1",
      workspaceId: workspaceId!,
      reviewState,
      target: { targetId: targetId!, label: targetLabel!, identifiers },
      concepts,
      relationships: reviewedRelationships,
      evidence,
      metrics: {
        conceptCount: concepts.length,
        relationshipCount: reviewedRelationships.length,
        evidenceCount: evidence.length,
        documentedRelationshipCount,
        relationshipEvidenceCoveragePercent: reviewedRelationships.length ? Math.round((documentedRelationshipCount / reviewedRelationships.length) * 100) : 0,
        unusedEvidenceCount,
      },
      gaps,
      findings: issues,
      boundaries: { localOnly: true, readOnly: true, noExternalAccess: true, noPersistence: true, noExecution: true, noProceduralOutput: true, chemicalFeasibilityNotEvaluated: true },
    },
  }
}

export const RETROSYNTHESIS_BLANK_TEMPLATE = JSON.stringify({
  schemaVersion: RETROSYNTHESIS_SCHEMA,
  classification: "UNCLASSIFIED",
  workspaceId: "local-review",
  target: { targetId: "target", label: "Operator-defined target", identifiers: {} },
  concepts: [{ conceptId: "target", label: "Operator-defined target", role: "target", evidenceIds: [] }],
  relationships: [],
  evidence: [],
}, null, 2)
