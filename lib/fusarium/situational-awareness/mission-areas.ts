export const SITUATIONAL_MISSION_AREAS_STORAGE_KEY =
  "fusarium.situational-awareness.mission-areas.v1"

export interface BrowserMissionArea {
  id: string
  label: string
  persistence: "browser_local"
}

const MAX_MISSION_AREAS = 20

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : ""
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function normalizeBrowserMissionAreas(candidate: unknown): BrowserMissionArea[] {
  if (!Array.isArray(candidate)) return []
  const areas: BrowserMissionArea[] = []
  const seen = new Set<string>()
  const seenLabels = new Set<string>()
  for (const item of candidate.slice(0, MAX_MISSION_AREAS)) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const id = clean(record.id, 80)
    const label = clean(record.label, 120)
    const labelKey = label.toLowerCase()
    if (!/^local:[a-z0-9-]{1,60}$/.test(id) || !label || seen.has(id) || seenLabels.has(labelKey)) continue
    seen.add(id)
    seenLabels.add(labelKey)
    areas.push({ id, label, persistence: "browser_local" })
  }
  return areas
}

export function parseBrowserMissionAreas(serialized: string | null): BrowserMissionArea[] {
  if (!serialized) return []
  try {
    return normalizeBrowserMissionAreas(JSON.parse(serialized))
  } catch {
    return []
  }
}

export function serializeBrowserMissionAreas(areas: readonly BrowserMissionArea[]): string {
  return JSON.stringify(normalizeBrowserMissionAreas(areas))
}

export function createBrowserMissionArea(
  labelCandidate: string,
  existing: readonly BrowserMissionArea[],
): BrowserMissionArea | null {
  const label = clean(labelCandidate, 120)
  if (!label) return null
  if (existing.some((area) => clean(area.label, 120).toLowerCase() === label.toLowerCase())) {
    return null
  }
  const base = slug(label) || "mission-area"
  const existingIds = new Set(existing.map((area) => area.id))
  let id = `local:${base}`
  let suffix = 2
  while (existingIds.has(id) && suffix <= MAX_MISSION_AREAS + 1) {
    id = `local:${base}-${suffix}`
    suffix += 1
  }
  return { id, label, persistence: "browser_local" }
}

export function addBrowserMissionArea(
  existing: readonly BrowserMissionArea[],
  labelCandidate: string,
): BrowserMissionArea[] {
  const normalized = normalizeBrowserMissionAreas(existing)
  if (normalized.length >= MAX_MISSION_AREAS) return normalized
  const area = createBrowserMissionArea(labelCandidate, normalized)
  return area ? [...normalized, area] : normalized
}
