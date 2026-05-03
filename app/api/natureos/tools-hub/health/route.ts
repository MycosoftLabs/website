import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const TIMEOUT_MS = 5000

async function ping(url: string, path: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return { ok: r.ok, status: r.status }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "fetch_failed" }
  }
}

export async function GET() {
  const masUrl = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "").replace(/\/$/, "")
  const mindexUrlResolved = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const natureosUrl = (process.env.NATUREOS_API_BASE_URL || env.natureosApiBaseUrl || "").replace(/\/$/, "")

  const [mas, mindex, natureos] = await Promise.all([
    masUrl
      ? ping(masUrl, "/health").then((r) => ({ ...r, urlConfigured: true as const }))
      : Promise.resolve({
          ok: false,
          status: 0,
          error: "mas_not_configured",
          urlConfigured: false as const,
        }),
    mindexUrlResolved
      ? ping(mindexUrlResolved, "/health").then((r) => ({ ...r, urlConfigured: true as const }))
      : Promise.resolve({
          ok: false,
          status: 0,
          error: "mindex_not_configured",
          urlConfigured: false as const,
        }),
    natureosUrl
      ? ping(natureosUrl, "/api/health").then((r) => ({ ...r, urlConfigured: true as const }))
      : Promise.resolve({
          ok: false,
          status: 0,
          error: "natureos_not_configured",
          urlConfigured: false as const,
        }),
  ])

  return NextResponse.json({
    mas,
    mindex,
    natureos,
    checkedAt: new Date().toISOString(),
  })
}
