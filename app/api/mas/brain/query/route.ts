/**
 * MYCA Brain Query API - Feb 2026
 * 
 * Connects to the Frontier LLM Router for intelligent responses
 * Features:
 * - Multi-model fallback (Gemini -> Claude -> GPT -> Grok)
 * - Context-aware responses
 * - Memory integration
 */

import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 30

interface BrainQueryRequest {
  query: string
  context?: string
  history?: Array<{ role: string; content: string }>
  mode?: "conversational" | "search_answer" | "expert"
  stream?: boolean
}

interface BrainQueryResponse {
  response: string
  sources: string[]
  confidence: number
  model: string
  suggestedQuery?: string
  processingTime: number
}

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    const body: BrainQueryRequest = await request.json()
    const { query, context, history, mode = "conversational" } = body

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      )
    }

    // MYCA Brain backend URL
    const brainUrl = process.env.MYCA_BRAIN_URL || "http://192.168.0.188:8000"
    
    // Build the prompt based on mode
    const systemPrompt = buildSystemPrompt(mode)
    const fullContext = context ? `\n\nContext:\n${context}` : ""
    
    // Try Frontier LLM Router first
    try {
      const frontierResponse = await callFrontierRouter(
        brainUrl,
        query,
        systemPrompt,
        fullContext,
        history
      )
      
      return NextResponse.json({
        ...frontierResponse,
        processingTime: performance.now() - startTime,
      })
    } catch (frontierError) {
      console.warn("Frontier router failed, trying fallback:", frontierError)
    }

    // Fallback to direct Brain API if available
    try {
      const directResponse = await callDirectBrain(
        brainUrl,
        query,
        context,
        history
      )
      
      return NextResponse.json({
        ...directResponse,
        processingTime: performance.now() - startTime,
      })
    } catch (directError) {
      console.warn("Direct brain failed:", directError)
    }

    // Final fallback - basic response
    return NextResponse.json({
      response: "I apologize, but I'm having trouble connecting to the knowledge system right now. Please try again in a moment.",
      sources: [],
      confidence: 0,
      model: "fallback",
      processingTime: performance.now() - startTime,
    })
  } catch (error) {
    console.error("Brain query error:", error)
    return NextResponse.json(
      { 
        error: "Failed to process query",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Call the Frontier LLM Router
async function callFrontierRouter(
  brainUrl: string,
  query: string,
  systemPrompt: string,
  context: string,
  history?: Array<{ role: string; content: string }>
): Promise<Omit<BrainQueryResponse, "processingTime">> {
  const response = await fetch(`${brainUrl}/api/llm/frontier`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: query + context },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      fallback_chain: ["gemini", "claude", "gpt4", "grok"],
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) {
    throw new Error(`Frontier router error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    response: data.response || data.content || data.text || "",
    sources: data.sources || [],
    confidence: data.confidence || calculateConfidence(data),
    model: data.model || data.provider || "frontier",
    suggestedQuery: data.suggested_query,
  }
}

// Call the direct Brain API
async function callDirectBrain(
  brainUrl: string,
  query: string,
  context?: string,
  history?: Array<{ role: string; content: string }>
): Promise<Omit<BrainQueryResponse, "processingTime">> {
  const response = await fetch(`${brainUrl}/api/brain/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      context: context || "",
      conversation_history: history || [],
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!response.ok) {
    throw new Error(`Direct brain error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    response: data.response || data.answer || "",
    sources: data.sources || [],
    confidence: data.confidence || 0.7,
    model: data.model || "myca-brain",
  }
}

// Build system prompt based on mode
function buildSystemPrompt(mode: string): string {
  const basePrompt = `You are MYCA, an expert AI assistant specialized in mycology, fungal biology, chemistry, and ecological research. You have access to the MINDEX database containing comprehensive information about fungal species, compounds, genetics, and research papers.`

  switch (mode) {
    case "search_answer":
      return `${basePrompt}

Provide concise, accurate answers based on the provided context. Focus on facts and cite your sources. If the information is not in the context, acknowledge that clearly.`

    case "expert":
      return `${basePrompt}

Provide detailed, expert-level analysis. Include relevant scientific terminology, chemical formulas, taxonomic classifications, and research citations. Discuss nuances and edge cases where relevant.`

    case "conversational":
    default:
      return `${basePrompt}

Be helpful, informative, and engaging. Explain complex concepts in accessible terms while maintaining scientific accuracy. Ask clarifying questions when needed and suggest related topics the user might find interesting.`
  }
}

// Calculate confidence based on response characteristics
function calculateConfidence(data: any): number {
  let confidence = 0.5
  
  // Higher confidence if response is longer and detailed
  if (data.response?.length > 500) confidence += 0.1
  if (data.response?.length > 1000) confidence += 0.1
  
  // Higher confidence if sources are provided
  if (data.sources?.length > 0) confidence += 0.1
  if (data.sources?.length > 2) confidence += 0.1
  
  // Cap at 0.95
  return Math.min(confidence, 0.95)
}
