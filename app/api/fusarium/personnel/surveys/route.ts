import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { roleById } from "@/lib/fusarium/personnel/catalog"
import { inferForRole } from "@/lib/fusarium/personnel/inference"
import { appendSurvey, readMeasurementStore } from "@/lib/fusarium/personnel/outcomes-store"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  const store = await readMeasurementStore()
  return NextResponse.json(
    { surveys: store.surveys, empty_until_submit: store.surveys.length === 0 },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  )
}

export async function POST(request: Request) {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  const body = (await request.json()) as {
    role_id?: string
    instrument?: "NASA-TLX" | "NIOSH-WellBQ-SCORES" | "REST_ERROR_INCIDENT"
    instrument_version?: string
    scores?: Record<string, number | null>
    comments?: string | null
    rest_hours_observed?: number | null
    error_events?: number | null
    error_opportunities?: number | null
    near_miss_events?: number | null
    injury_events?: number | null
  }
  const role = body.role_id ? roleById(body.role_id) : undefined
  if (!role || !body.instrument) {
    return NextResponse.json({ error: "role_id and instrument are required and must exist in the catalog" }, { status: 400 })
  }
  const survey = await appendSurvey({
    role_id: role.role_id,
    persona_id: role.persona_id,
    instrument: body.instrument,
    instrument_version: body.instrument_version || body.instrument,
    scores: body.scores || {},
    comments: body.comments ?? null,
    rest_hours_observed: body.rest_hours_observed ?? null,
    error_events: body.error_events ?? null,
    error_opportunities: body.error_opportunities ?? null,
    near_miss_events: body.near_miss_events ?? null,
    injury_events: body.injury_events ?? null,
  })
  const inference = await inferForRole(role.role_id, role.persona_id)
  return NextResponse.json({ survey, inference, source_class: "survey" })
}
