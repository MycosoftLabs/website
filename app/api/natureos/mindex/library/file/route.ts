import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import { Readable } from "node:stream"

import { NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import {
  findMindexLibraryRoot,
  getLibraryBlobMimeType,
  resolveLibraryBlobPath,
} from "@/lib/mindex/library-files"

export const dynamic = "force-dynamic"

type ByteRange = {
  start: number
  end: number
}

function parseByteRangeHeader(range: string | null, size: number): ByteRange | "invalid" | null {
  if (!range) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match || size < 1) return "invalid"

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return "invalid"

  let start: number
  let end: number

  if (!rawStart) {
    const suffixLength = Number(rawEnd)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return "invalid"
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd ? Number(rawEnd) : size - 1
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid"
  }

  if (start < 0 || start >= size || end < start) return "invalid"

  return {
    start,
    end: Math.min(end, size - 1),
  }
}

async function proxyRemoteLibraryBlob(id: string, request: NextRequest): Promise<Response> {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/library/blobs/${encodeURIComponent(id)}/stream`
  const headers = new Headers({
    Accept: request.headers.get("Accept") || "*/*",
  })
  const range = request.headers.get("Range")
  if (range) headers.set("Range", range)

  let upstream: Response
  try {
    upstream = await fetchMindexWithAuthRetry(target, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(60_000),
    })
  } catch (error) {
    console.error("[mindex-library] remote stream failed", error)
    return NextResponse.json({ error: "Library blob stream could not be opened." }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel().catch(() => undefined)
    return NextResponse.json({ error: "Library blob stream could not be opened." }, { status: upstream.status || 502 })
  }

  const outHeaders = new Headers()
  const passthroughHeaders = [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "ETag",
    "Last-Modified",
  ]
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header)
    if (value) outHeaders.set(header, value)
  }
  if (!outHeaders.has("Content-Type")) outHeaders.set("Content-Type", "application/octet-stream")
  outHeaders.set("Cache-Control", "private, max-age=60")

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  })
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing library blob id." }, { status: 400 })
  }

  const remoteId = request.nextUrl.searchParams.get("remote_id") || id

  if (request.nextUrl.searchParams.get("remote") === "1") {
    return proxyRemoteLibraryBlob(remoteId, request)
  }

  const root = await findMindexLibraryRoot()
  if (!root) {
    return proxyRemoteLibraryBlob(remoteId, request)
  }

  try {
    const { absolutePath } = await resolveLibraryBlobPath(root, id)
    const stat = await fs.stat(absolutePath)
    const mimeType = getLibraryBlobMimeType(absolutePath)
    const range = parseByteRangeHeader(request.headers.get("Range"), stat.size)

    if (range === "invalid") {
      return new Response(null, {
        status: 416,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=60",
          "Content-Range": `bytes */${stat.size}`,
        },
      })
    }

    if (range) {
      const stream = createReadStream(absolutePath, {
        start: range.start,
        end: range.end,
      })
      const contentLength = range.end - range.start + 1

      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=60",
          "Content-Length": String(contentLength),
          "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
          "Content-Type": mimeType,
        },
      })
    }

    const stream = createReadStream(absolutePath)

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Type": mimeType,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    console.error("[mindex-library] file stream failed", error)
    return proxyRemoteLibraryBlob(remoteId, request)
  }
}
