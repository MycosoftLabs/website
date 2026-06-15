/**
 * PersonaPlex Bridge + Moshi — shared HTTP URL resolution
 * (June 15, 2026) Provider switch: aws | legion | nvidia-dev
 */
import { GPU_LEGION_DEFAULTS } from "./api-urls"

export type GpuVoiceProvider = "aws" | "legion" | "nvidia-dev"

export function resolveGpuVoiceProvider(): GpuVoiceProvider {
  const raw = (
    process.env.GPU_VOICE_PROVIDER ||
    process.env.NEXT_PUBLIC_GPU_VOICE_PROVIDER ||
    "legion"
  ).toLowerCase()
  if (raw === "aws" || raw === "nvidia-dev" || raw === "legion") return raw
  return "legion"
}

function resolveRemoteGpuVoiceHost(): string {
  return process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE
}

function resolveAwsVoiceBridgeBase(): string {
  const url = process.env.AWS_VOICE_BRIDGE_URL || process.env.AWS_PERSONAPLEX_BRIDGE_URL
  if (url) return url.replace(/\/$/, "")
  return "https://voice-gpu.mycosoft.internal:8999"
}

function resolveNvidiaDevBridgeBase(): string {
  const url = process.env.NVIDIA_DEV_BRIDGE_URL || process.env.NVIDIA_DEV_PERSONAPLEX_BRIDGE_URL
  if (url) return url.replace(/\/$/, "")
  return `http://${process.env.NVIDIA_DEV_HOST || "nvidia-dev"}:8999`
}

/** Prefer IPv4 loopback on Windows — Moshi/Bridge bind 127.0.0.1; ::1 probes false-fail. */
export function resolveLocalLoopbackHost(): string {
  return "127.0.0.1"
}

export function normalizeProbeHost(host: string): string {
  const h = (host || "").trim().toLowerCase()
  if (h === "localhost" || h === "::1") return resolveLocalLoopbackHost()
  return host
}

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
    return `http://${resolveLocalLoopbackHost()}:8999`
  }
  const provider = resolveGpuVoiceProvider()
  if (provider === "aws") return resolveAwsVoiceBridgeBase()
  if (provider === "nvidia-dev") return resolveNvidiaDevBridgeBase()

  const fromEnv =
    process.env.PERSONAPLEX_BRIDGE_URL || process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }
  return `http://${resolveRemoteGpuVoiceHost()}:8999`
}

/** For TCP probe to Moshi (8998): same host as bridge on LAN, unless MOSHI_HOST override. */
export function resolveMoshiHostForProbe(): string {
  if (isUseLocalVoiceForBridge()) {
    return normalizeProbeHost(process.env.MOSHI_HOST || resolveLocalLoopbackHost())
  }
  if (process.env.MOSHI_HOST) {
    return normalizeProbeHost(process.env.MOSHI_HOST)
  }
  try {
    return normalizeProbeHost(new URL(resolvePersonaplexBridgeBaseUrl()).hostname)
  } catch {
    return GPU_LEGION_DEFAULTS.VOICE
  }
}

/** Default WebSocket base for the bridge from env or provider. */
export function resolvePersonaplexBridgeWsBaseDefault(): string {
  if (isUseLocalVoiceForBridge()) {
    return `ws://${resolveLocalLoopbackHost()}:8999`
  }
  const provider = resolveGpuVoiceProvider()
  if (provider === "aws") {
    const ws = process.env.AWS_VOICE_BRIDGE_WS_URL || process.env.AWS_PERSONAPLEX_BRIDGE_WS_URL
    if (ws) return ws.replace(/\/$/, "")
    return resolveAwsVoiceBridgeBase().replace(/^http/i, "ws")
  }
  if (provider === "nvidia-dev") {
    const ws = process.env.NVIDIA_DEV_BRIDGE_WS_URL
    if (ws) return ws.replace(/\/$/, "")
    return resolveNvidiaDevBridgeBase().replace(/^http/i, "ws")
  }
  if (process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL) {
    return process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL.replace(/\/$/, "")
  }
  if (process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL.replace(/^http/i, "ws").replace(/\/$/, "")
  }
  return `ws://${process.env.NEXT_PUBLIC_GPU_VOICE_IP || resolveRemoteGpuVoiceHost()}:8999`
}

/**
 * Ollama on Voice Legion (11434). When local GPU mode is active, Ollama binds to
 * localhost only on this host — do not probe the LAN IP (241) or diagnostics false-fail.
 */
export function resolveVoiceOllamaTagsUrl(): string {
  const host = isUseLocalVoiceForBridge()
    ? normalizeProbeHost(process.env.OLLAMA_HOST || resolveLocalLoopbackHost())
    : resolveRemoteGpuVoiceHost()
  return `http://${host}:11434/api/tags`
}

/**
 * Earth-2 API health URL. Default host 249; services stay off until MYCOSOFT_EARTH2_ENABLED on GPU host.
 */
export function resolveEarth2HealthUrl(): string {
  const provider = resolveGpuVoiceProvider()
  if (provider === "aws" && process.env.AWS_EARTH2_API_URL?.trim()) {
    return `${process.env.AWS_EARTH2_API_URL.replace(/\/$/, "")}/health`
  }
  if (process.env.EARTH2_API_URL?.trim()) {
    return `${process.env.EARTH2_API_URL.replace(/\/$/, "")}/health`
  }
  if (isUseLocalVoiceForBridge()) {
    return `http://${resolveLocalLoopbackHost()}:8220/health`
  }
  const ip = process.env.GPU_EARTH2_IP || GPU_LEGION_DEFAULTS.EARTH2
  return `http://${ip}:8220/health`
}
