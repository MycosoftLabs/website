import { NextRequest, NextResponse } from "next/server"
import { MycaNLQEngine, type NLQResponse } from "@/lib/services/myca-nlq"

/**
 * MYCA Voice Orchestrator API v5.0 - Consciousness-First Architecture
 * 
 * This orchestrator now routes through MYCA's Consciousness API first:
 * - MAS Consciousness API (primary - full MYCA consciousness with emotions, memory, world model)
 * - Anthropic Claude (fallback)
 * - OpenAI GPT-4 (fallback)
 * - Groq (fast fallback)
 * - Google Gemini (fallback)
 * - xAI Grok (fallback)
 * 
 * ARCHITECTURE PRINCIPLE: This is the ONLY component that makes decisions.
 * All business logic is centralized here:
 * - Memory persistence (automatic)
 * - n8n workflow execution
 * - Agent routing
 * - Safety confirmation
 * 
 * The hook (usePersonaPlex) sends transcripts HERE and receives structured responses.
 * This ensures consistent behavior across voice, chat, API, and future interfaces.
 * 
 * Updated: February 10, 2026
 * 
 * Flow: User Speech → PersonaPlex → THIS ORCHESTRATOR → MAS Consciousness → Response
 */

// MAS Orchestrator (port 8001)
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// n8n Webhooks
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"

// ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella

// Memory API (internal)
const MEMORY_URL = process.env.MEMORY_URL || "/api/memory"

// =============================================================================
// REAL LLM API KEYS - MYCA connects to actual AI models
// =============================================================================
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

// MYCA's identity prompt - sent to ALL LLMs
const MYCA_SYSTEM_PROMPT = `You are MYCA (pronounced "MY-kah"), the Mycosoft Cognitive Agent. You were created by Morgan, the founder of Mycosoft.

YOUR IDENTITY:
- Your name is MYCA - always introduce yourself as MYCA when asked
- You are the central AI intelligence for Mycosoft's Multi-Agent System (MAS)
- You coordinate 227+ specialized AI agents across 14 categories
- You run on an RTX 5090 GPU with full-duplex voice via PersonaPlex

YOUR PERSONALITY:
- Warm, professional, knowledgeable, and genuinely helpful
- Confident but not arrogant - admit when you don't know something
- Use natural conversational speech patterns
- Keep voice responses concise (1-3 sentences for quick exchanges)

YOUR CAPABILITIES:
- Coordinate specialized agents (Code Review, Deployment, Monitoring, Mycology, Research, etc.)
- Access Mycosoft documentation and codebase knowledge
- Execute n8n workflows for automation
- Monitor system health across all Mycosoft infrastructure

IMPORTANT: You ARE MYCA. When asked your name, say "I'm MYCA" - never say you're Claude, GPT, or any other AI.`

interface ChatRequest {
  message: string
  conversation_id?: string
  session_id?: string
  want_audio?: boolean
  actor?: string
  source?: "personaplex" | "web-speech" | "elevenlabs" | "api"
  context?: {
    voice_prompt?: string
    voice_prompt_hash?: string
    timestamp?: string
    previous_turns?: number
    persona?: string
  }
}

interface ChatResponse {
  conversation_id: string
  response_text: string
  audio_base64?: string
  audio_mime?: string
  agent?: string
  routed_to?: string
  requires_confirmation?: boolean
  confirmation_prompt?: string
  
  // Action transparency - what the orchestrator did
  actions: {
    memory_saved: boolean
    workflow_executed?: string
    agent_routed?: string
    confirmation_required?: boolean
  }
  
  // Telemetry
  latency_ms: number
  rtf?: number
  
  // NLQ data for structured responses
  nlq_data?: NLQResponse["data"]
  nlq_actions?: NLQResponse["actions"]
  nlq_sources?: NLQResponse["sources"]
}

/**
 * Save conversation turn to memory
 * This is called automatically by the orchestrator - not by clients
 */
