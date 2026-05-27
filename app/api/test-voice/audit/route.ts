/**
 * Voice suite audit — fast by default; ?deep=1 adds brain chat (slow, off hot path).
 */
import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import {
  LAN_SLO_MS,
  runCriticalVoiceProbes,
  runOptionalVoiceProbes,
} from "@/lib/voice/voice-probes"
import { masServiceHeaders } from "@/lib/auth/verified-identity"
import { resolvePersonaplexBridgeBaseUrl } from "@/lib/config/resolve-voice-bridge"

export const dynamic = "force-dynamic"

function publicAssetExists(rel: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", rel))
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1"
  const started = Date.now()

  const [critical, optional] = await Promise.all([
    runCriticalVoiceProbes(),
    runOptionalVoiceProbes(),
  ])

  const checks: Array<{
    id: string
    name: string
    layer: string
    ok: boolean
    critical: boolean
    latencyMs: number
    sloOk: boolean
    sloTargetMs: number
    detail?: string
    data?: unknown
  }> = [
    ...critical.probes.map((p) => ({
      id: p.id,
      name: p.name,
      layer: p.critical ? "critical" : "optional",
      ok: p.ok,
      critical: p.critical,
      latencyMs: p.latencyMs,
      sloOk: p.sloOk,
      sloTargetMs: LAN_SLO_MS,
      detail: p.error,
      data: p.data,
    })),
    ...optional.map((p) => ({
      id: p.id,
      name: p.name,
      layer: "optional",
      ok: p.ok,
      critical: false,
      latencyMs: p.latencyMs,
      sloOk: p.sloOk,
      sloTargetMs: LAN_SLO_MS,
      detail: p.error,
    })),
  ]

  // Static assets (instant, local disk)
  const decoderOk = publicAssetExists("assets/decoderWorker.min.js")
  checks.push(
    {
      id: "decoder_worker",
      name: "Opus decoderWorker.min.js",
      layer: "L7",
      ok: decoderOk,
      critical: true,
      latencyMs: 0,
      sloOk: decoderOk,
      sloTargetMs: LAN_SLO_MS,
      detail: decoderOk ? undefined : "Missing /public/assets/decoderWorker.min.js",
    },
    {
      id: "encoder_worker",
      name: "Opus encoderWorker.min.js",
      layer: "L7",
      ok: publicAssetExists("assets/encoderWorker.min.js"),
      critical: false,
      latencyMs: 0,
      sloOk: true,
      sloTargetMs: LAN_SLO_MS,
    }
  )

  // Bridge session create — fast, no Moshi connect
  const bridgeBase = resolvePersonaplexBridgeBaseUrl().replace(/\/$/, "")
  let sessionOk = false
  let sessionLatency = 0
  let sessionDetail: string | undefined
  try {
    const t0 = Date.now()
    const sessRes = await fetch(`${bridgeBase}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: "myca", voice: "moshika", enable_mas_events: true }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    })
    sessionLatency = Date.now() - t0
    sessionOk = sessRes.ok
    if (!sessRes.ok) sessionDetail = `HTTP ${sessRes.status}`
  } catch (e) {
    sessionDetail = String(e)
  }
  checks.push({
    id: "bridge_session",
    name: "Bridge POST /session",
    layer: "L6",
    ok: sessionOk,
    critical: true,
    latencyMs: sessionLatency,
    sloOk: sessionOk && sessionLatency <= LAN_SLO_MS,
    sloTargetMs: LAN_SLO_MS,
    detail: sessionDetail,
  })

  // Deep probe only on demand — never blocks default audit
  if (deep) {
    const masBase = critical.config.masBase
    const t0 = Date.now()
    try {
      const res = await fetch(`${masBase}/voice/brain/chat`, {
        method: "POST",
        headers: { ...masServiceHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: "ping", session_id: "voice-audit-deep" }),
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      })
      const latencyMs = Date.now() - t0
      const data = res.ok ? await res.json().catch(() => ({})) : undefined
      checks.push({
        id: "brain_chat_deep",
        name: "Brain POST /voice/brain/chat (deep)",
        layer: "deep",
        ok: res.ok && Boolean((data as { response_text?: string })?.response_text),
        critical: false,
        latencyMs,
        sloOk: false,
        sloTargetMs: LAN_SLO_MS,
        data,
      })
    } catch (e) {
      checks.push({
        id: "brain_chat_deep",
        name: "Brain POST /voice/brain/chat (deep)",
        layer: "deep",
        ok: false,
        critical: false,
        latencyMs: Date.now() - t0,
        sloOk: false,
        sloTargetMs: LAN_SLO_MS,
        detail: String(e),
      })
    }
  }

  const criticalChecks = checks.filter((c) => c.critical)
  const voiceReady = criticalChecks.every((c) => c.ok)
  const sloPass = criticalChecks.every((c) => c.ok && c.sloOk)

  return NextResponse.json({
    voiceReady,
    sloPass,
    sloTargetMs: LAN_SLO_MS,
    summary: `${criticalChecks.filter((c) => c.ok).length}/${criticalChecks.length} critical • ${criticalChecks.filter((c) => c.sloOk).length} under ${LAN_SLO_MS}ms SLO`,
    totalMs: Date.now() - started,
    deep,
    config: critical.config,
    cuda: {
      required: "Profile-aware: RTX 4080 uses NO_CUDA_GRAPH=1 (~150-200ms/step); 24GB+ uses NO_CUDA_GRAPH=0 (~30ms/step)",
      warmupScript: "python START_VOICE_SYSTEM.py",
      note: "Health probes target <100ms LAN; Moshi model load / CUDA compile is separate one-time warmup",
    },
    voice: {
      recommended: "moshika",
      ttsPath: "PersonaPlex Moshi NATF2 — no ElevenLabs",
    },
    checks,
    timestamp: new Date().toISOString(),
  })
}
