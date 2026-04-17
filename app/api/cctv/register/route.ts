/**
 * CCTV Operator Registration
 *
 * Registers an operator who wants to contribute cameras to the CREP
 * CCTV registry. Issues a 30-day token that the operator uses on
 * subsequent calls to /api/cctv/cameras to register individual cameras.
 *
 * @route POST /api/cctv/register
 * @body   { name: string, operator?: string }
 * @return { deviceId, token, next: "/api/cctv/cameras" }
 */

import { NextRequest, NextResponse } from "next/server"
import { registerCctvDevice, listCctvDevices } from "@/lib/crep/cctv-registry"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: { name?: string; operator?: string } = {}
  try {
    body = (await req.json()) as { name?: string; operator?: string }
  } catch {}
  const name = (body.name ?? "").toString().trim() || `cctv-op-${Date.now()}`
  const device = registerCctvDevice({ name, operator: body.operator })
  return NextResponse.json({
    ok: true,
    deviceId: device.id,
    token: device.token,
    name: device.name,
    registerCameraEndpoint: "/api/cctv/cameras",
    instructions:
      "Use `x-device-token: <token>` header (or include `token` in body) " +
      "when calling POST /api/cctv/cameras. Each call registers one camera " +
      "or updates an existing one with the same id.",
  })
}

export async function GET() {
  return NextResponse.json({ ok: true, count: listCctvDevices().length, devices: listCctvDevices() })
}
