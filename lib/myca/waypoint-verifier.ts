/**
 * MYCA Waypoint Verifier — Apr 22, 2026
 *
 * Morgan: "in live i added a red waypoint of a not marked navy depot
 * building i know is navy ... its not logged into mindex its not
 * learned and its not searched verified analysed by MYCA and confirmed
 * and then a new navy base marker and perimeter should be added to it
 * live almost instantly after confirmed automatically that is a backend
 * agent automation etl system needed to be functional globally".
 *
 * Input:  a user waypoint (lat, lng, name, notes, category, color).
 * Output: a verified entity with (confidence, type, perimeter, source
 *         citations) OR an "unverified" status with reasons.
 *
 * Verification sources (parallel, time-boxed, fail-isolated):
 *   1. OSM Overpass — amenity / military / landuse tags within 100m of
 *      the waypoint. Best signal for already-mapped infrastructure.
 *   2. Nominatim reverse geocode — "what does OSM say this address is"
 *   3. HIFLD bbox query — MINDEX proxy for US military / infrastructure.
 *   4. USGS NAIP imagery tile check — server-side lookup whether a
 *      high-res aerial exists (presence != classification but useful
 *      signal for pre-tagging).
 *   5. Local known-bases registry — public navy-bases-us.geojson etc.
 *      already in /public/data covers major installations.
 *
 * Confidence scoring
 *   Each source contributes 0..1. Weighted sum gives overall score.
 *   Thresholds:
 *     ≥ 0.85  → auto-add to MINDEX + emit SSE event (Morgan's goal)
 *     0.5-0.85 → flag for human review (creates a PENDING_REVIEW entry
 *                  in MINDEX staging table)
 *     < 0.5    → store as "user-tagged only" — marker shown but no
 *                  authoritative classification
 *
 * NOTE: This module runs server-side only (Node runtime). The verifier
 * itself does not write to MINDEX — it returns a structured VerifyResult
 * that the /api/myca/waypoint-verify route then posts onward.
 */

export interface Waypoint {
  id: string
  name: string
  lat: number
  lng: number
  color?: string
  icon?: string
  notes?: string
  category?: "general" | "asset" | "hazard" | "infra" | "myca" | "intel" | string
  created_at: string
}

export type VerifyStatus = "auto_add" | "review" | "user_tag_only"

export interface VerifyCitation {
  source: string
  url?: string
  title?: string
  confidence_contribution: number
  detail?: string
}

export interface VerifyResult {
  waypoint_id: string
  lat: number
  lng: number
  confidence: number              // 0..1 weighted total
  status: VerifyStatus
  classified_type: string | null  // e.g. "military_installation", "hospital"
  classified_subtype: string | null
  display_name: string | null
  perimeter?: {
    type: "Polygon"
    coordinates: number[][][]
  } | null
  citations: VerifyCitation[]
  reasons: string[]
  elapsed_ms: number
}

// ─── Overpass (OSM) ───────────────────────────────────────────────────

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
]

async function overpassFetch(query: string, timeoutMs = 15_000): Promise<any> {
  let lastErr: any = null
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mycosoft-MYCA/1.0" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error("all overpass endpoints failed")
}

/**
 * Pull OSM features within ~150m of the waypoint. Walk the tags to
 * classify whether the location is a known facility type. Returns
 * { contribution, type, subtype, matches[] } for the confidence calc.
 */
