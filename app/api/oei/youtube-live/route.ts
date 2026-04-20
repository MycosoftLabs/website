import { NextRequest, NextResponse } from "next/server"

/**
 * YouTube Live — geospatial live broadcast search — Apr 20, 2026
 *
 * Cursor applied YOUTUBE_API_KEY (Google Cloud Console) to prod .env on
 * VM 187. This route uses YouTube Data API v3's `search?eventType=live`
 * plus `location` + `locationRadius` for geospatial live-broadcast
 * discovery — one of the few mainstream platforms that documents
 * official geo search.
 *
 * Query params:
 *   bbox=w,s,e,n   preferred; server computes centroid + max radius
 *   lat=, lng=, radiusKm=   alternative single-point form (radius 1-1000)
 *   q=             optional keyword filter
 *   maxResults=    default 50, hard cap 50 (YouTube API ceiling)
 *
 * Output shape (for direct consumption by Eagle Eye ephemeral layer):
 *   { source, total, live:[{ id, videoId, channelId, title, description,
 *                             thumbnailUrl, embedUrl, channelTitle,
 *                             publishedAt, lat, lng, location_confidence }] }
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  process.env.YOUTUBE_DATA_API_KEY ||
  ""

function bboxToLocationRadius(bbox: string): { location: string; locationRadius: string } | null {
  const [w, s, e, n] = bbox.split(",").map(Number)
  if (![w, s, e, n].every(Number.isFinite)) return null
  const lat = (n + s) / 2
  const lng = (e + w) / 2
  // Great-circle radius from centroid to corner (approx via equirectangular).
  const R = 6371 // km
  const dLat = ((n - lat) * Math.PI) / 180
  const dLng = ((e - lng) * Math.PI) / 180 * Math.cos((lat * Math.PI) / 180)
  const radiusKm = Math.min(1000, Math.max(1, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * R)))
  return { location: `${lat.toFixed(5)},${lng.toFixed(5)}`, locationRadius: `${radiusKm}km` }
}

export async function GET(req: NextRequest) {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      {
        source: "youtube-live",
        total: 0,
        live: [],
        error: "YOUTUBE_API_KEY not configured",
      },
      { status: 200 },
    )
  }

  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || ""
  const lat = url.searchParams.get("lat")
  const lng = url.searchParams.get("lng")
  const radiusKm = Number(url.searchParams.get("radiusKm") || 50)
  const q = url.searchParams.get("q") || ""
  const maxResults = Math.min(Number(url.searchParams.get("maxResults") || 50), 50)

  let location: string | null = null
  let locationRadius: string | null = null
  if (bbox) {
    const r = bboxToLocationRadius(bbox)
    if (r) {
      location = r.location
      locationRadius = r.locationRadius
    }
  } else if (lat && lng) {
    location = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`
    locationRadius = `${Math.min(1000, Math.max(1, Math.round(radiusKm)))}km`
  }

  if (!location || !locationRadius) {
    return NextResponse.json(
      {
        source: "youtube-live",
        total: 0,
        live: [],
        error: "bbox= or (lat=&lng=) required",
      },
      { status: 400 },
    )
  }

  try {
    const qp = new URLSearchParams({
      part: "snippet",
      type: "video",
      eventType: "live",
      location,
      locationRadius,
      maxResults: String(maxResults),
      key: YOUTUBE_API_KEY,
    })
    if (q) qp.set("q", q)

    const ytUrl = `https://www.googleapis.com/youtube/v3/search?${qp}`
    const res = await fetch(ytUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json(
        {
          source: "youtube-live",
          total: 0,
          live: [],
          error: `YouTube API ${res.status}: ${txt.slice(0, 200)}`,
        },
        { status: 200 },
      )
    }
    const data = await res.json()
    const items: any[] = data?.items || []
    // YouTube doesn't return exact lat/lng on the item in search results.
    // Centre point reported here is the query centroid, not the real
    // upload location — mark as inferred with location_confidence=0.45
    // ("platform place, not native"). For higher confidence, the UI can
    // follow-up with videos?part=recordingDetails per item to pull the
    // real lat/lng when present.
    const centreLat = Number(location.split(",")[0])
    const centreLng = Number(location.split(",")[1])
    const live = items
      .filter((i: any) => i.id?.videoId)
      .map((i: any) => ({
        id: `yt-${i.id.videoId}`,
        videoId: i.id.videoId,
        channelId: i.snippet?.channelId,
        title: i.snippet?.title,
        description: i.snippet?.description,
        thumbnailUrl:
          i.snippet?.thumbnails?.high?.url ||
          i.snippet?.thumbnails?.medium?.url ||
          i.snippet?.thumbnails?.default?.url ||
          null,
        embedUrl: `https://www.youtube.com/embed/${i.id.videoId}?autoplay=1&modestbranding=1`,
        channelTitle: i.snippet?.channelTitle,
        publishedAt: i.snippet?.publishedAt,
        lat: centreLat,
        lng: centreLng,
        location_confidence: 0.45, // platform-place centroid, not native
        provider: "youtube-live",
      }))

    return NextResponse.json(
      {
        source: "youtube-live",
        total: live.length,
        query: { location, locationRadius, q },
        live,
        generatedAt: new Date().toISOString(),
        note:
          "Live broadcast search via YouTube Data API v3. Lat/lng are the " +
          "query centroid (location_confidence=0.45). For native per-video " +
          "lat/lng (when present), follow up with videos?part=recordingDetails.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
          "X-Source": "youtube-data-v3",
        },
      },
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        source: "youtube-live",
        total: 0,
        live: [],
        error: err?.message || "fetch failed",
      },
      { status: 200 },
    )
  }
}
