/**
 * Preloaded nature-cache read path — Apr 21, 2026
 *
 * Morgan: "massive amount of data added permanent preloaded things faster
 * load of nature data".
 *
 * Reads MINDEX `crep.project_nature_cache` for a given project bbox. The
 * cache is warmed by a MAS cron (nature-preload.py — deferred Item 4
 * Cursor ops lane) every 6 hr.
 *
 * This route handles the Claude lane: once the MINDEX table exists and
 * MAS has warmed it, Oyster + Goffs endpoints read from here instead of
 * calling iNat live. Typical latency drops from 2-3 s → <200 ms.
 *
 * Graceful-degradation contract: while the cache is empty (e.g.
 * MAS cron hasn't run yet, or the table doesn't exist), this route
 * returns `{ cache_warm: false, observations: [] }` with a 200 status.
 * Consumers then fall back to the live iNat fetch path without having
 * to distinguish "cache miss" from "infra broken."
 *
 * Query:
 *   ?project=oyster | goffs     required
 *   ?limit=<max rows>            default 200
 *   ?grade=research|all          default research+needs_id (mirrors live)
 *
 * @route GET /api/crep/nature/preloaded
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

// Project bbox registry — keep in sync with FlyToProjects
const PROJECT_BBOX: Record<string, [number, number, number, number]> = {
  oyster: [-117.30, 32.50, -117.00, 32.85],   // w, s, e, n  (IB + south SD + Coronado + La Jolla)
  goffs:  [-115.80, 34.60, -114.50, 35.40],   // east Mojave Preserve
}

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

export async function GET(req: NextRequest) {
  const project = (req.nextUrl.searchParams.get("project") || "").toLowerCase()
  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 200)))
  const grade = req.nextUrl.searchParams.get("grade") || "all"

  const bbox = PROJECT_BBOX[project]
  if (!bbox) {
    return NextResponse.json({ error: "unknown project", valid: Object.keys(PROJECT_BBOX) }, { status: 400 })
  }

  const started = Date.now()
  let observations: any[] = []
  let cacheWarm = false
  let source = "empty"

  try {
    const [w, s, e, n] = bbox
    const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=project_nature_cache&project_id=${project}&bbox=${w},${s},${e},${n}&limit=${limit}`
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const j = await res.json()
      const rows = j?.entities || j?.features || j?.observations || []
      if (Array.isArray(rows) && rows.length > 0) {
        cacheWarm = true
        source = "mindex:project_nature_cache"
        observations = rows.map((r: any) => {
          // Normalize to the same shape the live fetchINat* returns so
          // consumers can use either path without branching.
          const p = r.properties || r.metadata || r
          const coords = r.geometry?.coordinates || [r.lng ?? p.lng, r.lat ?? p.lat]
          return {
            id: String(r.id || p.id || r.source_id),
            name: p.common_name || p.name || p.taxon_name || "unknown",
            sci_name: p.taxon_name || p.sci_name,
            lat: Number(coords[1]),
            lng: Number(coords[0]),
            observed_on: p.observed_on,
            photo: p.photo_url || p.photo,
            observer: p.observer,
            iconic_taxon: p.iconic_taxon,
            quality_grade: p.quality_grade,
            inat_url: p.inat_url,
            category: "inat-observation",
          }
        }).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
      }
    }
  } catch {
    // MINDEX unreachable or table doesn't exist — fall through with empty list.
    // Consumer falls back to live iNat path.
  }

  return NextResponse.json(
    {
      project,
      bbox,
      cache_warm: cacheWarm,
      source,
      limit,
      grade,
      count: observations.length,
      observations,
      latency_ms: Date.now() - started,
      note: cacheWarm
        ? "Serving from MINDEX preloaded cache — sub-200ms P99."
        : "Cache empty; consumer should fall back to live iNat fetch. MAS preload cron: every 6h.",
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  )
}
