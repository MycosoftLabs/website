import { createReadStream, existsSync, statSync } from "fs"
import { Readable } from "stream"
import { NextRequest, NextResponse } from "next/server"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PUBLIC_COPY = path.join(
  process.cwd(),
  "public",
  "fusarium",
  "bluesight-lab",
  "test-pxl-20260913.mp4",
)
const DOWNLOADS_PXL = "C:\\Users\\Owner1\\Downloads\\PXL_20260913_211840104.mp4"

function resolveVideo(): string | null {
  const envPath = process.env.BLUESIGHT_TRAIL_VIDEO
  if (envPath && existsSync(envPath)) return envPath
  if (existsSync(PUBLIC_COPY)) return PUBLIC_COPY
  if (existsSync(DOWNLOADS_PXL)) return DOWNLOADS_PXL
  return null
}

export function GET(request: NextRequest) {
  const file = resolveVideo()
  if (!file) {
    return NextResponse.json(
      {
        live: false,
        error: "PXL trail clip not found. Place PXL_20260913_211840104.mp4 in Downloads or public/fusarium/bluesight-lab.",
      },
      { status: 404 },
    )
  }
  const stat = statSync(file)
  const range = request.headers.get("range")
  const type = "video/mp4"
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range)
    const start = match?.[1] ? Number(match[1]) : 0
    const end = match?.[2] ? Number(match[2]) : stat.size - 1
    const chunk = end - start + 1
    const stream = createReadStream(file, { start, end })
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(chunk),
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    })
  }
  const stream = createReadStream(file)
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  })
}
