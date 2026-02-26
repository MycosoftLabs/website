/**
 * MYCA Reflection API – proxy to MAS reflection endpoints.
 * GET /api/myca/reflection?session_id=... → history
 * POST /api/myca/reflection → log
 * Created: February 17, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const limit = searchParams.get("limit") || "50"
    const params = new URLSearchParams({ limit })
    if (sessionId) params.set("session_id", sessionId)
    const url = `${MAS_API_URL}/api/reflection/history?${params.toString()}`
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      return NextResponse.json([], { status: 200 })
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const url = `${MAS_API_URL}/api/reflection/log`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
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
