/**
 * MYCA Grounding Thoughts API – proxy to MAS grounding thoughts.
 * Returns ThoughtObjects from the workspace.
 * Created: February 17, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topK = searchParams.get("top_k") || "10"
    const url = `${MAS_API_URL}/api/myca/grounding/thoughts?top_k=${encodeURIComponent(topK)}`
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return NextResponse.json({ thoughts: [], count: 0, enabled: false }, { status: 200 })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ thoughts: [], count: 0, enabled: false }, { status: 200 })
  }
}
