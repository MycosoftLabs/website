/**
 * Agent Runs API Route (BFF Proxy)
 *
 * Proxies requests to MYCA MAS agent run endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { listAgentRuns, startAgentRun } from "@/lib/integrations/myca-mas"
import { mockAgentRuns } from "@/lib/integrations/mock-data"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20")
  const agentId = searchParams.get("agentId") || undefined
  const status = (searchParams.get("status") as any) || undefined

  // Return mock data if integrations disabled
  if (!env.integrationsEnabled) {
    let filtered = mockAgentRuns
    if (agentId) filtered = filtered.filter((r) => r.agentId === agentId)
    if (status) filtered = filtered.filter((r) => r.status === status)

    return NextResponse.json({
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      meta: { total: filtered.length, page, pageSize, hasMore: filtered.length > page * pageSize },
    })
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

    const result = await startAgentRun({
      agentId: body.agentId,
      input: body.input,
      metadata: body.metadata,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error starting agent run:", error)
    return NextResponse.json({ error: "Failed to start agent run", code: "MYCA_ERROR" }, { status: 500 })
  }
}
