import { NextRequest, NextResponse } from "next/server"

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 })
  }
  try {
    // Lookup source via MINDEX
    const lookupUrl = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&id=${encodeURIComponent(sourceId)}&limit=1`
    const res = await fetch(lookupUrl, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `MINDEX ${res.status}` }, { status: 502 })
    }
    const j = await res.json()
    const src = (j?.entities || j?.features || j?.sources || [])[0]
    if (!src) {
      return NextResponse.json({ error: "source not found" }, { status: 404 })
    }

    const provider = src.provider || "unknown"
    const kind = src.kind || "permanent"

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

    // Direct embed URL (YouTube, Twitch, Vimeo, EarthCam, Windy, etc.)
    if (src.embed_url) {
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        embed_url: src.embed_url,
        stream_type: "iframe",
      })
    }

    // Fallback to whatever media_url we have.
    if (src.media_url) {
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: src.media_url,
        stream_type: src.media_url.endsWith(".m3u8")
          ? "hls"
          : src.media_url.endsWith(".mpg") || src.media_url.endsWith(".mpeg") || src.media_url.endsWith(".mjpg")
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
