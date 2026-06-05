/**
 * MINDEX Sync / ETL control — proxies to MINDEX with internal auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const mindexUrl = resolveMindexServerBaseUrl().replace(/\/$/, "")

  let body: { sources?: string[]; limit?: number; full_sync?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // empty body ok
  }

  try {
    const response = await fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: body.sources ?? ["iNaturalist", "GBIF", "MycoBank", "GenBank"],
        limit: body.limit ?? 1000,
        full_sync: body.full_sync ?? false,
      }),
      signal: AbortSignal.timeout(5_000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to queue MINDEX ETL", status: response.status, ...data },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: "ETL jobs queued on MINDEX",
      ...data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "MINDEX service unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}

export async function GET() {
  const mindexUrl = resolveMindexServerBaseUrl().replace(/\/$/, "")

  try {
    const response = await fetchMindexWithAuthRetry(`${mindexUrl}/api/mindex/etl-status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_500),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ETL status", status: response.status },
        { status: response.status },
      )
    }

    const data = await response.json()
    const sources: string[] = Array.isArray(data.available_sources)
      ? data.available_sources
      : Array.isArray(data.jobs)
        ? [...new Set(data.jobs.map((j: { source?: string }) => j.source).filter(Boolean))]
        : []

    return NextResponse.json({
      ...data,
      available_sources: sources,
      status: data.status ?? "unknown",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "MINDEX service unavailable",
        status: "unknown",
        available_sources: [],
        recent_syncs: [],
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}
