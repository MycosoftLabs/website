import { NextRequest } from "next/server"
import { runWithEnvelope, resolveDatasetFromParams } from "@/lib/worldview/middleware"

/**
 * Worldview v1 — unified dataset query.
 *
 * GET /api/worldview/v1/query?type=<dataset_id>&<params>
 *
 * Authenticates via Authorization: Bearer mk_... or Supabase JWT cookie.
 * Meters + rate-limits per the registered dataset's cost + rate_weight.
 * Wraps the response in the Worldview envelope.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const resolved = resolveDatasetFromParams(req)
  if (resolved.error) return resolved.error
  return runWithEnvelope({ req, dataset: resolved.dataset!, kind: "query" })
}
