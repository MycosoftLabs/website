import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  isOwnerOrSuperuserRole,
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"
import { fetchMasNlmConsole, liveNlmModelCard } from "@/lib/nlm/mas-nlm-live"
import { getFullDemoCatalog } from "@/lib/nlm/canonical-seeds"

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
    createdAt: row.created_at
      ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000) }
      : null,
    updatedAt: row.updated_at
      ? { seconds: Math.floor(new Date(row.updated_at).getTime() / 1000) }
      : null,
    isCatalog: Boolean(row.config?.checkpoint_status === "catalog_only" || row.isCatalog),
    checkpointStatus: row.config?.checkpoint_status || row.checkpointStatus || null,
  }
}

/**
 * GET models:
 * - Always include canonical catalog (logged-out demo)
 * - Authenticated: merge user/admin Supabase models + optional live MAS card
 */
export async function GET() {
  const catalog = getFullDemoCatalog()
  const models: any[] = [...catalog]
  const seen = new Set(models.map((m) => m.id))

  const consolePayload = await fetchMasNlmConsole()
  const live = liveNlmModelCard(consolePayload?.nlm)
  if (live && !seen.has(live.id)) {
    models.unshift(live)
    seen.add(live.id)
  }

  const identity = await resolveVerifiedIdentity()
  if (
    identity.isAuthenticated &&
    (identity.isSuperuser || isOwnerOrSuperuserRole(identity.userRole))
  ) {
    try {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from("nlm_models")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
      for (const row of data || []) {
        const normalized = normalizeModel(row)
        if (!seen.has(normalized.id)) {
          models.push(normalized)
          seen.add(normalized.id)
        }
      }
    } catch {
      // Catalog alone is enough for demo
    }
  }

  return NextResponse.json({
    models,
    source: live ? "catalog+mas-nlm" : "catalog",
    bound_to_ollama: false,
    forecast_qualified: false,
    training_jobs_available: identity.isAuthenticated,
    catalog_count: catalog.length,
    auth: identity.isAuthenticated ? "authenticated" : "anonymous",
    model_kind: "nature_learning_model",
  })
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
