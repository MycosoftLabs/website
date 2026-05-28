/**
 * iNaturalist Bulk Backfill (single batch)
 *
 * Disabled by default on the website VM. Full or chunked backfills must run
 * from MINDEX/MAS worker infrastructure, not from the website runtime.
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
export const maxDuration = 120
const WEBSITE_INAT_ETL_ENABLED = process.env.CREP_WEBSITE_ALLOW_INAT_ETL === "1"

export async function POST(req: NextRequest) {
  if (!WEBSITE_INAT_ETL_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message: "Website iNaturalist backfill is disabled; run the MINDEX ETL worker instead.",
      },
      { status: 409 },
    )
  }

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
    maxPages: Math.min(body.maxPages ?? 30, 30),
  })
  recordSyncRun(result)
  return NextResponse.json({ ok: true, result })
}
