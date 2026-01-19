/**
 * Dashboard Layout Persistence
 * Handles saving and loading dashboard layouts from various storage backends
 */

import { createClient } from '@/lib/supabase/client'

export interface LayoutItem {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface DashboardLayout {
  id: string
  name: string
  layout: LayoutItem[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

export interface UserLayoutPreferences {
  userId: string
  dashboardId: string
  layoutId: string
  customizations?: Record<string, unknown>
}

const STORAGE_PREFIX = 'mycosoft-dashboard-layout'

/**
 * Save layout to localStorage (fallback/offline support)
 */
export function saveLayoutToLocal(dashboardId: string, layout: LayoutItem[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `${STORAGE_PREFIX}-${dashboardId}`
    const data = {
      layout,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save layout to localStorage:', error)
  }
}

/**
 * Load layout from localStorage
 */
export function loadLayoutFromLocal(dashboardId: string): LayoutItem[] | null {
  if (typeof window === 'undefined') return null
  
  try {
    const key = `${STORAGE_PREFIX}-${dashboardId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const data = JSON.parse(saved)
      return data.layout
    }
  } catch (error) {
    console.error('Failed to load layout from localStorage:', error)
  }
  return null
}

/**
 * Clear local layout
 */
export function clearLocalLayout(dashboardId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${STORAGE_PREFIX}-${dashboardId}`)
}

/**
 * Save layout to Supabase (for authenticated users)
 */
export async function saveLayoutToSupabase(
  userId: string,
  dashboardId: string,
  layout: LayoutItem[],
  layoutName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('dashboard_layouts')
      .upsert({
        user_id: userId,
        dashboard_id: dashboardId,
        layout_name: layoutName || 'Default',
        layout_data: layout,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,dashboard_id',
      })

    if (error) {
      console.error('Failed to save layout to Supabase:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to save layout:', error)
    return { success: false, error: 'Failed to save layout' }
  }
}

/**
 * Load layout from Supabase
 */
export async function loadLayoutFromSupabase(
  userId: string,
  dashboardId: string
): Promise<LayoutItem[] | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('layout_data')
      .eq('user_id', userId)
      .eq('dashboard_id', dashboardId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') { // Not found is OK
        console.error('Failed to load layout from Supabase:', error)
      }
      return null
    }

    return data?.layout_data as LayoutItem[] | null
  } catch (error) {
    console.error('Failed to load layout:', error)
    return null
  }
}

/**
 * Get all saved layouts for a user
 */
export async function getUserLayouts(userId: string): Promise<DashboardLayout[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to get user layouts:', error)
      return []
    }

    return data.map((row) => ({
      id: row.id,
      name: row.layout_name,
      layout: row.layout_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDefault: row.is_default,
    }))
  } catch (error) {
    console.error('Failed to get layouts:', error)
    return []
  }
}

/**
 * Delete a saved layout
 */
export async function deleteLayout(layoutId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('dashboard_layouts')
      .delete()
      .eq('id', layoutId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete layout' }
  }
}

/**
 * Apply a layout template
 */
export function applyLayoutTemplate(
  templateId: 'researcher' | 'developer' | 'operator' | 'minimal' | 'full',
  availableWidgets: string[]
): LayoutItem[] {
  const templates: Record<string, Array<{ id: string; width: number; height: number }>> = {
    researcher: [
      { id: 'species-search', width: 2, height: 1 },
      { id: 'recent-observations', width: 2, height: 2 },
      { id: 'map-view', width: 2, height: 2 },
      { id: 'phylogeny-tree', width: 2, height: 2 },
    ],
    developer: [
      { id: 'api-status', width: 1, height: 1 },
      { id: 'logs', width: 3, height: 2 },
      { id: 'metrics', width: 2, height: 1 },
      { id: 'containers', width: 2, height: 1 },
    ],
    operator: [
      { id: 'system-health', width: 2, height: 1 },
      { id: 'device-status', width: 2, height: 2 },
      { id: 'alerts', width: 2, height: 1 },
      { id: 'network-map', width: 2, height: 2 },
    ],
    minimal: [
      { id: 'main-view', width: 4, height: 2 },
      { id: 'quick-actions', width: 2, height: 1 },
    ],
    full: availableWidgets.map((id, i) => ({
      id,
      width: 2,
      height: 1,
    })),
  }

  const template = templates[templateId] || templates.minimal
  let x = 0
  let y = 0
  const columnWidth = 180
  const maxWidth = 4

  return template
    .filter((item) => availableWidgets.includes(item.id))
    .map((item) => {
      const layout: LayoutItem = {
        id: item.id,
        x: x * columnWidth,
        y: y * 160,
        width: item.width,
        height: item.height,
      }
      
      x += item.width
      if (x >= maxWidth) {
        x = 0
        y += 1
      }
      
      return layout
    })
}

/**
 * Validate layout data structure
 */
export function isValidLayout(layout: unknown): layout is LayoutItem[] {
  if (!Array.isArray(layout)) return false
  
  return layout.every((item) => (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.x === 'number' &&
    typeof item.y === 'number' &&
    typeof item.width === 'number' &&
    typeof item.height === 'number'
  ))
}

/**
 * Merge saved layout with current widgets
 * Handles cases where widgets are added/removed
 */
export function mergeLayoutWithWidgets(
  savedLayout: LayoutItem[],
  currentWidgetIds: string[]
): LayoutItem[] {
  const result: LayoutItem[] = []
  const usedPositions = new Set<string>()
  
  // First, apply saved positions to existing widgets
  for (const item of savedLayout) {
    if (currentWidgetIds.includes(item.id)) {
      result.push(item)
      usedPositions.add(`${item.x},${item.y}`)
    }
  }
  
  // Then, add new widgets that aren't in saved layout
  const savedIds = new Set(savedLayout.map((item) => item.id))
  let nextY = Math.max(0, ...result.map((item) => item.y + item.height * 160))
  
  for (const widgetId of currentWidgetIds) {
    if (!savedIds.has(widgetId)) {
      result.push({
        id: widgetId,
        x: 0,
        y: nextY,
        width: 2,
        height: 1,
      })
      nextY += 160
    }
  }
  
  return result
}
