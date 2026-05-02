import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * Server-only MINDEX fetch helpers for Next.js route handlers and RSC.
 * Sends X-API-Key when MINDEX_API_KEY is set (required for some routers).
 */
export function mindexProxyHeaders(): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json" }
  const key = process.env.MINDEX_API_KEY?.trim()
  if (key) h["X-API-Key"] = key
  return h
}

export function mindexUrl(path: string): string {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}
