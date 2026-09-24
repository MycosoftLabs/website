import { NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"
import {
  buildNlmDeviceIngestPayload,
  normalizeIngestBindings,
} from "@/lib/nlm/device-stream-bridge"
import { requireOwnerOrSuperuserIdentity, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

export const dynamic = "force-dynamic"

/**
 * POST /api/natureos/nlm-training/ingest/bind
 *
 * Bind device_id + sensor_id pairs to an NLM training run (website BFF → MAS).
 * Rejects unknown device/sensor ids. Does not invent samples.
 */
export async function POST(request: Request) {
  const identity = await resolveVerifiedIdentity()
  const authError = requireOwnerOrSuperuserIdentity(identity)
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const bindings = normalizeIngestBindings(body.bindings || body.ingest_bindings)
  if (bindings.length === 0) {
    return NextResponse.json(
      { error: "bindings[] with device_id + sensor_id required" },
      { status: 400 }
    )
  }

  const live = await buildNlmDeviceIngestPayload({
    enrichTelemetry: true,
    maxTelemetryFetches: 8,
  })
  const known = new Set(
    live.sensors.map((s) => `${s.device_id}::${s.sensor_id}`)
  )
  const deviceIds = new Set(live.devices.map((d) => d.device_id))

  const validated: typeof bindings = []
  const rejected: Array<{ device_id: string; sensor_id: string; reason: string }> = []

  for (const b of bindings) {
    if (!deviceIds.has(b.device_id)) {
      rejected.push({ ...b, reason: "device_not_in_network_map" })
      continue
    }
    const key = `${b.device_id}::${b.sensor_id}`
    if (!known.has(key)) {
      // Allow binding declared role sensors even if not yet sampled
      const device = live.devices.find((d) => d.device_id === b.device_id)
      if (device?.sensor_channels.includes(b.sensor_id)) {
        validated.push(b)
      } else {
        rejected.push({ ...b, reason: "sensor_not_on_device" })
      }
      continue
    }
    validated.push(b)
  }

  if (validated.length === 0) {
    return NextResponse.json(
      {
        error: "No valid device/sensor bindings",
        rejected,
        network_map_href: "/natureos/devices/network",
      },
      { status: 422 }
    )
  }

  const masBase = (
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    resolveMasServerBaseUrl() ||
    "http://192.168.0.188:8001"
  ).replace(/\/$/, "")

  // Forward binding metadata to MAS training control (non-fatal if MAS down)
  let mas: unknown = null
  try {
    const res = await fetch(`${masBase}/api/nlm/training/ingest/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: body.modelId || body.model_id || null,
        run_id: body.runId || body.run_id || null,
        bindings: validated,
        owner_id: identity.userId,
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) mas = await res.json()
  } catch {
    mas = { status: "unreachable", note: "Bindings validated locally; MAS bind deferred." }
  }

  const sensorRows = live.sensors.filter((s) =>
    validated.some((b) => b.device_id === s.device_id && b.sensor_id === s.sensor_id)
  )

  return NextResponse.json({
    ok: true,
    bindings: validated,
    rejected,
    samples: sensorRows.map((s) => ({
      device_id: s.device_id,
      sensor_id: s.sensor_id,
      status: s.status,
      sample: s.sample,
      network_href: s.network_href,
    })),
    mas,
    network_map_href: "/natureos/devices/network",
  })
}
