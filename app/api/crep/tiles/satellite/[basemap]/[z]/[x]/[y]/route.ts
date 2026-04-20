import { NextRequest, NextResponse } from "next/server"

/**
 * CREP Satellite Tile Cache Proxy — Apr 20, 2026
 *
 * Morgan: "i also want all of the latest mapbox and hd satelite imagry
 * predownloaded into MINDEX on a weekly bases replacing old tiles so we
 * always have fallback satelite data preloaded".
 *
 * Architecture:
 *   • /api/crep/tiles/satellite/{basemap}/{z}/{x}/{y} is the single tile
 *     endpoint the CREP map requests from.
 *   • Resolution order on each request:
 *       1. MINDEX cache (NAS at /mnt/nas/crep/tile-cache/{basemap}/{z}/{x}/{y}.jpg)
 *          — weekly-refreshed by scripts/etl/crep/prefetch-satellite-tiles.mjs
 *       2. Upstream fetch (Mapbox satellite-streets-v12 or ESRI World Imagery)
 *       3. On upstream 200: proxy response + async write-back to MINDEX
 *          so subsequent requests for the same tile hit the cache.
 *   • MINDEX cache is the "fallback" Morgan wants — if Mapbox goes down
 *     or the key quota is exhausted, cached tiles still serve and the
 *     map stays functional.
 *
 * Basemaps supported:
 *   • "mapbox-sat-streets"  → Mapbox satellite-streets-v12 (requires
 *                             NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)
 *   • "mapbox-sat"          → Mapbox satellite-v9 (sat imagery only,
 *                             no road labels)
 *   • "esri-world-imagery"  → ESRI ArcGIS World Imagery (free, no key)
 *
 * Weekly refresh is driven by a systemd timer on VM 189 that runs
 * scripts/etl/crep/prefetch-satellite-tiles.mjs. The script walks the
 * priority bbox list at zooms 0-14, fetches each tile, stores under a
 * staging path, then atomically swaps staging → current and archives
 * the previous week's tiles to {basemap}.prev (kept for 1 cycle).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_TILE_BASE =
  process.env.MINDEX_TILE_CACHE_URL ||
  `${process.env.MINDEX_API_URL || process.env.NEXT_PUBLIC_MINDEX_API_URL || "http://192.168.0.189:8000"}/api/mindex/tile-cache`

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  ""

// Upstream URL builders. Each takes {z,x,y} and returns the direct
// upstream tile URL. No-key upstreams first (ESRI), keyed upstreams
// last so they're only hit when explicitly requested.
const UPSTREAMS: Record<string, (z: string, x: string, y: string) => string | null> = {
  "mapbox-sat-streets": (z, x, y) => {
    if (!MAPBOX_TOKEN) return null
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`
  },
  "mapbox-sat": (z, x, y) => {
    if (!MAPBOX_TOKEN) return null
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`
  },
  "esri-world-imagery": (z, x, y) =>
    `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
}

function isValidTileParam(v: string, max = 22): boolean {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= Math.pow(2, max)
}

async function tryMindexCache(basemap: string, z: string, x: string, y: string): Promise<Response | null> {
  try {
    const res = await fetch(`${MINDEX_TILE_BASE}/${basemap}/${z}/${x}/${y}.jpg`, {
      signal: AbortSignal.timeout(3_000),
    })
    if (res.ok && res.headers.get("content-length") !== "0") return res
    return null
  } catch {
    return null
  }
}

async function writeBackToMindex(basemap: string, z: string, x: string, y: string, body: ArrayBuffer): Promise<void> {
  // Fire-and-forget; don't block the client response on this.
  // MINDEX exposes POST /api/mindex/tile-cache/{basemap}/{z}/{x}/{y}.jpg
  // with raw image/jpeg body. 200 = stored, 202 = already present,
  // 5xx = log and continue.
  try {
    const mindexWriteUrl = `${MINDEX_TILE_BASE}/${basemap}/${z}/${x}/${y}.jpg`
    await fetch(mindexWriteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        ...(process.env.MINDEX_INTERNAL_TOKEN
          ? { "X-Internal-Token": process.env.MINDEX_INTERNAL_TOKEN }
          : process.env.MINDEX_API_KEY
          ? { "X-API-Key": process.env.MINDEX_API_KEY }
          : {}),
      },
      body,
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined)
  } catch { /* ignore — best-effort cache warm */ }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ basemap: string; z: string; x: string; y: string }> },
) {
  const { basemap, z, x: xParam, y: yRaw } = await params
  // y may arrive with .jpg suffix depending on MapLibre client config
  const y = yRaw.replace(/\.(jpg|jpeg|png)$/i, "")
  const x = xParam

  if (!UPSTREAMS[basemap]) {
    return NextResponse.json({ error: `Unknown basemap: ${basemap}` }, { status: 400 })
  }
  if (!isValidTileParam(z, 22) || !isValidTileParam(x) || !isValidTileParam(y)) {
    return NextResponse.json({ error: "Invalid z/x/y" }, { status: 400 })
  }

  // 1. MINDEX cache (weekly-refreshed)
  const cached = await tryMindexCache(basemap, z, x, y)
  if (cached) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": cached.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000", // 1 week / 30 days
        "X-Tile-Source": "mindex-cache",
      },
    })
  }

  // 2. Upstream fetch
  const upstreamUrl = UPSTREAMS[basemap](z, x, y)
  if (!upstreamUrl) {
    return NextResponse.json(
      { error: `Basemap ${basemap} not configured (missing env key)` },
      { status: 503 },
    )
  }
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "MycosoftCREP/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}`, basemap, z, x, y },
        { status: upstream.status },
      )
    }
    const buf = await upstream.arrayBuffer()
    // 3. Async write-back to MINDEX (don't block response)
    writeBackToMindex(basemap, z, x, y, buf)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Tile-Source": "upstream",
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upstream fetch failed", basemap, z, x, y },
      { status: 502 },
    )
  }
}
