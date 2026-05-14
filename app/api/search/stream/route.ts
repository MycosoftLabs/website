/**
 * GET /api/search/stream — SSE: route, widget-data (unified snapshot), ingest ack, done
 * May 03 2026
 */

import { NextRequest } from "next/server"
import { searchLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { computeBlendedIntent } from "@/lib/search/compute-blended-intent"
/** In-process call avoids HTTP self-fetch to `/api/search/unified` (dev can deadlock / starve → empty widgets + ChunkLoadError under parallel tests). */
import { POST as unifiedSearchPost } from "../unified/route"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function countResults(payload: unknown): Record<string, number> {
  const results = payload && typeof payload === "object" ? (payload as Record<string, unknown>).results : null
  if (!results || typeof results !== "object") return {}
  const counts: Record<string, number> = {}
  for (const [key, value] of Object.entries(results)) {
    if (Array.isArray(value)) counts[key] = value.length
  }
  return counts
}

async function recordSearchTelemetry(input: {
  query: string
  sessionId?: string
  plan: Awaited<ReturnType<typeof computeBlendedIntent>>
  unifiedPayload?: unknown
}) {
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from("search_intent_telemetry")
      .insert({
        session_id: input.sessionId ?? null,
        query_text: input.query,
        classification: input.plan.route.classification,
        intent_type: input.plan.route.intent.type,
        confidence: input.plan.confidence,
        primary_widget: input.plan.route.primaryWidget,
        secondary_widgets: input.plan.route.secondaryWidgets,
        result_counts: countResults(input.unifiedPayload),
        source: "search-stream",
      })
      .select("id")
      .single()

    await admin.from("search_earth_filter_decisions").insert({
      intent_telemetry_id: data?.id ?? null,
      query_text: input.query,
      enabled_filters: input.plan.route.earthContextFilters.enabledFilters,
      disabled_filters: input.plan.route.earthContextFilters.disabledFilters,
      layer_state: input.plan.route.earthContextFilters.layerState,
      search_terms: input.plan.route.earthContextFilters.searchTerms,
      agent_refinement: { sources: input.plan.sources, deterministic: true },
    })

    const widgets = [input.plan.route.primaryWidget, ...input.plan.route.secondaryWidgets]
      .filter(Boolean) as string[]
    if (widgets.length) {
      await admin.from("search_widget_usage").insert(
        widgets.slice(0, 3).map((widget, index) => ({
          session_id: input.sessionId ?? null,
          query_text: input.query,
          widget_id: widget,
          rank: index + 1,
          interaction: "shown",
          device_class: "unknown",
        }))
      )
    }

    await admin.from("search_agent_audit_records").insert({
      session_id: input.sessionId ?? null,
      agent_id: input.plan.sources.masSession ? "mas-session-intention" : "heuristic-router",
      query_text: input.query,
      action: "resolve_earth_context_filters",
      proposed_filters: input.plan.route.earthContextFilters.enabledFilters,
      resolved_filters: input.plan.route.earthContextFilters.enabledFilters,
      notes: "Client receives one resolved deterministic filter plan.",
    })
  } catch (error) {
    console.warn("[search-stream] telemetry write skipped", error)
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = searchLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return new Response("event: error\ndata: {\"message\":\"q required (min 2 chars)\"}\n\n", {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId") || undefined
  const partialWord = request.nextUrl.searchParams.get("partialWord") === "1"
  const origin = request.nextUrl.origin

  const sp = request.nextUrl.searchParams
  const typesStr =
    sp.get("types")?.trim() ||
    "species,compounds,genetics,research,events,aircraft,vessels,satellites,weather,emissions,infrastructure,devices,space_weather,cameras"
  const limit = Math.min(parseInt(sp.get("limit") || "20", 10) || 20, 100)
  const includeAI = sp.get("ai") === "1" || sp.get("ai") === "true"
  const latRaw = sp.get("lat")
  const lngRaw = sp.get("lng")
  const lat = latRaw != null && latRaw !== "" ? Number(latRaw) : undefined
  const lng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : undefined
  const fluidB64 = sp.get("fluidB64")?.trim() || null

  function decodeFluidContext(b64: string | null): Record<string, unknown> | undefined {
    if (!b64) return undefined
    try {
      const normalized = b64.replace(/-/g, "+").replace(/_/g, "/")
      const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
      const json = Buffer.from(normalized + pad, "base64").toString("utf8")
      const obj = JSON.parse(json) as Record<string, unknown>
      return typeof obj === "object" && obj ? obj : undefined
    } catch {
      return undefined
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, payload)))
      }

      try {
        const hourLocal = new Date().getHours()
        const plan = await computeBlendedIntent({
          query: q,
          partialWord,
          sessionId,
          requestOrigin: origin,
          userContext: {
            hourLocal,
            ...(typeof lat === "number" &&
            !Number.isNaN(lat) &&
            typeof lng === "number" &&
            !Number.isNaN(lng)
              ? { location: { lat, lng } }
              : {}),
          },
        })
        send("route", plan)

        const fluidContext = decodeFluidContext(fluidB64)
        const unifiedBody: Record<string, unknown> = {
          q,
          types: typesStr,
          limit,
          ai: includeAI,
          ...(typeof lat === "number" && !Number.isNaN(lat) && typeof lng === "number" && !Number.isNaN(lng)
            ? { lat, lng }
            : {}),
          ...(fluidContext ? { fluidContext } : {}),
        }

        const unifiedUrl = new URL("/api/search/unified", origin)
        const unifiedReq = new NextRequest(unifiedUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
          },
          body: JSON.stringify(unifiedBody),
        })
        const unifiedRes = await unifiedSearchPost(unifiedReq)
        let unifiedPayload: unknown | undefined
        if (unifiedRes.ok) {
          unifiedPayload = await unifiedRes.json()
          send("widget-data", { source: "unified", payload: unifiedPayload })
        } else {
          send("widget-data", { source: "unified", error: `HTTP ${unifiedRes.status}` })
        }

        void recordSearchTelemetry({
          query: q,
          sessionId,
          plan,
          unifiedPayload,
        })

        send("ingest", {
          status: "live-source-check-complete",
          note: "Live sources checked; any missing data will refresh automatically when available.",
        })
        send("done", { ok: true })
      } catch (e) {
        send("stream-error", { message: e instanceof Error ? e.message : "stream failed" })
        send("done", { ok: false })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
