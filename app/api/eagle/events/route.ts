import { NextRequest, NextResponse } from "next/server"

/**
 * Eagle Eye — Ephemeral video events (social clips) — Apr 20, 2026
 *
 * Queries MINDEX `eagle.video_events` for bbox + time-window-scoped
 * ephemeral observations — YouTube Live hits, Bluesky/Mastodon video
 * posts, X geo-placed media, TikTok research clips, etc. Each event has
 * a confidence-scored inferred place so the UI can badge "Native lat/lng"
 * vs "Platform place" vs "OCR extracted" vs "Visual geolocation".
 *
 * Default time window: last 6 h (configurable via ?since=ISO or
 * ?hoursBack=N).
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

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const bbox = url.searchParams.get("bbox") || undefined
  const sinceStr = url.searchParams.get("since")
  const untilStr = url.searchParams.get("until")
  const hoursBack = Number(url.searchParams.get("hoursBack") || 6)
  const limit = Math.min(Number(url.searchParams.get("limit") || 5000), 20000)
  const provider = url.searchParams.get("provider") || undefined

  const since = sinceStr
    ? new Date(sinceStr)
    : new Date(Date.now() - Math.max(hoursBack, 1) * 3600_000)
  const until = untilStr ? new Date(untilStr) : new Date()

  try {
    const qp = new URLSearchParams({
      layer: "eagle_video_events",
      limit: String(limit),
      since: since.toISOString(),
      until: until.toISOString(),
    })
    if (bbox) {
      const [w, s, e, n] = bbox.split(",").map(Number)
      if ([w, s, e, n].every(Number.isFinite)) {
        qp.set("lat_min", String(s))
        qp.set("lat_max", String(n))
        qp.set("lng_min", String(w))
        qp.set("lng_max", String(e))
      }
    }
    if (provider) qp.set("provider", provider)

    const res = await fetch(`${MINDEX_BASE}/api/mindex/earth/map/bbox?${qp}`, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(8_000),
    })
    const j = res.ok ? await res.json() : { entities: [] }
    const items: any[] = j?.entities || j?.features || j?.events || []
    const events = items
      .map((e: any) => {
        const meta = e.raw_metadata || e.metadata || {}
        const lat = e.lat ?? meta.lat ?? e.latitude ?? null
        const lng = e.lng ?? meta.lng ?? e.longitude ?? null
        return {
          id: String(e.id ?? `${e.observed_at}-${lat}-${lng}`),
          video_source_id: e.video_source_id ?? null,
          observed_at: e.observed_at ?? null,
          start_at: e.start_at ?? null,
          end_at: e.end_at ?? null,
          native_place: e.native_place ?? null,
          inferred_place: e.inferred_place ?? null,
          inference_confidence: e.inference_confidence ?? null,
          text_context: e.text_context ?? null,
          thumbnail_url: e.thumbnail_url ?? null,
          clip_ref: e.clip_ref ?? null,
          provider: meta.provider ?? e.provider ?? null,
          lat: Number.isFinite(lat) ? Number(lat) : null,
          lng: Number.isFinite(lng) ? Number(lng) : null,
        }
      })
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))

    return NextResponse.json(
      {
        source: "eagle-video-events",
        total: events.length,
        since: since.toISOString(),
        until: until.toISOString(),
        events,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-Source": "mindex-eagle",
        },
      },
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        source: "eagle-video-events",
        total: 0,
        events: [],
        error: err?.message || "query failed",
      },
      { status: 200 }, // graceful empty; don't break the map
    )
  }
}
