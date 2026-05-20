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
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8999"
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
  if (process.env.NODE_ENV !== "production") {
    return "ws://localhost:8999"
  }
  return `ws://${process.env.NEXT_PUBLIC_GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE}:8999`
}

/**
 * Ollama on Voice Legion (11434). When local GPU mode is active, Ollama binds to
 * localhost only on this host — do not probe the LAN IP (241) or diagnostics false-fail.
 */
export function resolveVoiceOllamaTagsUrl(): string {
  const host = isUseLocalVoiceForBridge()
    ? process.env.OLLAMA_HOST || "localhost"
    : process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE
  return `http://${host}:11434/api/tags`
}

/**
 * Earth-2 API health URL. Default doc IP 249 may be offline; on the combined Legion
 * desktop, Earth-2 runs in WSL on localhost:8220 when USE_LOCAL_GPU is set.
 */
export function resolveEarth2HealthUrl(): string {
  if (process.env.EARTH2_API_URL?.trim()) {
    return `${process.env.EARTH2_API_URL.replace(/\/$/, "")}/health`
  }
  if (isUseLocalVoiceForBridge()) {
    return "http://localhost:8220/health"
  }
  const ip = process.env.GPU_EARTH2_IP || GPU_LEGION_DEFAULTS.EARTH2
  return `http://${ip}:8220/health`
}
