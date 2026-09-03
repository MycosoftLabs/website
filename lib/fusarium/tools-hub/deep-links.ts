const ID_KEYS = [
  "contextId",
  "missionId",
  "missionAreaId",
  "missionAreaLabel",
  "nodeId",
  "objectId",
  "objectType",
  "evidenceId",
  "sourceId",
  "locationId",
  "environmentId",
] as const

const MODES = new Set(["live", "replay", "forecast", "simulated"])
const DATA_MODES = new Set(["system", "replay", "forecast", "demo", "simulated"])
const WINDOWS = new Set(["6h", "24h", "72h"])
const MAX_VALUE_LENGTH = 256
const MAX_DEVICES = 16

function bounded(value: string | null): string | null {
  const clean = value?.trim() ?? ""
  if (!clean || clean.length > MAX_VALUE_LENGTH || /[\u0000-\u001f\u007f]/.test(clean)) return null
  return clean
}

function parseInput(input: string | URLSearchParams): URLSearchParams {
  return typeof input === "string" ? new URLSearchParams(input) : new URLSearchParams(input.toString())
}

/**
 * Retain only bounded, non-authoritative investigation context. Credentials,
 * release labels, headers, arbitrary URLs, and client authorization claims are
 * never propagated through Tools Hub links.
 */
export function toolsHubContextParams(input: string | URLSearchParams): URLSearchParams {
  const source = parseInput(input)
  const out = new URLSearchParams()

  // Never relabel higher-marked context as UNCLASSIFIED. An explicit marking
  // other than the only supported commercial tier invalidates the complete
  // handoff rather than selectively carrying identifiers across the boundary.
  const explicitClassifications = source.getAll("classification")
  if (explicitClassifications.some((value) => {
    const classification = bounded(value)
    return !classification || classification.toUpperCase() !== "UNCLASSIFIED"
  })) return out

  for (const key of ID_KEYS) {
    const value = bounded(source.get(key))
    if (value) out.set(key, value)
  }

  const timeWindow = bounded(source.get("timeWindow"))
  if (timeWindow && WINDOWS.has(timeWindow)) out.set("timeWindow", timeWindow)

  const mode = bounded(source.get("mode"))?.toLowerCase() ?? null
  if (mode && MODES.has(mode)) out.set("mode", mode)

  const dataMode = bounded(source.get("dataMode"))?.toLowerCase() ?? null
  if (dataMode && DATA_MODES.has(dataMode)) out.set("dataMode", dataMode)

  const start = bounded(source.get("start"))
  const end = bounded(source.get("end"))
  if (
    start &&
    end &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(start) &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(end) &&
    Number.isFinite(Date.parse(start)) &&
    Number.isFinite(Date.parse(end)) &&
    Date.parse(start) <= Date.parse(end)
  ) {
    out.set("start", new Date(start).toISOString())
    out.set("end", new Date(end).toISOString())
  }

  const deviceIds = [...new Set(source.getAll("deviceId").map(bounded).filter((value): value is string => Boolean(value)))].slice(0, MAX_DEVICES)
  for (const deviceId of deviceIds) out.append("deviceId", deviceId)

  if ([...out.keys()].length > 0) out.set("classification", "UNCLASSIFIED")
  return out
}

export function buildToolsHubLink(href: string, input: string | URLSearchParams): string {
  if (!href) return href
  const url = new URL(href, "http://fusarium.local")
  const context = toolsHubContextParams(input)
  for (const key of [...new Set(context.keys())]) {
    url.searchParams.delete(key)
    for (const value of context.getAll(key)) url.searchParams.append(key, value)
  }
  return `${url.pathname}${url.search}${url.hash}`
}
