import { NextRequest, NextResponse } from "next/server"
import { readCoordinationSnapshot } from "@/lib/agent-coordination/read-ledgers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") || ""
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  )
}

export async function GET(request: NextRequest) {
  if (process.env.MYCOSOFT_COORDINATION_API_ENABLED !== "true" && !isLocalRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "coordination_snapshot_disabled" },
      { status: 403 },
    )
  }

  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit") || 80), 1),
    250,
  )

  try {
    const snapshot = await readCoordinationSnapshot(limit)
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[agent/coordination] Failed to read coordination ledgers", error)
    return NextResponse.json(
      { ok: false, error: "coordination_snapshot_failed" },
      { status: 500 },
    )
  }
}
