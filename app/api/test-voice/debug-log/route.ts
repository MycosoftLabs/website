/**
 * Persist test-voice debug logs for agent review (no mock data — real session logs only).
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

const LOG_DIR = path.join(process.cwd(), "artifacts", "voice-debug")
const LATEST = path.join(LOG_DIR, "latest.jsonl")
const MAX_LINES = 5000

function ensureDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      logs?: { level?: string; message?: string; details?: string; timestamp?: string }[]
      meta?: Record<string, unknown>
    }
    ensureDir()
    const lines: string[] = []
    if (body.meta) {
      lines.push(JSON.stringify({ type: "meta", ...body.meta, at: new Date().toISOString() }))
    }
    for (const entry of body.logs || []) {
      lines.push(
        JSON.stringify({
          type: "log",
          at: entry.timestamp || new Date().toISOString(),
          level: entry.level || "info",
          message: entry.message || "",
          details: entry.details,
        })
      )
    }
    if (lines.length === 0) {
      return NextResponse.json({ ok: true, written: 0 })
    }
    fs.appendFileSync(LATEST, lines.join("\n") + "\n", "utf8")
    // Trim file if too large
    try {
      const all = fs.readFileSync(LATEST, "utf8").split("\n").filter(Boolean)
      if (all.length > MAX_LINES) {
        fs.writeFileSync(LATEST, all.slice(-MAX_LINES).join("\n") + "\n", "utf8")
      }
    } catch {
      // ignore trim errors
    }
    return NextResponse.json({ ok: true, written: lines.length, path: LATEST })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 })
  }
}

export async function GET() {
  ensureDir()
  if (!fs.existsSync(LATEST)) {
    return NextResponse.json({ ok: true, logs: [], path: LATEST })
  }
  const text = fs.readFileSync(LATEST, "utf8")
  const lines = text.split("\n").filter(Boolean).slice(-200)
  const parsed = lines.map((line) => {
    try {
      return JSON.parse(line)
    } catch {
      return { raw: line }
    }
  })
  return NextResponse.json({ ok: true, path: LATEST, count: parsed.length, logs: parsed })
}
