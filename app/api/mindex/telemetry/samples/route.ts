import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

export async function GET(request: NextRequest) {
  if (!MINDEX_API_KEY) return NextResponse.json({ error: "MINDEX_API_KEY not configured" }, { status: 500 })

  const sp = request.nextUrl.searchParams
  const device_slug = sp.get("device_slug")
  const limit = sp.get("limit") || "200"
  if (!device_slug) return NextResponse.json({ error: "device_slug required" }, { status: 400 })

  const url = `${MINDEX_API_URL}/api/telemetry/samples?device_slug=${encodeURIComponent(device_slug)}&limit=${encodeURIComponent(limit)}`
  const res = await fetch(url, { headers: { "X-API-Key": MINDEX_API_KEY }, signal: AbortSignal.timeout(10000) })
  const text = await res.text()
  if (!res.ok) return NextResponse.json({ error: "MINDEX request failed", details: text }, { status: res.status })
  return NextResponse.json(JSON.parse(text))
}
