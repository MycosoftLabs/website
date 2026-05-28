import type { EarthSearchRule } from "./earth-search-rules"
import type { LiveResultType, SearchRoute } from "./search-intelligence-router"
import type { WidgetType } from "./widget-registry"
import { WIDGET_REGISTRY } from "./widget-registry"

export type SearchEntityFamily =
  | "events"
  | "species"
  | "genetics"
  | "chemistry"
  | "infrastructure"
  | "vehicles"
  | "weather"
  | "devices"
  | "space"
  | "marine"
  | "transport"
  | "economy_content"
  | "general"

export type ZoomIntent = "global" | "region" | "county" | "city" | "asset"

export interface EarthSearchPlan {
  enabledLayers: string[]
  disabledLayers: string[]
  lockedLayerControls: boolean
  viewportTarget?: {
    lat: number
    lng: number
    zoomIntent: ZoomIntent
  }
  entityTypes: string[]
  lodPolicy: "global-recent-local-historical"
}

export interface AnswerContextPlan {
  mode: "widget_collective_summary"
  summarizeWidgets: WidgetType[]
  includeEarthLayers: boolean
  includeSourceHealth: boolean
  userFacingEmptyCopy: string
}

export interface EtlAcquisitionRequest {
  query: string
  entityFamily: SearchEntityFamily
  widget: WidgetType
  missingDataKind: string
  candidateSources: string[]
  priority: "live" | "soon" | "backlog"
  userVisibleState: "acquiring" | "partial" | "unavailable"
}

export interface SearchPlan {
  query: string
  normalizedIntent: string
  entityFamilies: SearchEntityFamily[]
  primaryWidget: WidgetType | null
  widgetOrder: WidgetType[]
  earth?: EarthSearchPlan
  liveResultTypes: LiveResultType[]
  answerContext: AnswerContextPlan
  etlRequests: EtlAcquisitionRequest[]
  qaScenarioTags: string[]
}

