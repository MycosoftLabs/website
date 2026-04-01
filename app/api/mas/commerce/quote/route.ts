/**
 * MAS Commerce Quote proxy - February 17, 2026
 *
 * Proxies to MAS /api/commerce/quote for UCP-first commerce.
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL =
  process.env.MAS_API_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://localhost:8001"

export async function POST(req: NextRequest) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  try {
    const res = await fetch(`${MAS_API_URL.replace(/\/$/, "")}/api/commerce/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 502 }
    )
  }
}
