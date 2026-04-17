/**
 * iNaturalist Bulk Backfill (single batch)
 *
 * Runs up to `maxPages` pages of cursor-paginated bulk backfill starting
 * from `idAbove`. Caller is responsible for persisting `nextCursor` from
 * the response and passing it back as `idAbove` on the next call.
 *
 * For the full 300M-observation sync, run `scripts/inat-backfill.ts`
 * from a worker host that can loop for hours. This API route is useful
 * for ad-hoc chunked backfills (e.g. "sync the next 6000 observations").
 *
 * Auth: ETL_CRON_TOKEN header.
 *
 * @route POST /api/etl/inat/backfill
 * @body   { idAbove?: number, maxPages?: number }
 * @return { result: EtlResult }
 */

import { NextRequest, NextResponse } from "next/server"
import { bulkBackfillINat, recordSyncRun } from "@/lib/crep/inat-etl"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120 // 2 min — allow up to ~30 pages x 1.2s

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-cron-token") ?? ""
  const expected = process.env.ETL_CRON_TOKEN ?? ""
  if (expected && token !== expected) {
    return NextResponse.json({ error: "Invalid cron token" }, { status: 401 })
  }

  let body: { idAbove?: number; maxPages?: number } = {}
  try {
    body = (await req.json()) as { idAbove?: number; maxPages?: number }
  } catch {}

  const result = await bulkBackfillINat({
    idAbove: body.idAbove,
    maxPages: Math.min(body.maxPages ?? 30, 30), // cap at 30 pages per call
  })
  recordSyncRun(result)
  return NextResponse.json({ ok: true, result })
}
