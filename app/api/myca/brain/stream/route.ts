/**
 * MYCA Brain Stream API
 * Proxies streaming chat to MAS /voice/brain/stream
 * Created: Feb 12, 2026
 */

import { NextRequest } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = {
      ...body,
      user_id: body.user_id || "anonymous",
      session_id: body.session_id,
      conversation_id: body.conversation_id,
    }
    const response = await fetch(`${MAS_API_URL}/voice/brain/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const text = await response.text()
      return new Response(
        JSON.stringify({ error: `MAS Brain error: ${text}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("MYCA brain stream error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to connect to MYCA Brain",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
