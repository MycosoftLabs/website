"use client"

import type React from "react"
import { createContext, useContext, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat"
import { initApiUsageInterceptor } from "@/lib/api-usage-interceptor"

interface PresenceContextType {
  isOnline: boolean
  sessionId: string | null
  activityType: "active" | "idle" | "away"
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    initApiUsageInterceptor()
  }, [])

  const enabled = !!user?.id
  const { sessionId, activityType } = usePresenceHeartbeat(enabled, user?.id)

  const value: PresenceContextType = {
    isOnline: enabled,
    sessionId: sessionId ?? null,
    activityType,
  }

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence(): PresenceContextType {
  const context = useContext(PresenceContext)
  if (context === undefined) {
    return {
      isOnline: false,
      sessionId: null,
      activityType: "away",
    }
  }
  return context
}
