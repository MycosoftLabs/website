import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { hashPayload, hashLink, verifyRecordSignature, type MINDEXRecord } from "@/lib/mindex/crypto/hash-chain"

export const dynamic = "force-dynamic"

interface VerifyRequestBody {
  record: MINDEXRecord
  public_key?: string
}

export async function POST(request: Request) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "MINDEX integration is disabled. This endpoint requires a live MINDEX backend.",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true"],
      },
      { status: 503 },
    )
  }

  let body: VerifyRequestBody
  try {
    body = (await request.json()) as VerifyRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  if (!body?.record) {
    return NextResponse.json({ error: "Missing required field: record", code: "VALIDATION_ERROR" }, { status: 400 })
  }

  const record = body.record
  const publicKey = body.public_key || record.public_key

  const expectedDataHash = hashPayload(record.payload)
  const dataHashValid = expectedDataHash === record.data_hash

  const expectedLinkHash = hashLink(record.prev_hash ?? null, record.data_hash)
  const signatureValid = publicKey ? verifyRecordSignature(record, publicKey) : false

  return NextResponse.json({
    valid: dataHashValid && signatureValid,
    checks: {
      data_hash: { valid: dataHashValid, expected: expectedDataHash, actual: record.data_hash },
      signature: { valid: signatureValid, link_hash: expectedLinkHash, has_public_key: Boolean(publicKey) },
    },
    record_id: record.record_id,
    device_id: record.device_id,
    user_id: record.user_id,
    timestamp: record.timestamp,
  })
}

