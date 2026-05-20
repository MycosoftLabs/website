/**
 * Voice stack port + process readiness (Moshi 8998, Bridge 8999, CUDA warmup hint).
 */
import { NextResponse } from "next/server"
import * as net from "net"
import {
  isUseLocalVoiceForBridge,
  resolveMoshiHostForProbe,
  resolvePersonaplexBridgeBaseUrl,
} from "@/lib/config/resolve-voice-bridge"

function tcpOpen(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const done = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once("connect", () => done(true))
    socket.once("error", () => done(false))
    socket.once("timeout", () => done(false))
    socket.connect(port, host)
  })
}

export async function GET() {
  const bridgeBase = resolvePersonaplexBridgeBaseUrl()
  const moshiHost = resolveMoshiHostForProbe()
  const localGpu = isUseLocalVoiceForBridge()

  const [moshiTcp, bridgeTcp] = await Promise.all([
    tcpOpen(moshiHost, 8998),
    tcpOpen(new URL(bridgeBase).hostname, 8999),
  ])

  let bridgeHealth: Record<string, unknown> | null = null
  let bridgeOk = false
  try {
    const res = await fetch(`${bridgeBase.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(1200),
      cache: "no-store",
    })
    bridgeOk = res.ok
    if (res.ok) bridgeHealth = (await res.json()) as Record<string, unknown>
  } catch {
    bridgeOk = false
  }

  const moshiAvailable = Boolean(
    (bridgeHealth?.moshi_available as boolean | undefined) ?? moshiTcp
  )

  const readyForVoice =
    bridgeTcp && bridgeOk && moshiAvailable && Boolean(bridgeHealth?.features)

  return NextResponse.json({
    localGpu,
    bridgeBaseUrl: bridgeBase,
    moshiHost,
    ports: {
      moshi8998: { open: moshiTcp, host: moshiHost },
      bridge8999: { open: bridgeTcp, host: new URL(bridgeBase).hostname },
    },
    bridgeHealth,
    moshiAvailable,
    readyForVoice,
    cuda: {
      handshakeTimeoutSec: 240,
      expectedCompileSec: "60-180",
      noCudaGraphEnv: "Set NO_CUDA_GRAPH=0 for PersonaPlex real-time (default in START_VOICE_SYSTEM.py)",
      warmupScript: "python START_VOICE_SYSTEM.py",
    },
    timestamp: new Date().toISOString(),
  })
}
