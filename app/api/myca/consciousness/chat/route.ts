/**
 * MYCA Consciousness Chat API
 * Proxies chat requests to the MAS consciousness API
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload = {
      ...body,
      user_id: body.user_id || "anonymous",
      session_id: body.session_id,
      conversation_id: body.conversation_id,
    }
    
    const response = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `MAS API error: ${error}` },
        { status: response.status }
      )
    }
    
    // Check if this is a streaming response
    const contentType = response.headers.get("content-type")
    if (contentType?.includes("text/event-stream")) {
      // Forward SSE stream
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MYCA consciousness chat error:", error)
    return NextResponse.json(
      { 
        error: "Failed to connect to MYCA consciousness",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
