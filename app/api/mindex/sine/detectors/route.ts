import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const res = await fetchMindexWithAuthRetry(`${base}/api/mindex/sine/detectors`, {
    cache: "no-store",
  })
  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
