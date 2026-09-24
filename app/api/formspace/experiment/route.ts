import { NextRequest, NextResponse } from "next/server"
import { computeExperiment } from "@/lib/formspace/engine"
import {
  proxyFormSpace,
  resolveFormSpaceUser,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/formspace/experiment — recovery / trajectory via native SSM.
 */
export async function POST(request: NextRequest) {
  const user = await resolveFormSpaceUser()
  const body = await request.json().catch(() => ({}))
  if (!body?.chart_id) {
    return NextResponse.json(
      { ok: false, status: "bad_request", message: "chart_id required" },
      { status: 400 },
    )
  }

  if (process.env.FORMSPACE_PREFER_MAS === "1") {
    try {
      const res = await proxyFormSpace("/api/formspace/experiment", {
        method: "POST",
        body: JSON.stringify(body),
        userId: user?.id,
        timeoutMs: 3_000,
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.ok) {
          return NextResponse.json({
            ...data,
            mas_source: true,
            user: user ? { id: user.id, email: user.email } : null,
          })
        }
      }
    } catch {
      // local
    }
  }

  const local = computeExperiment({
    chart_id: String(body.chart_id),
    kind: body.kind,
    series: Array.isArray(body.series) ? body.series : null,
    use_demo_fixture: body.use_demo_fixture !== false,
    perturbation_index: body.perturbation_index,
    perturbation_delta: body.perturbation_delta,
    user_id: user?.id ?? null,
  })
  return NextResponse.json({
    ...local,
    mas_source: false,
    user: user ? { id: user.id, email: user.email } : null,
  })
}
