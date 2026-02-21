/**
 * MYCA Consciousness World Model API
 * Returns MYCA's current perception of the world (sensor data)
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const sessionId = searchParams.get("session_id")
    const conversationId = searchParams.get("conversation_id")
    const url = new URL(`${MAS_API_URL}/api/myca/world`)
    if (userId) url.searchParams.set("user_id", userId)
    if (sessionId) url.searchParams.set("session_id", sessionId)
    if (conversationId) url.searchParams.set("conversation_id", conversationId)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          sensors: {},
          update_count: 0,
          available: false,
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 }
      )
    }
    
    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA world error:", error)
    return NextResponse.json(
      { 
        sensors: {},
        update_count: 0,
        available: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 }
    )
  }
}
