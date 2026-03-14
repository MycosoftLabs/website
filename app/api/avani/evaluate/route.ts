import { NextRequest, NextResponse } from "next/server"
import { evaluateGovernance } from "@/lib/services/avani-governance"

/**
 * POST /api/avani/evaluate
 *
 * Run an Avani governance evaluation on a message/action.
 * Called by the MYCA orchestrator on every interaction.
 *
 * Body: {
 *   message: string
 *   user_id: string
 *   user_role: string
 *   is_superuser: boolean
 *   action_type: "chat" | "agent_dispatch" | "workflow" | "device_control" | "data_access" | "system_config"
 *   response_text?: string
 *   context?: Record<string, unknown>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      message,
      user_id = "anonymous",
      user_role = "user",
      is_superuser = false,
      action_type = "chat",
      response_text,
      context,
    } = body

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const evaluation = await evaluateGovernance({
      message,
      user_id,
      user_role,
      is_superuser,
      action_type,
      response_text,
      context,
    })

    return NextResponse.json(evaluation)
  } catch (error) {
    console.error("[Avani] Evaluation error:", error)
    return NextResponse.json(
      { error: "Avani governance evaluation failed" },
      { status: 500 }
    )
  }
}
