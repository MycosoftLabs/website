import "server-only"

/**
 * Headers for server-side BFF → MINDEX (192.168.0.189) calls.
 * Prefer an internal MINDEX token; else legacy `MINDEX_API_KEY` as `X-API-Key`.
 */
export function mindexUpstreamHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }
  const internal = (
    process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0] ||
    process.env.INTERNAL_API_SECRET ||
    ""
  ).trim()
  const apiKey = process.env.MINDEX_API_KEY?.trim()
  if (internal) {
    headers.set("X-Internal-Token", internal)
  }
  if (apiKey) {
    headers.set("X-API-Key", apiKey)
  }
  return headers
}
