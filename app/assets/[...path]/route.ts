import { createReadStream } from "fs"
import { stat } from "fs/promises"
import path from "path"
import { Readable } from "stream"
import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ASSETS_ROOT = path.resolve(process.cwd(), "public", "assets")

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
}

function resolveAssetPath(parts: string[]): string | null {
  const target = path.resolve(ASSETS_ROOT, ...parts)
  const relative = path.relative(ASSETS_ROOT, target)
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null
  return target
}

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream"
}

function cacheControlFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".mp4" || ext === ".webm" || ext === ".mov") {
    return "public, max-age=86400, stale-while-revalidate=604800, immutable"
  }
  return "public, max-age=86400, stale-while-revalidate=604800"
}

function parseRange(rangeHeader: string | null, size: number): { start: number; end: number } | null {
  if (!rangeHeader) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  let start = rawStart ? Number.parseInt(rawStart, 10) : Number.NaN
  let end = rawEnd ? Number.parseInt(rawEnd, 10) : Number.NaN

  if (Number.isNaN(start) && Number.isNaN(end)) return null
  if (Number.isNaN(start)) {
    const suffixLength = end
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else if (Number.isNaN(end)) {
    end = size - 1
  }

  if (start < 0 || end < start || start >= size) return null
  return { start, end: Math.min(end, size - 1) }
}

async function handleAsset(request: NextRequest, params: Promise<{ path?: string[] }>, headOnly = false) {
  const { path: assetPath = [] } = await params
  const filePath = resolveAssetPath(assetPath)
  if (!filePath) return new Response("Not found", { status: 404 })

  try {
    const info = await stat(filePath)
    if (!info.isFile()) return new Response("Not found", { status: 404 })

    const range = parseRange(request.headers.get("range"), info.size)
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControlFor(filePath),
      "Content-Type": contentTypeFor(filePath),
      "X-Content-Type-Options": "nosniff",
    })

    if (range) {
      const contentLength = range.end - range.start + 1
      headers.set("Content-Length", String(contentLength))
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`)
      const body = headOnly ? null : Readable.toWeb(createReadStream(filePath, range)) as BodyInit
      return new Response(body, { status: 206, headers })
    }

    headers.set("Content-Length", String(info.size))
    const body = headOnly ? null : Readable.toWeb(createReadStream(filePath)) as BodyInit
    return new Response(body, { headers })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleAsset(request, context.params)
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleAsset(request, context.params, true)
}
