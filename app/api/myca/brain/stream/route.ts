/**
 * MYCA Brain Stream API
 * Proxies streaming chat to MAS /voice/brain/stream
 * Created: Feb 12, 2026
 */

import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { masServiceHeaders } from "@/lib/auth/verified-identity"

const MAS_API_URL =
  process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://localhost:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const authUser = auth.user
    const verifiedRole = String(authUser?.user_metadata?.role || "guest").toLowerCase()
    const verifiedEmail = authUser?.email ? String(authUser.email).toLowerCase().trim() : null
    const isCreator =
      verifiedEmail === "morgan@mycosoft.org" &&
      ["owner", "superuser"].includes(verifiedRole)
    const isSuperuser = ["owner", "superuser", "admin"].includes(verifiedRole)

    const payload = {
      ...body,
      user_id: authUser?.id || "anonymous",
      user_role: authUser ? verifiedRole : "guest",
      session_id: body.session_id,
      conversation_id: body.conversation_id,
      context: {
        ...(body.context || {}),
        auth_trust_level: authUser ? "verified" : "anonymous",
        is_authenticated: Boolean(authUser),
        is_superuser: isSuperuser,
        is_creator: isCreator,
        verified_email: verifiedEmail,
      },
    }
    const response = await fetch(`${MAS_API_URL}/voice/brain/stream`, {
      method: "POST",
      headers: masServiceHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const text = await response.text()
      return new Response(
        JSON.stringify({ error: `MAS Brain error: ${text}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("MYCA brain stream error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to connect to MYCA Brain",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
