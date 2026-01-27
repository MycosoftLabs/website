import { NextRequest, NextResponse } from "next/server"

/**
 * Voice Sessions API - January 27, 2026
 * Lists and manages active voice sessions
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET() {
  try {
    // Try to get sessions from MAS
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${MAS_API_URL}/voice/sessions`, {
      signal: controller.signal,
    }).catch(() => null)

    clearTimeout(timeoutId)

    if (res?.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    // Return empty if MAS not available
    return NextResponse.json({
      sessions: [],
      stats: {
        active_sessions: 0,
        total_sessions: 0,
        total_turns: 0,
        total_tool_invocations: 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sessions fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id required" },
        { status: 400 }
      )
    }

    // Notify MAS to end session
    await fetch(`${MAS_API_URL}/voice/sessions/${sessionId}`, {
      method: "DELETE",
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      ended_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Session end error:", error)
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    )
  }
}
