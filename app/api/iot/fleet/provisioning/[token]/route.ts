import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_API_URL = process.env.MAS_API_URL

function buildMasUrl(path: string) {
  if (!MAS_API_URL) return null
  const url = new URL(path, MAS_API_URL)
  return url.toString()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const target = buildMasUrl(`/api/iot/fleet/provisioning/${encodeURIComponent(params.token)}`)
  if (!target) {
    return NextResponse.json(
      { error: "MAS_API_URL is not configured" },
      { status: 500 }
    )
  }

  const response = await fetch(target, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  })

  const text = await response.text()
  const contentType = response.headers.get("content-type") || "application/json"
  return new NextResponse(text, { status: response.status, headers: { "content-type": contentType } })
}
