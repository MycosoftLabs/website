import { NextRequest, NextResponse } from "next/server"

/**
 * Mastodon timeline connector — ephemeral video posts — Apr 20, 2026
 * (Eagle Eye Phase 3a)
 *
 * Mastodon exposes REST + streaming APIs. For polling-based ingest we
 * use /api/v1/timelines/public which returns the recent public
 * timeline for a given instance. We fan out across a few high-volume
 * instances (mastodon.social, mastodon.online, mastodon.world) +
 * filter to posts with video attachments.
 *
 * No auth required for public timelines.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INSTANCES = [
  "mastodon.social",
  "mastodon.online",
  "mastodon.world",
]

const PLACE_HINTS: Array<{ match: RegExp; lat: number; lng: number; name: string }> = [
  { match: /\b(san diego|sd)\b/i,            lat: 32.72, lng: -117.16, name: "San Diego" },
  { match: /\b(los angeles|la|hollywood)\b/i,lat: 34.05, lng: -118.24, name: "Los Angeles" },
  { match: /\b(san francisco|sf|bay area)\b/i,lat: 37.77,lng: -122.42, name: "San Francisco" },
  { match: /\b(new york|nyc|manhattan)\b/i,  lat: 40.71, lng: -74.00, name: "New York" },
  { match: /\b(chicago)\b/i,                 lat: 41.88, lng: -87.63, name: "Chicago" },
  { match: /\b(seattle)\b/i,                 lat: 47.61, lng: -122.33, name: "Seattle" },
  { match: /\b(austin)\b/i,                  lat: 30.27, lng: -97.74, name: "Austin" },
  { match: /\b(miami)\b/i,                   lat: 25.76, lng: -80.19, name: "Miami" },
  { match: /\b(london)\b/i,                  lat: 51.51, lng: -0.13, name: "London" },
  { match: /\b(paris)\b/i,                   lat: 48.86, lng: 2.35, name: "Paris" },
  { match: /\b(berlin)\b/i,                  lat: 52.52, lng: 13.40, name: "Berlin" },
  { match: /\b(tokyo)\b/i,                   lat: 35.68, lng: 139.69, name: "Tokyo" },
  { match: /\b(sydney)\b/i,                  lat: -33.87, lng: 151.21, name: "Sydney" },
]

function inferLocation(text: string): { lat: number; lng: number; name: string } | null {
  for (const hint of PLACE_HINTS) {
    if (hint.match.test(text)) return { lat: hint.lat, lng: hint.lng, name: hint.name }
  }
  return null
}

async function pullInstance(host: string): Promise<any[]> {
  try {
    const res = await fetch(`https://${host}/api/v1/timelines/public?limit=40&only_media=true`, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const posts: any[] = await res.json()
    return posts.filter((p: any) =>
      (p.media_attachments || []).some((m: any) => m.type === "video" || m.type === "gifv"),
    )
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const all = (await Promise.all(INSTANCES.map(pullInstance))).flat()
  const events = all
    .map((p: any) => {
      const content = (p.content || "").replace(/<[^>]+>/g, " ").slice(0, 240)
      const loc = inferLocation(content)
      if (!loc) return null
      const video = (p.media_attachments || []).find((m: any) => m.type === "video" || m.type === "gifv")
      return {
        id: `mastodon-${p.id}`,
        provider: "mastodon" as const,
        observed_at: p.created_at || new Date().toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        inference_confidence: 0.3,
        inferred_place: loc.name,
        text_context: content,
        thumbnail_url: video?.preview_url || null,
        embed_url: p.url || null,
        video_url: video?.url || null,
      }
    })
    .filter(Boolean) as any[]
  let filtered = events
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      filtered = events.filter((ev) => ev.lat >= s && ev.lat <= n && ev.lng >= w && ev.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "mastodon-public",
      total: filtered.length,
      raw_posts: all.length,
      instances: INSTANCES,
      events: filtered,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90" } },
  )
}
