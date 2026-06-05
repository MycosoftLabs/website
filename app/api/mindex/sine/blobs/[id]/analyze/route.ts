import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = request.nextUrl.searchParams.toString()
  const url = `${base}/api/mindex/sine/blobs/${id}/analyze${qs ? `?${qs}` : ""}`
  const res = await fetchMindexWithAuthRetry(url, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  })
  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