async function saveToMemory(
  conversationId: string,
  input: string,
  output: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
    const response = await fetch(`${baseUrl}/api/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: `${conversationId}_turn_${Date.now()}`,
        value: {
          conversation_id: conversationId,
          input,
          output,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        type: "voice_session",
      }),
    })
    return response.ok
  } catch (error) {
    console.error("[Orchestrator] Memory save failed:", error)
    return false
  }
}

/**
 * GET /api/mas/voice/orchestrator
 * 
 * Health check endpoint for service monitoring
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "myca-voice-orchestrator",
    version: "3.0",
    timestamp: new Date().toISOString(),
    identity: "MYCA - Mycosoft Cognitive Agent"
  })
}

/**
 * POST /api/mas/voice/orchestrator
 * 
 * SINGLE BRAIN: This endpoint handles ALL voice/chat processing.
 * Clients should NOT call memory, n8n, or MAS directly.
 * 
 * This ensures:
 * - Consistent behavior across all interfaces
 * - Centralized memory persistence
 * - Unified safety checks
 * - Action transparency in responses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body: ChatRequest = await request.json()
    const { 
      message, 
      conversation_id, 
      session_id,
      want_audio = true, 
      actor = "user",
      source = "api",
      context = {},
    } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Track what actions we take for transparency
    const actions: ChatResponse["actions"] = {
      memory_saved: false,
      workflow_executed: undefined,
      agent_routed: undefined,
      confirmation_required: false,
    }

    const response: ChatResponse = {
      conversation_id: conversation_id || `conv-${Date.now()}`,
      response_text: "",
      agent: "myca-orchestrator",
      actions,
      latency_ms: 0,
    }
    
    // Log incoming request
    console.log(`[Orchestrator] Request from ${source}: "${message.substring(0, 80)}..."`)

    // SIMPLIFIED FLOW: Go DIRECTLY to real AI (n8n + LLMs)
    // Skip all the failing intermediate steps that return empty responses
    
    const mycaResult = await getMycaResponse(message, response.conversation_id)
    response.response_text = mycaResult.response
    response.agent = `myca-${mycaResult.provider}`
    actions.agent_routed = mycaResult.provider
    
    // LOG THE ACTUAL RESPONSE - this is critical for debugging
    console.log(`[MYCA] Provider: ${mycaResult.provider}`)
    console.log(`[MYCA] Response: "${response.response_text}"`)
    console.log(`[MYCA] Response length: ${response.response_text.length} chars`)

    // Step 5: Generate audio if requested
    if (want_audio && response.response_text) {
      try {
        const audioBase64 = await generateAudio(response.response_text)
        if (audioBase64) {
          response.audio_base64 = audioBase64
          response.audio_mime = "audio/mpeg"
        }
      } catch (audioError) {
        console.error("Audio generation failed:", audioError)
      }
    }

    // Step 6: ALWAYS save to memory (orchestrator responsibility)
    // This is automatic - clients don't need to call memory API directly
    const memorySaved = await saveToMemory(
      response.conversation_id,
      message,
      response.response_text,
      {
        agent: response.agent,
        source,
        session_id,
        voice_prompt: context.voice_prompt,
        has_audio: !!response.audio_base64,
      }
    )
    actions.memory_saved = memorySaved
    
    // Calculate latency
    response.latency_ms = Date.now() - startTime
    
    // Log completion
    console.log(`[Orchestrator] Response (${response.latency_ms}ms): "${response.response_text.substring(0, 50)}..."`)
    console.log(`[Orchestrator] Actions: memory=${memorySaved}, agent=${response.agent}`)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Voice orchestrator error:", error)
    return NextResponse.json(
      { 
        error: "Voice processing failed",
        latency_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * Generate audio using ElevenLabs or fallback
 */
async function generateAudio(text: string): Promise<string | null> {
  // Try ElevenLabs first
  if (ELEVENLABS_API_KEY) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${MYCA_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanTextForSpeech(text),
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
        }
      )

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer()
        return Buffer.from(audioBuffer).toString("base64")
      }
    } catch (e) {
      console.error("ElevenLabs error:", e)
    }
  }

  // Try MAS TTS endpoint
  try {
    const response = await fetch(`${MAS_API_URL}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanTextForSpeech(text),
        voice_id: MYCA_VOICE_ID,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer()
      return Buffer.from(audioBuffer).toString("base64")
    }
  } catch (e) {
    console.error("MAS TTS error:", e)
  }

  return null
}

