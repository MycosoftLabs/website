/**
 * Test Voice Diagnostics (Feb 17, 2026)
 *
 * Server-side health checks so the `/test-voice` page doesn't do cross-origin
 * HTTP calls (CORS) to MAS / Bridge / Moshi from the browser.
 *
 * NOTE: WebSocket connectivity to the bridge is still client-side (by design).
 *
 * Moshi status is derived from the PersonaPlex Bridge health response (moshi_available).
 * On the split Legions, Moshi runs on the **Voice Legion** (192.168.0.241); the bridge
 * reports `moshi_available` when it can reach Moshi. No direct 190/legacy node assumption.
 */

import { NextResponse } from "next/server"
import * as net from "net"
import { MINDEX_ENDPOINTS, resolveEarth2ApiBaseUrl, GPU_LEGION_DEFAULTS } from "@/lib/config/api-urls"
import {
  resolveMoshiHostForProbe,
  resolvePersonaplexBridgeBaseUrl,
} from "@/lib/config/resolve-voice-bridge"
import { masServiceHeaders } from "@/lib/auth/verified-identity"

interface CheckResult {
  ok: boolean
  status?: number
  latencyMs?: number
  data?: unknown
  error?: string
  method?: string
}

/** Try a raw TCP connect. Returns true if port is open. */
function tcpPing(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => { socket.destroy(); resolve(ok) }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
    socket.once("timeout", () => done(false))
    socket.connect(port, host)
  })
}

async function checkUrl(
  url: string,
  tcpFallback = false,
  timeoutMs = 9000,
  extraHeaders: HeadersInit = {}
): Promise<CheckResult> {
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json, text/plain, */*",
        ...extraHeaders,
      },
      cache: "no-store",
    })

    const latencyMs = Date.now() - startedAt

    // Some services return non-JSON bodies (e.g. Moshi root page).
    let data: unknown = undefined
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      try {
        data = await res.json()
      } catch {
        // ignore
      }
    }

    // Treat 426 (Upgrade Required) as "online" for services that expect WS upgrades.
    const ok = res.ok || res.status === 426

    return { ok, status: res.status, latencyMs, data }
  } catch (e) {
    const latencyMs = Date.now() - startedAt
    // If HTTP fails (empty reply / connection closed) AND tcpFallback is requested,
    // try a raw TCP connect to confirm the port is open (Moshi WS-only mode).
    if (tcpFallback) {
      try {
        const parsed = new URL(url)
        const host = parsed.hostname
        const port = parseInt(parsed.port) || (parsed.protocol === "https:" ? 443 : 80)
        const open = await tcpPing(host, port)
        if (open) {
          return { ok: true, latencyMs, method: "tcp", status: undefined }
        }
      } catch {
        // ignore tcp check error
      }
    }
    return { ok: false, latencyMs, error: String(e) }
  }
}

export async function GET() {
  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://localhost:8001"

  const bridgeBaseUrl = resolvePersonaplexBridgeBaseUrl()
  const bridgeHealthUrl = `${bridgeBaseUrl}/health`
  // Fast liveness: avoids false OFFLINE when /api/myca/ping races or hits a slow router build.
  const masLiveUrl = `${masBaseUrl.replace(/\/$/, "")}/live`
  const masMemoryHealthUrl = `${masBaseUrl.replace(/\/$/, "")}/api/memory/health`
  const mycaBrainStatusUrl = `${masBaseUrl.replace(/\/$/, "")}/voice/brain/status`
  const voiceOllamaUrl = `http://${process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE}:11434/api/tags`
  const earth2HealthUrl = `${resolveEarth2ApiBaseUrl()}/health`

  const BRIDGE_TIMEOUT_MS = 5000
  // MAS memory/health can exceed 5s on cold VM; align with voice path (bridge uses same host).
  const MAS_HTTP_TIMEOUT_MS = 12000
  const masAuthHeaders = masServiceHeaders()
  const [bridge, myca, memory, mycaBrain, mindex, ollama, earth2] = await Promise.all([
    checkUrl(bridgeHealthUrl, true, BRIDGE_TIMEOUT_MS),
    checkUrl(masLiveUrl, false, MAS_HTTP_TIMEOUT_MS),
    checkUrl(masMemoryHealthUrl, false, MAS_HTTP_TIMEOUT_MS, masAuthHeaders),
    checkUrl(mycaBrainStatusUrl, false, MAS_HTTP_TIMEOUT_MS, masAuthHeaders),
    checkUrl(MINDEX_ENDPOINTS.HEALTH, false, MAS_HTTP_TIMEOUT_MS),
    checkUrl(voiceOllamaUrl, false, 6000),
    checkUrl(earth2HealthUrl, false, 6000),
  ])

  const bridgeData = bridge.data as { moshi_available?: boolean } | undefined
  // Moshi: prefer bridge JSON; fallback to direct TCP when Bridge says false (Bridge may have stale check)
  const bridgeOk = bridge.ok
  let moshiOk = bridge.ok && bridgeData?.moshi_available === true
  if (bridgeOk && !moshiOk) {
    // Bridge healthy but moshi_available false (or no data) — verify Moshi port directly
    const moshiHost = resolveMoshiHostForProbe()
    const moshiPort = parseInt(process.env.MOSHI_PORT || "8998", 10)
    const moshiPortOpen = await tcpPing(moshiHost, moshiPort, 2000)
    if (moshiPortOpen) moshiOk = true
  }

  return NextResponse.json(
    {
      services: [
        {
          key: "moshi",
          name: "Moshi Server (via Bridge)",
          target: bridgeHealthUrl,
          ok: moshiOk,
          status: bridge.status,
          latencyMs: bridge.latencyMs,
        },
        {
          key: "bridge",
          name: "PersonaPlex Bridge (8999)",
          target: bridgeHealthUrl,
          ok: bridge.ok,
          status: bridge.status,
          latencyMs: bridge.latencyMs,
          data: bridge.data,
        },
        {
          key: "mas_consciousness",
          name: "MAS Orchestrator (live)",
          target: masLiveUrl,
          ok: myca.ok,
          status: myca.status,
          latencyMs: myca.latencyMs,
        },
        {
          key: "memory_bridge",
          name: "Memory Bridge",
          target: masMemoryHealthUrl,
          ok: memory.ok,
          status: memory.status,
          latencyMs: memory.latencyMs,
        },
        {
          key: "myca_brain",
          name: "MYCA Brain (voice/status)",
          target: mycaBrainStatusUrl,
          ok: mycaBrain.ok,
          status: mycaBrain.status,
          latencyMs: mycaBrain.latencyMs,
        },
        {
          key: "mindex",
          name: "MINDEX API (health)",
          target: MINDEX_ENDPOINTS.HEALTH,
          ok: mindex.ok,
          status: mindex.status,
          latencyMs: mindex.latencyMs,
        },
        {
          key: "ollama_voice_legion",
          name: "Ollama (Voice Legion 11434)",
          target: voiceOllamaUrl,
          ok: ollama.ok,
          status: ollama.status,
          latencyMs: ollama.latencyMs,
        },
        {
          key: "earth2_legion",
          name: "Earth-2 API (Legion 8220)",
          target: earth2HealthUrl,
          ok: earth2.ok,
          status: earth2.status,
          latencyMs: earth2.latencyMs,
        },
      ],
      config: {
        masBaseUrl,
        bridgeBaseUrl,
        voiceOllamaHost: process.env.GPU_VOICE_IP || GPU_LEGION_DEFAULTS.VOICE,
        earth2BaseUrl: resolveEarth2ApiBaseUrl(),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

