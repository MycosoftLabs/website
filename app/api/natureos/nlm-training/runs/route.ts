import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

function normalizeRun(row: any) {
  const metrics = row.metrics || {}
  const deviceBindings =
    metrics.device_bindings ||
    metrics.deviceBindings ||
    metrics.ingest_bindings ||
    []
  return {
    id: row.id,
    modelId: row.model_id,
    ownerId: row.owner_id,
    pipelineId: row.pipeline_id ?? null,
    status: row.status || "queued",
    lossHistory: row.loss_history || [],
    metrics,
    deviceBindings: Array.isArray(deviceBindings) ? deviceBindings : [],
    deviceIds: Array.isArray(metrics.device_ids) ? metrics.device_ids : [],
    sensorIds: Array.isArray(metrics.sensor_ids) ? metrics.sensor_ids : [],
    networkMapHref: "/natureos/devices/network",
    startTime: row.start_time ? { seconds: Math.floor(new Date(row.start_time).getTime() / 1000) } : null,
    endTime: row.end_time ? { seconds: Math.floor(new Date(row.end_time).getTime() / 1000) } : null,
    createdAt: row.created_at ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000) } : null,
    updatedAt: row.updated_at ? { seconds: Math.floor(new Date(row.updated_at).getTime() / 1000) } : null,
  }
}

export async function GET(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const modelId = searchParams.get("modelId")
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100)

  const supabase = await createAdminClient()
  let query = supabase
    .from("nlm_training_runs")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(limit)

  if (modelId) query = query.eq("model_id", modelId)

  const { data, error } = await query
  if (error) return NextResponse.json({ runs: [], error: error.message }, { status: 500 })
  return NextResponse.json({ runs: (data || []).map(normalizeRun), source: "supabase" })
}

export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const body = await request.json()
  if (!body.modelId) return NextResponse.json({ error: "modelId is required" }, { status: 400 })

  const bindings = Array.isArray(body.deviceBindings)
    ? body.deviceBindings
    : Array.isArray(body.bindings)
      ? body.bindings
      : []
  const deviceIds = Array.from(
    new Set(
      [
        ...(Array.isArray(body.deviceIds) ? body.deviceIds : []),
        ...bindings.map((b: any) => b?.device_id || b?.deviceId).filter(Boolean),
      ].map(String)
    )
  )
  const sensorIds = Array.from(
    new Set(
      [
        ...(Array.isArray(body.sensorIds) ? body.sensorIds : []),
        ...bindings.map((b: any) => b?.sensor_id || b?.sensorId).filter(Boolean),
      ].map(String)
    )
  )

  const metrics = {
    ...(body.metrics || {}),
    device_bindings: bindings,
    device_ids: deviceIds,
    sensor_ids: sensorIds,
    network_map_href: "/natureos/devices/network",
  }

  const now = new Date().toISOString()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from("nlm_training_runs")
    .insert({
      model_id: body.modelId,
      owner_id: body.ownerId || identity.userId,
      pipeline_id: body.pipelineId || null,
      status: body.status || "queued",
      loss_history: body.lossHistory || [],
      metrics,
      start_time: body.startTime || now,
      end_time: body.endTime || null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: normalizeRun(data), source: "supabase" }, { status: 201 })
}
