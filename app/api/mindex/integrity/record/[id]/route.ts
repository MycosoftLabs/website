import { type NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/env"
import type { MINDEXRecord } from "@/lib/mindex/crypto/hash-chain"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

async function fetchRecordById(recordId: string): Promise<MINDEXRecord> {
  const res = await fetch(`${MINDEX_API_URL}/api/mindex/integrity/records/${encodeURIComponent(recordId)}`, {
    headers: {
      "X-API-Key": env.mindexApiKey || "",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Upstream MINDEX does not provide integrity record endpoint (status ${res.status})`)
  }

  return res.json()
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "MINDEX integration is disabled. This endpoint requires a live MINDEX backend.",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL", "MINDEX_API_KEY"],
      },
      { status: 503 },
    )
  }

  const { id } = await context.params

  try {
    const record = await fetchRecordById(id)
    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch integrity record",
        details: error instanceof Error ? error.message : String(error),
        code: "UPSTREAM_ERROR",
        info: "Ensure MINDEX API is accessible at the configured URL and provides integrity record endpoints.",
      },
      { status: 503 },
    )
  }
}

