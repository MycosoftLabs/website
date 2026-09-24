import { NextRequest, NextResponse } from "next/server"
import { computeGraph } from "@/lib/formspace/engine"
import { proxyFormSpace } from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/formspace/graph
 *
 * Real FormSpace native SSM graphing (ported from MAS native_ssm).
 * Computes locally first so Graphs never hang on missing MAS /api/formspace.
 * Optionally upgrades from MAS when that engine is deployed.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body?.chart_id) {
    return NextResponse.json(
      { ok: false, status: "bad_request", message: "chart_id required", points: [] },
      { status: 400 },
    )
  }

  const preferMas = process.env.FORMSPACE_PREFER_MAS === "1"
  if (preferMas) {
    for (const path of ["/api/formspace/graph", "/api/nlm/formspace/graph"]) {
      try {
        const res = await proxyFormSpace(path, {
          method: "POST",
          body: JSON.stringify(body),
          timeoutMs: 3_000,
        })
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data?.ok && Array.isArray(data.points) && data.points.length) {
            return NextResponse.json({ ...data, mas_source: true, via: path })
          }
        }
      } catch {
        // try next / local
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
}
