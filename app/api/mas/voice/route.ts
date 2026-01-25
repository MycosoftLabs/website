import { NextRequest, NextResponse } from "next/server"

// MAS API URL - points to the MAS VM orchestrator
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const MYCA_VOICE_ID = process.env.MYCA_VOICE_ID || "aEO01A4wXwd1O8GPgGlF" // Arabella - MYCA's voice

/**
 * POST /api/mas/voice
 * Text-to-speech synthesis using ElevenLabs for MYCA
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice_id } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Try MAS orchestrator TTS endpoint first
    try {
      const masResponse = await fetch(`${MAS_API_URL}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          voice_id: voice_id || MYCA_VOICE_ID,
          model_id: "eleven_turbo_v2_5"
        }),
      })

      if (masResponse.ok) {
        const audioBuffer = await masResponse.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        })
      }
    } catch (masError) {
      console.log("MAS TTS unavailable, trying direct ElevenLabs")
    }

    // Direct ElevenLabs call if MAS is unavailable
    if (ELEVENLABS_API_KEY) {
      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice_id || MYCA_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
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

      if (elevenLabsResponse.ok) {
        const audioBuffer = await elevenLabsResponse.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        })
      }
    }

    // Return error if no TTS available
    return NextResponse.json(
      { error: "Voice synthesis unavailable. Configure ELEVENLABS_API_KEY." },
      { status: 503 }
    )
  } catch (error) {
    console.error("Voice API error:", error)
    return NextResponse.json(
      { error: "Voice synthesis failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mas/voice
 * Get voice configuration
 */
export async function GET() {
  return NextResponse.json({
    voice_id: MYCA_VOICE_ID,
    voice_name: "Arabella",
    model: "eleven_turbo_v2_5",
    elevenlabs_configured: !!ELEVENLABS_API_KEY,
    mas_url: MAS_API_URL,
  })
}
