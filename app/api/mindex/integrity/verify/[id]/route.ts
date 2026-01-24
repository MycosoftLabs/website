import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { verifyRecordSignature, type MINDEXRecord } from "@/lib/mindex/crypto/hash-chain"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

async function fetchRecordById(recordId: string): Promise<MINDEXRecord> {
  const res = await fetch(`${MINDEX_API_URL}/api/mindex/integrity/records/${encodeURIComponent(recordId)}`, {
    headers: {
      "X-API-Key": env.mindexApiKey || "",
    },
    signal: AbortSignal.timeout(15000),
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
    const publicKey = record.public_key
    if (!publicKey) {
      return NextResponse.json(
        { valid: false, error: "Record is missing public_key for signature verification", code: "MISSING_PUBLIC_KEY" },
        { status: 422 },
      )
    }

    const signatureValid = verifyRecordSignature(record, publicKey)
    return NextResponse.json({
      valid: signatureValid,
      record_id: record.record_id,
      device_id: record.device_id,
      user_id: record.user_id,
      timestamp: record.timestamp,
    })
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to verify record integrity",
        details: error instanceof Error ? error.message : String(error),
        code: "INTEGRITY_VERIFY_FAILED",
      },
      { status: 501 },
    )
  }
}

