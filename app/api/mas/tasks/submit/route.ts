/**
 * Proxy MAS unified task intake — May 03, 2026
 * POST /api/mas/tasks/submit → MAS /api/tasks/submit
 */
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function masBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "").replace(/\/$/, "")
}

export async function POST(request: NextRequest) {
  const base = masBase()
  if (!base) {
    return NextResponse.json({ error: "MAS_API_URL unset" }, { status: 503 })
  }
  const bodyText = await request.text()
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": request.headers.get("Content-Type") || "application/json",
  }
  const key = process.env.MAS_INTERNAL_API_KEY || process.env.MAS_API_KEY
  if (key) headers["X-API-Key"] = key

  try {
    const res = await fetch(`${base}/api/tasks/submit`, {
      method: "POST",
      headers,
      body: bodyText || "{}",
      signal: AbortSignal.timeout(60_000),
    })
    const buf = await res.arrayBuffer()
    const ct = res.headers.get("Content-Type") || "application/json"
    return new NextResponse(buf, { status: res.status, headers: { "Content-Type": ct } })
  } catch (e) {
    return NextResponse.json({ error: "mas_submit_proxy_failed", detail: String(e) }, { status: 502 })
  }
}
