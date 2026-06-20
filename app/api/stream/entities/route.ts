/**
 * Unified Entity Stream SSE BFF
 *
 * Proxies MAS WebSocket /api/entities/stream to Server-Sent Events for browsers
 * on public origins (cannot connect ws:// to private MAS LAN IP).
 */

import { NextRequest } from "next/server"
import { API_URLS } from "@/lib/config/api-urls"

const MAS_API_URL = API_URLS.MAS
const MAS_WS_URL = MAS_API_URL.replace("http://", "ws://").replace("https://", "wss://")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/stream/entities
 *
 * Query params (forwarded to MAS):
 * - cells: comma-separated S2 cell IDs
 * - types: comma-separated entity types
 * - time_from: ISO8601 lower time bound
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const { searchParams } = new URL(request.url)

  const cells = searchParams.get("cells")
  const types = searchParams.get("types")
  const timeFrom = searchParams.get("time_from")

  const wsParams = new URLSearchParams()
  if (cells) wsParams.set("cells", cells)
  if (types) wsParams.set("types", types)
  if (timeFrom) wsParams.set("time_from", timeFrom)
  const qs = wsParams.toString()
  const wsUrl = `${MAS_WS_URL}/api/entities/stream${qs ? `?${qs}` : ""}`

  const customReadable = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null
      let wsInstance: InstanceType<typeof import("ws").default> | null = null

      const sendEvent = (eventType: string, payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`)
        )
      }

      const cleanup = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        if (wsInstance && wsInstance.readyState === 1) {
          wsInstance.close()
        }
        try {
          controller.close()
        } catch {
          // Stream may already be closed
        }
      }

      try {
        const WebSocketModule = await import("ws")
        const WS = WebSocketModule.default
        wsInstance = new WS(wsUrl)

        sendEvent("connected", {
          message: "Entity stream BFF connected",
          masUrl: MAS_API_URL,
          timestamp: new Date().toISOString(),
        })

        wsInstance.on("open", () => {
          console.log("[Entity Stream] WebSocket connected to MAS")
          heartbeatInterval = setInterval(() => {
            if (wsInstance && wsInstance.readyState === WS.OPEN) {
              wsInstance.ping()
            }
          }, 30000)
        })

        wsInstance.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString())
            const eventType = message.type || "entity"
            sendEvent(eventType, message)
          } catch (error) {
            console.error("[Entity Stream] Message parse error:", error)
          }
        })

        wsInstance.on("error", (error: Error) => {
          console.error("[Entity Stream] WebSocket error:", error.message)
          sendEvent("error", {
            error: "WebSocket error",
            message: error.message || "Unknown error",
            timestamp: new Date().toISOString(),
          })
        })

        wsInstance.on("close", (code: number, reason: Buffer) => {
          console.log(
            `[Entity Stream] WebSocket closed (code: ${code}, reason: ${reason.toString() || "none"})`
          )
          sendEvent("disconnected", {
            message: "Entity stream disconnected",
            code,
            timestamp: new Date().toISOString(),
          })
          cleanup()
        })

        request.signal.addEventListener("abort", () => {
          console.log("[Entity Stream] Client disconnected")
          cleanup()
        })
      } catch (error) {
        console.error("[Entity Stream] Setup error:", error)
        sendEvent("error", {
          error: "Connection setup failed",
          message: error instanceof Error ? error.message : "Unknown error",
          masUrl: MAS_API_URL,
          timestamp: new Date().toISOString(),
        })
        cleanup()
      }
    },
  })

  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
