import { NextRequest } from "next/server"

const MAS_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function GET(request: NextRequest) {
  const streamUrl = `${MAS_URL}/api/presence/stream`
  const res = await fetch(streamUrl, {
    headers: request.headers,
  })
  if (!res.ok || !res.body) {
    return new Response("Presence stream unavailable", { status: 502 })
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
