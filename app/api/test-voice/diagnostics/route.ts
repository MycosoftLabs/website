/**
 * Test Voice Diagnostics (Feb 17, 2026)
 *
 * Server-side health checks so the `/test-voice` page doesn't do cross-origin
 * HTTP calls (CORS) to MAS / Bridge / Moshi from the browser.
 *
 * NOTE: WebSocket connectivity to the bridge is still client-side (by design).
 *
 * Moshi status is derived from the PersonaPlex Bridge health response (moshi_available).
 * When using the GPU node architecture, Moshi runs on the node (e.g. 192.168.0.190:19198
 * internal); the bridge reports whether it can reach Moshi. No direct localhost:8998 check.
 */

import { NextResponse } from "next/server"
import * as net from "net"

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
  timeoutMs = 9000
): Promise<CheckResult> {
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "Accept": "application/json, text/plain, */*" },
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
    "http://192.168.0.188:8001"

  const bridgeBaseUrl =
    process.env.PERSONAPLEX_BRIDGE_URL ||
    process.env.NEXT_PUBLIC_PERSONAPLEX_BRIDGE_URL ||
    "http://localhost:8999"

  const bridgeHealthUrl = `${bridgeBaseUrl.replace(/\/$/, "")}/health`
  const masMycaPingUrl = `${masBaseUrl.replace(/\/$/, "")}/api/myca/ping`
  const masMemoryHealthUrl = `${masBaseUrl.replace(/\/$/, "")}/api/memory/health`

  // Use lightweight /api/myca/ping for Consciousness (no heavy get_consciousness()). 
  // Short timeouts (5s) for fast diagnostics; services should respond in <500ms on same LAN.
  const HEALTH_TIMEOUT_MS = 5000
  const [bridge, myca, memory] = await Promise.all([
    checkUrl(bridgeHealthUrl, false, HEALTH_TIMEOUT_MS),
    checkUrl(masMycaPingUrl, false, HEALTH_TIMEOUT_MS),
    checkUrl(masMemoryHealthUrl, false, HEALTH_TIMEOUT_MS),
  ])

  const bridgeData = bridge.data as { moshi_available?: boolean } | undefined
  const moshiOk = bridge.ok && bridgeData?.moshi_available === true

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
          name: "MAS Consciousness",
          target: masMycaPingUrl,
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
      ],
      config: {
        masBaseUrl,
        bridgeBaseUrl,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

