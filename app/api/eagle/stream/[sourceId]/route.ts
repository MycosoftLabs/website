import { NextRequest, NextResponse } from "next/server"
import { caltransProxiedSnapshot, resolveCaltransHls } from "@/lib/crep/caltrans-hls-resolve"
import { normalizeYouTubeEmbedUrlSync } from "@/lib/crep/youtube-embed"

/**
 * Eagle Eye — stream URL resolver — Apr 20, 2026
 *
 * Given a video_source_id, returns a playable URL the browser can load
 * directly. For Shinobi monitors this is the /.m3u8 HLS stream via
 * MediaMTX on MAS 188 (Cursor deployed the container with ports 8554 /
 * 8889 / 1935 / 8888). For external providers (YouTube, EarthCam,
 * Windy) it returns an embed_url for iframe playback.
 *
 * Auth model:
 *   - Public sources (YouTube live, EarthCam public) → embed_url is
 *     unwrapped and served directly.
 *   - Shinobi / UniFi / private RTSP → proxied through MediaMTX which
 *     gates via its own tokens. Never exposes raw RTSP credentials to
 *     the client.
 *
 * Output:
 *   { id, provider, kind, stream_url | embed_url,
 *     stream_type: "hls" | "webrtc" | "iframe" | "mjpeg",
 *     expires_at? }
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

const MEDIAMTX_URL = process.env.MEDIAMTX_URL || "https://media.mycosoft.com"

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

/** MINDEX: GET /api/mindex/eagle/video-sources/{id} — one row, preferred path (Apr 17, 2026). */
async function fetchVideoSourceByIdFromMindex(sourceId: string): Promise<any | null> {
  const url = `${MINDEX_BASE}/api/mindex/eagle/video-sources/${encodeURIComponent(sourceId)}`
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...authHeaders() },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) return null
  const j = await res.json()
  if (j?.found === false || !j?.source) return null
  return j.source
}

// Last-resort: global bbox cache (fair provider ordering in MINDEX; still heavy).
interface SourcesCache { ts: number; rows: any[] }
let sourcesCache: SourcesCache = { ts: 0, rows: [] }
const SOURCES_TTL_MS = 60_000

async function getAllEagleVideoSourcesCached(): Promise<any[]> {
  const now = Date.now()
  if (sourcesCache.rows.length > 0 && now - sourcesCache.ts < SOURCES_TTL_MS) {
    return sourcesCache.rows
  }
  const url = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=10000&offset=0`
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...authHeaders() },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  })
  if (!res.ok) {
    return sourcesCache.rows
  }
  const j = await res.json()
  const rows: any[] = j?.entities || j?.features || j?.sources || []
  sourcesCache = { ts: now, rows }
  return rows
}

/**
 * Caltrans D11 / D12 ids encode the camera coordinates, e.g.
 *   caltrans-d11-32.69845,-117.18376
 * When the global cache misses, we parse the coord out and do a tight-bbox
 * MINDEX lookup instead of giving up. Returns null for ids that don't
 * match the coord pattern.
 */
async function fetchByCoordHintedId(sourceId: string): Promise<any | null> {
  const m = sourceId.match(/^([a-z0-9_-]+)-(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)$/)
  if (!m) return null
  const lat = parseFloat(m[2])
  const lng = parseFloat(m[3])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const pad = 0.002 // ~200 m bbox
  const url = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&lat_min=${lat - pad}&lat_max=${lat + pad}&lng_min=${lng - pad}&lng_max=${lng + pad}&limit=25`
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...authHeaders() },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  })
  if (!res.ok) return null
  const j = await res.json()
  const rows: any[] = j?.entities || j?.features || j?.sources || []
  return rows.find((r) => String(r.id) === sourceId) ?? rows[0] ?? null
}

// Map/entity results nest fields under properties{}; direct eagle/video-sources
// row is already flat. Normalize so the handler always reads the same shape.
function flattenSource(raw: any): any {
  const props = raw?.properties ?? {}
  return {
    id: raw.id ?? raw.source_id ?? props.source_id,
    source_id: raw.source_id ?? props.source_id,
    provider: raw.provider ?? props.provider ?? raw.source ?? "unknown",
    kind: raw.kind ?? props.kind ?? "permanent",
    stream_url: raw.stream_url ?? props.stream_url ?? null,
    embed_url: raw.embed_url ?? props.embed_url ?? null,
    media_url: raw.media_url ?? props.media_url ?? null,
    lat: raw.lat,
    lng: raw.lng,
    name: raw.name,
    properties: props,
  }
}

