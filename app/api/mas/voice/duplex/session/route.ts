import { NextRequest, NextResponse } from "next/server"

/**
 * Voice Duplex Session API - January 29, 2026
 * Creates and manages duplex voice sessions with PersonaPlex
 * Supports local GPU (RTX 5090) and remote/cloud deployment
 * 
 * FIXED: WebSocket URL now uses request host for proper connectivity
 */

// Local development mode - uses local GPU
const IS_LOCAL = process.env.PERSONAPLEX_LOCAL === "true" || process.env.NODE_ENV === "development"

// PersonaPlex internal URLs (server-side only)
const PERSONAPLEX_BRIDGE_URL = process.env.PERSONAPLEX_BRIDGE_URL || (IS_LOCAL ? "http://localhost:8999" : "http://192.168.0.188:8999")
const PERSONAPLEX_BRIDGE_PORT = process.env.PERSONAPLEX_BRIDGE_PORT || "8999"
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// Build WebSocket URL based on request host (for browser connection)
function getWebSocketUrl(request: NextRequest, sessionId: string): string {
  // Get host from request headers
  const host = request.headers.get("host") || "localhost:3010"
  const hostname = host.split(":")[0]
  
  // Determine WebSocket protocol (wss for https, ws for http)
  const proto = request.headers.get("x-forwarded-proto") || "http"
  const wsProto = proto === "https" ? "wss" : "ws"
  
  // Use explicit environment variable if set
  if (process.env.PERSONAPLEX_WS_URL) {
    return `${process.env.PERSONAPLEX_WS_URL}/${sessionId}`
  }
  
  // For localhost, connect directly to bridge port
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `ws://${hostname}:${PERSONAPLEX_BRIDGE_PORT}/ws/${sessionId}`
  }
  
  // For network access, use the same hostname with bridge port
  // The client browser will connect directly to the PersonaPlex bridge
  return `${wsProto}://${hostname}:${PERSONAPLEX_BRIDGE_PORT}/ws/${sessionId}`
}

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

// Check if PersonaPlex is available via bridge health endpoint
async function checkPersonaPlexAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    // Check bridge health which includes PersonaPlex status
    const res = await fetch(`${PERSONAPLEX_BRIDGE_URL}/health`, {
      signal: controller.signal,
    }).catch(() => null)
    
    clearTimeout(timeoutId)
    
    if (res?.ok) {
      const data = await res.json()
      return data.personaplex === true
    }
    
    return false
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
    const sessionId = generateSessionId()
    const wsUrl = getWebSocketUrl(request, sessionId)
    
    const session: VoiceSession = {
      session_id: sessionId,
      conversation_id: conversation_id || generateSessionId(),
      mode: actualMode,
      personaplex_available: personaplexAvailable,
      transport: actualMode === "personaplex" 
        ? {
            type: "websocket",
            url: wsUrl,
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

export async function GET(request: NextRequest) {
  // Return available modes and status
  const personaplexAvailable = await checkPersonaPlexAvailable()
  const wsUrl = getWebSocketUrl(request, "test")

  return NextResponse.json({
    modes: {
      personaplex: {
        available: personaplexAvailable,
        url: wsUrl.replace("/test", ""),
        features: ["full_duplex", "barge_in", "backchannels"],
        voice: "NATF2.pt (Native Moshi TTS)",
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
