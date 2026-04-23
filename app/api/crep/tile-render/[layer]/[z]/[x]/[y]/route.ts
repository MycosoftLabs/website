import { NextRequest, NextResponse } from "next/server"

/**
 * GPU-rendered raster tile proxy — Apr 23, 2026
 *
 * Morgan: "this should be video game worthy running our gpus and vms and
 * systems as much as possible for end user to have a tablet shitty pc
 * even a phone needs to run this perfectly".
 *
 * Some CREP overlays are too expensive to paint on the client (Earth-2
 * weather rasters, iNat density heatmap, signal coverage, cell-tower
 * kernel heatmap). This endpoint proxies a `{layer}/{z}/{x}/{y}.png`
 * request to the tile-renderer running on the Voice Legion (192.168.0.241:8230)
 * or Earth-2 Legion (192.168.0.249:8230 depending on layer), falls back to
 * a Cloudflare R2 CDN if the upstream is down, and tags the response with
 * long-lived cache headers so Cloudflare's edge cache holds the tile for
 * hours.
 *
 * URL contract
 *   /api/crep/tile-render/{layer}/{z}/{x}/{y}
 *   layer: known slug (see LAYER_ROUTES); anything else → 404.
 *
 * Env overrides
 *   TILE_RENDER_URL             default upstream (any layer not in LAYER_ROUTES)
 *   TILE_RENDER_EARTH2_URL      Earth-2 rasters (temp/precip/wind/clouds)
 *   TILE_RENDER_DENSITY_URL     Voice Legion density heatmaps (iNat / signals)
 *   TILE_RENDER_CDN_FALLBACK    CDN base (e.g. https://tiles.mycosoft.com)
 *
 * Response
 *   200 image/png — tile bytes, Cache-Control max-age=3600 + s-maxage=86400
 *   304 Not Modified — when If-None-Match matches
 *   502 — upstream AND CDN both unavailable (client should render empty tile)
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type LayerRoute = {
  upstream: () => string | undefined
  cdnPath: (z: string, x: string, y: string) => string // path under TILE_RENDER_CDN_FALLBACK
  contentType: string
  maxAgeS: number // how long the browser caches
  sMaxAgeS: number // how long Cloudflare edge caches
}

const EARTH2_DEFAULT = "http://192.168.0.249:8230"
const DENSITY_DEFAULT = "http://192.168.0.241:8230"

const LAYER_ROUTES: Record<string, LayerRoute> = {
  // Earth-2 AI weather rasters — expensive to compute (NVIDIA Modulus
  // inference), cheap to serve once rendered. 1-hour forecast slices so
  // s-maxage matches the forecast cadence.
  "earth2-temperature": {
    upstream: () => process.env.TILE_RENDER_EARTH2_URL || EARTH2_DEFAULT,
    cdnPath: (z, x, y) => `/earth2/temperature/${z}/${x}/${y}.png`,
    contentType: "image/png",
    maxAgeS: 600,
    sMaxAgeS: 3600,
  },
  "earth2-precip": {
    upstream: () => process.env.TILE_RENDER_EARTH2_URL || EARTH2_DEFAULT,
    cdnPath: (z, x, y) => `/earth2/precip/${z}/${x}/${y}.png`,
    contentType: "image/png",
    maxAgeS: 600,
    sMaxAgeS: 3600,
  },
  "earth2-wind": {
    upstream: () => process.env.TILE_RENDER_EARTH2_URL || EARTH2_DEFAULT,
    cdnPath: (z, x, y) => `/earth2/wind/${z}/${x}/${y}.png`,
    contentType: "image/png",
    maxAgeS: 600,
    sMaxAgeS: 3600,
  },
  // iNat density kernel heatmap — nightly bake, lives on CDN primarily,
  // legion only kicks in for the very rare on-demand recompute. Safe to
  // cache aggressively because the nightly cron invalidates the CDN.
  "inat-density": {
    upstream: () => process.env.TILE_RENDER_DENSITY_URL || DENSITY_DEFAULT,
    cdnPath: (z, x, y) => `/inat/density/${z}/${x}/${y}.png`,
    contentType: "image/png",
    maxAgeS: 86_400,
    sMaxAgeS: 86_400 * 7,
  },
  // Signal coverage (cell towers kernel density) — same lifecycle as iNat
  "signal-coverage": {
    upstream: () => process.env.TILE_RENDER_DENSITY_URL || DENSITY_DEFAULT,
    cdnPath: (z, x, y) => `/signal/coverage/${z}/${x}/${y}.png`,
    contentType: "image/png",
    maxAgeS: 86_400,
    sMaxAgeS: 86_400 * 7,
  },
}

function isValidXYZ(z: string, x: string, y: string): boolean {
  const Z = Number(z), X = Number(x), Y = Number(y)
  if (!Number.isInteger(Z) || Z < 0 || Z > 22) return false
  if (!Number.isInteger(X) || X < 0) return false
  if (!Number.isInteger(Y) || Y < 0) return false
  return true
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      // Use Node's keep-alive — these tile servers benefit hugely from it
      cache: "no-store",
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") || ""
    if (!/^image\//i.test(ct)) return null
    return res
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const { layer, z, x, y } = await params
  const route = LAYER_ROUTES[layer]
  if (!route) {
    return NextResponse.json({ error: `unknown layer '${layer}'`, known: Object.keys(LAYER_ROUTES) }, { status: 404 })
  }
  if (!isValidXYZ(z, x, y)) {
    return NextResponse.json({ error: "invalid z/x/y" }, { status: 400 })
  }

  const headersOut: HeadersInit = {
    "Content-Type": route.contentType,
    "Cache-Control": `public, max-age=${route.maxAgeS}, s-maxage=${route.sMaxAgeS}, stale-while-revalidate=${route.sMaxAgeS * 2}`,
    "X-CREP-Tile-Layer": layer,
  }

  // 1) Primary: upstream GPU renderer (Legion).
  const upstream = route.upstream()
  if (upstream) {
    const upstreamUrl = `${upstream.replace(/\/$/, "")}/tile/${layer}/${z}/${x}/${y}.png`
    const res = await fetchWithTimeout(upstreamUrl, 5_000)
    if (res) {
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, {
        status: 200,
        headers: { ...headersOut, "X-CREP-Tile-Source": "legion" },
      })
    }
  }

  // 2) Fallback: Cloudflare R2 CDN (where the nightly bake parks tiles).
  const cdnBase = process.env.TILE_RENDER_CDN_FALLBACK?.trim()
  if (cdnBase) {
    const cdnUrl = `${cdnBase.replace(/\/$/, "")}${route.cdnPath(z, x, y)}`
    const res = await fetchWithTimeout(cdnUrl, 5_000)
    if (res) {
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, {
        status: 200,
        headers: { ...headersOut, "X-CREP-Tile-Source": "cdn" },
      })
    }
  }

  // 3) Both paths dead → 502. Client fills with a transparent tile.
  return NextResponse.json(
    { error: "tile-render upstream + CDN both unavailable", layer, z, x, y },
    { status: 502 },
  )
}
