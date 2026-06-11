import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { SINE_EVIDENCE_CONTRACT, SINE_EVIDENCE_QUERY_DEFAULTS, SINE_REQUEST_CONTRACT } from "@/lib/mindex/sine-contract"

export const dynamic = "force-dynamic"

function withSineEvidenceQuery(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  for (const [key, value] of Object.entries(SINE_EVIDENCE_QUERY_DEFAULTS)) {
    if (!params.has(key)) params.set(key, value)
  }
  return params.toString()
}

function withSineEvidenceBody(rawBody: string) {
  if (!rawBody.trim()) {
    return JSON.stringify({
      evidence_contract: SINE_EVIDENCE_CONTRACT,
      sine_request: SINE_REQUEST_CONTRACT,
    })
  }

  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>
    const existingContract =
      parsed.evidence_contract && typeof parsed.evidence_contract === "object" && !Array.isArray(parsed.evidence_contract)
        ? (parsed.evidence_contract as Record<string, unknown>)
        : {}
    const existingSineRequest =
      parsed.sine_request && typeof parsed.sine_request === "object" && !Array.isArray(parsed.sine_request)
        ? (parsed.sine_request as Record<string, unknown>)
        : {}

    return JSON.stringify({
      ...parsed,
      evidence_contract: {
        ...SINE_EVIDENCE_CONTRACT,
        ...existingContract,
      },
      sine_request: {
        ...SINE_REQUEST_CONTRACT,
        ...existingSineRequest,
      },
    })
  } catch {
    return JSON.stringify({
      evidence_contract: SINE_EVIDENCE_CONTRACT,
      sine_request: SINE_REQUEST_CONTRACT,
      client_body_status: "non_json_body_ignored",
    })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = withSineEvidenceQuery(request)
  const url = `${base}/api/mindex/sine/blobs/${encodeURIComponent(id)}/analyze${qs ? `?${qs}` : ""}`
  const requestBody = withSineEvidenceBody(await request.text().catch(() => ""))
  const res = await fetchMindexWithAuthRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: requestBody,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  }).catch(() => null)

  if (!res) {
    return NextResponse.json(
      {
        ok: false,
        status: "sine_analysis_unavailable",
        model_status: "model_unavailable",
        message: "SINE analysis could not be reached. The frontend did not invent a classification.",
      },
      { status: 502 },
    )
  }

  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
