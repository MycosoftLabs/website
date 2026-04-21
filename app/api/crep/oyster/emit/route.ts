/**
 * NASA EMIT methane / mineral dust plume live feed — Apr 21, 2026
 *
 * Morgan (deferred Item 3): "based on more data add this ...
 * earth.jpl.nasa.gov/emit/data/data-products/".
 *
 * Three-tier source cascade (same pattern as PFM plume route):
 *
 *   1. MINDEX `crep.emit_plumes` (populated by Cursor-lane systemd
 *      timer on MAS that runs emit-stac-backfill.mjs daily). Fast path.
 *
 *   2. Live NASA CMR STAC API search for last 7 days of EMIT granules
 *      intersecting the SD/TJ bbox. Requires EARTHDATA_USERNAME +
 *      EARTHDATA_PASSWORD in env (already configured per .env.local).
 *      Returns granule metadata only — full CSV ingest is deferred to
 *      the backfill script.
 *
 *   3. Static hardcoded samples (3 detections — Otay landfill, San
 *      Ysidro POE exhaust, Imperial Valley dust).
 *
 * Query:
 *   ?days_back=N   default 7
 *   ?bbox=w,s,e,n  default SD region [-117.8, 32.3, -116.8, 33.2]
 *
 * @route GET /api/crep/oyster/emit
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const MINDEX_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""
const EARTHDATA_USER = process.env.EARTHDATA_USERNAME
const EARTHDATA_PASS = process.env.EARTHDATA_PASSWORD

// NASA CMR STAC API — methane plume collection id. The L2B mineral
// products are separate; we query both.
const STAC_BASE = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
const EMIT_METHANE_COLLECTION = "EMITL2BCH4PLM_001"
const EMIT_MINERAL_COLLECTION = "EMITL2BMIN_001"

// Static fallback — matches what's currently hardcoded in
// tijuana-estuary route TJ_OYSTER_EMIT_PLUMES.
const STATIC_FALLBACK = [
  { id: "emit-methane-otay",      name: "Otay landfill methane plume",     lat: 32.5850, lng: -116.9780, intensity: 0.65, gas: "CH4",         description: "EMIT CH4 detection, Otay landfill, 2026-04-15 pass.", sampled_at: "2026-04-15T00:00:00Z" },
  { id: "emit-methane-sanysidro", name: "San Ysidro POE exhaust plume",    lat: 32.5420, lng: -117.0300, intensity: 0.45, gas: "CO2/CH4",     description: "Border POE diesel exhaust column, EMIT 2026-04-12.",   sampled_at: "2026-04-12T00:00:00Z" },
  { id: "emit-dust-imperial",     name: "Imperial Valley dust plume",      lat: 32.8400, lng: -115.5700, intensity: 0.78, gas: "MineralDust", description: "Salton Sea mineral dust advection.",                    sampled_at: "2026-04-10T00:00:00Z" },
]

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

function earthdataAuthHeader(): string | null {
  if (!EARTHDATA_USER || !EARTHDATA_PASS) return null
  return `Basic ${Buffer.from(`${EARTHDATA_USER}:${EARTHDATA_PASS}`).toString("base64")}`
}

async function tryMindexEmit(bbox: [number, number, number, number], daysBack: number): Promise<any[] | null> {
  try {
    const [w, s, e, n] = bbox
    const since = new Date(Date.now() - daysBack * 86400_000).toISOString()
    const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=emit_plumes&bbox=${w},${s},${e},${n}&since=${since}&limit=200`
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const j = await res.json()
    const rows = j?.entities || j?.features || []
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows.map((r: any) => {
      const p = r.properties || r
      const coords = r.geometry?.coordinates || [r.lng ?? p.lng, r.lat ?? p.lat]
      return {
        id: String(r.id || p.id),
        name: p.name || "EMIT detection",
        lat: Number(coords[1]),
        lng: Number(coords[0]),
        intensity: Number(p.intensity ?? 0.5),
        gas: p.gas || "CH4",
        description: p.description,
        sampled_at: p.overpass_utc || p.sampled_at,
        granule_id: p.granule_id,
      }
    })
  } catch {
    return null
  }
}

async function tryStacSearch(bbox: [number, number, number, number], daysBack: number): Promise<any[] | null> {
  const auth = earthdataAuthHeader()
  if (!auth) return null
  try {
    const [w, s, e, n] = bbox
    const since = new Date(Date.now() - daysBack * 86400_000).toISOString()
    const results: any[] = []
    for (const collection of [EMIT_METHANE_COLLECTION, EMIT_MINERAL_COLLECTION]) {
      const url = `${STAC_BASE}/search`
      const body = {
        collections: [collection],
        bbox: [w, s, e, n],
        datetime: `${since}/${new Date().toISOString()}`,
        limit: 50,
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth, Accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) continue
      const j = await r.json()
      for (const feat of j?.features || []) {
        const c = feat.geometry?.coordinates?.[0]?.[0]
        if (!Array.isArray(c)) continue
        const isCh4 = collection === EMIT_METHANE_COLLECTION
        results.push({
          id: `emit-${collection}-${feat.id}`,
          name: isCh4 ? "EMIT methane plume" : "EMIT mineral dust",
          lat: Number(c[1]),
          lng: Number(c[0]),
          intensity: 0.6,
          gas: isCh4 ? "CH4" : "MineralDust",
          description: `NASA EMIT ${isCh4 ? "methane" : "mineral"} detection from granule ${feat.id}`,
          sampled_at: feat.properties?.datetime,
          granule_id: feat.id,
          download_url: feat.assets?.data?.href || feat.links?.find((l: any) => l.rel === "data")?.href,
        })
      }
    }
    return results.length > 0 ? results : null
  } catch {
    return null
  }
}

// Apr 21, 2026: SWR pattern. MINDEX query is fast (~50 ms), STAC
// search is slow (~3-8 s). MINDEX always tried synchronously. STAC
// tried synchronously ONLY if MINDEX is empty AND no cached STAC hit.
// Second-and-subsequent requests always < 100 ms.
let emitCache: { t: number; plumes: any[]; source: string } | null = null
const EMIT_CACHE_TTL_MS = 6 * 3600_000

export async function GET(req: Request) {
  const url = new URL(req.url)
  const daysBack = Math.min(30, Math.max(1, Number(url.searchParams.get("days_back") || 7)))
  const bboxStr = url.searchParams.get("bbox") || "-117.8,32.3,-116.8,33.2"
  const bboxParts = bboxStr.split(",").map(Number)
  const bbox: [number, number, number, number] = bboxParts.length === 4 && bboxParts.every(Number.isFinite)
    ? (bboxParts as [number, number, number, number])
    : [-117.8, 32.3, -116.8, 33.2]

  let source = "static-fallback"
  let plumes: any[] | null = null

  // MINDEX first (fast)
  plumes = await tryMindexEmit(bbox, daysBack)
  if (plumes && plumes.length > 0) source = "mindex:emit_plumes"

  // Cache hit (recent STAC or static) if MINDEX empty
  if ((!plumes || plumes.length === 0) && emitCache && Date.now() - emitCache.t < EMIT_CACHE_TTL_MS) {
    plumes = emitCache.plumes
    source = `${emitCache.source}:cached`
  }

  // STAC search ONLY on cold start (no MINDEX, no cache). 6 s budget.
  if (!plumes || plumes.length === 0) {
    try {
      const stacPromise = tryStacSearch(bbox, daysBack)
      const stacResult = await Promise.race([
        stacPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
      ])
      if (stacResult && stacResult.length > 0) {
        plumes = stacResult
        source = "nasa-cmr-stac"
        emitCache = { t: Date.now(), plumes, source }
      }
    } catch { /* fall through */ }
  }

  if (!plumes || plumes.length === 0) {
    plumes = STATIC_FALLBACK
    source = "static-fallback"
  }

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      source,
      days_back: daysBack,
      bbox,
      count: plumes.length,
      plumes,
      note: source === "static-fallback"
        ? "No live EMIT data available. MINDEX emit_plumes table empty OR Earthdata STAC unreachable. Static 3-sample fallback."
        : source === "mindex:emit_plumes"
          ? "Serving from MINDEX ingested cache (MAS systemd timer)."
          : "Live from NASA CMR STAC API; full granule CSV ingest deferred to Cursor systemd timer.",
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" } },
  )
}
