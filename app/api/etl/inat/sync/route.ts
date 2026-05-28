/**
 * iNaturalist Delta Sync
 *
 * POST — runs a delta sync (last hour of iNat observations by default)
 * GET  — status / last run
 *
 * Disabled by default on the website VM. iNaturalist delta acquisition now
 * belongs on MINDEX/MAS workers so map users never pay for crawler work.
 * Set CREP_WEBSITE_ALLOW_INAT_ETL=1 only for an operator diagnostic.
 *
 * Idempotent: MINDEX dedups on (source, source_id) so re-running is safe.
 *
 * Auth: set ETL_CRON_TOKEN env var; require `x-cron-token: <token>` header
 * on POST. GET is public (read-only status).
 *
 * @route POST /api/etl/inat/sync
 * @body   { sinceIso?: string (ISO8601), maxPages?: number }
 * @return { result: EtlResult }
 */

import { NextRequest, NextResponse } from "next/server"
import { deltaSyncINat, recordSyncRun, getSyncStatus } from "@/lib/crep/inat-etl"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// This handler can take up to ~30s; ensure Next doesn't give up early.
export const maxDuration = 60
const WEBSITE_INAT_ETL_ENABLED = process.env.CREP_WEBSITE_ALLOW_INAT_ETL === "1"

export async function POST(req: NextRequest) {
  if (!WEBSITE_INAT_ETL_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message: "Website iNaturalist ETL is disabled; run the MINDEX ETL scheduler instead.",
      },
      { status: 409 },
    )
  }

  const token = req.headers.get("x-cron-token") ?? ""
  const expected = process.env.ETL_CRON_TOKEN ?? ""
  if (expected && token !== expected) {
    return NextResponse.json({ error: "Invalid cron token" }, { status: 401 })
  }

  let body: { sinceIso?: string; maxPages?: number } = {}
  try {
    body = (await req.json()) as { sinceIso?: string; maxPages?: number }
  } catch {
    // no body is fine — use defaults
  }

  const result = await deltaSyncINat({
    sinceIso: body.sinceIso,
    maxPages: body.maxPages ?? 10,
  })
  recordSyncRun(result)
  return NextResponse.json({ ok: true, result })
}

export async function GET() {
  return NextResponse.json({ ok: true, disabled: !WEBSITE_INAT_ETL_ENABLED, status: getSyncStatus() })
}
