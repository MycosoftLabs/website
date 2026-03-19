/**
 * Canonical Widget Registry — Mar 14, 2026
 *
 * Single source of truth for fluid search widget IDs, labels, result bucket mapping,
 * size defaults, empty-state policy, and auto-expand rules. Used by FluidSearchCanvas
 * and for missing-widget detection (runtime: result buckets with no widget; build: exported vs registered).
 */

export type WidgetType =
  | "species"
  | "chemistry"
  | "genetics"
  | "research"
  | "answers"
  | "media"
  | "location"
  | "news"
  | "crep"
  | "earth2"
  | "map"
  | "events"
  | "aircraft"
  | "vessels"
  | "satellites"
  | "weather"
  | "emissions"
  | "infrastructure"
  | "devices"
  | "space_weather"
  | "embedding_atlas"
  | "fallback"

export interface WidgetRegistryEntry {
  id: WidgetType
  label: string
  /** Key in unified search results that feeds this widget (e.g. "species" -> species[]) */
  resultKey: string
  /** Default grid size: width (columns 1–2), height (rows 1–3) */
  size: { width: 1 | 2; height: 1 | 2 | 3 }
  /** When widget has no data: "hide" | "show_empty" | "collapse" */
  emptyPolicy: "hide" | "show_empty" | "collapse"
  /** Auto-expand when this widget receives data (e.g. first result set) */
  autoExpand?: boolean
}

/** Canonical list of all widget types that have dedicated components (excluding fallback). */
export const WIDGET_TYPE_IDS: WidgetType[] = [
  "species",
  "chemistry",
  "genetics",
  "research",
  "answers",
  "media",
  "location",
  "news",
  "crep",
  "earth2",
  "map",
  "events",
  "aircraft",
  "vessels",
  "satellites",
  "weather",
  "emissions",
  "infrastructure",
  "devices",
  "space_weather",
  "embedding_atlas",
]

