import { NextRequest, NextResponse } from "next/server"
import { FORT_STEWART_SLICE } from "@/lib/itdx/run-narration.mjs"
import { assessSituation } from "@/lib/itdx/task8-client.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
}

interface SliceBody {
  slice?: typeof FORT_STEWART_SLICE
}

async function handle(request: NextRequest) {
  try {
    let slice = FORT_STEWART_SLICE
    if (request.method === "POST") {
      try {
        const body = (await request.json()) as SliceBody
        if (body?.slice) slice = body.slice
      } catch {
        slice = FORT_STEWART_SLICE
      }
    }
    const situation = await assessSituation({ slice })
    return NextResponse.json(
      {
        ...(situation.situation || {}),
        source: "mas",
        situation_status: situation.status,
        situation_error: situation.ok ? null : situation.data?.error || `MAS situation HTTP ${situation.status}`,
        live_cop: false,
        synthetic: true,
        origin: "SYNTHETIC_EXERCISE",
        execution: "ADVISORY_ONLY",
      },
      { status: situation.ok ? 200 : 200, headers: HEADERS },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "situation-assessment unavailable",
        live_cop: false,
        synthetic: true,
        origin: "SYNTHETIC_EXERCISE",
        qualification: "UNQUALIFIED",
        note: "Website BFF failed closed. Direct MAS POST /api/itdx/situation-assessment remains the cite source.",
      },
      { status: 200, headers: HEADERS },
    )
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
