import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { PERSONA_PROFILES } from "@/lib/fusarium/personnel/personas"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  return NextResponse.json(
    {
      persona_count: PERSONA_PROFILES.length,
      owner_sees_all: true,
      personas: PERSONA_PROFILES,
      note: "18 duty shells plus owner_full. 180 unique pages are not created. Import grants no access.",
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  )
}
