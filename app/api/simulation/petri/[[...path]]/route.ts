/**
 * Petri Dish Simulation API Proxy
 *
 * Proxies all /api/simulation/petri/* requests to MAS.
 * Enables website Petri UI to use backend simulation engine.
 *
 * Created: Feb 20, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL =
  process.env.MAS_API_URL ||
  process.env.MAS_ORCHESTRATOR_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://192.168.0.188:8001"

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[] | undefined,
  method: string
): Promise<NextResponse> {
  const segs = pathSegments ?? []
  const path = segs.length > 0 ? segs.join("/") : ""
  const base = `${MAS_API_URL.replace(/\/$/, "")}/api/simulation/petri`
  const url = path ? `${base}/${path}` : base

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    }
    if (method !== "GET" && method !== "HEAD") {
      const body = await request.text()
      if (body) init.body = body
    }

    const res = await fetch(url, init)
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("Petri API proxy error:", error)
    return NextResponse.json(
      {
        error: "Backend unavailable",
        message: "Petri simulation API could not be reached. Check MAS connection.",
      },
      { status: 503 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  return proxyRequest(request, path, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  return proxyRequest(request, path, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  return proxyRequest(request, path, "PUT")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  return proxyRequest(request, path, "DELETE")
}
