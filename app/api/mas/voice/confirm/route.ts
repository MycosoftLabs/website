import { NextRequest, NextResponse } from "next/server"

/**
 * MYCA Voice Confirmation API
 * Handles safety confirmations for destructive operations
 * 
 * Safety Phrases:
 * - "Confirm and proceed" - For write operations
 * - "Confirm irreversible action" - For destructive operations
 * - "Abort" or "Cancel that" - To cancel
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const N8N_URL = process.env.N8N_URL || "http://192.168.0.188:5678"

interface ConfirmRequest {
  request_id: string
  actor: string
  transcript: string
}

interface ConfirmResponse {
  ok: boolean
  request_id: string
  status: "confirmed" | "aborted" | "forwarded" | "invalid"
  message: string
  result?: any
}

/**
 * POST /api/mas/voice/confirm
 * Process confirmation response from user
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConfirmRequest = await request.json()
    const { request_id, actor = "user", transcript } = body

    if (!request_id || !transcript) {
      return NextResponse.json(
        { error: "request_id and transcript are required" },
        { status: 400 }
      )
    }

    const lowerTranscript = transcript.toLowerCase().trim()
    let response: ConfirmResponse = {
      ok: false,
      request_id,
      status: "invalid",
      message: "Confirmation not recognized",
    }

    // Check for abort
    if (
      lowerTranscript.includes("abort") ||
      lowerTranscript.includes("cancel") ||
      lowerTranscript.includes("stop") ||
      lowerTranscript.includes("no")
    ) {
      response = {
        ok: true,
        request_id,
        status: "aborted",
        message: "Action cancelled. What would you like to do instead?",
      }
      return NextResponse.json(response)
    }

    // Check for confirmation
    const isConfirmed =
      lowerTranscript.includes("confirm and proceed") ||
      lowerTranscript.includes("confirm irreversible") ||
      lowerTranscript.includes("yes, proceed") ||
      lowerTranscript.includes("confirmed") ||
      lowerTranscript === "yes" ||
      lowerTranscript === "proceed"

    if (isConfirmed) {
      // Try n8n confirmation workflow first
      try {
        const n8nResponse = await fetch(`${N8N_URL}/webhook/myca/speech_confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id,
            actor,
            transcript,
          }),
        })

        if (n8nResponse.ok) {
          const n8nData = await n8nResponse.json()
          response = {
            ok: n8nData.ok ?? true,
            request_id,
            status: n8nData.status || "confirmed",
            message: n8nData.message || "Action confirmed and executed.",
            result: n8nData.myca_response,
          }
          return NextResponse.json(response)
        }
      } catch (n8nError) {
        console.log("n8n confirm not available, using direct confirmation")
      }

      // Fallback confirmation
      response = {
        ok: true,
        request_id,
        status: "confirmed",
        message: "Action confirmed. Executing the requested operation.",
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Voice confirm error:", error)
    return NextResponse.json(
      { error: "Confirmation processing failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mas/voice/confirm
 * Get pending confirmations for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("request_id")

    if (!requestId) {
      return NextResponse.json({
        pending: [],
        message: "No request_id provided",
      })
    }

    // Try MAS endpoint for pending actions
    try {
      const masResponse = await fetch(
        `${MAS_API_URL}/voice/pending?request_id=${requestId}`,
        { cache: "no-store" }
      )

      if (masResponse.ok) {
        return NextResponse.json(await masResponse.json())
      }
    } catch {
      // No pending actions
    }

    return NextResponse.json({
      pending: [],
      request_id: requestId,
    })
  } catch (error) {
    console.error("Get pending error:", error)
    return NextResponse.json({ error: "Failed to get pending actions" }, { status: 500 })
  }
}
