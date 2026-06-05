import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = request.nextUrl.searchParams.toString()
  const url = `${base}/api/mindex/sine/library/blobs${qs ? `?${qs}` : ""}`
  const res = await fetchMindexWithAuthRetry(url, { cache: "no-store" })
  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