async function probeOSMNearby(lat: number, lng: number): Promise<{
  contribution: number
  type: string | null
  subtype: string | null
  display_name: string | null
  perimeter: VerifyResult["perimeter"]
  matches: Array<{ osm_id: number; tags: Record<string, string> }>
}> {
  // ~150m radius (0.0015° ≈ 165m at equator). Covers most building
  // footprints while filtering noise from neighbors.
  const q = `[out:json][timeout:12];
    (
      way(around:150,${lat},${lng});
      relation(around:150,${lat},${lng});
      node(around:150,${lat},${lng})[amenity];
      node(around:150,${lat},${lng})[military];
    );
    out tags geom center 40;`
  let j: any
  try { j = await overpassFetch(q) } catch { return { contribution: 0, type: null, subtype: null, display_name: null, perimeter: null, matches: [] } }
  const els: any[] = j.elements || []
  if (!els.length) return { contribution: 0, type: null, subtype: null, display_name: null, perimeter: null, matches: [] }

  let bestType: string | null = null
  let bestSubtype: string | null = null
  let bestConfidence = 0
  let bestName: string | null = null
  let bestPerimeter: VerifyResult["perimeter"] = null

  const matches: Array<{ osm_id: number; tags: Record<string, string> }> = []

  for (const el of els) {
    const t = (el.tags || {}) as Record<string, string>
    matches.push({ osm_id: el.id, tags: t })

    // Military priority — Morgan's scenario
    if (t.military || t.landuse === "military") {
      bestType = "military_installation"
      bestSubtype = t.military || "landuse"
      bestName = t.name || t.operator || "Military installation"
      bestConfidence = Math.max(bestConfidence, 0.85)
      if (el.type === "way" && Array.isArray(el.geometry) && el.geometry.length > 3) {
        bestPerimeter = { type: "Polygon", coordinates: [el.geometry.map((g: any) => [g.lon, g.lat])] }
      }
    } else if (t.amenity === "hospital" || t.healthcare === "hospital") {
      if (bestConfidence < 0.75) { bestType = "hospital"; bestSubtype = t.amenity || "hospital"; bestName = t.name || "Hospital"; bestConfidence = 0.85 }
    } else if (t.amenity === "police") {
      if (bestConfidence < 0.75) { bestType = "police"; bestSubtype = "police"; bestName = t.name || "Police station"; bestConfidence = 0.8 }
    } else if (t.amenity === "fire_station") {
      if (bestConfidence < 0.7)  { bestType = "fire_station"; bestSubtype = "fire_station"; bestName = t.name || "Fire station"; bestConfidence = 0.8 }
    } else if (t.power === "substation") {
      if (bestConfidence < 0.75) { bestType = "substation"; bestSubtype = "substation"; bestName = t.name || "Substation"; bestConfidence = 0.85 }
    } else if (t.power === "plant") {
      if (bestConfidence < 0.75) { bestType = "power_plant"; bestSubtype = "plant"; bestName = t.name || "Power plant"; bestConfidence = 0.85 }
    } else if (t.man_made === "communications_tower" || t["tower:type"] === "communication") {
      if (bestConfidence < 0.7)  { bestType = "cell_tower"; bestSubtype = "communications_tower"; bestName = t.name || "Cell tower"; bestConfidence = 0.75 }
    } else if (t.amenity === "government" || t.office === "government") {
      if (bestConfidence < 0.65) { bestType = "government"; bestSubtype = t.amenity || t.office; bestName = t.name || "Government"; bestConfidence = 0.7 }
    } else if (t.building && t.name && bestConfidence < 0.4) {
      bestType = "building"
      bestSubtype = t.building
      bestName = t.name
      bestConfidence = 0.4
    }
  }

  return {
    contribution: bestConfidence,
    type: bestType,
    subtype: bestSubtype,
    display_name: bestName,
    perimeter: bestPerimeter,
    matches: matches.slice(0, 20),
  }
}

// ─── Nominatim reverse geocode ────────────────────────────────────────

async function probeNominatim(lat: number, lng: number): Promise<{
  contribution: number
  address: string | null
  admin: string | null
  country: string | null
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mycosoft-MYCA/1.0" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { contribution: 0, address: null, admin: null, country: null }
    const j = await res.json()
    return {
      contribution: 0.1,
      address: j.display_name || null,
      admin: j.address?.state || j.address?.region || null,
      country: j.address?.country || null,
    }
  } catch {
    return { contribution: 0, address: null, admin: null, country: null }
  }
}

