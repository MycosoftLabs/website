/**
 * CCTV Camera Registry
 *
 * POST — add or update a camera (requires device token)
 * GET  — list cameras (optional bbox + tag + operator filter), public
 *
 * @route POST /api/cctv/cameras
 * @body   { name, lat, lng, streamProtocol, streamUrl?, bearingDeg?, fovDeg?, rangeM?, operator?, tags?[], deviceToken? }
 *         (token can also be passed via `x-device-token` header)
 * @return { camera: CctvCamera }
 *
 * @route GET /api/cctv/cameras?north=&south=&east=&west=&tag=&operator=
 * @return { count, cameras: CctvCamera[] }
 */

import { NextRequest, NextResponse } from "next/server"
import {
  registerCamera,
  listCameras,
  isCctvTokenValid,
  getCctvRegistryStats,
  type RegisterCameraInput,
} from "@/lib/crep/cctv-registry"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: RegisterCameraInput & { token?: string } = {} as any
  try {
    body = (await req.json()) as RegisterCameraInput & { token?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const token = req.headers.get("x-device-token") ?? body.token ?? body.deviceToken ?? ""
  // Allow anonymous registrations ONLY when marked as "official" or "scraped"
  // (indicates the server-side operator adding from a verified directory).
  // User-contributed cameras MUST have a valid operator token.
  const anonymousOk = body.provenance === "official" || body.provenance === "scraped"
  if (!anonymousOk && !isCctvTokenValid(token)) {
    return NextResponse.json(
      {
        error: "Missing or invalid device token. Register first at /api/cctv/register.",
      },
      { status: 401 },
    )
  }

  const result = registerCamera({
    ...body,
    deviceToken: token || body.deviceToken,
  })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, camera: result })
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const n = Number(p.get("north"))
  const s = Number(p.get("south"))
  const e = Number(p.get("east"))
  const w = Number(p.get("west"))
  const bbox =
    Number.isFinite(n) && Number.isFinite(s) && Number.isFinite(e) && Number.isFinite(w)
      ? { north: n, south: s, east: e, west: w }
      : undefined
  const tagStr = p.get("tag") || p.get("tags")
  const tags = tagStr
    ? tagStr.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined
  const operator = p.get("operator") || undefined

  const cameras = listCameras({ bbox, tags, operator })
  return NextResponse.json({
    ok: true,
    count: cameras.length,
    cameras,
    stats: getCctvRegistryStats(),
  })
}
