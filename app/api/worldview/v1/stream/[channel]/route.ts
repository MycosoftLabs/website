import { NextRequest } from "next/server"
import { getAgentProfile } from "@/lib/agent-auth"
import { err, newRequestId } from "@/lib/worldview/envelope"
import { meterAndLimit } from "@/lib/worldview/metering"

/**
 * Worldview v1 — Server-Sent Events streams — Apr 23, 2026
 *
 * GET /api/worldview/v1/stream/{channel}
 *
 * Channels (first batch):
 *   live.aircraft              poll /api/oei/flightradar24 every 5s
 *   live.vessels               poll /api/oei/aisstream every 10s
 *   live.satellites            poll /api/oei/satellites every 15s
 *   myca.verified-entities     pipe /api/myca/entity-feed
 *   sensors.h2s.tjrv           poll /api/crep/sdapcd/h2s every 60s
 *   alerts.nws                 poll /api/oei/nws-alerts every 60s
 *
 * Billing: 5 cents / minute of open stream (debited at start,
 * refunded if the client disconnects under 30s — P3 refinement).
 * Rate: each stream consumes 10 rate-weight per minute.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ChannelDef {
  id: string
  scope: "public" | "agent" | "fusarium" | "ops"
  cost_per_minute: number
  rate_weight_per_minute: number
  poll_ms: number
  upstream: (origin: string, params: URLSearchParams) => string | null
  /** For channels that have their own SSE upstream (like /api/myca/entity-feed),
   *  we pipe it directly. Setting `pipe_sse: true` bypasses the poll loop. */
  pipe_sse?: boolean
}

const CHANNELS: Record<string, ChannelDef> = {
  "live.aircraft": {
    id: "live.aircraft",
    scope: "agent",
    cost_per_minute: 5,
    rate_weight_per_minute: 10,
    poll_ms: 5_000,
    upstream: (o, p) => {
      const bbox = p.get("bbox")
      return `${o}/api/oei/flightradar24${bbox ? `?bbox=${bbox}` : ""}`
    },
  },
  "live.vessels": {
    id: "live.vessels",
    scope: "agent",
    cost_per_minute: 5,
    rate_weight_per_minute: 10,
    poll_ms: 10_000,
    upstream: (o, p) => {
      const bbox = p.get("bbox")
      return `${o}/api/oei/aisstream${bbox ? `?bbox=${bbox}` : ""}`
    },
  },
  "live.satellites": {
    id: "live.satellites",
    scope: "agent",
    cost_per_minute: 5,
    rate_weight_per_minute: 10,
    poll_ms: 15_000,
    upstream: (o) => `${o}/api/oei/satellites?category=active&mode=registry`,
  },
  "myca.verified-entities": {
    id: "myca.verified-entities",
    scope: "agent",
    cost_per_minute: 3,
    rate_weight_per_minute: 5,
    poll_ms: 0,
    pipe_sse: true,
    upstream: (o) => `${o}/api/myca/entity-feed`,
  },
  "sensors.h2s.tjrv": {
    id: "sensors.h2s.tjrv",
    scope: "agent",
    cost_per_minute: 2,
    rate_weight_per_minute: 4,
    poll_ms: 60_000,
    upstream: (o) => `${o}/api/crep/sdapcd/h2s`,
  },
  "alerts.nws": {
    id: "alerts.nws",
    scope: "agent",
    cost_per_minute: 2,
    rate_weight_per_minute: 4,
    poll_ms: 60_000,
    upstream: (o, p) => {
      const bbox = p.get("bbox")
      return `${o}/api/oei/nws-alerts${bbox ? `?bbox=${bbox}` : ""}`
    },
  },
  "alerts.shodan": {
    id: "alerts.shodan",
    scope: "fusarium",
    cost_per_minute: 20,
    rate_weight_per_minute: 15,
    poll_ms: 60_000,
    upstream: (o, p) => {
      const q = p.get("q") || "tag:ics"
      return `${o}/api/shodan/search?q=${encodeURIComponent(q)}`
    },
  },
}

