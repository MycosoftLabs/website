/**
 * Ultra-fast voice stack ping — all critical services in parallel, no LLM.
 * Target: total wall time < 200ms on warm LAN; per-service double-digit ms.
 */
import { NextResponse } from "next/server"
import {
  LAN_SLO_MS,
  runCriticalVoiceProbes,
  runOptionalVoiceProbes,
} from "@/lib/voice/voice-probes"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const includeOptional = new URL(req.url).searchParams.get("optional") === "1"
  const critical = await runCriticalVoiceProbes()
  const optional = includeOptional ? await runOptionalVoiceProbes() : []

  const slow = critical.probes.filter((p) => p.ok && p.latencyMs > LAN_SLO_MS)
  const offline = critical.probes.filter((p) => !p.ok)

  return NextResponse.json(
    {
      voiceReady: critical.voiceReady,
      voiceStackReady: critical.voiceStackReady,
      sloPass: critical.sloPass,
      sloTargetMs: LAN_SLO_MS,
      totalMs: critical.totalMs,
      slow: slow.map((p) => ({ id: p.id, latencyMs: p.latencyMs })),
      offline: offline.map((p) => ({ id: p.id, error: p.error })),
      probes: [...critical.probes, ...optional],
      config: critical.config,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Voice-Probe-Total-Ms": String(critical.totalMs),
      },
    }
  )
}
