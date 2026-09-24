import { NextResponse } from "next/server"
import { buildNlmDeviceIngestPayload } from "@/lib/nlm/device-stream-bridge"

export const dynamic = "force-dynamic"

/**
 * GET /api/natureos/nlm-training/ingest/live
 *
 * Device map/network → sensor channels for NLM.
 * Every sensor row carries device_id + sensor_id.
 * Samples are real telemetry or null (never mocked).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enrich = searchParams.get("telemetry") !== "0"

  const payload = await buildNlmDeviceIngestPayload({
    enrichTelemetry: enrich,
    maxTelemetryFetches: 6,
  })

  return NextResponse.json({
    devices: payload.devices,
    sensors: payload.sensors,
    source: payload.source,
    count: payload.count,
    sensor_count: payload.sensors.length,
    note: payload.note,
    tried_count: payload.tried.length,
    network_map_href: "/natureos/devices/network",
  })
}
