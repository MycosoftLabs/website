/**
 * Worldstate API Client — Mar 14, 2026
 *
 * Fetches from website proxy /api/mas/world (passive awareness).
 * CREP commands and Earth2 simulation remain specialist.
 * NO MOCK DATA — returns null or degraded metadata on failure.
 */

export interface WorldstateSource {
  id: string
  name?: string
  status?: "ok" | "degraded" | "stale" | "unavailable"
  freshness_seconds?: number
  last_updated?: string
  error?: string
}

export interface WorldstateSummary {
  sources_ok?: number
  sources_degraded?: number
  sources_unavailable?: number
  last_updated?: string
  degraded?: boolean
}

export interface WorldstateSourcesResponse {
  sources?: WorldstateSource[]
  degraded?: boolean
  error?: string
}

const BASE = "/api/mas/world"

async function fetchWorld(path: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost:3010")
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return fetch(url.toString(), {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  })
}

/**
 * Fetch worldstate summary (source counts, overall status).
 * Returns null if unavailable.
 */
export async function fetchWorldstateSummary(): Promise<WorldstateSummary | null> {
  try {
    const res = await fetchWorld(`${BASE}/summary`)
    if (!res.ok) return null
    const data = await res.json()
    return data as WorldstateSummary
  } catch {
    return null
  }
}

/**
 * Fetch per-source status for diagnostics.
 * Returns null if unavailable.
 */
export async function fetchWorldstateSources(): Promise<WorldstateSourcesResponse | null> {
  try {
    const res = await fetchWorld(`${BASE}/sources`)
    if (!res.ok) return null
    const data = await res.json()
    return data as WorldstateSourcesResponse
  } catch {
    return null
  }
}

/**
 * Fetch region-specific summary (lat, lon, radius_km).
 */
export async function fetchWorldstateRegion(params: {
  lat: number
  lon: number
  radius_km?: number
}): Promise<unknown | null> {
  try {
    const q: Record<string, string> = {
      lat: String(params.lat),
      lon: String(params.lon),
    }
    if (params.radius_km != null) q.radius_km = String(params.radius_km)
    const res = await fetchWorld(`${BASE}/region`, q)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