interface TaxonomyRule {
  family: SearchEntityFamily
  tags: string[]
  patterns: RegExp[]
  preferredWidgets: WidgetType[]
  sourcePriority: string[]
  missingDataKind: string
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    family: "events",
    tags: ["event", "hazard", "earth"],
    patterns: [
      /\bearthquakes?\b/i,
      /\bquake\b/i,
      /\bseismic\b/i,
      /\bwildfires?\b/i,
      /\bfires?\b/i,
      /\bstorms?\b/i,
      /\bhurricanes?\b/i,
      /\btornado(es)?\b/i,
      /\bvolcano(es)?\b/i,
      /\bfloods?\b/i,
      /\blandslides?\b/i,
      /\bdroughts?\b/i,
      /\boil\s+spills?\b/i,
      /\boutbreaks?\b/i,
    ],
    preferredWidgets: ["earth", "events", "answers", "news", "research"],
    sourcePriority: ["USGS", "NASA EONET", "NOAA", "NWS", "GDACS", "ReliefWeb"],
    missingDataKind: "live event feed",
  },
  {
    family: "species",
    tags: ["species", "bio", "earth"],
    patterns: [
      /\bspecies\b/i,
      /\bfungi\b/i,
      /\bmushrooms?\b/i,
      /\b(?:native|invasive|endangered|wild|medicinal|poisonous|crop)\s+plants?\b/i,
      /\bplants?\s+(?:species|habitat|range|biology|near|in)\b/i,
      /\banimals?\b/i,
      /\bbirds?\b/i,
      /\bfishes?\b/i,
      /\binvasive\b/i,
      /\bendangered\b/i,
      /\bhabitat\b/i,
    ],
    preferredWidgets: ["species", "earth", "genetics", "chemistry", "research", "news", "answers"],
    sourcePriority: ["iNaturalist", "GBIF", "IUCN", "NCBI", "MycoBank", "MINDEX"],
    missingDataKind: "species observation, range, or taxonomy data",
  },
  {
    family: "genetics",
    tags: ["genetics", "science"],
    patterns: [/\bgenes?\b/i, /\bgenomes?\b/i, /\bvariants?\b/i, /\bsequence\b/i, /\bpathways?\b/i],
    preferredWidgets: ["genetics", "research", "species", "answers"],
    sourcePriority: ["NCBI", "ENA", "UniProt", "MINDEX"],
    missingDataKind: "genetic sequence or pathway data",
  },
  {
    family: "chemistry",
    tags: ["chemistry", "science"],
    patterns: [/\bchemistry\b/i, /\bcompounds?\b/i, /\bmolecules?\b/i, /\btoxins?\b/i, /\bmetabolites?\b/i],
    preferredWidgets: ["chemistry", "research", "species", "answers"],
    sourcePriority: ["PubChem", "ChEBI", "LOTUS", "MINDEX"],
    missingDataKind: "compound or chemistry data",
  },
  {
    family: "infrastructure",
    tags: ["infrastructure", "risk", "earth"],
    patterns: [
      /\binfrastructure\b/i,
      /\bpower\s+plants?\b/i,
      /\bpower\s+lines?\b/i,
      /\btransmission\s+lines?\b/i,
      /\bsubstations?\b/i,
      /\bdata\s+centers?\b/i,
      /\bcell\s+towers?\b/i,
      /\bports?\b/i,
      /\bfactories?\b/i,
      /\bpipelines?\b/i,
      /\bsea\s+cables?\b/i,
      /\bsubmarine\s+cables?\b/i,
      /\brail(?:way)?\b/i,
    ],
    preferredWidgets: ["earth", "infrastructure", "power_grid", "risk", "supply_chain", "answers", "news"],
    sourcePriority: ["OpenStreetMap", "EIA", "WRI", "Overpass", "MINDEX", "CREP"],
    missingDataKind: "infrastructure geometry or asset metadata",
  },
  {
    family: "vehicles",
    tags: ["vehicle", "live", "earth"],
    patterns: [/\bplanes?\b/i, /\baircraft\b/i, /\bflights?\b/i, /\bships?\b/i, /\bvessels?\b/i, /\bboats?\b/i, /\btrains?\b/i],
    preferredWidgets: ["earth", "transport", "aircraft", "vessels", "marine", "answers", "news"],
    sourcePriority: ["OpenSky", "AIS", "GTFS", "CREP", "MINDEX"],
    missingDataKind: "live vehicle track or route data",
  },
  {
    family: "weather",
    tags: ["weather", "earth"],
    patterns: [/\bweather\b/i, /\bforecast\b/i, /\bradar\b/i, /\bprecipitation\b/i, /\btemperature\b/i, /\bair\s+quality\b/i, /\bsmoke\b/i],
    preferredWidgets: ["earth", "weather", "air_quality", "events", "answers", "news"],
    sourcePriority: ["NOAA", "NWS", "NASA GIBS", "OpenAQ", "MINDEX"],
    missingDataKind: "weather, radar, or air-quality data",
  },
  {
    family: "devices",
    tags: ["device", "telemetry", "earth"],
    patterns: [/\bdevices?\b/i, /\bmycobrain\b/i, /\bsporebase\b/i, /\bsensors?\b/i, /\bcameras?\b/i, /\btelemetry\b/i],
    preferredWidgets: ["earth", "devices", "cameras", "source_health", "answers"],
    sourcePriority: ["CREP", "MYCOSOFT telemetry", "MINDEX"],
    missingDataKind: "device telemetry or camera feed metadata",
  },
  {
    family: "space",
    tags: ["space", "earth"],
    patterns: [/\bsatellites?\b/i, /\bISS\b/i, /\bstarlink\b/i, /\borbit\b/i, /\bspace\s+weather\b/i, /\bsolar\s+flare\b/i],
    preferredWidgets: ["earth", "satellites", "space_assets", "space_weather", "answers", "news", "research"],
    sourcePriority: ["CelesTrak", "NOAA SWPC", "NASA", "MINDEX"],
    missingDataKind: "orbital or space-weather data",
  },
  {
    family: "economy_content",
    tags: ["content"],
    patterns: [/\bstocks?\b/i, /\bsports?\b/i, /\bshopping\b/i, /\brecipes?\b/i, /\bpeople\b/i, /\bcode\b/i],
    preferredWidgets: ["answers", "news", "research"],
    sourcePriority: ["MINDEX", "web search"],
    missingDataKind: "content result data",
  },
]

const PRIORITY_WIDGET_ORDER: WidgetType[] = [
  "species",
  "earth",
  "events",
  "aircraft",
  "vessels",
  "satellites",
  "devices",
  "cameras",
  "infrastructure",
  "risk",
  "power_grid",
  "transport",
  "marine",
  "weather",
  "air_quality",
  "space_assets",
  "space_weather",
  "genetics",
  "chemistry",
  "research",
  "news",
  "answers",
  "source_health",
]

