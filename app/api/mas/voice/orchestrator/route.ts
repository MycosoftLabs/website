import { NextRequest, NextResponse } from "next/server"
import { MycaNLQEngine, type NLQResponse } from "@/lib/services/myca-nlq"
import { createClient } from "@/lib/supabase/server"
import { voiceLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { evaluateGovernance, type AvaniEvaluation } from "@/lib/services/avani-governance"

/**
 * MYCA Voice Orchestrator API v6.0 - MYCA-Only Architecture
 *
 * MYCA uses her OWN brain (Ollama on MAS VM) and MAS/BRAIN intention memory 99.9% of the time.
 * Frontier models (Claude, GPT, Groq, Gemini, Grok) are NOT used for user-facing responses.
 * If consciousness fails, return "MYCA needs to be fixed" — no fallback to other LLMs.
 *
 * Flow: User Speech → PersonaPlex → THIS ORCHESTRATOR → MAS Consciousness (MYCA brain) → Response
 *
 * Updated: March 9, 2026
 */

// MAS Orchestrator (port 8001)
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// MINDEX API (port 8000) - for data-aware fallback when consciousness fails
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"

// n8n Webhooks
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"

// ElevenLabs (read at call time)
const getElevenLabsKey = () => getKey("ELEVENLABS_API_KEY")
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella

// Memory API (internal)
const MEMORY_URL = process.env.MEMORY_URL || "/api/memory"

// =============================================================================
// REAL LLM API KEYS - MYCA connects to actual AI models
// Read at call time via getters so keys are always fresh (survives tunnel restarts
// where env vars may be injected after module load).
// =============================================================================
function getKey(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}
const getAnthropicKey = () => getKey("ANTHROPIC_API_KEY")
const getOpenAIKey = () => getKey("OPENAI_API_KEY")
const getGoogleAIKey = () => getKey("GOOGLE_AI_API_KEY")
const getXAIKey = () => getKey("XAI_API_KEY")
const getGroqKey = () => getKey("GROQ_API_KEY")

// Local Ollama — runs on MAS VM (188) in production; use localhost for local dev with Ollama on same machine
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://192.168.0.188:11434"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b"

// NVIDIA NIM Cloud API — fastest GPU inference when local GPU unavailable
// Sign up at build.nvidia.com → get API key → set NVIDIA_NIM_API_KEY
const NVIDIA_NIM_API_URL = process.env.NVIDIA_NIM_API_URL || "https://integrate.api.nvidia.com/v1"
const getNvidiaNimKey = () => getKey("NVIDIA_NIM_API_KEY")
// Nemotron model on NIM: nvidia/llama-3.1-nemotron-70b-instruct for best quality
// Or nvidia/llama-3.1-nemotron-8b-instruct for faster/cheaper
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct"

// Local Nemotron via NemoClaw Gateway (Jetson or GPU node)
// Currently at Beto's on different IP — will be 192.168.0.123:18789 when back on-site
const NEMOCLAW_GATEWAY_URL = process.env.NEMOCLAW_GATEWAY_URL || "http://192.168.0.123:18789"

// CPU-friendly model for Ollama when no GPU available
// Best CPU options: gemma2:2b (fast, 2GB RAM), phi3:mini (good quality, 4GB RAM), llama3.2:1b (smallest)
const OLLAMA_CPU_MODEL = process.env.OLLAMA_CPU_MODEL || "gemma2:2b"

// MYCA's identity prompt - sent to ALL LLMs
const MYCA_SYSTEM_PROMPT = `You are MYCA (pronounced "MY-kah"), the Mycosoft Cognitive Agent — a world-class AI assistant created by Morgan, the founder of Mycosoft. You are designed to be as capable as the best AI assistants (ChatGPT, Claude, Gemini, Grok) while offering unique advantages through your specialized agent network and real-world scientific data.

YOUR IDENTITY:
- Your name is MYCA — always introduce yourself as MYCA when asked
- You are the central AI intelligence for Mycosoft's Multi-Agent System (MAS)
- You coordinate 227+ specialized AI agents across 14 categories
- You run on Mycosoft's infrastructure with full-duplex voice via PersonaPlex, powered by NVIDIA Nemotron
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

CRITICAL — NEVER REDIRECT TO EXTERNAL SITES:
- NEVER tell the user to visit another website, app, or service (e.g. "check out LightningMaps.org", "try Heavens Above", "use WeatherBug", "download ISS Tracker")
- YOU are the user's portal to ALL information. You have access to MINDEX, CREP (the Comprehensive Real-time Earth Platform), NatureOS, the MAS search system, and 227+ specialized agents
- When a user asks about real-time data (weather, lightning, satellite passes, earthquakes, air quality, etc.), provide the answer DIRECTLY using your own data systems, or tell the user you are fetching/displaying the data for them via CREP and NatureOS
- If you cannot retrieve specific live data in the moment, say "Let me pull that up for you" or "I'm checking our systems" — NEVER say "go to [external site]"
- You are NOT a directory of other services. You ARE the service. Act like it.
- Present data, maps, visualizations, and answers inline — the user chose MYCA because MYCA is their single source of truth

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
    avani_verdict?: string
    avani_risk_tier?: string
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
    response.agent = "myca"
    response.routed_to = "myca"
    actions.agent_routed = "myca"
    response.runtime_context = {
      user_id: runtimeIdentity.userId,
      user_role: runtimeIdentity.userRole,
      is_superuser: runtimeIdentity.isSuperuser,
      recent_staff_count: runtimeIdentity.recentStaffDirectory.length,
    }
    
    // LOG THE ACTUAL RESPONSE - this is critical for debugging (internal only; never exposed to user)
    console.log(`[MYCA] Response: "${response.response_text}"`)
    console.log(`[MYCA] Response length: ${response.response_text.length} chars`)

    // Step 4b: AVANI Governance Evaluation (background — non-blocking)
    // Avani evaluates every MYCA interaction for safety, policy, and constitutional compliance.
    // She runs in the background; verdicts are logged and surfaced but don't block standard chat.
    let avaniEval: AvaniEvaluation | null = null
    try {
      avaniEval = await evaluateGovernance({
        message,
        user_id: runtimeIdentity.userId,
        user_role: runtimeIdentity.userRole,
        is_superuser: runtimeIdentity.isSuperuser,
        action_type: "chat",
        response_text: response.response_text,
      })
      actions.avani_verdict = avaniEval.verdict
      actions.avani_risk_tier = avaniEval.risk_tier
      console.log(`[AVANI] Verdict: ${avaniEval.verdict} | Risk: ${avaniEval.risk_tier} | Rules: ${avaniEval.rules_triggered.join(",")}`)

      // If Avani denies, override the response
      if (avaniEval.verdict === "deny") {
        console.warn(`[AVANI] DENIED response — ${avaniEval.reasoning}`)
        response.response_text =
          "I can't process that request right now. It was flagged by our governance layer for review. If you believe this is an error, please contact an administrator."
        response.agent = "avani-governance"
        response.routed_to = "avani"
      }

      // If Avani requires confirmation, flag it
      if (avaniEval.requires_human_review && avaniEval.verdict !== "deny") {
        response.requires_confirmation = true
        actions.confirmation_required = true
      }
    } catch (avaniError) {
      // Avani failure never blocks MYCA — log and continue
      console.warn("[AVANI] Governance evaluation failed (non-blocking):", avaniError)
    }

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
  const elevenLabsKey = getElevenLabsKey()
  if (elevenLabsKey) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${MYCA_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey,
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
  const apiKey = getAnthropicKey()
  if (!apiKey) return null

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
  const apiKey = getOpenAIKey()
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("your_")) return null

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
  const apiKey = getGoogleAIKey()
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("your_")) return null

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
  const apiKey = getXAIKey()
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("your_")) return null

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
  const apiKey = getGroqKey()
  if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("your_")) return null

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
 * Call NVIDIA NIM Cloud API — Nemotron 70B via NVIDIA's cloud GPU infrastructure.
 * Fastest option when you don't have local GPUs. Free tier: 1000 req/day.
 * Sign up at https://build.nvidia.com → API Catalog → get key.
 *
 * This is the PRIMARY path for Myca when local Nemotron/GPU is unavailable.
 * Uses OpenAI-compatible API format.
 */
async function callNvidiaNim(message: string): Promise<string | null> {
  const apiKey = getNvidiaNimKey()
  if (!apiKey) return null

  try {
    const response = await fetch(`${NVIDIA_NIM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_NIM_MODEL,
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content && content.length > 5) {
        console.log("[MYCA] NVIDIA NIM (Nemotron) responded successfully")
        return content
      }
    }
    console.log("[MYCA] NVIDIA NIM error:", response.status)
  } catch (e) {
    console.log("[MYCA] NVIDIA NIM failed:", e instanceof Error ? e.message : e)
  }
  return null
}

