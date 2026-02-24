import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface TrainingData {
  type: string
  input: string
  output: string
  context: string
  timestamp: string
  source: string
  userId?: string
  session_id?: string
  conversation_id?: string
  feedback?: string
  metadata?: Record<string, any>
}

// Store training data
export async function POST(request: NextRequest) {
  try {
    const data: TrainingData = await request.json()
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth.user

    if (!authUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const payload = {
      ...data,
      userId: data.userId || authUser.id,
      session_id: data.session_id,
      conversation_id: data.conversation_id,
      source: data.source || "myca-chat",
      timestamp: data.timestamp || new Date().toISOString(),
    }

    const upstream = await fetch(`${MAS_API_URL}/api/training/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    if (!upstream.ok) {
      const details = await upstream.text()
      return NextResponse.json(
        {
          error: "Failed to persist training data",
          details,
        },
        { status: upstream.status }
      )
    }

    const result = await upstream.json().catch(() => ({}))

    return NextResponse.json({
      success: true,
      message: "Training data persisted",
      result,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log training data" },
      { status: 500 }
    )
  }
}

// Get training statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const type = request.nextUrl.searchParams.get("type")
    const upstreamUrl = new URL(`${MAS_API_URL}/api/training/stats`)
    upstreamUrl.searchParams.set("user_id", auth.user.id)
    if (type) upstreamUrl.searchParams.set("type", type)

    const upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })

    if (!upstream.ok) {
      const details = await upstream.text()
      return NextResponse.json(
        { error: "Failed to fetch training stats", details },
        { status: upstream.status }
      )
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch training stats" },
      { status: 500 }
    )
  }
}
