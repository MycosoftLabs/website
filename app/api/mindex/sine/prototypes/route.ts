import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = request.nextUrl.searchParams.toString()
  try {
    const res = await fetchMindexWithAuthRetry(`${base}/api/mindex/sine/prototypes${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
    const body = await res.text()
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: "prototype_catalog_unavailable",
        prototypes: [],
        message:
          res.status === 404
            ? "MINDEX has not exposed the SINE prototype catalog endpoint yet."
            : `MINDEX SINE prototype catalog returned HTTP ${res.status}.`,
        upstream_status: res.status,
        upstream_excerpt: body.slice(0, 500),
      })
    }
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (event) {
    return NextResponse.json({
      ok: false,
      status: "prototype_catalog_unavailable",
      prototypes: [],
      message: event instanceof Error ? event.message : "SINE prototype catalog request did not complete.",
      upstream_status: 502,
    })
  }
}
