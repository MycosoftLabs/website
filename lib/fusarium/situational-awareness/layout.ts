export const SITUATIONAL_LAYOUT_VERSION = 1
export const SITUATIONAL_LAYOUT_STORAGE_KEY =
  `fusarium.situational-awareness.layout.v${SITUATIONAL_LAYOUT_VERSION}`

export const SITUATIONAL_WIDGET_SIZES = ["compact", "wide", "tall"] as const
export type SituationalWidgetSize = (typeof SITUATIONAL_WIDGET_SIZES)[number]

export interface SituationalWidgetLayoutItem {
  id: string
  size: SituationalWidgetSize
}

interface StoredLayout {
  version: number
  items: SituationalWidgetLayoutItem[]
}

export const DEFAULT_SITUATIONAL_WIDGET_LAYOUT: readonly SituationalWidgetLayoutItem[] = [
  { id: "domain-state", size: "wide" },
  { id: "source-coverage", size: "compact" },
  { id: "evidence-ledger", size: "wide" },
  { id: "watch-conditions", size: "compact" },
  { id: "handoff-router", size: "wide" },
] as const

function cloneDefaults(defaults: readonly SituationalWidgetLayoutItem[]) {
  return defaults.map((item) => ({ ...item }))
}

function isSize(value: unknown): value is SituationalWidgetSize {
  return typeof value === "string" && SITUATIONAL_WIDGET_SIZES.includes(value as SituationalWidgetSize)
}

export function normalizeSituationalLayout(
  candidate: unknown,
  defaults: readonly SituationalWidgetLayoutItem[] = DEFAULT_SITUATIONAL_WIDGET_LAYOUT,
): SituationalWidgetLayoutItem[] {
  const fallback = cloneDefaults(defaults)
  if (!candidate || typeof candidate !== "object") return fallback
  const stored = candidate as Partial<StoredLayout>
  if (stored.version !== SITUATIONAL_LAYOUT_VERSION || !Array.isArray(stored.items)) return fallback

  const defaultById = new Map(defaults.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const normalized: SituationalWidgetLayoutItem[] = []
  for (const item of stored.items) {
    if (!item || typeof item !== "object") continue
    const id = typeof item.id === "string" ? item.id : ""
    const fallbackItem = defaultById.get(id)
    if (!fallbackItem || seen.has(id)) continue
    normalized.push({ id, size: isSize(item.size) ? item.size : fallbackItem.size })
    seen.add(id)
  }
  for (const item of defaults) if (!seen.has(item.id)) normalized.push({ ...item })
  return normalized
}

export function parseSituationalLayout(serialized: string | null): SituationalWidgetLayoutItem[] {
  if (!serialized) return cloneDefaults(DEFAULT_SITUATIONAL_WIDGET_LAYOUT)
  try {
    return normalizeSituationalLayout(JSON.parse(serialized))
  } catch {
    return cloneDefaults(DEFAULT_SITUATIONAL_WIDGET_LAYOUT)
  }
}

export function serializeSituationalLayout(items: readonly SituationalWidgetLayoutItem[]): string {
  return JSON.stringify({ version: SITUATIONAL_LAYOUT_VERSION, items })
}

export function moveSituationalWidget(
  items: readonly SituationalWidgetLayoutItem[],
  id: string,
  direction: -1 | 1,
): SituationalWidgetLayoutItem[] {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return cloneDefaults(items)
  const target = Math.max(0, Math.min(items.length - 1, index + direction))
  if (target === index) return cloneDefaults(items)
  const next = cloneDefaults(items)
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export function setSituationalWidgetSize(
  items: readonly SituationalWidgetLayoutItem[],
  id: string,
  size: SituationalWidgetSize,
): SituationalWidgetLayoutItem[] {
  return items.map((item) => (item.id === id ? { ...item, size } : { ...item }))
}

export function reorderSituationalWidgets(
  items: readonly SituationalWidgetLayoutItem[],
  orderedIds: readonly string[],
): SituationalWidgetLayoutItem[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const next: SituationalWidgetLayoutItem[] = []
  for (const id of orderedIds) {
    const item = byId.get(id)
    if (!item || seen.has(id)) continue
    next.push({ ...item })
    seen.add(id)
  }
  for (const item of items) if (!seen.has(item.id)) next.push({ ...item })
  return next
}
