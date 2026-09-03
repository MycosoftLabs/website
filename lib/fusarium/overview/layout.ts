export const OVERVIEW_LAYOUT_VERSION = 1
export const OVERVIEW_LAYOUT_STORAGE_KEY = `fusarium.overview.layout.v${OVERVIEW_LAYOUT_VERSION}`

export const OVERVIEW_WIDGET_SIZES = ["compact", "wide", "tall"] as const
export type OverviewWidgetSize = (typeof OVERVIEW_WIDGET_SIZES)[number]

export interface OverviewWidgetLayoutItem {
  id: string
  size: OverviewWidgetSize
}

interface StoredOverviewLayout {
  version: number
  items: OverviewWidgetLayoutItem[]
}

export const DEFAULT_OVERVIEW_WIDGET_LAYOUT: readonly OverviewWidgetLayoutItem[] = [
  { id: "operational-posture", size: "wide" },
  { id: "mission-brief", size: "compact" },
  { id: "environmental-picture", size: "compact" },
  { id: "conditions-causality", size: "wide" },
  { id: "observations-evidence", size: "wide" },
  { id: "coverage-products", size: "wide" },
  { id: "platform-health", size: "wide" },
  { id: "activity-timeline", size: "wide" },
] as const

function cloneDefaultLayout(defaults: readonly OverviewWidgetLayoutItem[]): OverviewWidgetLayoutItem[] {
  return defaults.map((item) => ({ ...item }))
}

function isWidgetSize(value: unknown): value is OverviewWidgetSize {
  return typeof value === "string" && OVERVIEW_WIDGET_SIZES.includes(value as OverviewWidgetSize)
}

export function normalizeOverviewLayout(
  candidate: unknown,
  defaults: readonly OverviewWidgetLayoutItem[] = DEFAULT_OVERVIEW_WIDGET_LAYOUT,
): OverviewWidgetLayoutItem[] {
  const fallback = cloneDefaultLayout(defaults)
  if (!candidate || typeof candidate !== "object") return fallback

  const stored = candidate as Partial<StoredOverviewLayout>
  if (stored.version !== OVERVIEW_LAYOUT_VERSION || !Array.isArray(stored.items)) return fallback

  const defaultById = new Map(defaults.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const normalized: OverviewWidgetLayoutItem[] = []

  for (const item of stored.items) {
    if (!item || typeof item !== "object") continue
    const id = typeof item.id === "string" ? item.id : ""
    if (!defaultById.has(id) || seen.has(id)) continue
    normalized.push({
      id,
      size: isWidgetSize(item.size) ? item.size : defaultById.get(id)!.size,
    })
    seen.add(id)
  }

  for (const item of defaults) {
    if (!seen.has(item.id)) normalized.push({ ...item })
  }

  return normalized
}

export function parseOverviewLayout(
  serialized: string | null,
  defaults: readonly OverviewWidgetLayoutItem[] = DEFAULT_OVERVIEW_WIDGET_LAYOUT,
): OverviewWidgetLayoutItem[] {
  if (!serialized) return cloneDefaultLayout(defaults)
  try {
    return normalizeOverviewLayout(JSON.parse(serialized), defaults)
  } catch {
    return cloneDefaultLayout(defaults)
  }
}

export function serializeOverviewLayout(items: readonly OverviewWidgetLayoutItem[]): string {
  return JSON.stringify({ version: OVERVIEW_LAYOUT_VERSION, items })
}

export function moveOverviewWidget(
  items: readonly OverviewWidgetLayoutItem[],
  id: string,
  direction: -1 | 1,
): OverviewWidgetLayoutItem[] {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return items.map((item) => ({ ...item }))

  const target = Math.max(0, Math.min(items.length - 1, index + direction))
  if (target === index) return items.map((item) => ({ ...item }))

  const next = items.map((item) => ({ ...item }))
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export function setOverviewWidgetSize(
  items: readonly OverviewWidgetLayoutItem[],
  id: string,
  size: OverviewWidgetSize,
): OverviewWidgetLayoutItem[] {
  return items.map((item) => (item.id === id ? { ...item, size } : { ...item }))
}

export function reorderOverviewWidgets(
  items: readonly OverviewWidgetLayoutItem[],
  orderedIds: readonly string[],
): OverviewWidgetLayoutItem[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const next: OverviewWidgetLayoutItem[] = []

  for (const id of orderedIds) {
    const item = byId.get(id)
    if (!item || seen.has(id)) continue
    next.push({ ...item })
    seen.add(id)
  }

  for (const item of items) {
    if (!seen.has(item.id)) next.push({ ...item })
  }

  return next
}
