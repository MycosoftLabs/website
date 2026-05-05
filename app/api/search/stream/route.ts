/**
 * GET /api/search/stream — SSE: route, widget-data (unified snapshot), ingest ack, done
 * May 03 2026
 */

import { NextRequest } from "next/server"
import { searchLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { computeBlendedIntent } from "@/lib/search/compute-blended-intent"
/** In-process call avoids HTTP self-fetch to `/api/search/unified` (dev can deadlock / starve → empty widgets + ChunkLoadError under parallel tests). */
import { POST as unifiedSearchPost } from "../unified/route"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
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
        if (unifiedRes.ok) {
          const unified = await unifiedRes.json()
          send("widget-data", { source: "unified", payload: unified })
        } else {
          send("widget-data", { source: "unified", error: `HTTP ${unifiedRes.status}` })
        }

        send("ingest", { status: "skipped", note: "MINDEX ingest wired per-connector in follow-up jobs" })
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
