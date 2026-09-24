import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"
import {
  CANONICAL_ARCHITECTURE_VARIANTS,
  CANONICAL_BASE_MODEL_NAMES,
  CANONICAL_BASE_MODELS,
  CANONICAL_CATALOG,
  CANONICAL_CATALOG_IDS,
  getFullDemoCatalog,
} from "@/lib/nlm/canonical-seeds"

export const dynamic = "force-dynamic"

/**
 * Idempotent ensure of full §5 catalog into Supabase (auth required for writes).
 * POST body: { variants?: boolean, models?: boolean, fullCatalog?: boolean }
 */
export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  let body: { variants?: boolean; models?: boolean; fullCatalog?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const seedVariants = body.variants !== false
  const seedModels = body.models !== false
  const fullCatalog = body.fullCatalog !== false
  const supabase = await createAdminClient()
  const ownerId = identity.userId === "local-dev-morgan" ? null : identity.userId
  const now = new Date().toISOString()

  const result = {
    variantsUpserted: 0,
    variantsSkipped: 0,
    modelsCreated: 0,
    modelsSkipped: 0,
    variantIds: [] as string[],
    modelNames: [] as string[],
    modelIds: [] as string[],
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
    const toSeed = fullCatalog
      ? CANONICAL_CATALOG
      : CANONICAL_CATALOG.filter((m) =>
          CANONICAL_BASE_MODEL_NAMES.includes(m.name)
        )

    const names = toSeed.map((m) => m.name)
    const { data: existingRows, error: listError } = await supabase
      .from("nlm_models")
      .select("id, name, config")
      .in("name", names)

    if (listError) {
      result.errors.push(`list models: ${listError.message}`)
    } else {
      const existingByName = new Map(
        (existingRows || []).map((row: { name: string; id: string }) => [
          row.name,
          row,
        ])
      )

      for (const model of toSeed) {
        if (existingByName.has(model.name)) {
          result.modelsSkipped += 1
          result.modelNames.push(model.name)
          result.modelIds.push(model.model_id)
          continue
        }

        const { error } = await supabase.from("nlm_models").insert({
          name: model.name,
          description: model.description,
          status: "catalog",
          owner_id: ownerId,
          config: {
            ...model.config,
            model_id: model.model_id,
            family: model.family,
            modalities: model.modalities,
            scenario: model.scenario,
            objective: model.objective,
            architecture_ref: model.architecture_ref,
            checkpoint_status: model.checkpoint_status,
            provenance: model.provenance,
            formspace_chart_ids: model.formspace_chart_ids,
          },
          version: "catalog-1.0",
          created_at: now,
          updated_at: now,
        })

        if (error) {
          result.errors.push(`model ${model.name}: ${error.message}`)
        } else {
          result.modelsCreated += 1
          result.modelNames.push(model.name)
          result.modelIds.push(model.model_id)
        }
      }
    }
  }

  const status = result.errors.length > 0 ? 207 : 200
  return NextResponse.json(
    {
      ok: result.errors.length === 0,
      source: "canonical-catalog-sep23-2026",
      catalog: {
        variantCount: CANONICAL_ARCHITECTURE_VARIANTS.length,
        modelCount: CANONICAL_CATALOG.length,
        catalogIds: CANONICAL_CATALOG_IDS.length,
      },
      ...result,
    },
    { status }
  )
}

/**
 * Public catalog presence check (no auth).
 * Does not invent metrics — reports expected vs present when Supabase reachable.
 */
export async function GET() {
  const identity = await resolveVerifiedIdentity()
  const demo = getFullDemoCatalog()

  // Always return in-memory catalog status for logged-out honesty
  const base = {
    source: "canonical-catalog",
    expectedVariants: CANONICAL_ARCHITECTURE_VARIANTS.length,
    expectedModels: CANONICAL_CATALOG.length,
    demoModels: demo.length,
    missingVariantIds: [] as string[],
    missingModelNames: [] as string[],
    presentVariants: CANONICAL_ARCHITECTURE_VARIANTS.map((v) => ({
      id: v.id,
      name: v.name,
    })),
    presentModels: CANONICAL_CATALOG.map((m) => ({
      id: m.model_id,
      name: m.name,
    })),
    auth: identity.isAuthenticated ? "authenticated" : "anonymous",
  }

  if (
    !identity.isAuthenticated ||
    !identity.isSuperuser
  ) {
    return NextResponse.json(base)
  }

  try {
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
        .in("name", [
          ...CANONICAL_BASE_MODEL_NAMES,
          ...CANONICAL_CATALOG.map((m) => m.name),
        ]),
    ])

    return NextResponse.json({
      ...base,
      source: "supabase+catalog",
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
      missingModelNames: CANONICAL_CATALOG.map((m) => m.name).filter(
        (name) => !(models || []).some((m: { name: string }) => m.name === name)
      ),
    })
  } catch {
    return NextResponse.json(base)
  }
}
