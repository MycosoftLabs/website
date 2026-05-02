import { NextResponse } from "next/server"
import { mindexProxyHeaders, mindexUrl } from "@/lib/server/mindex-proxy-request"

export const dynamic = "force-dynamic"

/** Proxies MINDEX emissions trend endpoints (real NOAA-backed series when upstream healthy). */
export async function GET() {
  const base = mindexUrl("/api/mindex/emissions")
  try {
    const [co2, ch4] = await Promise.all([
      fetch(`${base}/co2-trend`, {
        headers: mindexProxyHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${base}/methane-trend`, {
        headers: mindexProxyHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }),
    ])
    const co2Json = co2.ok ? await co2.json().catch(() => null) : null
    const ch4Json = ch4.ok ? await ch4.json().catch(() => null) : null
    return NextResponse.json({
      layer: "chemicals",
      ok: co2.ok || ch4.ok,
      upstream: {
        co2_trend: { status: co2.status, data: co2Json },
        methane_trend: { status: ch4.status, data: ch4Json },
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream_error"
    return NextResponse.json({ layer: "chemicals", ok: false, error: message }, { status: 502 })
  }
}
