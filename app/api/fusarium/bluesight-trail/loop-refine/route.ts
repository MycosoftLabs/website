import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import type { LoopLearnRow } from "@/lib/fusarium/bluesight/loop-refine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DIR = path.join(process.cwd(), ".data", "trail-ar")
const JSONL = path.join(DIR, "loop-refine.jsonl")

function countsFromTail(maxLines = 400) {
  if (!existsSync(JSONL)) {
    return { loop: 0, accepts: 0, rejects: 0, seeds: 0, last_iou: null as number | null, last_iou_delta: null as number | null, logged: 0 }
  }
  const raw = readFileSync(JSONL, "utf8")
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const slice = lines.slice(-maxLines)
  let accepts = 0
  let rejects = 0
  let seeds = 0
  let loop = 0
  let lastIou: number | null = null
  let lastDelta: number | null = null
  for (const line of slice) {
    try {
      const row = JSON.parse(line) as LoopLearnRow
      loop = Math.max(loop, Number(row.loop) || 0)
      if (row.decision === "reject") rejects += 1
      else if (row.decision === "seed") seeds += 1
      else accepts += 1
      if (typeof row.iou === "number") lastIou = row.iou
      if (typeof row.iou_delta === "number") lastDelta = row.iou_delta
    } catch {
      /* skip bad line */
    }
  }
  return { loop, accepts, rejects, seeds, last_iou: lastIou, last_iou_delta: lastDelta, logged: lines.length }
}

export function GET() {
  const stats = existsSync(JSONL) ? statSync(JSONL) : null
  return NextResponse.json({
    live: false,
    forecast_p: null,
    jsonl_path: JSONL,
    bytes: stats?.size ?? 0,
    ...countsFromTail(),
  })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { rows?: LoopLearnRow[] }
  const incoming = Array.isArray(body.rows) ? body.rows : []
  if (!incoming.length) {
    return NextResponse.json({ error: "rows required", forecast_p: null }, { status: 400 })
  }
  mkdirSync(DIR, { recursive: true })
  let appended = 0
  for (const row of incoming) {
    if (row.live !== false || row.forecast_p !== null) {
      return NextResponse.json({ error: "live must be false and forecast_p null" }, { status: 400 })
    }
    appendFileSync(JSONL, `${JSON.stringify(row)}\n`, "utf8")
    appended += 1
  }
  return NextResponse.json({
    live: false,
    forecast_p: null,
    appended,
    jsonl_path: JSONL,
    ...countsFromTail(),
  })
}
