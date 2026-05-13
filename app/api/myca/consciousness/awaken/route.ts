/**
 * MYCA Consciousness Awaken API
 * Wakes MYCA from dormant state
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { identityRuntimeContext, masServiceHeaders, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const identity = await resolveVerifiedIdentity()
    const payload = {
      ...body,
      user_id: identity.userId,
      user_role: identity.userRole,
      session_id: body.session_id,
      conversation_id: body.conversation_id,
      context: {
        ...(body.context || {}),
        ...identityRuntimeContext(identity),
      },
    }

    const response = await fetch(`${MAS_API_URL}/api/myca/awaken`, {
      method: "POST",
      headers: {
        ...masServiceHeaders({ "Content-Type": "application/json" }),
      },
      body: JSON.stringify(payload),
    })
    
    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { 
          success: false,
          error: `MAS API error: ${error}`,
        },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error("MYCA awaken error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to MYCA",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // GET request returns info about the awaken endpoint
  return NextResponse.json({
    endpoint: "/api/myca/consciousness/awaken",
    method: "POST",
    description: "Wakes MYCA from dormant state to active consciousness",
    masEndpoint: `${MAS_API_URL}/api/myca/awaken`,
  })
}
