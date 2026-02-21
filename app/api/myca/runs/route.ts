/**
 * Agent Runs API Route (BFF Proxy)
 *
 * Proxies requests to MYCA MAS agent run endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { listAgentRuns, startAgentRun } from "@/lib/integrations/myca-mas"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
  const agentId = searchParams.get("agentId") || undefined
  const status = (searchParams.get("status") as any) || undefined

  if (!env.integrationsEnabled) {
    return NextResponse.json({
      error: "MYCA MAS integration is disabled. This endpoint requires a live MYCA MAS backend.",
      code: "INTEGRATIONS_DISABLED",
      requiredEnv: ["INTEGRATIONS_ENABLED=true", "MYCA_MAS_API_BASE_URL", "MYCA_MAS_API_KEY"],
    }, { status: 503 })
  }

  try {
    const result = await listAgentRuns({ page, pageSize }, { agentId, status })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching agent runs:", error)
    return NextResponse.json({ error: "Failed to fetch agent runs", code: "MYCA_ERROR" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!env.integrationsEnabled) {
    return NextResponse.json({ error: "Integrations disabled", code: "INTEGRATIONS_DISABLED" }, { status: 503 })
  }

  try {
    const body = await request.json()

    if (!body.agentId) {
      return NextResponse.json({ error: "agentId is required", code: "VALIDATION_ERROR" }, { status: 400 })
    }

    const metadata = {
      ...(body.metadata || {}),
      user_id: body.user_id || "anonymous",
      session_id: body.session_id,
      conversation_id: body.conversation_id,
    }

    const result = await startAgentRun({
      agentId: body.agentId,
      input: body.input,
      metadata,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error starting agent run:", error)
    return NextResponse.json({ error: "Failed to start agent run", code: "MYCA_ERROR" }, { status: 500 })
  }
}