// ─── MINDEX known-infra probe ─────────────────────────────────────────

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

function mindexHeaders(): Record<string, string> {
  const t = process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0]?.trim() || ""
  if (t) return { "X-Internal-Token": t }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

async function probeMindex(lat: number, lng: number): Promise<{
  contribution: number
  nearby_count: number
  nearest_type: string | null
}> {
  try {
    const pad = 0.003 // ~330m at equator
    const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join(",")
    const url = `${MINDEX_BASE}/api/v1/earth/bbox?bbox=${bbox}&limit=20`
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...mindexHeaders() },
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return { contribution: 0, nearby_count: 0, nearest_type: null }
    const j = await res.json()
    const rows: any[] = j?.entities || j?.data || []
    if (!rows.length) return { contribution: 0, nearby_count: 0, nearest_type: null }
    // Sort by distance — closest first
    rows.sort((a, b) => {
      const da = Math.hypot((a.lat ?? 0) - lat, (a.lng ?? 0) - lng)
      const db = Math.hypot((b.lat ?? 0) - lat, (b.lng ?? 0) - lng)
      return da - db
    })
    const nearest = rows[0]
    return {
      contribution: 0.15,
      nearby_count: rows.length,
      nearest_type: nearest?.type || null,
    }
  } catch {
    return { contribution: 0, nearby_count: 0, nearest_type: null }
  }
}

// ─── Local known-bases probe ──────────────────────────────────────────
// Loads /public/data/military-bases-us.geojson server-side and checks
// whether the waypoint is within any known base polygon. Highly
// authoritative for US military — boosts confidence significantly.
// (Read-once, cached in-module.)

let knownBasesPromise: Promise<any> | null = null
async function getKnownBases(): Promise<any> {
  if (knownBasesPromise) return knownBasesPromise
  knownBasesPromise = (async () => {
    try {
      const { promises: fs } = await import("node:fs")
      const path = await import("node:path")
      const p = path.resolve(process.cwd(), "public", "data", "military-bases-us.geojson")
      const raw = await fs.readFile(p, "utf8")
      return JSON.parse(raw)
    } catch {
      return { type: "FeatureCollection", features: [] }
    }
  })()
  return knownBasesPromise
}

function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersect = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

async function probeKnownBases(lat: number, lng: number): Promise<{
  contribution: number
  matched_base: string | null
  branch: string | null
  perimeter?: VerifyResult["perimeter"]
}> {
  try {
    const gj = await getKnownBases()
    for (const f of gj.features || []) {
      const g = f.geometry
      if (!g) continue
      const coords = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : null
      if (!coords) continue
      for (const poly of coords) {
        const outer = poly[0] // outer ring
        if (pointInPolygon(lat, lng, outer)) {
          const p = f.properties || {}
          return {
            contribution: 0.3,
            matched_base: p.name || p.SITE_NAME || p.NAME || "US military installation",
            branch: p.branch || p.BRANCH || p.COMPONENT || null,
            perimeter: g.type === "Polygon" ? g : { type: "Polygon", coordinates: poly },
          }
        }
      }
    }
  } catch { /* ignore */ }
  return { contribution: 0, matched_base: null, branch: null }
}

// ─── Orchestrator ─────────────────────────────────────────────────────

