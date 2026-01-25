import { NextRequest, NextResponse } from "next/server"

// MAS API URL
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

// Supabase for memory persistence
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface ConversationMemory {
  id: string
  user_id: string
  session_id: string
  messages: Array<{
    role: "user" | "assistant" | "system"
    content: string
    timestamp: string
    agent?: string
  }>
  context: {
    topics: string[]
    entities: string[]
    intent_history: string[]
  }
  created_at: string
  updated_at: string
}

/**
 * GET /api/mas/memory
 * Retrieve conversation history and context
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const userId = searchParams.get("user_id") || "default"
    const limit = parseInt(searchParams.get("limit") || "50")

    // Try MAS memory endpoint first
    try {
      const masResponse = await fetch(
        `${MAS_API_URL}/memory/conversations?user_id=${userId}&session_id=${sessionId || ""}&limit=${limit}`,
        { cache: "no-store" }
      )

      if (masResponse.ok) {
        const data = await masResponse.json()
        return NextResponse.json(data)
      }
    } catch (masError) {
      console.log("MAS memory endpoint unavailable")
    }

    // Fallback to Supabase if MAS unavailable
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/myca_conversations?user_id=eq.${userId}&order=updated_at.desc&limit=${limit}`,
        {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )

      if (supabaseResponse.ok) {
        const data = await supabaseResponse.json()
        return NextResponse.json({
          conversations: data,
          source: "supabase",
        })
      }
    }

    // Return empty if no memory system available
    return NextResponse.json({
      conversations: [],
      source: "none",
      message: "No memory system configured",
    })
  } catch (error) {
    console.error("Memory API error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve memory" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mas/memory
 * Store conversation turn
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, user_id, message, role, agent, context } = body

    if (!message || !role) {
      return NextResponse.json(
        { error: "message and role are required" },
        { status: 400 }
      )
    }

    // Try MAS memory endpoint first
    try {
      const masResponse = await fetch(`${MAS_API_URL}/memory/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          user_id: user_id || "default",
          message,
          role,
          agent,
          context,
          timestamp: new Date().toISOString(),
        }),
      })

      if (masResponse.ok) {
        const data = await masResponse.json()
        return NextResponse.json(data)
      }
    } catch (masError) {
      console.log("MAS memory store unavailable")
    }

    // Fallback to Supabase
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/myca_conversation_messages`,
        {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            session_id: session_id || `session-${Date.now()}`,
            user_id: user_id || "default",
            role,
            content: message,
            agent,
            context,
            created_at: new Date().toISOString(),
          }),
        }
      )

      if (supabaseResponse.ok) {
        return NextResponse.json({
          stored: true,
          source: "supabase",
        })
      }
    }

    // Return success even if no storage (for graceful degradation)
    return NextResponse.json({
      stored: false,
      message: "Memory system not configured",
    })
  } catch (error) {
    console.error("Memory store error:", error)
    return NextResponse.json(
      { error: "Failed to store memory" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mas/memory
 * Clear conversation memory
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const userId = searchParams.get("user_id") || "default"

    // Try MAS first
    try {
      const masResponse = await fetch(
        `${MAS_API_URL}/memory/clear?user_id=${userId}&session_id=${sessionId || ""}`,
        { method: "DELETE" }
      )

      if (masResponse.ok) {
        return NextResponse.json({ cleared: true, source: "mas" })
      }
    } catch {
      console.log("MAS memory clear unavailable")
    }

    return NextResponse.json({ cleared: false, message: "Could not clear memory" })
  } catch (error) {
    console.error("Memory clear error:", error)
    return NextResponse.json({ error: "Failed to clear memory" }, { status: 500 })
  }
}
