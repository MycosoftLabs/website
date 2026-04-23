import { NextRequest, NextResponse } from "next/server"
import { getAgentProfile } from "@/lib/agent-auth"
import { meterAndLimit } from "@/lib/worldview/metering"
import { err, newRequestId } from "@/lib/worldview/envelope"

/**
 * Worldview v1 — tile proxy — Apr 23, 2026
 *
 * GET /api/worldview/v1/tile/{z}/{x}/{y}?source=<tileset>[&ext=pbf|png|webp]
 *
 * Sources (initial set):
 *   esri-satellite   → ESRI World_Imagery (raster png/jpg)
 *   osm              → OSM standard raster
 *   mapbox-streets   → Mapbox streets vector (requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)
 *   gibs-modis       → NASA GIBS MODIS Terra true color
 *   gibs-viirs       → NASA GIBS VIIRS true color
 *
 * Billing: 0.1 cents per tile (rounded up to 1 per request). Designed
 * for map consumers — cheap enough that bursts don't bankrupt agents,
 * but non-zero so tile spam gets tracked.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface TileSource {
  id: string
  scope: "public" | "agent"
  cost_per_tile: number
  rate_weight: number
  url: (z: number, x: number, y: number, ext?: string) => string
  content_type: string
}

const SOURCES: Record<string, TileSource> = {
  "esri-satellite": {
    id: "esri-satellite",
    scope: "agent",
    cost_per_tile: 1,
    rate_weight: 1,
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    content_type: "image/jpeg",
  },
  "osm": {
    id: "osm",
    scope: "agent",
    cost_per_tile: 1,
    rate_weight: 1,
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    content_type: "image/png",
  },
  "gibs-modis": {
    id: "gibs-modis",
    scope: "agent",
    cost_per_tile: 1,
    rate_weight: 1,
    url: (z, x, y) => {
      const d = new Date()
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`
    },
    content_type: "image/jpeg",
  },
  "gibs-viirs": {
    id: "gibs-viirs",
    scope: "agent",
    cost_per_tile: 1,
    rate_weight: 1,
    url: (z, x, y) => {
      const d = new Date()
      const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${day}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`
    },
    content_type: "image/jpeg",
  },
}

export async function GET(req: NextRequest, { params }: { params: { z: string; x: string; y: string } }) {
  const requestId = newRequestId()
  const z = Number(params.z), x = Number(params.x), y = Number(params.y)
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return err({
      code: "INVALID_PARAMS",
      message: "z/x/y must be integers",
      status: 400,
      request_id: requestId,
    })
  }
  if (z < 0 || z > 22 || x < 0 || y < 0) {
    return err({
      code: "INVALID_PARAMS",
      message: "tile coordinates out of range",
      status: 400,
      request_id: requestId,
    })
  }

  const sourceId = req.nextUrl.searchParams.get("source") || "esri-satellite"
  const source = SOURCES[sourceId]
  if (!source) {
    return err({
      code: "DATASET_NOT_FOUND",
      message: `Unknown tile source "${sourceId}". Known: ${Object.keys(SOURCES).join(", ")}.`,
      status: 404,
      request_id: requestId,
    })
  }

  // Auth
  const profile = await getAgentProfile(req)
  if (!profile) {
    return err({
      code: "UNAUTHENTICATED",
      message: "Tile requests require an API key.",
      status: 401,
      request_id: requestId,
      details: { top_up_url: "https://mycosoft.com/agent" },
    })
  }

  // Meter + rate-limit. Tiles cost 1 cent each — cheap but counted.
  const meter = await meterAndLimit({
    api_key_id: profile.api_key_id!,
    profile_id: profile.profile_id,
    dataset_id: `tile:${source.id}`,
    cost_per_request: source.cost_per_tile,
    rate_weight: source.rate_weight,
    cache_hit: false,
    kind: "tile",
    request_id: requestId,
  })
  if (!meter.ok) {
    if (meter.reason === "insufficient_balance") {
      return err({
        code: "INSUFFICIENT_BALANCE",
        message: `Tile costs ${source.cost_per_tile}¢, balance ${meter.balance_cents}¢.`,
        status: 402,
        request_id: requestId,
      })
    }
    return err({
      code: "RATE_LIMITED",
      message: "Tile rate limit exceeded.",
      status: 429,
      request_id: requestId,
      rate_limit: meter.rate_limit,
      headers: { "Retry-After": String(meter.retry_after_s ?? 60) },
    })
  }

  // Fetch upstream tile
  try {
    const upstreamUrl = source.url(z, x, y)
    const r = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Mycosoft-WorldviewV1/1.0 (https://mycosoft.com)" },
      cache: "no-store",
    })
    if (!r.ok) {
      return err({
        code: "UPSTREAM_UNREACHABLE",
        message: `tile upstream ${r.status}`,
        status: 502,
        request_id: requestId,
      })
    }
    const buf = await r.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") || source.content_type,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        "X-Worldview-Tile-Source": source.id,
        "X-Worldview-Tile-Cost": String(meter.cost_debited),
        "X-Worldview-Request-Id": requestId,
      },
    })
  } catch (e: any) {
    return err({
      code: "UPSTREAM_UNREACHABLE",
      message: e?.message || "tile fetch failed",
      status: 502,
      request_id: requestId,
    })
  }
}
