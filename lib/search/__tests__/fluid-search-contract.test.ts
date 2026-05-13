/**
 * Fluid search context + MAS intention merge (Apr 17, 2026)
 */
import { describe, it, expect } from "@jest/globals"
import { classifyAndRoute } from "../search-intelligence-router"
import { buildFluidContextForMas, searchRouteToFluidSnapshot } from "../fluid-search-context"
import { mergeSearchRouteWithMasSuggestions } from "../merge-intention-route"
import { parseSearchIntent } from "../intent-parser"

describe("classifyAndRoute — aircraft + LA (May 03, 2026)", () => {
  it("Planes over LA: Earth is primary, aircraft + CREP remain supporting context", () => {
    const intent = parseSearchIntent("Planes over LA")
    expect(intent.type).toBe("aircraft")
    expect(intent.filters.location?.city).toBe("Los Angeles")

    const route = classifyAndRoute("Planes over LA")
    expect(route.primaryWidget).toBe("earth")
    expect(route.secondaryWidgets).toContain("aircraft")
    expect(route.secondaryWidgets).toContain("crep")
    expect(route.worldview.crep).toBe(true)
  })
})

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

describe("earthContextFilters", () => {
  it("dolphins enables only dolphin organism context", () => {
    const route = classifyAndRoute("dolphins")
    expect(route.primaryWidget).toBe("earth")
    expect(route.secondaryWidgets).toContain("species")
    expect(route.earthContextFilters.enabledFilters).toEqual([
      expect.objectContaining({ category: "species", key: "dolphin" }),
    ])
    expect(route.earthContextFilters.layerState.organisms).toBe(true)
    expect(route.earthContextFilters.layerState.inat).toBe(true)
    expect(route.earthContextFilters.layerState.heat).toBe(false)
  })

  it("dolphins near bases enables dolphins and military bases", () => {
    const route = classifyAndRoute("dolphins near bases")
    expect(route.primaryWidget).toBe("earth")
    expect(route.earthContextFilters.enabledFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "species", key: "dolphin" }),
        expect.objectContaining({ category: "infrastructure", key: "military_base" }),
      ])
    )
    expect(route.earthContextFilters.layerState.heat).toBe(true)
  })

  it("dolphins near sea cables enables submarine cable context", () => {
    const route = classifyAndRoute("dolphins near sea cables")
    expect(route.primaryWidget).toBe("earth")
    expect(route.earthContextFilters.enabledFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "species", key: "dolphin" }),
        expect.objectContaining({ category: "infrastructure", key: "submarine_cable" }),
      ])
    )
  })

  it("bees near power plants includes related power lines", () => {
    const route = classifyAndRoute("bees near power plants")
    expect(route.primaryWidget).toBe("earth")
    expect(route.earthContextFilters.enabledFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "species", key: "bee" }),
        expect.objectContaining({ category: "infrastructure", key: "power_plant" }),
        expect.objectContaining({ category: "infrastructure", key: "power_line" }),
      ])
    )
  })
})
