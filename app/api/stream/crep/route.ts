/**
 * CREP/OEI Dashboard Stream API
 *
 * Server-Sent Events (SSE) proxy to MAS WebSocket for CREP dashboard.
 * Converts WebSocket stream from MAS to SSE for browser consumption.
 *
 * Uses centralized API_URLS config — no hard-coded development IPs.
 */

import { NextRequest } from "next/server"
import { API_URLS } from "@/lib/config/api-urls"

const MAS_API_URL = API_URLS.MAS
const MAS_WS_URL = MAS_API_URL.replace("http://", "ws://").replace("https://", "wss://")

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/stream/crep
 *
 * Server-Sent Events endpoint for CREP/OEI dashboard live data.
 * Connects to MAS WebSocket and converts to SSE for browser.
 *
 * Query params:
 * - category: Optional filter (aircraft, vessel, satellite, weather)
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode")
  const category = searchParams.get("category")

  // Entity stream (Earth Simulator) — same BFF path as CREP for prod route registration
  if (mode === "entities") {
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
            // already closed
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
            heartbeatInterval = setInterval(() => {
              if (wsInstance && wsInstance.readyState === WS.OPEN) {
                wsInstance.ping()
              }
            }, 30000)
          })

          wsInstance.on("message", (data: Buffer) => {
            try {
              const message = JSON.parse(data.toString())
              sendEvent(message.type || "entity", message)
            } catch (error) {
              console.error("[Entity Stream] Message parse error:", error)
            }
          })

          wsInstance.on("error", (error: Error) => {
            sendEvent("error", {
              error: "WebSocket error",
              message: error.message || "Unknown error",
              timestamp: new Date().toISOString(),
            })
          })

          wsInstance.on("close", (code: number, reason: Buffer) => {
            sendEvent("disconnected", {
              message: "Entity stream disconnected",
              code,
              timestamp: new Date().toISOString(),
            })
            cleanup()
          })

          request.signal.addEventListener("abort", cleanup)
        } catch (error) {
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

  const customReadable = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null

      try {
        // Connect to MAS WebSocket
        let wsUrl = `${MAS_WS_URL}/api/crep/stream`
        if (category) {
          wsUrl += `?category=${encodeURIComponent(category)}`
        }

        // Use Node.js WebSocket (ws package)
        const WebSocketModule = await import("ws")
        const WS = WebSocketModule.default
        const wsInstance = new WS(wsUrl)

        // Send initial connection message
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              message: "CREP stream connected",
              category: category || "all",
              masUrl: MAS_API_URL,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        )

        // WebSocket open handler
        wsInstance.on("open", () => {
          console.log(
            "[CREP Stream] WebSocket connected to MAS",
            category ? `(filter: ${category})` : ""
          )

          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            if (wsInstance.readyState === WS.OPEN) {
              wsInstance.send(JSON.stringify({ type: "ping" }))
            }
          }, 30000)
        })

        // WebSocket message handler
        wsInstance.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString())

            // Forward to SSE client
            const eventType = message.type || "message"
            const eventData = JSON.stringify(message)

            controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${eventData}\n\n`))
          } catch (error) {
            console.error("[CREP Stream] Message parse error:", error)
          }
        })

        // WebSocket error handler
        wsInstance.on("error", (error: Error) => {
          console.error("[CREP Stream] WebSocket error:", error.message)

          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: "WebSocket error",
                message: error.message || "Unknown error",
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          )
        })

        // WebSocket close handler
        wsInstance.on("close", (code: number, reason: Buffer) => {
          console.log(`[CREP Stream] WebSocket closed (code: ${code}, reason: ${reason.toString() || "none"})`)

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
          }

          controller.enqueue(
            encoder.encode(
              `event: disconnected\ndata: ${JSON.stringify({
                message: "CREP stream disconnected",
                code,
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          )

          controller.close()
        })

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          console.log("[CREP Stream] Client disconnected")

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
          }

          if (wsInstance.readyState === WS.OPEN) {
            wsInstance.close()
          }

          try {
            controller.close()
          } catch {
            // Stream may already be closed
          }
        })
      } catch (error) {
        console.error("[CREP Stream] Setup error:", error)

        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              error: "Connection setup failed",
              message: error instanceof Error ? error.message : "Unknown error",
              masUrl: MAS_API_URL,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        )

        controller.close()
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
