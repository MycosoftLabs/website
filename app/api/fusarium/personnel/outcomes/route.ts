import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { buildKoRelay } from "@/lib/fusarium/personnel/ko-relay"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  const roleId = new URL(request.url).searchParams.get("role_id")
  const payload = await buildKoRelay(roleId)
  return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
