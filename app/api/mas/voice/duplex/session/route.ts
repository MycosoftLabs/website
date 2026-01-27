import { NextRequest, NextResponse } from "next/server"

/**
 * Voice Duplex Session API - January 27, 2026
 * Creates and manages duplex voice sessions with PersonaPlex
 */

const PERSONAPLEX_URL = process.env.PERSONAPLEX_URL || "wss://192.168.0.188:8998"
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface SessionRequest {
  conversation_id?: string
  mode?: "personaplex" | "elevenlabs" | "auto"
  persona?: string
  check_only?: boolean
}

interface VoiceSession {
  session_id: string
  conversation_id: string
  mode: "personaplex" | "elevenlabs"
  personaplex_available: boolean
  transport: {
    type: string
    url?: string
    tts_url?: string
    orchestrator_url?: string
  }
  fallback: {
    type: string
    tts_url: string
    orchestrator_url: string
  }
  voice_config: {
    persona: string
    voice_prompt?: string
    voice_id?: string
  }
  created_at: string
}

// Check if PersonaPlex is available
async function checkPersonaPlexAvailable(): Promise<boolean> {
  try {
    // Convert wss to https for health check
    const httpUrl = PERSONAPLEX_URL.replace("wss://", "https://").replace("ws://", "http://")
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const res = await fetch(httpUrl, {
      signal: controller.signal,
    }).catch(() => null)
    
    clearTimeout(timeoutId)
    
    return res?.ok ?? false
  } catch {
    return false
  }
}

// Generate session ID
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export async function POST(request: NextRequest) {
  try {
    const body: SessionRequest = await request.json()
    const { conversation_id, mode = "auto", persona = "myca", check_only = false } = body

    // Check PersonaPlex availability
    const personaplexAvailable = await checkPersonaPlexAvailable()

    // Determine actual mode
    let actualMode: "personaplex" | "elevenlabs"
    if (mode === "auto") {
      actualMode = personaplexAvailable ? "personaplex" : "elevenlabs"
    } else if (mode === "personaplex" && !personaplexAvailable) {
      actualMode = "elevenlabs" // Fallback
    } else {
      actualMode = mode
    }

    // If just checking availability, return minimal response
    if (check_only) {
      return NextResponse.json({
        personaplex_available: personaplexAvailable,
        recommended_mode: actualMode,
      })
    }

    // Create session
    const session: VoiceSession = {
      session_id: generateSessionId(),
      conversation_id: conversation_id || generateSessionId(),
      mode: actualMode,
      personaplex_available: personaplexAvailable,
      transport: actualMode === "personaplex" 
        ? {
            type: "websocket",
            url: PERSONAPLEX_URL,
          }
        : {
            type: "http",
            tts_url: "/api/mas/voice",
            orchestrator_url: "/api/mas/voice/orchestrator",
          },
      fallback: {
        type: "http",
        tts_url: "/api/mas/voice",
        orchestrator_url: "/api/mas/voice/orchestrator",
      },
      voice_config: {
        persona,
        voice_prompt: actualMode === "personaplex" ? "NATF2.pt" : undefined,
        voice_id: actualMode === "elevenlabs" ? "aEO01A4wXwd1O8GPgGlF" : undefined,
      },
      created_at: new Date().toISOString(),
    }

    // Notify MAS about the new session
    try {
      await fetch(`${MAS_API_URL}/voice/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      }).catch(() => null) // Non-blocking
    } catch {
      // Session creation in MAS is optional
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json(
      { error: "Failed to create voice session" },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return available modes and status
  const personaplexAvailable = await checkPersonaPlexAvailable()

  return NextResponse.json({
    modes: {
      personaplex: {
        available: personaplexAvailable,
        url: PERSONAPLEX_URL,
        features: ["full_duplex", "barge_in", "backchannels"],
        voice: "NATF2.pt",
        latency_ms: 170,
      },
      elevenlabs: {
        available: true,
        features: ["premium_voice", "cloud_reliable"],
        voice: "Arabella (aEO01A4wXwd1O8GPgGlF)",
        latency_ms: 350,
      },
    },
    recommended: personaplexAvailable ? "personaplex" : "elevenlabs",
    timestamp: new Date().toISOString(),
  })
}