export async function GET(req: NextRequest, { params }: { params: { channel: string } }) {
  const requestId = newRequestId()
  const def = CHANNELS[params.channel]
  if (!def) {
    return err({
      code: "DATASET_NOT_FOUND",
      message: `Unknown stream channel "${params.channel}". Channels: ${Object.keys(CHANNELS).join(", ")}.`,
      status: 404,
      request_id: requestId,
    })
  }

  // Auth
  const profile = await getAgentProfile(req)
  if (!profile) {
    return err({
      code: "UNAUTHENTICATED",
      message: `Stream ${def.id} requires an API key.`,
      status: 401,
      request_id: requestId,
      details: { top_up_url: "https://mycosoft.com/agent" },
    })
  }

  // First-minute debit
  const meter = await meterAndLimit({
    api_key_id: profile.api_key_id!,
    profile_id: profile.profile_id,
    dataset_id: `stream:${def.id}`,
    cost_per_request: def.cost_per_minute,
    rate_weight: def.rate_weight_per_minute,
    cache_hit: false,
    kind: "stream",
    request_id: requestId,
  })
  if (!meter.ok) {
    if (meter.reason === "insufficient_balance") {
      return err({
        code: "INSUFFICIENT_BALANCE",
        message: `Stream ${def.id} needs ${def.cost_per_minute}¢/min, balance is ${meter.balance_cents}¢.`,
        status: 402,
        request_id: requestId,
        details: { top_up_url: "https://mycosoft.com/agent" },
      })
    }
    return err({
      code: "RATE_LIMITED",
      message: `Rate limit exceeded.`,
      status: 429,
      request_id: requestId,
      rate_limit: meter.rate_limit,
      headers: { "Retry-After": String(meter.retry_after_s ?? 60) },
    })
  }

  const internalOrigin = new URL(req.url).origin
  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch { /* closed */ }
      }

      send("hello", {
        channel: def.id,
        scope: def.scope,
        poll_ms: def.poll_ms,
        cost_per_minute_cents: def.cost_per_minute,
        request_id: requestId,
        connected_at: new Date().toISOString(),
      })

      // Piped SSE — forward upstream events directly
      if (def.pipe_sse) {
        const upstream = def.upstream(internalOrigin, req.nextUrl.searchParams)
        if (!upstream) {
          send("error", { code: "UPSTREAM_UNREACHABLE", message: "upstream url not resolved" })
          controller.close()
          return
        }
        const abort = new AbortController()
        const cleanup = () => { try { abort.abort() } catch { /* */ } }
        req.signal.addEventListener("abort", cleanup)
        try {
          const r = await fetch(upstream, { signal: abort.signal, headers: { Accept: "text/event-stream" } })
          if (!r.ok || !r.body) {
            send("error", { code: "UPSTREAM_UNREACHABLE", status: r.status })
            controller.close()
            return
          }
          const reader = r.body.getReader()
          const dec = new TextDecoder()
          while (!abort.signal.aborted) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) controller.enqueue(value) // pass-through raw SSE bytes
          }
        } catch (e: any) {
          send("error", { code: "UPSTREAM_UNREACHABLE", message: e?.message })
        } finally {
          req.signal.removeEventListener("abort", cleanup)
          try { controller.close() } catch { /* */ }
        }
        return
      }

      // Poll loop
      let lastSig = ""
      const fire = async () => {
        try {
          const upstream = def.upstream(internalOrigin, req.nextUrl.searchParams)
          if (!upstream) return
          const r = await fetch(upstream, { signal: AbortSignal.timeout(10_000), cache: "no-store" })
          if (!r.ok) return
          const payload = await r.json()
          const sig = JSON.stringify(payload).slice(0, 200)
          if (sig === lastSig) return
          lastSig = sig
          send("data", { ts: Date.now(), payload })
        } catch { /* next tick */ }
      }

      // Initial tick
      fire()
      const pollTimer = setInterval(fire, Math.max(2000, def.poll_ms))
      const hbTimer = setInterval(() => send("heartbeat", { ts: Date.now() }), 15_000)
      // Per-minute re-meter so long streams keep debiting
      const meterTimer = setInterval(async () => {
        const m = await meterAndLimit({
          api_key_id: profile.api_key_id!,
          profile_id: profile.profile_id,
          dataset_id: `stream:${def.id}`,
          cost_per_request: def.cost_per_minute,
          rate_weight: def.rate_weight_per_minute,
          cache_hit: false,
          kind: "stream",
          request_id: `${requestId}-t${Date.now()}`,
        })
        if (!m.ok) {
          send("error", { code: m.reason === "insufficient_balance" ? "INSUFFICIENT_BALANCE" : "RATE_LIMITED", detail: m })
          clearInterval(pollTimer)
          clearInterval(hbTimer)
          clearInterval(meterTimer)
          try { controller.close() } catch { /* */ }
        }
      }, 60_000)

      const abort = () => {
        clearInterval(pollTimer)
        clearInterval(hbTimer)
        clearInterval(meterTimer)
        try { controller.close() } catch { /* */ }
      }
      req.signal.addEventListener("abort", abort)
    },
    cancel() { /* client closed */ },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Worldview-Channel": def.id,
      "X-Worldview-Request-Id": requestId,
    },
  })
}
