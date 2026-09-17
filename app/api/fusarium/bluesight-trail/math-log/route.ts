import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import {
  mathLogsToArff,
  mathLogsToPredictionArff,
  type MathLogRow,
} from "@/lib/fusarium/bluesight/trail-ar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DIR = path.join(process.cwd(), ".data", "trail-ar")
const JSONL = path.join(DIR, "math-log.jsonl")
const ARFF = path.join(DIR, "weka", "trail-ar-session.arff")
const PRED_ARFF = path.join(DIR, "weka", "trail-ar-predictions.arff")
const SEED = "itdx-pxl-20260913-v16"
const MAX_JSONL_BYTES = 8 * 1024 * 1024

function jsonlBytes(): number {
  return existsSync(JSONL) ? statSync(JSONL).size : 0
}

function jsonlTooLarge(): boolean {
  return jsonlBytes() > MAX_JSONL_BYTES
}

function readRows(): MathLogRow[] {
  if (!existsSync(JSONL) || jsonlTooLarge()) return []
  return readFileSync(JSONL, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MathLogRow)
}

export function GET() {
  const oversized = jsonlTooLarge()
  const rows = oversized ? [] : readRows()
  return NextResponse.json({
    live: false,
    forecast_p: null,
    scored: false,
    score_status: "not_yet_scored",
    reason: oversized
      ? "math-log.jsonl exceeded 8 MB. Not read into RAM. NLM / Trail AR stay live: false; forecast_p null."
      : "No independent ground-truth labels for this PXL pass. WEKA can load features; accuracy is absent.",
    jsonl_path: JSONL,
    jsonl_bytes: jsonlBytes(),
    jsonl_oversized: oversized,
    arff_path: existsSync(ARFF) ? ARFF : null,
    prediction_arff_path: existsSync(PRED_ARFF) ? PRED_ARFF : null,
    row_count: oversized ? null : rows.length,
    seed: SEED,
    weka_fixture_only: "176/240 is the authored geometry fixture, not this trail.",
  })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { rows?: MathLogRow[]; seed?: string }
  const incoming = Array.isArray(body.rows) ? body.rows : []
  if (!incoming.length) {
    return NextResponse.json({ error: "rows required" }, { status: 400 })
  }
  mkdirSync(path.join(DIR, "weka"), { recursive: true })
  for (const row of incoming) {
    if (row.live !== false || row.forecast_p !== null) {
      return NextResponse.json({ error: "live must be false and forecast_p null" }, { status: 400 })
    }
    appendFileSync(JSONL, `${JSON.stringify(row)}\n`, "utf8")
  }
  const oversized = jsonlTooLarge()
  const seed = body.seed || SEED
  if (!oversized) {
    const all = readRows()
    writeFileSync(ARFF, mathLogsToArff(all, seed), "utf8")
    writeFileSync(PRED_ARFF, mathLogsToPredictionArff(all, seed), "utf8")
  }
  return NextResponse.json({
    live: false,
    forecast_p: null,
    scored: false,
    score_status: "not_yet_scored",
    appended: incoming.length,
    row_count: oversized ? null : readRows().length,
    jsonl_path: JSONL,
    jsonl_bytes: jsonlBytes(),
    jsonl_oversized: oversized,
    arff_rewritten: !oversized,
    arff_path: existsSync(ARFF) ? ARFF : null,
    prediction_arff_path: existsSync(PRED_ARFF) ? PRED_ARFF : null,
    seed,
  })
}
