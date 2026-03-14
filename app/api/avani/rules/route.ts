import { NextResponse } from "next/server"
import { getConstitutionalRules } from "@/lib/services/avani-governance"

/**
 * GET /api/avani/rules
 *
 * Returns Avani's active constitutional rules.
 * Used by admin dashboards and the AVANI public page.
 */
export async function GET() {
  const rules = getConstitutionalRules()

  return NextResponse.json({
    rules,
    total: rules.length,
    categories: [...new Set(rules.map((r) => r.category))],
    constitution_version: "0.1.0-embedded",
    timestamp: new Date().toISOString(),
  })
}
