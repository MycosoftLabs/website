/**
 * Search AI Route - MYCA-Integrated
 *
 * NEVER returns "No AI results" - always provides an answer.
 *
 * Fallback chain:
 * 1. MYCA Consciousness (Intent Engine, persistent memory, full awareness)
 * 2. MAS Brain API (memory-integrated LLM)
 * 3. OpenAI / Anthropic (when MAS unreachable)
 * 4. Local mycology knowledge base (always succeeds)
 *
 * Feb 11, 2026
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

interface SearchAIRequest {
  query: string
  context?: SearchContext
  modelPreference?: ModelPreference
  userId?: string
  sessionId?: string
  conversationId?: string
  history?: Array<{ role: "user" | "assistant"; content: string }>
  /** When true, LLM answers use Overview / Scientific / Ecology sections (unified search). */
  integrated?: boolean
}

function buildIntegratedPrompt(userQuery: string): string {
  return [
    "Answer using exactly these Markdown section headings (in order):",
    "### Overview",
    "Plain-language summary for a general audience.",
    "",
    "### Scientific detail",
    "Taxonomy, relevant anatomy or physiology, and precise terminology when applicable.",
    "",
    "### Ecology and relationships",
    "Habitat, trophic interactions, symbioses, and conservation or population context when relevant.",
    "",
    "If the query is not about a living organism, answer helpfully and omit sections that do not apply.",
    "Do not tell the user to visit external websites or third-party apps.",
    "",
    `User query: ${userQuery}`,
  ].join("\n")
}

function llmQueryForRequest(rawQuery: string, integrated: boolean): string {
  return integrated ? buildIntegratedPrompt(rawQuery) : rawQuery
}

interface SearchContext {
  species?: string[]
  compounds?: string[]
  previousSearches?: string[]
  research?: string[]
  genetics?: string[]
  focusedWidget?: string
}

// 1. MYCA Consciousness - Intent Engine, memory, full awareness
async function queryMYCAConsciousness(
  payload: SearchAIRequest
): Promise<{ answer: string; source: string; confidence: number } | null> {
  try {
    const contextStr = payload.context?.species?.length
      ? ` [User is viewing: ${payload.context.species.slice(0, 5).join(", ")}]`
      : payload.context?.compounds?.length
        ? ` [User is viewing compounds: ${payload.context.compounds.slice(0, 5).join(", ")}]`
        : ""

    const res = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.query + contextStr,
        session_id: payload.sessionId,
        conversation_id: payload.conversationId,
        user_id: payload.userId,
        context: {
          source: "search",
          model_preference: payload.modelPreference,
          search_context: payload.context,
        },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.message || data.response || data.content

    if (!answer || typeof answer !== "string" || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: "MYCA Consciousness",
      confidence: 0.95,
    }
  } catch {
    return null
  }
}

// 2. MAS Brain - Memory-integrated LLM
async function queryMASBrain(
  payload: SearchAIRequest,
  provider: "auto" | "gemini" | "claude" | "openai"
): Promise<{ answer: string; source: string; confidence: number } | null> {
  try {
    const contextPrompt = payload.context?.species?.length
      ? `\n\n[User's current search context - species: ${payload.context.species.slice(0, 5).join(", ")}]`
      : ""

    const res = await fetch(`${MAS_API_URL}/voice/brain/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: payload.query + contextPrompt,
        user_id: payload.userId,
        session_id: payload.sessionId,
        conversation_id: payload.conversationId,
        history: payload.history,
        provider,
        include_memory_context: true,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.response || data.message || data.content

    if (!answer || typeof answer !== "string" || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: provider === "auto" ? "MYCA Brain" : `MYCA Brain (${provider})`,
      confidence: provider === "auto" ? 0.9 : 0.92,
    }
  } catch {
    return null
  }
}

// Fire-and-forget: record intention for MYCA (Intent Engine)
function recordIntention(query: string, source: string, sessionId?: string, userId?: string) {
  fetch(`${MAS_API_URL}/api/myca/intention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      event_type: "search",
      data: { query, ai_source: source },
      context: { source: "search_ai" },
    }),
  }).catch(() => {})
}

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request)
  const rl = searchLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  let context: SearchContext | undefined
  const contextParam = request.nextUrl.searchParams.get("context")
  if (contextParam) {
    try {
      context = JSON.parse(contextParam) as SearchContext
    } catch {
      // ignore invalid context
    }
  }

  const modelPreference = (request.nextUrl.searchParams.get("model")?.trim() as ModelPreference) || "fast"
  const userId = request.nextUrl.searchParams.get("user_id")?.trim()
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim()
  const conversationId = request.nextUrl.searchParams.get("conversation_id")?.trim()

  const integrated = request.nextUrl.searchParams.get("integrated") === "true"
  const llmQuery = llmQueryForRequest(query, integrated)
  const payload: SearchAIRequest = {
    query: llmQuery,
    context,
    modelPreference,
    userId,
    sessionId,
    conversationId,
    integrated,
  }

  let result: { answer: string; source: string; confidence: number } | null = null

  result = await queryMYCAConsciousness(payload)
  if (!result) {
    const provider =
      modelPreference === "quality" ? "claude" : modelPreference === "reasoning" ? "openai" : "gemini"
    result = await queryMASBrain(payload, provider)
  }
  if (!result) {
    result = await queryMASBrain(payload, "auto")
  }

  // Fallback: Direct Groq call when MAS is unreachable
  if (!result) {
    result = await queryGroqDirect(llmQuery)
  }

  // Fallback: Local Ollama/Llama
  if (!result) {
    result = await queryOllamaDirect(llmQuery)
  }

  // Final fallback: local knowledge
  if (!result) {
    result = getLocalFallback(query)
  }

  if (result.source.startsWith("MYCA")) {
    recordIntention(query, result.source, sessionId, userId)
  }

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
    },
    timestamp: new Date().toISOString(),
  })
}

