/**
 * MYCA Intention API - Proxies to MAS intention tracker
 * Created: Feb 12, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { identityRuntimeContext, masServiceHeaders, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    const res = await fetch(`${MAS_API_URL}/api/myca/intention`, {
      method: "POST",
      headers: masServiceHeaders({ "Content-Type": "application/json" }, identity),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `MAS intention error: ${text}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    // Intention tracking is non-critical - silent fail
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Tracking failed",
      },
      { status: 500 }
    )
  }
}
