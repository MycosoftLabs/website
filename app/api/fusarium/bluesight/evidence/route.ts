import { type NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import {
  BLUESIGHT_EVIDENCE_MAX_BYTES,
  BLUESIGHT_EVIDENCE_SCHEMA,
  validateBlueSightEvidence,
} from "@/lib/fusarium/bluesight-evidence/contracts"

export const dynamic = "force-dynamic"

const headers = { "Cache-Control": "no-store, max-age=0" } as const

/** Local validation only: no persistence, connector, device read, or external request. */
export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > BLUESIGHT_EVIDENCE_MAX_BYTES) {
    return NextResponse.json({ schema: BLUESIGHT_EVIDENCE_SCHEMA, state: "error", issues: ["Import exceeds the 2 MiB limit."] }, { status: 413, headers })
  }
  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > BLUESIGHT_EVIDENCE_MAX_BYTES) {
    return NextResponse.json({ schema: BLUESIGHT_EVIDENCE_SCHEMA, state: "error", issues: ["Import exceeds the 2 MiB limit."] }, { status: 413, headers })
  }
  let input: unknown
  try {
    input = JSON.parse(body)
  } catch {
    return NextResponse.json({ schema: BLUESIGHT_EVIDENCE_SCHEMA, state: "error", issues: ["Import is not valid JSON."] }, { status: 400, headers })
  }
  const result = validateBlueSightEvidence(input)
  return NextResponse.json(result, { status: result.ok ? 200 : 422, headers })
}