const ALL_WORKING_LAYER_IDS = [
  "earthquakes",
  "wildfires",
  "storms",
  "tornadoes",
  "lightning",
  "volcanoes",
  "weather",
  "aviation",
  "aviationRoutes",
  "ships",
  "shipRoutes",
  "fishing",
  "containers",
  "satellites",
  "fungi",
  "powerPlantsG",
  "txLinesGlobal",
  "dataCentersG",
  "cellTowersG",
  "ports",
  "radar",
  "radioStations",
  "factoriesG",
  "oilGas",
  "submarineCables",
  "mycobrain",
  "devMushroom1",
  "devHyphae1",
  "sporebase",
  "devMycoNode",
  "devAlarm",
  "devPsathyrella",
  "cameras",
  "railwayTracks",
  "railwayTrains",
  "bathymetry",
  "topography",
  "satImagery",
  "mapboxSatelliteStreets",
]

export function detectSearchEntityFamilies(query: string): SearchEntityFamily[] {
  const matches = TAXONOMY_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(query)))
  if (!matches.length) return ["general"]
  return [...new Set(matches.map((rule) => rule.family))]
}

export function buildWidgetOrderFromFamilies(
  route: Pick<SearchRoute, "primaryWidget" | "secondaryWidgets">,
  families: SearchEntityFamily[],
  earthRule: EarthSearchRule,
): WidgetType[] {
  const preferred = TAXONOMY_RULES
    .filter((rule) => families.includes(rule.family))
    .flatMap((rule) => rule.preferredWidgets)

  const ordered = [
    route.primaryWidget,
    ...earthRule.widgets,
    ...route.secondaryWidgets,
    ...preferred,
  ].filter((widget): widget is WidgetType => Boolean(widget && WIDGET_REGISTRY[widget as WidgetType]))

  const unique = [...new Set(ordered)]
  return unique.sort((a, b) => {
    const ai = PRIORITY_WIDGET_ORDER.indexOf(a)
    const bi = PRIORITY_WIDGET_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
}

export function buildSearchPlan(query: string, route: SearchRoute, earthRule: EarthSearchRule): SearchPlan {
  const families = detectSearchEntityFamilies(query)
  if (
    earthRule.domain === "species" &&
    route.earthContextFilters.enabledFilters.some((filter) => filter.category === "species") &&
    !families.includes("species")
  ) {
    if (families.length === 1 && families[0] === "general") families.splice(0, 1, "species")
    else families.unshift("species")
  }
  const widgetOrder = orderSearchWidgets(
    scopeWidgetOrderToEarthEntities(buildWidgetOrderFromFamilies(route, families, earthRule), earthRule, query, families),
    families,
  )
  const isGeospatial = earthRule.domain !== "general" || route.isMapPrimary || widgetOrder.includes("earth")
  const viewportTarget = buildViewportTarget(route)

  return {
    query,
    normalizedIntent: route.intent.normalizedQuery || query.trim().toLowerCase(),
    entityFamilies: families,
    primaryWidget: widgetOrder[0] ?? route.primaryWidget,
    widgetOrder,
    earth: isGeospatial
      ? {
          enabledLayers: earthRule.enabledLayerIds,
          disabledLayers: ALL_WORKING_LAYER_IDS.filter((layerId) => !earthRule.enabledLayerIds.includes(layerId)),
          lockedLayerControls: earthRule.lockLayerControls,
          viewportTarget,
          entityTypes: earthRule.entityTypes,
          lodPolicy: "global-recent-local-historical",
        }
      : undefined,
    liveResultTypes: route.liveResultTypes,
    answerContext: {
      mode: "widget_collective_summary",
      summarizeWidgets: widgetOrder,
      includeEarthLayers: isGeospatial,
      includeSourceHealth: true,
      userFacingEmptyCopy: "Data is being acquired momentarily.",
    },
    etlRequests: buildPotentialEtlRequests(query, families, widgetOrder),
    qaScenarioTags: buildQaScenarioTags(query, families, earthRule),
  }
}

function buildViewportTarget(route: SearchRoute): EarthSearchPlan["viewportTarget"] | undefined {
  const location = route.intent.filters.location
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return undefined
  const zoomIntent: ZoomIntent = location.city
    ? "city"
    : location.state || location.country || location.region
      ? "region"
      : "asset"
  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
    zoomIntent,
  }
}

function scopeWidgetOrderToEarthEntities(
  widgetOrder: WidgetType[],
  earthRule: EarthSearchRule,
  query: string,
  families: SearchEntityFamily[],
): WidgetType[] {
  const entityTypes = new Set(earthRule.entityTypes)
  const normalizedQuery = query.toLowerCase()
  const hasExplicitPowerGrid = /\b(power\s*(?:lines?|plants?|grid)|transmission|substations?|electric(?:al)?\s+grid)\b/i.test(query)
  const hasExplicitEvent = families.includes("events")
  if (entityTypes.has("aircraft") && !entityTypes.has("vessel")) {
    return widgetOrder.filter((widget) => widget !== "vessels" && widget !== "marine")
  }
  if (entityTypes.has("vessel") && !entityTypes.has("aircraft")) {
    return widgetOrder.filter((widget) =>
      widget !== "aircraft" &&
      (hasExplicitEvent || widget !== "events") &&
      (hasExplicitPowerGrid || (widget !== "power_grid" && widget !== "risk")) &&
      (!/\bsubmarine\s+cables?\b/.test(normalizedQuery) || widget !== "weather")
    )
  }
  if ((earthRule.domain === "species" || families.includes("species")) && !hasExplicitEvent) {
    return widgetOrder.filter((widget) => widget !== "events" && widget !== "biosecurity")
  }
  return widgetOrder
}

function orderSearchWidgets(widgetOrder: WidgetType[], families: SearchEntityFamily[]): WidgetType[] {
  if (!families.includes("events")) return widgetOrder
  const eventPriority: WidgetType[] = families.includes("infrastructure")
    ? ["earth", "events", "infrastructure", "risk", "power_grid", "weather", "answers", "news", "research"]
    : families.includes("weather")
      ? ["earth", "events", "weather", "air_quality", "answers", "news", "research"]
      : families.includes("marine")
        ? ["earth", "events", "marine", "vessels", "infrastructure", "answers", "news", "research"]
        : ["earth", "events", "answers", "news", "research"]
  const prioritized = eventPriority.filter((widget) => widgetOrder.includes(widget))
  const rest = widgetOrder.filter((widget) => !prioritized.includes(widget))
  return [...prioritized, ...rest]
}

function buildPotentialEtlRequests(
  query: string,
  families: SearchEntityFamily[],
  widgetOrder: WidgetType[],
): EtlAcquisitionRequest[] {
  return TAXONOMY_RULES.filter((rule) => families.includes(rule.family)).map((rule) => ({
    query,
    entityFamily: rule.family,
    widget: widgetOrder.find((widget) => rule.preferredWidgets.includes(widget)) ?? rule.preferredWidgets[0],
    missingDataKind: rule.missingDataKind,
    candidateSources: rule.sourcePriority,
    priority: rule.tags.includes("earth") || rule.tags.includes("live") ? "live" : "soon",
    userVisibleState: "acquiring",
  }))
}

function buildQaScenarioTags(query: string, families: SearchEntityFamily[], earthRule: EarthSearchRule): string[] {
  const tags = new Set<string>(families)
  if (earthRule.domain !== "general") tags.add(`earth:${earthRule.domain}`)
  if (/\bnear|over|in|at|around\b/i.test(query)) tags.add("location-context")
  if (/\bwithout|hide|turn\s+off|disable|no\b/i.test(query)) tags.add("layer-disable")
  if (/\beverything\s+(on|in)\s+(the\s+)?(map|earth|globe)\b/i.test(query)) tags.add("all-map")
  return [...tags]
}

export interface GeneratedSearchScenario {
  query: string
  expectedPrimaryWidget: WidgetType | null
  expectedWidgets: WidgetType[]
  expectedEarthLayers: string[]
  forbiddenEarthLayers: string[]
  expectedLiveResultTypes: LiveResultType[]
  tags: string[]
}

export function scenarioFromSearchPlan(plan: SearchPlan): GeneratedSearchScenario {
  return {
    query: plan.query,
    expectedPrimaryWidget: plan.primaryWidget,
    expectedWidgets: plan.widgetOrder,
    expectedEarthLayers: plan.earth?.enabledLayers ?? [],
    forbiddenEarthLayers: plan.earth?.disabledLayers ?? [],
    expectedLiveResultTypes: plan.liveResultTypes,
    tags: plan.qaScenarioTags,
  }
}
