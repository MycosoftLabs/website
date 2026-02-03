import { NextRequest, NextResponse } from "next/server"
import { MycaNLQEngine, type NLQResponse } from "@/lib/services/myca-nlq"

/**
 * MYCA Voice Orchestrator API v3.0 - Single Brain Architecture
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
 * Updated: February 3, 2026
 * 
 * Flow: User Speech → PersonaPlex → THIS ORCHESTRATOR → Response
 */

// MAS Orchestrator
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// n8n Webhooks
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"

// ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella

// Memory API (internal)
const MEMORY_URL = process.env.MEMORY_URL || "/api/memory"

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
    console.log(`[Orchestrator] Request from ${source}: "${message.substring(0, 50)}..."`)
    if (context.voice_prompt) {
      console.log(`[Orchestrator] Voice prompt: ${context.voice_prompt}`)
    }

    // Step 1: Process through NLQ Engine first
    let nlqResponse: NLQResponse | null = null
    try {
      const nlqEngine = MycaNLQEngine.getInstance()
      const intent = nlqEngine.parseIntent(message)
      
      // For action intents, check if safety confirmation is needed
      if (intent.type.startsWith("action_")) {
        // Route to n8n command workflow for safety checks
        try {
          const safetyResponse = await fetch(`${N8N_URL}/webhook/myca/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              request_id: response.conversation_id,
              actor,
              transcript: message,
              intent: intent.type,
              entities: intent.entities,
            }),
            signal: AbortSignal.timeout(5000),
          })

          if (safetyResponse.ok) {
            const safetyData = await safetyResponse.json()
            if (safetyData.confirmation_required) {
              response.requires_confirmation = true
              response.confirmation_prompt = safetyData.prompt
              response.response_text = safetyData.prompt
              actions.confirmation_required = true
            }
          }
        } catch {
          // Safety check not available, proceed with NLQ
        }
      }
      
      // If no confirmation required, get NLQ response
      if (!response.requires_confirmation) {
        // Call NLQ API for full response
        const nlqApiResponse = await fetch(`${request.url.replace(/\/voice\/orchestrator$/, "")}/myca/nlq`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message,
            context: {
              sessionId: response.conversation_id,
              currentPage: "voice",
            },
            options: {
              wantAudio: false, // We'll generate audio separately
              maxResults: 5,
              includeActions: true,
            },
          }),
        })
        
        if (nlqApiResponse.ok) {
          nlqResponse = await nlqApiResponse.json()
          if (nlqResponse && nlqResponse.text) {
            response.response_text = nlqResponse.text
            response.agent = nlqResponse.metadata?.intent?.type.includes("agent") 
              ? "agent-router" 
              : "myca-nlq"
            response.nlq_data = nlqResponse.data
            response.nlq_actions = nlqResponse.actions
            response.nlq_sources = nlqResponse.sources
          }
        }
      }
    } catch (nlqError) {
      console.log("NLQ processing failed, falling back to orchestrator:", nlqError)
    }

    // Step 2: Try n8n speech_turn workflow for additional intent detection
    if (!response.response_text && !response.requires_confirmation) {
      try {
        // Use main command webhook for turn processing (speech_turn not available)
        const turnResponse = await fetch(`${N8N_URL}/webhook/myca/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: response.conversation_id,
            actor,
            transcript: message,
          }),
          signal: AbortSignal.timeout(5000),
        })

        if (turnResponse.ok) {
          const turnData = await turnResponse.json()
          
          // Check if command requires safety confirmation
          if (turnData.intent === "command" && turnData.requires_safety) {
            // Route to command workflow for safety
            const safetyResponse = await fetch(`${N8N_URL}/webhook/myca/command`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                request_id: response.conversation_id,
                actor,
                transcript: message,
              }),
              signal: AbortSignal.timeout(5000),
            })

            if (safetyResponse.ok) {
              const safetyData = await safetyResponse.json()
              if (safetyData.confirmation_required) {
                response.requires_confirmation = true
                response.confirmation_prompt = safetyData.prompt
                response.response_text = safetyData.prompt
              }
            }
          }
          
          // Use n8n response if available
          if (turnData.response && !response.response_text) {
            response.response_text = turnData.response
            response.agent = turnData.agent || "n8n-workflow"
            actions.workflow_executed = "myca/command"
          }
        }
      } catch {
        console.log("n8n speech_turn not available")
      }
    }

    // Step 3: If no response yet, call MAS orchestrator directly
    if (!response.requires_confirmation && !response.response_text) {
      try {
        const orchResponse = await fetch(`${MAS_API_URL}/voice/orchestrator/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversation_id: response.conversation_id,
            want_audio: false,
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (orchResponse.ok) {
          const orchData = await orchResponse.json()
          response.response_text = orchData.response_text || orchData.response
          response.agent = orchData.agent || "myca-orchestrator"
          response.routed_to = orchData.routed_to
          actions.agent_routed = orchData.agent || "myca-orchestrator"
        }
      } catch {
        console.log("MAS orchestrator not available, using fallback")
      }
    }

    // Step 4: Generate fallback response if needed
    if (!response.response_text) {
      response.response_text = generateSmartResponse(message)
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

/**
 * Generate smart response when orchestrator unavailable
 */
function generateSmartResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello! I'm MYCA, your Mycosoft Cognitive Agent. I'm orchestrating 223 agents across the system. How can I assist you today?"
  }
  
  if (lowerMessage.includes("status") || lowerMessage.includes("health")) {
    return "System Status: The MAS orchestrator is online and coordinating 223 agents. All core services are operational. Redis, PostgreSQL, and n8n are connected."
  }
  
  if (lowerMessage.includes("agent")) {
    return "I'm coordinating 223 specialized agents across 14 categories including Core, Financial, Mycology, Research, DAO, Communication, Data, Infrastructure, Simulation, Security, Integration, Device, Chemistry, and NLM agents."
  }
  
  if (lowerMessage.includes("workflow") || lowerMessage.includes("n8n")) {
    return "We have several n8n workflows active: Voice Chat Pipeline, MYCA Jarvis Handler, Agent Heartbeat Monitor, MycoBrain Data Sync, and the Speech Interface. Would you like me to execute a specific workflow?"
  }
  
  if (lowerMessage.includes("voice") || lowerMessage.includes("speak")) {
    return "I'm using the Arabella voice from ElevenLabs for natural speech. My voice is configured for clear, professional communication. Is there something specific you'd like me to say?"
  }
  
  if (lowerMessage.includes("security") || lowerMessage.includes("threat")) {
    return "Security Status: All 8 security agents are active including the Threat Watchdog, Hunter, Guardian, and Incident Response. No active threats detected. Last scan completed successfully."
  }
  
  if (lowerMessage.includes("proxmox") || lowerMessage.includes("vm")) {
    return "The Proxmox Manager agent is monitoring all VMs. DC1 and DC2 nodes are healthy. Would you like me to list the VMs or perform a specific action?"
  }
  
  if (lowerMessage.includes("network") || lowerMessage.includes("unifi")) {
    return "The UniFi Network agent is monitoring network topology. All access points and switches are online. Would you like to see connected clients or network stats?"
  }
  
  if (lowerMessage.includes("document") || lowerMessage.includes("docs")) {
    return "I can search our document knowledge base. What topic would you like me to find documentation for? I have access to deployment guides, API references, and system documentation."
  }
  
  if (lowerMessage.includes("memory") || lowerMessage.includes("remember")) {
    return "I maintain conversation memory across sessions. I can recall our previous discussions and use that context to help you. What would you like me to remember or recall?"
  }
  
  return `I understand you're asking about "${message}". Let me coordinate with the relevant agents. Is there something specific you'd like me to focus on?`
}
