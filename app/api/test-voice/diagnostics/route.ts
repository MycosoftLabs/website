/**
 * Test Voice Diagnostics — fast parallel LAN probes (double-digit ms SLO after warm-up).
 */
import { NextResponse } from "next/server"
import { MINDEX_ENDPOINTS } from "@/lib/config/api-urls"
import {
  LAN_SLO_MS,
  runCriticalVoiceProbes,
  runOptionalVoiceProbes,
} from "@/lib/voice/voice-probes"

export const dynamic = "force-dynamic"

export async function GET() {
  const [critical, optional] = await Promise.all([
    runCriticalVoiceProbes(),
    runOptionalVoiceProbes(),
  ])

  const byId = Object.fromEntries(critical.probes.map((p) => [p.id, p]))
  const ollama = optional.find((p) => p.id === "ollama")
  const earth2 = optional.find((p) => p.id === "earth2")

  const bridge = byId.bridge
  const moshi = byId.moshi
  const masLive = byId.mas_live
  const memory = byId.memory
  const brain = byId.brain_status
  const mindex = byId.mindex

  return NextResponse.json(
    {
      voiceReady: critical.voiceReady,
      voiceStackReady: critical.voiceStackReady,
      sloPass: critical.sloPass,
      sloTargetMs: LAN_SLO_MS,
      totalMs: critical.totalMs,
      services: [
        {
          key: "moshi",
          name: "Moshi Server (via Bridge)",
          target: `${critical.config.bridgeBase}/health`,
          ok: moshi?.ok,
          status: bridge?.status,
          latencyMs: moshi?.latencyMs,
          sloOk: moshi?.sloOk,
        },
        {
          key: "bridge",
          name: "PersonaPlex Bridge (8999)",
          target: `${critical.config.bridgeBase}/health`,
          ok: bridge?.ok,
          status: bridge?.status,
          latencyMs: bridge?.latencyMs,
          sloOk: bridge?.sloOk,
          data: bridge?.data,
        },
        {
          key: "mas_consciousness",
          name: "MAS Orchestrator (live)",
          target: `${critical.config.masBase}/live`,
          ok: masLive?.ok,
          status: masLive?.status,
          latencyMs: masLive?.latencyMs,
          sloOk: masLive?.sloOk,
        },
        {
          key: "memory_bridge",
          name: "Memory Bridge",
          target: `${critical.config.masBase}/api/memory/health`,
          ok: memory?.ok,
          status: memory?.status,
          latencyMs: memory?.latencyMs,
          sloOk: memory?.sloOk,
        },
        {
          key: "myca_brain",
          name: "MYCA Brain (voice/status)",
          target: `${critical.config.masBase}/voice/brain/status`,
          ok: brain?.ok,
          status: brain?.status,
          latencyMs: brain?.latencyMs,
          sloOk: brain?.sloOk,
        },
        {
          key: "mindex",
          name: "MINDEX API (health)",
          target: MINDEX_ENDPOINTS.HEALTH,
          ok: mindex?.ok,
          status: mindex?.status,
          latencyMs: mindex?.latencyMs,
          sloOk: mindex?.sloOk,
        },
        {
          key: "ollama_voice_legion",
          name: "Ollama (Voice Legion 11434)",
          target: "ollama",
          ok: ollama?.ok,
          status: ollama?.status,
          latencyMs: ollama?.latencyMs,
          sloOk: ollama?.sloOk,
        },
        {
          key: "earth2_legion",
          name: "Earth-2 API (Legion 8220)",
          target: "earth2",
          ok: earth2?.ok,
          status: earth2?.status,
          latencyMs: earth2?.latencyMs,
          sloOk: earth2?.sloOk,
        },
      ],
      config: critical.config,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
