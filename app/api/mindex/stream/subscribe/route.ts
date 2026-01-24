import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { channelToKey, type MycorrhizaeChannel } from "@/lib/mindex/streaming/mycorrhizae-client"
import { createConnectedChunk, createHeartbeatChunk, subscribeToChannel } from "@/lib/mindex/streaming/sse-manager"

export const dynamic = "force-dynamic"

function parseChannel(request: NextRequest): MycorrhizaeChannel {
  const type = request.nextUrl.searchParams.get("type") as MycorrhizaeChannel["type"] | null
  const id = request.nextUrl.searchParams.get("id")
  const filtersRaw = request.nextUrl.searchParams.get("filters")

  if (!type || !id) throw new Error("Missing required query params: type, id")
  if (!["device", "aggregate", "computed", "alert"].includes(type)) throw new Error("Invalid channel type")

  const filters = filtersRaw ? (JSON.parse(filtersRaw) as Record<string, unknown>) : undefined
  return { type, id, filters }
}

export async function GET(request: NextRequest) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "Integrations disabled",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true"],
      },
      { status: 503 },
    )
  }

  let channel: MycorrhizaeChannel
  try {
    channel = parseChannel(request)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error), code: "VALIDATION_ERROR" },
      { status: 400 },
    )
  }

  const subscriberId = `mindex-sse-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const channelKey = channelToKey(channel)

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(createConnectedChunk(subscriberId, channelKey))

      const unsubscribe = subscribeToChannel(channelKey, subscriberId, (chunk) => controller.enqueue(chunk))

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(createHeartbeatChunk())
        } catch {
          // ignore
        }
      }, 30_000)

      request.signal.addEventListener(
        "abort",
        () => {
          clearInterval(heartbeat)
          unsubscribe()
          try {
            controller.close()
          } catch {
            // ignore
          }
        },
        { once: true },
      )
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