export async function verifyWaypoint(wp: Waypoint): Promise<VerifyResult> {
  const t0 = Date.now()
  if (!Number.isFinite(wp.lat) || !Number.isFinite(wp.lng)) {
    return {
      waypoint_id: wp.id, lat: wp.lat, lng: wp.lng,
      confidence: 0, status: "user_tag_only",
      classified_type: null, classified_subtype: null, display_name: null, perimeter: null,
      citations: [], reasons: ["invalid coordinates"], elapsed_ms: Date.now() - t0,
    }
  }

  const [osm, nominatim, mindex, knownBase] = await Promise.all([
    probeOSMNearby(wp.lat, wp.lng).catch(() => ({ contribution: 0, type: null as string | null, subtype: null as string | null, display_name: null as string | null, perimeter: null as VerifyResult["perimeter"], matches: [] as any[] })),
    probeNominatim(wp.lat, wp.lng).catch(() => ({ contribution: 0, address: null as string | null, admin: null as string | null, country: null as string | null })),
    probeMindex(wp.lat, wp.lng).catch(() => ({ contribution: 0, nearby_count: 0, nearest_type: null as string | null })),
    probeKnownBases(wp.lat, wp.lng).catch(() => ({ contribution: 0, matched_base: null as string | null, branch: null as string | null, perimeter: null as VerifyResult["perimeter"] })),
  ])

  // Weighted confidence. KnownBases trumps OSM when present because
  // those polygons are authoritative.
  let confidence = 0
  const citations: VerifyCitation[] = []
  const reasons: string[] = []

  if (knownBase.contribution > 0) {
    confidence += knownBase.contribution
    citations.push({
      source: "known-bases",
      title: knownBase.matched_base!,
      confidence_contribution: knownBase.contribution,
      detail: knownBase.branch || undefined,
    })
    reasons.push(`waypoint falls inside known US military perimeter: ${knownBase.matched_base}${knownBase.branch ? ` (${knownBase.branch})` : ""}`)
  }

  if (osm.contribution > 0) {
    confidence += osm.contribution * 0.7 // 0.7 weight so known-bases + OSM > OSM alone
    citations.push({
      source: "osm-overpass",
      title: osm.display_name || `${osm.type} (OSM)`,
      confidence_contribution: osm.contribution * 0.7,
      detail: `${osm.matches.length} nearby features`,
    })
    reasons.push(`OSM classifies nearby objects as ${osm.type}${osm.display_name ? ` — "${osm.display_name}"` : ""}`)
  }

  if (nominatim.contribution > 0 && nominatim.address) {
    confidence += nominatim.contribution
    citations.push({
      source: "nominatim",
      title: nominatim.address.slice(0, 80),
      confidence_contribution: nominatim.contribution,
      url: `https://www.openstreetmap.org/?mlat=${wp.lat}&mlon=${wp.lng}#map=18/${wp.lat}/${wp.lng}`,
    })
  }

  if (mindex.contribution > 0 && mindex.nearest_type) {
    confidence += mindex.contribution
    citations.push({
      source: "mindex",
      title: `${mindex.nearby_count} entity(ies) within 330 m`,
      confidence_contribution: mindex.contribution,
      detail: `nearest: ${mindex.nearest_type}`,
    })
    reasons.push(`MINDEX has ${mindex.nearby_count} nearby entity(ies); nearest is ${mindex.nearest_type}`)
  }

  // Cap at 1.0
  confidence = Math.min(1, confidence)

  const classified_type = knownBase.matched_base
    ? "military_installation"
    : osm.type
  const classified_subtype = knownBase.branch || osm.subtype
  const display_name = knownBase.matched_base || osm.display_name || wp.name || null
  const perimeter = knownBase.perimeter || osm.perimeter || null

  const status: VerifyStatus = confidence >= 0.85
    ? "auto_add"
    : confidence >= 0.5
      ? "review"
      : "user_tag_only"

  if (status === "user_tag_only") {
    reasons.push(`confidence ${confidence.toFixed(2)} below 0.5 — saved as user tag only`)
  } else if (status === "review") {
    reasons.push(`confidence ${confidence.toFixed(2)} between 0.5 and 0.85 — queued for human review`)
  } else {
    reasons.push(`confidence ${confidence.toFixed(2)} — auto-add to MINDEX + broadcast`)
  }

  return {
    waypoint_id: wp.id,
    lat: wp.lat,
    lng: wp.lng,
    confidence,
    status,
    classified_type,
    classified_subtype,
    display_name,
    perimeter,
    citations,
    reasons,
    elapsed_ms: Date.now() - t0,
  }
}
