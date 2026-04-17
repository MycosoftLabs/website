/**
 * iNaturalist Delta Sync
 *
 * POST — runs a delta sync (last hour of iNat observations by default)
 * GET  — status / last run
 *
 * Triggered every ~10 minutes by .github/workflows/inat-delta-sync.yml
 * or any external cron (vercel cron, Railway cron, Kubernetes CronJob).
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

export async function POST(req: NextRequest) {
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
  return NextResponse.json({ ok: true, status: getSyncStatus() })
}
