/**
 * Fluid Search — single client ↔ MAS/MINDEX context contract (Apr 17, 2026).
 * Serialized route + session IDs travel in POST body / optional header on unified search.
 */

import type { LiveResultType, SearchRoute } from "./search-intelligence-router"
import type { WidgetType } from "./widget-registry"

/** JSON-safe snapshot of SearchRoute for MAS search_context.fluid_route */
export interface FluidSearchRouteSnapshot {
  classification: SearchRoute["classification"]
  intentType: string
  queryType: string
  useMycaLLM: boolean
  useUnifiedSearch: boolean
  primaryWidget: WidgetType | null
  primaryWidgetSize: SearchRoute["primaryWidgetSize"]
  secondaryWidgets: WidgetType[]
  liveResultTypes: LiveResultType[]
  worldview: SearchRoute["worldview"]
  isMapPrimary: boolean
}

/** Client bundle: threading + routing for unified search + MYCA Answers */
export interface FluidSearchContext {
  sessionId?: string
  userId?: string
  conversationId?: string
  route?: FluidSearchRouteSnapshot
  focusedWidget?: string | null
  recentQueries?: string[]
  history?: Array<{ role: "user" | "assistant"; content: string }>
}

export function searchRouteToFluidSnapshot(route: SearchRoute): FluidSearchRouteSnapshot {
  return {
    classification: route.classification,
    intentType: route.intent.type,
    queryType: route.intent.queryType,
    useMycaLLM: route.useMycaLLM,
    useUnifiedSearch: route.useUnifiedSearch,
    primaryWidget: route.primaryWidget,
    primaryWidgetSize: route.primaryWidgetSize,
    secondaryWidgets: route.secondaryWidgets,
    liveResultTypes: route.liveResultTypes,
    worldview: route.worldview,
    isMapPrimary: route.isMapPrimary,
  }
}

/**
 * Maps FluidSearchContext into MAS `search_context` (SearchExecuteRequest.search_context).
 * Session/user are also sent top-level via callMASSearchExecute — this adds routing + threading extras.
 */
export function buildFluidContextForMas(
  ctx: FluidSearchContext | undefined | null
): Record<string, unknown> | undefined {
  if (!ctx) return undefined
  const out: Record<string, unknown> = {}
  if (ctx.route) out.fluid_route = ctx.route as unknown as Record<string, unknown>
  if (ctx.focusedWidget) out.focused_widget = ctx.focusedWidget
  if (ctx.recentQueries?.length) out.recent_queries = ctx.recentQueries
  if (ctx.conversationId) out.conversation_id = ctx.conversationId
  if (ctx.history?.length) out.search_ai_history = ctx.history
  return Object.keys(out).length ? out : undefined
}
