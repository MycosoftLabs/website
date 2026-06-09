import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { masServiceHeaders } from "@/lib/auth/verified-identity"
import { deriveServerRole } from "@/lib/auth/server-role"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

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

function getVerifiedRole(authUser: any): string {
  // SECURITY: role from verified email, not user-writable user_metadata.
  return deriveServerRole(authUser)
}

function canWriteTraining(authUser: any): boolean {
  return ["owner", "superuser"].includes(getVerifiedRole(authUser))
}

// Store training data
export async function POST(request: NextRequest) {
  try {
    const data: TrainingData = await request.json()
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth.user

    if (!authUser) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: "Training capture requires a signed-in session",
      })
    }

    if (!canWriteTraining(authUser)) {
      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          authorized: false,
          message: "Training capture requires owner or superuser authorization",
        },
        { status: 403 }
      )
    }

    const payload = {
      ...data,
      userId: authUser.id,
      session_id: data.session_id,
      conversation_id: data.conversation_id,
      source: data.source || "myca-chat",
      timestamp: data.timestamp || new Date().toISOString(),
      metadata: {
        ...(data.metadata || {}),
        verified_role: getVerifiedRole(authUser),
        verified_email: authUser.email || null,
        auth_trust_level: "verified",
      },
    }

    const upstream = await fetch(`${MAS_API_URL}/api/training/log`, {
      method: "POST",
      headers: masServiceHeaders({ "Content-Type": "application/json" }, {
        userId: authUser.id,
        userRole: getVerifiedRole(authUser),
        email: authUser.email || null,
        authTrustLevel: "verified",
      }),
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
      return NextResponse.json({ authenticated: false, stats: null, items: [] })
    }

    const type = request.nextUrl.searchParams.get("type")
    const upstreamUrl = new URL(`${MAS_API_URL}/api/training/stats`)
    upstreamUrl.searchParams.set("user_id", auth.user.id)
    if (type) upstreamUrl.searchParams.set("type", type)

    const upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: masServiceHeaders({}, {
        userId: auth.user.id,
        userRole: getVerifiedRole(auth.user),
        email: auth.user.email || null,
        authTrustLevel: "verified",
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!upstream.ok) {
      const details = await upstream.text()
      return NextResponse.json({ available: false, stats: null, items: [], error: "Failed to fetch training stats", details })
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ available: false, stats: null, items: [], error: error instanceof Error ? error.message : "Failed to fetch training stats" })
  }
}
