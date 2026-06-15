import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { caltransProxiedSnapshot, resolveCaltransHls } from "@/lib/crep/caltrans-hls-resolve"
import { normalizeYouTubeEmbedUrlSync } from "@/lib/crep/youtube-embed"

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

const BAKED_GEOJSON_FILES = [
  "eagle-cameras-registry.geojson",
  "eagle-cameras-manual-seed.geojson",
  "eagle-cameras-caltrans-san-diego-seed.geojson",
  "eagle-cameras-border-supplement.geojson",
  "eagle-cameras-nyc-dc-seed.geojson",
  "eagle-cameras-vegas-seed.geojson",
  "eagle-cameras-deployment-sites-seed.geojson",
  "eagle-cameras-hdontap-seed.geojson",
]

const UNAVAILABLE_SOURCE_STATUSES = new Set([
  "offline",
  "unavailable",
  "retired",
  "disabled",
  "blocked",
  "deprecated",
  "temporarily_unavailable",
])

const KNOWN_UNAVAILABLE_SOURCE_IDS = new Set([
  "earthcam-san-diego-bay",
  "earthcam-sd-bay",
  "earthcam-imperial-beach-pier",
  "nps-cabrillo-ref",
  "caltrans-d11-sr75-silverstrand",
  "caltrans-d11-sr75-coronado-bridge",
  "caltrans-d11-sr75-orange-ave",
  "caltrans-d11-sr75-palm-ave",
  "scripps-pier-sio-cam",
])

const SOURCE_ID_ALIASES = new Map<string, string>([
  ["hoteldel-coronado-beach-south", "earthcam-coronado-hotel-del"],
])

const EARTHCAM_YOUTUBE_FALLBACKS = new Map<string, string>([
  ["vegas-earthcam-fremont", "pFebijydkDM"],
])

const SURFLINE_HLS_FALLBACK_PAGES = new Map<string, string>([
  ["surfline-coronado-hotel-del", "https://hdontap.com/stream/964952/hotel-del-coronado-4k-roaming-live-cam/"],
  ["surfline-mission-beach", "https://hdontap.com/stream/475932/mission-beach-and-crystal-pier-live-cam/"],
  ["surfline-pacific-beach-crystal-pier", "https://hdontap.com/stream/186699/pacific-beach-live-surf-webcam/"],
  ["surfline-la-jolla-cove", "https://hdontap.com/stream/532541/la-jolla-shores-live-surf-cam/"],
  ["surfline-scripps-pier", "https://hdontap.com/stream/532541/la-jolla-shores-live-surf-cam/"],
])

const SURFLINE_IFRAME_FALLBACKS = new Map<string, string>([
  ["surfline-ocean-beach-pier", "https://www.youtube.com/embed/cvP_F-c2Upw?autoplay=1&mute=1&playsinline=1&rel=0"],
])

const TEMPORARILY_UNPLAYABLE_PROVIDERS = new Set([
  "navy",
])

function isStillImageUrl(url: string | null | undefined): boolean {
  return !!url && (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /\/api\/eagle\/cam-image(?:\?|$)/i.test(url))
}

function proxiedStillImageUrl(url: string | null | undefined): string | null {
  if (!url || !isStillImageUrl(url)) return null
  if (/^\/api\/eagle\/cam-image(?:\?|$)/i.test(url)) return url
  try {
    const parsed = new URL(url)
    return `/api/eagle/cam-image?url=${encodeURIComponent(parsed.toString())}`
  } catch {
    return null
  }
}

function knownUnavailableProviderFor(sourceId: string): string {
  if (sourceId.startsWith("caltrans-")) return "caltrans"
  if (sourceId.startsWith("nps-")) return "youtube_live"
  if (sourceId.startsWith("scripps-")) return "scripps"
  if (sourceId.startsWith("skyline-")) return "skylinewebcams"
  if (sourceId.startsWith("port-")) return "public-webcam"
  if (sourceId.startsWith("weather-")) return "public-webcam"
  if (sourceId.startsWith("av-")) return "public-webcam"
  if (sourceId.startsWith("ski-")) return "public-webcam"
  if (sourceId.startsWith("wild-")) return "public-webcam"
  if (sourceId.startsWith("aq-")) return "public-webcam"
  if (
    sourceId.startsWith("earthcam-") ||
    sourceId.startsWith("ec-") ||
    sourceId.includes("-earthcam-") ||
    sourceId.startsWith("stad-") ||
    sourceId.startsWith("zoo-")
  ) {
    return "earthcam"
  }
  return "unknown"
}

