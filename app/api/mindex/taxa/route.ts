/**
 * Taxa API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX taxa endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { searchTaxa, listTaxa } from "@/lib/integrations/mindex"
import { mockTaxa } from "@/lib/integrations/mock-data"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")

  // Return mock data if integrations disabled
  if (!env.integrationsEnabled) {
    const filtered = query
      ? mockTaxa.filter(
          (t) =>
            t.scientificName.toLowerCase().includes(query.toLowerCase()) ||
            t.commonName?.toLowerCase().includes(query.toLowerCase()),
        )
      : mockTaxa

    return NextResponse.json({
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      meta: { total: filtered.length, page, pageSize, hasMore: filtered.length > page * pageSize },
    })
  }

  try {
    const result = query ? await searchTaxa({ query, page, pageSize }) : await listTaxa({ page, pageSize })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching taxa:", error)
    return NextResponse.json({ error: "Failed to fetch taxa", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
