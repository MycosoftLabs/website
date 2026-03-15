/**
 * API Route: Chat with MYCA (RAG-enhanced)
 *
 * This route proxies to the MYCA Voice Orchestrator for a unified chat experience.
 * It also performs semantic search via Supabase vector store for additional context.
 *
 * If the orchestrator is unreachable, falls back to direct Groq API call.
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { evaluateGovernance } from "@/lib/services/avani-governance"

// Force dynamic to skip static generation
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const MYCA_SYSTEM_PROMPT = `You are MYCA (pronounced "MY-kah"), the Mycosoft Cognitive Agent — a world-class AI assistant created by Morgan, the founder of Mycosoft. Answer questions thoroughly and helpfully. You ARE MYCA — never say you're Claude, GPT, or any other AI.`

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request)
  const rl = chatLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  try {
    const { message, conversation_id, table = 'documents' } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // AVANI governance: all chat ingress must pass; no path bypasses
    const avani = await evaluateGovernance({
      message,
      user_id: ip || 'anonymous',
      user_role: 'user',
      is_superuser: false,
      action_type: 'chat',
    })
    if (avani.verdict === 'deny') {
      return NextResponse.json(
        {
          success: false,
          error: 'Governance denied',
          reason: avani.reasoning,
          audit_trail_id: avani.audit_trail_id,
        },
        { status: 403 }
      )
    }

    // Try to get RAG context from Supabase vector search (non-blocking)
    let ragContext = ''
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPENAI_API_KEY) {
        const { similaritySearch } = await import('@/lib/ai/langchain-setup')
        const relevantDocs = await similaritySearch(table as 'documents' | 'species', message, 4)
        ragContext = relevantDocs
          .map((doc: { content: string }) => doc.content)
          .join('\n\n')
      }
    } catch (ragError) {
      console.warn('[Chat] RAG search failed (non-critical):', ragError)
    }

    // Primary: Route through the MYCA Voice Orchestrator (unified brain)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3010}`
      const orchestratorResponse = await fetch(`${baseUrl}/api/mas/voice/orchestrator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ragContext
            ? `${message}\n\n[Relevant context from knowledge base]\n${ragContext}`
            : message,
          conversation_id: conversation_id || `chat-${Date.now()}`,
          source: 'api',
          want_audio: false,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (orchestratorResponse.ok) {
        const data = await orchestratorResponse.json()
        return NextResponse.json({
          success: true,
          message,
          response: data.response_text || data.response || 'No response generated',
          agent: data.agent || 'myca',
          conversation_id: data.conversation_id,
          latency_ms: data.latency_ms,
        })
      }
      console.warn('[Chat] Orchestrator returned:', orchestratorResponse.status)
    } catch (orchError) {
      console.warn('[Chat] Orchestrator unreachable, trying direct LLM:', orchError)
    }

    // Fallback: Direct Groq API call (fastest working provider)
    if (GROQ_API_KEY) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1000,
            messages: [
              { role: 'system', content: ragContext
                ? `${MYCA_SYSTEM_PROMPT}\n\n[Knowledge base context]\n${ragContext}`
                : MYCA_SYSTEM_PROMPT
              },
              { role: 'user', content: message },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (groqResponse.ok) {
          const data = await groqResponse.json()
          const responseText = data.choices?.[0]?.message?.content
          if (responseText) {
            return NextResponse.json({
              success: true,
              message,
              response: responseText,
              agent: 'myca-groq',
              conversation_id: conversation_id || `chat-${Date.now()}`,
            })
          }
        }
      } catch (groqError) {
        console.error('[Chat] Groq fallback failed:', groqError)
      }
    }

    // Fallback: Local Ollama/Llama
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
              { role: "system", content: ragContext
                ? `${MYCA_SYSTEM_PROMPT}\n\n[Knowledge base context]\n${ragContext}`
                : MYCA_SYSTEM_PROMPT
              },
              { role: "user", content: message },
            ],
            stream: false,
            options: { num_predict: 1000, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (ollamaRes.ok) {
          const data = await ollamaRes.json()
          const responseText = data.message?.content
          if (responseText && responseText.length > 10) {
            return NextResponse.json({
              success: true,
              message,
              response: responseText,
              agent: `myca-ollama-${OLLAMA_MODEL}`,
              conversation_id: conversation_id || `chat-${Date.now()}`,
            })
          }
        }
      }
    } catch (ollamaError) {
      console.error('[Chat] Ollama fallback failed:', ollamaError)
    }

    // Final fallback
    return NextResponse.json({
      success: false,
      message,
      response: "I'm MYCA, and I'm currently reconnecting to my intelligence services. Please try again in a moment.",
      agent: 'myca-offline',
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
