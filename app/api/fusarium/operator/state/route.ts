import { NextResponse } from "next/server"
import { requireFusariumOwner, fusariumOperationalDeniedResponse } from "@/lib/auth/api-auth"
import { probeFusariumRuntime } from "@/lib/fusarium-runtime-probe"

export const dynamic = "force-dynamic"

/**
 * Owner-gated operator health. Honest bind status only — never invented telemetry.
 */
export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) {
    const status = auth.error.status === 403 ? 403 : 401
    return fusariumOperationalDeniedResponse(status)
  }

  try {
    const runtime = await probeFusariumRuntime()
    return NextResponse.json(
      {
        status: runtime.reachable ? "live" : "unreachable",
        data_state: runtime.reachable ? "bound" : "unbound",
        originConfigured: runtime.originConfigured,
        httpStatus: runtime.status,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    )
  } catch {
    return NextResponse.json(
      {
        status: "not_bound",
        data_state: "unbound",
        originConfigured: false,
        httpStatus: 503,
      },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    )
  }
}
