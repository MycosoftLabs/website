import { NextResponse } from "next/server"
import {
  CANONICAL_ARCHITECTURE_VARIANTS,
  CANONICAL_CATALOG,
  getFullDemoCatalog,
} from "@/lib/nlm/canonical-seeds"

export const dynamic = "force-dynamic"

/**
 * GET /api/natureos/nlm-training/catalog
 * Public canonical NLM catalog (logged-out demo). No mock metrics.
 */
export async function GET() {
  return NextResponse.json({
    source: "canonical-catalog",
    bound_to_ollama: false,
    model_kind: "nature_learning_model",
    note: "Catalog rows are registry seeds (catalog_only). Not live sensor streams. Not an LLM.",
    variants: CANONICAL_ARCHITECTURE_VARIANTS,
    models: getFullDemoCatalog(),
    catalog: CANONICAL_CATALOG,
    counts: {
      variants: CANONICAL_ARCHITECTURE_VARIANTS.length,
      models: CANONICAL_CATALOG.length,
      modality: CANONICAL_CATALOG.filter((m) => m.family === "modality").length,
      scenario: CANONICAL_CATALOG.filter((m) => m.family === "scenario").length,
      legacy_base: CANONICAL_CATALOG.filter((m) => m.family === "legacy_base").length,
    },
  })
}
