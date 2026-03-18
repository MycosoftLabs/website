/**
 * Ground Station Observations API Proxy
 *
 * Proxies scheduled observations CRUD and status management.
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const status = params.get("status")
  const noradId = params.get("norad_id")

  try {
    let url = `${GS_API_URL}/api/scheduled-observations`
    const queryParts: string[] = []
    if (status) queryParts.push(`status=${status}`)
    if (noradId) queryParts.push(`norad_id=${noradId}`)
    if (queryParts.length) url += `?${queryParts.join("&")}`

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station observations unavailable", details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const id = params.get("id")
  const action = params.get("action")

  try {
    if (action === "cancel" && id) {
      const res = await fetch(`${GS_API_URL}/api/scheduled-observations/${id}/cancel`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`GS backend: ${res.status}`)
      return NextResponse.json(await res.json())
    }

    const body = await request.json()
    const res = await fetch(`${GS_API_URL}/api/scheduled-observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station observation create/update failed", details: String(error) },
      { status: 502 }
    )
  }
}
