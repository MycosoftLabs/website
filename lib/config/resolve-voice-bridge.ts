/**
 * PersonaPlex Bridge + Moshi (Voice Legion) — shared HTTP URL resolution
 * (May 02, 2026) Canonical Voice stack: 192.168.0.241; local dev: localhost.
 */
import { GPU_LEGION_DEFAULTS } from "./api-urls"

export function isUseLocalVoiceForBridge(): boolean {
  if (
    process.env.NEXT_PUBLIC_USE_LOCAL_GPU === "true" ||
    process.env.NEXT_PUBLIC_USE_LOCAL_VOICE === "true"
  ) {
    return true
  }
  // Server-only (API routes, SSR): not inlined in client bundles
  if (typeof window === "undefined") {
    return process.env.USE_LOCAL_VOICE === "true" || process.env.USE_LOCAL_VOICE === "1"
  }
  return false
}

/** HTTP base for PersonaPlex Bridge (port 8999), no trailing slash. */
export function resolvePersonaplexBridgeBaseUrl(): string {
  if (isUseLocalVoiceForBridge()) {
    return "http://localhost:8999"
  }
  const fromEnv =
    process.env.PERSONAPLEX_BRIDGE_URL || process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }
  return `http://${process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE}:8999`
}

/** For TCP probe to Moshi (8998): same host as bridge on LAN, unless MOSHI_HOST override. */
export function resolveMoshiHostForProbe(): string {
  if (isUseLocalVoiceForBridge()) {
    return process.env.MOSHI_HOST || "localhost"
  }
  if (process.env.MOSHI_HOST) {
    return process.env.MOSHI_HOST
  }
  try {
    return new URL(resolvePersonaplexBridgeBaseUrl()).hostname
  } catch {
    return GPU_LEGION_DEFAULTS.VOICE
  }
}

/** Default WebSocket base for the bridge from env or Voice Legion. */
export function resolvePersonaplexBridgeWsBaseDefault(): string {
  if (isUseLocalVoiceForBridge()) {
    return "ws://localhost:8999"
  }
  if (process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL) {
    return process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL.replace(/\/$/, "")
  }
  if (process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL.replace(/^http/i, "ws").replace(/\/$/, "")
  }
  return `ws://${process.env.NEXT_PUBLIC_GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE}:8999`
}
