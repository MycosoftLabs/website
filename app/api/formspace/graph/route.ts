import { NextRequest, NextResponse } from "next/server"
import { computeGraph, recordEvidence } from "@/lib/formspace/engine"
import {
  formspaceErrorResponse,
  formspacePrefersMas,
  proxyFormSpace,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/formspace/graph
 *
 * FormSpace native SSM graphing. Uses MAS /api/formspace/graph when reachable
 * (evidence is mirrored into the durable website log), otherwise the local
 * port of the same engine so Graphs never hang or 500.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body?.chart_id) {
    return NextResponse.json(
      { ok: false, status: "bad_request", message: "chart_id required", points: [] },
      { status: 400 },
    )
  }

  try {
    if (formspacePrefersMas()) {
      for (const masPath of ["/api/formspace/graph", "/api/nlm/formspace/graph"]) {
        try {
          const res = await proxyFormSpace(masPath, {
            method: "POST",
            body: JSON.stringify(body),
            timeoutMs: 4_000,
          })
          if (!res.ok) continue
          const data = await res.json().catch(() => null)
          if (data?.ok && Array.isArray(data.points) && data.points.length) {
            recordEvidence({
              kind: "graph",
              graph_id: data.graph_id,
              chart_id: String(body.chart_id),
              origin: data.origin,
              computed_by: "mas",
            })
            return NextResponse.json({ ...data, mas_source: true, via: masPath })
          }
        } catch {
          // try next path, then local engine
        }
      }
    }

    const local = computeGraph({
      chart_id: String(body.chart_id),
      series: Array.isArray(body.series) ? body.series : null,
      use_demo_fixture: body.use_demo_fixture !== false,
      graph_kind: body.graph_kind,
      dt: typeof body.dt === "number" ? body.dt : undefined,
      a: typeof body.a === "number" ? body.a : undefined,
      b: typeof body.b === "number" ? body.b : undefined,
    })
    return NextResponse.json({ ...local, mas_source: false })
  } catch (error) {
    return formspaceErrorResponse("graph", error, { points: [] })
  }
}
