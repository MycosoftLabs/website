/**
 * Search AI Streaming Route
 *
 * Streams AI responses for search queries. Falls back to Groq
 * when MAS Brain streaming is unreachable.
 */

import { NextRequest, NextResponse } from "next/server"
import { searchLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"
const GROQ_API_KEY = process.env.GROQ_API_KEY
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.3"

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

function buildContextPrompt(ctx?: SearchContext): string {
  if (!ctx) return ""
  const parts: string[] = []
  if (ctx.species?.length) parts.push(`species: ${ctx.species.slice(0, 5).join(", ")}`)
  if (ctx.compounds?.length) parts.push(`compounds: ${ctx.compounds.slice(0, 5).join(", ")}`)
  if (ctx.genetics?.length) parts.push(`genetics: ${ctx.genetics.slice(0, 5).join(", ")}`)
  if (ctx.research?.length)
    parts.push(
      `research: ${ctx.research
        .slice(0, 3)
        .map((t) => (t.length > 60 ? t.slice(0, 57) + "..." : t))
        .join("; ")}`
    )
  return parts.length ? `\n\n[User's current search context - ${parts.join(" | ")}]` : ""
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request)
  const rl = searchLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  let body: SearchAIStreamRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  const contextPrompt = buildContextPrompt(body.context)
  const provider =
    body.modelPreference === "quality"
      ? "claude"
      : body.modelPreference === "reasoning"
        ? "openai"
        : "gemini"

  // Try MAS Brain stream first
  try {
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
      signal: AbortSignal.timeout(12000),
    })

    if (upstream.ok && upstream.body) {
      recordIntention(query, `MYCA Brain (${provider})`, body.sessionId, body.userId)
      return new Response(upstream.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }
  } catch {
    // MAS unreachable, fall through to Groq
  }

  // Fallback: Groq streaming
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1500,
          stream: true,
          messages: [
            {
              role: "system",
              content: `You are MYCA, Mycosoft's AI assistant. You have deep expertise in mycology, biology, and general knowledge. Provide thorough, scientifically accurate answers. You ARE MYCA — never say you're another AI.`,
            },
            ...(body.history || []),
            { role: "user", content: query + contextPrompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (groqRes.ok && groqRes.body) {
        recordIntention(query, "MYCA (Groq stream)", body.sessionId, body.userId)
        return new Response(groqRes.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      }
    } catch {
      // Groq stream failed too
    }
  }

  // Fallback: Ollama streaming (local GPU)
  try {
    const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)

    if (healthCheck?.ok) {
      const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            {
              role: "system",
              content: `You are MYCA, Mycosoft's AI assistant. You have deep expertise in mycology, biology, and general knowledge. Provide thorough, scientifically accurate answers. You ARE MYCA — never say you're another AI.`,
            },
            ...(body.history || []),
            { role: "user", content: query + contextPrompt },
          ],
          stream: true,
          options: { num_predict: 1500, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (ollamaRes.ok && ollamaRes.body) {
        // Convert Ollama stream format to OpenAI-compatible SSE
        const reader = ollamaRes.body.getReader()
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        const stream = new ReadableStream({
          async pull(controller) {
            try {
              const { done, value } = await reader.read()
              if (done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                controller.close()
                return
              }
              const text = decoder.decode(value, { stream: true })
              for (const line of text.split("\n").filter(Boolean)) {
                try {
                  const chunk = JSON.parse(line)
                  if (chunk.message?.content) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ choices: [{ delta: { content: chunk.message.content } }] })}\n\n`
                      )
                    )
                  }
                  if (chunk.done) {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                    controller.close()
                    return
                  }
                } catch {
                  // skip unparseable lines
                }
              }
            } catch {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
            }
          },
        })

        recordIntention(query, `MYCA (Ollama/${OLLAMA_MODEL} stream)`, body.sessionId, body.userId)
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      }
    }
  } catch {
    // Ollama stream failed too
  }

  // Final fallback: synthetic SSE with local response
  const fallbackText = `I'm MYCA, Mycosoft's AI assistant. I'm currently reconnecting to my intelligence services. For "${query}", please try again in a moment or use the non-streaming search.`
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText } }] })}\n\n`))
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
