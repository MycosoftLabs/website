import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { inspectCompound, type CompoundEvidenceInput } from "@/lib/fusarium/compound-analyser/inspection"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const length = Number(request.headers.get("content-length") || 0)
  if (length > 16_384) return NextResponse.json({ error: "Payload exceeds 16 KiB." }, { status: 413 })
  const body = await request.json().catch(() => null) as CompoundEvidenceInput | null
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A JSON compound evidence object is required." }, { status: 400 })
  }
  return NextResponse.json(inspectCompound(body), {
    headers: { "Cache-Control": "no-store", "X-Fusarium-Operation": "read-only-inspection" },
  })
}
