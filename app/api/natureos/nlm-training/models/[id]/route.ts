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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const { id } = await params
  const body = await request.json()
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) update.name = body.name
  if (body.description !== undefined) update.description = body.description
  if (body.status !== undefined) update.status = body.status
  if (body.config !== undefined) update.config = body.config
  if (body.version !== undefined) update.version = body.version
  if (body.accuracy !== undefined) update.accuracy = body.accuracy

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("nlm_models")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ model: normalizeModel(data), source: "supabase" })
}
