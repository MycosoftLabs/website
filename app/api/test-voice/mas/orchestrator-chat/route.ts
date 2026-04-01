/**
 * MAS proxy: POST /voice/orchestrator/chat
 *
 * Used by /test-voice "text clone" path so it doesn't rely on CORS to MAS.
 *
 * February 17, 2026: Added optional A2A gateway mode.
 * - Header "X-Protocol-Mode: a2a" or query ?protocol=a2a -> calls A2A message/send
 * - Session/conversation IDs aligned with A2A message metadata
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const masBaseUrl =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://localhost:8001"

  const protocolMode =
    req.headers.get("x-protocol-mode")?.toLowerCase() ||
    req.nextUrl.searchParams.get("protocol")?.toLowerCase() ||
    "legacy"

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const base = masBaseUrl.replace(/\/$/, "")

  try {
    if (protocolMode === "a2a") {
      // A2A gateway mode: call /a2a/v1/message/send
      const b = body as Record<string, unknown>
      const message = typeof b?.message === "string" ? b.message : String(b?.message ?? "")
      const conversationId = (b?.conversation_id ?? b?.conversationId ?? "") as string
      const sessionId = (b?.session_id ?? b?.sessionId ?? "") as string

      const a2aBody = {
        message: {
          messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          contextId: conversationId || undefined,
          role: "ROLE_USER",
          parts: [{ text: message, mediaType: "text/plain" }],
          metadata: sessionId ? { session_id: sessionId } : undefined,
        },
        configuration: { blocking: true },
        metadata: {
          session_id: sessionId,
          conversation_id: conversationId,
          source: "test-voice",
        },
      }

      const res = await fetch(`${base}/a2a/v1/message/send`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a2aBody),
        cache: "no-store",
      })

      const data = await res.json().catch(() => ({}))
      const artifacts = data?.artifacts ?? []
      const firstPart = artifacts[0]?.parts?.[0]?.text ?? ""
      const responseText = firstPart || (data?.status?.message?.parts?.[0]?.text ?? "")

      return NextResponse.json(
        {
          response_text: responseText,
          response: responseText,
          conversation_id: data?.contextId ?? conversationId,
          session_id: sessionId,
          protocol_mode: "a2a",
        },
        {
          status: res.status,
          headers: { "Cache-Control": "no-store", "X-Protocol-Mode": "a2a" },
        }
      )
    }

    // Legacy: voice/orchestrator/chat
    const res = await fetch(`${base}/voice/orchestrator/chat`, {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    })

    const text = await res.text()
    let out = text
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      parsed.protocol_mode = "legacy"
      out = JSON.stringify(parsed)
    } catch {
      // Pass through as-is
    }
    return new NextResponse(out, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
        "X-Protocol-Mode": "legacy",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}

