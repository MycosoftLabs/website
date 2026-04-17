/**
 * iNaturalist → MINDEX Parallel Bulk Backfill
 *
 * Partitions the iNat id range [1, ~300,000,000] across N worker slices
 * so we hold all 300M observations locally in MINDEX quickly.
 *
 * Single-worker rate: ~600k obs/hour. 300M ÷ 600k = 500 hours ≈ 3 weeks.
 * With 30 parallel workers on partitioned id ranges that drops to ~17 hours.
 *
 * Strategy:
 *   - Split the id range into SHARDS slices of equal width
 *   - Each shard persists a separate cursor file (var/inat-shard-N.json)
 *   - Single process spawns SHARDS pseudo-workers via Promise.all
 *   - Each worker does bulkBackfillINat with its own idAbove floor + ceiling
 *
 * Run:
 *   npx tsx scripts/inat-backfill-parallel.ts --shards=30 --maxId=300000000
 *
 * Env:
 *   MINDEX_API_URL / MINDEX_API_KEY / INAT_ACCESS_TOKEN
 *
 * Cooperative stop: SIGINT/SIGTERM waits for all shards to finish current page.
 */

import fs from "node:fs"
import path from "node:path"
import { bulkBackfillINat, recordSyncRun } from "../lib/crep/inat-etl"

const args = process.argv.slice(2)
const getArg = (k: string, dflt: number) => {
  const v = args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1]
  return v ? Number(v) : dflt
}

const SHARDS = getArg("shards", 30)
const MAX_ID = getArg("maxId", 300_000_000)
const MIN_ID = getArg("minId", 0)
const MAX_PAGES_PER_CHUNK = getArg("pagesPerChunk", 30)

const CURSOR_DIR = path.resolve(process.cwd(), "var/inat-parallel-cursors")
fs.mkdirSync(CURSOR_DIR, { recursive: true })

interface ShardState {
  shardIdx: number
  idFloor: number
  idCeiling: number
  idAbove: number
  pagesRun: number
  observationsPosted: number
  done: boolean
  lastError?: string
  startedAt: string
  updatedAt: string
}

function readCursor(shardIdx: number): ShardState | null {
  const f = path.join(CURSOR_DIR, `shard-${shardIdx}.json`)
  if (!fs.existsSync(f)) return null
  try { return JSON.parse(fs.readFileSync(f, "utf8")) } catch { return null }
}

function writeCursor(s: ShardState) {
  const f = path.join(CURSOR_DIR, `shard-${s.shardIdx}.json`)
  fs.writeFileSync(f, JSON.stringify(s, null, 2), "utf8")
}

async function runShard(shardIdx: number, stopSignal: AbortSignal) {
  const shardWidth = Math.ceil((MAX_ID - MIN_ID) / SHARDS)
  const idFloor = MIN_ID + shardIdx * shardWidth
  const idCeiling = Math.min(MAX_ID, idFloor + shardWidth)

  let state = readCursor(shardIdx) ?? {
    shardIdx,
    idFloor, idCeiling,
    idAbove: idFloor,
    pagesRun: 0, observationsPosted: 0, done: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  console.log(`[shard-${shardIdx}] range [${state.idAbove.toLocaleString()} → ${idCeiling.toLocaleString()}] (${((idCeiling - state.idAbove) / 1e6).toFixed(1)}M ids)`)

  while (!stopSignal.aborted && !state.done) {
    try {
      const r = await bulkBackfillINat({
        idAbove: state.idAbove, maxPages: MAX_PAGES_PER_CHUNK,
        signal: stopSignal,
      })
      recordSyncRun(r)

      const nextCursor = Number(r.nextCursor ?? state.idAbove)
      state.idAbove = nextCursor
      state.pagesRun += r.pagesFetched
      state.observationsPosted += r.observationsPosted
      state.updatedAt = r.finishedAt

      if (r.pagesFetched === 0 || r.observationsFetched === 0 || state.idAbove >= idCeiling) {
        state.done = true
        console.log(`[shard-${shardIdx}] DONE — posted ${state.observationsPosted.toLocaleString()} in ${state.pagesRun} pages`)
      }
      writeCursor(state)
    } catch (e: any) {
      state.lastError = e?.message || String(e)
      state.updatedAt = new Date().toISOString()
      writeCursor(state)
      console.error(`[shard-${shardIdx}] error:`, state.lastError)
      // Back off briefly and continue
      await new Promise((r) => setTimeout(r, 30_000))
    }
  }
}

async function main() {
  const ctl = new AbortController()
  const onSignal = () => {
    console.log("\n[inat-parallel] caught signal, stopping shards after current chunk...")
    ctl.abort()
  }
  process.on("SIGINT", onSignal)
  process.on("SIGTERM", onSignal)

  console.log(`[inat-parallel] spawning ${SHARDS} shards across id range [${MIN_ID.toLocaleString()}, ${MAX_ID.toLocaleString()}]`)
  console.log(`[inat-parallel] cursors → ${CURSOR_DIR}`)
  console.log(`[inat-parallel] at ~600k obs/hr/shard this will complete the 300M backfill in ~${Math.ceil((MAX_ID - MIN_ID) / 600_000 / SHARDS)}h`)

  const workers = Array.from({ length: SHARDS }, (_, i) => runShard(i, ctl.signal))
  await Promise.all(workers)

  // Summary
  let totalObs = 0, totalPages = 0, done = 0
  for (let i = 0; i < SHARDS; i++) {
    const s = readCursor(i); if (!s) continue
    totalObs += s.observationsPosted; totalPages += s.pagesRun; if (s.done) done++
  }
  console.log(`\n[inat-parallel] summary: ${done}/${SHARDS} shards complete, ${totalObs.toLocaleString()} obs posted in ${totalPages.toLocaleString()} pages`)
}

main().catch((e) => { console.error("[inat-parallel] fatal:", e); process.exit(1) })
