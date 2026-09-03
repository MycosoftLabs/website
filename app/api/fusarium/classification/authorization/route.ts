import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"

/**
 * Commercial-runtime classification capability.
 *
 * This host is UNCLASSIFIED-only. Owner allowlisting proves neither clearance,
 * need-to-know, releasability, policy authorization, nor environment
 * accreditation, so no session can raise the selectable level. A future
 * higher-tier route requires all of those claims from server-verified sources;
 * until then this endpoint is a static fail-closed capability probe.
 */

export const dynamic = "force-dynamic"

/** What this host is accredited to process. Not operator-dependent. */
const ACCREDITED_LEVEL = "U" as const

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }
  return NextResponse.json({
    authorized: false,
    maxSelectableLevel: ACCREDITED_LEVEL,
    accreditedLevel: ACCREDITED_LEVEL,
    reason: "commercial_unclassified_boundary",
    decidedAt: new Date().toISOString(),
  })
}
