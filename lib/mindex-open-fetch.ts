import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

/**
 * Unauthenticated read to MINDEX public / API-key surface (used by BFF routes).
 */
export async function mindexOpenGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveMindexServerBaseUrl()
  const url = path.startsWith("http") ? path : `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MINDEX_API_KEY,
      ...init?.headers,
    },
    next: { revalidate: 120 },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MINDEX ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}
