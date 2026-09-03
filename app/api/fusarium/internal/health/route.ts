import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Loopback-only Fusarium website BFF liveness.
 * The public console is hosted by this Next process — not Windows :8212.
 * Operator state probes this from 127.0.0.1 inside the website container.
 */
function isLoopbackRequest(request: NextRequest): boolean {
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim()
  if (forwarded && forwarded !== "127.0.0.1" && forwarded !== "::1" && forwarded !== "::ffff:127.0.0.1") {
    return false
  }
  const probe = request.headers.get("x-fusarium-internal-probe")
  if (probe !== "website-bff") return false
  const host = (request.headers.get("host") || "").split(":")[0]
  return host === "127.0.0.1" || host === "localhost" || host === "::1"
}

export async function GET(request: NextRequest) {
  if (!isLoopbackRequest(request)) {
    return NextResponse.json(
      { error: "Fusarium internal health is loopback-only", data_state: "withheld" },
      { status: 403 },
    )
  }
  return NextResponse.json({
    ok: true,
    status: "live",
    service: "fusarium-website-bff",
    bind: "loopback-only",
  })
}
