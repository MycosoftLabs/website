import { appendFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LOG_PATH = path.join(process.cwd(), "var", "logs", "itdx-demo-log.jsonl")
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
}

function sanitize(entry: Record<string, unknown>) {
  return {
    at: new Date().toISOString(),
    type: typeof entry.type === "string" ? entry.type.slice(0, 80) : "event",
    synthetic: true,
    live: false,
    clock: typeof entry.clock === "string" ? entry.clock.slice(0, 40) : undefined,
    index: typeof entry.index === "number" ? entry.index : undefined,
    assetId: typeof entry.assetId === "string" ? entry.assetId.slice(0, 80) : undefined,
    position: Array.isArray(entry.position) ? entry.position.slice(0, 2) : undefined,
    layers: entry.layers && typeof entry.layers === "object" ? entry.layers : undefined,
    focusTarget: typeof entry.focusTarget === "string" ? entry.focusTarget.slice(0, 80) : undefined,
    runId: typeof entry.runId === "string" ? entry.runId.slice(0, 160) : undefined,
    note: typeof entry.note === "string" ? entry.note.slice(0, 240) : undefined,
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "JSON required" }, { status: 400, headers: HEADERS })
  }
  const row = sanitize(body)
  await mkdir(path.dirname(LOG_PATH), { recursive: true })
  await appendFile(LOG_PATH, JSON.stringify(row) + "\n", "utf8")
  return NextResponse.json({ ok: true, stored: "local-jsonl", synthetic: true, live: false }, { headers: HEADERS })
}

export async function GET(request: NextRequest) {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error
  const limit = Math.min(40, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 12)))
  try {
    const text = await readFile(LOG_PATH, "utf8")
    const entries = text
      .trim()
      .split(/\n+/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line))
    return NextResponse.json({ entries, synthetic: true, live: false }, { headers: HEADERS })
  } catch {
    return NextResponse.json({ entries: [], synthetic: true, live: false }, { headers: HEADERS })
  }
}
