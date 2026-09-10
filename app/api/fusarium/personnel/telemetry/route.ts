import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { roleById } from "@/lib/fusarium/personnel/catalog"
import { appendTelemetry } from "@/lib/fusarium/personnel/outcomes-store"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  const body = (await request.json()) as {
    role_id?: string
    persona_id?: string
    surface?: string
    tool?: string | null
    tab?: string | null
    layer?: string | null
    seconds?: number | null
    comment?: string | null
  }
  const role = body.role_id ? roleById(body.role_id) : undefined
  const telemetry = await appendTelemetry({
    role_id: role?.role_id || body.role_id || "UNASSIGNED",
    persona_id: role?.persona_id || body.persona_id || "owner_full",
    surface: body.surface || "unknown",
    tool: body.tool ?? null,
    tab: body.tab ?? null,
    layer: body.layer ?? null,
    seconds: body.seconds ?? null,
    comment: body.comment ?? null,
  })
  return NextResponse.json({ telemetry, source_class: "telemetry" })
}
