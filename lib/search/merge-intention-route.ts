/**
 * Merge MAS /api/myca/intention suggested_widgets with classifyAndRoute output (Apr 17, 2026).
 */

import type { SearchRoute } from "./search-intelligence-router"
import type { WidgetType } from "./widget-registry"
import { WIDGET_TYPE_IDS } from "./widget-registry"

const NORMALIZE: Record<string, WidgetType> = {
  species: "species",
  chemistry: "chemistry",
  compounds: "chemistry",
  compound: "chemistry",
  genetics: "genetics",
  research: "research",
  answers: "answers",
  media: "media",
  location: "location",
  news: "news",
  crep: "earth",
  earth: "earth",
  earth2: "earth",
  map: "earth",
  events: "events",
  aircraft: "aircraft",
  vessels: "vessels",
  satellites: "satellites",
  weather: "weather",
  emissions: "emissions",
  infrastructure: "infrastructure",
  devices: "devices",
  space_weather: "space_weather",
  cameras: "cameras",
  embedding_atlas: "embedding_atlas",
  risk: "risk",
  power_grid: "power_grid",
  supply_chain: "supply_chain",
  biosecurity: "biosecurity",
  conservation: "conservation",
  geology: "geology",
  hydrology: "hydrology",
  wildfire: "wildfire",
  air_quality: "air_quality",
  space_assets: "space_assets",
  marine: "marine",
  transport: "transport",
  source_health: "source_health",
  qa_trace: "qa_trace",
  fallback: "fallback",
}

function normalizeMasWidgetToken(raw: string): WidgetType | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_")
  if (NORMALIZE[key]) return NORMALIZE[key]
  const direct = WIDGET_TYPE_IDS.find((w) => w === key)
  return direct ?? null
}

/**
 * Union MAS suggestions into routing: optional primary when missing; merged secondaries.
 */
export function mergeSearchRouteWithMasSuggestions(
  route: SearchRoute,
  masSuggestedWidgets: string[]
): SearchRoute {
  const mapped = masSuggestedWidgets.map(normalizeMasWidgetToken).filter((w): w is WidgetType => w !== null)

  let primaryWidget = route.primaryWidget
  let primaryWidgetSize = route.primaryWidgetSize

  if (!primaryWidget && mapped.length > 0) {
    primaryWidget = mapped[0]
    primaryWidgetSize = { width: 2, height: 2 }
  }

  const secondarySet = new Set<WidgetType>([...route.secondaryWidgets])
  for (const w of mapped) {
    if (w !== primaryWidget) secondarySet.add(w)
  }

  return {
    ...route,
    primaryWidget,
    primaryWidgetSize,
    secondaryWidgets: Array.from(secondarySet),
  }
}