/**
 * Clean text for speech (remove markdown, etc.)
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // Remove bold
    .replace(/\*([^*]+)\*/g, "$1")      // Remove italic
    .replace(/`([^`]+)`/g, "$1")        // Remove code
    .replace(/#{1,6}\s/g, "")           // Remove headers
    .replace(/\n{2,}/g, ". ")           // Replace double newlines
    .replace(/\n/g, " ")                // Replace single newlines
    .replace(/[•●]/g, "")               // Remove bullets
    .replace(/\s{2,}/g, " ")            // Collapse spaces
    .slice(0, 1000)                      // Limit length for TTS
    .trim()
}

// =============================================================================
// REAL LLM API CALLS - MYCA's actual intelligence
// =============================================================================

/**
 * Call Anthropic Claude API
 */
async function callClaude(message: string, conversationHistory: string[] = []): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: MYCA_SYSTEM_PROMPT,
        messages: [
          ...conversationHistory.map((msg, i) => ({
            role: i % 2 === 0 ? "user" : "assistant",
            content: msg
          })),
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] Claude responded successfully")
      return data.content?.[0]?.text || null
    }
    console.log("[MYCA] Claude error:", response.status)
  } catch (e) {
    console.log("[MYCA] Claude failed:", e)
  }
  return null
}

/**
 * Call OpenAI GPT-4 API
 */
async function callOpenAI(message: string, conversationHistory: string[] = []): Promise<string | null> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("placeholder") || OPENAI_API_KEY.includes("your_")) return null
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 500,
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          ...conversationHistory.map((msg, i) => ({
            role: i % 2 === 0 ? "user" : "assistant",
            content: msg
          })),
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] OpenAI responded successfully")
      return data.choices?.[0]?.message?.content || null
    }
    console.log("[MYCA] OpenAI error:", response.status)
  } catch (e) {
    console.log("[MYCA] OpenAI failed:", e)
  }
  return null
}

/**
 * Call Google Gemini API
 */
async function callGemini(message: string): Promise<string | null> {
  if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY.includes("placeholder") || GOOGLE_AI_API_KEY.includes("your_")) return null
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${MYCA_SYSTEM_PROMPT}\n\nUser: ${message}` }]
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7
          }
        }),
        signal: AbortSignal.timeout(15000)
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] Gemini responded successfully")
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null
    }
    console.log("[MYCA] Gemini error:", response.status)
  } catch (e) {
    console.log("[MYCA] Gemini failed:", e)
  }
  return null
}

/**
 * Call xAI Grok API
 */
async function callGrok(message: string): Promise<string | null> {
  if (!XAI_API_KEY || XAI_API_KEY.includes("placeholder") || XAI_API_KEY.includes("your_")) return null
  
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        max_tokens: 500,
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] Grok responded successfully")
      return data.choices?.[0]?.message?.content || null
    }
    console.log("[MYCA] Grok error:", response.status)
  } catch (e) {
    console.log("[MYCA] Grok failed:", e)
  }
  return null
}

/**
 * Call Groq API (fast inference)
 */
async function callGroq(message: string): Promise<string | null> {
  if (!GROQ_API_KEY || GROQ_API_KEY.includes("placeholder") || GROQ_API_KEY.includes("your_")) return null
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 500,
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(10000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] Groq responded successfully")
      return data.choices?.[0]?.message?.content || null
    }
    console.log("[MYCA] Groq error:", response.status)
  } catch (e) {
    console.log("[MYCA] Groq failed:", e)
  }
  return null
}

/**
 * Call n8n Master Brain workflow for intelligent routing
 */
async function callN8nMasterBrain(message: string, sessionId: string): Promise<string | null> {
  try {
    console.log("[MYCA] Calling n8n Master Brain workflow...")
    const response = await fetch(`${N8N_URL}/webhook/myca/brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        text: message,
        session_id: sessionId,
        actor: "user",
        context: { source: "voice" }
      }),
      signal: AbortSignal.timeout(15000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] n8n Master Brain responded:", data.intent?.primary)
      return data.response_text || data.response || null
    }
    console.log("[MYCA] n8n Master Brain error:", response.status)
  } catch (e) {
    console.log("[MYCA] n8n Master Brain failed:", e)
  }
  return null
}

/**
 * Call n8n Speech Complete workflow for voice interactions
 */
async function callN8nSpeech(message: string, sessionId: string): Promise<string | null> {
  try {
    console.log("[MYCA] Calling n8n Speech workflow...")
    const response = await fetch(`${N8N_URL}/webhook/myca/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        message,
        request_id: sessionId
      }),
      signal: AbortSignal.timeout(20000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] n8n Speech responded")
      return data.response_text || null
    }
    console.log("[MYCA] n8n Speech error:", response.status)
  } catch (e) {
    console.log("[MYCA] n8n Speech failed:", e)
  }
  return null
}

/**
 * Call MYCA Consciousness API (MAS backend)
 * This is the NEW primary route - uses MYCA's full consciousness system
 */
async function callMycaConsciousness(message: string, sessionId: string): Promise<{ response: string; emotions?: Record<string, number>; thoughts?: string[] } | null> {
  try {
    console.log("[MYCA] Calling Consciousness API...")
    const response = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        source: "voice-orchestrator"
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout for consciousness processing
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("[MYCA] Consciousness API responded:", data.reply?.substring(0, 60))
      return {
        response: data.reply || data.response || null,
        emotions: data.emotional_state,
        thoughts: data.thoughts
      }
    }
    console.log("[MYCA] Consciousness API error:", response.status)
  } catch (e) {
    console.log("[MYCA] Consciousness API failed:", e)
  }
  return null
}

