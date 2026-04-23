import { NextRequest } from "next/server"
import { subscribe, subscriberCount } from "@/lib/myca/entity-feed-bus"

/**
 * MYCA Entity Feed — Server-Sent Events stream — Apr 22, 2026
 *
 * Morgan: "a new navy base marker and perimeter should be added to it
 * live almost instantly after confirmed".
 *
 * CREP dashboards GET this endpoint and keep it open. When
 * /api/myca/waypoint-verify auto-adds an entity, it publishes onto the
 * shared bus and every connected client gets the entity as an SSE
 * `message` event. Clients insert a new map marker within ~100ms of
 * the verify completing.
 *
 * Wire format (one message per line):
 *   event: entity
 *   data: { ... }
 *
 * Heartbeat every 15s (`event: heartbeat`) so proxies don't drop
 * idle connections.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\n`))
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* closed */ }
      }

      // Welcome message so the client knows the connection is alive.
      send("hello", { connected_at: new Date().toISOString(), subscriber_count: subscriberCount() + 1 })

      const unsub = subscribe((entity) => {
        send("entity", entity)
      })

      const hb = setInterval(() => {
        send("heartbeat", { ts: Date.now() })
      }, 15_000)

      // Clean up when client disconnects
      const abort = () => {
        clearInterval(hb)
        unsub()
        try { controller.close() } catch { /* already closed */ }
      }
      ;(controller as any).__cleanup = abort
    },
    cancel() {
      const c = this as any
      try { c.__cleanup?.() } catch { /* ignore */ }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
