/**
 * Fluid search context + MAS intention merge (Apr 17, 2026)
 */
import { describe, it, expect } from "@jest/globals"
import { classifyAndRoute } from "../search-intelligence-router"
import { buildFluidContextForMas, searchRouteToFluidSnapshot } from "../fluid-search-context"
import { mergeSearchRouteWithMasSuggestions } from "../merge-intention-route"

describe("buildFluidContextForMas", () => {
  it("maps route + threading into MAS search_context", () => {
    const route = classifyAndRoute("test query for species data")
    const ctx = {
      sessionId: "sess-1",
      userId: "u-1",
      conversationId: "conv-1",
      route: searchRouteToFluidSnapshot(route),
      recentQueries: ["a", "b"],
      history: [{ role: "user" as const, content: "hi" }],
    }
    const mas = buildFluidContextForMas(ctx)
    expect(mas).toBeDefined()
    expect(mas?.fluid_route).toBeDefined()
    expect(mas?.conversation_id).toBe("conv-1")
    expect(mas?.recent_queries).toEqual(["a", "b"])
    expect(mas?.search_ai_history).toEqual([{ role: "user", content: "hi" }])
  })
})

describe("mergeSearchRouteWithMasSuggestions", () => {
  it("unions MAS widget tokens into secondaries", () => {
    const base = classifyAndRoute("psilocybin")
    const merged = mergeSearchRouteWithMasSuggestions(base, ["genetics", "crep", "unknown_token"])
    expect(merged.secondaryWidgets).toContain("genetics")
    expect(merged.secondaryWidgets).toContain("crep")
  })
})
