/**
 * Ground Station Hardware API Proxy
 *
 * Proxies hardware management: SDRs, rotators, rigs, cameras
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GS_API_URL = process.env.GROUND_STATION_URL || "http://localhost:5000"

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "all"

  try {
    const endpoints: Record<string, string> = {
      sdrs: "/api/sdrs",
      rotators: "/api/rotators",
      rigs: "/api/rigs",
      cameras: "/api/cameras",
    }

    if (type === "all") {
      const results = await Promise.allSettled(
        Object.entries(endpoints).map(async ([key, path]) => {
          const res = await fetch(`${GS_API_URL}${path}`, { signal: AbortSignal.timeout(10000) })
          if (!res.ok) return { [key]: [] }
          return { [key]: await res.json() }
        })
      )
      const merged = results.reduce((acc, r) => {
        if (r.status === "fulfilled") Object.assign(acc, r.value)
        return acc
      }, {} as Record<string, unknown>)
      return NextResponse.json(merged)
    }

    const path = endpoints[type]
    if (!path) {
      return NextResponse.json({ error: `Unknown hardware type: ${type}` }, { status: 400 })
    }

    const res = await fetch(`${GS_API_URL}${path}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station hardware unavailable", details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  if (!type) {
    return NextResponse.json({ error: "type parameter required" }, { status: 400 })
  }

  const endpoints: Record<string, string> = {
    sdrs: "/api/sdrs",
    rotators: "/api/rotators",
    rigs: "/api/rigs",
    cameras: "/api/cameras",
  }

  const path = endpoints[type]
  if (!path) {
    return NextResponse.json({ error: `Unknown hardware type: ${type}` }, { status: 400 })
  }

  try {
    const body = await request.json()
    const res = await fetch(`${GS_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`GS backend: ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Ground Station hardware update failed", details: String(error) },
      { status: 502 }
    )
  }
}
