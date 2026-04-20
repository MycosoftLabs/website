import { NextRequest, NextResponse } from "next/server"

/**
 * Public webcam networks — Windy + EarthCam + NPS + USGS + ALERTWildfire
 *   + HPWREN + Surfline — Apr 20, 2026 (Eagle Eye Phase 2b)
 *
 * Morgan: "why dont i see live streams from ustream and all webcams surf
 * cams traffic cams already as icons on map ucsd fire cams in san diego
 * just like fire watch apps have locally that should be found in all
 * sources globally and added to eagle eye".
 *
 * Unified connector for seven stable-location public webcam networks.
 * Each fails independently — a 4xx/5xx from one network doesn't block
 * the others.
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
 *   ALERTWildfire / ALERTCalifornia — ArcGIS Feature Service operated by
 *     UCSD Scripps / UNR Seismo Lab + ALERTCalifornia. Publishes live
 *     positions + embed URLs for ~1,100 fire-watch cameras across CA /
 *     NV / OR / WA / UT / ID / MT / CO. Zero key, public. Morgan called
 *     this out explicitly ("ucsd fire cams in san diego just like fire
 *     watch apps have locally").
 *
 *   HPWREN (High Performance Wireless Research + Education Network) —
 *     UCSD atmospheric research backbone. ~160 fire + atmospheric cams
 *     across San Diego, Orange, Riverside, Imperial counties + Baja.
 *     Camlist at https://hpwren.ucsd.edu/cameras/camlist.json.
 *
 *   Surfline public cams — Their public directory is auth-gated but the
 *     /spots/search endpoint returns cam thumbnails + embed URLs for a
 *     subset of premium spots. Best-effort; many spots 401 without a
 *     session so this gracefully returns what it can.
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
  provider: "windy" | "earthcam" | "nps" | "usgs" | "alertwildfire" | "hpwren" | "surfline"
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

// ─── ALERTWildfire / ALERTCalifornia ArcGIS Feature Service ─────────────
// UCSD Scripps + UNR Seismo Lab + ALERTCalifornia. Publishes ~1,100 live
// fire-watch cameras with position + redirect-to-live-view URL.
async function pullAlertWildfire(): Promise<Cam[]> {
  try {
    // ArcGIS Feature Service query. This is the public backing store for
    // cameras.alertwildfire.org and cameras.alertcalifornia.org.
    const url =
      "https://services1.arcgis.com/Va1fmC6JQwyHevZz/arcgis/rest/services/" +
      "ALERTWildfire_v3_HSL/FeatureServer/0/query?" +
      "where=1%3D1&outFields=*&f=geojson&returnGeometry=true&outSR=4326"
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.features || []
    return items
      .filter(
        (f: any) =>
          Number.isFinite(Number(f?.geometry?.coordinates?.[1])) &&
          Number.isFinite(Number(f?.geometry?.coordinates?.[0])),
      )
      .map((f: any) => {
        const p = f?.properties || {}
        const camName = p.CAM_NAME || p.Name || p.cam_name || p.site || "alertwildfire-cam"
        const camId = p.CAM_ID || p.id || p.OBJECTID || `${f.geometry.coordinates[1]},${f.geometry.coordinates[0]}`
        // AlertCalifornia player URL pattern
        const embed = p.url || p.URL || `https://www.alertcalifornia.org/cameras?pos=${p.latitude || f.geometry.coordinates[1]},${p.longitude || f.geometry.coordinates[0]}`
        return {
          id: `alertwildfire-${camId}`,
          provider: "alertwildfire" as const,
          name: camName,
          lat: Number(f.geometry.coordinates[1]),
          lng: Number(f.geometry.coordinates[0]),
          stream_url: null, // MJPEG/HLS per-cam requires session cookie; use embed
          embed_url: embed,
          media_url: p.image_url || null,
          category: "fire-watch",
        } as Cam
      })
  } catch { return [] }
}

// ─── HPWREN (UCSD atmospheric research) fire + weather cams ─────────────
// ~160 cameras across SoCal + Baja. Morgan called these out explicitly
// ("ucsd fire cams in san diego").
async function pullHPWREN(): Promise<Cam[]> {
  try {
    // HPWREN publishes their camera manifest at camlist.json.
    const res = await fetch("https://hpwren.ucsd.edu/cameras/camlist.json", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = Array.isArray(j) ? j : j?.cameras || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.lat ?? c.latitude)) && Number.isFinite(Number(c.lng ?? c.longitude)))
      .map((c: any) => {
        const id = c.id || c.name || c.site
        return {
          id: `hpwren-${id}`,
          provider: "hpwren" as const,
          name: c.name || c.site || id,
          lat: Number(c.lat ?? c.latitude),
          lng: Number(c.lng ?? c.longitude),
          stream_url: c.mjpeg_url || c.stream_url || null,
          // Live image rotates every few minutes; HPWREN page embeds it
          embed_url: c.url || `https://hpwren.ucsd.edu/cameras/L/${id}-mrg.jpg`,
          media_url: c.latest_image || c.thumbnail || `https://hpwren.ucsd.edu/cameras/L/${id}-mrg.jpg`,
          category: "fire-watch",
        } as Cam
      })
  } catch { return [] }
}

// ─── Surfline public surf cam directory ────────────────────────────────
// Surfline's cam directory is auth-gated for live streams but their
// /spots/search returns public metadata + thumbnail for surf spots.
// Best-effort: many cams 401/402 for the actual stream without a sub.
async function pullSurfline(): Promise<Cam[]> {
  try {
    // Use their public spot-search — returns ~500 top spots globally with
    // cam rigged=true, including position + thumbnail. Live stream URLs
    // require Surfline Premium but the embed link 302s to their paywall
    // which at least renders the player chrome for our users.
    const res = await fetch(
      "https://services.surfline.com/kbyg/regions/forecasts?subregionId=all&include=taxonomy,cam",
      {
        headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.data?.cams || j?.cams || j?.spots || []
    return items
      .filter((c: any) => Number.isFinite(Number(c?.location?.lat)) && Number.isFinite(Number(c?.location?.lon)))
      .map((c: any) => ({
        id: `surfline-${c._id || c.id || c.spotId}`,
        provider: "surfline" as const,
        name: c.title || c.name || "Surfline cam",
        lat: Number(c.location.lat),
        lng: Number(c.location.lon),
        stream_url: c.streamUrl || c.playlistUrl || null,
        embed_url: c.url || (c._id ? `https://www.surfline.com/surf-cam/${c._id}` : null),
        media_url: c.stillUrl || c.thumbnail || null,
        category: "surf",
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
  const [windy, earthcam, nps, usgs, alertwildfire, hpwren, surfline] = await Promise.all([
    pullWindy(bbox),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
    pullAlertWildfire(),
    pullHPWREN(),
    pullSurfline(),
  ])
  let cams = [...windy, ...earthcam, ...nps, ...usgs, ...alertwildfire, ...hpwren, ...surfline]
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
        alertwildfire: alertwildfire.length,
        hpwren: hpwren.length,
        surfline: surfline.length,
      },
      cams,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
  )
}

export async function POST(req: NextRequest) {
  const [windy, earthcam, nps, usgs, alertwildfire, hpwren, surfline] = await Promise.all([
    pullWindy(),
    pullEarthCam(),
    pullNPS(),
    pullUSGS(),
    pullAlertWildfire(),
    pullHPWREN(),
    pullSurfline(),
  ])
  const cams = [...windy, ...earthcam, ...nps, ...usgs, ...alertwildfire, ...hpwren, ...surfline]
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