let bakedSourceIndexPromise: Promise<Map<string, any>> | null = null

function authHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

/** MINDEX: GET /api/mindex/eagle/video-sources/{id} — one row, preferred path (Apr 17, 2026). */
async function fetchVideoSourceByIdFromMindex(sourceId: string): Promise<any | null> {
  const url = `${MINDEX_BASE}/api/mindex/eagle/video-sources/${encodeURIComponent(sourceId)}`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const j = await res.json()
    if (j?.found === false || !j?.source) return null
    return j.source
  } catch {
    return null
  }
}

// Last-resort: global bbox cache (fair provider ordering in MINDEX; still heavy).
interface SourcesCache { ts: number; rows: any[] }
let sourcesCache: SourcesCache = { ts: 0, rows: [] }
const SOURCES_TTL_MS = 60_000

async function getAllEagleVideoSourcesCached(): Promise<any[]> {
  const now = Date.now()
  if (sourcesCache.rows.length > 0 && now - sourcesCache.ts < SOURCES_TTL_MS) {
    return sourcesCache.rows
  }
  const url = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&lat_min=-90&lat_max=90&lng_min=-180&lng_max=180&limit=10000&offset=0`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    })
    if (!res.ok) {
      return sourcesCache.rows
    }
    const j = await res.json()
    const rows: any[] = j?.entities || j?.features || j?.sources || []
    sourcesCache = { ts: now, rows }
    return rows
  } catch {
    return sourcesCache.rows
  }
}

async function getBakedSourceIndex(): Promise<Map<string, any>> {
  if (!bakedSourceIndexPromise) {
    bakedSourceIndexPromise = (async () => {
      const index = new Map<string, any>()
      for (const file of BAKED_GEOJSON_FILES) {
        try {
          const full = path.join(process.cwd(), "public", "data", "crep", file)
          const json = JSON.parse(await fs.readFile(full, "utf8"))
          for (const feature of json?.features || []) {
            const props = feature?.properties || {}
            const id = String(props.id || props.source_id || "")
            const coords = feature?.geometry?.coordinates || []
            if (!id) continue
            index.set(id, {
              id,
              source_id: id,
              provider: props.provider || "unknown",
              kind: props.kind || "permanent",
              name: props.name ?? props.title ?? null,
              stream_url: props.stream_url ?? null,
              embed_url: props.embed_url ?? null,
              media_url: props.media_url ?? null,
              source_status: props.source_status ?? props.status ?? null,
              status: props.status ?? null,
              lat: Number(coords[1]),
              lng: Number(coords[0]),
              properties: props,
            })
          }
        } catch {
          /* seed file is optional */
        }
      }
      return index
    })()
  }
  return bakedSourceIndexPromise
}

async function fetchBakedSourceById(sourceId: string): Promise<any | null> {
  const index = await getBakedSourceIndex()
  return index.get(sourceId) ?? null
}

/**
 * Caltrans D11 / D12 ids encode the camera coordinates, e.g.
 *   caltrans-d11-32.69845,-117.18376
 * When the global cache misses, we parse the coord out and do a tight-bbox
 * MINDEX lookup instead of giving up. Returns null for ids that don't
 * match the coord pattern.
 */
async function fetchByCoordHintedId(sourceId: string): Promise<any | null> {
  const m = sourceId.match(/^([a-z0-9_-]+)-(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)$/)
  if (!m) return null
  const lat = parseFloat(m[2])
  const lng = parseFloat(m[3])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const pad = 0.002 // ~200 m bbox
  const url = `${MINDEX_BASE}/api/mindex/earth/map/bbox?layer=eagle_video_sources&lat_min=${lat - pad}&lat_max=${lat + pad}&lng_min=${lng - pad}&lng_max=${lng + pad}&limit=25`
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...authHeaders() },
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const j = await res.json()
    const rows: any[] = j?.entities || j?.features || j?.sources || []
    return rows.find((r) => String(r.id) === sourceId) ?? rows[0] ?? null
  } catch {
    return null
  }
}

// Map/entity results nest fields under properties{}; direct eagle/video-sources
// row is already flat. Normalize so the handler always reads the same shape.
function flattenSource(raw: any): any {
  const props = raw?.properties ?? {}
  return {
    id: raw.id ?? raw.source_id ?? props.source_id,
    source_id: raw.source_id ?? props.source_id,
    provider: raw.provider ?? props.provider ?? raw.source ?? "unknown",
    kind: raw.kind ?? props.kind ?? "permanent",
    stream_url: raw.stream_url ?? props.stream_url ?? null,
    embed_url: raw.embed_url ?? props.embed_url ?? null,
    media_url: raw.media_url ?? props.media_url ?? null,
    source_status: raw.source_status ?? props.source_status ?? raw.status ?? props.status ?? null,
    lat: raw.lat,
    lng: raw.lng,
    name: raw.name,
    properties: props,
  }
}

function deriveSurflineEmbed(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null
  const m = /surfline\.com\/surf-report\/[^/]+\/([a-f0-9]{16,})/i.exec(embedUrl)
  if (!m) return null
  return `https://www.surfline.com/embed-cam/${m[1]}?autoplay=1&mute=1&playsinline=1`
}

