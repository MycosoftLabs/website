import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { parseSituationalContext } from "@/lib/fusarium/situational-awareness/deep-links"
import {
  buildMycaSituationalContext,
  evaluateMycaProposal,
} from "@/lib/fusarium/situational-awareness/myca-context"

export const dynamic = "force-dynamic"
export const revalidate = 0

const MAX_PROPOSAL_BYTES = 24 * 1024

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}

export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error
  const context = parseSituationalContext(request.nextUrl.searchParams)
  return response(buildMycaSituationalContext(context))
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const declaredLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROPOSAL_BYTES) {
    return response({ error: "payload_too_large", maxBytes: MAX_PROPOSAL_BYTES }, 413)
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf8") > MAX_PROPOSAL_BYTES) {
    return response({ error: "payload_too_large", maxBytes: MAX_PROPOSAL_BYTES }, 413)
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return response({ error: "invalid_json" }, 400)
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const decision = evaluateMycaProposal(record.context, record.proposal)
  const receivedAt = new Date().toISOString()
  const proposalDigest = createHash("sha256")
    .update(JSON.stringify({ context: record.context ?? null, proposal: record.proposal ?? null }))
    .digest("hex")

  return response({
    schema: "fusarium-sa-myca-proposal-decision/v1",
    classification: "UNCLASSIFIED",
    validation: "complete",
    receivedAt,
    proposalDigest,
    decision,
    audit: {
      persistence: "none",
      note: "The digest and decision are returned to the operator but are not persisted by this route.",
    },
  })
}
