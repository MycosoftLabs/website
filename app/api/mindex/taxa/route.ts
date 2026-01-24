/**
 * Taxa API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX taxa endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { searchTaxa, listTaxa } from "@/lib/integrations/mindex"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")

  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "MINDEX integration is disabled. This endpoint requires a live MINDEX backend.",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL", "MINDEX_API_KEY"],
      },
      { status: 503 },
    )
  }

  try {
    const result = query ? await searchTaxa({ query, page, pageSize }) : await listTaxa({ page, pageSize })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching taxa:", error)
    return NextResponse.json({ error: "Failed to fetch taxa", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
