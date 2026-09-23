import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"
import {
  CANONICAL_ARCHITECTURE_VARIANTS,
  CANONICAL_BASE_MODELS,
  CANONICAL_BASE_MODEL_NAMES,
} from "@/lib/nlm/canonical-seeds"

export const dynamic = "force-dynamic"

/**
 * Idempotent ensure of AI Studio seed catalog into Supabase.
 * POST /api/natureos/nlm-training/seed
 * Body (optional): { variants?: boolean, models?: boolean }
 * Defaults: both true.
 */
export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  let body: { variants?: boolean; models?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const seedVariants = body.variants !== false
  const seedModels = body.models !== false
  const supabase = await createAdminClient()
  const ownerId =
    identity.userId === "local-dev-morgan" ? null : identity.userId
  const now = new Date().toISOString()

  const result = {
    variantsUpserted: 0,
    variantsSkipped: 0,
    modelsCreated: 0,
    modelsSkipped: 0,
    variantIds: [] as string[],
    modelNames: [] as string[],
    errors: [] as string[],
  }

  if (seedVariants) {
    for (const variant of CANONICAL_ARCHITECTURE_VARIANTS) {
      const { error } = await supabase.from("nlm_variants").upsert(
        {
          id: variant.id,
          name: variant.name,
          owner_id: ownerId,
          streams: variant.streams,
          core: variant.core,
          preconditioners: variant.preconditioners,
          metrics: variant.metrics,
          updated_at: now,
          created_at: now,
        },
        { onConflict: "id" }
      )
      if (error) {
        result.errors.push(`variant ${variant.id}: ${error.message}`)
      } else {
        result.variantsUpserted += 1
        result.variantIds.push(variant.id)
      }
    }
  }

  if (seedModels) {
    const { data: existingRows, error: listError } = await supabase
      .from("nlm_models")
      .select("id, name")
      .in("name", CANONICAL_BASE_MODEL_NAMES)

    if (listError) {
      result.errors.push(`list models: ${listError.message}`)
    } else {
      const existingNames = new Set(
        (existingRows || []).map((row: { name: string }) => row.name)
      )

      for (const model of CANONICAL_BASE_MODELS) {
        if (existingNames.has(model.name)) {
          result.modelsSkipped += 1
          result.modelNames.push(model.name)
          continue
        }

        const { error } = await supabase.from("nlm_models").insert({
          name: model.name,
          description: model.description,
          status: "idle",
          owner_id: ownerId,
          config: model.config,
          version: "1.0",
          created_at: now,
          updated_at: now,
        })

        if (error) {
          result.errors.push(`model ${model.name}: ${error.message}`)
        } else {
          result.modelsCreated += 1
          result.modelNames.push(model.name)
        }
      }
    }
  }

  const status = result.errors.length > 0 ? 207 : 200
  return NextResponse.json(
    {
      ok: result.errors.length === 0,
      source: "canonical-ai-studio-seeds",
      catalog: {
        variantCount: CANONICAL_ARCHITECTURE_VARIANTS.length,
        modelCount: CANONICAL_BASE_MODELS.length,
      },
      ...result,
    },
    { status }
  )
}

/** Report which canonical seeds are already present (no writes). */
export async function GET() {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const supabase = await createAdminClient()
  const [{ data: variants }, { data: models }] = await Promise.all([
    supabase
      .from("nlm_variants")
      .select("id, name")
      .in(
        "id",
        CANONICAL_ARCHITECTURE_VARIANTS.map((v) => v.id)
      ),
    supabase
      .from("nlm_models")
      .select("id, name")
      .in("name", CANONICAL_BASE_MODEL_NAMES),
  ])

  return NextResponse.json({
    source: "supabase",
    expectedVariants: CANONICAL_ARCHITECTURE_VARIANTS.length,
    expectedModels: CANONICAL_BASE_MODELS.length,
    presentVariants: (variants || []).map((v: { id: string; name: string }) => ({
      id: v.id,
      name: v.name,
    })),
    presentModels: (models || []).map((m: { id: string; name: string }) => ({
      id: m.id,
      name: m.name,
    })),
    missingVariantIds: CANONICAL_ARCHITECTURE_VARIANTS.map((v) => v.id).filter(
      (id) => !(variants || []).some((v: { id: string }) => v.id === id)
    ),
    missingModelNames: CANONICAL_BASE_MODEL_NAMES.filter(
      (name) => !(models || []).some((m: { name: string }) => m.name === name)
    ),
  })
}
