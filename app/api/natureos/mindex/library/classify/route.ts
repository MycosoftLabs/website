import { type NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing library blob id." }, { status: 400 })
  }

  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/library/blobs/${encodeURIComponent(id)}/classify`

  const upstream = await fetchMindexWithAuthRetry(target, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  }).catch((error) => {
    console.error("[mindex-library] classify failed", error)
    return null
  })

  if (!upstream) {
    return NextResponse.json({ error: "SINE classification could not be reached." }, { status: 502 })
  }

  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  })
}
