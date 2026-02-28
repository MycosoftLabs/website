import { NextResponse } from "next/server"

const MINDEX_BASE_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL

export async function GET() {
  if (!MINDEX_BASE_URL) {
    return NextResponse.json({ error: "MINDEX_API_URL not configured" }, { status: 503 })
  }

  try {
    const response = await fetch(`${MINDEX_BASE_URL}/api/mindex/health`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[API] MINDEX health proxy error:", error)
    return NextResponse.json({ error: "MINDEX health check failed" }, { status: 503 })
  }
}
