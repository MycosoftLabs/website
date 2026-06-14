import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = request.nextUrl.searchParams.toString()
  try {
    const res = await fetchMindexWithAuthRetry(`${base}/api/mindex/sine/models${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    })
    const body = await res.text()
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: "model_registry_unavailable",
        models: [],
        message:
          res.status === 404
            ? "MINDEX has not exposed the SINE model registry endpoint yet."
            : `MINDEX SINE model registry returned HTTP ${res.status}.`,
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
      status: "model_registry_unavailable",
      models: [],
      message: event instanceof Error ? event.message : "SINE model registry request did not complete.",
      upstream_status: 502,
    })
  }
}
