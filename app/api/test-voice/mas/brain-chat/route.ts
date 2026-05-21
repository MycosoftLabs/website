/**
 * MAS proxy: POST /voice/brain/chat
 *
 * Persona memory harness path for /test-voice typed messages.
 * Avoids orchestrator canned fallbacks; routes through HarnessEngine when enabled.
 */

import { NextRequest, NextResponse } from "next/server"
import { masServiceHeaders } from "@/lib/auth/verified-identity"

export async function POST(req: NextRequest) {
  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://localhost:8001"

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const b = (body ?? {}) as Record<string, unknown>
  const message = typeof b.message === "string" ? b.message : String(b.message ?? "")
  const sessionId = (b.session_id ?? b.sessionId ?? "") as string
  const conversationId = (b.conversation_id ?? b.conversationId ?? sessionId) as string

  const brainBody = {
    message,
    session_id: sessionId || undefined,
    conversation_id: conversationId || undefined,
    user_id: (b.user_id as string) || "morgan",
    use_harness: true,
    include_memory_context: true,
  }

  const base = masBaseUrl.replace(/\/$/, "")

  try {
    const res = await fetch(`${base}/voice/brain/chat`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: masServiceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(brainBody),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    const responseText =
      (typeof data.response === "string" && data.response) ||
      (typeof data.response_text === "string" && data.response_text) ||
      ""

    return NextResponse.json(
      {
        ...data,
        response: responseText,
        response_text: responseText,
        protocol_mode: "brain_harness",
      },
      {
        status: res.status,
        headers: {
          "Cache-Control": "no-store",
          "X-Protocol-Mode": "brain_harness",
        },
      }
    )
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