async function surflineEmbedIsReachable(embedUrl: string): Promise<boolean> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

function decodeProviderUrl(value: string): string {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/gi, "&")
}

function earthCamStreamIdHints(embedUrl: string | null | undefined): string[] {
  const url = String(embedUrl || "").toLowerCase()
  const hints: string[] = []
  const add = (id: string) => {
    if (!hints.includes(id)) hints.push(id)
  }
  if (/bellagio|bellagio_fountain/.test(url)) add("3916")
  if (/sphere/.test(url)) add("36330")
  if (/sign_hd|welcome|fabulous/.test(url)) add("42116")
  if (/wedding|chapel|elvis/.test(url)) add("21001")
  if (/catsmeowkaraoke|karaoke/.test(url)) add("16813")
  if (/catsmeow_lv_fremont|fremont|fremontst/.test(url)) add("16812")
  return hints
}

function scoreEarthCamCandidate(candidate: string, embedUrl: string | null | undefined): number {
  const lc = candidate.toLowerCase()
  const hints = earthCamStreamIdHints(embedUrl)
  for (let i = 0; i < hints.length; i += 1) {
    const id = hints[i]
    if (lc.includes(`/fecnetwork/${id}.`) || lc.includes(`/fecnetwork/${id}/`) || lc.includes(`/${id}.flv/`)) {
      return 1_000 - i
    }
  }
  return 0
}

function earthCamYouTubeFallback(sourceId: string, embedUrl: string | null | undefined): string | null {
  const direct = EARTHCAM_YOUTUBE_FALLBACKS.get(sourceId)
  if (direct) return direct
  const url = String(embedUrl || "").toLowerCase()
  if (/fremontstreet|catsmeow_lv_fremont/.test(url)) return "pFebijydkDM"
  return null
}

async function probeHlsManifest(url: string, referer?: string | null): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
        ...(referer ? { Referer: referer, Origin: new URL(referer).origin } : {}),
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    })
    if (!res.ok) return false
    const text = await res.text()
    return /#EXTM3U/i.test(text)
  } catch {
    return false
  }
}

type CachedEarthCamHls = {
  url: string
  expiresAt: number
}

const earthCamHlsCache = new Map<string, CachedEarthCamHls>()
const earthCamHlsInflight = new Map<string, Promise<string | null>>()
const EARTHCAM_HLS_CACHE_MS = 90_000

