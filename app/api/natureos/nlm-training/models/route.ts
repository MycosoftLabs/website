import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

function normalizeModel(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status || "idle",
    ownerId: row.owner_id,
    config: row.config || {},
    version: row.version || "1.0",
    accuracy: row.accuracy ?? null,
    createdAt: row.created_at ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000) } : null,
    updatedAt: row.updated_at ? { seconds: Math.floor(new Date(row.updated_at).getTime() / 1000) } : null,
  }
}

export async function GET() {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const supabase = await createAdminClient()
  let query = supabase
    .from("nlm_models")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ models: [], error: error.message }, { status: 500 })
  }

  return NextResponse.json({ models: (data || []).map(normalizeModel), source: "supabase" })
}

export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const body = await request.json()
  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Model name is required" }, { status: 400 })

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("nlm_models")
    .insert({
      name,
      description: body.description || null,
      status: body.status || "idle",
      owner_id: body.ownerId || identity.userId,
      config: body.config || {},
      version: body.version || "1.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ model: normalizeModel(data), source: "supabase" }, { status: 201 })
}
