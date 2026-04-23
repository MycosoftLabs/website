/**
 * Canonical MAS orchestrator base URL for server-side Next.js (API routes, RSC).
 * Default: MAS VM 192.168.0.188:8001. Loopback on the server is rewritten so a
 * misset / missing env var can't knock live CREP off the LAN MAS.
 *
 * Escape hatch for local dev: `ALLOW_LOOPBACK_MAS=1` keeps http://localhost:8001
 * when the operator really is running MAS on their laptop.
 */
const MAS_VM_LAN = "http://192.168.0.188:8001"

function isLoopbackMasUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === "localhost" || u.hostname === "127.0.0.1"
  } catch {
    return false
  }
}

export function resolveMasServerBaseUrl(): string {
  const fromEnv =
    process.env.MAS_URL?.trim() ||
    process.env.MAS_API_URL?.trim() ||
    process.env.MAS_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_MAS_API_URL?.trim() ||
    ""
  if (!fromEnv || fromEnv.startsWith("/")) {
    return MAS_VM_LAN
  }
  const base = fromEnv.replace(/\/$/, "")
  const isServer = typeof window === "undefined"
  const allowLoopback = process.env.ALLOW_LOOPBACK_MAS === "1"
  if (isServer && !allowLoopback && isLoopbackMasUrl(base)) {
    return MAS_VM_LAN
  }
  return base
}

export const MAS_LAN_DEFAULT = MAS_VM_LAN
