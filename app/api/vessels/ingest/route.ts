/**
 * Vessel AIS Ingest Endpoint
 *
 * Accepts AIS position reports from user-owned SDR receivers (rtl-ais,
 * AIS-catcher, etc.) and adds them to an in-memory vessel cache that
 * vessel-registry.ts reads via `fetchFromSDR()`.
 *
 * Also accepts a bulk upload of parsed AIS messages (for devices that
 * post a batch of messages every N seconds).
 *
 * Future: persist to MINDEX for historical replay and cross-device
 * deduplication. For now, in-memory cache keyed by MMSI with 5-minute
 * stale-drop so the map only shows live vessels.
 *
 * Auth: requires a device token (header `x-device-token`) issued by
 * /api/vessels/register. Unregistered requests are rejected with 401.
 *
 * @route POST /api/vessels/ingest
 */

import { NextRequest, NextResponse } from "next/server"
import {
  ingestSdrVessels,
  type SdrVesselMessage,
  getSdrVesselCacheStats,
  isDeviceTokenValid,
} from "@/lib/crep/sdr-vessel-cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface IncomingPayload {
  /** Device token issued at registration time */
  token?: string
  /** Either a single message or an array for bulk upload */
  messages?: SdrVesselMessage[]
  message?: SdrVesselMessage
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()

  // Accept token via header OR body (SDR firmware may not support custom headers)
  const headerToken = req.headers.get("x-device-token") ?? ""
  let body: IncomingPayload
  try {
    body = (await req.json()) as IncomingPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const token = headerToken || body.token || ""
  if (!isDeviceTokenValid(token)) {
    return NextResponse.json(
      { error: "Invalid or missing device token. Register at /api/vessels/register." },
      { status: 401 },
    )
  }

  const messages: SdrVesselMessage[] = body.messages
    ? body.messages
    : body.message
      ? [body.message]
      : []

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided (expected `message` object or `messages` array)" },
      { status: 400 },
    )
  }

  const { accepted, rejected, reasons } = ingestSdrVessels(token, messages)
  const stats = getSdrVesselCacheStats()

  return NextResponse.json({
    ok: true,
    accepted,
    rejected,
    reasons,
    cacheStats: stats,
    latencyMs: Date.now() - startedAt,
  })
}

export async function GET(_req: NextRequest) {
  // Public health/stats — no token needed
  const stats = getSdrVesselCacheStats()
  return NextResponse.json({
    ok: true,
    description: "POST AIS messages here. Requires `x-device-token` header.",
    cacheStats: stats,
  })
}
