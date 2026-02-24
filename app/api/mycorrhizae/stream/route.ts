/**
 * Mycorrhizae Protocol SSE Stream
 *
 * Explicit route for /api/mycorrhizae/stream to satisfy Next.js module resolution.
 * Proxies to Mycorrhizae API (port 8002) or provides simulation when unavailable.
 * Created: February 24, 2026 - Fix for build "Module not found" error.
 */

import { NextRequest } from "next/server";

const MYCORRHIZAE_URL =
  process.env.MYCORRHIZAE_API_URL || "http://192.168.0.187:8002";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "system.*";
  const apiKey =
    request.headers.get("X-API-Key") || process.env.MYCORRHIZAE_PUBLISH_KEY || "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const connectionEvent = `event: connected\ndata: ${JSON.stringify({
        channel,
        timestamp: new Date().toISOString(),
        message: "Connected to Mycorrhizae Protocol",
      })}\n\n`;
      controller.enqueue(encoder.encode(connectionEvent));

      let useSimulation = true;
      try {
        const healthCheck = await fetch(`${MYCORRHIZAE_URL}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (healthCheck.ok) useSimulation = false;
      } catch {
        // API not available
      }

      if (useSimulation) {
        let count = 0;
        const interval = setInterval(() => {
          count++;
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
            tracing: { correlation_id: `corr-${Date.now()}` },
            priority: 5,
            tags: ["simulation", "telemetry"],
          };
          const event = `event: message\nid: ${message.id}\ndata: ${JSON.stringify(message)}\n\n`;
          controller.enqueue(encoder.encode(event));
          if (count % 10 === 0) {
            controller.enqueue(
              encoder.encode(
                `event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`
              )
            );
          }
        }, 2000);
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      } else {
        try {
          const response = await fetch(
            `${MYCORRHIZAE_URL}/api/stream/subscribe?channel=${encodeURIComponent(channel)}`,
            { headers: { "X-API-Key": apiKey } }
          );
          if (!response.body) throw new Error("No response body");
          const reader = response.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          };
          pump().catch(() => controller.close());
          request.signal.addEventListener("abort", () => {
            reader.cancel();
            controller.close();
          });
        } catch {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
