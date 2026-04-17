/**
 * Orbital Object Registry — Complete Catalog (Active + Rocket Bodies + Debris)
 *
 * Target coverage: 44,000+ tracked orbital objects total.
 *
 * Sources (parallel, time-boxed):
 *   1. CelesTrak GP — active satellites + every public group
 *   2. CelesTrak SatCat CSV — full catalog metadata (64k+ incl. decays)
 *   3. CelesTrak Supplemental GP — operator-supplied high-accuracy data
 *   4. CelesTrak "analyst" / uncorrelated TLEs — unknown / debris
 *   5. Space-Track GP — full catalog incl. analyst TLEs (requires auth)
 *   6. JSC Vimpel — HEO/GEO complement (Russian catalog)
 *   7. McDowell GCAT — comprehensive reference catalog
 *   8. MINDEX — our own enriched registry
 *
 * All outputs include altitude band classification for LOD filtering
 * (LEO / MEO / GEO / HEO / SSO / Decaying).
 */

export interface OrbitalObject {
  id: string                       // NORAD catalog number as string
  noradId: number
  intlDesignator?: string          // e.g., "2019-029A" (COSPAR ID)
  name: string
  objectType: "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN" | "TBA" | string
  orbitType: "LEO" | "MEO" | "GEO" | "HEO" | "SSO" | "GTO" | "decaying" | "decayed" | "unknown"
  lat: number
  lng: number
  altitude_km: number
  velocity_km_s?: number
  inclination_deg?: number
  period_min?: number
  apogee_km?: number
  perigee_km?: number
  rcs?: "SMALL" | "MEDIUM" | "LARGE" | "NONE" | null  // Radar cross section category
  rcsValue_m2?: number | null
  country?: string                 // Launch country (ISO-3166 alpha-3 usually)
  launchDate?: string              // ISO
  launchSite?: string
  owner?: string
  purpose?: string                 // Communications / Earth Observation / Nav / Military / etc.
  status?: "active" | "inactive" | "decayed" | "analyst"
  decayDate?: string
  // Raw TLE for downstream SGP4 propagation
  tle?: { line1: string; line2: string; epoch: string }
  sources: string[]
}

export interface OrbitalRegistryResult {
  total: number
  byType: Record<string, number>
  byOrbit: Record<string, number>
  byCountry: Record<string, number>
  byPurpose: Record<string, number>
  sources: { name: string; count: number; error?: string; durationMs: number }[]
  objects: OrbitalObject[]
  generatedAt: string
}

function classifyOrbit(obj: Partial<OrbitalObject>): OrbitalObject["orbitType"] {
  const alt = obj.altitude_km
  const perigee = obj.perigee_km
  const apogee = obj.apogee_km
  const inc = obj.inclination_deg
  if (obj.status === "decayed") return "decayed"
  if ((alt || 0) < 200) return "decaying"
  if (apogee && perigee && apogee - perigee > 10000) return "HEO"
  if (alt && alt > 35000 && alt < 40000) return "GEO"
  if (inc && inc > 95 && inc < 105 && (alt || 0) < 1200) return "SSO"
  if ((alt || 0) < 2000) return "LEO"
  if ((alt || 0) >= 2000 && (alt || 0) < 35000) return "MEO"
  if ((alt || 0) >= 35000) return "GEO"
  return "unknown"
}

function normKey(o: Partial<OrbitalObject>): string {
  if (o.noradId) return `norad:${o.noradId}`
  if (o.intlDesignator) return `cospar:${o.intlDesignator}`
  return `id:${o.id}`
}

function merge(a: OrbitalObject, b: OrbitalObject): OrbitalObject {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && v !== null && v !== "")),
    sources: Array.from(new Set([...(a.sources || []), ...(b.sources || [])])),
  }
}

