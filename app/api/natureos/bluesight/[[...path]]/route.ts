import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL =
  process.env.MAS_API_URL ||
  process.env.MAS_ORCHESTRATOR_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://localhost:8001"

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[] | undefined,
  method: string
): Promise<NextResponse> {
  const segs = pathSegments ?? []
  const path = segs.length > 0 ? segs.join("/") : ""
  const query = request.nextUrl.searchParams.toString()
  const base = `${MAS_API_URL.replace(/\/$/, "")}/api/natureos/bluesight`
  const url = path ? `${base}/${path}` : base
  const target = query ? `${url}?${query}` : url
  try {
    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
    }
    if (method !== "GET" && method !== "HEAD") {
      const body = await request.text()
      if (body) init.body = body
    }
    const response = await fetch(target, init)
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable", message: "BlueSight platform API could not be reached." },
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

