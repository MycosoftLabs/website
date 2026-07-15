/**
 * GET /api/psathyrella/stream?deviceId=... — SSE passthrough to the MAS telemetry stream.
 *
 * Proxies MAS `GET /api/psathyrella/{deviceId}/stream` (text/event-stream, `event: telemetry`
 * frames at ~2.5s, payload `{type,atMs,telemetry}`) straight through to the browser. This is
 * the P5 "website stream passthrough" Claude/GCS-lane deliverable.
 *
 * Design: the GCS keeps SWR polling as its reliable base; this stream is an ADDITIVE low-latency
 * accelerator. If MAS is unreachable we fail closed with a 502 so the client's EventSource fires
 * onerror and the hook simply keeps polling — the controls/telemetry never depend on the stream.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const DEFAULT_DEVICE_ID = "psathyrella-1"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Disable proxy buffering (Caddy/nginx) so events flush immediately.
    "X-Accel-Buffering": "no",
  }
}

export async function GET(req: NextRequest) {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner()
  if (auth.error) return auth.error
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get("deviceId") || DEFAULT_DEVICE_ID

  let upstream: Response | null = null
  try {
    upstream = await fetch(`${MAS_API_URL}/api/psathyrella/${encodeURIComponent(deviceId)}/stream`, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
      // Abort the upstream fetch when the browser disconnects (tab close / navigate / EventSource.close()).
      signal: req.signal,
    })
  } catch {
    upstream = null
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: "mas_stream_unavailable", deviceId }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Pipe the MAS SSE body straight through. Next streams the ReadableStream to the client.
  return new Response(upstream.body, { status: 200, headers: sseHeaders() })
}
