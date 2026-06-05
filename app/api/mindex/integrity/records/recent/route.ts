import { NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = resolveMindexServerBaseUrl()

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") || "8"
  try {
    const res = await fetchMindexWithAuthRetry(
      `${MINDEX_API_URL}/api/mindex/integrity/records/recent?limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json(
        { items: [], records: [], error: `MINDEX HTTP ${res.status}`, detail: body.slice(0, 200) },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { items: [], records: [], error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    )
  }
}
