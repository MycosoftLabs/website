import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { anchorRecords, type AnchorRequest } from "@/lib/mindex/anchoring/anchor"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  let body: AnchorRequest
  try {
    body = (await request.json()) as AnchorRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  if (!Array.isArray(body.record_ids) || !body.record_ids.length || !body.ledger) {
    return NextResponse.json(
      { error: "Missing required fields: record_ids[], ledger", code: "VALIDATION_ERROR" },
      { status: 400 },
    )
  }

  if (!["hypergraph", "solana", "bitcoin"].includes(body.ledger)) {
    return NextResponse.json({ error: "Invalid ledger", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const result = await anchorRecords(body)
  
  // Return appropriate status code based on result
  // 503 Service Unavailable - when ledger URL is not configured or ledger is down
  // 502 Bad Gateway - when ledger request fails
  // 200 OK - when successful
  const status = result.ok ? 200 : (result.message?.includes("not configured") ? 503 : 502)
  
  return NextResponse.json(result, { status })
}

