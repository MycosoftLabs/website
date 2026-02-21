import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface SyncMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
  agent?: string
  metadata?: Record<string, unknown>
}

interface SyncRequest {
  session_id: string
  user_id?: string
  conversation_id?: string | null
  messages?: SyncMessage[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get("session_id")
  const userId = searchParams.get("user_id") || "anonymous"

  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${MAS_API_URL}/memory/conversations?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" }
    )
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `MAS memory error: ${errorText}` },
        { status: response.status }
      )
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MYCA sync GET error:", error)
    return NextResponse.json(
      { error: "Failed to restore MYCA memory" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json()
    const { session_id, user_id, conversation_id, messages = [] } = body

    if (!session_id || messages.length === 0) {
      return NextResponse.json(
        { error: "session_id and messages are required" },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled(
      messages.map((message) =>
        fetch(`${MAS_API_URL}/memory/store`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id,
            user_id: user_id || "anonymous",
            message: message.content,
            role: message.role,
            agent: message.agent,
            context: {
              conversation_id,
              ...message.metadata,
            },
            timestamp: message.timestamp || new Date().toISOString(),
          }),
        })
      )
    )

    const stored = results.filter((r) => r.status === "fulfilled" && r.value.ok).length

    return NextResponse.json({
      stored,
      total: messages.length,
    })
  } catch (error) {
    console.error("MYCA sync POST error:", error)
    return NextResponse.json(
      { error: "Failed to sync MYCA messages" },
      { status: 500 }
    )
  }
}
