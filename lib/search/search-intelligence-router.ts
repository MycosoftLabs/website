/**
 * Search Intelligence Router — Mar 19, 2026
 *
 * Routes search queries through Myca's brain/intention engine.
 * Classifies queries as conversational (→ Myca LLM/Nemotron) or
 * data/widget queries (→ unified search + auto-expand relevant widget).
 *
 * Also determines which widget should be primary and what size it should be,
 * and what data types should feed the live results panel.
 */

import { parseSearchIntent, type SearchIntent, type EntityType } from "./intent-parser"
import { detectWorldviewIntent } from "./world-view-suggestions"
import type { WidgetType } from "./widget-registry"
import { buildEarthContextFilters, type EarthContextFilters } from "./earth-context-filters"
import { resolveEarthSearchRule } from "./earth-search-rules"
import { buildSearchPlan, type SearchPlan } from "./search-plan"

// =============================================================================
// QUERY CLASSIFICATION
// =============================================================================

export type QueryClassification = "conversational" | "data_query" | "location_query" | "hybrid"

export interface SearchRoute {
  /** How the query should be processed */
  classification: QueryClassification
  /** Parsed intent from intent-parser */
  intent: SearchIntent
  /** Whether to invoke Myca LLM for a conversational answer */
  useMycaLLM: boolean
  /** Whether to also run unified search for widget data */
  useUnifiedSearch: boolean
  /** The primary widget that should be auto-expanded to maximum size */
  primaryWidget: WidgetType | null
  /** Size the primary widget should be set to */
  primaryWidgetSize: { width: 1 | 2; height: 1 | 2 | 3 }
  /** Secondary widgets to also expand (at normal sizes) */
  secondaryWidgets: WidgetType[]
  /** What live result types to fetch for the right panel */
  liveResultTypes: LiveResultType[]
  /** Worldview intent detection results */
  worldview: { crep: boolean; earth2: boolean; map: boolean }
  /** Whether this is a map/location query that needs full viewport map */
  isMapPrimary: boolean
  /** Context-resolved Earth Simulator filters. All contextual layers default off except these. */
  earthContextFilters: EarthContextFilters
  /** Canonical committed-query orchestration plan used by widgets, answers, ETL, and QA. */
  searchPlan: SearchPlan | null
}

export type LiveResultType =
  | "all_species"    // iNaturalist observations for any species
  | "specific_species" // iNaturalist for the queried species
  | "events"         // earthquakes, storms, volcanoes
  | "aircraft"       // flights
  | "vessels"        // ships
  | "satellites"     // satellites / orbital assets
  | "infrastructure" // infrastructure facilities and lines
  | "devices"        // MycoBrain / devices
  | "space_weather"  // solar / geomagnetic conditions
  | "news"           // news articles
  | "research"       // research papers
  | "weather"        // weather alerts

