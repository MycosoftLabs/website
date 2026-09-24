import { NextRequest, NextResponse } from "next/server"
import { appendMemory, computeExperiment, recordEvidence } from "@/lib/formspace/engine"
import {
  formspaceErrorResponse,
  formspacePrefersMas,
  proxyFormSpace,
  resolveFormSpaceUser,
} from "@/lib/formspace/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/formspace/experiment — perturbation/recovery trial via native SSM.
 * MAS first (evidence mirrored locally), local engine fallback.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (!body?.chart_id) {
    return NextResponse.json(
      { ok: false, status: "bad_request", message: "chart_id required" },
      { status: 400 },
    )
  }

  try {
    const user = await resolveFormSpaceUser()
    const userJson = user ? { id: user.id, email: user.email } : null

    if (formspacePrefersMas()) {
      try {
        const res = await proxyFormSpace("/api/formspace/experiment", {
          method: "POST",
          body: JSON.stringify(body),
          userId: user?.id,
          timeoutMs: 4_000,
        })
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data?.ok) {
            recordEvidence({
              kind: "experiment",
              experiment_id: data.experiment_id,
              chart_id: String(body.chart_id),
              origin: data.origin,
              user_id: user?.id ?? null,
              recovered: data.recovered,
              computed_by: "mas",
            })
            if (user) {
              appendMemory(user.id, {
                type: "experiment",
                experiment_id: data.experiment_id,
                chart_id: String(body.chart_id),
                summary: {
                  recovered: data.recovered,
                  recovery_step: data.recovery_step ?? null,
                  status: "computed",
                },
                computed_by: "mas",
              })
            }
            return NextResponse.json({ ...data, mas_source: true, user: userJson })
          }
        }
      } catch {
        // local engine
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
    return NextResponse.json({ ...local, mas_source: false, user: userJson })
  } catch (error) {
    return formspaceErrorResponse("experiment", error)
  }
}
