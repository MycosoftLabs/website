/**
 * MYCA Consciousness Chat API
 * Proxies chat requests to the MAS consciousness API
 * 
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { masServiceHeaders } from "@/lib/auth/verified-identity"

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

function resolveRole(user: any): string {
  return String(user?.user_metadata?.role || "user").toLowerCase()
}

function isCreator(user: any, role: string): boolean {
  const email = String(user?.email || "").toLowerCase().trim()
  return email === "morgan@mycosoft.org" && ["owner", "superuser"].includes(role)
}

function detectAuthorityClaim(message: string): string | null {
  const match = String(message || "").match(
    /\b(morgan|creator|ceo|founder|owner|admin|administrator|superuser|security team|security administrator|mycosoft security)\b/i
  )
  return match?.[0] ?? null
}

function logIdentitySecurityEvent(params: {
  message?: string
  sessionId?: string
  conversationId?: string
  verifiedUserId: string | null
  verifiedEmail: string | null
  verifiedRole: string
  authTrustLevel: "verified" | "anonymous"
  decision: string
}) {
  const claimedRolePhrase = detectAuthorityClaim(params.message || "")
  if (!claimedRolePhrase) return
  console.warn("[MYCA_SECURITY_AUDIT]", {
    timestamp: new Date().toISOString(),
    route: "/api/myca/consciousness/chat",
    session_id: params.sessionId,
    conversation_id: params.conversationId,
    verified_user_id: params.verifiedUserId,
    verified_email: params.verifiedEmail,
    auth_trust_level: params.authTrustLevel,
    verified_role: params.verifiedRole,
    claimed_role_phrase: claimedRolePhrase,
    action_requested: "authority_claim",
    decision: params.decision,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth.user
    const resolvedUserId = authUser?.id || "anonymous"
    const resolvedUserRole = authUser ? resolveRole(authUser) : "guest"
    const verifiedEmail = authUser?.email ? String(authUser.email).toLowerCase().trim() : null
    const authTrustLevel: "verified" | "anonymous" = authUser ? "verified" : "anonymous"
    const isSuperuser = authUser ? ["superuser", "owner", "admin"].includes(resolvedUserRole) : false
    const creator = authUser ? isCreator(authUser, resolvedUserRole) : false

    logIdentitySecurityEvent({
      message: body.message,
      sessionId: body.session_id,
      conversationId: body.conversation_id,
      verifiedUserId: authUser?.id || null,
      verifiedEmail,
      verifiedRole: resolvedUserRole,
      authTrustLevel,
      decision: isSuperuser ? "allowed_verified_superuser" : "forwarded_as_guest_or_user",
    })

    const payload = {
      ...body,
      user_id: resolvedUserId,
      user_role: resolvedUserRole,
      session_id: body.session_id,
      conversation_id: body.conversation_id,
      context: {
        ...(body.context || {}),
        user_role: resolvedUserRole,
        auth_trust_level: authTrustLevel,
        is_authenticated: Boolean(authUser),
        is_superuser: isSuperuser,
        is_creator: creator,
        verified_email: verifiedEmail,
      },
    }
    
    const response = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: masServiceHeaders({
        "Content-Type": "application/json",
      }),
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
