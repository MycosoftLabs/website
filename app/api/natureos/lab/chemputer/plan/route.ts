import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL =
  process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://localhost:8001"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }
  try {
    const res = await fetch(`${MAS_API_URL}/api/natureos/lab/chemputer/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    })
    const text = await res.text()
    let payload: unknown = text
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { raw: text }
    }
    return NextResponse.json(payload as object, { status: res.status })
  } catch (e) {
    const message = e instanceof Error ? e.message : "mas_unreachable"
    return NextResponse.json({ error: "proxy_failed", detail: message }, { status: 502 })
  }
}
