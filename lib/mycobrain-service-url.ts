/**
 * MycoBrain service URL resolution.
 *
 * History: this module used to return a single URL (the legacy MAS service at
 * :8003 by default), which made it impossible to address individual unified
 * agents on :8787. PR #12 (May 2026) refactors it to also resolve per-device
 * via lib/devices/agent-resolver.ts.
 *
 * Three layers:
 *   - resolveMycoBrainServiceUrl()         — legacy: returns the global :8003 URL
 *                                            (callers that don\'t know about
 *                                            individual devices still get
 *                                            the correct global service)
 *   - resolveMycoBrainServiceUrlFor(id)    — per-device: tries the unified
 *                                            agent first (:8787), falls back
 *                                            to the global :8003
 *   - resolveMycoBrainGlobalAndAgent(id)   — returns both URLs so callers
 *                                            that talk to both layers don\'t
 *                                            need two lookups
 */

import { resolveAgentUrl } from "./devices/agent-resolver"

const MYCOBRAIN_VM_LAN = "http://192.168.0.196:8003"

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1"
  } catch {
    return false
  }
}

/**
 * Returns the legacy :8003 MAS-fronted MycoBrain service URL.
 * Behavior unchanged from the pre-May 2026 implementation, so every existing
 * caller keeps working. New code that needs per-device addressing should call
 * resolveMycoBrainServiceUrlFor(deviceId) instead.
 */
export function resolveMycoBrainServiceUrl(): string {
  const configured =
    process.env.MYCOBRAIN_SERVICE_URL?.trim() ||
    process.env.MYCOBRAIN_API_URL?.trim() ||
    MYCOBRAIN_VM_LAN

  if (configured.startsWith("/") || (isLoopbackUrl(configured) && process.env.ALLOW_LOOPBACK_MYCOBRAIN !== "1")) {
    return MYCOBRAIN_VM_LAN
  }
  return configured.replace(/\/+$/, "")
}

/**
 * Per-device resolution. Tries the unified agent on :8787 first (via the
 * MAS registry + operator-http path in agent-resolver). Falls back to the
 * legacy :8003 URL.
 *
 * Use this in route handlers that target a specific deviceId.
 */
export async function resolveMycoBrainServiceUrlFor(deviceId: string): Promise<string> {
  const agent = await resolveAgentUrl(deviceId)
  if (agent) return agent
  return resolveMycoBrainServiceUrl()
}

/**
 * Returns both the per-device agent URL (if any) and the legacy global URL,
 * so callers that talk to both layers (e.g. dual-write health checks) don\'t
 * need two awaits.
 */
export async function resolveMycoBrainGlobalAndAgent(
  deviceId: string
): Promise<{ agent: string | null; global: string }> {
  return {
    agent: await resolveAgentUrl(deviceId),
    global: resolveMycoBrainServiceUrl(),
  }
}
