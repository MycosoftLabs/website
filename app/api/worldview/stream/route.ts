/**
 * WorldView SSE watch — Apr 22, 2026
 *
 * Morgan: "myca and worldview needs snapshots thats what out agent
 * access to worldview shows and it needs update with this new
 * capability."
 *
 * Server-Sent Events feed that pushes a fresh /api/worldview/snapshot
 * every 60 s. Designed to be consumed by:
 *   • MYCA voice (PersonaPlex on Legion 192.168.0.241:8999 — the
 *     bridge connects to this stream and narrates updates).
 *   • External agent integrations (MYCA APP on Morgan's machine,
 *     remote MYCA agents on lab CEO/CTO/CFO/COO nodes per
 *     Mycosoft architecture).
 *   • Ops monitoring — watch-only dashboards.
 *
 * Event types emitted:
 *   hello        — initial handshake with connection metadata
 *   snapshot     — full worldview snapshot (every 60 s)
 *   health_drop  — emitted immediately if MINDEX or MAS reachability
 *                  flips to false (don't wait for next tick)
 *
 * Usage (browser):
 *   const es = new EventSource("/api/worldview/stream?project=oyster")
 *   es.addEventListener("snapshot", (e) => { ... })
 *
 * Usage (MYCA agent via Node):
 *   node scripts/myca/subscribe-worldview.mjs --project=global
 *
 * Client reconnect: 5 min maxDuration. Browsers auto-reconnect on
 * connection close — the SSE spec guarantees this — and the hello
 * event lets the agent re-sync its state on each reconnect.
 *
 * @route GET /api/worldview/stream?project=...
 */

import { NextRequest } from "next/server"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 min connection lifetime

const TICK_MS = 60_000

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  const url = new URL(req.url)
  const project = url.searchParams.get("project") || "global"
  const origin = url.origin

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        } catch {
          // client disconnected; upstream abort will tear this down
        }
      }

      send("hello", {
        ts: new Date().toISOString(),
        project,
        interval_ms: TICK_MS,
        note: "WorldView SSE — one snapshot per tick. Reconnect on close.",
      })

      let prevMindexReachable: boolean | null = null
      let prevMasReachable: boolean | null = null

      const tick = async () => {
        try {
          const internalOrigin = resolveInternalBaseUrl(origin)
          const r = await fetch(`${internalOrigin}/api/worldview/snapshot?project=${encodeURIComponent(project)}`, {
            signal: AbortSignal.timeout(20_000),
          })
          if (!r.ok) {
            send("error", { ts: new Date().toISOString(), http: r.status })
            return
          }
          const snapshot = await r.json()
          send("snapshot", snapshot)

          // Immediate health-drop fire if reachability flipped.
          const mindex = snapshot?.middleware?.mindex?.reachable
          const mas = snapshot?.middleware?.mas?.reachable
          if (prevMindexReachable === true && mindex === false) {
            send("health_drop", { service: "mindex", at: new Date().toISOString() })
          }
          if (prevMasReachable === true && mas === false) {
            send("health_drop", { service: "mas", at: new Date().toISOString() })
          }
          prevMindexReachable = mindex
          prevMasReachable = mas
        } catch (e: any) {
          send("error", { ts: new Date().toISOString(), message: e?.message || "snapshot fetch failed" })
        }
      }

      // Initial tick immediately
      await tick()

      const iv = setInterval(tick, TICK_MS)

      // Keep-alive comment every 25 s so intermediate proxies don't
      // close the idle connection (many proxies have 30-60 s idle
      // timeout; a whitespace comment is a valid SSE heartbeat).
      const ka = setInterval(() => {
        try { controller.enqueue(encoder.encode(":keepalive\n\n")) } catch { /* ignore */ }
      }, 25_000)

      // Clean up on abort
      const onAbort = () => {
        clearInterval(iv)
        clearInterval(ka)
        try { controller.close() } catch { /* ignore */ }
      }
      req.signal.addEventListener("abort", onAbort)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // tell nginx not to buffer SSE
    },
  })
}
