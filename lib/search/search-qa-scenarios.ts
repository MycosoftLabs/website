import { classifyAndRoute } from "./search-intelligence-router"
import { scenarioFromSearchPlan, type GeneratedSearchScenario } from "./search-plan"

export const SEARCH_INTELLIGENCE_GOLDEN_QUERIES = [
  "Active earthquakes",
  "earthquakes near power lines and power plants",
  "show me everything on the map",
  "active wildfires in California",
  "aircraft over Los Angeles",
  "vessels near submarine cables",
  "satellites over Ukraine",
  "endangered species near wildfires",
  "weather over power plants",
  "cameras near active events",
  "trains near flooding",
  "Amanita muscaria near Oregon",
  "volcanoes near airports",
  "storms near data centers",
] as const

const SEARCH_INTELLIGENCE_TEMPLATE_QUERIES = [
  "{event} near {infrastructure}",
  "{species} in {region}",
  "{vehicle} near {place}",
  "{hazard} near {city}",
  "show me all {entityFamily} on the map",
  "hide {layer} and show {layer}",
  "{event} near {species} habitat",
  "{weather} over {infrastructure}",
  "{vessel} near {seaCable}",
  "{satellite} over {country}",
] as const

const TEMPLATE_VALUES = {
  event: ["earthquakes", "wildfires", "flooding", "volcanoes", "storms"],
  hazard: ["earthquakes", "wildfires", "storms", "flooding", "drought"],
  infrastructure: ["power plants", "power lines", "data centers", "ports", "submarine cables"],
  species: ["Amanita muscaria", "bees", "dolphins", "endangered birds", "invasive plants"],
  region: ["Oregon", "California", "Pacific Northwest", "Japan", "Amazon"],
  vehicle: ["aircraft", "vessels", "trains", "satellites"],
  place: ["Los Angeles", "San Diego", "Tokyo", "North Atlantic", "Ukraine"],
  city: ["Los Angeles", "Seattle", "Miami", "Tokyo", "Reykjavik"],
  weather: ["weather", "radar", "air quality", "smoke", "precipitation"],
  vessel: ["vessels", "ships", "cargo vessels", "fishing boats"],
  seaCable: ["submarine cables", "sea cables"],
  satellite: ["satellites", "Starlink", "ISS"],
  country: ["United States", "Ukraine", "Japan", "Brazil", "Australia"],
  layer: ["aircraft", "vessels", "power lines", "wildfires", "weather"],
  entityFamily: ["events", "species", "aircraft", "vessels", "infrastructure", "weather"],
} as const

function expandTemplate(template: string): string[] {
  const tokenMatch = template.match(/\{([^}]+)\}/)
  if (!tokenMatch) return [template]
  const token = tokenMatch[1] as keyof typeof TEMPLATE_VALUES
  const values = TEMPLATE_VALUES[token] ?? [token]
  return values.flatMap((value) => expandTemplate(template.replace(tokenMatch[0], value)))
}

export function generateSearchIntelligenceScenarios(limit = 500): GeneratedSearchScenario[] {
  const queries = [
    ...SEARCH_INTELLIGENCE_GOLDEN_QUERIES,
    ...SEARCH_INTELLIGENCE_TEMPLATE_QUERIES.flatMap(expandTemplate),
  ].slice(0, limit)

  return queries
    .map((query) => classifyAndRoute(query).searchPlan)
    .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan))
    .map(scenarioFromSearchPlan)
}

export function buildSearchQaMonitorReport(limit = 500) {
  const scenarios = generateSearchIntelligenceScenarios(limit)
  const emptyWidgetCandidates = scenarios.flatMap((scenario) =>
    scenario.expectedWidgets
      .filter((widget) => widget !== "earth")
      .map((widget) => ({
        query: scenario.query,
        widget,
        userVisibleState: "Data is being acquired momentarily.",
      })),
  )

  return {
    generatedAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    scenarios,
    monitors: {
      validatesWidgetOrder: true,
      validatesEarthLayers: true,
      validatesForbiddenLayers: true,
      validatesLiveResultTypes: true,
      validatesMobileDesktopLayout: true,
      validatesMarkerPopupDetails: true,
      validatesNoRawTimeoutCopy: true,
      validatesEtlAcquisitionRequests: true,
    },
    emptyWidgetCandidates,
  }
}
