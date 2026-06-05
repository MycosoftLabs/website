import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { mindexUpstreamHeaders } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const mindexUrl = env.mindexApiBaseUrl.replace(/\/$/, "")
  const base = mindexUrl.endsWith("/api/mindex") ? mindexUrl : `${mindexUrl}/api/mindex`
  const url = `${base}/ledger/anchor/records`

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...mindexUpstreamHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("MINDEX ledger anchor proxy error:", error)
    return NextResponse.json(
      { ok: false, message: "MINDEX ledger anchor unreachable" },
      { status: 503 },
    )
  }
}
