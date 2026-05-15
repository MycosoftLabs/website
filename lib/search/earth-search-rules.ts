import type { EarthContextFilterCategory } from "./earth-context-filters"

export type EarthSearchDomain =
  | "earthquake"
  | "wildfire"
  | "storm"
  | "volcano"
  | "flood"
  | "drought"
  | "oil_spill"
  | "disease"
  | "aircraft"
  | "vessel"
  | "satellite"
  | "species"
  | "infrastructure"
  | "weather"
  | "air_quality"
  | "marine"
  | "transport"
  | "camera"
  | "device"
  | "all"
  | "general"

export interface EarthSearchRule {
  domain: EarthSearchDomain
  enabledLayerIds: string[]
  entityTypes: string[]
  widgets: string[]
  lockLayerControls: boolean
}

const PHYSICAL_BASE_LAYERS = ["bathymetry", "topography", "satImagery", "mapboxSatelliteStreets"]

const ALL_WORKING_LAYERS = [
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
  ...PHYSICAL_BASE_LAYERS,
]

const DOMAIN_RULES: Array<{
  domain: EarthSearchDomain
  patterns: RegExp[]
  categories: EarthContextFilterCategory[]
  enabledLayerIds: string[]
  entityTypes: string[]
  widgets: string[]
}> = [
  {
    domain: "all",
    patterns: [
      /\b(show|display|turn\s+on|enable|include)\s+(me\s+)?everything\s+(on|in)\s+(the\s+)?(map|earth|globe)\b/i,
      /\beverything\s+(on|in)\s+(the\s+)?(map|earth|globe)\b/i,
      /\ball\s+(map|earth|globe)\s+(layers|filters|data)\b/i,
    ],
    categories: [],
    enabledLayerIds: ALL_WORKING_LAYERS,
    entityTypes: [
      "earthquake",
      "wildfire",
      "storm",
      "volcano",
      "weather",
      "aircraft",
      "vessel",
      "satellite",
      "species",
      "infrastructure",
      "device",
      "camera",
      "train",
    ],
    widgets: ["earth", "answers"],
  },
  {
    domain: "earthquake",
    patterns: [/\b(active\s+)?earthquakes?\b/i, /\bseismic\b/i, /\bquake\b/i, /\btremors?\b/i],
    categories: ["event"],
    enabledLayerIds: ["earthquakes", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["earthquake"],
    widgets: ["earth", "events", "answers", "news", "research"],
  },
  {
    domain: "wildfire",
    patterns: [/\bwildfires?\b/i, /\bfires?\b/i, /\bsmoke\b/i],
    categories: ["event"],
    enabledLayerIds: ["wildfires", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["wildfire", "fire"],
    widgets: ["earth", "events", "wildfire", "air_quality", "answers", "news"],
  },
  {
    domain: "storm",
    patterns: [/\bstorms?\b/i, /\bhurricanes?\b/i, /\btornado(es)?\b/i, /\blightning\b/i],
    categories: ["event", "weather"],
    enabledLayerIds: ["storms", "tornadoes", "lightning", "weather", "earth2Forecast", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["storm", "hurricane", "tornado", "lightning", "weather"],
    widgets: ["earth", "events", "weather", "answers", "news"],
  },
  {
    domain: "flood",
    patterns: [/\bfloods?\b/i, /\bflooding\b/i, /\briver\s+stage\b/i, /\bstorm\s+surge\b/i],
    categories: ["event", "weather"],
    enabledLayerIds: ["storms", "weather", "radar", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["flood", "weather"],
    widgets: ["earth", "events", "hydrology", "weather", "answers", "news"],
  },
  {
    domain: "drought",
    patterns: [/\bdroughts?\b/i, /\bwater\s+stress\b/i, /\breservoirs?\b/i, /\bsnowpack\b/i],
    categories: ["weather"],
    enabledLayerIds: ["weather", "radar", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["drought", "weather"],
    widgets: ["earth", "hydrology", "weather", "answers", "news", "research"],
  },
  {
    domain: "volcano",
    patterns: [/\bvolcano(es)?\b/i, /\bvolcanic\b/i, /\beruptions?\b/i],
    categories: ["event"],
    enabledLayerIds: ["volcanoes", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["volcano"],
    widgets: ["earth", "events", "geology", "answers", "news", "research"],
  },
  {
    domain: "oil_spill",
    patterns: [/\boil\s+spills?\b/i, /\bchemical\s+spills?\b/i, /\bpollution\s+plumes?\b/i],
    categories: ["event", "emissions"],
    enabledLayerIds: ["oilGas", "ports", "ships", "shipRoutes", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["oil_spill", "vessel", "infrastructure"],
    widgets: ["earth", "events", "marine", "emissions", "infrastructure", "answers", "news"],
  },
  {
    domain: "disease",
    patterns: [/\bdisease\s+outbreaks?\b/i, /\boutbreaks?\b/i, /\bpathogens?\b/i, /\bbiosecurity\b/i],
    categories: ["event", "species"],
    enabledLayerIds: ["fungi", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["disease", "species"],
    widgets: ["earth", "events", "biosecurity", "species", "research", "answers", "news"],
  },
  {
    domain: "aircraft",
    patterns: [/\bplanes?\b/i, /\bflights?\b/i, /\baircraft\b/i, /\baviation\b/i],
    categories: ["aircraft"],
    enabledLayerIds: ["aviation", "aviationRoutes", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["aircraft"],
    widgets: ["earth", "aircraft", "transport", "weather", "answers", "news"],
  },
  {
    domain: "vessel",
    patterns: [/\bships?\b/i, /\bvessels?\b/i, /\bboats?\b/i, /\bmarine traffic\b/i],
    categories: ["vessel"],
    enabledLayerIds: ["ships", "shipRoutes", "fishing", "containers", "ports", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["vessel"],
    widgets: ["earth", "vessels", "marine", "weather", "answers", "news"],
  },
  {
    domain: "marine",
    patterns: [/\bmarine\b/i, /\bports?\b/i, /\bsubmarine\s+cables?\b/i, /\bsea\s+cables?\b/i, /\bfishing\b/i],
    categories: ["vessel", "infrastructure"],
    enabledLayerIds: ["ships", "shipRoutes", "fishing", "containers", "ports", "submarineCables", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["vessel", "infrastructure"],
    widgets: ["earth", "marine", "vessels", "infrastructure", "answers", "news"],
  },
  {
    domain: "satellite",
    patterns: [/\bsatellites?\b/i, /\bstarlink\b/i, /\bISS\b/i, /\borbit\b/i],
    categories: ["satellite"],
    enabledLayerIds: ["satellites", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["satellite"],
    widgets: ["earth", "satellites", "space_assets", "space_weather", "answers", "news"],
  },
  {
    domain: "species",
    patterns: [
      /\bspecies\b/i,
      /\bfungi\b/i,
      /\bmushrooms?\b/i,
      /\b(?:native|invasive|endangered|wild|medicinal|poisonous|crop)\s+plants?\b/i,
      /\bplants?\s+(?:species|habitat|range|biology|near|in)\b/i,
      /\banimals?\b/i,
    ],
    categories: ["species"],
    enabledLayerIds: ["fungi", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["species", "fungal"],
    widgets: ["species", "earth", "genetics", "chemistry", "research", "news", "answers"],
  },
  {
    domain: "infrastructure",
    patterns: [
      /\binfrastructure\b/i,
      /\bpower\s+plants?\b/i,
      /\bpower\s+lines?\b/i,
      /\btransmission\s+lines?\b/i,
      /\belectrical\s+grid\b/i,
      /\bsubstations?\b/i,
      /\bdata\s+centers?\b/i,
      /\bcell\s+towers?\b/i,
      /\bports?\b/i,
      /\bfactories?\b/i,
      /\boil\s+and\s+gas\b/i,
      /\bpipelines?\b/i,
      /\bsubmarine\s+cables?\b/i,
      /\bsea\s+cables?\b/i,
      /\brail(?:way)?\s+(tracks?|trains?)?\b/i,
    ],
    categories: ["infrastructure"],
    enabledLayerIds: [
      "powerPlantsG",
      "txLinesGlobal",
      "dataCentersG",
      "cellTowersG",
      "ports",
      "factoriesG",
      "oilGas",
      "submarineCables",
      "railwayTracks",
      "railwayTrains",
      ...PHYSICAL_BASE_LAYERS,
    ],
    entityTypes: ["infrastructure", "facility"],
    widgets: ["earth", "infrastructure", "power_grid", "risk", "supply_chain", "events", "answers", "news"],
  },
  {
    domain: "weather",
    patterns: [/\bweather\b/i, /\bforecast\b/i, /\btemperature\b/i, /\bprecipitation\b/i],
    categories: ["weather"],
    enabledLayerIds: ["weather", "earth2Forecast", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["weather"],
    widgets: ["earth", "weather", "answers", "news"],
  },
  {
    domain: "air_quality",
    patterns: [/\bair\s+quality\b/i, /\bAQI\b/i, /\bparticulates?\b/i, /\bpm\s*2\.?5\b/i, /\bsmoke\b/i],
    categories: ["weather", "emissions"],
    enabledLayerIds: ["weather", "wildfires", "radar", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["weather", "wildfire"],
    widgets: ["earth", "air_quality", "weather", "events", "answers", "news"],
  },
  {
    domain: "camera",
    patterns: [/\bcameras?\b/i, /\bwebcams?\b/i, /\blive\s+streams?\b/i],
    categories: ["device"],
    enabledLayerIds: ["cameras", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["camera", "device"],
    widgets: ["earth", "cameras", "devices", "answers"],
  },
  {
    domain: "device",
    patterns: [/\bdevices?\b/i, /\bmycobrain\b/i, /\bsporebase\b/i],
    categories: ["device"],
    enabledLayerIds: ["mycobrain", "devMushroom1", "devHyphae1", "sporebase", "devMycoNode", "devAlarm", "devPsathyrella", ...PHYSICAL_BASE_LAYERS],
    entityTypes: ["device"],
    widgets: ["earth", "devices", "answers"],
  },
]

const OFF_VERBS = "\\b(?:turn\\s+off|hide|remove|disable|without|no)\\b"
const ON_VERBS = "\\b(?:turn\\s+on|show|display|enable|add|include|find|search|active)\\b"

function domainMentionedAsDisabled(query: string, rule: (typeof DOMAIN_RULES)[number]) {
  return rule.patterns.some((pattern) => patternMentionedAsDisabled(query, pattern))
}

function patternMentionedAsDisabled(query: string, pattern: RegExp) {
    const source = pattern.source.replace(/^\\b/, "").replace(/\\b\/?[a-z]*$/i, "")
    const disabled = new RegExp(`${OFF_VERBS}[^.?!;]{0,80}${source}`, "i")
    return disabled.test(query)
}

function domainMentionedAsEnabled(query: string, rule: (typeof DOMAIN_RULES)[number]) {
  return rule.patterns.some((pattern) => pattern.test(query)) || new RegExp(ON_VERBS, "i").test(query)
}

function domainStillHasEnabledPattern(query: string, rule: (typeof DOMAIN_RULES)[number]) {
  return rule.patterns.some((pattern) => pattern.test(query) && !patternMentionedAsDisabled(query, pattern))
}

function applyExplicitLayerExclusions(query: string, layerIds: string[]) {
  const exclusions = new Set<string>()
  if (new RegExp(`${OFF_VERBS}[^.?!;]{0,80}(power\\s+lines?|transmission\\s+lines?|electrical\\s+grid)`, "i").test(query)) {
    exclusions.add("txLinesGlobal")
  }
  if (new RegExp(`${OFF_VERBS}[^.?!;]{0,80}power\\s+plants?`, "i").test(query)) {
    exclusions.add("powerPlantsG")
  }
  if (new RegExp(`${OFF_VERBS}[^.?!;]{0,80}(planes?|flights?|aircraft|aviation)`, "i").test(query)) {
    exclusions.add("aviation")
    exclusions.add("aviationRoutes")
  }
  if (new RegExp(`${OFF_VERBS}[^.?!;]{0,80}(ships?|vessels?|boats?)`, "i").test(query)) {
    exclusions.add("ships")
    exclusions.add("shipRoutes")
    exclusions.add("fishing")
    exclusions.add("containers")
  }
  return layerIds.filter((layerId) => !exclusions.has(layerId))
}

function applySpecificLayerScope(query: string, layerIds: string[]) {
  const q = query.toLowerCase()
  const asksEverything = /\beverything\s+(on|in)\s+(the\s+)?(map|earth|globe)\b|\ball\s+(map|earth|globe)\s+(layers|filters|data)\b/i.test(q)
  const genericInfrastructure = /\binfrastructure\b|\bfacilities\b|\bassets\b/i.test(q)
  if (asksEverything || genericInfrastructure) return layerIds

  const keep = new Set(layerIds)
  const powerScope = /\b(power\s+plants?|power\s+lines?|transmission\s+lines?|electrical\s+grid|substations?)\b/i.test(q)
  const marineCableScope = /\b(submarine\s+cables?|sea\s+cables?|undersea\s+cables?)\b/i.test(q)
  const railScope = /\brail(?:way)?|trains?\b/i.test(q)

  if (powerScope) {
    for (const layer of ["dataCentersG", "cellTowersG", "ports", "factoriesG", "oilGas", "submarineCables", "railwayTracks", "railwayTrains"]) {
      keep.delete(layer)
    }
  }
  if (marineCableScope) {
    for (const layer of ["powerPlantsG", "txLinesGlobal", "dataCentersG", "cellTowersG", "factoriesG", "oilGas", "railwayTracks", "railwayTrains"]) {
      keep.delete(layer)
    }
  }
  if (railScope) {
    for (const layer of ["powerPlantsG", "txLinesGlobal", "dataCentersG", "cellTowersG", "ports", "factoriesG", "oilGas", "submarineCables"]) {
      keep.delete(layer)
    }
  }
  return layerIds.filter((layerId) => keep.has(layerId))
}

export function resolveEarthSearchRule(query: string, categories: Iterable<EarthContextFilterCategory> = []): EarthSearchRule {
  const categorySet = new Set(categories)
  const directMatches = DOMAIN_RULES.filter((rule) =>
    domainMentionedAsEnabled(query, rule) && rule.patterns.some((pattern) => pattern.test(query))
  )
  const categoryMatches = DOMAIN_RULES.filter((rule) =>
    rule.categories.some((category) => categorySet.has(category))
  )
  const matches = (directMatches.length > 0 ? directMatches : categoryMatches)
    .filter((rule) => !domainMentionedAsDisabled(query, rule) || domainStillHasEnabledPattern(query, rule))

  const matched = matches.length > 0 ? matches : []

  if (matched.length === 0) {
    return {
      domain: "general",
    enabledLayerIds: applyExplicitLayerExclusions(query, applySpecificLayerScope(query, [...PHYSICAL_BASE_LAYERS])),
      entityTypes: [],
      widgets: ["earth", "answers"],
      lockLayerControls: true,
    }
  }

  const domain = matched.length === 1 ? matched[0].domain : "general"
  return {
    domain,
    enabledLayerIds: applyExplicitLayerExclusions(query, applySpecificLayerScope(query, [...new Set(matched.flatMap((rule) => rule.enabledLayerIds))])),
    entityTypes: [...new Set(matched.flatMap((rule) => rule.entityTypes))],
    widgets: [...new Set(matched.flatMap((rule) => rule.widgets))],
    lockLayerControls: true,
  }
}

export function resolveEarthSearchRuleFromVoiceCommand(transcript: string): EarthSearchRule {
  return resolveEarthSearchRule(transcript)
}
