export const COMMAND_LAYOUT_VERSION = 2
export const COMMAND_LAYOUT_STORAGE_KEY = `fusarium.command-control.layout.v${COMMAND_LAYOUT_VERSION}`

export const COMMAND_WIDGET_SIZES = ["compact", "wide", "tall"] as const
export type CommandWidgetSize = (typeof COMMAND_WIDGET_SIZES)[number]

export interface CommandWidgetLayoutItem {
  id: string
  size: CommandWidgetSize
}

interface StoredCommandLayout {
  version: number
  items: CommandWidgetLayoutItem[]
}

export const DEFAULT_COMMAND_WIDGET_LAYOUT: readonly CommandWidgetLayoutItem[] = [
  { id: "mission-plan-proposal", size: "wide" },
  { id: "observation-requests", size: "wide" },
  { id: "route-validation", size: "wide" },
  { id: "standards-readiness", size: "wide" },
  { id: "control-safety", size: "wide" },
  { id: "acknowledgments", size: "compact" },
  { id: "decision-timeline", size: "wide" },
  { id: "export-preview", size: "wide" },
] as const

function clone(items: readonly CommandWidgetLayoutItem[]): CommandWidgetLayoutItem[] {
  return items.map((item) => ({ ...item }))
}

function isSize(value: unknown): value is CommandWidgetSize {
  return typeof value === "string" && COMMAND_WIDGET_SIZES.includes(value as CommandWidgetSize)
}

export function normalizeCommandLayout(
  candidate: unknown,
  defaults: readonly CommandWidgetLayoutItem[] = DEFAULT_COMMAND_WIDGET_LAYOUT,
): CommandWidgetLayoutItem[] {
  if (!candidate || typeof candidate !== "object") return clone(defaults)
  const stored = candidate as Partial<StoredCommandLayout>
  if (stored.version !== COMMAND_LAYOUT_VERSION || !Array.isArray(stored.items)) return clone(defaults)

  const known = new Map(defaults.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const normalized: CommandWidgetLayoutItem[] = []
  for (const item of stored.items) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") continue
    const fallback = known.get(item.id)
    if (!fallback || seen.has(item.id)) continue
    normalized.push({ id: item.id, size: isSize(item.size) ? item.size : fallback.size })
    seen.add(item.id)
  }
  for (const item of defaults) if (!seen.has(item.id)) normalized.push({ ...item })
  return normalized
}

export function parseCommandLayout(
  serialized: string | null,
  defaults: readonly CommandWidgetLayoutItem[] = DEFAULT_COMMAND_WIDGET_LAYOUT,
): CommandWidgetLayoutItem[] {
  if (!serialized) return clone(defaults)
  try {
    return normalizeCommandLayout(JSON.parse(serialized), defaults)
  } catch {
    return clone(defaults)
  }
}

export function serializeCommandLayout(items: readonly CommandWidgetLayoutItem[]): string {
  return JSON.stringify({ version: COMMAND_LAYOUT_VERSION, items })
}

export function moveCommandWidget(
  items: readonly CommandWidgetLayoutItem[],
  id: string,
  direction: -1 | 1,
): CommandWidgetLayoutItem[] {
  const next = clone(items)
  const index = next.findIndex((item) => item.id === id)
  if (index < 0) return next
  const target = Math.max(0, Math.min(next.length - 1, index + direction))
  if (target === index) return next
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export function setCommandWidgetSize(
  items: readonly CommandWidgetLayoutItem[],
  id: string,
  size: CommandWidgetSize,
): CommandWidgetLayoutItem[] {
  return items.map((item) => (item.id === id ? { ...item, size } : { ...item }))
}

export function reorderCommandWidgets(
  items: readonly CommandWidgetLayoutItem[],
  orderedIds: readonly string[],
): CommandWidgetLayoutItem[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const next: CommandWidgetLayoutItem[] = []
  for (const id of orderedIds) {
    const item = byId.get(id)
    if (!item || seen.has(id)) continue
    next.push({ ...item })
    seen.add(id)
  }
  for (const item of items) if (!seen.has(item.id)) next.push({ ...item })
  return next
}
