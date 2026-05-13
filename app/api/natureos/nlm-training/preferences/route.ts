import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

const DEFAULT_PREFERENCES = {
  autoRefresh: true,
  advancedMetrics: false,
  mindexLive: true,
}

export async function GET() {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("nlm_dashboard_preferences")
    .select("preferences")
    .eq("user_id", identity.userId)
    .maybeSingle()

  if (error) return NextResponse.json({ preferences: DEFAULT_PREFERENCES, error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: { ...DEFAULT_PREFERENCES, ...(data?.preferences || {}) } })
}

export async function PUT(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError
  const body = await request.json()
  const preferences = { ...DEFAULT_PREFERENCES, ...(body.preferences || body) }
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from("nlm_dashboard_preferences")
    .upsert({
      user_id: identity.userId,
      preferences,
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences })
}
