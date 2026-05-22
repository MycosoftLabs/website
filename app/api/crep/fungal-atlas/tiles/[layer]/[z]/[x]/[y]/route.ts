import { NextRequest, NextResponse } from "next/server"
import { statSync, createReadStream } from "node:fs"
import { Readable } from "node:stream"
import path from "node:path"

/**
 * Fungal Atlas Tile Proxy — May 2026
 *
 * Serves XYZ raster tiles for AM and EcM fungal richness layers.
 *
 * Priority:
 *   1. Local SPUN rasters at public/data/crep/fungal/{layer}/{z}/{x}/{y}.png
 *      Place SPUN GeoTIFF exports (converted to XYZ PNGs) here for
 *      high-quality continuous richness surface. Path matches what
 *      FungalRichnessLayer registers as the tile URL template.
 *   2. GBIF occurrence density PNG tiles (real observational data, no fake).
 *      AM  → Glomeromycetes (taxon 7707728) — obligate AM fungi
 *      EcM → Agaricomycetes (taxon 1462986) — primary EcM forming class
 *
 * GBIF Maps API v2 caps at zoom 14; higher zoom requests are clamped.
 * Returns a transparent 1×1 PNG when GBIF has no data for a tile rather
 * than propagating errors.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GBIF backbone taxon keys (approximate — best available taxonomy match)
// Refine taxonKey per GBIF species page when SPUN data replaces this source.
const GBIF_TAXON_KEYS: Record<string, string> = {
  am:  "7707728",  // Glomeromycetes — obligate arbuscular mycorrhizal symbionts
  ecm: "1462986",  // Agaricomycetes — contains most EcM genera (Amanita, Cortinarius, Russula…)
}

// GBIF point-density styles chosen to contrast AM vs EcM visually.
// AM: purpleYellow.point (cool purple→yellow, SPUN-adjacent palette)
// EcM: fire.point (warm red→orange, distinct from AM)
const GBIF_STYLES: Record<string, string> = {
  am:  "purpleYellow.point",
  ecm: "fire.point",
}

// Where pre-rendered SPUN XYZ tiles should be placed for local serving.
// Structure: public/data/crep/fungal/{am|ecm}/{z}/{x}/{y}.png
const LOCAL_TILES_ROOT = path.join(process.cwd(), "public", "data", "crep", "fungal")

// 1×1 transparent PNG — returned when GBIF returns no tile for this coord.
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
)

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" } as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const { layer, z, x, y } = await params

  if (!["am", "ecm"].includes(layer)) {
    return NextResponse.json({ error: "invalid layer, must be 'am' or 'ecm'" }, { status: 400 })
  }

  const zi = parseInt(z, 10)
  const xi = parseInt(x, 10)
  const yi = parseInt(y, 10)
  if (isNaN(zi) || isNaN(xi) || isNaN(yi) || zi < 0 || zi > 22) {
    return NextResponse.json({ error: "invalid tile coordinates" }, { status: 400 })
  }

  // ── 1. Try local pre-rendered SPUN tiles ─────────────────────────────────
  const localPath = path.join(LOCAL_TILES_ROOT, layer, z, x, `${y}.png`)
  try {
    const s = statSync(localPath)
    if (s.isFile()) {
      const stream = Readable.toWeb(createReadStream(localPath)) as ReadableStream
      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(s.size),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          ...CORS_HEADERS,
        },
      })
    }
  } catch {
    // No local tile — fall through to GBIF.
  }

  // ── 2. Proxy GBIF occurrence density tiles ───────────────────────────────
  const gbifZ = Math.min(zi, 14) // GBIF tiles cap at z14
  const taxonKey = GBIF_TAXON_KEYS[layer]
  const style = GBIF_STYLES[layer]

  const gbifUrl =
    `https://api.gbif.org/v2/map/occurrence/density/${gbifZ}/${xi}/${yi}@2x.png` +
    `?taxonKey=${taxonKey}&style=${style}&srs=EPSG:3857&bin=square&squareSize=32`

  try {
    const upstream = await fetch(gbifUrl, {
      headers: { "User-Agent": "MycosoftLabs-CREP/1.0 (earth-simulator)" },
      signal: AbortSignal.timeout(8000),
    })

    if (!upstream.ok) {
      return new NextResponse(TRANSPARENT_PNG, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300",
          ...CORS_HEADERS,
        },
      })
    }

    const buf = await upstream.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        ...CORS_HEADERS,
      },
    })
  } catch {
    return new NextResponse(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
        ...CORS_HEADERS,
      },
    })
  }
}