async function resolveEarthCamHls(embedUrl: string | null | undefined): Promise<string | null> {
  if (!embedUrl || !/earthcam\.com/i.test(embedUrl)) return null
  const cacheKey = embedUrl.trim()
  const cached = earthCamHlsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const inflight = earthCamHlsInflight.get(cacheKey)
  if (inflight) return inflight
  const promise = resolveEarthCamHlsFresh(cacheKey).then((resolved) => {
    if (resolved) {
      earthCamHlsCache.set(cacheKey, {
        url: resolved,
        expiresAt: Date.now() + EARTHCAM_HLS_CACHE_MS,
      })
    } else {
      earthCamHlsCache.delete(cacheKey)
    }
    return resolved
  }).finally(() => {
    earthCamHlsInflight.delete(cacheKey)
  })
  earthCamHlsInflight.set(cacheKey, promise)
  return promise
}

async function resolveEarthCamHlsFresh(embedUrl: string): Promise<string | null> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
      },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const html = await res.text()
    const candidates = new Set<string>()
    for (const match of html.matchAll(/"stream"\s*:\s*"([^"]+?\.m3u8[^"]*)"/gi)) {
      candidates.add(decodeProviderUrl(match[1]))
    }
    for (const match of html.matchAll(/https?:\\?\/\\?\/videos-[^"'<> ]+?\.m3u8[^"'<> ]*/gi)) {
      candidates.add(decodeProviderUrl(match[0]))
    }
    const hints = earthCamStreamIdHints(embedUrl)
    const orderedCandidates = Array.from(candidates).sort(
      (a, b) => scoreEarthCamCandidate(b, embedUrl) - scoreEarthCamCandidate(a, embedUrl),
    )
    const candidatesToProbe = orderedCandidates
    for (const candidate of candidatesToProbe) {
      if (!/^https?:\/\//i.test(candidate)) continue
      if (await probeHlsManifest(candidate, embedUrl)) return candidate
    }
    return null
  } catch {
    return null
  }
}

async function resolveHdontapHls(embedUrl: string | null | undefined): Promise<string | null> {
  if (!embedUrl || !/portal\.hdontap\.com/i.test(embedUrl)) return null
  try {
    const parsed = new URL(embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl)
    const streamName = parsed.searchParams.get("stream")
    if (!streamName) return null
    const referrer = /hoteldel/i.test(streamName)
      ? "https://www.hoteldel.com/live-webcam/"
      : "https://portal.hdontap.com/s/embed/"
    const lookupUrl =
      `https://portal.hdontap.com/backend/embed/${encodeURIComponent(streamName)}` +
      `?r=${encodeURIComponent(Buffer.from(referrer).toString("base64"))}`
    const res = await fetch(lookupUrl, {
      headers: {
        Accept: "text/plain,*/*",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
        Referer: parsed.toString(),
      },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const text = (await res.text()).trim()
    let data: any = null
    try {
      data = JSON.parse(Buffer.from(text, "base64").toString("utf8"))
    } catch {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }
    const streamSrc = String(data?.streamSrc || "")
    if (!/\.m3u8(\?|$)/i.test(streamSrc)) return null
    if (await probeHlsManifest(streamSrc, parsed.toString())) return streamSrc
    return streamSrc
  } catch {
    return null
  }
}

async function resolveHdontapPageHls(pageUrl: string | null | undefined): Promise<string | null> {
  if (!pageUrl || !/hdontap\.com/i.test(pageUrl)) return null
  try {
    const res = await fetch(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
      },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const html = await res.text()
    const candidates = new Set<string>()
    for (const match of html.matchAll(/https?:[^"'<>\\]+?\.m3u8[^"'<>\\]*/gi)) {
      candidates.add(decodeProviderUrl(match[0]))
    }
    for (const match of html.matchAll(/(?:stream|src|file|url)["']?\s*[:=]\s*["']([^"']+?\.m3u8[^"']*)/gi)) {
      candidates.add(decodeProviderUrl(match[1]))
    }
    for (const candidate of candidates) {
      if (!/^https?:\/\//i.test(candidate)) continue
      if (await probeHlsManifest(candidate, pageUrl)) return candidate
    }
    return null
  } catch {
    return null
  }
}

function extract511NyCameraKey(sourceId: string, embedUrl: string | null | undefined): string | null {
  const stripped = sourceId.replace(/^nysdot-/i, "")
  if (/^Skyline-\d+$/i.test(stripped)) return stripped
  const m = /511ny\.org\/map\/Cctv\/(\d+)/i.exec(String(embedUrl || ""))
  return m?.[1] || null
}

async function resolveNysdotHls(sourceId: string, embedUrl: string | null | undefined): Promise<string | null> {
  const key = extract511NyCameraKey(sourceId, embedUrl)
  if (!key) return null
  try {
    const res = await fetch("https://511ny.org/api/getcameras?format=json", {
      headers: { Accept: "application/json", "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const items: any[] = await res.json()
    const match = items.find((camera: any) => {
      const id = String(camera?.ID || "")
      const url = String(camera?.Url || "")
      return id === key || url.includes(`/Cctv/${key}`)
    })
    const videoUrl = String(match?.VideoUrl || "")
    return /\.m3u8(\?|$)/i.test(videoUrl) ? videoUrl : null
  } catch {
    return null
  }
}

async function resolveSkylineWebcams(
  embedUrl: string | null | undefined,
): Promise<{ type: "iframe" | "snapshot"; url: string } | null> {
  if (!embedUrl || !/skylinewebcams\.com/i.test(embedUrl)) return null
  try {
    const pageUrl = new URL(embedUrl)
    const res = await fetch(pageUrl.toString(), {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 MycosoftCREP/1.0",
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    })
    if (!res.ok) return null
    const html = await res.text()
    const ytMatch =
      /videoId\s*:\s*['"]([^'"]+)['"]/i.exec(html) ||
      /["']videoId["']\s*:\s*["']([^"']+)["']/i.exec(html)
    if (ytMatch?.[1]) {
      const id = encodeURIComponent(ytMatch[1])
      return {
        type: "iframe",
        url: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0`,
      }
    }
    const liveImage =
      (() => {
        const key = /nkey\s*:\s*['"](\d+)\.jpg['"]/i.exec(html)?.[1]
        return key ? `https://cdn.skylinewebcams.com/live${key}.jpg` : null
      })() ||
      /https?:\/\/cdn\.skylinewebcams\.com\/live\d+\.jpg/i.exec(html)?.[0]
    if (liveImage) {
      return {
        type: "snapshot",
        url: `/api/eagle/cam-image?url=${encodeURIComponent(liveImage)}`,
      }
    }
    return null
  } catch {
    return null
  }
}

function shouldProxyHls(provider: string, url: string): boolean {
  return (
    provider === "caltrans" ||
    provider === "earthcam" ||
    provider === "hdontap" ||
    provider === "ndot" ||
    provider === "nysdot" ||
    /cwwp2\.dot\.ca\.gov/i.test(url) ||
    /wzmedia\.dot\.ca\.gov/i.test(url) ||
    /videos-\d+\.earthcam\.com/i.test(url) ||
    /live\.hdontap\.com/i.test(url) ||
    /d1wse1\.its\.nv\.gov/i.test(url) ||
    /nysdot\.skyvdn\.com/i.test(url)
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 })
  }
  const lookupSourceId = SOURCE_ID_ALIASES.get(sourceId) ?? sourceId
  const qEmbed = req.nextUrl.searchParams.get("embed_url")
  const qMedia = req.nextUrl.searchParams.get("media_url")
  try {
    const hasQueryFallback = Boolean(qEmbed || qMedia)
    // 1) MINDEX by-id (GET /eagle/video-sources/{id}) — O(1), no global bbox.
    // 2) Tight-bbox Caltrans / coord-hinted ids.
    // 3) Global layer cache (60 s) only as last resort.
    let raw: any = hasQueryFallback ? null : await fetchBakedSourceById(lookupSourceId)
    if (!raw && !hasQueryFallback) {
      raw = await fetchVideoSourceByIdFromMindex(lookupSourceId)
    }
    if (!raw && !hasQueryFallback) {
      raw = await fetchByCoordHintedId(lookupSourceId)
    }
    if (!raw && !hasQueryFallback) {
      const allSources = await getAllEagleVideoSourcesCached()
      raw = allSources.find(
        (s: any) =>
          String(s.id) === sourceId ||
          String(s.id) === lookupSourceId ||
          String(s.source_id) === sourceId ||
          String(s.source_id) === lookupSourceId ||
          String(s?.properties?.source_id ?? "") === sourceId ||
          String(s?.properties?.source_id ?? "") === lookupSourceId,
      )
    }
    const src = raw
      ? flattenSource(raw)
      : {
          id: sourceId,
          source_id: sourceId,
          provider: sourceId.startsWith("caltrans-")
            ? "caltrans"
            : sourceId.startsWith("surfline-")
              ? "surfline"
              : sourceId.startsWith("vegas-ndot-") || sourceId.startsWith("ndot-")
                ? "ndot"
                : sourceId.startsWith("navy-")
                  ? "navy"
                  : "unknown",
          kind: "permanent",
          stream_url: null,
          embed_url: qEmbed,
          media_url: qMedia,
          source_status: null,
        }

    if (!raw && !qEmbed && !qMedia) {
      return NextResponse.json({ error: "source not found", id: sourceId }, { status: 404 })
    }

    if (qEmbed && !src.embed_url) src.embed_url = qEmbed
    if (qMedia && !src.media_url) src.media_url = qMedia

    const embedHint = String(src.embed_url || "")
    const streamHint = String(src.stream_url || "")
    const mediaHint = String(src.media_url || qMedia || "")
    const hintText = `${embedHint} ${streamHint} ${mediaHint}`
    const sourceProvider = String(src.provider || "").trim()
    const provider =
      (sourceProvider && sourceProvider !== "unknown" ? sourceProvider : null) ||
      (/earthcam\.com/i.test(embedHint) ? "earthcam" : null) ||
      (/surfline\.com/i.test(embedHint) ? "surfline" : null) ||
      (/nvroads\.com/i.test(hintText) || sourceId.startsWith("vegas-ndot-") || sourceId.startsWith("ndot-") ? "ndot" : null) ||
      (sourceId.startsWith("navy-") ? "navy" : null) ||
      (/511ny\.org|nysdot\.skyvdn\.com/i.test(hintText) || sourceId.startsWith("nysdot-") ? "nysdot" : null) ||
      (/webcams\.nyctmc\.org/i.test(hintText) || sourceId.startsWith("nyctmc-") ? "nyctmc" : null) ||
      (/youtube\.com|youtu\.be/i.test(hintText) ? "youtube_live" : null) ||
      (/portal\.hdontap\.com/i.test(hintText) || sourceId.startsWith("hoteldel-") ? "hdontap" : null) ||
      (/webcams\.windy\.com|windy\.com/i.test(hintText) || sourceId.startsWith("windy-") ? "windy" : null) ||
      (/skylinewebcams\.com/i.test(hintText) || sourceId.startsWith("skylinewebcams-") ? "skylinewebcams" : null) ||
      (/webcamtaxi\.com/i.test(hintText) || sourceId.startsWith("webcamtaxi-") ? "webcamtaxi" : null) ||
      (/hpwren\.ucsd\.edu/i.test(hintText) || sourceId.startsWith("hpwren-") ? "hpwren" : null) ||
      (/alertwildfire|alertcalifornia/i.test(hintText) || sourceId.startsWith("alertwildfire-") ? "alertwildfire" : null) ||
      (/nps\.gov/i.test(hintText) || sourceId.startsWith("nps-") ? "nps" : null) ||
      (/usgs\.gov/i.test(hintText) || sourceId.startsWith("usgs-") ? "usgs" : null) ||
      "unknown"
    const kind = src.kind || "permanent"
    const sourceStatus = String(src.source_status || "").trim().toLowerCase()
    const sourceKnownUnavailable =
      KNOWN_UNAVAILABLE_SOURCE_IDS.has(sourceId) ||
      KNOWN_UNAVAILABLE_SOURCE_IDS.has(lookupSourceId) ||
      (sourceStatus && UNAVAILABLE_SOURCE_STATUSES.has(sourceStatus))
    const providerCanRevalidate = new Set([
      "caltrans",
      "earthcam",
      "hdontap",
      "ndot",
      "nysdot",
      "nyctmc",
      "skylinewebcams",
      "surfline",
      "youtube_live",
    ]).has(provider)
    if (
      (sourceStatus && UNAVAILABLE_SOURCE_STATUSES.has(sourceStatus) && !providerCanRevalidate) ||
      TEMPORARILY_UNPLAYABLE_PROVIDERS.has(provider)
    ) {
      return NextResponse.json(
        { error: "source temporarily unavailable", id: sourceId, provider, kind, source_status: sourceStatus || "temporarily_unavailable" },
        { status: 503 },
      )
    }
    let streamUrl = (src.stream_url || "").trim()
    const isHls =
      streamUrl.length > 0 &&
      (streamUrl.toLowerCase().endsWith(".m3u8") || streamUrl.toLowerCase().includes(".m3u8?"))

    if (provider === "ndot" && !isHls && !proxiedStillImageUrl(src.media_url || qMedia)) {
      return NextResponse.json(
        { error: "ndot live stream unavailable", id: sourceId, provider, kind, source_status: "temporarily_unavailable" },
        { status: 503 },
      )
    }

    if (provider === "caltrans") {
      const resolved = await resolveCaltransHls({
        sourceId,
        stream_url: src.stream_url,
        embed_url: src.embed_url,
        media_url: src.media_url,
      })
      if (resolved) streamUrl = resolved
      else if (sourceKnownUnavailable) {
        return NextResponse.json(
          { error: "caltrans live stream unavailable", id: sourceId, provider, kind, source_status: sourceStatus || "temporarily_unavailable" },
          { status: 503 },
        )
      }
      else if (isHls) streamUrl = ""
    }

    if (provider === "nysdot" && !isHls) {
      const resolved = await resolveNysdotHls(sourceId, src.embed_url)
      if (resolved) streamUrl = resolved
    }

    const directYouTube = normalizeYouTubeEmbedUrlSync(String(src.stream_url || "")) ||
      normalizeYouTubeEmbedUrlSync(String(src.embed_url || ""))
    if (directYouTube) {
      if (sourceKnownUnavailable) {
        return NextResponse.json(
          { error: "youtube live stream unavailable", id: sourceId, provider, kind, source_status: sourceStatus || "temporarily_unavailable" },
          { status: 503 },
        )
      }
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        embed_url: directYouTube,
        stream_url: directYouTube,
        stream_type: "iframe",
      })
    }

    if (provider === "earthcam" && !isHls) {
      const directYouTubeFallback = EARTHCAM_YOUTUBE_FALLBACKS.get(sourceId)
      if (directYouTubeFallback) {
        const embed = `https://www.youtube.com/embed/${directYouTubeFallback}?autoplay=1&mute=1&playsinline=1&rel=0`
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          embed_url: embed,
          stream_url: embed,
          stream_type: "iframe",
        })
      }
      const resolved = await resolveEarthCamHls(src.embed_url)
      if (resolved) {
        streamUrl = resolved
      } else {
        const youtubeFallback = earthCamYouTubeFallback(sourceId, src.embed_url)
        if (youtubeFallback) {
          const embed = `https://www.youtube.com/embed/${youtubeFallback}?autoplay=1&mute=1&playsinline=1&rel=0`
          return NextResponse.json({
            id: sourceId,
            provider,
            kind,
            embed_url: embed,
            stream_url: embed,
            stream_type: "iframe",
          })
        }
        return NextResponse.json(
          { error: "earthcam live stream unavailable", id: sourceId, provider, kind, source_status: "temporarily_unavailable" },
          { status: 503 },
        )
      }
    }

    if (provider === "hdontap" && !isHls) {
      // portal.hdontap.com embeds resolve via the embed backend; full-catalog
      // hdontap.com/stream/{id}/ seed pages are scraped for their live HLS.
      const resolved = (await resolveHdontapHls(src.embed_url)) || (await resolveHdontapPageHls(src.embed_url))
      if (resolved) streamUrl = resolved
      else if (/hdontap\.com\/stream\//i.test(String(src.embed_url || ""))) {
        // HLS scrape missed (token/markup change) → HDOnTap's official
        // embeddable player iframe, which handles the live token itself.
        const page = String(src.embed_url).replace(/\/+$/, "")
        const embed = /\/embed$/i.test(page) ? `${page}/` : `${page}/embed/`
        return NextResponse.json({ id: sourceId, provider, kind, embed_url: embed, stream_url: embed, stream_type: "iframe" })
      }
    }

    if (provider === "skylinewebcams" && !isHls) {
      const resolved = await resolveSkylineWebcams(src.embed_url)
      if (resolved?.type === "iframe") {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          embed_url: resolved.url,
          stream_url: resolved.url,
          stream_type: "iframe",
        })
      }
      if (resolved?.type === "snapshot") {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          stream_url: resolved.url,
          embed_url: src.embed_url,
          stream_type: "snapshot",
        })
      }
      return NextResponse.json(
        { error: "skylinewebcams live stream unavailable", id: sourceId, provider, kind, source_status: "temporarily_unavailable" },
        { status: 503 },
      )
    }

    const resolvedHls =
      streamUrl.length > 0 &&
      (streamUrl.toLowerCase().endsWith(".m3u8") || streamUrl.toLowerCase().includes(".m3u8?"))

    if (resolvedHls) {
      const snapshot =
        provider === "caltrans"
          ? caltransProxiedSnapshot(src.embed_url, src.media_url)
          : null
      const needsProxy =
        shouldProxyHls(provider, streamUrl)
      const playable =
        needsProxy && !streamUrl.startsWith("/api/eagle/hls-proxy")
          ? `/api/eagle/hls-proxy?url=${encodeURIComponent(streamUrl)}`
          : streamUrl
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: playable,
        snapshot_url: snapshot,
        stream_type: "hls",
      })
    }

    if (provider === "surfline" && src.embed_url) {
      const surfEmbed = deriveSurflineEmbed(String(src.embed_url))
      if (surfEmbed && await surflineEmbedIsReachable(surfEmbed)) {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          embed_url: surfEmbed,
          stream_type: "iframe",
        })
      }
      const hdontapFallbackPage = SURFLINE_HLS_FALLBACK_PAGES.get(sourceId)
      const hdontapHls = await resolveHdontapPageHls(hdontapFallbackPage)
      if (hdontapHls) {
        return NextResponse.json({
          id: sourceId,
          provider: "hdontap",
          kind,
          stream_url: `/api/eagle/hls-proxy?url=${encodeURIComponent(hdontapHls)}`,
          embed_url: hdontapFallbackPage,
          stream_type: "hls",
        })
      }
      const iframeFallback = SURFLINE_IFRAME_FALLBACKS.get(sourceId)
      if (iframeFallback) {
        return NextResponse.json({
          id: sourceId,
          provider: "skylinewebcams",
          kind,
          embed_url: iframeFallback,
          stream_url: iframeFallback,
          stream_type: "iframe",
        })
      }
      return NextResponse.json(
        { error: "surfline live stream unavailable", id: sourceId, provider, kind, source_status: "temporarily_unavailable" },
        { status: 503 },
      )
    }

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

    // Caltrans without HLS → proxied auto-refresh JPEG (better than vm/loc iframe).
    if (provider === "caltrans") {
      const snap = caltransProxiedSnapshot(src.embed_url, src.media_url)
      if (snap) {
        return NextResponse.json({
          id: sourceId,
          provider,
          kind,
          stream_url: snap,
          embed_url: src.embed_url,
          stream_type: "snapshot",
        })
      }
    }

    // Proxied still-frame (state DOT JPEG refresh, HPWREN live stills, etc.).
    const proxiedStill = proxiedStillImageUrl(src.media_url)
    if (proxiedStill) {
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: proxiedStill,
        embed_url: src.embed_url,
        stream_type: "snapshot",
      })
    }

    // Direct embed URL (YouTube, Twitch, Vimeo, EarthCam, Windy, etc.)
    if (src.embed_url) {
      const yt = normalizeYouTubeEmbedUrlSync(String(src.embed_url))
      const embed_url = yt || src.embed_url
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        embed_url,
        stream_type: "iframe",
      })
    }

    // Fallback to whatever media_url we have.
    if (src.media_url) {
      const media = String(src.media_url)
      return NextResponse.json({
        id: sourceId,
        provider,
        kind,
        stream_url: media,
        stream_type: media.endsWith(".m3u8")
          ? "hls"
          : media.endsWith(".mpg") || media.endsWith(".mpeg") || media.endsWith(".mjpg")
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
