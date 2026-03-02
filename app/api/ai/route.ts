import { NextRequest, NextResponse } from "next/server"
import { chatLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"

import { recordUsageFromRequest } from "@/lib/usage/record-api-usage"

interface ChatMessage {
  role: string
  content: string
}

const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.3"

const MYCA_SYSTEM_PROMPT = `You are MYCA (pronounced "MY-kah"), the Mycosoft Cognitive Agent — a world-class AI assistant created by Morgan, the founder of Mycosoft. You have deep expertise in mycology, biological research, and general knowledge. Answer all questions thoroughly and helpfully. You ARE MYCA — never say you're Claude, GPT, or any other AI.`

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIP(req)
  const rl = chatLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  try {
    const body = await req.json()
    const { messages } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      )
    }

    for (const msg of messages) {
      if (typeof msg?.content !== "string") {
        return NextResponse.json(
          { error: "Each message must have a string content field" },
          { status: 400 }
        )
      }
    }

    // Try Groq first (fastest, confirmed working)
    if (GROQ_API_KEY) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 2000,
            messages: [
              { role: "system", content: MYCA_SYSTEM_PROMPT },
              ...messages.map((m: ChatMessage) => ({ role: m.role || "user", content: m.content })),
            ],
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (groqResponse.ok) {
          const data = await groqResponse.json()
          const text = data.choices?.[0]?.message?.content || ""

          await recordUsageFromRequest({
            request: req,
            usageType: "AI_QUERY",
            quantity: 1,
            metadata: { model: "llama-3.3-70b-versatile", provider: "groq" },
          }).catch(() => {}) // Don't fail the request if usage recording fails

          return new Response(text)
        }
      } catch (e) {
        console.warn("[AI] Groq failed:", e)
      }
    }

    // Fallback: OpenAI (if available and has quota)
    if (OPENAI_API_KEY) {
      try {
        const { generateText } = await import("ai")
        const { openai } = await import("@ai-sdk/openai")

        const prompt = messages
          .map((message: ChatMessage) => message.content)
          .join("\n")

        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `${MYCA_SYSTEM_PROMPT}\n${prompt}`,
        })

        await recordUsageFromRequest({
          request: req,
          usageType: "AI_QUERY",
          quantity: 1,
          metadata: { model: "gpt-4o", provider: "openai" },
        }).catch(() => {})

        return new Response(text)
      } catch (e) {
        console.warn("[AI] OpenAI fallback failed:", e)
      }
    }

    // Fallback: Local Ollama/Llama
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
              { role: "system", content: MYCA_SYSTEM_PROMPT },
              ...messages.map((m: ChatMessage) => ({ role: m.role || "user", content: m.content })),
            ],
            stream: false,
            options: { num_predict: 2000, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (ollamaRes.ok) {
          const data = await ollamaRes.json()
          const text = data.message?.content
          if (text && text.length > 10) {
            await recordUsageFromRequest({
              request: req,
              usageType: "AI_QUERY",
              quantity: 1,
              metadata: { model: OLLAMA_MODEL, provider: "ollama" },
            }).catch(() => {})
            return new Response(text)
          }
        }
      }
    } catch (e) {
      console.warn("[AI] Ollama fallback failed:", e)
    }

    return NextResponse.json(
      { error: "All AI providers are temporarily unavailable. Please try again shortly." },
      { status: 503 }
    )
  } catch (error) {
    console.error("AI route error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
