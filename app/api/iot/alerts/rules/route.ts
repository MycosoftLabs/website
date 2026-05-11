import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

function buildMasUrl(path: string, request?: NextRequest) {
  if (!MAS_API_URL) return null
  const url = new URL(path, MAS_API_URL)
  if (request?.nextUrl?.search) url.search = request.nextUrl.search
  return url.toString()
}

async function proxyToMas(request: NextRequest, path: string, method: string) {
  const target = buildMasUrl(path, request)
  if (!target) {
    return NextResponse.json({ available: false, rules: [], error: "MAS_API_URL is not configured" })
  }

  const body = method === "POST" ? await request.json().catch(() => ({})) : undefined

  try {
    const response = await fetch(target, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })

    const text = await response.text()
    const contentType = response.headers.get("content-type") || "application/json"
    if (!response.ok) return NextResponse.json({ available: false, rules: [], upstreamStatus: response.status })
    return new NextResponse(text, { headers: { "content-type": contentType } })
  } catch (error) {
    return NextResponse.json({
      available: false,
      rules: [],
      error: error instanceof Error ? error.message : "MAS IoT alert rules are unreachable",
    })
  }
}

export async function GET(request: NextRequest) {
  return proxyToMas(request, "/api/iot/alerts/rules", "GET")
}

export async function POST(request: NextRequest) {
  return proxyToMas(request, "/api/iot/alerts/rules", "POST")
}
