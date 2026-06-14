import { type NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { SINE_EVIDENCE_CONTRACT, SINE_EVIDENCE_QUERY_DEFAULTS, SINE_REQUEST_CONTRACT } from "@/lib/mindex/sine-contract"

export const dynamic = "force-dynamic"

function buildClassifyUrl(request: NextRequest, base: string, id: string) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  params.delete("id")
  for (const [key, value] of Object.entries(SINE_EVIDENCE_QUERY_DEFAULTS)) {
    if (!params.has(key)) params.set(key, value)
  }
  const qs = params.toString()
  return `${base}/api/mindex/library/blobs/${encodeURIComponent(id)}/classify${qs ? `?${qs}` : ""}`
}

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing library blob id." }, { status: 400 })
  }

  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = buildClassifyUrl(request, base, id)

  const upstream = await fetchMindexWithAuthRetry(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      evidence_contract: SINE_EVIDENCE_CONTRACT,
      sine_request: SINE_REQUEST_CONTRACT,
    }),
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
