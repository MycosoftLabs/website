/**
 * Per-device agent URL resolver.
 *
 * Looks up where a deviceId's mycobrain-agent lives, in priority order:
 *
 *   1. MAS device registry (`${MAS_API_URL}/api/devices`)
 *      Devices that have heartbeat-registered with MAS publish their
 *      `host` and (post unified-agent) `agent_url`.
 *
 *   2. Local /api/mycobrain operator probes
 *      The website probes MYCOBRAIN_OPERATOR_URLS directly via
 *      /api/mycobrain. Any device that came back with
 *      `source: "operator-http"` AND a host/port can be matched here.
 *      This is the path that finds devices not yet in MAS (e.g. the
 *      live Pi at 192.168.0.123 today).
 *
 *   3. MYCOBRAIN_OPERATOR_URLS host match (last resort)
 *      If the deviceId's suffix encodes the host (e.g. "...-192-168-0-123"),
 *      try to map it directly.
 *
 * Returns the agent's base URL (no trailing slash) or null.
 */

import { deploymentByRegistryId } from "@/lib/devices/field-deployments"

const OPERATOR_HOSTS = (
  process.env.MYCOBRAIN_OPERATOR_URLS ||
  "http://192.168.0.228:8787,http://192.168.0.123:8787"
)
  .split(",")
  .map((u) => u.trim().replace(/\/+$/, ""))
  .filter(Boolean)

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

interface RegistryDevice {
  device_id: string
  host?: string
  port?: number
  openclaw_url?: string | null
  agent_url?: string
  extra?: {
    agent_url?: string
    api_kind?: string
    mdp_device_id?: string
  }
}

interface OperatorDevice {
  device_id: string
  source?: string
  network_host?: string
  network_port?: number | string
}

let registryCache: { ts: number; devices: RegistryDevice[] } | null = null
let operatorCache: { ts: number; devices: OperatorDevice[] } | null = null
const TTL_MS = 30_000

async function fetchRegistry(): Promise<RegistryDevice[]> {
  const now = Date.now()
  if (registryCache && now - registryCache.ts < TTL_MS) return registryCache.devices
  try {
    const res = await fetch(`${MAS_API_URL}/api/devices`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    const devices: RegistryDevice[] = data.devices || []
    registryCache = { ts: now, devices }
    return devices
  } catch {
    return []
  }
}

async function fetchOperatorDevices(): Promise<OperatorDevice[]> {
  const now = Date.now()
  if (operatorCache && now - operatorCache.ts < TTL_MS) return operatorCache.devices
  // Use the site's own /api/mycobrain endpoint which already probes
  // MYCOBRAIN_OPERATOR_URLS at :8787 and returns normalized devices.
  // We call it absolutely via the request origin when available, else via
  // a same-origin relative path; in route handlers we fall back to env.
  const base =
    process.env.WEBSITE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/mycobrain`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    const devices: OperatorDevice[] = data.devices || []
    operatorCache = { ts: now, devices }
    return devices
  } catch {
    return []
  }
}

function hostFromDeviceIdSuffix(deviceId: string): string | null {
  // e.g. mycobrain-sidea-10b41d-amb-192-168-0-123 -> 192.168.0.123
  const m = deviceId.match(/(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/)
  if (!m) return null
  return `${m[1]}.${m[2]}.${m[3]}.${m[4]}`
}

/**
 * Resolve the agent URL (port 8787) for a given device, or null if the device
 * isn't reachable via the unified agent path.
 */
export async function resolveAgentUrl(deviceId: string): Promise<string | null> {
  const field = deploymentByRegistryId(deviceId)
  if (field?.agent_url) return field.agent_url.replace(/\/+$/, "")

  // 1. MAS registry
  const registry = await fetchRegistry()
  const masMatch = registry.find((d) => d.device_id === deviceId)
  if (masMatch) {
    const extraUrl = masMatch.extra?.agent_url
    if (typeof extraUrl === "string" && extraUrl.includes(":8787")) {
      return extraUrl.replace(/\/+$/, "")
    }
    if (typeof masMatch.agent_url === "string" && /:8787\/?$/.test(masMatch.agent_url)) {
      return masMatch.agent_url.replace(/\/+$/, "")
    }
    if (masMatch.host) {
      const m = OPERATOR_HOSTS.find((u) => new URL(u).hostname === masMatch.host)
      if (m) return m
      if (Number(masMatch.port) === 8787) {
        return `http://${masMatch.host}:8787`
      }
    }
  }

  // 2. Operator-http (live /api/mycobrain probes)
  const operatorDevices = await fetchOperatorDevices()
  const opMatch = operatorDevices.find((d) => d.device_id === deviceId)
  if (opMatch && opMatch.network_host) {
    const m = OPERATOR_HOSTS.find((u) => new URL(u).hostname === opMatch.network_host)
    if (m) return m
    // Fall back to constructing the URL from host:port (port 8787 is standard)
    const port = String(opMatch.network_port || 8787)
    if (port === "8787") {
      return `http://${opMatch.network_host}:8787`
    }
  }

  // 3. Host extracted from deviceId suffix
  const suffixHost = hostFromDeviceIdSuffix(deviceId)
  if (suffixHost) {
    const m = OPERATOR_HOSTS.find((u) => new URL(u).hostname === suffixHost)
    if (m) return m
  }

  return null
}

/** Same idea but synchronous — for callers that already have a `host` string. */
export function agentUrlForHost(host: string): string | null {
  return OPERATOR_HOSTS.find((u) => new URL(u).hostname === host) || null
}
