import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const headers = new Headers({
    Accept: request.headers.get("Accept") || "*/*",
  })
  const range = request.headers.get("Range")
  if (range) headers.set("Range", range)

  const res = await fetchMindexWithAuthRetry(
    `${base}/api/mindex/sine/library/blobs/${id}/stream`,
    {
      cache: "no-store",
      headers,
    },
  )
  if (!res.ok) {
    return NextResponse.json(
      { error: "stream_failed", status: res.status },
      { status: res.status },
    )
  }
  const outHeaders = new Headers()
  for (const header of [
    "Accept-Ranges",
    "Content-Disposition",
    "Content-Length",
    "Content-Range",
    "Content-Type",
    "ETag",
    "Last-Modified",
  ]) {
    const value = res.headers.get(header)
    if (value) outHeaders.set(header, value)
  }
  if (!outHeaders.has("Content-Type")) outHeaders.set("Content-Type", "application/octet-stream")

  return new NextResponse(res.body, { status: res.status, headers: outHeaders })
}
