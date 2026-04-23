import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Compounds by species API - Server-side proxy to MINDEX.
 * NO client env vars needed; MINDEX_API_URL is server-only.
 */
const MINDEX_API_URL = resolveMindexServerBaseUrl()
const MINDEX_API_KEY = process.env.MINDEX_API_KEY?.trim() || ""

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taxonId } = await params

  if (!taxonId) {
    return NextResponse.json({ error: "Taxon ID required" }, { status: 400 })
  }

  try {
    const url = `${MINDEX_API_URL}/api/mindex/compounds/for-taxon/${taxonId}`
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (MINDEX_API_KEY) headers["X-API-Key"] = MINDEX_API_KEY
    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: "MINDEX unavailable", compounds: [], detail: text || res.statusText },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({
      compounds: data.compounds || [],
      source: "mindex",
    })
  } catch (err) {
    console.error("Compounds API error:", err)
    return NextResponse.json(
      {
        error: "Failed to fetch compounds",
        compounds: [],
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
