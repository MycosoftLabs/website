import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ViewportAiContext {
  revision?: string
  reason?: string
  zoom?: number
  center?: { lat: number; lng: number }
  bounds?: { north: number; south: number; east: number; west: number }
  place?: string
  selected?: { kind?: string; label?: string; detail?: string } | null
  counts?: {
    events?: number
    species?: number
    aircraft?: number
    vessels?: number
    satellites?: number
    cameras?: number
    sensors?: number
  }
  topEvents?: Array<{ title: string; type?: string; severity?: string }>
  topSpecies?: string[]
  weather?: Record<string, string | number | null>
  infrastructure?: string[]
}

function buildPrompt(ctx: ViewportAiContext): string {
  const lines = [
    "You are MYCA analyzing the CREP map viewport. Write a concise situational summary (4-8 sentences) of what is visible in this viewport.",
    "Cover: geographic area, weather/environment, biodiversity/species, live events, aircraft, vessels, satellites, infrastructure, and any notable cameras if present.",
    "Use present tense. No bullet lists. No markdown. Be factual — only describe what the data supports.",
    "Do not mention hardware, GPUs, model/provider names, IP addresses, memory backends, internal frameworks, secrets, deployment details, or configuration.",
    "",
    `Viewport revision: ${ctx.revision || "unknown"}`,
    `Zoom: ${ctx.zoom ?? "?"}`,
    `Center: ${ctx.center ? `${ctx.center.lat.toFixed(3)}, ${ctx.center.lng.toFixed(3)}` : "unknown"}`,
    ctx.place ? `Place hint: ${ctx.place}` : "",
    ctx.reason ? `Trigger: ${ctx.reason}` : "",
    ctx.selected?.label ? `Selected: ${ctx.selected.label} (${ctx.selected.kind || "selection"}${ctx.selected.detail ? `, ${ctx.selected.detail}` : ""})` : "",
    "",
    "Counts:",
    `- Events: ${ctx.counts?.events ?? 0}`,
    `- Species observations: ${ctx.counts?.species ?? 0}`,
    `- Aircraft: ${ctx.counts?.aircraft ?? 0}`,
    `- Vessels: ${ctx.counts?.vessels ?? 0}`,
    `- Satellites: ${ctx.counts?.satellites ?? 0}`,
    `- Cameras: ${ctx.counts?.cameras ?? 0}`,
    `- Sensors: ${ctx.counts?.sensors ?? 0}`,
  ]

  if (ctx.topEvents?.length) {
    lines.push("", "Top events:")
    ctx.topEvents.slice(0, 6).forEach((e) => {
      lines.push(`- ${e.title} (${e.type || "event"}, ${e.severity || "medium"})`)
    })
  }

  if (ctx.topSpecies?.length) {
    lines.push("", "Species in view:", ctx.topSpecies.slice(0, 8).join(", "))
  }

  if (ctx.weather && Object.keys(ctx.weather).length) {
    lines.push("", "Weather snapshot:")
    Object.entries(ctx.weather).forEach(([k, v]) => {
      if (v != null && v !== "") lines.push(`- ${k}: ${v}`)
    })
  }

  if (ctx.infrastructure?.length) {
    lines.push("", "Infrastructure notes:", ctx.infrastructure.slice(0, 6).join("; "))
  }

  return lines.filter(Boolean).join("\n")
}

function isUnsafeSummary(summary: string): boolean {
  const lower = summary.toLowerCase()
  return [
    "rtx",
    "gpu",
    "personaplex",
    "nemotron",
    "nvidia",
    "ollama",
    "groq",
    "grok",
    "gemini",
    "claude",
    "openai",
    "redis",
    "postgresql",
    "qdrant",
    "docker",
    "proxmox",
    "api key",
    "192.168.",
    "localhost:",
    "provider",
    "fallback",
    "having a moment of difficulty",
    "could you try again",
    "try again in a moment",
    "unable to process",
    "encountered an issue",
  ].some((phrase) => lower.includes(phrase))
}

