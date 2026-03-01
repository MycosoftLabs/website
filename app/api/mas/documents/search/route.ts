import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 })

    const params = new URLSearchParams()
    params.set("q", q)
    const limit = searchParams.get("limit")
    const category = searchParams.get("category")
    const minScore = searchParams.get("min_score")
    if (limit) params.set("limit", limit)
    if (category) params.set("category", category)
    if (minScore) params.set("min_score", minScore)

    const response = await fetch(`${MAS_API_URL}/documents/search?${params.toString()}`, {
      cache: "no-store",
    })
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: text.slice(0, 300) }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}