// Conversational patterns — questions that need Myca's reasoning, not just data
const CONVERSATIONAL_PATTERNS = [
  /^(?:what|why|how|when|where|who|which|can|could|would|should|is|are|do|does|did|will|was|were|has|have|had)\s+/i,
  /^(?:tell me|explain|describe|help me|teach me|compare|contrast|summarize|what's the|whats the)\s+/i,
  /^(?:i want|i need|i'm looking|im looking|i am looking|please|can you|could you)\s+/i,
  /\?$/,  // Ends with question mark
  /^(?:hello|hi|hey|good morning|good evening|thank|thanks)\b/i,
]

// Pure data patterns — straightforward lookups that don't need Myca chat
const PURE_DATA_PATTERNS = [
  /^[A-Z][a-z]+ [a-z]+$/,  // "Amanita muscaria" - scientific name
  /^(?:flights?|planes?|aircraft)\s+(?:over|above|near|in|from|to)\s+/i,
  /^(?:ships?|vessels?|boats?)\s+(?:in|near|at|from)\s+/i,
  /^(?:earthquakes?|volcanoes?|wildfires?|storms?)\s+(?:in|near|today|this week)/i,
  /^(?:weather|forecast|temperature)\s+(?:in|for|at|near)\s+/i,
  /^(?:satellites?|ISS|starlink)\s+(?:over|above|near|tracking)/i,
]

// =============================================================================
// CLASSIFY QUERY
// =============================================================================

/**
 * Classify a search query and determine routing.
 * This is the main entry point for the search intelligence system.
 */
export function classifyAndRoute(query: string): SearchRoute {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return createEmptyRoute()
  }

  const intent = parseSearchIntent(normalizedQuery)
  const worldview = detectWorldviewIntent(normalizedQuery)
  const classification = classifyQuery(normalizedQuery, intent)

  // Determine primary widget based on intent
  const { primaryWidget, primaryWidgetSize, secondaryWidgets } = determinePrimaryWidget(intent, worldview, classification)

  // Determine what live results to fetch
  const liveResultTypes = determineLiveResultTypes(intent, normalizedQuery)
  const earthContextFilters = buildEarthContextFilters(intent)
  const earthSearchRule = resolveEarthSearchRule(
    normalizedQuery,
    earthContextFilters.enabledFilters.map((filter) => filter.category),
  )

  // Is this a map-primary query?
  const hasEarthSearchRule = earthSearchRule.domain !== "general"
  const isMapPrimary = worldview.map || worldview.crep || worldview.earth2 || hasEarthSearchRule ||
    intent.type === "location" || intent.type === "event" ||
    intent.type === "aircraft" || intent.type === "vessel" ||
    earthContextFilters.isContextual

  let resolvedPrimaryWidget = primaryWidget
  let resolvedPrimaryWidgetSize = primaryWidgetSize
  let contextualSecondaryWidgets: WidgetType[] = [...secondaryWidgets]
  const keepSpeciesPrimary =
    intent.type === "species" ||
    earthSearchRule.domain === "species" ||
    earthContextFilters.enabledFilters.some((filter) => filter.category === "species")
  if ((earthContextFilters.isContextual || hasEarthSearchRule) && primaryWidget !== "earth" && !keepSpeciesPrimary) {
    resolvedPrimaryWidget = "earth"
    resolvedPrimaryWidgetSize = { width: 2, height: 3 }
    contextualSecondaryWidgets = [primaryWidget, ...secondaryWidgets, ...earthSearchRule.widgets].filter(
      (widget, index, widgets): widget is WidgetType =>
        Boolean(widget) && widget !== "earth" && widgets.indexOf(widget) === index
    )
  } else if (earthSearchRule.widgets.length > 0) {
    contextualSecondaryWidgets = [...contextualSecondaryWidgets, ...earthSearchRule.widgets].filter(
      (widget, index, widgets): widget is WidgetType =>
        Boolean(widget) && widget !== primaryWidget && widgets.indexOf(widget) === index
    )
  }

  const route: SearchRoute = {
    classification,
    intent,
    useMycaLLM: hasEarthSearchRule ? false : classification === "conversational" || classification === "hybrid",
    useUnifiedSearch: classification !== "conversational",
    primaryWidget: resolvedPrimaryWidget,
    primaryWidgetSize: resolvedPrimaryWidgetSize,
    secondaryWidgets: contextualSecondaryWidgets,
    liveResultTypes: [...new Set([...liveResultTypes, ...earthRuleToLiveResultTypes(earthSearchRule.entityTypes)])],
    worldview,
    isMapPrimary,
    earthContextFilters,
    searchPlan: null,
  }
  route.searchPlan = buildSearchPlan(normalizedQuery, route, earthSearchRule)
  if (route.searchPlan.primaryWidget && route.searchPlan.primaryWidget !== route.primaryWidget) {
    route.secondaryWidgets = [route.primaryWidget, ...route.secondaryWidgets, ...route.searchPlan.widgetOrder].filter(
      (widget, index, widgets): widget is WidgetType =>
        Boolean(widget) && widget !== route.searchPlan?.primaryWidget && widgets.indexOf(widget) === index
    )
    route.primaryWidget = route.searchPlan.primaryWidget
    route.primaryWidgetSize = route.primaryWidget === "earth" ? { width: 2, height: 3 } : route.primaryWidgetSize
  }
  return route
}

function earthRuleToLiveResultTypes(entityTypes: string[]): LiveResultType[] {
  const types: LiveResultType[] = []
  for (const entityType of entityTypes) {
    if (["earthquake", "wildfire", "fire", "storm", "hurricane", "tornado", "lightning", "volcano", "flood", "drought", "oil_spill", "disease"].includes(entityType)) types.push("events")
    if (entityType === "aircraft") types.push("aircraft")
    if (entityType === "vessel") types.push("vessels")
    if (entityType === "satellite") types.push("satellites", "space_weather")
    if (["species", "fungal"].includes(entityType)) types.push("all_species", "specific_species")
    if (["infrastructure", "facility"].includes(entityType)) types.push("infrastructure")
    if (entityType === "weather") types.push("weather")
    if (entityType === "device" || entityType === "camera") types.push("devices")
  }
  return types
}

function classifyQuery(query: string, intent: SearchIntent): QueryClassification {
  const normalizedQuery = query.toLowerCase().trim()

  // Check for pure data patterns first (most specific)
  for (const pattern of PURE_DATA_PATTERNS) {
    if (pattern.test(query)) {
      if (intent.type === "location" || intent.type === "aircraft" ||
          intent.type === "vessel" || intent.type === "event" || intent.type === "cameras") { // Added intent.type === "cameras"
        return "location_query"
      }
      return "data_query"
    }
  }

  // Check for conversational patterns
  const isConversational = CONVERSATIONAL_PATTERNS.some(p => p.test(normalizedQuery))

  // Check if intent detected a specific data domain
  const isDataDomain = intent.type !== "general" && intent.confidence >= 0.8

  if (isConversational && isDataDomain) {
    return "hybrid" // Conversational about a specific domain → Myca answer + widget data
  }
  if (isConversational) {
    return "hybrid" // Always show widgets alongside conversational answers
  }
  if (isDataDomain) {
    return "data_query"
  }

  // Default to hybrid - show Myca's answer plus any relevant data
  return "hybrid"
}

// =============================================================================
// WIDGET ROUTING
// =============================================================================

/** Broad conservation + taxonomic-group queries — prioritize narrative (Answers) over a single species card */
function isConservationThematicQuery(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length < 4) return false
  const conservation =
    /\b(status|declin(e|ing)|bleach(ed|ing)?|endangered|threatened|vulnerable|critically\s+endangered|extinction|conservation|recover(y|ies)|restoration|iucn|red\s*list|protected\s+species|biodiversity|habitat\s+loss)\b/i.test(
      q
    )
  const taxonGroup =
    /\b(mammals?|birds?|reptiles?|amphibians?|fishes?|\bfish\b|plants?|fungi|mushrooms?|species|wildlife|fauna|vertebrates?|invertebrates?|animals?|trees?|corals?)\b/i.test(
      q
    )
  return conservation && taxonGroup
}

