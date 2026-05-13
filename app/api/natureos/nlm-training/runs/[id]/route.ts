import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

function normalizeRun(row: any) {
  return {
    id: row.id,
    modelId: row.model_id,
    ownerId: row.owner_id,
    pipelineId: row.pipeline_id ?? null,
    status: row.status || "queued",
    lossHistory: row.loss_history || [],
    metrics: row.metrics || {},
    startTime: row.start_time ? { seconds: Math.floor(new Date(row.start_time).getTime() / 1000) } : null,
    endTime: row.end_time ? { seconds: Math.floor(new Date(row.end_time).getTime() / 1000) } : null,
    createdAt: row.created_at ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000) } : null,
    updatedAt: row.updated_at ? { seconds: Math.floor(new Date(row.updated_at).getTime() / 1000) } : null,
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const { id } = await params
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from("nlm_training_runs").select("*").eq("id", id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: normalizeRun(data), source: "supabase" })
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

  if (body.status !== undefined) update.status = body.status
  if (body.lossHistory !== undefined) update.loss_history = body.lossHistory
  if (body.metrics !== undefined) update.metrics = body.metrics
  if (body.endTime !== undefined) update.end_time = body.endTime

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("nlm_training_runs")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: normalizeRun(data), source: "supabase" })
}