function countLabel(value: number | undefined, singular: string, plural = `${singular}s`) {
  const count = Number(value || 0)
  return `${count} ${count === 1 ? singular : plural}`
}

function buildDeterministicSummary(ctx: ViewportAiContext): string {
  const counts = ctx.counts || {}
  const centerText = ctx.center
    ? `centered near ${ctx.center.lat.toFixed(3)}, ${ctx.center.lng.toFixed(3)}`
    : "with its center still resolving"
  const zoomText = Number.isFinite(Number(ctx.zoom)) ? ` at zoom ${Number(ctx.zoom).toFixed(1)}` : ""
  const pieces: string[] = [
    `MYCA is reading the current CREP viewport ${centerText}${zoomText}.`,
    `The view currently contains ${countLabel(counts.events, "event")}, ${countLabel(counts.species, "biodiversity record")}, ${countLabel(counts.aircraft, "aircraft", "aircraft")}, ${countLabel(counts.vessels, "vessel")}, ${countLabel(counts.satellites, "satellite")}, ${countLabel(counts.cameras, "camera")}, and ${countLabel(counts.sensors, "sensor")}.`,
  ]

  if (ctx.topEvents?.length) {
    pieces.push(`The most prominent live events are ${ctx.topEvents.slice(0, 4).map((e) => e.title).join("; ")}.`)
  } else {
    pieces.push("No live event marker is dominant in this viewport right now.")
  }

  if (ctx.selected?.label) {
    pieces.push(`The active selection is ${ctx.selected.label}${ctx.selected.detail ? `, ${ctx.selected.detail}` : ""}.`)
  }

  if (ctx.topSpecies?.length) {
    pieces.push(`The visible biodiversity signal is led by ${ctx.topSpecies.slice(0, 5).join(", ")}.`)
  } else {
    pieces.push("No dominant species signal has resolved in the current viewport yet.")
  }

  const weatherParts = Object.entries(ctx.weather || {})
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${key.replace(/_/g, " ")} ${value}`)
    .slice(0, 5)
  if (weatherParts.length) pieces.push(`The environment snapshot shows ${weatherParts.join(", ")}.`)

  if (ctx.infrastructure?.length) {
    pieces.push(`Infrastructure context includes ${ctx.infrastructure.slice(0, 5).join(", ")}.`)
  }

  pieces.push("Use the fly-to chips below to inspect the viewport center, live events, species, cameras, traffic, or satellites that MYCA can already see.")
  return pieces.join(" ")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const context = (body?.context || body) as ViewportAiContext
    const revision = String(body?.revision || context.revision || "")

    if (!revision) {
      return NextResponse.json({ error: "revision is required" }, { status: 400 })
    }

    const scope = await assertScopedMasUserId(null)
    if ("denied" in scope) return scope.denied

    const prompt = buildPrompt(context)
    const MAS_BASE = masHttpBaseUrl()

    const res = await fetch(`${MAS_BASE}/api/myca/chat`, {
      method: "POST",
      headers: masJsonHeaders(),
      body: JSON.stringify({
        message: prompt,
        user_id: scope.scopedUserId,
        session_id: `crep-viewport-${revision}`,
        metadata: {
          source: "crep_viewport_ai_sees",
          revision,
          prefer_fast: true,
        },
      }),
      signal: AbortSignal.timeout(3_500),
    })

    if (!res.ok) {
      return NextResponse.json({
        summary: buildDeterministicSummary(context),
        revision,
        generatedAt: new Date().toISOString(),
      })
    }

    const data = await res.json()
    const summary = data.message || data.response || data.content || ""
    const summaryText = typeof summary === "string" ? summary.trim() : String(summary).trim()

    if (!summaryText || isUnsafeSummary(summaryText)) {
      return NextResponse.json({
        summary: buildDeterministicSummary(context),
        revision,
        generatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      summary: summaryText,
      revision,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      summary: buildDeterministicSummary({}),
      generatedAt: new Date().toISOString(),
    })
  }
}
