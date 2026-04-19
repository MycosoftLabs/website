import { NextRequest, NextResponse } from "next/server"
import { promises as fs, createReadStream, statSync } from "node:fs"
import { Readable } from "node:stream"
import path from "node:path"

/**
 * CREP static tile passthrough — Apr 19, 2026
 *
 * Diagnostic + workaround for a prod bug where
 *   /data/crep/tiles/cell-towers-global.pmtiles
 * returns 404 on mycosoft.com despite the 41 MB file being in the repo,
 * passing the Docker build context, and the other (<20 MB) pmtiles in the
 * same directory serving fine. Root cause still unclear — possibly Next.js
 * standalone runtime rejecting static files above some threshold.
 *
 * This route:
 *   • Streams the requested tile from disk using Node's fs API (bypasses
 *     the Next.js static handler entirely)
 *   • Supports HTTP Range requests (PMTiles is range-requested per tile
 *     by MapLibre — this is REQUIRED for vector-tile serving to work)
 *   • Returns informative JSON on 404 so we can tell "file missing on disk"
 *     from "other problem" — lets us verify the Docker image actually
 *     contains the file.
 *
 * URL: /api/crep/tiles/<path>
 *   e.g. /api/crep/tiles/cell-towers-global.pmtiles
 *        /api/crep/tiles/cell-towers-us-tw-instant.pmtiles
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TILES_ROOT = path.join(process.cwd(), "public", "data", "crep", "tiles")

function contentTypeFor(name: string): string {
  if (name.endsWith(".pmtiles")) return "application/octet-stream"
  if (name.endsWith(".mbtiles")) return "application/octet-stream"
  if (name.endsWith(".geojson")) return "application/json"
  if (name.endsWith(".json")) return "application/json"
  return "application/octet-stream"
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tile: string[] }> },
) {
  const { tile } = await params
  const rel = (tile || []).join("/")
  // Prevent path traversal
  if (rel.includes("..") || rel.startsWith("/")) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 })
  }
  const abs = path.join(TILES_ROOT, rel)

  let stat
  try {
    stat = statSync(abs)
  } catch {
    // Return a helpful JSON 404 so probes can tell "missing on disk" vs
    // "blocked upstream". Lists what IS in the tiles dir for debugging.
    let available: { name: string; bytes: number }[] = []
    try {
      const files = await fs.readdir(TILES_ROOT)
      for (const f of files) {
        try {
          const s = statSync(path.join(TILES_ROOT, f))
          available.push({ name: f, bytes: s.size })
        } catch { /* skip */ }
      }
    } catch { /* tiles dir itself missing */ }
    return NextResponse.json(
      { error: "tile not found on disk", requested: rel, tiles_root: TILES_ROOT, available },
      { status: 404 },
    )
  }

  const size = stat.size
  const range = req.headers.get("range")

  // Full-file path: 200 with whole payload.
  if (!range) {
    const nodeStream = createReadStream(abs)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(rel),
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    })
  }

  // Parse "bytes=start-end" (end optional)
  const m = range.match(/^bytes=(\d+)-(\d*)$/)
  if (!m) {
    return NextResponse.json({ error: "invalid Range header" }, { status: 416 })
  }
  const start = parseInt(m[1], 10)
  const end = m[2] ? parseInt(m[2], 10) : size - 1
  if (isNaN(start) || isNaN(end) || start < 0 || end >= size || start > end) {
    return NextResponse.json(
      { error: "Range out of bounds", size, requested: range },
      { status: 416, headers: { "Content-Range": `bytes */${size}` } },
    )
  }
  const nodeStream = createReadStream(abs, { start, end })
  const webStream = Readable.toWeb(nodeStream) as ReadableStream
  return new NextResponse(webStream, {
    status: 206,
    headers: {
      "Content-Type": contentTypeFor(rel),
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ tile: string[] }> },
) {
  const { tile } = await params
  const rel = (tile || []).join("/")
  if (rel.includes("..") || rel.startsWith("/")) {
    return new NextResponse(null, { status: 400 })
  }
  const abs = path.join(TILES_ROOT, rel)
  try {
    const s = statSync(abs)
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(rel),
        "Content-Length": String(s.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
