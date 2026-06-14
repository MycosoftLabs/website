import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"

const MAS_CREP_STATUS_PATHS = ["/api/crep/status", "/api/crep/stream/status"] as const

export async function GET() {
  const masUrl = resolveMasServerBaseUrl()
  if (!masUrl) {
    return Response.json(
      { status: "unavailable", error: "MAS_API_URL is not configured" },
      { status: 503 }
    )
  }

  let lastError = "MAS CREP status unavailable"

  for (const path of MAS_CREP_STATUS_PATHS) {
    try {
      const res = await fetch(`${masUrl}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
        headers: { Accept: "application/json" },
      })
      if (!res.ok) {
        lastError = `MAS returned ${res.status} for ${path}`
        continue
      }
      const body = await res.json()
      return Response.json({
        ...body,
        status: body.status ?? (body.subscription_active ? "online" : "degraded"),
        mas_path: path,
      })
    } catch (error) {
      lastError = String(error)
    }
  }

  return Response.json(
    { status: "unavailable", error: lastError },
    { status: 503 }
  )
}
