import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const res = await fetchMindexWithAuthRetry(
    `${base}/api/mindex/sine/blobs/${id}/visualisation`,
    { cache: "no-store", signal: AbortSignal.timeout(60_000) },
  )
  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
