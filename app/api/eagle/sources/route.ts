import { NextRequest, NextResponse } from "next/server"

/**
 * Eagle Eye — Video source registry (permanent cameras) — Apr 20, 2026 v2
 *
 * Queries MINDEX `eagle.video_sources` (Cursor migration ab4781b applied
 * on VM 189) for bbox-scoped permanent camera sources.
 *
 * v2 (Apr 20, 2026 pm): Morgan — "why dont i see live streams from
 * ustream and all webcams surf cams traffic cams already as icons on
 * map ucsd fire cams in san diego ... that should be found in all
 * sources globally and added to eagle eye".
 *
 * MINDEX eagle.video_sources is still being seeded by Cursor (Shinobi
 * sync blocked on super.json credential retrieval), so this endpoint
 * now ALSO fans out to every connector directly when MINDEX returns
 * fewer than MIN_SOURCES rows. That way Eagle Eye cameras populate
 * right now — Windy + EarthCam + NPS + USGS + ALERTWildfire + HPWREN +
 * Surfline + 511 traffic + Shinobi (if creds set). MINDEX continues to
 * be the "warm cache" path; live fan-out is the backup.
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

// When MINDEX is under this count we fan out to live connectors too.
// Covers the "empty MINDEX cold start" case while the Shinobi sync is
// still being wired by Cursor.
const MIN_SOURCES = 50

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

// Live connector fan-out. Invoked when MINDEX is empty so the user
// sees cameras on the map RIGHT NOW instead of waiting for the Shinobi
// ingest cron. Each connector is self-isolated.
async function fromLiveConnectors(origin: string, bbox: string | undefined): Promise<VideoSource[]> {
  const qp = bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""
  const endpoints = [
    `${origin}/api/eagle/connectors/public-webcams${qp}`,
    `${origin}/api/eagle/connectors/traffic-511${qp}`,
    `${origin}/api/eagle/connectors/shinobi${qp}`,
    // Apr 20, 2026 — state DOT CCTV networks (Caltrans + WSDOT + FDOT +
    // 511NY + TxDOT) add ~8,000 cameras across CA/WA/FL/NY/TX. Morgan:
    // "so many cctv streaming vodeo services web cams public cams missing
    // from map". Fan-out fetches each DOT in parallel; bbox-filters
    // per-endpoint to keep the response size bounded.
    `${origin}/api/eagle/connectors/state-dot-cctv${qp}`,
    // Apr 20, 2026 — US-MX southern border ports of entry + CBP live
    // wait times. Morgan: "the tijuana boarder needs massive amount of
    // added data". 19 ports of entry across CA/AZ/NM/TX with live CBP
    // delay minutes per lane (POV / commercial / pedestrian).
    `${origin}/api/eagle/connectors/border-crossing${qp}`,
  ]
  // Apr 20, 2026 hotfix (Morgan: "where are all the cameras icons and feeds
  // on crep add them now"). Probed: state-dot-cctv takes ~10 s on cold cache
  // (12 Caltrans districts + WSDOT + FDOT + 511NY + TxDOT in parallel).
  // 15 s timeout was borderline — when the route compile cache was cold the
  // call frequently timed out and Caltrans D11 (200+ SD cams) never reached
  // the overlay. Bumped to 35 s so we always wait for the slow connector.
  // Each connector still has its own internal timeouts; this only widens
  // our patience for them to respond.
  const responses = await Promise.all(
    endpoints.map((u) =>
      fetch(u, { signal: AbortSignal.timeout(35_000) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ),
  )
  const out: VideoSource[] = []
  for (const j of responses) {
    if (!j) continue
    const items: any[] = j.cams || j.sources || j.monitors || []
    for (const c of items) {
      const lat = c.lat ?? c.latitude
      const lng = c.lng ?? c.longitude
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) continue
      out.push({
        id: String(c.id || `${c.provider}-${lat}-${lng}`),
        kind: "permanent",
        provider: c.provider || "public-webcam",
        stable_location: true,
        lat: Number(lat),
        lng: Number(lng),
        location_confidence: 1.0,
        stream_url: c.stream_url ?? null,
        embed_url: c.embed_url ?? null,
        media_url: c.media_url ?? null,
        source_status: c.source_status ?? "online",
        permissions: c.permissions ?? { access: "public" },
        updated_at: c.updated_at ?? null,
      })
    }
  }
  return out
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const kind = url.searchParams.get("kind") || undefined
  const provider = url.searchParams.get("provider") || undefined
  const limit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)
  const skipLive = url.searchParams.get("live") === "0"

  let sources = await fromMindex(bbox, kind, provider, limit)
  let liveUsed = false

  // MINDEX empty or sparse → fall back to live connector fan-out so the
  // map shows SOMETHING right now instead of being silently empty.
  if (!skipLive && sources.length < MIN_SOURCES) {
    const origin = new URL(req.url).origin
    const live = await fromLiveConnectors(origin, bbox)
    if (live.length) {
      // Dedup by provider+id to avoid double-render when MINDEX partially
      // seeded from the same connectors.
      const seen = new Set(sources.map((s) => `${s.provider}:${s.id}`))
      for (const s of live) {
        const key = `${s.provider}:${s.id}`
        if (!seen.has(key)) { sources.push(s); seen.add(key) }
      }
      liveUsed = true
    }
  }

  // Filter by kind/provider if requested (MINDEX already filtered; live
  // doesn't — apply post-filter here).
  if (kind) sources = sources.filter((s) => s.kind === kind)
  if (provider) sources = sources.filter((s) => s.provider === provider)

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
      live_fanout_used: liveUsed,
      note: liveUsed
        ? "MINDEX sparse → fanned out to connectors (public-webcams + 511 + shinobi)"
        : undefined,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Source": liveUsed ? "mindex-eagle+live-fanout" : "mindex-eagle",
      },
    },
  )
}
