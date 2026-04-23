/**
 * Canonical MINDEX base URL for server-side Next.js (API routes, RSC, Route Handlers).
 *
 * The MINDEX API runs on the MINDEX VM at 192.168.0.189:8000. Website Docker containers
 * on the production host must not use http://localhost:8000 (nothing binds there inside the
 * app container) — a mis-set MINDEX_API_URL secret caused live CREP/Worldview to see
 * mindex as down while MAS on the LAN was fine.
 */
const MINDEX_VM_LAN = "http://192.168.0.189:8000"

function isLoopbackMindexUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === "localhost" || u.hostname === "127.0.0.1"
  } catch {
    return false
  }
}

/**
 * Resolves the MINDEX API base URL. In production, `http://localhost:8000` (or 127.0.0.1)
 * is treated as a misconfiguration and replaced with the LAN MINDEX VM URL so the site
 * reaches the real service without requiring an emergency secret edit.
 * In development, loopback is allowed for a locally run MINDEX.
 */
export function resolveMindexServerBaseUrl(): string {
  const fromEnv =
    process.env.MINDEX_API_URL?.trim() ||
    process.env.MINDEX_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_MINDEX_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_MINDEX_URL?.trim() ||
    ""

  // Client-side path prefixes (e.g. /api/mindex) are not a server-side MINDEX base;
  // use the LAN API VM for server fetches.
  if (!fromEnv || fromEnv.startsWith("/")) {
    return MINDEX_VM_LAN
  }

  let base = fromEnv.replace(/\/$/, "")

  if (process.env.NODE_ENV === "production" && isLoopbackMindexUrl(base)) {
    return MINDEX_VM_LAN
  }
  return base
}

export const MINDEX_LAN_DEFAULT = MINDEX_VM_LAN
