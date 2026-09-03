export const DEFENSIVE_ANALYSIS_MAX_BYTES = 512 * 1024
export const DEFENSIVE_ANALYSIS_MAX_RECORDS = 1_000

export type AnalysisIssue = { path: string; message: string }
export type AnalysisResult<T> = { ok: true; value: T } | { ok: false; issues: readonly AnalysisIssue[] }
export type EvidenceProvenance = { sourceRef: string; evidenceId: string; observedAt: string; receivedAt: string | null }

export const ENVIRONMENTAL_OBJECT_CLASSES = ["wildlife", "fungus", "spore", "vegetation", "vessel", "aircraft", "vehicle", "debris", "weather-plume", "water-object"] as const
export type EnvironmentalObjectClass = (typeof ENVIRONMENTAL_OBJECT_CLASSES)[number]

function object(value: unknown): Record<string, unknown> | null { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null }
function text(value: unknown, max = 240): string | null { if (typeof value !== "string") return null; const clean = value.trim(); return clean && clean.length <= max && !/[\u0000-\u001f\u007f]/.test(clean) ? clean : null }
function id(value: unknown): string | null { const clean = text(value, 160); return clean && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(clean) ? clean : null }
function iso(value: unknown): string | null { const clean = text(value, 64); return clean && Number.isFinite(Date.parse(clean)) ? new Date(clean).toISOString() : null }
function finite(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null }
function confidence(value: unknown): number | null { const number = finite(value); return number !== null && number >= 0 && number <= 1 ? number : null }
function provenance(value: unknown): EvidenceProvenance | null {
  const row = object(value); const sourceRef = text(row?.sourceRef, 400); const evidenceId = id(row?.evidenceId); const observedAt = iso(row?.observedAt); const receivedAt = row?.receivedAt === null ? null : iso(row?.receivedAt)
  return sourceRef && evidenceId && observedAt && (row?.receivedAt === null || receivedAt) ? { sourceRef, evidenceId, observedAt, receivedAt } : null
}
function forbiddenPersonFields(value: unknown, path = "$"): AnalysisIssue[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => forbiddenPersonFields(item, `${path}[${index}]`))
  const row = object(value); if (!row) return []
  return Object.entries(row).flatMap(([key, item]) => /person|human|face|pedestrian|biometric|license.?plate|name|email|phone/i.test(key)
    ? [{ path: `${path}.${key}`, message: "person-identifying fields are outside this environmental tool" }]
    : forbiddenPersonFields(item, `${path}.${key}`))
}
function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180; const dLat = (b.latitude - a.latitude) * rad; const dLon = (b.longitude - a.longitude) * rad; const lat1 = a.latitude * rad; const lat2 = b.latitude * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export interface TrackPoint { recordId: string; objectId: string; objectClass: EnvironmentalObjectClass; latitude: number; longitude: number; observedAt: string; confidence: number; uncertaintyM: number; provenance: EvidenceProvenance }
export interface EnvironmentalTrack { trackId: string; objectClass: EnvironmentalObjectClass; points: readonly TrackPoint[]; distanceM: number; state: "single-observation" | "continuous" | "lost-and-reacquired"; maximumGapMs: number; evidenceCount: number; inference: { kind: "ordered-association"; basis: string } | null }

