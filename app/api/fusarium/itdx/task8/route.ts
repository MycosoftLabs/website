import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { allowedPath, isFormspacePath } from "@/lib/itdx/gateway.mjs"
import { sevenRoleQualification } from "@/lib/itdx/run-narration.mjs"
import { assessSituation, evaluateMasGovernor, mycaHealth, probeMasTask8 } from "@/lib/itdx/task8-client.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

async function formspaceResult() {
  const origin = process.env.FORMSPACE_BACKEND_URL?.trim()
  if (!origin) return null
  const path = allowedPath(["api", "formspace"], "GET")
  if (!path || !isFormspacePath(path)) return null
  const response = await fetch(new URL(path, origin), { cache: "no-store", signal: AbortSignal.timeout(15000) })
  if (!response.ok) return null
  return response.json()
}

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error

  const [mas, myca, recorded] = await Promise.all([probeMasTask8(), mycaHealth(), formspaceResult()])
  const localOptions = recorded?.result?.task8?.options || []

  if (mas.task8) {
    const seven = sevenRoleQualification(mas.task8)
    return NextResponse.json(
      {
        ...mas.task8,
        myca: myca.data,
        myca_status: myca.status,
        seven_role: seven,
        probes: mas.probes,
        health: mas.health || null,
        local_avani_options: localOptions,
        synthetic: true,
        live_cop: false,
      },
      { headers: HEADERS },
    )
  }

  const governor = []
  for (const option of localOptions.slice(0, 3)) {
    const evaluated = await evaluateMasGovernor({
      id: option.id,
      title: option.title || option.label || option.id,
    })
    governor.push({
      id: option.id,
      title: option.title,
      local_gate: option.formspace_gate || option.gate || null,
      mas_approved: evaluated.data?.approved ?? null,
      mas_reason: evaluated.data?.reason ?? evaluated.data?.error ?? null,
      mas_status: evaluated.status,
      execution: option.execution || "ADVISORY_ONLY",
    })
  }

  const source = governor.some((row) => row.mas_status === 200) ? "mas_governor" : "local_avani"
  const seven = sevenRoleQualification({ source: "none", roles: [] })

  return NextResponse.json(
    {
      source,
      path: source === "mas_governor" ? "/api/avani/evaluate" : "formspace-recorded",
      roles: [],
      options: localOptions,
      governor,
      seven_role: seven,
      myca: myca.data,
      myca_status: myca.status,
      probes: mas.probes,
      rank_semantics: recorded?.result?.task8?.rank_semantics || "Preference only; never probability of success",
      note:
        source === "mas_governor"
          ? "MAS governor evaluate is live. Live Task 8 is GET/POST /api/itdx/task8 on 188:8001 — roles were not in this probe."
          : "FormSpace local AVANI gates only. Labeled local_avani. Live MAS Task 8 is /api/itdx/task8.",
      synthetic: true,
      live_cop: false,
    },
    { headers: HEADERS },
  )
}
