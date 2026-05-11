import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type WaypointMirrorBody = {
  waypoints?: unknown[]
  waypoint?: unknown
}

function unavailableWaypoints(extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    available: false,
    authenticated: false,
    source: "mindex-waypoints",
    waypoints: [],
    total: 0,
    ...extra,
  }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  })
}

export async function GET() {
  return unavailableWaypoints()
}

export async function POST(req: NextRequest) {
  let body: WaypointMirrorBody | null = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const submitted = Array.isArray(body?.waypoints)
    ? body?.waypoints.length
    : body?.waypoint
      ? 1
      : 0

  // This endpoint is a best-effort anonymous mirror target used by the CREP
  // waypoint UI. Production MINDEX writes happen through authenticated MYCA and
  // CREP APIs; anonymous public visitors should never see a 404/500 here.
  return unavailableWaypoints({ accepted: true, mirrored: false, submitted })
}