function deriveSurflineEmbed(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null
  const m = /surfline\.com\/surf-report\/[^/]+\/([a-f0-9]{16,})/i.exec(embedUrl)
  if (!m) return null
  return `https://www.surfline.com/embed-cam/${m[1]}?autoplay=1&mute=1&playsinline=1`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 })
  }
  const qEmbed = req.nextUrl.searchParams.get("embed_url")
  const qMedia = req.nextUrl.searchParams.get("media_url")
  try {
    // 1) MINDEX by-id (GET /eagle/video-sources/{id}) — O(1), no global bbox.
    // 2) Tight-bbox Caltrans / coord-hinted ids.
    // 3) Global layer cache (60 s) only as last resort.
    let raw: any = await fetchVideoSourceByIdFromMindex(sourceId)
    if (!raw) {
      raw = await fetchByCoordHintedId(sourceId)
    }
    if (!raw) {
      const allSources = await getAllEagleVideoSourcesCached()
      raw = allSources.find(
        (s: any) =>
          String(s.id) === sourceId ||
          String(s.source_id) === sourceId ||
          String(s?.properties?.source_id ?? "") === sourceId,
      )
    }
    const src = raw
      ? flattenSource(raw)
      : {
          id: sourceId,
          source_id: sourceId,
          provider: sourceId.startsWith("caltrans-")
            ? "caltrans"
            : sourceId.startsWith("surfline-")
              ? "surfline"
              : "unknown",
          kind: "permanent",
          stream_url: null,
          embed_url: qEmbed,
          media_url: qMedia,
        }

    if (!raw && !qEmbed && !qMedia) {
      return NextResponse.json({ error: "source not found", id: sourceId }, { status: 404 })
    }

    if (qEmbed && !src.embed_url) src.embed_url = qEmbed
    if (qMedia && !src.media_url) src.media_url = qMedia

    const provider = src.provider || "unknown"
    const kind = src.kind || "permanent"
    let streamUrl = (src.stream_url || "").trim()
    const isHls =
      streamUrl.length > 0 &&
      (streamUrl.toLowerCase().endsWith(".m3u8") || streamUrl.toLowerCase().includes(".m3u8?"))

    if (provider === "caltrans" && !isHls) {
      const resolved = await resolveCaltransHls({
        sourceId,
        stream_url: src.stream_url,
        embed_url: src.embed_url,
        media_url: src.media_url,
      })
      if (resolved) streamUrl = resolved
    }

    const resolvedHls =
      streamUrl.length > 0 &&
      (streamUrl.toLowerCase().endsWith(".m3u8") || streamUrl.toLowerCase().includes(".m3u8?"))

    if (resolvedHls) {
      const snapshot =
        provider === "caltrans"
          ? caltransProxiedSnapshot(src.embed_url, src.media_url)
          : null
      const needsProxy =
        provider === "caltrans" ||
        /cwwp2\.dot\.ca\.gov/i.test(streamUrl) ||
        /wzmedia\.dot\.ca\.gov/i.test(streamUrl)
      const playable =
        needsProxy && !streamUrl.startsWith("/api/eagle/hls-proxy")
          ? `/api/eagle/hls-proxy?url=${encodeURIComponent(streamUrl)}`
          : streamUrl
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: playable,
        snapshot_url: snapshot,
        stream_type: "hls",
      })
    }

    if (provider === "surfline" && src.embed_url) {
      const surfEmbed = deriveSurflineEmbed(String(src.embed_url))
      if (surfEmbed) {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          embed_url: surfEmbed,
          stream_type: "iframe",
        })
      }
    }

    // Shinobi → proxy through MediaMTX as HLS.
    if (provider === "shinobi" && src.stream_url) {
      const raw = String(src.stream_url)
      // If Shinobi already served an m3u8 absolute URL, use it. Otherwise
      // wrap with MediaMTX's HLS prefix (MediaMTX re-publishes RTSP as
      // HLS at /{path}/index.m3u8).
      const hlsUrl = raw.endsWith(".m3u8")
        ? raw
        : `${MEDIAMTX_URL}/shinobi/${encodeURIComponent(sourceId)}/index.m3u8`
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: hlsUrl,
        stream_type: "hls",
      })
    }

    // UniFi Protect / generic RTSP → wrap through MediaMTX WebRTC-WHEP for
    // low-latency operator view.
    if (provider === "unifi-protect" || (src.stream_url || "").startsWith("rtsp://")) {
      const whepUrl = `${MEDIAMTX_URL}/${encodeURIComponent(sourceId)}/whep`
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: whepUrl,
        stream_type: "webrtc",
      })
    }

    // Caltrans without HLS → proxied auto-refresh JPEG (better than vm/loc iframe).
    if (provider === "caltrans") {
      const snap = caltransProxiedSnapshot(src.embed_url, src.media_url)
      if (snap) {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          stream_url: snap,
          embed_url: src.embed_url,
          stream_type: "snapshot",
        })
      }
    }

    // Direct embed URL (YouTube, Twitch, Vimeo, EarthCam, Windy, etc.)
    if (src.embed_url) {
      const yt = normalizeYouTubeEmbedUrlSync(String(src.embed_url))
      const embed_url = yt || src.embed_url
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        embed_url,
        stream_type: "iframe",
      })
    }

    // Proxied still-frame (Caltrans / state DOT JPEG refresh).
    if (src.media_url && /\/api\/eagle\/cam-image/i.test(String(src.media_url))) {
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: src.media_url,
        embed_url: src.embed_url,
        stream_type: "snapshot",
      })
    }

    // Fallback to whatever media_url we have.
    if (src.media_url) {
      const media = String(src.media_url)
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: media,
        stream_type: media.endsWith(".m3u8")
          ? "hls"
          : media.endsWith(".mpg") || media.endsWith(".mpeg") || media.endsWith(".mjpg")
          ? "mjpeg"
          : "iframe",
      })
    }

    return NextResponse.json(
      { error: "no playable URL on source", id: sourceId, provider, kind },
      { status: 404 },
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "resolver failed" },
      { status: 500 },
    )
  }
}
