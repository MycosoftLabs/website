/**
 * Default PersonaPlex bridge WebSocket URL for browser/client bundles.
 * In production, never return ws:// — it triggers mixed content on https://mycosoft.com.
 */
export function resolveDefaultPersonaPlexWsUrl(): string {
  const env =
    (process.env.NEXT_PUBLIC_PERSONAPLEX_WS_URL || "").trim() ||
    (process.env.PERSONAPLEX_WS_URL || "").trim()
  if (env) {
    if (process.env.NODE_ENV === "production" && env.startsWith("ws://")) {
      return ""
    }
    return env
  }
  if (process.env.NODE_ENV !== "production") {
    return "ws://localhost:8999/api/chat"
  }
  return ""
}