export function analyzeEnvironmentalTracks(input: unknown): AnalysisResult<{ schema: "fusarium-environmental-tracks/v1"; tracks: readonly EnvironmentalTrack[]; rejectedHumanScope: true }> {
  const root = object(input); const issues = forbiddenPersonFields(input)
  if (root?.schema !== "fusarium-environmental-track-replay/v1") issues.push({ path: "$.schema", message: "expected fusarium-environmental-track-replay/v1" })
  const records = Array.isArray(root?.records) ? root.records : null
  if (!records) issues.push({ path: "$.records", message: "records must be an array" })
  if (records && records.length > DEFENSIVE_ANALYSIS_MAX_RECORDS) issues.push({ path: "$.records", message: "record limit exceeded" })
  const points: TrackPoint[] = []
  for (const [index, value] of (records ?? []).entries()) {
    const row = object(value); const recordId = id(row?.recordId); const objectId = id(row?.objectId); const objectClass = text(row?.objectClass) as EnvironmentalObjectClass | null; const latitude = finite(row?.latitude); const longitude = finite(row?.longitude); const observedAt = iso(row?.observedAt); const score = confidence(row?.confidence); const uncertaintyM = finite(row?.uncertaintyM); const source = provenance(row?.provenance)
    if (!recordId || !objectId || !objectClass || !ENVIRONMENTAL_OBJECT_CLASSES.includes(objectClass) || latitude === null || latitude < -90 || latitude > 90 || longitude === null || longitude < -180 || longitude > 180 || !observedAt || score === null || uncertaintyM === null || uncertaintyM < 0 || !source) { issues.push({ path: `$.records[${index}]`, message: "invalid environmental observation" }); continue }
    points.push({ recordId, objectId, objectClass, latitude, longitude, observedAt, confidence: score, uncertaintyM, provenance: source })
  }
  if (issues.length) return { ok: false, issues }
  const groups = new Map<string, TrackPoint[]>()
  for (const point of points) groups.set(point.objectId, [...(groups.get(point.objectId) ?? []), point])
  const tracks = [...groups.entries()].map(([trackId, values]) => {
    const sorted = [...values].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.recordId.localeCompare(b.recordId))
    let traveled = 0; let maximumGapMs = 0
    for (let index = 1; index < sorted.length; index += 1) { traveled += distanceM(sorted[index - 1]!, sorted[index]!); maximumGapMs = Math.max(maximumGapMs, Date.parse(sorted[index]!.observedAt) - Date.parse(sorted[index - 1]!.observedAt)) }
    return { trackId, objectClass: sorted[0]!.objectClass, points: sorted, distanceM: traveled, state: sorted.length === 1 ? "single-observation" as const : maximumGapMs > 5 * 60_000 ? "lost-and-reacquired" as const : "continuous" as const, maximumGapMs, evidenceCount: sorted.length, inference: sorted.length > 1 ? { kind: "ordered-association" as const, basis: "Points share the exact imported objectId; ordering is an inference, not independently verified identity." } : null }
  }).sort((a, b) => a.trackId.localeCompare(b.trackId))
  return { ok: true, value: { schema: "fusarium-environmental-tracks/v1", tracks, rejectedHumanScope: true } }
}

export const FUSION_MODALITIES = ["camera", "radar", "lidar", "ais", "ads-b", "environmental"] as const
type FusionObservation = TrackPoint & { modality: (typeof FUSION_MODALITIES)[number]; scope: { missionId: string | null; locationId: string | null; environmentId: string | null }; trackHint: string | null }
export interface FusedTrack { fusionId: string; objectClass: EnvironmentalObjectClass; scope: FusionObservation["scope"]; observations: readonly FusionObservation[]; modalities: readonly string[]; centroid: { latitude: number; longitude: number }; uncertaintyM: number; state: "evidence-only" | "correlated-inference"; basis: string }

