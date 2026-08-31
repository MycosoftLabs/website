/**
 * GET /api/psathyrella/telemetry — proxy to MAS fused BuoyTelemetry envelope.
 */

import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
// The PER-DEVICE MAS endpoint is the one Cursor's hub-heartbeat fusion writes (Aug 1 2026):
// source=field / gpsLock=locked. The bare /api/psathyrella/telemetry LIST endpoint returns empty on
// current MAS, which made the GCS fall back to its site default even while the buoy had a live fix.
const DEVICE_ID = process.env.PSATHYRELLA_MAS_DEVICE_ID || "psathyrella-1"

export const dynamic = "force-dynamic"

async function pull(url: string) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000), cache: "no-store" })
  const body = await res.json().catch(() => null)
  return { res, body }
}

function hasEnvelope(b: unknown): boolean {
  const t = (b as { telemetry?: unknown })?.telemetry ?? b
  return !!t && typeof t === "object" && ("pose" in (t as object) || "deviceId" in (t as object))
}

export async function GET() {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner()
  if (auth.error) return auth.error
  try {
    // Primary: the per-device fused envelope (field/locked). Fallback: the list endpoint if per-device is empty.
    const primary = await pull(`${MAS_API_URL}/api/psathyrella/${encodeURIComponent(DEVICE_ID)}/telemetry`)
    if (primary.res.ok && hasEnvelope(primary.body)) return NextResponse.json(primary.body, { status: 200 })

    const fallback = await pull(`${MAS_API_URL}/api/psathyrella/telemetry`)
    if (fallback.res.ok && hasEnvelope(fallback.body)) return NextResponse.json(fallback.body, { status: 200 })

    // Neither returned a usable envelope — surface the per-device status so the GCS stays honest.
    return NextResponse.json(primary.body ?? { status: "unavailable" }, { status: primary.res.status || 502 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message, status: "unavailable" }, { status: 502 })
  }
}
