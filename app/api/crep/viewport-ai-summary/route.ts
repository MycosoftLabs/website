import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ViewportAiContext {
  revision?: string
  zoom?: number
  center?: { lat: number; lng: number }
  bounds?: { north: number; south: number; east: number; west: number }
  place?: string
  counts?: {
    events?: number
    species?: number
    aircraft?: number
    vessels?: number
    satellites?: number
    cameras?: number
  }
  topEvents?: Array<{ title: string; type?: string; severity?: string }>
  topSpecies?: string[]
  weather?: Record<string, string | number | null>
  infrastructure?: string[]
}

function buildPrompt(ctx: ViewportAiContext): string {
  const lines = [
    "You are MYCA analyzing the CREP map viewport. Write a concise situational summary (4–8 sentences) of what is visible in this viewport.",
    "Cover: geographic area, weather/environment, biodiversity/species, live events, aircraft, vessels, satellites, infrastructure, and any notable cameras if present.",
    "Use present tense. No bullet lists. No markdown. Be factual — only describe what the data supports.",
    "",
    `Viewport revision: ${ctx.revision || "unknown"}`,
    `Zoom: ${ctx.zoom ?? "?"}`,
    `Center: ${ctx.center ? `${ctx.center.lat.toFixed(3)}, ${ctx.center.lng.toFixed(3)}` : "unknown"}`,
    ctx.place ? `Place hint: ${ctx.place}` : "",
    "",
    "Counts:",
    `- Events: ${ctx.counts?.events ?? 0}`,
    `- Species observations: ${ctx.counts?.species ?? 0}`,
    `- Aircraft: ${ctx.counts?.aircraft ?? 0}`,
    `- Vessels: ${ctx.counts?.vessels ?? 0}`,
    `- Satellites: ${ctx.counts?.satellites ?? 0}`,
    `- Cameras: ${ctx.counts?.cameras ?? 0}`,
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
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json(
        {
          summary: "",
          revision,
          generatedAt: new Date().toISOString(),
          error: `MAS chat failed (${res.status}): ${errText || "no body"}`,
        },
        { status: 502 },
      )
    }

    const data = await res.json()
    const summary = data.message || data.response || data.content || ""

    return NextResponse.json({
      summary: typeof summary === "string" ? summary.trim() : String(summary),
      revision,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        summary: "",
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
