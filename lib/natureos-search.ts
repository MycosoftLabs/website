export interface NatureOSSearchRecord {
  id: string
  title: string
  source: string
  createdAt: string
  summary?: string
  url?: string
  toolId?: string
  tags?: string[]
  payload?: Record<string, unknown>
}

export interface NatureOSSearchIndexResult {
  ok: boolean
  endpoint?: string
  status?: number
  error?: string
}

export interface NatureOSSearchIndexOptions {
  endpoints?: string[]
  timeoutMs?: number
}

const DEFAULT_INDEX_TIMEOUT_MS = 5000

function getSearchIndexEndpoints(): string[] {
  const endpoints: string[] = []
  const explicit =
    (typeof window === "undefined"
      ? process.env.NATUREOS_SEARCH_INDEX_URL
      : process.env.NEXT_PUBLIC_NATUREOS_SEARCH_INDEX_URL) ||
    process.env.NEXT_PUBLIC_NATUREOS_SEARCH_INDEX_URL ||
    process.env.NATUREOS_SEARCH_INDEX_URL

  if (explicit) endpoints.push(explicit)

  const masUrl =
    (typeof window === "undefined" ? process.env.MAS_API_URL : process.env.NEXT_PUBLIC_MAS_API_URL) ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    process.env.MAS_API_URL

  if (masUrl) endpoints.push(`${masUrl.replace(/\/$/, "")}/api/search/index`)

  return endpoints
}

export async function indexNatureOSSearchRecord(
  record: NatureOSSearchRecord,
  options: NatureOSSearchIndexOptions = {},
): Promise<NatureOSSearchIndexResult[]> {
  const endpoints = options.endpoints?.length ? options.endpoints : getSearchIndexEndpoints()
  if (!endpoints.length) {
    return [{ ok: false, error: "No search index endpoints configured" }]
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_INDEX_TIMEOUT_MS
  const results: NatureOSSearchIndexResult[] = []

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
        signal: controller.signal,
        keepalive: true,
      })
      clearTimeout(timeoutId)
      if (response.ok) {
        results.push({ ok: true, endpoint, status: response.status })
      } else {
        const errorText = await response.text().catch(() => "")
        results.push({
          ok: false,
          endpoint,
          status: response.status,
          error: errorText || `Indexing failed (${response.status})`,
        })
      }
    } catch (error) {
      clearTimeout(timeoutId)
      const message = error instanceof Error ? error.message : "Indexing failed"
      results.push({ ok: false, endpoint, error: message })
    }
  }

  return results
}
