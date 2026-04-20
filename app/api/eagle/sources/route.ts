import { NextRequest, NextResponse } from "next/server"

/**
 * Eagle Eye — Video source registry (permanent cameras) — Apr 20, 2026
 *
 * Queries MINDEX `eagle.video_sources` (Cursor migration ab4781b applied
 * on VM 189) for bbox-scoped permanent camera sources. Registered/static-
 * location feeds only: Shinobi, 511 traffic cams, Windy, EarthCam,
 * Webcamtaxi, NPS, USGS.
 *
 * Shape:
 *   { source, total, by_provider, by_kind,
 *     sources: [{ id, kind, provider, stable_location, lat, lng,
 *                 location_confidence, stream_url, embed_url, media_url,
 *                 source_status, permissions, updated_at }] }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type VideoSource = {
  id: string
  kind: "permanent" | "ephemeral"
  provider: string
  stable_location: boolean
  lat: number
  lng: number
  location_confidence: number | null
  stream_url: string | null
  embed_url: string | null
  media_url: string | null
  source_status: string | null
  permissions: Record<string, unknown> | null
  updated_at: string | null
}

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (MINDEX_API_KEY) return { "X-API-Key": MINDEX_API_KEY }
  return {}
}

async function fromMindex(
  bbox: string | undefined,
  kind: string | undefined,
  provider: string | undefined,
  limit: number,
): Promise<VideoSource[]> {
  try {
    const qp = new URLSearchParams({ layer: "eagle_video_sources", limit: String(limit) })
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number)
      if ([w, s, e, n].every(Number.isFinite)) {
        qp.set("lat_min", String(s))
        qp.set("lat_max", String(n))
        qp.set("lng_min", String(w))
        qp.set("lng_max", String(e))
      }
    }
    if (kind) qp.set("kind", kind)
    if (provider) qp.set("provider", provider)

    const res = await fetch(`${MINDEX_BASE}/api/mindex/earth/map/bbox?${qp}`, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j?.entities || j?.features || j?.sources || []
    return items
      .map((c: any) => {
        const lat = c.lat ?? c.latitude ?? c.geometry?.coordinates?.[1]
        const lng = c.lng ?? c.longitude ?? c.geometry?.coordinates?.[0]
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        return {
          id: String(c.id ?? `${lat}-${lng}`),
          kind: (c.kind || "permanent") as VideoSource["kind"],
          provider: c.provider || "unknown",
          stable_location: c.stable_location !== false,
          lat: Number(lat),
          lng: Number(lng),
          location_confidence: c.location_confidence ?? null,
          stream_url: c.stream_url ?? null,
          embed_url: c.embed_url ?? null,
          media_url: c.media_url ?? null,
          source_status: c.source_status ?? null,
          permissions: c.permissions ?? null,
          updated_at: c.updated_at ?? c.timestamp ?? null,
        } as VideoSource
      })
      .filter((x): x is VideoSource => !!x)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const kind = url.searchParams.get("kind") || undefined
  const provider = url.searchParams.get("provider") || undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)

  const sources = await fromMindex(bbox, kind, provider, limit)

  const byProvider: Record<string, number> = {}
  const byKind: Record<string, number> = {}
  for (const s of sources) {
    byProvider[s.provider] = (byProvider[s.provider] || 0) + 1
    byKind[s.kind] = (byKind[s.kind] || 0) + 1
  }

  return NextResponse.json(
    {
      source: "eagle-video-sources",
      total: sources.length,
      by_provider: byProvider,
      by_kind: byKind,
      sources,
      generatedAt: new Date().toISOString(),
      note:
        sources.length === 0
          ? "eagle.video_sources is empty. Seed via /api/eagle/ingest/video_sources (Shinobi monitors, 511 cams, Windy, EarthCam, etc.)"
          : undefined,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Source": "mindex-eagle",
      },
    },
  )
}
