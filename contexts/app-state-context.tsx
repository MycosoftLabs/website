"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./auth-context"

// Generic state for any tool/app
export interface ToolState {
  [key: string]: unknown
}

// State entry with metadata
interface StateEntry {
  toolId: string
  state: ToolState
  lastUpdated: number
  dirty: boolean
}

// Full app state store
interface AppStateStore {
  tools: Record<string, StateEntry>
  lastSyncedAt: number | null
  syncInProgress: boolean
  tableAvailable: boolean // Track if table exists
}

interface AppStateContextType {
  // Get state for a specific tool
  getToolState: <T extends ToolState>(toolId: string) => T | null
  // Set state for a specific tool (debounced save)
  setToolState: <T extends ToolState>(toolId: string, state: T | ((prev: T | null) => T)) => void
  // Force sync to server immediately
  syncNow: () => Promise<void>
  // Clear state for a tool (local only, doesn't delete from server)
  clearToolState: (toolId: string) => void
  // Check if state is syncing
  isSyncing: boolean
  // Last sync time
  lastSyncedAt: number | null
  // Register a tool for state management (call on mount)
  registerTool: (toolId: string, defaultState?: ToolState) => void
  // Unregister a tool (call on unmount)
  unregisterTool: (toolId: string) => void
  // Active tools (currently mounted)
  activeTools: Set<string>
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

// Debounce delay for saving state (ms)
const SAVE_DEBOUNCE_MS = 2000
// Max time between forced syncs (ms)
const MAX_SYNC_INTERVAL_MS = 60000

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  const [store, setStore] = useState<AppStateStore>({
    tools: {},
    lastSyncedAt: null,
    syncInProgress: false,
    tableAvailable: false, // Assume table doesn't exist until verified
  })
  
  const activeTools = useRef<Set<string>>(new Set())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveAttemptRef = useRef<number>(0)
  const mountedRef = useRef(true)
  const supabaseRef = useRef(createClient())

  // Load state from Supabase on user login - NON-BLOCKING
  useEffect(() => {
    if (!user?.id) {
      return
    }

    // Use setTimeout to make this completely non-blocking
    const timeoutId = setTimeout(() => {
      const loadState = async () => {
        if (!mountedRef.current) return
        
        try {
          const { data, error } = await supabaseRef.current
            .from("user_app_state")
            .select("tool_states, updated_at")
            .eq("user_id", user.id)
            .single()

          // Table doesn't exist or other schema error - silently ignore
          if (error) {
            if (error.code === "PGRST116") {
              // No data found - table exists but no row, that's fine
              if (mountedRef.current) {
                setStore(prev => ({ ...prev, tableAvailable: true }))
              }
            }
            // PGRST205 = table doesn't exist - silently ignore
            // Any other error - also silently ignore
            return
          }

          if (data?.tool_states && mountedRef.current) {
            const loadedTools: Record<string, StateEntry> = {}
            for (const [toolId, state] of Object.entries(data.tool_states as Record<string, ToolState>)) {
              loadedTools[toolId] = {
                toolId,
                state: state as ToolState,
                lastUpdated: new Date(data.updated_at).getTime(),
                dirty: false,
              }
            }
            setStore(prev => ({
              ...prev,
              tools: { ...prev.tools, ...loadedTools },
              lastSyncedAt: new Date(data.updated_at).getTime(),
              tableAvailable: true,
            }))
          }
        } catch {
          // Silently ignore all errors - don't block the app
        }
      }

      loadState()
    }, 100) // Small delay to not block initial render

    return () => clearTimeout(timeoutId)
  }, [user?.id])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Save dirty state to Supabase (debounced) - NON-BLOCKING
  const syncToServer = useCallback(async (force = false) => {
    if (!user?.id) return
    if (!store.tableAvailable) return // Don't try if table doesn't exist
    if (store.syncInProgress && !force) return

    const dirtyTools = Object.values(store.tools).filter(t => t.dirty)
    if (dirtyTools.length === 0 && !force) return

    setStore(prev => ({ ...prev, syncInProgress: true }))

    try {
      const toolStates: Record<string, ToolState> = {}
      for (const entry of Object.values(store.tools)) {
        toolStates[entry.toolId] = entry.state
      }

      const { error } = await supabaseRef.current
        .from("user_app_state")
        .upsert({
          user_id: user.id,
          tool_states: toolStates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        })

      if (error) {
        // Silently ignore - don't log errors
        if (mountedRef.current) {
          setStore(prev => ({ ...prev, syncInProgress: false }))
        }
        return
      }

      if (mountedRef.current) {
        const now = Date.now()
        setStore(prev => ({
          ...prev,
          tools: Object.fromEntries(
            Object.entries(prev.tools).map(([id, entry]) => [
              id,
              { ...entry, dirty: false, lastUpdated: now }
            ])
          ),
          lastSyncedAt: now,
          syncInProgress: false,
        }))
        lastSaveAttemptRef.current = now
      }
    } catch {
      // Silently ignore all errors
      if (mountedRef.current) {
        setStore(prev => ({ ...prev, syncInProgress: false }))
      }
    }
  }, [user?.id, store.tools, store.syncInProgress, store.tableAvailable])

