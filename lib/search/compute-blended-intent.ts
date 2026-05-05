/**
 * Blended search intent — May 03 2026
 * Heuristic router (local) + MYCA session suggestions (MAS) + optional Exa hint (titles only).
 */

import type { WidgetType } from "@/lib/search/widget-registry"
import { classifyAndRoute, type SearchRoute } from "@/lib/search/search-intelligence-router"
import { mergeSearchRouteWithMasSuggestions } from "@/lib/search/merge-intention-route"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export interface SearchUserContext {
  location?: { lat?: number; lng?: number; city?: string; region?: string }
  recentQueries?: string[]
  hourLocal?: number
}

export interface IntentPlan {
  primaryWidgets: WidgetType[]
  secondaryWidgets: WidgetType[]
  filters: Record<string, unknown>
  confidence: number
  /** Full router snapshot for clients that already consume SearchRoute */
  route: SearchRoute
  exaHintTitles: string[]
  sources: { heuristic: boolean; masSession: boolean; exa: boolean }
}

function isPartialToken(q: string): boolean {
  const t = q.trim()
  if (t.length < 2) return true
  return /\s$/.test(q) === false && t.split(/\s+/).length === 1 && t.length < 24
}

async function fetchMasSessionWidgets(sessionId: string): Promise<string[]> {
  try {
    const res = await fetch(`${MAS_API_URL}/api/myca/intention/${encodeURIComponent(sessionId)}/suggestions`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2200),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { widgets?: string[] }
    return Array.isArray(data.widgets) ? data.widgets : []
  } catch {
    return []
  }
}

async function fetchExaHintTitles(origin: string, query: string): Promise<string[]> {
  if (!process.env.EXA_API_KEY) return []
  try {
    const res = await fetch(`${origin}/api/search/exa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim(),
        numResults: 3,
        category: "company",
        includeText: false,
        includeHighlights: false,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { result?: { results?: Array<{ title?: string }> } }
    const rows = data?.result?.results ?? []
    return rows.map((r) => (r.title || "").trim()).filter(Boolean).slice(0, 5)
  } catch {
    return []
  }
}

/**
 * 250ms budget: Exa and MAS calls run in parallel; each has its own short timeout.
 */
export async function computeBlendedIntent(input: {
  query: string
  partialWord?: boolean
  userContext?: SearchUserContext
  sessionId?: string
  /** e.g. https://localhost:3010 from NextRequest.nextUrl.origin */
  requestOrigin: string
}): Promise<IntentPlan> {
  const q = input.query?.trim() ?? ""
  const partial =
    input.partialWord === true || (input.partialWord !== false && isPartialToken(q))

  const base = classifyAndRoute(q)
  const filters = { ...(base.intent.filters as Record<string, unknown>) }
  if (input.userContext?.location) {
    filters.userLocation = input.userContext.location
  }
  if (input.userContext?.recentQueries?.length) {
    filters.recentQueries = input.userContext.recentQueries.slice(0, 12)
  }
  if (typeof input.userContext?.hourLocal === "number") {
    filters.hourLocal = input.userContext.hourLocal
  }

  const [masWidgets, exaTitles] = await Promise.all([
    input.sessionId && !partial ? fetchMasSessionWidgets(input.sessionId) : Promise.resolve([] as string[]),
    !partial && q.length >= 3 ? fetchExaHintTitles(input.requestOrigin, q) : Promise.resolve([] as string[]),
  ])

  const merged = mergeSearchRouteWithMasSuggestions(base, masWidgets)

  const primaryWidgets: WidgetType[] = []
  if (merged.primaryWidget) primaryWidgets.push(merged.primaryWidget)

  const confidence = Math.min(
    0.99,
    (merged.intent.confidence ?? 0.5) * 0.75 + (masWidgets.length ? 0.12 : 0) + (exaTitles.length ? 0.08 : 0)
  )

  return {
    primaryWidgets,
    secondaryWidgets: merged.secondaryWidgets,
    filters,
    confidence,
    route: merged,
    exaHintTitles: exaTitles,
    sources: { heuristic: true, masSession: masWidgets.length > 0, exa: exaTitles.length > 0 },
  }
}
