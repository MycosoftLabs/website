/**
 * MAS C-Suite Finance Status Proxy
 *
 * Proxies to MAS /api/csuite/cfo/status for CFO finance status.
 * Used by finance dashboards and C-suite plugins.
 *
 * @route GET /api/mas/csuite/finance/status
 */

import { NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET() {
  try {
    const res = await fetch(`${MAS_API_URL}/api/csuite/cfo/status`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: "MAS finance status failed", status: res.status, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error("[MAS/csuite/finance/status] fetch error:", err)
    return NextResponse.json(
      { error: "MAS unreachable", status: "offline" },
      { status: 502 }
    )
  }
}
