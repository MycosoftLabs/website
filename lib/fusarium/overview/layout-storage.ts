import {
  DEFAULT_OVERVIEW_WIDGET_LAYOUT,
  OVERVIEW_LAYOUT_STORAGE_KEY,
  parseOverviewLayout,
  serializeOverviewLayout,
  type OverviewWidgetLayoutItem,
} from "./layout"

export interface OverviewLayoutAdapter {
  readonly persistenceLabel: string
  load: () => Promise<OverviewWidgetLayoutItem[]>
  save: (items: readonly OverviewWidgetLayoutItem[]) => Promise<void>
  reset: () => Promise<void>
}

interface LayoutStorageSurface {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

function currentBrowserStorage(): LayoutStorageSurface | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function createBrowserLocalOverviewLayoutAdapter(
  getStorage: () => LayoutStorageSurface | null = currentBrowserStorage,
): OverviewLayoutAdapter {
  return {
    persistenceLabel: "Browser-local layout fallback",
    async load() {
      const storage = getStorage()
      if (!storage) return DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item }))
      try {
        return parseOverviewLayout(storage.getItem(OVERVIEW_LAYOUT_STORAGE_KEY))
      } catch {
        return DEFAULT_OVERVIEW_WIDGET_LAYOUT.map((item) => ({ ...item }))
      }
    },
    async save(items) {
      try {
        getStorage()?.setItem(OVERVIEW_LAYOUT_STORAGE_KEY, serializeOverviewLayout(items))
      } catch {
        // The active layout remains valid even when browser storage is blocked.
      }
    },
    async reset() {
      try {
        getStorage()?.removeItem(OVERVIEW_LAYOUT_STORAGE_KEY)
      } catch {
        // The active layout still resets in component state.
      }
    },
  }
}

export const browserLocalOverviewLayoutAdapter = createBrowserLocalOverviewLayoutAdapter()