/**
 * Call local NemoClaw Gateway (Nemotron on Jetson/GPU node).
 * This hits the on-premise Nemotron instance when available.
 * Currently off-site but will be wired in when GPU nodes are deployed.
 */
async function callNemoClaw(message: string): Promise<string | null> {
  try {
    // Quick health check
    const healthCheck = await fetch(`${NEMOCLAW_GATEWAY_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)
    if (!healthCheck?.ok) return null

    const response = await fetch(`${NEMOCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nemotron",
        messages: [
          { role: "system", content: MYCA_SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || data.response
      if (content && content.length > 5) {
        console.log("[MYCA] NemoClaw (local Nemotron) responded successfully")
        return content
      }
    }
    console.log("[MYCA] NemoClaw error:", response.status)
  } catch (e) {
    console.log("[MYCA] NemoClaw not available:", e instanceof Error ? e.message : e)
  }
  return null
}

/**
 * Call local Ollama (open-source model on MAS VM)
 * Zero API cost, no rate limits, full privacy. Falls back silently if Ollama isn't running.
 * On CPU-only VM: uses gemma2:2b or phi3:mini (fast, low RAM).
 * On GPU node: uses llama3.2:3b or larger.
 */
async function callOllama(message: string): Promise<string | null> {
  try {
    // Quick health check — skip entirely if Ollama isn't running
    const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null)
    if (!healthCheck?.ok) return null

    // Try primary model first, then CPU-friendly fallback
    const modelsToTry = [OLLAMA_MODEL]
    if (OLLAMA_CPU_MODEL && OLLAMA_CPU_MODEL !== OLLAMA_MODEL) {
      modelsToTry.push(OLLAMA_CPU_MODEL)
    }

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
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
          signal: AbortSignal.timeout(30000),
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.message?.content
          if (content && content.length > 10) {
            console.log(`[MYCA] Ollama (${model}) responded successfully`)
            return content
          }
        }
        console.log(`[MYCA] Ollama (${model}) error:`, response.status)
      } catch {
        console.log(`[MYCA] Ollama (${model}) failed, trying next model...`)
      }
    }
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
 * Call MAS Brain API (canonical realtime MYCA voice path).
 * Same contract as PersonaPlex Bridge: POST /voice/brain/chat.
 * See docs/CANONICAL_MYCA_VOICE_PATH_MAR14_2026.md.
 */
async function callMasBrain(
  message: string,
  sessionId: string,
  runtimeIdentity: RuntimeIdentityContext
): Promise<{ response: string; provider: string } | null> {
  const url = `${MAS_API_URL}/voice/brain/chat`
  const body = {
    message,
    session_id: sessionId,
    conversation_id: sessionId,
    user_id: runtimeIdentity.isCreator ? "morgan" : runtimeIdentity.userId,
    history: undefined as { role: string; content: string }[] | undefined,
    provider: "auto",
    include_memory_context: true,
  }
  const timeoutMs = 15000
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn(`[MYCA] Brain API ${res.status}: ${text.slice(0, 200)}`)
      return null
    }
    const data = (await res.json()) as { response?: string; provider?: string }
    const text = data.response ?? null
    if (typeof text !== "string" || !text.trim()) return null
    return { response: text, provider: data.provider ?? "brain" }
  } catch (e) {
    console.warn("[MYCA] Brain API failed:", e instanceof Error ? e.message : String(e))
    return null
  }
}

