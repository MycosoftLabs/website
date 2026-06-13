import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { filterEagleVideoSources } from "@/lib/crep/eagle-camera-normalize"

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
  name: string | null
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

const BAKED_GEOJSON_FILES = [
  "eagle-cameras-registry.geojson",
  "eagle-cameras-manual-seed.geojson",
  "eagle-cameras-caltrans-san-diego-seed.geojson",
  "eagle-cameras-border-supplement.geojson",
  "eagle-cameras-nyc-dc-seed.geojson",
  "eagle-cameras-vegas-seed.geojson",
  "eagle-cameras-deployment-sites-seed.geojson",
] as const

let bakedSourcesPromise: Promise<VideoSource[]> | null = null

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
    return `http://localhost:${u.port}`
  }
  const port = process.env.PORT || "3000"
  return `http://localhost:${port}`
}

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (MINDEX_API_KEY) return { "X-API-Key": MINDEX_API_KEY }
  return {}
}

function parseBbox(bbox: string | undefined): [number, number, number, number] | null {
  if (!bbox) return null
  const parts = bbox.split(",").map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null
  return parts as [number, number, number, number]
}

function inBbox(src: VideoSource, bbox: [number, number, number, number] | null): boolean {
  if (!bbox) return true
  const [west, south, east, north] = bbox
  if (src.lat < south || src.lat > north) return false
  if (west <= east) return src.lng >= west && src.lng <= east
  return src.lng >= west || src.lng <= east
}

async function loadBakedSources(): Promise<VideoSource[]> {
  if (!bakedSourcesPromise) {
    bakedSourcesPromise = (async () => {
      const merged = new Map<string, VideoSource>()
      for (const file of BAKED_GEOJSON_FILES) {
        try {
          const full = path.join(process.cwd(), "public", "data", "crep", file)
          const json = JSON.parse(await fs.readFile(full, "utf8"))
          for (const feature of json?.features || []) {
            const props = feature?.properties || {}
            const coords = feature?.geometry?.coordinates || []
            const lng = Number(coords[0])
            const lat = Number(coords[1])
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
            const provider = String(props.provider || "camera")
            const id = String(props.id || `${provider}-${lat}-${lng}`)
            merged.set(id, {
              id,
              kind: (props.kind || "permanent") as VideoSource["kind"],
              provider,
              name: props.name ?? props.title ?? null,
              stable_location: true,
              lat,
              lng,
              location_confidence: 1,
              stream_url: props.stream_url ?? null,
              embed_url: props.embed_url ?? null,
              media_url: props.media_url ?? null,
              source_status: props.source_status ?? props.status ?? "online",
              permissions: props.permissions ?? { access: "public" },
              updated_at: props.updated_at ?? null,
            })
          }
        } catch {
          /* seed file is optional */
        }
      }
      return Array.from(merged.values())
    })()
  }
  return bakedSourcesPromise
}

async function fromBakedSeeds(bbox: string | undefined, limit: number): Promise<VideoSource[]> {
  const parsed = parseBbox(bbox)
  const baked = await loadBakedSources()
  return baked.filter((source) => inBbox(source, parsed)).slice(0, limit)
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
          name: c.name ?? p.name ?? p.title ?? null,
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
        name: c.name ?? c.title ?? null,
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

/** Always refresh state DOT feeds — MINDEX cache often has stale stream_url. */
async function fromStateDotCctv(origin: string, bbox: string | undefined): Promise<VideoSource[]> {
  const qp = bbox ? `?bbox=${encodeURIComponent(bbox)}` : ""
  try {
    const res = await fetch(`${origin}/api/eagle/connectors/state-dot-cctv${qp}`, {
      signal: AbortSignal.timeout(18_000),
    })
    if (!res.ok) return []
    const j = await res.json()
    const items: any[] = j.cams || []
    return items
      .filter((c: any) => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng)))
      .map(
        (c: any): VideoSource => ({
          id: String(c.id || `${c.provider}-${c.lat}-${c.lng}`),
          kind: "permanent",
          provider: c.provider || "caltrans",
          name: c.name ?? null,
          stable_location: true,
          lat: Number(c.lat),
          lng: Number(c.lng),
          location_confidence: 1.0,
          stream_url: c.stream_url ?? null,
          embed_url: c.embed_url ?? null,
          media_url: c.media_url ?? null,
          source_status: c.source_status ?? "online",
          permissions: c.permissions ?? { access: "public" },
          updated_at: c.updated_at ?? null,
        }),
      )
  } catch {
    return []
  }
}

