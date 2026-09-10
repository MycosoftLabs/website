import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { getPersonnelCatalog } from "@/lib/fusarium/personnel/catalog"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  const catalog = getPersonnelCatalog()
  return NextResponse.json(catalog, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
}
