import { resolveEarthSearchRule } from "@/lib/search/earth-search-rules"
import { buildEarthContextFilters } from "@/lib/search/earth-context-filters"
import { parseSearchIntent } from "@/lib/search/intent-parser"

describe("earth search rules", () => {
  it("keeps active earthquake searches earthquake-only plus physical basemap layers", () => {
    const rule = resolveEarthSearchRule("Active earthquakes")

    expect(rule.domain).toBe("earthquake")
    expect(rule.enabledLayerIds).toEqual(
      expect.arrayContaining(["earthquakes", "bathymetry", "topography", "satImagery", "mapboxSatelliteStreets"]),
    )
    expect(rule.enabledLayerIds).not.toEqual(expect.arrayContaining(["aviation", "ships", "powerPlantsG"]))
    expect(rule.widgets).toEqual(expect.arrayContaining(["earth", "events", "answers", "news", "research"]))
  })

  it("combines earthquake and grid infrastructure intent", () => {
    const rule = resolveEarthSearchRule("earthquakes near power lines and power plants")

    expect(rule.enabledLayerIds).toEqual(
      expect.arrayContaining(["earthquakes", "powerPlantsG", "txLinesGlobal"]),
    )
    expect(rule.enabledLayerIds).not.toEqual(expect.arrayContaining(["dataCentersG", "cellTowersG", "ports"]))
    expect(rule.entityTypes).toEqual(expect.arrayContaining(["earthquake", "infrastructure", "facility"]))
    expect(rule.widgets).toEqual(expect.arrayContaining(["earth", "events", "infrastructure", "answers"]))
  })

  it("turns on the broad working worldview filter set for all-map searches without Earth2 layers", () => {
    const rule = resolveEarthSearchRule("show me everything on the map")

    expect(rule.domain).toBe("all")
    expect(rule.enabledLayerIds).toEqual(
      expect.arrayContaining([
        "earthquakes",
        "wildfires",
        "aviation",
        "ships",
        "satellites",
        "fungi",
        "powerPlantsG",
        "txLinesGlobal",
        "submarineCables",
        "cameras",
        "railwayTracks",
        "weather",
      ]),
    )
    expect(rule.enabledLayerIds).not.toEqual(expect.arrayContaining(["earth2Forecast"]))
    expect(rule.widgets).toEqual(["earth", "answers"])
  })

  it("supports disabling a domain inside a combined search", () => {
    const rule = resolveEarthSearchRule("show earthquakes near power plants without power lines")

    expect(rule.enabledLayerIds).toContain("earthquakes")
    expect(rule.enabledLayerIds).not.toContain("txLinesGlobal")
  })

  it("does not infer ants from the word plants in infrastructure searches", () => {
    const filters = buildEarthContextFilters(parseSearchIntent("earthquakes near power lines and power plants"))
    const speciesFilters = filters.enabledFilters.filter((filter) => filter.category === "species")

    expect(speciesFilters).toEqual([])
    expect(filters.enabledFilters.map((filter) => filter.key)).toEqual(expect.arrayContaining(["power_line", "power_plant"]))
  })
})
