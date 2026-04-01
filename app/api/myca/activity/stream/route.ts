/**
 * SSE endpoint for real-time Myca activity streaming.
 * Proxies consciousness events, thinking steps, and agent activity from MAS.
 * Falls back to periodic polling if MAS SSE is unavailable.
 *
 * Mar 19, 2026
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>, event?: string) => {
        try {
          if (event) {
            controller.enqueue(encoder.encode(`event: ${event}\n`))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller may be closed
        }
      }

      // Send initial connected event
      send({ type: "connected", timestamp: new Date().toISOString() })

      // Try to connect to MAS SSE stream
      let masConnected = false
      try {
        const masRes = await fetch(`${MAS_API_URL}/api/myca/activity/stream`, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "text/event-stream" },
        })

        if (masRes.ok && masRes.body) {
          masConnected = true
          const reader = masRes.body.getReader()
          const decoder = new TextDecoder()

          const readLoop = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                // Forward raw SSE data
                controller.enqueue(encoder.encode(chunk))
              }
            } catch {
              // MAS stream ended
            }
          }

          // Don't await - let it run in background
          readLoop().catch(() => {})
        }
      } catch {
        // MAS SSE not available
      }

      // If MAS SSE not available, fall back to polling
      if (!masConnected) {
        // Heartbeat + poll loop
        const poll = async () => {
          try {
            // Poll consciousness status
            const statusRes = await fetch(`${MAS_API_URL}/api/myca/status`, {
              signal: AbortSignal.timeout(3000),
            })
            if (statusRes.ok) {
              const status = await statusRes.json()
              if (status.is_conscious) {
                send({
                  type: "consciousness",
                  title: "Consciousness active",
                  summary: status.current_thought || "Myca is awake and processing",
                  thinking_step: status.current_thought,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    is_conscious: true,
                    emotional_state: status.emotional_state,
                  },
                })
              }
            }

            // Poll recent agent runs
            const runsRes = await fetch(`${MAS_API_URL}/api/runs?page_size=3`, {
              signal: AbortSignal.timeout(3000),
            })
            if (runsRes.ok) {
              const runs = await runsRes.json()
              const recentRuns = Array.isArray(runs) ? runs : runs?.runs || []
              for (const run of recentRuns.slice(0, 2)) {
                send({
                  type: "agent",
                  title: run.agent_name || "Agent run",
                  summary: run.status || run.result?.slice?.(0, 100),
                  timestamp: run.created_at || new Date().toISOString(),
                })
              }
            }
          } catch {
            // Silent fail
          }
        }

        // Initial poll
        await poll()

        // Continue polling every 10s
        const interval = setInterval(poll, 10000)

        // Heartbeat every 15s
        const heartbeat = setInterval(() => {
          send({ type: "heartbeat", timestamp: new Date().toISOString() })
        }, 15000)

        // Cleanup on stream close
        const cleanup = () => {
          clearInterval(interval)
          clearInterval(heartbeat)
        }

        // Set a max lifetime of 5 minutes, then client reconnects
        setTimeout(() => {
          cleanup()
          try { controller.close() } catch { /* already closed */ }
        }, 300000)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
