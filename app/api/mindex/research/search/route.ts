import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
const MINDEX_RESEARCH = `${MINDEX_API_URL}/api/mindex/research`

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q") || searchParams.get("search") || ""

  if (query.trim().length < 2) {
    return NextResponse.json({ error: "Provide search query" }, { status: 400 })
  }

  const params = new URLSearchParams({
    search: query.trim(),
    limit: searchParams.get("limit") || "20",
    offset: searchParams.get("offset") || "0",
  })

  const yearFrom = searchParams.get("year_from")
  const yearTo = searchParams.get("year_to")
  const openAccessOnly = searchParams.get("open_access_only")

  if (yearFrom) params.set("year_from", yearFrom)
  if (yearTo) params.set("year_to", yearTo)
  if (openAccessOnly) params.set("open_access_only", openAccessOnly)

  try {
    const response = await fetch(`${MINDEX_RESEARCH}?${params.toString()}`, {
      headers: mindexHeaders(),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    })

    if (!response.ok) {
      const details = await response.text().catch(() => "")
      return NextResponse.json(
        {
          error: "MINDEX research error",
          status: response.status,
          details: details || undefined,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MINDEX research proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 502 })
  }
}
