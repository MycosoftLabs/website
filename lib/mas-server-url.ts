/**
 * Canonical MAS orchestrator base URL for server-side Next.js (API routes, RSC).
 * Default: MAS VM 192.168.0.188:8001. Loopback in production is rewritten (Docker-safe).
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
  let base = fromEnv.replace(/\/$/, "")
  if (process.env.NODE_ENV === "production" && isLoopbackMasUrl(base)) {
    return MAS_VM_LAN
  }
  return base
}

export const MAS_LAN_DEFAULT = MAS_VM_LAN
