/**
 * Mycorrhizae Protocol SSE Streaming Endpoint
 *
 * Server-Sent Events for real-time channel subscriptions.
 * Proxies to the Mycorrhizae Protocol API or falls back to local simulation.
 */

import { NextRequest } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"
export const runtime = "edge"

const MYCORRHIZAE_API_URL = env.mycorrhizaeApiUrl || "http://192.168.0.187:8002"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel") || "system.*"
  const apiKey = request.headers.get("X-API-Key") || env.mycorrhizaePublishKey || ""

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const connectionEvent = `event: connected\ndata: ${JSON.stringify({
        channel,
        timestamp: new Date().toISOString(),
        message: "Connected to Mycorrhizae Protocol",
      })}\n\n`
      controller.enqueue(encoder.encode(connectionEvent))

      // Try to connect to actual Mycorrhizae API
      let useSimulation = true

      try {
        const healthCheck = await fetch(`${MYCORRHIZAE_API_URL}/health`, {
          signal: AbortSignal.timeout(5000),
        })
        if (healthCheck.ok) {
          useSimulation = false
        }
      } catch {
        // API not available, use simulation
      }

      if (useSimulation) {
        // Simulation mode - generate sample messages
        let count = 0
        const interval = setInterval(() => {
          count++

          const message = {
            id: `msg-${Date.now()}-${count}`,
            channel: `device.simulation.telemetry`,
            timestamp: new Date().toISOString(),
            ttl_seconds: 3600,
            source: {
              type: "device",
              id: "simulation",
              device_serial: "SIM-001",
            },
            message_type: "telemetry",
            payload: {
              temperature: 22 + Math.random() * 5,
              humidity: 60 + Math.random() * 20,
              impedance: 1000 + Math.random() * 500,
              conductivity: 500 + Math.random() * 200,
              quality: 0.8 + Math.random() * 0.2,
            },
            tracing: {
              correlation_id: `corr-${Date.now()}`,
            },
            priority: 5,
            tags: ["simulation", "telemetry"],
          }

          const event = `event: message\nid: ${message.id}\ndata: ${JSON.stringify(message)}\n\n`
          controller.enqueue(encoder.encode(event))

          // Send ping every 10 messages
          if (count % 10 === 0) {
            const ping = `event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`
            controller.enqueue(encoder.encode(ping))
          }
        }, 2000) // Every 2 seconds

        // Cleanup on abort
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
        })
      } else {
        // Real mode - proxy from Mycorrhizae API
        try {
          const response = await fetch(
            `${MYCORRHIZAE_API_URL}/api/stream/subscribe?channel=${encodeURIComponent(channel)}`,
            {
              headers: {
                "X-API-Key": apiKey,
              },
            }
          )

          if (!response.body) {
            throw new Error("No response body")
          }

          const reader = response.body.getReader()

          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
            controller.close()
          }

          pump().catch((error) => {
            console.error("Stream error:", error)
            controller.close()
          })

          request.signal.addEventListener("abort", () => {
            reader.cancel()
            controller.close()
          })
        } catch (error) {
          console.error("Failed to connect to Mycorrhizae API:", error)
          controller.close()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
