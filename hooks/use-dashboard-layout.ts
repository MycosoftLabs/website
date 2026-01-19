"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  type LayoutItem,
  saveLayoutToLocal,
  loadLayoutFromLocal,
  clearLocalLayout,
  saveLayoutToSupabase,
  loadLayoutFromSupabase,
  mergeLayoutWithWidgets,
} from '@/lib/dashboard/layout-persistence'
import { useAuth } from '@/contexts/auth-context'

interface UseDashboardLayoutOptions {
  dashboardId: string
  availableWidgets: string[]
  defaultLayout?: LayoutItem[]
  autoSave?: boolean
  debounceMs?: number
}

interface UseDashboardLayoutReturn {
  layout: LayoutItem[]
  isLoading: boolean
  isSaving: boolean
  updateLayout: (newLayout: LayoutItem[]) => void
  resetLayout: () => void
  saveLayout: () => Promise<void>
  error: string | null
}

/**
 * Hook for managing dashboard layout state with persistence
 * 
 * @example
 * const { layout, updateLayout, resetLayout } = useDashboardLayout({
 *   dashboardId: 'crep',
 *   availableWidgets: ['map', 'flights', 'weather', 'satellites'],
 * })
 */
export function useDashboardLayout({
  dashboardId,
  availableWidgets,
  defaultLayout,
  autoSave = true,
  debounceMs = 1000,
}: UseDashboardLayoutOptions): UseDashboardLayoutReturn {
  const { user } = useAuth()
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // Load layout on mount
  useEffect(() => {
    async function loadLayout() {
      setIsLoading(true)
      setError(null)

      try {
        let savedLayout: LayoutItem[] | null = null

        // Try to load from Supabase for authenticated users
        if (user?.id) {
          savedLayout = await loadLayoutFromSupabase(user.id, dashboardId)
        }

        // Fall back to localStorage
        if (!savedLayout) {
          savedLayout = loadLayoutFromLocal(dashboardId)
        }

        // Use saved layout or default
        if (savedLayout && savedLayout.length > 0) {
          const mergedLayout = mergeLayoutWithWidgets(savedLayout, availableWidgets)
          setLayout(mergedLayout)
        } else if (defaultLayout) {
          setLayout(defaultLayout)
        } else {
          // Generate default layout from available widgets
          const generatedLayout: LayoutItem[] = availableWidgets.map((id, index) => ({
            id,
            x: (index % 4) * 180,
            y: Math.floor(index / 4) * 160,
            width: 1,
            height: 1,
          }))
          setLayout(generatedLayout)
        }
      } catch (e) {
        console.error('Failed to load layout:', e)
        setError('Failed to load layout')
      } finally {
        setIsLoading(false)
      }
    }

    loadLayout()
  }, [dashboardId, user?.id, availableWidgets, defaultLayout])

  // Debounced save function
  const debouncedSave = useCallback((newLayout: LayoutItem[]) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true)
      
      try {
        // Always save to localStorage for offline support
        saveLayoutToLocal(dashboardId, newLayout)

        // Save to Supabase for authenticated users
        if (user?.id) {
          const result = await saveLayoutToSupabase(user.id, dashboardId, newLayout)
          if (!result.success) {
            console.warn('Failed to save layout to cloud:', result.error)
          }
        }
      } catch (e) {
        console.error('Failed to save layout:', e)
      } finally {
        setIsSaving(false)
      }
    }, debounceMs)

    setSaveTimeout(timeout)
  }, [dashboardId, user?.id, debounceMs, saveTimeout])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
    }
  }, [saveTimeout])

  // Update layout
  const updateLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout)
    
    if (autoSave) {
      debouncedSave(newLayout)
    }
  }, [autoSave, debouncedSave])

  // Reset to default layout
  const resetLayout = useCallback(() => {
    const generatedLayout: LayoutItem[] = availableWidgets.map((id, index) => ({
      id,
      x: (index % 4) * 180,
      y: Math.floor(index / 4) * 160,
      width: 1,
      height: 1,
    }))
    setLayout(defaultLayout || generatedLayout)
    clearLocalLayout(dashboardId)
  }, [dashboardId, availableWidgets, defaultLayout])

  // Manual save function
  const saveLayout = useCallback(async () => {
    setIsSaving(true)
    
    try {
      saveLayoutToLocal(dashboardId, layout)

      if (user?.id) {
        const result = await saveLayoutToSupabase(user.id, dashboardId, layout)
        if (!result.success) {
          throw new Error(result.error)
        }
      }
    } catch (e) {
      setError('Failed to save layout')
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [dashboardId, layout, user?.id])

  return {
    layout,
    isLoading,
    isSaving,
    updateLayout,
    resetLayout,
    saveLayout,
    error,
  }
}