  // Debounced save trigger
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      syncToServer()
    }, SAVE_DEBOUNCE_MS)
  }, [syncToServer])

  // Force sync before page unload - only if table exists
  useEffect(() => {
    if (!store.tableAvailable) return

    const handleBeforeUnload = () => {
      const dirtyTools = Object.values(store.tools).filter(t => t.dirty)
      if (dirtyTools.length > 0 && user?.id && store.tableAvailable) {
        // Use sendBeacon for reliable unload sync
        const toolStates: Record<string, ToolState> = {}
        for (const entry of Object.values(store.tools)) {
          toolStates[entry.toolId] = entry.state
        }
        navigator.sendBeacon(
          "/api/user/app-state",
          JSON.stringify({ tool_states: toolStates })
        )
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [store.tools, store.tableAvailable, user?.id])

  // Periodic sync for long sessions - only if table exists
  useEffect(() => {
    if (!store.tableAvailable) return

    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastSaveAttemptRef.current > MAX_SYNC_INTERVAL_MS) {
        syncToServer()
      }
    }, MAX_SYNC_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [syncToServer, store.tableAvailable])

  // Context methods
  const getToolState = useCallback(<T extends ToolState>(toolId: string): T | null => {
    const entry = store.tools[toolId]
    return entry ? (entry.state as T) : null
  }, [store.tools])

  const setToolState = useCallback(<T extends ToolState>(
    toolId: string, 
    stateOrUpdater: T | ((prev: T | null) => T)
  ) => {
    setStore(prev => {
      const currentEntry = prev.tools[toolId]
      const currentState = currentEntry?.state as T | null
      
      const newState = typeof stateOrUpdater === "function"
        ? (stateOrUpdater as (prev: T | null) => T)(currentState)
        : stateOrUpdater

      return {
        ...prev,
        tools: {
          ...prev.tools,
          [toolId]: {
            toolId,
            state: newState,
            lastUpdated: Date.now(),
            dirty: true,
          },
        },
      }
    })
    scheduleSave()
  }, [scheduleSave])

  const syncNow = useCallback(async () => {
    await syncToServer(true)
  }, [syncToServer])

  const clearToolState = useCallback((toolId: string) => {
    setStore(prev => {
      const { [toolId]: _, ...remainingTools } = prev.tools
      return { ...prev, tools: remainingTools }
    })
  }, [])

  const registerTool = useCallback((toolId: string, defaultState?: ToolState) => {
    activeTools.current.add(toolId)
    
    // Only set default state if no state exists
    setStore(prev => {
      if (prev.tools[toolId]) return prev
      if (!defaultState) return prev
      
      return {
        ...prev,
        tools: {
          ...prev.tools,
          [toolId]: {
            toolId,
            state: defaultState,
            lastUpdated: Date.now(),
            dirty: false, // Don't mark default state as dirty
          },
        },
      }
    })
  }, [])

  const unregisterTool = useCallback((toolId: string) => {
    activeTools.current.delete(toolId)
    // Don't clear state on unregister - keep for next mount
  }, [])

  return (
    <AppStateContext.Provider
      value={{
        getToolState,
        setToolState,
        syncNow,
        clearToolState,
        isSyncing: store.syncInProgress,
        lastSyncedAt: store.lastSyncedAt,
        registerTool,
        unregisterTool,
        activeTools: activeTools.current,
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider")
  }
  return context
}

// Convenience hook for a specific tool
export function useToolState<T extends ToolState>(
  toolId: string,
  defaultState?: T
): [T | null, (state: T | ((prev: T | null) => T)) => void] {
  const { getToolState, setToolState, registerTool, unregisterTool } = useAppState()
  
  // Register on mount, unregister on unmount
  useEffect(() => {
    registerTool(toolId, defaultState)
    return () => unregisterTool(toolId)
  }, [toolId, defaultState, registerTool, unregisterTool])
  
  const state = getToolState<T>(toolId)
  const setState = useCallback(
    (newState: T | ((prev: T | null) => T)) => setToolState<T>(toolId, newState),
    [toolId, setToolState]
  )
  
  return [state, setState]
}