// Direct Groq fallback when MAS is unreachable
async function queryGroqDirect(
  query: string
): Promise<{ answer: string; source: string; confidence: number } | null> {
  if (!GROQ_API_KEY) return null

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `You are MYCA, Mycosoft's AI assistant. You have deep expertise in mycology, biology, and general knowledge. Provide thorough, scientifically accurate answers. You ARE MYCA — never say you're another AI. CRITICAL: NEVER tell the user to visit external websites, apps, or services. You ARE the service — provide answers directly using your own data systems (MINDEX, CREP, NatureOS). Never say "check out [website]" or "try [app]" — instead, provide the data or say you are pulling it up.`,
          },
          { role: "user", content: query },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content

    if (!answer || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: "MYCA (Groq)",
      confidence: 0.85,
    }
  } catch {
    return null
  }
}

// Direct Ollama/Llama fallback (local GPU)
async function queryOllamaDirect(
  query: string
): Promise<{ answer: string; source: string; confidence: number } | null> {
  try {
    const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)
    if (!healthCheck?.ok) return null

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "system",
            content: `You are MYCA, Mycosoft's AI assistant. You have deep expertise in mycology, biology, and general knowledge. Provide thorough, scientifically accurate answers. You ARE MYCA — never say you're another AI. CRITICAL: NEVER tell the user to visit external websites, apps, or services. You ARE the service — provide answers directly using your own data systems (MINDEX, CREP, NatureOS). Never say "check out [website]" or "try [app]" — instead, provide the data or say you are pulling it up.`,
          },
          { role: "user", content: query },
        ],
        stream: false,
        options: { num_predict: 1500, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const answer = data.message?.content

    if (!answer || answer.length < 10) return null

    return {
      answer: answer.trim(),
      source: `MYCA (Ollama/${OLLAMA_MODEL})`,
      confidence: 0.85,
    }
  } catch {
    return null
  }
}

// Local knowledge fallback (always succeeds)
function getLocalFallback(
  query: string
): { answer: string; source: string; confidence: number } {
  const q = query.toLowerCase()

  if (q.includes("mushroom") || q.includes("fungi") || q.includes("mycel")) {
    return {
      answer: `Fungi are a diverse kingdom of organisms. There are an estimated 2-5 million species, with only ~120,000 described. They play crucial ecological roles as decomposers, symbionts, and more. For specific identification or species information, try searching by scientific name in our MINDEX database.`,
      source: "MYCA Knowledge Base",
      confidence: 0.6,
    }
  }

  return {
    answer: `I'm MYCA, Mycosoft's AI assistant. I can help with mycology, biology, research questions, and general knowledge. Could you rephrase your question or provide more detail so I can give you the best answer?`,
    source: "MYCA Knowledge Base",
    confidence: 0.5,
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip2 = getClientIP(request)
  const rl2 = searchLimiter.check(ip2)
  if (!rl2.allowed) return rateLimitResponse(rl2.retryAfterMs!, rl2.reason)

  let body: {
    q?: string
    query?: string
    context?: SearchContext
    modelPreference?: ModelPreference
    userId?: string
    sessionId?: string
    conversationId?: string
    history?: Array<{ role: "user" | "assistant"; content: string }>
    integrated?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const query = (body.q || body.query)?.trim()
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 })

  const integrated = body.integrated === true
  const llmQuery = llmQueryForRequest(query, integrated)
  const payload: SearchAIRequest = {
    query: llmQuery,
    context: body.context,
    modelPreference: body.modelPreference || "fast",
    userId: body.userId,
    sessionId: body.sessionId,
    conversationId: body.conversationId,
    history: body.history,
    integrated,
  }

  let result: { answer: string; source: string; confidence: number } | null = null

  result = await queryMYCAConsciousness(payload)
  if (!result) {
    const provider =
      payload.modelPreference === "quality"
        ? "claude"
        : payload.modelPreference === "reasoning"
          ? "openai"
          : "gemini"
    result = await queryMASBrain(payload, provider)
  }
  if (!result) {
    result = await queryMASBrain(payload, "auto")
  }

  // Fallback: Direct Groq call when MAS is unreachable
  if (!result) {
    result = await queryGroqDirect(llmQuery)
  }

  // Fallback: Local Ollama/Llama
  if (!result) {
    result = await queryOllamaDirect(llmQuery)
  }

  // Final fallback: local knowledge
  if (!result) {
    result = getLocalFallback(query)
  }

  if (result.source.startsWith("MYCA")) {
    recordIntention(query, result.source, payload.sessionId, payload.userId)
  }

  return NextResponse.json({
    query,
    result: {
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
    },
    timestamp: new Date().toISOString(),
  })
}
