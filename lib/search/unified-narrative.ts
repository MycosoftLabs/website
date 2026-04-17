/**
 * Unified search narrative policy (Apr 17, 2026):
 * When MAS /api/search/execute succeeds with a substantive `focus` string, use it as the single narrative.
 * Otherwise one POST to /api/search/ai with integrated grounding — never parallel duplicate LLM calls vs legacy GET /api/search/ai.
 */

import type { FluidSearchContext } from "./fluid-search-context"
import type { MASSearchExecuteResponse } from "./mas-search-proxy"

function masFocusIsSubstantive(focus: string, query: string): boolean {
  const f = focus.trim()
  const q = query.trim()
  if (f.length < 100) return false
  if (f === q) return false
  const prefix = q.slice(0, Math.min(q.length, f.length))
  if (f === prefix) return false
  return true
}

function buildSearchAiContext(opts: {
  species: Array<{ scientificName?: string; commonName?: string }>
  compounds: Array<{ name?: string }>
  genetics: Array<{ speciesName?: string; geneRegion?: string }>
  research: Array<{ title?: string }>
  fluidContext?: FluidSearchContext | null
}): Record<string, unknown> {
  const species = opts.species.map((s) => s.scientificName || s.commonName).filter(Boolean).slice(0, 8) as string[]
  const compounds = opts.compounds.map((c) => c.name).filter(Boolean).slice(0, 8) as string[]
  const genetics = opts.genetics.map((g) => g.speciesName || g.geneRegion).filter(Boolean).slice(0, 8) as string[]
  const research = opts.research.map((r) => r.title).filter(Boolean).slice(0, 6) as string[]
  const ctx: Record<string, unknown> = {
    species,
    compounds,
    genetics,
    research,
  }
  if (opts.fluidContext?.route?.primaryWidget) {
    ctx.focusedWidget = String(opts.fluidContext.route.primaryWidget)
  }
  if (opts.fluidContext?.focusedWidget) {
    ctx.focusedWidget = String(opts.fluidContext.focusedWidget)
  }
  if (opts.fluidContext?.recentQueries?.length) {
    ctx.previousSearches = opts.fluidContext.recentQueries.slice(0, 12)
  }
  return ctx
}

export async function resolveUnifiedAiNarrative(opts: {
  origin: string
  baseQuery: string
  masPayload: MASSearchExecuteResponse | null
  fluidContext?: FluidSearchContext | null
  species: Array<{ scientificName?: string; commonName?: string }>
  compounds: Array<{ name?: string }>
  genetics: Array<{ speciesName?: string; geneRegion?: string }>
  research: Array<{ title?: string }>
  useMasSearch: boolean
}): Promise<string | undefined> {
  const {
    origin,
    baseQuery,
    masPayload,
    fluidContext,
    species,
    compounds,
    genetics,
    research,
    useMasSearch,
  } = opts

  const focus = masPayload?.focus
  if (
    useMasSearch &&
    masPayload &&
    typeof focus === "string" &&
    masFocusIsSubstantive(focus, baseQuery)
  ) {
    return focus.trim()
  }

  const context = buildSearchAiContext({ species, compounds, genetics, research, fluidContext })

  try {
    const res = await fetch(`${origin}/api/search/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: baseQuery,
        integrated: true,
        context,
        sessionId: fluidContext?.sessionId,
        userId: fluidContext?.userId,
        conversationId: fluidContext?.conversationId,
        history: fluidContext?.history,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return undefined
    const data = (await res.json()) as { result?: { answer?: string } }
    const ans = data?.result?.answer
    return typeof ans === "string" ? ans : undefined
  } catch {
    return undefined
  }
}
