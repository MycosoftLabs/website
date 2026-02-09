/**
 * Voice Command Proxy Route - February 6, 2026
 * Proxies voice commands to MAS VoiceCommandRouter
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${MAS_URL}/voice/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        session_id: body.session_id,
        user_id: body.user_id,
        source: body.source || "website",
        context: body.context,
      }),
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `MAS returned ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error("[Voice Command] Error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Voice command service unavailable",
        needs_llm_response: true
      },
      { status: 503 }
    )
  }
}

export async function GET() {
  // Return help/domains
  try {
    const response = await fetch(`${MAS_URL}/voice/command/domains`)
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    // Fallback domains
  }
  
  return NextResponse.json({
    domains: {
      earth2: { description: "Weather forecasts", examples: ["show forecast"] },
      map: { description: "Map navigation", examples: ["go to Tokyo", "zoom in"] },
      crep: { description: "CREP layers", examples: ["show satellites"] },
      system: { description: "System control", examples: ["system status"] },
    }
  })
}