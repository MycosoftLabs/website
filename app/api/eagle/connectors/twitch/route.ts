import { NextRequest, NextResponse } from "next/server"

/**
 * Twitch live streams connector — Eagle Eye Phase 3b — Apr 20, 2026
 *
 * Morgan added TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET env vars. Twitch's
 * Helix API requires an app-access-token (OAuth client-credentials
 * flow), then /streams returns currently-live streams filtered by
 * game, language, or user login. No native geo, but many streams self-
 * tag a location in title/tags that we extract client-side.
 *
 * For CREP, we pull the top 100 live streams globally (optionally
 * filtered by game like "Just Chatting" or "IRL"), attempt location
 * inference from title + tags, and surface them on the ephemeral plane
 * with confidence=0.3.
 *
 * Token cached in-memory for 1 h (tokens last 60 days but we refresh
 * aggressively to survive deploys).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CLIENT_ID = process.env.TWITCH_CLIENT_ID || ""
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || ""

let tokenCache: { value: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const j = await res.json()
    if (!j.access_token) return null
    tokenCache = {
      value: j.access_token,
      expiresAt: Date.now() + Math.min((j.expires_in || 3600) * 1000 * 0.9, 3600_000),
    }
    return tokenCache.value
  } catch { return null }
}

const PLACE_HINTS: Array<{ match: RegExp; lat: number; lng: number; name: string }> = [
  { match: /\b(san diego|sd|coronado)\b/i,   lat: 32.72, lng: -117.16, name: "San Diego" },
  { match: /\b(los angeles|\bla\b|hollywood)\b/i, lat: 34.05, lng: -118.24, name: "Los Angeles" },
  { match: /\b(san francisco|\bsf\b|bay area)\b/i, lat: 37.77, lng: -122.42, name: "San Francisco" },
  { match: /\b(new york|\bnyc\b|manhattan|brooklyn)\b/i, lat: 40.71, lng: -74.00, name: "New York" },
  { match: /\b(chicago)\b/i,                 lat: 41.88, lng: -87.63, name: "Chicago" },
  { match: /\b(seattle)\b/i,                 lat: 47.61, lng: -122.33, name: "Seattle" },
  { match: /\b(austin)\b/i,                  lat: 30.27, lng: -97.74, name: "Austin" },
  { match: /\b(denver)\b/i,                  lat: 39.74, lng: -104.99, name: "Denver" },
  { match: /\b(miami)\b/i,                   lat: 25.76, lng: -80.19, name: "Miami" },
  { match: /\b(las vegas|\bvegas\b)\b/i,     lat: 36.17, lng: -115.14, name: "Las Vegas" },
  { match: /\b(london)\b/i,                  lat: 51.51, lng: -0.13, name: "London" },
  { match: /\b(paris)\b/i,                   lat: 48.86, lng: 2.35, name: "Paris" },
  { match: /\b(berlin)\b/i,                  lat: 52.52, lng: 13.40, name: "Berlin" },
  { match: /\b(tokyo)\b/i,                   lat: 35.68, lng: 139.69, name: "Tokyo" },
  { match: /\b(sydney)\b/i,                  lat: -33.87, lng: 151.21, name: "Sydney" },
  { match: /\b(amsterdam)\b/i,               lat: 52.37, lng: 4.90, name: "Amsterdam" },
  { match: /\b(seoul)\b/i,                   lat: 37.57, lng: 126.98, name: "Seoul" },
  { match: /\b(toronto)\b/i,                 lat: 43.65, lng: -79.38, name: "Toronto" },
  { match: /\b(mexico city|cdmx)\b/i,        lat: 19.43, lng: -99.13, name: "Mexico City" },
  { match: /\b(rio|rio de janeiro)\b/i,      lat: -22.91, lng: -43.17, name: "Rio de Janeiro" },
]

function inferLocation(text: string): { lat: number; lng: number; name: string } | null {
  for (const h of PLACE_HINTS) if (h.match.test(text)) return { lat: h.lat, lng: h.lng, name: h.name }
  return null
}

export async function GET(req: NextRequest) {
  const token = await getAppToken()
  if (!token) {
    return NextResponse.json(
      { source: "twitch", total: 0, live: [], error: "TWITCH_CLIENT_ID/SECRET not configured or auth failed" },
      { status: 200 },
    )
  }
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const gameFilter = url.searchParams.get("game_id")
  const langFilter = url.searchParams.get("lang") || "en"

  try {
    const qp = new URLSearchParams({ first: "100" })
    if (gameFilter) qp.set("game_id", gameFilter)
    if (langFilter) qp.set("language", langFilter)
    const res = await fetch(`https://api.twitch.tv/helix/streams?${qp}`, {
      headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json({ source: "twitch", total: 0, live: [], error: `Twitch ${res.status}: ${txt.slice(0, 200)}` }, { status: 200 })
    }
    const j = await res.json()
    const items: any[] = j?.data || []
    const live = items
      .map((s: any) => {
        const text = `${s.title || ""} ${(s.tags || []).join(" ")}`
        const loc = inferLocation(text)
        if (!loc) return null
        return {
          id: `twitch-${s.id}`,
          provider: "twitch-live" as const,
          videoId: s.id,
          userLogin: s.user_login,
          channelTitle: s.user_name,
          title: s.title,
          gameName: s.game_name,
          viewerCount: s.viewer_count,
          thumbnailUrl: s.thumbnail_url?.replace("{width}", "480").replace("{height}", "270") || null,
          embedUrl: `https://player.twitch.tv/?channel=${s.user_login}&parent=mycosoft.com&muted=true`,
          publishedAt: s.started_at,
          lat: loc.lat,
          lng: loc.lng,
          inferred_place: loc.name,
          location_confidence: 0.3,
        }
      })
      .filter(Boolean) as any[]
    let filtered = live
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number)
      if ([w, s, e, n].every(Number.isFinite)) {
        filtered = live.filter((x) => x.lat >= s && x.lat <= n && x.lng >= w && x.lng <= e)
      }
    }
    return NextResponse.json(
      {
        source: "twitch",
        total: filtered.length,
        total_live: items.length,
        live: filtered,
        note: "Location inferred from title + tags (confidence 0.3). Twitch has no native geo.",
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" } },
    )
  } catch (err: any) {
    return NextResponse.json({ source: "twitch", total: 0, live: [], error: err?.message || "fetch failed" }, { status: 200 })
  }
}
