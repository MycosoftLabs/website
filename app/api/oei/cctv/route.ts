import { NextRequest, NextResponse } from "next/server"

/**
 * CCTV / Webcam feeds — Apr 20, 2026
 *
 * Morgan: "where are all cctv and widgets showing live streams from those
 * accessible cctv and webcams". Cursor deployed Shinobi on MAS VM 188 and
 * created the MINDEX table `crep.cctv_cameras` (schema + bbox + ingest
 * endpoints). This proxy stitches the two together:
 *
 *   1. MINDEX bbox query  (/api/mindex/earth/map/bbox?layer=cctv_cameras)
 *      — canonical source, Shinobi / Insecam / UniFi Protect seed rows
 *   2. Shinobi LAN API    (MAS_VM:8080) — OPTIONAL: add live monitor list
 *      from the Shinobi instance if reachable. Currently no-op until
 *      SHINOBI_API_KEY env var is set.
 *
 * Response shape (what the client overlay + widget consume):
 *   {
 *     source, total, by_type,
 *     cameras: [{ id, name, lat, lng, stream_url, stream_type, operator,
 *                 country, resolution, auth_required, source, timestamp }]
 *   }
 *
 * Graceful empty — if neither source returns data, filter toggle in CREP
 * still works (layer renders empty, no error).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Camera = {
  id: string
  name: string | null
  lat: number
  lng: number
  /** rtsp:// / https:// / m3u8 URL */
  stream_url: string | null
  /** "rtsp" | "hls" | "mjpeg" | "webrtc" | "snapshot" */
  stream_type: string | null
  operator: string | null
  country: string | null
  resolution: string | null
  auth_required: boolean
  source: string
  timestamp: string | null
}

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

const SHINOBI_URL = process.env.SHINOBI_URL || "http://192.168.0.188:8080"
const SHINOBI_API_KEY = process.env.SHINOBI_API_KEY
const SHINOBI_GROUP_KEY = process.env.SHINOBI_GROUP_KEY

// ─── Source 1: MINDEX ─────────────────────────────────────────────────────
async function fromMindex(bbox?: string): Promise<Camera[]> {
  try {
    const qp = new URLSearchParams({ layer: "cctv_cameras", limit: "10000" })
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number)
      if ([w, s, e, n].every(Number.isFinite)) {
        qp.set("lat_min", String(s))
        qp.set("lat_max", String(n))
        qp.set("lng_min", String(w))
        qp.set("lng_max", String(e))
      }
    }
    const res = await fetch(`${MINDEX_BASE}/api/mindex/earth/map/bbox?${qp}`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": process.env.MINDEX_API_KEY || "local-dev-key",
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.entities || j?.features || j?.cameras || []
    return items
      .map((c: any) => {
        const lat = c.lat ?? c.latitude ?? c.geometry?.coordinates?.[1]
        const lng = c.lng ?? c.longitude ?? c.geometry?.coordinates?.[0]
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return {
          id: String(c.id ?? `mindex-${lat}-${lng}`),
          name: c.name ?? null,
          lat: Number(lat),
          lng: Number(lng),
          stream_url: c.stream_url ?? c.streamUrl ?? null,
          stream_type: c.stream_type ?? c.type ?? null,
          operator: c.operator ?? null,
          country: c.country ?? null,
          resolution: c.resolution ?? null,
          auth_required: Boolean(c.auth_required ?? false),
          source: c.source || "mindex",
          timestamp: c.updated_at || c.timestamp || null,
        } as Camera
      })
      .filter((x): x is Camera => !!x)
  } catch {
    return []
  }
}

// ─── Source 2: Shinobi LAN ────────────────────────────────────────────────
// Shinobi exposes /{API_KEY}/monitor/{GROUP_KEY} which returns monitor JSON.
// Each monitor has `details` (stringified JSON), `id`, `name`, `snapshot`,
// `streams`. We extract the public stream URL + location metadata (stored
// in the optional `details.crep_lat` / `crep_lng` fields by convention).
async function fromShinobi(): Promise<Camera[]> {
  if (!SHINOBI_API_KEY || !SHINOBI_GROUP_KEY) return []
  try {
    const url = `${SHINOBI_URL}/${SHINOBI_API_KEY}/monitor/${SHINOBI_GROUP_KEY}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = Array.isArray(j) ? j : j?.monitors || []
    return items
      .map((m: any) => {
        let details: any = {}
        try { details = typeof m.details === "string" ? JSON.parse(m.details) : (m.details || {}) } catch {}
        const lat = Number(details.crep_lat ?? details.lat ?? m.lat)
        const lng = Number(details.crep_lng ?? details.lng ?? m.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        // Build an HLS URL from Shinobi's stream endpoint (first stream).
        const streamPath = (m.streams && m.streams[0]) || null
        const streamUrl = streamPath
          ? `${SHINOBI_URL}${streamPath}`
          : (m.snapshot || null)
        return {
          id: `shinobi-${m.mid || m.id}`,
          name: m.name || null,
          lat,
          lng,
          stream_url: streamUrl,
          stream_type: streamPath ? "hls" : "snapshot",
          operator: details.operator || "Shinobi",
          country: details.country || null,
          resolution: details.resolution || null,
          auth_required: Boolean(details.auth_required),
          source: "shinobi-mas",
          timestamp: m.updated_at || null,
        } as Camera
      })
      .filter((x): x is Camera => !!x)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)

  const [mindex, shinobi] = await Promise.all([fromMindex(bbox), fromShinobi()])

  // Dedup by 5-decimal grid (1 m) — same physical camera from Shinobi should
  // override MINDEX's cached row (Shinobi is live).
  const seen = new Map<string, Camera>()
  for (const c of mindex) seen.set(`${c.lat.toFixed(5)},${c.lng.toFixed(5)}`, c)
  for (const c of shinobi) seen.set(`${c.lat.toFixed(5)},${c.lng.toFixed(5)}`, c)
  const cameras = Array.from(seen.values()).slice(0, limit)

  const byType: Record<string, number> = {}
  for (const c of cameras) {
    const k = c.stream_type || "unknown"
    byType[k] = (byType[k] || 0) + 1
  }

  return NextResponse.json(
    {
      source: "cctv-multi",
      total: cameras.length,
      by_type: byType,
      sources: { mindex: mindex.length, shinobi: shinobi.length },
      cameras,
      generatedAt: new Date().toISOString(),
      note:
        cameras.length === 0
          ? "Camera registry empty. Seed via Insecam / UniFi Protect / manual Shinobi monitors (docs/DATASETS.md §CCTV)."
          : "Union of MINDEX (crep.cctv_cameras) + Shinobi on MAS VM (192.168.0.188:8080).",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Source": "mindex+shinobi",
      },
    },
  )
}
