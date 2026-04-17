/**
 * iNaturalist → MINDEX bulk backfill worker
 *
 * Run this on any host that has network access to MINDEX and can stay
 * online for hours / days. It walks iNat observations from id 1 to the
 * current latest, bulk-POSTing to MINDEX in chunks of 200 obs per page.
 *
 * Cursor state persists to ./var/inat-backfill-cursor.json so you can
 * Ctrl-C and resume later without re-doing work.
 *
 * Run:
 *   npx tsx scripts/inat-backfill.ts
 *
 * Env:
 *   MINDEX_API_URL   (required for prod)
 *   MINDEX_API_KEY   (required for prod)
 *   INAT_CURSOR_FILE (optional; default ./var/inat-backfill-cursor.json)
 *
 * Rate: 200 obs / 1.2s per page = ~600k obs/hour / ~14M obs/day.
 * Full ~300M iNat catalog = ~3 weeks non-stop or parallelize across
 * multiple workers by partitioning the id_above range.
 */

import fs from "node:fs"
import path from "node:path"
import { bulkBackfillINat, recordSyncRun, getSyncStatus } from "../lib/crep/inat-etl"

const CURSOR_FILE =
  process.env.INAT_CURSOR_FILE ?? path.resolve(process.cwd(), "var/inat-backfill-cursor.json")

type CursorState = {
  idAbove: number
  pagesRun: number
  observationsPosted: number
  startedAt: string
  updatedAt: string
}

function readCursor(): CursorState {
  try {
    const raw = fs.readFileSync(CURSOR_FILE, "utf8")
    return JSON.parse(raw) as CursorState
  } catch {
    return {
      idAbove: 0,
      pagesRun: 0,
      observationsPosted: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}

function writeCursor(s: CursorState) {
  fs.mkdirSync(path.dirname(CURSOR_FILE), { recursive: true })
  fs.writeFileSync(CURSOR_FILE, JSON.stringify(s, null, 2), "utf8")
}

async function main() {
  const ctl = new AbortController()
  const onSignal = () => {
    console.log("\n[iNatBackfill] caught signal, stopping after current page...")
    ctl.abort()
  }
  process.on("SIGINT", onSignal)
  process.on("SIGTERM", onSignal)

  let state = readCursor()
  console.log(
    `[iNatBackfill] resuming from id_above=${state.idAbove} (pages=${state.pagesRun}, posted=${state.observationsPosted})`,
  )

  while (!ctl.signal.aborted) {
    const result = await bulkBackfillINat({
      idAbove: state.idAbove,
      maxPages: 30, // ~6000 obs per chunk
      signal: ctl.signal,
    })
    recordSyncRun(result)

    state = {
      idAbove: Number(result.nextCursor ?? state.idAbove),
      pagesRun: state.pagesRun + result.pagesFetched,
      observationsPosted: state.observationsPosted + result.observationsPosted,
      startedAt: state.startedAt,
      updatedAt: result.finishedAt,
    }
    writeCursor(state)

    console.log(
      `[iNatBackfill] cursor=${state.idAbove}  pages=${state.pagesRun}  posted=${state.observationsPosted}  (chunk: ${result.observationsPosted} in ${result.pagesFetched} pages, errors=${result.mindexErrors})`,
    )

    if (result.pagesFetched === 0 || result.observationsFetched === 0) {
      console.log("[iNatBackfill] no new data — caught up. Sleeping 10 min before re-poll.")
      await new Promise((r) => setTimeout(r, 10 * 60 * 1000))
    }
  }

  console.log(`\n[iNatBackfill] stopped. Final state:`, state)
  console.log("[iNatBackfill] ETL process status:", getSyncStatus())
}

main().catch((e) => {
  console.error("[iNatBackfill] fatal:", e)
  process.exit(1)
})