function sameScope(a: FusionObservation["scope"], b: FusionObservation["scope"]) { return a.missionId === b.missionId && a.locationId === b.locationId && a.environmentId === b.environmentId }
export function fuseEnvironmentalObservations(input: unknown): AnalysisResult<{ schema: "fusarium-multisensor-fusion/v1"; tracks: readonly FusedTrack[] }> {
  const root = object(input); const issues = forbiddenPersonFields(input)
  if (root?.schema !== "fusarium-multisensor-fusion-replay/v1") issues.push({ path: "$.schema", message: "expected fusarium-multisensor-fusion-replay/v1" })
  const records = Array.isArray(root?.observations) ? root.observations : null
  if (!records) issues.push({ path: "$.observations", message: "observations must be an array" })
  if (records && records.length > DEFENSIVE_ANALYSIS_MAX_RECORDS) issues.push({ path: "$.observations", message: "record limit exceeded" })
  const observations: FusionObservation[] = []
  for (const [index, value] of (records ?? []).entries()) {
    const row = object(value); const base = analyzeEnvironmentalTracks({ schema: "fusarium-environmental-track-replay/v1", records: [{ ...row, objectId: row?.objectId ?? row?.recordId }] }); const modality = text(row?.modality); const scope = object(row?.scope)
    if (!base.ok || !modality || !FUSION_MODALITIES.includes(modality as never) || !scope) { issues.push({ path: `$.observations[${index}]`, message: "invalid fusion observation" }); continue }
    const point = base.value.tracks[0]?.points[0]; if (!point) continue
    const missionId = scope.missionId === null ? null : id(scope.missionId); const locationId = scope.locationId === null ? null : id(scope.locationId); const environmentId = scope.environmentId === null ? null : id(scope.environmentId)
    if ((scope.missionId !== null && !missionId) || (scope.locationId !== null && !locationId) || (scope.environmentId !== null && !environmentId)) { issues.push({ path: `$.observations[${index}].scope`, message: "scope identifiers are invalid" }); continue }
    observations.push({ ...point, modality: modality as FusionObservation["modality"], scope: { missionId, locationId, environmentId }, trackHint: row.trackHint === null || row.trackHint === undefined ? null : id(row.trackHint) })
  }
  if (issues.length) return { ok: false, issues }
  const clusters: FusionObservation[][] = []
  for (const observation of [...observations].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))) {
    const cluster = clusters.find((candidate) => { const anchor = candidate[candidate.length - 1]!; return sameScope(anchor.scope, observation.scope) && anchor.objectClass === observation.objectClass && Math.abs(Date.parse(anchor.observedAt) - Date.parse(observation.observedAt)) <= 30_000 && distanceM(anchor, observation) <= Math.max(100, anchor.uncertaintyM + observation.uncertaintyM) && (!anchor.trackHint || !observation.trackHint || anchor.trackHint === observation.trackHint) })
    if (cluster) cluster.push(observation); else clusters.push([observation])
  }
  const tracks = clusters.map((cluster, index) => ({ fusionId: `fusion-${index + 1}`, objectClass: cluster[0]!.objectClass, scope: cluster[0]!.scope, observations: cluster, modalities: [...new Set(cluster.map((item) => item.modality))].sort(), centroid: { latitude: cluster.reduce((sum, item) => sum + item.latitude, 0) / cluster.length, longitude: cluster.reduce((sum, item) => sum + item.longitude, 0) / cluster.length }, uncertaintyM: Math.max(...cluster.map((item) => item.uncertaintyM)), state: cluster.length > 1 ? "correlated-inference" as const : "evidence-only" as const, basis: cluster.length > 1 ? "Exact scope and class; observations are within 30 seconds and their bounded spatial uncertainty. Correlation does not establish identity or intent." : "Single imported observation; no fusion inferred." }))
  return { ok: true, value: { schema: "fusarium-multisensor-fusion/v1", tracks } }
}

