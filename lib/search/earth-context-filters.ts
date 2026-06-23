import type { SearchIntent } from "./intent-parser"

export type EarthContextFilterCategory =
  | "species"
  | "infrastructure"
  | "weather"
  | "event"
  | "aircraft"
  | "vessel"
  | "satellite"
  | "device"
  | "emissions"
  | "space_weather"

export interface EarthContextFilter {
  category: EarthContextFilterCategory
  key: string
  value: string
  label: string
}

export interface EarthContextLayerState {
  [key: string]: boolean
  fungi: boolean
  devices: boolean
  organisms: boolean
  mycelium: boolean
  heat: boolean
  weather: boolean
  inat: boolean
  wind: boolean
  precipitation: boolean
  ndvi: boolean
  nlm: boolean
  earth2Forecast: boolean
  earth2Nowcast: boolean
  earth2SporeDisperal: boolean
  earth2WindField: boolean
  earth2StormCells: boolean
  earth2Clouds: boolean
  mindexFirms: boolean
  mindexAirQuality: boolean
  mindexWeather: boolean
}

export interface EarthContextFilters {
  query: string
  enabledFilters: EarthContextFilter[]
  disabledFilters: string[]
  layerState: EarthContextLayerState
  searchTerms: {
    species: string[]
    infrastructure: string[]
  }
  isContextual: boolean
}

export const EARTH_LAYER_KEYS: Array<keyof EarthContextLayerState> = [
  "fungi",
  "devices",
  "organisms",
  "mycelium",
  "heat",
  "weather",
  "inat",
  "wind",
  "precipitation",
  "ndvi",
  "nlm",
  "earth2Forecast",
  "earth2Nowcast",
  "earth2SporeDisperal",
  "earth2WindField",
  "earth2StormCells",
  "earth2Clouds",
  "mindexFirms",
  "mindexAirQuality",
  "mindexWeather",
]

export const EMPTY_EARTH_LAYER_STATE: EarthContextLayerState = {
  fungi: false,
  devices: false,
  organisms: false,
  mycelium: false,
  heat: false,
  weather: false,
  inat: false,
  wind: false,
  precipitation: false,
  ndvi: false,
  nlm: false,
  earth2Forecast: false,
  earth2Nowcast: false,
  earth2SporeDisperal: false,
  earth2WindField: false,
  earth2StormCells: false,
  earth2Clouds: false,
  mindexFirms: false,
  mindexAirQuality: false,
  mindexWeather: false,
}

const INFRASTRUCTURE_ALIASES: Array<{
  key: string
  label: string
  terms: RegExp[]
  related?: Array<{ key: string; label: string }>
}> = [
  {
    key: "military_base",
    label: "Military bases",
    terms: [/\bbases?\b/i, /\bmilitary\s+bases?\b/i, /\bnaval\s+bases?\b/i, /\bair\s+force\s+bases?\b/i],
  },
  {
    key: "submarine_cable",
    label: "Sea cables",
    terms: [/\bsea\s+cables?\b/i, /\bsubmarine\s+cables?\b/i, /\binternet\s+cables?\b/i, /\bundersea\s+cables?\b/i],
  },
  {
    key: "power_plant",
    label: "Power plants",
    terms: [/\bpower\s+plants?\b/i, /\bnuclear\s+plants?\b/i, /\bsolar\s+farms?\b/i, /\bwind\s+farms?\b/i],
    related: [{ key: "power_line", label: "Power lines" }],
  },
  {
    key: "power_line",
    label: "Power lines",
    terms: [/\bpower\s+lines?\b/i, /\btransmission\s+lines?\b/i, /\bpower\s+grid\b/i],
  },
  {
    key: "pipeline",
    label: "Pipelines",
    terms: [/\bpipelines?\b/i, /\boil\s+pipelines?\b/i, /\bgas\s+pipelines?\b/i],
  },
  {
    key: "port",
    label: "Ports",
    terms: [/\bports?\b/i, /\bharbors?\b/i, /\bharbours?\b/i],
  },
  {
    key: "factory",
    label: "Factories",
    terms: [/\bfactories?\b/i, /\bindustrial\s+facilit(?:y|ies)\b/i],
  },
  {
    key: "rail",
    label: "Rail",
    terms: [/\brail(?:way)?\b/i, /\btrains?\b/i],
  },
  {
    key: "data_center",
    label: "Data centers",
    terms: [/\bdata\s+centers?\b/i],
  },
  {
    key: "cell_tower",
    label: "Cell towers",
    terms: [/\bcell\s+towers?\b/i, /\btelecom\s+towers?\b/i],
  },
]

const SPECIES_STOP_WORDS = new Set([
  "species",
  "organism",
  "organisms",
  "biodiversity",
  "taxonomy",
  "kingdom",
  "animals",
  "animal",
  "wildlife",
  "plants",
  "plant",
  "fungi",
  "fungus",
  "mushrooms",
  "mushroom",
  "earthquake",
  "earthquakes",
  "quake",
  "quakes",
  "wildfire",
  "wildfires",
  "fire",
  "fires",
  "storm",
  "storms",
  "weather",
  "aircraft",
  "planes",
  "plane",
  "ships",
  "ship",
  "vessels",
  "vessel",
  "satellites",
  "satellite",
  "devices",
  "device",
  "power",
  "infrastructure",
])