/** Map result bucket keys (from API) to widget type. Unknown buckets use "fallback". */
export const RESULT_BUCKET_TO_WIDGET: Record<string, WidgetType> = {
  species: "species",
  compounds: "chemistry",
  genetics: "genetics",
  research: "research",
  answers: "answers",
  media: "media",
  location: "location",
  news: "news",
  live_results: "location",
  crep: "crep",
  earth2: "earth2",
  map: "map",
  // Earth Intelligence buckets
  events: "events",
  aircraft: "aircraft",
  vessels: "vessels",
  satellites: "satellites",
  weather: "weather",
  emissions: "emissions",
  infrastructure: "infrastructure",
  devices: "devices",
  space_weather: "space_weather",
  embeddings: "embedding_atlas",
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
  species: {
    id: "species",
    label: "Species",
    resultKey: "species",
    size: { width: 2, height: 2 },
    emptyPolicy: "show_empty",
    autoExpand: true,
  },
  chemistry: {
    id: "chemistry",
    label: "Chemistry",
    resultKey: "compounds",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  genetics: {
    id: "genetics",
    label: "Genetics",
    resultKey: "genetics",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  research: {
    id: "research",
    label: "Research",
    resultKey: "research",
    size: { width: 1, height: 2 },
    emptyPolicy: "hide",
  },
  answers: {
    id: "answers",
    label: "Answers",
    resultKey: "answers",
    size: { width: 2, height: 2 },
    emptyPolicy: "show_empty",
    autoExpand: true,
  },
  media: {
    id: "media",
    label: "Media",
    resultKey: "media",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  location: {
    id: "location",
    label: "Location",
    resultKey: "location",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  news: {
    id: "news",
    label: "News",
    resultKey: "news",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  crep: {
    id: "crep",
    label: "CREP",
    resultKey: "crep",
    size: { width: 2, height: 3 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  earth2: {
    id: "earth2",
    label: "Earth2",
    resultKey: "earth2",
    size: { width: 2, height: 3 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  map: {
    id: "map",
    label: "Map",
    resultKey: "map",
    size: { width: 2, height: 2 },
    emptyPolicy: "hide",
  },
  // Earth Intelligence widgets
  events: {
    id: "events",
    label: "Events",
    resultKey: "events",
    size: { width: 2, height: 2 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  aircraft: {
    id: "aircraft",
    label: "Aircraft",
    resultKey: "aircraft",
    size: { width: 2, height: 2 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  vessels: {
    id: "vessels",
    label: "Vessels",
    resultKey: "vessels",
    size: { width: 2, height: 2 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  satellites: {
    id: "satellites",
    label: "Satellites",
    resultKey: "satellites",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  weather: {
    id: "weather",
    label: "Weather",
    resultKey: "weather",
    size: { width: 2, height: 1 },
    emptyPolicy: "hide",
    autoExpand: true,
  },
  emissions: {
    id: "emissions",
    label: "Emissions",
    resultKey: "emissions",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  infrastructure: {
    id: "infrastructure",
    label: "Infrastructure",
    resultKey: "infrastructure",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  devices: {
    id: "devices",
    label: "Devices",
    resultKey: "devices",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  space_weather: {
    id: "space_weather",
    label: "Space Weather",
    resultKey: "space_weather",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
  embedding_atlas: {
    id: "embedding_atlas",
    label: "Embedding Atlas",
    resultKey: "embeddings",
    size: { width: 2, height: 2 },
    emptyPolicy: "show_empty",
    autoExpand: true,
  },
  fallback: {
    id: "fallback",
    label: "Results",
    resultKey: "unknown",
    size: { width: 1, height: 1 },
    emptyPolicy: "hide",
  },
}

/** Default sizes for canvas (same as registry; export for backward compat). */
export const DEFAULT_WIDGET_SIZES: Record<WidgetType, { width: 1 | 2; height: 1 | 2 | 3 }> = Object.fromEntries(
  (WIDGET_TYPE_IDS as WidgetType[]).map((id) => [id, WIDGET_REGISTRY[id]?.size ?? { width: 1, height: 1 }])
) as Record<WidgetType, { width: 1 | 2; height: 1 | 2 | 3 }>
DEFAULT_WIDGET_SIZES.fallback = { width: 1, height: 1 }

/**
 * Resolve result bucket key (e.g. from API) to widget type. Returns "fallback" if unknown.
 */
export function getWidgetForResultBucket(bucketKey: string): WidgetType {
  return RESULT_BUCKET_TO_WIDGET[bucketKey] ?? "fallback"
}

/**
 * Runtime missing-widget detection: bucket keys that have data but no registered widget.
 * Returns bucket keys that should use the fallback widget.
 */
export function getBucketsWithMissingWidget(
  resultBuckets: Record<string, unknown[] | undefined>,
  registeredWidgetIds: Set<WidgetType>
): string[] {
  const missing: string[] = []
  for (const [key, arr] of Object.entries(resultBuckets)) {
    if (!Array.isArray(arr) || arr.length === 0) continue
    const widgetType = getWidgetForResultBucket(key)
    if (widgetType === "fallback" || !registeredWidgetIds.has(widgetType)) {
      missing.push(key)
    }
  }
  return missing
}

/**
 * Build-time: list widget types that are in the registry but might not be exported from widgets/index.
 * Call with the list of exported widget component names (e.g. from widgets/index.ts).
 */
export function getRegisteredButNotExported(
  exportedNames: string[]
): WidgetType[] {
  const exportedSet = new Set(exportedNames.map((n) => n.replace("Widget", "").toLowerCase()))
  const missing: WidgetType[] = []
  for (const id of WIDGET_TYPE_IDS) {
    if (id === "fallback") continue
    const expected = id === "chemistry" ? "chemistry" : id
    if (!exportedSet.has(expected)) {
      missing.push(id)
    }
  }
  return missing
}
