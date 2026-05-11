import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

function buildMasUrl(path: string, request?: NextRequest) {
  if (!MAS_API_URL) return null
  const url = new URL(path, MAS_API_URL)
  if (request?.nextUrl?.search) url.search = request.nextUrl.search
  return url.toString()
}

export async function GET(request: NextRequest) {
  const target = buildMasUrl("/api/iot/analytics/trends", request)
  if (!target) {
    return NextResponse.json({ available: false, trends: [], error: "MAS_API_URL is not configured" })
  }

  try {
    const response = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
    const text = await response.text()
    const contentType = response.headers.get("content-type") || "application/json"
    if (!response.ok) return NextResponse.json({ available: false, trends: [], upstreamStatus: response.status })
    return new NextResponse(text, { headers: { "content-type": contentType } })
  } catch (error) {
    return NextResponse.json({
      available: false,
      trends: [],
      error: error instanceof Error ? error.message : "MAS IoT trends are unreachable",
    })
  }
}
