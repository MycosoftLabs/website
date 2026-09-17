import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { emptySession, type TrailSession } from "@/lib/fusarium/bluesight/trail-ar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DIR = path.join(process.cwd(), ".data", "trail-ar")
const FILE = path.join(DIR, "session.json")

function loadSession(): TrailSession {
  if (!existsSync(FILE)) return emptySession("/fusarium/bluesight-lab/test-pxl-20260913.mp4", "PXL_20260913_211840104.mp4")
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as TrailSession
  } catch {
    return emptySession("/fusarium/bluesight-lab/test-pxl-20260913.mp4", "PXL_20260913_211840104.mp4")
  }
}

export function GET() {
  const session = loadSession()
  return NextResponse.json({
    live: false,
    banner: "SYNTHETIC EXERCISE",
    forecast_p: null,
    bound_to_ollama: false,
    path: FILE,
    session,
  })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TrailSession
  if (body?.schema !== "bluesight-trail-ar-session/v1") {
    return NextResponse.json({ error: "Expected bluesight-trail-ar-session/v1" }, { status: 400 })
  }
  mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(body, null, 2), "utf8")
  return NextResponse.json({
    live: false,
    ok: true,
    path: FILE,
    loop_count: body.loop_count,
    pass_count: body.passes.length,
    forecast_p: null,
  })
}
