import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

function buildMasUrl(path: string) {
  if (!MAS_API_URL) return null
  const url = new URL(path, MAS_API_URL)
  return url.toString()
}

async function proxy(request: NextRequest, path: string, method: string) {
  const target = buildMasUrl(path)
  if (!target) {
    return NextResponse.json(
      { error: "MAS_API_URL is not configured" },
      { status: 500 }
    )
  }

  const body = method === "PATCH" ? await request.json().catch(() => ({})) : undefined

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

export async function GET(_request: NextRequest, { params }: { params: { groupId: string } }) {
  return proxy(_request, `/api/iot/fleet/groups/${encodeURIComponent(params.groupId)}`, "GET")
}

export async function PATCH(request: NextRequest, { params }: { params: { groupId: string } }) {
  return proxy(request, `/api/iot/fleet/groups/${encodeURIComponent(params.groupId)}`, "PATCH")
}

export async function DELETE(_request: NextRequest, { params }: { params: { groupId: string } }) {
  return proxy(_request, `/api/iot/fleet/groups/${encodeURIComponent(params.groupId)}`, "DELETE")
}
