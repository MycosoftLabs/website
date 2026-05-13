import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

function normalizeVariant(row: any) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    streams: row.streams || {},
    core: row.core || {},
    preconditioners: row.preconditioners || [],
    metrics: row.metrics || {},
    timestamp: row.created_at || row.updated_at,
  }
}

export async function GET() {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError
  const supabase = await createAdminClient()
  let query = supabase.from("nlm_variants").select("*").order("created_at", { ascending: false }).limit(200)
  const { data, error } = await query
  if (error) return NextResponse.json({ variants: [], error: error.message }, { status: 500 })
  return NextResponse.json({ variants: (data || []).map(normalizeVariant), source: "supabase" })
}

export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError
  const body = await request.json()
  const supabase = await createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("nlm_variants")
    .upsert({
      id: body.id || undefined,
      name: body.name || "NLM Variant",
      owner_id: body.ownerId || identity.userId,
      streams: body.streams || {},
      core: body.core || {},
      preconditioners: body.preconditioners || [],
      metrics: body.metrics || {},
      updated_at: now,
      created_at: body.created_at || now,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variant: normalizeVariant(data), source: "supabase" }, { status: 201 })
}