function mergeSourcesLiveWins(base: VideoSource[], incoming: VideoSource[]): VideoSource[] {
  const byId = new Map<string, VideoSource>()
  for (const s of base) byId.set(s.id, s)
  for (const s of incoming) byId.set(s.id, s)
  return Array.from(byId.values())
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  let bbox = url.searchParams.get("bbox") || undefined
  if (!bbox) {
    const west = Number(url.searchParams.get("west"))
    const south = Number(url.searchParams.get("south"))
    const east = Number(url.searchParams.get("east"))
    const north = Number(url.searchParams.get("north"))
    if ([west, south, east, north].every(Number.isFinite)) {
      bbox = `${west},${south},${east},${north}`
    }
  }
  const kind = url.searchParams.get("kind") || undefined
  const provider = url.searchParams.get("provider") || undefined
  const requestedLimit = Math.min(Number(url.searchParams.get("limit") || 10000), 50000)
  const mapMetadataRequest = Boolean(bbox && !kind && !provider)
  // Jun 13, 2026 (camera-coverage fix): a dense metro viewport (e.g. Caltrans
  // District 4 / SF Bay alone has 633 live cams) needs far more than 180, or the
  // map shows only a handful of baked-seed pins. Raise the map cap to 2000.
  const limit = mapMetadataRequest ? Math.min(requestedLimit, 2000) : requestedLimit
  const directLiveFanoutEnabled =
    process.env.EAGLE_WEBSITE_ALLOW_DIRECT_LIVE_FANOUT !== "0"
  // Jun 13, 2026: the `&& !mapMetadataRequest` clause forced skipLive=true for
  // EVERY plain map bbox request, so the overlay's explicit live=1 never ran the
  // live state-DOT fan-out (Caltrans D4, etc.) — the map only ever got the small
  // baked seed (SF showed ~1 cam). Honour live=1 for map requests; the ?fast=1
  // first-paint path still returns the baked tier immediately, and the live tier
  // is bbox/district-filtered + bounded by the 18s allSettled timeout.
  const liveFanoutAllowed =
    directLiveFanoutEnabled &&
    url.searchParams.get("live") === "1"
  const skipLive = !liveFanoutAllowed
  // Apr 22, 2026 — Morgan: "needs first load fast". ?fast=1 returns the
  // fast-tier connectors (public-webcams + 511 + border + webcamtaxi
  // ≈ 1.5 s) and kicks off state-dot-cctv + shinobi in the background.
  // The overlay's next 30 s poll picks up the slow-tier cams.
  const fast = url.searchParams.get("fast") === "1"

  let liveUsed = false
  let bakedUsed = false
  const origin = connectorFetchBase(req)
  if (fast && skipLive) {
    let fastSources = await fromBakedSeeds(bbox, limit)
    if (kind) fastSources = fastSources.filter((s) => s.kind === kind)
    if (provider) fastSources = fastSources.filter((s) => s.provider === provider)
    fastSources = filterEagleVideoSources(fastSources)

    const byProvider: Record<string, number> = {}
    const byKind: Record<string, number> = {}
    for (const s of fastSources) {
      byProvider[s.provider] = (byProvider[s.provider] || 0) + 1
      byKind[s.kind] = (byKind[s.kind] || 0) + 1
    }

    return NextResponse.json(
      {
        source: "eagle-video-sources",
        total: fastSources.length,
        by_provider: byProvider,
        by_kind: byKind,
        sources: fastSources,
        generatedAt: new Date().toISOString(),
        baked_seed_used: fastSources.length > 0,
        live_fanout_used: false,
        note: fastSources.length > 0
          ? "fast first paint from baked public camera seed"
          : "fast first paint found no baked public camera seed rows",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          "X-Source": "baked-eagle-fast",
        },
      },
    )
  }
  const stateDotPromise = !skipLive && !fast
    ? fromStateDotCctv(origin, bbox)
    : Promise.resolve<VideoSource[]>([])
  let sources = await fromMindex(bbox, kind, provider, limit)
  const bakedSources = await fromBakedSeeds(bbox, limit)
  if (bakedSources.length) {
    sources = mergeSourcesLiveWins(bakedSources, sources)
    bakedUsed = true
  }

  // May 24, 2026 — fast=1 (thumbnail grid / first paint) must NOT block on
  // the 18 s state-dot-cctv fan-out. Return MINDEX + fast-tier immediately;
  // warm Caltrans/Shinobi in background for the next poll.
  if (!skipLive && !fast) {
    const stateDotLive = await stateDotPromise
    if (stateDotLive.length) {
      sources = mergeSourcesLiveWins(sources, stateDotLive)
      liveUsed = true
    }
  }

  const mindexCold = sources.length === 0
  if (!skipLive && mindexCold) {
    const live = await fromLiveConnectors(origin, bbox, fast)
    if (live.length) {
      sources = mergeSourcesLiveWins(sources, live)
      liveUsed = true
    }
  } else if (!skipLive && sources.length < MIN_SOURCES) {
    // No background warmups from the website runtime. MINDEX owns camera
    // acquisition and cache hydration; this route only serves available rows.
  }

  // No writeback from the website runtime. MINDEX owns persistence.

  // Filter by kind/provider if requested (MINDEX already filtered; live
  // doesn't — apply post-filter here).
  if (kind) sources = sources.filter((s) => s.kind === kind)
  if (provider) sources = sources.filter((s) => s.provider === provider)

  // May 24, 2026 — drop AQ/reef/gauge rows mis-ingested as cameras; snap
  // known US-side border POI coords so pins are not in slough / Mexico.
  sources = filterEagleVideoSources(sources)

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
      baked_seed_used: bakedUsed,
      live_fanout_used: liveUsed,
      note: liveUsed
        ? "MINDEX sparse → fanned out to connectors (public-webcams + 511 + shinobi)"
        : bakedUsed
          ? "MINDEX sparse; included baked public camera seed"
          : undefined,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Source": liveUsed
          ? "mindex-eagle+live-fanout"
          : bakedUsed
            ? "mindex-eagle+baked-seed"
            : "mindex-eagle",
      },
    },
  )
}
