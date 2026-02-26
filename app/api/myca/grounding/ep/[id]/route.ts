/**
 * MYCA Grounding EP – proxy to MAS get experience packet by ID.
 * GET returns full EP structure. Dev-only recommended.
 * Created: February 17, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "ep_id required" }, { status: 400 })
    }
    const url = `${MAS_API_URL}/api/myca/grounding/ep/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Experience packet not found" }, { status: 404 })
      }
      const text = await response.text()
      return NextResponse.json({ error: text.slice(0, 300) }, { status: response.status })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unreachable" },
      { status: 500 }
    )
  }
}
