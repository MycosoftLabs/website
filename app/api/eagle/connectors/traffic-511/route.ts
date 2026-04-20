import { NextRequest, NextResponse } from "next/server"

/**
 * 511 traffic camera connector — Apr 20, 2026 (Eagle Eye Phase 2)
 *
 * Unions three public 511 traveler-information feeds:
 *   - 511.georgia.gov Cameras API (Georgia DOT)
 *   - api.511.org (Bay Area — SF/Oakland/San Jose)
 *   - road511.com unified GeoJSON (all US states + CA provinces)
 *
 * Each camera returns stable lat/lng + stream URL + roadway metadata.
 * No auth required for Road511's open GeoJSON endpoint; GA + Bay Area
 * endpoints are also documented as public.
 *
 * Output feeds /api/eagle/sources via /api/eagle/ingest/eagle_video_sources.
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
  provider: string
  name: string | null
  lat: number
  lng: number
  stream_url: string | null
  embed_url: string | null
  media_url: string | null
  roadway: string | null
  direction: string | null
}

// ─── Road511 unified GeoJSON (US states + CA provinces) ──────────────────
async function pullRoad511(): Promise<Cam[]> {
  try {
    const res = await fetch("https://www.road511.com/api/cctv-feeds?format=geojson", {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
    })
    if (!res.ok) return []
    const j = await res.json()
    const out: Cam[] = []
    for (const f of j?.features || []) {
      const p = f?.properties || {}
      const [lng, lat] = f?.geometry?.coordinates || []
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      out.push({
        id: `road511-${p.id || p.code || `${lat},${lng}`}`,
        provider: "road511",
        name: p.name || p.title || null,
        lat: Number(lat),
        lng: Number(lng),
        stream_url: p.stream_url || p.snapshot_url || null,
        embed_url: null,
        media_url: p.snapshot_url || null,
        roadway: p.roadway || p.highway || null,
        direction: p.direction || null,
      })
    }
    return out
  } catch { return [] }
}

// ─── 511 Georgia DOT (Cameras API) ────────────────────────────────────────
async function pullGA(): Promise<Cam[]> {
  try {
    const res = await fetch("https://511ga.org/api/v2/get/cameras?format=json", {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
    })
    if (!res.ok) return []
    const j = await res.json()
    const out: Cam[] = []
    for (const c of Array.isArray(j) ? j : j?.cameras || []) {
      const lat = Number(c.Latitude ?? c.latitude)
      const lng = Number(c.Longitude ?? c.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      out.push({
        id: `511ga-${c.Id || c.id}`,
        provider: "511ga",
        name: c.Location || c.Name || c.name || null,
        lat, lng,
        stream_url: c.VideoUrl || c.ImageUrl || null,
        embed_url: null,
        media_url: c.ImageUrl || null,
        roadway: c.Roadway || c.Highway || null,
        direction: c.Direction || null,
      })
    }
    return out
  } catch { return [] }
}

// ─── 511.org Bay Area ────────────────────────────────────────────────────
async function pullBayArea(): Promise<Cam[]> {
  const key = process.env.SF_511_API_KEY
  if (!key) return []
  try {
    const url = `https://api.511.org/traffic/cctv?api_key=${key}&format=json`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []
    const j = await res.json()
    const out: Cam[] = []
    for (const c of j?.cctv || []) {
      const loc = c?.location || {}
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      out.push({
        id: `511bayarea-${c.id || `${lat},${lng}`}`,
        provider: "511-bayarea",
        name: c.name || loc.streetName || null,
        lat, lng,
        stream_url: c.imageUrl || c.streamUrl || null,
        embed_url: null,
        media_url: c.imageUrl || null,
        roadway: loc.routeName || loc.streetName || null,
        direction: loc.direction || null,
      })
    }
    return out
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const [road511, ga, bayArea] = await Promise.all([pullRoad511(), pullGA(), pullBayArea()])
  // Dedup by lat/lng 4-decimal grid (11 m)
  const seen = new Map<string, Cam>()
  for (const c of [...road511, ...ga, ...bayArea]) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
    if (!seen.has(key)) seen.set(key, c)
  }
  let cams = Array.from(seen.values())
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      cams = cams.filter((c) => c.lat >= s && c.lat <= n && c.lng >= w && c.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "traffic-511-multi",
      total: cams.length,
      sources: { road511: road511.length, ga: ga.length, "bay-area": bayArea.length },
      cams,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  )
}

// Sync to MINDEX (every 30 min cron).
export async function POST(req: NextRequest) {
  const [road511, ga, bayArea] = await Promise.all([pullRoad511(), pullGA(), pullBayArea()])
  const seen = new Map<string, Cam>()
  for (const c of [...road511, ...ga, ...bayArea]) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
    if (!seen.has(key)) seen.set(key, c)
  }
  const cams = Array.from(seen.values())
  if (cams.length === 0) return NextResponse.json({ synced: 0 })
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
            permissions: { access: "public", tier: "gov-open" },
            retention_policy: { ttl_days: 7 },
            roadway: c.roadway,
            direction: c.direction,
          },
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ synced: 0, error: `MINDEX ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({ synced: cams.length, sources: { road511: road511.length, ga: ga.length, "bay-area": bayArea.length } })
  } catch (err: any) {
    return NextResponse.json({ synced: 0, error: err?.message || "sync failed" }, { status: 500 })
  }
}
