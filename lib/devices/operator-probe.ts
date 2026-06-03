/**
 * Probe MycoBrain operator/agent HTTP APIs on LAN (:8787 legacy /api/* paths).
 */

const DEFAULT_OPERATOR_URLS = (
  process.env.MYCOBRAIN_OPERATOR_URLS ||
  "http://192.168.0.228:8787,http://192.168.0.123:8787"
)
  .split(",")
  .map((u) => u.trim().replace(/\/+$/, ""))
  .filter(Boolean)

const OPERATOR_PROBE_TIMEOUT_MS = Number(
  process.env.MYCOBRAIN_OPERATOR_PROBE_TIMEOUT_MS || 3000
)

export interface OperatorProbeResult {
  host: string
  agent_url: string
  online: boolean
  serial_connected: boolean
  last_seen: string | null
  mdp_device_id: string | null
  role: string | null
  firmware_version: string | null
  telemetry: Record<string, unknown> | null
}

export function getOperatorUrls(): string[] {
  return DEFAULT_OPERATOR_URLS
}

export async function probeOperatorAgent(baseUrl: string): Promise<OperatorProbeResult | null> {
  try {
    const host = new URL(baseUrl).hostname
    const statusRes = await fetch(`${baseUrl}/api/status`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(OPERATOR_PROBE_TIMEOUT_MS),
    })
    if (!statusRes.ok) return null

    const status = (await statusRes.json()) as Record<string, unknown>
    const reading = (status.lastSensorReading as Record<string, unknown>) || null

    let telemetry: Record<string, unknown> | null = null
    if (reading) {
      telemetry = {
        temperature_c: reading.temperature_c_comp ?? reading.ambient_temperature_c,
        humidity_pct: reading.humidity_pct_comp ?? reading.ambient_humidity_pct,
        pressure_hpa: reading.pressure_hpa,
        iaq: reading.iaq,
        eco2_ppm: reading.eco2_ppm,
        gas_resistance_ohm: reading.gas_resistance_ohm,
        sensor_slot: reading.sensor_slot,
        captured_at: reading.ts ?? status.lastHeartbeat,
      }
    }

    return {
      host,
      agent_url: baseUrl,
      online: status.serialConnected === true || status.ok === true,
      serial_connected: status.serialConnected === true,
      last_seen:
        (typeof status.lastHeartbeat === "string" ? status.lastHeartbeat : null) ||
        (reading && typeof reading.ts === "string" ? reading.ts : null),
      mdp_device_id:
        (reading && typeof reading.device_id === "string" ? reading.device_id : null) ||
        (reading && typeof reading.node_id === "string" ? reading.node_id : null),
      role: reading && typeof reading.role === "string" ? reading.role : null,
      firmware_version:
        reading && typeof reading.fw_version === "string" ? reading.fw_version : null,
      telemetry,
    }
  } catch {
    return null
  }
}

export async function probeAllOperatorAgents(): Promise<OperatorProbeResult[]> {
  const results = await Promise.all(DEFAULT_OPERATOR_URLS.map(probeOperatorAgent))
  return results.filter((r): r is OperatorProbeResult => r !== null)
}
