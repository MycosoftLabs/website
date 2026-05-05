/**
 * MAS graph API base URL for browser and SSR.
 * When the public site is HTTPS but NEXT_PUBLIC_MAS_API_URL points at http:// (LAN),
 * direct fetches cause mixed content ("Not secure"). Use same-origin /api/mas-proxy
 * so the Next server forwards to MAS (MAS_API_URL / NEXT_PUBLIC_MAS_API_URL on the server).
 */
export function getMasGraphClientBase(): string {
  const raw = (process.env.NEXT_PUBLIC_MAS_API_URL || "").trim()
  const site = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "")
  const useProxy =
    Boolean(site.startsWith("https://") && raw.startsWith("http://"))
  if (useProxy) return `${site}/api/mas-proxy`
  return raw || "http://localhost:8001"
}
