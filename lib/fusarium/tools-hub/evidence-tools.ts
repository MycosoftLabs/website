export const MAX_EVIDENCE_BYTES = 256 * 1024

export type EvidenceState = "verified" | "partial" | "empty" | "stale" | "unavailable" | "error"

export interface EvidenceFinding {
  id: string
  label: string
  state: EvidenceState
  detail: string
}

export interface EvidenceInspection {
  state: EvidenceState
  recordCount: number | null
  findings: EvidenceFinding[]
  canonicalText: string
}

export interface SourceHealthContract {
  id: string
  label: string
  href: string
  freshnessMs: number | null
}

export const SOURCE_HEALTH_CONTRACTS: readonly SourceHealthContract[] = [
  { id: "host", label: "Fusarium host", href: "/health", freshnessMs: null },
  { id: "nlm", label: "Nature Learning Model", href: "/api/fusarium/nlm/status", freshnessMs: 5 * 60_000 },
  { id: "nature-statistics", label: "Nature Statistics", href: "/api/natureos/nature-statistics", freshnessMs: 15 * 60_000 },
  { id: "devices", label: "Device registry", href: "/api/fusarium/devices", freshnessMs: 5 * 60_000 },
] as const

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
  }
  return value
}

export function canonicalizeEvidence(value: unknown): string {
  return JSON.stringify(stable(value))
}

function stringsAt(record: Record<string, unknown>, keys: readonly string[]): string[] {
  return keys.flatMap((key) => typeof record[key] === "string" && record[key] ? [record[key] as string] : [])
}

export function inspectEvidence(value: unknown, nowMs = Date.now()): EvidenceInspection {
  const canonicalText = canonicalizeEvidence(value)
  if (value == null || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0)) {
    return { state: "empty", recordCount: 0, canonicalText, findings: [{ id: "content", label: "Content", state: "empty", detail: "The JSON is valid and contains no records." }] }
  }

  const records = Array.isArray(value) ? value : [value]
  const findings: EvidenceFinding[] = []
  const objects = records.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
  const provenance = objects.flatMap((record) => stringsAt(record, ["source", "sourceId", "provider", "provenance", "origin"]))
  findings.push({ id: "provenance", label: "Source provenance", state: provenance.length ? "verified" : "partial", detail: provenance.length ? `${provenance.length} source reference${provenance.length === 1 ? "" : "s"} present.` : "No source, provider, origin, or provenance reference was found." })

  const timestampValues = objects.flatMap((record) => stringsAt(record, ["observedAt", "observed_at", "timestamp", "recordedAt", "updatedAt", "receivedAt"]))
  const parsedTimes = timestampValues.map(Date.parse).filter(Number.isFinite)
  const newest = parsedTimes.length ? Math.max(...parsedTimes) : null
  const stale = newest != null && nowMs - newest > 24 * 60 * 60_000
  findings.push({ id: "time", label: "Authoritative time", state: !timestampValues.length ? "partial" : parsedTimes.length !== timestampValues.length ? "error" : stale ? "stale" : "verified", detail: !timestampValues.length ? "No recognized evidence timestamp was found." : parsedTimes.length !== timestampValues.length ? "One or more timestamps are not valid ISO-compatible times." : stale ? `Newest evidence is older than the 24-hour inspection threshold (${new Date(newest!).toISOString()}).` : `Newest evidence time: ${new Date(newest!).toISOString()}.` })

  const ids = objects.flatMap((record) => stringsAt(record, ["id", "evidenceId", "recordId", "sampleId"]))
  findings.push({ id: "identity", label: "Stable identity", state: ids.length === objects.length ? "verified" : "partial", detail: ids.length === objects.length ? "Every object record has a recognized stable identifier." : `${ids.length} of ${objects.length} object records have a recognized identifier.` })

  const declaredHashes = objects.flatMap((record) => stringsAt(record, ["sha256", "checksum", "hash"]))
  findings.push({ id: "checksum", label: "Declared checksum", state: declaredHashes.length ? "partial" : "unavailable", detail: declaredHashes.length ? "A checksum is declared. Use Evidence Integrity Check to compare it with the locally computed SHA-256 digest." : "No declared checksum is available for comparison." })

  const state: EvidenceState = findings.some((finding) => finding.state === "error") ? "error" : findings.some((finding) => finding.state === "stale") ? "stale" : findings.every((finding) => finding.state === "verified") ? "verified" : "partial"
  return { state, recordCount: records.length, findings, canonicalText }
}

export function classifySourceResponse(status: number, value: unknown, freshnessMs: number | null, nowMs = Date.now()): EvidenceState {
  if (status === 401 || status === 403) return "unavailable"
  if (status < 200 || status >= 300) return "error"
  if (value == null || (Array.isArray(value) && value.length === 0)) return "empty"
  const record = typeof value === "object" && value ? value as Record<string, unknown> : {}
  if (record.available === false || record.status === "unavailable" || record.status === "not_bound") return "unavailable"
  const timestamp = stringsAt(record, ["observedAt", "timestamp", "updatedAt", "checkedAt"])[0]
  if (freshnessMs && timestamp) {
    const parsed = Date.parse(timestamp)
    if (Number.isFinite(parsed) && nowMs - parsed > freshnessMs) return "stale"
  }
  return "verified"
}
