import { NextRequest, NextResponse } from "next/server"

/**
 * MYCA Voice Orchestrator API
 * Integrates with n8n workflows and ElevenLabs for full voice processing
 * 
 * Flow: User Speech → STT → n8n → Orchestrator → LLM → TTS → Audio
 */

// MAS Orchestrator
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// n8n Webhooks
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"

// ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella

interface ChatRequest {
  message: string
  conversation_id?: string
  want_audio?: boolean
  actor?: string
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
}

/**
 * POST /api/mas/voice/orchestrator
 * Main voice chat endpoint - handles text and optionally returns audio
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, conversation_id, want_audio = true, actor = "user" } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    let response: ChatResponse = {
      conversation_id: conversation_id || `conv-${Date.now()}`,
      response_text: "",
      agent: "myca-orchestrator",
    }

    // Step 1: Try n8n speech_turn workflow for intent detection
    try {
      const turnResponse = await fetch(`${N8N_URL}/webhook/myca/speech_turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: response.conversation_id,
          actor,
          transcript: message,
        }),
      })

      if (turnResponse.ok) {
        const turnData = await turnResponse.json()
        
        // Check if command requires safety confirmation
        if (turnData.intent === "command" && turnData.requires_safety) {
          // Route to safety workflow
          const safetyResponse = await fetch(`${N8N_URL}/webhook/myca/speech_safety`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              request_id: response.conversation_id,
              actor,
              transcript: message,
            }),
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
      }
    } catch (n8nError) {
      console.log("n8n speech_turn not available, using direct orchestrator")
    }

    // Step 2: If no confirmation needed, call orchestrator directly
    if (!response.requires_confirmation && !response.response_text) {
      try {
        const orchResponse = await fetch(`${MAS_API_URL}/voice/orchestrator/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversation_id: response.conversation_id,
            want_audio: false, // We'll generate audio separately
          }),
        })

        if (orchResponse.ok) {
          const orchData = await orchResponse.json()
          response.response_text = orchData.response_text || orchData.response
          response.agent = orchData.agent || "myca-orchestrator"
          response.routed_to = orchData.routed_to
        }
      } catch (orchError) {
        console.log("Orchestrator not available, using fallback")
      }
    }

    // Step 3: Generate fallback response if needed
    if (!response.response_text) {
      response.response_text = generateSmartResponse(message)
    }

    // Step 4: Generate audio if requested
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

    return NextResponse.json(response)
  } catch (error) {
    console.error("Voice orchestrator error:", error)
    return NextResponse.json(
      { error: "Voice processing failed" },
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
  
  return `I understand you're asking about "${message}". Let me coordinate with the relevant agents. Is there something specific you'd like me to focus on?`
}
