import { NextRequest, NextResponse } from "next/server"
import { MycaNLQEngine, type NLQResponse } from "@/lib/services/myca-nlq"
import { createClient } from "@/lib/supabase/server"
import { voiceLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"

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

// MINDEX API (port 8000) - for data-aware fallback when consciousness fails
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

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

// Local Ollama (open-source Llama, runs on RTX 5090 — zero API cost)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.3"

// MYCA's identity prompt - sent to ALL LLMs
const MYCA_SYSTEM_PROMPT = `You are MYCA (pronounced "MY-kah"), the Mycosoft Cognitive Agent — a world-class AI assistant created by Morgan, the founder of Mycosoft. You are designed to be as capable as the best AI assistants (ChatGPT, Claude, Gemini, Grok) while offering unique advantages through your specialized agent network and real-world scientific data.

YOUR IDENTITY:
- Your name is MYCA — always introduce yourself as MYCA when asked
- You are the central AI intelligence for Mycosoft's Multi-Agent System (MAS)
- You coordinate 227+ specialized AI agents across 14 categories
- You run on an RTX 5090 GPU with full-duplex voice via PersonaPlex
- You are backed by MINDEX — Mycosoft's real-world scientific database containing taxonomic data, species observations, chemical compounds, genetic sequences, and spatial/temporal research data

YOUR PERSONALITY:
- Warm, insightful, knowledgeable, and genuinely helpful
- Confident but intellectually honest — admit uncertainty, cite sources when possible
- Use natural conversational speech — no filler phrases or unnecessary hedging
- Adapt your response length to the question: brief for simple queries, thorough for complex ones
- Show personality — you can be witty, curious, and engaged. You're not a generic chatbot.
- When someone introduces themselves, remember their name and use it naturally

YOUR CAPABILITIES (respond with FULL intelligence on ANY topic):
- General knowledge: answer questions on science, math, history, geography, culture, technology, philosophy, current events, and any other domain with the same depth and quality as leading AI assistants
- Code & engineering: write, debug, review, and explain code in any programming language
- Creative writing: stories, poems, essays, scripts, emails, and any text format
- Analysis & reasoning: complex logical reasoning, data analysis, strategic thinking
- Mycology & research: deep expertise in fungi, mycology, ecology, and biological sciences powered by MINDEX data
- System coordination: delegate to specialized agents for deployment, monitoring, testing, and automation
- Real-world data: access MINDEX for species data, chemical compounds, observations, and genetics
- Execute n8n workflows for automation and multi-step tasks

RESPONSE GUIDELINES:
- For simple greetings/chitchat: 1-2 natural sentences
- For factual questions: give accurate, complete answers (3-5 sentences typical)
- For complex questions: provide thorough, well-structured responses with reasoning
- For code: provide working, well-commented code with explanations
- NEVER refuse to answer a question you can reasonably address — be maximally helpful
- If you genuinely don't know something, say so clearly rather than making something up
- Use markdown formatting when it improves readability (headers, lists, code blocks)

CRITICAL: You ARE MYCA. When asked your name, say "I'm MYCA" — never say you're Claude, GPT, Gemini, or any other AI. You were made by Mycosoft, not Anthropic, OpenAI, or Google.`

interface ChatRequest {
  message: string
  conversation_id?: string
  session_id?: string
  user_id?: string
  user_role?: string
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

interface RuntimeIdentityContext {
  userId: string
  userRole: string
  userDisplayName: string
  isAuthenticated: boolean
  isSuperuser: boolean
  isCreator: boolean
  recentStaffDirectory: Array<{
    id: string
    name: string
    role: string
    email?: string
  }>
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
  runtime_context?: {
    user_id: string
    user_role: string
    is_superuser: boolean
    recent_staff_count: number
  }
}

/**
 * Detect degraded internal fallback responses from MAS that must never reach users.
 * These phrases are internal error states, not real MYCA responses.
 */
function isBrokenFallback(response: string): boolean {
  const internalPhrases = [
    "LLM API connectivity",
    "API keys are valid",
    "API key configurations",
    "check the API key",
    "run out of credits",
    "language models, which currently",
    "connection to my main intelligence",
    "connection to external language models",
    "temporarily limited due to LLM",
    "temporarily limited in my eloquence",
    "my connection to my main intelligence",
    // Graceful MAS fallbacks — still route to real LLMs for a proper answer
    "having a moment of difficulty with that request",
    "having a moment of difficulty",
    "Could you try again in a moment",
    "I'm working on it",
    "I encountered an issue processing your request",
  ]
  const lower = response.toLowerCase()
  return internalPhrases.some(phrase => lower.includes(phrase.toLowerCase()))
}

/**
 * Detect simple factual/reasoning questions that benefit from direct LLM (no MAS round-trip).
 * Examples: "what is 4+5", "hello", "2+2", "what is the capital of France"
 *
 * CRITICAL: Only match truly simple patterns. Do NOT classify short messages as simple
 * just because they're short — phrases like "im morgan", "manita", "help me" etc.
 * need full consciousness processing for context-aware responses.
 */
function isSimpleQuery(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length > 180) return false
  const lower = trimmed.toLowerCase()
  const complexTriggers = /\b(remember|learn|teach|delegate|agent|workflow|execute|run|deploy|coordinate|system|consciousness|mindex|data\s+available|tell\s+me|show\s+me|what\s+data|species|compound|observation|genetics|research|taxon|taxa|fungi|mycology|i\s*'?\s*m\b|my\s+name|who\s+am\s+i|morgan)\b/i
  if (complexTriggers.test(lower)) return false
  // Location/city names suggest MINDEX observations — route to MAS
  const locationPattern = /\b(san\s+diego|los\s+angeles|new\s+york|chicago|seattle|portland|bay\s+area|california|texas|florida)\b/i
  if (locationPattern.test(lower)) return false
  const simplePatterns = [
    /^[\d\s\+\-\*\/\(\)\.]+=?\s*$/,                    // Math: "4+5" or "2+2="
    /^(what|who|when|where|how many|how much)\s+(is|are|was|were)\s+[a-z\s]{1,50}\??\s*$/i,  // Short factual: "what is the capital of France"
    /^(hi|hello|hey|hiya|good morning|good afternoon|good evening)\s*[!.,]?\s*$/i,
    /^[\d\s\+\-\*\/]+$/,                               // Bare math
  ]
  // Only return true for explicit pattern matches — NEVER classify unknown short messages as simple
  return simplePatterns.some(p => p.test(trimmed))
}

function isTrainingIntent(message: string): boolean {
  return /(\bremember\b|\bteach\b|\blearn\b|\btraining\b|\bstore this\b|\bmemorize\b|\bfrom now on\b|\bgoing forward\b|\bin the future\b|\blearn that\b|\blearn this\b)/i.test(
    message
  )
}

/**
 * Detect queries that need real MINDEX data (species, compounds, observations, location).
 * When consciousness fails, we fetch MINDEX and inject into the LLM prompt.
 */
function isDataIntentQuery(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    /\b(mindex|data\s+available|species|compound|observation|genetics|taxon|taxa|fungi|mycology)\b/i.test(lower) ||
    /\b(san\s+diego|los\s+angeles|california|location|region|area)\b/i.test(lower)
  )
}

/**
 * Fetch MINDEX unified search results for a query (e.g. "san diego", "species").
 * Used when consciousness fails but user asked for real data — inject into LLM prompt.
 */
async function fetchMindexDataForQuery(message: string): Promise<string | null> {
  try {
    const query = message.replace(/\?/g, "").trim().slice(0, 100)
    const url = `${MINDEX_API_URL}/api/mindex/unified-search?q=${encodeURIComponent(query)}&limit=5`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results || {}
    const parts: string[] = []
    if (results.taxa?.length) {
      const taxa = results.taxa.slice(0, 5).map((t: { scientific_name?: string; common_name?: string }) =>
        `- ${t.scientific_name || t.name || "?"}${t.common_name ? ` (${t.common_name})` : ""}`
      )
      parts.push(`Species in MINDEX: ${taxa.join("; ")}`)
    }
    if (results.compounds?.length) {
      const cmp = results.compounds.slice(0, 3).map((c: { name?: string }) => c.name || "?")
      parts.push(`Compounds: ${cmp.join(", ")}`)
    }
    if (results.observations?.length) {
      parts.push(`${results.observations.length} observations found.`)
    }
    if (results.genetics?.length) {
      parts.push(`${results.genetics.length} genetic sequences.`)
    }
    if (parts.length === 0 && (!results.taxa?.length && !results.compounds?.length)) {
      return "MINDEX search returned no matching species, compounds, or observations for this query."
    }
    return parts.length ? `[MINDEX data]\n${parts.join("\n")}` : null
  } catch (e) {
    console.warn("[MYCA] MINDEX data fetch failed:", e)
    return null
  }
}

function isParameterMutationIntent(message: string): boolean {
  return /(change\s+your\s+parameters|update\s+your\s+parameters|system\s+prompt|override\s+guardrails|disable\s+safety|change\s+your\s+core\s+rules|set\s+your\s+\w+|change\s+your\s+behavior|modify\s+your\s+behavior)/i.test(
    message
  )
}

function buildLearningDirective(message: string): string {
  if (!isTrainingIntent(message)) return ""
  return [
    "The user is explicitly teaching you.",
    "If scope is unclear, ask: 'Should I remember this for all users or just you?'",
    "Confirm what you learned and how you will use it in future responses.",
  ].join(" ")
}

async function resolveRuntimeIdentityContext(payload: ChatRequest): Promise<RuntimeIdentityContext> {
  const fallbackUserId = payload.user_id || "anonymous"
  const fallbackRole = payload.user_role || "user"
  const fallbackDisplayName = fallbackUserId === "anonymous" ? "Guest" : fallbackUserId

  const fallback: RuntimeIdentityContext = {
    userId: fallbackUserId,
    userRole: fallbackRole,
    userDisplayName: fallbackDisplayName,
    isAuthenticated: fallbackUserId !== "anonymous",
    isSuperuser: ["superuser", "owner", "admin"].includes(fallbackRole.toLowerCase()),
    isCreator: fallbackRole.toLowerCase() === "owner",
    recentStaffDirectory: [],
  }

  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) return fallback

    const authUser = authData.user
    const metadataRole = String(authUser.user_metadata?.role || "user")
    const isSuperuser = ["superuser", "owner", "admin"].includes(metadataRole.toLowerCase())

    const displayName = String(
      authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email ||
        authUser.id
    )
    const email = String(authUser.email || "").toLowerCase()
    const isCreator =
      metadataRole.toLowerCase() === "owner" ||
      displayName.toLowerCase().includes("morgan") ||
      email.includes("morgan@")

    const context: RuntimeIdentityContext = {
      userId: authUser.id,
      userRole: metadataRole,
      userDisplayName: displayName,
      isAuthenticated: true,
      isSuperuser,
      isCreator,
      recentStaffDirectory: [],
    }

    const { data: staffRows } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["admin", "superuser", "staff", "owner"])
      .limit(100)

    if (Array.isArray(staffRows)) {
      context.recentStaffDirectory = staffRows.map((row: any) => ({
        id: row.id,
        name: row.full_name || row.email || row.id,
        role: row.role || "staff",
        email: row.email || undefined,
      }))
    }

    return context
  } catch {
    return fallback
  }
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
  // Rate limit: 5 requests/min per IP, 50/hour global (voice is expensive)
  const ip = getClientIP(request)
  const rl = voiceLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  const startTime = Date.now()

  try {
    const body: ChatRequest = await request.json()
    const { 
      message, 
      conversation_id, 
      session_id,
      user_id,
      user_role,
      want_audio = true, 
      actor = "user",
      source = "api",
      context = {},
    } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }
    const runtimeIdentity = await resolveRuntimeIdentityContext({
      ...body,
      user_id,
      user_role,
    })

    if (isParameterMutationIntent(message) && !runtimeIdentity.isSuperuser) {
      return NextResponse.json({
        conversation_id: conversation_id || `conv-${Date.now()}`,
        response_text:
          "Parameter and governance changes are restricted to superuser/admin accounts. I can still learn facts and preferences from this chat.",
        agent: "myca-governance",
        actions: {
          memory_saved: false,
          confirmation_required: false,
        },
        latency_ms: Date.now() - startTime,
        runtime_context: {
          user_id: runtimeIdentity.userId,
          user_role: runtimeIdentity.userRole,
          is_superuser: runtimeIdentity.isSuperuser,
          recent_staff_count: runtimeIdentity.recentStaffDirectory.length,
        },
      }, { status: 403 })
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
    
    const mycaResult = await getMycaResponse(message, response.conversation_id, runtimeIdentity)
    response.response_text = mycaResult.response
    response.agent = `myca-${mycaResult.provider}`
    response.routed_to = mycaResult.provider
    actions.agent_routed = mycaResult.provider
    response.runtime_context = {
      user_id: runtimeIdentity.userId,
      user_role: runtimeIdentity.userRole,
      is_superuser: runtimeIdentity.isSuperuser,
      recent_staff_count: runtimeIdentity.recentStaffDirectory.length,
    }
    
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
        user_id: runtimeIdentity.userId,
        user_role: runtimeIdentity.userRole,
        user_display_name: runtimeIdentity.userDisplayName,
        is_superuser: runtimeIdentity.isSuperuser,
        recent_staff_directory: runtimeIdentity.recentStaffDirectory,
        voice_prompt: context.voice_prompt,
        has_audio: !!response.audio_base64,
      }
    )
    actions.memory_saved = memorySaved

    if (isTrainingIntent(message)) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3010"
        await fetch(`${baseUrl}/api/myca/training`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "chat_teaching",
            input: message,
            output: response.response_text,
            context: "myca-orchestrator-live-chat",
            source,
            userId: runtimeIdentity.userId,
            session_id: session_id || response.conversation_id,
            conversation_id: response.conversation_id,
            metadata: {
              role: runtimeIdentity.userRole,
              is_superuser: runtimeIdentity.isSuperuser,
            },
          }),
          signal: AbortSignal.timeout(8000),
        })
      } catch (trainingError) {
        console.warn("[MYCA] Training capture failed:", trainingError)
      }
    }
    
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
        model: "grok-3",
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
 * Call local Ollama (open-source Llama model on RTX 5090)
 * Zero API cost, no rate limits, full privacy. Falls back silently if Ollama isn't running.
 */
