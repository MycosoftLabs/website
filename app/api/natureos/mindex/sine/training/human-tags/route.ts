import { type NextRequest, NextResponse } from "next/server"

import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const limit = params.get("limit")?.trim() || "100"
  const offset = params.get("offset")?.trim() || "0"
  const trainingEligibleOnly = params.get("training_eligible_only")?.trim() ?? "true"

  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const target = `${base}/api/mindex/sine/training/human-tags?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}&training_eligible_only=${encodeURIComponent(trainingEligibleOnly)}`

  const upstream = await fetchMindexWithAuthRetry(target, {
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  }).catch((error) => {
    console.error("[mindex-sine] human-tags read failed", error)
    return null
  })

  if (!upstream) {
    return NextResponse.json({
      ok: false,
      status: "human_training_tags_unavailable",
      message: "Human training tags could not be loaded yet.",
      items: [],
      total: 0,
      limit: Number.parseInt(limit, 10) || 100,
      offset: Number.parseInt(offset, 10) || 0,
    })
  }

  const body = await upstream.text()

  if (!upstream.ok) {
    return NextResponse.json({
      ok: false,
      status: "human_training_tags_unavailable",
      upstream_status: upstream.status,
      upstream_excerpt: body.slice(0, 500),
      message: "MINDEX has not returned the human training tag queue yet.",
      items: [],
      total: 0,
      limit: Number.parseInt(limit, 10) || 100,
      offset: Number.parseInt(offset, 10) || 0,
    })
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  })
}
