import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { SINE_EVIDENCE_QUERY_DEFAULTS } from "@/lib/mindex/sine-contract"

export const dynamic = "force-dynamic"

function withSineEvidenceQuery(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  for (const [key, value] of Object.entries(SINE_EVIDENCE_QUERY_DEFAULTS)) {
    if (!params.has(key)) params.set(key, value)
  }
  return params.toString()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = withSineEvidenceQuery(request)
  try {
    const res = await fetchMindexWithAuthRetry(`${base}/api/mindex/sine/blobs/${encodeURIComponent(id)}/analysis${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    })
    const body = await res.text()
    if (res.status === 404) {
      return NextResponse.json({
        ok: false,
        status: "analysis_not_found",
        model_status: "not_run",
        blob_id: id,
        message: "No saved SINE evidence check exists for this acoustic file yet.",
        detector_events: [],
        model_outputs: [],
        fusion_evidence: [],
        deep_signal_matches: [],
        sound_transcripts: [],
        upstream_status: res.status,
        upstream_excerpt: body.slice(0, 500),
      })
    }
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: "analysis_unavailable",
        model_status: "not_run",
        blob_id: id,
        message: `Saved SINE evidence is unavailable for this acoustic file. Upstream returned HTTP ${res.status}.`,
        detector_events: [],
        model_outputs: [],
        fusion_evidence: [],
        deep_signal_matches: [],
        sound_transcripts: [],
        upstream_status: res.status,
        upstream_excerpt: body.slice(0, 500),
      })
    }
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (event) {
    return NextResponse.json(
      {
        ok: false,
        status: "analysis_unavailable",
        message: event instanceof Error ? event.message : "SINE analysis request did not complete.",
      },
      { status: 502 },
    )
  }
}
