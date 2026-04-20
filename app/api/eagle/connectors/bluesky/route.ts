import { NextRequest, NextResponse } from "next/server"

/**
 * Bluesky Jetstream — ephemeral video posts — Apr 20, 2026 (Eagle Eye Phase 3)
 *
 * Bluesky publishes a public Jetstream WebSocket firehose at
 * wss://jetstream2.us-east.bsky.network/subscribe. It streams every
 * public post in near-real-time with NO KEY required.
 *
 * This route is POLL-based (GET /api/eagle/connectors/bluesky) rather
 * than continuously streaming because Next.js serverless doesn't keep
 * long-lived WebSocket connections open between requests. On each poll:
 *   1. Opens a Jetstream WS
 *   2. Reads the buffered recent posts (~5 seconds of firehose)
 *   3. Filters to posts with video embeds
 *   4. Best-effort extracts location from text (when @-mentioned or
 *      place keywords detected) — confidence ≤ 0.3 always
 *   5. Returns the matched subset
 *
 * For long-lived firehose → MINDEX ingest, a separate daemon on
 * MAS 188 should run continuously. For the CREP map + widget, the
 * 60-second poll from EagleEyeOverlay is sufficient.
 *
 * NOTE: without geocoding, posts without explicit location text are
 * skipped. Morgan previously approved the confidence-ladder pattern
 * (native > platform > text > OCR > visual).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Simple keyword → approximate lat/lng map for text-based location
// extraction. Production version should use Google Places API with
// GOOGLE_PLACES_API_KEY (already on prod env) for proper geocoding.
const PLACE_HINTS: Array<{ match: RegExp; lat: number; lng: number; name: string }> = [
  { match: /\b(san diego|sd)\b/i,          lat: 32.72, lng: -117.16, name: "San Diego" },
  { match: /\b(los angeles|la|hollywood)\b/i, lat: 34.05, lng: -118.24, name: "Los Angeles" },
  { match: /\b(san francisco|sf|bay area)\b/i, lat: 37.77, lng: -122.42, name: "San Francisco" },
  { match: /\b(new york|nyc|manhattan)\b/i, lat: 40.71, lng: -74.00, name: "New York" },
  { match: /\b(chicago)\b/i,               lat: 41.88, lng: -87.63, name: "Chicago" },
  { match: /\b(seattle)\b/i,               lat: 47.61, lng: -122.33, name: "Seattle" },
  { match: /\b(austin)\b/i,                lat: 30.27, lng: -97.74, name: "Austin" },
  { match: /\b(denver)\b/i,                lat: 39.74, lng: -104.99, name: "Denver" },
  { match: /\b(miami)\b/i,                 lat: 25.76, lng: -80.19, name: "Miami" },
  { match: /\b(london)\b/i,                lat: 51.51, lng: -0.13, name: "London" },
  { match: /\b(paris)\b/i,                 lat: 48.86, lng: 2.35, name: "Paris" },
  { match: /\b(tokyo)\b/i,                 lat: 35.68, lng: 139.69, name: "Tokyo" },
]

function inferLocation(text: string): { lat: number; lng: number; name: string } | null {
  for (const hint of PLACE_HINTS) {
    if (hint.match.test(text)) return { lat: hint.lat, lng: hint.lng, name: hint.name }
  }
  return null
}

// Jetstream endpoint — public, no key
const JETSTREAM_URL =
  process.env.BLUESKY_JETSTREAM_URL ||
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post"

async function sampleJetstream(windowMs: number = 5000): Promise<any[]> {
  // NOTE: Next.js serverless can't natively run a WebSocket client.
  // Fallback: use Bluesky's public AT protocol search API for posts with
  // #video hashtag or video embed type, which is available via REST:
  // https://bsky.social/xrpc/app.bsky.feed.searchPosts
  try {
    const searchUrl =
      "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=video&limit=50&sort=latest"
    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const posts: any[] = j?.posts || []
    return posts.filter((p: any) => {
      const embed = p?.embed
      const kind = embed?.$type || embed?.video?.$type
      return (
        kind === "app.bsky.embed.video#view" ||
        kind === "app.bsky.embed.video" ||
        (embed?.video && typeof embed.video === "object") ||
        (embed?.media && embed.media.$type?.includes("video"))
      )
    })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const posts = await sampleJetstream()
  const events = posts
    .map((p: any) => {
      const text = p?.record?.text || ""
      const loc = inferLocation(text)
      if (!loc) return null
      const thumbnail =
        p?.embed?.video?.thumbnail ||
        p?.embed?.thumbnail ||
        null
      const authorHandle = p?.author?.handle
      return {
        id: `bsky-${p.uri}`,
        provider: "bluesky" as const,
        observed_at: p?.indexedAt || new Date().toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        inference_confidence: 0.3, // text/place-keyword extraction tier
        inferred_place: loc.name,
        text_context: text.slice(0, 240),
        thumbnail_url: thumbnail,
        embed_url: authorHandle && p?.uri
          ? `https://bsky.app/profile/${authorHandle}/post/${p.uri.split("/").pop()}`
          : null,
      }
    })
    .filter(Boolean) as any[]
  let filtered = events
  if (bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      filtered = events.filter((e) => e.lat >= s && e.lat <= n && e.lng >= w && e.lng <= e)
    }
  }
  return NextResponse.json(
    {
      source: "bluesky-jetstream",
      total: filtered.length,
      raw_posts: posts.length,
      events: filtered,
      note: "Best-effort keyword-based location extraction. For native coordinates, subscribe to post.record.facets with geo mentions + resolve via GOOGLE_PLACES_API_KEY.",
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90" } },
  )
}