function prioritizeWorldviewCrepSecondary(
  worldview: { crep: boolean },
  primary: WidgetType,
  secondary: WidgetType[],
): WidgetType[] {
  return secondary
}

function determinePrimaryWidget(
  intent: SearchIntent,
  worldview: { crep: boolean; earth2: boolean; map: boolean },
  classification: QueryClassification
): {
  primaryWidget: WidgetType | null
  primaryWidgetSize: { width: 1 | 2; height: 1 | 2 | 3 }
  secondaryWidgets: WidgetType[]
} {
  const isEarthquakeQuery =
    intent.type === "event" &&
    /\b(active\s+)?earthquakes?\b|\bseismic\b|\bquake\b|\btremor\b/i.test(intent.originalQuery)

  if (isEarthquakeQuery) {
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: ["events", "answers", "news", "research"],
    }
  }

  /**
   * Flight / ship / orbit queries: domain widget must lead. `detectWorldviewIntent` also sets `crep`
   * for these phrases; the old branch made CREP primary without putting `aircraft` in secondaries,
   * so "Planes over LA" expanded CREP + earth/weather/events but never the aircraft tile → all empty.
   */
  if (intent.type === "aircraft") {
    const secondary = prioritizeWorldviewCrepSecondary(worldview, "earth", getSecondaryWidgets(intent, "earth"))
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: secondary,
    }
  }
  if (intent.type === "vessel") {
    const secondary = prioritizeWorldviewCrepSecondary(worldview, "earth", getSecondaryWidgets(intent, "earth"))
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: secondary,
    }
  }
  if (intent.type === "satellite") {
    const secondary = prioritizeWorldviewCrepSecondary(worldview, "earth", getSecondaryWidgets(intent, "earth"))
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: secondary,
    }
  }

  // Map-type queries: CREP/Earth2/Map take viewport priority (non–narrow-domain queries)
  if (worldview.crep) {
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: getSecondaryWidgets(intent, "earth").filter((widget) => widget !== "crep"),
    }
  }
  if (worldview.earth2) {
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: getSecondaryWidgets(intent, "earth"),
    }
  }
  if (worldview.map) {
    return {
      primaryWidget: "earth",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: getSecondaryWidgets(intent, "earth"),
    }
  }

  // Conservation / threatened taxa groups → synthesis first, multi-widget context (not one species hero)
  if (
    isConservationThematicQuery(intent.originalQuery) &&
    (classification === "hybrid" || classification === "data_query")
  ) {
    const secondarySet = new Set<WidgetType>(["species", "research", "genetics", "chemistry"])
    for (const w of getSecondaryWidgets(intent, "answers")) {
      if (w !== "answers") secondarySet.add(w)
    }
    return {
      primaryWidget: "answers",
      primaryWidgetSize: { width: 2, height: 3 },
      secondaryWidgets: [...secondarySet],
    }
  }

  // Entity-type based routing
  const entityWidgetMap: Record<EntityType, WidgetType> = {
    species: "species",
    compound: "chemistry",
    media: "media",
    research: "research",
    location: "earth",
    crep: "earth",
    general: "answers",
    event: "earth",
    aircraft: "earth",
    vessel: "earth",
    satellite: "earth",
    weather: "earth",
    emissions: "earth",
    infrastructure: "earth",
    device: "earth",
    space_weather: "earth",
    cameras: "cameras", // Added cameras
  }

  const primaryWidget = entityWidgetMap[intent.type] || "answers"

  // Size based on type - location/map/earth types get viewport priority
  const largeWidgets: WidgetType[] = ["crep", "earth", "cameras"] // Added cameras
  const mediumWidgets: WidgetType[] = ["species", "answers", "weather"]

  let primaryWidgetSize: { width: 1 | 2; height: 1 | 2 | 3 }
  if (largeWidgets.includes(primaryWidget)) {
    primaryWidgetSize = { width: 2, height: 3 }
  } else if (mediumWidgets.includes(primaryWidget)) {
    primaryWidgetSize = { width: 2, height: 2 }
  } else {
    primaryWidgetSize = { width: 2, height: 2 }
  }

  // For conversational/hybrid, answers widget is always secondary if not primary
  const secondaryWidgets = getSecondaryWidgets(intent, primaryWidget)
  if (classification === "conversational" || classification === "hybrid") {
    if (primaryWidget !== "answers" && !secondaryWidgets.includes("answers")) {
      secondaryWidgets.unshift("answers")
    }
  }

  return { primaryWidget, primaryWidgetSize, secondaryWidgets }
}

