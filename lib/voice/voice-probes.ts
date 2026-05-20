/**
 * Fast LAN voice stack probes — target double-digit ms after TCP warm-up.
 * Critical path only; no LLM / brain chat on the hot path.
 */
import * as net from "net"
import { MINDEX_ENDPOINTS, GPU_LEGION_DEFAULTS } from "@/lib/config/api-urls"
import {
  isUseLocalVoiceForBridge,
  normalizeProbeHost,
  resolveEarth2HealthUrl,
  resolveLocalLoopbackHost,
  resolveMoshiHostForProbe,
  resolvePersonaplexBridgeBaseUrl,
  resolveVoiceOllamaTagsUrl,
} from "@/lib/config/resolve-voice-bridge"
import { masServiceHeaders } from "@/lib/auth/verified-identity"

/** LAN SLO: health probes should be under 100ms once connections are warm. */
export const LAN_SLO_MS = 100
export const LAN_WARN_MS = 50

export type ProbeResult = {
  id: string
  name: string
  ok: boolean
  latencyMs: number
  sloOk: boolean
  critical: boolean
  status?: number
  error?: string
  data?: unknown
}

function masBaseUrl(): string {
  return (
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"
  ).replace(/\/$/, "")
}

export function tcpPing(host: string, port: number, timeoutMs = 800): Promise<{ ok: boolean; latencyMs: number }> {
  const probeHost = normalizeProbeHost(host)
  const started = Date.now()
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => {
      socket.destroy()
      resolve({ ok, latencyMs: Date.now() - started })
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
    socket.once("timeout", () => done(false))
    socket.connect(port, probeHost)
  })
}

export async function httpProbe(
  id: string,
  name: string,
  url: string,
  opts: {
    critical?: boolean
    timeoutMs?: number
    headers?: HeadersInit
    method?: string
    body?: string
    tcpFallback?: boolean
  } = {}
): Promise<ProbeResult> {
  const critical = opts.critical ?? true
  const timeoutMs = opts.timeoutMs ?? 1500
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        ...(opts.headers || {}),
      },
      body: opts.body,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    })
    const latencyMs = Date.now() - started
    let data: unknown
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      try {
        data = await res.json()
      } catch {
        data = undefined
      }
    }
    const ok = res.ok || res.status === 426
    const rateLimited = res.status === 429
    return {
      id,
      name,
      ok: ok || rateLimited,
      latencyMs,
      sloOk: ok && latencyMs <= LAN_SLO_MS,
      critical,
      status: res.status,
      data: rateLimited ? { rateLimited: true, ...(typeof data === "object" && data ? data : {}) } : data,
      error: rateLimited ? "MAS rate limited — reduce probe frequency or restart orchestrator" : undefined,
    }
  } catch (e) {
    const latencyMs = Date.now() - started
    if (opts.tcpFallback) {
      try {
        const parsed = new URL(url)
        const port = parseInt(parsed.port, 10) || (parsed.protocol === "https:" ? 443 : 80)
        const tcp = await tcpPing(parsed.hostname, port, Math.min(timeoutMs, 800))
        if (tcp.ok) {
          return {
            id,
            name,
            ok: true,
            latencyMs: Math.max(latencyMs, tcp.latencyMs),
            sloOk: tcp.latencyMs <= LAN_SLO_MS,
            critical,
          }
        }
      } catch {
        // ignore
      }
    }
    return {
      id,
      name,
      ok: false,
      latencyMs,
      sloOk: false,
      critical,
      error: String(e),
    }
  }
}

/** All critical voice probes in one parallel batch — no LLM calls. */
export async function runCriticalVoiceProbes(): Promise<{
  probes: ProbeResult[]
  voiceReady: boolean
  sloPass: boolean
  totalMs: number
  config: Record<string, string>
}> {
  const started = Date.now()
  const masBase = masBaseUrl()
  const bridgeBase = resolvePersonaplexBridgeBaseUrl().replace(/\/$/, "")
  const moshiHost = resolveMoshiHostForProbe()
  const bridgeHost = normalizeProbeHost(new URL(bridgeBase).hostname)
  const masAuth = masServiceHeaders()

  const [bridge, masLive, mindex, moshiTcp, bridgeTcp] = await Promise.all([
    httpProbe("bridge", "PersonaPlex Bridge", `${bridgeBase}/health`, {
      critical: true,
      timeoutMs: 1200,
      tcpFallback: true,
    }),
    httpProbe("mas_live", "MAS /live", `${masBase}/live`, { critical: true, timeoutMs: 2000 }),
    httpProbe("mindex", "MINDEX", MINDEX_ENDPOINTS.HEALTH, { critical: true, timeoutMs: 2000 }),
    tcpPing(moshiHost, 8998, 800).then((r) => ({
      id: "moshi_tcp",
      name: "Moshi TCP :8998",
      ok: r.ok,
      latencyMs: r.latencyMs,
      sloOk: r.ok && r.latencyMs <= LAN_SLO_MS,
      critical: true,
    })),
    tcpPing(bridgeHost, 8999, 800).then((r) => ({
      id: "bridge_tcp",
      name: "Bridge TCP :8999",
      ok: r.ok,
      latencyMs: r.latencyMs,
      sloOk: r.ok && r.latencyMs <= LAN_SLO_MS,
      critical: true,
    })),
  ])

  // MAS auth endpoints sequential — avoids rate-limit burst on VM until exempt paths deploy
  const masMemory = await httpProbe("memory", "Memory Bridge", `${masBase}/api/memory/health`, {
    critical: true,
    timeoutMs: 2000,
    headers: masAuth,
  })
  const masBrain = await httpProbe("brain_status", "MYCA Brain status", `${masBase}/voice/brain/status`, {
    critical: true,
    timeoutMs: 2000,
    headers: masAuth,
  })

  const bridgeData = bridge.data as { moshi_available?: boolean } | undefined
  const moshiOk =
    (bridge.ok && bridgeData?.moshi_available === true) || moshiTcp.ok

  const moshiProbe: ProbeResult = {
    id: "moshi",
    name: "Moshi (via Bridge)",
    ok: moshiOk,
    latencyMs: bridge.latencyMs,
    sloOk: moshiOk && bridge.latencyMs <= LAN_SLO_MS,
    critical: true,
    data: { moshi_available: bridgeData?.moshi_available, tcp: moshiTcp.ok },
  }

  const probes = [moshiProbe, bridge, masLive, masMemory, masBrain, mindex, moshiTcp, bridgeTcp]
  const critical = probes.filter((p) => p.critical)
  const voiceReady = critical.every((p) => p.ok)
  const sloPass = critical.every((p) => p.ok && p.sloOk)

  return {
    probes,
    voiceReady,
    sloPass,
    totalMs: Date.now() - started,
    config: {
      masBase,
      bridgeBase,
      moshiHost,
      voiceLegion: process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE,
      localGpu: String(isUseLocalVoiceForBridge()),
    },
  }
}

/** Optional / non-blocking probes — short timeout so they never stall the page. */
export async function runOptionalVoiceProbes(): Promise<ProbeResult[]> {
  return Promise.all([
    httpProbe("ollama", "Ollama", resolveVoiceOllamaTagsUrl(), {
      critical: false,
      timeoutMs: 1200,
    }),
    httpProbe("earth2", "Earth-2", resolveEarth2HealthUrl(), {
      critical: false,
      timeoutMs: 1200,
    }),
  ])
}
