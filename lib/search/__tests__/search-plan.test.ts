import { describe, expect, it } from "@jest/globals"
import { classifyAndRoute } from "../search-intelligence-router"
import { scenarioFromSearchPlan } from "../search-plan"
import { generateSearchIntelligenceScenarios } from "../search-qa-scenarios"

describe("SearchPlan orchestration", () => {
  it("active earthquakes resolves to earthquake-only Earth context and supporting widgets", () => {
    const route = classifyAndRoute("Active earthquakes")
    const plan = route.searchPlan

    expect(plan).toBeTruthy()
    expect(plan?.primaryWidget).toBe("earth")
    expect(plan?.widgetOrder).toEqual(expect.arrayContaining(["earth", "events", "answers", "news", "research"]))
    expect(plan?.earth?.enabledLayers).toEqual(expect.arrayContaining(["earthquakes", "bathymetry", "topography", "satImagery", "mapboxSatelliteStreets"]))
    expect(plan?.earth?.enabledLayers).not.toEqual(expect.arrayContaining(["aviation", "ships", "wildfires", "powerPlantsG"]))
    expect(plan?.answerContext.userFacingEmptyCopy).toBe("Data is being acquired momentarily.")
  })

  it("earthquakes near power grid creates risk and infrastructure context", () => {
    const route = classifyAndRoute("earthquakes near power lines and power plants")
    const plan = route.searchPlan

    expect(plan?.entityFamilies).toEqual(expect.arrayContaining(["events", "infrastructure"]))
    expect(plan?.widgetOrder).toEqual(expect.arrayContaining(["earth", "events", "infrastructure", "risk", "power_grid", "answers", "news"]))
    expect(plan?.earth?.enabledLayers).toEqual(expect.arrayContaining(["earthquakes", "powerPlantsG", "txLinesGlobal"]))
    expect(plan?.etlRequests.map((request) => request.entityFamily)).toEqual(expect.arrayContaining(["events", "infrastructure"]))
  })

  it("spatial species searches prioritize Earth while keeping science widgets", () => {
    const route = classifyAndRoute("Amanita muscaria near Oregon")
    const plan = route.searchPlan

    expect(plan?.primaryWidget).toBe("earth")
    expect(plan?.widgetOrder.slice(0, 2)).toEqual(["earth", "species"])
    expect(plan?.widgetOrder).toEqual(expect.arrayContaining(["genetics", "chemistry", "research", "news", "answers"]))
    expect(plan?.earth?.lockedLayerControls).toBe(true)
  })

  it("all-map searches produce an executable generated QA scenario", () => {
    const route = classifyAndRoute("show me everything on the map")
    const scenario = scenarioFromSearchPlan(route.searchPlan!)

    expect(scenario.expectedPrimaryWidget).toBe("earth")
    expect(scenario.expectedWidgets).toEqual(expect.arrayContaining(["earth", "answers"]))
    expect(scenario.expectedEarthLayers).toEqual(expect.arrayContaining(["earthquakes", "aviation", "ships", "satellites", "submarineCables", "cameras", "railwayTracks"]))
    expect(scenario.expectedEarthLayers).not.toContain("earth2Forecast")
    expect(scenario.tags).toEqual(expect.arrayContaining(["all-map", "earth:all"]))
  })

  it("generates broad scenario coverage from taxonomy templates", () => {
    const scenarios = generateSearchIntelligenceScenarios(100)

    expect(scenarios.length).toBeGreaterThan(50)
    expect(scenarios.some((scenario) => scenario.query === "Active earthquakes")).toBe(true)
    expect(scenarios.some((scenario) => scenario.expectedWidgets.includes("earth"))).toBe(true)
    expect(scenarios.some((scenario) => scenario.expectedWidgets.includes("species"))).toBe(true)
    expect(scenarios.some((scenario) => scenario.expectedWidgets.includes("infrastructure"))).toBe(true)
  })
})