const COMMON_SPECIES_TERMS = [
  /\bdolphins?\b/i,
  /\bbees?\b/i,
  /\bwolves?\b/i,
  /\beagles?\b/i,
  /\bwhales?\b/i,
  /\bsharks?\b/i,
  /\bturtles?\b/i,
  /\bcorals?\b/i,
  /\bamanita\b/i,
  /\bpsilocybe\b/i,
]

function singularize(term: string): string {
  const normalized = term.trim().toLowerCase().replace(/[^a-z0-9\s'-]/g, "").replace(/\s+/g, " ")
  if (normalized.endsWith("ies") && normalized.length > 4) return `${normalized.slice(0, -3)}y`
  if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) return normalized.slice(0, -1)
  return normalized
}

function titleize(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

function isSpeciesStop(value: string): boolean {
  if (SPECIES_STOP_WORDS.has(value)) return true
  return value.split(/\s+/).some((part) => SPECIES_STOP_WORDS.has(part))
}

function addUniqueFilter(filters: EarthContextFilter[], filter: EarthContextFilter) {
  if (!filters.some((f) => f.category === filter.category && f.key === filter.key && f.value === filter.value)) {
    filters.push(filter)
  }
}

function speciesTermsFromIntent(intent: SearchIntent): string[] {
  const terms = new Set<string>()
  for (const entity of intent.entities) {
    const value = singularize(entity)
    if (value && !isSpeciesStop(value)) terms.add(value)
  }
  for (const keyword of intent.keywords) {
    const value = singularize(keyword)
    if (value && !isSpeciesStop(value)) terms.add(value)
  }
  const q = intent.normalizedQuery || intent.originalQuery.toLowerCase()
  const leadingEntity = q.match(/^([a-z][a-z\s'-]{1,40}?)\s+(?:near|in|around|over|by|at)\b/i)?.[1]
  if (leadingEntity) {
    const value = singularize(leadingEntity.split(/\s+/).slice(-2).join(" "))
    if (value && !isSpeciesStop(value) && !INFRASTRUCTURE_ALIASES.some((alias) => alias.terms.some((term) => term.test(value)))) {
      terms.add(value)
    }
  }
  for (const pattern of COMMON_SPECIES_TERMS) {
    const match = q.match(pattern)
    if (!match) continue
    const value = singularize(match[0])
    if (value && !isSpeciesStop(value)) terms.add(value)
  }
  return [...terms].slice(0, 4)
}

export function buildEarthContextFilters(intent: SearchIntent): EarthContextFilters {
  const enabledFilters: EarthContextFilter[] = []
  const layerState: EarthContextLayerState = { ...EMPTY_EARTH_LAYER_STATE }
  const q = intent.normalizedQuery || intent.originalQuery.toLowerCase()

  const speciesTerms = speciesTermsFromIntent(intent)
  for (const species of speciesTerms) {
    addUniqueFilter(enabledFilters, {
      category: "species",
      key: species,
      value: species,
      label: titleize(species),
    })
  }
  if (speciesTerms.length > 0) {
    layerState.organisms = true
    layerState.inat = true
    layerState.fungi = /\bfungi|fungus|mushrooms?|mycelium|amanita|psilocybe|morels?|truffles?\b/i.test(q)
  }

  const infrastructureTerms: string[] = []
  for (const alias of INFRASTRUCTURE_ALIASES) {
    if (!alias.terms.some((term) => term.test(q))) continue
    infrastructureTerms.push(alias.key)
    addUniqueFilter(enabledFilters, {
      category: "infrastructure",
      key: alias.key,
      value: alias.key,
      label: alias.label,
    })
    for (const related of alias.related ?? []) {
      infrastructureTerms.push(related.key)
      addUniqueFilter(enabledFilters, {
        category: "infrastructure",
        key: related.key,
        value: related.key,
        label: related.label,
      })
    }
  }
  if (infrastructureTerms.length > 0) layerState.heat = true

  const domainMap: Partial<Record<SearchIntent["type"], { category: EarthContextFilterCategory; key: string; label: string; layers: Partial<EarthContextLayerState> }>> = {
    weather: { category: "weather", key: "weather", label: "Weather", layers: { weather: true, earth2Forecast: true } },
    event: { category: "event", key: "events", label: "Events", layers: { earth2Nowcast: true, earth2StormCells: true } },
    aircraft: { category: "aircraft", key: "aircraft", label: "Aircraft", layers: {} },
    vessel: { category: "vessel", key: "vessels", label: "Vessels", layers: {} },
    satellite: { category: "satellite", key: "satellites", label: "Satellites", layers: {} },
    device: { category: "device", key: "devices", label: "Devices", layers: { devices: true } },
    emissions: { category: "emissions", key: "emissions", label: "Emissions", layers: { heat: true } },
    space_weather: { category: "space_weather", key: "space_weather", label: "Space weather", layers: {} },
  }

  const domain = domainMap[intent.type]
  if (domain) {
    addUniqueFilter(enabledFilters, {
      category: domain.category,
      key: domain.key,
      value: domain.key,
      label: domain.label,
    })
    Object.assign(layerState, domain.layers)
  }

  const enabledLayerKeys = new Set(
    Object.entries(layerState)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
  )

  return {
    query: intent.originalQuery,
    enabledFilters,
    disabledFilters: EARTH_LAYER_KEYS
      .map(String)
      .filter((key) => !enabledLayerKeys.has(key)),
    layerState,
    searchTerms: {
      species: speciesTerms,
      infrastructure: [...new Set(infrastructureTerms)],
    },
    isContextual: enabledFilters.length > 0,
  }
}
