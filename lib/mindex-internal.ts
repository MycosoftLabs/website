/**
 * MINDEX Internal API Client
 *
 * Server-side utility for making authenticated calls to MINDEX internal
 * endpoints (/api/mindex/internal/...). Uses x-internal-token header
 * to bypass public API rate limits and access admin-only data.
 *
 * The other Claude Code agent is building the segregated internal/public
 * API split on the MINDEX backend. Internal endpoints require the shared
 * MINDEX_INTERNAL_TOKEN secret.
 *
 * March 19, 2026 — Segregated public/internal API migration
 */

const MINDEX_BASE = process.env.MINDEX_API_URL || "http://localhost:8000"
const MINDEX_INTERNAL_TOKEN = process.env.MINDEX_INTERNAL_TOKEN || process.env.INTERNAL_API_SECRET

/**
 * Make an authenticated GET request to a MINDEX internal endpoint.
 * Returns parsed JSON or null on failure.
 */
export async function mindexInternalGet<T = unknown>(
  path: string,
  options?: { timeout?: number }
): Promise<T | null> {
  const url = `${MINDEX_BASE}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (MINDEX_INTERNAL_TOKEN) {
    headers["x-internal-token"] = MINDEX_INTERNAL_TOKEN
  }

  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(options?.timeout ?? 10000),
    })

    if (!res.ok) {
      console.warn(`[mindex-internal] ${path} returned ${res.status}`)
      return null
    }

    return await res.json()
  } catch (error) {
    console.warn(`[mindex-internal] ${path} failed:`, error)
    return null
  }
}

/**
 * Make an authenticated POST request to a MINDEX internal endpoint.
 * Returns parsed JSON or null on failure.
 */
export async function mindexInternalPost<T = unknown>(
  path: string,
  body: unknown,
  options?: { timeout?: number }
): Promise<T | null> {
  const url = `${MINDEX_BASE}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (MINDEX_INTERNAL_TOKEN) {
    headers["x-internal-token"] = MINDEX_INTERNAL_TOKEN
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(options?.timeout ?? 10000),
    })

    if (!res.ok) {
      console.warn(`[mindex-internal] POST ${path} returned ${res.status}`)
      return null
    }

    return await res.json()
  } catch (error) {
    console.warn(`[mindex-internal] POST ${path} failed:`, error)
    return null
  }
}
