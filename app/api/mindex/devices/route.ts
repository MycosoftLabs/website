/**
 * Devices API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX device endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getDevices } from "@/lib/integrations/mindex"
import { mockDevices } from "@/lib/integrations/mock-data"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
  const type = searchParams.get("type")

  // Return mock data if integrations disabled
  if (!env.integrationsEnabled) {
    const filtered = type ? mockDevices.filter((d) => d.type === type) : mockDevices
    return NextResponse.json({
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      meta: { total: filtered.length, page, pageSize, hasMore: filtered.length > page * pageSize },
    })
  }

  try {
    const result = await getDevices({ page, pageSize })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