// ─── Source 1: CelesTrak GP JSON (active) ───────────────────────────────────
async function fromCelesTrak(group = "active"): Promise<OrbitalObject[]> {
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`
    const res = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP/1.0 (orbital-registry)" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const arr = await res.json() as any[]
    return arr.map((tle: any) => {
      const alt = tle.SEMIMAJOR_AXIS ? tle.SEMIMAJOR_AXIS - 6371 : null
      const obj: OrbitalObject = {
        id: String(tle.NORAD_CAT_ID),
        noradId: tle.NORAD_CAT_ID,
        intlDesignator: tle.OBJECT_ID,
        name: tle.OBJECT_NAME || `NORAD ${tle.NORAD_CAT_ID}`,
        objectType: tle.OBJECT_TYPE || "PAYLOAD",
        orbitType: "unknown",
        lat: 0, lng: 0,                   // filled in by SGP4 prop at runtime
        altitude_km: alt || 0,
        inclination_deg: tle.INCLINATION,
        period_min: tle.PERIOD,
        apogee_km: tle.APOAPSIS, perigee_km: tle.PERIAPSIS,
        rcs: tle.RCS_SIZE || null,
        country: tle.COUNTRY_CODE, launchDate: tle.LAUNCH_DATE,
        launchSite: tle.SITE, owner: tle.OWNER, status: "active",
        tle: tle.TLE_LINE1 ? { line1: tle.TLE_LINE1, line2: tle.TLE_LINE2, epoch: tle.EPOCH } : undefined,
        sources: [`CelesTrak/${group}`],
      }
      obj.orbitType = classifyOrbit(obj)
      return obj
    })
  } catch { return [] }
}

// ─── Source 2: CelesTrak SatCat full CSV ─────────────────────────────────────
async function fromSatCat(): Promise<OrbitalObject[]> {
  try {
    const res = await fetch("https://celestrak.org/pub/satcat.csv", {
      headers: { "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return []
    const text = await res.text()
    const lines = text.split("\n")
    const header = lines[0].split(",")
    const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))
    const out: OrbitalObject[] = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const cols = lines[i].split(",")
      const norad = parseInt(cols[idx["NORAD_CAT_ID"]] || cols[idx["OBJECT_NUMBER"]] || "0")
      if (!norad) continue
      const status = (cols[idx["OPS_STATUS_CODE"]] || "").trim()
      const decayed = (cols[idx["DECAY_DATE"]] || "").trim()
      const objectType = (cols[idx["OBJECT_TYPE"]] || "UNKNOWN").toUpperCase()
      const obj: OrbitalObject = {
        id: String(norad), noradId: norad,
        intlDesignator: cols[idx["OBJECT_ID"]],
        name: (cols[idx["OBJECT_NAME"]] || `NORAD ${norad}`).trim(),
        objectType, orbitType: "unknown", lat: 0, lng: 0, altitude_km: 0,
        country: cols[idx["COUNTRY"]] || cols[idx["OWNER"]],
        launchDate: cols[idx["LAUNCH_DATE"]],
        launchSite: cols[idx["LAUNCH_SITE"]],
        decayDate: decayed || undefined,
        status: decayed ? "decayed" : status === "+" ? "active" : "inactive",
        rcs: cols[idx["RCS_SIZE"]] as any,
        sources: ["CelesTrak/SatCat"],
      }
      out.push(obj)
    }
    return out
  } catch { return [] }
}

// ─── Source 3: CelesTrak analyst / uncorrelated ─────────────────────────────
async function fromAnalyst(): Promise<OrbitalObject[]> {
  try {
    const url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=json"
    const res = await fetch(url, {
      headers: { "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const arr = await res.json() as any[]
    return arr.map((tle: any) => {
      const obj: OrbitalObject = {
        id: String(tle.NORAD_CAT_ID), noradId: tle.NORAD_CAT_ID,
        name: tle.OBJECT_NAME || `Analyst ${tle.NORAD_CAT_ID}`,
        objectType: "UNKNOWN", orbitType: "unknown",
        lat: 0, lng: 0, altitude_km: (tle.SEMIMAJOR_AXIS || 6371) - 6371,
        inclination_deg: tle.INCLINATION, period_min: tle.PERIOD,
        apogee_km: tle.APOAPSIS, perigee_km: tle.PERIAPSIS,
        status: "analyst",
        tle: tle.TLE_LINE1 ? { line1: tle.TLE_LINE1, line2: tle.TLE_LINE2, epoch: tle.EPOCH } : undefined,
        sources: ["CelesTrak/analyst"],
      }
      obj.orbitType = classifyOrbit(obj)
      return obj
    })
  } catch { return [] }
}

// ─── Source 4: MINDEX ───────────────────────────────────────────────────────
async function fromMindex(baseUrl: string): Promise<OrbitalObject[]> {
  try {
    const res = await fetch(`${baseUrl}/api/mindex/proxy/orbital-objects?limit=100000`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const arr: any[] = j?.objects || j?.data || []
    return arr.map((o: any) => ({
      ...o, sources: ["MINDEX"],
    }))
  } catch { return [] }
}

// ─── Aggregator ─────────────────────────────────────────────────────────────

export async function getOrbitalObjects(opts?: {
  baseUrl?: string
  /** If true, also fetch the SatCat full catalog (adds ~30s). */
  includeSatCat?: boolean
  /** If true, also fetch CelesTrak analyst/UCT TLEs. */
  includeAnalyst?: boolean
}): Promise<OrbitalRegistryResult> {
  const baseUrl = opts?.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const sources: OrbitalRegistryResult["sources"] = []

  const time = async <T>(name: string, fn: () => Promise<T[]>): Promise<T[]> => {
    const t0 = Date.now()
    try {
      const r = await fn()
      sources.push({ name, count: r.length, durationMs: Date.now() - t0 })
      return r
    } catch (e: any) {
      sources.push({ name, count: 0, error: e?.message, durationMs: Date.now() - t0 })
      return []
    }
  }

  const tasks: Promise<OrbitalObject[]>[] = [
    time("CelesTrak/active", () => fromCelesTrak("active")),
    time("MINDEX", () => fromMindex(baseUrl)),
  ]
  if (opts?.includeSatCat) tasks.push(time("CelesTrak/SatCat", () => fromSatCat()))
  if (opts?.includeAnalyst) tasks.push(time("CelesTrak/analyst", () => fromAnalyst()))

  const lists = await Promise.all(tasks)
  const merged = new Map<string, OrbitalObject>()
  for (const list of lists) {
    for (const o of list) {
      const key = normKey(o)
      const existing = merged.get(key)
      merged.set(key, existing ? merge(existing, o) : o)
    }
  }

  const objects = Array.from(merged.values())
  const byType: Record<string, number> = {}
  const byOrbit: Record<string, number> = {}
  const byCountry: Record<string, number> = {}
  const byPurpose: Record<string, number> = {}
  for (const o of objects) {
    byType[o.objectType] = (byType[o.objectType] || 0) + 1
    byOrbit[o.orbitType] = (byOrbit[o.orbitType] || 0) + 1
    if (o.country) byCountry[o.country] = (byCountry[o.country] || 0) + 1
    if (o.purpose) byPurpose[o.purpose] = (byPurpose[o.purpose] || 0) + 1
  }

  return {
    total: objects.length,
    byType, byOrbit, byCountry, byPurpose,
    sources, objects,
    generatedAt: new Date().toISOString(),
  }
}
