/**
 * A2A Message Send proxy - February 17, 2026
 *
 * Proxies POST to MAS /a2a/v1/message/send for A2A protocol message/send.
 * Keeps browser CORS and auth boundaries consistent.
 * Path: POST /api/myca/a2a/message/send
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL =
  process.env.MAS_API_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://192.168.0.188:8001"

export async function POST(req: NextRequest) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    // ignore
  }

  try {
    const base = MAS_API_URL.replace(/\/$/, "")
    const res = await fetch(`${base}/a2a/v1/message/send`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: "A2A message send failed", detail: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
