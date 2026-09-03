export type LiveState = "live" | "stale" | "empty" | "unbound" | "error"

export type LiveReading = {
  id: string
  label: string
  value: number | string | null
  unit: string
  state: LiveState
  source: string
  observedAt: string | null
  detail: string
}

export function finite(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value
  return typeof number === "number" && Number.isFinite(number) ? number : null
}

export function rows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== "object") return []
  const record = value as Record<string, unknown>
  for (const key of ["items", "rows", "data", "agents", "aircraft", "vessels", "vehicles", "devices", "features"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

export function normalizeAqi(data: unknown, receivedAt: string): LiveReading[] {
  const record = data && typeof data === "object" ? data as Record<string, any> : {}
  if (record.ok === false) return [{ id: "aqi", label: "Air quality index", value: null, unit: "AQI", state: "error", source: "/api/environment/aqi", observedAt: null, detail: String(record.error || "Air-quality source failed") }]
  if (record.found === false) return [{ id: "aqi", label: "Air quality index", value: null, unit: "AQI", state: "empty", source: "/api/environment/aqi", observedAt: receivedAt, detail: String(record.message || "No station in the selected radius") }]
  const measurements = Array.isArray(record.measurements) ? record.measurements : []
  const main = finite(record.aqi)
  const result: LiveReading[] = [{
    id: "aqi", label: "Air quality index", value: main, unit: "AQI",
    state: main == null ? "unbound" : "live", source: String(record.provider || "AirNow / OpenAQ"),
    observedAt: String(record.station?.last_updated || receivedAt), detail: String(record.category?.name || record.category || record.station?.name || "Selected-location station evidence"),
  }]
  for (const measurement of measurements.slice(0, 7)) {
    const item = measurement && typeof measurement === "object" ? measurement as Record<string, any> : {}
    result.push({
      id: `air-${String(item.parameter_raw || item.parameter || result.length)}`,
      label: String(item.parameter || item.parameter_raw || "Pollutant"), value: finite(item.value),
      unit: String(item.unit || ""), state: finite(item.value) == null ? "unbound" : "live",
      source: String(record.provider || "AirNow / OpenAQ"), observedAt: String(item.last_updated || record.station?.last_updated || receivedAt),
      detail: String(item.category?.name || item.category || record.station?.name || "Monitoring-station reading"),
    })
  }
  return result
}

export function normalizeImportedEvidence(data: unknown, domain: "soil" | "water", receivedAt: string): LiveReading[] {
  const list = rows(data)
  return list.slice(0, 24).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return []
    const item = entry as Record<string, unknown>
    const value = finite(item.value)
    if (!String(item.label || item.parameter || "").trim() || value == null) return []
    return [{
      id: `${domain}-${String(item.id || index)}`, label: String(item.label || item.parameter), value,
      unit: String(item.unit || ""), state: "live" as const, source: String(item.source || "operator-imported evidence"),
      observedAt: typeof item.observedAt === "string" ? item.observedAt : receivedAt,
      detail: String(item.method || item.detail || `${domain} measurement supplied by operator`),
    }]
  })
}

export function countRows(data: unknown): number | null {
  const list = rows(data)
  if (list.length) return list.length
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  for (const key of ["count", "total", "totalRegistered", "activeCount"]) {
    const value = finite(record[key])
    if (value != null) return value
  }
  return null
}
