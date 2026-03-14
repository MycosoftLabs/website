/**
 * Agent Registry ETL Trigger API
 *
 * POST: Trigger a full ETL pipeline run
 * GET: Get last ETL status
 */

import { NextResponse } from "next/server"
import { runAgentRegistryETL } from "@/lib/mindex/agent-registry-etl"

export const dynamic = "force-dynamic"

let lastETLResult: Awaited<ReturnType<typeof runAgentRegistryETL>> | null = null
let lastRunTime: string | null = null
let isRunning = false

export async function POST() {
  if (isRunning) {
    return NextResponse.json(
      { error: "ETL pipeline is already running", lastRunTime },
      { status: 409 },
    )
  }

  isRunning = true
  try {
    lastETLResult = await runAgentRegistryETL()
    lastRunTime = new Date().toISOString()
    return NextResponse.json({
      ...lastETLResult,
      runTime: lastRunTime,
    })
  } finally {
    isRunning = false
  }
}

export async function GET() {
  return NextResponse.json({
    status: isRunning ? "running" : "idle",
    lastResult: lastETLResult,
    lastRunTime,
    pipelineSources: [
      "HuggingFace Hub API",
      "NPM MCP Registry",
      "PyPI Agent Frameworks",
      "OpenAQ Air Quality",
    ],
  })
}
