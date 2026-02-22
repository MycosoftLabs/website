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
    return NextResponse.json(
      { error: "MAS_API_URL is not configured" },
      { status: 500 }
    )
  }

  const body = method === "POST" ? await request.json().catch(() => ({})) : undefined

  const response = await fetch(target, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })

  const text = await response.text()
  const contentType = response.headers.get("content-type") || "application/json"
  return new NextResponse(text, { status: response.status, headers: { "content-type": contentType } })
}

export async function GET(request: NextRequest) {
  return proxyToMas(request, "/api/iot/fleet/groups", "GET")
}

export async function POST(request: NextRequest) {
  return proxyToMas(request, "/api/iot/fleet/groups", "POST")
}
