import "server-only"

/**
 * Headers for server-side BFF -> MINDEX (192.168.0.189) calls.
 * MINDEX treats an invalid internal token as authoritative even when a
 * valid API key is also present, so callers must send one credential at a
 * time and retry with the alternate on 401.
 */
type MindexCredential = "internal" | "api_key" | "none"

function getInternalToken() {
  return (
    process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0] ||
    process.env.INTERNAL_API_SECRET ||
    ""
  ).trim()
}

function getApiKey() {
  return process.env.MINDEX_API_KEY?.trim() || ""
}

function mindexCredentialOrder(): MindexCredential[] {
  const order: MindexCredential[] = []
  if (getInternalToken()) order.push("internal")
  if (getApiKey()) order.push("api_key")
  if (order.length === 0) order.push("none")
  return order
}

function headersForCredential(credential: MindexCredential, extra?: HeadersInit): Headers {
  const headers = new Headers(extra)
  headers.delete("X-Internal-Token")
  headers.delete("X-API-Key")
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }
  if (credential === "internal") {
    headers.set("X-Internal-Token", getInternalToken())
  }
  if (credential === "api_key") {
    headers.set("X-API-Key", getApiKey())
  }
  return headers
}

export function mindexUpstreamHeaders(extra?: HeadersInit): Headers {
  return headersForCredential(mindexCredentialOrder()[0], extra)
}

export async function fetchMindexWithAuthRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  const credentials = mindexCredentialOrder()
  let response: Response | null = null

  for (let index = 0; index < credentials.length; index += 1) {
    response = await fetch(input, {
      ...init,
      headers: headersForCredential(credentials[index], init.headers),
    })

    if (response.status !== 401 || index === credentials.length - 1) {
      return response
    }

    await response.body?.cancel().catch(() => undefined)
  }

  return response ?? fetch(input, init)
}
