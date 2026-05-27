import { NextRequest, NextResponse } from "next/server"

/**
 * State DOT CCTV connector — Apr 20, 2026 (Eagle Eye Phase 2d)
 *
 * Morgan: "so many cctv streaming vodeo services web cams public cams
 * missing from map".
 *
 * Pulls live traffic CCTV camera feeds from the state DOTs that publish
 * public APIs:
 *
 *   Caltrans (California DOT) — 3,500+ cameras, cwwp2.dot.ca.gov/data/
 *     d{district}/cctv/cctvStatusD{district}.json. Districts 4 (SF Bay),
 *     7 (LA), 11 (San Diego — Morgan's zone) all included.
 *
 *   WSDOT (Washington State) — ~900 cameras, wsdot.wa.gov/traffic/
 *     api/Cameras/CamerasREST.svc/GetCamerasAsJson?AccessCode=...
 *     Free access code; returns lat/lng + image URL.
 *
 *   FDOT (Florida) — fl511.com/map/Cctv API. ~1,800 cameras statewide.
 *
 *   NY State (511NY) — 511ny.org/tmc/cctvd.aspx, ~700 cams.
 *
 *   TxDOT (Texas) — drivetexas.org/api/cameras, ~1,200 cams.
 *
 * All return same-shape rows: { id, provider, name, lat, lng, stream_url,
 * embed_url, media_url, category }. Connector GET merges + bbox-filters
 * + returns. Auto-integrates with Eagle Eye overlay via /api/eagle/sources
 * fan-out.
 *
 * When a state provider returns HTML instead of JSON (rate limit, maint
 * window, DNS), that source gracefully returns [] without blocking.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Cam = {
  id: string
  provider: "caltrans" | "wsdot" | "fdot" | "nysdot" | "nyctmc" | "txdot"
  name: string | null
  lat: number
  lng: number
  stream_url: string | null
  embed_url: string | null
  media_url: string | null
  source_status?: string | null
  category: "traffic"
}

type ParsedBbox = {
  west: number
  south: number
  east: number
  north: number
}

type Extent = [number, number, number, number]

function parseBbox(raw: string | undefined): ParsedBbox | null {
  if (!raw) return null
  const [west, south, east, north] = raw.split(",").map(Number)
  if (![west, south, east, north].every(Number.isFinite)) return null
  return {
    west: Math.max(-180, Math.min(180, west)),
    south: Math.max(-90, Math.min(90, Math.min(south, north))),
    east: Math.max(-180, Math.min(180, east)),
    north: Math.max(-90, Math.min(90, Math.max(south, north))),
  }
}

function pointInBbox(cam: Cam, bbox: ParsedBbox): boolean {
  if (cam.lat < bbox.south || cam.lat > bbox.north) return false
  if (bbox.west <= bbox.east) return cam.lng >= bbox.west && cam.lng <= bbox.east
  return cam.lng >= bbox.west || cam.lng <= bbox.east
}

function bboxIntersectsExtent(bbox: ParsedBbox | null, extent: Extent): boolean {
  if (!bbox) return true
  const [west, south, east, north] = extent
  if (bbox.north < south || bbox.south > north) return false
  if (bbox.west <= bbox.east) return bbox.east >= west && bbox.west <= east
  return east >= bbox.west || west <= bbox.east
}

const CALTRANS_DISTRICT_EXTENTS: Record<number, Extent> = {
  1: [-124.6, 38.6, -121.0, 42.1],
  2: [-123.2, 39.0, -119.0, 42.1],
  3: [-123.1, 37.1, -118.9, 40.4],
  4: [-123.5, 36.7, -121.0, 38.9],
  5: [-122.7, 34.3, -119.2, 37.4],
  6: [-121.2, 35.0, -117.4, 37.7],
  7: [-119.1, 33.4, -117.5, 34.9],
  8: [-118.2, 33.3, -114.0, 35.9],
  9: [-120.6, 35.7, -117.4, 38.4],
  10: [-122.6, 36.8, -119.0, 39.2],
  11: [-117.7, 32.4, -114.0, 33.7],
  12: [-118.2, 33.4, -117.4, 34.2],
}

const PROVIDER_EXTENTS = {
  caltrans: [-124.7, 32.4, -114.0, 42.2],
  wsdot: [-124.9, 45.3, -116.7, 49.1],
  fdot: [-87.8, 24.3, -79.7, 31.1],
  nysdot: [-79.9, 40.3, -71.7, 45.2],
  nyctmc: [-74.3, 40.45, -73.65, 41.0],
  txdot: [-106.7, 25.8, -93.4, 36.6],
} satisfies Record<string, Extent>

// ─── Caltrans (CA) ──────────────────────────────────────────────────────
// Caltrans publishes one JSON per district at cwwp2.dot.ca.gov. Districts
// 1-12 cover the whole state. Request all 12 in parallel, union results.
async function pullCaltrans(bbox: ParsedBbox | null): Promise<Cam[]> {
  const DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((d) =>
    bboxIntersectsExtent(bbox, CALTRANS_DISTRICT_EXTENTS[d]),
  )
  const pulls = DISTRICTS.map(async (d): Promise<Cam[]> => {
    try {
      const url = `https://cwwp2.dot.ca.gov/data/d${d}/cctv/cctvStatusD${String(d).padStart(2, "0")}.json`
      const res = await fetch(url, {
        headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) return []
      const j = await res.json()
      const items: any[] = j?.data || []
      return items
        .map((entry: any): Cam | null => {
          const cctv = entry?.cctv
          const loc = cctv?.location?.latitude && cctv?.location?.longitude ? cctv.location : null
          const lat = Number(loc?.latitude)
          const lng = Number(loc?.longitude)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          // Apr 22, 2026 v3 — Morgan: "all caltrans must work no excuse
          // fix this one fully" (SR-75 Silver Strand).
          // Fixes:
          //   1. media_url must be the JPEG only, never the m3u8 (old
          //      code: `still || streamingVideoURL` → m3u8 fell through
          //      to <img src=m3u8> which never renders).
          //   2. embed_url prefers the single-cam /vm/loc/d{N}/{slug}.htm
          //      viewer when we can derive the slug from the snapshot
          //      URL. The old iframemap.htm?code=... URL shows a whole
          //      Google Map of every D{N} cam instead of the one the
          //      user clicked, which reads as "no stream resolved".
          //   3. Falls back to iframemap with the indexCctv so we still
          //      render something when the snapshot URL isn't there.
          const snapshot = cctv?.imageData?.static?.currentImageURL || null
          const stream = cctv?.imageData?.streamingVideoURL || null
          // Snapshot URLs follow /data/d{N}/cctv/image/{slug}/{slug}.jpg.
          // Extract slug and build the single-cam viewer URL.
          let locViewer: string | null = null
          if (snapshot) {
            const m = /cwwp2\.dot\.ca\.gov\/data\/(d\d+)\/cctv\/image\/([^/]+)\//i.exec(snapshot)
            if (m) locViewer = `https://cwwp2.dot.ca.gov/vm/loc/${m[1]}/${m[2]}.htm`
          }
          const embedUrl = locViewer
            || `https://cwwp2.dot.ca.gov/vm/iframemap.htm?code=${encodeURIComponent(cctv?.indexCctv || "")}`
          const inService = cctv?.inService !== "false" && cctv?.inService !== false
          const proxiedSnap = snapshot
            ? `/api/eagle/cam-image?url=${encodeURIComponent(snapshot)}`
            : null
          return {
            id: `caltrans-d${d}-${cctv?.recordId || cctv?.indexCctv || `${lat},${lng}`}`,
            provider: "caltrans",
            name: cctv?.location?.nearbyPlace || cctv?.location?.locationName || `Caltrans D${d} cam`,
            lat,
            lng,
            stream_url: inService ? stream : null,
            embed_url: embedUrl,
            // Proxied JPEG refreshes every ~2s upstream; works when HLS 404s.
            media_url: proxiedSnap,
            source_status: inService ? "online" : "offline",
            category: "traffic",
          }
        })
        .filter((c): c is Cam => !!c)
    } catch {
      return []
    }
  })
  const results = await Promise.all(pulls)
  return results.flat()
}

// ─── WSDOT (Washington State) ──────────────────────────────────────────
async function pullWSDOT(): Promise<Cam[]> {
  const key = process.env.WSDOT_ACCESS_CODE || process.env.WSDOT_API_KEY || ""
  if (!key) return []
  try {
    const res = await fetch(
      `https://wsdot.wa.gov/traffic/api/Cameras/CamerasREST.svc/GetCamerasAsJson?AccessCode=${encodeURIComponent(key)}`,
      { headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" }, signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return []
    const items: any[] = await res.json()
    return items
      .filter((c: any) => Number.isFinite(Number(c.CameraLocation?.Latitude)) && Number.isFinite(Number(c.CameraLocation?.Longitude)))
      .map((c: any): Cam => {
        const rawImg = c.ImageURL || null
        const proxiedImg = rawImg ? `/api/eagle/cam-image?url=${encodeURIComponent(rawImg)}` : null
        return {
          id: `wsdot-${c.CameraID}`,
          provider: "wsdot",
          name: c.Title || c.Description || `WSDOT ${c.CameraID}`,
          lat: Number(c.CameraLocation.Latitude),
          lng: Number(c.CameraLocation.Longitude),
          stream_url: null,
          embed_url: rawImg,
          media_url: proxiedImg,
          category: "traffic",
        }
      })
  } catch { return [] }
}

// ─── FDOT (Florida) ─────────────────────────────────────────────────────
async function pullFDOT(): Promise<Cam[]> {
  try {
    const res = await fetch("https://fl511.com/map/data/cctvs.json", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.data || j?.features || (Array.isArray(j) ? j : [])
    return items
      .map((c: any): Cam | null => {
        const lat = Number(c.latitude ?? c.lat ?? c.geometry?.coordinates?.[1])
        const lng = Number(c.longitude ?? c.lng ?? c.geometry?.coordinates?.[0])
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const rawImg = c.imageUrl || c.snapshotUrl || null
        const proxiedImg = rawImg ? `/api/eagle/cam-image?url=${encodeURIComponent(rawImg)}` : null
        return {
          id: `fdot-${c.id || c.camId || `${lat},${lng}`}`,
          provider: "fdot",
          name: c.description || c.roadway || c.location || "FDOT cam",
          lat,
          lng,
          stream_url: c.hlsUrl || null,
          embed_url: c.url || c.videoUrl || null,
          media_url: proxiedImg,
          category: "traffic",
        }
      })
      .filter((c): c is Cam => !!c)
  } catch { return [] }
}

// ─── NY State (511NY) ───────────────────────────────────────────────────
async function pullNYSDOT(): Promise<Cam[]> {
  try {
    // 511NY publishes traffic cameras via their public API (no key).
    const res = await fetch("https://511ny.org/api/getcameras?format=json", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const items: any[] = await res.json()
    return items
      .filter(
        (c: any) =>
          Number.isFinite(Number(c.Latitude)) &&
          Number.isFinite(Number(c.Longitude)) &&
          !c.Disabled &&
          !c.Blocked,
      )
      .map((c: any): Cam => {
        // May 24, 2026 — 511NY no longer populates ImageUrl and
        // /map/GetImage?id= returns HTTP 404 for every camera. Live
        // feeds are in VideoUrl (SkyVDN HLS .m3u8). For NYC street
        // coverage use pullNYCTMC() — ~960 JPEG snapshots that work.
        const videoUrl = c.VideoUrl || null
        return {
          id: `nysdot-${c.ID}`,
          provider: "nysdot",
          name: c.Name
            ? (c.RoadwayName ? `${c.Name} (${c.RoadwayName})` : c.Name)
            : `511NY ${c.ID}`,
          lat: Number(c.Latitude),
          lng: Number(c.Longitude),
          stream_url: videoUrl,
          embed_url: c.Url || null,
          media_url: null,
          category: "traffic",
        }
      })
  } catch { return [] }
}

// ─── NYC DOT TMC (webcams.nyctmc.org) ───────────────────────────────────
// May 24, 2026 — Primary NYC traffic camera feed. 511NY GetImage is
// dead; NYCTMC serves ~960 online cams with direct JPEG snapshots.
async function pullNYCTMC(): Promise<Cam[]> {
  try {
    const res = await fetch("https://webcams.nyctmc.org/api/cameras", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return []
    const items: any[] = await res.json()
    return items
      .filter(
        (c: any) =>
          Number.isFinite(Number(c.latitude)) &&
          Number.isFinite(Number(c.longitude)) &&
          String(c.isOnline).toLowerCase() === "true",
      )
      .map((c: any): Cam => {
        const rawImg =
          c.imageUrl || `https://webcams.nyctmc.org/api/cameras/${c.id}/image`
        const proxiedImg = `/api/eagle/cam-image?url=${encodeURIComponent(rawImg)}`
        return {
          id: `nyctmc-${c.id}`,
          provider: "nyctmc",
          name: c.name || `NYC TMC ${c.area || "camera"}`,
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          stream_url: null,
          embed_url: `https://webcams.nyctmc.org/map/camera/${c.id}`,
          media_url: proxiedImg,
          category: "traffic",
        }
      })
  } catch { return [] }
}

// ─── TxDOT (Texas) ──────────────────────────────────────────────────────
async function pullTxDOT(): Promise<Cam[]> {
  try {
    const res = await fetch("https://www.drivetexas.org/api/cctv-cameras", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.features || j?.data || (Array.isArray(j) ? j : [])
    return items
      .map((c: any): Cam | null => {
        const p = c?.properties || c
        const lat = Number(p.latitude ?? p.lat ?? c.geometry?.coordinates?.[1])
        const lng = Number(p.longitude ?? p.lng ?? c.geometry?.coordinates?.[0])
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return {
          id: `txdot-${p.id || p.cctv_id || `${lat},${lng}`}`,
          provider: "txdot",
          name: p.name || p.description || "TxDOT cam",
          lat,
          lng,
          stream_url: p.streamURL || null,
          embed_url: p.snapshotURL || p.imageURL || null,
          media_url: p.snapshotURL || p.imageURL || null,
          category: "traffic",
        }
      })
      .filter((c): c is Cam => !!c)
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const bbox = req.nextUrl.searchParams.get("bbox") || undefined
  const parsedBbox = parseBbox(bbox)
  const [caltrans, wsdot, fdot, nysdot, nyctmc, txdot] = await Promise.all([
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.caltrans) ? pullCaltrans(parsedBbox) : Promise.resolve([]),
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.wsdot) ? pullWSDOT() : Promise.resolve([]),
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.fdot) ? pullFDOT() : Promise.resolve([]),
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.nysdot) ? pullNYSDOT() : Promise.resolve([]),
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.nyctmc) ? pullNYCTMC() : Promise.resolve([]),
    bboxIntersectsExtent(parsedBbox, PROVIDER_EXTENTS.txdot) ? pullTxDOT() : Promise.resolve([]),
  ])
  let cams = [...caltrans, ...wsdot, ...fdot, ...nysdot, ...nyctmc, ...txdot]
  if (parsedBbox) cams = cams.filter((c) => pointInBbox(c, parsedBbox))
  return NextResponse.json(
    {
      source: "state-dot-cctv",
      total: cams.length,
      by_provider: {
        caltrans: caltrans.length,
        wsdot: wsdot.length,
        fdot: fdot.length,
        nysdot: nysdot.length,
        nyctmc: nyctmc.length,
        txdot: txdot.length,
      },
      cams,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  )
}
