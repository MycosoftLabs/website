/**
 * Vessel SDR Device Registration
 *
 * Registers an SDR-based AIS receiver (e.g. rtl-ais / AIS-catcher running
 * on a user-owned Raspberry Pi + RTL-SDR dongle). Issues a device token
 * that the SDR uses to POST AIS messages to /api/vessels/ingest.
 *
 * Tokens are stored in process memory (non-durable). If the container
 * restarts, the SDR re-registers. In the future this should persist to
 * MINDEX so tokens survive restarts.
 *
 * @route POST /api/vessels/register
 * @body   { name: string, location?: {lat,lng}, operator?: string }
 * @return { deviceId, token, ingestEndpoint }
 */

import { NextRequest, NextResponse } from "next/server"
import { registerSdrDevice, listSdrDevices } from "@/lib/crep/sdr-vessel-cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RegisterPayload {
  name?: string
  location?: { lat: number; lng: number }
  operator?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  let body: RegisterPayload
  try {
    body = (await req.json()) as RegisterPayload
  } catch {
    body = {}
  }

  const name = (body.name ?? "").toString().trim() || `sdr-${Date.now()}`
  const device = registerSdrDevice({
    name,
    location: body.location,
    operator: body.operator,
    notes: body.notes,
    registeredAt: new Date().toISOString(),
  })

  return NextResponse.json({
    ok: true,
    deviceId: device.id,
    token: device.token,
    name: device.name,
    ingestEndpoint: "/api/vessels/ingest",
    instructions:
      "POST AIS messages to /api/vessels/ingest with header `x-device-token: <token>` " +
      "or include `token` in the JSON body. Batch up to 1000 messages per request " +
      "via `{ messages: [...] }`.",
  })
}

export async function GET() {
  // List registered SDRs (operator info only, NOT tokens)
  const devices = listSdrDevices()
  return NextResponse.json({
    ok: true,
    count: devices.length,
    devices,
  })
}
