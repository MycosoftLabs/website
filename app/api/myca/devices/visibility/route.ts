import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAgentProfile } from "@/lib/agent-auth"
import { resolveEffectiveScope, bustVisibilityCache } from "@/lib/worldview/company-auth"
import { newRequestId } from "@/lib/worldview/envelope"

/**
 * MYCA Device Visibility Admin — Apr 23, 2026
 *
 * Morgan: "myca can do this any devices and data from any user at
 * will".
 *
 * GET   /api/myca/devices/visibility              list current rules
 * POST  /api/myca/devices/visibility              upsert a rule
 *        body: { device_id, visible_scopes?, hidden_until?, reason? }
 * DELETE /api/myca/devices/visibility?device_id=  remove a rule (back to default)
 *
 * Auth: caller must have scope >= `company` (MYCA itself runs with an
 * `ops` service key; company admins can also manage from the UI).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return _admin
}

async function ensureCompanyScope(req: NextRequest): Promise<{ ok: true; scope: string; profile: any } | { ok: false; response: NextResponse }> {
  const profile = await getAgentProfile(req)
  const scope = resolveEffectiveScope(profile)
  if (scope === "public" || scope === "agent") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: scope === "public" ? "UNAUTHENTICATED" : "INSUFFICIENT_SCOPE",
            message: `MYCA device visibility requires scope >= company. Caller scope: ${scope}.`,
            details: { required_scope: "company", caller_scope: scope, upgrade_url: "https://mycosoft.com/agent" },
          },
          request_id: newRequestId(),
        },
        { status: scope === "public" ? 401 : 403 },
      ),
    }
  }
  return { ok: true, scope, profile }
}

export async function GET(req: NextRequest) {
  const gate = await ensureCompanyScope(req)
  if (!gate.ok) return gate.response
  try {
    const admin = getAdmin() as any
    const { data, error } = await admin
      .from("myca_device_visibility")
      .select("device_id, visible_scopes, hidden_until, managed_by, reason, updated_by, updated_at")
      .order("updated_at", { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: { code: "DB", message: error.message } }, { status: 500 })
    return NextResponse.json({
      ok: true,
      caller_scope: gate.scope,
      count: data?.length ?? 0,
      policies: data ?? [],
      default_policy: {
        visible_scopes: ["company", "fusarium", "ops"],
        note: "Devices not listed default to visible at the `company` scope and above.",
      },
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: err?.message } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gate = await ensureCompanyScope(req)
  if (!gate.ok) return gate.response

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: { code: "INVALID_PARAMS", message: "JSON body required" } }, { status: 400 }) }

  const device_id = String(body?.device_id || "").trim()
  if (!device_id) return NextResponse.json({ ok: false, error: { code: "INVALID_PARAMS", message: "device_id required" } }, { status: 400 })

  const visible_scopes = Array.isArray(body.visible_scopes)
    ? body.visible_scopes.filter((s: any) => typeof s === "string")
    : undefined
  const hidden_until = body.hidden_until ?? null
  const reason = body.reason ?? null

  try {
    const admin = getAdmin() as any
    const { data, error } = await admin
      .from("myca_device_visibility")
      .upsert({
        device_id,
        ...(visible_scopes ? { visible_scopes } : {}),
        hidden_until,
        reason,
        managed_by: gate.profile?.via === "api_key" ? "myca" : "user",
        updated_by: gate.profile?.profile_id ?? null,
      }, { onConflict: "device_id" })
      .select()
      .single()
    if (error) return NextResponse.json({ ok: false, error: { code: "DB", message: error.message } }, { status: 500 })

    bustVisibilityCache()
    return NextResponse.json({ ok: true, policy: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: err?.message } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await ensureCompanyScope(req)
  if (!gate.ok) return gate.response

  const device_id = (req.nextUrl.searchParams.get("device_id") || "").trim()
  if (!device_id) return NextResponse.json({ ok: false, error: { code: "INVALID_PARAMS", message: "device_id required" } }, { status: 400 })

  try {
    const admin = getAdmin() as any
    const { error } = await admin
      .from("myca_device_visibility")
      .delete()
      .eq("device_id", device_id)
    if (error) return NextResponse.json({ ok: false, error: { code: "DB", message: error.message } }, { status: 500 })

    bustVisibilityCache()
    return NextResponse.json({ ok: true, device_id, removed: true, default_policy: "visible to company+" })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: err?.message } }, { status: 500 })
  }
}
