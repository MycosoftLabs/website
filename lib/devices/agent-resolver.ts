/**
 * Per-device agent URL resolver.
 *
 * Looks up where a deviceId's mycobrain-agent lives, by:
 *   1. Direct env override: MYCOBRAIN_OPERATOR_URLS (host list, port :8787 assumed)
 *      with the device's host matching one of them via /api/devices/network registry
 *   2. Fallback to legacy MYCOBRAIN_SERVICE_URL (:8003) for devices we don\'t yet
 *      have a unified agent for
 *
 * The website does NOT need to know about every device statically — the MAS
 * device registry at /api/devices/network is the source of truth, and includes
 * each device\'s `host` (LAN IP). Combined with MYCOBRAIN_OPERATOR_URLS, we
 * route to the right :8787.
 */

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
}

let registryCache: { ts: number; devices: RegistryDevice[] } | null = null
const REGISTRY_TTL_MS = 30_000

async function fetchRegistry(): Promise<RegistryDevice[]> {
  const now = Date.now()
  if (registryCache && now - registryCache.ts < REGISTRY_TTL_MS) {
    return registryCache.devices
  }
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

/**
 * Resolve the agent URL (port 8787) for a given device, or null if the device
 * isn\'t reachable via the unified agent path.
 */
export async function resolveAgentUrl(deviceId: string): Promise<string | null> {
  const registry = await fetchRegistry()
  const device = registry.find((d) => d.device_id === deviceId)
  if (!device) return null

  // Prefer the agent URL the device self-reported, if it has one matching :8787
  // (post unified-agent rollout, every agent registers with `agent_url`).
  const reportedUrl = (device as { agent_url?: string }).agent_url
  if (typeof reportedUrl === "string" && /:8787\/?$/.test(reportedUrl)) {
    return reportedUrl.replace(/\/+$/, "")
  }

  // Else match by host against MYCOBRAIN_OPERATOR_URLS
  if (device.host) {
    const match = OPERATOR_HOSTS.find((u) => new URL(u).hostname === device.host)
    if (match) return match
  }
  return null
}

/**
 * Same idea but synchronous — for callers that already have a `host` string
 * (e.g. from a parent request that already fetched the registry).
 */
export function agentUrlForHost(host: string): string | null {
  return OPERATOR_HOSTS.find((u) => new URL(u).hostname === host) || null
}
