import { NextRequest, NextResponse, after } from "next/server"

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

// When MINDEX is COMPLETELY EMPTY for the bbox we fan out to live
// connectors. Apr 20, 2026 v3 (Cursor shipped Track B #2+#4 ingest →
// MINDEX now reliably has STATIC_SEED + Project Oyster + DOT-CCTV
// rows): the previous threshold of 50 was triggering live fan-out for
// every small-bbox query where MINDEX legitimately had <50 rows
// (e.g. SD/TJ bbox returned 20 from MINDEX → fan-out still fired
// adding latency for nothing). Drop to 1: only fall back when MINDEX
// truly has no rows for this bbox at all (cold start / network split).
const MIN_SOURCES = 1

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

const BULK_UPSERT_CHUNK = 200

/** Persist merged sources to MINDEX warm cache (idempotent upsert). */
async function persistMergedSourcesToMindex(sources: VideoSource[]): Promise<void> {
  if (!sources.length) return
  if (!MINDEX_INTERNAL_TOKEN && !MINDEX_API_KEY) return

  const payload = sources.map((s) => ({
    id: s.id,
    kind: s.kind,
    provider: s.provider,
    stable_location: s.stable_location,
    lat: s.lat,
    lng: s.lng,
    location_confidence: s.location_confidence,
    stream_url: s.stream_url,
    embed_url: s.embed_url,
    media_url: s.media_url,
    source_status: s.source_status || "active",
    permissions: s.permissions ?? {},
    retention_policy: {},
    provenance_method: "website_live_fanout",
    privacy_class: "public",
  }))

  for (let i = 0; i < payload.length; i += BULK_UPSERT_CHUNK) {
    const chunk = payload.slice(i, i + BULK_UPSERT_CHUNK)
    try {
      const res = await fetch(`${MINDEX_BASE}/api/mindex/eagle/video-sources/bulk-upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
        body: JSON.stringify({ sources: chunk }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) {
        console.warn("[eagle/sources] bulk-upsert HTTP", res.status, await res.text().catch(() => ""))
      }
    } catch (e) {
      console.warn("[eagle/sources] bulk-upsert failed", e)
    }
  }
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
        // Apr 21, 2026 (Morgan: "all the cameras now say unknown"). MINDEX's
        // bulk-upsert stores source metadata in the properties JSON, so
        // top-level `provider` / `kind` / `stream_url` / etc. are null when
        // we read back. Fall through to properties.* / metadata.* to get
        // the original connector tag. This is defensive — works whether
        // MINDEX promotes these to columns later or keeps them in JSON.
        const p = c.properties || c.metadata || {}
        return {
          id: String(c.id ?? p.id ?? `${lat}-${lng}`),
          kind: (c.kind || p.kind || "permanent") as VideoSource["kind"],
          provider: c.provider || p.provider || "unknown",
          stable_location: (c.stable_location ?? p.stable_location) !== false,
          lat: Number(lat),
          lng: Number(lng),
          location_confidence: c.location_confidence ?? p.location_confidence ?? null,
          stream_url: c.stream_url ?? p.stream_url ?? null,
          embed_url: c.embed_url ?? p.embed_url ?? null,
          media_url: c.media_url ?? p.media_url ?? null,
          source_status: c.source_status ?? p.source_status ?? null,
          permissions: c.permissions ?? p.permissions ?? null,
          updated_at: c.updated_at ?? c.timestamp ?? p.updated_at ?? null,
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
    // Apr 20, 2026 — Webcamtaxi global landmark / beach / marine cams.
    // Doc Phase 2 source. Hand-curated seed of pages whose iframe embeds
    // are whitelisted in VideoWallWidget so they render as actual video.
    `${origin}/api/eagle/connectors/webcamtaxi${qp}`,
  ]
  // Apr 20, 2026 hotfix (Morgan: "where are all the cameras icons and feeds
  // on crep add them now"). Probed: state-dot-cctv takes ~10 s on cold cache
  // (12 Caltrans districts + WSDOT + FDOT + 511NY + TxDOT in parallel).
  // 15 s timeout was borderline — when the route compile cache was cold the
  // call frequently timed out and Caltrans D11 (200+ SD cams) never reached
  // the overlay. Bumped to 35 s so we always wait for the slow connector.
  // Each connector still has its own internal timeouts; this only widens
  // our patience for them to respond.
  // Apr 22, 2026 — Promise.allSettled with TIGHT per-connector timeout
  // so one slow connector (Shinobi 10 s timeout, state-dot-cctv cold
  // start) doesn't starve the whole response. Was Promise.all + 35 s
  // per call → total up to 35 s. Now 8 s cap; whichever connectors
  // return in time contribute, laggards skipped.
  const settled = await Promise.allSettled(
    endpoints.map((u) =>
      fetch(u, { signal: AbortSignal.timeout(8_000) })
        .then((r) => (r.ok ? r.json() : null)),
    ),
  )
  const responses = settled.map((s) => s.status === "fulfilled" ? s.value : null)
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

  // Apr 22, 2026 — Morgan: "still no caltran cams".
  // Strategy:
  //   MINDEX has data (>= MIN_SOURCES)   → return it, no fan-out (fast)
  //   MINDEX has SOME (>0 < MIN_SOURCES) → return it + async warm
  //   MINDEX EMPTY (== 0) OR ?live=1     → sync fan-out so map isn't blank
  // Live fan-out itself is now capped at 8 s per connector (was 35 s)
  // and uses Promise.allSettled so slow connectors don't starve the
  // whole response.
  const forceLive = url.searchParams.get("live") === "1"
  const mindexCold = sources.length === 0
  if (!skipLive && (mindexCold || forceLive)) {
    const origin = new URL(req.url).origin
    const live = await fromLiveConnectors(origin, bbox)
    if (live.length) {
      const seen = new Set(sources.map((s) => `${s.provider}:${s.id}`))
      for (const s of live) {
        const key = `${s.provider}:${s.id}`
        if (!seen.has(key)) { sources.push(s); seen.add(key) }
      }
      liveUsed = true
    }
  } else if (!skipLive && sources.length < MIN_SOURCES) {
    // Async warm — response is NOT blocked on slow connectors.
    const origin = new URL(req.url).origin
    after(() => {
      void (async () => {
        try {
          const live = await fromLiveConnectors(origin, bbox)
          if (live.length > 0 && (MINDEX_INTERNAL_TOKEN || MINDEX_API_KEY)) {
            await persistMergedSourcesToMindex(live)
          }
        } catch { /* ignore */ }
      })()
    })
  }

  if (liveUsed && sources.length > 0 && (MINDEX_INTERNAL_TOKEN || MINDEX_API_KEY)) {
    const snapshot = sources.map((s) => ({ ...s }))
    after(() => {
      void persistMergedSourcesToMindex(snapshot)
    })
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
