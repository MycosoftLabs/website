import { NextRequest, NextResponse } from "next/server"

/**
 * Public webcam networks — Windy + EarthCam + NPS + USGS — Apr 20, 2026
 * (Eagle Eye Phase 2)
 *
 * Unified connector for four stable-location public webcam networks:
 *
 *   Windy Webcams v3  — https://api.windy.com/webcams/api/v3/webcams
 *     ~70k global weather/environment cams, bbox-scoped. Needs
 *     WINDY_API_KEY (free register at api.windy.com/keys). Returns
 *     webcamId, title, location, player.day/live (HLS/iframe URLs).
 *
 *   EarthCam         — public directory at https://www.earthcam.com/api/
 *     Major metros + landmarks. No auth; we use their public JSON map.
 *
 *   NPS (National Park Service) — irma.nps.gov webcams endpoint
 *     Public US park cameras with lat/lng from park centroids.
 *
 *   USGS Cam network — https://www.usgs.gov/programs/volcano-hazards/
 *     volcanic + hazard webcams. Public.
 *
 * All shape-normalized to eagle.video_sources rows and ingested to
 * MINDEX. kind=permanent, stable_location=true.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

type Cam = {
  id: string
  provider: "windy" | "earthcam" | "nps" | "usgs"
  name: string | null
  lat: number
  lng: number
  stream_url: string | null
  embed_url: string | null
  media_url: string | null
  category: string | null
}

// ─── Windy Webcams v3 ────────────────────────────────────────────────────
async function pullWindy(bbox?: string): Promise<Cam[]> {
  const key = process.env.WINDY_API_KEY
  if (!key) return []
  try {
    const bboxPart = bbox || "-179,-85,179,85"
    const [w, s, e, n] = bboxPart.split(",").map(Number)
    if (![w, s, e, n].every(Number.isFinite)) return []
    const qp = new URLSearchParams({
      nearby: `${(n + s) / 2},${(w + e) / 2},2000`, // radius km from centroid, max 2000
      limit: "500",
      include: "categories,urls,player,location",
    })
    const res = await fetch(`https://api.windy.com/webcams/api/v3/webcams?${qp}`, {
      headers: { "x-windy-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.webcams || []
    return items
      .filter((w: any) => Number.isFinite(w.location?.latitude) && Number.isFinite(w.location?.longitude))
      .map((w: any) => ({
        id: `windy-${w.webcamId}`,
        provider: "windy" as const,
        name: w.title || null,
        lat: Number(w.location.latitude),
        lng: Number(w.location.longitude),
        stream_url: w.player?.day?.embed || w.player?.live?.embed || null,
        embed_url: w.player?.day?.embed || null,
        media_url: w.images?.current?.thumbnail || w.images?.daylight?.thumbnail || null,
        category: (w.categories || [])[0]?.name || "weather",
      }))
  } catch { return [] }
}

// ─── EarthCam public directory ───────────────────────────────────────────
// Their JSON export at /api/get_places_with_cams is a stable public feed.
// Treat as best-effort; if they change schema we just return [].
async function pullEarthCam(): Promise<Cam[]> {
  try {
    const res = await fetch("https://www.earthcam.com/api/get_places_with_cams.php", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return []
    const txt = await res.text()
    // EarthCam wraps in a JSONP-ish callback sometimes. Strip if present.
    const jsonTxt = txt.replace(/^[^{[]+/, "").replace(/[;)\s]+$/, "")
    let j: any = null
    try { j = JSON.parse(jsonTxt) } catch { return [] }
    const items: any[] = Array.isArray(j) ? j : j?.places || j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)))
      .map((c: any) => ({
        id: `earthcam-${c.id || c.cam_id || `${c.latitude},${c.longitude}`}`,
        provider: "earthcam" as const,
        name: c.title || c.name || null,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        stream_url: c.embed_url || c.stream_url || null,
        embed_url: c.embed_url || (c.cam_id ? `https://www.earthcam.com/embed/${c.cam_id}` : null),
        media_url: c.thumbnail_url || null,
        category: c.category || "landmark",
      }))
  } catch { return [] }
}

// ─── NPS (National Park Service) ─────────────────────────────────────────
async function pullNPS(): Promise<Cam[]> {
  try {
    const res = await fetch("https://www.nps.gov/common/services/webcams.json", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.webcams || j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)))
      .map((c: any) => ({
        id: `nps-${c.id || c.slug || `${c.latitude},${c.longitude}`}`,
        provider: "nps" as const,
        name: c.title || c.name || null,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        stream_url: c.stream_url || c.video_url || null,
        embed_url: c.embed_url || c.url || null,
        media_url: c.image_url || c.thumbnail || null,
        category: "park",
      }))
  } catch { return [] }
}

// ─── USGS hazard webcams ────────────────────────────────────────────────
async function pullUSGS(): Promise<Cam[]> {
  try {
    // USGS publishes a JSON feed at volcanoes.usgs.gov for Volcano Cams.
    const res = await fetch("https://volcanoes.usgs.gov/vsc/api/webcamApi/webcams", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = Array.isArray(j) ? j : j?.webcams || j?.data || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.lat ?? c.latitude)) && Number.isFinite(Number(c.lng ?? c.longitude)))
      .map((c: any) => ({
        id: `usgs-${c.id || c.name}`,
        provider: "usgs" as const,
        name: c.name || c.title || null,
        lat: Number(c.lat ?? c.latitude),
        lng: Number(c.lng ?? c.longitude),
        stream_url: c.stream || c.streamUrl || null,
        embed_url: c.url || c.webpage || null,
        media_url: c.image || c.imageUrl || null,
        category: "hazard",
      }))
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const [windy, earthcam, nps, usgs] = await Promise.all([
    pullWindy(bbox),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
  ])
  let cams = [...windy, ...earthcam, ...nps, ...usgs]
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      cams = cams.filter((c) => c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "public-webcams-multi",
      total: cams.length,
      by_provider: {
        windy: windy.length,
        earthcam: earthcam.length,
        nps: nps.length,
        usgs: usgs.length,
      },
      cams,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  )
}

export async function POST(req: NextRequest) {
  const [windy, earthcam, nps, usgs] = await Promise.all([
    pullWindy(),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
  ])
  const cams = [...windy, ...earthcam, ...nps, ...usgs]
  if (!cams.length) return NextResponse.json({ synced: 0 })
  try {
    const res = await fetch(`${MINDEX_BASE}/api/mindex/ingest/eagle_video_sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify({
        entities: cams.map((c) => ({
          source: c.provider,
          source_id: c.id,
          name: c.name,
          entity_type: "video_source",
          lat: c.lat,
          lng: c.lng,
          properties: {
            kind: "permanent",
            provider: c.provider,
            stable_location: true,
            location_confidence: 1.0,
            stream_url: c.stream_url,
            embed_url: c.embed_url,
            media_url: c.media_url,
            source_status: "online",
            permissions: { access: "public", tier: c.provider === "nps" || c.provider === "usgs" ? "gov-open" : "commercial-public" },
            retention_policy: { ttl_days: 30 },
            category: c.category,
          },
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ synced: 0, error: `MINDEX ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({
      synced: cams.length,
      by_provider: { windy: windy.length, earthcam: earthcam.length, nps: nps.length, usgs: usgs.length },
    })
  } catch (err: any) {
    return NextResponse.json({ synced: 0, error: err?.message || "sync failed" }, { status: 500 })
  }
}
