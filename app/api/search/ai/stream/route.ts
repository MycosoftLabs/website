import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

type ModelPreference = "fast" | "quality" | "reasoning"

interface SearchContext {
  species?: string[]
  compounds?: string[]
  previousSearches?: string[]
  research?: string[]
  genetics?: string[]
  focusedWidget?: string
}

interface SearchAIStreamRequest {
  query: string
  context?: SearchContext
  modelPreference?: ModelPreference
  userId?: string
  sessionId?: string
  conversationId?: string
  history?: Array<{ role: "user" | "assistant"; content: string }>
}

function recordIntention(query: string, source: string, sessionId?: string, userId?: string) {
  fetch(`${MAS_API_URL}/api/myca/intention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      event_type: "search",
      data: { query, ai_source: source },
      context: { source: "search_ai_stream" },
    }),
  }).catch(() => {})
}

export async function POST(request: NextRequest) {
  let body: SearchAIStreamRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  const ctx = body.context
  const contextParts: string[] = []
  if (ctx?.species?.length) contextParts.push(`species: ${ctx.species.slice(0, 5).join(", ")}`)
  if (ctx?.compounds?.length) contextParts.push(`compounds: ${ctx.compounds.slice(0, 5).join(", ")}`)
  if (ctx?.genetics?.length) contextParts.push(`genetics: ${ctx.genetics.slice(0, 5).join(", ")}`)
  if (ctx?.research?.length) contextParts.push(`research: ${ctx.research.slice(0, 3).map((t) => (t.length > 60 ? t.slice(0, 57) + "..." : t)).join("; ")}`)
  const contextPrompt = contextParts.length
    ? `\n\n[User's current search context - ${contextParts.join(" | ")}]`
    : ""

  const provider =
    body.modelPreference === "quality"
      ? "claude"
      : body.modelPreference === "reasoning"
        ? "openai"
        : "gemini"

  const upstream = await fetch(`${MAS_API_URL}/voice/brain/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: query + contextPrompt,
        user_id: body.userId,
        session_id: body.sessionId,
        conversation_id: body.conversationId,
        history: body.history,
        provider,
        include_memory_context: true,
        context: body.context,
      }),
    signal: AbortSignal.timeout(15000),
  })

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "No AI response available", query, timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }

  recordIntention(query, `MYCA Brain (${provider})`, body.sessionId, body.userId)

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