function getSecondaryWidgets(intent: SearchIntent, primaryWidget: WidgetType): WidgetType[] {
  const secondary: WidgetType[] = []

  // Always include species for biology queries
  if (intent.type === "species" || intent.type === "compound" || intent.type === "location") {
    if (primaryWidget !== "species") secondary.push("species")
    if (intent.type === "species" && primaryWidget !== "earth") secondary.push("earth")
    if (intent.type === "species" && primaryWidget !== "genetics") secondary.push("genetics")
    if (primaryWidget !== "chemistry") secondary.push("chemistry")
    if (primaryWidget !== "research") secondary.push("research")
  }

  // For earth intelligence, include related widgets
  if (["event", "aircraft", "vessel", "weather", "satellite", "emissions", "infrastructure", "device", "space_weather"].includes(intent.type)) {
    if (primaryWidget !== "earth") secondary.push("earth")
  }

  if (
    intent.type === "event" &&
    /\b(active\s+)?earthquakes?\b|\bseismic\b|\bquake\b|\btremor\b/i.test(intent.originalQuery)
  ) {
    for (const widget of ["events", "answers", "news", "research"] as WidgetType[]) {
      if (widget !== primaryWidget && !secondary.includes(widget)) secondary.push(widget)
    }
  }

  // Research always gets news
  if (intent.type === "research") {
    secondary.push("news")
  }

  return secondary.filter(w => w !== primaryWidget)
}

