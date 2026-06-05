import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const mindexUrl = resolveMindexServerBaseUrl().replace(/\/$/, "")

  let body: { job?: string; full_sync?: boolean; max_pages?: number; domain_mode?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.job?.trim()) {
    return NextResponse.json({ error: "job is required" }, { status: 400 })
  }

  try {
    const response = await fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/etl/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job: body.job.trim(),
        full_sync: body.full_sync ?? false,
        max_pages: body.max_pages,
        domain_mode: body.domain_mode,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MINDEX unavailable" },
      { status: 503 },
    )
  }
}
