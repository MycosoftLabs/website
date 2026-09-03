import { NextResponse } from "next/server"
import { fusariumOperationalDeniedResponse, requireFusariumOwner } from "@/lib/auth/api-auth"
import { hasUsableFusariumSidecar, probeFusariumRuntime } from "@/lib/fusarium-runtime-probe"

export const dynamic = "force-dynamic"

const ALLOWED_INTERNAL_PREFIXES = ["http://127.0.0.1:", "http://localhost:"]

function isAllowedInternalOrigin(origin: string): boolean {
  return ALLOWED_INTERNAL_PREFIXES.some((prefix) => origin.startsWith(prefix))
}

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    return fusariumOperationalDeniedResponse(auth.error.status === 403 ? 403 : 401)
  }

  const configured = hasUsableFusariumSidecar()
    ? (process.env.FUSARIUM_INTERNAL_ORIGIN || "").replace(/\/$/, "")
    : "http://127.0.0.1:3000"
  if (!isAllowedInternalOrigin(configured)) {
    return NextResponse.json(
      {
        error: "Internal Fusarium origin is not an allowed loopback bind",
        data_state: "withheld",
      },
      { status: 403 }
    )
  }

  const probe = await probeFusariumRuntime()
  return NextResponse.json({
    ok: probe.reachable,
    status: probe.status,
    service: "fusarium-website-bff",
    bind: "loopback-only",
  })
}