// =============================================================================
// LIVE RESULT TYPE DETERMINATION
// =============================================================================

function determineLiveResultTypes(intent: SearchIntent, query: string): LiveResultType[] {
  const types: LiveResultType[] = []

  // Species queries → specific species observations
  if (intent.type === "species" || intent.type === "compound") {
    types.push("all_species", "specific_species")
  }

  // Event-related
  if (["event", "emissions", "infrastructure"].includes(intent.type)) {
    types.push("events")
  }
  if (intent.type === "weather") {
    types.push("events")
    types.push("weather")
  }

  // Aircraft/vessel queries
  if (intent.type === "aircraft") types.push("aircraft")
  if (intent.type === "vessel") types.push("vessels")
  if (intent.type === "satellite") types.push("satellites", "space_weather")
  if (intent.type === "infrastructure") types.push("infrastructure", "events")
  if (intent.type === "device") types.push("devices")
  if (intent.type === "space_weather") types.push("space_weather")

  // News for everything
  types.push("news")

  // Research for science queries
  if (["species", "compound", "research"].includes(intent.type)) {
    types.push("research")
  }

  // General queries get everything
  if (intent.type === "general") {
    return ["all_species", "events", "aircraft", "vessels", "news", "research", "weather"]
  }

  return [...new Set(types)]
}

// =============================================================================
// HELPERS
// =============================================================================

function createEmptyRoute(): SearchRoute {
  return {
    classification: "data_query",
    intent: {
      type: "general",
      queryType: "factual",
      filters: {},
      entities: [],
      keywords: [],
      originalQuery: "",
      normalizedQuery: "",
      confidence: 0,
    },
    useMycaLLM: false,
    useUnifiedSearch: false,
    primaryWidget: null,
    primaryWidgetSize: { width: 2, height: 2 },
    secondaryWidgets: [],
    liveResultTypes: [],
    worldview: { crep: false, earth2: false, map: false },
    isMapPrimary: false,
    earthContextFilters: buildEarthContextFilters({
      type: "general",
      queryType: "factual",
      filters: {},
      entities: [],
      keywords: [],
      originalQuery: "",
      normalizedQuery: "",
      confidence: 0,
    }),
    searchPlan: null,
  }
}

/**
 * Get the Myca activity event description for a search route.
 * Used by the ActivityStreamPanel to show what Myca is doing.
 */
export function describeSearchRoute(route: SearchRoute): string {
  const { classification, intent } = route

  if (classification === "conversational") {
    return `Thinking about: "${intent.originalQuery}"`
  }
  if (classification === "hybrid") {
    return `Analyzing "${intent.originalQuery}" — gathering ${intent.type} data and reasoning`
  }
  if (classification === "location_query") {
    const loc = intent.filters.location
    const locStr = loc ? [loc.city, loc.state, loc.country].filter(Boolean).join(", ") : "requested area"
    return `Scanning ${locStr} for ${intent.type} data`
  }
  return `Searching ${intent.type}: "${intent.originalQuery}"`
}
