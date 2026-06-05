import { NextRequest, NextResponse } from "next/server"
import {
  normalizeYouTubeEmbedUrlSync,
  YOUTUBE_HANDLE_CHANNEL_IDS,
  isYouTubeUrl,
} from "@/lib/crep/youtube-embed"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  process.env.YOUTUBE_DATA_API_KEY ||
  ""

interface CacheEntry { embed_url: string; ts: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000

function cacheKey(url: string): string {
  return url.trim().toLowerCase()
}

function appendEmbedParams(base: string): string {
  try {
    const u = new URL(base)
    u.searchParams.set("autoplay", "1")
    u.searchParams.set("mute", "1")
    u.searchParams.set("playsinline", "1")
    u.searchParams.set("rel", "0")
    u.searchParams.set("modestbranding", "1")
    return u.toString()
  } catch {
    return base
  }
}

function extractChannelId(raw: string): string | null {
  const match = /[?&]channel=((?:UC|HC)[\w-]{20,})/i.exec(raw)
  return match?.[1] || null
}

function isDirectVideoEmbed(raw: string): boolean {
  return (
    /youtube(?:-nocookie)?\.com\/embed\/(?!live_stream)([a-zA-Z0-9_-]{11})(?:\?|$)/i.test(raw) ||
    /[?&]v=([a-zA-Z0-9_-]{11})/i.test(raw) ||
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i.test(raw) ||
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i.test(raw)
  )
}

async function resolveHandleViaApi(handle: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null
  const qp = new URLSearchParams({
    part: "id",
    forHandle: handle,
    key: YOUTUBE_API_KEY,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${qp}`, {
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const data = await res.json()
  const channelId = data?.items?.[0]?.id as string | undefined
  if (!channelId?.startsWith("UC")) return null
  return channelId
}

async function resolveLiveVideoViaApi(channelId: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null
  const qp = new URLSearchParams({
    part: "id",
    channelId,
    eventType: "live",
    type: "video",
    maxResults: "1",
    key: YOUTUBE_API_KEY,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${qp}`, {
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: 120 },
  })
  if (!res.ok) return null
  const data = await res.json()
  const videoId = data?.items?.[0]?.id?.videoId as string | undefined
  if (!videoId) return null
  return appendEmbedParams(`https://www.youtube.com/embed/${videoId}`)
}

async function resolveYouTubeEmbed(raw: string): Promise<string | null> {
  const sync = normalizeYouTubeEmbedUrlSync(raw)
  if (!isYouTubeUrl(raw)) return null

  if (sync && isDirectVideoEmbed(raw)) return sync

  const syncChannelId = sync ? extractChannelId(sync) : null
  let channelId = syncChannelId || extractChannelId(raw)

  const handleMatch = /youtube\.com\/@([\w.-]+)/i.exec(raw)
  const handle = handleMatch?.[1]
  if (!channelId && handle) {
    const handleKey = handle.replace(/\./g, "").toLowerCase()
    channelId =
      YOUTUBE_HANDLE_CHANNEL_IDS[handleKey] ||
      (await resolveHandleViaApi(handle))
  }

  if (!channelId?.startsWith("UC")) return sync

  const liveVideoEmbed = await resolveLiveVideoViaApi(channelId)
  if (liveVideoEmbed) return liveVideoEmbed

  return sync || appendEmbedParams(`https://www.youtube.com/embed/live_stream?channel=${channelId}`)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url") || ""
  if (!url || !isYouTubeUrl(url)) {
    return NextResponse.json({ embed_url: null, error: "not a YouTube URL" }, { status: 400 })
  }

  const key = cacheKey(url)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { embed_url: hit.embed_url, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    )
  }

  try {
    const embed_url = await resolveYouTubeEmbed(url)
    if (embed_url) cache.set(key, { embed_url, ts: Date.now() })
    return NextResponse.json(
      { embed_url, cached: false },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "resolve failed"
    return NextResponse.json({ embed_url: null, error: message }, { status: 200 })
  }
}
