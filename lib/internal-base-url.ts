/**
 * Canonical "self-fetch" base URL for server-side Next.js code.
 *
 * Apr 23, 2026 — Morgan: aggregators were returning 0 vehicles on prod
 * even though the direct endpoints were live. Root cause: every server
 * aggregator used `new URL(req.url).origin` which on prod resolves to
 * `https://mycosoft.com`. The container self-fetching its own public
 * origin bounces off Cloudflare → nginx → back to the same container
 * and either TLS-handshake fails or 502s (one-hop server-to-server
 * self-fetch on the public hostname is not a supported Cloudflare path).
 *
 * Solution: when running on the server, target the container's own
 * `http://localhost:${PORT}` (same path Docker health checks use). In
 * the browser, we still use the page origin.
 *
 * Env overrides:
 *   INTERNAL_SELF_URL — explicit absolute URL for unusual deploys
 *                       (e.g. behind a service mesh with a distinct internal
 *                       address).
 *   PORT              — the Node listener port (defaults to 3000).
 */
export function resolveInternalBaseUrl(requestOrigin?: string): string {
  const explicit = process.env.INTERNAL_SELF_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (typeof window === "undefined") {
    // Vercel runs on random ports and handles self-fetch via
    // the platform router — use the request origin there.
    if (process.env.VERCEL) return requestOrigin || "https://localhost"
    const port = process.env.PORT || "3000"
    return `http://localhost:${port}`
  }
  return requestOrigin || ""
}
