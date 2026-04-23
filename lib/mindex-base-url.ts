/**
 * Canonical MINDEX base URL for server-side Next.js (API routes, RSC, Route Handlers).
 *
 * The MINDEX API runs on the MINDEX VM at 192.168.0.189:8000. Website Docker
 * containers on the production host must not use http://localhost:8000 —
 * nothing binds there inside the app container. A mis-set MINDEX_API_URL
 * secret, or a container where NODE_ENV was never propagated to production,
 * caused live CREP/Worldview to see MINDEX as down while MAS on the LAN was
 * fine.
 *
 * Apr 23, 2026 — Morgan: "no satelites planes inaturalist nature events
 * vessles nothing is showing up on the fucking map". Root cause verified on
 * prod: `worldview/snapshot` returned `mindex.url:"http://localhost:8000"`
 * even though the website container was otherwise healthy. The earlier
 * NODE_ENV === "production" gate let the loopback slip through whenever the
 * container shell didn't set NODE_ENV (Next.js standalone doesn't always
 * propagate it when Docker starts `node server.js` directly). This file
 * now remaps loopback on any server-side call — the only legitimate
 * loopback MINDEX is a dev laptop running `mindex-api` locally, and that
 * path still works because `typeof window === "undefined"` is the only
 * "server" signal we check (dev servers run outside the browser too, but
 * they opt in by setting `MINDEX_API_URL=http://localhost:8000` and
 * `ALLOW_LOOPBACK_MINDEX=1`).
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
 * Resolves the MINDEX API base URL.
 *
 * Precedence:
 *   1. MINDEX_API_URL / MINDEX_API_BASE_URL / NEXT_PUBLIC_MINDEX_* env var
 *   2. If the env value is loopback AND we're on the server AND the dev
 *      escape hatch `ALLOW_LOOPBACK_MINDEX=1` is NOT set → remap to LAN VM
 *   3. Empty or a /api-prefixed client path → LAN VM
 *
 * The loopback remap used to be gated on `NODE_ENV === "production"`, but
 * production containers don't always set NODE_ENV, so loopback values were
 * leaking through and breaking live data. The gate is now `window !== undefined`
 * (i.e. we're NOT in the browser): client bundles may legitimately point at
 * `/api/mindex` for proxying, server code must point at the LAN VM.
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

  const base = fromEnv.replace(/\/$/, "")

  // Server-side loopback is almost always a misconfiguration on the deploy VM.
  // Escape hatch for local dev: set `ALLOW_LOOPBACK_MINDEX=1` to allow
  // `http://localhost:8000` to pass through (dev box running mindex locally).
  const isServer = typeof window === "undefined"
  const allowLoopback = process.env.ALLOW_LOOPBACK_MINDEX === "1"
  if (isServer && !allowLoopback && isLoopbackMindexUrl(base)) {
    return MINDEX_VM_LAN
  }
  return base
}

export const MINDEX_LAN_DEFAULT = MINDEX_VM_LAN