type WatchOperator = "gt" | "gte" | "lt" | "lte" | "eq"
export function evaluateIndicatorWatchlist(input: unknown): AnalysisResult<{ schema: "fusarium-indicator-watch-results/v1"; matches: readonly { ruleId: string; evidenceId: string; metric: string; value: number; threshold: number; state: "matched-evidence"; provenance: EvidenceProvenance }[]; evaluatedRuleCount: number; evaluatedEvidenceCount: number }> {
  const root = object(input); const issues = forbiddenPersonFields(input); const rules = Array.isArray(root?.rules) ? root.rules : null; const evidence = Array.isArray(root?.evidence) ? root.evidence : null
  if (root?.schema !== "fusarium-indicator-watchlist/v1") issues.push({ path: "$.schema", message: "expected fusarium-indicator-watchlist/v1" }); if (!rules) issues.push({ path: "$.rules", message: "rules must be an array" }); if (!evidence) issues.push({ path: "$.evidence", message: "evidence must be an array" })
  if ((rules?.length ?? 0) > 100 || (evidence?.length ?? 0) > DEFENSIVE_ANALYSIS_MAX_RECORDS) issues.push({ path: "$", message: "bounded rule or evidence limit exceeded" })
  const cleanRules: { ruleId: string; metric: string; operator: WatchOperator; threshold: number }[] = []; const cleanEvidence: { evidenceId: string; metrics: Record<string, number>; provenance: EvidenceProvenance }[] = []
  for (const [index, value] of (rules ?? []).entries()) { const row = object(value); const ruleId = id(row?.ruleId); const metric = id(row?.metric); const operator = text(row?.operator) as WatchOperator | null; const threshold = finite(row?.threshold); if (!ruleId || !metric || !operator || !["gt", "gte", "lt", "lte", "eq"].includes(operator) || threshold === null) issues.push({ path: `$.rules[${index}]`, message: "invalid local indicator rule" }); else cleanRules.push({ ruleId, metric, operator, threshold }) }
  for (const [index, value] of (evidence ?? []).entries()) { const row = object(value); const evidenceId = id(row?.evidenceId); const metrics = object(row?.metrics); const source = provenance(row?.provenance); const numeric = metrics ? Object.fromEntries(Object.entries(metrics).filter(([key, item]) => id(key) && finite(item) !== null).map(([key, item]) => [key, item as number])) : {}; if (!evidenceId || !source || !metrics || Object.keys(numeric).length !== Object.keys(metrics).length) issues.push({ path: `$.evidence[${index}]`, message: "invalid evidence metrics or provenance" }); else cleanEvidence.push({ evidenceId, metrics: numeric, provenance: source }) }
  if (issues.length) return { ok: false, issues }
  const compare = (value: number, operator: WatchOperator, threshold: number) => operator === "gt" ? value > threshold : operator === "gte" ? value >= threshold : operator === "lt" ? value < threshold : operator === "lte" ? value <= threshold : value === threshold
  const matches = cleanRules.flatMap((rule) => cleanEvidence.flatMap((item) => { const value = item.metrics[rule.metric]; return value !== undefined && compare(value, rule.operator, rule.threshold) ? [{ ruleId: rule.ruleId, evidenceId: item.evidenceId, metric: rule.metric, value, threshold: rule.threshold, state: "matched-evidence" as const, provenance: item.provenance }] : [] }))
  return { ok: true, value: { schema: "fusarium-indicator-watch-results/v1", matches, evaluatedRuleCount: cleanRules.length, evaluatedEvidenceCount: cleanEvidence.length } }
}

export function checkReleaseabilityMetadata(input: unknown): AnalysisResult<{ schema: "fusarium-releaseability-check/v1"; state: "metadata-compatible" | "blocked"; blockers: readonly string[]; warnings: readonly string[]; authorization: false }> {
  const root = object(input); const issues = forbiddenPersonFields(input)
  if (root?.schema !== "fusarium-releaseability-metadata/v1") issues.push({ path: "$.schema", message: "expected fusarium-releaseability-metadata/v1" })
  const title = text(root?.title); const classification = text(root?.classification); const handling = Array.isArray(root?.handling) ? root.handling.map((item) => text(item)).filter((item): item is string => Boolean(item)) : null; const sourceRefs = Array.isArray(root?.sourceRefs) ? root.sourceRefs.map((item) => text(item, 400)).filter((item): item is string => Boolean(item)) : null; const intendedRecipients = Array.isArray(root?.intendedRecipients) ? root.intendedRecipients.map((item) => text(item)).filter((item): item is string => Boolean(item)) : null
  if (!title || !classification || !handling || !sourceRefs || !intendedRecipients) issues.push({ path: "$", message: "title, classification, handling, sourceRefs, and intendedRecipients are required" })
  if (issues.length) return { ok: false, issues }
  const blockers: string[] = []; const warnings: string[] = []
  if (classification !== "UNCLASSIFIED") blockers.push("Only UNCLASSIFIED metadata can be evaluated on this host.")
  if (sourceRefs.length === 0) blockers.push("At least one source reference is required.")
  if (intendedRecipients.length === 0) blockers.push("Intended recipient group metadata is required.")
  if (handling.includes("NOFORN") && intendedRecipients.some((recipient) => !/^US(?:$|[-_])/i.test(recipient))) blockers.push("NOFORN metadata conflicts with a non-US recipient group.")
  if (handling.length === 0) warnings.push("No handling caveat was supplied; metadata review is incomplete.")
  warnings.push("This deterministic check validates metadata consistency only. It is not classification guidance, authority to release, or proof that source restrictions were satisfied.")
  return { ok: true, value: { schema: "fusarium-releaseability-check/v1", state: blockers.length ? "blocked" : "metadata-compatible", blockers, warnings, authorization: false } }
}
