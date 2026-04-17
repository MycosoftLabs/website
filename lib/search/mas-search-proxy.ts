/**
 * MAS Search Proxy — Mar 14, 2026
 *
 * Calls MAS /api/search/execute (canonical orchestrator) and maps response
 * to the website unified search shape (species, compounds, genetics, research).
 * Used by app/api/search/unified and unified-v2 to proxy to MAS instead of
 * direct MINDEX/provider calls.
 *
 * **Narrative (unified search, Apr 17, 2026):** The website does not run a second
 * independent LLM in parallel with MAS. `search_context` carries the fluid route;
 * the unified route picks MAS `focus` when substantive, else a single POST to
 * `/api/search/ai`. See `lib/search/unified-narrative.ts`.
 */

const MAS_API_URL = process.env.MAS_API_URL || "http://localhost:8001"

export interface MASSearchExecuteRequest {
  query: string
  search_context?: Record<string, unknown>
  user_id?: string
  session_id?: string
  limit?: number
}

export interface MASSearchExecuteResponse {
  query: string
  focus?: string
  world_context?: Record<string, unknown>
  working_context?: unknown[]
  memories?: Array<{ content?: string; source?: string; score?: number }>
  results?: {
    keyword?: Array<Record<string, unknown>>
    semantic?: Array<Record<string, unknown>>
    specialist?: Record<string, unknown>
  }
  timestamp?: string
}

/** Result bucket type for website */
export interface WebsiteUnifiedResults {
  species: Array<Record<string, unknown>>
  compounds: Array<Record<string, unknown>>
  genetics: Array<Record<string, unknown>>
  research: Array<Record<string, unknown>>
}

/**
 * Call MAS search orchestrator. Returns null on failure or timeout.
 */
export async function callMASSearchExecute(
  request: MASSearchExecuteRequest,
  signal?: AbortSignal
): Promise<MASSearchExecuteResponse | null> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/search/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: request.query,
        search_context: request.search_context,
        user_id: request.user_id,
        session_id: request.session_id,
        limit: request.limit ?? 20,
      }),
      signal: signal ?? AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as MASSearchExecuteResponse
    return data
  } catch {
    return null
  }
}

/**
 * Map MAS orchestrator response to website unified shape.
 * MAS returns results.keyword and results.semantic (arrays of hits).
 * We infer type from hit.category/type or default to research for semantic, species for keyword.
 */
export function mapMASResponseToUnified(
  mas: MASSearchExecuteResponse
): { results: WebsiteUnifiedResults; source: "mas"; totalCount: number } {
  const species: Array<Record<string, unknown>> = []
  const compounds: Array<Record<string, unknown>> = []
  const genetics: Array<Record<string, unknown>> = []
  const research: Array<Record<string, unknown>> = []

  const keyword = mas.results?.keyword ?? []
  const semantic = mas.results?.semantic ?? []

  for (const hit of keyword) {
    const type = (hit.category ?? hit.type ?? "").toString().toLowerCase()
    const id = (hit.id ?? hit.uuid ?? `kw-${species.length + compounds.length + genetics.length + research.length}`).toString()
    const item = { ...hit, id: id.startsWith("mindex-") || id.startsWith("kw-") ? id : `mindex-${id}` }
    if (type.includes("taxon") || type.includes("species")) species.push(item)
    else if (type.includes("compound") || type.includes("chemistry")) compounds.push(item)
    else if (type.includes("genetic") || type.includes("sequence")) genetics.push(item)
    else if (type.includes("research") || type.includes("paper")) research.push(item)
    else species.push(item)
  }

  for (const hit of semantic) {
    const type = (hit.category ?? hit.type ?? "").toString().toLowerCase()
    const id = (hit.id ?? hit.uuid ?? `sem-${research.length}`).toString()
    const item = { ...hit, id: id.startsWith("mindex-") || id.startsWith("sem-") ? id : `mindex-${id}` }
    if (type.includes("taxon") || type.includes("species")) species.push(item)
    else if (type.includes("compound")) compounds.push(item)
    else if (type.includes("genetic") || type.includes("sequence")) genetics.push(item)
    else research.push(item)
  }

  const totalCount = species.length + compounds.length + genetics.length + research.length
  return {
    results: { species, compounds, genetics, research },
    source: "mas",
    totalCount,
  }
}