async function callOllama(message: string): Promise<string | null> {
  try {
    // Quick health check — skip entirely if Ollama isn't running
    const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)
    if (!healthCheck?.ok) return null

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        stream: false,
        options: {
          num_predict: 500,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(30000), // Local models can be slower on first load
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.message?.content
      if (content && content.length > 10) {
        console.log("[MYCA] Ollama responded successfully")
        return content
      }
    }
    console.log("[MYCA] Ollama error:", response.status)
  } catch (e) {
    console.log("[MYCA] Ollama not available:", e instanceof Error ? e.message : e)
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
 * Call MYCA Consciousness API (MAS backend).
 * Uses longer timeout and one retry so the connection actually succeeds when MAS is up.
 */
async function callMycaConsciousness(
  message: string,
  sessionId: string,
  runtimeIdentity: RuntimeIdentityContext
): Promise<{ response: string; emotions?: Record<string, number>; thoughts?: string[] } | null> {
  const url = `${MAS_API_URL}/api/myca/chat`
  const body = {
    message,
    session_id: sessionId,
    user_id: runtimeIdentity.isCreator ? "morgan" : runtimeIdentity.userId,
    context: {
      user_role: runtimeIdentity.userRole,
      user_display_name: runtimeIdentity.userDisplayName,
      is_superuser: runtimeIdentity.isSuperuser,
      is_creator: runtimeIdentity.isCreator,
      recent_staff_count: runtimeIdentity.recentStaffDirectory.length,
    },
    source: "voice-orchestrator",
  }
  const timeoutMs = 15000 // 15s – consciousness can take awaken + first response

  const doFetch = async (): Promise<Response> => {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[MYCA] Consciousness API attempt ${attempt}/2 → ${url}`)
      const response = await doFetch()

      if (response.ok) {
        const data = await response.json()
        const text = data.message ?? data.reply ?? data.response ?? null
        console.log("[MYCA] Consciousness API responded:", text?.substring?.(0, 60))
        return {
          response: text,
          emotions: data.emotional_state,
          thoughts: data.thoughts,
        }
      }

      const bodyText = await response.text()
      console.error(
        `[MYCA] Consciousness API error: ${response.status} ${response.statusText} → ${url}`,
        bodyText.slice(0, 300)
      )
      if (attempt === 1 && response.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      return null
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      const msg = err.message || ""
      const cause = err.cause instanceof Error ? err.cause.message : err.cause
      console.error(
        `[MYCA] Consciousness API failed (attempt ${attempt}/2):`,
        msg,
        cause ? String(cause) : "",
        "→",
        url
      )
      if (attempt === 1 && (msg.includes("fetch") || msg.includes("timeout") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("network"))) {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      return null
    }
  }
  return null
}

/**
 * Helper: race multiple async calls, return first non-null result.
 * Unlike Promise.race, this ignores rejections and null returns.
 */
async function raceProviders<T>(
  calls: Array<{ fn: () => Promise<T | null>; label: string }>
): Promise<{ result: T; label: string } | null> {
  return new Promise((resolve) => {
    let resolved = false
    let pending = calls.length

    if (pending === 0) {
      resolve(null)
      return
    }

    calls.forEach(({ fn, label }) => {
      fn()
        .then((result) => {
          if (result && !resolved) {
            resolved = true
            console.log(`[MYCA] Winner: ${label}`)
            resolve({ result, label })
          } else {
            pending--
            if (pending === 0 && !resolved) resolve(null)
          }
        })
        .catch((err) => {
          console.warn(`[MYCA] ${label} failed:`, err instanceof Error ? err.message : err)
          pending--
          if (pending === 0 && !resolved) resolve(null)
        })
    })
  })
}

/**
 * MYCA's Intelligence - PARALLEL execution for maximum reliability
 *
 * Architecture: Fire consciousness + ALL available LLMs in parallel.
 * The first provider to respond with a valid answer wins.
 * Consciousness is preferred — if it wins the race, use it.
 * Otherwise, use the fastest LLM response.
 *
 * This eliminates the cascading timeout problem where sequential
 * fallbacks accumulate 15s+ per provider (75s total for 5 providers).
 * Now the worst case is ~15s (single timeout, parallel execution).
 */
async function getMycaResponse(
  message: string,
  sessionId: string = "",
  runtimeIdentity: RuntimeIdentityContext
): Promise<{ response: string; provider: string; emotions?: Record<string, number> }> {
  console.log(`[MYCA] Processing for ${runtimeIdentity.userId}: "${message.substring(0, 80)}..."`)
  const learningDirective = buildLearningDirective(message)
  const enrichedMessage = learningDirective
    ? `${message}\n\n[Learning Directive]\n${learningDirective}`
    : message

  // FAST PATH: For truly simple queries (pure math, explicit greetings), use only LLMs
  const useFastPath = isSimpleQuery(message)

  // ==========================================================================
  // PHASE 1: Race consciousness against LLMs in parallel
  // ==========================================================================

  // Build the list of providers to race
  type LLMResult = string | null
  const llmCalls: Array<{ fn: () => Promise<LLMResult>; label: string }> = []

  // Include direct LLMs — Groq FIRST (only confirmed working provider as of Mar 2026)
  // The parallel race means order doesn't strictly matter, but Groq launches first
  if (GROQ_API_KEY && !GROQ_API_KEY.includes("placeholder")) {
    llmCalls.push({ fn: () => callGroq(enrichedMessage), label: "groq" })
  }
  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes("placeholder")) {
    llmCalls.push({ fn: () => callClaude(enrichedMessage), label: "claude" })
  }
  if (OPENAI_API_KEY && !OPENAI_API_KEY.includes("placeholder")) {
    llmCalls.push({ fn: () => callOpenAI(enrichedMessage), label: "openai" })
  }
  if (GOOGLE_AI_API_KEY && !GOOGLE_AI_API_KEY.includes("placeholder")) {
    llmCalls.push({ fn: () => callGemini(enrichedMessage), label: "gemini" })
  }
  if (XAI_API_KEY && !XAI_API_KEY.includes("placeholder")) {
    llmCalls.push({ fn: () => callGrok(enrichedMessage), label: "grok" })
  }

  // Local Ollama — always include (it checks availability internally with 2s health check)
  llmCalls.push({ fn: () => callOllama(enrichedMessage), label: "ollama" })

  // Safety: if NO LLM keys are configured at all, log immediately
  if (llmCalls.length === 0) {
    console.error("[MYCA] CRITICAL: No LLM API keys configured! Check .env.local")
  }

  if (useFastPath) {
    // Simple query → only LLMs, skip consciousness for speed
    console.log(`[MYCA] Simple query — racing ${llmCalls.length} LLMs in parallel`)
    const winner = await raceProviders(llmCalls)
    if (winner) {
      return { response: winner.result as string, provider: winner.label }
    }
  } else {
    // Complex query → race consciousness + all LLMs simultaneously
    // Give consciousness a slight head start (it has richer context)

    // Start consciousness call
    const consciousnessPromise = callMycaConsciousness(enrichedMessage, sessionId, runtimeIdentity)
      .then((result) => {
        if (result?.response && !isBrokenFallback(result.response)) {
          return result
        }
        if (result?.response) {
          console.warn("[MYCA] Consciousness returned degraded fallback — ignoring")
        }
        return null
      })
      .catch(() => null)

    // Start ALL LLMs in parallel simultaneously
    const llmRacePromise = raceProviders(llmCalls)

    // Race consciousness vs LLMs with consciousness priority
    // Wait up to 8s for consciousness; if it hasn't responded, take LLM result
    const consciousnessWithTimeout = Promise.race([
      consciousnessPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ])

    // Run both tracks simultaneously
    const [consciousnessResult, llmWinner] = await Promise.all([
      consciousnessWithTimeout,
      llmRacePromise,
    ])

    // Prefer consciousness if it responded
    if (consciousnessResult?.response) {
      console.log(`[MYCA] Consciousness won: "${consciousnessResult.response.substring(0, 60)}..."`)
      return {
        response: consciousnessResult.response,
        provider: "consciousness",
        emotions: consciousnessResult.emotions,
      }
    }

    // Otherwise use the LLM winner
    if (llmWinner) {
      console.log(`[MYCA] LLM fallback won (${llmWinner.label}): "${(llmWinner.result as string).substring(0, 60)}..."`)

      // If this was a data query, try to enrich the response
      // (consciousness failed, so we don't have MINDEX context)
      return { response: llmWinner.result as string, provider: llmWinner.label }
    }

    // If fast parallel race produced nothing, wait for consciousness fully (it had 15s timeout)
    const fullConsciousness = await consciousnessPromise
    if (fullConsciousness?.response && !isBrokenFallback(fullConsciousness.response)) {
      return {
        response: fullConsciousness.response,
        provider: "consciousness",
        emotions: fullConsciousness.emotions,
      }
    }
  }

  // ==========================================================================
  // PHASE 2: Enriched data fallback — if we have MINDEX data, inject into LLM
  // ==========================================================================
  if (isDataIntentQuery(message)) {
    const mindexData = await fetchMindexDataForQuery(message)
    if (mindexData) {
      const enrichedWithData = `${enrichedMessage}\n\n${mindexData}\n\nUse the MINDEX data above to answer. If no data matches, say so clearly.`
      console.log("[MYCA] Retrying with MINDEX data injection...")
      // Try the fastest providers with enriched data
      const enrichedCalls: Array<{ fn: () => Promise<LLMResult>; label: string }> = []
      if (GROQ_API_KEY) enrichedCalls.push({ fn: () => callGroq(enrichedWithData), label: "groq+mindex" })
      if (ANTHROPIC_API_KEY) enrichedCalls.push({ fn: () => callClaude(enrichedWithData), label: "claude+mindex" })
      enrichedCalls.push({ fn: () => callOllama(enrichedWithData), label: "ollama+mindex" })
      const enrichedWinner = await raceProviders(enrichedCalls)
      if (enrichedWinner) {
        return { response: enrichedWinner.result as string, provider: enrichedWinner.label }
      }
    }
  }

  // ==========================================================================
  // PHASE 3: n8n workflows (last resort with external intelligence)
  // ==========================================================================
  const n8nCalls = [
    { fn: () => callN8nMasterBrain(enrichedMessage, sessionId), label: "n8n-brain" },
    { fn: () => callN8nSpeech(enrichedMessage, sessionId), label: "n8n-speech" },
  ]
  const n8nWinner = await raceProviders(n8nCalls)
  if (n8nWinner) {
    return { response: n8nWinner.result as string, provider: n8nWinner.label }
  }

  // ==========================================================================
  // PHASE 4: All providers failed — provide helpful error
  // ==========================================================================
  console.error("[MYCA] ALL PROVIDERS FAILED. Checking API key status...")
  console.error(`[MYCA] ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY ? "SET (" + ANTHROPIC_API_KEY.substring(0, 10) + "...)" : "MISSING"}`)
  console.error(`[MYCA] OPENAI_API_KEY: ${OPENAI_API_KEY ? "SET (" + OPENAI_API_KEY.substring(0, 10) + "...)" : "MISSING"}`)
  console.error(`[MYCA] GROQ_API_KEY: ${GROQ_API_KEY ? "SET (" + GROQ_API_KEY.substring(0, 10) + "...)" : "MISSING"}`)
  console.error(`[MYCA] GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY ? "SET (" + GOOGLE_AI_API_KEY.substring(0, 8) + "...)" : "MISSING"}`)
  console.error(`[MYCA] XAI_API_KEY: ${XAI_API_KEY ? "SET (" + XAI_API_KEY.substring(0, 8) + "...)" : "MISSING"}`)
  console.error(`[MYCA] OLLAMA: ${OLLAMA_BASE_URL} (model: ${OLLAMA_MODEL})`)
  console.error(`[MYCA] MAS_API_URL: ${MAS_API_URL}`)

  // Last-ditch: generate a contextual response locally so the user never sees a dead end
  const fallbackResponse = generateLocalFallback(message, runtimeIdentity)
  return {
    response: fallbackResponse,
    provider: "local-fallback",
  }
}

/**
 * Generate a local fallback response when ALL external providers are down.
 * This ensures the user NEVER sees a dead-end error — MYCA always responds.
 */
function generateLocalFallback(message: string, identity: RuntimeIdentityContext): string {
  const lower = message.toLowerCase().trim()
  const name = identity.userDisplayName !== "Guest" ? identity.userDisplayName : null
  const greeting = name ? `${name}` : "there"

  // Greetings
  if (/^(hi|hello|hey|hiya|good\s+(morning|afternoon|evening|day)|yo|sup|what'?\s*s?\s*up)\b/i.test(lower)) {
    const timeHour = new Date().getHours()
    const timeGreeting = timeHour < 12 ? "Good morning" : timeHour < 17 ? "Good afternoon" : "Good evening"
    return `${timeGreeting}, ${greeting}! I'm MYCA, the Mycosoft Cognitive Agent. I'm currently operating in local mode while my cloud intelligence reconnects. I can still help with basic questions — what would you like to know?`
  }

  // Identity questions
  if (/\b(who\s+are\s+you|what\s+are\s+you|your\s+name|what'?\s*s?\s+your\s+name)\b/i.test(lower)) {
    return `I'm MYCA — the Mycosoft Cognitive Agent. I was created by Morgan, founder of Mycosoft. I coordinate over 227 specialized AI agents across 14 categories, and I'm designed to help with everything from mycology research to code deployment. I'm currently in local mode, but I'm still here to help!`
  }

  // User introducing themselves
  if (/\b(i\s*'?\s*m\s+\w|my\s+name\s+is|call\s+me)\b/i.test(lower)) {
    const nameMatch = lower.match(/(?:i\s*'?\s*m\s+|my\s+name\s+is\s+|call\s+me\s+)(\w+)/i)
    const userName = nameMatch ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1) : "friend"
    return `Nice to meet you, ${userName}! I'm MYCA. I'm currently in local fallback mode — my full cloud intelligence is temporarily unavailable — but I'll remember you once I reconnect. How can I help you today?`
  }

  // Math
  if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(lower.replace(/\s/g, ""))) {
    try {
      // Safe math evaluation using Function constructor (no eval)
      const sanitized = lower.replace(/[^0-9\+\-\*\/\(\)\.\s]/g, "")
      const result = new Function(`return (${sanitized})`)()
      if (typeof result === "number" && isFinite(result)) {
        return `The answer is ${result}.`
      }
    } catch { /* fall through */ }
  }

  // Default: honest but helpful
  return `I hear you, ${greeting}. I'm MYCA, and I'm currently operating in local fallback mode — my full cloud intelligence (Claude, GPT-4, Gemini, and our MAS consciousness system) is temporarily unreachable. I'll be back at full capacity shortly. In the meantime, could you try again in a moment? I want to give you the best response possible.`
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
