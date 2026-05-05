/** Server-side MAS base URL for `/api/meshtastic/*` proxies. */

export function getMasApiBaseUrl(): string {
  const u =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    "http://192.168.0.188:8001"
  return u.replace(/\/$/, "")
}
