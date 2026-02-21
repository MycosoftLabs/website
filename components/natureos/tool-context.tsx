"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import {
  buildNatureOSActivityEvent,
  logNatureOSActivity,
  type ActivitySeverity,
  type ActivityStatus,
  type NatureOSActivityEvent,
} from "@/lib/natureos-activity"

export interface NatureOSToolInfo {
  id: string
  name: string
  description?: string
}

export interface NatureOSToolActionInput {
  action: string
  message: string
  status: ActivityStatus
  severity?: ActivitySeverity
  tool?: Partial<NatureOSToolInfo>
  metadata?: Record<string, unknown>
}

interface NatureOSToolContextValue {
  activeTool?: NatureOSToolInfo
  setActiveTool: (tool: NatureOSToolInfo) => void
  clearActiveTool: () => void
  trackToolAction: (input: NatureOSToolActionInput) => Promise<NatureOSActivityEvent>
}

const NatureOSToolContext = createContext<NatureOSToolContextValue | undefined>(undefined)

export function NatureOSToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<NatureOSToolInfo | undefined>(undefined)

  const setActiveTool = useCallback((tool: NatureOSToolInfo) => {
    setActiveToolState(tool)
  }, [])

  const clearActiveTool = useCallback(() => {
    setActiveToolState(undefined)
  }, [])

  const trackToolAction = useCallback(
    async (input: NatureOSToolActionInput) => {
      const tool = { ...activeTool, ...input.tool }
      const event = buildNatureOSActivityEvent({
        action: input.action,
        message: input.message,
        status: input.status,
        severity: input.severity ?? "info",
        toolId: tool.id,
        toolName: tool.name,
        metadata: input.metadata,
        context: {
          source: "natureos-tool",
        },
      })

      await logNatureOSActivity(event)
      return event
    },
    [activeTool],
  )

  const value = useMemo(
    () => ({
      activeTool,
      setActiveTool,
      clearActiveTool,
      trackToolAction,
    }),
    [activeTool, setActiveTool, clearActiveTool, trackToolAction],
  )

  return <NatureOSToolContext.Provider value={value}>{children}</NatureOSToolContext.Provider>
}

export function useNatureOSTool() {
  const context = useContext(NatureOSToolContext)
  if (!context) {
    throw new Error("useNatureOSTool must be used within a NatureOSToolProvider")
  }
  return context
}

export { NatureOSToolContext }
