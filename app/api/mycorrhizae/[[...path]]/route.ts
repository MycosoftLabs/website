/**
 * Mycorrhizae Protocol API Proxy
 *
 * Proxies requests to the Mycorrhizae API (port 8002) for channel subscribe,
 * publish, and streaming. Uses MYCORRHIZAE_API_URL from env.
 * Handles /stream separately with SSE (avoids catch-all vs static route conflict).
 */

import { NextRequest, NextResponse } from "next/server";

const MYCORRHIZAE_URL =
  process.env.MYCORRHIZAE_API_URL || "http://192.168.0.187:8002";

function createStreamResponse(request: NextRequest): Response {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "system.*";
  const apiKey = request.headers.get("X-API-Key") || process.env.MYCORRHIZAE_PUBLISH_KEY || "";
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
            source: { type: "device", id: "simulation", device_serial: "SIM-001" },
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
            controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
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
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL || "https://mycosoft.com",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const pathArr = Array.isArray(path) ? path : [path].filter(Boolean);

  // Handle /api/mycorrhizae/stream with SSE (merged here to avoid route conflict)
  if (pathArr[0] === "stream") {
    return createStreamResponse(request);
  }

  const pathStr = pathArr.join("/");
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const target = `${MYCORRHIZAE_URL}/api/${pathStr}${search ? `?${search}` : ""}`;
  try {
    const apiKey = request.headers.get("X-API-Key") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-API-Key"] = apiKey;
    const res = await fetch(target, { headers });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Mycorrhizae proxy error", detail: String(e) },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params;
  const pathArr = Array.isArray(path) ? path : [path].filter(Boolean);
  const pathStr = pathArr.join("/");
  const target = `${MYCORRHIZAE_URL}/api/${pathStr}`;
  try {
    const apiKey = request.headers.get("X-API-Key") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-API-Key"] = apiKey;
    const body = await request.text();
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: body || undefined,
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Mycorrhizae proxy error", detail: String(e) },
      { status: 502 }
    );
  }
}