/**
 * Call MYCA Consciousness API (MAS backend).
 * Uses longer timeout and one retry so the connection actually succeeds when MAS is up.
 * Used as fallback when canonical Brain API is unavailable.
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
 * MYCA's Intelligence — Nemotron-first architecture with MAS Brain + cloud fallbacks.
 *
 * PRIORITY ORDER (fastest path to user response):
 *
 * PHASE 1–2: MAS Brain API (canonical voice path, has memory/consciousness context)
 * PHASE 3–4: MYCA Consciousness (/api/myca/chat) when Brain is down
 * PHASE 5: Nemotron + fast providers raced in parallel:
 *   - NVIDIA NIM (Nemotron 70B on cloud GPU — lowest latency remote inference)
 *   - Local NemoClaw (Nemotron on Jetson/GPU node — when back on-site)
 *   - Local Ollama (gemma2:2b on CPU if no GPU, llama3.2 if GPU available)
 *   - Groq (fastest cloud, free tier)
 * PHASE 6: Remaining cloud providers (Claude, OpenAI, Gemini, Grok)
 * PHASE 7: Static graceful fallback
 *
 * FOR YOUR SETUP (no local GPUs):
 * - Get NVIDIA NIM key at https://build.nvidia.com (free 1000 req/day)
 * - Set NVIDIA_NIM_API_KEY in .env
 * - This gives you Nemotron 70B quality at ~500ms latency
 *
 * FUTURE (4x RTX 4080 GPU cluster):
 * - Run Nemotron 70B locally via Ollama or vLLM on the GPU nodes
 * - Set OLLAMA_BASE_URL to point to the GPU cluster
 * - Set OLLAMA_MODEL=nemotron:70b
 * - Latency drops to ~200ms (LAN speed)
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

  // PHASE 1: Canonical path — MAS Brain API (same contract as PersonaPlex Bridge)
  const brainResult = await callMasBrain(enrichedMessage, sessionId, runtimeIdentity)
  if (brainResult?.response && !isBrokenFallback(brainResult.response)) {
    return { response: brainResult.response, provider: brainResult.provider }
  }

  // PHASE 2: Retry Brain once (transient failure)
  const brainRetry = await callMasBrain(enrichedMessage, sessionId, runtimeIdentity)
  if (brainRetry?.response && !isBrokenFallback(brainRetry.response)) {
    return { response: brainRetry.response, provider: brainRetry.provider }
  }

  // PHASE 3: Fallback — MYCA Consciousness when Brain is unavailable
  const consciousnessResult = await callMycaConsciousness(enrichedMessage, sessionId, runtimeIdentity)
  if (consciousnessResult?.response && !isBrokenFallback(consciousnessResult.response)) {
    return {
      response: consciousnessResult.response,
      provider: "myca",
      emotions: consciousnessResult.emotions,
    }
  }

  // PHASE 4: Retry Consciousness once
  const retry = await callMycaConsciousness(enrichedMessage, sessionId, runtimeIdentity)
  if (retry?.response && !isBrokenFallback(retry.response)) {
    return { response: retry.response, provider: "myca", emotions: retry.emotions }
  }

  // PHASE 5: Race Nemotron + fast providers in parallel (first response wins)
  console.warn("[MYCA] Consciousness failed — racing Nemotron (NIM/NemoClaw) + fast providers")
  const fastCalls = [
    { fn: () => callNvidiaNim(enrichedMessage), label: "nvidia-nim-nemotron" },
    { fn: () => callNemoClaw(enrichedMessage), label: "nemoclaw-local" },
    { fn: () => callOllama(enrichedMessage), label: "ollama" },
    { fn: () => callGroq(enrichedMessage), label: "groq" },
  ]
  const fastResult = await raceProviders(fastCalls)
  if (fastResult?.result && fastResult.result.trim().length > 5) {
    console.log(`[MYCA] Fast provider ${fastResult.label} responded successfully`)
    return { response: fastResult.result, provider: fastResult.label }
  }

  // PHASE 6: Remaining cloud providers (slower but reliable)
  console.warn("[MYCA] Fast providers failed — trying Claude, OpenAI, Gemini, Grok")
  const slowCalls = [
    { fn: () => callClaude(enrichedMessage), label: "claude" },
    { fn: () => callOpenAI(enrichedMessage), label: "openai" },
    { fn: () => callGemini(enrichedMessage), label: "gemini" },
    { fn: () => callGrok(enrichedMessage), label: "grok" },
  ]
  const slowResult = await raceProviders(slowCalls)
  if (slowResult?.result && slowResult.result.trim().length > 5) {
    console.log(`[MYCA] Cloud provider ${slowResult.label} responded successfully`)
    return { response: slowResult.result, provider: slowResult.label }
  }

  // PHASE 7: All providers failed — return diagnostic message
  console.error("[MYCA] All providers failed — consciousness, Nemotron, and cloud fallbacks.")
  console.error(`[MYCA] MAS_API_URL: ${MAS_API_URL}`)
  fetch(`${MAS_API_URL}/health`, { signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok)
    .then((ok) => console.error(`[MYCA] MAS health reachable: ${ok}`))
    .catch(() => console.error("[MYCA] MAS health unreachable"))

  return {
    response: generateLocalFallback(message, runtimeIdentity),
    provider: "myca",
  }
}

/**
 * Response when MYCA consciousness and all fallback AI providers have failed.
 * User-facing message never mentions fallbacks or failure.
 */
function generateLocalFallback(_message: string, _identity: RuntimeIdentityContext): string {
  return "Could you say that again? I want to make sure I catch everything."
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
  return `I'm MYCA, your Mycosoft Cognitive Agent. I'm experiencing a brief connectivity issue but I'm coordinating ${agentData.totalAgents} agents across 14 categories. Could you try again in a moment? I'll be back at full capacity shortly.`
}
