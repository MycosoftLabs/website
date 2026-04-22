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

/**
 * Base URL for server-side fetches to this app's own API routes.
 * In Docker/VM, `new URL(req.url).origin` is often `https://mycosoft.com` —
 * self-HTTP fetches can fail (hairpin, TLS, cold DNS). Use loopback to the
 * Node listener instead. Vercel keeps the public request origin.
 * Override with EAGLE_CONNECTOR_FETCH_BASE / EAGLE_INTERNAL_ORIGIN if needed.
 */
function connectorFetchBase(req: NextRequest): string {
  const fromEnv = (process.env.EAGLE_CONNECTOR_FETCH_BASE || process.env.EAGLE_INTERNAL_ORIGIN || "").trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (process.env.VERCEL) return new URL(req.url).origin
  const u = new URL(req.url)
  // Local dev: http://localhost:3010/... has explicit port. Production HTTPS
  // to :443 has no port — use the Node listen port (Docker 3000, etc.).
  if (u.port && u.port !== "80" && u.port !== "443") {
    return `http://127.0.0.1:${u.port}`
  }
  const port = process.env.PORT || "3000"
  return `http://127.0.0.1:${port}`
}

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

    // Apr 22, 2026 — 2 s timeout instead of 8 s. MINDEX is either fast
    // (≤500 ms when warm, populated) or we should move on to the live
    // fan-out. Waiting 8 s adds 8 s to every response when MINDEX is
    // cold/empty — which is exactly when the user most needs cameras
    // to appear quickly from live connectors.
    const res = await fetch(`${MINDEX_BASE}/api/mindex/earth/map/bbox?${qp}`, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(2_000),
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
async function fromLiveConnectors(origin: string, bbox: string | undefined, fast = false): Promise<VideoSource[]> {
  const qp = bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""
  // Apr 22, 2026 — Morgan: "needs first load fast". Split connectors into
  // FAST tier (<2 s) and SLOW tier (up to 11 s for state-dot-cctv's nested
  // DOT fan-out). ?fast=1 returns only the FAST tier so the map gets
  // cameras on first paint; the SLOW tier runs in background via the
  // async-warm path in GET and the overlay's next poll picks them up.
  const FAST_ENDPOINTS = [
    `${origin}/api/eagle/connectors/public-webcams${qp}`,
    `${origin}/api/eagle/connectors/traffic-511${qp}`,
    `${origin}/api/eagle/connectors/border-crossing${qp}`,
    `${origin}/api/eagle/connectors/webcamtaxi${qp}`,
  ]
  const SLOW_ENDPOINTS = [
    `${origin}/api/eagle/connectors/shinobi${qp}`,
    `${origin}/api/eagle/connectors/state-dot-cctv${qp}`,
  ]
  const endpoints = fast ? FAST_ENDPOINTS : [...FAST_ENDPOINTS, ...SLOW_ENDPOINTS]
  // Apr 20, 2026 hotfix (Morgan: "where are all the cameras icons and feeds
  // on crep add them now"). Probed: state-dot-cctv takes ~10 s on cold cache
  // (12 Caltrans districts + WSDOT + FDOT + 511NY + TxDOT in parallel).
  // 15 s timeout was borderline — when the route compile cache was cold the
  // call frequently timed out and Caltrans D11 (200+ SD cams) never reached
  // the overlay. Bumped to 35 s so we always wait for the slow connector.
  // Each connector still has its own internal timeouts; this only widens
  // our patience for them to respond.
  // Apr 22, 2026 — Promise.allSettled with bounded per-connector timeout.
  // Measured: state-dot-cctv (Caltrans 1128 + NYSDOT 2921) direct returns
  // in 11.5 s. 12 s cap was too tight (timer fires before the nested fan-
  // out completes). Bumped to 18 s giving 6 s headroom so Caltrans reliably
  // lands. Overall response still bounded — whichever slower connectors
  // don't finish are skipped and the warm-MINDEX async path picks them up.
  const settled = await Promise.allSettled(
    endpoints.map((u) =>
      fetch(u, { signal: AbortSignal.timeout(18_000) })
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
  // Apr 22, 2026 — Morgan: "needs first load fast". ?fast=1 returns the
  // fast-tier connectors (public-webcams + 511 + border + webcamtaxi
  // ≈ 1.5 s) and kicks off state-dot-cctv + shinobi in the background.
  // The overlay's next 30 s poll picks up the slow-tier cams.
  const fast = url.searchParams.get("fast") === "1"

  let sources = await fromMindex(bbox, kind, provider, limit)
  let liveUsed = false

  const forceLive = url.searchParams.get("live") === "1"
  const mindexCold = sources.length === 0
  if (!skipLive && (mindexCold || forceLive)) {
    const origin = connectorFetchBase(req)
    const live = await fromLiveConnectors(origin, bbox, fast)
    if (live.length) {
      const seen = new Set(sources.map((s) => `${s.provider}:${s.id}`))
      for (const s of live) {
        const key = `${s.provider}:${s.id}`
        if (!seen.has(key)) { sources.push(s); seen.add(key) }
      }
      liveUsed = true
    }
    // If fast mode: kick off the slow tier in background so MINDEX warms
    // and the next poll cycle picks up Caltrans + Shinobi without
    // blocking this response.
    if (fast) {
      after(() => {
        void (async () => {
          try {
            const slow = await fromLiveConnectors(origin, bbox, false)
            if (slow.length > 0 && (MINDEX_INTERNAL_TOKEN || MINDEX_API_KEY)) {
              await persistMergedSourcesToMindex(slow)
            }
          } catch { /* ignore */ }
        })()
      })
    }
  } else if (!skipLive && sources.length < MIN_SOURCES) {
    const origin = connectorFetchBase(req)
    after(() => {
      void (async () => {
        try {
          const live = await fromLiveConnectors(origin, bbox, false)
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