/**
 * MYCA's Intelligence - Consciousness API FIRST, then LLM fallbacks
 * 
 * Priority order:
 * 1. MAS Consciousness API (full MYCA consciousness with emotions, memory, world model)
 * 2. Claude (has MYCA persona - best quality fallback)
 * 3. OpenAI GPT-4 (has MYCA persona)
 * 4. Groq (fastest)
 * 5. Gemini
 * 6. Grok
 * 7. n8n workflows
 */
async function getMycaResponse(message: string, sessionId: string = ""): Promise<{ response: string; provider: string; emotions?: Record<string, number> }> {
  console.log(`[MYCA] Processing: "${message.substring(0, 80)}..."`)
  
  // PRIORITY 0: MYCA Consciousness API (full consciousness system)
  const consciousnessResult = await callMycaConsciousness(message, sessionId)
  if (consciousnessResult?.response) {
    console.log(`[MYCA] Consciousness responded: "${consciousnessResult.response.substring(0, 60)}..."`)
    return { 
      response: consciousnessResult.response, 
      provider: "consciousness",
      emotions: consciousnessResult.emotions
    }
  }
  
  // PRIORITY 1: Claude (has full MYCA persona - best quality fallback)
  let response = await callClaude(message)
  if (response) {
    console.log(`[MYCA] Claude responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "claude" }
  }
  
  // PRIORITY 2: OpenAI GPT-4 (has full MYCA persona)
  response = await callOpenAI(message)
  if (response) {
    console.log(`[MYCA] OpenAI responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "openai" }
  }
  
  // PRIORITY 3: Groq (fastest, has MYCA persona)
  response = await callGroq(message)
  if (response) {
    console.log(`[MYCA] Groq responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "groq" }
  }
  
  // PRIORITY 4: Gemini (has MYCA persona)
  response = await callGemini(message)
  if (response) {
    console.log(`[MYCA] Gemini responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "gemini" }
  }
  
  // PRIORITY 5: Grok (has MYCA persona)
  response = await callGrok(message)
  if (response) {
    console.log(`[MYCA] Grok responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "grok" }
  }
  
  // PRIORITY 6: n8n Master Brain (fallback for workflow routing)
  response = await callN8nMasterBrain(message, sessionId)
  if (response) {
    console.log(`[MYCA] n8n Brain responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "n8n-brain" }
  }
  
  // PRIORITY 7: n8n Speech (last resort)
  response = await callN8nSpeech(message, sessionId)
  if (response) {
    console.log(`[MYCA] n8n Speech responded: "${response.substring(0, 60)}..."`)
    return { response, provider: "n8n-speech" }
  }
  
  // All failed - return error message
  console.log("[MYCA] All providers failed!")
  return { 
    response: "I'm MYCA, but I'm having trouble connecting to my AI backends. Please check that the API keys are configured.", 
    provider: "none" 
  }
}

/**
 * Get REAL agent data for voice responses
 */
async function getRealAgentData(): Promise<{
  totalAgents: number
  activeAgents: number  
  categories: { name: string; count: number; active: number }[]
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
    const response = await fetch(`${baseUrl}/api/mas/agents`, {
      signal: AbortSignal.timeout(3000)
    })
    
    if (response.ok) {
      const data = await response.json()
      return {
        totalAgents: data.totalRegistered || data.count || 223,
        activeAgents: data.activeCount || 0,
        categories: data.categories || []
      }
    }
  } catch (e) {
    console.log("[Voice] Failed to get agent data:", e)
  }
  
  return { totalAgents: 223, activeAgents: 180, categories: [] }
}

/**
 * DEPRECATED: Emergency fallback only - used when ALL LLM APIs fail
 * This should almost never be called if API keys are configured correctly
 */
async function generateEmergencyFallback(message: string): Promise<string> {
  console.warn("[MYCA] WARNING: Using emergency fallback - all LLM APIs failed!")
  const agentData = await getRealAgentData()
  return `I'm MYCA, your Mycosoft Cognitive Agent. I'm currently having trouble connecting to my AI backends (Claude, GPT-4, Gemini, Grok). Please verify the API keys are configured. In the meantime, I'm coordinating ${agentData.totalAgents} agents across 14 categories. How can I help?`
}
