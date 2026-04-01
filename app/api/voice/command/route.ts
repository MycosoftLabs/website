/**
 * Voice Command Proxy Route
 *
 * Proxies voice commands to MAS VoiceCommandRouter.
 * Falls back to Groq-based intent classification when MAS is unreachable.
 */

import { NextRequest, NextResponse } from "next/server"
import { voiceLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || "http://localhost:8001"
const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request)
  const rl = voiceLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  try {
    const body = await request.json()
    const text = body.text?.trim()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Try MAS first
    try {
      const response = await fetch(`${MAS_URL}/voice/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          session_id: body.session_id,
          user_id: body.user_id,
          source: body.source || "website",
          context: body.context,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch {
      // MAS unreachable, fall through to Groq
    }

    // Fallback: Groq-based intent classification
    if (GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 500,
            temperature: 0.1,
            messages: [
              {
                role: "system",
                content: `You are a voice command classifier for MYCA. Given a user voice command, classify it into one of these domains: earth2 (weather/forecasts), map (navigation/locations), crep (satellite data/layers), system (system control/status), chat (general conversation/questions). Return JSON: {"domain":"<domain>","action":"<action>","parameters":{...},"response":"<brief response>"}`,
              },
              { role: "user", content: text },
            ],
          }),
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const data = await res.json()
          const content = data.choices?.[0]?.message?.content || ""
          try {
            const parsed = JSON.parse(content)
            return NextResponse.json({
              success: true,
              domain: parsed.domain || "chat",
              action: parsed.action || "respond",
              parameters: parsed.parameters || {},
              response: parsed.response || "Command processed.",
              source: "groq-fallback",
            })
          } catch {
            return NextResponse.json({
              success: true,
              domain: "chat",
              action: "respond",
              response: content,
              source: "groq-fallback",
            })
          }
        }
      } catch {
        // Groq failed too
      }
    }

    // Fallback: Local Ollama/Llama intent classification
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.3"
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
                content: `You are a voice command classifier for MYCA. Given a user voice command, classify it into one of these domains: earth2 (weather/forecasts), map (navigation/locations), crep (satellite data/layers), system (system control/status), chat (general conversation/questions). Return JSON: {"domain":"<domain>","action":"<action>","parameters":{...},"response":"<brief response>"}`,
              },
              { role: "user", content: text },
            ],
            stream: false,
            options: { num_predict: 500, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(15000),
        })
        if (ollamaRes.ok) {
          const data = await ollamaRes.json()
          const content = data.message?.content || ""
          try {
            const parsed = JSON.parse(content)
            return NextResponse.json({
              success: true,
              domain: parsed.domain || "chat",
              action: parsed.action || "respond",
              parameters: parsed.parameters || {},
              response: parsed.response || "Command processed.",
              source: "ollama-fallback",
            })
          } catch {
            return NextResponse.json({
              success: true,
              domain: "chat",
              action: "respond",
              response: content,
              source: "ollama-fallback",
            })
          }
        }
      }
    } catch {
      // Ollama failed too
    }

    // Final local fallback
    return NextResponse.json({
      success: true,
      domain: "chat",
      action: "respond",
      response: "I heard your command but my routing services are reconnecting. Try again in a moment.",
      source: "local-fallback",
      needs_llm_response: true,
    })
  } catch (error) {
    console.error("[Voice Command] Error:", error)
    return NextResponse.json(
      { success: false, error: "Voice command processing failed" },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return help/domains
  try {
    const response = await fetch(`${MAS_URL}/voice/command/domains`)
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    // Fallback domains
  }
  
  return NextResponse.json({
    domains: {
      earth2: { description: "Weather forecasts", examples: ["show forecast"] },
      map: { description: "Map navigation", examples: ["go to Tokyo", "zoom in"] },
      crep: { description: "CREP layers", examples: ["show satellites"] },
      system: { description: "System control", examples: ["system status"] },
    }
  })
}