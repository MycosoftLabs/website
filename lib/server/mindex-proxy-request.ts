import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Server-only MINDEX fetch helpers for Next.js route handlers and RSC.
 * Sends internal token when available, falling back to X-API-Key for legacy routers.
 */
export function mindexProxyHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" }
  const internal = (
    process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0] ||
    process.env.INTERNAL_API_SECRET ||
    ""
  ).trim()
  const key = process.env.MINDEX_API_KEY?.trim()
  if (internal) h["X-Internal-Token"] = internal
  else if (key) h["X-API-Key"] = key
  return h
}

export function mindexUrl(path: string): string {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}
